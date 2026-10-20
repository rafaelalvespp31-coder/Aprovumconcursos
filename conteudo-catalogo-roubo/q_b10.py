from helpers import ME, CE

F, M, D = "facil", "medio", "dificil"

# Questões do Bloco 10 (enunciados, gabaritos e comentários do autor).
# As questões 1 a 3 do autor repetem itens já cadastrados no Bloco 9 (mesmos conceitos dos arts. 69 a 71);
# entram no banco com o enunciado do Bloco 10, que é diferente.
CE(F, 1, "N0001", "No concurso material, o agente pratica dois ou mais crimes mediante mais de uma ação ou omissão.", True,
   "Corresponde à estrutura do art. 69 do Código Penal.",
   "CP, art. 69.", "Confundir concurso material e formal.")

CE(F, 1, "N0001", "No concurso formal, o agente pratica dois ou mais crimes mediante uma só ação ou omissão.", True,
   "É a regra geral do art. 70, observadas as hipóteses específicas previstas no dispositivo.",
   "CP, art. 70.", "Confundir concurso formal e material.")

CE(M, 2, "N0001", "A prática de dois roubos pela mesma pessoa é suficiente, por si só, para reconhecer crime continuado.", False,
   "O art. 71 exige crimes da mesma espécie e condições que permitam reconhecer a continuidade, conforme a lei e a jurisprudência.",
   "CP, art. 71.", "Reduzir a continuidade à repetição de crimes.")

CE(M, 2, "N0001", "A existência de várias vítimas durante um único assalto resolve automaticamente a classificação do concurso de crimes.", False,
   "É necessário examinar a estrutura da conduta, os patrimônios atingidos, os elementos subjetivos e a jurisprudência aplicável.",
   "CP, arts. 70 e 157.", "Contar vítimas para definir o concurso.")

CE(M, 3, "N0001", "O concurso formal impróprio pode ocorrer quando a ação ou omissão é dolosa e os crimes concorrentes resultam de desígnios autônomos.", True,
   "A parte final do art. 70 prevê a aplicação cumulativa das penas nessa hipótese.",
   "CP, art. 70, parte final.", "Aplicar exasperação quando há desígnios autônomos.", essential=True)

CE(D, 3, "N0001", "A continuidade delitiva específica pode ser relevante para crimes dolosos praticados contra vítimas diferentes com violência ou grave ameaça, desde que presentes os requisitos do art. 71, parágrafo único.", True,
   "O dispositivo estabelece uma regra especial, cuja incidência depende dos requisitos legais.",
   "CP, art. 71, parágrafo único.", "Achar que crimes violentos nunca admitem continuidade.")

CE(D, 4, "N0001", "Um agente pratica dois roubos em dias diferentes, utilizando modo de execução semelhante. Por essa razão, deve ser reconhecida obrigatoriamente a continuidade delitiva, independentemente das demais circunstâncias.", False,
   "A semelhança do modo de execução é relevante, mas não basta isoladamente. A continuidade delitiva exige a presença dos requisitos do art. 71, incluindo crimes da mesma espécie e condições concretas que permitam considerar os delitos subsequentes como continuação do primeiro.",
   "CP, art. 71.", "Tratar a semelhança do modo de execução como suficiente.")
