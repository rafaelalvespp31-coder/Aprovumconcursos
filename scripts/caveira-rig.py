"""Gera o rig 2D (recorte articulado) do Caveira empurrando o card COMANDO SUPREMO.

Entrada: a arte de referência (1672x941). Saída: sprite com as peças do corpo e o CSS com os
keyframes calculados por cinemática inversa (mãos presas no card, pés presos no chão).
Uso: python3 scripts/caveira-rig.py <arte.png>
"""
import math, sys
from PIL import Image, ImageDraw, ImageFilter

SRC = sys.argv[1]
K = 0.3            # escala de exportação das peças
DISPLAY_H = 60     # altura do personagem na tela (px)
OX, OY, BW, BH = 984, 188, 646, 616   # caixa do personagem na arte
SD = DISPLAY_H / BH                    # escala arte -> tela
N = 30             # amostras por ciclo
T = 1.9            # duração do ciclo (s)

P = {  # polígonos das peças (px da arte)
 "head": [(1055,260),(1053,225),(1070,200),(1105,192),(1140,196),(1165,212),(1180,235),(1192,250),(1190,275),(1178,290),(1172,312),(1166,345),(1150,366),(1120,373),(1095,366),(1080,342),(1068,320),(1058,295)],
 "torso": [(1165,300),(1190,275),(1215,262),(1250,265),(1262,285),(1292,290),(1302,330),(1312,365),(1342,380),(1362,420),(1372,455),(1377,480),(1422,490),(1452,530),(1447,560),(1420,576),(1380,572),(1330,562),(1260,545),(1215,535),(1180,505),(1160,470),(1150,440),(1158,400),(1163,350)],
 "ua": [(1165,300),(1195,278),(1235,275),(1262,300),(1265,340),(1242,382),(1212,422),(1187,447),(1155,452),(1138,427),(1148,380),(1160,340)],
 "fa": [(990,375),(1005,362),(1030,372),(1050,390),(1100,385),(1150,385),(1176,400),(1182,430),(1166,452),(1120,457),(1070,452),(1040,442),(1015,436),(995,421),(988,396)],
 "far": [(1000,300),(1008,285),(1026,290),(1036,320),(1052,340),(1082,345),(1097,366),(1086,386),(1050,381),(1025,366),(1008,340)],
 "thf": [(1215,522),(1332,540),(1347,570),(1322,602),(1262,617),(1202,642),(1167,662),(1125,667),(1104,642),(1104,605),(1125,584),(1160,568),(1190,543)],
 "shf": [(1108,600),(1150,588),(1177,615),(1232,650),(1268,662),(1280,700),(1278,742),(1240,748),(1236,712),(1200,692),(1150,672),(1113,657)],
 "btf": [(1236,702),(1276,690),(1302,715),(1332,730),(1342,760),(1337,791),(1300,799),(1240,799),(1195,796),(1187,776),(1214,756),(1240,736)],
 "thb": [(1300,538),(1377,518),(1422,574),(1452,600),(1482,625),(1487,660),(1462,692),(1420,682),(1390,652),(1350,622),(1310,592)],
 "shb": [(1400,625),(1445,604),(1482,625),(1522,650),(1562,665),(1580,702),(1582,742),(1542,746),(1532,716),(1490,702),(1445,692),(1410,667)],
 "btb": [(1530,716),(1576,699),(1602,730),(1624,760),(1627,791),(1611,801),(1560,801),(1534,791),(1529,766),(1545,741)],
}
J = {  # articulações (px da arte)
 "hip": (1300,520), "neck": (1150,330), "sh": (1240,300), "el": (1160,425), "hand": (1010,400), "farhand": (1012,315),
 "hf": (1290,550), "kf": (1140,625), "af": (1265,735),
 "hb": (1335,555), "kb": (1440,645), "ab": (1565,735),
}

# ---------------------------------------------------------------- sprite
src = Image.open(SRC).convert("RGB")
def mask(poly, pad=0):
    m = Image.new("L", (src.width * 2, src.height * 2), 0)
    ImageDraw.Draw(m).polygon([(x * 2, y * 2) for x, y in poly], fill=255)
    if pad: m = m.filter(ImageFilter.MinFilter(pad * 4 + 1))
    return m.resize(src.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8))
base = src.copy()
dark = Image.new("RGB", src.size, (12, 10, 9))
torso_src = src.copy()
for k in ("ua", "fa", "head"):  # sob o braço e a cabeça o tronco fica escuro (sem "fantasma" quando eles se mexem)
    torso_src.paste(dark, (0, 0), mask(P[k], 3))
boxes, tiles = {}, {}
for name, poly in P.items():
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    x0, y0, x1, y1 = min(xs) - 3, min(ys) - 3, max(xs) + 3, max(ys) + 3
    im = (torso_src if name == "torso" else base).crop((x0, y0, x1, y1)).convert("RGBA")
    im.putalpha(mask(poly).crop((x0, y0, x1, y1)))
    w, h = round((x1 - x0) * K), round((y1 - y0) * K)
    tiles[name] = im.resize((w, h), Image.LANCZOS)
    boxes[name] = (x0, y0, w, h)
SW = sum(t.width + 2 for t in tiles.values()); SH = max(t.height for t in tiles.values())
sheet = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); pos = {}; x = 0
for name, t in tiles.items():
    sheet.paste(t, (x, 0)); pos[name] = x; x += t.width + 2
sheet.save("public/home/caveira-rig.webp", quality=90, method=6)

# ---------------------------------------------------------------- cinemática
sub = lambda a, b: (a[0] - b[0], a[1] - b[1]); add = lambda a, b: (a[0] + b[0], a[1] + b[1])
ang = lambda v: math.atan2(v[1], v[0]); ln = lambda v: math.hypot(*v)
def rot(v, a): c, s = math.cos(a), math.sin(a); return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)
def ik(j0, j1, j2, root, target):
    l1, l2 = ln(sub(j1, j0)), ln(sub(j2, j1))
    d = sub(target, root); dist = max(abs(l1 - l2) + 1, min(l1 + l2 - 0.5, ln(d)))
    side = 1 if (sub(j2, j0)[0] * sub(j1, j0)[1] - sub(j2, j0)[1] * sub(j1, j0)[0]) > 0 else -1
    a = math.acos(max(-1, min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))))
    a1w = ang(d) + side * a
    mid = add(root, (l1 * math.cos(a1w), l1 * math.sin(a1w)))
    end = add(root, (dist * math.cos(ang(d)), dist * math.sin(ang(d))))
    return a1w - ang(sub(j1, j0)), ang(sub(end, mid)) - ang(sub(j2, j1))
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
def effort(t):  # 0 = preparação, 1 = pico do empurrão (periódica, com um "tranco" curto)
    b = 0.5 - 0.5 * math.cos(2 * math.pi * t)
    return b * b * (3 - 2 * b)
def foot(t, phase, x_front, stride, lift):
    u = (t - phase) % 1.0
    if u < 0.56: return x_front + stride * (u / 0.56), 0.0, 0.0
    v = (u - 0.56) / 0.44
    return x_front + stride * (1 - (0.5 - 0.5 * math.cos(math.pi * v))), lift * math.sin(math.pi * v), -math.radians(15) * math.sin(2 * math.pi * v)

frames = {k: [] for k in ("torso", "head", "ua", "fa", "far", "thf", "shf", "btf", "thb", "shb", "btb", "card")}
deg = lambda a: f"{math.degrees(wrap(a)):.2f}deg"; px = lambda v: f"{v * K:.2f}px"
for i in range(N + 1):
    t = (i % N) / N
    e, e2 = effort(t), effort(t - 0.05)
    th = math.radians(1.5 - 7.0 * e)                       # tronco inclina para a frente no esforço
    dx = -9 * e; dy = 9 * (1 - e) + 2.5 * math.cos(4 * math.pi * t)   # quadril avança e sobe; joelhos flexionam na preparação
    card = -2.4 * e2 + 0.35 * math.sin(10 * math.pi * t) * e2 * (1 - e2) * 4   # card: desloca, treme no impacto, volta (px de tela)
    hx = card / SD
    frames["card"].append(f"translate: {card:.2f}px 0")
    frames["torso"].append(f"transform: translate({px(dx)},{px(dy)}) rotate({deg(th)})")
    frames["head"].append(f"transform: rotate({deg(math.radians(3.5 * (effort(t - 0.09) - 0.45)) - 0)})")
    frames["far"].append(f"transform: translate({px(hx)},0) rotate({deg(math.radians(-2 * e))})")
    hip = add(J["hip"], (dx, dy))
    sh = add(hip, rot(sub(J["sh"], J["hip"]), th))
    a1, a2 = ik(J["sh"], J["el"], J["hand"], sh, add(J["hand"], (hx, 0)))
    frames["ua"].append(f"transform: rotate({deg(a1 - th)})"); frames["fa"].append(f"transform: rotate({deg(a2 - a1)})")
    for leg, hj, kj, aj, phase, xf, st, lift in (("f", "hf", "kf", "af", 0.12, -34, 68, 30), ("b", "hb", "kb", "ab", 0.62, -62, 52, 24)):
        fx, fl, fr = foot(t, phase, xf, st, lift)
        b1, b2 = ik(J[hj], J[kj], J[aj], add(J[hj], (dx, dy)), add(J[aj], (fx, -fl)))
        frames["th" + leg].append(f"transform: translate({px(dx)},{px(dy)}) rotate({deg(b1)})")
        frames["sh" + leg].append(f"transform: rotate({deg(b2 - b1)})")
        frames["bt" + leg].append(f"transform: rotate({deg(fr - b2)})")

# ---------------------------------------------------------------- CSS
PARENT = {"head": "torso", "ua": "torso", "fa": "ua", "shf": "thf", "btf": "shf", "shb": "thb", "btb": "shb"}
PIVOT = {"torso": "hip", "head": "neck", "ua": "sh", "fa": "el", "far": "farhand", "thf": "hf", "shf": "kf", "btf": "af", "thb": "hb", "shb": "kb", "btb": "ab"}
out = ["/* GERADO por scripts/caveira-rig.py — não edite à mão. Rig 2D de recorte: 11 peças, mãos e pés por cinemática inversa. */",
       f".cvr {{ position: relative; flex: none; align-self: flex-end; width: {BW * SD:.1f}px; height: {DISPLAY_H}px; margin-left: -17px; margin-bottom: -2px; z-index: 2; pointer-events: none; }}",
       f".cvr-rig {{ position: absolute; left: 0; top: 0; width: {BW * K:.1f}px; height: {BH * K:.1f}px; transform: scale({SD / K:.4f}); transform-origin: 0 0; }}",
       f".cvr-rig i {{ position: absolute; display: block; background: url(/home/caveira-rig.webp) no-repeat; background-size: {SW}px {SH}px; animation: {T}s linear infinite; will-change: transform; }}",
       ".cvr-chao { position: absolute; left: 22%; right: -6%; bottom: -1px; height: 5px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255, 196, 0, .45), transparent); filter: blur(1.5px); }",
       f".bnv-vitalicio {{ animation: cvr-card {T}s linear infinite; }}"]
for name in P:
    x0, y0, w, h = boxes[name]
    px0, py0 = (boxes[PARENT[name]][0], boxes[PARENT[name]][1]) if name in PARENT else (OX, OY)
    pv = J[PIVOT[name]]
    out.append(f".cvr-{name} {{ left: {(x0 - px0) * K:.1f}px; top: {(y0 - py0) * K:.1f}px; width: {w}px; height: {h}px; background-position: -{pos[name]}px 0 !important; transform-origin: {(pv[0] - x0) * K:.1f}px {(pv[1] - y0) * K:.1f}px; animation-name: cvr-{name} !important; }}")
for name, fr in frames.items():
    out.append(f"@keyframes cvr-{name} {{ " + " ".join(f"{100 * i / N:.2f}% {{ {f} }}" for i, f in enumerate(fr)) + " }")
out.append(".bnv:hover .cvr-rig i, .bnv:focus-within .cvr-rig i, .bnv:active .cvr-rig i, .bnv:hover .bnv-vitalicio, .bnv:focus-within .bnv-vitalicio, .bnv:active .bnv-vitalicio { animation-play-state: paused; }")
out.append("@media (prefers-reduced-motion: reduce) { .cvr-rig i, .bnv-vitalicio { animation: none !important; } }")
open("src/components/home/caveira-empurra.css", "w", encoding="utf8").write("\n".join(out) + "\n")
print("sprite", sheet.size, "css ok")
