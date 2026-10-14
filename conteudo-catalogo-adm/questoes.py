import json

Q = []
def ce(level, node, diff, statement, true, just, essential=False):
    Q.append(dict(level=level, type="certo_errado", statement=statement, options=[], correctAnswerTrue=true, justification=just, nodeKey=node, difficulty=diff, essential=essential, dependsOnExternalSource=False))

def me(level, node, diff, statement, opts, just, essential=False, kind="multipla_escolha"):
    # opts: lista de (texto, correta, explicação)
    options = [dict(label="ABCDE"[i], text=t, correct=c, explanation=e) for i, (t, c, e) in enumerate(opts)]
    assert sum(o["correct"] for o in options) == 1, statement
    Q.append(dict(level=level, type=kind, statement=statement, options=options, justification=just, nodeKey=node, difficulty=diff, essential=essential, dependsOnExternalSource=False))

F, M, D = "facil", "medio", "dificil"

# ============================ FÁCIL ============================
ce(F, "N0034", 1, "Os princípios expressos no caput do art. 37 da Constituição Federal são legalidade, impessoalidade, moralidade, publicidade e eficiência.", True,
   "É o LIMPE, literalmente previsto no caput do art. 37 da CF.", True)
ce(F, "N0026", 1, "Os órgãos públicos são dotados de personalidade jurídica própria, distinta da do ente a que pertencem.", False,
   "Órgãos não têm personalidade jurídica; quem a tem é a entidade (Lei 9.784/1999, art. 1º, § 2º). Os atos do órgão são imputados à pessoa jurídica (teoria do órgão).", True)
ce(F, "N0030", 1, "A autarquia é pessoa jurídica de direito público criada por lei específica.", True,
   "Art. 37, XIX, da CF: somente por lei específica poderá ser criada autarquia; sua personalidade é de direito público.", True)
ce(F, "N0004", 1, "O prazo de validade do concurso público é de até dois anos, prorrogável uma vez, por igual período.", True,
   "Literalidade do art. 37, III, da CF.", True)
ce(F, "N0055", 1, "Pela responsabilidade objetiva do Estado, a vítima precisa comprovar a culpa do servidor para ser indenizada.", False,
   "Na responsabilidade objetiva (art. 37, § 6º), a vítima prova conduta, dano e nexo causal; a culpa só importa na ação de regresso do Estado contra o agente.", True)
ce(F, "N0046", 1, "A revogação de um ato administrativo ocorre quando ele é ilegal.", False,
   "Ato ilegal é anulado. A revogação atinge ato válido que deixou de ser conveniente e oportuno (Súmula 473 do STF; Lei 9.784/1999, art. 53).", True)

me(F, "N0020", 1, "Em sentido subjetivo (orgânico ou formal), a Administração Pública corresponde:",
   [("ao conjunto de órgãos, entidades e agentes que exercem a função administrativa", True, "Correta: o sentido subjetivo olha para QUEM administra."),
    ("à atividade de prestação de serviços públicos", False, "Isso é o sentido objetivo (material)."),
    ("à função de fixar as diretrizes políticas do Estado", False, "Isso é Governo, não Administração."),
    ("ao exercício do poder de polícia", False, "Atividade administrativa: sentido objetivo.")],
   "O sentido subjetivo identifica os sujeitos (órgãos, entidades e agentes); o objetivo, a atividade.", True)
me(F, "N0025", 1, "Integram a Administração Pública Indireta:",
   [("autarquias, fundações públicas, empresas públicas e sociedades de economia mista", True, "Correta: são as quatro entidades da Indireta (DL 200/1967, art. 4º, II)."),
    ("ministérios, secretarias, autarquias e fundações", False, "Ministérios e secretarias são órgãos da Direta."),
    ("concessionárias de serviço público e autarquias", False, "Concessionárias são particulares; não integram a Indireta."),
    ("União, Estados, Distrito Federal e Municípios", False, "São os entes da Administração Direta.")],
   "A Indireta é composta pelas quatro entidades com personalidade jurídica própria.", True)
me(F, "N0039", 1, "Qual princípio foi incluído no caput do art. 37 da Constituição pela Emenda Constitucional nº 19/1998?",
   [("Eficiência", True, "Correta: a EC 19/1998 (Reforma Administrativa) acrescentou a eficiência."),
    ("Moralidade", False, "Consta do texto original de 1988."),
    ("Razoabilidade", False, "Não está no art. 37; é expresso na Lei 9.784/1999."),
    ("Publicidade", False, "Consta do texto original de 1988.")],
   "A eficiência foi o último princípio a entrar no LIMPE, com a EC 19/1998.")
me(F, "N0006", 1, "As funções de confiança, segundo o art. 37, V, da Constituição, são exercidas:",
   [("exclusivamente por servidores ocupantes de cargo efetivo", True, "Correta: literalidade do inciso V."),
    ("por qualquer pessoa, independentemente de vínculo", False, "Isso vale, com limites, para cargos em comissão."),
    ("preferencialmente por servidores de carreira", False, "O texto diz 'exclusivamente'."),
    ("por empregados públicos contratados sem concurso", False, "Não há essa previsão.")],
   "Função de confiança: exclusivamente servidor efetivo; cargo em comissão: qualquer pessoa, respeitado o percentual mínimo de servidores de carreira.", True)
me(F, "N0014", 1, "A publicidade dos atos, programas, obras, serviços e campanhas dos órgãos públicos deve ter caráter:",
   [("educativo, informativo ou de orientação social", True, "Correta: art. 37, § 1º."),
    ("promocional e eleitoral", False, "É exatamente o que o § 1º proíbe."),
    ("comercial, para financiar a obra", False, "Não há essa previsão."),
    ("pessoal, para identificar o gestor responsável", False, "Nomes, símbolos ou imagens de promoção pessoal são vedados.")],
   "O § 1º do art. 37 veda nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades ou servidores.")
me(F, "N0027", 1, "A distribuição de competências entre órgãos dentro da mesma pessoa jurídica, sem criação de nova pessoa, é chamada de:",
   [("desconcentração", True, "Correta: cria órgãos dentro da mesma pessoa, com hierarquia."),
    ("descentralização por outorga", False, "Cria (ou autoriza) outra pessoa jurídica."),
    ("descentralização por delegação", False, "Transfere a execução a um particular."),
    ("privatização", False, "Não é conceito de organização administrativa interna.")],
   "Desconcentração = dentro da mesma pessoa; descentralização = para outra pessoa.", True)

# ============================ MÉDIO ============================
ce(M, "N0032", 3, "A empresa pública deve, obrigatoriamente, ser constituída sob a forma de sociedade anônima.", False,
   "A empresa pública pode adotar qualquer forma admitida em direito. A forma de S/A é obrigatória para a sociedade de economia mista (Lei 13.303/2016, arts. 3º e 4º).", True)
ce(M, "N0028", 3, "Entre a União e as autarquias federais existe relação de hierarquia, o que permite ao Ministério rever livremente qualquer ato da autarquia.", False,
   "Entre o ente e a entidade há vinculação (controle finalístico ou supervisão), nos limites da lei — não hierarquia. O recurso hierárquico impróprio só cabe se a lei previr.")
ce(M, "N0047", 3, "O direito da Administração de anular atos administrativos de que decorram efeitos favoráveis para os destinatários decai em cinco anos, contados da data em que foram praticados, salvo comprovada má-fé.", True,
   "Literalidade do art. 54 da Lei 9.784/1999.", True)
ce(M, "N0052", 3, "É permitida a acumulação remunerada de um cargo de professor com outro técnico ou científico, desde que haja compatibilidade de horários.", True,
   "Art. 37, XVI, 'b', da CF, observado também o teto remuneratório (inciso XI).")
ce(M, "N0053", 3, "A nomeação de primo do prefeito para cargo em comissão na prefeitura configura, por si só, violação à Súmula Vinculante 13.", False,
   "A SV 13 alcança parentes até o 3º grau. Primo é colateral de 4º grau. Normas locais podem ser mais rígidas, mas a SV 13, por si só, não alcança o primo.")
ce(M, "N0043", 3, "Os princípios da razoabilidade e da proporcionalidade estão expressamente previstos no caput do art. 37 da Constituição Federal.", False,
   "O caput traz só o LIMPE. Razoabilidade e proporcionalidade são implícitas na CF e expressas na Lei 9.784/1999, art. 2º.", True)

me(M, "N0033", 3, "Sobre a sociedade de economia mista, assinale a alternativa correta.",
   [("Tem personalidade de direito privado, é constituída sob a forma de sociedade anônima e a maioria das ações com direito a voto pertence ao poder público.", True, "Correta: Lei 13.303/2016, art. 4º."),
    ("Tem capital integralmente público e pode adotar qualquer forma societária.", False, "Essa é a empresa pública."),
    ("É criada diretamente por lei, sem necessidade de registro.", False, "Sua criação é autorizada por lei; a personalidade nasce com o registro."),
    ("Tem personalidade de direito público e goza de imunidade tributária em qualquer atividade.", False, "É pessoa de direito privado."),
    ("Por ser estatal, está sujeita à falência como qualquer empresa.", False, "A Lei 11.101/2005, art. 2º, I, exclui empresas públicas e sociedades de economia mista.")],
   "SEM = direito privado, capital misto com controle público, sempre S/A, criação autorizada por lei.", True)
me(M, "N0046", 3, "Quanto à anulação e à revogação de atos administrativos, é correto afirmar:",
   [("O Poder Judiciário pode anular atos ilegais da Administração, mas não revogar atos válidos do Executivo por conveniência.", True, "Correta: o Judiciário controla a legalidade, não o mérito de outro Poder."),
    ("A revogação produz efeitos retroativos (ex tunc).", False, "A revogação produz efeitos ex nunc."),
    ("A anulação é uma faculdade; a revogação, um dever.", False, "É o contrário: a Administração deve anular e pode revogar (art. 53)."),
    ("Atos vinculados podem ser revogados a qualquer tempo.", False, "Atos vinculados são irrevogáveis: não há mérito a reavaliar.")],
   "Anulação: ilegalidade, ex tunc, Administração ou Judiciário. Revogação: mérito, ex nunc, só a Administração.", True)
me(M, "N0031", 3, "A respeito das fundações públicas, assinale a correta.",
   [("Podem ter personalidade jurídica de direito público ou de direito privado, conforme a lei e a atividade.", True, "Correta: posição majoritária e do STF (Tema 545)."),
    ("São sempre pessoas de direito privado, por determinação constitucional.", False, "A CF não impõe isso; existem fundações de direito público."),
    ("São criadas por lei complementar.", False, "A lei complementar só define as áreas de atuação (art. 37, XIX)."),
    ("Podem ter finalidade lucrativa.", False, "Fundações não têm fins lucrativos.")],
   "A fundação pública de direito público (fundação autárquica) é criada por lei; a de direito privado tem a criação autorizada por lei e depende de registro.")
me(M, "N0003", 3, "Sobre o acesso a cargos e empregos públicos, segundo o art. 37 da Constituição:",
   [("a investidura em cargo ou emprego público depende de aprovação prévia em concurso de provas ou de provas e títulos, ressalvados os cargos em comissão declarados em lei de livre nomeação e exoneração", True, "Correta: literalidade do inciso II."),
    ("o concurso pode ser apenas de títulos, se o cargo for de nível superior", False, "Não existe concurso só de títulos: provas ou provas e títulos."),
    ("o concurso só é exigido para cargos, não para empregos públicos", False, "O inciso II fala em 'cargo ou emprego'."),
    ("empresas públicas e sociedades de economia mista estão dispensadas do concurso", False, "Também se submetem ao inciso II.")],
   "Regra: concurso de provas ou provas e títulos para cargo ou emprego, na Direta e na Indireta.", True)
me(M, "N0050", 3, "Uma lei municipal cria cargos em comissão de 'técnico em contabilidade' para lançamentos contábeis rotineiros. À luz da Constituição e da jurisprudência do STF, essa criação é:",
   [("inválida, porque cargos em comissão destinam-se apenas a direção, chefia e assessoramento", True, "Correta: art. 37, V, e STF, Tema 1.010."),
    ("válida, porque cabe ao município decidir livremente sobre seus cargos", False, "A autonomia municipal não afasta o art. 37, V."),
    ("válida, desde que os ocupantes tenham formação em contabilidade", False, "A formação não transforma tarefa técnica rotineira em chefia."),
    ("inválida, porque cargos em comissão só podem ser ocupados por servidores efetivos", False, "Quem é exclusivo de efetivos é a função de confiança.")],
   "Atribuições técnicas, burocráticas ou operacionais exigem cargo efetivo provido por concurso.", kind="situacional")
me(M, "N0036", 3, "O secretário de administração altera critério de distribuição de vagas de estacionamento apenas para beneficiar o setor em que trabalha seu cunhado. O princípio mais diretamente violado é o da:",
   [("impessoalidade", True, "Correta: o ato favorece pessoa determinada, com desvio de finalidade."),
    ("eficiência", False, "Não há discussão sobre resultado ou uso de recursos."),
    ("publicidade", False, "O problema não é a falta de divulgação."),
    ("continuidade do serviço público", False, "Não houve interrupção de serviço.")],
   "Atos que favorecem ou perseguem pessoas determinadas violam a impessoalidade (e, em regra, a moralidade).", kind="situacional")

# ============================ DIFÍCIL ============================
ce(D, "N0012", 4, "Segundo o art. 37, XIX, da Constituição, cabe à lei complementar autorizar a instituição de empresa pública, de sociedade de economia mista e de fundação.", False,
   "A instituição é autorizada por lei específica (ordinária). A lei complementar, no caso das fundações, apenas define as áreas de sua atuação.", True)
ce(D, "N0057", 4, "Segundo o STF, o Estado responde objetivamente pela morte de detento quando descumpre o dever específico de proteção previsto no art. 5º, XLIX, da Constituição.", True,
   "STF, RE 841.526 (Tema 592): inobservado o dever específico de proteção, o Estado é responsável pela morte do detento.")
ce(D, "N0056", 4, "De acordo com o STF, a vítima de dano causado por agente público no exercício da função pode optar por ajuizar a ação diretamente contra o agente, sem incluir o Estado.", False,
   "STF, RE 1.027.633 (Tema 940): a ação deve ser ajuizada contra o Estado ou a prestadora de serviço público; o agente é parte ilegítima, assegurado o regresso nos casos de dolo ou culpa.")
ce(D, "N0016", 4, "Os atos de improbidade administrativa importarão a cassação dos direitos políticos, a perda da função pública, a indisponibilidade dos bens e o ressarcimento ao erário.", False,
   "O art. 37, § 4º, fala em SUSPENSÃO dos direitos políticos. A cassação é vedada pelo art. 15 da CF.")
ce(D, "N0011", 4, "A proibição de acumular cargos estende-se a empregos e funções e abrange autarquias, fundações, empresas públicas, sociedades de economia mista, suas subsidiárias e sociedades controladas, direta ou indiretamente, pelo poder público.", True,
   "Literalidade do art. 37, XVII, da CF.")
ce(D, "N0049", 4, "Segundo o STF, o candidato aprovado fora do número de vagas tem direito subjetivo à nomeação sempre que surgirem novas vagas durante o prazo de validade do concurso.", False,
   "STF, Tema 784: o surgimento de novas vagas ou a abertura de novo concurso não gera, por si só, direito à nomeação de quem está fora das vagas, salvo preterição arbitrária e imotivada. O direito subjetivo é de quem foi aprovado dentro das vagas (Tema 161).")

me(D, "N0047", 5, "Em 2018, foi concedida por erro de interpretação, sem fraude do beneficiário, uma vantagem pecuniária paga mensalmente a um servidor. Em 2025, a Administração identifica o erro. Considerando a Lei 9.784/1999, assinale a correta.",
   [("Operou-se a decadência do direito de anular, pois passaram mais de cinco anos desde a percepção do primeiro pagamento e não há má-fé.", True, "Correta: art. 54 e § 1º."),
    ("A Administração pode revogar o ato a qualquer tempo, por se tratar de ato ilegal.", False, "Ato ilegal é anulado, não revogado; e o prazo decadencial se aplica."),
    ("A anulação é sempre possível, pois ato ilegal não gera direitos.", False, "A Súmula 473 convive com o prazo decadencial do art. 54 para atos favoráveis de boa-fé."),
    ("O prazo de cinco anos conta da data em que a Administração descobriu o erro.", False, "Nos efeitos patrimoniais contínuos, conta da percepção do primeiro pagamento."),
    ("Basta à Administração suspender o pagamento, sem processo, por se tratar de autotutela.", False, "Além da decadência, atos com efeitos concretos exigem processo com contraditório (Tema 138).")],
   "O art. 54 protege a segurança jurídica: atos favoráveis, praticados sem má-fé, só podem ser anulados em cinco anos.", True, kind="situacional")
me(D, "N0033", 5, "Assinale a alternativa que apresenta diferença correta entre empresa pública e sociedade de economia mista federais.",
   [("A empresa pública federal tem suas causas, em regra, na Justiça Federal; a sociedade de economia mista federal, na Justiça Estadual.", True, "Correta: CF, art. 109, I, e Súmula 556 do STF (salvo intervenção da União — Súmula 517)."),
    ("Somente a sociedade de economia mista exige concurso público para seus empregados.", False, "Ambas exigem (art. 37, II)."),
    ("Somente a empresa pública tem personalidade de direito privado.", False, "Ambas têm personalidade de direito privado."),
    ("A sociedade de economia mista é criada por lei; a empresa pública, autorizada por lei.", False, "Ambas têm a criação autorizada por lei."),
    ("A empresa pública pode ter acionistas privados minoritários.", False, "Seu capital é integralmente público.")],
   "Diferenças centrais: capital (100% público × misto), forma (qualquer × S/A) e foro das federais (Justiça Federal × Estadual).")
me(D, "N0044", 4, "Assinale a alternativa que classifica corretamente o princípio quanto à sua fonte normativa.",
   [("Segurança jurídica: expresso na Lei 9.784/1999 e não no caput do art. 37 da CF.", True, "Correta: consta do art. 2º da Lei 9.784/1999."),
    ("Proporcionalidade: expresso no caput do art. 37 da CF.", False, "Não está no caput; é implícito na CF e expresso em lei."),
    ("Eficiência: previsto apenas na Lei 9.784/1999.", False, "Está no caput do art. 37 desde a EC 19/1998 (e também na lei)."),
    ("Supremacia do interesse público: expresso no caput do art. 37 da CF.", False, "É princípio implícito, de construção doutrinária."),
    ("Motivação: expresso no caput do art. 37 da CF.", False, "Está na Lei 9.784/1999 (arts. 2º e 50), não no caput.")],
   "Caput do art. 37: só o LIMPE. Lei 9.784/1999, art. 2º: legalidade, finalidade, motivação, razoabilidade, proporcionalidade, moralidade, ampla defesa, contraditório, segurança jurídica, interesse público e eficiência.")
me(D, "N0055", 4, "Durante uma tempestade de intensidade excepcional e imprevisível, uma árvore sadia, sob manutenção regular do Município, cai sobre um carro estacionado. À luz da teoria do risco administrativo:",
   [("o Município pode afastar sua responsabilidade demonstrando a força maior, que rompe o nexo causal", True, "Correta: o risco administrativo admite excludentes."),
    ("o Município responde sempre, pois a responsabilidade é objetiva e adota o risco integral", False, "O risco integral é exceção (ex.: dano nuclear)."),
    ("o proprietário deve provar a culpa do servidor responsável pela poda", False, "Na responsabilidade objetiva não se exige prova de culpa."),
    ("a ação deve ser proposta contra o servidor encarregado da manutenção", False, "Tema 940: a ação é contra o Município.")],
   "Responsabilidade objetiva não é automática: culpa exclusiva da vítima, caso fortuito/força maior e fato exclusivo de terceiro rompem o nexo.", kind="situacional")
me(D, "N0053", 5, "O prefeito nomeia o filho do presidente da Câmara Municipal para cargo em comissão na prefeitura, e o presidente da Câmara nomeia a filha do prefeito para cargo em comissão no Legislativo. Considerando a Súmula Vinculante 13:",
   [("há nepotismo cruzado, vedado pela súmula, que alcança o ajuste mediante designações recíprocas", True, "Correta: a SV 13 menciona expressamente as designações recíprocas."),
    ("não há nepotismo, porque cada autoridade nomeou parente de outra autoridade", False, "É justamente o nepotismo cruzado."),
    ("não há nepotismo, pois os Poderes são distintos", False, "A SV 13 alcança qualquer dos Poderes e o ajuste recíproco."),
    ("só haveria nepotismo se houvesse lei municipal proibindo", False, "A vedação decorre diretamente da Constituição (moralidade e impessoalidade).")],
   "A SV 13 veda nomeações de parentes até o 3º grau, inclusive mediante designações recíprocas, independentemente de lei.", True, kind="situacional")
me(D, "N0010", 4, "Assinale a hipótese de acumulação remunerada admitida pela Constituição, havendo compatibilidade de horários.",
   [("Dois cargos ou empregos privativos de profissionais de saúde, com profissões regulamentadas", True, "Correta: art. 37, XVI, 'c'."),
    ("Dois cargos técnicos ou científicos, sem relação com o magistério", False, "O XVI exige que um deles seja de professor."),
    ("Um cargo administrativo e um emprego em sociedade de economia mista", False, "A vedação alcança empregos na Indireta (XVII)."),
    ("Dois cargos em comissão em entes federativos diferentes", False, "Não está entre as exceções."),
    ("Qualquer acumulação, desde que a soma das remunerações respeite o teto", False, "O teto é requisito adicional, não autoriza acumulações fora das hipóteses.")],
   "Exceções do XVI: professor + professor; professor + técnico/científico; dois privativos de saúde — sempre com horários compatíveis e teto.")

json.dump(Q, open("conteudo-catalogo-adm/questoes.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
from collections import Counter
print(len(Q), Counter((q["level"], q["type"]) for q in Q))
