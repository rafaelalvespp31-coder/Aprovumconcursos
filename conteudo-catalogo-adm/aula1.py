import json
from helpers import *
# ---------------------------------------------------------------- 1
sec("introducao", "Apresentação: o que você vai dominar", """
**Noções de Direito Administrativo — Administração Pública.** *Domine os conceitos, compreenda as diferenças e antecipe as pegadinhas da banca.*

Este tema reúne o núcleo que mais cai em provas de nível médio e superior: **o que é a Administração Pública**, **como ela se organiza** (direta e indireta), **quem são as entidades** (autarquias, fundações, empresas públicas e sociedades de economia mista), **os princípios** (o LIMPE do art. 37 e os demais), **a autotutela** (anular e revogar), **as regras constitucionais sobre cargos e concursos** e **a responsabilidade civil do Estado**.

**Objetivos de aprendizagem — ao final você será capaz de:**
- diferenciar Administração em sentido **subjetivo** e **objetivo**, e Administração × **Governo**;
- distinguir **órgão** de **entidade**, **desconcentração** de **descentralização**, **hierarquia** de **vinculação**;
- comparar as **quatro entidades** da Administração Indireta (criação, personalidade, regime, exemplos);
- explicar cada princípio do **LIMPE** e separar princípios **expressos na Constituição**, **previstos em lei** e **construídos pela doutrina**;
- decidir quando um ato deve ser **anulado** ou pode ser **revogado**;
- aplicar as regras do **art. 37** sobre concurso, cargos em comissão, funções de confiança, acumulação e nepotismo;
- resolver casos de **responsabilidade civil do Estado** (art. 37, § 6º).

**Legenda dos sinais usados na aula**

| Sinal | Significado |
|---|---|
| 📜 **LEI SECA** | Texto literal da norma (sem comentário misturado) |
| 📘 **EXPLICAÇÃO** | Interpretação em linguagem simples |
| ⚖️ **DOUTRINA** | Entendimento doutrinário |
| 🏛️ **JURISPRUDÊNCIA** | Entendimento de tribunal com fonte identificada |
| 💡 **EXEMPLO** | Situação hipotética criada para estudo |
| 🎯 **FOCO NA PROVA** | O que a banca mais cobra |
| 🚨 **PEGADINHA** | Confusão frequente em questões |
| ⚠️ **ATENÇÃO** | Exceção ou ressalva |
| 🧠 **MEMORIZE** | Técnica de memorização |

**Roteiro (módulos):** 1 Fundamentos • 2 Organização administrativa • 3 Entidades da Indireta • 4 LIMPE • 5 Outros princípios • 6 Autotutela • 7 Agentes e cargos públicos • 8 Responsabilidade civil do Estado • Casos práticos • Pegadinhas • Flashcards • Revisão.

> ⚠️ **Sobre as questões deste tema:** todas são **inéditas, elaboradas para estudo** (no estilo das bancas), e **não** são questões oficiais de provas.
""" + ex(
    "Na véspera da prova, Júlia lê: \"A Administração Pública obedece aos princípios de legalidade, impessoalidade, moralidade, publicidade e eficiência\". Ela fica em dúvida se razoabilidade também está nessa lista do art. 37.",
    "Razoabilidade está no caput do art. 37 da Constituição?",
    "**Não.** O caput do art. 37 traz só o **LIMPE**. A razoabilidade é princípio **implícito** na Constituição e **expresso em lei** (Lei 9.784/1999, art. 2º). Separar \"expresso na CF\" de \"expresso em lei\" é uma das pegadinhas mais comuns.",
    [Q("escola", "Júlia estuda o art. 37 na véspera da prova.", [P("cidadao", "esq", "pega", "serio", "documento"), P("professor", "dir", "fala", "feliz")], (1, "Quais princípios estão no caput?")),
     Q("escola", "O professor resume a lista.", [P("professor", "centro", "aponta", "feliz")], (0, "Só o LIMPE! O resto vem da lei e da doutrina."))],
    "Só o LIMPE no caput | alerta",
    comp("Onde está cada princípio", ("Art. 37, caput (CF)", "LIMPE", "ok", ["Legalidade", "Impessoalidade", "Moralidade", "Publicidade e Eficiência"]),
         ("Lei 9.784/1999, art. 2º", "Expressos em lei", "alerta", ["Razoabilidade e proporcionalidade", "Motivação e finalidade", "Segurança jurídica", "Interesse público"]))),
    ["N0018"])

# ---------------------------------------------------------------- 2
sec("esquema", "Mapa mental geral da Administração Pública", """
**ADMINISTRAÇÃO PÚBLICA** se divide em quatro grandes blocos:

1. **O que é** → sentido **subjetivo** (quem: órgãos, entidades e agentes) + sentido **objetivo** (o quê: a atividade administrativa).
2. **Como se organiza** → **Direta** (os próprios entes: União, Estados, DF e Municípios, com seus órgãos) + **Indireta** (entidades com personalidade própria).
3. **Como deve agir** → **princípios**: LIMPE (art. 37, caput) + princípios legais e implícitos.
4. **Como responde** → **autotutela** (anula e revoga os próprios atos) + **responsabilidade civil** (art. 37, § 6º).

**Organograma: Administração Direta e Indireta**

| Administração **Direta** | Administração **Indireta** |
|---|---|
| **Entes federativos**: União, Estados, Distrito Federal e Municípios | **Autarquias** (direito público) |
| **Órgãos** de cada ente: Presidência e Ministérios; Governadorias e Secretarias; Prefeituras e Secretarias municipais; órgãos do Legislativo e do Judiciário | **Fundações públicas** (direito público ou privado) |
| Sem personalidade jurídica própria (os órgãos) | **Empresas públicas** (direito privado) |
| Relação interna: **hierarquia** | **Sociedades de economia mista** (direito privado) |
| | Relação com o ente criador: **vinculação** (controle finalístico) |

**Fluxograma: como a atividade é distribuída**

**Ente federativo** → (divide tarefas **dentro de si**, criando órgãos) → **DESCONCENTRAÇÃO** → órgãos sem personalidade, com **hierarquia**.

**Ente federativo** → (transfere a atividade **para outra pessoa**) → **DESCENTRALIZAÇÃO** → por **outorga** (lei cria ou autoriza entidade da Indireta) ou por **delegação** (contrato/ato com particular, ex.: concessionária) → **sem hierarquia**, só **controle**.

> 🧠 **MEMORIZE:** **DES-CONCENTRAR** = espalhar **dentro** da mesma pessoa. **DES-CENTRALIZAR** = mandar para **outra** pessoa.
""", ["N0018", "N0023", "N0029", "N0034", "N0045", "N0048", "N0054"])

# ---------------------------------------------------------------- 3 lei seca
LAW = open("conteudo-catalogo-adm/law.txt", encoding="utf8").read().strip().split("\n")
sec("texto_legal", "📜 Lei seca: art. 37 da Constituição (trechos estudados)", """
Trechos do **art. 37 da Constituição Federal** usados neste tema, na redação vigente. Os incisos e parágrafos não transcritos (VI a XV, XVIII, XXI, XXII e §§ 3º, 5º, 7º a 16) ficam fora do recorte desta aula.

""" + "\n\n".join(LAW), [f"N{i:04d}" for i in range(1, 18)], "N0001")

# ---------------------------------------------------------------- 4 Módulo 1
sec("conceitos_fundamentais", "Módulo 1 — Conceito, finalidade e os dois sentidos", """
📘 **Conceito.** Administração Pública é o **conjunto de órgãos, entidades e agentes** que o Estado usa para **executar**, de forma concreta e contínua, as atividades voltadas ao **interesse público** (serviços, polícia administrativa, fomento, intervenção). Ela **executa** as escolhas políticas; não as define.

🎯 **Finalidade administrativa.** Toda atuação administrativa tem um único norte: o **interesse público** (o interesse da coletividade, não o do administrador). Ato praticado para favorecer ou perseguir alguém tem **desvio de finalidade** e é **ilegal**, mesmo que a forma esteja perfeita.

**Os dois sentidos da expressão**

| | Sentido **subjetivo** (orgânico ou formal) | Sentido **objetivo** (material ou funcional) |
|---|---|---|
| Pergunta-chave | **Quem** administra? | **O que** é administrar? |
| Foco | Os **sujeitos**: pessoas jurídicas, órgãos e agentes | A **atividade**: a função administrativa |
| Grafia usual | **A**dministração Pública (maiúscula) | **a**dministração pública (minúscula) |
| Exemplos | União, um Ministério, o INSS, um servidor | Prestar serviço público, exercer poder de polícia, fomentar, intervir |
| Como a banca cobra | "Em sentido **formal**, Administração é o conjunto de órgãos e entidades…" | "Em sentido **material**, é a atividade de satisfazer concretamente o interesse público…" |
| 🚨 Pegadinha | Trocar "orgânico/formal" por "material" | Dizer que o sentido objetivo olha para **quem** executa |

⚖️ **Doutrina.** A doutrina costuma apontar quatro atividades no sentido objetivo: **serviço público**, **polícia administrativa**, **fomento** e **intervenção** na propriedade e no domínio econômico.

🧠 **MEMORIZE:** **S**ubjetivo = **S**ujeitos. **O**bjetivo = **O**bra (a atividade).
""" + ex(
    "A banca afirma: \"Em sentido subjetivo, a Administração Pública corresponde às atividades de prestação de serviços públicos, polícia administrativa e fomento\".",
    "A afirmação está certa?",
    "**Errada.** Atividades (serviço público, polícia, fomento) são o sentido **objetivo/material/funcional**. O sentido **subjetivo/orgânico/formal** olha para **quem** exerce: órgãos, entidades e agentes.",
    [Q("reparticao", "A questão mistura os dois sentidos.", [P("servidor", "esq", "pega", "surpreso", "documento"), P("professor", "dir", "aponta", "serio")], (1, "Atividade é sentido objetivo!")),
     Q("reparticao", "Quem faz × o que se faz.", [P("gestor", "esq", "fala", "neutro"), P("servidor", "dir", "neutro", "feliz")], (0, "Nós somos o sentido subjetivo."))],
    "Errado: é sentido objetivo | erro",
    comp("Subjetivo × objetivo", ("Subjetivo (formal)", "QUEM administra", "neutro", ["Órgãos", "Entidades", "Agentes"]),
         ("Objetivo (material)", "O QUE é administrar", "ok", ["Serviço público", "Polícia administrativa", "Fomento e intervenção"]))),
    ["N0019", "N0020"])

# ---------------------------------------------------------------- 5
sec("comparacao", "Administração × Governo; funções típicas e atípicas dos Poderes", """
**Governo × Administração Pública**

| | **Governo** | **Administração Pública** |
|---|---|---|
| Papel | **Decide** e fixa as diretrizes políticas | **Executa** as decisões, de forma técnica |
| Atos | Atos **políticos** (de governo), com ampla discricionariedade | Atos **administrativos**, sujeitos à lei e ao controle |
| Responsabilidade | **Política** (eleições, crimes de responsabilidade) | **Técnica e profissional** (hierarquia, controles) |
| Exemplo | Presidente decide priorizar a segurança pública | Secretaria contrata viaturas e organiza escalas |
| 🚨 Pegadinha | "A Administração tem função política" | A Administração **não governa**: ela **executa** |

**Funções típicas e atípicas.** A separação de Poderes não é absoluta: cada Poder tem uma função **típica** (principal) e exerce outras de forma **atípica**.

| Poder | Função **típica** | Funções **atípicas** (exemplos) |
|---|---|---|
| **Legislativo** | Legislar e fiscalizar | **Administrar** (organizar seus serviços, fazer licitação) e **julgar** (o Senado julga o Presidente nos crimes de responsabilidade — CF, art. 52, I) |
| **Executivo** | **Administrar** | **Legislar** (medidas provisórias — art. 62; leis delegadas — art. 68) e decidir processos administrativos |
| **Judiciário** | Julgar (jurisdição) | **Administrar** (concurso para seus servidores, gestão de pessoal) e **legislar** (regimentos internos — art. 96, I, "a") |

🎯 **FOCO NA PROVA:** a **função administrativa** existe nos **três Poderes**. Por isso o caput do art. 37 fala em Administração "de **qualquer dos Poderes**".

⚠️ **ATENÇÃO:** decisão em processo administrativo **não faz coisa julgada judicial**: pode ser revista pelo Judiciário (CF, art. 5º, XXXV).
""" + ex(
    "O Tribunal de Justiça abre concurso público para técnico judiciário e, depois, aplica uma advertência a um servidor que faltou ao serviço sem justificativa.",
    "Ao fazer isso, o Judiciário exerce função típica ou atípica?",
    "**Atípica (administrativa).** Concurso e disciplina de servidores são **administração**. A função típica do Judiciário é **julgar** com definitividade. E como é função administrativa, ela se submete ao **art. 37** (LIMPE).",
    [Q("forum", "O Tribunal abre concurso para seus servidores.", [P("juiz", "esq", "pega", "serio", "documento"), P("servidor", "dir", "neutro", "surpreso")], (0, "Edital publicado!")),
     Q("forum", "Depois, aplica uma advertência a um servidor faltoso.", [P("juiz", "esq", "aponta", "serio"), P("servidor", "dir", "neutro", "triste")], (0, "Advertência por falta injustificada."))],
    "Função atípica (administrar) | alerta",
    fluxo("Que função é essa?", [("Julgar conflitos com definitividade", "neutro", "Típica do Judiciário"), ("Fazer concurso e punir servidor", "alerta", "É administrar"), ("Submete-se ao art. 37", "ok", "LIMPE vale para os três Poderes")])),
    ["N0021", "N0022"])

# ---------------------------------------------------------------- 6 Módulo 2
sec("explicacao", "Módulo 2 — Administração Direta, entes federativos e Administração Indireta", """
📘 **Administração Direta** é formada pelos próprios **entes federativos** — **União, Estados, Distrito Federal e Municípios** (CF, art. 18) — e pelos **órgãos** que integram cada um deles. Os entes têm **personalidade jurídica de direito público** e **autonomia política** (legislam, se auto-organizam, se autogovernam e se autoadministram).

📘 **Administração Indireta** é o conjunto de **entidades** criadas (ou autorizadas) por lei para desempenhar atividades de forma **descentralizada**. Cada entidade tem **personalidade jurídica própria**, patrimônio próprio e autonomia **administrativa** — mas **não** tem autonomia política.

📜 **LEI SECA — Decreto-Lei nº 200/1967, art. 4º** (âmbito federal)
> Art. 4º A Administração Federal compreende:
> I - A Administração Direta, que se constitui dos serviços integrados na estrutura administrativa da Presidência da República e dos Ministérios.
> II - A Administração Indireta, que compreende as seguintes categorias de entidades, dotadas de personalidade jurídica própria:
> a) Autarquias;
> b) Emprêsas Públicas;
> c) Sociedades de Economia Mista.
> d) fundações públicas.
> Parágrafo único. As entidades compreendidas na Administração Indireta vinculam-se ao Ministério em cuja área de competência estiver enquadrada sua principal atividade.

| | **Direta** | **Indireta** |
|---|---|---|
| Quem | Entes federativos e seus órgãos | Autarquias, fundações públicas, empresas públicas, sociedades de economia mista |
| Personalidade | O **ente** tem; os **órgãos não** | **Cada entidade** tem a sua |
| Autonomia | **Política** e administrativa | Só **administrativa** |
| Como nasce | Constituição | **Lei específica** cria ou autoriza (art. 37, XIX) |
| Relação interna | **Hierarquia** entre órgãos | **Vinculação** ao ente (controle finalístico) |
| Como a banca cobra | "Ministério integra a Administração Direta" ✅ | "Autarquia é órgão da Direta" ❌ |

🚨 **PEGADINHA:** **Territórios federais** não são entes federativos: integram a **União** (CF, art. 18, § 2º).

⚠️ **ATENÇÃO:** concessionárias e permissionárias de serviço público (empresas privadas que prestam serviço por contrato) **não** integram a Administração Indireta, embora prestem serviço público. Também ficam fora as entidades do terceiro setor (OS, OSCIP, serviços sociais autônomos do "Sistema S").
""" + ex(
    "Uma empresa privada de ônibus venceu a licitação e opera o transporte coletivo municipal por contrato de concessão.",
    "Essa empresa passa a integrar a Administração Indireta do Município?",
    "**Não.** Ela recebeu só a **execução** do serviço por **delegação** (contrato). A Administração Indireta é formada apenas por **autarquias, fundações públicas, empresas públicas e sociedades de economia mista**. Mesmo assim, por prestar serviço público, a concessionária responde **objetivamente** pelos danos (art. 37, § 6º).",
    [Q("rua", "A empresa venceu a licitação do transporte.", [P("gestor", "esq", "fala", "feliz", "documento"), P("cidadao", "dir", "neutro", "neutro")], (0, "Contrato de concessão assinado.")),
     Q("rua", "O dono acha que virou \"órgão público\".", [P("cidadao", "esq", "fala", "feliz"), P("professor", "dir", "bracos_cruzados", "serio")], (1, "Não! Concessionária fica fora da Indireta."))],
    "Fora da Administração Indireta | erro",
    comp("Quem integra a Indireta?", ("Integram", "Lei cria ou autoriza", "ok", ["Autarquias", "Fundações públicas", "Empresas públicas", "Sociedades de economia mista"]),
         ("Não integram", "Particulares colaboradores", "erro", ["Concessionárias e permissionárias", "OS e OSCIP", "Serviços sociais autônomos"]))),
    ["N0024", "N0025"])

# ---------------------------------------------------------------- 7
sec("conceitos_fundamentais", "Órgãos públicos, personalidade jurídica e teoria do órgão", """
📘 **Órgão público** é um **centro de competências** criado dentro de uma pessoa jurídica para cumprir parte de suas tarefas. Ministério, Secretaria, Delegacia, Departamento Penitenciário, Receita Federal: todos são **órgãos**.

📜 **LEI SECA — Lei nº 9.784/1999, art. 1º, § 2º**
> § 2º Para os fins desta Lei, consideram-se:
> I - órgão - a unidade de atuação integrante da estrutura da Administração direta e da estrutura da Administração indireta;
> II - entidade - a unidade de atuação dotada de personalidade jurídica;
> III - autoridade - o servidor ou agente público dotado de poder de decisão.

| | **Órgão** | **Entidade** |
|---|---|---|
| Personalidade jurídica | **Não tem** | **Tem** |
| Onde existe | Na Direta **e** na Indireta (uma autarquia também tem órgãos internos) | Pessoa jurídica da Direta (ente) ou da Indireta |
| Responde em juízo | Em regra, **não**: quem responde é a pessoa a que pertence | **Sim**, em nome próprio |
| Surge por | **Desconcentração** | Constituição (entes) ou **descentralização** (Indireta) |
| Exemplo | Secretaria de Estado de Justiça e Segurança Pública | Estado de Minas Gerais; INSS |

⚖️ **Teoria do órgão (imputação).** Quando o agente atua, **quem age é o Estado**: a vontade do agente é **imputada** à pessoa jurídica a que ele pertence. Ela substituiu as antigas teorias do **mandato** e da **representação** (que tratavam o Estado como incapaz). Consequência prática: o dano causado por um servidor em serviço é cobrado **da pessoa jurídica**, não do órgão nem, diretamente, do agente.

⚠️ **ATENÇÃO — capacidade processual excepcional.** Alguns órgãos independentes ou autônomos podem ir a juízo **para defender suas prerrogativas institucionais**. 🏛️ **STJ, Súmula 525:** "A Câmara de Vereadores não possui personalidade jurídica, apenas personalidade judiciária, somente podendo demandar em juízo para defender os seus direitos institucionais."

🔴 **ATENÇÃO:** órgão público **não se confunde** com entidade administrativa.
""" + ex(
    "Um carro oficial da Secretaria de Estado de Saúde bate no veículo de Marcos. Ele quer processar \"a Secretaria\" para receber o conserto.",
    "Contra quem Marcos deve propor a ação?",
    "Contra o **Estado** (a pessoa jurídica). A Secretaria é **órgão** e não tem personalidade jurídica; pela **teoria do órgão**, a conduta do motorista é imputada ao Estado, que responde objetivamente (art. 37, § 6º).",
    [Q("obra", "O carro oficial bate no carro de Marcos.", [P("servidor", "esq", "neutro", "surpreso"), P("cidadao", "dir", "fala", "bravo")], (1, "Vou processar a Secretaria!"), "CRASH!"),
     Q("forum", "O advogado corrige o pedido.", [P("advogado", "esq", "aponta", "serio", "documento"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Secretaria é órgão. Réu: o Estado."))],
    "Réu: o Estado | ok",
    fluxo("Quem responde?", [("Motorista age em serviço", "neutro"), ("Conduta imputada ao Estado", "ok", "Teoria do órgão"), ("Secretaria é órgão: sem personalidade", "alerta")], ("Ação contra o Estado", "ok", "Responsabilidade objetiva — art. 37, § 6º"))),
    ["N0026"])

# ---------------------------------------------------------------- 8
sec("quadro_comparativo", "Desconcentração × descentralização; hierarquia × vinculação", """
| | **Desconcentração** | **Descentralização** |
|---|---|---|
| O que é | Distribuição de competências **dentro da mesma pessoa jurídica** | Transferência da atividade para **outra pessoa** (física ou jurídica) |
| Cria nova pessoa? | 🔴 **Não**: cria **órgãos** | **Sim** na outorga (nova entidade); na delegação, usa um particular já existente |
| Vínculo | **Hierarquia** (subordinação) | **Sem hierarquia**: há **controle** (tutela, supervisão, vinculação) |
| Onde ocorre | Na Direta **e** dentro das entidades da Indireta | Do ente para a Indireta ou para particulares |
| Exemplo | Estado cria Secretarias e superintendências regionais | União cria o INSS (autarquia); Município concede o transporte |
| Como a banca cobra | "Na desconcentração, há criação de pessoa jurídica" ❌ | "Na descentralização há hierarquia entre ente e entidade" ❌ |

⚖️ **Modalidades de descentralização (doutrina)**
- **Por outorga** (por serviços, técnica ou funcional): a **lei** cria ou autoriza uma entidade da Indireta e lhe transfere a **titularidade e a execução** do serviço.
- **Por delegação** (por colaboração): **contrato** (concessão, permissão) ou **ato** (autorização) transfere **só a execução**, por prazo, a um particular; a titularidade continua com o Estado.
- **Territorial** (geográfica): pessoa jurídica com competência genérica sobre uma área (os territórios federais).

**Hierarquia × vinculação**

| | **Hierarquia** | **Vinculação** (supervisão ministerial / tutela) |
|---|---|---|
| Entre | Órgãos e agentes **da mesma pessoa** | **Ente** e a **entidade** que criou |
| Poderes | Dar ordens, fiscalizar, rever, avocar, delegar, punir | Controle **finalístico**: verificar se a entidade cumpre a finalidade da lei |
| Presunção | **Ampla**, decorre da estrutura | **Só nos limites da lei** (não se presume) |
| Recurso | Recurso hierárquico **próprio** | Recurso hierárquico **impróprio** (só se a lei previr) |

🔴 **PEGADINHA:** desconcentração **não cria**, por si só, uma nova pessoa jurídica.
""" + ex(
    "O Governo cria, por lei, a Superintendência Regional de Ensino de uma cidade, subordinada à Secretaria de Educação. Em outra lei, cria uma autarquia para administrar o trânsito estadual.",
    "Em cada caso houve desconcentração ou descentralização?",
    "**Superintendência = desconcentração**: é um **órgão** novo dentro do mesmo Estado, com **hierarquia**. **Autarquia = descentralização por outorga**: nasce **outra pessoa jurídica**, ligada ao Estado só por **vinculação** (controle finalístico).",
    [Q("reparticao", "Lei 1 cria uma superintendência subordinada.", [P("gestor", "esq", "pega", "feliz", "documento"), P("servidor", "dir", "neutro", "neutro")], (0, "Novo órgão da Secretaria!")),
     Q("reparticao", "Lei 2 cria uma autarquia de trânsito.", [P("gestor", "esq", "aponta", "serio"), P("servidor", "dir", "neutro", "surpreso")], (0, "Esta tem personalidade própria."))],
    "Órgão × entidade | alerta",
    comp("O que cada lei fez", ("Superintendência", "Desconcentração", "neutro", ["Órgão sem personalidade", "Mesma pessoa: o Estado", "Hierarquia"]),
         ("Autarquia de trânsito", "Descentralização", "ok", ["Nova pessoa jurídica", "Direito público", "Vinculação: controle finalístico"]))),
    ["N0027", "N0028"])

json.dump(S, open("conteudo-catalogo-adm/sec1.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(len(S), [len(s["bodyMarkdown"]) for s in S])
