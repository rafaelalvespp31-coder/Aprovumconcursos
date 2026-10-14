import json

Q = []
def ce(level, node, diff, statement, true, just, essential=False):
    Q.append(dict(level=level, type="certo_errado", statement=statement, options=[], correctAnswerTrue=true, justification=just, nodeKey=node, difficulty=diff, essential=essential, dependsOnExternalSource=False))

def me(level, node, diff, statement, opts, just, essential=False, kind="multipla_escolha"):
    options = [dict(label="ABCDE"[i], text=t, correct=c, explanation=e) for i, (t, c, e) in enumerate(opts)]
    assert sum(o["correct"] for o in options) == 1, statement
    Q.append(dict(level=level, type=kind, statement=statement, options=options, justification=just, nodeKey=node, difficulty=diff, essential=essential, dependsOnExternalSource=False))

F, M, D = "facil", "medio", "dificil"

# ============================ FÁCIL ============================
ce(F, "N0002", 1, "Segundo o CTB, considera-se trânsito a utilização das vias por pessoas, veículos e animais, isolados ou em grupos, conduzidos ou não, para fins de circulação, parada, estacionamento e operação de carga ou descarga.", True,
   "Literalidade do art. 1º, § 1º, do CTB.", True)
ce(F, "N0004", 1, "Os órgãos e entidades do Sistema Nacional de Trânsito respondem subjetivamente pelos danos causados aos cidadãos em virtude de ação, omissão ou erro na execução de programas e serviços que garantam o trânsito seguro.", False,
   "O art. 1º, § 3º, prevê responsabilidade OBJETIVA: dispensa a prova de culpa do órgão.", True)
ce(F, "N0007", 1, "O CONTRAN é o coordenador do Sistema Nacional de Trânsito e seu órgão máximo normativo.", True,
   "Art. 7º, I, do CTB.", True)
ce(F, "N0016", 1, "De acordo com a ordem de prevalência da sinalização, as indicações do semáforo prevalecem sobre as ordens do agente de trânsito.", False,
   "Art. 89: as ordens do agente prevalecem sobre as normas de circulação e outros sinais; o semáforo vem em segundo lugar.", True)
ce(F, "N0027", 1, "A infração de natureza grave computa cinco pontos no prontuário do infrator.", True,
   "Art. 259, II: grave = 5 pontos (leve 3, média 4, grave 5, gravíssima 7).", True)
ce(F, "N0013", 1, "As Juntas Administrativas de Recursos de Infrações (JARI) integram o Sistema Nacional de Trânsito.", True,
   "Art. 7º, VII, do CTB. A JARI julga os recursos contra penalidades em 1ª instância.")

me(F, "N0041", 1, "Para os efeitos do CTB, NÃO se enquadra no conceito de via terrestre aberta à circulação, nos termos do art. 2º:",
   [("garagem de uso exclusivo de uma residência", True, "Correta: a garagem privativa não é via aberta à circulação."),
    ("estacionamento de supermercado de uso coletivo", False, "O parágrafo único inclui os estacionamentos privados de uso coletivo."),
    ("via interna de condomínio", False, "Incluída expressamente pelo parágrafo único do art. 2º."),
    ("praia aberta à circulação pública", False, "Incluída expressamente pelo parágrafo único do art. 2º.")],
   "Art. 2º, parágrafo único: praias abertas, vias internas de condomínios e estacionamentos privados de uso coletivo são vias terrestres.", True)
me(F, "N0025", 1, "Uma infração gravíssima computa, no prontuário do infrator:",
   [("7 pontos", True, "Correta: art. 259, I."),
    ("5 pontos", False, "É a pontuação da grave."),
    ("4 pontos", False, "É a pontuação da média."),
    ("10 pontos", False, "Não há infração de 10 pontos no art. 259.")],
   "Leve 3, média 4, grave 5, gravíssima 7.", True)
me(F, "N0018", 1, "É penalidade prevista no art. 256 do CTB:",
   [("suspensão do direito de dirigir", True, "Correta: art. 256, III."),
    ("remoção do veículo", False, "É medida administrativa (art. 269)."),
    ("retenção do veículo", False, "É medida administrativa (art. 269)."),
    ("apreensão do veículo", False, "Foi revogada pela Lei 13.281/2016.")],
   "Penalidades: advertência, multa, suspensão, cassação da CNH e da PPD e curso de reciclagem.", True)
me(F, "N0013", 1, "Os recursos contra penalidades de trânsito são julgados, em primeira instância, pela:",
   [("JARI", True, "Correta: Junta Administrativa de Recursos de Infrações."),
    ("CONTRAN", False, "É órgão normativo e coordenador, não julga recurso de multa em 1ª instância."),
    ("Polícia Rodoviária Federal", False, "Órgão de policiamento e fiscalização."),
    ("Polícia Militar", False, "Órgão de policiamento ostensivo.")],
   "JARI (1ª instância) → CETRAN/CONTRANDIFE (2ª instância).")
me(F, "N0030", 1, "A pena do homicídio culposo na direção de veículo automotor (art. 302, caput) é:",
   [("detenção de dois a quatro anos, e suspensão ou proibição de se obter a permissão ou a habilitação para dirigir", True, "Correta: literalidade do art. 302."),
    ("reclusão de cinco a oito anos", False, "É a pena do § 3º (sob influência de álcool)."),
    ("detenção de seis meses a dois anos", False, "É a pena da lesão corporal culposa (art. 303)."),
    ("detenção de seis meses a um ano, ou multa", False, "É a pena de crimes como os dos arts. 304, 305 e 309.")],
   "Art. 302: detenção de 2 a 4 anos + suspensão ou proibição.", True)
me(F, "N0038", 1, "Joana dirige sem possuir habilitação, em velocidade compatível e sem gerar perigo a ninguém, quando é parada numa blitz. Ela:",
   [("comete apenas a infração administrativa do art. 162, I", True, "Correta: sem perigo de dano, não há o crime do art. 309 (Súmula 720 do STF)."),
    ("comete o crime do art. 309, que é de perigo abstrato", False, "O art. 309 exige perigo de dano (perigo concreto)."),
    ("comete o crime do art. 310", False, "O art. 310 pune quem ENTREGA a direção."),
    ("não comete infração alguma", False, "Dirigir sem habilitação é infração gravíssima (art. 162, I).")],
   "Súmula 720 do STF: o art. 309 exige perigo concreto. Sem ele, só a infração administrativa.", kind="situacional")

# ============================ MÉDIO ============================
ce(M, "N0060", 2, "As medidas administrativas do art. 269 podem ser adotadas pela autoridade de trânsito ou por seus agentes, enquanto as penalidades do art. 256 são impostas pela autoridade de trânsito.", True,
   "Arts. 256 e 269 do CTB: penalidade é da autoridade; medida administrativa, da autoridade ou de seus agentes.", True)
ce(M, "N0059", 2, "O condutor que exerce atividade remunerada ao veículo terá o direito de dirigir suspenso ao atingir 20 pontos no período de 12 meses, se houver duas ou mais infrações gravíssimas.", False,
   "Para o condutor com EAR, o limite é de 40 pontos, independentemente da natureza das infrações (art. 261, § 5º, com a Lei 14.071/2020).", True)
ce(M, "N0061", 2, "Se a notificação da autuação não for expedida no prazo de 30 dias, o auto de infração será arquivado e seu registro julgado insubsistente.", True,
   "Art. 281, parágrafo único, II, do CTB.", True)
ce(M, "N0063", 2, "Aplicam-se à lesão corporal culposa de trânsito os arts. 74, 76 e 88 da Lei 9.099/1995, salvo se o agente estiver, entre outras hipóteses, transitando em velocidade superior à máxima permitida em 50%.", False,
   "O art. 291, § 1º, III, fala em velocidade superior à máxima em 50 km/h — não em 50%.", True)
ce(M, "N0036", 2, "A alteração da capacidade psicomotora exigida pelo art. 306 pode ser constatada por sinais que a indiquem, além dos testes de alcoolemia.", True,
   "Art. 306, § 1º, II, e § 2º: admite-se a prova por sinais, vídeo, prova testemunhal e outros meios.")
ce(M, "N0056", 2, "Com a Lei 14.071/2020, o prazo para o proprietário indicar o condutor infrator passou a ser de 30 dias.", True,
   "Art. 257, § 7º, com a redação da Lei 14.071/2020 (antes eram 15 dias).")

me(M, "N0058", 2, "Na via com velocidade máxima de 80 km/h, um veículo é flagrado a 125 km/h. A infração é:",
   [("gravíssima, com multa multiplicada por três e suspensão do direito de dirigir", True, "Correta: 125 supera em mais de 50% o limite de 80 (o teto de 50% seria 120): art. 218, III."),
    ("grave, apenas com multa", False, "Grave é de 20% a 50% acima (art. 218, II)."),
    ("média, apenas com multa", False, "Média é até 20% acima (art. 218, I)."),
    ("gravíssima, com multa simples e sem suspensão", False, "O inciso III prevê multa (3x) e suspensão.")],
   "Art. 218: até 20% média; 20% a 50% grave; mais de 50% gravíssima, multa 3x e suspensão.", True, kind="situacional")
me(M, "N0014", 2, "Assinale a ordem de prevalência da sinalização prevista no art. 89 do CTB.",
   [("Ordens do agente; indicações do semáforo; indicações dos sinais; normas de circulação", True, "Correta."),
    ("Semáforo; agente; sinais; normas", False, "O agente vem antes do semáforo."),
    ("Sinais; semáforo; agente; normas", False, "Ordem invertida."),
    ("Normas de circulação; sinais; semáforo; agente", False, "É a ordem inversa da lei.")],
   "Agente > semáforo > sinais > normas.", True)
me(M, "N0008", 2, "Das decisões da JARI cabe recurso, no âmbito estadual, ao:",
   [("CETRAN", True, "Correta: art. 288 c/c art. 289 do CTB."),
    ("CONTRAN, em qualquer caso", False, "O CONTRAN julga apenas hipóteses específicas previstas no art. 289."),
    ("DETRAN", False, "É órgão executivo, não instância recursal."),
    ("Poder Judiciário, obrigatoriamente", False, "Há instância administrativa própria.")],
   "JARI → CETRAN (Estados) ou CONTRANDIFE (DF).")
me(M, "N0018", 2, "Durante uma blitz, o agente recolhe a CNH de um motociclista que conduzia sem capacete. O recolhimento da CNH é:",
   [("medida administrativa, que pode ser adotada pelo agente", True, "Correta: art. 269, III, e art. 244, I."),
    ("penalidade, que só pode ser aplicada pela autoridade", False, "Recolhimento é medida, não penalidade."),
    ("penalidade de suspensão já aplicada", False, "A suspensão depende de processo administrativo."),
    ("providência ilegal, por falta de processo prévio", False, "As medidas administrativas são adotadas na hora.")],
   "O agente autua e adota medidas; a suspensão (penalidade) vem depois, imposta pela autoridade.", kind="situacional")
me(M, "N0034", 2, "Afastar-se o condutor do local do acidente para fugir à responsabilidade penal ou civil é crime punido com:",
   [("detenção de seis meses a um ano, ou multa", True, "Correta: art. 305."),
    ("detenção de dois a quatro anos", False, "É a pena do homicídio culposo."),
    ("reclusão de dois a cinco anos", False, "É a pena do art. 303, § 2º."),
    ("apenas multa administrativa", False, "É crime, com pena de detenção ou multa.")],
   "Art. 305: detenção de 6 meses a 1 ano, ou multa.")
me(M, "N0053", 2, "Pela Lei 14.071/2020, o exame de aptidão física e mental de um condutor de 55 anos deve ser renovado a cada:",
   [("cinco anos", True, "Correta: de 50 a 69 anos, a cada 5 anos (art. 147, § 2º)."),
    ("dez anos", False, "Vale para menores de 50 anos."),
    ("três anos", False, "Vale a partir dos 70 anos."),
    ("dois anos", False, "Não há esse prazo na regra geral.")],
   "Validade: 10 anos (até 49), 5 anos (50 a 69), 3 anos (70+).")

# ============================ DIFÍCIL ============================
ce(D, "N0033", 3, "Na lesão corporal culposa na direção de veículo automotor, a pena de reclusão de dois a cinco anos do art. 303, § 2º, aplica-se ao condutor sob influência de álcool, ainda que a lesão seja leve.", False,
   "O § 2º exige, cumulativamente, a influência de álcool ou psicoativa E o resultado de lesão corporal de natureza grave ou gravíssima.", True)
ce(D, "N0062", 3, "Ao condutor de veículo, nos casos de acidentes de trânsito de que resulte vítima, não se imporá a prisão em flagrante, nem se exigirá fiança, se prestar pronto e integral socorro àquela.", True,
   "Art. 301 do CTB: o socorro pronto e integral afasta o flagrante e a fiança.", True)
ce(D, "N0064", 3, "O crime de entregar a direção de veículo automotor a pessoa não habilitada (art. 310) exige, para sua consumação, a demonstração de perigo concreto de dano.", False,
   "Súmula 575 do STJ: o crime do art. 310 é de perigo abstrato; dispensa lesão ou perigo concreto.", True)
ce(D, "N0064", 3, "Nos crimes de homicídio culposo e de lesão corporal culposa praticados sob influência de álcool (arts. 302, § 3º, e 303, § 2º), é vedada a substituição da pena privativa de liberdade por restritiva de direitos.", True,
   "Art. 312-B do CTB, incluído pela Lei 14.071/2020.")
ce(D, "N0060", 3, "A penalidade de advertência por escrito deve ser imposta à infração leve ou média, passível de multa, se o infrator não tiver cometido nenhuma outra infração nos últimos 12 meses.", True,
   "Art. 267 do CTB, com a redação da Lei 14.071/2020.")
ce(D, "N0058", 3, "A pessoa jurídica proprietária que não indica o condutor infrator recebe nova multa, cujo valor é sempre o dobro da multa originária.", False,
   "Art. 257, § 8º: o valor da nova multa é o da multa originária multiplicado pelo número de infrações iguais cometidas no período de 12 meses.")

me(D, "N0063", 4, "Aplicam-se à lesão corporal culposa de trânsito os benefícios dos arts. 74, 76 e 88 da Lei 9.099/1995, EXCETO se o agente estiver:",
   [("participando, em via pública, de corrida não autorizada", True, "Correta: art. 291, § 1º, II."),
    ("dirigindo sem possuir habilitação", False, "Não está entre as exceções do § 1º."),
    ("transitando 20% acima da velocidade máxima", False, "A exceção é 50 km/h acima da máxima."),
    ("conduzindo veículo não licenciado", False, "Não está entre as exceções do § 1º."),
    ("conduzindo veículo de transporte de passageiros", False, "É causa de aumento do art. 302, § 1º, não exceção do art. 291.")],
   "Exceções: álcool ou psicoativa; racha; velocidade 50 km/h acima da máxima.", True)
me(D, "N0030", 4, "Embriagado, um condutor perde o controle e atropela um pedestre, que morre. Não há indícios de dolo. A conduta se amolda ao:",
   [("art. 302, § 3º, com reclusão de cinco a oito anos", True, "Correta: homicídio culposo sob influência de álcool."),
    ("art. 302, caput, com detenção de dois a quatro anos", False, "O álcool desloca para o § 3º."),
    ("art. 306, apenas", False, "Há resultado morte: incide o art. 302, § 3º."),
    ("art. 308, § 2º", False, "Não houve racha."),
    ("art. 303, § 2º", False, "Esse dispositivo trata de lesão corporal, não de morte.")],
   "Art. 302, § 3º: reclusão de 5 a 8 anos + suspensão ou proibição; vedada a substituição (art. 312-B).", True, kind="situacional")
me(D, "N0059", 4, "Em 12 meses, Carla (sem EAR) somou 1 gravíssima, 3 graves e 2 médias. Diego (sem EAR) somou 2 gravíssimas e 2 graves. Considerando o art. 261, I:",
   [("Carla não será suspensa (29 pontos, limite 30); Diego será (24 pontos, limite 20)", True, "Correta: 7 + 15 + 8 = 29 < 30; 14 + 10 = 24 ≥ 20."),
    ("ambos serão suspensos, pois passaram de 20 pontos", False, "O limite de 20 só vale com 2 ou mais gravíssimas."),
    ("nenhum será suspenso, pois o limite é de 40 pontos", False, "40 é o limite sem gravíssima ou para o EAR."),
    ("Carla será suspensa e Diego não", False, "Inverte os limites."),
    ("Diego não será suspenso, pois tem menos de 30 pontos", False, "Com 2 gravíssimas, o limite de Diego é 20.")],
   "Limites: 20 (2+ gravíssimas), 30 (1 gravíssima), 40 (nenhuma).", kind="situacional")
me(D, "N0037", 4, "Sobre embriaguez ao volante, assinale a correta.",
   [("A recusa ao teste do bafômetro configura infração autônoma (art. 165-A), com as mesmas penalidades do art. 165", True, "Correta."),
    ("A recusa ao bafômetro configura, por si só, o crime do art. 306", False, "A recusa é infração administrativa; o crime exige prova da alteração."),
    ("O crime do art. 306 só pode ser provado por exame de sangue", False, "Admite bafômetro, sinais, vídeo, testemunhas."),
    ("A infração do art. 165 é grave, com multa simples", False, "É gravíssima, multa (10x) e suspensão por 12 meses."),
    ("O crime do art. 306 exige concentração mínima de 0,6 mg/L de ar alveolar", False, "São 0,3 mg/L de ar ou 6 dg/L de sangue.")],
   "Art. 165-A: recusa = mesmas penalidades do art. 165. Art. 306: ≥ 0,3 mg/L de ar, ≥ 6 dg/L de sangue ou sinais.")
me(D, "N0064", 4, "Quem viola a suspensão ou a proibição de se obter a permissão ou a habilitação imposta com fundamento no CTB (art. 307) está sujeito a:",
   [("detenção de seis meses a um ano e multa, com nova imposição adicional de idêntico prazo de suspensão ou proibição", True, "Correta: art. 307."),
    ("detenção de seis meses a dois anos", False, "Erro comum (inclusive da apostila-base): a pena é de 6 meses a 1 ano."),
    ("reclusão de um a três anos", False, "Não é a pena do art. 307."),
    ("apenas multa administrativa e cassação da CNH", False, "É crime, além das consequências administrativas.")],
   "Art. 307: detenção de 6 meses a 1 ano e multa, com nova imposição por igual prazo.")
me(D, "N0061", 4, "Sobre o processo administrativo de trânsito, assinale a correta.",
   [("O recurso contra a imposição de multa pode ser interposto sem o recolhimento do seu valor", True, "Correta: art. 286."),
    ("O recurso à JARI exige o depósito prévio da multa", False, "O art. 286 dispensa o recolhimento."),
    ("A notificação da autuação pode ser expedida a qualquer tempo, dentro da prescrição", False, "O prazo é de 30 dias (art. 281, par. único, II)."),
    ("Da decisão da JARI cabe recurso diretamente ao Poder Judiciário, sem instância administrativa", False, "Cabe recurso ao CETRAN/CONTRANDIFE (art. 288)."),
    ("O prazo para recorrer da penalidade pode ser inferior a 30 dias", False, "O art. 282, § 4º, fixa prazo não inferior a 30 dias.")],
   "Autuação → notificação (30 dias) → defesa → penalidade → JARI → CETRAN; recurso sem recolher a multa.")

json.dump(Q, open("conteudo-catalogo-ctb/questoes.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
from collections import Counter
print(len(Q), Counter((q["level"], q["type"]) for q in Q))
