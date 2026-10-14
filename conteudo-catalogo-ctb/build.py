import json

S, MOD = [], {}
for i in (1, 2, 3):
    d = json.load(open(f"conteudo-catalogo-ctb/p{i}.json", encoding="utf8"))
    S += d["S"]
    MOD.update({int(k): v for k, v in d["MOD"].items()})
assert sorted(MOD) == list(range(1, len(S) + 1)), sorted(MOD)
for i, s in enumerate(S, 1):
    s["module"] = MOD[i]

nodes = json.load(open("conteudo-catalogo-ctb/nodes.json", encoding="utf8"))
keys = {n["key"] for n in nodes["nodes"]}
used = {k for s in S for k in s["nodeKeys"]}
assert used <= keys, used - keys
taught = sorted(keys)
missing = keys - used
assert not missing, missing

lesson = {
    "title": "Legislação de Trânsito — CTB (Lei 9.503/1997)",
    "objective": "Dominar o Código de Trânsito Brasileiro para concursos: conceito de trânsito e abrangência, Sistema Nacional de Trânsito, conceitos do Anexo I, normas de circulação e sinalização, veículos, habilitação, infrações e pontuação, penalidades e medidas administrativas, processo administrativo e crimes de trânsito.",
    "sections": S,
    "taughtNodeKeys": taught,
    "references": [
        {"kind": "lei", "citation": "Lei nº 9.503/1997 (Código de Trânsito Brasileiro), em especial arts. 1º, 2º, 5º a 25, 26 a 71, 80 a 90, 120 a 135, 140 a 160, 161 a 255, 256 a 279, 280 a 290, 291 a 312-B e Anexo I"},
        {"kind": "lei", "citation": "Lei nº 14.071/2020; Lei nº 13.281/2016; Lei nº 13.546/2017; Lei nº 9.099/1995, arts. 74, 76 e 88"},
        {"kind": "jurisprudencia", "citation": "STF, Súmula 720; STJ, Súmula 575"},
        {"kind": "outro", "citation": "Resoluções do CONTRAN citadas pela apostila-base (entre elas 996/2023 e 1.031/2026) e Deliberação CONTRAN 279/2026; Leis 15.428/2026 e 15.503/2026 — conferir no Planalto e no portal da SENATRAN"},
        {"kind": "outro", "citation": "Fontes oficiais para conferência: planalto.gov.br (CTB compilado e leis citadas) e gov.br/transportes (SENATRAN e resoluções do CONTRAN)"},
    ],
    "unverifiedClaims": [
        "Trechos literais do CTB transcritos pela equipe: conferir com a versão compilada do Planalto antes de tratar como texto oficial.",
        "Leis 15.428/2026 e 15.503/2026, Resolução CONTRAN 1.031/2026 e Deliberação CONTRAN 279/2026: conteúdo trazido pela apostila-base (parte reconstruída de fontes secundárias); conferir a redação oficial.",
        "Resolução CONTRAN 996/2023 (bicicleta elétrica, autopropelidos): conferir requisitos e vigência.",
        "Tabela de dispositivos de retenção para crianças por idade, peso e altura: definida em resolução do CONTRAN; conferir a versão atual.",
        "Prazos do processo administrativo citados pela apostila-base (180/360 dias para a notificação da penalidade, prazo de julgamento e efeito suspensivo de recursos): conferir artigo e redação vigentes.",
        "Composição atual do CONTRAN (art. 10) e vinculação do licenciamento ao recall: conferir a redação vigente.",
        "Correções feitas sobre a apostila-base: art. 233 é infração grave; art. 307 tem pena de 6 meses a 1 ano; art. 291, § 1º, III, fala em 50 km/h acima da máxima; art. 303, § 2º, exige álcool e lesão grave ou gravíssima; advertência do art. 267 exige ausência de qualquer outra infração em 12 meses; multa NIC (art. 257, § 8º) é multiplicada pelo número de infrações iguais em 12 meses.",
    ],
    "verificationPending": True,
}
json.dump(lesson, open("conteudo-catalogo-ctb/lesson.json", "w", encoding="utf8"), ensure_ascii=False)

topic = {
    "slug": "ctb-legislacao-de-transito",
    "title": "Legislação de Trânsito — CTB (Lei 9.503/1997)",
    "kind": "dispositivo",
    "law_code": "CTB",
    "articles": ["1", "7", "89", "256", "259", "302", "303", "305", "306", "309"],
    "aliases": ["ctb", "código de trânsito", "codigo de transito", "código de trânsito brasileiro", "codigo de transito brasileiro",
                "legislação de trânsito", "legislacao de transito", "lei 9.503", "lei 9503", "lei 9.503/1997", "trânsito", "transito",
                "infrações de trânsito", "crimes de trânsito", "sistema nacional de trânsito"],
    "discipline_mode": "legislacao_especial",
    "summary": "Legislação de Trânsito (CTB) — conceito de trânsito, SNT, conceitos do Anexo I, normas de circulação, sinalização, veículos, habilitação, Lei 14.071/2020, infrações e pontos, penalidades × medidas administrativas, processo e crimes de trânsito.",
    "source_text": nodes["source"],
    "nodes": nodes["nodes"],
    "estimated_minutes": 180,
}
json.dump(topic, open("conteudo-catalogo-ctb/topic.json", "w", encoding="utf8"), ensure_ascii=False)
from collections import Counter
print(len(S), "seções;", len(taught), "itens;", sum(len(s["bodyMarkdown"]) for s in S), "chars;", Counter(MOD.values()))
