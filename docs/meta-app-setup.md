# Configuração do Meta App para WhatsApp Embedded Signup

Esta configuração é feita no **Meta for Developers** (https://developers.facebook.com/apps) e é pré-requisito obrigatório pro botão "Conectar WhatsApp" funcionar. Nada do que está no código adianta se isso não estiver feito.

## 1. Criar App (se ainda não existe)

- Tipo: **Business**
- Modo: precisa estar **Live** (não Development) quando for pra produção

## 2. Adicionar produtos

No menu "Add Products":

- **Facebook Login for Business** — habilita o JSSDK com `config_id`
- **WhatsApp Business Platform** — habilita Cloud API e webhook

## 3. Facebook Login for Business — configurar "Configuration"

Em **Facebook Login for Business → Configurations**:

1. Criar uma configuration nova com:
   - Login Type: **Business login**
   - Business Asset Groups: o BM que você quer conectar
   - Permissions (todos com **Advanced Access**):
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
     - `business_management`
     - `public_profile` (automático)
   - Assets: WhatsApp Business Account, Phone Number
2. Copiar o **Configuration ID** gerado → colocar em `EMBEDDED_SIGNUP_CONFIG_ID` no Vercel

## 4. App Settings → Basic

- Copiar **App ID** → `META_APP_ID` (e `NEXT_PUBLIC_META_APP_ID`)
- Copiar **App Secret** → `META_APP_SECRET`
- **App Domains**: adicionar domínio de produção (ex: `crm.hediz.com`) e o domínio do preview Vercel (ex: `crm-hediz-*.vercel.app`)

## 5. Facebook Login for Business → Settings

Esta é a parte que mais falha silenciosamente. Todos os domínios que vão rodar o `FB.login` precisam estar aqui:

- **Valid OAuth Redirect URIs**: adicionar TODAS as URLs completas:
  ```
  https://crm.hediz.com/
  https://crm.hediz.com/ferramentas-chat/canais
  https://crm-hediz-*.vercel.app/
  ```
- **Allowed Domains for the JavaScript SDK**:
  ```
  crm.hediz.com
  *.vercel.app
  ```
- **Login with the JavaScript SDK**: ON

> Sem essa whitelist, o postMessage `WA_EMBEDDED_SIGNUP` NÃO retorna `waba_id`/`phone_number_id` e o token exchange falha com "Error validating verification code".

## 6. WhatsApp Business Platform → Configuration

- **Callback URL**: `https://crm.hediz.com/api/webhooks/whatsapp`
- **Verify Token**: o mesmo valor de `META_WEBHOOK_VERIFY_TOKEN` no Vercel
- Click **Verify and save**
- Depois em **Webhook fields**, inscrever pelo menos:
  - `messages`
  - `message_template_status_update`
  - `account_update`

## 7. App Review (pra sair do modo development)

Submeter para revisão as 3 permissões:
- `whatsapp_business_management`
- `whatsapp_business_messaging`
- `business_management`

A Meta pede um vídeo demonstrando o fluxo. Ver https://developers.facebook.com/docs/app-review

## 8. Variáveis de ambiente no Vercel

```
META_APP_ID=<app id>
NEXT_PUBLIC_META_APP_ID=<mesmo app id>
META_APP_SECRET=<app secret>
NEXT_PUBLIC_EMBEDDED_SIGNUP_CONFIG_ID=<config id do passo 3>
META_WEBHOOK_VERIFY_TOKEN=<valor qualquer, usado em passo 6>
```

## Erros comuns

| Sintoma | Causa provável |
|---|---|
| `Error validating verification code. Please make sure your redirect_uri is identical to the one you used in the OAuth dialog request` | Código passando `redirect_uri` no token exchange quando o JSSDK não usa um. Solução: **não** enviar `redirect_uri` no request. Nosso `trocarEmbeddedSignupCode` já faz isso. |
| Popup abre e fecha sem retornar dados | Domínio não está em "Allowed Domains for JSSDK" no Facebook Login config |
| `Insufficient permissions` ao listar WABAs | Falta Advanced Access de `whatsapp_business_management` ou o app ainda está em Development Mode sem o usuário ser admin |
| Webhook não recebe mensagens | Não chamamos `/subscribed_apps` na WABA (nossa rota `/api/canais/embedded-signup` faz isso automaticamente após o token exchange). Verificar também se `messages` está inscrito em Webhook fields |
| `(#100) Invalid parameter` ao registrar número | Número já registrado em Cloud API por outra integração OU o PIN do `/register` não é o mesmo que foi definido no 2FA |
