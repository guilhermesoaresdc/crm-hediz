-- ==========================================
-- RLS: isolamento por tenant + hierarquia
-- ==========================================

-- Helper: contexto do usuário logado
create or replace function public.auth_user_context()
returns table(imobiliaria_id uuid, equipe_id uuid, role text) as $$
  select imobiliaria_id, equipe_id, role
  from public.usuarios
  where id = auth.uid();
$$ language sql stable security definer;

alter table public.imobiliarias enable row level security;
alter table public.equipes enable row level security;
alter table public.usuarios enable row level security;
alter table public.usuarios_equipes enable row level security;
alter table public.configuracoes_imobiliaria enable row level security;
alter table public.campanhas enable row level security;
alter table public.conjuntos_anuncios enable row level security;
alter table public.anuncios enable row level security;
alter table public.leads enable row level security;
alter table public.lead_eventos enable row level security;
alter table public.lead_atribuicoes enable row level security;
alter table public.lead_bolsao enable row level security;
alter table public.roleta_estado enable row level security;
alter table public.corretor_leads_diario enable row level security;
alter table public.conversas_whatsapp enable row level security;
alter table public.mensagens_whatsapp enable row level security;
alter table public.vendas enable row level security;
alter table public.custos enable row level security;
alter table public.webhook_logs enable row level security;

-- ============ IMOBILIÁRIAS ============
create policy imobiliarias_self on public.imobiliarias
  for select using (id = (select imobiliaria_id from public.auth_user_context()));

create policy imobiliarias_admin_update on public.imobiliarias
  for update using (
    id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

-- ============ EQUIPES ============
create policy equipes_tenant_select on public.equipes
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));

create policy equipes_admin_write on public.equipes
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

-- ============ USUÁRIOS ============
create policy usuarios_self_select on public.usuarios
  for select using (id = auth.uid());

create policy usuarios_tenant_select on public.usuarios
  for select using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) in ('super_admin','gerente')
  );

create policy usuarios_self_update on public.usuarios
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy usuarios_admin_write on public.usuarios
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

-- ============ CONFIGURAÇÕES ============
create policy config_select on public.configuracoes_imobiliaria
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));

create policy config_admin_write on public.configuracoes_imobiliaria
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

-- ============ CAMPANHAS / CONJUNTOS / ANÚNCIOS ============
create policy campanhas_tenant on public.campanhas
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy campanhas_admin_write on public.campanhas
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) in ('super_admin','gerente')
  );

create policy conjuntos_tenant on public.conjuntos_anuncios
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy conjuntos_admin_write on public.conjuntos_anuncios
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) in ('super_admin','gerente')
  );

create policy anuncios_tenant on public.anuncios
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy anuncios_admin_write on public.anuncios
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) in ('super_admin','gerente')
  );

-- ============ LEADS ============
create policy leads_super_admin on public.leads
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

create policy leads_gerente on public.leads
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'gerente'
    and equipe_id = (select equipe_id from public.auth_user_context())
  );

create policy leads_corretor_select on public.leads
  for select using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'corretor'
    and (corretor_id = auth.uid() or em_bolsao = true)
  );

create policy leads_corretor_update on public.leads
  for update using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and corretor_id = auth.uid()
  );

-- ============ LEAD EVENTOS / ATRIBUIÇÕES ============
create policy lead_eventos_tenant on public.lead_eventos
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy lead_eventos_insert on public.lead_eventos
  for insert with check (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));

create policy lead_atribuicoes_tenant on public.lead_atribuicoes
  for select using (
    lead_id in (
      select id from public.leads
      where imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    )
  );

-- ============ BOLSÃO ============
create policy bolsao_tenant on public.lead_bolsao
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy bolsao_update_self on public.lead_bolsao
  for update using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));

-- ============ ROLETA ============
create policy roleta_tenant on public.roleta_estado
  for all using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));

create policy diario_self on public.corretor_leads_diario
  for select using (
    corretor_id = auth.uid()
    or exists (
      select 1 from public.usuarios u
      where u.id = corretor_id
        and u.imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
        and (select role from public.auth_user_context()) in ('super_admin','gerente')
    )
  );

-- ============ WHATSAPP ============
create policy conversas_tenant on public.conversas_whatsapp
  for all using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));

create policy mensagens_tenant on public.mensagens_whatsapp
  for all using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));

-- ============ VENDAS / CUSTOS ============
create policy vendas_tenant on public.vendas
  for all using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));

create policy custos_tenant_read on public.custos
  for select using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) in ('super_admin','gerente','financeiro')
  );
create policy custos_admin_write on public.custos
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

create policy webhook_logs_admin on public.webhook_logs
  for select using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );
