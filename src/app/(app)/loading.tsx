/** Navegação: a área de conteúdo fica em branco até a página nova chegar (sem esqueletos cinza). */
export default function Loading() {
  return (
    <div role="status" aria-label="Carregando" className="min-h-[60vh]">
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
