-- Colunas adicionais em webhook_logs pra facilitar debug
alter table public.webhook_logs
  add column if not exists signature_valid boolean,
  add column if not exists headers jsonb,
  add column if not exists status_code integer;

comment on column public.webhook_logs.signature_valid is
  'Se a assinatura x-hub-signature-256 bateu com META_APP_SECRET';
comment on column public.webhook_logs.headers is
  'Headers relevantes da requisicao (debug)';
