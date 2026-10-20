import json, sys
sys.path.insert(0, ".")
import helpers
for f in ("aula1", "aula2", "aula3", "aula4", "aula5", "aula6"):
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

TITLE = "Direitos e Garantias Fundamentais I — Teoria Geral e Art. 5º (CF)"
lesson = {
    "title": TITLE,
    "objective": "Dominar a teoria geral dos direitos e garantias fundamentais e todo o art. 5º da Constituição — igualdade, legalidade, liberdades, privacidade e domicílio, propriedade, acesso à justiça, garantias penais e da pessoa presa e direitos coletivos — com jurisprudência essencial, quadros comparativos e as pegadinhas das bancas de concursos policiais.",
    "sections": S,
    "taughtNodeKeys": sorted(keys),
    "references": [
        {"kind": "lei", "citation": "Constituição Federal de 1988, Título II, Capítulo I — art. 5º, caput, incisos I a LXXIX e §§ 1º a 4º (EC 45/2004 e EC 115/2022); arts. 1º, III; 15, IV; 19, I; 60, § 4º, IV; 62, § 1º, I, b; 84, XIX; 102, I, g; 129, III; 134; 136 a 139; 150, III, b, e VI, b; 182 a 186; 217; 220; 243 — planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm"},
        {"kind": "lei", "citation": "Leis citadas (1): 9.296/1996 (interceptação), 12.037/2009 (identificação criminal), 12.527/2011 (acesso à informação), 13.188/2015 (direito de resposta), 13.709/2018 (LGPD), 9.455/1997 (tortura), 7.716/1989 e 14.532/2023 (racismo), 13.445/2017 (migração), 13.869/2019 (abuso de autoridade)"},
        {"kind": "lei", "citation": "Leis citadas (2): 8.078/1990 (CDC, art. 81), 7.347/1985 (ação civil pública), 7.960/1989 (prisão temporária), 9.534/1997, 9.265/1996, 11.417/2006; CPP, arts. 29, 46, 157, 186, 283, 301, 306, 312, 313 e 316; LINDB, art. 6º; CPC, arts. 98 e 528"},
        {"kind": "jurisprudencia", "citation": "STF: Tema 280 (RE 603.616); Súmulas Vinculantes 3, 5, 11, 14, 21, 25 e 45; Súmulas 421, 523, 603, 611, 629, 683 e 711; RE 466.343; ADCs 43, 44 e 54; Tema 1.068; Tema 82 (RE 573.232); Tema 499; Tema 483 (ARE 652.777); Tema 786; Tema 1.021; Tema 237; Tema 350 (RE 631.240); Tema 22 — portal.stf.jus.br"},
        {"kind": "jurisprudencia", "citation": "STF: HC 82.424; ADO 26 e MI 4.733; HC 154.248; ADPF 130; ADPF 187; ADPF 186; ADC 41; ADI 3.510; ADPF 54; ADI 4.815; ADI 4.439; ADI 2.404; ADI 939; ADI 6.387; RE 201.819; RE 511.961; RE 603.583; RE 795.467; SE 5.206"},
        {"kind": "jurisprudencia", "citation": "STJ: Súmulas 2, 227, 403, 444, 522 e 591 — stj.jus.br"},
        {"kind": "doutrina", "citation": "Classificações doutrinárias: dimensões dos direitos fundamentais, características, eficácia vertical, horizontal e diagonal, proporcionalidade (adequação, necessidade e proporcionalidade em sentido estrito), provas ilícitas, ilegítimas e derivadas, representação e substituição processual"},
    ],
    "unverifiedClaims": [
        "Redação constitucional apresentada em linguagem didática, com as expressões decisivas destacadas; o texto não foi comparado, nesta preparação, com a página oficial do Planalto.",
        "Teses de repercussão geral e súmulas apresentadas em resumo didático, sem conferência da redação oficial nos portais do STF e do STJ nesta preparação.",
        "Tema 855 do STF (aviso prévio em reunião): alcance da tese indicado de forma resumida, a conferir no portal do STF.",
    ],
    "verificationPending": True,
}
json.dump(lesson, open("lesson.json", "w", encoding="utf8"), ensure_ascii=False)
topic = {
    "slug": "cf-art-5-direitos-garantias-fundamentais",
    "title": TITLE,
    "kind": "dispositivo",
    "law_code": "CF",
    "articles": ["5"],
    "aliases": ["direitos e garantias fundamentais", "direitos fundamentais", "garantias fundamentais", "direitos individuais e coletivos",
                "direitos e deveres individuais e coletivos", "garantias constitucionais individuais", "art. 5º da constituição", "artigo 5 da cf",
                "teoria geral dos direitos fundamentais", "dimensões dos direitos fundamentais", "geracoes dos direitos fundamentais",
                "eficácia horizontal dos direitos fundamentais", "inviolabilidade do domicílio", "direito de reunião", "liberdade de associação",
                "presunção de inocência", "provas ilícitas", "extradição", "prisão civil", "tema 280 stf", "cláusulas pétreas direitos individuais"],
    "discipline_mode": "direito_constitucional",
    "summary": "Direito Constitucional — Parte I de Direitos e Garantias Fundamentais. Teoria geral (conceito, direitos × garantias, dimensões, características, eficácia, aplicação imediata, tratados, TPI, cláusulas pétreas, proporcionalidade) e o art. 5º inteiro por assunto: igualdade e legalidade, liberdades, reunião e associação, privacidade e domicílio (Tema 280), dados, propriedade, acesso à justiça, júri, devido processo, provas ilícitas, garantias penais, pessoa presa, extradição, presunção de inocência, prisão e direitos coletivos — com jurisprudência, quadros, pegadinhas, revisão relâmpago e questões autorais comentadas.",
    "source_text": nodes["source"],
    "nodes": nodes["nodes"],
    "estimated_minutes": 300,
}
json.dump(topic, open("topic.json", "w", encoding="utf8"), ensure_ascii=False)
from collections import Counter
print(len(S), "seções;", len(keys), "itens;", sum(len(s["bodyMarkdown"]) for s in S), "chars;", Counter(s["kind"] for s in S))
