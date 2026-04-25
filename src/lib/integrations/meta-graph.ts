import { createSupabaseServiceClient } from "@/lib/supabase/server";

const GRAPH_BASE = "https://graph.facebook.com/v22.0";

export async function metaGraphGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined>,
  accessToken: string,
): Promise<T> {
  const url = new URL(`${GRAPH_BASE}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    throw new Error(`Meta Graph API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export type LeadgenData = {
  id: string;
  created_time: string;
  ad_id: string;
  adset_id: string;
  campaign_id: string;
  form_id: string;
  field_data: { name: string; values: string[] }[];
};

export async function fetchLeadgenById(leadgenId: string, accessToken: string) {
  return metaGraphGet<LeadgenData>(
    leadgenId,
    { fields: "id,created_time,ad_id,adset_id,campaign_id,form_id,field_data" },
    accessToken,
  );
}

type MetaCampaignApi = {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
};

type MetaAdSetApi = {
  id: string;
  name: string;
  campaign_id: string;
  status?: string;
};

type MetaAdApi = {
  id: string;
  name: string;
  adset_id: string;
  status?: string;
  creative?: {
    thumbnail_url?: string;
    body?: string;
    title?: string;
    call_to_action_type?: string;
  };
};

type InsightsRow = {
  ad_id: string;
  adset_id: string;
  campaign_id: string;
  spend: string;
  reach?: string;
  impressions?: string;
  clicks?: string;
  date_start: string;
};

/**
 * Valida credenciais chamando o endpoint /me da Graph API.
 */
export async function testarCredenciaisMeta(accessToken: string) {
  const res = await metaGraphGet<{ id: string; name: string }>(
    "me",
    { fields: "id,name" },
    accessToken,
  );
  return res;
}

/**
 * Sincroniza campanhas, conjuntos e anúncios de uma imobiliária.
 * Upsert por meta_*_id.
 */
export async function sincronizarCampanhasImobiliaria(imobiliariaId: string) {
  const svc = createSupabaseServiceClient();

  const { data: config } = await svc
    .from("configuracoes_imobiliaria")
    .select("meta_ad_account_id, meta_access_token")
    .eq("imobiliaria_id", imobiliariaId)
    .single();

  if (!config?.meta_ad_account_id || !config?.meta_access_token) {
    throw new Error("Credenciais Meta não configuradas");
  }

  const acct = config.meta_ad_account_id.startsWith("act_")
    ? config.meta_ad_account_id
    : `act_${config.meta_ad_account_id}`;

  const { data: syncRow } = await svc
    .from("sync_log")
    .insert({ imobiliaria_id: imobiliariaId, tipo: "meta_campanhas", status: "em_andamento" })
    .select()
    .single();

  let contagem = 0;
  try {
    // Campanhas
    const campanhas = await metaGraphGet<{ data: MetaCampaignApi[] }>(
      `${acct}/campaigns`,
      {
        fields: "id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time",
        limit: 500,
      },
      config.meta_access_token,
    );

    for (const c of campanhas.data ?? []) {
      await svc
        .from("campanhas")
        .upsert(
          {
            imobiliaria_id: imobiliariaId,
            meta_campaign_id: c.id,
            nome: c.name,
            objetivo: c.objective,
            status: c.status,
            budget_diario: c.daily_budget ? Number(c.daily_budget) / 100 : null,
            budget_total: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
            data_inicio: c.start_time ? c.start_time.slice(0, 10) : null,
            data_fim: c.stop_time ? c.stop_time.slice(0, 10) : null,
          },
          { onConflict: "imobiliaria_id,meta_campaign_id" },
        );
      contagem++;
    }

    // Conjuntos
    const conjuntos = await metaGraphGet<{ data: MetaAdSetApi[] }>(
      `${acct}/adsets`,
      { fields: "id,name,campaign_id,status", limit: 1000 },
      config.meta_access_token,
    );

    for (const a of conjuntos.data ?? []) {
      const { data: campanha } = await svc
        .from("campanhas")
        .select("id")
        .eq("imobiliaria_id", imobiliariaId)
        .eq("meta_campaign_id", a.campaign_id)
        .maybeSingle();
      if (!campanha) continue;

      await svc
        .from("conjuntos_anuncios")
        .upsert(
          {
            imobiliaria_id: imobiliariaId,
            campanha_id: campanha.id,
            meta_adset_id: a.id,
            nome: a.name,
            status: a.status,
          },
          { onConflict: "imobiliaria_id,meta_adset_id" },
        );
      contagem++;
    }

    // Anúncios
    const ads = await metaGraphGet<{ data: MetaAdApi[] }>(
      `${acct}/ads`,
      {
        fields: "id,name,adset_id,status,creative{thumbnail_url,body,title,call_to_action_type}",
        limit: 2000,
      },
      config.meta_access_token,
    );

    for (const ad of ads.data ?? []) {
      const { data: conjunto } = await svc
        .from("conjuntos_anuncios")
        .select("id")
        .eq("imobiliaria_id", imobiliariaId)
        .eq("meta_adset_id", ad.adset_id)
        .maybeSingle();
      if (!conjunto) continue;

      await svc
        .from("anuncios")
        .upsert(
          {
            imobiliaria_id: imobiliariaId,
            conjunto_id: conjunto.id,
            meta_ad_id: ad.id,
            nome: ad.name,
            status: ad.status,
            thumbnail_url: ad.creative?.thumbnail_url,
            copy: ad.creative?.body,
            headline: ad.creative?.title,
            call_to_action: ad.creative?.call_to_action_type,
          },
          { onConflict: "imobiliaria_id,meta_ad_id" },
        );
      contagem++;
    }

    if (syncRow) {
      await svc
        .from("sync_log")
        .update({
          status: "sucesso",
          items_processados: contagem,
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", syncRow.id);
    }

    return { ok: true, items: contagem };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (syncRow) {
      await svc
        .from("sync_log")
        .update({
          status: "erro",
          erro: msg,
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", syncRow.id);
    }
    throw err;
  }
}

/**
 * Sincroniza custos + insights (alcance, impressões, clicks) por ad/dia.
 * Por padrão puxa últimos 7 dias pra capturar late attribution.
 */
export async function sincronizarCustosImobiliaria(imobiliariaId: string, dias = 7) {
  const svc = createSupabaseServiceClient();

  const { data: config } = await svc
    .from("configuracoes_imobiliaria")
    .select("meta_ad_account_id, meta_access_token")
    .eq("imobiliaria_id", imobiliariaId)
    .single();

  if (!config?.meta_ad_account_id || !config?.meta_access_token) {
    throw new Error("Credenciais Meta não configuradas");
  }

  const acct = config.meta_ad_account_id.startsWith("act_")
    ? config.meta_ad_account_id
    : `act_${config.meta_ad_account_id}`;

  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(fim.getDate() - dias);
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

  const { data: syncRow } = await svc
    .from("sync_log")
    .insert({ imobiliaria_id: imobiliariaId, tipo: "meta_custos", status: "em_andamento" })
    .select()
    .single();

  let contagem = 0;
  try {
    const insights = await metaGraphGet<{ data: InsightsRow[] }>(
      `${acct}/insights`,
      {
        level: "ad",
        fields: "ad_id,adset_id,campaign_id,spend,reach,impressions,clicks,date_start",
        time_range: JSON.stringify({ since: fmtDate(inicio), until: fmtDate(fim) }),
        time_increment: 1,
        limit: 10000,
      },
      config.meta_access_token,
    );

    for (const row of insights.data ?? []) {
      const { data: anuncio } = await svc
        .from("anuncios")
        .select("id, conjunto_id, conjunto:conjuntos_anuncios(campanha_id)")
        .eq("imobiliaria_id", imobiliariaId)
        .eq("meta_ad_id", row.ad_id)
        .maybeSingle();

      if (!anuncio) continue;

      const conjRaw = anuncio.conjunto as unknown;
      const conj = (Array.isArray(conjRaw) ? conjRaw[0] : conjRaw) as
        | { campanha_id?: string }
        | null;

      await svc.from("custos").upsert(
        {
          imobiliaria_id: imobiliariaId,
          data: row.date_start,
          tipo: "meta_ads",
          anuncio_id: anuncio.id,
          conjunto_id: anuncio.conjunto_id,
          campanha_id: conj?.campanha_id ?? null,
          valor: Number(row.spend ?? 0),
          alcance: row.reach ? Number(row.reach) : 0,
          impressoes: row.impressions ? Number(row.impressions) : 0,
          clicks: row.clicks ? Number(row.clicks) : 0,
        },
        { onConflict: "imobiliaria_id,data,tipo,anuncio_id" },
      );
      contagem++;
    }

    if (syncRow) {
      await svc
        .from("sync_log")
        .update({
          status: "sucesso",
          items_processados: contagem,
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", syncRow.id);
    }

    return { ok: true, items: contagem };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (syncRow) {
      await svc
        .from("sync_log")
        .update({
          status: "erro",
          erro: msg,
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", syncRow.id);
    }
    throw err;
  }
}
