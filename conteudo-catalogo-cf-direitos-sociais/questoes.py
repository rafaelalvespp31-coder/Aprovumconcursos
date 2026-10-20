import json
from helpers import ME, CE, save_questions

F, M, D = "facil", "medio", "dificil"

# ============================================================ FÁCIL
ME(F, 1, "N0007", "Nos termos do art. 6º da Constituição Federal, NÃO figura expressamente entre os direitos sociais:",
   [("a moradia.", "Errada: incluída pela EC 26/2000."),
    ("o transporte.", "Errada: incluído pela EC 90/2015."),
    ("a alimentação.", "Errada: incluída pela EC 64/2010."),
    ("o meio ambiente ecologicamente equilibrado.", "Correta: está no art. 225, não no rol do art. 6º."),
    ("o lazer.", "Errada: consta do texto original.")],
   "D", "O meio ambiente é protegido pelo art. 225, mas não integra o rol do art. 6º.",
   "CF, arts. 6º e 225.", "Incluir no art. 6º direitos tutelados em outros artigos.", "Memorize os 11 do art. 6º; o resto é distrator.", essential=True)

ME(F, 1, "N0016", "Segundo o art. 7º da Constituição, a duração do trabalho normal não pode ser superior a:",
   [("6 horas diárias e 36 semanais.", "Errada: 6h é a jornada dos turnos ininterruptos de revezamento."),
    ("8 horas diárias e 44 semanais, facultada a compensação de horários e a redução da jornada por acordo ou convenção coletiva.", "Correta: inciso XIII."),
    ("8 horas diárias e 48 semanais.", "Errada: 48h era a regra anterior a 1988."),
    ("10 horas diárias e 44 semanais.", "Errada: o limite diário é 8h."),
    ("8 horas diárias, sem limite semanal.", "Errada: há limite de 44h.")],
   "B", "Inciso XIII: 8h diárias e 44h semanais, com compensação e redução mediante acordo ou convenção coletiva.",
   "CF, art. 7º, XIII.", "Usar 48h (C) ou a jornada de revezamento (A).", "8 e 44.", essential=True)

ME(F, 1, "N0017", "A Constituição assegura à gestante licença, sem prejuízo do emprego e do salário, com duração de:",
   [("90 dias.", "Errada."),
    ("120 dias.", "Correta: art. 7º, XVIII."),
    ("150 dias.", "Errada."),
    ("180 dias.", "Errada: 180 dias depende de programa legal (Empresa Cidadã) ou leis próprias."),
    ("5 meses após o parto.", "Errada: esse é o prazo da estabilidade provisória (ADCT).")],
   "B", "Art. 7º, XVIII: 120 dias.", "CF, art. 7º, XVIII; ADCT, art. 10, II, b.",
   "Confundir licença com estabilidade (E) ou com a prorrogação legal (D).", "Licença 120 dias; estabilidade até 5 meses após o parto.")

ME(F, 1, "N0021", "Quanto ao trabalho do menor de idade, a Constituição:",
   [("permite qualquer trabalho a partir de 14 anos.", "Errada: aos 14 e 15, só como aprendiz."),
    ("proíbe trabalho noturno, perigoso ou insalubre a menores de 18 anos e qualquer trabalho a menores de 16, salvo na condição de aprendiz, a partir de 14 anos.", "Correta: art. 7º, XXXIII."),
    ("permite trabalho noturno ao maior de 16 anos, com autorização dos pais.", "Errada: trabalho noturno é vedado ao menor de 18."),
    ("proíbe qualquer trabalho a menores de 18 anos.", "Errada: a partir de 16 é permitido, com restrições."),
    ("permite a aprendizagem a partir de 12 anos.", "Errada: a partir de 14.")],
   "B", "Macete 14-16-18: aprendiz aos 14; trabalho comum aos 16; noturno, perigoso e insalubre só aos 18.",
   "CF, art. 7º, XXXIII.", "Admitir autorização dos pais para o noturno (C).", "14 aprendiz · 16 trabalho · 18 noturno/perigoso/insalubre.", essential=True)

ME(F, 1, "N0026", "Sobre a organização sindical, a Constituição estabelece que:",
   [("é permitida a criação de vários sindicatos da mesma categoria na mesma base territorial.", "Errada: vigora a unicidade."),
    ("a base territorial será definida pelo Ministério do Trabalho, não podendo ser inferior a um Estado.", "Errada: definida pelos interessados, mínimo de um Município."),
    ("é vedada a criação de mais de uma organização sindical representativa da mesma categoria na mesma base territorial, que não pode ser inferior à área de um Município.", "Correta: art. 8º, II."),
    ("a fundação de sindicato depende de autorização do Estado.", "Errada: independe de autorização, ressalvado o registro."),
    ("a filiação ao sindicato é obrigatória para quem quer exercer a profissão.", "Errada: ninguém é obrigado a filiar-se.")],
   "C", "Unicidade sindical, base territorial definida pelos interessados e não inferior à área de um Município.",
   "CF, art. 8º, I, II e V.", "Trocar Município por Estado (B).", "Unicidade + Município + interessados.")

ME(F, 1, "N0035", "De acordo com a jurisprudência do STF (Tema 541), o exercício do direito de greve por policiais civis:",
   [("é permitido, desde que mantido 30% do efetivo.", "Errada: a vedação é total."),
    ("é permitido, nos termos da Lei 7.783/1989.", "Errada: a lei não se aplica a essas carreiras."),
    ("é vedado, sob qualquer forma ou modalidade, assim como aos servidores que atuem diretamente na segurança pública.", "Correta: Tema 541 (ARE 654.432)."),
    ("depende de autorização judicial prévia.", "Errada: não há essa previsão."),
    ("é livre, pois a vedação constitucional atinge apenas os militares.", "Errada: o STF estendeu a vedação.")],
   "C", "O STF vedou a greve aos policiais civis e a todos os servidores que atuem diretamente na segurança pública, com mediação obrigatória do Poder Público.",
   "STF, Tema 541; CF, art. 142, § 3º, IV.", "Admitir greve com efetivo mínimo (A).", "Segurança pública não faz greve.", essential=True)

ME(F, 2, "N0038", "Nos termos do art. 11 da Constituição, nas empresas de mais de duzentos empregados, é assegurada a eleição de um representante destes com a finalidade de:",
   [("negociar convenções coletivas em nome da categoria.", "Errada: negociação coletiva é papel do sindicato."),
    ("participar da gestão da empresa e de seus lucros.", "Errada: não é a finalidade do art. 11."),
    ("promover-lhes, exclusivamente, o entendimento direto com os empregadores.", "Correta: finalidade exclusiva."),
    ("fiscalizar o recolhimento do FGTS.", "Errada."),
    ("representá-los judicialmente em reclamações trabalhistas.", "Errada.")],
   "C", "O representante tem a finalidade exclusiva de promover o entendimento direto entre empregados e empregadores.",
   "CF, art. 11.", "Atribuir ao representante funções sindicais (A).", "Mais de 200 empregados; finalidade exclusiva.")

CE(F, 1, "N0010", "Todo brasileiro em situação de vulnerabilidade social terá direito a uma renda básica familiar, garantida pelo poder público em programa permanente de transferência de renda, cujos requisitos de acesso serão determinados em lei.", True,
   "É o conteúdo do parágrafo único do art. 6º, incluído pela EC 114/2021, que também manda observar a legislação fiscal e orçamentária.",
   "CF, art. 6º, parágrafo único.", "Nenhuma — item correto.")

CE(F, 1, "N0014", "A Constituição assegura a irredutibilidade do salário, salvo o disposto em convenção ou acordo coletivo.", True,
   "Literalidade do art. 7º, VI.", "CF, art. 7º, VI.", "Nenhuma — lembre que a irredutibilidade não é absoluta.")

CE(F, 1, "N0018", "É assegurada aos trabalhadores assistência gratuita aos filhos e dependentes desde o nascimento até seis anos de idade em creches e pré-escolas.", False,
   "Desde a EC 53/2006, o limite é de cinco anos de idade (art. 7º, XXV).", "CF, art. 7º, XXV.", "Usar a redação anterior à EC 53/2006.")

CE(F, 1, "N0029", "É vedada a dispensa do empregado sindicalizado a partir do registro da candidatura a cargo de direção ou representação sindical e, se eleito, ainda que suplente, até um ano após o final do mandato, salvo se cometer falta grave nos termos da lei.", True,
   "Literalidade do art. 8º, VIII.", "CF, art. 8º, VIII.", "Nenhuma — item literal.")

# ============================================================ MÉDIO
ME(M, 2, "N0008", "Assinale a alternativa que relaciona corretamente o direito social à emenda constitucional que o incluiu no art. 6º.",
   [("Moradia — EC 64/2010; alimentação — EC 26/2000; transporte — EC 90/2015.", "Errada: trocou moradia e alimentação."),
    ("Moradia — EC 26/2000; alimentação — EC 64/2010; transporte — EC 90/2015.", "Correta: ordem MAT."),
    ("Moradia — EC 26/2000; alimentação — EC 90/2015; transporte — EC 64/2010.", "Errada."),
    ("Moradia, alimentação e transporte constam do texto original de 1988.", "Errada: vieram por emenda."),
    ("Transporte — EC 26/2000; moradia — EC 90/2015; alimentação — EC 64/2010.", "Errada.")],
   "B", "Ordem de inclusão MAT: Moradia (2000), Alimentação (2010), Transporte (2015).",
   "CF, art. 6º; EC 26/2000, 64/2010 e 90/2015.", "Trocar a ordem das emendas.", "MAT: 2000, 2010, 2015.")

ME(M, 2, "N0004", "Sobre o mínimo existencial e a reserva do possível, assinale a correta.",
   [("A reserva do possível pode ser invocada genericamente pelo Estado para afastar qualquer obrigação de prestação.", "Errada: exige demonstração concreta."),
    ("O mínimo existencial obriga o Estado a conceder qualquer prestação pedida judicialmente.", "Errada: não é fórmula automática."),
    ("O mínimo existencial representa o núcleo de condições indispensáveis à vida digna e funciona como limite à alegação de falta de recursos, que deve ser comprovada concretamente.", "Correta."),
    ("Ambos os conceitos foram expressamente previstos no art. 6º pela EC 114/2021.", "Errada: são construções doutrinárias e jurisprudenciais."),
    ("Direitos sociais, por serem programáticos, não podem ser exigidos judicialmente.", "Errada: têm força normativa.")],
   "C", "O mínimo existencial é núcleo intangível; a reserva do possível exige prova concreta da impossibilidade e não prevalece contra esse núcleo.",
   "Doutrina; STF, Tema 698 e Tema 548.", "Tratar os conceitos como fórmulas automáticas (A, B).", "Nenhum dos dois decide sozinho; há ponderação.")

ME(M, 2, "N0019", "Rita foi dispensada em 10/03/2024, após trabalhar oito anos na empresa. Ajuizou reclamação trabalhista em 05/02/2026. Segundo a Constituição, Rita:",
   [("perdeu o direito de ação, pois o prazo é de um ano após a extinção do contrato.", "Errada: o limite é de dois anos."),
    ("pode cobrar os créditos de todo o contrato, pois ajuizou a ação dentro de dois anos.", "Errada: a prescrição quinquenal limita os créditos."),
    ("pode cobrar os créditos dos cinco anos anteriores ao ajuizamento, pois respeitou o limite de dois anos após a extinção do contrato.", "Correta: art. 7º, XXIX."),
    ("pode cobrar apenas os créditos dos dois últimos anos do contrato.", "Errada: confunde os prazos."),
    ("não está sujeita a prescrição, por se tratar de crédito alimentar.", "Errada: há prescrição constitucional.")],
   "C", "Prescrição de cinco anos, até o limite de dois anos após a extinção do contrato: a ação respeitou o biênio; os créditos alcançam os cinco anos anteriores ao ajuizamento.",
   "CF, art. 7º, XXIX.", "Confundir o prazo bienal com o período cobrável (D).", "Bienal: para propor. Quinquenal: o que se cobra.")

ME(M, 2, "N0023", "Após a EC 72/2013, NÃO é direito assegurado pela Constituição aos trabalhadores domésticos:",
   [("o décimo terceiro salário.", "Errada: inciso VIII foi estendido."),
    ("a jornada de oito horas diárias e quarenta e quatro semanais.", "Errada: inciso XIII foi estendido."),
    ("a participação nos lucros ou resultados.", "Correta: o inciso XI não foi estendido."),
    ("a licença à gestante.", "Errada: inciso XVIII foi estendido."),
    ("o aviso prévio proporcional.", "Errada: inciso XXI foi estendido.")],
   "C", "O empregador doméstico não tem atividade lucrativa; a PLR (XI) não foi estendida aos domésticos.",
   "CF, art. 7º, parágrafo único (EC 72/2013); LC 150/2015.", "Supor extensão integral do art. 7º.", "Sem lucro, sem PLR.")

ME(M, 3, "N0028", "Acerca das contribuições sindicais, de acordo com a Constituição e a jurisprudência do STF, assinale a correta.",
   [("A contribuição confederativa pode ser exigida de todos os integrantes da categoria, filiados ou não.", "Errada: SV 40 — só filiados."),
    ("A contribuição sindical continua obrigatória para todos os empregados, por força do art. 8º, IV.", "Errada: tornou-se facultativa (Lei 13.467/2017; ADI 5.794)."),
    ("É constitucional a contribuição assistencial cobrada de todos os empregados da categoria, ainda que não sindicalizados, desde que assegurado o direito de oposição.", "Correta: Tema 935 (2023)."),
    ("A mensalidade sindical é devida por toda a categoria.", "Errada: só associados."),
    ("A Constituição veda qualquer desconto em folha de contribuição sindical.", "Errada: o art. 8º, IV, prevê desconto em folha da confederativa.")],
   "C", "Tema 935: assistencial de todos, com direito de oposição. SV 40: confederativa só de filiados. Sindical: facultativa.",
   "CF, art. 8º, IV; SV 40; ADI 5.794; Tema 935.", "Confundir as quatro contribuições.", "Confederativa: filiados. Sindical: facultativa. Assistencial: todos, com oposição.")

ME(M, 2, "N0027", "Um sindicato ajuíza ação em defesa de direitos individuais homogêneos de toda a categoria. Segundo o STF:",
   [("o sindicato precisa de autorização expressa de cada trabalhador beneficiado.", "Errada: atua como substituto processual."),
    ("o sindicato atua como substituto processual de toda a categoria, filiados ou não, inclusive na liquidação e execução, sem necessidade de autorização.", "Correta: Tema 823."),
    ("só os filiados podem ser beneficiados.", "Errada: toda a categoria."),
    ("o sindicato só pode defender direitos coletivos, nunca individuais.", "Errada: o art. 8º, III, menciona direitos individuais da categoria."),
    ("a legitimidade termina com a sentença, cabendo a execução apenas aos trabalhadores.", "Errada: abrange liquidação e execução.")],
   "B", "O art. 8º, III, confere ao sindicato ampla legitimidade de substituto processual de toda a categoria.",
   "CF, art. 8º, III; STF, Tema 823.", "Aplicar ao sindicato a regra de representação das associações (A).", "Sindicato substitui; associação representa.")

ME(M, 2, "N0032", "Sobre o direito de greve previsto no art. 9º da Constituição, assinale a correta.",
   [("Compete ao Ministério do Trabalho decidir sobre a oportunidade da greve.", "Errada: compete aos trabalhadores."),
    ("Compete aos trabalhadores decidir sobre a oportunidade de exercê-lo e sobre os interesses que devam por meio dele defender, e a lei definirá os serviços essenciais.", "Correta: caput e § 1º."),
    ("A greve é vedada nos serviços essenciais.", "Errada: é permitida, com atendimento das necessidades inadiáveis."),
    ("Os abusos não geram responsabilização, pois a greve é direito fundamental.", "Errada: § 2º prevê as penas da lei."),
    ("A greve só pode defender interesses salariais.", "Errada: os trabalhadores decidem os interesses.")],
   "B", "O art. 9º atribui aos trabalhadores a decisão sobre oportunidade e interesses; a lei define os serviços essenciais e as necessidades inadiáveis; abusos são punidos.",
   "CF, art. 9º; Lei 7.783/1989.", "Proibir greve em serviço essencial (C).", "Essencial ≠ proibido: exige atendimento mínimo.")

CE(M, 2, "N0013", "A relação de emprego é protegida contra despedida arbitrária ou sem justa causa, nos termos de lei ordinária, que preverá indenização compensatória, dentre outros direitos.", False,
   "O inciso I exige lei complementar, ainda não editada; até lá, vale a indenização de 40% do FGTS prevista no ADCT, art. 10, I.",
   "CF, art. 7º, I; ADCT, art. 10, I.", "Trocar lei complementar por lei ordinária.")

CE(M, 2, "N0015", "A participação nos lucros ou resultados é vinculada à remuneração, e a participação na gestão da empresa é direito de todo trabalhador.", False,
   "O inciso XI prevê participação nos lucros desvinculada da remuneração e participação na gestão apenas excepcionalmente, conforme a lei.",
   "CF, art. 7º, XI.", "Inverter 'desvinculada' e ignorar 'excepcionalmente'.")

CE(M, 3, "N0005", "Segundo o STF, a intervenção do Poder Judiciário em políticas públicas voltadas à realização de direitos fundamentais, em caso de ausência ou deficiência grave do serviço, não viola a separação de Poderes, devendo a decisão, em regra, apontar as finalidades a alcançar e determinar à Administração que apresente um plano.", True,
   "É a síntese do Tema 698 (RE 684.612, 2023).", "STF, Tema 698.", "Nenhuma — item correto.")

# ============================================================ DIFÍCIL
ME(D, 4, "N0016", "Jorge trabalha em turnos ininterruptos de revezamento, sem qualquer acordo ou convenção coletiva sobre jornada, cumprindo 8 horas por dia. Diante da Constituição e da jurisprudência, assinale a correta.",
   [("A jornada é regular, pois o limite constitucional é de 8 horas diárias.", "Errada: no revezamento, o limite é de 6 horas."),
    ("A jornada constitucional é de 6 horas, salvo negociação coletiva; as horas excedentes devem ser pagas como extras, com adicional de no mínimo 50%.", "Correta: incisos XIV e XVI."),
    ("A concessão de intervalo para refeição descaracteriza o turno ininterrupto.", "Errada: Súmula 675 do STF."),
    ("A jornada de 6 horas é obrigatória e não pode ser alterada nem por negociação coletiva.", "Errada: há ressalva da negociação coletiva."),
    ("As horas extras são devidas com adicional de exatamente 50%.", "Errada: no mínimo 50%.")],
   "B", "Turnos ininterruptos: 6h, salvo negociação coletiva (XIV); excedente remunerado com no mínimo 50% (XVI); intervalos não descaracterizam o regime (Súmula 675).",
   "CF, art. 7º, XIV e XVI; Súmula 675 do STF.", "Aplicar a regra geral de 8h ao revezamento (A).", "Revezamento = 6h, salvo negociação.")

ME(D, 4, "N0035", "A respeito da greve no serviço público, assinale a alternativa correta.",
   [("Os servidores públicos civis exercerão o direito de greve nos termos de lei complementar federal.", "Errada: o art. 37, VII, fala em lei específica."),
    ("Na ausência da lei específica, o STF determinou a aplicação, no que couber, da Lei 7.783/1989 aos servidores civis, e fixou que a Administração deve descontar os dias parados, permitida a compensação.", "Correta: MIs 670, 708 e 712; Tema 531."),
    ("O desconto dos dias parados é vedado, por violar o direito de greve.", "Errada: Tema 531."),
    ("Policiais militares podem fazer greve, pois a vedação do art. 142 alcança apenas as Forças Armadas.", "Errada: art. 42, § 1º, estende o regime aos militares estaduais."),
    ("Policiais civis podem fazer greve se a mediação fracassar.", "Errada: vedação total (Tema 541).")],
   "B", "Servidores civis: lei específica, com aplicação provisória da Lei 7.783/1989; dias parados descontados, com compensação possível; segurança pública e militares: greve vedada.",
   "CF, arts. 37, VII; 42, § 1º; 142, § 3º, IV; STF, MIs 670, 708 e 712; Temas 531 e 541.", "Confundir lei específica com complementar (A).", "Servidor civil sim (nos limites); segurança e militares não.")

ME(D, 4, "N0029", "Marta registrou candidatura a suplente de diretoria sindical em janeiro de 2024, foi eleita em março de 2024 para mandato de três anos, encerrado em março de 2027. Sem cometer falta grave, foi dispensada em fevereiro de 2028. Assinale a correta.",
   [("A dispensa é inválida, pois a estabilidade dura enquanto ela permanecer filiada.", "Errada: há limite temporal."),
    ("A dispensa é válida, pois a estabilidade do suplente termina com o mandato.", "Errada: vai até um ano após o mandato, inclusive para suplente."),
    ("A dispensa é inválida, pois ocorreu antes de completado um ano do fim do mandato.", "Correta: a estabilidade vai até março de 2028."),
    ("A dispensa é válida, pois suplente não tem estabilidade.", "Errada: 'ainda que suplente'."),
    ("A dispensa é válida, pois a estabilidade só começa com a posse.", "Errada: começa no registro da candidatura.")],
   "C", "Estabilidade desde o registro da candidatura até um ano após o fim do mandato (março de 2028), inclusive para suplente.",
   "CF, art. 8º, VIII.", "Excluir o suplente (D) e encerrar a estabilidade com o mandato (B).", "Faça a linha do tempo: candidatura → mandato → +1 ano.")

ME(D, 3, "N0012", "Sobre a aplicação dos direitos do art. 7º, assinale a correta.",
   [("Os direitos do art. 7º aplicam-se integralmente aos servidores públicos estatutários.", "Errada: o art. 39, § 3º, seleciona os incisos aplicáveis."),
    ("O rol do art. 7º é taxativo, não podendo ser ampliado por lei ou negociação coletiva.", "Errada: 'além de outros que visem à melhoria de sua condição social'."),
    ("A Constituição igualou trabalhadores urbanos e rurais, e o rol do art. 7º é exemplificativo, admitindo outros direitos que visem à melhoria da condição social.", "Correta: caput do art. 7º."),
    ("O trabalhador avulso não tem os mesmos direitos do empregado com vínculo permanente.", "Errada: inciso XXXIV assegura igualdade."),
    ("O salário mínimo pode ser fixado por cada Estado, conforme o custo de vida.", "Errada: é nacionalmente unificado.")],
   "C", "O caput do art. 7º alcança urbanos e rurais e deixa o rol aberto a outros direitos.",
   "CF, art. 7º, caput, IV e XXXIV; art. 39, § 3º.", "Estender o art. 7º integralmente aos servidores (A).", "Caput: 'além de outros' = exemplificativo.")

ME(D, 4, "N0018", "Em relação ao seguro contra acidentes de trabalho e à responsabilidade do empregador, assinale a correta.",
   [("O seguro é custeado pelo trabalhador e exclui qualquer indenização civil.", "Errada: a cargo do empregador e não exclui a indenização."),
    ("O seguro, a cargo do empregador, não exclui a indenização devida quando ele incorrer em dolo ou culpa, e o STF admite a responsabilidade objetiva do empregador em atividades que exponham o trabalhador a risco especial.", "Correta: art. 7º, XXVIII; Tema 932."),
    ("A responsabilidade do empregador é sempre objetiva, em qualquer atividade.", "Errada: o STF a admite em atividades de risco especial ou casos legais."),
    ("A indenização civil é devida somente em caso de dolo.", "Errada: dolo ou culpa."),
    ("O seguro contra acidentes foi revogado pela reforma trabalhista.", "Errada.")],
   "B", "O inciso XXVIII prevê o seguro a cargo do empregador sem excluir a indenização por dolo ou culpa; o Tema 932 admitiu responsabilidade objetiva em atividades de risco especial.",
   "CF, art. 7º, XXVIII; STF, Tema 932.", "Generalizar a responsabilidade objetiva (C).", "Seguro + indenização: são cumuláveis.")

ME(D, 4, "N0002", "Considerando a teoria dos direitos sociais, assinale a alternativa correta.",
   [("Direitos sociais são exclusivamente prestacionais, não havendo direitos sociais com função de defesa.", "Errada: liberdade sindical e greve têm natureza de liberdade."),
    ("Direitos sociais são de primeira dimensão, ligados à liberdade.", "Errada: segunda dimensão."),
    ("Embora muitos direitos sociais dependam de políticas públicas, eles possuem força normativa, vinculam os Poderes e podem ser objeto de controle judicial em caso de omissão ou deficiência grave.", "Correta."),
    ("A vedação ao retrocesso impede qualquer reforma legislativa em matéria social.", "Errada: impede retrocessos arbitrários que esvaziem o núcleo."),
    ("O art. 5º, § 1º, não se aplica aos direitos sociais.", "Errada: refere-se aos direitos e garantias fundamentais em geral.")],
   "C", "Direitos sociais têm força normativa e eficácia jurídica, ainda que dependam de políticas públicas; o controle judicial é admitido com parâmetros (Tema 698).",
   "CF, arts. 5º, § 1º, e 6º; STF, Tema 698; doutrina.", "Tratar a vedação ao retrocesso como absoluta (D).", "Prestacionais na maioria, mas nunca meras recomendações.")

CE(D, 4, "N0023", "Por força da EC 72/2013, foram assegurados aos trabalhadores domésticos, independentemente de regulamentação, o FGTS, o seguro-desemprego e o adicional noturno.", False,
   "Esses direitos (III, II e IX) estão no grupo que depende das condições estabelecidas em lei — regulamentados pela LC 150/2015.",
   "CF, art. 7º, parágrafo único; LC 150/2015.", "Ignorar a parte do parágrafo único que remete à lei.")

CE(D, 4, "N0026", "A Constituição Federal adota o modelo de pluralidade sindical, nos termos da Convenção 87 da OIT, ratificada pelo Brasil.", False,
   "A CF adota a unicidade sindical (art. 8º, II); a Convenção 87 da OIT, que prevê a liberdade de pluralidade, não foi ratificada pelo Brasil.",
   "CF, art. 8º, II.", "Confundir unicidade com pluralidade.")

CE(D, 3, "N0009", "A assistência social será prestada a quem dela necessitar, independentemente de contribuição à seguridade social, ao passo que a previdência social tem caráter contributivo.", True,
   "É a distinção dos arts. 201 (previdência contributiva) e 203 (assistência independente de contribuição).", "CF, arts. 6º, 201 e 203.", "Nenhuma — item correto.")

CE(D, 4, "N0037", "É assegurada a participação dos trabalhadores, com exclusão dos empregadores, nos colegiados dos órgãos públicos em que seus interesses profissionais ou previdenciários sejam objeto de discussão e deliberação.", False,
   "O art. 10 assegura a participação dos trabalhadores e dos empregadores.", "CF, art. 10.", "Excluir os empregadores.")

keys = {n["key"] for n in json.load(open("nodes.json", encoding="utf8"))["nodes"]}
save_questions(keys=keys)
