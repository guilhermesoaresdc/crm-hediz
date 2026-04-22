-- ==========================================
-- CRM Hédiz v1 — Schema inicial
-- ==========================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "pgcrypto";

-- ==========================================
-- TENANTS
-- ==========================================
create table public.imobiliarias (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  nome text not null,
  cnpj text,
  logo_url text,
  cor_primaria text default '#0f172a',
  timezone text default 'America/Sao_Paulo',
  plano text default 'trial' check (plano in ('trial','starter','pro','enterprise')),
  ativo boolean default true,
  trial_expira_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_imobiliarias_slug on public.imobiliarias(slug);

-- ==========================================
-- EQUIPES
-- ==========================================
create table public.equipes (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  nome text not null,
  descricao text,
  meta_vendas_mes numeric(12,2),
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_equipes_imobiliaria on public.equipes(imobiliaria_id);

-- ==========================================
-- USUÁRIOS
-- ==========================================
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  equipe_id uuid references public.equipes(id) on delete set null,
  nome text not null,
  email text not null,
  telefone text,
  whatsapp text,
  creci text,
  role text not null default 'corretor'
    check (role in ('super_admin','gerente','corretor','financeiro')),
  avatar_url text,
  ativo boolean default true,
  horario_inicio time,
  horario_fim time,
  dias_trabalho int[] default array[1,2,3,4,5],
  em_pausa boolean default false,
  pausa_ate timestamptz,
  limite_leads_dia int default 50,
  leads_hoje int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_usuarios_imobiliaria on public.usuarios(imobiliaria_id);
create index idx_usuarios_equipe on public.usuarios(equipe_id);
create index idx_usuarios_role on public.usuarios(role);
create index idx_usuarios_ativo on public.usuarios(ativo);

create table public.usuarios_equipes (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  equipe_id uuid not null references public.equipes(id) on delete cascade,
  principal boolean default true,
  created_at timestamptz default now(),
  primary key (usuario_id, equipe_id)
);

-- ==========================================
-- CONFIG DA IMOBILIÁRIA
-- ==========================================
create table public.configuracoes_imobiliaria (
  imobiliaria_id uuid primary key references public.imobiliarias(id) on delete cascade,
  bolsao_ativo boolean default true,
  bolsao_timeout_minutos int default 5,
  bolsao_elegibilidade text default 'mesma_equipe'
    check (bolsao_elegibilidade in ('todos','mesma_equipe','mesma_especialidade','customizado')),
  bolsao_limite_diario_por_corretor int default 5,
  roleta_tipo text default 'round_robin' check (roleta_tipo in ('round_robin','peso','regra')),
  roleta_respeita_horario boolean default true,
  roleta_respeita_pausa boolean default true,
  roleta_respeita_limite_diario boolean default true,
  meta_business_id text,
  meta_ad_account_id text,
  meta_page_id text,
  meta_access_token text,
  meta_pixel_id text,
  meta_capi_token text,
  meta_conectado_em timestamptz,
  whatsapp_phone_number_id text,
  whatsapp_business_account_id text,
  whatsapp_access_token text,
  whatsapp_conectado_em timestamptz,
  fee_agencia_tipo text default 'fixo' check (fee_agencia_tipo in ('fixo','percentual','sem_fee')),
  fee_agencia_valor numeric(12,2) default 0,
  updated_at timestamptz default now()
);

-- ==========================================
-- CAMPANHAS / CONJUNTOS / ANÚNCIOS
-- ==========================================
create table public.campanhas (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  meta_campaign_id text not null,
  nome text not null,
  objetivo text,
  status text,
  budget_diario numeric(12,2),
  budget_total numeric(12,2),
  data_inicio date,
  data_fim date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(imobiliaria_id, meta_campaign_id)
);

create index idx_campanhas_imobiliaria on public.campanhas(imobiliaria_id);

create table public.conjuntos_anuncios (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  campanha_id uuid not null references public.campanhas(id) on delete cascade,
  meta_adset_id text not null,
  nome text not null,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(imobiliaria_id, meta_adset_id)
);

create table public.anuncios (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  conjunto_id uuid not null references public.conjuntos_anuncios(id) on delete cascade,
  meta_ad_id text not null,
  nome text not null,
  status text,
  thumbnail_url text,
  preview_url text,
  headline text,
  copy text,
  call_to_action text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(imobiliaria_id, meta_ad_id)
);

create index idx_anuncios_conjunto on public.anuncios(conjunto_id);

-- ==========================================
-- LEADS
-- ==========================================
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  equipe_id uuid references public.equipes(id) on delete set null,
  corretor_id uuid references public.usuarios(id) on delete set null,
  nome text not null,
  whatsapp text not null,
  email text,
  cpf text,
  respostas jsonb default '{}'::jsonb,
  meta_lead_id text,
  campanha_id uuid references public.campanhas(id) on delete set null,
  conjunto_id uuid references public.conjuntos_anuncios(id) on delete set null,
  anuncio_id uuid references public.anuncios(id) on delete set null,
  fbclid text,
  fbp text,
  fbc text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  origem text,
  origem_detalhes jsonb,
  status text not null default 'novo' check (status in (
    'novo','atribuido','em_atendimento','qualificado',
    'visita_agendada','visita_realizada','proposta_enviada',
    'negociacao','vendido','perdido','descartado'
  )),
  motivo_perda text,
  motivo_descarte text,
  atribuido_em timestamptz,
  primeira_mensagem_em timestamptz,
  primeira_resposta_em timestamptz,
  qualificado_em timestamptz,
  visita_agendada_em timestamptz,
  proposta_em timestamptz,
  vendido_em timestamptz,
  perdido_em timestamptz,
  em_bolsao boolean default false,
  bolsao_expira_em timestamptz,
  score int default 0,
  observacoes text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_leads_imobiliaria on public.leads(imobiliaria_id);
create index idx_leads_equipe on public.leads(equipe_id);
create index idx_leads_corretor on public.leads(corretor_id);
create index idx_leads_status on public.leads(status);
create index idx_leads_whatsapp on public.leads(whatsapp);
create index idx_leads_fbclid on public.leads(fbclid) where fbclid is not null;
create index idx_leads_meta_lead on public.leads(meta_lead_id) where meta_lead_id is not null;
create index idx_leads_bolsao on public.leads(em_bolsao) where em_bolsao = true;
create index idx_leads_created on public.leads(created_at desc);
create index idx_leads_anuncio on public.leads(anuncio_id);
create index idx_leads_busca_nome on public.leads using gin (nome gin_trgm_ops);

-- ==========================================
-- HISTÓRICO
-- ==========================================
create table public.lead_eventos (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  tipo text not null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  payload jsonb,
  created_at timestamptz default now()
);

create index idx_lead_eventos_lead on public.lead_eventos(lead_id);
create index idx_lead_eventos_tipo on public.lead_eventos(tipo);
create index idx_lead_eventos_created on public.lead_eventos(created_at desc);

create table public.lead_atribuicoes (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  corretor_id uuid not null references public.usuarios(id) on delete cascade,
  atribuido_em timestamptz default now(),
  desatribuido_em timestamptz,
  motivo_mudanca text
);

create index idx_atribuicoes_lead on public.lead_atribuicoes(lead_id);
create index idx_atribuicoes_corretor on public.lead_atribuicoes(corretor_id);

-- ==========================================
-- ROLETA
-- ==========================================
create table public.roleta_estado (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  equipe_id uuid references public.equipes(id) on delete cascade,
  proximo_corretor_id uuid references public.usuarios(id) on delete set null,
  ultimo_distribuido_em timestamptz,
  total_distribuidos int default 0,
  updated_at timestamptz default now()
);

create unique index idx_roleta_imob_equipe
  on public.roleta_estado(imobiliaria_id, coalesce(equipe_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.corretor_leads_diario (
  corretor_id uuid not null references public.usuarios(id) on delete cascade,
  data date not null,
  total_recebidos int default 0,
  total_bolsao int default 0,
  primary key (corretor_id, data)
);

-- ==========================================
-- BOLSÃO
-- ==========================================
create table public.lead_bolsao (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  corretor_original_id uuid references public.usuarios(id) on delete set null,
  entrou_bolsao_em timestamptz default now(),
  expira_em timestamptz,
  pego_por_id uuid references public.usuarios(id) on delete set null,
  pego_em timestamptz,
  status text default 'aberto' check (status in ('aberto','pego','expirado')),
  version int default 0
);

create unique index idx_bolsao_lead_ativo on public.lead_bolsao(lead_id) where status = 'aberto';
create index idx_bolsao_imobiliaria on public.lead_bolsao(imobiliaria_id, status);
create index idx_bolsao_expira on public.lead_bolsao(expira_em) where status = 'aberto';

-- ==========================================
-- WHATSAPP
-- ==========================================
create table public.conversas_whatsapp (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  corretor_id uuid references public.usuarios(id) on delete set null,
  whatsapp_numero text not null,
  status text default 'aberta' check (status in ('aberta','encerrada')),
  ultima_mensagem_em timestamptz,
  created_at timestamptz default now()
);

create index idx_conversas_lead on public.conversas_whatsapp(lead_id);
create index idx_conversas_numero on public.conversas_whatsapp(whatsapp_numero);

create table public.mensagens_whatsapp (
  id uuid primary key default uuid_generate_v4(),
  conversa_id uuid not null references public.conversas_whatsapp(id) on delete cascade,
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  direcao text not null check (direcao in ('enviada','recebida')),
  enviado_por_id uuid references public.usuarios(id) on delete set null,
  wa_message_id text,
  tipo text default 'text' check (tipo in ('text','image','audio','video','document','template')),
  conteudo text,
  media_url text,
  template_nome text,
  status_entrega text,
  created_at timestamptz default now()
);

create index idx_mensagens_conversa on public.mensagens_whatsapp(conversa_id);
create index idx_mensagens_direcao on public.mensagens_whatsapp(direcao);
create index idx_mensagens_created on public.mensagens_whatsapp(created_at desc);

-- ==========================================
-- CUSTOS / VENDAS
-- ==========================================
create table public.custos (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('meta_ads','google_ads','fee_agencia','outro')),
  campanha_id uuid references public.campanhas(id) on delete set null,
  conjunto_id uuid references public.conjuntos_anuncios(id) on delete set null,
  anuncio_id uuid references public.anuncios(id) on delete set null,
  valor numeric(12,2) not null,
  descricao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index idx_custos_dedupe
  on public.custos(imobiliaria_id, data, tipo, coalesce(anuncio_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index idx_custos_imobiliaria_data on public.custos(imobiliaria_id, data);
create index idx_custos_tipo on public.custos(tipo);
create index idx_custos_campanha on public.custos(campanha_id);

create table public.vendas (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  corretor_id uuid not null references public.usuarios(id) on delete cascade,
  valor_venda numeric(12,2) not null,
  valor_comissao numeric(12,2),
  imovel_descricao text,
  endereco text,
  data_venda date not null,
  data_assinatura date,
  observacoes text,
  enviado_capi boolean default false,
  enviado_capi_em timestamptz,
  capi_event_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_vendas_imobiliaria on public.vendas(imobiliaria_id);
create index idx_vendas_lead on public.vendas(lead_id);
create index idx_vendas_corretor on public.vendas(corretor_id);
create index idx_vendas_data on public.vendas(data_venda);
create index idx_vendas_capi_pendente on public.vendas(enviado_capi) where enviado_capi = false;

-- ==========================================
-- AUDITORIA WEBHOOKS
-- ==========================================
create table public.webhook_logs (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid references public.imobiliarias(id) on delete cascade,
  source text not null,
  payload_raw jsonb,
  processado boolean default false,
  erro text,
  created_at timestamptz default now()
);

create index idx_logs_imobiliaria on public.webhook_logs(imobiliaria_id);
create index idx_logs_source on public.webhook_logs(source);

-- ==========================================
-- TRIGGERS
-- ==========================================
create or replace function tf_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger t_imobiliarias before update on public.imobiliarias for each row execute function tf_updated_at();
create trigger t_equipes before update on public.equipes for each row execute function tf_updated_at();
create trigger t_usuarios before update on public.usuarios for each row execute function tf_updated_at();
create trigger t_configuracoes before update on public.configuracoes_imobiliaria for each row execute function tf_updated_at();
create trigger t_campanhas before update on public.campanhas for each row execute function tf_updated_at();
create trigger t_conjuntos before update on public.conjuntos_anuncios for each row execute function tf_updated_at();
create trigger t_anuncios before update on public.anuncios for each row execute function tf_updated_at();
create trigger t_leads before update on public.leads for each row execute function tf_updated_at();
create trigger t_vendas before update on public.vendas for each row execute function tf_updated_at();
create trigger t_custos before update on public.custos for each row execute function tf_updated_at();
