from helpers import ME, CE

F, M, D = "facil", "medio", "dificil"

# Questões do Bloco 1 (enunciados e gabaritos do autor; comentários por alternativa acrescentados)
CE(F, 1, "N0001", "O roubo diferencia-se do furto, em sua forma fundamental, pela presença de violência contra a pessoa, grave ameaça ou redução da vítima à impossibilidade de resistência, conforme o art. 157 do Código Penal.", True,
   "Esses meios de execução integram o tipo penal do roubo. O furto não possui tais elementos como integrantes de sua forma básica.",
   "CP, arts. 155 e 157, caput.", "Nenhuma — item conceitual correto.", essential=True)

ME(F, 1, "N0001", "Um indivíduo, sem ameaçar ou agredir a vítima, retira discretamente o celular de sua bolsa. Em princípio, a conduta corresponde a:",
   [("Roubo próprio.", "Errada: não houve violência, grave ameaça nem redução da vítima à impossibilidade de resistência."),
    ("Roubo impróprio.", "Errada: o roubo impróprio exige violência ou grave ameaça logo depois da subtração (art. 157, § 1º)."),
    ("Furto, se presentes os demais elementos do tipo.", "Correta: subtração sem violência ou grave ameaça (art. 155)."),
    ("Extorsão.", "Errada: a extorsão exige constranger a vítima a fazer, tolerar ou deixar de fazer algo (art. 158)."),
    ("Constrangimento ilegal necessariamente.", "Errada: não houve constrangimento da vítima.")],
   "C", "A retirada sem violência ou grave ameaça, nas circunstâncias apresentadas, aponta para o furto, desde que presentes seus demais elementos. As demais alternativas atribuem figuras que não decorrem dos fatos descritos.",
   "CP, arts. 155, 157 e 158.", "Confundir subtração silenciosa com roubo (A, B).", "Procure o meio empregado contra a pessoa.", essential=True)

CE(F, 1, "N0001", "Toda ameaça praticada contra uma pessoa configura automaticamente o crime de roubo.", False,
   "O roubo exige a subtração patrimonial e os demais elementos do tipo. Uma ameaça sem vínculo com subtração não basta para configurar roubo, embora possa constituir outro ilícito conforme o caso.",
   "CP, art. 157, caput; art. 147.", "Generalizar 'ameaça' como sinônimo de roubo.")

ME(F, 1, "N0001", "Para a caracterização do roubo, a coisa subtraída deve ser:",
   [("Necessariamente imóvel.", "Errada: o tipo exige coisa móvel."),
    ("Exclusivamente dinheiro em espécie.", "Errada: qualquer coisa móvel alheia pode ser objeto do roubo."),
    ("Coisa móvel alheia, observados os demais elementos do tipo.", "Correta: elementar do art. 157."),
    ("Necessariamente de elevado valor.", "Errada: o valor não define o crime."),
    ("Sempre pertencente ao Estado.", "Errada: basta ser alheia ao agente.")],
   "C", "O art. 157 descreve a subtração de coisa móvel alheia. As demais opções restringem indevidamente o objeto material.",
   "CP, art. 157, caput.", "Restringir o objeto material (B, D, E).", "Coisa móvel + alheia.")
