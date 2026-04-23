"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FBAuthResponse = {
  code?: string;
  accessToken?: string;
  userID?: string;
  expiresIn?: number;
};

type FBLoginResponse = {
  status: string;
  authResponse?: FBAuthResponse;
};

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options: {
          config_id: string;
          response_type?: string;
          override_default_response_type?: boolean;
          extras?: Record<string, unknown>;
        },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const FB_SDK_URL = "https://connect.facebook.net/en_US/sdk.js";

export function EmbeddedSignupButton({
  appId,
  configId,
  onSuccess,
  onError,
  children,
  className,
}: {
  appId: string;
  configId: string;
  onSuccess?: (canais: Array<{ id: string; nome: string; phone: string }>) => void;
  onError?: (msg: string) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const [carregando, setCarregando] = useState(false);
  const [sdkPronto, setSdkPronto] = useState(false);
  const signupInfoRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  // Carrega e inicializa o SDK do Facebook
  useEffect(() => {
    // Se já carregou em outra montagem, reutiliza
    if (window.FB) {
      try {
        window.FB.init({ appId, xfbml: true, version: "v22.0" });
        setSdkPronto(true);
        return;
      } catch (err) {
        console.error("[EmbeddedSignup] FB.init falhou:", err);
      }
    }

    // Define o hook que o SDK vai chamar ao carregar
    window.fbAsyncInit = () => {
      try {
        window.FB?.init({ appId, xfbml: true, version: "v22.0" });
        setSdkPronto(true);
        console.log("[EmbeddedSignup] SDK inicializado com appId", appId);
      } catch (err) {
        console.error("[EmbeddedSignup] fbAsyncInit erro:", err);
      }
    };

    // Injeta o script manualmente se ainda não está na página
    const existing = document.querySelector(`script[src="${FB_SDK_URL}"]`);
    if (!existing) {
      const s = document.createElement("script");
      s.src = FB_SDK_URL;
      s.async = true;
      s.defer = true;
      s.crossOrigin = "anonymous";
      s.onerror = () => {
        console.error("[EmbeddedSignup] Falha ao carregar SDK FB");
        onError?.(
          "Não foi possível carregar o SDK do Facebook. Desative bloqueadores de anúncio e recarregue.",
        );
      };
      document.body.appendChild(s);
    }
  }, [appId, onError]);

  // Listener pra capturar waba_id / phone_number_id do popup
  useEffect(() => {
    function handler(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          console.log("[EmbeddedSignup] msg do popup:", data);
          if (data.event === "FINISH") {
            signupInfoRef.current = {
              waba_id: data.data?.waba_id,
              phone_number_id: data.data?.phone_number_id,
            };
          }
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  async function finalizarComAuthResponse(resp: FBAuthResponse) {
    try {
      const payload: Record<string, unknown> = {
        waba_id: signupInfoRef.current.waba_id,
        phone_number_id: signupInfoRef.current.phone_number_id,
      };

      if (resp.code) {
        payload.code = resp.code;
      } else if (resp.accessToken) {
        payload.access_token = resp.accessToken;
      } else {
        throw new Error("Resposta do Facebook sem code ou accessToken");
      }

      const res = await fetch("/api/canais/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        const msg =
          typeof body.error === "string" ? body.error : `Falha (${res.status})`;
        onError?.(msg);
      } else {
        onSuccess?.(body.canais ?? []);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setCarregando(false);
    }
  }

  function abrirSignup() {
    if (!window.FB) {
      onError?.("SDK do Facebook ainda carregando. Aguarde 2s e tente de novo.");
      return;
    }

    console.log("[EmbeddedSignup] Abrindo popup com config_id", configId);
    setCarregando(true);

    // Timeout de segurança: se o callback nunca vier em 3min, libera o botão
    const timeout = setTimeout(() => {
      console.warn("[EmbeddedSignup] Timeout — callback não retornou em 3min");
      setCarregando(false);
      onError?.(
        "Popup não respondeu a tempo. Verifique se o popup não foi bloqueado e tente de novo.",
      );
    }, 180_000);

    window.FB.login(
      (response) => {
        clearTimeout(timeout);
        console.log("[EmbeddedSignup] Callback FB.login:", response);

        if (response.status !== "connected" || !response.authResponse) {
          setCarregando(false);
          const msg =
            response.status === "not_authorized"
              ? "Permissão negada"
              : response.status === "unknown"
                ? "Popup fechado sem autorizar"
                : `Não autorizado (status: ${response.status})`;
          onError?.(msg);
          return;
        }

        finalizarComAuthResponse(response.authResponse);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        // extras.sessionInfoVersion: 3 é exigido pela Meta pra que o postMessage
        // WA_EMBEDDED_SIGNUP inclua waba_id/phone_number_id no evento FINISH.
        extras: {
          sessionInfoVersion: 3,
        },
      },
    );
  }

  return (
    <Button
      onClick={abrirSignup}
      disabled={carregando || !sdkPronto}
      className={cn(
        "bg-[#1877F2] text-white hover:bg-[#1877F2]/90",
        className,
      )}
    >
      {carregando ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Aguardando Facebook...
        </>
      ) : !sdkPronto ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando SDK...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
