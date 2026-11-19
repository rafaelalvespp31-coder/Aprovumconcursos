"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, Download, Share, SquarePlus, X } from "lucide-react";
import { isIos, isStandalone, usePush } from "./use-push";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const K_INSTALADO = "aprovum:pwa-instalado";
const K_ADIADO = "aprovum:instalar-card-adiado";
const ADIAR_MS = 3 * 24 * 60 * 60 * 1000;

const lerLS = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const gravarLS = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

/**
 * Popup para todo aluno logado no celular: instalar o APROVUM na tela inicial (Android instala com um toque;
 * no iPhone o sistema não permite instalar por código, então mostra o passo a passo) e ligar o sininho dos avisos.
 */
export function InstalarAppCard() {
  const { estado, msg, busy, ligar } = usePush();
  const [pronto, setPronto] = useState(false);
  const [celular, setCelular] = useState(false);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [instalado, setInstalado] = useState(false);
  const [aberto, setAberto] = useState(true);
  const [podeInstalar, setPodeInstalar] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const evento = useRef<InstallEvent | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ehIos = isIos();
    const ehAndroid = /Android/i.test(ua);
    /* eslint-disable react-hooks/set-state-in-effect */
    setIos(ehIos);
    setCelular(ehIos || ehAndroid);
    setStandalone(isStandalone());
    setInstalado(lerLS(K_INSTALADO) === "1");
    const adiado = Number(lerLS(K_ADIADO) ?? 0);
    setAberto(!(adiado && Date.now() - adiado < ADIAR_MS));
    setPronto(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onPrompt = (e: Event) => {
      e.preventDefault();
      evento.current = e as InstallEvent;
      setPodeInstalar(true);
    };
    const onInstalled = () => {
      gravarLS(K_INSTALADO, "1");
      setInstalado(true);
      setPodeInstalar(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!pronto || !celular || !aberto) return null;
  const tudoFeito = (standalone || instalado) && (estado === "ligado" || estado === "bloqueado" || estado === "sem-suporte");
  if (tudoFeito || estado === "carregando") return null;

  const appInstalado = standalone || instalado;
  const adiar = () => {
    gravarLS(K_ADIADO, String(Date.now()));
    setAberto(false);
  };
  const instalar = async () => {
    const ev = evento.current;
    if (!ev) return;
    setInstalando(true);
    try {
      await ev.prompt();
      const r = await ev.userChoice;
      if (r.outcome === "accepted") {
        gravarLS(K_INSTALADO, "1");
        setInstalado(true);
      }
    } catch {
      /* o navegador recusou: o passo a passo continua visível */
    } finally {
      evento.current = null;
      setPodeInstalar(false);
      setInstalando(false);
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md rounded-[20px] border border-[#E50914]/60 bg-[#0A0A0A] p-4 text-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),0_0_30px_-8px_rgba(229,9,20,0.7)] pb-[max(1rem,env(safe-area-inset-bottom))]" role="dialog" aria-labelledby="instalar-titulo" data-testid="instalar-app-card">
      <button type="button" onClick={adiar} aria-label="Fechar por enquanto" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10">
        <X className="h-5 w-5" aria-hidden />
      </button>
      <div className="flex items-center gap-3 pr-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 rounded-xl" />
        <div>
          <h2 id="instalar-titulo" className="text-[16px] font-extrabold leading-tight">Tenha a APROVUM no seu celular</h2>
          <p className="text-[12.5px] text-white/70">Abra com um toque, sem digitar o site, e receba avisos.</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        <section className="rounded-xl bg-white/[0.06] p-3" aria-label="Passo 1: ícone na tela inicial">
          <p className="flex items-center gap-2 text-[13px] font-bold">
            {appInstalado ? <Check className="h-4 w-4 text-[#34D399]" aria-hidden /> : <Download className="h-4 w-4 text-[#FF3B44]" aria-hidden />}
            1. Ícone na tela inicial {appInstalado && <span className="text-[#34D399]">pronto</span>}
          </p>
          {!appInstalado && !ios && podeInstalar && (
            <button type="button" onClick={instalar} disabled={instalando} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E50914] px-4 text-[14px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60">
              <Download className="h-4 w-4" aria-hidden /> {instalando ? "Aguarde…" : "Adicionar à tela inicial"}
            </button>
          )}
          {!appInstalado && !ios && !podeInstalar && (
            <p className="mt-1.5 text-[12.5px] text-white/80">No Chrome: toque nos <b>três pontinhos ⋮</b> e depois em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>).</p>
          )}
          {!appInstalado && ios && (
            <ol className="mt-1.5 space-y-1 text-[12.5px] text-white/85">
              <li className="flex items-center gap-1.5">No <b>Safari</b>, toque em <Share className="inline h-4 w-4 text-[#60A5FA]" aria-label="Compartilhar" /> <b>Compartilhar</b>.</li>
              <li className="flex items-center gap-1.5">Escolha <SquarePlus className="inline h-4 w-4" aria-hidden /> <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li>
              <li>Depois, abra o app <b>pelo ícone novo</b> para ligar os avisos.</li>
            </ol>
          )}
        </section>

        <section className="rounded-xl bg-white/[0.06] p-3" aria-label="Passo 2: avisos">
          <p className="flex items-center gap-2 text-[13px] font-bold">
            {estado === "ligado" ? <Check className="h-4 w-4 text-[#34D399]" aria-hidden /> : <Bell className="h-4 w-4 text-[#FF3B44]" aria-hidden />}
            2. Sininho de avisos {estado === "ligado" && <span className="text-[#34D399]">ligado</span>}
          </p>
          {estado === "desligado" && (
            <button type="button" onClick={ligar} disabled={busy} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-[14px] font-extrabold text-black active:scale-[0.98] disabled:opacity-60">
              <Bell className="h-4 w-4" aria-hidden /> {busy ? "Aguarde…" : "Ligar o sininho"}
            </button>
          )}
          {estado === "ios-instalar" && <p className="mt-1.5 text-[12.5px] text-white/80">No iPhone, os avisos só ligam depois de abrir o app pelo ícone da Tela de Início (iOS 16.4 ou mais novo).</p>}
          {estado === "bloqueado" && <p className="mt-1.5 text-[12.5px] text-white/80">Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador/app.</p>}
          {estado === "sem-suporte" && <p className="mt-1.5 text-[12.5px] text-white/80">Este navegador não aceita avisos. Abra pelo Chrome (Android) ou Safari (iPhone).</p>}
          {msg && estado !== "ligado" && <p className="mt-1.5 text-[12.5px] text-[#FCA5A5]" role="alert">{msg}</p>}
        </section>
      </div>

      <button type="button" onClick={adiar} className="mt-3 w-full text-center text-[12.5px] font-semibold text-white/60 underline underline-offset-2">Agora não</button>
    </div>
  );
}
