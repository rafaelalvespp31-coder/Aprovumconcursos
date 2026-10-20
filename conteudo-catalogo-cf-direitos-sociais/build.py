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

TITLE = "Direitos e Garantias Fundamentais II — Direitos Sociais (CF, arts. 6º a 11)"
lesson = {
    "title": TITLE,
    "objective": "Dominar os direitos sociais da Constituição — natureza, eficácia, mínimo existencial e reserva do possível, o rol do art. 6º e a renda básica familiar, todos os incisos do art. 7º (inclusive domésticos), a organização sindical (art. 8º), o direito de greve (art. 9º, com a vedação na segurança pública) e a participação dos trabalhadores (arts. 10 e 11) — com jurisprudência, quadros e pegadinhas de concurso.",
    "sections": S,
    "taughtNodeKeys": sorted(keys),
    "references": [
        {"kind": "lei", "citation": "Constituição Federal de 1988, Título II, Capítulo II — arts. 6º a 11 (EC 26/2000, 64/2010, 90/2015, 114/2021, 20/1998, 28/2000, 53/2006 e 72/2013); arts. 37, VII; 39, § 3º; 42, § 1º; 142, § 3º, IV; 144; 196 a 214; ADCT, art. 10 — planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm"},
        {"kind": "lei", "citation": "Leis citadas: 7.783/1989 (greve), 13.467/2017 (reforma trabalhista), LC 150/2015 (domésticos), 12.506/2011 (aviso prévio), 11.770/2008 (Empresa Cidadã), 7.998/1990 (seguro-desemprego), 10.835/2004 (renda básica de cidadania), LC 103/2000 (piso estadual), 9.029/1995; CLT"},
        {"kind": "jurisprudencia", "citation": "STF: Temas 698, 548, 793, 500, 6, 1.234, 541, 531, 1.046, 935, 823, 497, 932, 782 e 1.182; MIs 670, 708, 712 e 7.300; ADI 5.794; ADI 6.327; ADO 20; ARE 709.212 — portal.stf.jus.br"},
        {"kind": "jurisprudencia", "citation": "STF: Súmulas Vinculantes 4, 6, 15, 16, 40, 60 e 61; Súmulas 675 e 677 — portal.stf.jus.br"},
        {"kind": "doutrina", "citation": "Mínimo existencial, reserva do possível, vedação ao retrocesso social (efeito cliquet), progressividade, unicidade × pluralidade sindical"},
    ],
    "unverifiedClaims": [
        "Redação constitucional apresentada em linguagem didática, com as expressões decisivas destacadas; o texto não foi comparado, nesta preparação, com a página oficial do Planalto.",
        "Teses de repercussão geral e súmulas apresentadas em resumo didático, sem conferência da redação oficial no portal do STF nesta preparação.",
    ],
    "verificationPending": True,
}
json.dump(lesson, open("lesson.json", "w", encoding="utf8"), ensure_ascii=False)
topic = {
    "slug": "cf-arts-6-a-11-direitos-sociais",
    "title": TITLE,
    "kind": "dispositivo",
    "law_code": "CF",
    "articles": ["6", "7", "8", "9", "10", "11"],
    "aliases": ["direitos sociais", "direitos sociais na constituição", "direitos dos trabalhadores", "art. 7º da constituição", "artigo 7 da cf",
                "direito de greve", "greve de servidor", "greve de policiais", "liberdade sindical", "organização sindical", "unicidade sindical",
                "mínimo existencial", "reserva do possível", "renda básica familiar", "trabalhadores domésticos", "estabilidade do dirigente sindical",
                "arts. 6º a 11 da constituição"],
    "discipline_mode": "direito_constitucional",
    "summary": "Direito Constitucional — Parte II de Direitos e Garantias Fundamentais. Teoria dos direitos sociais (eficácia, mínimo existencial, reserva do possível, retrocesso, judicialização — Tema 698), art. 6º e renda básica familiar, art. 7º inciso por inciso (números, exceções, domésticos), art. 8º (unicidade, contribuições, estabilidade do dirigente), art. 9º (greve, servidores, vedação na segurança pública — Tema 541) e arts. 10 e 11 — com jurisprudência, quadros, pegadinhas, revisão relâmpago e questões autorais comentadas.",
    "source_text": nodes["source"],
    "nodes": nodes["nodes"],
    "estimated_minutes": 220,
}
json.dump(topic, open("topic.json", "w", encoding="utf8"), ensure_ascii=False)
from collections import Counter
print(len(S), "seções;", len(keys), "itens;", sum(len(s["bodyMarkdown"]) for s in S), "chars;", Counter(s["kind"] for s in S))
