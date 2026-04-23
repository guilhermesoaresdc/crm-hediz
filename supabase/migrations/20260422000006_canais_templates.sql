-- ==========================================
-- Ferramentas do Chat: múltiplos canais WhatsApp + templates
-- ==========================================

-- Canais WhatsApp (N:1 com imobiliária)
-- Substitui gradualmente as colunas whatsapp_* em configuracoes_imobiliaria
create table public.canais_whatsapp (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,

  -- Identificação do canal (apelido dado pelo usuário)
  nome text not null,

  -- WABA + Phone Number (Meta)
  whatsapp_business_account_id text not null,
  whatsapp_business_account_nome text,
  whatsapp_phone_number_id text not null,
  whatsapp_phone_display text,
  verified_name text,
  quality_rating text,
  access_token text not null,

  -- Associação opcional a equipe/corretor (pra roteamento)
  equipe_id uuid references public.equipes(id) on delete set null,
  corretor_id uuid references public.usuarios(id) on delete set null,

  ativo boolean default true,
  conectado_em timestamptz default now(),
  ultimo_sync_templates_em timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_canais_imobiliaria on public.canais_whatsapp(imobiliaria_id);
create index idx_canais_phone_number_id on public.canais_whatsapp(whatsapp_phone_number_id);
create index idx_canais_waba on public.canais_whatsapp(whatsapp_business_account_id);

create trigger t_canais before update on public.canais_whatsapp
  for each row execute function tf_updated_at();

-- Templates WhatsApp (cache dos aprovados no Meta)
create table public.templates_whatsapp (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  canal_id uuid not null references public.canais_whatsapp(id) on delete cascade,

  meta_template_id text,
  nome text not null,
  categoria text,
  idioma text default 'pt_BR',
  status text,

  componentes jsonb,
  body_text text,
  header_text text,
  footer_text text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_templates_canal on public.templates_whatsapp(canal_id);
create index idx_templates_status on public.templates_whatsapp(status);
create unique index idx_templates_unique
  on public.templates_whatsapp(canal_id, nome, idioma);

create trigger t_templates before update on public.templates_whatsapp
  for each row execute function tf_updated_at();

-- Conversas e mensagens agora referenciam o canal usado
alter table public.conversas_whatsapp
  add column if not exists canal_id uuid references public.canais_whatsapp(id) on delete set null;
alter table public.mensagens_whatsapp
  add column if not exists canal_id uuid references public.canais_whatsapp(id) on delete set null;

create index if not exists idx_conversas_canal on public.conversas_whatsapp(canal_id);
create index if not exists idx_mensagens_canal on public.mensagens_whatsapp(canal_id);

-- RLS
alter table public.canais_whatsapp enable row level security;
alter table public.templates_whatsapp enable row level security;

create policy canais_tenant on public.canais_whatsapp
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy canais_admin_write on public.canais_whatsapp
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

create policy templates_tenant on public.templates_whatsapp
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy templates_admin_write on public.templates_whatsapp
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );
