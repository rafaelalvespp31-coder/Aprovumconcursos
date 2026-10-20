import json
from helpers import ME, CE, save_questions

F, M, D = "facil", "medio", "dificil"

# ============================================================ FÁCIL
ME(F, 1, "N0015", "Nos termos da Constituição, é cargo privativo de brasileiro nato o de:",
   [("Senador da República.", "Errada: naturalizado pode ser senador."),
    ("Ministro do Superior Tribunal de Justiça.", "Errada: não consta do § 3º."),
    ("Ministro de Estado da Defesa.", "Correta: art. 12, § 3º, VII (EC 23/1999)."),
    ("Governador de Estado.", "Errada: não é privativo de nato."),
    ("Procurador-Geral da República.", "Errada: não é privativo de nato.")],
   "C", "O § 3º lista: Presidente e Vice, Presidentes da Câmara e do Senado, Ministro do STF, carreira diplomática, oficial das Forças Armadas e Ministro da Defesa.",
   "CF, art. 12, § 3º.", "Incluir cargos de destaque que não estão no rol (A, B, D, E).", "Macete MP3.COM.", essential=True)

ME(F, 1, "N0022", "O alistamento eleitoral e o voto são facultativos para:",
   [("os maiores de 65 anos.", "Errada: o limite é 70 anos."),
    ("os analfabetos, os maiores de 70 anos e os maiores de 16 e menores de 18 anos.", "Correta: art. 14, § 1º, II."),
    ("os conscritos durante o serviço militar obrigatório.", "Errada: são inalistáveis."),
    ("os estrangeiros residentes há mais de 15 anos.", "Errada: estrangeiros são inalistáveis."),
    ("os maiores de 18 e menores de 21 anos.", "Errada: para eles, o voto é obrigatório.")],
   "B", "Facultativos: analfabetos, maiores de 70 anos e maiores de 16 e menores de 18 anos.",
   "CF, art. 14, §§ 1º e 2º.", "Trocar 70 por 65 (A).", "Macete A-70-16.", essential=True)

ME(F, 1, "N0024", "A idade mínima constitucional para concorrer ao cargo de Senador é de:",
   [("18 anos.", "Errada: idade do vereador."),
    ("21 anos.", "Errada: idade de deputados e prefeito."),
    ("30 anos.", "Errada: idade do governador."),
    ("35 anos.", "Correta: igual à do Presidente."),
    ("40 anos.", "Errada: não há essa idade.")],
   "D", "35 anos: Presidente, Vice-Presidente e Senador.", "CF, art. 14, § 3º, VI, a.",
   "Associar senador à idade do governador (C).", "35-30-21-18.", essential=True)

ME(F, 1, "N0021", "A consulta popular convocada antes da edição de um ato legislativo ou administrativo, para que o povo aprove ou rejeite a matéria, denomina-se:",
   [("referendo.", "Errada: o referendo é posterior ao ato."),
    ("plebiscito.", "Correta: consulta prévia."),
    ("iniciativa popular.", "Errada: o povo propõe um projeto."),
    ("ação popular.", "Errada: é ação judicial."),
    ("veto popular.", "Errada: não existe na CF.")],
   "B", "Plebiscito é prévio; referendo é posterior.", "CF, art. 14, I e II; Lei 9.709/1998.",
   "Trocar plebiscito por referendo (A).", "PLE = PRÉvia; REF = REFerenda depois.")

ME(F, 1, "N0018", "Segundo o art. 13 da Constituição, são símbolos da República Federativa do Brasil:",
   [("a bandeira, o hino, as armas e o selo nacionais.", "Correta: § 1º."),
    ("a bandeira, o hino, a moeda e o brasão.", "Errada: moeda não é símbolo."),
    ("a bandeira e o hino, apenas.", "Errada: incompleto."),
    ("a bandeira, o hino, as armas e a língua portuguesa.", "Errada: a língua é o idioma oficial, não símbolo."),
    ("a bandeira, o hino e a Constituição.", "Errada.")],
   "A", "Bandeira, hino, armas e selo nacionais; Estados, DF e Municípios podem ter símbolos próprios.",
   "CF, art. 13.", "Trocar o selo pela moeda (B).", "Macete BHAS.")

ME(F, 2, "N0034", "Nos termos do art. 15 da Constituição, a cassação de direitos políticos:",
   [("é admitida em caso de improbidade administrativa.", "Errada: improbidade gera suspensão; cassação é vedada."),
    ("é vedada, admitindo-se apenas perda ou suspensão nas hipóteses constitucionais.", "Correta: caput do art. 15."),
    ("é admitida por decreto do Presidente da República em caso de grave ameaça à ordem pública.", "Errada: isso remete ao regime de 1964, vedado hoje."),
    ("é admitida por decisão da Justiça Eleitoral em qualquer crime eleitoral.", "Errada."),
    ("é admitida após três ausências consecutivas às eleições.", "Errada: a consequência é cancelamento do título, por lei.")],
   "B", "A Constituição veda a cassação; perda e suspensão só nas hipóteses do art. 15.",
   "CF, art. 15.", "Tratar suspensão como cassação (A).", "Cassação = vedada.")

CE(F, 1, "N0006", "É brasileiro nato o nascido na República Federativa do Brasil, ainda que de pais estrangeiros, desde que estes não estejam a serviço de seu país.", True,
   "Literalidade do art. 12, I, a (critério ius soli com exceção).", "CF, art. 12, I, a.", "Nenhuma — item literal.")

CE(F, 1, "N0026", "O analfabeto pode alistar-se como eleitor e votar, mas é inelegível.", True,
   "O alistamento e o voto são facultativos ao analfabeto (art. 14, § 1º, II, a), mas ele é inelegível (§ 4º).",
   "CF, art. 14, §§ 1º e 4º.", "Nenhuma — mas a banca costuma dizer que o analfabeto não vota.")

CE(F, 2, "N0035", "A lei que alterar o processo eleitoral entrará em vigor um ano após a data de sua publicação.", False,
   "A lei entra em vigor na data da publicação; apenas não se aplica à eleição que ocorra até um ano da data de sua vigência.",
   "CF, art. 16.", "Confundir vigência com aplicação.")

CE(F, 1, "N0032", "O mandato eletivo poderá ser impugnado ante a Justiça Eleitoral no prazo de quinze dias contados da diplomação, instruída a ação com provas de abuso do poder econômico, corrupção ou fraude.", True,
   "É o art. 14, § 10; a ação tramita em segredo de justiça (§ 11).", "CF, art. 14, §§ 10 e 11.", "Nenhuma — item literal.")

# ============================================================ MÉDIO
ME(M, 2, "N0008", "Laura nasceu em Buenos Aires, filha de pai brasileiro e mãe argentina, sem que nenhum deles estivesse a serviço do Brasil. Foi registrada no consulado brasileiro. Nos termos da Constituição, Laura é:",
   [("estrangeira, podendo naturalizar-se após 15 anos de residência.", "Errada: o registro gera nacionalidade nata."),
    ("brasileira naturalizada, desde o registro.", "Errada: alínea c trata de nato."),
    ("brasileira nata, em razão do registro em repartição brasileira competente.", "Correta: art. 12, I, c (EC 54/2007)."),
    ("brasileira nata somente se vier a residir no Brasil e optar pela nacionalidade.", "Errada: com o registro, a opção é desnecessária."),
    ("apátrida, até completar 18 anos.", "Errada.")],
   "C", "Pela EC 54/2007, o registro em repartição brasileira competente torna nato o filho de pai ou mãe brasileiros nascido no exterior.",
   "CF, art. 12, I, c.", "Exigir a opção mesmo com registro (D).", "Registro OU residência + opção.")

ME(M, 2, "N0010", "Um cidadão angolano reside no Brasil há um ano ininterrupto e tem idoneidade moral. De acordo com a Constituição:",
   [("ele já é brasileiro nato.", "Errada: nacionalidade derivada."),
    ("ele preenche os requisitos constitucionais da naturalização ordinária para originários de países de língua portuguesa.", "Correta: art. 12, II, a."),
    ("ele só poderá se naturalizar após 15 anos de residência.", "Errada: esse é o prazo da extraordinária para qualquer estrangeiro."),
    ("ele recebe automaticamente os direitos do português equiparado.", "Errada: o § 1º é só para portugueses."),
    ("ele tem direito subjetivo à naturalização, que não pode ser negada.", "Errada: a ordinária é discricionária.")],
   "B", "Aos originários de países de língua portuguesa exigem-se apenas residência por um ano ininterrupto e idoneidade moral.",
   "CF, art. 12, II, a, e § 1º.", "Estender o § 1º a todos os lusófonos (D).", "Lusófono: 1 ano + idoneidade.")

ME(M, 3, "N0017", "Após a EC 131/2023, será declarada a perda da nacionalidade do brasileiro que:",
   [("adquirir outra nacionalidade, por naturalização voluntária.", "Errada: hipótese suprimida pela EC 131/2023."),
    ("exercer atividade nociva ao interesse nacional, por decisão administrativa.", "Errada: redação antiga e, ainda assim, exigia sentença."),
    ("fizer pedido expresso de perda perante autoridade brasileira competente, ressalvadas situações que acarretem apatridia.", "Correta: art. 12, § 4º, II."),
    ("residir no exterior por mais de 10 anos.", "Errada: não há essa hipótese."),
    ("for condenado por crime hediondo.", "Errada.")],
   "C", "A perda hoje decorre de cancelamento judicial da naturalização (fraude ou atentado à ordem constitucional) ou de pedido expresso, salvo apatridia.",
   "CF, art. 12, §§ 4º e 5º (EC 131/2023).", "Usar a redação anterior à emenda (A, B).", "Atenção à data da emenda.", essential=True)

ME(M, 2, "N0029", "O prefeito de Uberlândia está em seu primeiro mandato. Sua filha, que nunca exerceu mandato, pretende concorrer a vereadora em Uberlândia, e seu irmão, a deputado federal por Minas Gerais. Sobre a situação:",
   [("ambos são inelegíveis, pois a inelegibilidade reflexa alcança qualquer cargo em qualquer lugar.", "Errada: alcança o território de jurisdição do titular."),
    ("a filha é inelegível em Uberlândia; o irmão pode concorrer a deputado federal, pois a eleição não se restringe ao território de jurisdição do prefeito.", "Correta: § 7º e jurisprudência do TSE."),
    ("a filha pode concorrer, pois é parente de primeiro grau.", "Errada: alcança até o segundo grau."),
    ("ambos podem concorrer, pois o prefeito ainda pode se reeleger.", "Errada: a possibilidade de reeleição não afasta a inelegibilidade."),
    ("o irmão é inelegível, pois é parente colateral.", "Errada: a circunscrição da eleição de deputado federal é o Estado, mais ampla que o Município.")],
   "B", "A inelegibilidade reflexa atinge cônjuge e parentes até o 2º grau no território de jurisdição do titular; o TSE entende que não alcança candidatura em circunscrição mais ampla, como a estadual.",
   "CF, art. 14, § 7º; jurisprudência do TSE.", "Ignorar o critério territorial (A).", "Pergunte: o cargo disputado é na jurisdição do titular?")

ME(M, 2, "N0028", "O governador de um Estado, no segundo ano de seu primeiro mandato, pretende concorrer ao Senado nas próximas eleições. Para isso, segundo a Constituição, deve:",
   [("licenciar-se do cargo até três meses antes do pleito.", "Errada: exige renúncia, 6 meses antes."),
    ("renunciar ao mandato até seis meses antes do pleito.", "Correta: art. 14, § 6º."),
    ("permanecer no cargo, pois o afastamento só é exigido para a reeleição.", "Errada: inverte a regra."),
    ("obter autorização da Assembleia Legislativa.", "Errada."),
    ("renunciar até um ano antes do pleito.", "Errada: o prazo é de 6 meses.")],
   "B", "Chefes do Executivo devem renunciar até seis meses antes para concorrer a outros cargos; para a reeleição, não precisam se afastar.",
   "CF, art. 14, §§ 5º e 6º.", "Inverter reeleição e outros cargos (C).", "Outro cargo = renúncia 6 meses antes.")

ME(M, 2, "N0037", "Sobre os partidos políticos, nos termos do art. 17 da Constituição, assinale a correta.",
   [("Os partidos podem ter caráter regional, desde que registrados no TRE.", "Errada: caráter nacional."),
    ("É livre a criação de partidos, observados o caráter nacional, a proibição de recursos de entidades ou governos estrangeiros, a prestação de contas à Justiça Eleitoral e o funcionamento parlamentar de acordo com a lei.", "Correta: caput e incisos."),
    ("Os partidos adquirem personalidade jurídica com o registro do estatuto no TSE.", "Errada: personalidade pela lei civil; depois registram o estatuto no TSE."),
    ("Os partidos podem manter organização paramilitar para segurança de seus filiados.", "Errada: vedado (§ 4º)."),
    ("Os partidos são pessoas jurídicas de direito público interno.", "Errada: direito privado.")],
   "B", "O art. 17 garante a liberdade partidária, com os preceitos dos incisos I a IV.",
   "CF, art. 17, caput, §§ 2º e 4º.", "Confundir personalidade jurídica com registro no TSE (C).", "Macete NA-ES-CO-FU.")

ME(M, 3, "N0034", "Em relação às hipóteses do art. 15 da Constituição, segundo a doutrina majoritária e a jurisprudência, assinale a correta.",
   [("A condenação por improbidade administrativa gera a perda definitiva dos direitos políticos.", "Errada: gera suspensão."),
    ("A suspensão dos direitos políticos por condenação criminal depende de declaração expressa na sentença.", "Errada: é efeito automático."),
    ("A suspensão por condenação criminal ocorre também quando a pena privativa de liberdade é substituída por restritiva de direitos, e cessa com o cumprimento ou a extinção da pena, independentemente de reabilitação.", "Correta: Tema 370 do STF; Súmula 9 do TSE."),
    ("O cancelamento da naturalização gera suspensão dos direitos políticos.", "Errada: gera perda."),
    ("A pessoa com deficiência sob curatela tem seus direitos políticos suspensos.", "Errada: Lei 13.146/2015.")],
   "C", "Condenação criminal transitada em julgado suspende os direitos políticos enquanto durarem seus efeitos, mesmo com pena substituída; cessa sem necessidade de reabilitação.",
   "CF, art. 15; STF, Tema 370; Súmula 9 do TSE; Lei 13.146/2015.", "Confundir perda com suspensão (A, D).", "CaRe = perda; o resto = suspensão.")

CE(M, 2, "N0012", "Aos portugueses com residência permanente no País, se houver reciprocidade em favor de brasileiros, serão atribuídos os direitos inerentes ao brasileiro, inclusive o de ocupar o cargo de Presidente da Câmara dos Deputados.", False,
   "O § 1º ressalva os casos previstos na Constituição: o português equiparado recebe direitos de brasileiro naturalizado, não os cargos privativos de nato.",
   "CF, art. 12, §§ 1º e 3º.", "Equiparar o português ao brasileiro nato.")

CE(M, 2, "N0014", "Lei ordinária federal pode estabelecer distinções entre brasileiros natos e naturalizados para o ingresso em carreiras policiais, por razões de segurança nacional.", False,
   "O art. 12, § 2º, proíbe a lei de distinguir natos e naturalizados, salvo nos casos previstos na própria Constituição.",
   "CF, art. 12, § 2º.", "Admitir distinções por lei.")

CE(M, 2, "N0030", "O militar alistável que contar mais de dez anos de serviço, para concorrer, deverá afastar-se da atividade; se contar menos de dez anos, será agregado pela autoridade superior.", False,
   "O item inverte as regras: com menos de 10 anos, afasta-se da atividade; com mais de 10, é agregado e, se eleito, passa à inatividade na diplomação.",
   "CF, art. 14, § 8º.", "Inversão das hipóteses.")

CE(M, 2, "N0039", "Os partidos políticos, após adquirirem personalidade jurídica na forma da lei civil, registrarão seus estatutos no Tribunal Superior Eleitoral.", True,
   "Literalidade do art. 17, § 2º.", "CF, art. 17, § 2º.", "Nenhuma — item literal.")

# ============================================================ DIFÍCIL
ME(D, 4, "N0007", "Hans e Greta, alemães, trabalham no Brasil como funcionários da Organização das Nações Unidas. Seu filho Karl nasce em Brasília. Nos termos da Constituição, Karl:",
   [("não é brasileiro nato, pois seus pais são estrangeiros a serviço de organismo internacional.", "Errada: a exceção vale para pais a serviço de SEU país."),
    ("é brasileiro nato, pois a exceção da alínea a só se aplica quando os pais estrangeiros estão a serviço de seu próprio país.", "Correta."),
    ("é brasileiro naturalizado, desde o nascimento.", "Errada: naturalização é derivada e voluntária."),
    ("será brasileiro nato apenas se optar pela nacionalidade após a maioridade.", "Errada: opção é da alínea c."),
    ("é apátrida, pois a Alemanha adota o ius soli.", "Errada: a Alemanha adota o ius sanguinis, e Karl é brasileiro pelo ius soli.")],
   "B", "A exceção da alínea a exige que os pais estrangeiros estejam a serviço de seu país; servir à ONU não se enquadra.",
   "CF, art. 12, I, a.", "Estender a exceção a qualquer serviço estrangeiro (A).", "Leia 'a serviço de SEU país'.")

ME(D, 4, "N0011", "Sobre a naturalização extraordinária prevista no art. 12, II, b, da Constituição, assinale a correta.",
   [("Exige residência no Brasil por mais de 10 anos ininterruptos.", "Errada: mais de 15 anos."),
    ("É destinada apenas a originários de países de língua portuguesa.", "Errada: estrangeiros de qualquer nacionalidade."),
    ("Exige residência há mais de 15 anos ininterruptos, ausência de condenação penal e requerimento, e, preenchidos os requisitos, há direito subjetivo à naturalização.", "Correta."),
    ("Dispensa requerimento, operando-se automaticamente após o prazo.", "Errada: depende de requerimento."),
    ("Confere ao naturalizado o direito de ocupar o cargo de Ministro da Defesa.", "Errada: privativo de nato.")],
   "C", "A extraordinária exige mais de 15 anos ininterruptos de residência, sem condenação penal, e requerimento; é ato vinculado.",
   "CF, art. 12, II, b, e § 3º.", "Trocar 15 por 10 anos (A).", "Extraordinária = quinzenária e vinculada.")

ME(D, 4, "N0029", "Fernanda foi casada com o governador de um Estado durante o primeiro mandato dele. O casal se divorciou no terceiro ano do mandato, e Fernanda pretende concorrer a deputada estadual no mesmo Estado na eleição seguinte, em que o ex-marido concorrerá à reeleição. Segundo a Constituição e a jurisprudência do STF:",
   [("Fernanda pode concorrer, pois o divórcio extinguiu o vínculo.", "Errada: SV 18."),
    ("Fernanda é inelegível, pois a dissolução do vínculo conjugal no curso do mandato não afasta a inelegibilidade reflexa.", "Correta: SV 18."),
    ("Fernanda pode concorrer, pois a inelegibilidade reflexa não alcança cônjuges, apenas parentes.", "Errada: alcança o cônjuge."),
    ("Fernanda é inelegível apenas para cargos majoritários.", "Errada."),
    ("Fernanda pode concorrer se renunciar à pensão alimentícia.", "Errada: irrelevante.")],
   "B", "A Súmula Vinculante 18 impede que a dissolução do vínculo conjugal no curso do mandato afaste a inelegibilidade do § 7º.",
   "CF, art. 14, § 7º; Súmula Vinculante 18.", "Considerar que o divórcio 'libera' o ex-cônjuge (A).", "Divórcio no mandato não afasta; morte afasta (Tema 678).")

ME(D, 4, "N0031", "A respeito das inelegibilidades, assinale a correta.",
   [("Lei ordinária pode criar novas hipóteses de inelegibilidade para proteger a moralidade.", "Errada: exige lei complementar."),
    ("A Lei da Ficha Limpa foi declarada inconstitucional na parte em que se aplica a fatos anteriores à sua vigência.", "Errada: o STF a declarou constitucional, inclusive para fatos anteriores."),
    ("Lei complementar estabelecerá outros casos de inelegibilidade e os prazos de cessação, para proteger a probidade, a moralidade considerada a vida pregressa e a normalidade das eleições; e o STF entendeu que a inelegibilidade não é pena.", "Correta: art. 14, § 9º; ADCs 29 e 30."),
    ("A inelegibilidade impede o cidadão de votar.", "Errada: afeta só a capacidade passiva."),
    ("A Lei da Ficha Limpa foi aplicada às eleições de 2010.", "Errada: RE 633.703.")],
   "C", "O § 9º remete à lei complementar; a LC 135/2010 é constitucional (ADCs 29 e 30), mas não valeu para 2010 (art. 16).",
   "CF, art. 14, § 9º, e art. 16; STF, ADCs 29 e 30, ADI 4.578 e RE 633.703.", "Confundir inelegibilidade com suspensão (D).", "Inelegível vota; só não é votado.")

ME(D, 4, "N0042", "Sobre fidelidade partidária e financiamento das candidaturas, de acordo com a Constituição e a jurisprudência do STF, assinale a correta.",
   [("O senador que se desfilia do partido sem justa causa perde o mandato.", "Errada: ADI 5.081 — cargo majoritário."),
    ("Deputados e vereadores que se desligarem do partido perderão o mandato, salvo anuência do partido ou justa causa legal, e a migração não é computada para a distribuição do fundo partidário e do tempo de rádio e TV.", "Correta: art. 17, § 6º."),
    ("Os partidos devem destinar no mínimo 5% dos recursos de campanha às candidatas.", "Errada: 5% é para programas de participação feminina; para campanhas, no mínimo 30%."),
    ("Pessoas jurídicas podem doar a campanhas eleitorais, nos limites da lei.", "Errada: ADI 4.650."),
    ("O eleito por partido que não atingiu a cláusula de desempenho perde o mandato se mudar de legenda.", "Errada: § 5º assegura o mandato.")],
   "B", "O § 6º (EC 111/2021) prevê a perda do mandato para os cargos proporcionais, salvo anuência ou justa causa legal.",
   "CF, art. 17, §§ 5º a 8º; STF, ADI 5.081 e ADI 4.650.", "Estender a fidelidade aos majoritários (A).", "Fidelidade = proporcionais.")

ME(D, 4, "N0040", "Sobre a cláusula de desempenho do art. 17, § 3º (EC 97/2017), assinale a correta.",
   [("O partido que não a atingir terá seu registro cancelado pelo TSE.", "Errada: perde acesso ao fundo e à propaganda gratuita."),
    ("Exige-se, cumulativamente, 3% dos votos válidos e 15 deputados federais eleitos.", "Errada: os requisitos são alternativos."),
    ("Terão acesso ao fundo partidário e à propaganda gratuita os partidos que, alternativamente, obtiverem os percentuais mínimos de votos válidos para a Câmara, distribuídos em 1/3 das unidades da Federação, ou elegerem o número mínimo de deputados federais distribuídos em 1/3 das unidades da Federação, com regra de transição até 2030.", "Correta."),
    ("A cláusula considera os votos para o Senado Federal.", "Errada: Câmara dos Deputados."),
    ("A cláusula impede o partido de lançar candidatos.", "Errada.")],
   "C", "A cláusula é alternativa (votos ou deputados eleitos) e só restringe fundo partidário e propaganda gratuita, com patamares crescentes até 2030 (3% e 15 deputados).",
   "CF, art. 17, §§ 3º e 5º; EC 97/2017, art. 3º.", "Supor requisitos cumulativos (B) ou cancelamento do registro (A).", "Alternativamente = basta um dos critérios.")

ME(D, 3, "N0020", "Considerando o sufrágio e o voto no sistema constitucional brasileiro, assinale a correta.",
   [("A obrigatoriedade do voto é cláusula pétrea.", "Errada: pétreos são voto direto, secreto, universal e periódico."),
    ("Sufrágio e voto são expressões sinônimas.", "Errada: sufrágio é o direito; voto, seu exercício."),
    ("O voto é sempre direto, sem exceções.", "Errada: há eleição indireta na dupla vacância nos dois últimos anos do mandato presidencial."),
    ("O sufrágio é universal, e o voto direto, secreto, universal e periódico é protegido como cláusula pétrea, ao passo que a obrigatoriedade do voto pode ser alterada por emenda.", "Correta: art. 60, § 4º, II."),
    ("O Brasil adota o sufrágio censitário para os cargos majoritários.", "Errada: universal.")],
   "D", "O art. 60, § 4º, II protege o voto direto, secreto, universal e periódico; a obrigatoriedade não está protegida.",
   "CF, arts. 14, 60, § 4º, II, e 81, § 1º.", "Incluir a obrigatoriedade entre as cláusulas pétreas (A).", "Pétreo: D-S-U-P.")

CE(D, 4, "N0016", "A propriedade de empresa jornalística e de radiodifusão sonora e de sons e imagens é privativa de brasileiros natos ou naturalizados há mais de dez anos.", True,
   "É uma das distinções entre natos e naturalizados feitas pela própria Constituição (art. 222).",
   "CF, art. 222.", "Nenhuma — item correto.")

CE(D, 4, "N0017", "A renúncia à nacionalidade brasileira, feita por pedido expresso perante a autoridade competente, impede definitivamente o interessado de readquirir a nacionalidade brasileira originária.", False,
   "O § 5º do art. 12 (EC 131/2023) prevê que a renúncia não impede a reaquisição da nacionalidade brasileira originária, nos termos da lei.",
   "CF, art. 12, §§ 4º, II, e 5º.", "Tratar a renúncia como irreversível.")

CE(D, 4, "N0035", "Segundo o STF, a regra da anterioridade eleitoral do art. 16 aplica-se também às emendas constitucionais que alterem o processo eleitoral.", True,
   "Na ADI 3.685, o STF afastou a aplicação imediata da EC 52/2006 às eleições de 2006, reconhecendo a anterioridade eleitoral como garantia individual.",
   "CF, art. 16; STF, ADI 3.685.", "Nenhuma — item correto.")

CE(D, 4, "N0027", "Segundo o STF, o prefeito que exerceu dois mandatos consecutivos pode candidatar-se a prefeito de outro município no período subsequente, pois a vedação ao terceiro mandato se limita ao mesmo ente.", False,
   "No RE 637.485, o STF vedou a figura do prefeito itinerante: a reeleição é permitida uma única vez, inclusive se a candidatura for em outro município.",
   "CF, art. 14, § 5º; STF, RE 637.485.", "Restringir a vedação ao mesmo município.")

keys = {n["key"] for n in json.load(open("nodes.json", encoding="utf8"))["nodes"]}
save_questions(keys=keys)
