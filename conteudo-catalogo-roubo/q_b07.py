from helpers import ME, CE

F, M, D = "facil", "medio", "dificil"

# Questões do Bloco 7 (enunciados, gabaritos e comentários do autor)
CE(F, 1, "N0029", "Durante um roubo, o agente mata a vítima, mas é impedido de subtrair o objeto pretendido. Segundo a orientação do STF, a conduta pode configurar latrocínio consumado.", True,
   "A Súmula 610 do STF estabelece que há latrocínio quando o homicídio se consuma, ainda que o agente não realize a subtração de bens da vítima.",
   "CP, art. 157, § 3º, II; STF, Súmula 610.", "Exigir a subtração consumada.", essential=True)

CE(F, 1, "N0029", "O latrocínio é julgado pelo Tribunal do Júri porque o resultado morte transforma o delito em crime doloso contra a vida.", False,
   "O latrocínio é classificado como crime contra o patrimônio. Conforme a Súmula 603 do STF, compete ao juízo singular julgá-lo.",
   "CP, art. 157, § 3º, II; STF, Súmula 603.", "Confundir o resultado morte com crime doloso contra a vida.", essential=True)

CE(F, 1, "N0029", "A pena prevista no art. 157, § 3º, II, do Código Penal, na redação vigente consultada em outubro de 2026, é de reclusão de 24 a 30 anos e multa.", True,
   "Essa é a pena da forma geral do roubo qualificado pelo resultado morte, sem prejuízo da análise de eventual hipótese legal especial.",
   "CP, art. 157, § 3º, II (Lei 15.397/2026).", "Usar a pena anterior (20 a 30 anos).")

CE(M, 2, "N0029", "Para existir latrocínio, é indispensável que o agente consiga subtrair o bem da vítima.", False,
   "Segundo a Súmula 610 do STF, a consumação do homicídio no contexto do roubo pode caracterizar latrocínio consumado, mesmo que a subtração não se consume.",
   "CP, art. 157, § 3º, II; STF, Súmula 610.", "Vincular a consumação do latrocínio à subtração.")

CE(M, 2, "N0028", "A ocorrência de qualquer lesão física durante o roubo é suficiente para aplicar a pena do art. 157, § 3º, I.", False,
   "A lei exige lesão corporal de natureza grave, conforme a classificação penal aplicável. Um ferimento qualquer não basta automaticamente.",
   "CP, art. 129, § 1º, e art. 157, § 3º, I.", "Tratar qualquer ferimento como lesão grave.")

CE(M, 2, "N0029", "O latrocínio, por ser crime contra o patrimônio, é de competência do juízo singular, embora resulte na morte de uma pessoa.", True,
   "É a orientação da Súmula 603 do STF.",
   "STF, Súmula 603.", "Associar morte a Tribunal do Júri.")

CE(D, 4, "N0029", "Durante a prática de um roubo, o agente dispara contra a vítima com intenção de matá-la. A vítima sobrevive, mas o agente consegue subtrair o celular. Considerando apenas essas informações, é correto afirmar que a subtração consumada impede o reconhecimento da tentativa de latrocínio.", False,
   "A consumação da subtração patrimonial não impede, por si só, o reconhecimento da tentativa de latrocínio. Se o agente atuou com dolo de matar e a morte não ocorreu por circunstâncias alheias à sua vontade, pode haver tentativa de latrocínio. A conclusão definitiva depende da prova dos elementos subjetivos e objetivos do caso.",
   "CP, arts. 14, II, e 157, § 3º, II.", "Achar que a subtração consumada afasta a tentativa de latrocínio.")
