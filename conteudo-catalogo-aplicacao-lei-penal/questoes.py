import json, re
from collections import Counter
Q = []
L = "ABCDE"
# Gabarito balanceado (7 A, 7 B, 6 C, 6 D, 6 E), em ordem embaralhada.
TARGETS = list("CAEBDBDACEABEDCBAEDCABDEBCAEDBAC")
assert len(TARGETS) == 32

def q(level, diff, node, statement, opts, correct, why, fundamento, pegadinha, dica, essential=False):
    assert len(opts) == 5 and correct in L, statement
    target = TARGETS[len(Q)]
    shift = (L.index(target) - L.index(correct)) % 5
    order = [None] * 5
    for i in range(5):
        order[(i + shift) % 5] = i
    remap = {L[old]: L[new] for new, old in enumerate(order)}
    fix = lambda t: re.sub(r"\(([A-E](?:, [A-E])*)\)", lambda mm: "(" + ", ".join(sorted(remap[x] for x in mm.group(1).split(", "))) + ")",
                           re.sub(r"\b(alternativa) ([A-E])\b", lambda mm: f"{mm.group(1)} {remap[mm.group(2)]}", t))
    opts = [opts[o] for o in order]
    correct = remap[correct]
    why, pegadinha, dica = fix(why), fix(pegadinha), fix(dica)
    options = [{"label": L[i], "text": t, "correct": L[i] == correct, "explanation": e} for i, (t, e) in enumerate(opts)]
    just = f"Gabarito: {correct}. {why}\n\nFundamentação legal: {fundamento}\nPegadinha usada: {pegadinha}\nDica de resolução: {dica}"
    Q.append({"level": level, "type": "multipla_escolha",
              "statement": "Questão autoral (APROVUM), inspirada no estilo das bancas de concursos policiais — não é questão oficial.\n\n" + statement,
              "options": options, "correctAnswerTrue": False, "justification": just, "nodeKey": node,
              "difficulty": diff, "essential": essential, "dependsOnExternalSource": False})

F, M, D = "facil", "medio", "dificil"

# ============================================================ FÁCIL (10)
q(F, 1, "N0001", "Sobre o princípio da legalidade (art. 1º do CP e art. 5º, XXXIX, da CF), é correto afirmar:",
  [("o costume pode criar crimes, desde que reiterado e aceito pela sociedade.", "Errada: costume não cria crime (lex scripta); serve, no máximo, para interpretar."),
   ("medida provisória pode definir crime em caso de relevância e urgência.", "Errada: a CF veda MP sobre direito penal (art. 62, § 1º, I, b)."),
   ("não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal.", "Correta: literalidade do art. 1º do CP e da CF, art. 5º, XXXIX."),
   ("os Estados podem legislar sobre crimes de interesse local.", "Errada: a competência é privativa da União (CF, art. 22, I)."),
   ("a lei que comina a pena pode ser posterior ao fato, se a conduta já era proibida.", "Errada: a pena também exige prévia cominação legal.")],
  "C", "A alternativa C reproduz as duas exigências do art. 1º: lei anterior que defina o crime e prévia cominação da pena.",
  "CP, art. 1º; CF, art. 5º, XXXIX; art. 22, I; art. 62, § 1º, I, b.",
  "Trocar 'lei' por costume, MP ou lei estadual (A, B, D) e esquecer a anterioridade da pena (E).",
  "Legalidade = lei federal + anterior + para o crime e para a pena.", True)

q(F, 1, "N0001", "No Direito Penal, a analogia:",
  [("é sempre proibida, em qualquer hipótese.", "Errada: a analogia in bonam partem é admitida."),
   ("é admitida apenas in bonam partem, ou seja, para favorecer o réu.", "Correta: a vedação atinge só a analogia contra o réu."),
   ("é admitida para suprir lacunas na definição de crimes graves.", "Errada: seria analogia in malam partem, vedada."),
   ("confunde-se com a interpretação extensiva.", "Errada: analogia integra lacuna; interpretação extensiva interpreta norma existente."),
   ("pode ser usada para aumentar pena, desde que o juiz fundamente.", "Errada: analogia contra o réu viola a reserva legal.")],
  "B", "A analogia in malam partem viola a legalidade (lex stricta); a analogia in bonam partem é aceita pela doutrina majoritária.",
  "CP, art. 1º; CF, art. 5º, XXXIX (lex stricta).",
  "Generalização 'sempre proibida' (A) e confusão com interpretação extensiva (D).",
  "Pergunte: a analogia ajuda ou prejudica o réu?", True)

q(F, 1, "N0003", "Lei posterior reduz a pena de um crime. Em relação aos fatos anteriores, essa lei:",
  [("só se aplica aos processos ainda não sentenciados.", "Errada: aplica-se mesmo após o trânsito em julgado."),
   ("não se aplica, porque vale a lei do tempo do fato.", "Errada: a regra cede diante da lei mais benéfica."),
   ("só se aplica se o réu for primário.", "Errada: a lei não faz essa exigência."),
   ("aplica-se, ainda que os fatos tenham sido decididos por sentença condenatória transitada em julgado.", "Correta: art. 2º, parágrafo único."),
   ("aplica-se apenas por meio de revisão criminal.", "Errada: após o trânsito, aplica-a o juízo da execução (Súmula 611/STF).")],
  "D", "A lei que de qualquer modo favorecer o agente retroage, inclusive sobre a coisa julgada.",
  "CP, art. 2º, parágrafo único; CF, art. 5º, XL; Súmula 611/STF.",
  "Limitar a retroatividade ao processo em curso (A) ou exigir revisão criminal (E).",
  "Lei benéfica: 'de qualquer modo' e 'ainda que transitada em julgado'.", True)

q(F, 1, "N0002", "São efeitos da abolitio criminis:",
  [("a cessação da execução e dos efeitos penais da sentença condenatória.", "Correta: art. 2º, caput."),
   ("a cessação da obrigação de reparar o dano causado pelo crime.", "Errada: os efeitos civis permanecem."),
   ("a manutenção da reincidência, por já haver condenação definitiva.", "Errada: a reincidência é efeito penal e desaparece."),
   ("apenas a redução da pena pela metade.", "Errada: há extinção da punibilidade, não redução."),
   ("a anulação da sentença, com devolução de todos os valores pagos a título de indenização.", "Errada: a indenização é efeito civil.")],
  "A", "A abolitio extingue a punibilidade (art. 107, III) e faz cessar a execução e os efeitos penais; os efeitos civis ficam.",
  "CP, art. 2º, caput; art. 107, III; art. 91, I.",
  "Estender a abolitio aos efeitos civis (B, E).",
  "Abolitio = apaga o penal, mantém o civil.", True)

q(F, 1, "N0004", "Lei temporária vigorou de 01/01 a 31/12. Fato praticado em julho e julgado em março do ano seguinte. Nesse caso:",
  [("ocorreu abolitio criminis com o fim da vigência.", "Errada: o fim da vigência não é abolitio (art. 3º)."),
   ("aplica-se a lei temporária, que é ultra-ativa em relação aos fatos praticados durante sua vigência.", "Correta: art. 3º."),
   ("o fato tornou-se atípico, porque a lei não existia no julgamento.", "Errada: a lei continua alcançando os fatos de sua vigência."),
   ("aplica-se a lei vigente no julgamento, qualquer que seja.", "Errada: vale a lei temporária."),
   ("o juiz deve extinguir a punibilidade pela prescrição.", "Errada: não há relação com a prescrição.")],
  "B", "O art. 3º manda aplicar a lei temporária ao fato praticado durante sua vigência, embora decorrido o período de sua duração.",
  "CP, art. 3º.",
  "Tratar o fim da vigência como abolitio (A, C).",
  "Lei temporária ou excepcional = ultra-ativa.", True)

q(F, 1, "N0005", "Quanto ao tempo do crime, o Código Penal adotou a teoria:",
  [("do resultado.", "Errada: o resultado não define o tempo do crime."),
   ("da ubiquidade.", "Errada: é a teoria do lugar do crime (art. 6º)."),
   ("da atividade.", "Correta: momento da ação ou omissão (art. 4º)."),
   ("da consumação.", "Errada: não é a teoria adotada no art. 4º."),
   ("mista, combinando atividade e resultado.", "Errada: a mista (ubiquidade) é a do lugar.")],
  "C", "Art. 4º: considera-se praticado o crime no momento da ação ou omissão, ainda que outro seja o momento do resultado.",
  "CP, art. 4º.",
  "Confundir com a teoria do lugar (B, E).",
  "LUTA: Lugar-Ubiquidade, Tempo-Atividade.", True)

q(F, 1, "N0009", "Quanto ao lugar do crime, o art. 6º do Código Penal adota a teoria:",
  [("da atividade, considerando apenas o local da conduta.", "Errada: o art. 6º inclui o lugar do resultado."),
   ("do resultado, considerando apenas o local da consumação.", "Errada: essa é a regra de competência do CPP, não do art. 6º."),
   ("da nacionalidade do agente.", "Errada: não é teoria do lugar do crime."),
   ("do domicílio da vítima.", "Errada: sem previsão no art. 6º."),
   ("da ubiquidade, considerando o local da ação ou omissão e o do resultado.", "Correta: art. 6º.")],
  "E", "O crime considera-se praticado onde ocorreu a ação ou omissão, no todo ou em parte, e onde se produziu ou deveria produzir-se o resultado.",
  "CP, art. 6º.",
  "Confundir com a regra de competência do CPP, art. 70 (B).",
  "Lugar → Ubiquidade: conduta OU resultado no Brasil basta.", True)

q(F, 1, "N0007", "Consideram-se extensão do território nacional, onde quer que se encontrem:",
  [("as embarcações brasileiras mercantes.", "Errada: as mercantes, só em alto-mar."),
   ("as aeronaves brasileiras privadas.", "Errada: só no espaço aéreo correspondente ao alto-mar."),
   ("as embaixadas brasileiras no exterior.", "Errada: embaixada não é extensão do território."),
   ("as embarcações e aeronaves brasileiras de natureza pública ou a serviço do governo brasileiro.", "Correta: art. 5º, § 1º, 1ª parte."),
   ("as embarcações estrangeiras em porto brasileiro.", "Errada: é hipótese do § 2º, não extensão do território.")],
  "D", "A expressão 'onde quer que se encontrem' só alcança as embarcações e aeronaves públicas ou a serviço do governo brasileiro.",
  "CP, art. 5º, § 1º.",
  "Estender o 'onde quer que se encontrem' às privadas (A, B).",
  "Pública/a serviço do governo: qualquer lugar. Privada: alto-mar.", True)

q(F, 1, "N0020", "Nos crimes do art. 7º, I, do CP (extraterritorialidade incondicionada), o agente é punido segundo a lei brasileira:",
  [("ainda que absolvido ou condenado no estrangeiro.", "Correta: art. 7º, § 1º."),
   ("somente se entrar no território nacional.", "Errada: entrada é condição do § 2º (inciso II)."),
   ("somente se houver requisição do Ministro da Justiça.", "Errada: requisição é exigência do § 3º."),
   ("somente se o fato também for crime no país em que foi praticado.", "Errada: dupla tipicidade é condição do § 2º."),
   ("somente se não tiver cumprido pena no estrangeiro.", "Errada: no inciso I, a pena cumprida é descontada ou atenua (art. 8º).")],
  "A", "Incondicionada significa que nenhuma das condições do § 2º é exigida; o § 1º afasta até a absolvição ou condenação estrangeira.",
  "CP, art. 7º, I, e § 1º; art. 8º.",
  "Levar as condições do § 2º e do § 3º para o inciso I (B, C, D, E).",
  "Inciso I = sem condições.", True)

q(F, 1, "N0037", "No cômputo dos prazos de natureza penal (art. 10 do CP):",
  [("exclui-se o dia do começo e inclui-se o do vencimento.", "Errada: essa é a regra processual (CPP, art. 798, § 1º)."),
   ("excluem-se os sábados, domingos e feriados.", "Errada: o prazo penal é contínuo."),
   ("prorroga-se para o dia útil seguinte o prazo que vence em feriado.", "Errada: o prazo penal não se prorroga."),
   ("contam-se os meses sempre como 30 dias.", "Errada: conta-se pelo calendário comum."),
   ("inclui-se o dia do começo, contando-se os dias, meses e anos pelo calendário comum.", "Correta: art. 10.")],
  "E", "O dia do começo inclui-se no cômputo; dias, meses e anos contam-se pelo calendário comum.",
  "CP, art. 10; comparar com CPP, art. 798, §§ 1º e 3º.",
  "Trocar a regra penal pela processual (A, C).",
  "Prazo penal: o primeiro dia já conta.", True)

# ============================================================ MÉDIO (10)
q(M, 2, "N0001", "A respeito da lei penal em branco, assinale a alternativa correta.",
  [("A lei penal em branco heterogênea tem seu complemento em norma de fonte diversa, como portaria de órgão do Executivo.", "Correta: ex.: lista de drogas da Anvisa."),
   ("A lei penal em branco homogênea tem complemento em portaria.", "Errada: na homogênea, o complemento está em lei."),
   ("A lei penal em branco é inconstitucional por violar a reserva legal.", "Errada: prevalece a constitucionalidade; o núcleo da proibição está na lei."),
   ("Na lei penal em branco inversa, o complemento da pena pode vir de decreto.", "Errada: o complemento da pena deve vir de lei."),
   ("Toda alteração do complemento retroage, inclusive quando o complemento é temporário.", "Errada: complemento temporário/excepcional não retroage.")],
  "A", "Na heterogênea, o complemento vem de fonte distinta da lei (ex.: Portaria SVS/MS 344/1998 complementando a Lei 11.343/2006).",
  "CP, art. 1º; Lei 11.343/2006, art. 66.",
  "Inverter homogênea e heterogênea (B) e generalizar a retroatividade do complemento (E).",
  "Heterogênea = fonte diferente da lei (hetero = outro).")

q(M, 2, "N0002", "Lei de 2009 revogou o artigo que previa o crime X e, ao mesmo tempo, passou a descrever a mesma conduta em outro artigo, com pena idêntica. Quanto aos fatos anteriores, houve:",
  [("abolitio criminis, com extinção da punibilidade.", "Errada: a conduta continuou punida."),
   ("novatio legis incriminadora, que não retroage.", "Errada: a conduta já era crime."),
   ("continuidade normativo-típica, sem extinção da punibilidade.", "Correta: houve só alteração topográfica."),
   ("novatio legis in mellius, com redução obrigatória da pena.", "Errada: a pena é idêntica."),
   ("lacuna legal, a ser suprida por analogia.", "Errada: não há lacuna.")],
  "C", "Revogação formal com migração da conduta para outro tipo não descriminaliza: é a continuidade normativo-típica (ex.: art. 214 → art. 213, Lei 12.015/2009).",
  "CP, art. 2º; art. 107, III (não incide).",
  "Achar que toda revogação é abolitio (A).",
  "Antes de dizer abolitio, procure se a conduta migrou.")

q(M, 2, "N0003", "Fato praticado em janeiro (pena de 2 a 8 anos). Em junho, lei nova reduz a pena para 1 a 4 anos. Em dezembro, outra lei fixa a pena em 2 a 6 anos. A sentença é proferida no ano seguinte. Pela posição majoritária, aplica-se a pena de:",
  [("2 a 8 anos, por ser a lei do tempo do fato.", "Errada: há lei posterior mais benéfica."),
   ("2 a 6 anos, por ser a lei vigente na sentença.", "Errada: ela é mais grave que a intermediária."),
   ("uma combinação das penas mínimas e máximas das três leis.", "Errada: combinação é vedada pelos tribunais superiores."),
   ("1 a 4 anos, da lei intermediária, por ser a mais benéfica.", "Correta: retroativa quanto ao fato e ultra-ativa quanto à sentença."),
   ("nenhuma, pois a sucessão de leis gera abolitio.", "Errada: o fato continuou crime.")],
  "D", "A lei intermediária mais benéfica é aplicável: retroage em relação ao fato e é ultra-ativa em relação ao julgamento.",
  "CP, art. 2º, parágrafo único; CF, art. 5º, XL.",
  "Escolher a lei do tempo do fato ou a da sentença por automatismo (A, B).",
  "Monte a linha do tempo e escolha a lei mais benéfica entre todas.")

q(M, 2, "N0005", "Paulo, com 17 anos e 10 meses, desfere facadas em Rui com intenção de matar. Rui morre três meses depois, quando Paulo já completou 18 anos. Paulo:",
  [("responde por homicídio consumado, pois era maior na data da morte.", "Errada: vale a data da conduta."),
   ("responde por tentativa de homicídio, pois era menor na data da conduta.", "Errada: ele é inimputável, não responde pelo CP."),
   ("é penalmente inimputável, devendo responder por ato infracional segundo o ECA.", "Correta: arts. 4º e 27 do CP; ECA, art. 104, p. ú."),
   ("responde por homicídio com a atenuante da menoridade.", "Errada: a atenuante é para menores de 21 já imputáveis."),
   ("responde segundo a teoria da ubiquidade, escolhendo-se a data mais grave.", "Errada: ubiquidade é do lugar, e não se escolhe a mais grave.")],
  "C", "Pela teoria da atividade, o crime considera-se praticado no momento da conduta, quando Paulo tinha 17 anos.",
  "CP, arts. 4º e 27; ECA, art. 104, parágrafo único.",
  "Usar a data do resultado (A) e confundir com a atenuante (D).",
  "Idade: conte na data da ação ou omissão.")

q(M, 2, "N0008", "Em voo de companhia aérea privada estrangeira, enquanto a aeronave sobrevoa o território brasileiro, um passageiro furta outro. Aplica-se:",
  [("a lei brasileira, por se tratar de aeronave estrangeira privada em voo no espaço aéreo correspondente.", "Correta: art. 5º, § 2º."),
   ("a lei do país da aeronave, por força do princípio da bandeira.", "Errada: no espaço aéreo brasileiro, aplica-se o § 2º."),
   ("a lei brasileira somente se a vítima for brasileira.", "Errada: a nacionalidade da vítima é irrelevante aqui."),
   ("a lei brasileira somente se houver requisição do Ministro da Justiça.", "Errada: requisição é do art. 7º, § 3º."),
   ("a lei do país de destino do voo.", "Errada: sem previsão legal.")],
  "A", "O § 2º do art. 5º estende a lei brasileira aos crimes a bordo de aeronaves estrangeiras privadas em pouso no Brasil ou em voo no espaço aéreo correspondente.",
  "CP, art. 5º, § 2º.",
  "Aplicar o princípio da bandeira dentro do espaço aéreo brasileiro (B).",
  "Estrangeira privada: no Brasil (pouso/voo, porto/mar territorial) → lei brasileira.")

q(M, 3, "N0009", "Do Uruguai, Ana envia ao Brasil um pacote com explosivo que fere gravemente a vítima em Porto Alegre. Quanto à lei aplicável, é correto afirmar:",
  [("aplica-se só a lei uruguaia, pois a conduta ocorreu no Uruguai.", "Errada: o resultado ocorreu no Brasil."),
   ("aplica-se a lei brasileira apenas se Ana for brasileira.", "Errada: não se trata de extraterritorialidade; o crime foi praticado no Brasil."),
   ("aplica-se a lei brasileira somente se presentes as condições do art. 7º, § 2º.", "Errada: as condições valem para crimes no exterior."),
   ("aplica-se a lei brasileira, pois o crime considera-se praticado também no Brasil, onde se produziu o resultado.", "Correta: art. 6º (ubiquidade) c/c art. 5º."),
   ("não se aplica nenhuma lei, por conflito de jurisdição.", "Errada: sem fundamento.")],
  "D", "Pela ubiquidade, o crime à distância considera-se praticado tanto no lugar da conduta quanto no do resultado; como o resultado foi no Brasil, incide a territorialidade.",
  "CP, arts. 5º e 6º.",
  "Tratar crime à distância como extraterritorialidade (B, C).",
  "Resultado no Brasil = crime no Brasil.")

q(M, 2, "N0021", "Brasileiro furta um turista em Lisboa e retorna ao Brasil. Para a aplicação da lei brasileira, é necessário, entre outras condições:",
  [("requisição do Ministro da Justiça.", "Errada: exigida só no § 3º."),
   ("que o fato seja punível também em Portugal.", "Correta: dupla tipicidade, § 2º, b."),
   ("que a vítima seja brasileira.", "Errada: o fundamento é a nacionalidade do autor (II, b)."),
   ("que tenha sido condenado em Portugal.", "Errada: condenação/cumprimento lá impedem."),
   ("pedido de extradição negado por Portugal.", "Errada: requisito do § 3º.")],
  "B", "O caso é do art. 7º, II, b (crime praticado por brasileiro), sujeito às cinco condições do § 2º, entre elas a dupla tipicidade.",
  "CP, art. 7º, II, b, e § 2º, a a e.",
  "Misturar requisitos do § 3º com os do § 2º (A, E).",
  "Inciso II: as 5 condições do § 2º; § 3º: elas + extradição + Ministro da Justiça.")

q(M, 2, "N0030", "A pena cumprida no estrangeiro:",
  [("é computada na pena imposta no Brasil pelo mesmo crime, quando diversas.", "Errada: quando diversas, atenua."),
   ("impede sempre a aplicação da lei brasileira.", "Errada: no inciso I, a lei brasileira se aplica (art. 7º, § 1º)."),
   ("é irrelevante para a pena imposta no Brasil.", "Errada: o art. 8º a considera."),
   ("só é considerada se houver tratado de extradição.", "Errada: sem essa exigência."),
   ("atenua a pena imposta no Brasil pelo mesmo crime, quando diversas, ou nela é computada, quando idênticas.", "Correta: literalidade do art. 8º.")],
  "E", "Art. 8º: penas diversas → atenua; penas idênticas → computa.",
  "CP, art. 8º.",
  "Inverter 'computa' e 'atenua' (A).",
  "IC-DA: Idênticas-Computa; Diversas-Atenua.")

q(M, 2, "N0031", "Sobre a sentença penal estrangeira, assinale a alternativa correta.",
  [("Sua homologação compete ao STF.", "Errada: desde a EC 45/2004, compete ao STJ."),
   ("Pode ser homologada para obrigar o condenado à reparação do dano, mediante pedido da parte interessada.", "Correta: art. 9º, I, e p. ú., a."),
   ("Precisa ser homologada para gerar reincidência.", "Errada: art. 63 dispensa homologação."),
   ("Pode ser homologada para executar no Brasil pena privativa de liberdade, independentemente de tratado.", "Errada: o art. 9º não prevê essa finalidade."),
   ("A homologação para medida de segurança depende apenas de pedido da vítima.", "Errada: depende de tratado de extradição ou requisição do MJ.")],
  "B", "O art. 9º prevê homologação para efeitos civis (pedido da parte) e para medida de segurança (tratado ou requisição do MJ).",
  "CP, arts. 9º e 63; CF, art. 105, I, i.",
  "Atribuir a competência ao STF (A) e exigir homologação para a reincidência (C).",
  "Art. 9º: só dois fins — efeitos civis e medida de segurança.")

q(M, 2, "N0039", "Sobre o art. 12 do Código Penal, é correto afirmar:",
  [("as regras gerais do CP nunca se aplicam aos crimes previstos em lei especial.", "Errada: aplicam-se, salvo disposição diversa."),
   ("as normas do CP sempre prevalecem sobre as da legislação especial.", "Errada: prevalece a lei especial quando dispõe de modo diverso."),
   ("a tentativa de contravenção penal é punível, pois o CP pune a tentativa.", "Errada: a LCP, art. 4º, dispõe de modo diverso."),
   ("as regras gerais do CP aplicam-se aos fatos incriminados por lei especial, se esta não dispuser de modo diverso.", "Correta: literalidade do art. 12."),
   ("o art. 12 só se aplica às leis anteriores ao Código Penal.", "Errada: sem essa limitação.")],
  "D", "O CP é subsidiário: vale para as leis especiais no que elas não regularem de forma própria (especialidade).",
  "CP, art. 12; LCP, art. 4º.",
  "Absolutizar a prevalência do CP (B).",
  "Lei especial silente → CP; lei especial diferente → lei especial.")

# ============================================================ DIFÍCIL (12) — simulado final
q(D, 3, "N0005", "Um sequestro (crime permanente) teve início em 02/05/2026. Em 10/05/2026, entrou em vigor lei que aumentou a pena desse crime. A vítima foi libertada em 15/05/2026. Assinale a alternativa correta.",
  [("Aplica-se a lei anterior, pois a lei mais grave não retroage.", "Errada: não há retroatividade; a conduta se prolongou na vigência da lei nova."),
   ("Aplica-se a lei nova, mais grave, nos termos da Súmula 711 do STF.", "Correta: vigência anterior à cessação da permanência."),
   ("Aplica-se a lei nova apenas ao período posterior a 10/05/2026, com duas penas.", "Errada: o crime permanente é um só."),
   ("Aplica-se a combinação das duas leis, para favorecer o réu.", "Errada: combinação não é cabível."),
   ("Aplica-se a lei anterior, pois o tempo do crime é o do início da conduta.", "Errada: no permanente, a conduta dura até a libertação.")],
  "B", "Súmula 711/STF: a lei penal mais grave aplica-se ao crime permanente se sua vigência é anterior à cessação da permanência.",
  "CP, art. 4º; Súmula 711/STF.",
  "Tratar o permanente como instantâneo (A, E).",
  "No crime permanente, pergunte: a lei entrou em vigor antes de cessar a permanência?")

q(D, 3, "N0005", "Em 10/04/2026, Caio dispara contra Davi, que morre em 25/04/2026. Em 20/04/2026 entrou em vigor lei que aumentou a pena do homicídio. Assinale a alternativa correta.",
  [("Aplica-se a lei nova, pela Súmula 711 do STF.", "Errada: homicídio não é crime permanente nem continuado."),
   ("Aplica-se a lei nova, porque o resultado ocorreu durante sua vigência.", "Errada: o CP adota a atividade para o tempo do crime."),
   ("Aplica-se a lei vigente em 10/04/2026, data da conduta.", "Correta: art. 4º; a lei mais grave não retroage."),
   ("Aplica-se a lei mais grave por se tratar de crime instantâneo de efeitos permanentes.", "Errada: essa classificação não atrai a Súmula 711."),
   ("O juiz escolhe a lei conforme a teoria da ubiquidade.", "Errada: ubiquidade é do lugar.")],
  "C", "Crime instantâneo: o tempo do crime é o da conduta (atividade). A Súmula 711 não se estende a crimes instantâneos.",
  "CP, art. 4º; CF, art. 5º, XL.",
  "Ampliar a Súmula 711 para crime instantâneo (A, D).",
  "Súmula 711 = só permanente ou continuado.")

q(D, 3, "N0002", "Condenado definitivamente pela Lei 6.368/1976, o réu pede ao juízo da execução a aplicação da causa de diminuição do art. 33, § 4º, da Lei 11.343/2006 sobre a pena da lei antiga. Segundo o STF (Tema 169) e o STJ (Súmula 501):",
  [("o pedido deve ser deferido, por força da retroatividade benéfica.", "Errada: geraria combinação de leis."),
   ("o pedido deve ser indeferido, porque a lei mais benéfica não retroage após o trânsito.", "Errada: ela retroage após o trânsito (art. 2º, p. ú.)."),
   ("o juiz deve aplicar a parte mais benéfica de cada lei, criando a pena mais favorável.", "Errada: é a lex tertia, vedada."),
   ("o pedido só pode ser apreciado em revisão criminal.", "Errada: compete ao juízo da execução (Súmula 611/STF)."),
   ("é vedada a combinação de leis; deve-se verificar qual lei, aplicada integralmente, é mais favorável.", "Correta: Tema 169/STF e Súmula 501/STJ.")],
  "E", "Os tribunais superiores vedam a combinação (lex tertia): o juiz compara as leis inteiras e aplica a mais favorável.",
  "CP, art. 2º, parágrafo único; STF, Tema 169 (RE 600.817/MS); STJ, Súmula 501; Súmula 611/STF.",
  "Confundir vedação da combinação com vedação da retroatividade (B).",
  "Lei nova retroage, mas por inteiro.")

q(D, 3, "N0004", "Durante estado de calamidade, lei excepcional passou a punir a venda de oxigênio medicinal acima do preço tabelado. Lia praticou a conduta durante a calamidade. Encerrada a calamidade, a lei deixou de vigorar, e Lia foi julgada. Assinale a alternativa correta.",
  [("Houve abolitio criminis com o fim da calamidade.", "Errada: o fim da vigência não descriminaliza."),
   ("Lia deve ser absolvida, pois a lei não vigorava na data do julgamento.", "Errada: a lei é ultra-ativa."),
   ("Lia pode ser condenada, pois a lei excepcional aplica-se ao fato praticado durante sua vigência, embora cessadas as circunstâncias que a determinaram.", "Correta: art. 3º."),
   ("Lia só pode ser condenada se a calamidade voltar.", "Errada: sem fundamento."),
   ("Aplica-se a lei mais benéfica, que é a ausência de lei após a calamidade.", "Errada: o fim da lei excepcional não é lei mais benéfica sobre o mesmo fato.")],
  "C", "A lei excepcional é ultra-ativa: a cessação das circunstâncias não alcança os fatos praticados durante sua vigência.",
  "CP, art. 3º.",
  "Tratar a cessação das circunstâncias como lei posterior benéfica (E).",
  "Excepcional ou temporária: fato na vigência → lei aplicável para sempre.")

q(D, 3, "N0007", "Assinale a alternativa em que a lei penal brasileira é aplicável com base no art. 5º do CP (territorialidade, inclusive por extensão).",
  [("Furto a bordo de navio mercante brasileiro atracado no porto de Buenos Aires.", "Errada: em território estrangeiro, o caso é do art. 7º, II, c (condicionada)."),
   ("Homicídio a bordo de navio de guerra da Marinha do Brasil atracado em porto estrangeiro.", "Correta: embarcação pública brasileira, onde quer que se encontre (§ 1º)."),
   ("Lesão corporal a bordo de navio estrangeiro privado em alto-mar.", "Errada: lei da bandeira."),
   ("Furto na sede de embaixada brasileira em Roma.", "Errada: embaixada não é extensão do território."),
   ("Estelionato praticado e consumado inteiramente na Argentina por brasileiro.", "Errada: hipótese de extraterritorialidade condicionada (art. 7º, II, b).")],
  "B", "Embarcações públicas ou a serviço do governo brasileiro são extensão do território nacional onde quer que se encontrem.",
  "CP, art. 5º, § 1º; art. 7º, II, b e c.",
  "Confundir extensão do território com extraterritorialidade (A, E).",
  "Primeiro pergunte: é território (art. 5º) ou é exterior (art. 7º)?")

q(D, 3, "N0013", "Gerente brasileiro de filial de sociedade de economia mista federal, no exterior, desvia valores da empresa. Processado no país estrangeiro, é absolvido. Assinale a alternativa correta.",
  [("A lei brasileira é aplicável, por se tratar de extraterritorialidade incondicionada; a absolvição no estrangeiro não impede o processo no Brasil.", "Correta: art. 7º, I, b, e § 1º."),
   ("A lei brasileira não se aplica, pois ele foi absolvido no estrangeiro.", "Errada: no inciso I, a absolvição não impede."),
   ("A lei brasileira só se aplica se ele entrar no território nacional.", "Errada: entrada é condição do § 2º."),
   ("A lei brasileira só se aplica com requisição do Ministro da Justiça.", "Errada: requisito do § 3º."),
   ("Aplica-se apenas a lei estrangeira, pelo princípio da territorialidade.", "Errada: a lei brasileira alcança o fato.")],
  "A", "Crime contra o patrimônio de sociedade de economia mista está no art. 7º, I, b; pelo § 1º, a lei brasileira se aplica ainda que absolvido no estrangeiro.",
  "CP, art. 7º, I, b, e § 1º.",
  "Aplicar a condição do § 2º, d (absolvição), ao inciso I (B).",
  "Ente público lesado no exterior → inciso I → incondicionada.")

q(D, 3, "N0027", "Estrangeiro mata brasileiro em país vizinho e foge para o Brasil. O fato é crime nos dois países e extraditável; não houve julgamento no exterior nem extinção da punibilidade; o país vizinho não pediu extradição. Para aplicar a lei brasileira, falta:",
  [("nada; todas as condições estão reunidas.", "Errada: falta a requisição do Ministro da Justiça."),
   ("que o agente seja brasileiro.", "Errada: o § 3º trata justamente de estrangeiro."),
   ("a requisição do Ministro da Justiça.", "Correta: § 3º, b."),
   ("pedido de extradição negado pelo Brasil.", "Errada: basta que a extradição não tenha sido pedida (§ 3º, a)."),
   ("condenação prévia no país vizinho.", "Errada: condenação lá impediria a lei brasileira.")],
  "C", "O § 3º exige as cinco condições do § 2º, mais extradição não pedida ou negada e requisição do Ministro da Justiça.",
  "CP, art. 7º, § 2º, a a e, e § 3º, a e b.",
  "Esquecer o requisito da requisição (A) ou exigir que a extradição tenha sido negada (D), quando basta não ter sido pedida.",
  "§ 3º: 5 condições + extradição não pedida/negada + Ministro da Justiça.")

q(D, 3, "N0024", "Brasileiro pratica, no exterior, crime punido no Brasil com pena máxima inferior a 2 anos. Ele retorna ao Brasil, e o fato também é crime no país em que foi praticado. Quanto à aplicação da lei brasileira (art. 7º, II, b), é correto afirmar que:",
  [("aplica-se, pois basta o ingresso no território nacional.", "Errada: as condições são cumulativas."),
   ("aplica-se, pois a dupla tipicidade está presente.", "Errada: falta outra condição."),
   ("aplica-se, por se tratar de extraterritorialidade incondicionada.", "Errada: o inciso II é condicionado."),
   ("não se aplica, pois o crime não está entre aqueles pelos quais a lei brasileira autoriza a extradição.", "Correta: § 2º, c, c/c Lei 13.445/2017, art. 82, IV."),
   ("não se aplica, pois brasileiro nunca responde por crime cometido no exterior.", "Errada: o inciso II, b, prevê exatamente isso.")],
  "D", "Uma das cinco condições é estar o crime entre os extraditáveis; a Lei de Migração veda extradição quando a lei brasileira comina pena de prisão inferior a 2 anos.",
  "CP, art. 7º, II, b, e § 2º, c; Lei 13.445/2017, art. 82, IV.",
  "Considerar suficiente a entrada ou a dupla tipicidade (A, B).",
  "Confira as cinco condições uma a uma; faltando uma, a lei brasileira não incide.")

q(D, 3, "N0030", "Por crime do art. 7º, I, do CP, Rogério cumpriu 2 anos de prisão no exterior. No Brasil, foi condenado pelo mesmo crime a 5 anos de reclusão. Restam a cumprir:",
  [("5 anos, pois a pena estrangeira não se comunica.", "Errada: o art. 8º manda computar."),
   ("nenhuma pena, pois ele já cumpriu pena no exterior.", "Errada: no inciso I, a lei brasileira se aplica (§ 1º)."),
   ("4 anos, com a atenuação de 1/5 prevista no art. 8º.", "Errada: não há fração legal; e, sendo idênticas, computa-se."),
   ("2 anos e 6 meses, metade da pena.", "Errada: sem previsão."),
   ("3 anos, pois as penas são idênticas e o tempo cumprido é computado.", "Correta: 5 − 2 = 3 (art. 8º).")],
  "E", "Penas idênticas (prisão × prisão): o tempo cumprido no exterior é computado na pena brasileira.",
  "CP, art. 7º, § 1º, e art. 8º.",
  "Aplicar o § 2º, d, ao inciso I (B) e inventar fração de atenuação (C).",
  "Idênticas → subtraia o tempo cumprido.")

q(D, 3, "N0037", "A vítima de crime de ação penal privada tomou conhecimento da autoria em 10/02/2026. O prazo decadencial é de 6 meses (art. 103 do CP). O último dia para oferecer a queixa é:",
  [("10/08/2026, excluindo-se o dia do começo.", "Errada: aplica a regra processual a prazo penal."),
   ("09/08/2026, ainda que seja domingo, pois o prazo penal inclui o dia do começo e não se prorroga.", "Correta: art. 10 do CP."),
   ("10/08/2026, segunda-feira, pois o prazo se prorroga para o dia útil seguinte.", "Errada: prazo penal não se prorroga."),
   ("09/07/2026, contando-se 6 meses de 30 dias a partir do dia útil seguinte.", "Errada: conta-se pelo calendário comum, de data a data."),
   ("11/08/2026, por se tratar de prazo processual (CPP, art. 798).", "Errada: a decadência tem natureza penal.")],
  "B", "Decadência é prazo penal: inclui-se o dia do começo (10/02) e conta-se pelo calendário comum; termina em 09/08/2026 (domingo), sem prorrogação.",
  "CP, arts. 10 e 103; comparar com CPP, art. 798, §§ 1º e 3º.",
  "Usar a regra processual de exclusão do primeiro dia e de prorrogação (A, C, E).",
  "Prazo que atinge o direito de punir = prazo penal = inclui o 1º dia.")

q(D, 3, "N0038", "O juiz fixou a pena em 20 dias e, em seguida, aplicou a redução de 1/3. A pena final, nos termos do art. 11 do CP, é de:",
  [("14 dias, arredondando-se a fração para cima.", "Errada: frações de dia são desprezadas, não arredondadas."),
   ("13 dias e 8 horas.", "Errada: frações de dia não se computam."),
   ("13 dias, desprezando-se a fração de dia.", "Correta: 20 × 2/3 = 13,33 → 13 dias."),
   ("7 dias, que correspondem à fração reduzida.", "Errada: 7 dias (aproximados) é o quanto foi reduzido, não a pena final."),
   ("20 dias, pois redução em fração não se aplica a penas em dias.", "Errada: sem fundamento.")],
  "C", "Art. 11: nas penas privativas de liberdade e restritivas de direitos, desprezam-se as frações de dia.",
  "CP, art. 11.",
  "Arredondar para cima (A) ou manter as horas (B).",
  "Calcule e corte a fração de dia.")

q(D, 3, "N0039", "Sobre a relação entre o Código Penal e a legislação especial, assinale a alternativa correta.",
  [("A Lei das Contravenções Penais admite a punição da tentativa, por força do art. 14 do CP.", "Errada: a LCP, art. 4º, dispõe de modo diverso."),
   ("Pelo art. 12 do CP, a lei especial nunca pode afastar as regras gerais do Código.", "Errada: pode, se dispuser de modo diverso."),
   ("A Lei 11.343/2006 prevê prazo prescricional próprio para o crime do art. 28, que prevalece sobre o prazo geral do CP.", "Correta: Lei 11.343/2006, art. 30 (2 anos) — disposição diversa."),
   ("A Lei de Tortura não pode prever extraterritorialidade diversa da do art. 7º do CP.", "Errada: a Lei 9.455/1997, art. 2º, traz regra própria."),
   ("As contravenções penais praticadas no exterior por brasileiro sujeitam-se à lei brasileira.", "Errada: a LCP, art. 2º, limita sua aplicação ao território nacional.")],
  "C", "O art. 12 manda aplicar as regras gerais do CP salvo disposição diversa da lei especial; o art. 30 da Lei de Drogas é exemplo de disposição diversa.",
  "CP, art. 12; Lei 11.343/2006, art. 30; LCP, arts. 2º e 4º; Lei 9.455/1997, art. 2º.",
  "Supor que o CP sempre prevalece (B, D) ou que vale integralmente para as contravenções (A, E).",
  "Procure na lei especial uma regra própria sobre o ponto; se houver, ela prevalece.")

lv = Counter(x["level"] for x in Q)
assert lv == {F: 10, M: 10, D: 12}, lv
gab = Counter(next(o["label"] for o in x["options"] if o["correct"]) for x in Q)
for x in Q:
    assert sum(o["correct"] for o in x["options"]) == 1
json.dump(Q, open("questoes.json", "w", encoding="utf8"), ensure_ascii=False)
print(len(Q), dict(lv), dict(sorted(gab.items())))
