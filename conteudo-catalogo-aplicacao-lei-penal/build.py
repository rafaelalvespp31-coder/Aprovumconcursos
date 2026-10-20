import json, sys
sys.path.insert(0, ".")
import helpers
for f in ("aula1", "aula2", "aula3", "aula4", "aula5"):
    __import__(f)
S, MOD = helpers.S, helpers.MOD
assert sorted(MOD) == list(range(1, len(S) + 1)), sorted(MOD)
assert len(S) <= 30, len(S)
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
    assert len(s["nodeKeys"]) <= 40, s["title"]
    assert len(set(s["nodeKeys"])) == len(s["nodeKeys"]), s["title"]

TITLE = "Aplicação da Lei Penal (CP, arts. 1º a 12)"
lesson = {
    "title": TITLE,
    "objective": "Compreender e aplicar as regras de legalidade penal, sucessão de leis no tempo, leis temporárias e excepcionais, tempo e lugar do crime, territorialidade, extraterritorialidade, pena cumprida e sentença no estrangeiro, contagem de prazos, frações da pena e aplicação do Código Penal às leis especiais (arts. 1º a 12 do CP) — Direito Penal, Parte Geral, para concursos policiais.",
    "sections": S,
    "taughtNodeKeys": sorted(keys),
    "references": [
        {"kind": "lei", "citation": "Código Penal (Decreto-Lei 2.848/1940), arts. 1º a 12, redação da Lei 7.209/1984 — planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm (texto comparado em 19/10/2026; sem alterações posteriores)"},
        {"kind": "lei", "citation": "Constituição Federal, art. 5º, XXXIX, XL e LI; art. 22, I; art. 62, § 1º, I, b; art. 105, I, i"},
        {"kind": "lei", "citation": "Código de Processo Penal, arts. 70, 787 a 790 e 798; Lei 13.445/2017, art. 82"},
        {"kind": "lei", "citation": "Leis citadas como exemplo: 8.617/1993, 7.565/1986, 11.106/2005, 12.015/2009, 12.663/2012 (art. 36), 11.343/2006 (arts. 30 e 66), 10.826/2003, 9.455/1997 (art. 2º), 13.869/2019 (arts. 3º e 4º), 9.605/1998 (art. 3º), Decreto-Lei 3.688/1941 (arts. 2º e 4º)"},
        {"kind": "jurisprudencia", "citation": "STF, Súmula 711 (24/09/2003) — jurisprudencia.stf.jus.br/pages/search/seq-sumula711/false"},
        {"kind": "jurisprudencia", "citation": "STJ, Súmula 501 (3ª Seção, 23/10/2013, DJe 28/10/2013) — stj.jus.br/publicacaoinstitucional (Súmulas do STJ)"},
        {"kind": "jurisprudencia", "citation": "STF, Tema 169 de Repercussão Geral (RE 600.817/MS, Plenário, rel. Min. Ricardo Lewandowski, 07/11/2013) — tese conferida em repositório de teses (tesesesumulas.com.br/tese/stf/169)"},
        {"kind": "jurisprudencia", "citation": "STF, Súmula 611 — enunciado conferido em repositório de súmulas; STF, Súmula 310 — citada com base na jurisprudência consolidada"},
    ],
    "unverifiedClaims": [
        "Acentos e o sinal ordinal dos arts. 1º a 12: a página do Planalto foi lida com problema de codificação; palavras, pontuação, incisos e alíneas conferiram, mas a acentuação foi mantida conforme a redação de 1984 (inclusive 'vôo' e 'conseqüências').",
        "Súmula 611/STF e Súmula 310/STF: enunciados conferidos em repositórios de súmulas e citados com base na jurisprudência consolidada, sem consulta à página oficial do STF nesta preparação.",
        "Tema 169/STF: tese, relator e data conferidos em repositório de teses, não na página oficial do processo.",
        "Lei de Migração (Lei 13.445/2017), art. 82: conteúdo conferido por resumo de fonte secundária; o Planalto não pôde ser acessado diretamente.",
        "Posição sobre lei intermediária e retroatividade do complemento da lei penal em branco: apresentadas como posição majoritária/doutrinária, sem número de acórdão.",
    ],
    "verificationPending": True,
}
json.dump(lesson, open("lesson.json", "w", encoding="utf8"), ensure_ascii=False)
topic = {
    "slug": "aplicacao-da-lei-penal",
    "title": TITLE,
    "kind": "dispositivo",
    "law_code": "CP",
    "articles": [str(i) for i in range(1, 13)],
    "aliases": ["aplicação da lei penal", "aplicacao da lei penal", "lei penal no tempo", "lei penal no espaço", "lei penal no espaco",
                "princípio da legalidade", "principio da legalidade", "anterioridade", "abolitio criminis", "novatio legis", "retroatividade da lei penal",
                "lei temporária", "lei excepcional", "tempo do crime", "lugar do crime", "territorialidade", "extraterritorialidade",
                "teoria da atividade", "teoria da ubiquidade", "sentença estrangeira", "contagem de prazo penal", "súmula 711", "parte geral do código penal",
                "direito penal parte geral", "arts. 1º a 12 do código penal"],
    "discipline_mode": "direito_penal",
    "summary": "Direito Penal — Parte Geral. Arts. 1º a 12 do CP completos e conferidos: legalidade e anterioridade (analogia, lei penal em branco), lei penal no tempo (abolitio, novatio, lei intermediária, continuidade normativo-típica, combinação de leis), leis temporárias e excepcionais, tempo e lugar do crime, territorialidade, extraterritorialidade (incondicionada, condicionada e § 3º), pena e sentença estrangeiras, prazos, frações e leis especiais — com Súmulas 711/STF, 501/STJ, 611/STF, Tema 169/STF e 32 questões autorais comentadas.",
    "source_text": nodes["source"],
    "nodes": nodes["nodes"],
    "estimated_minutes": 240,
}
json.dump(topic, open("topic.json", "w", encoding="utf8"), ensure_ascii=False)
from collections import Counter
print(len(S), "seções;", len(keys), "itens;", sum(len(s["bodyMarkdown"]) for s in S), "chars;", Counter(s["kind"] for s in S))
