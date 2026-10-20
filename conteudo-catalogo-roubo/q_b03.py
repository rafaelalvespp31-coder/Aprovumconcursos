from helpers import ME, CE

F, M, D = "facil", "medio", "dificil"

# Questões do Bloco 3 (enunciados e gabaritos do autor; comentários por alternativa acrescentados)
ME(M, 2, "N0001", "Após ameaçar uma vítima, o agente toma seu celular. Policiais que estavam próximos iniciam perseguição e recuperam o aparelho segundos depois. Assinale a alternativa correta:",
   [("Há necessariamente tentativa, porque o agente não manteve a posse tranquila.", "Errada: a posse tranquila é dispensável (Súmula 582 do STJ)."),
    ("O roubo pode estar consumado, pois houve inversão da posse.", "Correta: teoria da amotio."),
    ("A recuperação do celular transforma o fato em furto.", "Errada: houve grave ameaça; a recuperação não muda o tipo."),
    ("O crime somente se consuma após o agente chegar ao local onde pretendia esconder o bem.", "Errada: não se exige posse desvigiada.")],
   "B", "A orientação consolidada é a de que a consumação ocorre com a inversão da posse, ainda que por breve período, sem exigir posse tranquila. A perseguição e a recuperação imediata do bem não afastam, por si sós, a consumação.",
   "CP, arts. 14, I, e 157; STJ, Súmula 582 e Tema 916.", "Exigir posse tranquila (A, D).", "Inverteu a posse? Consumou.", essential=True)

ME(F, 1, "N0001", "O agente inicia a execução de um roubo, mas é impedido por um terceiro antes de conseguir subtrair o bem. Considerando o art. 14, II, do Código Penal, a tentativa exige:",
   [("Apenas intenção criminosa.", "Errada: a cogitação não é punível."),
    ("Início da execução e não consumação por circunstância alheia à vontade do agente.", "Correta: art. 14, II."),
    ("Recuperação posterior do bem.", "Errada: irrelevante para a tentativa."),
    ("Posse tranquila durante alguns minutos.", "Errada: posse tranquila não é requisito de nada aqui.")],
   "B", "A tentativa pressupõe início da execução e não consumação por circunstâncias alheias à vontade do agente.",
   "CP, art. 14, II.", "Reduzir a tentativa à intenção (A).", "Execução iniciada + interrupção externa.")

ME(M, 2, "N0001", "Durante a execução de um roubo, o agente ainda poderia prosseguir, mas decide voluntariamente abandonar a conduta antes da subtração. Em tese, a situação pode configurar:",
   [("Desistência voluntária, conforme o art. 15 do Código Penal.", "Correta: 'posso, mas não quero'."),
    ("Roubo consumado obrigatoriamente.", "Errada: não houve subtração."),
    ("Crime impossível em qualquer hipótese.", "Errada: o meio e o objeto eram idôneos (art. 17)."),
    ("Arrependimento posterior automaticamente.", "Errada: o art. 16 exige crime sem violência ou grave ameaça e reparação.")],
   "A", "Se o agente voluntariamente interrompe a execução, pode incidir o art. 15. A responsabilidade pelos atos já praticados deve ser examinada conforme o caso.",
   "CP, arts. 15, 16 e 17.", "Confundir desistência com arrependimento posterior (D).", "Fórmula de Frank: posso, mas não quero.")

ME(F, 1, "N0001", "A vítima recupera seu celular imediatamente após o agente tê-lo subtraído mediante grave ameaça. Qual afirmação está correta?",
   [("A recuperação elimina necessariamente a tipicidade do roubo.", "Errada: o tipo já se realizou."),
    ("A recuperação impede a consumação em todos os casos.", "Errada: a consumação ocorre com a inversão da posse."),
    ("A recuperação posterior não desfaz automaticamente a consumação já ocorrida.", "Correta."),
    ("A restituição transforma o roubo em furto simples.", "Errada: a grave ameaça continua presente.")],
   "C", "A classificação do crime depende da realização dos elementos do tipo, e não apenas do destino posterior do bem.",
   "CP, art. 157; STJ, Súmula 582.", "Confundir consumação com recuperação do bem.", "Consumação olha a conduta; recuperação olha o depois.")

ME(D, 3, "N0001", "Assinale a afirmação correta sobre a consumação do roubo:",
   [("Exige posse mansa, pacífica e desvigiada.", "Errada: Súmula 582 do STJ."),
    ("Depende de o agente conseguir usufruir do bem por período prolongado.", "Errada: basta a inversão, ainda que breve."),
    ("Em regra, ocorre com a inversão da posse, ainda que breve, sendo dispensável a posse tranquila.", "Correta: teoria da amotio."),
    ("Somente ocorre quando o objeto é retirado da cidade onde aconteceu o crime.", "Errada: sem amparo legal.")],
   "C", "A inversão da posse é o critério adotado na orientação consolidada dos tribunais superiores. Não se exige que o agente mantenha o objeto por tempo prolongado.",
   "CP, art. 157; STJ, Súmula 582 e Tema 916.", "Exigir posse mansa e pacífica (A).", "Amotio = apreensão = inversão da posse.")

CE(M, 2, "N0001", "O agente subtrai o telefone mediante grave ameaça, mas é perseguido imediatamente e preso antes de conseguir esconder o aparelho. Como não houve posse tranquila, o crime permaneceu tentado.", False,
   "A ausência de posse tranquila não impede a consumação. Se houve inversão da posse, o roubo pode estar consumado, mesmo com perseguição imediata e recuperação do objeto.",
   "CP, art. 157; STJ, Súmula 582.", "Exigir posse tranquila para a consumação.")
