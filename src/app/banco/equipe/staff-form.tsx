"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { staffRoleAction } from "../actions";
import { DNotice, dButton, dInput } from "../ui";

export function StaffForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "erro"; text: string } | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"autor" | "revisor">("autor");
  const act = (grant: boolean) =>
    start(async () => {
      const r = await staffRoleAction(email, role, grant);
      setMsg(r.ok ? { tone: "ok", text: grant ? "Papel concedido." : "Papel removido." } : { tone: "erro", text: r.error ?? "Erro." });
      if (r.ok) router.refresh();
    });
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-mail da conta (já cadastrada no APROVUM)" className={dInput} aria-label="E-mail" />
        <select value={role} onChange={(e) => setRole(e.target.value as "autor" | "revisor")} className={dInput} aria-label="Papel">
          <option value="autor">Autor</option>
          <option value="revisor">Revisor</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button disabled={pending || !email} onClick={() => act(true)} className={dButton("primario")}>Conceder</button>
        <button disabled={pending || !email} onClick={() => act(false)} className={dButton("perigo")}>Remover</button>
      </div>
      {msg && <DNotice tone={msg.tone}>{msg.text}</DNotice>}
    </div>
  );
}
