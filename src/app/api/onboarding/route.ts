import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
  nome_imobiliaria: z.string().min(2),
  admin_nome: z.string().min(2),
  admin_email: z.string().email(),
  admin_password: z.string().min(8),
});

function fail(step: string, detail: unknown, status = 500) {
  const msg =
    detail instanceof Error
      ? detail.message
      : typeof detail === "string"
        ? detail
        : (detail as { message?: string })?.message ?? String(detail);
  console.error(`[onboarding:${step}]`, detail);
  return NextResponse.json({ error: `[${step}] ${msg}` }, { status });
}

export async function POST(req: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return fail(
        "config",
        "Env vars ausentes: SUPABASE_SERVICE_ROLE_KEY e/ou NEXT_PUBLIC_SUPABASE_URL. Configure no Vercel e refaça o deploy.",
        500,
      );
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("validation", JSON.stringify(parsed.error.flatten()), 400);
    }
    const input = parsed.data;
    const svc = createSupabaseServiceClient();

    const { data: existing, error: checkErr } = await svc
      .from("imobiliarias")
      .select("id")
      .eq("slug", input.slug)
      .maybeSingle();

    if (checkErr) {
      // Erro ao consultar — provável: tabela não existe (migrations não rodaram)
      return fail(
        "check_slug",
        `${checkErr.message}. Verifique se as migrations em supabase/migrations/ foram aplicadas no seu projeto Supabase.`,
      );
    }
    if (existing) {
      return NextResponse.json({ error: "Slug já está em uso" }, { status: 409 });
    }

    const { data: authData, error: authErr } = await svc.auth.admin.createUser({
      email: input.admin_email,
      password: input.admin_password,
      email_confirm: true,
    });
    if (authErr || !authData.user) {
      return fail("create_auth_user", authErr ?? "Falha no auth admin");
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const { data: imo, error: imoErr } = await svc
      .from("imobiliarias")
      .insert({
        slug: input.slug,
        nome: input.nome_imobiliaria,
        plano: "trial",
        trial_expira_em: trialEnd.toISOString(),
      })
      .select()
      .single();
    if (imoErr || !imo) {
      await svc.auth.admin.deleteUser(authData.user.id);
      return fail("create_imobiliaria", imoErr ?? "Sem retorno");
    }

    const { error: configErr } = await svc
      .from("configuracoes_imobiliaria")
      .insert({ imobiliaria_id: imo.id });
    if (configErr) {
      await svc.from("imobiliarias").delete().eq("id", imo.id);
      await svc.auth.admin.deleteUser(authData.user.id);
      return fail("create_config", configErr);
    }

    const { data: equipe, error: equipeErr } = await svc
      .from("equipes")
      .insert({ imobiliaria_id: imo.id, nome: "Geral" })
      .select()
      .single();
    if (equipeErr) {
      await svc.from("imobiliarias").delete().eq("id", imo.id);
      await svc.auth.admin.deleteUser(authData.user.id);
      return fail("create_equipe", equipeErr);
    }

    const { error: usrErr } = await svc.from("usuarios").insert({
      id: authData.user.id,
      imobiliaria_id: imo.id,
      equipe_id: equipe?.id,
      nome: input.admin_nome,
      email: input.admin_email,
      role: "super_admin",
    });
    if (usrErr) {
      await svc.auth.admin.deleteUser(authData.user.id);
      await svc.from("imobiliarias").delete().eq("id", imo.id);
      return fail("create_usuario", usrErr);
    }

    return NextResponse.json({ ok: true, imobiliaria_id: imo.id });
  } catch (err) {
    return fail("unexpected", err);
  }
}
