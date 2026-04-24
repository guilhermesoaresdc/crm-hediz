/**
 * Cliente da Evolution API — servidor open-source que roda Baileys internamente
 * e expoe endpoints HTTP. Usuarios rodam sua propria instancia (Railway, VPS,
 * Docker) e configuram URL + API key no CRM.
 *
 * Docs: https://doc.evolution-api.com
 */

type EvolutionConfig = {
  url: string; // https://evo.meuservidor.com
  apiKey: string; // api key global do servidor
};

export class EvolutionAPI {
  constructor(private config: EvolutionConfig) {}

  private get headers() {
    return {
      apikey: this.config.apiKey,
      "Content-Type": "application/json",
    } as Record<string, string>;
  }

  private urlFor(path: string) {
    const base = this.config.url.replace(/\/$/, "");
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  }

  /**
   * Testa conexão com o servidor (GET /).
   */
  async testar(): Promise<{ ok: boolean; versao?: string; erro?: string }> {
    try {
      const res = await fetch(this.urlFor("/"), {
        headers: this.headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { ok: false, erro: `HTTP ${res.status}` };
      const body = (await res.json().catch(() => ({}))) as { version?: string };
      return { ok: true, versao: body.version };
    } catch (err) {
      return { ok: false, erro: err instanceof Error ? err.message : "Falha" };
    }
  }

  /**
   * Cria uma instância Baileys no servidor (corresponde a 1 número/QR).
   * Se já existir, só retorna status.
   */
  async criarInstancia(nome: string) {
    const res = await fetch(this.urlFor("/instance/create"), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        instanceName: nome,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`Evolution create error ${res.status}: ${await res.text()}`);
    }
    return res.json().catch(() => ({}));
  }

  /**
   * Busca o QR code atual da instância (base64).
   */
  async obterQrCode(nome: string): Promise<{
    base64?: string;
    code?: string;
    status?: string;
  }> {
    const res = await fetch(this.urlFor(`/instance/connect/${encodeURIComponent(nome)}`), {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`QR error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  /**
   * Status de conexão da instância.
   */
  async obterStatus(nome: string): Promise<{
    instance?: { instanceName: string; state: string };
  }> {
    const res = await fetch(this.urlFor(`/instance/connectionState/${encodeURIComponent(nome)}`), {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Status error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  /**
   * Desconecta a instância (logout).
   */
  async desconectar(nome: string) {
    const res = await fetch(this.urlFor(`/instance/logout/${encodeURIComponent(nome)}`), {
      method: "DELETE",
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Logout error ${res.status}`);
    return res.json().catch(() => ({}));
  }

  /**
   * Envia mensagem de texto via instância.
   */
  async enviarTexto(nome: string, params: { numero: string; texto: string }) {
    const res = await fetch(this.urlFor(`/message/sendText/${encodeURIComponent(nome)}`), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        number: params.numero,
        text: params.texto,
      }),
    });
    if (!res.ok) throw new Error(`Send error ${res.status}: ${await res.text()}`);
    return res.json();
  }
}
