import json, sys
sys.path.insert(0, ".")
import helpers
for f in ("aula1", "aula2", "aula3", "aula4", "aula5", "aula6", "aula7"):
    __import__(f)
S, MOD = helpers.S, helpers.MOD
assert sorted(MOD) == list(range(1, len(S) + 1)), (sorted(MOD), len(S))
for i, s in enumerate(S, 1):
    s["module"] = MOD[i]
for s in S:
    s["bodyMarkdown"] = helpers.fix_md(s["bodyMarkdown"])
nodes = json.load(open("nodes.json", encoding="utf8"))
keys = {n["key"] for n in nodes["nodes"]}
used = {k for s in S for k in s["nodeKeys"]}
assert used <= keys, used - keys
assert not (keys - used), keys - used
assert len(S) <= 30, len(S)
for s in S:
    assert len(s["bodyMarkdown"]) <= 12000, (s["title"], len(s["bodyMarkdown"]))
    assert len(s["nodeKeys"]) <= 40, s["title"]

TITLE = "Compreensão e Interpretação de Textos de Gêneros Variados"
lesson = {
    "title": TITLE,
    "objective": "Compreender o que o texto afirma, inferir apenas o que as pistas autorizam, identificar gênero, tipo, tema, tese e intenção, dominar conectivos, referenciação, coesão e coerência, figuras, textos multissemióticos e intertextualidade, e resolver questões de interpretação com método e sem cair nas pegadinhas das bancas.",
    "sections": S,
    "taughtNodeKeys": sorted(keys),
    "references": [
        {"kind": "doutrina", "citation": "COSTA VAL, M. G. Gêneros textuais (Pnaic, 2013) — FALE/UFMG e Ceale/FaE-UFMG — cake.ceale.fae.ufmg.br/files/uploads/palestras_do_pnaic/generos_graca_val_jul_2013.pdf — consultado em 19/10/2026"},
        {"kind": "outro", "citation": "TJSC — Dicas de português: Aprofundando a coesão textual (cita Garcez, Técnica de redação, 2012) — tjsc.jus.br — consultado em 19/10/2026"},
        {"kind": "doutrina", "citation": "SIMON, M. L. M. A construção do texto: coesão e coerência textuais (CiFEFiL/FFP-UERJ, 2008) — biblio.direito.ufmg.br/wp-content/uploads/2020/07/a_construcao_de_texto.pdf — consultado em 19/10/2026"},
        {"kind": "outro", "citation": "Nova Escola — Propostas em Língua Portuguesa da BNCC (práticas de linguagem, campos de atuação, centralidade dos gêneros) — novaescola.org.br/bncc/conteudo/22 — consultado em 19/10/2026"},
        {"kind": "outro", "citation": "BRASIL. MEC. Base Nacional Comum Curricular (2018) — basenacionalcomum.mec.gov.br — referência educacional, não edital de concurso (documento não acessado diretamente nesta preparação)"},
    ],
    "unverifiedClaims": [
        "Documento oficial da BNCC não acessado diretamente; a organização de Língua Portuguesa foi conferida em fonte secundária (Nova Escola).",
        "Terminologia de pressuposto/subentendido, implicatura e figuras de linguagem segue a linguística textual e as gramáticas escolares; obras clássicas (Ducrot, Koch, Marcuschi) não foram consultadas diretamente nesta preparação.",
        "As tendências de estilo atribuídas às bancas (Cebraspe, FGV, VUNESP, AOCP, IBFC, IBADE, SELECON) são observações gerais de cobrança, não regras oficiais.",
    ],
    "verificationPending": True,
}
json.dump(lesson, open("lesson.json", "w", encoding="utf8"), ensure_ascii=False)
topic = {
    "slug": "compreensao-interpretacao-textos-generos-variados",
    "title": TITLE,
    "kind": "tema",
    "law_code": None,
    "articles": [],
    "aliases": ["interpretação de texto", "interpretacao de texto", "interpretação de textos", "compreensão de texto", "compreensao de texto",
                "compreensão e interpretação", "gêneros textuais", "generos textuais", "tipos textuais", "inferência", "pressuposto e subentendido",
                "conectivos", "coesão e coerência", "coesao e coerencia", "figuras de linguagem", "intertextualidade", "referenciação",
                "tema e ideia central", "fato e opinião", "língua portuguesa", "lingua portuguesa", "português", "portugues"],
    "discipline_mode": "lingua_portuguesa",
    "summary": "Do básico ao avançado: compreensão × interpretação, gêneros e tipos textuais, explícito × implícito (inferência, pressuposto, subentendido), tema, ideia central e tese, fato e opinião, conectivos e relações de sentido, referenciação, coesão e coerência, figuras e ambiguidade, textos multissemióticos, intertextualidade, método de resolução e as 14 pegadinhas das bancas — com 25 questões inéditas comentadas.",
    "source_text": nodes["source"],
    "nodes": nodes["nodes"],
    "estimated_minutes": 240,
}
json.dump(topic, open("topic.json", "w", encoding="utf8"), ensure_ascii=False)
print(len(S), "seções;", len(keys), "itens;", sum(len(s["bodyMarkdown"]) for s in S), "chars")
from collections import Counter
print(Counter(s["kind"] for s in S))
