from helpers import ME, CE

F, M, D = "facil", "medio", "dificil"

# Questões do Bloco 11 (enunciados, gabaritos e comentários do autor)
CE(F, 1, "N0007", "A prática do roubo por duas ou mais pessoas pode configurar a majorante do concurso de pessoas, desde que estejam presentes os requisitos legais.", True,
   "O art. 157, § 2º, II, prevê essa causa de aumento. A presença física de várias pessoas, isoladamente, não basta.",
   "CP, art. 157, § 2º, II.", "Tratar a presença física como suficiente.")

CE(F, 1, "N0018", "O emprego de simulacro de arma de fogo equivale necessariamente ao emprego de arma de fogo para aplicação da majorante específica.", False,
   "O simulacro pode ser utilizado para a grave ameaça, mas não se confunde automaticamente com arma de fogo para fins da majorante específica.",
   "CP, art. 157, § 2º-A, I.", "Equiparar simulacro a arma de fogo.")

CE(M, 2, "N0005", "A quantidade de majorantes determina, por si só, a fração de aumento da pena no roubo circunstanciado.", False,
   "Conforme a Súmula 443 do STJ, a fração de aumento na terceira fase exige fundamentação concreta e não pode se apoiar exclusivamente no número de majorantes.",
   "CP, art. 157, § 2º; STJ, Súmula 443.", "Contar majorantes para escolher a fração.", essential=True)

CE(F, 1, "N0012", "O emprego de arma branca e o emprego de arma de fogo são hipóteses que devem ser analisadas de acordo com os dispositivos específicos do art. 157.", True,
   "A lei estabelece hipóteses distintas, com requisitos próprios.",
   "CP, art. 157, § 2º, VII, e § 2º-A, I.", "Misturar arma branca e arma de fogo.")

CE(M, 2, "N0010", "Qualquer restrição momentânea da liberdade da vítima durante o roubo configura automaticamente a majorante do art. 157, § 2º, V.", False,
   "É necessário examinar o efetivo preenchimento dos requisitos legais e as circunstâncias concretas.",
   "CP, art. 157, § 2º, V.", "Aplicar a majorante a qualquer restrição momentânea.")

CE(D, 4, "N0005", "Um agente pratica roubo em concurso de pessoas e utiliza arma de fogo. Por existirem duas majorantes, o juiz pode aplicar automaticamente a maior fração de aumento, sem apresentar fundamentação concreta.", False,
   "A Súmula 443 do STJ exige fundamentação concreta para o aumento na terceira fase da dosimetria. O número de majorantes, isoladamente, não justifica a escolha da fração mais elevada.",
   "CP, art. 68; STJ, Súmula 443.", "Dispensar fundamentação por haver várias majorantes.")
