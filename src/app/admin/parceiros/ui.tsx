export const brl = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (erro) return <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 t-small text-red-800">{erro}</p>;
  if (ok) return <p role="status" className="mt-3 rounded-md border border-green-300 bg-green-50 p-3 t-small text-green-800">{ok}</p>;
  return null;
}
