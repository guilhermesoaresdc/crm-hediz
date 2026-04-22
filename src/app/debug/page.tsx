"use client";

/**
 * Página de diagnóstico: mostra quais NEXT_PUBLIC_ envs chegaram
 * no BUNDLE DO CLIENTE (injetadas em build-time).
 */
export default function DebugPage() {
  const envs = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug — Env vars no cliente</h1>
      <p className="text-sm text-muted-foreground mb-4">
        NEXT_PUBLIC_* são injetadas em build-time. Se aparecerem como "NÃO SET" aqui,
        elas NÃO estavam configuradas quando este build rodou.
      </p>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left border">Variável</th>
            <th className="p-2 text-left border">Status</th>
            <th className="p-2 text-left border">Preview</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(envs).map(([k, v]) => (
            <tr key={k}>
              <td className="p-2 border font-mono text-xs">{k}</td>
              <td className="p-2 border">
                {v ? (
                  <span className="text-green-600">✓ set ({v.length} chars)</span>
                ) : (
                  <span className="text-red-600">✗ NÃO SET</span>
                )}
              </td>
              <td className="p-2 border font-mono text-xs break-all">
                {v ? `${v.slice(0, 20)}...${v.slice(-8)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6">
        <a href="/api/debug-env" target="_blank" className="text-primary underline">
          Ver envs do servidor (/api/debug-env) →
        </a>
      </div>
    </main>
  );
}
