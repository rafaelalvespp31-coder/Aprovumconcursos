from helpers import *

# ============================================================== 7 — Caput e igualdade
sec("explicacao", "Módulo 2 — Caput do art. 5º e princípio da igualdade (inciso I)", """
### O caput

O caput afirma que **todos são iguais perante a lei, sem distinção de qualquer natureza**, e garante a brasileiros e estrangeiros residentes no País a **inviolabilidade** de cinco direitos-base:

**VI-LI-IG-SE-PRO** → **Vi**da · **Li**berdade · **Ig**ualdade · **Se**gurança · **Pro**priedade

Os 79 incisos e os quatro parágrafos do art. 5º desdobram esses cinco valores.

**Direito à vida — duas dimensões:**
- **Direito de continuar vivo** (não ser privado arbitrariamente da vida). Por isso a CF **veda a pena de morte**, **salvo em caso de guerra declarada** (XLVII, a).
- **Direito a uma vida digna** (condições mínimas de existência) — liga-se aos direitos sociais.

📌 O STF já decidiu que pesquisas com **células-tronco embrionárias** (ADI 3.510) e a **interrupção da gestação de feto anencéfalo** (ADPF 54) não violam o direito à vida — exemplos de que o direito à vida também comporta ponderação.

---

### Igualdade formal × igualdade material

| | **Igualdade formal** | **Igualdade material** |
|---|---|---|
| Ideia | Todos recebem o **mesmo tratamento** da lei | Tratar **desigualmente os desiguais, na medida de sua desigualdade** |
| Foco | Igualdade **perante** a lei | Igualdade **real**, de fato |
| Exemplo | Mesma regra de trânsito para todos | Cotas raciais e sociais, aposentadoria diferenciada, vagas para pessoas com deficiência |

**Ações afirmativas** são medidas temporárias que estabelecem diferenciações para promover igualdade efetiva. O STF julgou **constitucionais** as **cotas raciais** em universidades (ADPF 186) e em concursos públicos federais (ADC 41).

**Quando uma diferenciação é legítima?** Não basta existir uma diferença entre as pessoas. É preciso:
1. um **critério** de diferenciação (ex.: idade, sexo, deficiência);
2. uma **justificativa racional** entre o critério e o tratamento diferente;
3. **compatibilidade** com os valores constitucionais.

Exemplo cobrado: o STF admite **limite de idade em concurso público** apenas quando **justificado pela natureza das atribuições** do cargo e **previsto em lei** (Súmula 683 do STF).

---

### Inciso I — homens e mulheres

Homens e mulheres são **iguais em direitos e obrigações**, "**nos termos desta Constituição**". A ressalva é importante: a **própria CF** traz diferenciações legítimas, como:
- licença-gestante maior que a licença-paternidade (art. 7º, XVIII e XIX);
- proteção do mercado de trabalho da mulher (art. 7º, XX);
- regras previdenciárias distintas (art. 201, § 7º);
- isenção do serviço militar obrigatório em tempo de paz para mulheres (art. 143, § 2º).

⚠️ **Pegadinha:** "Por força do princípio da igualdade, a lei não pode estabelecer qualquer diferenciação entre homens e mulheres." **Errado** — a igualdade proíbe diferenciações **arbitrárias**, não **toda** diferenciação.
""" + ex(
    "Edital de concurso para agente penitenciário exige que o candidato tenha no máximo 35 anos, mas a lei da carreira não prevê esse limite.",
    "O limite de idade é válido?",
    "**Não.** Pela jurisprudência do STF (Súmula 683), limite de idade em concurso só é legítimo se **justificado pela natureza das atribuições** do cargo **e previsto em lei**. Previsão apenas no edital viola a igualdade e a legalidade.",
    [Q("reparticao", "Candidato de 38 anos lê o edital.", [P("cidadao", "centro", "pega", "surpreso", "documento")], (0, "Limite de 35 anos? Cadê a lei?")),
     Q("forum", "O juiz analisa a regra do edital.", [P("juiz", "centro", "fala", "serio")], (0, "Sem lei, o limite não vale."))],
    "Só com lei e justificativa | alerta",
    fluxo("Limite de idade em concurso", [("Previsto em lei?", "erro", "Só no edital"), ("Justificado pelas atribuições?", "neutro")], ("Limite inválido", "erro"))),
    N(14, 15))
m("Igualdade, legalidade e integridade (art. 5º, caput, I a III)", 7)

# ============================================================== 8 — Legalidade e tortura
sec("explicacao", "Módulo 2 — Legalidade (inciso II) e vedação à tortura (inciso III)", """
### Inciso II — legalidade

**Ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei.** Toda obrigação ou restrição precisa de **fundamento jurídico** em lei.

| Destinatário | Sentido da legalidade |
|---|---|
| **Particular** | Pode fazer **tudo o que a lei não proíbe** (autonomia da vontade) |
| **Administração pública** | Só pode fazer **o que a lei autoriza ou determina** (art. 37, caput) |

**Legalidade × reserva legal:**
| | **Legalidade (genérica)** | **Reserva legal** |
|---|---|---|
| Exigência | Fundamento em **ato normativo** previsto no ordenamento | A CF exige **lei formal** (às vezes lei específica ou complementar) para certa matéria |
| Abrangência | Ampla | Matérias determinadas |
| Exemplo | Obrigações em geral | Crimes e penas (XXXIX); qualificações profissionais (XIII); interceptação telefônica (XII) |

📌 A legalidade **não exige lei formal para absolutamente tudo**: a própria CF prevê competências normativas (decretos regulamentares, resoluções, medidas provisórias, nos limites constitucionais). Mas em matéria **penal**, a reserva é **absoluta**: **não cabe medida provisória** sobre direito penal (art. 62, § 1º, I, b).

**Legalidade × legitimidade:** uma norma pode ser **legal** (existir formalmente) e ainda assim ser **ilegítima** ou **inconstitucional** por violar direitos fundamentais. A legalidade é condição necessária, não suficiente.

---

### Inciso III — tortura, tratamento desumano ou degradante

**Ninguém será submetido a tortura nem a tratamento desumano ou degradante.** Protege a **integridade física e moral** e liga-se diretamente à **dignidade da pessoa humana**.

Relações que a prova cobra:
- **Pessoa presa:** o inciso XLIX assegura o respeito à integridade física e moral do preso.
- **Uso da força:** deve ser **legítimo, necessário e proporcional**. A **Súmula Vinculante 11** limita o uso de **algemas** (ver jurisprudência).
- **Provas:** prova obtida por tortura é **ilícita** (LVI) e deve ser excluída.
- **Crime equiparado a hediondo:** a tortura é **inafiançável** e **insuscetível de graça ou anistia** (XLIII). A Lei 9.455/1997 define os crimes de tortura.
- **Punições cruéis** são vedadas (XLVII, e).

📌 **Conceitos:** a CF proíbe a conduta; a **definição penal** de tortura está na **Lei 9.455/1997**, e o conceito internacional na **Convenção da ONU contra a Tortura**. A banca pode cobrar que o conceito da lei brasileira é **mais amplo** que o da Convenção, pois admite que **particulares** pratiquem tortura (não só agentes públicos).

⚠️ **Pegadinha:** "A vedação à tortura admite exceção em situações de grave ameaça à segurança pública." **Errado** — a doutrina majoritária aponta a vedação à tortura como um dos raros direitos de caráter **absoluto**.
""" + ex(
    "Durante um interrogatório, um policial ameaça e agride o suspeito até que ele confesse onde escondeu a arma usada em um crime.",
    "A confissão e a arma encontrada a partir dela podem ser usadas no processo?",
    "**Não.** A confissão é prova **ilícita** (obtida mediante tortura — art. 5º, III e LVI) e a arma é **prova derivada** da ilícita (teoria dos frutos da árvore envenenada), salvo se demonstrada **fonte independente** ou **descoberta inevitável**. Além disso, o agente responde pelo crime de tortura (Lei 9.455/1997).",
    [Q("delegacia", "O interrogatório sai do controle.", [P("delegado", "esq", "ataca", "bravo"), P("investigado", "dir", "neutro", "triste")], (0, "Fala onde está a arma!"), "PÁ!"),
     Q("forum", "A defesa pede a exclusão das provas.", [P("advogado", "esq", "fala", "serio"), P("juiz", "dir", "neutro", "serio")], (0, "Prova obtida sob tortura!"))],
    "Prova ilícita e derivada | erro",
    fluxo("Tortura e provas", [("Confissão sob agressão", "erro", "Art. 5º, III"), ("Arma achada pela confissão", "alerta", "Prova derivada")], ("Ambas excluídas, salvo fonte independente", "erro"))),
    N(16, 17))
m("Igualdade, legalidade e integridade (art. 5º, caput, I a III)", 8)

# ============================================================== 9 — Manifestação, crença, escusa, expressão
sec("explicacao", "Módulo 2 — Manifestação do pensamento, crença, escusa de consciência e liberdade de expressão (incisos IV a IX)", """
### IV e V — Manifestação do pensamento e direito de resposta

- **IV:** é **livre** a manifestação do pensamento, sendo **vedado o anonimato**. O anonimato é proibido para permitir a **responsabilização** de quem abusa da liberdade.
- **V:** é assegurado o **direito de resposta, proporcional ao agravo**, **além** da **indenização** por dano **material, moral ou à imagem**.

📌 **Denúncia anônima:** o STF admite que a "notícia anônima" sirva para **iniciar diligências preliminares** de apuração, mas **não pode, sozinha**, fundamentar a instauração de inquérito ou medidas invasivas — é preciso apurar sua verossimilhança antes.

📌 O direito de resposta foi regulamentado pela **Lei 13.188/2015**. A antiga **Lei de Imprensa** (Lei 5.250/1967) foi considerada **não recepcionada** pelo STF (ADPF 130).

**Liberdade de expressão não é imunidade:** quem abusa responde **depois**, civil e penalmente (calúnia, difamação, injúria, racismo, ameaça, incitação ao crime). A regra é a **responsabilização posterior**, e não a **censura prévia** (ver inciso IX).

---

### VI, VII e VIII — Consciência, crença e escusa

- **VI:** é **inviolável** a liberdade de **consciência e de crença**; é assegurado o **livre exercício dos cultos religiosos** e garantida, **na forma da lei**, a **proteção aos locais de culto e a suas liturgias**.
- **VII:** é assegurada, **nos termos da lei**, a **prestação de assistência religiosa** nas entidades civis e militares de **internação coletiva** (presídios, hospitais, quartéis).
- **VIII:** ninguém será **privado de direitos** por motivo de crença religiosa ou de convicção filosófica ou política, **salvo** se as invocar para **eximir-se de obrigação legal a todos imposta** **e recusar-se a cumprir prestação alternativa**, fixada em lei.

**Escusa de consciência — como funciona:**
1. A pessoa invoca crença ou convicção para não cumprir uma obrigação legal geral (ex.: serviço militar, júri, convocação eleitoral).
2. A lei oferece uma **prestação alternativa**.
3. Se ela **recusar também a alternativa**, poderá ser **privada de direitos** — a CF prevê a **perda ou suspensão de direitos políticos** nesse caso (art. 15, IV — Parte III).

⚠️ A escusa **não é autorização irrestrita** para descumprir qualquer obrigação legal. Exige obrigação **a todos imposta** e prestação alternativa **prevista em lei**.

📌 **Estado laico:** o Brasil é um Estado **laico** (art. 19, I) — não adota religião oficial, mas protege a liberdade religiosa. O STF admitiu o **ensino religioso confessional** facultativo em escolas públicas (ADI 4.439) e a **imunidade tributária** dos templos (art. 150, VI, b).

📌 **Tema 1.021 do STF:** admite-se a fixação de **datas alternativas** para concurso ou atividade por motivo de crença religiosa, desde que presentes a razoabilidade, a preservação da igualdade e sem ônus desproporcional à Administração.

---

### IX — Expressão intelectual, artística, científica e de comunicação

É **livre** a expressão da atividade intelectual, artística, científica e de comunicação, "**independentemente de censura ou licença**". A Constituição reforça isso no art. 220, § 2º: é vedada **toda e qualquer censura de natureza política, ideológica e artística**.

📌 **Classificação indicativa** (art. 21, XVI e art. 220, § 3º) **não é censura**: apenas informa faixa etária e horário recomendados. O STF considerou inconstitucional punir emissoras por exibir programas fora do horário recomendado (ADI 2.404) — a classificação é **indicativa**, não impositiva.
""" + ex(
    "Mateus, testemunha de Jeová convocado para o serviço militar obrigatório, alega convicção religiosa e se recusa a servir. A lei oferece serviço alternativo, que ele também recusa.",
    "Quais as consequências para Mateus?",
    "Ao recusar a obrigação legal geral **e** a **prestação alternativa**, Mateus pode ser **privado de direitos** (art. 5º, VIII): a CF prevê a **perda ou suspensão dos direitos políticos** (art. 15, IV). Se tivesse cumprido a alternativa, não sofreria qualquer restrição.",
    [Q("reparticao", "Mateus apresenta sua escusa de consciência.", [P("cidadao", "esq", "fala", "serio"), P("servidor", "dir", "pega", "neutro", "documento")], (0, "Minha crença não permite servir.")),
     Q("reparticao", "Oferecida a prestação alternativa, ele recusa.", [P("servidor", "esq", "aponta", "serio", "documento"), P("cidadao", "dir", "bracos_cruzados", "bravo")], (1, "Também não vou cumprir."))],
    "Recusou as duas: perde direitos | alerta",
    fluxo("Escusa de consciência (art. 5º, VIII)", [("Obrigação legal a todos imposta", "neutro"), ("Invoca crença ou convicção", "ok"), ("Lei oferece prestação alternativa", "neutro"), ("Recusa também a alternativa", "erro")], ("Privação de direitos (art. 15, IV)", "alerta"))),
    N(19, 20, 21, 22))
m("Liberdades individuais (art. 5º, IV a IX e XIII a XX)", 9)

# ============================================================== 10 — Profissão, informação, locomoção
sec("explicacao", "Módulo 2 — Liberdade profissional, acesso à informação e liberdade de locomoção (incisos XIII, XIV, XV e XXXIII)", """
### XIII — Liberdade de trabalho, ofício ou profissão

É livre o exercício de qualquer trabalho, ofício ou profissão, "**atendidas as qualificações profissionais que a lei estabelecer**". É o exemplo clássico de **norma de eficácia contida**: o direito vale desde já, mas a **lei pode restringi-lo**.

O que o STF já decidiu:
- **Exame da OAB** é **constitucional** (RE 603.583): a advocacia envolve risco à coletividade, o que justifica a exigência.
- **Diploma de jornalismo** **não pode** ser exigido (RE 511.961): a profissão está ligada à liberdade de expressão e não oferece risco que justifique a restrição.
- **Músicos** não precisam de inscrição em conselho profissional (RE 795.467) — a atividade artística não gera risco social.

📌 Critério: a restrição legal só é legítima quando a atividade exige **conhecimento técnico** e seu exercício inadequado pode causar **dano a terceiros**.

---

### XIV e XXXIII — Informação

- **XIV:** é assegurado a **todos** o **acesso à informação** e resguardado o **sigilo da fonte**, quando **necessário ao exercício profissional**. O sigilo da fonte protege o jornalista: ele não pode ser obrigado a revelar quem lhe passou a informação.
- **XXXIII:** todos têm direito a receber dos **órgãos públicos** informações de **interesse particular, coletivo ou geral**, prestadas **no prazo da lei**, **sob pena de responsabilidade**, **ressalvadas** aquelas cujo sigilo seja **imprescindível à segurança da sociedade e do Estado**. A regulamentação está na **Lei de Acesso à Informação** (Lei 12.527/2011).

**Não confunda:**
| Situação | Instrumento adequado |
|---|---|
| Quero informações **públicas** sobre atividade estatal (ex.: gastos de uma prefeitura) e o órgão negou | **Mandado de segurança** (direito do inciso XXXIII) |
| Quero **meus dados pessoais** em registro público ou de caráter público | **Habeas data** (LXXII) |
| Quero **dados pessoais de outra pessoa** | Em regra, não há direito: protegem-se a intimidade e os dados (X e LXXIX) |

📌 O STF admite a divulgação, em sítio oficial, da **remuneração nominal de servidores** públicos (ARE 652.777 — Tema 483): prevalecem a publicidade e o controle social.

---

### XV — Liberdade de locomoção

É livre a locomoção no território nacional **em tempo de paz**, podendo qualquer pessoa, **nos termos da lei**, **nele entrar, permanecer ou dele sair com seus bens**.

Pontos de prova:
- A liberdade é garantida **em tempo de paz** — em guerra e em estado de sítio pode haver restrições.
- Abrange **entrar, permanecer e sair** do território, **com os bens**, nos termos da lei (ex.: regras alfandegárias e migratórias).
- Restrições legalmente admissíveis: **prisão** (nas hipóteses constitucionais), **medidas cautelares** (monitoramento eletrônico, proibição de ausentar-se da comarca), **retenção de passaporte** por ordem judicial.
- A garantia processual da locomoção é o **habeas corpus** (LXVIII), cabível quando houver **ameaça ou violação ilegal** a essa liberdade.

⚠️ **Pegadinha:** "A liberdade de locomoção é assegurada em qualquer circunstância." **Errado** — "**em tempo de paz**" e "**nos termos da lei**".
""", N(23, 24, 25))
m("Liberdades individuais (art. 5º, IV a IX e XIII a XX)", 10)

# ============================================================== 11 — Reunião e associação
sec("explicacao", "Módulo 2 — Direito de reunião (XVI) e liberdade de associação (XVII a XX)", """
### XVI — Reunião: os requisitos constitucionais

Todos podem reunir-se **pacificamente**, **sem armas**, em **locais abertos ao público**, **independentemente de autorização**, desde que **não frustrem outra reunião anteriormente convocada** para o mesmo local, sendo apenas exigido **prévio aviso** à autoridade competente.

**Checklist da reunião (macete PASLI-AV):**
- **P**acífica
- **A**rmas: **sem** armas
- **S**em autorização (independe dela)
- **L**ocal aberto ao público
- **I**nédita no local: não frustrar reunião **anteriormente convocada** para o mesmo local
- **AV**iso **prévio** à autoridade competente

**Aviso × autorização:**
| | **Aviso prévio** | **Autorização** |
|---|---|---|
| Natureza | **Comunicação** ao poder público | **Licença** que o poder público pode negar |
| Exigido pela CF? | **Sim** | **Não** — a reunião independe de autorização |
| Finalidade | Permitir que o Estado organize trânsito e segurança e evite choque de reuniões | — |

📌 **Tema 855 do STF (RE 806.339):** a exigência constitucional de aviso prévio relaciona-se ao **dever de informar** a autoridade para que exerça suas funções — o STF fixou que a falta de aviso **não torna, por si só, a reunião ilícita** a ponto de autorizar sua dissolução, desde que pacífica (confira o alcance da tese no material de jurisprudência).

📌 **Reunião × locomoção:** a reunião é um direito **coletivo no exercício** e individual na titularidade. Se for impedida ilegalmente, a garantia é o **mandado de segurança** (e não o habeas corpus, que protege a locomoção).

📌 No **estado de defesa** e no **estado de sítio**, o direito de reunião pode sofrer **restrições** (arts. 136, § 1º, I, a, e 139, IV).

---

### XVII a XX — Associação

- **XVII:** é **plena** a liberdade de associação para **fins lícitos**, **vedada** a de **caráter paramilitar**.
- **XVIII:** a criação de associações e, **na forma da lei**, a de **cooperativas** **independem de autorização**, sendo **vedada a interferência estatal** em seu funcionamento.
- **XIX:** as associações só podem ser **compulsoriamente dissolvidas** ou ter suas atividades **suspensas** por **decisão judicial**, exigindo-se, **no primeiro caso** (dissolução), o **trânsito em julgado**.
- **XX:** **ninguém** poderá ser **compelido a associar-se ou a permanecer associado**.

**Quadro que mais cai:**
| Medida | Exige decisão judicial? | Exige trânsito em julgado? |
|---|---|---|
| **Suspensão** das atividades | **Sim** | **Não** |
| **Dissolução compulsória** | **Sim** | **Sim** |

⚠️ **Pegadinhas:**
- "A suspensão das atividades de associação exige trânsito em julgado." **Errado** — só a **dissolução**.
- "Cooperativas dependem de autorização estatal." **Errado** — independem, **na forma da lei**.
- "A dissolução pode ocorrer por ato administrativo." **Errado** — só por **decisão judicial**.

**Associação × sindicato × partido:**
| | Associação | Sindicato | Partido político |
|---|---|---|---|
| Base | art. 5º, XVII a XXI | art. 8º | art. 17 |
| Registro | Registro civil | Registro no órgão competente (vedada interferência) | Registro civil + estatuto no **TSE** |
| Unicidade | Não há | **Unicidade sindical** na base territorial | Não há |
| Peculiaridade | Liberdade plena para fins lícitos | Contribuição e representação da categoria | **Caráter nacional**, vedada organização paramilitar |
""" + ex(
    "Um grupo de moradores convoca, pelas redes sociais, uma passeata pacífica na avenida principal da cidade e envia ofício à prefeitura informando data, hora e trajeto. O prefeito responde: 'Não autorizo'.",
    "A passeata pode acontecer?",
    "**Sim.** A reunião **independe de autorização** — a CF exige apenas o **aviso prévio**, que foi dado. O prefeito não pode condicionar o direito à sua concordância. Se houver reunião **anteriormente convocada** para o mesmo local e horário, aí sim a segunda não poderá frustrá-la.",
    [Q("reparticao", "Os moradores protocolam o aviso na prefeitura.", [P("cidadao", "esq", "pega", "feliz", "documento"), P("gestor", "dir", "bracos_cruzados", "bravo")], (1, "Não autorizo!")),
     Q("rua", "A passeata acontece de forma pacífica.", [P("cidadao", "esq", "fala", "feliz"), P("pm", "dir", "neutro", "neutro")], (1, "Aviso recebido, trânsito organizado."))],
    "Aviso, não autorização | ok",
    comp("Reunião em local público", ("Aviso prévio", "Exigido pela CF", "ok", ["comunica data e local", "permite organizar a segurança"]), ("Autorização", "Não exigida", "erro", ["Estado não pode negar", "reunião pacífica e sem armas"]))),
    N(26, 27))
m("Liberdades individuais (art. 5º, IV a IX e XIII a XX)", 11)

# ============================================================== 12 — Intimidade e sigilo
sec("explicacao", "Módulo 3 — Intimidade, vida privada, honra e imagem (X) e sigilo das comunicações (XII)", """
### X — Intimidade, vida privada, honra e imagem

São **invioláveis** a intimidade, a vida privada, a honra e a imagem das pessoas, **assegurado o direito a indenização** pelo dano **material ou moral** decorrente de sua violação.

| Bem jurídico | O que protege | Exemplo de violação |
|---|---|---|
| **Intimidade** | O núcleo mais reservado: segredos, relações íntimas, saúde | Divulgar diagnóstico médico |
| **Vida privada** | Relações familiares, profissionais e sociais fora do público | Expor a rotina doméstica de alguém |
| **Honra objetiva** | Reputação perante a sociedade | Imputar fato desonroso (difamação) |
| **Honra subjetiva** | Autoestima, dignidade pessoal | Xingamento (injúria) |
| **Imagem** | Representação física e atributos da pessoa | Usar foto de alguém em propaganda sem autorização |

📌 **Súmula 403 do STJ:** independe de prova do prejuízo a indenização pela publicação não autorizada de imagem de pessoa com **fins econômicos ou comerciais**.
📌 **Súmula 227 do STJ:** a **pessoa jurídica** pode sofrer **dano moral** (honra objetiva).
📌 **Direito ao esquecimento:** o STF (Tema 786) considerou **incompatível** com a Constituição a ideia de um direito ao esquecimento entendido como poder de impedir a divulgação de fatos verídicos e licitamente obtidos; eventuais excessos são analisados caso a caso.

---

### XII — Sigilo da correspondência e das comunicações

Pelo texto: é **inviolável** o sigilo da **correspondência** e das **comunicações telegráficas**, **de dados** e das **comunicações telefônicas**, **salvo, no último caso**, por **ordem judicial**, nas **hipóteses e na forma que a lei estabelecer** para fins de **investigação criminal ou instrução processual penal**.

**Os quatro requisitos da interceptação telefônica (macete OJ-LEI-PENAL):**
1. **Ordem judicial** (nunca de delegado, MP ou CPI);
2. **Hipóteses e forma previstas em lei** (Lei 9.296/1996);
3. Finalidade **penal**: **investigação criminal** ou **instrução processual penal**;
4. Só para as comunicações **telefônicas** (e, pela Lei 9.296, também o fluxo de comunicações em **sistemas de informática e telemática**).

⚠️ **Prova emprestada:** a interceptação não pode ser decretada em processo civil ou administrativo, mas o STF e o STJ admitem que a prova **licitamente produzida** no processo penal seja **emprestada** a processo administrativo disciplinar, observado o contraditório (Súmula 591 do STJ).

**Regimes diferentes — não confunda:**
| Situação | Regra |
|---|---|
| **Interceptação** de conversa telefônica em curso | Só com ordem judicial, para fins penais (Lei 9.296/1996) |
| **Dados armazenados** (registros de ligações, extratos, dados cadastrais, conteúdo de celular apreendido) | Não é "interceptação"; a jurisprudência exige, em regra, **ordem judicial** para acessar o conteúdo do aparelho, com exceções específicas |
| **Quebra de sigilo bancário e fiscal** | Ordem judicial; **CPI** pode determinar (art. 58, § 3º); a Receita Federal pode acessar dados bancários na forma da LC 105/2001 (STF admitiu) |
| **Gravação ambiental ou telefônica por um dos interlocutores** | **Lícita** em regra, mesmo sem conhecimento do outro (STF, Tema 237), salvo causa legal de sigilo |
| **Correspondência de preso** | O STF admite, excepcionalmente, a interceptação pela administração penitenciária por razões de segurança (LEP, art. 41, p. ú.) |

⚠️ **Pegadinhas:**
- "A CPI pode determinar interceptação telefônica." **Errado** — é matéria sob **reserva de jurisdição**. A CPI pode quebrar sigilo **telefônico** (registros), não **interceptar**.
- "O sigilo de dados não admite qualquer restrição." **Errado** — nenhum direito é absoluto; a jurisprudência admite o acesso nas hipóteses legais e com controle judicial.
""", N(29, 31))
m("Privacidade, domicílio e dados (art. 5º, X, XI, XII e LXXIX)", 12)
