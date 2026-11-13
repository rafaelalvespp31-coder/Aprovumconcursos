"""Recorta o Caveira sentado (referência Black November) com fundo transparente, sem alterar o personagem.

Uso: python3 scripts/caveira-sentado.py <referencia.png>  ->  public/home/caveira-sentado.webp
Topo da faixa amarela na referência: y = 436 (é onde ele "senta").
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

X0, Y0, X1, Y1 = 832, 14, 1416, 696
OUT_H = 440  # ~4x a altura de tela (110 px)
UP = [(1030,45),(1055,22),(1090,17),(1125,24),(1149,50),(1159,80),(1156,108),(1166,112),(1172,110),(1177,160),(1197,172),(1227,195),(1247,230),(1264,260),(1292,310),(1302,345),(1327,368),(1372,393),(1414,424),(1410,437),
      (838,437),(834,396),(860,380),(866,340),(860,300),(870,270),(884,240),(904,224),(940,199),(975,169),(1005,149),(1034,140),(1040,125),(1029,100),(1021,75)]
LEG = [(1086,434),(1246,434),(1204,446),(1187,470),(1181,500),(1173,520),(1176,560),(1187,613),(1117,613),(1111,560),(1117,530),(1104,500),(1091,470)]
BOOT = [(1117,611),(1187,611),(1194,640),(1200,665),(1198,686),(1150,694),(1110,687),(1106,660),(1111,635)]

# Volumes soltos abaixo do cotovelo e do cano liam como um 2º par de braços: saem do recorte (ficam só os 2 braços do fuzil).
CUT_L = [(826,272),(868,274),(903,286),(914,302),(925,332),(940,372),(962,412),(986,442),(826,442)]
CUT_R = [(1258,396),(1270,381),(1300,377),(1350,407),(1395,435),(1402,440),(1258,440)]

src = Image.open(sys.argv[1]).convert("RGB")
a = np.asarray(src).astype(int)
def poly(p, erode=0):
    m = Image.new("L", src.size, 0); ImageDraw.Draw(m).polygon(p, fill=255)
    if erode: m = m.filter(ImageFilter.MinFilter(erode * 2 + 1))
    return np.asarray(m) > 127
lum = a.max(axis=2)
yellow = (a[..., 0] > 120) & (a[..., 1] > 85) & (a[..., 2] < 120) & (a[..., 0] - a[..., 2] > 60)
up_rows = np.arange(a.shape[0])[:, None] < 433
up = (poly(UP, 7) | (poly(UP) & (lum > 20))) & up_rows & ~yellow          # miolo sólido; na borda só o que não é o preto do fundo
leg = poly(LEG) & ~yellow                            # perna sobre a faixa: tudo que não é o amarelo
up = up & ~poly(CUT_L) & ~poly(CUT_R)
m = Image.fromarray(((up | leg | poly(BOOT)) * 255).astype("uint8"))
m = m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
im = src.convert("RGBA"); im.putalpha(m)
im = im.crop((X0, Y0, X1, Y1))
w = round((X1 - X0) * OUT_H / (Y1 - Y0))
im = im.resize((w, OUT_H), Image.LANCZOS)
rgb = im.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2)); rgb.putalpha(im.getchannel("A"))
rgb.save("public/home/caveira-sentado.webp", quality=93, method=6)
print(rgb.size, "assento (fração da altura):", (436 - Y0) / (Y1 - Y0), "perna (fração da largura):", (1150 - X0) / (X1 - X0))
bg = Image.new("RGBA", rgb.size, (150, 40, 160, 255)); bg.alpha_composite(rgb); bg.save("/tmp/sentado.png")
