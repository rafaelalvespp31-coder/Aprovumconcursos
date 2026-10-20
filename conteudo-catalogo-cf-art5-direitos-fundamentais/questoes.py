import json
from helpers import ME, CE, save_questions

F, M, D = "facil", "medio", "dificil"

# ============================================================ FÁCIL
ME(F, 1, "N0003", "Sobre a distinção entre direitos e garantias fundamentais, assinale a alternativa correta.",
   [("Direitos são instrumentos processuais; garantias são os bens jurídicos protegidos.", "Errada: inverte os conceitos."),
    ("Garantias são os instrumentos que asseguram o exercício dos direitos, como o habeas corpus em relação à liberdade de locomoção.", "Correta: garantia é assecuratória; direito é declaratório."),
    ("Toda garantia fundamental é um remédio constitucional.", "Errada: remédios são espécie de garantia; há garantias que não são ações (ex.: juiz natural)."),
    ("Uma mesma norma constitucional nunca pode conter, ao mesmo tempo, um direito e uma garantia.", "Errada: o inciso VI, por exemplo, declara a liberdade de crença e garante a proteção aos locais de culto."),
    ("Direitos e garantias são expressões sinônimas na Constituição.", "Errada: a doutrina as distingue.")],
   "B", "Direitos são os bens protegidos (natureza declaratória); garantias, os instrumentos que os asseguram (natureza assecuratória).",
   "CF, art. 5º (Título II); doutrina sobre direitos e garantias.",
   "Inverter os conceitos (A) e tratar garantia e remédio como sinônimos (C).",
   "Pergunte: isso é o bem protegido ou a ferramenta que o protege?", essential=True)

ME(F, 1, "N0004", "Os direitos sociais, como saúde, educação e previdência, que exigem prestações positivas do Estado, são classificados pela doutrina como direitos de:",
   [("primeira dimensão, ligados à liberdade.", "Errada: 1ª dimensão = direitos civis e políticos (abstenção)."),
    ("segunda dimensão, ligados à igualdade.", "Correta: 2ª dimensão = direitos sociais, econômicos e culturais."),
    ("terceira dimensão, ligados à fraternidade.", "Errada: 3ª dimensão = transindividuais (meio ambiente, paz)."),
    ("quarta dimensão, ligados à democracia.", "Errada: classificação doutrinária sem consenso e que não abrange os direitos sociais."),
    ("dimensão única, pois os direitos fundamentais não admitem classificação histórica.", "Errada: a classificação em dimensões é tradicional.")],
   "B", "A 2ª dimensão corresponde ao valor igualdade e exige prestações do Estado.",
   "Doutrina das dimensões dos direitos fundamentais (liberdade, igualdade, fraternidade).",
   "Confundir 1ª e 2ª dimensões (A).", "Macete LIF: Liberdade, Igualdade, Fraternidade.")

ME(F, 1, "N0030", "Segundo a Constituição Federal, é possível ingressar em casa alheia, sem consentimento do morador, durante a noite:",
   [("por determinação judicial, em qualquer caso.", "Errada: ordem judicial só durante o dia."),
    ("apenas em caso de flagrante delito.", "Errada: também em desastre e para prestar socorro."),
    ("em caso de flagrante delito ou desastre, ou para prestar socorro.", "Correta: hipóteses válidas a qualquer hora."),
    ("por determinação do delegado de polícia, em investigação de crime grave.", "Errada: delegado não expede mandado domiciliar."),
    ("em nenhuma hipótese.", "Errada: há três hipóteses noturnas.")],
   "C", "À noite e sem consentimento, admitem-se flagrante delito, desastre e prestação de socorro; a determinação judicial só vale durante o dia.",
   "CF, art. 5º, XI.", "Admitir mandado judicial à noite (A) ou esquecer desastre e socorro (B).",
   "Flagrante, Desastre, Socorro = 24h; Juiz = só de dia.", essential=True)

ME(F, 1, "N0026", "De acordo com o art. 5º, XVI, da Constituição, o direito de reunião em locais abertos ao público:",
   [("depende de autorização prévia da autoridade competente.", "Errada: independe de autorização."),
    ("pode ser exercido com armas, desde que para defesa pessoal.", "Errada: exige reunião sem armas."),
    ("independe de autorização, exigindo-se apenas prévio aviso à autoridade competente.", "Correta: literalidade do inciso XVI."),
    ("pode frustrar outra reunião anteriormente convocada para o mesmo local.", "Errada: não pode frustrar reunião anterior."),
    ("é restrito a manifestações de partidos políticos e sindicatos.", "Errada: todos podem reunir-se.")],
   "C", "A reunião deve ser pacífica, sem armas, em local aberto ao público, independentemente de autorização, com prévio aviso e sem frustrar reunião anteriormente convocada.",
   "CF, art. 5º, XVI.", "Trocar 'aviso' por 'autorização' (A).", "Aviso comunica; autorização pede licença. A CF exige só o aviso.", essential=True)

ME(F, 2, "N0027", "Sobre a liberdade de associação, é correto afirmar que as associações:",
   [("só podem ser criadas mediante autorização do Poder Executivo.", "Errada: a criação independe de autorização."),
    ("podem ser compulsoriamente dissolvidas por decisão administrativa fundamentada.", "Errada: só por decisão judicial."),
    ("podem ter suas atividades suspensas por decisão judicial, e a dissolução compulsória exige decisão judicial transitada em julgado.", "Correta: art. 5º, XIX."),
    ("podem ter caráter paramilitar, desde que tenham fins lícitos.", "Errada: é vedada a associação de caráter paramilitar."),
    ("podem obrigar a pessoa a permanecer associada até o fim do mandato da diretoria.", "Errada: ninguém é compelido a permanecer associado.")],
   "C", "Suspensão: decisão judicial. Dissolução: decisão judicial + trânsito em julgado.",
   "CF, art. 5º, XVII a XX.", "Exigir trânsito em julgado para a suspensão ou admitir dissolução administrativa (B).",
   "No primeiro caso (dissolução) exige-se o trânsito em julgado.", essential=True)

ME(F, 1, "N0048", "Segundo a Constituição Federal, constituem crimes inafiançáveis e imprescritíveis:",
   [("a tortura e o tráfico ilícito de entorpecentes.", "Errada: são inafiançáveis e insuscetíveis de graça ou anistia, mas não imprescritíveis."),
    ("o racismo e a ação de grupos armados, civis ou militares, contra a ordem constitucional e o Estado Democrático.", "Correta: incisos XLII e XLIV."),
    ("o terrorismo e os crimes hediondos.", "Errada: integram o grupo do inciso XLIII (prescrevem)."),
    ("todos os crimes dolosos contra a vida.", "Errada: não há essa previsão."),
    ("o racismo e a tortura.", "Errada: a tortura não é imprescritível.")],
   "B", "Imprescritíveis: racismo (XLII) e ação de grupos armados contra a ordem constitucional (XLIV).",
   "CF, art. 5º, XLII, XLIII e XLIV.", "Misturar os grupos 'RAÇÃO' e '3TH' (A, E).",
   "RAÇÃO = RAcismo + aÇÃO de grupos armados: imprescritíveis.", essential=True)

ME(F, 1, "N0051", "Quanto à extradição, a Constituição estabelece que:",
   [("o brasileiro nato pode ser extraditado por tráfico de drogas.", "Errada: brasileiro nato nunca é extraditado."),
    ("o brasileiro naturalizado nunca será extraditado.", "Errada: pode ser, nas hipóteses do inciso LI."),
    ("não será concedida extradição de estrangeiro por crime político ou de opinião.", "Correta: inciso LII."),
    ("o estrangeiro casado com brasileira não pode ser extraditado.", "Errada: Súmula 421 do STF."),
    ("a extradição é decidida exclusivamente pelo Ministro da Justiça.", "Errada: o STF julga a legalidade; a entrega é ato do Presidente.")],
   "C", "Estrangeiro não é extraditado por crime político ou de opinião; brasileiro nato nunca; naturalizado só por crime comum anterior à naturalização ou tráfico.",
   "CF, art. 5º, LI e LII; Súmula 421 do STF.", "Admitir extradição de nato (A).", "Nato: nunca. Naturalizado: crime comum anterior ou tráfico.")

ME(F, 1, "N0055", "Atualmente, de acordo com a jurisprudência vinculante do STF, a prisão civil por dívida é admitida apenas:",
   [("para o depositário infiel e para o devedor de alimentos.", "Errada: a prisão do depositário infiel é ilícita (SV 25)."),
    ("para o devedor de alimentos que deixa de pagar de forma voluntária e inescusável.", "Correta: única hipótese admitida hoje."),
    ("para o devedor de tributos federais.", "Errada: não há previsão."),
    ("para qualquer devedor que oculte bens.", "Errada: não há previsão."),
    ("em nenhuma hipótese, pois foi abolida pela EC 45/2004.", "Errada: a prisão do devedor de alimentos subsiste.")],
   "B", "A SV 25 tornou ilícita a prisão do depositário infiel; resta a do devedor de alimentos.",
   "CF, art. 5º, LXVII; Súmula Vinculante 25; Pacto de San José, art. 7.7; RE 466.343.",
   "Repetir a literalidade do texto sem a SV 25 (A).", "Texto menciona depositário; a prática só admite alimentos.", essential=True)

CE(F, 1, "N0019", "A Constituição Federal assegura a livre manifestação do pensamento, sendo vedado o anonimato.", True,
   "Literalidade do art. 5º, IV. O anonimato é vedado para permitir a responsabilização por abusos.",
   "CF, art. 5º, IV.", "Nenhuma — item literal.")

CE(F, 1, "N0052", "Pela Constituição, ninguém será considerado culpado até a condenação confirmada em segunda instância.", False,
   "O marco constitucional é o trânsito em julgado da sentença penal condenatória (art. 5º, LVII), conforme reafirmado nas ADCs 43, 44 e 54.",
   "CF, art. 5º, LVII; ADCs 43, 44 e 54.", "Trocar 'trânsito em julgado' por 'segunda instância'.", essential=True)

CE(F, 1, "N0056", "São gratuitas as ações de habeas corpus e habeas data.", True,
   "Literalidade do art. 5º, LXXVII, que também prevê a gratuidade, na forma da lei, dos atos necessários ao exercício da cidadania.",
   "CF, art. 5º, LXXVII.", "Nenhuma — mas lembre que MS e MI não constam do inciso.")

CE(F, 2, "N0035", "No caso de iminente perigo público, a autoridade competente poderá usar de propriedade particular, assegurada ao proprietário indenização prévia e em dinheiro.", False,
   "Na requisição administrativa (XXV), a indenização é ulterior e só existe se houver dano. Indenização prévia, justa e em dinheiro é regra da desapropriação (XXIV).",
   "CF, art. 5º, XXIV e XXV.", "Trocar a regra da requisição pela da desapropriação.")

# ============================================================ MÉDIO
ME(M, 2, "N0009", "Determinado tratado internacional sobre direitos humanos foi aprovado pelo Congresso Nacional em turno único, por maioria simples, antes da EC 45/2004. Segundo a jurisprudência do STF, esse tratado possui status:",
   [("constitucional, por versar sobre direitos humanos.", "Errada: só tem equivalência de emenda o tratado aprovado pelo rito do § 3º."),
    ("supralegal, situando-se abaixo da Constituição e acima da legislação ordinária.", "Correta: RE 466.343."),
    ("de lei ordinária, como qualquer tratado.", "Errada: tratados de direitos humanos têm tratamento diferenciado."),
    ("de lei complementar.", "Errada: não há essa posição na jurisprudência."),
    ("de emenda constitucional, pois foi recepcionado automaticamente pela EC 45/2004.", "Errada: não houve recepção automática com status de emenda.")],
   "B", "Tratados de direitos humanos não aprovados pelo rito qualificado (3/5, dois turnos, cada Casa) têm status supralegal.",
   "CF, art. 5º, §§ 2º e 3º; STF, RE 466.343.", "Confundir supralegal com constitucional (A, E).",
   "Rito do § 3º = emenda; sem o rito = supralegal; tratado comum = lei ordinária.", essential=True)

ME(M, 2, "N0011", "Acerca da proteção dos direitos e garantias individuais como cláusula pétrea, assinale a correta.",
   [("Nenhuma emenda constitucional pode tratar de direitos individuais.", "Errada: veda-se apenas a emenda tendente a abolir."),
    ("A proteção abrange exclusivamente os direitos listados no art. 5º.", "Errada: o STF reconheceu garantia individual fora do art. 5º (anterioridade tributária — ADI 939)."),
    ("Não será objeto de deliberação proposta de emenda tendente a abolir direitos e garantias individuais, examinando-se o conteúdo da proposta.", "Correta: art. 60, § 4º, IV."),
    ("A cláusula pétrea pode ser afastada por plebiscito.", "Errada: não há essa previsão."),
    ("Emendas que ampliam direitos individuais são vedadas.", "Errada: a ampliação não é tendente a abolir.")],
   "C", "O art. 60, § 4º, IV veda a deliberação de emenda tendente a abolir direitos e garantias individuais — inclusive fora do art. 5º.",
   "CF, art. 60, § 4º, IV; STF, ADI 939.", "Ler a cláusula como proibição de qualquer alteração (A, E).",
   "Procure a palavra 'tendente a abolir'.")

ME(M, 2, "N0007", "Uma associação civil exclui um de seus membros sem lhe garantir oportunidade de defesa. O STF, em situação semelhante, reconheceu a aplicação dos direitos fundamentais a essa relação. Trata-se da denominada eficácia:",
   [("vertical dos direitos fundamentais.", "Errada: vertical é a relação Estado × indivíduo."),
    ("horizontal dos direitos fundamentais.", "Correta: aplicação entre particulares (RE 201.819)."),
    ("negativa dos direitos fundamentais.", "Errada: expressão não designa a aplicação entre particulares."),
    ("limitada dos direitos fundamentais.", "Errada: classificação de normas, não de relações."),
    ("supralegal dos direitos fundamentais.", "Errada: refere-se à hierarquia de tratados.")],
   "B", "Eficácia horizontal é a incidência dos direitos fundamentais nas relações entre particulares.",
   "STF, RE 201.819; doutrina.", "Confundir horizontal com vertical (A).", "Horizontal = particulares lado a lado.")

ME(M, 3, "N0031", "Uma CPI instaurada no Congresso Nacional deseja ouvir, em tempo real, as conversas telefônicas de um investigado. Sobre a situação, é correto afirmar que:",
   [("a CPI pode determinar a interceptação, pois tem poderes de investigação próprios das autoridades judiciais.", "Errada: interceptação está sob reserva de jurisdição."),
    ("a interceptação depende de ordem judicial, nas hipóteses e na forma da lei, para fins de investigação criminal ou instrução processual penal.", "Correta: art. 5º, XII."),
    ("a interceptação pode ser determinada pelo Ministério Público, se houver urgência.", "Errada: só o juiz."),
    ("a interceptação é vedada em qualquer hipótese pela Constituição.", "Errada: é admitida por ordem judicial."),
    ("basta a autorização do presidente da Casa legislativa.", "Errada: não há tal previsão.")],
   "B", "Interceptação telefônica exige ordem judicial, previsão legal e finalidade penal. A CPI pode quebrar sigilo de registros telefônicos, mas não interceptar.",
   "CF, art. 5º, XII, e art. 58, § 3º; Lei 9.296/1996.", "Estender os poderes da CPI à interceptação (A).",
   "Quebra de registros ≠ interceptação (reserva de jurisdição).", essential=True)

ME(M, 3, "N0049", "João foi condenado a pena de multa e à reparação do dano causado à vítima, fixada em R$ 80 mil. Ele faleceu, deixando herança de R$ 50 mil. De acordo com a Constituição:",
   [("os herdeiros respondem pela multa e pela reparação, integralmente.", "Errada: multa não passa; reparação só até a herança."),
    ("os herdeiros respondem pela multa, até o limite da herança.", "Errada: multa é pena e não passa da pessoa do condenado."),
    ("a obrigação de reparar o dano pode ser estendida aos sucessores, até o limite de R$ 50 mil.", "Correta: art. 5º, XLV."),
    ("nada pode ser cobrado dos herdeiros, pois toda obrigação se extingue com a morte.", "Errada: a reparação do dano pode ser cobrada."),
    ("os herdeiros respondem pela reparação integral de R$ 80 mil, com seu patrimônio pessoal.", "Errada: limite do patrimônio transferido.")],
   "C", "A pena não passa da pessoa do condenado; reparação do dano e perdimento de bens podem ser estendidos aos sucessores até o limite do valor do patrimônio transferido.",
   "CF, art. 5º, XLV.", "Tratar a multa como obrigação civil (A, B).", "Pena fica; reparação passa até o limite da herança.")

ME(M, 2, "N0042", "Sobre a instituição do júri, nos termos da Constituição, assinale a alternativa correta.",
   [("Compete ao júri o julgamento de todos os crimes que resultem em morte, inclusive o latrocínio.", "Errada: latrocínio é do juiz singular (Súmula 603)."),
    ("São assegurados a plenitude de defesa, o sigilo das votações, a soberania dos veredictos e a competência para os crimes dolosos contra a vida.", "Correta: art. 5º, XXXVIII."),
    ("A soberania dos veredictos impede qualquer recurso contra a decisão dos jurados.", "Errada: cabe apelação (novo júri) e revisão criminal."),
    ("A competência do júri prevalece sobre o foro por prerrogativa de função previsto na Constituição Federal.", "Errada: o foro previsto na CF prevalece."),
    ("A votação dos jurados é pública, em respeito ao princípio da publicidade.", "Errada: o sigilo das votações é garantia do júri.")],
   "B", "PSSC: plenitude de defesa, sigilo das votações, soberania dos veredictos e competência para os crimes dolosos contra a vida.",
   "CF, art. 5º, XXXVIII; Súmula 603 do STF; SV 45.", "Incluir o latrocínio (A) e tratar a soberania como absoluta (C).", "Macete PSSC.")

ME(M, 2, "N0021", "Pedro, convocado para serviço obrigatório previsto em lei, alega convicção filosófica para não cumpri-lo e também se recusa a cumprir a prestação alternativa fixada em lei. Nos termos da Constituição:",
   [("Pedro não sofre qualquer consequência, pois a liberdade de consciência é absoluta.", "Errada: há consequência se recusar a prestação alternativa."),
    ("Pedro poderá ser privado de direitos, podendo haver perda ou suspensão de seus direitos políticos.", "Correta: art. 5º, VIII, c/c art. 15, IV."),
    ("Pedro deverá ser preso, por desobediência.", "Errada: a CF prevê privação de direitos, não prisão automática."),
    ("Pedro perderá a nacionalidade brasileira.", "Errada: não há essa consequência."),
    ("Pedro só poderá invocar convicção religiosa, e não filosófica.", "Errada: a CF protege crença religiosa e convicção filosófica ou política.")],
   "B", "Quem invoca crença ou convicção para eximir-se de obrigação legal a todos imposta e recusa a prestação alternativa pode ser privado de direitos (art. 15, IV).",
   "CF, art. 5º, VIII; art. 15, IV.", "Tratar a escusa como direito absoluto (A).", "Escusa só funciona se cumprida a prestação alternativa.")

ME(M, 2, "N0023", "Sobre a liberdade de exercício profissional (art. 5º, XIII), segundo a jurisprudência do STF:",
   [("é constitucional a exigência de diploma de curso superior para o exercício do jornalismo.", "Errada: RE 511.961 afastou a exigência."),
    ("é inconstitucional o Exame de Ordem para o exercício da advocacia.", "Errada: RE 603.583 o considerou constitucional."),
    ("a lei pode estabelecer qualificações profissionais quando a atividade exigir conhecimento técnico e seu exercício inadequado puder causar dano a terceiros.", "Correta: critério do STF para restrições."),
    ("a liberdade profissional é absoluta e não admite qualquer restrição legal.", "Errada: norma de eficácia contida."),
    ("músicos devem obrigatoriamente se inscrever em conselho profissional.", "Errada: RE 795.467.")],
   "C", "A norma é de eficácia contida: a lei pode impor qualificações, desde que proporcionais ao risco social da atividade.",
   "CF, art. 5º, XIII; STF, RE 511.961, RE 603.583 e RE 795.467.", "Inverter as decisões sobre OAB e jornalismo (A, B).",
   "Risco a terceiros + conhecimento técnico = restrição legítima.")

ME(M, 3, "N0059", "Uma associação ajuíza ação coletiva de procedimento comum em defesa de seus filiados, com base no art. 5º, XXI, da Constituição. Segundo o STF:",
   [("a associação atua como substituta processual e dispensa qualquer autorização.", "Errada: no XXI há representação, que exige autorização."),
    ("basta a autorização genérica prevista no estatuto da entidade.", "Errada: o STF exige autorização expressa (individual ou assemblear)."),
    ("é necessária autorização expressa dos associados, por ato individual ou deliberação em assembleia.", "Correta: Tema 82 (RE 573.232)."),
    ("a associação deve estar constituída há pelo menos cinco anos.", "Errada: requisito inexistente."),
    ("a regra é idêntica à do mandado de segurança coletivo.", "Errada: no MS coletivo há substituição e a autorização é dispensada (Súmula 629).")],
   "C", "No art. 5º, XXI, a associação representa os filiados e precisa de autorização expressa; no MS coletivo, atua como substituta e dispensa autorização.",
   "CF, art. 5º, XXI e LXX; STF, Tema 82 e Súmula 629.", "Aplicar a regra do MS coletivo à ação ordinária (A, E).",
   "Representação exige autorização; substituição dispensa.")

ME(M, 2, "N0038", "O direito de petição e o direito de obtenção de certidões em repartições públicas, previstos no art. 5º, XXXIV, da Constituição:",
   [("dependem do pagamento de taxas, salvo para os reconhecidamente pobres.", "Errada: independem do pagamento de taxas para todos."),
    ("são assegurados a todos, independentemente do pagamento de taxas.", "Correta: literalidade do inciso XXXIV."),
    ("exigem a representação por advogado.", "Errada: o direito de petição dispensa advogado."),
    ("são protegidos, em caso de recusa da certidão, pelo habeas data.", "Errada: recusa de certidão enseja mandado de segurança."),
    ("são restritos a brasileiros natos.", "Errada: são de todos.")],
   "B", "Petição e certidões são asseguradas a todos, independentemente do pagamento de taxas; a negativa de certidão se combate por mandado de segurança.",
   "CF, art. 5º, XXXIV.", "Trazer a ideia de 'reconhecidamente pobres' do inciso LXXVI (A).", "Taxas: nunca, para ninguém.")

CE(M, 2, "N0005", "Os direitos fundamentais são absolutos, não podendo sofrer qualquer restrição, nem mesmo quando entram em conflito com outros direitos fundamentais.", False,
   "Em regra, os direitos fundamentais são relativos: em caso de colisão, resolve-se por ponderação e proporcionalidade, preservando o núcleo essencial.",
   "Doutrina; jurisprudência do STF sobre colisão de direitos.", "Generalizar a característica da relatividade para o oposto.")

CE(M, 2, "N0006", "Por mencionar apenas os estrangeiros residentes no País, o caput do art. 5º impede que o estrangeiro em trânsito pelo território nacional impetre habeas corpus.", False,
   "A interpretação do STF é ampliativa: o estrangeiro não residente também é titular dos direitos fundamentais compatíveis com sua condição, como o habeas corpus e o devido processo legal.",
   "CF, art. 5º, caput e LXVIII; jurisprudência do STF.", "Leitura restritiva da literalidade do caput.")

CE(M, 2, "N0044", "Pela teoria dos frutos da árvore envenenada, adotada no direito brasileiro, são inadmissíveis as provas derivadas das ilícitas, salvo quando não evidenciado o nexo de causalidade entre umas e outras ou quando as derivadas puderem ser obtidas por uma fonte independente das primeiras.", True,
   "É a regra do art. 157, § 1º, do CPP, que concretiza o art. 5º, LVI.",
   "CF, art. 5º, LVI; CPP, art. 157, § 1º.", "Nenhuma — item conceitual correto.")

CE(M, 2, "N0050", "A Constituição determina que a prisão de qualquer pessoa e o local onde se encontre sejam comunicados imediatamente ao juiz competente e ao Ministério Público.", False,
   "O inciso LXII manda comunicar o juiz competente e a família do preso ou a pessoa por ele indicada. A comunicação ao MP decorre da legislação processual, não desse inciso.",
   "CF, art. 5º, LXII.", "Trocar 'família ou pessoa indicada' por 'Ministério Público'.")

# ============================================================ DIFÍCIL
ME(D, 4, "N0030", "Policiais militares, em patrulhamento noturno, recebem denúncia anônima de que haveria drogas armazenadas em determinada residência. Sem realizar nenhuma diligência prévia, arrombam a porta às 2h e encontram entorpecentes. À luz do Tema 280 do STF, assinale a correta.",
   [("A entrada foi lícita, pois o tráfico na modalidade 'ter em depósito' é crime permanente, o que dispensa qualquer justificativa.", "Errada: a natureza permanente, isoladamente, não autoriza o ingresso."),
    ("A entrada foi lícita, pois à noite admite-se o ingresso em caso de flagrante delito, e a apreensão confirma o flagrante.", "Errada: as fundadas razões devem existir antes da entrada, não ser confirmadas pelo resultado."),
    ("A entrada exige fundadas razões, devidamente justificadas a posteriori, que indiquem flagrante no interior da casa; a denúncia anônima isolada não basta, e as provas tendem a ser consideradas ilícitas.", "Correta: tese do Tema 280 e jurisprudência do STJ."),
    ("A entrada só seria lícita com mandado judicial, que poderia ser cumprido imediatamente, mesmo de madrugada.", "Errada: mandado só durante o dia; e o flagrante dispensa mandado se houver fundadas razões."),
    ("A ilicitude da entrada não contamina as drogas apreendidas, por serem objeto material do crime.", "Errada: provas obtidas por violação de domicílio são ilícitas.")],
   "C", "O STF fixou que a entrada forçada sem mandado, mesmo à noite, só é lícita com fundadas razões prévias, justificadas depois, sob pena de responsabilidade e nulidade.",
   "CF, art. 5º, XI e LVI; STF, Tema 280 (RE 603.616).", "Aceitar o crime permanente como autorização automática (A) e legitimar a entrada pelo resultado (B).",
   "Pergunte: o que os policiais sabiam ANTES de entrar?", essential=True)

ME(D, 4, "N0052", "Acerca da presunção de inocência e da execução da pena, de acordo com a jurisprudência atual do STF, assinale a alternativa correta.",
   [("A execução provisória da pena após condenação em segunda instância é obrigatória, por força do HC 126.292.", "Errada: entendimento de 2016, superado em 2019."),
    ("A prisão preventiva é incompatível com a presunção de inocência.", "Errada: prisões cautelares fundamentadas são compatíveis."),
    ("Nas ADCs 43, 44 e 54, o STF declarou a constitucionalidade do art. 283 do CPP, vedando a execução da pena antes do trânsito em julgado, admitindo-se, porém, a execução imediata da condenação pelo Tribunal do Júri, conforme o Tema 1.068.", "Correta: síntese do entendimento vigente."),
    ("A execução imediata da condenação pelo júri só é admitida quando a pena for igual ou superior a 15 anos.", "Errada: o Tema 1.068 afastou a exigência de patamar mínimo."),
    ("Inquéritos e ações penais em curso podem ser usados para agravar a pena-base.", "Errada: Súmula 444 do STJ.")],
   "C", "Vigora a exigência do trânsito em julgado (ADCs 43, 44 e 54), com a exceção da soberania dos veredictos no júri (Tema 1.068).",
   "CF, art. 5º, XXXVIII, c, e LVII; CPP, art. 283; STF, ADCs 43, 44 e 54; Tema 1.068; Súmula 444 do STJ.",
   "Apresentar entendimento superado como vigente (A) e exigir patamar de pena (D).", "Atenção às datas da jurisprudência.", essential=True)

ME(D, 4, "N0048", "Considerando o tratamento constitucional e jurisprudencial dos crimes de especial gravidade, assinale a correta.",
   [("A tortura é crime imprescritível, inafiançável e insuscetível de graça ou anistia.", "Errada: não é imprescritível pelo texto constitucional."),
    ("O racismo é inafiançável e imprescritível, e o STF entende que a injúria racial é espécie de racismo, sendo também imprescritível.", "Correta: art. 5º, XLII; HC 154.248."),
    ("Os crimes hediondos são imprescritíveis por força do art. 5º, XLIII.", "Errada: o XLIII não prevê imprescritibilidade."),
    ("Por serem inafiançáveis, os crimes do art. 5º, XLIII, não admitem liberdade provisória em nenhuma hipótese.", "Errada: o STF admite liberdade provisória sem fiança quando ausentes os requisitos da preventiva."),
    ("Respondem pelos crimes do art. 5º, XLIII, apenas os executores diretos.", "Errada: também mandantes e omissos que podiam evitá-los.")],
   "B", "Racismo: inafiançável e imprescritível. O STF incluiu a injúria racial nesse regime (HC 154.248), depois reforçado pela Lei 14.532/2023.",
   "CF, art. 5º, XLII a XLIV; STF, HC 154.248; Lei 14.532/2023.", "Atribuir imprescritibilidade ao grupo 3TH (A, C) e confundir inafiançável com vedação de liberdade provisória (D).",
   "Inafiançável ≠ proibido soltar; imprescritível = só RAÇÃO.")

ME(D, 4, "N0051", "Marcel, nascido na Bélgica, naturalizou-se brasileiro em 2016. Em 2021, praticou no exterior crime de tráfico internacional de drogas. Também responde no exterior por estelionato praticado em 2019. O Estado estrangeiro pede sua extradição pelos dois crimes. Assinale a correta.",
   [("A extradição é possível pelos dois crimes, pois ambos foram praticados após a naturalização.", "Errada: crime comum posterior à naturalização não autoriza extradição."),
    ("A extradição é possível apenas pelo tráfico, pois o estelionato foi praticado após a naturalização.", "Correta: no tráfico, o momento é irrelevante; no crime comum, exige-se anterioridade."),
    ("A extradição é impossível, pois brasileiro naturalizado equipara-se ao nato.", "Errada: a própria CF distingue as hipóteses."),
    ("A extradição é possível apenas pelo estelionato, pois o tráfico exige anterioridade.", "Errada: inverte a regra."),
    ("A extradição depende de prévia perda da nacionalidade brasileira.", "Errada: não é requisito.")],
   "B", "O naturalizado só é extraditado por crime comum praticado antes da naturalização ou por comprovado envolvimento em tráfico, a qualquer tempo.",
   "CF, art. 5º, LI.", "Inverter a exigência de anterioridade (D).", "Anterioridade vale só para o crime comum.")

ME(D, 3, "N0035", "Sobre as formas de intervenção do Estado na propriedade previstas na Constituição, assinale a correta.",
   [("A desapropriação por interesse social para reforma agrária é paga em dinheiro, previamente.", "Errada: paga-se em títulos da dívida agrária (art. 184), salvo benfeitorias."),
    ("A expropriação de glebas com culturas ilegais de plantas psicotrópicas ocorre sem indenização ao proprietário.", "Correta: art. 243."),
    ("A requisição administrativa transfere a propriedade ao Poder Público.", "Errada: há apenas uso temporário."),
    ("A pequena propriedade rural trabalhada pela família pode ser penhorada por qualquer dívida.", "Errada: é impenhorável por débitos da atividade produtiva."),
    ("A desapropriação urbana sancionatória é paga em dinheiro, previamente.", "Errada: paga-se com títulos da dívida pública (art. 182, § 4º, III).")],
   "B", "O art. 243 prevê a expropriação, sem indenização, de propriedades com culturas ilegais de psicotrópicos ou exploração de trabalho escravo.",
   "CF, art. 5º, XXIV a XXVI; arts. 182, § 4º, III; 184; 243.", "Generalizar a indenização prévia em dinheiro (A, E).",
   "Lembre as exceções ressalvadas pela própria CF no inciso XXIV.")

ME(D, 4, "N0012", "Uma lei proíbe, por completo, a circulação de biografias não autorizadas pelo biografado, sob o fundamento de proteger a intimidade. Considerando o princípio da proporcionalidade e a jurisprudência do STF, assinale a correta.",
   [("A lei é constitucional, pois a intimidade sempre prevalece sobre a liberdade de expressão.", "Errada: não há hierarquia abstrata entre direitos fundamentais."),
    ("A lei é inconstitucional: o STF considerou inexigível a autorização prévia do biografado, resolvendo-se abusos por responsabilização posterior.", "Correta: ADI 4.815."),
    ("A lei é constitucional, pois a proporcionalidade autoriza qualquer restrição fundada em interesse legítimo.", "Errada: a proporcionalidade é limite às restrições."),
    ("A lei é inconstitucional apenas por vício formal, pois matéria de imprensa é de lei complementar.", "Errada: não há essa exigência."),
    ("A questão não envolve colisão de direitos, mas apenas legalidade.", "Errada: há colisão entre expressão/informação e intimidade.")],
   "B", "Na ADI 4.815, o STF afastou a exigência de autorização prévia para biografias; eventuais abusos geram indenização e direito de resposta.",
   "CF, art. 5º, IV, V, IX, X e XIV; STF, ADI 4.815.", "Supor hierarquia fixa entre direitos (A).",
   "Liberdade de expressão: regra é a responsabilização posterior, não a censura prévia.")

ME(D, 4, "N0024", "Um cidadão pretende obter de uma prefeitura informações sobre os contratos de limpeza urbana e, em outro pedido, quer acesso aos dados pessoais que constam a seu respeito no cadastro de um órgão estadual. Ambos os pedidos são negados. Os instrumentos adequados são, respectivamente:",
   [("habeas data e mandado de segurança.", "Errada: inverte os instrumentos."),
    ("mandado de segurança e habeas data.", "Correta: informação pública de interesse coletivo → MS; dados pessoais do impetrante → HD."),
    ("ação popular e habeas corpus.", "Errada: não há ato lesivo nem restrição à locomoção."),
    ("habeas data nos dois casos.", "Errada: HD só para dados relativos à pessoa do impetrante."),
    ("mandado de injunção nos dois casos.", "Errada: não há falta de norma regulamentadora.")],
   "B", "O direito à informação de interesse coletivo (XXXIII) se protege por mandado de segurança; o acesso a dados pessoais do próprio impetrante, por habeas data (LXXII).",
   "CF, art. 5º, XXXIII, LXIX e LXXII; Lei 12.527/2011; Lei 9.507/1997.", "Usar o HD para qualquer informação (A, D).",
   "HD = dados do próprio impetrante. Informação pública geral = MS.")

ME(D, 3, "N0043", "Sobre contraditório e ampla defesa, assinale a alternativa correta.",
   [("A falta de defesa técnica por advogado no processo administrativo disciplinar ofende a Constituição.", "Errada: SV 5 diz o contrário."),
    ("É constitucional exigir depósito prévio para admissibilidade de recurso administrativo.", "Errada: SV 21."),
    ("No processo penal, a falta de defesa constitui nulidade absoluta, mas sua deficiência só anula o processo se houver prova de prejuízo para o réu.", "Correta: Súmula 523 do STF."),
    ("O contraditório e a ampla defesa aplicam-se apenas aos processos judiciais.", "Errada: também aos administrativos (LV)."),
    ("O inquérito policial deve observar contraditório pleno, sob pena de nulidade da ação penal.", "Errada: o IP é procedimento inquisitivo.")],
   "C", "A Súmula 523 do STF distingue a ausência de defesa (nulidade absoluta) da defesa deficiente (exige prejuízo).",
   "CF, art. 5º, LV; Súmulas Vinculantes 5 e 21; Súmula 523 do STF.", "Inverter as súmulas vinculantes (A, B).", "Ausência ≠ deficiência.")

ME(D, 3, "N0010", "Sobre o § 4º do art. 5º e o Tribunal Penal Internacional, assinale a correta.",
   [("O § 4º integra o texto originário da Constituição de 1988.", "Errada: foi incluído pela EC 45/2004."),
    ("O Brasil se submete à jurisdição de Tribunal Penal Internacional a cuja criação tenha manifestado adesão, e o TPI atua de forma complementar às jurisdições nacionais.", "Correta: art. 5º, § 4º; Estatuto de Roma."),
    ("O TPI julga quaisquer crimes praticados por brasileiros no exterior.", "Errada: competência limitada a genocídio, crimes contra a humanidade, de guerra e de agressão."),
    ("A entrega ao TPI é idêntica à extradição e, por isso, vedada para qualquer brasileiro.", "Errada: a doutrina distingue entrega de extradição."),
    ("A submissão ao TPI depende de referendo popular.", "Errada: não há essa exigência.")],
   "B", "Incluído pela EC 45/2004, o § 4º prevê a submissão ao TPI, tribunal complementar que julga crimes internacionais graves.",
   "CF, art. 5º, § 4º; Estatuto de Roma.", "Confundir entrega com extradição (D).", "TPI é complementar, não substitui a Justiça brasileira.")

CE(D, 4, "N0015", "Segundo o STF, é constitucional a política de cotas raciais para ingresso em universidades públicas, como forma de concretizar a igualdade material.", True,
   "Na ADPF 186, o STF julgou constitucionais as cotas raciais em universidades; na ADC 41, as cotas em concursos públicos federais.",
   "CF, art. 5º, caput; STF, ADPF 186 e ADC 41.", "Nenhuma — item correto.")

CE(D, 4, "N0053", "Se o Ministério Público, no prazo legal, requerer o arquivamento do inquérito policial, o ofendido poderá ajuizar ação penal privada subsidiária da pública.", False,
   "A ação privada subsidiária pressupõe inércia do MP. Pedir arquivamento é manifestação, não inércia.",
   "CF, art. 5º, LIX; CPP, art. 29.", "Confundir discordância com o arquivamento com inércia.")

CE(D, 4, "N0008", "Pelo § 1º do art. 5º, que confere aplicação imediata às normas definidoras dos direitos e garantias fundamentais, todas essas normas possuem eficácia plena, sendo inviável o uso do mandado de injunção para direitos previstos no art. 5º.", False,
   "Aplicação imediata não significa eficácia plena. Há normas que dependem de lei, e a omissão que inviabiliza o exercício de direitos pode ser enfrentada pelo mandado de injunção.",
   "CF, art. 5º, § 1º e LXXI.", "Equiparar aplicação imediata a eficácia plena.")

CE(D, 4, "N0058", "Os direitos individuais homogêneos têm titulares determinados, decorrem de origem comum e possuem objeto divisível.", True,
   "É a definição do CDC (art. 81, p. ú., III), usada no sistema de processo coletivo: diferenciam-se dos difusos e coletivos em sentido estrito pela divisibilidade do objeto.",
   "CDC, art. 81, parágrafo único.", "Nenhuma — item correto.")

keys = {n["key"] for n in json.load(open("nodes.json", encoding="utf8"))["nodes"]}
save_questions(keys=keys)
