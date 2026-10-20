import json
from helpers import ME, CE, save_questions

F, M, D = "facil", "medio", "dificil"

# ============================================================ FÁCIL
ME(F, 1, "N0002", "NÃO é remédio constitucional previsto no art. 5º da Constituição Federal:",
   [("o habeas corpus.", "Errada: inciso LXVIII."),
    ("o mandado de injunção.", "Errada: inciso LXXI."),
    ("a ação civil pública.", "Correta: está no art. 129, III, como instrumento de tutela coletiva."),
    ("o habeas data.", "Errada: inciso LXXII."),
    ("a ação popular.", "Errada: inciso LXXIII.")],
   "C", "Os remédios do art. 5º são HC, MS (individual e coletivo), MI, HD e ação popular. A ACP é tutela coletiva prevista no art. 129, III.",
   "CF, art. 5º, LXVIII a LXXIII; art. 129, III.", "Incluir a ACP entre os remédios típicos.", "Seis remédios no art. 5º; a ACP fica fora.", essential=True)

ME(F, 1, "N0005", "O habeas corpus é cabível sempre que alguém sofrer ou se achar ameaçado de sofrer violência ou coação:",
   [("em seu direito líquido e certo, por ato de autoridade.", "Errada: hipótese de mandado de segurança."),
    ("em sua liberdade de locomoção, por ilegalidade ou abuso de poder.", "Correta: art. 5º, LXVIII."),
    ("em seu direito de acesso a dados pessoais.", "Errada: hipótese de habeas data."),
    ("em seu patrimônio, por ato lesivo da Administração.", "Errada: não é objeto do HC."),
    ("em seus direitos políticos, por decisão da Justiça Eleitoral.", "Errada.")],
   "B", "O HC protege exclusivamente a liberdade de locomoção.", "CF, art. 5º, LXVIII.",
   "Confundir HC com MS (A) e HD (C).", "HC = ir, vir e permanecer.", essential=True)

ME(F, 1, "N0013", "Nos termos da Lei 12.016/2009, o direito de requerer mandado de segurança extingue-se após:",
   [("30 dias da prática do ato.", "Errada."),
    ("60 dias da publicação do ato.", "Errada."),
    ("120 dias contados da ciência, pelo interessado, do ato impugnado.", "Correta: art. 23."),
    ("1 ano da prática do ato.", "Errada."),
    ("5 anos, por se tratar de ação contra a Fazenda Pública.", "Errada.")],
   "C", "Prazo decadencial de 120 dias, contados da ciência do ato (Súmula 632 do STF: constitucional).",
   "Lei 12.016/2009, art. 23; Súmula 632 do STF.", "Contar o prazo da prática do ato.", "120 dias da ciência.", essential=True)

ME(F, 1, "N0030", "É parte legítima para propor ação popular:",
   [("qualquer pessoa jurídica de direito privado.", "Errada: Súmula 365 do STF."),
    ("o Ministério Público, como autor originário.", "Errada: o MP acompanha e pode prosseguir."),
    ("qualquer cidadão.", "Correta: art. 5º, LXXIII."),
    ("o estrangeiro residente no Brasil.", "Errada: não é cidadão."),
    ("a Defensoria Pública.", "Errada.")],
   "C", "Só o cidadão (eleitor no gozo dos direitos políticos) propõe ação popular.",
   "CF, art. 5º, LXXIII; Súmula 365 do STF.", "Atribuir legitimidade a PJ, MP ou Defensoria.", "Ação POPULAR = cidadão do povo.", essential=True)

ME(F, 1, "N0026", "O habeas data é a ação adequada para:",
   [("obter cópia de contratos administrativos de uma prefeitura.", "Errada: informação pública geral (MS)."),
    ("assegurar o conhecimento de informações relativas à pessoa do impetrante, constantes de registros de entidades governamentais ou de caráter público.", "Correta: art. 5º, LXXII, a."),
    ("obter certidão para defesa de direitos.", "Errada: negativa de certidão → MS."),
    ("anular ato lesivo à moralidade administrativa.", "Errada: ação popular."),
    ("conhecer dados pessoais de outra pessoa.", "Errada: só do próprio impetrante.")],
   "B", "O HD serve para conhecer, retificar e anotar dados relativos à pessoa do impetrante.",
   "CF, art. 5º, LXXII; Lei 9.507/1997, art. 7º.", "Usar o HD para informação pública geral (A).", "HD = meus dados.")

ME(F, 2, "N0020", "O mandado de injunção é cabível quando:",
   [("houver lei inconstitucional que restrinja direitos.", "Errada: cabe ADI."),
    ("a falta de norma regulamentadora tornar inviável o exercício de direitos e liberdades constitucionais e das prerrogativas inerentes à nacionalidade, à soberania e à cidadania.", "Correta: art. 5º, LXXI."),
    ("houver ameaça à liberdade de locomoção.", "Errada: HC."),
    ("houver ato lesivo ao patrimônio público.", "Errada: ação popular."),
    ("a autoridade se recusar a fornecer informação pessoal.", "Errada: HD.")],
   "B", "O MI combate a omissão normativa que inviabiliza direitos.", "CF, art. 5º, LXXI; Lei 13.300/2016.",
   "Confundir omissão com inconstitucionalidade de lei existente (A).", "MI = falta lei.")

CE(F, 1, "N0008", "A impetração de habeas corpus dispensa a representação por advogado e é gratuita.", True,
   "O HC é gratuito (art. 5º, LXXVII) e pode ser impetrado por qualquer pessoa, sem capacidade postulatória (Lei 8.906/1994, art. 1º, § 1º).",
   "CF, art. 5º, LXXVII; Lei 8.906/1994.", "Nenhuma — item correto.")

CE(F, 1, "N0016", "O mandado de segurança coletivo pode ser impetrado por partido político com representação no Congresso Nacional.", True,
   "Art. 5º, LXX, a.", "CF, art. 5º, LXX.", "Nenhuma — mas lembre que o partido sem representação não pode.")

CE(F, 1, "N0031", "Na ação popular, o autor fica isento de custas judiciais e do ônus da sucumbência, salvo comprovada má-fé.", True,
   "Literalidade do art. 5º, LXXIII.", "CF, art. 5º, LXXIII.", "Nenhuma — item literal.")

CE(F, 1, "N0027", "O habeas data, assim como o habeas corpus, dispensa a presença de advogado.", False,
   "O HD é gratuito (LXXVII), mas exige capacidade postulatória. Só o HC dispensa advogado.",
   "CF, art. 5º, LXXVII; Lei 9.507/1997.", "Estender ao HD a dispensa de advogado própria do HC.")

# ============================================================ MÉDIO
ME(M, 2, "N0007", "Sobre a legitimidade no habeas corpus, assinale a correta.",
   [("A pessoa jurídica pode figurar como paciente, especialmente em crimes ambientais.", "Errada: o STF não admite."),
    ("Só o advogado pode impetrar habeas corpus em favor de terceiro.", "Errada: qualquer pessoa."),
    ("O habeas corpus pode ser impetrado contra ato de particular que restrinja ilegalmente a liberdade de locomoção.", "Correta."),
    ("O juiz pode impetrar habeas corpus no exercício da jurisdição.", "Errada: ele concede de ofício."),
    ("Impetrante e paciente devem ser sempre pessoas diferentes.", "Errada: pode ser em favor próprio.")],
   "C", "O HC cabe contra autoridade ou particular; o paciente é sempre pessoa física; qualquer pessoa impetra.",
   "CF, art. 5º, LXVIII; CPP, arts. 647 e 654.", "Admitir PJ como paciente (A).", "Paciente: só pessoa física.")

ME(M, 3, "N0009", "Segundo a Constituição e a jurisprudência do STF, NÃO cabe habeas corpus:",
   [("contra prisão preventiva sem fundamentação.", "Errada: cabe."),
    ("contra decisão condenatória exclusivamente à pena de multa.", "Correta: Súmula 693."),
    ("contra ato de particular que retém alguém ilegalmente.", "Errada: cabe."),
    ("para examinar a competência da autoridade que aplicou punição disciplinar militar.", "Errada: cabe para os pressupostos de legalidade."),
    ("preventivamente, diante de ameaça concreta de prisão ilegal.", "Errada: cabe HC preventivo.")],
   "B", "Súmula 693: não cabe HC contra condenação a pena de multa ou processo cuja única pena seja pecuniária.",
   "CF, art. 142, § 2º; Súmulas 693, 694 e 695 do STF.", "Ler a vedação do art. 142, § 2º, como absoluta (D).", "Sem risco à locomoção, sem HC.")

ME(M, 2, "N0011", "Acerca do direito líquido e certo no mandado de segurança, assinale a correta.",
   [("Exige que a questão jurídica seja simples e pacífica.", "Errada: Súmula 625."),
    ("Admite ampla produção de prova testemunhal e pericial.", "Errada: exige prova pré-constituída."),
    ("Significa que os fatos devem ser comprovados de plano, por prova documental pré-constituída, e a controvérsia sobre matéria de direito não impede a concessão.", "Correta."),
    ("Dispensa a juntada de documentos, que podem ser requisitados ao final do processo.", "Errada."),
    ("Só existe quando o direito está previsto expressamente na Constituição.", "Errada.")],
   "C", "Liquidez e certeza referem-se aos fatos, comprovados por documentos com a inicial; questões de direito podem ser complexas.",
   "CF, art. 5º, LXIX; Súmula 625 do STF; Lei 12.016/2009, art. 6º.", "Confundir complexidade jurídica com falta de liquidez (A).", "Líquido e certo = fatos provados por documento.")

ME(M, 2, "N0014", "NÃO cabe mandado de segurança, segundo a Lei 12.016/2009 e as súmulas do STF:",
   [("contra omissão de autoridade em nomear aprovado dentro das vagas.", "Errada: cabe."),
    ("contra lei em tese.", "Correta: Súmula 266."),
    ("contra ato de diretor de universidade privada que nega matrícula ilegalmente.", "Errada: exerce atribuição delegada do Poder Público."),
    ("contra ato administrativo do qual caiba recurso sem efeito suspensivo.", "Errada: a vedação é para recurso COM efeito suspensivo, independentemente de caução."),
    ("contra ato de autoridade estadual.", "Errada.")],
   "B", "Não cabe MS contra lei em tese (salvo leis de efeitos concretos), contra decisão transitada em julgado, contra decisão recorrível com efeito suspensivo, entre outras hipóteses.",
   "Lei 12.016/2009, arts. 1º e 5º; Súmulas 266, 267 e 268 do STF.", "Inverter a regra do recurso administrativo (D).", "Lei em tese não fere direito concreto.")

ME(M, 3, "N0017", "Sobre o mandado de segurança coletivo, assinale a correta.",
   [("A associação pode impetrá-lo independentemente do tempo de funcionamento.", "Errada: exige 1 ano."),
    ("A impetração por entidade de classe depende de autorização expressa dos associados.", "Errada: Súmula 629."),
    ("A entidade de classe tem legitimação ainda que a pretensão interesse apenas a uma parte da categoria, dispensada a autorização dos associados.", "Correta: Súmulas 629 e 630."),
    ("Tutela exclusivamente direitos difusos.", "Errada: a lei menciona coletivos e individuais homogêneos."),
    ("Induz litispendência em relação aos mandados de segurança individuais.", "Errada: art. 22, § 1º.")],
   "C", "No MS coletivo há substituição processual: dispensa autorização e admite defesa de parte da categoria.",
   "CF, art. 5º, LXX; Lei 12.016/2009, arts. 21 e 22; Súmulas 629 e 630 do STF.", "Exigir autorização (B) ou incluir só difusos (D).", "Substituição dispensa autorização.")

ME(M, 3, "N0022", "Segundo a Lei 13.300/2016, reconhecido o estado de mora legislativa no mandado de injunção, será deferida a injunção para:",
   [("declarar a mora e apenas comunicá-la ao Poder omisso, sem outras consequências.", "Errada: posição não concretista, superada."),
    ("editar a lei faltante, com força de lei ordinária.", "Errada: o Judiciário não edita lei."),
    ("determinar prazo razoável para a edição da norma e estabelecer as condições de exercício do direito, caso a mora não seja suprida nesse prazo.", "Correta: art. 8º."),
    ("condenar o Congresso Nacional a pagar indenização ao impetrante.", "Errada."),
    ("anular as leis que tratem do tema de forma insuficiente.", "Errada.")],
   "C", "A Lei 13.300/2016 adotou o modelo concretista intermediário: prazo para legislar e, se não suprida a mora, condições para o exercício do direito.",
   "Lei 13.300/2016, art. 8º.", "Repetir a posição não concretista (A).", "Prazo + condições.")

ME(M, 2, "N0029", "A ação popular visa anular ato lesivo:",
   [("apenas ao patrimônio público em sentido econômico.", "Errada: incompleto."),
    ("ao patrimônio público ou de entidade de que o Estado participe, à moralidade administrativa, ao meio ambiente e ao patrimônio histórico e cultural.", "Correta: art. 5º, LXXIII."),
    ("a direitos individuais homogêneos dos consumidores.", "Errada: objeto típico da ACP."),
    ("à liberdade de locomoção de grupos.", "Errada: HC coletivo."),
    ("a dados pessoais de cidadãos.", "Errada.")],
   "B", "O art. 5º, LXXIII lista patrimônio público, moralidade administrativa, meio ambiente e patrimônio histórico e cultural.",
   "CF, art. 5º, LXXIII.", "Restringir ao patrimônio econômico (A).", "Macete PAMOMEHI.")

CE(M, 2, "N0006", "O habeas corpus preventivo é cabível quando há ameaça concreta de violência ou coação ilegal à liberdade de locomoção, e sua concessão resulta na expedição de salvo-conduto.", True,
   "No HC preventivo, diante de ameaça, expede-se salvo-conduto; no repressivo, alvará de soltura.",
   "CF, art. 5º, LXVIII; CPP, art. 660, § 4º.", "Nenhuma — item correto.")

CE(M, 2, "N0012", "Não cabe mandado de segurança contra atos de gestão comercial praticados pelos administradores de empresas públicas, de sociedades de economia mista e de concessionárias de serviço público.", True,
   "Literalidade do art. 1º, § 2º, da Lei 12.016/2009.", "Lei 12.016/2009, art. 1º, § 2º.", "Nenhuma — item literal.")

CE(M, 3, "N0028", "Negado o pedido administrativo de acesso a informações sobre os gastos de publicidade de uma secretaria estadual, o cidadão deve impetrar habeas data.", False,
   "Informações públicas de interesse coletivo ou geral (art. 5º, XXXIII; Lei 12.527/2011) se protegem por mandado de segurança. O HD é para dados relativos ao próprio impetrante.",
   "CF, art. 5º, XXXIII, LXIX e LXXII.", "Usar o HD para informação pública geral.")

CE(M, 2, "N0034", "A ação civil pública pode ser proposta pelo Ministério Público, pela Defensoria Pública, pelos entes federativos, por entidades da administração indireta e por associações constituídas há pelo menos um ano com finalidade relacionada ao bem protegido.", True,
   "Rol do art. 5º da Lei 7.347/1985; a Defensoria teve a legitimidade confirmada pelo STF (ADI 3.943).",
   "Lei 7.347/1985, art. 5º; STF, ADI 3.943.", "Nenhuma — mas lembre que o cidadão não propõe ACP.")

# ============================================================ DIFÍCIL
ME(D, 4, "N0013", "Em 10/03/2026, Carla tomou ciência de ato ilegal do Secretário de Saúde que a excluiu de programa de residência. Em 15/03/2026, apresentou pedido de reconsideração, negado em 20/05/2026. Em 30/07/2026, impetrou mandado de segurança. Assinale a correta.",
   [("O mandado de segurança é tempestivo, pois o pedido de reconsideração interrompeu o prazo, que recomeçou em 20/05/2026.", "Errada: Súmula 430."),
    ("O mandado de segurança é intempestivo: o prazo de 120 dias, contado da ciência em 10/03/2026, não se interrompe com o pedido de reconsideração e se esgotou antes de 30/07/2026.", "Correta."),
    ("O mandado de segurança é tempestivo, pois o prazo só corre após o esgotamento da via administrativa.", "Errada: não se exige esgotamento."),
    ("Não há prazo para o mandado de segurança contra ato de autoridade de saúde.", "Errada."),
    ("O prazo é prescricional e foi suspenso durante a análise do pedido.", "Errada: é decadencial.")],
   "B", "O prazo de 120 dias conta da ciência do ato (10/03/2026) e terminou em 08/07/2026; o pedido de reconsideração não o interrompe (Súmula 430 do STF).",
   "Lei 12.016/2009, art. 23; Súmulas 430 e 632 do STF.", "Admitir interrupção pelo pedido de reconsideração (A).", "Conte os 120 dias a partir da ciência, sem pausas.")

ME(D, 4, "N0018", "O Sindicato X impetra mandado de segurança coletivo contra ato que suprimiu gratificação de toda a categoria. Antes, o servidor João já havia impetrado mandado de segurança individual com o mesmo objeto. Segundo a Lei 12.016/2009:",
   [("o MS coletivo induz litispendência e extingue o MS individual de João.", "Errada: não induz litispendência."),
    ("João será automaticamente beneficiado pela decisão coletiva, mesmo mantendo seu MS individual.", "Errada: precisa desistir em 30 dias."),
    ("o MS coletivo não induz litispendência para as ações individuais, mas os efeitos da coisa julgada não beneficiarão João se ele não requerer a desistência de seu MS individual em 30 dias da ciência comprovada da impetração coletiva.", "Correta: art. 22, § 1º."),
    ("João deve aderir ao MS coletivo como litisconsorte, sob pena de extinção.", "Errada."),
    ("o sindicato só pode impetrar com autorização expressa de João.", "Errada: Súmula 629.")],
   "C", "Art. 22, § 1º, da Lei 12.016/2009: sem litispendência, mas o impetrante individual só aproveita a coisa julgada coletiva se desistir em 30 dias.",
   "Lei 12.016/2009, art. 22; Súmula 629 do STF.", "Supor benefício automático (B).", "Coletivo + individual: desista em 30 dias para aproveitar.")

ME(D, 4, "N0024", "Sobre o mandado de injunção e a ação direta de inconstitucionalidade por omissão, assinale a correta.",
   [("Ambos são instrumentos de controle abstrato, com os mesmos legitimados do art. 103.", "Errada: o MI é controle concreto."),
    ("O mandado de injunção pode ser impetrado por qualquer titular do direito inviabilizado, enquanto a ADO só pelos legitimados do art. 103; na ADO, declarada a omissão de órgão administrativo, este deve adotar as providências em 30 dias.", "Correta."),
    ("A decisão no mandado de injunção tem sempre eficácia erga omnes.", "Errada: regra inter partes."),
    ("Na ADO, o STF pode editar a norma faltante.", "Errada."),
    ("O mandado de injunção cabe contra particulares que se omitam.", "Errada: o polo passivo é o órgão com atribuição para editar a norma.")],
   "B", "O MI é controle concreto, aberto ao titular do direito; a ADO é controle abstrato, restrita ao art. 103, com ciência ao Poder omisso e prazo de 30 dias para órgão administrativo.",
   "CF, arts. 5º, LXXI, e 103, § 2º; Lei 13.300/2016.", "Igualar legitimados e efeitos (A, C).", "MI: meu direito. ADO: a ordem constitucional.")

ME(D, 4, "N0023", "São legitimados para o mandado de injunção coletivo, segundo a Lei 13.300/2016:",
   [("apenas partidos políticos com representação no Congresso Nacional e associações.", "Errada: incompleto."),
    ("o Ministério Público, partido político com representação no Congresso Nacional, organização sindical, entidade de classe ou associação em funcionamento há pelo menos um ano, e a Defensoria Pública.", "Correta: art. 12."),
    ("qualquer cidadão, por analogia com a ação popular.", "Errada."),
    ("os mesmos legitimados do art. 103 da Constituição.", "Errada: esses são da ADO."),
    ("apenas o Ministério Público e a Defensoria Pública.", "Errada.")],
   "B", "O art. 12 da Lei 13.300/2016 inclui MP e Defensoria, ao contrário do MS coletivo.",
   "Lei 13.300/2016, art. 12.", "Copiar o rol do MS coletivo (A).", "MI coletivo = rol do MS coletivo + MP + Defensoria.")

ME(D, 4, "N0032", "Sobre a sentença e a coisa julgada na ação popular, assinale a correta.",
   [("A sentença de procedência está sujeita ao reexame necessário.", "Errada: é a de carência ou improcedência."),
    ("A improcedência por deficiência de prova faz coisa julgada erga omnes, impedindo nova ação.", "Errada: exceção do art. 18."),
    ("A sentença faz coisa julgada erga omnes, salvo improcedência por deficiência de prova, hipótese em que qualquer cidadão pode intentar outra ação com idêntico fundamento, valendo-se de nova prova.", "Correta: Lei 4.717/1965, art. 18."),
    ("O autor vencido é sempre condenado ao décuplo das custas.", "Errada: só se a ação for temerária ou de má-fé."),
    ("A ação popular contra ato do Presidente da República é julgada originariamente pelo STF.", "Errada: primeiro grau.")],
   "C", "Coisa julgada secundum eventum probationis: a improcedência por falta de prova não impede nova ação com nova prova.",
   "Lei 4.717/1965, arts. 13, 18 e 19.", "Inverter o reexame necessário (A).", "Na popular, protege-se o interesse público: reexame da derrota do autor.")

ME(D, 3, "N0027", "Mário pediu ao órgão estadual de trânsito acesso às informações sobre ele constantes do sistema de infrações. Passados 12 dias sem resposta, impetrou habeas data. Assinale a correta.",
   [("O HD é incabível, pois Mário deveria aguardar a resposta por 30 dias.", "Errada: no pedido de acesso, bastam mais de 10 dias."),
    ("O HD é cabível, pois o decurso de mais de 10 dias sem decisão sobre o pedido de acesso equivale à recusa exigida pela lei.", "Correta: Lei 9.507/1997, art. 8º, parágrafo único, I."),
    ("O HD é incabível, pois exige recusa expressa e fundamentada.", "Errada: o silêncio por mais de 10 dias basta."),
    ("O HD é cabível independentemente de qualquer pedido administrativo.", "Errada: Súmula 2 do STJ."),
    ("O instrumento correto seria o mandado de segurança.", "Errada: trata-se de dados do próprio impetrante.")],
   "B", "Para o acesso, a lei admite a recusa ou o decurso de mais de 10 dias sem decisão; para retificação e anotação, mais de 15 dias.",
   "Lei 9.507/1997, art. 8º, parágrafo único; Súmula 2 do STJ.", "Exigir recusa expressa (C) ou dispensar o pedido (D).", "10-15-15.")

ME(D, 4, "N0035", "Sobre a ação popular, a ação civil pública e o mandado de segurança coletivo, assinale a correta.",
   [("O cidadão pode propor as três ações, desde que comprove a cidadania.", "Errada: só a popular."),
    ("O Ministério Público é legitimado para a ação civil pública, acompanha a ação popular e pode prosseguir nela se o autor desistir, mas não figura entre os legitimados constitucionais do mandado de segurança coletivo.", "Correta."),
    ("A ação civil pública é remédio constitucional previsto no art. 5º.", "Errada."),
    ("A associação precisa de autorização expressa dos associados para impetrar MS coletivo.", "Errada: Súmula 629."),
    ("Nas três ações, exige-se prova pré-constituída.", "Errada: só no MS.")],
   "B", "Cada instrumento tem legitimados próprios: cidadão (popular); MP e outros (ACP); partido, sindicato, entidade e associação (MS coletivo).",
   "CF, art. 5º, LXX e LXXIII; art. 129, III; Leis 4.717/1965 e 7.347/1985.", "Uniformizar a legitimidade (A).", "Monte a tabela 'quem propõe o quê'.")

CE(D, 4, "N0009", "Em razão do art. 142, § 2º, da Constituição, segundo o STF, não cabe habeas corpus para examinar sequer a competência da autoridade que aplicou punição disciplinar militar.", False,
   "O STF entende que a vedação alcança o mérito da punição; cabe HC para examinar os pressupostos de legalidade, como hierarquia, competência/poder disciplinar, ato ligado à função e pena cabível.",
   "CF, art. 142, § 2º; jurisprudência do STF.", "Ler a vedação como absoluta.")

CE(D, 4, "N0014", "Segundo o STF, é constitucional a norma da Lei 12.016/2009 que veda a concessão de liminar em mandado de segurança que tenha por objeto a concessão de aumento ou a extensão de vantagens a servidores públicos.", False,
   "Na ADI 4.296 (2021), o STF declarou inconstitucional a vedação genérica de liminares do art. 7º, § 2º, da Lei 12.016/2009.",
   "Lei 12.016/2009, art. 7º, § 2º; STF, ADI 4.296.", "Desconhecer a decisão da ADI 4.296.")

CE(D, 4, "N0030", "Segundo o STF, não é condição para a propositura de ação popular a demonstração de prejuízo material aos cofres públicos, bastando a lesão à moralidade administrativa.", True,
   "Tema 836 de repercussão geral (ARE 824.781, 2015).", "CF, art. 5º, LXXIII; STF, Tema 836.", "Nenhuma — item correto.")

CE(D, 4, "N0022", "Pela Lei 13.300/2016, a decisão em mandado de injunção terá, em regra, eficácia limitada às partes, podendo ser conferida eficácia ultra partes ou erga omnes quando isso for inerente ou indispensável ao exercício do direito objeto da impetração.", True,
   "É o art. 9º, caput e § 1º, da Lei 13.300/2016.", "Lei 13.300/2016, art. 9º.", "Nenhuma — item correto.")

keys = {n["key"] for n in json.load(open("nodes.json", encoding="utf8"))["nodes"]}
save_questions(keys=keys)
