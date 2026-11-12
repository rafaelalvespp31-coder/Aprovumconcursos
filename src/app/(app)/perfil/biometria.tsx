"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Trash2 } from "lucide-react";
import { ativarBiometria, biometriaDisponivel } from "@/lib/biometria";

interface Cred { id: string; device_label: string; created_at: string; last_used_at: string | null }

function nomeAparelho(): string {
  const ua = navigator.userAgent;
  const so = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Aparelho";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  return [so, nav].filter(Boolean).join(" · ");
}

/** Cartão do perfil: liga/desliga a entrada por digital ou rosto neste aparelho. */
export function Biometria() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [lista, setLista] = useState<Cred[]>([]);
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const buscar = useCallback(async (): Promise<Cred[] | null> => {
    const r = await fetch("/api/webauthn/credentials", { cache: "no-store" });
    return r.ok ? ((await r.json()) as { credentials: Cred[] }).credentials : null;
  }, []);
  const carregar = async () => {
    const l = await buscar();
    if (l) setLista(l);
  };

  useEffect(() => {
    void biometriaDisponivel().then(setOk);
    void buscar().then((l) => l && setLista(l));
  }, [buscar]);

  const ativar = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await ativarBiometria(nomeAparelho());
      setMsg({ t: "Pronto! Na próxima vez, entre só com a digital ou o rosto." });
      await carregar();
    } catch (e) {
      setMsg({ t: (e as Error).message, erro: true });
    } finally {
      setBusy(false);
    }
  };
  const remover = async (id: string) => {
    await fetch("/api/webauthn/credentials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await carregar();
  };

  return (
    <div data-testid="biometria">
      <p className="mb-3 text-[12px] text-[#5C5C5C]">
        Entre na plataforma com a <b>digital ou o reconhecimento facial</b> do seu aparelho, sem digitar a senha. A biometria fica guardada no seu aparelho; a APROVUM não recebe sua digital nem seu rosto.
      </p>
      {lista.length > 0 && (
        <ul className="mb-3 space-y-2">
          {lista.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E4E4E4] bg-[#F7F7F8] px-4 py-2.5 text-[13px]">
              <span className="font-semibold">{c.device_label}</span>
              <button type="button" onClick={() => remover(c.id)} className="inline-flex min-h-9 items-center gap-1 text-[12px] font-bold text-[#B42318]" aria-label={`Remover ${c.device_label}`}>
                <Trash2 className="h-4 w-4" aria-hidden /> Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      {ok === false ? (
        <p className="text-[12px] text-[#5C5C5C]">Este aparelho ou navegador não oferece digital/rosto. Abra pelo celular ou por um computador com leitor biométrico.</p>
      ) : (
        <button type="button" onClick={ativar} disabled={busy || ok === null} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#0A0A0A] px-4 text-[13px] font-bold text-white active:scale-95 disabled:opacity-60">
          <Fingerprint className="h-4 w-4" aria-hidden /> {busy ? "Aguardando…" : lista.length ? "Cadastrar outro aparelho" : "Ativar neste aparelho"}
        </button>
      )}
      {msg && <p className={`mt-2 text-[12px] ${msg.erro ? "text-[#B42318]" : "text-[#067647]"}`} role={msg.erro ? "alert" : "status"}>{msg.t}</p>}
    </div>
  );
}
