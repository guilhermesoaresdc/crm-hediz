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
import { gestaoRouter } from "./gestao";
import { notificacaoRouter } from "./notificacao";
import { canalRouter } from "./canal";
import { templateRouter } from "./template";
import { mensagemRouter } from "./mensagem";
import { conversaRouter } from "./conversa";
import { instagramRouter } from "./instagram";
import { facebookRouter } from "./facebook";
import { baileysRouter } from "./baileys";
import { webhookDebugRouter } from "./webhook-debug";

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
  gestao: gestaoRouter,
  notificacao: notificacaoRouter,
  canal: canalRouter,
  template: templateRouter,
  mensagem: mensagemRouter,
  conversa: conversaRouter,
  instagram: instagramRouter,
  facebook: facebookRouter,
  baileys: baileysRouter,
  webhookDebug: webhookDebugRouter,
});

export type AppRouter = typeof appRouter;
