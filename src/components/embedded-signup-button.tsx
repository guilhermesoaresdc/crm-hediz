"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FBLoginResponse = {
  authResponse?: {
    code?: string;
    accessToken?: string;
  };
  status: string;
};

type FBLoginInfo = {
  data?: Array<{
    waba_id?: string;
    phone_number_id?: string;
  }>;
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
      AppEvents?: { logPageView: () => void };
    };
    fbAsyncInit?: () => void;
    onWhatsAppEmbeddedSignupMessage?: (event: MessageEvent) => void;
  }
}

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
  const [signupInfo, setSignupInfo] = useState<{
    waba_id?: string;
    phone_number_id?: string;
  }>({});

  // Inicializa o SDK quando carregar
  useEffect(() => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        xfbml: true,
        version: "v19.0",
      });
      setSdkPronto(true);
    };
  }, [appId]);

  // Captura mensagens do popup do Embedded Signup (waba_id, phone_number_id)
  useEffect(() => {
    function handler(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") {
        return;
      }
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH") {
          setSignupInfo({
            waba_id: data.data?.waba_id,
            phone_number_id: data.data?.phone_number_id,
          });
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  function abrirSignup() {
    if (!window.FB) {
      onError?.("SDK do Facebook ainda carregando, aguarde 1s e tente de novo");
      return;
    }
    setCarregando(true);

    window.FB.login(
      async (response) => {
        if (!response.authResponse?.code) {
          setCarregando(false);
          onError?.(
            response.status === "not_authorized"
              ? "Permissão negada"
              : "Cancelado pelo usuário",
          );
          return;
        }

        // Envia code pro backend
        try {
          const res = await fetch("/api/canais/embedded-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: response.authResponse.code,
              waba_id: signupInfo.waba_id,
              phone_number_id: signupInfo.phone_number_id,
            }),
          });
          const body = await res.json();
          if (!res.ok) {
            const msg =
              typeof body.error === "string"
                ? body.error
                : `Falha (${res.status})`;
            onError?.(msg);
          } else {
            onSuccess?.(body.canais ?? []);
          }
        } catch (err) {
          onError?.(err instanceof Error ? err.message : "Erro de rede");
        } finally {
          setCarregando(false);
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
      },
    );
  }

  return (
    <>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={() => {
          window.fbAsyncInit?.();
        }}
      />
      <Button
        onClick={abrirSignup}
        disabled={carregando || !sdkPronto}
        className={cn(
          "bg-[#1877F2] text-white hover:bg-[#1877F2]/90",
          className,
        )}
      >
        {carregando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          children
        )}
      </Button>
    </>
  );
}
