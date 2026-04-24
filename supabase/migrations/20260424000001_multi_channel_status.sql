-- ==========================================
-- Multi-canal (Instagram, Facebook, Baileys) + status/limites BM
-- ==========================================

-- 1. Status/limites por phone_number no WhatsApp Cloud API
alter table public.canais_whatsapp
  add column if not exists messaging_limit_tier text,
  add column if not exists name_status text,
  add column if not exists throughput_level text,
  add column if not exists phone_status text,
  add column if not exists ultimo_sync_status_em timestamptz,
  add column if not exists msgs_enviadas_30d integer default 0,
  add column if not exists msgs_entregues_30d integer default 0,
  add column if not exists conversas_pagas_30d integer default 0,
  add column if not exists custo_30d_cents integer default 0,
  add column if not exists is_official_business_account boolean default false;

comment on column public.canais_whatsapp.messaging_limit_tier is
  'Tier de envio da Meta: TIER_50, TIER_250, TIER_1K, TIER_10K, TIER_100K, TIER_UNLIMITED';
comment on column public.canais_whatsapp.name_status is
  'Status de aprovação do verified_name: APPROVED, PENDING, REJECTED';
comment on column public.canais_whatsapp.throughput_level is
  'Throughput: STANDARD, HIGH (enterprise)';
comment on column public.canais_whatsapp.phone_status is
  'Status do numero: CONNECTED, OFFLINE, FLAGGED, BANNED';

-- 2. Canal Instagram
create table if not exists public.canais_instagram (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  nome text not null,
  instagram_business_account_id text not null,
  username text,
  pagina_id text,
  pagina_nome text,
  access_token text not null,
  seguidores integer,
  ativo boolean default true,
  conectado_em timestamptz default now(),
  ultimo_sync_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_canais_ig_imob on public.canais_instagram(imobiliaria_id);
create unique index if not exists idx_canais_ig_unique
  on public.canais_instagram(imobiliaria_id, instagram_business_account_id);

alter table public.canais_instagram enable row level security;

create policy canais_ig_tenant on public.canais_instagram
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy canais_ig_admin on public.canais_instagram
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

create trigger t_canais_ig before update on public.canais_instagram
  for each row execute function tf_updated_at();

-- 3. Canal Facebook Pages
create table if not exists public.canais_facebook (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  nome text not null,
  pagina_id text not null,
  pagina_nome text,
  pagina_foto_url text,
  access_token text not null,
  categoria text,
  curtidas integer,
  ativo boolean default true,
  conectado_em timestamptz default now(),
  ultimo_sync_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_canais_fb_imob on public.canais_facebook(imobiliaria_id);
create unique index if not exists idx_canais_fb_unique
  on public.canais_facebook(imobiliaria_id, pagina_id);

alter table public.canais_facebook enable row level security;

create policy canais_fb_tenant on public.canais_facebook
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy canais_fb_admin on public.canais_facebook
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

create trigger t_canais_fb before update on public.canais_facebook
  for each row execute function tf_updated_at();

-- 4. Canal Baileys (WhatsApp nao oficial via Evolution API / baileys externo)
create table if not exists public.canais_baileys (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  nome text not null,
  numero_telefone text,
  -- Configuracao do servidor externo rodando Baileys/Evolution API
  instancia_url text not null,
  instancia_api_key text not null,
  instancia_nome text not null,
  status text default 'desconectado' check (status in ('desconectado','aguardando_qr','conectado','falha')),
  qr_code_base64 text,
  qr_expira_em timestamptz,
  ativo boolean default true,
  conectado_em timestamptz,
  ultimo_sync_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_canais_baileys_imob on public.canais_baileys(imobiliaria_id);

alter table public.canais_baileys enable row level security;

create policy canais_baileys_tenant on public.canais_baileys
  for select using (imobiliaria_id = (select imobiliaria_id from public.auth_user_context()));
create policy canais_baileys_admin on public.canais_baileys
  for all using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) = 'super_admin'
  );

create trigger t_canais_baileys before update on public.canais_baileys
  for each row execute function tf_updated_at();

-- 5. Conversas/mensagens agora podem vir de qualquer canal (wa oficial, baileys, ig, fb)
-- Adiciona colunas opcionais; canal_id (wa oficial) continua valendo; novas FKs sao opcionais
alter table public.conversas_whatsapp
  add column if not exists canal_instagram_id uuid references public.canais_instagram(id) on delete set null,
  add column if not exists canal_facebook_id uuid references public.canais_facebook(id) on delete set null,
  add column if not exists canal_baileys_id uuid references public.canais_baileys(id) on delete set null,
  add column if not exists tipo_canal text default 'whatsapp_oficial'
    check (tipo_canal in ('whatsapp_oficial','whatsapp_baileys','instagram','facebook'));

alter table public.mensagens_whatsapp
  add column if not exists canal_instagram_id uuid references public.canais_instagram(id) on delete set null,
  add column if not exists canal_facebook_id uuid references public.canais_facebook(id) on delete set null,
  add column if not exists canal_baileys_id uuid references public.canais_baileys(id) on delete set null,
  add column if not exists tipo_canal text default 'whatsapp_oficial'
    check (tipo_canal in ('whatsapp_oficial','whatsapp_baileys','instagram','facebook'));
