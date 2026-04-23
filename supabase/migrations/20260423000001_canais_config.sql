-- ==========================================
-- Configurações avançadas por canal WhatsApp (paridade com Kommo)
-- ==========================================

alter table public.canais_whatsapp
  add column if not exists fonte_lead_padrao text,
  add column if not exists importar_contatos boolean default false,
  add column if not exists limite_mensagens_mensal integer,
  add column if not exists meta_business_id text,
  add column if not exists meta_business_nome text,
  add column if not exists meta_business_status text,
  add column if not exists waba_status text,
  add column if not exists ultimo_sync_perfil_em timestamptz;

comment on column public.canais_whatsapp.fonte_lead_padrao is
  'Rótulo de origem aplicado automaticamente em leads que chegam por este canal';
comment on column public.canais_whatsapp.importar_contatos is
  'Se true, contatos do WhatsApp são importados/atualizados automaticamente na Kommo-like experience';
comment on column public.canais_whatsapp.limite_mensagens_mensal is
  'Limite mensal de mensagens (apenas informativo, não é enforcement local)';
comment on column public.canais_whatsapp.meta_business_id is
  'ID do Portfólio Meta Business (Business Manager) dono da WABA';
comment on column public.canais_whatsapp.meta_business_status is
  'Status de verificação do BM: verified, not_verified, pending etc.';
comment on column public.canais_whatsapp.waba_status is
  'Status da conta WhatsApp Business (APPROVED, PENDING, REJECTED etc.)';
