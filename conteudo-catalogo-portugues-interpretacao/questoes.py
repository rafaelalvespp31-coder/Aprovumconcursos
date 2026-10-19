import json, re
Q = []
L = "ABCDE"
TARGETS = list("CADBEBEACDAECBDDBEACECADB")
def q(level, diff, node, statement, opts, correct, why, conceito, pegadinha, dica, essential=False):
    assert len(opts) == 5 and correct in L
    # Gabarito balanceado: leva a correta para a letra-alvo (ciclo A..E embaralhado) com rotação.
    target = TARGETS[len(Q) % len(TARGETS)]
    shift = (L.index(target) - L.index(correct)) % 5
    order = [None] * 5
    for i in range(5):
        order[(i + shift) % 5] = i
    remap = {L[old]: L[new] for new, old in enumerate(order)}
    fix = lambda t: re.sub(r"\(([A-E](?:, [A-E])*)\)", lambda mm: "(" + ", ".join(sorted(remap[x] for x in mm.group(1).split(", "))) + ")", re.sub(r"\b(alternativa) ([A-E])\b", lambda mm: f"{mm.group(1)} {remap[mm.group(2)]}", t))
    opts = [opts[o] for o in order]
    correct = remap[correct]
    why, pegadinha, dica = fix(why), fix(pegadinha), fix(dica)
    options = []
    for i, (text, expl) in enumerate(opts):
        options.append({"label": L[i], "text": text, "correct": L[i] == correct, "explanation": expl})
    just = f"Gabarito: {correct}. {why}\n\nConceito cobrado: {conceito}\nPegadinha usada: {pegadinha}\nDica de prova: {dica}"
    Q.append({"level": level, "type": "multipla_escolha", "statement": "Questão inédita (APROVUM), no estilo das bancas de concursos.\n\n" + statement, "options": options,
              "correctAnswerTrue": False, "justification": just, "nodeKey": node, "difficulty": diff, "essential": essential, "dependsOnExternalSource": False})

T1 = "Texto: \"A partir deste mês, a unidade passou a oferecer cursos profissionalizantes aos internos. Segundo a direção, a iniciativa busca facilitar a reinserção no mercado de trabalho após o cumprimento da pena.\""
# ------------------------------------------------------------ FÁCIL
q("facil", 1, "N0004", T1 + "\n\nDe acordo com o texto, é correto afirmar que:",
  [("os cursos já eram oferecidos antes deste mês.", "Contradiz o pressuposto de \"passou a oferecer\": antes não eram oferecidos."),
   ("a iniciativa tem como objetivo, segundo a direção, facilitar a reinserção profissional.", "Correta: informação explícita atribuída à direção."),
   ("todos os internos já concluíram os cursos.", "Extrapolação: o texto não fala em conclusão."),
   ("a reinserção no mercado está garantida a quem fizer os cursos.", "Troca 'busca facilitar' (intenção) por garantia."),
   ("os cursos foram exigidos pelos próprios internos.", "Não há informação sobre a origem da iniciativa.")],
  "B", "A alternativa B reproduz o que o texto diz, com a fonte (segundo a direção).",
  "Informação explícita", "Troca de intenção por resultado (D) e contradição do pressuposto (A)", "Em \"de acordo com o texto\", procure a frase que diz exatamente aquilo.", True)

q("facil", 1, "N0008", "Texto: \"Separe os documentos pessoais, preencha o formulário on-line e compareça ao local da prova com uma hora de antecedência.\"\n\nO tipo textual predominante é:",
  [("narrativo.", "Não há sequência de ações vividas por personagens no passado."),
   ("descritivo.", "Não há caracterização de seres ou lugares."),
   ("injuntivo.", "Correta: verbos no imperativo orientam o leitor a agir."),
   ("argumentativo.", "Não se defende tese."),
   ("expositivo.", "O texto não explica um conceito; ele dá ordens.")],
  "C", "Os verbos 'separe', 'preencha' e 'compareça', no imperativo, organizam instruções.",
  "Tipos textuais", "Confundir instrução com exposição", "Imperativo + passos = forte indício de injunção (confira a finalidade).", True)

q("facil", 1, "N0012", "Na frase \"O candidato deixou de estudar à noite\", a informação pressuposta é a de que o candidato:",
  [("nunca estudou à noite.", "Contradiz o pressuposto."),
   ("estudava à noite antes.", "Correta: 'deixar de' pressupõe que a ação ocorria."),
   ("passou a estudar de manhã.", "Possível, mas não está marcado na frase: seria extrapolação."),
   ("foi reprovado no concurso.", "Sem base no texto."),
   ("está cansado de estudar.", "Motivo não informado.")],
  "B", "'Deixar de' é marcador clássico de pressuposição: indica uma ação anterior interrompida.",
  "Pressuposição", "Inventar o novo horário ou o motivo (C, E)", "Pressuposto resiste à negação: 'não deixou de estudar à noite' continua pressupondo que estudava.", True)

q("facil", 2, "N0024", "Em \"O efetivo é pequeno, mas a equipe cumpriu todas as metas\", o termo \"mas\" estabelece relação de:",
  [("causa.", "A equipe não cumpriu as metas por causa do efetivo pequeno."),
   ("conclusão.", "Não se deduz uma ideia da outra."),
   ("oposição.", "Correta: o resultado contraria a expectativa criada pela primeira oração."),
   ("finalidade.", "Não há objetivo expresso."),
   ("condição.", "Não há hipótese.")],
  "C", "A segunda oração contraria a expectativa (efetivo pequeno → metas não cumpridas) e é a ideia que prevalece.",
  "Conectivos — oposição", "Ler 'mas' como causa", "'Mas, porém, contudo, entretanto, no entanto' = oposição.", True)

q("facil", 2, "N0029", "Texto: \"Os peritos chegaram ao local às 7h. Eles recolheram as amostras antes da chuva.\"\n\nO pronome \"Eles\" retoma:",
  [("as amostras.", "'Amostras' é feminino; 'eles' é masculino."),
   ("o local.", "Singular; 'eles' é plural."),
   ("os peritos.", "Correta: anáfora do termo masculino plural anterior."),
   ("a chuva.", "Feminino singular."),
   ("um termo que ainda vai aparecer no texto.", "Seria catáfora; aqui o termo já foi dito.")],
  "C", "Teste de concordância e de sentido: quem recolheu as amostras foram os peritos.",
  "Referenciação — anáfora", "Escolher o termo mais próximo sem testar a concordância", "Substitua o pronome pelo candidato e releia.")

q("facil", 2, "N0019", "Assinale a alternativa que apresenta uma OPINIÃO, e não um fato:",
  [("A prova terá duração de quatro horas.", "Informação verificável."),
   ("O edital prevê 600 vagas.", "Verificável no edital."),
   ("A banca divulgou o gabarito na segunda-feira.", "Verificável."),
   ("A redação deste ano foi a mais injusta da história.", "Correta: juízo de valor (\"mais injusta\")."),
   ("O concurso exige nível médio.", "Verificável.")],
  "D", "'A mais injusta da história' é avaliação subjetiva; as demais podem ser conferidas.",
  "Fato × opinião", "Achar que todo superlativo é fato", "Pergunte: dá para verificar?")

q("facil", 2, "N0037", "Em \"Aquele delegado tem um coração de pedra\", a expressão destacada foi empregada em sentido:",
  [("denotativo, indicando uma doença cardíaca.", "Leitura literal inadequada ao contexto."),
   ("conotativo, sugerindo insensibilidade.", "Correta: sentido figurado (metáfora)."),
   ("técnico, próprio da medicina.", "Não há contexto técnico."),
   ("ambíguo, sem sentido definido.", "O contexto fixa o sentido figurado."),
   ("irônico, significando bondade.", "Não há pistas de inversão de sentido.")],
  "B", "'Coração de pedra' é metáfora consagrada para pessoa insensível.",
  "Denotação × conotação", "Ler literalmente uma expressão figurada", "Pergunte: o sentido literal faz sentido aqui?")

q("facil", 2, "N0009", "Um texto curto, sem assinatura individual, publicado na página de opinião de um jornal, defende que \"este veículo considera urgente a contratação de novos agentes\". Trata-se, mais provavelmente, de:",
  [("notícia.", "A notícia informa; não defende posição do veículo."),
   ("editorial.", "Correta: opinião institucional do veículo, sem assinatura."),
   ("reportagem.", "A reportagem aprofunda um tema com fontes."),
   ("crônica.", "A crônica reflete sobre o cotidiano com leveza."),
   ("entrevista.", "Não há perguntas e respostas.")],
  "B", "As pistas são: posição do veículo ('este veículo considera'), ausência de assinatura individual e seção de opinião.",
  "Gêneros — editorial", "Confundir editorial com artigo de opinião ou notícia", "Assinatura individual → artigo; voz do veículo → editorial.")

# ------------------------------------------------------------ MÉDIO
T2 = "Texto: \"Muitos acreditam que câmeras resolvem sozinhas o problema da segurança. Os dados, porém, mostram outra coisa: elas ajudam, mas só funcionam quando há equipe para monitorar as imagens e agir rápido. Investir apenas em equipamento é, portanto, desperdiçar dinheiro público.\""
q("medio", 3, "N0016", T2 + "\n\nA tese defendida pelo autor é:",
  [("câmeras resolvem sozinhas o problema da segurança.", "É a crença que o autor contesta."),
   ("câmeras não ajudam na segurança.", "O autor diz que elas ajudam."),
   ("investir somente em equipamento, sem equipe, é desperdício de dinheiro público.", "Correta: conclusão introduzida por 'portanto'."),
   ("os dados sobre segurança são confiáveis.", "Não é o ponto defendido."),
   ("é preciso instalar mais câmeras nas cidades.", "O texto não defende mais câmeras.")],
  "C", "O texto abre com uma crença comum, refuta-a com 'porém' e conclui com 'portanto' — a tese é a conclusão.",
  "Tese × argumento × opinião refutada", "Marcar a primeira frase (crença refutada) como tese", "Conectivos de conclusão e oposição sinalizam a tese.", True)

q("medio", 3, "N0013", T2 + "\n\nInfere-se corretamente do texto que:",
  [("o autor é contra o uso de câmeras.", "Ele afirma que elas ajudam."),
   ("a eficácia das câmeras depende de pessoal para monitorar e agir.", "Correta: está nas condições 'só funcionam quando há equipe'."),
   ("as câmeras atuais são de má qualidade.", "Não há menção à qualidade."),
   ("a criminalidade aumentou após a instalação de câmeras.", "Extrapolação sem base."),
   ("o dinheiro público é sempre desperdiçado.", "Generalização indevida.")],
  "B", "A alternativa B decorre diretamente da restrição 'só funcionam quando há equipe'.",
  "Inferência e limites", "Generalização (E) e extrapolação (D)", "Toda inferência precisa de uma pista que você consiga apontar.")

q("medio", 3, "N0027", "Em \"Embora o prazo fosse curto, a equipe entregou o laudo\", a reescrita que mantém o sentido original é:",
  [("O prazo era curto; portanto, a equipe entregou o laudo.", "'Portanto' cria conclusão: o prazo curto seria a razão da entrega."),
   ("A equipe entregou o laudo, mas o prazo era curto.", "Inverte o destaque: o que prevalece passa a ser o prazo curto."),
   ("O prazo era curto, mas a equipe entregou o laudo.", "Correta: concessão convertida em oposição, mantendo o destaque na entrega."),
   ("Como o prazo era curto, a equipe entregou o laudo.", "'Como' no início cria causa."),
   ("Se o prazo fosse curto, a equipe entregaria o laudo.", "Cria hipótese (condição).")],
  "C", "A oração concessiva passa a ser a primeira coordenada e a principal vem após 'mas', preservando o que prevalece.",
  "Concessão ⇄ oposição", "Inverter o destaque (B) ou trocar a relação (A, D, E)", "Na conversão, o que vem depois do 'mas' é o que era a oração principal.", True)

q("medio", 3, "N0020", "Texto: \"A nova escala pode reduzir o cansaço dos agentes, segundo estudo preliminar da coordenação.\"\n\nÉ correto afirmar que o texto:",
  [("garante que a escala reduzirá o cansaço.", "Troca possibilidade por certeza."),
   ("apresenta a redução do cansaço como possibilidade, com base em estudo preliminar.", "Correta: 'pode' + 'estudo preliminar'."),
   ("critica a nova escala.", "Não há crítica."),
   ("informa que os agentes já estão menos cansados.", "Fala de algo possível, não ocorrido."),
   ("afirma que o estudo é definitivo.", "O estudo é 'preliminar'.")],
  "B", "O verbo 'pode' indica possibilidade, reforçada por 'preliminar'.",
  "Modalização", "Possibilidade → certeza (A) e futuro → passado (D)", "Sublinhe verbos modais: pode, deve, talvez, certamente.")

q("medio", 3, "N0030", "Texto: \"O advogado do réu pediu a anulação da audiência, a qual havia sido marcada sem intimação da defesa.\"\n\nA expressão \"a qual\" retoma:",
  [("a anulação.", "A anulação não havia sido marcada."),
   ("a defesa.", "A defesa não foi 'marcada'."),
   ("a audiência.", "Correta: foi a audiência que havia sido marcada sem intimação."),
   ("a intimação.", "A intimação é que faltou."),
   ("o advogado.", "'A qual' é feminino.")],
  "C", "Há vários femininos singulares; o sentido decide: o que foi marcado sem intimação foi a audiência.",
  "Referenciação — pronome relativo", "Escolher termo feminino próximo sem testar o sentido", "Quando a concordância não basta, substitua e veja qual faz sentido.")

q("medio", 3, "N0034", "Assinale o trecho que apresenta PROBLEMA DE COERÊNCIA:",
  [("Chovia muito; por isso, a estrada foi interditada.", "Conclusão lógica."),
   ("Embora estivesse doente, foi trabalhar.", "Concessão adequada."),
   ("O agente nunca se atrasou; por isso, recebeu advertência por atrasos.", "Correta: a conclusão contradiz a premissa."),
   ("Estudou com método e foi aprovado.", "Relação coerente."),
   ("O índice caiu, mas a sensação de insegurança aumentou.", "Contraste plausível.")],
  "C", "Há conectivo (coesão), mas a relação de conclusão é contraditória: quem nunca se atrasou não seria advertido por atrasos.",
  "Coesão × coerência", "Achar que conectivo garante coerência", "Teste a lógica entre premissa e conclusão.")

q("medio", 3, "N0043", "Charge descrita: um homem de terno discursa num palanque com a faixa \"Saúde é prioridade\"; atrás dele, um hospital com a placa \"Fechado por falta de médicos\".\n\nO efeito de sentido da charge é:",
  [("elogiar a gestão da saúde.", "A imagem contradiz o discurso."),
   ("informar o horário de funcionamento do hospital.", "Leitura literal da placa, sem relação com a fala."),
   ("criticar a contradição entre o discurso e a realidade.", "Correta: a imagem ironiza a faixa."),
   ("defender a contratação de políticos médicos.", "Sem base."),
   ("mostrar que o hospital foi reformado.", "A placa diz 'fechado'.")],
  "C", "A relação entre imagem (hospital fechado) e texto verbal (faixa) produz ironia e crítica.",
  "Linguagem multissemiótica", "Ler só uma das linguagens", "Pergunte como a imagem se relaciona com o texto: complementa, reforça ou contradiz?")

q("medio", 3, "N0046", "Cartaz de cursinho: \"Ser ou não ser aprovado: eis a questão (de português).\"\n\nO recurso utilizado é:",
  [("citação literal, mantendo o sentido original.", "O texto foi modificado."),
   ("paráfrase, pois mantém o sentido do original.", "O sentido foi transformado."),
   ("paródia, pois retoma um texto conhecido e transforma seu sentido com humor.", "Correta."),
   ("ambiguidade sintática.", "Não há duas leituras estruturais."),
   ("eufemismo.", "Não há suavização.")],
  "C", "O cartaz retoma uma frase célebre e a desloca para o contexto de concursos, com efeito humorístico.",
  "Intertextualidade — paródia × paráfrase", "Chamar de paráfrase toda retomada", "Sentido mantido = paráfrase; sentido subvertido = paródia.")

q("medio", 3, "N0015", "Texto: \"Nas grandes cidades, o tempo gasto no trânsito rouba horas de estudo dos candidatos. Quem mora longe do trabalho chega a perder duas horas por dia no transporte — tempo que poderia ser usado para revisar o conteúdo.\"\n\nO TEMA do texto é:",
  [("o trânsito nas grandes cidades.", "É o assunto amplo, não o recorte."),
   ("a perda de tempo de estudo dos candidatos por causa do deslocamento.", "Correta: recorte específico discutido."),
   ("a necessidade de morar perto do trabalho.", "Não é defendido explicitamente."),
   ("as técnicas de revisão de conteúdo.", "Mencionadas de passagem."),
   ("a qualidade do transporte público.", "Não é discutida.")],
  "B", "O assunto é trânsito/estudo; o tema é o recorte: deslocamento consumindo horas de estudo.",
  "Assunto × tema", "Confundir assunto amplo com tema", "Tema = assunto + o aspecto discutido.")

# ------------------------------------------------------------ DIFÍCIL
T3 = "Texto: \"Ainda que a reforma do presídio tenha sido concluída, os problemas de superlotação persistem. Para o sindicato dos servidores, a obra foi 'uma maquiagem cara'. A secretaria, por sua vez, afirma que novas vagas serão abertas até o fim do ano.\""
q("dificil", 4, "N0016", T3 + "\n\nConsiderando o texto, é correto afirmar que:",
  [("o autor considera a obra uma maquiagem cara.", "A avaliação é do sindicato (fonte citada)."),
   ("a superlotação foi resolvida com a reforma.", "Contradiz 'persistem'."),
   ("o texto apresenta posições diferentes atribuídas ao sindicato e à secretaria.", "Correta: há duas vozes identificadas."),
   ("a secretaria garante que a superlotação acabou.", "Ela promete vagas futuras."),
   ("a reforma não foi concluída.", "Contradiz a concessiva: 'tenha sido concluída'.")],
  "C", "O texto organiza vozes: o sindicato critica; a secretaria promete. A opinião não é do autor.",
  "Fonte citada × posição do autor", "Atribuir ao autor a opinião da fonte (A)", "Sublinhe 'para', 'segundo', 'afirma'.", True)

q("dificil", 4, "N0024", T3 + "\n\nA expressão \"Ainda que\" estabelece relação de:",
  [("causa, pois a reforma provocou a superlotação.", "Não há relação causal."),
   ("concessão, pois a conclusão da reforma não impediu a persistência da superlotação.", "Correta."),
   ("condição, pois a superlotação depende da reforma.", "Não há hipótese."),
   ("tempo, apenas situando os fatos.", "A relação é lógica, não só temporal."),
   ("conclusão, pois a superlotação decorre da reforma.", "Não se deduz uma da outra.")],
  "B", "Esperava-se que a reforma resolvesse o problema; essa expectativa não se confirmou.",
  "Concessão", "Confundir concessão com causa", "Concessão = fato que poderia impedir, mas não impede.")

q("dificil", 5, "N0052", "Texto: \"Nem todos os candidatos aprovados na primeira fase conseguiram nota suficiente na redação.\"\n\nA conclusão autorizada pelo texto é:",
  [("Nenhum candidato aprovado na primeira fase atingiu nota suficiente na redação.", "'Nem todos' ≠ 'nenhum'."),
   ("Todos os candidatos aprovados na primeira fase atingiram nota suficiente.", "Contradição."),
   ("Houve candidatos aprovados na primeira fase que não atingiram nota suficiente na redação.", "Correta: 'nem todos' = alguns não."),
   ("A maioria dos candidatos foi reprovada na redação.", "Quantidade não informada."),
   ("A redação foi a fase mais difícil do concurso.", "Extrapolação.")],
  "C", "'Nem todos' nega a totalidade: significa que pelo menos alguns não conseguiram.",
  "Negações e quantificadores", "Ler 'nem todos' como 'nenhum' (A) ou como 'a maioria' (D)", "Reescreva negações: 'nem todos' = 'alguns não'.")

q("dificil", 5, "N0012", "Diálogo: o coordenador pergunta \"O relatório ficou pronto?\" e a agente responde: \"Bom, eu ainda estou esperando os dados da perícia.\"\n\nSobre a resposta, é correto afirmar que:",
  [("pressupõe que o relatório já foi entregue.", "Contradiz a resposta."),
   ("subentende que o relatório não está pronto, sem afirmá-lo diretamente.", "Correta: a negativa é sugerida pelo contexto."),
   ("afirma explicitamente que a perícia atrasou por negligência.", "Nada diz sobre negligência."),
   ("não permite qualquer conclusão sobre o relatório.", "O contexto permite concluir pelo subentendido."),
   ("informa que a agente se recusa a fazer o relatório.", "Extrapolação.")],
  "B", "A agente não diz 'não', mas a menção à espera dos dados insinua que o relatório não está pronto (subentendido). O 'ainda' marca o pressuposto de que se espera que os dados cheguem.",
  "Pressuposto × subentendido", "Tratar subentendido como afirmação explícita (C) ou negar qualquer inferência (D)", "Subentendido: o falante sugere e poderia negar que quis dizer.")

q("dificil", 5, "N0027", "Em \"À medida que o efetivo aumentava, as ocorrências diminuíam\", a substituição de \"À medida que\" que PRESERVA o sentido é:",
  [("Na medida em que", "Na norma-padrão, indica causa."),
   ("Conforme", "Correta: 'conforme' pode indicar proporção (variação simultânea)."),
   ("Embora", "Cria concessão."),
   ("Porque", "Cria causa."),
   ("Para que", "Cria finalidade.")],
  "B", "A relação é de proporção; 'conforme', nesse contexto, também a expressa ('conforme o efetivo aumentava…').",
  "Proporção e substituição de conectivos", "Confundir 'à medida que' com 'na medida em que'", "Diga a relação antes de testar a troca.")

q("dificil", 4, "N0042", "Infográfico descrito: \"Furtos de celular no centro — 2022: 1.200; 2023: 1.150; 2024: 900; 2025: 610. Nota: em 2024 foram instaladas 80 câmeras.\"\n\nA leitura correta do infográfico é:",
  [("As câmeras eliminaram os furtos de celular.", "Houve redução, não eliminação."),
   ("As câmeras foram a única causa da queda dos furtos.", "Inferência excessiva: a queda começou em 2023."),
   ("Os furtos caíram de forma contínua entre 2022 e 2025, e em 2024 foram instaladas câmeras.", "Correta: descreve os dados sem afirmar causa."),
   ("Os furtos aumentaram em 2023.", "Contradição: caíram de 1.200 para 1.150."),
   ("Em 2025 houve mais furtos do que em 2024.", "Contradição: 610 < 900.")],
  "C", "O infográfico mostra queda contínua e informa a instalação das câmeras, mas não afirma que elas causaram a queda.",
  "Gráficos e infográficos; correlação × causa", "Inferência excessiva e generalização", "Sucessão no tempo não prova causa.")

q("dificil", 5, "N0021", "Texto: \"Que eficiência! O pedido de documento, feito em janeiro, foi atendido em dezembro — com o nome errado.\"\n\nO texto produz efeito de:",
  [("elogio sincero à rapidez do serviço.", "O contexto contradiz o elogio."),
   ("ironia, criticando a demora e o erro do serviço.", "Correta."),
   ("neutralidade informativa.", "Há forte avaliação."),
   ("eufemismo, suavizando um elogio.", "Não se suaviza nada."),
   ("ambiguidade lexical da palavra 'documento'.", "Não há duplo sentido relevante.")],
  "B", "'Que eficiência!' contrasta com onze meses de espera e erro no nome: o autor diz o contrário do que pensa.",
  "Ironia", "Leitura isolada da primeira frase", "Releia a frase à luz do restante do texto.")

q("dificil", 5, "N0049", "Texto: \"O programa de leitura reduziu as faltas escolares em algumas turmas, principalmente nas do período noturno.\"\n\nAssinale a alternativa que NÃO apresenta erro de interpretação:",
  [("O programa reduziu as faltas em todas as turmas.", "Generalização de 'algumas'."),
   ("O programa só teve efeito no período noturno.", "'Principalmente' ≠ 'apenas'."),
   ("A redução das faltas foi mais expressiva nas turmas do noturno.", "Correta: paráfrase fiel de 'principalmente'."),
   ("O programa aumentou o desempenho em leitura dos alunos.", "Extrapolação: o texto fala de faltas."),
   ("As turmas do noturno tinham mais faltas que as do diurno antes do programa.", "Não informado.")],
  "C", "A alternativa C respeita os dois restritivos: 'algumas' e 'principalmente'.",
  "Palavras restritivas e pegadinhas", "Generalização, troca de 'principalmente' por 'apenas' e extrapolação", "Circule quantificadores e restritivos antes de ler as alternativas.")

print(len(Q))
from collections import Counter
print(Counter(x["level"] for x in Q), Counter(next(o["label"] for o in x["options"] if o["correct"]) for x in Q))
json.dump(Q, open("questoes.json", "w", encoding="utf8"), ensure_ascii=False)
