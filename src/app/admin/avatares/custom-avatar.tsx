"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { eyeBoxes, landmarksFromSilhouette, type BodyLandmarks, type EyeBox } from "@/domain/avatar/custom";

type Result = { ok: boolean; error?: string };
const MAX_H = 3168; // altura máxima das camadas (cabe nas texturas de qualquer celular)
const HEAD = 0.24; // parte de cima mostrada para marcar os olhos

interface Prepared {
  art: HTMLCanvasElement;
  lm: BodyLandmarks;
  removedBg: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error("imagem inválida"));
    img.src = URL.createObjectURL(file);
  });
}

/** Recorte: usa a transparência da imagem; sem ela, remove o fundo liso a partir das bordas. */
function prepare(img: HTMLImageElement, tolerance: number): Prepared {
  const scale = Math.min(1, 4096 / img.naturalHeight, 4096 / img.naturalWidth);
  const W = Math.round(img.naturalWidth * scale);
  const H = Math.round(img.naturalHeight * scale);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H);
  const px = data.data;
  // Já tem fundo transparente?
  let clear = 0, border = 0;
  const visit = (x: number, y: number) => {
    border++;
    if (px[(y * W + x) * 4 + 3]! < 200) clear++;
  };
  for (let x = 0; x < W; x++) {
    visit(x, 0);
    visit(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    visit(0, y);
    visit(W - 1, y);
  }
  let removedBg = false;
  if (clear / border < 0.5) {
    removedBg = true;
    // Cor de fundo = mediana das bordas; preenchimento a partir de todas as bordas.
    const samples: number[][] = [];
    for (let x = 0; x < W; x += 3) for (const y of [0, H - 1]) samples.push([px[(y * W + x) * 4]!, px[(y * W + x) * 4 + 1]!, px[(y * W + x) * 4 + 2]!]);
    for (let y = 0; y < H; y += 3) for (const x of [0, W - 1]) samples.push([px[(y * W + x) * 4]!, px[(y * W + x) * 4 + 1]!, px[(y * W + x) * 4 + 2]!]);
    const med = [0, 1, 2].map((k) => samples.map((s) => s[k]!).sort((a, b) => a - b)[samples.length >> 1]!);
    const t2 = tolerance * tolerance * 3;
    const near = (i: number) => {
      const dr = px[i]! - med[0]!, dg = px[i + 1]! - med[1]!, db = px[i + 2]! - med[2]!;
      return dr * dr + dg * dg + db * db <= t2;
    };
    const bg = new Uint8Array(W * H);
    const stack: number[] = [];
    const push = (p: number) => {
      if (!bg[p] && near(p * 4)) {
        bg[p] = 1;
        stack.push(p);
      }
    };
    for (let x = 0; x < W; x++) {
      push(x);
      push((H - 1) * W + x);
    }
    for (let y = 0; y < H; y++) {
      push(y * W);
      push(y * W + W - 1);
    }
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % W, y = (p / W) | 0;
      if (x > 0) push(p - 1);
      if (x < W - 1) push(p + 1);
      if (y > 0) push(p - W);
      if (y < H - 1) push(p + W);
    }
    // Borda suave (1 px) para o contorno não ficar serrilhado.
    for (let p = 0; p < W * H; p++) {
      if (bg[p]) px[p * 4 + 3] = 0;
      else {
        const x = p % W, y = (p / W) | 0;
        const n = (x > 0 && bg[p - 1] ? 1 : 0) + (x < W - 1 && bg[p + 1] ? 1 : 0) + (y > 0 && bg[p - W] ? 1 : 0) + (y < H - 1 && bg[p + W] ? 1 : 0);
        if (n) px[p * 4 + 3] = Math.round(px[p * 4 + 3]! * (1 - n * 0.18));
      }
    }
  }
  // Recorte justo no personagem.
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (px[(y * W + x) * 4 + 3]! > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) throw new Error("Não sobrou nada depois do recorte. Diminua a tolerância.");
  ctx.putImageData(data, 0, 0);
  // Recorte justo: o topo da cabeça e a sola dos pés vão exatamente para as linhas da posição padrão.
  const cx0 = x0, cy0 = y0, cx1 = x1, cy1 = y1;
  // Mesmo tamanho do avatar padrão: 3168 px de altura (sem ampliar imagens menores).
  const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1;
  const k = Math.min(1, MAX_H / ch);
  const art = document.createElement("canvas");
  art.width = Math.max(1, Math.round(cw * k));
  art.height = Math.max(1, Math.round(ch * k));
  const ag = art.getContext("2d")!;
  ag.imageSmoothingQuality = "high";
  ag.drawImage(c, cx0, cy0, cw, ch, 0, 0, art.width, art.height);
  // Silhueta → pontos do corpo (respiração).
  const a = art.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, art.width, art.height).data;
  const left: number[] = [], right: number[] = [];
  for (let y = 0; y < art.height; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < art.width; x++)
      if (a[(y * art.width + x) * 4 + 3]! > 64) {
        if (l < 0) l = x;
        r = x;
      }
    left.push(l);
    right.push(r);
  }
  return { art, lm: landmarksFromSilhouette(left, right, art.width), removedBg };
}

/**
 * Camada das pálpebras, como nas artes padrão: a abertura do olho é preenchida com a própria
 * pele ao redor (sobrancelha e cílios não entram no preenchimento), com sombra suave em cima,
 * vinco, linha dos cílios curva e borda esfumada. A sobrancelha continua por cima.
 */
function buildLids(art: HTMLCanvasElement, eyes: [EyeBox, EyeBox]): HTMLCanvasElement {
  const W = art.width, H = art.height;
  const src = art.getContext("2d", { willReadFrequently: true })!;
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const og = out.getContext("2d")!;
  for (const e of eyes) {
    const bx0 = e.x0 * W, by0 = e.y0 * H, bw = (e.x1 - e.x0) * W, bh = (e.y1 - e.y0) * H;
    const rx = bw * 0.64, ry = bh * 0.7;
    const cx = bx0 + bw / 2, cy = by0 + bh / 2 - bh * 0.06;
    const X0 = Math.max(0, Math.floor(cx - rx * 1.8)), Y0 = Math.max(0, Math.floor(by0 - bh * 0.3));
    const X1 = Math.min(W, Math.ceil(cx + rx * 1.8)), Y1 = Math.min(H, Math.ceil(by0 + bh * 2.4));
    const w = X1 - X0, h = Y1 - Y0;
    if (w < 4 || h < 4) continue;
    const d = src.getImageData(X0, Y0, w, h).data;
    const n = w * h;
    const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), lum = new Float32Array(n);
    const U = new Float32Array(n), V = new Float32Array(n), unknown = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      R[i] = d[i * 4]!; G[i] = d[i * 4 + 1]!; B[i] = d[i * 4 + 2]!;
      lum[i] = 0.299 * R[i]! + 0.587 * G[i]! + 0.114 * B[i]!;
      const x = i % w, y = (i / w) | 0;
      U[i] = (x + X0 - cx) / rx;
      V[i] = (y + Y0 - cy) / ry;
      const inEllipse = U[i]! * U[i]! + V[i]! * V[i]! <= 1;
      if (inEllipse || lum[i]! < 95 || d[i * 4 + 3]! < 200) unknown[i] = 1;
    }
    // Sobrancelha encostada no olho? Protege mais (como na arte masculina padrão).
    let near = 0, nearDark = 0;
    for (let i = 0; i < n; i++)
      if (V[i]! < -1.25 && V[i]! > -1.8 && Math.abs(U[i]!) < 0.8) {
        near++;
        if (lum[i]! < 95) nearDark++;
      }
    const browV = near && nearDark / near > 0.25 ? -0.35 : -0.92;
    // Preenche o desconhecido com a pele conhecida (difusão), começando pela média da pele.
    let sr = 0, sg = 0, sb = 0, sc = 0;
    for (let i = 0; i < n; i++)
      if (!unknown[i]) {
        sr += R[i]!;
        sg += G[i]!;
        sb += B[i]!;
        sc++;
      }
    if (!sc) continue;
    for (let i = 0; i < n; i++)
      if (unknown[i]) {
        R[i] = sr / sc;
        G[i] = sg / sc;
        B[i] = sb / sc;
      }
    for (let it = 0; it < 220; it++) {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!unknown[i]) continue;
          R[i] = (R[i - 1]! + R[i + 1]! + R[i - w]! + R[i + w]!) / 4;
          G[i] = (G[i - 1]! + G[i + 1]! + G[i - w]! + G[i + w]!) / 4;
          B[i] = (B[i - 1]! + B[i + 1]! + B[i - w]! + B[i + w]!) / 4;
        }
    }
    const img = og.createImageData(w, h);
    const o = img.data;
    for (let i = 0; i < n; i++) {
      const u = U[i]!, v = V[i]!;
      let f = 1 - 0.13 * Math.min(1, Math.max(0, (0.35 - v) / 1.35)); // sombra suave no alto da pálpebra
      const crease = Math.exp(-(((v + 0.78 + 0.2 * u * u) / 0.16) ** 2)) * Math.max(0, 1 - Math.abs(u));
      f *= 1 - 0.22 * crease;
      const lv = 0.4 + 0.2 * (1 - u * u), lw = 0.08 + 0.06 * (1 - u * u);
      const lash = Math.exp(-(((v - lv) / lw) ** 2)) * Math.min(1, Math.max(0, 1.15 - Math.abs(u)));
      const mix = (c: number, dark: number) => c * f * (1 - 0.95 * lash) + dark * 0.95 * lash;
      let alpha = Math.min(1, Math.max(0, 1 - (u * u + v * v - 0.72) / 0.5));
      if (lum[i]! < 95 && v < browV) alpha *= 0; // sobrancelha por cima
      o[i * 4] = mix(R[i]!, 24);
      o[i * 4 + 1] = mix(G[i]!, 16);
      o[i * 4 + 2] = mix(B[i]!, 14);
      o[i * 4 + 3] = Math.round(alpha * 255);
    }
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d")!.putImageData(img, 0, 0);
    og.save();
    og.filter = `blur(${Math.max(0.5, bh * 0.05)}px)`;
    og.drawImage(tmp, X0, Y0);
    og.restore();
  }
  return out;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("falha ao gerar imagem"))), type, q));

/** Anexar a arte pronta do aluno: recorte, pontos do corpo, olhos (2 cliques) e prévia da piscada. */
export function CustomAvatar({ requestId, hasCustom, save, remove, slot = 0 }: { requestId: string; hasCustom: boolean; save: (id: string, f: FormData) => Promise<Result>; remove: (id: string, slot: number) => Promise<Result>; slot?: number }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tol, setTol] = useState(30);
  const [eyes, setEyes] = useState<Array<{ x: number; y: number }>>([]);
  const [blink, setBlink] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const headRef = useRef<HTMLCanvasElement>(null);
  const fullRef = useRef<HTMLCanvasElement>(null);

  const prepared = useMemo((): { prep: Prepared | null; error: string | null } => {
    if (!img) return { prep: null, error: null };
    try {
      return { prep: prepare(img, tol), error: null };
    } catch (e) {
      return { prep: null, error: (e as Error).message };
    }
  }, [img, tol]);
  const prep = prepared.prep;

  const boxes = useMemo(() => (prep && eyes.length === 2 ? eyeBoxes(eyes[0]!, eyes[1]!, prep.art.width, prep.art.height) : null), [prep, eyes]);
  const lids = useMemo(() => (prep && boxes ? buildLids(prep.art, boxes) : null), [prep, boxes]);

  useEffect(() => {
    if (!prep) return;
    const { art } = prep;
    // Cabeça ampliada para marcar os olhos.
    const head = headRef.current!;
    const sh = Math.round(art.height * HEAD);
    head.width = art.width;
    head.height = sh;
    const hg = head.getContext("2d")!;
    hg.clearRect(0, 0, head.width, head.height);
    hg.drawImage(art, 0, 0, art.width, sh, 0, 0, art.width, sh);
    if (lids && blink) hg.drawImage(lids, 0, 0, art.width, sh, 0, 0, art.width, sh);
    hg.fillStyle = "#e10600";
    for (const p of eyes) {
      hg.beginPath();
      hg.arc(p.x * art.width, p.y * art.height, Math.max(3, art.width * 0.006), 0, Math.PI * 2);
      hg.fill();
    }
    // Corpo inteiro com as linhas da respiração.
    const full = fullRef.current!;
    full.width = art.width;
    full.height = art.height;
    const fg = full.getContext("2d")!;
    fg.clearRect(0, 0, full.width, full.height);
    fg.drawImage(art, 0, 0);
    if (lids && blink) fg.drawImage(lids, 0, 0);
    fg.lineWidth = Math.max(2, art.height * 0.002);
    for (const [k, color] of [["neckY", "#22d3ee"], ["shoulderY", "#facc15"], ["chestY", "#f97316"], ["waistY", "#a855f7"]] as const) {
      fg.strokeStyle = color;
      fg.beginPath();
      fg.moveTo(0, prep.lm[k] * art.height);
      fg.lineTo(art.width, prep.lm[k] * art.height);
      fg.stroke();
    }
  }, [prep, eyes, blink, lids]);

  const clickEye = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!prep) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = ((e.clientY - r.top) / r.height) * HEAD;
    setEyes((cur) => (cur.length >= 2 ? [{ x, y }] : [...cur, { x, y }]));
  };

  const submit = () =>
    start(async () => {
      if (!prep || !boxes || !lids) return setMsg("Marque os dois olhos.");
      try {
        let art = await toBlob(prep.art, "image/webp", 0.95);
        if (art.size > 3_600_000) art = await toBlob(prep.art, "image/webp", 0.88);
        const lidBlob = await toBlob(lids, "image/png");
        if (art.size + lidBlob.size > 4_200_000) return setMsg("A arte ficou grande demais para enviar (acima de 4 MB). Envie uma imagem um pouco menor.");
        const fd = new FormData();
        fd.set("arte", new File([art], "arte.webp", { type: "image/webp" }));
        fd.set("palpebras", new File([lidBlob], "palpebras.png", { type: "image/png" }));
        fd.set("params", JSON.stringify({ aspect: prep.art.width / prep.art.height, ...prep.lm, eyes: boxes }));
        fd.set("slot", String(slot));
        const r = await save(requestId, fd);
        setMsg(r.ok ? "Avatar do aluno atualizado. Ele já aparece no painel dele, com piscadas e respiração." : r.error ?? "Erro.");
      } catch (e) {
        setMsg((e as Error).message);
      }
    });

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-md border border-linha p-3" data-testid={`avatar-arte-${requestId}`}>
      <p className="t-small font-semibold">Anexar o avatar pronto deste aluno</p>
      <p className="t-tiny text-tinta-suave">
        Arte de corpo inteiro, em pé, de frente, com boa resolução (pelo menos 900 px de altura; ideal 3000 px). PNG com fundo transparente é o melhor; com fundo liso, o fundo é removido aqui.
      </p>
      <input type="file" accept="image/png,image/webp,image/jpeg" className="text-sm" data-testid="avatar-arte-arquivo"
        onChange={async (e) => {
          const f = e.currentTarget.files?.[0];
          setEyes([]);
          if (!f) return setImg(null);
          try {
            const im = await loadImage(f);
            if (im.naturalHeight < 900) setMsg("Atenção: imagem com menos de 900 px de altura — o avatar ficaria borrado.");
            setImg(im);
          } catch {
            setMsg("Não foi possível abrir essa imagem.");
          }
        }} />
      {prep && (
        <>
          {prep.removedBg && (
            <label className="flex items-center gap-2 t-small">
              Remoção do fundo
              <input type="range" min={8} max={80} value={tol} onChange={(e) => setTol(Number(e.target.value))} />
              <span className="t-tiny text-tinta-suave">aumente se sobrar fundo; diminua se apagar parte do personagem</span>
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <p className="t-tiny font-semibold">1. Clique no centro do olho esquerdo e depois do direito ({eyes.length}/2)</p>
              <canvas ref={headRef} onClick={clickEye} className="mt-1 w-full cursor-crosshair rounded bg-[repeating-conic-gradient(#ddd_0_25%,#fff_0_50%)] bg-[length:16px_16px]" data-testid="avatar-arte-cabeca" />
            </div>
            <div>
              <p className="t-tiny font-semibold">2. Respiração (pescoço, ombros, peito, cintura)</p>
              <canvas ref={fullRef} className="mt-1 w-full rounded bg-[repeating-conic-gradient(#ddd_0_25%,#fff_0_50%)] bg-[length:16px_16px]" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 t-small">
              <input type="checkbox" checked={blink} disabled={!lids} onChange={(e) => setBlink(e.target.checked)} /> Ver olhos fechados (piscada)
            </label>
            <span className="t-tiny text-tinta-suave">{prep.art.width} × {prep.art.height} px</span>
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending || !lids} onClick={submit}>{pending ? "Enviando…" : "Salvar como skin {slot + 1} do aluno"}</Button>
        {hasCustom && (
          <button type="button" className="t-small underline" disabled={pending}
            onClick={() => start(async () => { const r = await remove(requestId, slot); setMsg(r.ok ? "Skin removida." : r.error ?? "Erro."); })}>
            Remover esta skin
          </button>
        )}
        {(prepared.error ?? msg) && <span role="status" className="t-small">{prepared.error ?? msg}</span>}
      </div>
    </div>
  );
}
