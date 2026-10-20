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

TITLE = "Direitos e Garantias Fundamentais IV — Remédios Constitucionais e Tutela Coletiva (CF, art. 5º, LXVIII a LXXIII)"
lesson = {
    "title": TITLE,
    "objective": "Dominar os remédios constitucionais — habeas corpus, mandado de segurança individual e coletivo, mandado de injunção, habeas data e ação popular — e a ação civil pública como tutela coletiva complementar: cabimento, legitimidade, competência, prazos, custas, efeitos e hipóteses de não cabimento, com as leis regulamentadoras, súmulas e um simulado final de 20 questões.",
    "sections": S,
    "taughtNodeKeys": sorted(keys),
    "references": [
        {"kind": "lei", "citation": "Constituição Federal de 1988, art. 5º, LXVIII a LXXIII e LXXVII; arts. 102, I, d, i e q; 103, § 2º; 105, I, b, c e h; 108, I, c e d; 109, VII e VIII; 121, § 4º, V; 129, III; 142, § 2º — planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm"},
        {"kind": "lei", "citation": "Lei 12.016/2009 (mandado de segurança) — planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12016.htm; Lei 13.300/2016 (mandado de injunção) — planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13300.htm"},
        {"kind": "lei", "citation": "Lei 9.507/1997 (habeas data) — planalto.gov.br/ccivil_03/leis/l9507.htm; Lei 4.717/1965 (ação popular) — planalto.gov.br/ccivil_03/leis/l4717.htm; Lei 7.347/1985 (ação civil pública); CPP, arts. 647 a 667; Lei 8.906/1994, art. 1º, § 1º"},
        {"kind": "jurisprudencia", "citation": "STF: Súmulas 266, 267, 268, 269, 271, 365, 430, 512, 606, 625, 629, 630, 632, 691, 693, 694 e 695; Súmula Vinculante 33; HC 143.641; MIs 670, 708, 712 e 721; ADI 4.296; ADI 3.943; Temas 161, 582, 836 e 1.075 — portal.stf.jus.br"},
        {"kind": "jurisprudencia", "citation": "STJ: Súmula 2 — stj.jus.br"},
        {"kind": "doutrina", "citation": "Teorias sobre os efeitos do mandado de injunção (não concretista, concretista geral, individual direta e intermediária); classificação dos direitos coletivos; coisa julgada secundum eventum probationis"},
    ],
    "unverifiedClaims": [
        "Redação constitucional e legal apresentada em linguagem didática, com as expressões decisivas destacadas; os textos não foram comparados, nesta preparação, com as páginas oficiais do Planalto.",
        "Súmulas e teses do STF e do STJ apresentadas em resumo didático, sem conferência da redação oficial nesta preparação.",
    ],
    "verificationPending": True,
}
json.dump(lesson, open("lesson.json", "w", encoding="utf8"), ensure_ascii=False)
topic = {
    "slug": "cf-art-5-remedios-constitucionais",
    "title": TITLE,
    "kind": "dispositivo",
    "law_code": "CF",
    "articles": ["5"],
    "aliases": ["remédios constitucionais", "remedios constitucionais", "habeas corpus", "mandado de segurança", "mandado de segurança coletivo",
                "mandado de injunção", "habeas data", "ação popular", "ação civil pública", "tutela coletiva", "writs constitucionais",
                "garantias processuais constitucionais", "lei 12.016/2009", "lei 13.300/2016", "lei 9.507/1997", "lei 4.717/1965"],
    "discipline_mode": "direito_constitucional",
    "summary": "Direito Constitucional — Parte IV de Direitos e Garantias Fundamentais. Remédios constitucionais (art. 5º, LXVIII a LXXIII): habeas corpus, mandado de segurança individual e coletivo (Lei 12.016/2009), mandado de injunção (Lei 13.300/2016), habeas data (Lei 9.507/1997) e ação popular (Lei 4.717/1965), com a ação civil pública como tutela coletiva complementar — cabimento, legitimidade, competência, prazos, custas, efeitos, súmulas, quadros, pegadinhas e simulado final de 20 questões.",
    "source_text": nodes["source"],
    "nodes": nodes["nodes"],
    "estimated_minutes": 240,
}
json.dump(topic, open("topic.json", "w", encoding="utf8"), ensure_ascii=False)
from collections import Counter
print(len(S), "seções;", len(keys), "itens;", sum(len(s["bodyMarkdown"]) for s in S), "chars;", Counter(s["kind"] for s in S))
