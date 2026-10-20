from helpers import ME, CE

F, M, D = "facil", "medio", "dificil"

# Questões do Bloco 8 (enunciados, gabaritos e comentários do autor)
CE(F, 1, "N0001", "O roubo e o furto diferenciam-se, entre outros aspectos, pelo emprego de violência contra pessoa ou grave ameaça que caracteriza o roubo.", True,
   "A distinção central está no modo de execução, sem prejuízo das demais hipóteses previstas nos respectivos artigos.",
   "CP, arts. 155 e 157.", "Confundir furto e roubo.", essential=True)

CE(F, 1, "N0001", "O crime de extorsão somente se consuma quando a vítima realiza a transferência bancária e o agente recebe o dinheiro.", False,
   "Conforme a Súmula 96 do STJ, a extorsão se consuma independentemente da obtenção da vantagem indevida.",
   "CP, art. 158; STJ, Súmula 96.", "Exigir a obtenção da vantagem para consumar a extorsão.", essential=True)

CE(M, 2, "N0010", "Toda privação da liberdade da vítima durante um roubo configura necessariamente extorsão mediante sequestro.", False,
   "A classificação depende da finalidade e das circunstâncias. A restrição de liberdade pode caracterizar a majorante do art. 157, § 2º, V, enquanto a extorsão mediante sequestro exige os elementos específicos do art. 159.",
   "CP, art. 157, § 2º, V, e art. 159.", "Generalizar com 'toda' e 'necessariamente'.")

CE(F, 1, "N0001", "A apropriação indébita pressupõe, em sua estrutura típica, que o agente tenha posse ou detenção legítima da coisa antes de se apropriar dela.", True,
   "Essa é a diferença estrutural em relação à subtração característica do furto e do roubo.",
   "CP, art. 168.", "Confundir apropriação com subtração.")

CE(F, 1, "N0001", "A receptação pode envolver a aquisição ou o recebimento de coisa que o agente sabe ser produto de crime, observados os demais requisitos legais.", True,
   "O art. 180 do Código Penal prevê diferentes condutas relacionadas a produto de crime.",
   "CP, art. 180.", "Restringir a receptação a uma única conduta.")

CE(M, 2, "N0001", "Se a vítima entrega voluntariamente um bem, nunca pode existir roubo ou extorsão.", False,
   "A entrega material do bem não resolve sozinha o enquadramento. É necessário verificar se a entrega foi obtida mediante violência ou grave ameaça e se a estrutura da conduta corresponde ao roubo ou à extorsão.",
   "CP, arts. 157 e 158.", "Achar que a entrega pela vítima afasta roubo e extorsão.")

CE(D, 4, "N0001", "Um criminoso aborda uma pessoa, toma seu celular mediante grave ameaça e, depois, exige que ela realize uma transferência bancária para uma conta indicada por ele. A análise penal deve considerar a possibilidade de enquadramentos distintos para a subtração do celular e para o constrangimento destinado à obtenção da transferência, examinando a autonomia das condutas e eventual concurso de crimes.", True,
   "O primeiro comportamento pode configurar roubo. O segundo pode configurar extorsão, caso estejam presentes os requisitos do art. 158. A solução definitiva depende da análise dos fatos, da autonomia das condutas e das regras sobre concurso de crimes. Não se deve presumir, sem examinar o caso concreto, que haverá necessariamente um único delito ou concurso material.",
   "CP, arts. 69, 157 e 158.", "Presumir sempre crime único.")
