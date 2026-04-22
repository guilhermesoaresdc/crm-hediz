-- ==========================================
-- Meta Ads insights diários: alcance/impressões/clicks
-- Usamos a própria tabela custos porque o Insights API retorna
-- spend + reach + impressions + clicks agrupados por ad_id/dia.
-- ==========================================

alter table public.custos
  add column if not exists alcance int default 0,
  add column if not exists impressoes int default 0,
  add column if not exists clicks int default 0;

-- Rastrear última sincronização por tipo
create table if not exists public.sync_log (
  id uuid primary key default uuid_generate_v4(),
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  tipo text not null check (tipo in ('meta_campanhas','meta_custos','whatsapp_templates')),
  status text not null check (status in ('sucesso','erro','em_andamento')),
  items_processados int default 0,
  erro text,
  iniciado_em timestamptz default now(),
  finalizado_em timestamptz
);

create index if not exists idx_sync_log_imob_tipo_iniciado
  on public.sync_log(imobiliaria_id, tipo, iniciado_em desc);

alter table public.sync_log enable row level security;
create policy sync_log_tenant on public.sync_log
  for select using (
    imobiliaria_id = (select imobiliaria_id from public.auth_user_context())
    and (select role from public.auth_user_context()) in ('super_admin','gerente')
  );
