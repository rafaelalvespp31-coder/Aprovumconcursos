import json, re
S = []
for i in range(1, 5): S += json.load(open(f"conteudo-catalogo-adm/sec{i}.json", encoding="utf8"))
# junta "como as bancas cobram" às pegadinhas (limite de 30 seções)
ib = next(s for s in S if s["kind"] == "interpretacao_banca")
pg = next(s for s in S if s["kind"] == "pegadinhas")
pg["bodyMarkdown"] += "\n\n**Como as bancas cobram este tema**\n\n" + ib["bodyMarkdown"]
pg["nodeKeys"] = sorted(set(pg["nodeKeys"] + ib["nodeKeys"]))[:40]
S.remove(ib)
taught = sorted({k for s in S for k in s["nodeKeys"]})
lesson = {
  "title": "Administração Pública (Noções de Direito Administrativo)",
  "objective": "Dominar a Administração Pública: conceito e sentidos, organização direta e indireta, as quatro entidades da Indireta, os princípios (LIMPE e demais), a autotutela, as regras constitucionais sobre concurso e cargos e a responsabilidade civil do Estado.",
  "sections": S,
  "taughtNodeKeys": taught,
  "references": [
    {"kind": "lei", "citation": "Constituição Federal, art. 37, caput, I a V, XVI, XVII, XIX, XX e §§ 1º, 2º, 4º e 6º; também arts. 5º, II, X, XXV, XXXIII, XLIX, LV, LX e LXXIII; 18; 21, XXIII, d; 38, III; 41, § 1º, III; 52, I; 62; 68; 95, par. único, I; 96, I, a; 100; 109, I; 128, § 5º, II, d; 150, § 2º; 173"},
    {"kind": "lei", "citation": "Decreto-Lei nº 200/1967, arts. 4º e 5º"},
    {"kind": "lei", "citation": "Lei nº 9.784/1999, arts. 1º, § 2º; 2º; 50; 53; 54; 55"},
    {"kind": "lei", "citation": "Lei nº 13.303/2016 (Estatuto das Estatais), arts. 3º e 4º; Lei nº 11.101/2005, art. 2º, I; Lei nº 8.987/1995, art. 6º, § 3º, II; Lei nº 12.527/2011; Lei nº 8.429/1992; CPC, art. 183"},
    {"kind": "jurisprudencia", "citation": "STF: Súmulas Vinculantes 13, 43 e 44; Súmulas 15, 346, 473, 517 e 556; Temas 130, 138, 161, 377/384, 545, 592, 666, 784, 897, 940 e 1.010; MI 670, 708 e 712; ADI 2.135"},
    {"kind": "jurisprudencia", "citation": "STJ, Súmula 525"},
    {"kind": "doutrina", "citation": "Conceitos doutrinários usuais do Direito Administrativo (sentidos da Administração, teoria do órgão, modalidades de descentralização, regime jurídico-administrativo, atos irrevogáveis)"},
    {"kind": "outro", "citation": "Fontes oficiais para conferência: planalto.gov.br (Constituição e leis citadas) e portal.stf.jus.br (súmulas e temas de repercussão geral)"},
  ],
  "unverifiedClaims": [
    "Texto literal do art. 37 da CF, do DL 200/1967 (arts. 4º e 5º), da Lei 9.784/1999 e da Lei 13.303/2016 transcrito pela equipe: conferir com a versão compilada do Planalto antes de tratar como texto oficial.",
    "ADI 2.135 (regime jurídico único): mérito julgado em 2024 com efeitos prospectivos — confirmar o alcance no acórdão.",
    "Números e teses dos temas de repercussão geral citados (130, 138, 161, 377/384, 545, 592, 666, 784, 897, 940, 1.010): conferir no portal do STF.",
    "Afastamento da SV 13 para cargos políticos e enquadramento de cargos como 'técnico ou científico': entendimentos jurisprudenciais com nuances; conferir precedentes atuais.",
    "A aula original citada no roteiro da apostila não foi fornecida; o conteúdo foi elaborado pela equipe a partir da legislação e da jurisprudência listadas.",
  ],
  "verificationPending": True,
}
json.dump(lesson, open("conteudo-catalogo-adm/lesson.json", "w", encoding="utf8"), ensure_ascii=False)
print(len(S), "seções;", len(taught), "itens ensinados;", sum(len(s["bodyMarkdown"]) for s in S), "caracteres")
