import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const templateRouter = createTRPCRouter({
  listar: protectedProcedure
    .input(z.object({ canal_id: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from("templates_whatsapp")
        .select(
          "id, canal_id, meta_template_id, nome, categoria, idioma, status, body_text, header_text, footer_text, componentes, canal:canais_whatsapp(id, nome, whatsapp_phone_display)",
        )
        .eq("imobiliaria_id", ctx.profile.imobiliaria_id)
        .order("nome");

      if (input?.canal_id) q = q.eq("canal_id", input.canal_id);

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),
});
