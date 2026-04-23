-- ==========================================
-- Nomes amigáveis das integrações Meta e WhatsApp
-- Pra exibir "Hédiz Imobiliária" em vez de só "317412415903266"
-- ==========================================

alter table public.configuracoes_imobiliaria
  add column if not exists meta_business_nome text,
  add column if not exists meta_business_picture_url text,
  add column if not exists meta_ad_account_nome text,
  add column if not exists meta_page_nome text,
  add column if not exists meta_page_picture_url text,
  add column if not exists meta_pixel_nome text,
  add column if not exists whatsapp_business_account_nome text,
  add column if not exists whatsapp_phone_display text;
