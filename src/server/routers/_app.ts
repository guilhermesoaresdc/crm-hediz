import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth";
import { imobiliariaRouter } from "./imobiliaria";
import { equipeRouter } from "./equipe";
import { usuarioRouter } from "./usuario";
import { leadRouter } from "./lead";
import { bolsaoRouter } from "./bolsao";
import { vendaRouter } from "./venda";
import { dashboardRouter } from "./dashboard";
import { configRouter } from "./config";
import { campanhaRouter } from "./campanha";
import { atribuicaoRouter } from "./atribuicao";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  imobiliaria: imobiliariaRouter,
  equipe: equipeRouter,
  usuario: usuarioRouter,
  lead: leadRouter,
  bolsao: bolsaoRouter,
  venda: vendaRouter,
  dashboard: dashboardRouter,
  config: configRouter,
  campanha: campanhaRouter,
  atribuicao: atribuicaoRouter,
});

export type AppRouter = typeof appRouter;
