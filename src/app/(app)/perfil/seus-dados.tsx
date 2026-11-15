"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteMyAccountAction, exportMyDataAction } from "./dados-actions";

export function SeusDados() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);

  const exportar = () => start(async () => {
    setMsg(null);
    const r = await exportMyDataAction();
    if (!r.ok) return setMsg(r.error);
    const url = URL.createObjectURL(new Blob([r.json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = r.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg("Cópia dos seus dados baixada.");
  });
  const excluir = () => start(async () => {
    const r = await deleteMyAccountAction(confirm);
    if (r?.error) setMsg(r.error);
  });

  return (
    <div className="flex flex-col gap-3 text-[13px]" data-testid="seus-dados">
      <p className="text-[#5C5C5C]">Direitos da LGPD: baixe uma cópia dos seus dados ou exclua sua conta. Leia a <Link href="/privacidade" className="font-semibold text-[#b30500] underline">Política de Privacidade</Link>, os <Link href="/termos" className="font-semibold text-[#b30500] underline">Termos</Link> e a <Link href="/reembolso" className="font-semibold text-[#b30500] underline">Política de Reembolso</Link>.</p>
      <button type="button" onClick={exportar} disabled={pending} className="min-h-11 self-start rounded-xl border border-[#0A0A0A] px-4 font-bold disabled:opacity-60">Baixar meus dados</button>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 self-start rounded-xl px-1 font-bold text-[#b30500] underline">Excluir minha conta</button>
      ) : (
        <div className="rounded-xl border border-[#E10600]/50 p-3" role="group" aria-label="Confirmar exclusão da conta">
          <p>Isso apaga sua conta e seus dados de estudo, <b>sem volta</b>. Registros de pagamento ficam apenas pelo prazo exigido em lei. Para confirmar, digite <b>EXCLUIR</b>.</p>
          <label className="sr-only" htmlFor="confirma-exclusao">Digite EXCLUIR</label>
          <input id="confirma-exclusao" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="mt-2 min-h-11 w-full rounded-xl border border-[#767676] bg-white px-3 text-[16px] text-[#08090B]" style={{ color: "#08090B", WebkitTextFillColor: "#08090B" }} />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={excluir} disabled={pending || confirm.trim().toUpperCase() !== "EXCLUIR"} className="min-h-11 rounded-xl bg-[#B30500] px-4 font-bold text-white disabled:opacity-50">Excluir definitivamente</button>
            <button type="button" onClick={() => { setOpen(false); setConfirm(""); }} className="min-h-11 rounded-xl px-3 font-bold underline">Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p role="status" className="font-semibold">{msg}</p>}
    </div>
  );
}
