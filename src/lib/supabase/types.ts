// Tipos do schema. Em produção substituir por `supabase gen types typescript`.

export type Role = "super_admin" | "gerente" | "corretor" | "financeiro";

export type LeadStatus =
  | "novo"
  | "atribuido"
  | "em_atendimento"
  | "qualificado"
  | "visita_agendada"
  | "visita_realizada"
  | "proposta_enviada"
  | "negociacao"
  | "vendido"
  | "perdido"
  | "descartado";

export interface Imobiliaria {
  id: string;
  slug: string;
  nome: string;
  cnpj: string | null;
  logo_url: string | null;
  cor_primaria: string;
  timezone: string;
  plano: "trial" | "starter" | "pro" | "enterprise";
  ativo: boolean;
  trial_expira_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: string;
  imobiliaria_id: string;
  equipe_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  creci: string | null;
  role: Role;
  avatar_url: string | null;
  ativo: boolean;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_trabalho: number[];
  em_pausa: boolean;
  pausa_ate: string | null;
  limite_leads_dia: number;
  leads_hoje: number;
  created_at: string;
  updated_at: string;
}

export interface Equipe {
  id: string;
  imobiliaria_id: string;
  nome: string;
  descricao: string | null;
  meta_vendas_mes: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  imobiliaria_id: string;
  equipe_id: string | null;
  corretor_id: string | null;
  nome: string;
  whatsapp: string;
  email: string | null;
  cpf: string | null;
  respostas: Record<string, unknown>;
  meta_lead_id: string | null;
  campanha_id: string | null;
  conjunto_id: string | null;
  anuncio_id: string | null;
  fbclid: string | null;
  fbp: string | null;
  fbc: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  origem: string | null;
  origem_detalhes: Record<string, unknown> | null;
  status: LeadStatus;
  motivo_perda: string | null;
  motivo_descarte: string | null;
  atribuido_em: string | null;
  primeira_mensagem_em: string | null;
  primeira_resposta_em: string | null;
  qualificado_em: string | null;
  visita_agendada_em: string | null;
  proposta_em: string | null;
  vendido_em: string | null;
  perdido_em: string | null;
  em_bolsao: boolean;
  bolsao_expira_em: string | null;
  score: number;
  observacoes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Venda {
  id: string;
  imobiliaria_id: string;
  lead_id: string;
  corretor_id: string;
  valor_venda: number;
  valor_comissao: number | null;
  imovel_descricao: string | null;
  endereco: string | null;
  data_venda: string;
  data_assinatura: string | null;
  observacoes: string | null;
  enviado_capi: boolean;
  enviado_capi_em: string | null;
  capi_event_id: string | null;
  created_at: string;
  updated_at: string;
}
