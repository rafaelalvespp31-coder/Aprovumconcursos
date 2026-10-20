import json, sys
sys.path.insert(0, ".")
import helpers
for f in ("aula1", "aula2", "aula3", "aula4"):
    __import__(f)
S, MOD = helpers.S, helpers.MOD
assert sorted(MOD) == list(range(1, len(S) + 1)), sorted(MOD)
assert 2 <= len(S) <= 30, len(S)
for i, s in enumerate(S, 1):
    s["module"] = MOD[i]
for s in S:
    s["bodyMarkdown"] = helpers.fix_md(s["bodyMarkdown"], quote_breaks=True)
nodes = json.load(open("nodes.json", encoding="utf8"))
keys = {n["key"] for n in nodes["nodes"]}
used = {k for s in S for k in s["nodeKeys"]}
assert used <= keys, used - keys
assert not (keys - used), keys - used
for s in S:
    assert len(s["bodyMarkdown"]) <= 12000, (s["title"], len(s["bodyMarkdown"]))
    assert len(s["title"]) <= 160, s["title"]
    assert len(s["nodeKeys"]) <= 40, s["title"]
    assert len(set(s["nodeKeys"])) == len(s["nodeKeys"]), s["title"]
assert len(keys) <= 100

TITLE = "Direitos e Garantias Fundamentais III — Nacionalidade, Direitos Políticos e Partidos (CF, arts. 12 a 17)"
lesson = {
    "title": TITLE,
    "objective": "Dominar a nacionalidade (natos, naturalizados, portugueses equiparados, cargos privativos, perda e reaquisição após a EC 131/2023), os direitos políticos (soberania popular, alistamento, elegibilidade, inelegibilidades, AIME, perda e suspensão, anterioridade eleitoral) e os partidos políticos (art. 17, cláusula de desempenho, fidelidade e financiamento) — com jurisprudência do STF e do TSE, quadros e pegadinhas de concurso.",
    "sections": S,
    "taughtNodeKeys": sorted(keys),
    "references": [
        {"kind": "lei", "citation": "Constituição Federal de 1988, Título II, Capítulos III, IV e V — arts. 12 a 17 (ECR 3/1994, EC 4/1993, 16/1997, 23/1999, 54/2007, 97/2017, 111/2021, 117/2022, 131/2023 e 133/2024); arts. 1º, V, e parágrafo único; 5º, LI; 29, XIII; 49, XV; 55; 60, § 4º, II; 61, § 2º; 81, § 1º; 89, VII; 109, X; 142, § 3º, V; 222 — planalto.gov.br"},
        {"kind": "lei", "citation": "Leis citadas: 13.445/2017 (Migração), LC 64/1990 e LC 135/2010 (inelegibilidades e Ficha Limpa), 9.096/1995 (partidos, art. 22-A), 9.504/1997 (eleições), 9.709/1998 (plebiscito e referendo), 14.208/2021 (federações), 13.146/2015 (pessoa com deficiência), 8.429/1992 e 14.230/2021 (improbidade), 5.700/1971 (símbolos), 8.239/1991"},
        {"kind": "jurisprudencia", "citation": "STF: MS 33.864; Súmula Vinculante 18; Tema 678 (RE 758.461); RE 637.485; ADCs 29 e 30 e ADI 4.578; RE 633.703; ADI 3.685; Tema 370 (RE 601.182); ADI 5.081; MS 26.602, 26.603 e 26.604; ADI 7.021; ADI 4.650; ADI 5.617 — portal.stf.jus.br"},
        {"kind": "jurisprudencia", "citation": "TSE: Súmula 9 e jurisprudência sobre conscritos, vices, desincompatibilização e segredo de justiça na AIME — tse.jus.br"},
        {"kind": "doutrina", "citation": "Nacionalidade originária e derivada, ius soli e ius sanguinis, polipatridia e apatridia, sufrágio × voto × escrutínio, inelegibilidades absolutas e relativas, perda e suspensão de direitos políticos"},
    ],
    "unverifiedClaims": [
        "Redação constitucional apresentada em linguagem didática, com as expressões decisivas destacadas; o texto não foi comparado, nesta preparação, com a página oficial do Planalto.",
        "EC 133/2024 (art. 17): percentual e alcance da cota para candidaturas de pessoas pretas e pardas descritos em resumo, a conferir na redação oficial.",
        "Teses e súmulas do STF e do TSE apresentadas em resumo didático, sem conferência da redação oficial nesta preparação.",
    ],
    "verificationPending": True,
}
json.dump(lesson, open("lesson.json", "w", encoding="utf8"), ensure_ascii=False)
topic = {
    "slug": "cf-arts-12-a-17-nacionalidade-direitos-politicos-partidos",
    "title": TITLE,
    "kind": "dispositivo",
    "law_code": "CF",
    "articles": ["12", "13", "14", "15", "16", "17"],
    "aliases": ["nacionalidade", "brasileiro nato", "brasileiro naturalizado", "naturalização", "perda da nacionalidade", "cargos privativos de brasileiro nato",
                "direitos políticos", "inelegibilidade", "inelegibilidades", "condições de elegibilidade", "alistamento eleitoral", "plebiscito e referendo",
                "perda e suspensão dos direitos políticos", "anterioridade eleitoral", "partidos políticos", "cláusula de barreira", "fidelidade partidária",
                "arts. 12 a 17 da constituição"],
    "discipline_mode": "direito_constitucional",
    "summary": "Direito Constitucional — Parte III de Direitos e Garantias Fundamentais. Nacionalidade (natos, naturalizados, português equiparado, cargos privativos MP3.COM, perda e reaquisição após a EC 131/2023, idioma e símbolos), direitos políticos (soberania popular, alistamento, elegibilidade e idades, inelegibilidades, AIME, consultas municipais, perda e suspensão, anterioridade eleitoral) e partidos (art. 17: preceitos, autonomia, registro, cláusula de desempenho, fidelidade e cotas) — com jurisprudência, quadros, pegadinhas e questões autorais comentadas.",
    "source_text": nodes["source"],
    "nodes": nodes["nodes"],
    "estimated_minutes": 220,
}
json.dump(topic, open("topic.json", "w", encoding="utf8"), ensure_ascii=False)
from collections import Counter
print(len(S), "seções;", len(keys), "itens;", sum(len(s["bodyMarkdown"]) for s in S), "chars;", Counter(s["kind"] for s in S))
