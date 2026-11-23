"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, Search, Settings } from "lucide-react";
import { mesclar, rankear, sanitizarConsulta, type Sugestao } from "@/domain/missao/sugestoes";
import { MentorOrbita } from "./mentor-orbita";
import "./central-missao.css";

type Fase = "ocioso" | "salvando" | "ok" | "erro";
type Escolha = { ok: true; destino: string } | { ok: false; error: string };

export interface CentralMissaoProps {
  primeiroNome: string | null;
  email: string | null;
  objetivo: string | null;
  iniciais: Sugestao[];
  editais: Sugestao[];
  sugerir: (q: string) => Promise<Sugestao[]>;
  escolher: (nome: string, editalId?: string) => Promise<Escolha>;
}

const TIPO_ROTULO: Record<Sugestao["tipo"], string> = { catalogo: "Catálogo", edital: "Seu edital", objetivo: "" };

/** Home pós-login: o Mentor no centro de uma órbita de energia e a pergunta "Qual é o seu próximo objetivo?". */
export function CentralMissao({ primeiroNome, email, objetivo, iniciais, editais, sugerir, escolher }: CentralMissaoProps) {
  const router = useRouter();
  const listaId = useId();
  const campo = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const [texto, setTexto] = useState("");
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  const [remotas, setRemotas] = useState<Sugestao[]>([]);
  const [pronta, setPronta] = useState(""); // texto cuja busca no catálogo já respondeu
  const [fase, setFase] = useState<Fase>("ocioso");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);

  const consulta = sanitizarConsulta(texto);
  const locais = useMemo(() => mesclar(iniciais, editais), [iniciais, editais]);
  const itens = useMemo(() => rankear(texto, mesclar(locais, consulta.length >= 2 ? remotas : [])), [texto, locais, remotas, consulta]);
  const buscando = consulta.length >= 2 && pronta !== consulta;
  const semResultado = consulta.length >= 2 && !buscando && itens.length === 0;
  const ocupado = fase === "salvando" || fase === "ok";

  // Busca no catálogo enquanto digita (espera o aluno parar um instante). Respostas antigas são descartadas.
  useEffect(() => {
    if (consulta.length < 2) return;
    const id = ++seq.current;
    const t = setTimeout(() => {
      sugerir(consulta)
        .catch((): Sugestao[] => [])
        .then((r) => {
          if (seq.current !== id) return;
          setRemotas(r);
          setPronta(consulta);
        });
    }, 180);
    return () => clearTimeout(t);
  }, [consulta, sugerir]);

  const confirmar = useCallback(
    async (nome: string, editalId?: string) => {
      const limpo = nome.replace(/\s+/g, " ").trim();
      if (limpo.length < 3 || ocupado) return;
      setTexto(limpo);
      setAberta(false);
      setErro(null);
      setFase("salvando");
      campo.current?.blur();
      const r = await escolher(limpo, editalId).catch((): Escolha => ({ ok: false, error: "Sem conexão. Tente de novo." }));
      if (!r.ok) {
        setFase("erro");
        setErro(r.error);
        return;
      }
      setFase("ok");
      setConfirmado(limpo);
      router.prefetch(r.destino);
      const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => setSaindo(true), reduzido ? 0 : 700);
      setTimeout(() => router.push(r.destino), reduzido ? 150 : 1350);
    },
    [escolher, ocupado, router],
  );

  const escolherItem = (s: Sugestao) => void confirmar(s.nome, s.tipo === "edital" ? s.editalId : undefined);

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberta(true);
      setAtiva((i) => (itens.length ? (i + 1) % itens.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtiva((i) => (itens.length ? (i <= 0 ? itens.length - 1 : i - 1) : -1));
    } else if (e.key === "Escape") {
      setAberta(false);
      setAtiva(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const s = ativa >= 0 ? itens[ativa] : itens.length ? itens[0] : undefined;
      if (s) escolherItem(s);
      else void confirmar(texto);
    }
  };

  const mostrarLista = aberta && !ocupado && (itens.length > 0 || buscando || semResultado);
  const energia = fase === "ok" || fase === "salvando" ? 1 : 0;
  const voz = aberta && texto ? 0.5 : buscando ? 0.35 : 0;
  const nome = primeiroNome ?? (email ? email.split("@")[0]! : "Aluno");

  return (
    <main className="cm" data-fase={fase} data-saindo={saindo || undefined}>
      <div className="cm-fundo" aria-hidden />
      <header className="cm-topo">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial, versão para fundo escuro */}
        <img className="cm-logo" src="/images/aprovum-login-logo.png" alt="Aprovum" width={523} height={107} />
        <Link href="/perfil" className="cm-perfil" aria-label={`Perfil de ${nome}: abrir configurações`}>
          <span className="cm-avatar" aria-hidden>{nome.slice(0, 1).toUpperCase()}</span>
          <span className="cm-nome">{nome}</span>
          <Settings size={15} aria-hidden className="cm-engrenagem" />
        </Link>
      </header>

      <section className="cm-palco" aria-hidden>
        <MentorOrbita energia={energia} voz={voz} />
      </section>

      <section className="cm-corpo">
        <p className="cm-kicker cm-e1">MENTOR APROVUM</p>
        <h1 className="cm-titulo cm-e2">QUAL É O SEU PRÓXIMO OBJETIVO?</h1>
        <p className="cm-sub cm-e3"><span>Escolha seu próximo concurso.</span> <span>O Mentor vai direcionar sua preparação.</span></p>

        <div className="cm-form cm-e4" data-foco={aberta || undefined}>
          {mostrarLista && (
            <ul className="cm-lista" id={listaId} role="listbox" aria-label="Concursos">
              {itens.map((s, i) => (
                <li
                  key={`${s.tipo}:${s.id}`}
                  id={`${listaId}-${i}`}
                  role="option"
                  aria-selected={i === ativa}
                  data-ativa={i === ativa || undefined}
                  className="cm-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setAtiva(i)}
                  onClick={() => escolherItem(s)}
                >
                  <span className="cm-item-nome">{s.nome}</span>
                  <span className="cm-item-det">{[TIPO_ROTULO[s.tipo], s.detalhe && s.tipo !== "edital" ? s.detalhe : s.tipo === "edital" ? s.detalhe?.replace(/^Seu edital · ?/, "") : null].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
              {buscando && itens.length === 0 && <li className="cm-nota" role="status">Buscando concursos…</li>}
              {semResultado && (
                <li className="cm-nota" role="status">
                  <span>Não encontramos “{consulta}” no catálogo do Aprovum.</span>
                  <button type="button" className="cm-continuar" onMouseDown={(e) => e.preventDefault()} onClick={() => void confirmar(texto)}>
                    Continuar com “{consulta}”
                  </button>
                </li>
              )}
            </ul>
          )}
          <div className="cm-campo">
            <Search size={19} aria-hidden className="cm-lupa" />
            <input
              ref={campo}
              className="cm-input"
              type="text"
              inputMode="search"
              enterKeyHint="go"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
              maxLength={120}
              placeholder="Digite o concurso desejado…"
              aria-label="Concurso desejado"
              role="combobox"
              aria-expanded={mostrarLista}
              aria-controls={listaId}
              aria-autocomplete="list"
              aria-activedescendant={mostrarLista && ativa >= 0 ? `${listaId}-${ativa}` : undefined}
              aria-invalid={fase === "erro" || undefined}
              disabled={ocupado}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setAberta(true);
                setAtiva(-1);
                if (fase === "erro") {
                  setFase("ocioso");
                  setErro(null);
                }
              }}
              onFocus={() => setAberta(true)}
              onBlur={() => setAberta(false)}
              onKeyDown={aoTeclar}
            />
            <button
              type="button"
              className="cm-ir"
              aria-label="Continuar"
              disabled={ocupado || texto.trim().length < 3}
              onClick={() => (ativa >= 0 && itens[ativa] ? escolherItem(itens[ativa]!) : itens[0] && consulta ? escolherItem(itens[0]) : void confirmar(texto))}
            >
              {fase === "salvando" ? <Loader2 size={18} className="cm-gira" aria-hidden /> : <ArrowRight size={18} aria-hidden />}
            </button>
          </div>
        </div>

        <p className="cm-estado" role="status" aria-live="polite" data-tipo={fase === "erro" ? "erro" : undefined}>
          {fase === "erro" && erro}
          {fase === "salvando" && "Preparando sua missão…"}
          {fase === "ok" && confirmado && `Objetivo confirmado: ${confirmado}`}
          {fase === "ocioso" && objetivo && `Objetivo atual: ${objetivo}`}
        </p>

        <Link href="/trilhas" className="cm-painel">Ir para os estudos</Link>
      </section>
    </main>
  );
}
