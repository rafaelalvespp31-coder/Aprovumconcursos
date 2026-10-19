import json

Q = []
def ce(level, node, diff, statement, true, just, essential=False):
    Q.append(dict(level=level, type="certo_errado", statement=statement, options=[], correctAnswerTrue=true, justification=just, nodeKey=node, difficulty=diff, essential=essential, dependsOnExternalSource=False))

def me(level, node, diff, statement, opts, just, essential=False, kind="multipla_escolha"):
    options = [dict(label="ABCDE"[i], text=t, correct=c, explanation=e) for i, (t, c, e) in enumerate(opts)]
    assert sum(o["correct"] for o in options) == 1, statement
    Q.append(dict(level=level, type=kind, statement=statement, options=options, justification=just, nodeKey=node, difficulty=diff, essential=essential, dependsOnExternalSource=False))

F, M, D = "facil", "medio", "dificil"

# ============================ FÁCIL (10) ============================
ce(F, "N0001", 1, "O furto consiste em subtrair, para si ou para outrem, coisa alheia móvel, sem violência ou grave ameaça à pessoa.", True,
   "Literalidade do caput do art. 155; com violência ou grave ameaça, o crime seria roubo (art. 157).", True)
ce(F, "N0001", 1, "O Código Penal prevê a modalidade culposa do furto para quem leva coisa alheia por descuido.", False,
   "Não existe furto culposo. Quem leva coisa alheia pensando ser sua age em erro de tipo (art. 20 do CP), sem dolo.", True)
me(F, "N0002", 1, "Para fatos posteriores à Lei 15.397/2026, a pena do furto simples (art. 155, caput) é:",
   [("reclusão, de 1 a 6 anos, e multa", True, "Correta: redação dada pela Lei 15.397/2026."),
    ("reclusão, de 1 a 4 anos, e multa", False, "Era a pena anterior; vale para fatos antigos."),
    ("detenção, de 6 meses a 2 anos", False, "Não é a pena do furto."),
    ("reclusão, de 2 a 8 anos, e multa", False, "É a pena do § 4º (qualificado).")],
   "A Lei 15.397/2026 elevou o máximo do furto simples de 4 para 6 anos.", True)
ce(F, "N0005", 1, "A energia elétrica equipara-se à coisa móvel para fins de furto.", True,
   "Art. 155, § 3º: equipara-se à coisa móvel a energia elétrica ou qualquer outra que tenha valor econômico.", True)
me(F, "N0004", 1, "São requisitos do furto privilegiado (art. 155, § 2º):",
   [("agente primário e coisa de pequeno valor", True, "Correta: requisitos cumulativos."),
    ("agente primário ou coisa de pequeno valor", False, "Os requisitos são cumulativos, não alternativos."),
    ("bons antecedentes e restituição da coisa", False, "Não são os requisitos legais."),
    ("coisa de valor insignificante e confissão", False, "Insignificância é outro instituto.")],
   "Primariedade + pequeno valor da coisa furtada.", True)
ce(F, "N0010", 1, "O furto praticado mediante concurso de duas ou mais pessoas é qualificado.", True,
   "Art. 155, § 4º, IV.", True)
me(F, "N0007", 1, "Quebrar o vidro de um carro para levar a mochila deixada no banco caracteriza, em tese, furto qualificado:",
   [("pela destruição ou rompimento de obstáculo", True, "Correta: § 4º, I."),
    ("pela destreza", False, "Destreza é habilidade especial para a vítima não perceber."),
    ("pelo emprego de chave falsa", False, "Não houve uso de instrumento para abrir fechadura."),
    ("pelo repouso noturno", False, "Repouso noturno é causa de aumento, não qualificadora.")],
   "O vidro é obstáculo externo que protegia a coisa (§ 4º, I).")
ce(F, "N0001", 1, "Consuma-se o crime de furto com a posse de fato da coisa, ainda que por breve espaço de tempo e seguida de perseguição ao agente.", True,
   "Tema Repetitivo 934/STJ (REsp 1.524.450/RJ).", True)
ce(F, "N0001", 1, "Segundo a Súmula 567 do STJ, a existência de sistema de vigilância eletrônica no estabelecimento torna impossível o crime de furto.", False,
   "A Súmula 567/STJ diz o contrário: a vigilância, por si só, não torna impossível a configuração do furto.")
me(F, "N0005", 1, "Pedro faz uma ligação clandestina no poste e passa a consumir energia sem que ela passe pelo medidor. Em tese, ele pratica:",
   [("furto de energia (art. 155, § 3º)", True, "Correta: desvio da energia fora da medição."),
    ("estelionato (art. 171)", False, "Não houve indução da distribuidora em erro para entregar a vantagem."),
    ("apropriação indébita (art. 168)", False, "Pedro não tinha a posse da energia antes."),
    ("dano (art. 163)", False, "Não quer destruir; quer consumir a energia.")],
   "Ligação clandestina antes do medidor → furto de energia, em tese.")

# ============================ MÉDIO (15) ============================
me(M, "N0003", 2, "Após a Lei 15.397/2026, o furto praticado durante o repouso noturno tem a pena:",
   [("aumentada de metade", True, "Correta: nova redação do § 1º."),
    ("aumentada de um terço", False, "Era a fração anterior; vale para fatos antigos."),
    ("aumentada de um sexto a dois terços", False, "Não é a fração do § 1º."),
    ("dobrada", False, "Não há previsão de dobra no § 1º.")],
   "A Lei 15.397/2026 alterou o § 1º: 'A pena aumenta-se de metade, se o crime é praticado durante o repouso noturno.'", True)
ce(M, "N0003", 2, "Segundo o STJ (Tema 1.144), para a incidência do aumento do repouso noturno é irrelevante se a vítima estava dormindo e se o furto ocorreu em estabelecimento comercial, via pública ou veículo.", True,
   "Tese do Tema 1.144/STJ: basta que o furto ocorra à noite e em situação de repouso.", True)
ce(M, "N0006", 2, "Segundo o STJ (Tema 1.087), a causa de aumento do repouso noturno incide no furto qualificado do § 4º.", False,
   "O Tema 1.087/STJ firmou que a majorante do § 1º NÃO incide no furto qualificado (§ 4º).", True)
me(M, "N0004", 2, "Sobre a Súmula 511 do STJ, é correto afirmar que:",
   [("admite o privilégio no furto qualificado, se presentes primariedade, pequeno valor e qualificadora de ordem objetiva", True, "Correta: síntese fiel do enunciado."),
    ("veda o privilégio em qualquer furto qualificado", False, "A súmula admite, com requisitos."),
    ("admite o privilégio no furto qualificado qualquer que seja a qualificadora", False, "Exige qualificadora objetiva."),
    ("trata do princípio da insignificância no furto", False, "Trata do privilégio do § 2º.")],
   "Súmula 511/STJ: furto híbrido (qualificado-privilegiado) com qualificadora objetiva.", True)
me(M, "N0008", 2, "Um falso técnico de internet distrai a moradora enquanto o comparsa leva o notebook da sala, sem que ela perceba. Em tese, há:",
   [("furto mediante fraude, pois a fraude serviu para diminuir a vigilância da vítima", True, "Correta: a vítima não entregou o bem."),
    ("estelionato, porque houve fraude", False, "No estelionato, a vítima entrega o bem enganada."),
    ("roubo, porque houve concurso de agentes", False, "Não houve violência ou grave ameaça."),
    ("apropriação indébita", False, "Os agentes não tinham a posse anterior.")],
   "A fraude do § 4º, II afasta a vigilância; no estelionato, a vítima é induzida a entregar.")
ce(M, "N0008", 2, "No furto mediante fraude, a vítima, enganada, entrega voluntariamente a coisa ao agente.", False,
   "Isso descreve o estelionato. No furto mediante fraude, o engano serve para afastar a vigilância e o agente subtrai.")
me(M, "N0017", 2, "Para a corrente majoritária, a qualificadora do § 5º (veículo automotor) exige:",
   [("que o veículo efetivamente seja transportado para outro Estado ou para o exterior", True, "Correta: 'venha a ser transportado'."),
    ("apenas a intenção de levar o veículo para outro Estado", False, "A intenção, sozinha, não basta."),
    ("que o furto ocorra em rodovia federal", False, "Não há essa exigência."),
    ("emprego de chave falsa", False, "Chave falsa é qualificadora do § 4º, III.")],
   "A redação exige o transporte efetivo para outro Estado ou para o exterior.")
ce(M, "N0020", 2, "Para fatos posteriores à Lei 15.397/2026, a subtração de aparelho de telefonia celular configura forma qualificada do furto, com reclusão de 4 a 10 anos e multa.", True,
   "Art. 155, § 6º, II, incluído pela Lei 15.397/2026.")
me(M, "N0012", 2, "Assinale a alternativa que distingue corretamente o § 4º-A do § 7º, I, do art. 155:",
   [("o § 4º-A trata do emprego de explosivo; o § 7º, I, do furto de explosivos ou acessórios", True, "Correta."),
    ("ambos tratam do furto de explosivos, com penas diferentes", False, "O § 4º-A é sobre o meio (emprego)."),
    ("o § 4º-A trata de arma de fogo; o § 7º, I, de explosivo", False, "Arma de fogo está no § 7º, II."),
    ("o § 7º, I, trata do emprego de explosivo contra caixa eletrônico", False, "Isso é o § 4º-A.")],
   "Meio de execução (§ 4º-A) × objeto do crime (§ 7º, I).")
ce(M, "N0001", 2, "A devolução voluntária da coisa furtada, antes do recebimento da denúncia, extingue a punibilidade do furto.", False,
   "Gera arrependimento posterior (art. 16 do CP): redução de 1/3 a 2/3. O crime permanece.")
me(M, "N0001", 2, "Lúcia pega a moto do vizinho para ir à farmácia e a devolve, intacta e no mesmo lugar, 20 minutos depois, como pretendia desde o início. Para a doutrina majoritária, trata-se de:",
   [("furto de uso, fato atípico por falta do fim de assenhoramento definitivo", True, "Correta."),
    ("furto simples consumado com arrependimento posterior", False, "Faltou o fim de assenhoramento desde o início."),
    ("apropriação indébita", False, "Lúcia não tinha a posse anterior."),
    ("furto qualificado por abuso de confiança", False, "Não há confiança especial nem fim de assenhoramento.")],
   "Furto de uso: uso breve + devolução rápida e integral + intenção de devolver desde o início.")
ce(M, "N0004", 2, "Pequeno valor (furto privilegiado) e valor insignificante (princípio da insignificância) produzem o mesmo efeito: a absolvição do réu.", False,
   "O privilégio reduz a pena (há crime); a insignificância afasta a tipicidade material (não há crime).")
me(M, "N0010", 2, "No furto qualificado pelo concurso de pessoas, segundo a Súmula 442 do STJ:",
   [("é inadmissível aplicar a majorante do roubo cometido em concurso", True, "Correta: literalidade da súmula."),
    ("aplica-se a majorante do roubo, por analogia", False, "A súmula veda."),
    ("o concurso deixa de qualificar o furto", False, "Continua qualificando (§ 4º, IV)."),
    ("aplica-se o aumento do repouso noturno", False, "Tema 1.087: não incide no qualificado.")],
   "Súmula 442/STJ.")
ce(M, "N0001", 2, "Para o STJ (5ª Turma, Informativo 886, 2026), é tentado o furto quando o agente é detido ainda dentro do estabelecimento, com os bens guardados na mochila.", True,
   "AgRg no AgRg no AREsp 3.063.890/MS: houve apprehensio, mas não amotio.")
me(M, "N0013", 2, "O golpista invade a conta bancária da vítima pela internet e transfere o saldo para si, sem que ela perceba. Em tese, configura-se:",
   [("furto mediante fraude eletrônica (art. 155, § 4º-B)", True, "Correta: subtração por meio eletrônico."),
    ("fraude eletrônica (art. 171, § 2º-A)", False, "A vítima não entregou a vantagem induzida em erro."),
    ("invasão de dispositivo informático, apenas", False, "Houve subtração de valores."),
    ("apropriação indébita", False, "Não havia posse anterior.")],
   "Subtração eletrônica sem participação da vítima → § 4º-B (4 a 10 anos após a Lei 15.397/2026).")

# ============================ DIFÍCIL (15) ============================
me(D, "N0002", 3, "Um furto simples foi praticado em fevereiro de 2026 e será julgado em novembro de 2026. A pena aplicável é:",
   [("reclusão de 1 a 4 anos e multa, pois a lei mais grave não retroage", True, "Correta: art. 5º, XL, da CF."),
    ("reclusão de 1 a 6 anos e multa, pois vale a lei da data da sentença", False, "Lei penal mais grave não alcança fatos anteriores."),
    ("a média entre as duas penas", False, "Não existe combinação desse tipo."),
    ("reclusão de 2 a 8 anos", False, "É a pena do § 4º.")],
   "Lei 15.397/2026 (DOU de 4/5/2026) é mais grave: só alcança fatos posteriores.", True)
ce(D, "N0003", 3, "Para um furto simples praticado em janeiro de 2026, durante o repouso noturno, o aumento aplicável é de metade, por força da Lei 15.397/2026.", False,
   "A lei mais grave não retroage: para fatos anteriores a 4/5/2026, o aumento é de um terço.")
me(D, "N0003", 3, "Às 23h, numa rua de bares lotada, Rui subtrai uma carteira (sem qualificadora). Sobre o § 1º, é correto afirmar que:",
   [("não incide automaticamente, pois o horário não basta; é preciso situação de repouso, avaliada no caso", True, "Correta: Tema 1.144."),
    ("incide sempre, porque o fato ocorreu após as 22h", False, "Não há horário legal fixo."),
    ("não incide porque o fato ocorreu em via pública", False, "Via pública não impede (Tema 1.144)."),
    ("incide porque a vítima estava acordada", False, "Estar acordada é irrelevante; o que importa é o repouso.")],
   "Tema 1.144/STJ: noite + situação de repouso, avaliada no caso concreto.")
me(D, "N0004", 3, "Assinale a qualificadora que, segundo a classificação doutrinária mais citada, IMPEDE o privilégio no furto pela Súmula 511/STJ:",
   [("abuso de confiança", True, "Correta: costuma ser apontada como subjetiva."),
    ("rompimento de obstáculo", False, "É objetiva."),
    ("escalada", False, "É objetiva."),
    ("concurso de duas ou mais pessoas", False, "É objetiva.")],
   "A Súmula 511 exige qualificadora objetiva; o abuso de confiança liga-se à relação pessoal (subjetiva). Atenção: fraude e destreza têm classificação discutida.")
me(D, "N0005", 3, "Hugo altera o medidor de energia para registrar metade do consumo; o serviço é prestado e as faturas chegam com valor menor. No AREsp 1.418.119/DF, a 5ª Turma do STJ enquadrou situação semelhante como:",
   [("estelionato, pois a concessionária foi induzida em erro sobre o consumo", True, "Correta."),
    ("furto de energia, pois a energia é coisa móvel", False, "O caso não era de 'gato'."),
    ("furto mediante fraude, em entendimento vinculante", False, "O precedente de 2016 (RHC 62.437/SC) era nesse sentido, mas não é vinculante e foi superado no julgado."),
    ("fato atípico, por se tratar de ilícito civil", False, "Houve crime.")],
   "AREsp 1.418.119/DF (2019): alteração do medidor com faturamento → estelionato. Não generalize para toda fraude em medidor.")
ce(D, "N0005", 3, "A Terceira Seção do STJ (RHC 101.299/RS) entendeu que o pagamento do débito antes da denúncia extingue a punibilidade no furto de energia, por analogia aos crimes tributários.", False,
   "O STJ entendeu que o pagamento não extingue a punibilidade no furto de energia (não se aplica a regra dos crimes tributários). Conferir eventual atualização.")
me(D, "N0013", 3, "Para fatos posteriores à Lei 15.397/2026, assinale a comparação correta entre as penas:",
   [("furto mediante fraude eletrônica (§ 4º-B): 4 a 10 anos; fraude eletrônica (art. 171, § 2º-A): 4 a 8 anos", True, "Correta."),
    ("ambos: 4 a 8 anos", False, "Era a situação anterior para o § 4º-B."),
    ("§ 4º-B: 2 a 8 anos; art. 171, § 2º-A: 1 a 5 anos", False, "2 a 8 é o § 4º; 1 a 5 é o caput do art. 171."),
    ("§ 4º-B: 4 a 8 anos; art. 171, § 2º-A: 4 a 10 anos", False, "Invertido.")],
   "A Lei 15.397/2026 deu ao § 4º-B pena de 4 a 10 e ao art. 171, § 2º-A, pena de 4 a 8.")
ce(D, "N0016", 3, "O aumento de 1/3 ao dobro do § 4º-C, II (crime contra idoso ou vulnerável) aplica-se ao furto mediante fraude eletrônica do § 4º-B, considerada a relevância do resultado gravoso.", True,
   "Art. 155, § 4º-C, II.")
me(D, "N0025", 3, "Sobre o § 9º do art. 155, incluído pela Lei 15.358/2026, é correto afirmar:",
   [("exige que o furto seja cometido por integrante de organização criminosa ultraviolenta, grupo paramilitar ou milícia, no contexto das condutas do art. 2º daquela lei", True, "Correta."),
    ("qualifica qualquer furto ocorrido em área dominada por facção", False, "O local, sozinho, não basta."),
    ("cria crime autônomo fora do art. 155", False, "É parágrafo do próprio art. 155."),
    ("prevê aumento de metade da pena do caput", False, "Prevê pena própria de 4 a 10 anos.")],
   "Art. 155, § 9º (art. 33 da Lei 15.358/2026): reclusão de 4 a 10 anos e multa.")
me(D, "N0026", 3, "Em outubro de 2026, um grupo perfura um duto e retira combustível, causando incêndio. Considerando a Lei 15.517/2026:",
   [("aplica-se o § 10 (4 a 10 anos), com aumento de 2/3 pelo incêndio (§ 12) e de 1/3 pelo concurso (§ 11), conforme a dosimetria", True, "Correta."),
    ("aplica-se apenas o § 4º, IV (concurso), com pena de 2 a 8 anos", False, "Há forma específica mais grave."),
    ("trata-se de crime da Lei 8.176/1991, não de furto", False, "A Lei 15.517/2026 incluiu os §§ 10 a 12 no art. 155; a Lei 8.176/1991 trata de outras condutas."),
    ("aplica-se o § 8º", False, "O § 8º trata de fios, cabos e equipamentos.")],
   "Lei 15.517/2026 (DOU de 23/9/2026): §§ 10, 11 e 12 do art. 155.")
ce(D, "N0024", 3, "No furto de fios e cabos de telefonia (§ 8º), a própria lei manda aplicar, em qualquer caso, o privilégio do § 2º, se presentes seus requisitos.", True,
   "Art. 155, § 8º: '... aplicável, em qualquer caso, o disposto no § 2º deste artigo.'")
me(D, "N0002", 3, "Após a Lei 15.397/2026, num flagrante por furto simples (fato novo), a autoridade policial:",
   [("não pode arbitrar fiança, porque a pena máxima passou a 6 anos (art. 322 do CPP)", True, "Correta: o delegado só concede fiança se a pena máxima não superar 4 anos."),
    ("pode arbitrar fiança, porque o furto não tem violência", False, "O critério do art. 322 é a pena máxima."),
    ("deve lavrar termo circunstanciado", False, "Furto não é infração de menor potencial ofensivo."),
    ("deve conceder liberdade sem fiança em qualquer caso", False, "Não há essa regra.")],
   "Art. 322 do CPP: fiança pela autoridade policial só para pena máxima não superior a 4 anos.")
me(D, "N0001", 3, "Joana subtrai uma bicicleta, arrepende-se e a devolve à vítima após o recebimento da denúncia. Nesse caso:",
   [("não cabe o arrependimento posterior, mas pode incidir a atenuante do art. 65, III, 'b'", True, "Correta: o art. 16 exige reparação até o recebimento da denúncia."),
    ("cabe o arrependimento posterior, com redução de 1/3 a 2/3", False, "Passou o prazo do art. 16."),
    ("o crime deixa de existir", False, "O crime consumado permanece."),
    ("há desistência voluntária", False, "A execução já tinha se completado.")],
   "Arts. 16 e 65, III, 'b', do CP.")
ce(D, "N0001", 3, "Segundo o Plenário do STF (2015), a reincidência impede, de forma absoluta, o reconhecimento do princípio da insignificância no furto.", False,
   "O STF determinou análise caso a caso (HC 123.108/MG e outros). Não há automatismo.")
me(D, "N0011", 3, "A respeito do art. 155, § 4º, V (Lei 15.181/2025, com redação da Lei 15.397/2026), é correto afirmar:",
   [("qualifica o furto contra bens que comprometam o funcionamento de órgãos públicos ou de estabelecimentos que prestem serviços essenciais", True, "Correta."),
    ("qualifica qualquer furto de bem público, ainda que sem efeito sobre o funcionamento", False, "Exige comprometimento do funcionamento."),
    ("tem pena de 4 a 10 anos", False, "Está no § 4º: 2 a 8 anos."),
    ("aplica-se apenas a bens da União", False, "Abrange União, Estados, DF, Municípios e estabelecimentos de serviços essenciais.")],
   "Art. 155, § 4º, V: reclusão de 2 a 8 anos e multa.")

lv = {F: 0, M: 0, D: 0}
for q in Q: lv[q["level"]] += 1
assert lv == {F: 10, M: 15, D: 15}, lv
json.dump(Q, open("questoes.json", "w", encoding="utf8"), ensure_ascii=False)
print(len(Q), lv)
