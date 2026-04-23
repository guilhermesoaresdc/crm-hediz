/**
 * Facebook OAuth 2.0 flow para SaaS.
 * Usamos o endpoint dialog/oauth padrão + troca de code por token via Graph API.
 *
 * Permissions necessárias pro CRM:
 * - ads_read, ads_management: ler campanhas e custos
 * - leads_retrieval: receber leads do Lead Ads via webhook
 * - pages_show_list, pages_manage_ads, pages_read_engagement, pages_manage_metadata:
 *   associar página e receber webhooks dela
 * - business_management: listar businesses do user
 */

const SCOPES = [
  // Meta Ads + Lead Ads
  "ads_read",
  "ads_management",
  "leads_retrieval",
  "pages_show_list",
  "pages_manage_ads",
  "pages_read_engagement",
  "business_management",
  // WhatsApp Cloud API
  "whatsapp_business_management",
  "whatsapp_business_messaging",
].join(",");

export function getMetaOAuthUrl(params: {
  appId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export async function trocarCodePorToken(params: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ access_token: string; expires_in?: number }> {
  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("client_secret", params.appSecret);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code", params.code);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Troca de code falhou: ${await res.text()}`);
  return res.json();
}

/**
 * Troca o short-lived token (1h) por long-lived (60 dias).
 */
export async function trocarPorLongLived(params: {
  appId: string;
  appSecret: string;
  shortToken: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("client_secret", params.appSecret);
  url.searchParams.set("fb_exchange_token", params.shortToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Long-lived exchange falhou: ${await res.text()}`);
  return res.json();
}

export async function graphGet<T = unknown>(
  path: string,
  accessToken: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/v19.0/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  return res.json();
}

export type MetaBusiness = { id: string; name: string };
export type MetaAdAccount = {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  currency?: string;
};
export type MetaPage = { id: string; name: string; access_token?: string };
export type MetaPixel = { id: string; name: string };

/**
 * Lista só os businesses (etapa 1 do wizard).
 * Ad accounts e pages são filtradas depois por business via listarAssetsDoBusiness.
 */
export async function listarBusinesses(accessToken: string) {
  const res = await graphGet<{ data: MetaBusiness[] }>(
    "me/businesses",
    accessToken,
    { fields: "id,name", limit: 100 },
  ).catch(() => ({ data: [] as MetaBusiness[] }));
  return res.data;
}

/**
 * Retorna ad accounts e pages da BM selecionada (owned + client).
 * Unifica em uma única lista por tipo, deduplicando por id.
 */
export async function listarAssetsDoBusiness(
  accessToken: string,
  businessId: string,
) {
  const fieldsAd = "id,account_id,name,account_status,currency";
  const fieldsPage = "id,name,access_token";

  const [owned, client, ownedPages, clientPages] = await Promise.all([
    graphGet<{ data: MetaAdAccount[] }>(
      `${businessId}/owned_ad_accounts`,
      accessToken,
      { fields: fieldsAd, limit: 100 },
    ).catch(() => ({ data: [] as MetaAdAccount[] })),
    graphGet<{ data: MetaAdAccount[] }>(
      `${businessId}/client_ad_accounts`,
      accessToken,
      { fields: fieldsAd, limit: 100 },
    ).catch(() => ({ data: [] as MetaAdAccount[] })),
    graphGet<{ data: MetaPage[] }>(
      `${businessId}/owned_pages`,
      accessToken,
      { fields: fieldsPage, limit: 100 },
    ).catch(() => ({ data: [] as MetaPage[] })),
    graphGet<{ data: MetaPage[] }>(
      `${businessId}/client_pages`,
      accessToken,
      { fields: fieldsPage, limit: 100 },
    ).catch(() => ({ data: [] as MetaPage[] })),
  ]);

  const dedupe = <T extends { id: string }>(arrays: T[][]): T[] => {
    const map = new Map<string, T>();
    for (const arr of arrays) for (const item of arr) map.set(item.id, item);
    return Array.from(map.values());
  };

  return {
    ad_accounts: dedupe([owned.data, client.data]),
    pages: dedupe([ownedPages.data, clientPages.data]),
  };
}

/**
 * @deprecated Use listarBusinesses + listarAssetsDoBusiness para filtrar por BM.
 */
export async function listarAssets(accessToken: string) {
  const businesses = await listarBusinesses(accessToken);
  return { businesses, ad_accounts: [] as MetaAdAccount[], pages: [] as MetaPage[] };
}

export async function listarPixelsDoAdAccount(accessToken: string, adAccountId: string) {
  const acct = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const res = await graphGet<{ data: MetaPixel[] }>(
    `${acct}/adspixels`,
    accessToken,
    { fields: "id,name", limit: 50 },
  ).catch(() => ({ data: [] as MetaPixel[] }));
  return res.data;
}

export type MetaWaba = {
  id: string;
  name: string;
  currency?: string;
  timezone_id?: string;
};

export type MetaPhoneNumber = {
  id: string; // phone_number_id pra Cloud API
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
};

/**
 * Lista WhatsApp Business Accounts (WABAs) de uma BM.
 */
export async function listarWhatsappBusinessAccounts(
  accessToken: string,
  businessId: string,
) {
  const [owned, client] = await Promise.all([
    graphGet<{ data: MetaWaba[] }>(
      `${businessId}/owned_whatsapp_business_accounts`,
      accessToken,
      { fields: "id,name,currency,timezone_id", limit: 100 },
    ).catch(() => ({ data: [] as MetaWaba[] })),
    graphGet<{ data: MetaWaba[] }>(
      `${businessId}/client_whatsapp_business_accounts`,
      accessToken,
      { fields: "id,name,currency,timezone_id", limit: 100 },
    ).catch(() => ({ data: [] as MetaWaba[] })),
  ]);

  const map = new Map<string, MetaWaba>();
  for (const w of [...owned.data, ...client.data]) map.set(w.id, w);
  return Array.from(map.values());
}

/**
 * Lista números de telefone registrados em uma WABA.
 * O id retornado é o phone_number_id usado pra enviar mensagens via Cloud API.
 */
export async function listarPhoneNumbersDaWaba(
  accessToken: string,
  wabaId: string,
) {
  const res = await graphGet<{ data: MetaPhoneNumber[] }>(
    `${wabaId}/phone_numbers`,
    accessToken,
    {
      fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status",
      limit: 100,
    },
  ).catch(() => ({ data: [] as MetaPhoneNumber[] }));
  return res.data;
}
