from helpers import ME, CE

F, M, D = "facil", "medio", "dificil"

# Questões do Bloco 9 (enunciados, gabaritos e comentários do autor)
CE(F, 1, "N0007", "Para que exista concurso de pessoas, todos os envolvidos devem executar pessoalmente o núcleo do tipo penal.", False,
   "O art. 29 do Código Penal permite a responsabilização de quem concorre para o crime, observados os requisitos legais. A contribuição pode ocorrer de diferentes formas.",
   "CP, art. 29.", "Exigir que todos executem o verbo do tipo.", essential=True)

CE(F, 1, "N0007", "A simples presença de uma pessoa no local do roubo é suficiente para responsabilizá-la como coautora.", False,
   "É necessário demonstrar contribuição juridicamente relevante e vínculo subjetivo. A mera presença não basta.",
   "CP, art. 29.", "Tratar a presença como coautoria.")

CE(F, 1, "N0007", "O art. 29, § 1º, do Código Penal prevê a possibilidade de redução de pena de um sexto a um terço quando a participação for de menor importância.", True,
   "A redução depende da caracterização jurídica da participação de menor importância.",
   "CP, art. 29, § 1º.", "Trocar as frações da redução.")

CE(M, 2, "N0007", "Na cooperação dolosamente distinta, o agente que quis participar de crime menos grave sempre fica imune à responsabilização pelo resultado mais grave, mesmo que este fosse previsível.", False,
   "O art. 29, § 2º, permite aumento de pena até a metade quando o resultado mais grave era previsível, nos termos legais.",
   "CP, art. 29, § 2º.", "Ignorar o aumento pela previsibilidade.")

CE(F, 1, "N0001", "O concurso material ocorre quando o agente, mediante mais de uma ação ou omissão, pratica dois ou mais crimes.", True,
   "É a regra do art. 69 do Código Penal.",
   "CP, art. 69.", "Confundir concurso material e formal.")

CE(M, 2, "N0001", "O concurso formal exige que o agente pratique dois ou mais crimes mediante uma só ação ou omissão.", True,
   "Essa é a estrutura básica do art. 70, observadas suas regras específicas.",
   "CP, art. 70.", "Confundir concurso formal e material.")

CE(M, 2, "N0001", "Para reconhecer crime continuado, basta que dois crimes tenham sido praticados pela mesma pessoa.", False,
   "O art. 71 exige crimes da mesma espécie e condições que permitam reconhecer a continuidade, conforme os requisitos legais e a jurisprudência aplicável.",
   "CP, art. 71.", "Reduzir a continuidade à identidade do autor.")

CE(D, 4, "N0007", "Dois agentes combinam a prática de um furto sem violência. Durante a execução, um deles decide, sem conhecimento ou adesão do outro, empregar violência contra a vítima. A responsabilidade do segundo agente pelo delito efetivamente praticado deve ser analisada à luz de sua contribuição, de seu vínculo subjetivo e das regras de imputação do resultado, não sendo possível concluir automaticamente que ele responderá pelo roubo apenas por estar presente.", True,
   "O concurso de pessoas exige análise individualizada. O art. 29, § 2º, pode ser relevante se houver cooperação dolosamente distinta, mas sua aplicação depende dos fatos, do crime que o agente quis praticar e da previsibilidade do resultado mais grave.",
   "CP, art. 29, caput e § 2º.", "Responsabilizar automaticamente pelo roubo quem quis só o furto.")
