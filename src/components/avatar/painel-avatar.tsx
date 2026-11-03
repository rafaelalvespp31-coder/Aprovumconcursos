"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Lock, RotateCcw, Trophy } from "lucide-react";
import { AvatarStage } from "./avatar-stage";
import { PORTRAITS } from "./portraits";
import {
  GENDERS,
  HAIR_COLORS,
  SKIN_TONES,
  defaultAvatar,
  isUnlocked,
  switchGender,
  type AvatarConfig,
  type AvatarItem,
  type Gender,
  type Slot,
} from "@/domain/avatar/catalog";

export type AvatarSaveResult = { ok: true; config: AvatarConfig } | { ok: false; error: string };

export interface PainelAvatarProps {
  name: string | null;
  initial: AvatarConfig;
  saved: boolean;
  items: AvatarItem[];
  progress: { level: number; xp: number; levelProgress: number; xpNext?: number; rank?: { position: number | null; total: number } | null };
  save: (config: AvatarConfig) => Promise<AvatarSaveResult>;
  /** Só galeria/testes. */
  mannequin?: boolean;
}

const TABS = [
  { id: "roupas", label: "Roupas" },
  { id: "pele", label: "Pele" },
  { id: "cabelo", label: "Cabelo" },
  { id: "barba", label: "Barba" },
  { id: "acessorios", label: "Acessórios" },
  { id: "especiais", label: "Avatares Especiais" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const fmt = (n: number) => n.toLocaleString("pt-BR");
const order = (k: string) => (a: AvatarItem, b: AvatarItem) => Number(a.meta[k] ?? 99) - Number(b.meta[k] ?? 99) || a.sort - b.sort;

/**
 * Painel = avatar. Réplica do layout oficial: palco com o cenário e o card do aluno à esquerda,
 * "PERSONALIZE SEU AVATAR" à direita (abas, guarda-roupa, cores, cabelo, barba e botões).
 */
export function PainelAvatar({ name, initial, saved, items, progress, save, mannequin }: PainelAvatarProps) {
  const [committed, setCommitted] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [tab, setTab] = useState<Tab>("roupas");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(committed);
  const g = draft.gender;
  const fits = (i: AvatarItem) => i.genders.includes(g);
  const bySlot = useMemo(() => {
    const m = new Map<string, AvatarItem[]>();
    for (const i of items) m.set(i.slot, [...(m.get(i.slot) ?? []), i]);
    return m;
  }, [items]);
  const roupas = items.filter((i) => i.meta.roupas !== undefined && fits(i)).sort(order("roupas"));
  const hairs = (bySlot.get("cabelo") ?? []).filter(fits).sort(order("grade"));
  const beards = (bySlot.get("barba") ?? []).filter(fits).sort(order("grade"));
  const accessories = [...(bySlot.get("bone") ?? []), ...(bySlot.get("oculos") ?? []), ...(bySlot.get("acessorio") ?? [])].filter(fits).sort(order("grade"));
  const especiais = (bySlot.get("uniforme") ?? []).filter(fits).sort((a, b) => a.minLevel - b.minLevel || a.sort - b.sort);
  const extras = [...(bySlot.get("calca") ?? []), ...(bySlot.get("calcado") ?? [])].filter(fits);
  const art2d = !mannequin && !!PORTRAITS[g] && !items.some((i) => i.slot === "base" && i.genders.includes(g) && i.modelUrl);

  const equipped = (it: AvatarItem) => draft.equipped[it.slot as Slot] === it.id;
  const equip = (it: AvatarItem | null, slot: Slot) => {
    if (it && !isUnlocked(it, progress)) {
      setMsg({ ok: false, text: `“${it.name}” libera no nível ${it.minLevel}${it.minXp ? ` com ${fmt(it.minXp)} XP` : ""}.` });
      return;
    }
    setMsg(null);
    setDraft((d) => {
      const eq = { ...d.equipped };
      if (!it) delete eq[slot];
      else if (eq[slot] === it.id && slot !== "camiseta" && slot !== "cabelo") delete eq[slot];
      else eq[slot] = it.id;
      // roupa do layout: uma peça de cima por vez (camiseta, uniforme ou jaqueta)
      if (it && (slot === "uniforme" || slot === "jaqueta" || slot === "camiseta")) {
        if (slot !== "uniforme") delete eq.uniforme;
        if (slot !== "jaqueta") delete eq.jaqueta;
      }
      return { ...d, equipped: eq };
    });
  };
  const pickGender = (id: Gender) => {
    setMsg(null);
    setDraft((d) => switchGender(d, id, items));
  };
  const onSave = () =>
    start(async () => {
      const r = await save(draft);
      if (r.ok) {
        setCommitted(r.config);
        setDraft(r.config);
        setMsg({ ok: true, text: "Avatar salvo." });
      } else setMsg({ ok: false, text: r.error });
    });

  const tile = (it: AvatarItem, kind: "roupa" | "rosto" = "roupa") => {
    const unlocked = isUnlocked(it, progress);
    const on = equipped(it);
    return (
      <button
        key={it.id}
        type="button"
        className={`avc-tile avc-tile-${kind} ${on ? "is-on" : ""} ${unlocked ? "" : "is-bloq"}`}
        aria-pressed={on}
        aria-disabled={!unlocked}
        title={it.name}
        aria-label={it.name}
        onClick={() => equip(it, it.slot as Slot)}
        data-testid={`avatar-item-${it.id}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {it.previewUrl ? <img src={it.previewUrl} alt="" loading="lazy" draggable={false} /> : <span className="avc-tile-nome">{it.name}</span>}
        {on && (
          <span className="avc-ok" aria-hidden>
            <Check />
          </span>
        )}
        {!unlocked && (
          <span className="avc-cadeado">
            <Lock aria-hidden /> Nível {it.minLevel}
            {it.minXp ? ` · ${fmt(it.minXp)} XP` : ""}
          </span>
        )}
      </button>
    );
  };

  const grid = (list: AvatarItem[], label: string, kind: "roupa" | "rosto" = "roupa") =>
    list.length ? (
      <>
        <p className="avc-rot">{label}</p>
        <div className={`avc-grade avc-grade-${kind}`}>
          {list.map((it) => tile(it, kind))}
        </div>
      </>
    ) : null;

  const skinBox = (
    <div className="avc-caixa">
      <p className="avc-rot">Cor da pele:</p>
      <div className="avc-cores">
        {SKIN_TONES.map((s) => (
          <button key={s.id} type="button" className={draft.skin === s.id ? "is-on" : ""} aria-label={s.label} title={s.label} aria-pressed={draft.skin === s.id} onClick={() => (setMsg(null), setDraft((d) => ({ ...d, skin: s.id })))} data-testid={`avatar-pele-${s.id}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.swatch} alt="" draggable={false} />
          </button>
        ))}
      </div>
    </div>
  );
  const hairColorBox = (
    <div className="avc-caixa">
      <p className="avc-rot">Cor do cabelo:</p>
      <div className="avc-cores">
        {HAIR_COLORS.map((h) => (
          <button key={h.id} type="button" className={draft.hairColor === h.id ? "is-on" : ""} aria-label={h.label} title={h.label} aria-pressed={draft.hairColor === h.id} onClick={() => (setMsg(null), setDraft((d) => ({ ...d, hairColor: h.id })))} data-testid={`avatar-cabelo-cor-${h.id}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.swatch} alt="" draggable={false} />
          </button>
        ))}
      </div>
    </div>
  );
  const hairBox = (
    <div className="avc-caixa">
      <p className="avc-rot">Estilo de cabelo:</p>
      <div className="avc-rostos">
        {hairs.slice(0, 4).map((it) => tile(it, "rosto"))}
      </div>
    </div>
  );
  const beardBox =
    g === "m" ? (
      <div className="avc-caixa">
        <p className="avc-rot">Barba:</p>
        <div className="avc-rostos">
          <button type="button" className={`avc-tile avc-tile-rosto ${!draft.equipped.barba ? "is-on" : ""}`} aria-pressed={!draft.equipped.barba} aria-label="Sem barba" title="Sem barba" onClick={() => equip(null, "barba")} data-testid="avatar-sem-barba">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/avatar/ui/barba-sem_barba.webp" alt="" draggable={false} />
          </button>
          {beards
            .filter((b) => b.previewUrl)
            .slice(0, 3)
            .map((it) => tile(it, "rosto"))}
        </div>
      </div>
    ) : (
      <div className="avc-caixa">
        <p className="avc-rot">Acessórios:</p>
        <div className="avc-rostos">
          {accessories.slice(0, 4).map((it) => tile(it, "rosto"))}
        </div>
      </div>
    );

  const xpNext = progress.xpNext ?? progress.xp;
  const pct = xpNext > 0 ? Math.min(100, Math.round((progress.xp / xpNext) * 100)) : 0;

  return (
    <section className="avc" aria-labelledby="avc-titulo" data-testid="painel-avatar">
      <div className="avc-palco">
        <AvatarStage config={draft} items={items} interactive className="avc-palco-arte" mannequin={mannequin} />
        <div className="avc-card" data-testid="avatar-info">
          <p className="avc-card-nome">{name ?? "Aluno APROVUM"}</p>
          <p className="avc-card-nivel">
            Nível <b>{progress.level}</b>
          </p>
          <hr />
          <p className="avc-card-rot">XP Total</p>
          <p className="avc-card-val">
            <span data-testid="avatar-xp">{fmt(progress.xp)}</span> / {fmt(xpNext)}
          </p>
          <div className="avc-card-barra" role="progressbar" aria-label="XP até o próximo nível" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <hr />
          <p className="avc-card-rot">Posição no Ranking</p>
          <p className="avc-card-val avc-card-rank" data-testid="avatar-ranking">
            <Trophy aria-hidden /> {progress.rank?.position ? `#${fmt(progress.rank.position)}` : "—"}
          </p>
          <p className="avc-card-frase">“Disciplina é o caminho da vitória.”</p>
        </div>
        <div className="avc-genero" role="radiogroup" aria-label="Avatar">
          {GENDERS.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={g === x.id} className={g === x.id ? "is-on" : ""} onClick={() => pickGender(x.id)} data-testid={`avatar-genero-${x.id}`}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="avc-editor" data-testid="avatar-editor">
        <div className="avc-topo">
          <h1 id="avc-titulo">
            PERSONALIZE SEU <em>AVATAR</em>
          </h1>
          <p>Deixe seu avatar com a cara da sua jornada rumo à aprovação!</p>
        </div>

        <div className="avc-abas" role="tablist" aria-label="Personalização">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)} data-testid={`avatar-aba-${t.id}`}>
              <span className="avc-aba-ico" style={{ WebkitMaskImage: `url(/avatar/ui/aba-${t.id}.png)`, maskImage: `url(/avatar/ui/aba-${t.id}.png)` }} aria-hidden />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="avc-painel" role="tabpanel">
          {tab === "roupas" && grid(roupas, "Escolha um estilo de roupa:")}
          {tab === "pele" && <div className="avc-solo">{skinBox}</div>}
          {tab === "cabelo" && (
            <>
              {grid(hairs, "Escolha um estilo de cabelo:", "rosto")}
              <div className="avc-solo">{hairColorBox}</div>
            </>
          )}
          {tab === "barba" && (g === "m" ? <div className="avc-solo">{beardBox}</div> : <p className="avc-nota">Barba e bigode estão disponíveis para o avatar masculino.</p>)}
          {tab === "acessorios" && (
            <>
              {grid(accessories, "Escolha seus acessórios:", "rosto")}
              {grid(extras, "Calças, shorts e calçados:")}
            </>
          )}
          {tab === "especiais" && grid(especiais, "Uniformes especiais (itens cosméticos, sem vínculo com as corporações):")}
        </div>

        <div className="avc-duplo">
          {skinBox}
          {hairColorBox}
        </div>
        <div className="avc-duplo avc-duplo-rostos">
          {hairBox}
          {beardBox}
        </div>

        {msg && (
          <p className={`avc-msg ${msg.ok ? "" : "is-erro"}`} role="status" data-testid="avatar-msg">
            {msg.text}
          </p>
        )}
        {art2d && (
          <p className="avc-nota" data-testid="avatar-nota-arte">
            Personagem em arte oficial animada: o tom de pele e a cor do cabelo mudam na hora. Roupas, cortes de cabelo e barba ficam salvos e aparecem no personagem quando as artes dessas peças forem publicadas.
          </p>
        )}
        <div className="avc-rodape">
          <button type="button" className="avc-btn" onClick={() => (setDraft(defaultAvatar(g, items)), setMsg(null))} data-testid="avatar-restaurar">
            <RotateCcw aria-hidden /> Restaurar Padrão
          </button>
          {dirty && (
            <button type="button" className="avc-btn avc-btn-texto" onClick={() => (setDraft(committed), setMsg(null))} data-testid="avatar-cancelar">
              Cancelar
            </button>
          )}
          <button type="button" className="avc-btn avc-btn-salvar" disabled={pending || (!dirty && saved)} onClick={onSave} data-testid="avatar-salvar">
            <Check aria-hidden /> {pending ? "Salvando…" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </section>
  );
}
