"use client";

import { useEffect, useRef, useState } from "react";
import type { AvatarConfig, AvatarItem } from "@/domain/avatar/catalog";
import { SKIN_TONES, HAIR_COLORS } from "@/domain/avatar/catalog";
import type { EngineDebug } from "./engine";
import { PORTRAITS } from "./portraits";

type Engine = { setConfig: (c: AvatarConfig, items: readonly AvatarItem[]) => Promise<void> | void; resize: () => void; dispose: () => void };

/**
 * Palco do avatar. Carrega o three.js só quando aparece (não pesa nas outras telas).
 * Ordem: modelo 3D publicado → arte 2D oficial animada (personagem do layout) → aviso de
 * "personagem em produção". Nunca um boneco genérico no lugar.
 */
export function AvatarStage({
  config,
  items,
  interactive = false,
  className = "",
  mannequin = false,
  testId = "avatar-palco",
}: {
  config: AvatarConfig;
  items: readonly AvatarItem[];
  interactive?: boolean;
  className?: string;
  /** Só galeria/testes: usa o manequim de teste no lugar dos modelos finais. */
  mannequin?: boolean;
  testId?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [failed, setFailed] = useState(false);
  const has3d = mannequin || items.some((i) => i.slot === "base" && i.genders.includes(config.gender) && i.modelUrl);
  const portrait = !has3d ? PORTRAITS[config.gender] : undefined;
  const hasModel = has3d || !!portrait;

  useEffect(() => {
    if (!hasModel || !canvasRef.current) return;
    let alive = true;
    let ro: ResizeObserver | null = null;
    const canvas = canvasRef.current;
    const onDebug = (d: EngineDebug) => {
      canvas.dataset.breath = d.breath.toFixed(3);
      canvas.dataset.blinks = String(d.blinks);
      canvas.dataset.chest = d.chestScale.toFixed(4);
      canvas.dataset.head = d.headYaw.toFixed(4);
      canvas.dataset.ready = String(d.ready);
    };
    const boot = portrait
      ? import("./portrait").then(({ PortraitEngine }) => {
          if (!alive) return;
          const engine = new PortraitEngine(canvas, portrait, onDebug);
          canvas.dataset.mode = "arte-2d";
          engineRef.current = { setConfig: (c) => engine.setConfig(c), resize: () => engine.resize(), dispose: () => engine.dispose() };
          engine.load(config).catch(() => setFailed(true));
          ro = new ResizeObserver(() => engine.resize());
          ro.observe(canvas);
        })
      : import("./engine").then(({ AvatarEngine, buildTestMannequin }) => {
          if (!alive) return;
          const engine = new AvatarEngine(canvas, { interactive, onDebug });
          canvas.dataset.mode = "3d";
          engineRef.current = engine;
          if (mannequin) engine.setModelObject(buildTestMannequin(config.gender));
          engine.setConfig(config, items).catch(() => setFailed(true));
          engine.start();
          ro = new ResizeObserver(() => engine.resize());
          ro.observe(canvas);
        });
    boot.catch(() => setFailed(true));
    return () => {
      alive = false;
      ro?.disconnect();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // o motor é criado uma vez por gênero/modo; as trocas de roupa entram pelo efeito abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasModel, mannequin, config.gender, interactive]);

  useEffect(() => {
    Promise.resolve(engineRef.current?.setConfig(config, items)).catch(() => setFailed(true));
  }, [config, items]);

  if (!hasModel || failed) {
    const skin = SKIN_TONES.find((s) => s.id === config.skin);
    const hair = HAIR_COLORS.find((h) => h.id === config.hairColor);
    return (
      <div className={`av-producao ${className}`} data-testid={`${testId}-producao`} role="img" aria-label="Personagem 3D em produção">
        <svg viewBox="0 0 120 220" className="av-silhueta" aria-hidden>
          <defs>
            <linearGradient id="avg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#2a2a2e" />
              <stop offset="1" stopColor="#111113" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="30" r="18" fill="url(#avg)" />
          <path d="M28 70 Q60 52 92 70 L98 140 L84 142 L82 214 L64 214 L60 150 L56 214 L38 214 L36 142 L22 140 Z" fill="url(#avg)" />
        </svg>
        <p className="av-producao-t">{failed ? "Não foi possível carregar o personagem agora." : "Personagem 3D em produção"}</p>
        <p className="av-producao-d">
          Suas escolhas já ficam salvas ({config.gender === "f" ? "feminino" : "masculino"}
          {skin ? `, pele ${skin.label.toLowerCase()}` : ""}
          {hair ? `, cabelo ${hair.label.toLowerCase()}` : ""}) e aparecem no personagem assim que os modelos 3D forem publicados.
        </p>
      </div>
    );
  }
  return <canvas ref={canvasRef} className={`av-canvas ${className}`} data-testid={testId} aria-label="Seu avatar" role="img" />;
}
