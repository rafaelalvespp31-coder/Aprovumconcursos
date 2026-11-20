"use client";

import { deletePartnerAction } from "./actions";

/** Excluir parceiro, com confirmação. O servidor recusa se já houver vendas. */
export function DeleteButton({ partnerId, name, back }: { partnerId: string; name: string; back?: "list" }) {
  return (
    <form
      action={deletePartnerAction}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir o parceiro "${name}" e o cupom dele? Isso não pode ser desfeito.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="partnerId" value={partnerId} />
      {back ? <input type="hidden" name="back" value={back} /> : null}
      <button type="submit" className="rounded-md border border-red-300 px-2 py-1 t-tiny font-semibold text-red-700 hover:bg-red-50" data-testid="parceiro-excluir">Excluir</button>
    </form>
  );
}
