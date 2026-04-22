const GRAPH_BASE = "https://graph.facebook.com/v19.0";

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

type LeadgenData = {
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
