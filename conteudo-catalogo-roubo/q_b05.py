from helpers import ME, CE

F, M, D = "facil", "medio", "dificil"

# Questões do Bloco 5 (enunciados, alternativas, gabaritos e comentários do autor; comentários por alternativa acrescentados)
ME(F, 1, "N0012", "Durante o roubo, o agente ameaça a vítima com uma faca e subtrai seu celular. Qual causa de aumento deve ser examinada?",
   [("Art. 157, § 2º-A, I, com aumento de 2/3.", "Errada: o § 2º-A, I, é para arma de fogo."),
    ("Art. 157, § 2º, VII, com aumento de 1/3 até metade.", "Correta: arma branca."),
    ("Art. 157, § 2º-B, automaticamente.", "Errada: exige arma de fogo de uso restrito ou proibido."),
    ("Nenhuma, pois a faca precisa causar lesão corporal.", "Errada: a majorante não exige lesão.")],
   "B", "O emprego de arma branca está previsto no § 2º, VII. Não é necessário que a vítima sofra uma lesão corporal para que a hipótese seja examinada.",
   "CP, art. 157, § 2º, VII.", "Exigir lesão corporal (D) ou aplicar a fração da arma de fogo (A).", "Faca: § 2º, VII, 1/3 a 1/2, sem exigir ferimento.")

ME(M, 2, "N0018", "O agente utiliza uma réplica de pistola para intimidar a vítima e subtrair sua carteira. Assinale a alternativa correta.",
   [("Não existe roubo, porque o instrumento não é uma arma verdadeira.", "Errada: o simulacro pode configurar grave ameaça."),
    ("O simulacro gera obrigatoriamente o aumento de 2/3.", "Errada: simulacro não é arma de fogo para a majorante."),
    ("O simulacro pode caracterizar grave ameaça, mas não gera automaticamente a majorante específica de arma de fogo.", "Correta."),
    ("O fato configura necessariamente furto simples.", "Errada: houve grave ameaça.")],
   "C", "O simulacro pode ser suficiente para caracterizar a grave ameaça do roubo. Isso não significa que corresponda automaticamente a uma arma de fogo para fins do § 2º-A, I.",
   "CP, art. 157, caput e § 2º-A, I.", "Equiparar simulacro a arma de fogo (B).", "Simulacro: roubo sim, 2/3 não.", essential=True)

ME(D, 3, "N0018", "A arma de fogo não foi apreendida, mas existem elementos probatórios que indicam seu emprego durante o roubo. Qual afirmação é mais adequada?",
   [("A majorante é sempre impossível.", "Errada: a orientação tradicional admite outros meios de prova."),
    ("A majorante é automática, independentemente da prova.", "Errada: o emprego deve ser provado."),
    ("A ausência de apreensão não afasta automaticamente a majorante segundo a orientação tradicional do STJ, mas a controvérsia é objeto do Tema 1.407.", "Correta."),
    ("O crime deixa de ser roubo.", "Errada: a grave ameaça permanece.")],
   "C", "A jurisprudência tradicional admite outros meios de prova. Como o Tema 1.407 foi afetado para uniformizar a questão, é necessário conferir eventual tese posterior antes da prova.",
   "CP, art. 157, § 2º-A, I; STJ, Tema Repetitivo 1.407 (afetado, sem tese em outubro de 2026).", "Tratar a apreensão como requisito absoluto (A).", "Orientação tradicional + acompanhar o Tema 1.407.")

ME(M, 2, "N0018", "Uma perícia demonstra que o artefato utilizado era absolutamente incapaz de realizar disparos. Qual conclusão deve ser considerada?",
   [("A majorante do emprego de arma de fogo incide obrigatoriamente.", "Errada: a inaptidão comprovada é relevante."),
    ("A incapacidade comprovada pode afastar a majorante específica, sem necessariamente afastar a grave ameaça do roubo.", "Correta."),
    ("O fato transforma-se automaticamente em furto.", "Errada: a intimidação pode subsistir."),
    ("A prova pericial nunca tem relevância.", "Errada.")],
   "B", "A inaptidão comprovada pode ser relevante para a majorante. A grave ameaça, porém, deve ser analisada separadamente.",
   "CP, art. 157, caput e § 2º-A, I.", "Confundir afastamento da majorante com desclassificação (C).", "Majorante e grave ameaça se analisam separadamente.")

ME(F, 1, "N0026", "Quando a violência ou grave ameaça é exercida com emprego de arma de fogo de uso restrito ou proibido, qual consequência está prevista no art. 157, § 2º-B?",
   [("Aumento de 1/3 até metade.", "Errada: fração do § 2º."),
    ("Aumento de 2/3, em qualquer hipótese.", "Errada: fração do § 2º-A."),
    ("Aplicação em dobro da pena prevista no caput, nos termos legais.", "Correta."),
    ("Exclusão da tipicidade do roubo.", "Errada.")],
   "C", "O § 2º-B prevê a aplicação em dobro da pena do caput. Não deve ser confundido com o aumento de 2/3 do § 2º-A, I.",
   "CP, art. 157, § 2º-B.", "Trocar dobro por 2/3 (B).", "Restrita ou proibida = dobro.", essential=True)

ME(M, 2, "N0015", "Durante um roubo, o agente subtrai uma arma de fogo, mas não a utiliza para ameaçar ou agredir a vítima. Qual afirmação está correta?",
   [("A subtração equivale necessariamente ao emprego de arma de fogo do § 2º-A, I.", "Errada: objeto ≠ instrumento."),
    ("É necessário distinguir a subtração da arma, prevista no § 2º, X, do emprego de arma de fogo na violência ou grave ameaça, previsto no § 2º-A, I.", "Correta."),
    ("O roubo fica automaticamente descaracterizado.", "Errada."),
    ("O § 2º-B sempre incide.", "Errada: exige emprego de arma restrita ou proibida.")],
   "B", "A lei trata de hipóteses distintas. A função do objeto na execução do crime deve ser identificada a partir dos fatos.",
   "CP, art. 157, § 2º, X, e § 2º-A, I.", "Confundir objeto subtraído e instrumento (A).", "Pergunte: qual a função da arma no fato?")

ME(D, 3, "N0005", "Sobre o emprego de armas no roubo, assinale a alternativa correta:",
   [("A ausência de perícia sempre impede o reconhecimento da majorante.", "Errada: a orientação tradicional admite outros meios de prova."),
    ("O simulacro equivale juridicamente a arma de fogo para todos os efeitos.", "Errada."),
    ("O emprego de arma branca possui previsão específica no § 2º, VII, enquanto o emprego de arma de fogo está no § 2º-A, I.", "Correta."),
    ("A majorante do emprego de arma de fogo exige necessariamente que haja disparo.", "Errada: basta o emprego.")],
   "C", "A alternativa C distingue corretamente os dispositivos. A apreensão, a perícia e a necessidade de disparo devem ser analisadas segundo a lei e a jurisprudência aplicáveis.",
   "CP, art. 157, § 2º, VII, e § 2º-A, I.", "Exigir perícia ou disparo (A, D).", "Branca: § 2º, VII · fogo: § 2º-A, I.")
