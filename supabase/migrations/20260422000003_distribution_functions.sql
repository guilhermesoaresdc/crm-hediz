-- ==========================================
-- Funções SQL para roleta e bolsão
-- SECURITY DEFINER para rodar com permissões elevadas (bypass RLS)
-- ==========================================

-- Distribui lead via round-robin atômico
create or replace function public.distribuir_lead_round_robin(
  p_lead_id uuid,
  p_imobiliaria_id uuid,
  p_equipe_id uuid default null
)
returns uuid as $$
declare
  v_proximo_id uuid;
  v_ultimo_id uuid;
  v_elegiveis uuid[];
  v_idx int;
  v_agora timestamptz := now();
  v_hora time := (v_agora at time zone 'America/Sao_Paulo')::time;
  v_dow int := extract(dow from (v_agora at time zone 'America/Sao_Paulo'))::int;
begin
  -- Lock da linha de estado (ou cria se não existir)
  select proximo_corretor_id into v_ultimo_id
  from public.roleta_estado
  where imobiliaria_id = p_imobiliaria_id
    and coalesce(equipe_id, '00000000-0000-0000-0000-000000000000'::uuid) =
        coalesce(p_equipe_id, '00000000-0000-0000-0000-000000000000'::uuid)
  for update;

  -- Lista de corretores elegíveis (ordenados por id para determinismo)
  select array_agg(id order by nome, id) into v_elegiveis
  from public.usuarios
  where imobiliaria_id = p_imobiliaria_id
    and (p_equipe_id is null or equipe_id = p_equipe_id)
    and role = 'corretor'
    and ativo = true
    and em_pausa = false
    and (pausa_ate is null or pausa_ate < v_agora)
    and leads_hoje < limite_leads_dia
    and (horario_inicio is null or v_hora between horario_inicio and horario_fim)
    and v_dow = any(dias_trabalho);

  if v_elegiveis is null or array_length(v_elegiveis, 1) is null then
    return null;
  end if;

  -- Encontra o próximo na sequência
  v_idx := coalesce(array_position(v_elegiveis, v_ultimo_id), 0);
  v_proximo_id := v_elegiveis[(v_idx % array_length(v_elegiveis, 1)) + 1];

  -- Upsert do estado
  insert into public.roleta_estado
    (imobiliaria_id, equipe_id, proximo_corretor_id, ultimo_distribuido_em, total_distribuidos)
  values (p_imobiliaria_id, p_equipe_id, v_proximo_id, v_agora, 1)
  on conflict (imobiliaria_id, coalesce(equipe_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set
    proximo_corretor_id = excluded.proximo_corretor_id,
    ultimo_distribuido_em = excluded.ultimo_distribuido_em,
    total_distribuidos = roleta_estado.total_distribuidos + 1,
    updated_at = v_agora;

  -- Atribui o lead
  update public.leads set
    corretor_id = v_proximo_id,
    equipe_id = coalesce(p_equipe_id, equipe_id),
    status = 'atribuido',
    atribuido_em = v_agora,
    em_bolsao = false,
    bolsao_expira_em = null
  where id = p_lead_id;

  insert into public.lead_atribuicoes (lead_id, corretor_id)
  values (p_lead_id, v_proximo_id);

  update public.usuarios set leads_hoje = leads_hoje + 1 where id = v_proximo_id;

  insert into public.corretor_leads_diario (corretor_id, data, total_recebidos)
  values (v_proximo_id, current_date, 1)
  on conflict (corretor_id, data)
  do update set total_recebidos = corretor_leads_diario.total_recebidos + 1;

  insert into public.lead_eventos (lead_id, imobiliaria_id, tipo, usuario_id, payload)
  values (p_lead_id, p_imobiliaria_id, 'atribuido', v_proximo_id,
          jsonb_build_object('via', 'roleta_round_robin'));

  return v_proximo_id;
end;
$$ language plpgsql security definer;

-- Move lead pro bolsão (chamado pelo job de timeout)
create or replace function public.mover_para_bolsao(
  p_lead_id uuid,
  p_timeout_minutos int default 30
)
returns boolean as $$
declare
  v_lead record;
  v_expira timestamptz := now() + make_interval(mins => p_timeout_minutos);
begin
  select * into v_lead from public.leads where id = p_lead_id for update;

  if v_lead.primeira_mensagem_em is not null then
    return false; -- corretor já respondeu
  end if;

  update public.leads set
    em_bolsao = true,
    bolsao_expira_em = v_expira,
    status = 'novo',
    corretor_id = null,
    atribuido_em = null
  where id = p_lead_id;

  insert into public.lead_bolsao
    (lead_id, imobiliaria_id, corretor_original_id, expira_em)
  values
    (p_lead_id, v_lead.imobiliaria_id, v_lead.corretor_id, v_expira);

  insert into public.lead_eventos (lead_id, imobiliaria_id, tipo, usuario_id, payload)
  values (p_lead_id, v_lead.imobiliaria_id, 'foi_pro_bolsao', v_lead.corretor_id,
          jsonb_build_object('motivo', 'timeout_primeira_mensagem',
                             'timeout_minutos', p_timeout_minutos));

  return true;
end;
$$ language plpgsql security definer;

-- Pega lead do bolsão com lock atômico
create or replace function public.pegar_lead_bolsao(
  p_lead_id uuid,
  p_corretor_id uuid
)
returns jsonb as $$
declare
  v_rows int;
  v_corretor record;
  v_config record;
  v_pegos_hoje int;
begin
  select * into v_corretor from public.usuarios where id = p_corretor_id;
  if v_corretor is null then
    return jsonb_build_object('ok', false, 'erro', 'corretor_invalido');
  end if;

  select * into v_config from public.configuracoes_imobiliaria
  where imobiliaria_id = v_corretor.imobiliaria_id;

  select coalesce(total_bolsao, 0) into v_pegos_hoje
  from public.corretor_leads_diario
  where corretor_id = p_corretor_id and data = current_date;

  if v_pegos_hoje >= v_config.bolsao_limite_diario_por_corretor then
    return jsonb_build_object('ok', false, 'erro', 'limite_bolsao_diario');
  end if;

  -- LOCK ATÔMICO: só 1 UPDATE ganha
  update public.lead_bolsao set
    status = 'pego',
    pego_por_id = p_corretor_id,
    pego_em = now(),
    version = version + 1
  where lead_id = p_lead_id
    and status = 'aberto'
    and expira_em > now();

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return jsonb_build_object('ok', false, 'erro', 'ja_pego_ou_expirado');
  end if;

  update public.leads set
    corretor_id = p_corretor_id,
    equipe_id = coalesce(equipe_id, v_corretor.equipe_id),
    status = 'atribuido',
    atribuido_em = now(),
    em_bolsao = false,
    bolsao_expira_em = null
  where id = p_lead_id;

  insert into public.lead_atribuicoes (lead_id, corretor_id, motivo_mudanca)
  values (p_lead_id, p_corretor_id, 'bolsao');

  insert into public.corretor_leads_diario (corretor_id, data, total_recebidos, total_bolsao)
  values (p_corretor_id, current_date, 1, 1)
  on conflict (corretor_id, data)
  do update set
    total_recebidos = corretor_leads_diario.total_recebidos + 1,
    total_bolsao = corretor_leads_diario.total_bolsao + 1;

  insert into public.lead_eventos (lead_id, imobiliaria_id, tipo, usuario_id, payload)
  values (p_lead_id, v_corretor.imobiliaria_id, 'saiu_do_bolsao', p_corretor_id, '{}'::jsonb);

  return jsonb_build_object('ok', true, 'corretor_id', p_corretor_id);
end;
$$ language plpgsql security definer;

grant execute on function public.distribuir_lead_round_robin(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.mover_para_bolsao(uuid, int) to authenticated, service_role;
grant execute on function public.pegar_lead_bolsao(uuid, uuid) to authenticated, service_role;
