"use client";

import { Button, Notice } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const config = error.name === "ConfigError" || /não configurad/i.test(error.message);
  return (
    <div className="mx-auto max-w-xl py-10">
      <Notice tone="erro" title={config ? "Serviço não configurado" : "Algo deu errado ao carregar esta página"}>
        {config
          ? "O servidor ainda não tem as credenciais necessárias. Consulte o README para configurar as variáveis de ambiente."
          : "Seus dados estão salvos. Tente carregar a página novamente."}
        {error.digest && <p className="mt-2 t-tiny">Código para suporte: {error.digest}</p>}
      </Notice>
      <Button onClick={reset} variant="secundario" className="mt-4">Tentar novamente</Button>
    </div>
  );
}
