"use client";

import { useState, useTransition } from "react";
import { enviarAvisoAction } from "./actions";

export function AvisoForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/painel");
  const [audience, setAudience] = useState("todos");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  const enviar = () => {
    setMsg(null);
    start(async () => {
      const r = await enviarAvisoAction({ title, body, url, audience });
      setMsg(r.ok ? { ok: true, t: `Enviado para ${r.sent} aparelho(s)${r.failed ? `, ${r.failed} falharam` : ""}.` } : { ok: false, t: r.error });
      if (r.ok) { setTitle(""); setBody(""); }
    });
  };
  const campo = "mt-1 w-full rounded-lg border border-linha bg-white px-3 py-2 t-small";
  return (
    <div className="mt-4 max-w-xl space-y-3 rounded-lg border border-linha bg-superficie p-4">
      <label className="block t-small font-semibold">Título <span className="font-normal text-tinta-fraca">({title.length}/60)</span>
        <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className={campo} />
      </label>
      <label className="block t-small font-semibold">Mensagem <span className="font-normal text-tinta-fraca">({body.length}/200)</span>
        <textarea value={body} maxLength={200} rows={3} onChange={(e) => setBody(e.target.value)} className={campo} />
      </label>
      <label className="block t-small font-semibold">Abrir ao tocar
        <input value={url} onChange={(e) => setUrl(e.target.value)} className={campo} placeholder="/painel" />
      </label>
      <label className="block t-small font-semibold">Quem recebe
        <select value={audience} onChange={(e) => setAudience(e.target.value)} className={campo}>
          <option value="todos">Todos com aviso ativo</option>
          <option value="pagos">Só plano pago</option>
          <option value="gratuitos">Só plano gratuito</option>
          <option value="admins">Só administradores (teste)</option>
        </select>
      </label>
      <button type="button" onClick={enviar} disabled={pending} className="rounded-md bg-black px-4 py-2 t-small font-bold text-white disabled:opacity-50">{pending ? "Enviando…" : "Enviar aviso"}</button>
      {msg && <p className={`t-small font-semibold ${msg.ok ? "text-green-700" : "text-red-700"}`} role="status">{msg.t}</p>}
    </div>
  );
}
