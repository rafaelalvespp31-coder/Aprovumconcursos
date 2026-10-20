from helpers import *

# ============================================================== 1 — Introdução
sec("introducao", "Módulo 1 — Introdução: nacionalidade, direitos políticos e partidos (arts. 12 a 17)", """
Esta é a **Parte III** de Direitos e Garantias Fundamentais. Ela reúne três capítulos do Título II:

| Capítulo | Artigos | Pergunta central |
|---|---|---|
| **III — Nacionalidade** | 12 e 13 | **Quem é brasileiro** (nato ou naturalizado) e que diferenças isso gera? |
| **IV — Direitos políticos** | 14 a 16 | **Quem vota, quem pode ser votado** e quando se perdem esses direitos? |
| **V — Partidos políticos** | 17 | Como os partidos são **criados, organizados e financiados**? |

🎯 **O que mais cai:** hipóteses de brasileiro nato (as três alíneas), requisitos de naturalização (1 ano para lusófonos; 15 anos na extraordinária), **cargos privativos de nato** (MP3.COM / "MP3 DOS"), **perda da nacionalidade após a EC 131/2023**, voto obrigatório e facultativo, **idades mínimas**, **inelegibilidade reflexa**, **desincompatibilização (6 meses)**, perda × suspensão de direitos políticos (art. 15), **anterioridade eleitoral (1 ano)** e **cláusula de desempenho**.

**Cidadania × nacionalidade (primeira distinção):**
- **Nacionalidade** é o **vínculo jurídico-político** entre a pessoa e o Estado (quem pertence ao povo brasileiro).
- **Cidadania**, em sentido estrito, é a **participação política** — o exercício dos direitos políticos (votar e ser votado), que começa com o **alistamento eleitoral**.
- Todo cidadão é nacional, mas **nem todo nacional é cidadão** (ex.: uma criança brasileira de 10 anos é nacional, mas não exerce direitos políticos).

📌 **Separe as fontes:** regras **constitucionais** (arts. 12 a 17), **legais** (Lei de Migração — Lei 13.445/2017; Código Eleitoral; LC 64/1990 e LC 135/2010; Lei dos Partidos — Lei 9.096/1995; Lei das Eleições — Lei 9.504/1997) e **jurisprudência** do STF e do TSE.
""" + ex(
    "Aos 16 anos, Gabriel, brasileiro nato, quer votar nas eleições municipais. Seu primo Henrique, de 17 anos, quer se candidatar a vereador.",
    "Gabriel pode votar? Henrique pode se candidatar?",
    "**Gabriel pode votar**: para maiores de 16 e menores de 18 anos, o alistamento e o voto são **facultativos** (art. 14, § 1º, II, c). **Henrique não pode se candidatar**: a idade mínima para vereador é de **18 anos** (art. 14, § 3º, VI, d) — ser eleitor não basta para ser elegível.",
    [Q("escola", "Gabriel tira o título de eleitor aos 16 anos.", [P("cidadao", "esq", "pega", "feliz", "documento"), P("servidor", "dir", "fala", "neutro")], (1, "Seu voto é facultativo!")),
     Q("reparticao", "Henrique tenta registrar a candidatura.", [P("cidadao", "esq", "fala", "surpreso"), P("servidor", "dir", "aponta", "serio", "documento")], (1, "Vereador exige 18 anos."))],
    "Votar ≠ ser votado | alerta",
    comp("Capacidade eleitoral", ("Ativa (votar)", "Facultativa aos 16 e 17 anos", "ok", ["alistamento eleitoral", "art. 14, § 1º"]), ("Passiva (ser votado)", "Vereador: 18 anos", "erro", ["condições de elegibilidade", "art. 14, § 3º"]))),
    N(1, 2, 19, 36))
m("Introdução", 1)

# ============================================================== 2 — Conceitos de nacionalidade
sec("conceitos_fundamentais", "Módulo 2 — Nacionalidade: conceitos, espécies, critérios, polipatridia e apatridia", """
### Conceitos vizinhos (cobrados em prova)

| Conceito | Significado |
|---|---|
| **Nacionalidade** | Vínculo jurídico-político que liga a pessoa a um Estado |
| **Povo** | Conjunto dos **nacionais** (natos e naturalizados) — elemento humano do Estado |
| **População** | Todos os que **estão no território** (nacionais e estrangeiros) — conceito demográfico |
| **Nação** | Grupo unido por **laços culturais, históricos e linguísticos** — conceito sociológico |
| **Cidadão** | Nacional no gozo dos **direitos políticos** |

### Nacionalidade originária × derivada

| | **Originária (primária)** | **Derivada (secundária)** |
|---|---|---|
| Como se adquire | Pelo **nascimento** (fato natural) | Por **ato de vontade** (naturalização) |
| Quem concede | A própria **Constituição** — o Estado não escolhe | O Estado, **discricionariamente** (salvo a extraordinária, que gera direito subjetivo) |
| No Brasil | **Brasileiro nato** (art. 12, I) | **Brasileiro naturalizado** (art. 12, II) |

### Critérios de atribuição da nacionalidade originária

- **Ius soli** (critério territorial): é nacional quem **nasce no território** — típico de países de imigração (Brasil, EUA).
- **Ius sanguinis** (critério sanguíneo): é nacional o **filho de nacional**, onde quer que nasça — típico de países de emigração (Itália, Alemanha, Portugal).
- **O Brasil adota um sistema misto:** a **regra** é o **ius soli** (alínea a), combinado com hipóteses de **ius sanguinis** acompanhadas de outros requisitos (alíneas b e c).

### Polipatridia e apatridia

- **Polipátrida** (multinacional): pessoa com **mais de uma nacionalidade** — ex.: filho de italianos nascido no Brasil (ius soli brasileiro + ius sanguinis italiano).
- **Apátrida** (*heimatlos*): pessoa **sem nacionalidade** — ocorre, por exemplo, quando alguém nasce num país de ius sanguinis, filho de nacionais de país de ius soli.
- O direito internacional procura **evitar a apatridia** (Declaração Universal, art. 15; Pacto de San José, art. 20). Por isso a EC 131/2023 ressalvou, na perda por pedido, as situações que **acarretem apatridia**, e a EC 54/2007 restabeleceu o **registro consular** como forma de aquisição da nacionalidade nata.
""", N(2, 3, 4))
m("Nacionalidade (arts. 12 e 13)", 2)

# ============================================================== 3 — Natos
sec("explicacao", "Módulo 2 — Brasileiros natos: as três hipóteses do art. 12, I", """
| Alínea | Onde nasceu | Requisito | Critério |
|---|---|---|---|
| **a** | **No Brasil** | Ainda que de pais estrangeiros, **desde que estes não estejam a serviço de seu país** | **Ius soli** |
| **b** | **No estrangeiro** | Pai brasileiro **ou** mãe brasileira, **desde que qualquer deles esteja a serviço da República Federativa do Brasil** | Ius sanguinis + **serviço do Brasil** (critério funcional) |
| **c** | **No estrangeiro** | Pai brasileiro **ou** mãe brasileira, **desde que** (1) **registrado em repartição brasileira competente** **ou** (2) **venha a residir no Brasil e opte, em qualquer tempo, depois de atingida a maioridade**, pela nacionalidade brasileira | Ius sanguinis + **registro** ou **residência + opção** |

### Detalhes de cada alínea

**Alínea a — nascidos no Brasil:**
- "Território brasileiro" inclui o espaço aéreo, o mar territorial e navios e aeronaves **públicos** brasileiros onde quer que estejam.
- **Exceção:** filho de **dois estrangeiros** **a serviço de seu país** (ex.: filho do embaixador da França nascido em Brasília) **não** é brasileiro nato. Se **apenas um** dos pais estrangeiros estiver a serviço de seu país e o outro não, a doutrina entende que a exceção não se aplica; e se um dos pais for brasileiro, a criança é brasileira nata.
- Se os pais estrangeiros estiverem a serviço de **outro país** que não o seu (ex.: franceses a serviço da ONU ou da Itália), a exceção **não** se aplica: o filho é brasileiro nato.

**Alínea b — a serviço do Brasil:**
- "A serviço da República Federativa do Brasil" abrange a administração **direta e indireta** de **qualquer ente** (União, Estados, DF e Municípios) — ex.: diplomata, servidor de autarquia em missão no exterior.
- **Basta um** dos pais ser brasileiro e estar a serviço do Brasil.

**Alínea c — redação da EC 54/2007:**
- **Registro em repartição brasileira competente** (consulado ou embaixada): a pessoa é **brasileira nata desde o registro**, sem precisar de opção.
- **Residência + opção:** quem não foi registrado pode vir a **residir no Brasil** e **optar**, **em qualquer tempo**, **depois de atingida a maioridade**. A opção é feita **perante a Justiça Federal** (art. 109, X) e tem natureza **personalíssima**.
- Antes da maioridade, quem veio residir no Brasil é considerado **brasileiro nato sob condição suspensiva** (a opção).

⚠️ **Pegadinhas:**
- "É brasileiro nato o nascido no Brasil, filho de pais estrangeiros, em qualquer caso." **Errado** — exceto se **ambos** estiverem a serviço **de seu país**.
- "Na alínea b, é necessário que **ambos** os pais sejam brasileiros." **Errado** — basta **pai ou mãe**.
- "A opção pela nacionalidade deve ser feita até os 21 anos." **Errado** — **em qualquer tempo**, depois da maioridade.
- "O registro consular só gera nacionalidade derivada." **Errado** — gera nacionalidade **nata** (alínea c).
""" + ex(
    "Clara nasceu em Lisboa, filha de mãe brasileira (sem vínculo com o serviço público) e pai português. Não foi registrada no consulado. Aos 25 anos, mudou-se para Belo Horizonte.",
    "Clara pode ser brasileira nata?",
    "**Sim.** Pela alínea **c**, ela pode **optar** pela nacionalidade brasileira, **em qualquer tempo**, depois de atingida a maioridade, já que **veio residir no Brasil** e é filha de **mãe brasileira**. A opção é feita perante a **Justiça Federal**. Se tivesse sido registrada no consulado, já seria nata desde o registro.",
    [Q("casa", "Clara chega a Belo Horizonte com 25 anos.", [P("cidadao", "esq", "pega", "feliz", "maleta"), P("advogado", "dir", "fala", "neutro")], (1, "Você pode optar pela nacionalidade.")),
     Q("forum", "O pedido de opção é feito na Justiça Federal.", [P("juiz", "centro", "fala", "serio", "carimbo")], (0, "Mãe brasileira, residência e opção: nata."))],
    "Brasileira nata pela opção | ok",
    fluxo("Art. 12, I, c (EC 54/2007)", [("Nasceu no exterior", "neutro"), ("Pai ou mãe brasileiro", "ok"), ("Sem registro consular", "alerta"), ("Reside no Brasil e opta após a maioridade", "ok")], ("Brasileira nata", "ok"))),
    N(5, 6, 7, 8))
m("Nacionalidade (arts. 12 e 13)", 3)

# ============================================================== 4 — Naturalizados
sec("explicacao", "Módulo 2 — Brasileiros naturalizados e a situação dos portugueses (art. 12, II e § 1º)", """
### Alínea a — naturalização ordinária

São brasileiros naturalizados os que, **na forma da lei**, adquiram a nacionalidade brasileira, exigidas aos **originários de países de língua portuguesa** apenas **residência por um ano ininterrupto** e **idoneidade moral**.

- **Estrangeiros em geral:** requisitos da **Lei de Migração** (Lei 13.445/2017), como capacidade civil, residência no Brasil por prazo mínimo (em regra **4 anos**, podendo ser reduzido), comunicação em língua portuguesa e inexistência de condenação penal ou reabilitação.
- **Originários de países lusófonos** (Portugal, Angola, Moçambique, Cabo Verde, Guiné-Bissau, São Tomé e Príncipe, Timor-Leste, Guiné Equatorial): a CF exige **apenas** **1 ano ininterrupto** de residência + **idoneidade moral**.
- É ato **discricionário** do Estado: preencher os requisitos **não garante** a naturalização.

### Alínea b — naturalização extraordinária (quinzenária)

Estrangeiros **de qualquer nacionalidade**, residentes no Brasil **há mais de 15 anos ininterruptos** e **sem condenação penal**, **desde que requeiram** a nacionalidade brasileira.

- Preenchidos os requisitos, há **direito subjetivo** à naturalização (ato vinculado), segundo a doutrina e a jurisprudência do STF.
- A naturalização produz efeitos com a **entrega do certificado** pela autoridade competente.

| | **Ordinária (lusófonos)** | **Ordinária (demais)** | **Extraordinária** |
|---|---|---|---|
| Residência | **1 ano** ininterrupto | Prazo da lei (em regra 4 anos) | **Mais de 15 anos** ininterruptos |
| Outros requisitos | **Idoneidade moral** | Requisitos da Lei 13.445/2017 | **Sem condenação penal** + requerimento |
| Natureza | Discricionária | Discricionária | **Vinculada** (direito subjetivo) |

---

### § 1º — Portugueses equiparados ("quase nacionalidade")

Aos **portugueses com residência permanente no País**, **se houver reciprocidade** em favor de brasileiros, serão atribuídos os **direitos inerentes ao brasileiro**, **salvo os casos previstos nesta Constituição**.

- **Não é naturalização**: o português **continua português**, mas recebe direitos de brasileiro — inclusive **direitos políticos** (pode votar e ser votado), conforme o **Estatuto da Igualdade** (Tratado de Amizade Brasil–Portugal).
- **Equipara-se ao brasileiro naturalizado**, nunca ao nato ("salvo os casos previstos nesta Constituição"): não pode ocupar cargos privativos de nato, por exemplo.
- Depende de **residência permanente** e de **reciprocidade**.

⚠️ **Pegadinhas:**
- "Para os originários de países de língua portuguesa, exige-se residência por quatro anos." **Errado** — **um ano ininterrupto**.
- "A naturalização extraordinária exige residência por mais de 10 anos." **Errado** — **mais de 15 anos**.
- "O português equiparado é brasileiro naturalizado." **Errado** — ele **continua português**; apenas recebe direitos de brasileiro (como os do naturalizado).
""", N(9, 10, 11, 12))
m("Nacionalidade (arts. 12 e 13)", 4)

# ============================================================== 5 — Distinções natos × naturalizados
sec("explicacao", "Módulo 2 — Distinções entre natos e naturalizados: cargos privativos e outras diferenças (art. 12, §§ 2º e 3º)", """
### § 2º — A regra é a igualdade

A **lei não poderá estabelecer distinção** entre brasileiros natos e naturalizados, **salvo nos casos previstos nesta Constituição**. Ou seja: **só a Constituição** pode diferenciar. Uma lei ordinária que vedasse, por exemplo, naturalizados em concursos de delegado seria **inconstitucional**.

### § 3º — Cargos privativos de brasileiro nato

| Cargo | Por quê |
|---|---|
| **Presidente e Vice-Presidente da República** | Linha sucessória e chefia do Estado |
| **Presidente da Câmara dos Deputados** | Linha sucessória |
| **Presidente do Senado Federal** | Linha sucessória |
| **Ministro do Supremo Tribunal Federal** | Linha sucessória (o Presidente do STF pode assumir a Presidência da República) |
| **Carreira diplomática** | Representação do país e segurança nacional |
| **Oficial das Forças Armadas** | Segurança nacional |
| **Ministro de Estado da Defesa** | Segurança nacional (incluído pela EC 23/1999) |

**Macete "MP3.COM":** **M**inistro do STF · **P**residente e vice da República · **P**residente da Câmara · **P**residente do Senado · **C**arreira diplomática · **O**ficial das Forças Armadas · **M**inistro da Defesa.

⚠️ **NÃO são privativos de nato** (pegadinhas clássicas):
- **Deputado federal, senador, governador, prefeito** (podem ser naturalizados — basta a "nacionalidade brasileira" do art. 14, § 3º, I).
- **Ministro do STJ, do TST, do TSE (exceto os que vêm do STF), do TCU** e **demais Ministros de Estado** (salvo o da Defesa).
- **Procurador-Geral da República, Advogado-Geral da União, delegado, policial federal.**
- **Praças** das Forças Armadas (o texto fala em **oficial**).
- **Presidente do STJ** e demais presidentes de tribunais (salvo o STF).

### Outras distinções feitas pela própria Constituição

| Distinção | Base |
|---|---|
| **Extradição:** nato nunca; naturalizado por crime comum anterior ou tráfico | art. 5º, LI |
| **Conselho da República:** seis vagas para **cidadãos brasileiros natos**, com mais de 35 anos | art. 89, VII |
| **Propriedade de empresa jornalística e de radiodifusão:** privativa de **natos ou naturalizados há mais de 10 anos** | art. 222 |
| **Perda da nacionalidade por cancelamento judicial da naturalização** — só atinge o **naturalizado** | art. 12, § 4º, I |

📌 O Conselho da República é órgão **de consulta** do Presidente; o **Conselho de Defesa Nacional** tem composição própria (art. 91), com o Ministro da Defesa (nato) entre seus membros.
""" + ex(
    "Yuki, japonês naturalizado brasileiro em 2005, é eleito deputado federal e depois indicado para ser Ministro da Justiça. Mais tarde, cogita-se seu nome para Ministro da Defesa.",
    "Yuki pode ocupar esses cargos?",
    "Pode ser **deputado federal** e **Ministro da Justiça** — esses cargos **não** são privativos de nato. **Não** pode ser **Ministro da Defesa**, cargo privativo de brasileiro nato desde a EC 23/1999 (art. 12, § 3º, VII). Também não poderia ser **Presidente da Câmara**.",
    [Q("reparticao", "Yuki toma posse como Ministro da Justiça.", [P("gestor", "esq", "fala", "feliz", "documento"), P("servidor", "dir", "neutro", "neutro")], (0, "Naturalizado pode ser ministro!")),
     Q("reparticao", "Cogitam-no para a Defesa.", [P("advogado", "esq", "aponta", "serio", "documento"), P("gestor", "dir", "neutro", "surpreso")], (0, "Defesa é privativo de nato."))],
    "Ministro da Defesa: só nato | alerta",
    comp("Cargos e nacionalidade", ("Naturalizado pode", "Deputado, ministro em geral", "ok", ["governador, senador", "ministro do STJ e do TCU"]), ("Só nato", "MP3.COM", "erro", ["Ministro da Defesa", "Presidente da Câmara e do Senado"]))),
    N(13, 14, 15, 16))
m("Nacionalidade (arts. 12 e 13)", 5)

# ============================================================== 6 — Perda e reaquisição
sec("aprofundamento", "Módulo 2 — Perda e reaquisição da nacionalidade após a EC 131/2023 (art. 12, §§ 4º e 5º)", """
A **EC 131/2023** reescreveu as hipóteses de **perda da nacionalidade**. ⚠️ **Não estude pela redação antiga** — muitas apostilas ainda trazem a perda automática por aquisição de outra nacionalidade, que **deixou de existir**.

### Redação vigente — será declarada a perda da nacionalidade do brasileiro que:

| Inciso | Hipótese | Atinge |
|---|---|---|
| **I** | Tiver **cancelada sua naturalização**, por **sentença judicial**, em virtude de **fraude relacionada ao processo de naturalização** ou de **atentado contra a ordem constitucional e o Estado Democrático** | **Só o naturalizado** |
| **II** | Fizer **pedido expresso de perda** da nacionalidade brasileira **perante autoridade brasileira competente**, **ressalvadas situações que acarretem apatridia** | **Nato ou naturalizado** |

### § 5º — Reaquisição

A **renúncia** da nacionalidade, nos termos do **inciso II do § 4º** (pedido expresso), **não impede** o interessado de **readquirir sua nacionalidade brasileira originária**, **nos termos da lei**.

### O que mudou com a EC 131/2023

| Antes | Depois |
|---|---|
| Cancelamento da naturalização por **atividade nociva ao interesse nacional** | Cancelamento por **fraude no processo de naturalização** ou **atentado contra a ordem constitucional e o Estado Democrático** |
| **Perda automática** para quem **adquirisse outra nacionalidade** (salvo reconhecimento de nacionalidade originária ou imposição de naturalização pela lei estrangeira) | **Não há mais** perda por aquisição de outra nacionalidade — a perda depende de **pedido expresso** |
| Reaquisição discutida na doutrina e na lei | **Expressamente** prevista para quem renunciou, inclusive da **nacionalidade originária** (nato volta a ser nato) |

📌 **Por que a mudança?** Para proteger brasileiros que adquiriram outra nacionalidade no exterior (por trabalho, casamento etc.) e evitar casos de **apatridia** e de perda involuntária. Relembre: o STF havia decidido, no caso de uma brasileira nata que se naturalizou norte-americana, que ela **perdeu** a nacionalidade brasileira e poderia ser **extraditada** (MS 33.864, 2016) — situação que a nova redação passou a evitar, já que a perda agora exige pedido expresso.

### Consequências ligadas

- O **cancelamento da naturalização por sentença transitada em julgado** também gera a **perda dos direitos políticos** (art. 15, I).
- A competência para julgar a causa referente à nacionalidade, inclusive a opção e a naturalização, é da **Justiça Federal** (art. 109, X).

⚠️ **Pegadinhas:**
- "Perde a nacionalidade o brasileiro que adquirir outra nacionalidade por naturalização voluntária." **Errado** após a EC 131/2023.
- "O brasileiro nato pode ter sua nacionalidade cancelada por sentença judicial." **Errado** — o inciso I fala em cancelamento de **naturalização**.
- "Quem renunciou à nacionalidade brasileira não pode readquiri-la." **Errado** — § 5º.
- "O pedido de perda é sempre aceito." **Errado** — ressalvadas situações que acarretem **apatridia**.
""", N(17))
m("Nacionalidade (arts. 12 e 13)", 6)

# ============================================================== 7 — Art. 13
sec("explicacao", "Módulo 2 — Idioma oficial e símbolos da República (art. 13)", """
- **Caput:** a **língua portuguesa** é o **idioma oficial** da República Federativa do Brasil.
- **§ 1º:** são **símbolos da República Federativa do Brasil**: a **bandeira**, o **hino**, as **armas** e o **selo nacionais**.
- **§ 2º:** os **Estados, o Distrito Federal e os Municípios** **poderão ter símbolos próprios**.

**Macete dos símbolos — "BHAS":** **B**andeira · **H**ino · **A**rmas · **S**elo.

📌 **Línguas indígenas:** o art. 210, § 2º, assegura às comunidades indígenas a utilização de suas **línguas maternas** e processos próprios de aprendizagem no ensino fundamental. Isso **não** altera o idioma oficial.
📌 **Lei 5.700/1971** disciplina a forma e o uso dos símbolos nacionais.

⚠️ **Pegadinhas:**
- "São símbolos nacionais a bandeira, o hino, as armas e a **moeda**." **Errado** — o quarto é o **selo**.
- "Os Municípios não podem ter símbolos próprios." **Errado** — **podem** (§ 2º).
- "O art. 13 reconhece as línguas indígenas como idiomas oficiais." **Errado** — idioma oficial é a **língua portuguesa**.
""", N(18))
m("Nacionalidade (arts. 12 e 13)", 7)
