"use client";

export default function BusinessError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="bz">
      <main className="bz-conteudo">
        <div className="bz-card bz-estado" role="alert">
          <p className="text-lg font-bold text-white">
            Não foi possível carregar os indicadores.
          </p>
          <p>Tente de novo em instantes.</p>
          <button type="button" className="bz-botao mt-3" onClick={reset}>
            Tentar de novo
          </button>
        </div>
      </main>
    </div>
  );
}
