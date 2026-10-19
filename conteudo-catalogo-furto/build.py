import json, sys
sys.path.insert(0, ".")
import helpers
for f in ("aula1", "aula2", "aula3", "aula4", "aula5"):
    __import__(f)
S, MOD = helpers.S, helpers.MOD
assert sorted(MOD) == list(range(1, len(S) + 1)), sorted(MOD)
for i, s in enumerate(S, 1):
    s["module"] = MOD[i]
nodes = json.load(open("nodes.json", encoding="utf8"))
keys = {n["key"] for n in nodes["nodes"]}
used = {k for s in S for k in s["nodeKeys"]}
assert used <= keys, used - keys
assert not (keys - used), keys - used
for s in S:
    assert len(s["bodyMarkdown"]) <= 12000, (s["title"], len(s["bodyMarkdown"]))
    assert len(s["nodeKeys"]) <= 40, s["title"]

lesson = {
    "title": "Furto (CP, art. 155)",
    "objective": "Dominar o furto (art. 155 do CP) do básico ao avançado: elementos, consumação e tentativa, furto simples, repouso noturno, privilégio, energia, todas as qualificadoras vigentes (inclusive as das Leis 15.181/2025, 15.358/2026, 15.397/2026 e 15.517/2026), insignificância, processo e jurisprudência.",
    "sections": S,
    "taughtNodeKeys": sorted(keys),
    "references": [
        {"kind": "lei", "citation": "Código Penal (Decreto-Lei 2.848/1940), art. 155 e arts. 14, 15, 16, 20, 24, 156, 157, 163, 168, 169, 171, 180 a 183 — planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm"},
        {"kind": "lei", "citation": "Lei 15.397/2026 (30/4/2026; DOU 4/5/2026) — novas penas do furto, roubo, estelionato e receptação; § 1º de metade; §§ 4º-B, 5º a 8º — consultada no Planalto em 19/10/2026"},
        {"kind": "lei", "citation": "Lei 15.181/2025 (28/7/2025; DOU 29/7/2025) — § 4º, V, e § 8º do art. 155 — consultada na Câmara dos Deputados (publicação original) em 19/10/2026"},
        {"kind": "lei", "citation": "Lei 15.358/2026 (24/3/2026, Lei Antifacção), art. 33 — § 9º do art. 155 — consultada no Planalto em 19/10/2026"},
        {"kind": "lei", "citation": "Lei 15.517/2026 (22/9/2026; DOU 23/9/2026) — §§ 10 a 12 do art. 155 (combustíveis) — consultada no Planalto em 19/10/2026"},
        {"kind": "lei", "citation": "Código de Processo Penal, arts. 5º, 28-A, 118 a 124, 158 a 158-F, 171, 172, 226, 302, 312, 313 e 322; Lei 9.099/1995, art. 89; CF, arts. 5º, XL, e 109, IV"},
        {"kind": "jurisprudencia", "citation": "STJ, Tema Repetitivo 934 (REsp 1.524.450/RJ, 3ª Seção, 2015) — consumação do furto (confirmado via Dizer o Direito, 2026)"},
        {"kind": "jurisprudencia", "citation": "STJ, AgRg no AgRg no AREsp 3.063.890/MS, 5ª Turma, 3/3/2026, Informativo 886 — furto tentado com o agente detido dentro do estabelecimento"},
        {"kind": "jurisprudencia", "citation": "STJ, Tema Repetitivo 1.144 (REsp 1.979.989/RS, 3ª Seção, 22/6/2022) — conceito de repouso noturno"},
        {"kind": "jurisprudencia", "citation": "STJ, Tema Repetitivo 1.087 (REsp 1.890.981/SP e outros, 3ª Seção, 25/5/2022) — repouso noturno não incide no furto qualificado"},
        {"kind": "jurisprudencia", "citation": "STJ, Súmulas 511, 567 e 442; AREsp 1.418.119/DF (5ª Turma, 2019, Inf. 648) — medidor adulterado: estelionato"},
        {"kind": "jurisprudencia", "citation": "STF, HC 84.412/SP (insignificância, 2004) e HC 123.108/MG (Plenário, 2015); STJ, RHC 101.299/RS (2019) — citados com base na jurisprudência consolidada; conferir"},
        {"kind": "outro", "citation": "Fontes para conferência: scon.stj.jus.br/SCON/; processo.stj.jus.br/repetitivos/temas_repetitivos/; enciclopediajuridica.pucsp.br/verbetes/furto/"},
    ],
    "unverifiedClaims": [
        "Letra exata do art. 155: a página do CP compilado não pôde ser lida por inteiro; a redação foi montada a partir das leis alteradoras (penas, frações e hipóteses conferidas; pontuação pode diferir).",
        "Redação literal dos §§ 4º, V, 9º, 10, 11 e 12 reconstituída de trechos das leis (Leis 15.181/2025, 15.358/2026, 15.397/2026 e 15.517/2026); conferir no Planalto.",
        "Acórdão do STJ publicado em 10/3/2026 (registro 202504114410) sobre substituição de medidor: não acessado; nenhuma tese atribuída.",
        "Enunciados das Súmulas 442 e 567 do STJ e os precedentes HC 84.412/SP, HC 123.108/MG e RHC 101.299/RS: citados com base na jurisprudência consolidada, sem consulta direta nesta preparação.",
        "Referência de 'pequeno valor' de cerca de um salário mínimo: orientação jurisprudencial sem caráter absoluto; conferir julgados recentes.",
        "Posição atual do STF sobre a majorante do repouso noturno no furto qualificado e sobre insignificância: conferir.",
        "Data de publicação no DOU e vigência da Lei 15.358/2026 (§ 9º): a página consultada não trazia a cláusula de vigência.",
    ],
    "verificationPending": True,
}
json.dump(lesson, open("lesson.json", "w", encoding="utf8"), ensure_ascii=False)
topic = {
    "slug": "cp-art-155-furto",
    "title": "Furto (CP, art. 155)",
    "kind": "dispositivo",
    "law_code": "CP",
    "articles": ["155"],
    "aliases": ["furto", "art. 155", "art 155", "artigo 155", "art. 155 do código penal", "crimes contra o patrimônio", "crimes contra o patrimonio",
                "furto simples", "furto qualificado", "repouso noturno", "furto privilegiado", "furto de energia", "furto mediante fraude", "furto eletrônico", "furto eletronico"],
    "discipline_mode": "direito_penal",
    "summary": "Art. 155 do CP completo e atualizado (Leis 15.181/2025, 15.358/2026, 15.397/2026 e 15.517/2026): elementos, consumação e tentativa (Tema 934), furto simples, repouso noturno (Temas 1.144 e 1.087), privilégio (Súm. 511), energia × estelionato, qualificadoras e formas especiais, insignificância, processo, jurisprudência, pegadinhas e glossário.",
    "source_text": nodes["source"],
    "nodes": nodes["nodes"],
    "estimated_minutes": 240,
}
json.dump(topic, open("topic.json", "w", encoding="utf8"), ensure_ascii=False)
print(len(S), "seções;", len(keys), "itens;", sum(len(s["bodyMarkdown"]) for s in S), "chars")
