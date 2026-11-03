"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Lock, RotateCcw, Shirt, Sparkles, User, Scissors, Smile, PersonStanding, Footprints, Glasses, X } from "lucide-react";
import { AvatarStage } from "./avatar-stage";
import { PORTRAITS } from "./portraits";
import {
  BODY_SLIDERS,
  FACE_OPTIONS,
  GENDERS,
  HAIR_COLORS,
  OPTIONAL_SLOTS,
  SKIN_TONES,
  defaultAvatar,
  isUnlocked,
  switchGender,
  type AvatarConfig,
  type AvatarItem,
  type FaceKey,
  type Gender,
  type Slot,
} from "@/domain/avatar/catalog";

export type AvatarSaveResult = { ok: true; config: AvatarConfig } | { ok: false; error: string };

export interface PainelAvatarProps {
  name: string | null;
  initial: AvatarConfig;
  saved: boolean;
  items: AvatarItem[];
  progress: { level: number; xp: number; levelProgress: number };
  save: (config: AvatarConfig) => Promise<AvatarSaveResult>;
  /** Só galeria/testes. */
  mannequin?: boolean;
}

const TABS = [
  { id: "genero", label: "Gênero", icon: User },
  { id: "pele", label: "Pele", icon: Smile },
  { id: "cabelo", label: "Cabelo", icon: Scissors },
  { id: "rosto", label: "Rosto", icon: Smile },
  { id: "corpo", label: "Corpo", icon: PersonStanding },
  { id: "roupas", label: "Roupas", icon: Shirt },
  { id: "calcados", label: "Calçados", icon: Footprints },
  { id: "acessorios", label: "Acessórios", icon: Glasses },
] as const;
type Tab = (typeof TABS)[number]["id"];

const TAB_SLOTS: Partial<Record<Tab, Slot[]>> = {
  cabelo: ["cabelo", "barba"],
  roupas: ["camiseta", "uniforme", "jaqueta", "calca"],
  calcados: ["calcado"],
  acessorios: ["bone", "oculos", "acessorio"],
};
const SLOT_TITLE: Record<Slot, string> = {
  cabelo: "Estilo de cabelo",
  barba: "Barba e bigode",
  camiseta: "Camisetas",
  uniforme: "Uniformes e roupas táticas",
  jaqueta: "Jaquetas e moletons",
  calca: "Calças e shorts",
  calcado: "Calçados",
  bone: "Bonés",
  oculos: "Óculos",
  acessorio: "Acessórios",
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Avatar no painel: personagem, nível, XP e o editor de personalização (no próprio painel). */
export function PainelAvatar({ name, initial, saved, items, progress, save, mannequin }: PainelAvatarProps) {
  const [committed, setCommitted] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [open, setOpen] = useState(!saved);
  const [tab, setTab] = useState<Tab>(saved ? "roupas" : "genero");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(committed);
  const shown = open ? draft : committed;
  const nextLevelPct = Math.round(progress.levelProgress * 100);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const patch = (p: Partial<AvatarConfig>) => {
    setMsg(null);
    setDraft((d) => ({ ...d, ...p }));
  };
  const equip = (slot: Slot, id: string | null) => {
    setMsg(null);
    setDraft((d) => {
      const eq = { ...d.equipped };
      if (id) eq[slot] = id;
      else delete eq[slot];
      if (slot === "uniforme" && id) delete eq.jaqueta;
      if (slot === "jaqueta" && id) delete eq.uniforme;
      return { ...d, equipped: eq };
    });
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

  return (
    <section className="av-bloco" aria-labelledby="av-titulo" data-testid="painel-avatar">
      <div className="av-palco-col">
        <div className="av-genero" role="radiogroup" aria-label="Avatar">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={shown.gender === g.id}
              className={shown.gender === g.id ? "is-on" : ""}
              onClick={() => {
                if (!open) setOpen(true);
                setDraft((d) => switchGender(open ? d : committed, g.id as Gender, items));
                setMsg(null);
              }}
              data-testid={`avatar-genero-${g.id}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <AvatarStage config={shown} items={items} interactive className="av-palco" mannequin={mannequin} />
        <div className="av-info" data-testid="avatar-info">
          <p className="av-nome">{name ?? "Aluno APROVUM"}</p>
          <p className="av-nivel">
            Nível <b>{progress.level}</b>
          </p>
          <div className="av-xp">
            <span>XP total</span>
            <b data-testid="avatar-xp">{fmt(progress.xp)}</b>
          </div>
          <div className="av-barra" role="progressbar" aria-label={`Evolução para o nível ${progress.level + 1}`} aria-valuenow={nextLevelPct} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${nextLevelPct}%` }} />
          </div>
          <p className="av-evolucao">{nextLevelPct}% para o nível {progress.level + 1}</p>
          {!open && (
            <div className="av-acoes">
              <button type="button" className="av-btn av-btn-red" onClick={() => (setTab("genero"), setOpen(true))} data-testid="avatar-personalizar">
                <Sparkles aria-hidden /> Personalizar
              </button>
              <button type="button" className="av-btn" onClick={() => (setTab("roupas"), setOpen(true))} data-testid="avatar-guarda-roupa">
                <Shirt aria-hidden /> Guarda-roupa
              </button>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="av-editor" data-testid="avatar-editor">
          <div className="av-editor-topo">
            <h2 id="av-titulo">
              PERSONALIZE SEU <em>AVATAR</em>
            </h2>
            <p>Deixe seu avatar com a cara da sua jornada rumo à aprovação!</p>
          </div>
          <div className="av-abas" role="tablist" aria-label="Personalização">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)} data-testid={`avatar-aba-${t.id}`}>
                <t.icon aria-hidden />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="av-painel" role="tabpanel">
            {tab === "genero" && (
              <>
                <p className="av-rotulo">Escolha seu avatar:</p>
                <div className="av-opcoes-2">
                  {GENDERS.map((g) => (
                    <button key={g.id} type="button" className={`av-opcao-grande ${draft.gender === g.id ? "is-on" : ""}`} aria-pressed={draft.gender === g.id} onClick={() => setDraft((d) => switchGender(d, g.id as Gender, items))}>
                      {g.label}
                      {draft.gender === g.id && <Check aria-hidden />}
                    </button>
                  ))}
                </div>
                <p className="av-nota">Ao trocar, pele, cor do cabelo, rosto, corpo e roupas unissex são mantidos.</p>
              </>
            )}
            {tab === "pele" && (
              <>
                <p className="av-rotulo">Cor da pele:</p>
                <div className="av-cores">
                  {SKIN_TONES.map((s) => (
                    <button key={s.id} type="button" className={draft.skin === s.id ? "is-on" : ""} style={{ background: s.hex }} aria-label={s.label} aria-pressed={draft.skin === s.id} title={s.label} onClick={() => patch({ skin: s.id })} data-testid={`avatar-pele-${s.id}`} />
                  ))}
                </div>
              </>
            )}
            {tab === "cabelo" && (
              <>
                <p className="av-rotulo">Cor do cabelo:</p>
                <div className="av-cores">
                  {HAIR_COLORS.map((h) => (
                    <button key={h.id} type="button" className={draft.hairColor === h.id ? "is-on" : ""} style={{ background: h.hex }} aria-label={h.label} aria-pressed={draft.hairColor === h.id} title={h.label} onClick={() => patch({ hairColor: h.id })} data-testid={`avatar-cabelo-cor-${h.id}`} />
                  ))}
                </div>
              </>
            )}
            {tab === "rosto" &&
              (Object.keys(FACE_OPTIONS) as FaceKey[]).map((k) => (
                <div key={k}>
                  <p className="av-rotulo">{k === "formato" ? "Formato do rosto" : k === "sobrancelhas" ? "Sobrancelhas" : "Olhos"}:</p>
                  <div className="av-chips">
                    {FACE_OPTIONS[k].map((o) => (
                      <button key={o.id} type="button" className={draft.face[k] === o.id ? "is-on" : ""} aria-pressed={draft.face[k] === o.id} onClick={() => patch({ face: { ...draft.face, [k]: o.id } })}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            {tab === "corpo" &&
              BODY_SLIDERS.map((s) => (
                <label key={s.id} className="av-slider">
                  <span>{s.label}</span>
                  <input type="range" min={0} max={100} value={draft.body[s.id]} onChange={(e) => patch({ body: { ...draft.body, [s.id]: Number(e.target.value) } })} data-testid={`avatar-corpo-${s.id}`} />
                  <small>
                    <span>{s.min}</span>
                    <span>{s.max}</span>
                  </small>
                </label>
              ))}
            {TAB_SLOTS[tab]?.map((slot) => {
              const list = items.filter((i) => i.slot === slot && i.genders.includes(draft.gender));
              if (!list.length) return null;
              return (
                <div key={slot}>
                  <p className="av-rotulo">{SLOT_TITLE[slot]}:</p>
                  <div className="av-grade">
                    {OPTIONAL_SLOTS.has(slot) && (
                      <button type="button" className={`av-item ${!draft.equipped[slot] ? "is-on" : ""}`} onClick={() => equip(slot, null)} aria-pressed={!draft.equipped[slot]}>
                        <span className="av-item-img">
                          <X aria-hidden />
                        </span>
                        <span className="av-item-nome">Nenhum</span>
                      </button>
                    )}
                    {list.map((it) => {
                      const unlocked = isUnlocked(it, progress);
                      const on = draft.equipped[slot] === it.id;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          className={`av-item ${on ? "is-on" : ""} ${unlocked ? "" : "is-bloq"}`}
                          aria-pressed={on}
                          aria-disabled={!unlocked}
                          onClick={() => (unlocked ? equip(slot, it.id) : setMsg({ ok: false, text: `“${it.name}” libera no nível ${it.minLevel}${it.minXp ? ` com ${fmt(it.minXp)} XP` : ""}.` }))}
                          data-testid={`avatar-item-${it.id}`}
                        >
                          <span className="av-item-img">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {it.previewUrl ? <img src={it.previewUrl} alt="" loading="lazy" /> : <Shirt aria-hidden />}
                            {on && <Check className="av-item-ok" aria-hidden />}
                            {!unlocked && (
                              <span className="av-item-cadeado">
                                <Lock aria-hidden /> Nível {it.minLevel}
                                {it.minXp ? ` · ${fmt(it.minXp)} XP` : ""}
                              </span>
                            )}
                          </span>
                          <span className="av-item-nome">{it.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {msg && (
            <p className={`av-msg ${msg.ok ? "" : "is-erro"}`} role="status" data-testid="avatar-msg">
              {msg.text}
            </p>
          )}
          <div className="av-rodape">
            <button type="button" className="av-btn" onClick={() => (setDraft(defaultAvatar(draft.gender, items)), setMsg(null))} data-testid="avatar-restaurar">
              <RotateCcw aria-hidden /> Restaurar padrão
            </button>
            <button
              type="button"
              className="av-btn"
              onClick={() => {
                setDraft(committed);
                setMsg(null);
                if (saved || committed !== initial) setOpen(false);
              }}
              data-testid="avatar-cancelar"
            >
              Cancelar
            </button>
            <button type="button" className="av-btn av-btn-red av-btn-salvar" disabled={pending || (!dirty && saved)} onClick={onSave} data-testid="avatar-salvar">
              <Check aria-hidden /> {pending ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
          {!mannequin && PORTRAITS[draft.gender] && !items.some((i) => i.slot === "base" && i.genders.includes(draft.gender) && i.modelUrl) && (
            <p className="av-nota" data-testid="avatar-nota-arte">
              Este personagem é a arte oficial APROVUM animada: nele, mudam o avatar e o tom de pele. Cabelo, barba, rosto, corpo e roupas ficam salvos e aparecem quando as artes dessas peças forem publicadas.
            </p>
          )}
          {[...Object.values(draft.equipped)].some((id) => id && !byId.get(id)?.modelUrl) && items.some((i) => i.slot === "base" && i.modelUrl) && <p className="av-nota">Algumas peças ainda estão sem modelo 3D e aparecem no personagem quando forem publicadas.</p>}
        </div>
      )}
    </section>
  );
}
