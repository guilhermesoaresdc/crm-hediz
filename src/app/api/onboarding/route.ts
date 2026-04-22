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

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const svc = createSupabaseServiceClient();

  const { data: existing } = await svc
    .from("imobiliarias")
    .select("id")
    .eq("slug", input.slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Slug já está em uso" }, { status: 409 });
  }

  // Cria auth user
  const { data: authData, error: authErr } = await svc.auth.admin.createUser({
    email: input.admin_email,
    password: input.admin_password,
    email_confirm: true,
  });
  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message ?? "Falha no auth" }, { status: 500 });
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
    return NextResponse.json({ error: imoErr?.message }, { status: 500 });
  }

  await svc.from("configuracoes_imobiliaria").insert({ imobiliaria_id: imo.id });
  const { data: equipe } = await svc
    .from("equipes")
    .insert({ imobiliaria_id: imo.id, nome: "Geral" })
    .select()
    .single();

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
    return NextResponse.json({ error: usrErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, imobiliaria_id: imo.id });
}
