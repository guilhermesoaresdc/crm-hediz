# CRM Hédiz — MVP

CRM imobiliário vertical com atribuição de ponta a ponta (clique no anúncio → venda), com envio de eventos ao Meta via Conversion API usando o `event_time` original do lead — fechando o loop de atribuição.

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind + shadcn-style components
- **API:** tRPC (type-safe end-to-end)
- **Banco + Auth + Realtime + Storage:** Supabase (PostgreSQL com RLS)
- **Integrações:** Meta Marketing API, Lead Ads webhook, WhatsApp Cloud API, Meta Conversion API
- **Jobs (plugável):** Inngest para automações agendadas (roleta timeout, sync diário, retry CAPI)

## Estrutura

```
crm-hediz/
├── src/
│   ├── app/
│   │   ├── (app)/              # rotas autenticadas (sidebar)
│   │   │   ├── dashboard/      # KPIs + funil + ROAS real
│   │   │   ├── leads/          # listagem, criação, detalhes
│   │   │   ├── pipeline/       # kanban por status
│   │   │   ├── bolsao/         # leads disponíveis pra pegar
│   │   │   ├── vendas/         # vendas + registro com CAPI Purchase
│   │   │   ├── campanhas/      # ROAS real por campanha
│   │   │   ├── equipe/         # gestão de usuários
│   │   │   └── configuracoes/  # Meta, WhatsApp, bolsão, fee agência
│   │   ├── api/
│   │   │   ├── trpc/           # handler tRPC
│   │   │   ├── leads/          # endpoint público de captura (LP)
│   │   │   ├── onboarding/     # criação de imobiliária + admin
│   │   │   └── webhooks/
│   │   │       ├── meta-lead/  # Meta Lead Ads (com validação HMAC)
│   │   │       └── whatsapp/   # WhatsApp Cloud API
│   │   ├── login/
│   │   └── signup/
│   ├── components/ui/          # Button, Card, Input, Badge, Label
│   ├── lib/
│   │   ├── supabase/           # clients (ssr, browser, service)
│   │   ├── trpc/               # client + provider
│   │   ├── integrations/
│   │   │   ├── meta-capi.ts    # Conversion API (Lead + Purchase)
│   │   │   ├── meta-graph.ts   # Graph API (leadgen, campanhas)
│   │   │   └── whatsapp.ts     # Cloud API (send template/text)
│   │   └── utils.ts
│   ├── server/
│   │   ├── trpc.ts             # context + procedures (protected, admin, manager)
│   │   └── routers/            # auth, lead, bolsão, venda, dashboard, config...
│   └── middleware.ts           # auth guard + session refresh
└── supabase/
    └── migrations/
        ├── 20260422000001_init_schema.sql
        ├── 20260422000002_rls_policies.sql
        └── 20260422000003_distribution_functions.sql
```

## Setup

```bash
cp .env.example .env
# preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

npm install

# No projeto Supabase, rode as migrations em supabase/migrations/ em ordem.
# Pode ser via CLI (supabase db push) ou colando no SQL Editor.

npm run dev
```

## Features implementadas (v1)

### Multitenancy e isolamento
- 1 instância, N imobiliárias — `imobiliaria_id` em todas as tabelas
- RLS ativo com policies por role (`super_admin`, `gerente`, `corretor`, `financeiro`)
- Onboarding cria imobiliária + config padrão + equipe "Geral" + admin

### Roleta round-robin
- `distribuir_lead_round_robin()` (SQL security definer) com `SELECT FOR UPDATE` pra evitar race
- Considera: ativo, pausa, limite diário, horário, dias de trabalho
- Incrementa `leads_hoje` e `corretor_leads_diario` atomicamente

### Bolsão com lock atômico
- `pegar_lead_bolsao()` usa `UPDATE ... WHERE status = 'aberto'` — só 1 corretor ganha
- Elegibilidade configurável (todos / mesma equipe)
- Limite diário anti-gaming
- Polling a cada 15s na tela (realtime pode ser plugado via Supabase)

### Atribuição de ponta a ponta
- Lead carrega campanha/conjunto/anúncio/fbclid/fbp/fbc/UTMs desde a criação
- Endpoint público `/api/leads` resolve anúncio pelo `utm_content = meta_ad_id`
- Webhook Meta Lead Ads (com validação HMAC) cria lead com IDs Meta corretos

### Conversion API
- `MetaConversionAPI.sendEvent` com SHA-256 do PII (em, ph, fn, ln)
- `enviarCapiLead` dispara ao criar lead
- **`enviarCapiPurchase` usa `event_time = lead.created_at`** (o grande diferencial: Meta atribui corretamente mesmo 90 dias depois)
- Sinalização `enviado_capi` no registro da venda pra retry via job

### Dashboards
- KPIs: leads, vendas, faturamento, custo mídia, fee agência, custo total, **ROAS real**, CPL, custo/venda, bolsão agora
- Funil: leads → primeira mensagem → resposta → visita → proposta → venda
- ROAS real por campanha (mídia + fee vs faturamento)
- Performance por corretor (leads, vendas, taxa conversão, tempo médio 1ª mensagem)

### WhatsApp
- Webhook com validação HMAC
- Persiste conversas e mensagens, marca `primeira_resposta_em`
- `WhatsAppCloudAPI` com `sendTemplate` e `sendText`

## Jobs agendados (a integrar com Inngest/Cron)

Endpoints prontos pra serem chamados por worker externo:

- `POST /api/leads/timeout-bolsao` — invocado 5min após atribuição pra verificar se deve mover pro bolsão
- Sync Meta (ads/custos) — queries já prontas em `lib/integrations/meta-graph.ts`, falta o worker
- Retry CAPI — filtrar `vendas WHERE enviado_capi = false` e reenviar

## O que está stub / pendente

- **OAuth Meta/WhatsApp** — UI coleta tokens manualmente; fase seguinte implementa OAuth flow
- **Inngest workers** — endpoints e lógica existem, falta o scheduler real
- **Templates WhatsApp** — gerenciador de templates não implementado (usa Cloud API direto)
- **Billing Stripe/Asaas** — trial funciona, cobrança recorrente na fase seguinte
- **Sync de campanhas** — `lib/integrations/meta-graph.ts` tem as queries; worker periódico pendente
- **Realtime notifications** — UI faz polling; Supabase Realtime pode ser plugado
- **Push notifications** — estrutura preparada nos handlers

## Checklist de segurança (spec Apêndice A)

- [x] RLS ativo em todas tabelas sensíveis
- [x] Validação de signature HMAC em webhooks Meta/WhatsApp
- [x] Tokens persistidos em `configuracoes_imobiliaria` (criptografia at rest: TODO com pgcrypto em prod)
- [x] Middleware bloqueia rotas autenticadas
- [x] Hash SHA-256 de PII no CAPI
- [ ] Rate limiting em `/api/leads` (adicionar Upstash Redis)
- [ ] 2FA pra super admin (Supabase Auth suporta, UI pendente)

## Queries críticas (spec seção 11)

As queries de ROAS real, funil e performance por corretor estão implementadas em
`src/server/routers/dashboard.ts` usando agregações client-side sobre leituras do Supabase.
Em escala, migrar pra views materializadas (ver seção 15 da spec).
