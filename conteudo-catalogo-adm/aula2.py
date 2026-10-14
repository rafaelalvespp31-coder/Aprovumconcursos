import json
from helpers import *

# ---------------------------------------------------------------- 9 Autarquias
sec("explicacao", "Módulo 3 — Autarquias", """
📜 **LEI SECA — Decreto-Lei nº 200/1967, art. 5º, I**
> I - Autarquia - o serviço autônomo, criado por lei, com personalidade jurídica, patrimônio e receita próprios, para executar atividades típicas da Administração Pública, que requeiram, para seu melhor funcionamento, gestão administrativa e financeira descentralizada.

| Ponto | Autarquia |
|---|---|
| 1. Conceito | Pessoa jurídica criada por lei para executar **atividades típicas de Estado** de forma descentralizada |
| 2. Natureza jurídica | **Direito público** |
| 3. Criação | **Criada diretamente por lei específica** (CF, art. 37, XIX). Extinção também por lei |
| 4. Personalidade | Própria, nasce com a **vigência da lei** (não precisa de registro) |
| 5. Patrimônio | Próprio; **bens públicos** (impenhoráveis, imprescritíveis, alienação condicionada) |
| 6. Regime jurídico | **Direito público**: prerrogativas e restrições do Estado |
| 7. Características | **Imunidade tributária** recíproca sobre patrimônio, renda e serviços ligados às finalidades (CF, art. 150, § 2º); pagamento de dívidas judiciais por **precatório** (art. 100); **prazos processuais em dobro** (CPC, art. 183); responsabilidade **objetiva** (art. 37, § 6º); controle pelo Tribunal de Contas; licitação e concurso obrigatórios |
| 8. Exemplos | **INSS**, **IBAMA**, **Banco Central** e as **agências reguladoras** (ex.: ANVISA, ANATEL), que são autarquias de regime especial |
| 9. Diferença-chave | É a **única** entidade da Indireta **criada** diretamente pela lei; as demais têm a criação **autorizada** |
| 10. Pegadinha | "Autarquia é autorizada por lei e adquire personalidade com o registro" ❌ |

⚖️ **Autarquias de regime especial (doutrina).** Têm autonomia reforçada fixada na lei: dirigentes com **mandato fixo**, maior independência técnica e decisória. Exemplos: agências reguladoras, Banco Central.

⚠️ **ATENÇÃO — regime de pessoal.** A EC 19/1998 tentou acabar com o regime jurídico único; o STF suspendeu essa mudança em 2007 e, no julgamento de mérito da **ADI 2.135** (2024), validou a nova redação com efeitos **para o futuro**. Confira a posição atual antes da prova, pois o tema mudou recentemente.

🔴 **MEMORIZE:** autarquia é **CRIADA** por lei; empresa pública, sociedade de economia mista e fundação têm a instituição **AUTORIZADA** por lei.
""" + ex(
    "Um Estado quer criar uma entidade para fiscalizar e aplicar multas ambientais. O governador propõe fazê-lo por decreto, \"para ganhar tempo\".",
    "É possível criar essa autarquia por decreto?",
    "**Não.** Autarquia só pode ser **criada por lei específica** (CF, art. 37, XIX). Como vai exercer **poder de polícia** (atividade típica de Estado), ela precisa mesmo ser pessoa de **direito público**: o caminho é a autarquia criada por lei.",
    [Q("reparticao", "O governador quer criar a autarquia por decreto.", [P("gestor", "esq", "pega", "feliz", "documento"), P("servidor", "dir", "neutro", "surpreso")], (0, "Faço por decreto e pronto!")),
     Q("reparticao", "A assessoria jurídica alerta.", [P("advogado", "esq", "aponta", "serio"), P("gestor", "dir", "neutro", "triste")], (0, "Só lei específica cria autarquia."))],
    "Decreto não cria autarquia | erro",
    fluxo("Como nasce uma autarquia", [("Projeto de lei específica", "neutro"), ("Lei aprovada e em vigor", "ok", "A autarquia já existe (sem registro)"), ("Decreto apenas regulamenta", "alerta", "Não cria a entidade")])),
    ["N0030", "N0012"])

# ---------------------------------------------------------------- 10 Fundações
sec("explicacao", "Fundações públicas: direito público ou direito privado", """
📘 Fundação é um **patrimônio personalizado**, afetado a uma finalidade **não lucrativa** de interesse social (educação, cultura, pesquisa, assistência, saúde). Na Administração, é a **fundação pública**.

📜 **LEI SECA — Decreto-Lei nº 200/1967, art. 5º, IV**
> IV - Fundação Pública - a entidade dotada de personalidade jurídica de direito privado, sem fins lucrativos, criada em virtude de autorização legislativa, para o desenvolvimento de atividades que não exijam execução por órgãos ou entidades de direito público, com autonomia administrativa, patrimônio próprio gerido pelos respectivos órgãos de direção, e funcionamento custeado por recursos da União e de outras fontes.

⚖️ **As duas espécies (posição majoritária e do STF)**

| | Fundação pública de **direito público** | Fundação pública de **direito privado** |
|---|---|---|
| Apelido | "Fundação autárquica" (espécie de autarquia) | Fundação governamental de direito privado |
| Criação | **Criada por lei** específica | **Autorizada** por lei específica + **registro** do ato constitutivo |
| Regime | Igual ao das autarquias (bens públicos, imunidade, precatório) | **Híbrido**: direito privado, com regras públicas (concurso, licitação, controle) |
| Exemplos | FUNAI | Fundações de apoio e entidades culturais instituídas pelo Estado, conforme a lei de cada uma |

🏛️ **JURISPRUDÊNCIA — STF, RE 716.378 (Tema 545):** a qualificação da fundação instituída pelo Estado como de direito público ou privado depende do **estatuto de criação** e das **atividades** que ela presta; atividades **econômicas** ou **delegáveis** podem ficar sob regime de direito privado.

| Ponto | Resumo |
|---|---|
| Natureza | Pública **ou** privada, conforme a lei e a atividade |
| Criação | Pública: **criada** por lei. Privada: lei **autoriza** + registro |
| Área de atuação | **Lei complementar** definirá as áreas (art. 37, XIX, parte final) |
| Patrimônio | Próprio, destinado à finalidade social |
| Lucro | **Não** tem fins lucrativos |
| Pegadinha | "Toda fundação pública tem personalidade de direito privado" ❌ — e o contrário também está errado |

🚨 **PEGADINHA:** a **lei complementar** do inciso XIX serve para definir as **áreas de atuação das fundações**, e **não** para criar autarquias ou empresas. A criação/autorização é sempre por **lei específica** (ordinária).
""" + ex(
    "A banca afirma: \"Por expressa determinação constitucional, as fundações públicas têm personalidade jurídica de direito privado e são criadas por lei complementar\".",
    "O que está errado?",
    "Dois erros. **(1)** A Constituição não impõe direito privado: a fundação pública pode ser de **direito público** (criada por lei, como autarquia) **ou** de **direito privado** (autorizada por lei e registrada). **(2)** Quem cria ou autoriza é a **lei específica**; a **lei complementar** apenas define as **áreas de atuação**.",
    [Q("escola", "A questão afirma: só direito privado e lei complementar.", [P("cidadao", "esq", "pega", "surpreso", "documento"), P("professor", "dir", "aponta", "serio")], (1, "Dois erros nessa frase!")),
     Q("escola", "O professor explica as duas espécies.", [P("professor", "centro", "fala", "feliz")], (0, "Pode ser pública OU privada. LC só define áreas."))],
    "Dois erros | erro",
    comp("Fundação pública", ("Direito público", "Criada por lei específica", "ok", ["\"Fundação autárquica\"", "Regime de autarquia", "Ex.: FUNAI"]),
         ("Direito privado", "Lei autoriza + registro", "neutro", ["Regime híbrido", "Concurso e licitação valem", "LC define áreas de atuação"]))),
    ["N0031"])

# ---------------------------------------------------------------- 11 EP e SEM
sec("explicacao", "Empresas públicas e sociedades de economia mista (empresas estatais)", """
📜 **LEI SECA — Lei nº 13.303/2016 (Estatuto das Estatais)**
> Art. 3º Empresa pública é a entidade dotada de personalidade jurídica de direito privado, com criação autorizada por lei e com patrimônio próprio, cujo capital social é integralmente detido pela União, pelos Estados, pelo Distrito Federal ou pelos Municípios.

> Art. 4º Sociedade de economia mista é a entidade dotada de personalidade jurídica de direito privado, com criação autorizada por lei, sob a forma de sociedade anônima, cujas ações com direito a voto pertençam em sua maioria à União, aos Estados, ao Distrito Federal, aos Municípios ou a entidade da administração indireta.

📘 **O que as duas têm em comum**
- Personalidade de **direito privado**; criação **autorizada por lei específica** (art. 37, XIX) e personalidade adquirida com o **registro** dos atos constitutivos;
- Podem **explorar atividade econômica** (CF, art. 173) ou **prestar serviço público**;
- Regime **híbrido**: seguem o direito privado, mas devem fazer **concurso** (art. 37, II: "cargo **ou emprego**"), **licitar** (Lei 13.303/2016), prestar contas ao **Tribunal de Contas**;
- Pessoal: **empregados públicos** (CLT), sujeitos à vedação de acumulação (art. 37, XVII);
- **Não se submetem à falência** (Lei 11.101/2005, art. 2º, I);
- Criação de **subsidiárias** e participação em empresa privada dependem de **autorização legislativa** (art. 37, XX).

| | **Empresa pública** | **Sociedade de economia mista** |
|---|---|---|
| Capital | 🔴 **Integralmente público** (pode haver mais de um ente/entidade pública, mantida a maioria votante do ente controlador) | **Público e privado**, com **maioria das ações com voto** do poder público |
| Forma societária | **Qualquer** forma admitida em direito (inclusive unipessoal) | 🔴 **Sempre sociedade anônima (S/A)** |
| Foro (estatais federais) | **Justiça Federal** (CF, art. 109, I) | **Justiça Estadual** (STF, Súmula 556), salvo intervenção da União (Súmula 517) |
| Exemplos | Caixa Econômica Federal, Correios (ECT), BNDES, Serpro | Banco do Brasil, Petrobras; em MG, Cemig e Copasa |
| Como a banca cobra | "EP pode ter capital privado minoritário" ❌ | "SEM pode ser sociedade limitada" ❌ |

⚠️ **ATENÇÃO — prestadoras de serviço público × exploradoras de atividade econômica.** As **prestadoras de serviço público** respondem **objetivamente** (art. 37, § 6º). As que **exploram atividade econômica** seguem o regime das empresas privadas (art. 173, § 1º, II) e respondem pelas regras do direito civil.

🧠 **MEMORIZE:** **E**mpresa **P**ública = **P**ura (100% público), **qualquer forma**. **S**ociedade de **E**conomia **M**ista = **M**istura de capitais, sempre **S/A**.
""" + ex(
    "Uma lei estadual autoriza a criação da \"Companhia Estadual de Saneamento\", com 70% das ações com voto do Estado e 30% negociadas na bolsa, constituída como sociedade limitada.",
    "Essa estrutura é válida para uma sociedade de economia mista?",
    "**Não.** A mistura de capitais com maioria votante do Estado está correta, mas a sociedade de economia mista deve ser **sociedade anônima** (Lei 13.303/2016, art. 4º). Como **sociedade limitada**, a estrutura não serve.",
    [Q("reparticao", "A lei autoriza a companhia de saneamento.", [P("gestor", "esq", "pega", "feliz", "documento"), P("advogado", "dir", "neutro", "neutro")], (0, "70% do Estado, 30% na bolsa, Ltda.")),
     Q("reparticao", "O advogado aponta o problema.", [P("advogado", "esq", "aponta", "serio"), P("gestor", "dir", "neutro", "surpreso")], (0, "Economia mista é sempre S/A!"))],
    "Precisa ser S/A | erro",
    comp("Empresas estatais", ("Empresa pública", "Capital 100% público", "neutro", ["Qualquer forma societária", "Federal: Justiça Federal", "Ex.: Caixa, Correios"]),
         ("Economia mista", "Capital misto, voto público", "ok", ["Sempre S/A", "Federal: Justiça Estadual", "Ex.: Banco do Brasil, Cemig"]))),
    ["N0032", "N0033", "N0013"])

# ---------------------------------------------------------------- 12 quadro 4 entidades
sec("quadro_comparativo", "📊 Quadro comparativo das quatro entidades da Administração Indireta", """
**Parte 1 — criação e personalidade**

| | **Autarquia** | **Fundação pública** | **Empresa pública** | **Sociedade de economia mista** |
|---|---|---|---|---|
| Personalidade | Direito **público** | Pública **ou** privada | Direito **privado** | Direito **privado** |
| Lei específica | **Cria** | Cria (pública) ou **autoriza** (privada) | **Autoriza** | **Autoriza** |
| Registro | Não precisa | Só a de direito privado | Precisa | Precisa |
| Capital | Não se fala em capital social | Patrimônio afetado | **100% público** | **Misto**, maioria votante pública |
| Forma | — | — | **Qualquer** | **S/A** |

**Parte 2 — regime e prova**

| | **Autarquia** | **Fundação pública** | **Empresa pública** | **Sociedade de economia mista** |
|---|---|---|---|---|
| Atividade | Típica de Estado | Social, sem lucro | Serviço público ou atividade econômica | Serviço público ou atividade econômica |
| Bens | Públicos | Públicos (se de direito público) | Privados (os ligados ao serviço público têm proteção especial) | Privados (idem) |
| Pessoal | Servidores | Servidores (pública) / empregados (privada) | Empregados (CLT) + concurso | Empregados (CLT) + concurso |
| Exemplo | INSS | FUNAI | Caixa | Banco do Brasil |
| Como a banca cobra | "Criada por lei" ✅ | "Pode ser de direito público" ✅ | "Capital exclusivamente público" ✅ | "Forma de S/A" ✅ |
| Pegadinha | "Autorizada por lei" ❌ | "Sempre de direito privado" ❌ | "Só S/A" ❌ | "Capital integralmente público" ❌ |

🎯 **FOCO NA PROVA:** todas as quatro se submetem ao **art. 37** (concurso, licitação, LIMPE), ao **controle** do Tribunal de Contas e à **vinculação** ao ente que as criou — e **nenhuma** é subordinada hierarquicamente a ele.
""" + ex(
    "Em uma prova aparecem quatro descrições: (1) criada por lei, direito público, executa atividade típica; (2) capital 100% público, organizada como sociedade limitada; (3) capital misto com maioria votante estatal, S/A; (4) patrimônio afetado a fim social, sem lucro, criada por lei.",
    "Qual entidade corresponde a cada descrição?",
    "(1) **Autarquia**. (2) **Empresa pública** (aceita qualquer forma societária). (3) **Sociedade de economia mista**. (4) **Fundação pública de direito público** (fundação autárquica).",
    [Q("escola", "Quatro descrições, quatro entidades.", [P("professor", "esq", "aponta", "feliz"), P("cidadao", "dir", "pega", "serio", "documento")], (1, "Criada por lei e de direito público…")),
     Q("escola", "Ela acerta a sequência.", [P("cidadao", "centro", "fala", "feliz")], (0, "Autarquia, EP, SEM e fundação!"))],
    "Sequência correta | ok",
    fluxo("Pergunte nesta ordem", [("Direito público e criada por lei?", "neutro", "Autarquia ou fundação de direito público"), ("Sem fins lucrativos, patrimônio afetado?", "neutro", "Fundação"), ("Capital 100% público?", "neutro", "Empresa pública"), ("Capital misto e S/A?", "ok", "Sociedade de economia mista")])),
    ["N0029", "N0030", "N0031", "N0032", "N0033"])

# ---------------------------------------------------------------- 13 Legalidade e Impessoalidade
sec("explicacao", "Módulo 4 — LIMPE (1): Legalidade e Impessoalidade", """
📜 **Base:** CF, art. 37, caput — "…obedecerá aos princípios de **legalidade, impessoalidade, moralidade, publicidade e eficiência**…". Os cinco valem para a Administração **direta e indireta** de **todos os Poderes** e de **todos os entes**.

### ⚖️ Legalidade
- **Conceito:** a Administração só pode agir **quando e como a lei autoriza**. Para o particular vale o oposto: pode fazer tudo o que a lei **não proíbe** (CF, art. 5º, II).
- **Em linguagem simples:** o gestor não tem "vontade própria"; ele cumpre a vontade da lei.
- **Aplicação:** criar cargo, conceder vantagem, aplicar sanção, cobrar taxa — tudo depende de **base legal**.
- **Exemplo:** um diretor não pode, por portaria, criar uma gratificação que nenhuma lei prevê.
- **Comparação:** legalidade ≠ **reserva legal** (exigência de lei em sentido estrito para certas matérias). A legalidade administrativa é mais ampla: é a submissão ao **Direito** como um todo.
- 🚨 **Pegadinha:** "Em razão da legalidade, a Administração pode fazer tudo o que a lei não proíbe" ❌.

### ⚖️ Impessoalidade
- **Conceito:** atuar para o **interesse público**, sem favorecer nem perseguir ninguém; tratar igualmente quem está na mesma situação.
- **Três faces cobradas:** (1) **finalidade** — o ato serve ao interesse público; (2) **isonomia** — concurso e licitação são instrumentos de impessoalidade; (3) **vedação de promoção pessoal** — os atos são do **órgão**, não do agente.
- 📜 **Art. 37, § 1º:** a publicidade de atos, programas, obras, serviços e campanhas deve ter caráter **educativo, informativo ou de orientação social**, sem **nomes, símbolos ou imagens** que caracterizem **promoção pessoal**.
- **Exemplo:** placa de obra com a foto e o slogan pessoal do prefeito viola a impessoalidade (e a publicidade correta).
- 🚨 **Pegadinha:** o § 1º costuma ser cobrado como **publicidade**, mas a banca também o liga à **impessoalidade**. Ambas as leituras aparecem; leia o comando da questão.

🧠 **MEMORIZE:** **L**egalidade = **L**ei manda. **I**mpessoalidade = **I**nteresse público, não **I**ndivíduo.
""" + ex(
    "O prefeito inaugura uma creche e manda pintar, na fachada, sua foto e o slogan \"Gestão Zé Trabalhador\", que usou na campanha.",
    "Que regra foi violada?",
    "O **art. 37, § 1º**: a publicidade de obras deve ter caráter **educativo, informativo ou de orientação social**, sem **nomes, símbolos ou imagens** de **promoção pessoal**. Viola a **impessoalidade** (a obra é do Município, não do prefeito) e a finalidade da **publicidade**; pode ainda configurar improbidade.",
    [Q("obra", "Na fachada da creche: foto e slogan do prefeito.", [P("gestor", "esq", "aponta", "feliz"), P("cidadao", "dir", "neutro", "bravo")], (0, "Ficou linda minha foto!")),
     Q("reparticao", "O promotor recebe a denúncia.", [P("promotor", "esq", "pega", "serio", "documento"), P("cidadao", "dir", "fala", "neutro")], (0, "Promoção pessoal: art. 37, § 1º."))],
    "Promoção pessoal | erro",
    fluxo("Publicidade institucional", [("Informa, educa ou orienta?", "ok", "Permitido"), ("Traz nome, símbolo ou imagem do gestor?", "erro", "Proibido: promoção pessoal"), ("Princípios atingidos", "alerta", "Impessoalidade e publicidade")])),
    ["N0034", "N0035", "N0036", "N0001", "N0014"])

# ---------------------------------------------------------------- 14 M P E
sec("explicacao", "LIMPE (2): Moralidade, Publicidade e Eficiência", """
### ⚖️ Moralidade
- **Conceito:** agir com **ética, probidade, boa-fé e lealdade**. Não basta ser legal: o ato precisa ser **honesto**.
- **Aplicação:** a moralidade é princípio **autônomo** — pode invalidar um ato mesmo sem lei específica proibindo a conduta.
- **Instrumentos:** **ação popular** (CF, art. 5º, LXXIII), **improbidade administrativa** (art. 37, § 4º; Lei 8.429/1992) e a **vedação ao nepotismo** (Súmula Vinculante 13).
- 📜 **Art. 37, § 4º:** a improbidade importa **suspensão dos direitos políticos**, **perda da função pública**, **indisponibilidade dos bens** e **ressarcimento ao erário**, sem prejuízo da ação penal.
- 🚨 **Pegadinha:** § 4º fala em **suspensão** dos direitos políticos — não em **cassação** (proibida pelo art. 15) nem em "perda".

### ⚖️ Publicidade
- **Conceito:** **transparência** e **divulgação oficial** dos atos. A publicação é, em regra, **condição de eficácia** (o ato só produz efeitos externos depois de publicado), e não requisito de validade.
- **Exceções (sigilo):** informações imprescindíveis à **segurança da sociedade e do Estado** (art. 5º, XXXIII) e proteção da **intimidade** (art. 5º, X e LX). Regra geral: **Lei de Acesso à Informação** (Lei 12.527/2011).
- **Exemplo:** divulgação da remuneração de servidores em portal de transparência é compatível com a publicidade.

### ⚖️ Eficiência
- **Conceito:** fazer **bem**, **rápido** e com o **melhor uso dos recursos** — Administração **gerencial**, voltada a resultados.
- **Origem:** incluída no caput pela **EC 19/1998** (Reforma Administrativa) — foi o **último** princípio a entrar no LIMPE.
- **Aplicações:** avaliação periódica de desempenho do servidor (CF, art. 41, § 1º, III), contrato de desempenho para ampliar autonomia (art. 37, § 8º), metas e indicadores.
- 🚨 **Pegadinha:** eficiência **não autoriza** desrespeitar a lei "para ganhar tempo": ela atua **dentro** da legalidade.
""" + ex(
    "Para \"ser eficiente\", o diretor de uma unidade dispensa a licitação de uma compra grande, sem hipótese legal de dispensa, porque o processo \"demoraria demais\".",
    "A eficiência justifica a conduta?",
    "**Não.** A eficiência convive com a **legalidade** e não a afasta. Sem hipótese legal de dispensa, a compra exige licitação. A conduta viola a legalidade e a impessoalidade, e pode configurar improbidade.",
    [Q("reparticao", "O diretor quer pular a licitação.", [P("gestor", "esq", "fala", "feliz", "documento"), P("servidor", "dir", "neutro", "surpreso")], (0, "Sou eficiente: compro direto!")),
     Q("reparticao", "A servidora alerta.", [P("servidor", "esq", "aponta", "serio"), P("gestor", "dir", "neutro", "surpreso")], (0, "Eficiência não afasta a lei."))],
    "Eficiência ≠ ilegalidade | erro",
    comp("Eficiência e legalidade", ("Pode", "Eficiência dentro da lei", "ok", ["Metas e indicadores", "Avaliação de desempenho", "Processos mais simples previstos em lei"]),
         ("Não pode", "Atalho ilegal", "erro", ["Dispensar licitação sem lei", "Nomear sem concurso", "Ignorar o devido processo"]))),
    ["N0037", "N0038", "N0039", "N0016"])

# ---------------------------------------------------------------- 15 infográfico LIMPE
sec("esquema", "Infográfico do LIMPE", """
| Letra | Princípio | Pergunta que ele faz | Violação típica |
|---|---|---|---|
| **L** | **Legalidade** | Existe **lei** autorizando? | Gratificação criada por portaria |
| **I** | **Impessoalidade** | O ato serve ao **interesse público** ou a alguém? | Placa de obra com foto do prefeito; favorecer amigo |
| **M** | **Moralidade** | O ato é **honesto** e de boa-fé? | Nepotismo; uso da máquina para fins pessoais |
| **P** | **Publicidade** | Foi **divulgado** e é **transparente**? | Contrato mantido em segredo sem amparo legal |
| **E** | **Eficiência** | Gera **resultado** com bom uso de recursos? | Serviço parado por desorganização; desperdício |

**Linha do tempo:** CF/1988 trouxe **L-I-M-P** → a **EC 19/1998** acrescentou o **E** (eficiência).

🔴 **FOCO NA PROVA:** **LIMPE** corresponde a **legalidade, impessoalidade, moralidade, publicidade e eficiência** — e só esses cinco estão no caput do art. 37.

🚨 **Pegadinhas do LIMPE**
- "Razoabilidade e proporcionalidade são princípios expressos no art. 37" ❌ (são implícitos na CF e expressos na Lei 9.784/1999).
- "O LIMPE vale só para o Poder Executivo" ❌ (vale para os três Poderes e para a Indireta).
- "Eficiência estava no texto original de 1988" ❌ (entrou com a EC 19/1998).
- "Publicidade é requisito de validade de todo ato" ❌ (em regra, é condição de **eficácia**).
""", ["N0034", "N0035", "N0036", "N0037", "N0038", "N0039", "N0001"])

# ---------------------------------------------------------------- 16 supremacia, indisponibilidade, continuidade
sec("doutrina", "Módulo 5 — Supremacia, indisponibilidade e continuidade", """
⚠️ **Antes de tudo:** os princípios deste módulo **não** estão no caput do art. 37. Alguns são **implícitos** na Constituição; outros estão **expressos em lei** (Lei 9.784/1999, art. 2º); outros são **construções da doutrina**.

📜 **LEI SECA — Lei nº 9.784/1999, art. 2º, caput**
> Art. 2º A Administração Pública obedecerá, dentre outros, aos princípios da legalidade, finalidade, motivação, razoabilidade, proporcionalidade, moralidade, ampla defesa, contraditório, segurança jurídica, interesse público e eficiência.

| Princípio | Conceito | Aplicação | Exemplo | Pegadinha |
|---|---|---|---|---|
| **Supremacia do interesse público** | O interesse coletivo prevalece sobre o particular, gerando **prerrogativas** | Desapropriação, requisição, cláusulas exorbitantes nos contratos | Requisitar um imóvel em calamidade, com indenização posterior se houver dano | Não é absoluta: respeita direitos fundamentais e a lei |
| **Indisponibilidade do interesse público** | O gestor **não é dono** do interesse público: não pode renunciar a ele | Gera **restrições**: concurso, licitação, necessidade de lei para renunciar a créditos | Prefeito não pode perdoar dívida tributária sem lei | Supremacia = prerrogativas; indisponibilidade = **limites** |
| **Continuidade do serviço público** | Serviços essenciais não podem parar | Limites à greve, regras de interrupção de serviços concedidos | Corte de energia por falta de pagamento é admitido **após aviso prévio** (Lei 8.987/1995, art. 6º, § 3º, II) | Não impede toda interrupção: emergência e inadimplemento com aviso são exceções |

⚖️ **Supremacia + indisponibilidade = "pedras de toque" do regime jurídico-administrativo** (expressão consagrada na doutrina de Celso Antônio Bandeira de Mello): prerrogativas de um lado, sujeições de outro.

🏛️ **Greve de servidores:** o direito existe (CF, art. 37, VII), a ser exercido nos termos de **lei específica**; enquanto ela não vem, o STF manda aplicar, no que couber, a lei de greve do setor privado (Lei 7.783/1989) — Mandados de Injunção 670, 708 e 712.
""" + ex(
    "Na enchente, a Defesa Civil requisita o ginásio de um clube particular para abrigar famílias desalojadas. O clube alega que \"propriedade privada é intocável\".",
    "Qual princípio justifica a requisição e qual o limite?",
    "**Supremacia do interesse público**: diante de **perigo público iminente**, a autoridade pode usar a propriedade particular (CF, art. 5º, XXV). O limite vem da **indisponibilidade** e da lei: a requisição é temporária e, havendo **dano**, o proprietário tem direito a **indenização posterior**.",
    [Q("rua", "Enchente: famílias precisam de abrigo.", [P("gestor", "esq", "aponta", "serio"), P("cidadao", "dir", "neutro", "triste")], (0, "Requisito o ginásio do clube!")),
     Q("casa", "O dono do clube protesta.", [P("cidadao", "esq", "fala", "bravo"), P("advogado", "dir", "neutro", "serio")], (1, "Pode, mas indeniza se houver dano."))],
    "Supremacia com limites | alerta",
    fluxo("Requisição administrativa", [("Perigo público iminente", "alerta"), ("Uso temporário do bem particular", "ok", "Supremacia do interesse público"), ("Houve dano?", "neutro")], ("Indenização posterior", "ok", "CF, art. 5º, XXV"))),
    ["N0040", "N0041", "N0042"])

# ---------------------------------------------------------------- 17 razoabilidade etc
sec("doutrina", "Razoabilidade, proporcionalidade, motivação, segurança jurídica e especialidade", """
| Princípio | Onde está | Conceito | Exemplo | Pegadinha |
|---|---|---|---|---|
| **Razoabilidade** | Implícito na CF; expresso na Lei 9.784/1999 | Decisão **coerente e sensata**, compatível com o senso comum | Exigir altura mínima para cargo administrativo interno é desarrazoado | Não está no art. 37 |
| **Proporcionalidade** | Implícito na CF; expresso na Lei 9.784/1999 | Meio **adequado**, **necessário** e **proporcional em sentido estrito** ao fim | Demitir servidor por um atraso isolado de 5 minutos é desproporcional | Proibição do excesso: a sanção não pode ir além do necessário |
| **Motivação** | Lei 9.784/1999, arts. 2º e 50 | Indicar os **fatos e fundamentos** da decisão | Indeferir licença exige explicar por quê | Motivo (fato) ≠ motivação (exposição escrita) |
| **Segurança jurídica** | Lei 9.784/1999; LINDB (arts. 20 a 30) | Estabilidade, previsibilidade, **proteção da confiança** | Prazo de 5 anos para anular atos favoráveis (art. 54) | Impede aplicar **retroativamente** nova interpretação (Lei 9.784, art. 2º, par. único, XIII) |
| **Especialidade** | Doutrina (ligado à reserva legal do art. 37, XIX) | A entidade da Indireta fica presa à **finalidade da lei** que a criou | Autarquia de trânsito não pode passar a explorar loteria | Desvio de finalidade da entidade é ilegal |
| **Autotutela** | Súmulas 346 e 473 do STF; Lei 9.784/1999, art. 53 | Rever os próprios atos | (Módulo 6) | Não depende de ordem judicial |

📊 **Expressos na CF × expressos em lei × doutrinários**

| Categoria | Princípios |
|---|---|
| **Expressos no art. 37, caput** | Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência |
| **Expressos em lei** (Lei 9.784/1999, art. 2º) | Legalidade, finalidade, motivação, razoabilidade, proporcionalidade, moralidade, ampla defesa, contraditório, segurança jurídica, interesse público, eficiência |
| **Implícitos/doutrinários** | Supremacia e indisponibilidade do interesse público, continuidade, autotutela, especialidade, tutela/controle |

🎯 **FOCO NA PROVA:** **ampla defesa e contraditório** também são expressos na **CF**, mas no **art. 5º, LV** (processos judiciais **e administrativos**) — e não no art. 37.
""" + ex(
    "Um servidor com 15 anos de serviço e sem nenhuma punição chega 10 minutos atrasado uma vez. A chefia aplica demissão.",
    "A punição respeita os princípios administrativos?",
    "**Não.** Viola a **proporcionalidade** (a sanção é excessiva para a falta) e a **razoabilidade**. Além disso, a demissão só cabe nas hipóteses previstas em lei e após processo com **contraditório e ampla defesa** (CF, art. 5º, LV) e decisão **motivada**.",
    [Q("reparticao", "Um atraso de 10 minutos.", [P("servidor", "esq", "neutro", "triste"), P("gestor", "dir", "aponta", "bravo")], (1, "Está demitido!")),
     Q("forum", "O juiz analisa a punição.", [P("juiz", "centro", "fala", "serio")], (0, "Sanção desproporcional e sem processo."))],
    "Desproporcional | erro",
    fluxo("Teste da proporcionalidade", [("Adequação: o meio atinge o fim?", "neutro"), ("Necessidade: havia meio menos gravoso?", "erro", "Sim: advertência"), ("Proporcionalidade estrita", "erro", "Custo muito maior que o benefício")], ("Punição inválida", "erro"))),
    ["N0043", "N0044", "N0040"])

json.dump(S, open("conteudo-catalogo-adm/sec2.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(len(S), [len(s["bodyMarkdown"]) for s in S])
