"""Monta a aula de Roubo a partir dos blocos já recebidos.

Uso: python3 build.py            → aula parcial (rascunho no catálogo)
     python3 build.py --final    → exige cobertura de todos os itens e o mínimo de questões
Gera lesson.json, topic.json, questoes.json e secoes/<ordem>.json (uma seção por arquivo,
gravada na área de preparação do banco com a mesma ordem).
"""
import json, os, sys
sys.path.insert(0, ".")
import helpers

FINAL = "--final" in sys.argv
# Arquivos dos blocos recebidos, em qualquer ordem (a posição vem de ORD).
BLOCOS = ["b01", "b01_lei", "b02", "b03", "b04", "b05", "b06", "b07"]
QUESTOES = ["q_b01", "q_b02", "q_b03", "q_b04", "q_b05", "q_b06", "q_b07", "q_extra"]

for f in BLOCOS:
    before = len(helpers.S)
    __import__(f)
    assert len(helpers.S) == len(helpers.ORD), f"{f}: cada seção precisa de ORD.append(...)"
    assert len(helpers.S) > before, f
for f in QUESTOES:
    __import__(f)

S, MOD, ORD = helpers.S, helpers.MOD, helpers.ORD
assert sorted(MOD) == list(range(1, len(S) + 1)), sorted(MOD)
assert len(set(ORD)) == len(ORD), "ordem repetida"
for i, s in enumerate(S, 1):
    s["module"] = MOD[i]
pairs = sorted(zip(ORD, S), key=lambda p: p[0])
S = [s for _, s in pairs]
for s in S:
    s["bodyMarkdown"] = helpers.fix_md(s["bodyMarkdown"], quote_breaks=True)

nodes = json.load(open("nodes.json", encoding="utf8"))
keys = {n["key"] for n in nodes["nodes"]}
used = {k for s in S for k in s["nodeKeys"]}
assert used <= keys, used - keys
assert 1 <= len(S) <= 30, len(S)
for s in S:
    assert len(s["bodyMarkdown"]) <= 12000, (s["title"], len(s["bodyMarkdown"]))
    assert len(s["title"]) <= 160, s["title"]
    assert len(s["nodeKeys"]) <= 40, s["title"]
    assert len(set(s["nodeKeys"])) == len(s["nodeKeys"]), s["title"]
if FINAL:
    assert not (keys - used), keys - used
    assert len(S) >= 2

TITLE = "Roubo (CP, art. 157)"
lesson = {
    "title": TITLE,
    "objective": "Dominar o crime de roubo (art. 157 do Código Penal) na redação vigente — conceito, bem jurídico, elementos do tipo, roubo próprio e impróprio, consumação e tentativa, causas de aumento, figuras qualificadas pelo resultado e latrocínio, distinções com outros crimes e jurisprudência — para concursos policiais.",
    "sections": S,
    "taughtNodeKeys": sorted(used),
    "references": [
        {"kind": "lei", "citation": "Código Penal (Decreto-Lei 2.848/1940), art. 157, com as Leis 9.426/1996, 13.654/2018, 13.964/2019, 15.181/2025, 15.358/2026, 15.397/2026 e 15.517/2026 — planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm"},
        {"kind": "jurisprudencia", "citation": "STJ, Tema Repetitivo 916 (REsp 1.499.050/RJ, Terceira Seção, 2015) e Súmula 582 — consumação do roubo com a inversão da posse"},
    ],
    "unverifiedClaims": [
        "Redação vigente do art. 157 conferida em compilação secundária atualizada até 22/09/2026 (legjur.com) e no texto da Lei 15.397/2026; a página do Planalto não pôde ser acessada nesta preparação.",
        "Art. 157, §§ 4º e 5º (Lei 15.358/2026, art. 33): texto conferido em compilação secundária (legjur.com) em 20/10/2026; o Planalto recusou a conexão.",
        "Art. 157, § 3º, I: a nova redação da Lei 15.397/2026 foi vetada; a continuidade da pena anterior (7 a 18 anos) segue comentários doutrinários à lei.",
    ],
    "verificationPending": True,
}
json.dump(lesson, open("lesson.json", "w", encoding="utf8"), ensure_ascii=False)

topic = {
    "slug": "cp-art-157-roubo",
    "title": TITLE,
    "kind": "dispositivo",
    "law_code": "CP",
    "articles": ["157"],
    "aliases": ["roubo", "crime de roubo", "roubo próprio", "roubo impróprio", "roubo majorado", "roubo qualificado", "latrocínio", "latrocinio",
                "roubo com arma de fogo", "roubo de celular", "art. 157 do código penal", "artigo 157 cp", "direito-penal-roubo-art-157",
                "crimes contra o patrimônio", "crimes contra o patrimonio"],
    "discipline_mode": "direito_penal",
    "summary": "Direito Penal — Crimes contra o Patrimônio. Roubo (CP, art. 157) na redação vigente, com as Leis 15.181/2025, 15.397/2026 e 15.517/2026: conceito, bem jurídico, elementos do tipo, roubo próprio e impróprio, consumação (Tema 916 do STJ), causas de aumento, arma de fogo, qualificadoras pelo resultado e latrocínio — aula em 16 blocos com questões comentadas.",
    "source_text": nodes["source"],
    "nodes": nodes["nodes"],
    "estimated_minutes": 300,
}
json.dump(topic, open("topic.json", "w", encoding="utf8"), ensure_ascii=False)

os.makedirs("secoes", exist_ok=True)
for f in os.listdir("secoes"):
    os.remove(os.path.join("secoes", f))
for o, s in pairs:
    json.dump(s, open(f"secoes/{o:03d}.json", "w", encoding="utf8"), ensure_ascii=False)

helpers.save_questions("questoes.json", keys=keys) if FINAL else json.dump(helpers.QS, open("questoes.json", "w", encoding="utf8"), ensure_ascii=False)
print(len(S), "seções (ordens", [o for o, _ in pairs], ");", len(used), "de", len(keys), "itens cobertos;", len(helpers.QS), "questões;", sum(len(s["bodyMarkdown"]) for s in S), "caracteres")
