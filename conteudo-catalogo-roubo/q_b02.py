from helpers import ME, CE

F, M, D = "facil", "medio", "dificil"

# Questões do Bloco 2 (enunciados e gabaritos do autor; comentários por alternativa acrescentados)
ME(F, 1, "N0001", "Durante a abordagem de uma vítima, o agente ameaça agredi-la caso não entregue o celular. A vítima entrega o aparelho, e o agente foge. Em tese, a conduta caracteriza:",
   [("Furto simples.", "Errada: houve grave ameaça, que não integra o furto."),
    ("Roubo próprio.", "Correta: a grave ameaça viabilizou a subtração (art. 157, caput)."),
    ("Roubo impróprio.", "Errada: no impróprio a violência ou ameaça vem logo depois da subtração."),
    ("Apropriação indébita.", "Errada: não havia posse ou detenção anterior lícita da coisa.")],
   "B", "A grave ameaça foi empregada para viabilizar a subtração. A situação corresponde, em tese, ao art. 157, caput.",
   "CP, art. 157, caput.", "Confundir o momento da ameaça (C).", "Ameaça antes ou durante = roubo próprio.", essential=True)

ME(M, 2, "N0003", "Um agente subtrai uma bolsa sem ser percebido. Logo depois, ao ser alcançado pela vítima, agride-a para manter a bolsa em seu poder. Em tese, a conduta pode caracterizar:",
   [("Furto simples em qualquer hipótese.", "Errada: a violência posterior com a finalidade do § 1º muda a tipificação."),
    ("Roubo impróprio, desde que presentes os requisitos do § 1º.", "Correta: violência logo depois para garantir a detenção da coisa."),
    ("Roubo próprio obrigatoriamente.", "Errada: no próprio a violência viabiliza a subtração."),
    ("Apropriação indébita.", "Errada: não havia posse anterior lícita.")],
   "B", "A violência posterior pode caracterizar roubo impróprio quando ocorre logo depois da subtração e tem a finalidade de assegurar a impunidade ou a detenção da coisa.",
   "CP, art. 157, § 1º.", "Tratar o caso como furto em qualquer hipótese (A) ou como roubo próprio (C).", "Subtrai primeiro, agride logo depois para ficar com a coisa = impróprio.", essential=True)

ME(F, 1, "N0001", "Sobre o roubo próprio e o roubo impróprio, assinale a alternativa correta:",
   [("O roubo impróprio exige violência anterior à subtração.", "Errada: a violência do impróprio é posterior (logo depois)."),
    ("A grave ameaça é irrelevante para o roubo próprio.", "Errada: é um dos meios do caput."),
    ("O roubo próprio pode ocorrer mediante violência, grave ameaça ou meio que reduza a vítima à impossibilidade de resistência.", "Correta: reproduz as modalidades do caput."),
    ("Qualquer agressão posterior a um furto configura necessariamente roubo impróprio.", "Errada: exige proximidade temporal e finalidade do § 1º.")],
   "C", "A alternativa reproduz as modalidades previstas no caput. As demais alternativas ignoram elementos legais importantes.",
   "CP, art. 157, caput e § 1º.", "Generalizar o roubo impróprio (D).", "Três meios no caput: violência, grave ameaça, impossibilidade de resistência.")

CE(M, 2, "N0003", "O agente subtrai um objeto e, muito tempo depois, agride o proprietário por motivo inteiramente independente da subtração. A agressão posterior, por si só, permite concluir que houve roubo impróprio.", False,
   "É necessário examinar a relação temporal e funcional entre a subtração e a violência, além da finalidade específica exigida pelo § 1º. Uma agressão autônoma não transforma automaticamente o furto anterior em roubo impróprio.",
   "CP, art. 157, § 1º.", "Ignorar o 'logo depois' e a finalidade do § 1º.")

ME(D, 3, "N0003", "A respeito do roubo próprio e do impróprio, assinale a alternativa correta:",
   [("Ambos exigem que a violência anteceda a subtração.", "Errada: no impróprio a violência é posterior."),
    ("O roubo impróprio pressupõe subtração anterior e violência ou grave ameaça logo depois, com uma das finalidades previstas em lei.", "Correta: requisitos do § 1º."),
    ("O roubo próprio somente existe se houver lesão corporal.", "Errada: grave ameaça basta; lesão não é exigida."),
    ("O roubo impróprio é sempre punido com pena inferior à do furto qualificado.", "Errada: o § 1º remete à pena do caput (6 a 10 anos).")],
   "B", "A sequência temporal e a finalidade específica do § 1º são fundamentais para reconhecer o roubo impróprio. Não é indispensável que a violência produza lesão corporal.",
   "CP, art. 157, caput e § 1º.", "Exigir lesão (C) ou supor pena menor (D).", "Sequência + finalidade.")
