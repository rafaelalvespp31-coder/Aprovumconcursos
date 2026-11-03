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
  const scale = Math.min(1, MAX_H / img.naturalHeight, 4096 / img.naturalWidth);
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
  for (let x = 0; x < W; x++) (visit(x, 0), visit(x, H - 1));
  for (let y = 0; y < H; y++) (visit(0, y), visit(W - 1, y));
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
      if (!bg[p] && near(p * 4)) (bg[p] = 1), stack.push(p);
    };
    for (let x = 0; x < W; x++) (push(x), push((H - 1) * W + x));
    for (let y = 0; y < H; y++) (push(y * W), push(y * W + W - 1));
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
      if (px[(y * W + x) * 4 + 3]! > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) throw new Error("Não sobrou nada depois do recorte. Diminua a tolerância.");
  ctx.putImageData(data, 0, 0);
  const pad = Math.round((y1 - y0) * 0.006);
  const cx0 = Math.max(0, x0 - pad), cy0 = Math.max(0, y0 - pad), cx1 = Math.min(W - 1, x1 + pad), cy1 = Math.min(H - 1, y1 + 1);
  const art = document.createElement("canvas");
  art.width = cx1 - cx0 + 1;
  art.height = cy1 - cy0 + 1;
  art.getContext("2d")!.drawImage(c, cx0, cy0, art.width, art.height, 0, 0, art.width, art.height);
  // Silhueta → pontos do corpo (respiração).
  const a = art.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, art.width, art.height).data;
  const left: number[] = [], right: number[] = [];
  for (let y = 0; y < art.height; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < art.width; x++) if (a[(y * art.width + x) * 4 + 3]! > 64) ((l < 0 ? (l = x) : 0), (r = x));
    left.push(l);
    right.push(r);
  }
  return { art, lm: landmarksFromSilhouette(left, right, art.width), removedBg };
}

/** Camada das pálpebras (pele amostrada acima e abaixo de cada olho + linha dos cílios). */
function buildLids(art: HTMLCanvasElement, eyes: [EyeBox, EyeBox]): HTMLCanvasElement {
  const W = art.width, H = art.height;
  const src = art.getContext("2d", { willReadFrequently: true })!;
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const g = out.getContext("2d")!;
  const avg = (x: number, y: number, w: number, h: number): [number, number, number] | null => {
    const d = src.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))).data;
    // Mediana por canal dos pixels claros (pele), ignorando sombras, cílios e maquiagem.
    const px: Array<[number, number, number]> = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]! > 200 && d[i]! + d[i + 1]! + d[i + 2]! > 180) px.push([d[i]!, d[i + 1]!, d[i + 2]!]);
    if (!px.length) return null;
    px.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    const sel = px.slice(Math.floor(px.length * 0.35), Math.max(Math.floor(px.length * 0.35) + 1, Math.floor(px.length * 0.85)));
    const m = [0, 1, 2].map((k) => sel.map((p) => p[k]!).sort((a, b) => a - b)[sel.length >> 1]!);
    return [m[0]!, m[1]!, m[2]!];
  };
  const rgb = (c: [number, number, number], f = 1) => `rgb(${Math.round(c[0] * f)},${Math.round(c[1] * f)},${Math.round(c[2] * f)})`;
  for (const e of eyes) {
    const bx = e.x0 * W, by = e.y0 * H, bw = (e.x1 - e.x0) * W, bh = (e.y1 - e.y0) * H;
    const cx = bx + bw / 2, cy = by + bh / 2;
    // Pele da maçã do rosto, logo abaixo do olho (sem maquiagem nem sobrancelha).
    const skin = avg(bx + bw * 0.1, by + bh * 1.3, bw * 0.8, bh * 1.1) ?? [190, 140, 110];
    const grad = g.createLinearGradient(0, by - bh * 0.2, 0, by + bh * 1.2);
    grad.addColorStop(0, rgb(skin, 0.86));
    grad.addColorStop(0.6, rgb(skin, 0.94));
    grad.addColorStop(1, rgb(skin, 0.9));
    g.save();
    g.filter = `blur(${Math.max(0.6, bh * 0.08)}px)`;
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, cy, bw * 0.62, bh * 0.82, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.save();
    g.strokeStyle = "rgba(38,24,18,0.85)";
    g.lineWidth = Math.max(1, bh * 0.09);
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(cx - bw * 0.5, cy + bh * 0.16);
    g.quadraticCurveTo(cx, cy + bh * 0.44, cx + bw * 0.5, cy + bh * 0.16);
    g.stroke();
    g.restore();
  }
  return out;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("falha ao gerar imagem"))), type, q));

/** Anexar a arte pronta do aluno: recorte, pontos do corpo, olhos (2 cliques) e prévia da piscada. */
export function CustomAvatar({ requestId, hasCustom, save, remove }: { requestId: string; hasCustom: boolean; save: (id: string, f: FormData) => Promise<Result>; remove: (id: string) => Promise<Result> }) {
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
        <Button type="button" disabled={pending || !lids} onClick={submit}>{pending ? "Enviando…" : "Salvar como avatar do aluno"}</Button>
        {hasCustom && (
          <button type="button" className="t-small underline" disabled={pending}
            onClick={() => start(async () => { const r = await remove(requestId); setMsg(r.ok ? "O aluno voltou para o avatar padrão." : r.error ?? "Erro."); })}>
            Voltar ao avatar padrão
          </button>
        )}
        {(prepared.error ?? msg) && <span role="status" className="t-small">{prepared.error ?? msg}</span>}
      </div>
    </div>
  );
}
