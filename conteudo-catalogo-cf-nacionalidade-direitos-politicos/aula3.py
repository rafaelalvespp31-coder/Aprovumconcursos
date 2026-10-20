from helpers import *

# ============================================================== 14 — Art. 15
sec("explicacao", "Módulo 3 — Perda e suspensão dos direitos políticos (art. 15)", """
É **vedada a cassação** de direitos políticos, cuja **perda ou suspensão** só se dará nos casos de:

| Inciso | Hipótese | Perda ou suspensão (doutrina majoritária) |
|---|---|---|
| **I** | **Cancelamento da naturalização** por **sentença transitada em julgado** | **Perda** |
| **II** | **Incapacidade civil absoluta** | **Suspensão** |
| **III** | **Condenação criminal transitada em julgado**, **enquanto durarem seus efeitos** | **Suspensão** |
| **IV** | **Recusa de cumprir obrigação a todos imposta ou prestação alternativa**, nos termos do art. 5º, VIII | **Perda** para parte da doutrina; a Lei 8.239/1991 fala em **suspensão** (tema controvertido) |
| **V** | **Improbidade administrativa**, nos termos do art. 37, § 4º | **Suspensão** |

**Macete da perda — "CaRe":** **Ca**ncelamento da naturalização e **Re**cusa (posição tradicional). O restante é **suspensão**.

### Cassação × perda × suspensão × inelegibilidade

| Instituto | O que é | Admitido? |
|---|---|---|
| **Cassação** | Retirada **arbitrária**, por ato do poder público, sem as hipóteses constitucionais | **Vedada** |
| **Perda** | Privação **definitiva** (pode haver reaquisição nos termos da lei) | Só nas hipóteses do art. 15 |
| **Suspensão** | Privação **temporária**: cessada a causa, os direitos voltam | Só nas hipóteses do art. 15 |
| **Inelegibilidade** | Impede **apenas ser votado** (capacidade passiva); a pessoa **continua votando** | Hipóteses da CF e da LC 64/1990 |

⚠️ **Não use como sinônimos.** Quem está **inelegível** (ex.: pela Ficha Limpa) **vota normalmente**; quem tem direitos políticos **suspensos** **não vota nem é votado**.

### Detalhes de cada hipótese

- **I — Cancelamento da naturalização:** após a EC 131/2023, por **fraude no processo de naturalização** ou **atentado contra a ordem constitucional e o Estado Democrático** (art. 12, § 4º, I). Perde-se a nacionalidade e, com ela, os direitos políticos.
- **II — Incapacidade civil absoluta:** após o **Estatuto da Pessoa com Deficiência** (Lei 13.146/2015), só os **menores de 16 anos** são absolutamente incapazes (CC, art. 3º). A pessoa com deficiência, mesmo sob curatela, **mantém** o direito ao voto.
- **III — Condenação criminal:** a suspensão é **automática** (efeito da condenação, não precisa constar da sentença), vale para **crimes e contravenções**, dolosos ou culposos, **inclusive** quando a pena privativa de liberdade é **substituída por restritiva de direitos** (STF, Tema 370 — RE 601.182). Cessa com o **cumprimento ou a extinção da pena**, **independentemente de reabilitação** ou de prova de reparação dos danos (**Súmula 9 do TSE**).
- **IV — Escusa de consciência:** recusa de obrigação legal geral **e** da prestação alternativa (art. 5º, VIII).
- **V — Improbidade:** a suspensão é **sanção** aplicada na ação de improbidade (Lei 8.429/1992, alterada pela Lei 14.230/2021), e exige **trânsito em julgado** (art. 20 da lei).

📌 **Parlamentar condenado criminalmente:** a perda do mandato de deputado ou senador condenado criminalmente é **decidida pela respectiva Casa** (art. 55, VI e § 2º), em regra — tema com evolução jurisprudencial no STF.

⚠️ **Pegadinhas:**
- "A Constituição admite a cassação de direitos políticos em caso de improbidade." **Errado** — a cassação é **vedada**; a improbidade gera **suspensão**.
- "A suspensão por condenação criminal depende de declaração expressa na sentença." **Errado** — é **automática**.
- "A suspensão só cessa após a reabilitação criminal." **Errado** — Súmula 9 do TSE.
- "Condenado com pena substituída por restritivas de direitos mantém os direitos políticos." **Errado** — Tema 370.
""" + ex(
    "Marcos foi condenado, com trânsito em julgado, a 2 anos de reclusão, substituídos por prestação de serviços à comunidade. Ele cumpriu a pena em 2025. Em 2026, quer votar e se candidatar.",
    "Marcos tem direitos políticos?",
    "**Durante** o cumprimento da pena, seus direitos políticos ficaram **suspensos** — mesmo com a pena substituída (Tema 370). **Após** cumprir a pena, a suspensão **cessa**, sem necessidade de reabilitação (Súmula 9 do TSE): ele pode **votar**. Para **ser votado**, é preciso verificar se o crime gera **inelegibilidade** pela LC 64/1990 (Ficha Limpa), que pode perdurar por anos após o cumprimento.",
    [Q("forum", "Marcos é condenado; a pena é substituída.", [P("juiz", "esq", "fala", "serio", "documento"), P("investigado", "dir", "neutro", "triste")], (0, "Serviços à comunidade por 2 anos.")),
     Q("reparticao", "Em 2026, Marcos procura o cartório eleitoral.", [P("cidadao", "esq", "pega", "feliz", "documento"), P("servidor", "dir", "fala", "neutro")], (1, "Pena cumprida: pode votar."))],
    "Suspensão cessa com a pena | ok",
    linha("Direitos políticos de Marcos", "anos", [(2023, "Trânsito em julgado", "erro"), (2025, "Pena cumprida", "ok"), (2026, "Vota; elegibilidade: ver LC 64", "alerta")])),
    N(34))
m("Direitos políticos (arts. 14 a 16)", 14)

# ============================================================== 15 — Art. 16
sec("explicacao", "Módulo 3 — Anterioridade eleitoral (art. 16)", """
A **lei que alterar o processo eleitoral** **entrará em vigor na data de sua publicação**, **não se aplicando à eleição que ocorra até um ano da data de sua vigência** (redação da EC 4/1993).

**Atenção à estrutura:** a lei **vige imediatamente**, mas **não se aplica** às eleições que ocorram em **até 1 ano**. Não se trata de *vacatio legis* — é uma regra de **eficácia** (aplicação) para proteger a **segurança jurídica** e a **igualdade de chances** entre os candidatos, evitando mudanças casuísticas às vésperas da eleição.

| Data da publicação da lei | Eleição em 04/10/2026 | Aplica-se? |
|---|---|---|
| 01/10/2025 | Mais de 1 ano antes | **Sim** |
| 10/10/2025 | Menos de 1 ano antes | **Não** — só nas eleições seguintes |

### Jurisprudência do STF sobre o art. 16

- **Cláusula pétrea / garantia individual do eleitor:** o STF entende que a anterioridade eleitoral é **garantia fundamental** e se aplica **inclusive a emendas constitucionais** — na **ADI 3.685** (2006), afastou a aplicação imediata da EC 52/2006 (fim da verticalização das coligações) às eleições daquele ano.
- **Lei da Ficha Limpa:** no **RE 633.703** (2011), o STF decidiu que a LC 135/2010 **não se aplicava às eleições de 2010**, por violar o art. 16.
- **Mudanças de jurisprudência do TSE:** o STF entende que viradas jurisprudenciais do TSE que alterem o processo eleitoral também devem respeitar a **anterioridade**, não se aplicando ao pleito em curso (RE 637.485 — segurança jurídica).
- **"Processo eleitoral"** abrange normas que interfiram nas **regras do jogo** (candidaturas, propaganda, coligações, apuração); normas meramente procedimentais ou administrativas podem não atrair a regra.

⚠️ **Pegadinhas:**
- "A lei eleitoral só entra em vigor um ano após sua publicação." **Errado** — entra em vigor **na publicação**; apenas **não se aplica** à eleição que ocorra em até um ano.
- "O art. 16 não se aplica a emendas constitucionais." **Errado** — ADI 3.685.
""", N(35))
m("Direitos políticos (arts. 14 a 16)", 15)

# ============================================================== 16 — Partidos I
sec("explicacao", "Módulo 4 — Partidos políticos (1/2): liberdade, preceitos, autonomia, registro e organização paramilitar (art. 17, caput e §§ 1º, 2º e 4º)", """
### Caput — liberdade partidária com limites

É **livre** a **criação, fusão, incorporação e extinção** de partidos políticos, **resguardados**:
- a **soberania nacional**;
- o **regime democrático**;
- o **pluripartidarismo**;
- os **direitos fundamentais da pessoa humana**;

e **observados os seguintes preceitos**:
| Inciso | Preceito |
|---|---|
| I | **Caráter nacional** (não há partidos regionais ou estaduais) |
| II | **Proibição de recebimento de recursos financeiros de entidade ou governo estrangeiros** ou de **subordinação** a estes |
| III | **Prestação de contas à Justiça Eleitoral** |
| IV | **Funcionamento parlamentar** de acordo com a lei |

**Macete dos preceitos — "NA-ES-CO-FU":** caráter **Na**cional · sem dinheiro **Es**trangeiro · prestação de **Co**ntas · **Fu**ncionamento parlamentar.

📌 O **pluripartidarismo** também é fundamento da República (**pluralismo político** — art. 1º, V).

### § 1º — Autonomia partidária (redação da EC 97/2017)

É assegurada aos partidos **autonomia** para definir sua **estrutura interna** e estabelecer regras sobre **escolha, formação e duração** de seus **órgãos permanentes e provisórios** e sobre sua **organização e funcionamento**, e para adotar os critérios de escolha e o regime de suas **coligações nas eleições majoritárias**, **vedada a sua celebração nas eleições proporcionais**, **sem obrigatoriedade de vinculação** entre as candidaturas em âmbito nacional, estadual, distrital ou municipal, devendo seus **estatutos estabelecer normas de disciplina e fidelidade partidária**.

| Ponto | Regra |
|---|---|
| Coligações em eleições **majoritárias** (Presidente, Governador, Senador, Prefeito) | **Permitidas** |
| Coligações em eleições **proporcionais** (Deputados e Vereadores) | **Vedadas** (desde as eleições de 2020) |
| **Verticalização** (vinculação obrigatória entre coligações nacionais e locais) | **Não existe** — "sem obrigatoriedade de vinculação" (EC 52/2006, reforçada pela EC 97/2017) |
| Disciplina e fidelidade | Definidas nos **estatutos** |

📌 **Federações partidárias** (Lei 14.208/2021) são diferentes das coligações: os partidos se unem por **no mínimo 4 anos**, atuando como uma só agremiação, inclusive nas eleições proporcionais. O STF as considerou **constitucionais** (ADI 7.021).

### § 2º — Personalidade jurídica e registro

Os partidos, **após adquirirem personalidade jurídica, na forma da lei civil** (registro em cartório — são **pessoas jurídicas de direito privado**), **registrarão seus estatutos no Tribunal Superior Eleitoral**.

**Ordem:** 1º registro **civil** (personalidade jurídica) → 2º registro do **estatuto no TSE** (habilita a participar das eleições, receber fundo partidário e ter acesso à propaganda gratuita).

### § 4º — Organização paramilitar

É **vedada** a utilização, pelos partidos políticos, de **organização paramilitar** (relacione com o art. 5º, XVII, que veda associações de caráter paramilitar).

⚠️ **Pegadinhas:**
- "Os partidos são pessoas jurídicas de direito público." **Errado** — **direito privado**.
- "O registro do estatuto no TSE confere personalidade jurídica ao partido." **Errado** — a personalidade vem da **lei civil**; o TSE registra o **estatuto**.
- "São permitidas coligações nas eleições para vereador." **Errado** — vedadas nas **proporcionais**.
- "A Constituição admite partidos de âmbito estadual." **Errado** — **caráter nacional**.
""", N(36, 37, 38, 39, 41))
m("Partidos políticos (art. 17)", 16)

# ============================================================== 17 — Partidos II
sec("explicacao", "Módulo 4 — Partidos políticos (2/2): cláusula de desempenho, fidelidade e financiamento de candidaturas (art. 17, §§ 3º e 5º a 9º)", """
### § 3º — Cláusula de desempenho (de barreira) — EC 97/2017

**Somente** terão direito a **recursos do fundo partidário** e **acesso gratuito ao rádio e à televisão**, na forma da lei, os partidos que **alternativamente**:
- **I —** obtiverem, nas eleições para a **Câmara dos Deputados**, no mínimo **3% dos votos válidos**, distribuídos em pelo menos **1/3 das unidades da Federação**, com um mínimo de **2% dos votos válidos em cada uma delas**; **ou**
- **II —** tiverem elegido pelo menos **15 Deputados Federais** distribuídos em pelo menos **1/3 das unidades da Federação**.

📌 **Regra de transição** (EC 97/2017, art. 3º): as exigências cresceram gradualmente — 1,5% e 9 deputados (eleições de 2018); 2% e 11 deputados (2022); **2,5% e 13 deputados (2026)**; e os patamares definitivos de **3% e 15 deputados** a partir das eleições de **2030**.

📌 A cláusula **não impede** o partido de **existir** nem de **disputar eleições**: limita o **acesso a recursos públicos** e à **propaganda gratuita**.

### § 5º — O eleito por partido que não atingiu a cláusula

Ao eleito por partido que **não preencher** os requisitos do § 3º é **assegurado o mandato** e **facultada a filiação**, **sem perda do mandato**, a **outro partido que os tenha atingido** — mas essa filiação **não é considerada** para a distribuição do fundo partidário e do tempo de rádio e TV.

### § 6º — Fidelidade partidária (EC 111/2021)

Os **Deputados Federais, Estaduais, Distritais e Vereadores** que se **desligarem do partido** pelo qual foram eleitos **perderão o mandato**, **salvo** nos casos de **anuência do partido** ou de outras hipóteses de **justa causa estabelecidas em lei**; a migração **não é computada** para a distribuição de recursos do fundo partidário, de outros fundos públicos e do acesso ao rádio e à TV.

| Cargo | Perde o mandato por trocar de partido? |
|---|---|
| **Proporcionais** (deputados e vereadores) | **Sim**, salvo anuência do partido ou justa causa legal |
| **Majoritários** (Presidente, Governador, Prefeito, **Senador**) | **Não** — STF, **ADI 5.081** (2015): o mandato majoritário pertence ao **candidato eleito**, não ao partido |

📌 **Justa causa legal** (Lei 9.096/1995, art. 22-A): mudança substancial ou desvio reiterado do programa partidário; grave discriminação política pessoal; e a **janela partidária** — troca nos **30 dias** que antecedem o prazo de filiação exigido para concorrer, ao término do mandato.

### §§ 7º e 8º — Participação feminina (EC 117/2022)

- **§ 7º:** os partidos devem aplicar **no mínimo 5%** dos recursos do **fundo partidário** em programas de **promoção e difusão da participação política das mulheres**.
- **§ 8º:** o montante do **Fundo Especial de Financiamento de Campanha (FEFC)** e da parcela do fundo partidário destinada às campanhas, bem como o **tempo de propaganda gratuita** distribuído às candidatas, deve ser de **no mínimo 30%**, **proporcional ao número de candidatas**.

### § 9º — Candidaturas de pessoas pretas e pardas (EC 133/2024)

A EC 133/2024 incluiu no art. 17 a obrigação de os partidos aplicarem **percentual mínimo de recursos públicos de campanha** (FEFC e fundo partidário) em **candidaturas de pessoas pretas e pardas** (30%, segundo o texto da emenda), conforme os critérios partidários. A mesma emenda tratou de **regularização** de partidos que descumpriram cotas em eleições anteriores.

⚠️ **Pegadinhas:**
- "Partido que não atinge a cláusula de desempenho tem o registro cancelado." **Errado** — perde o acesso a **fundo partidário e propaganda gratuita**.
- "O senador que troca de partido perde o mandato." **Errado** — cargo **majoritário** (ADI 5.081).
- "O eleito por partido que não atingiu a cláusula perde o mandato ao migrar." **Errado** — § 5º assegura o mandato.
- "A cota de recursos para candidatas é de 5%." **Errado** — 5% é para **programas de participação feminina** (§ 7º); a cota de campanha é de **no mínimo 30%** (§ 8º).
""" + ex(
    "O deputado estadual Rui, eleito pelo Partido A, decide filiar-se ao Partido B no meio do mandato, sem anuência do Partido A e fora da janela partidária. O senador Lino, eleito pelo Partido A, faz o mesmo.",
    "Algum deles perde o mandato?",
    "**Rui pode perder o mandato:** deputado é cargo **proporcional**, e a desfiliação sem **anuência** do partido e sem **justa causa legal** gera perda (art. 17, § 6º). **Lino não perde:** senador é cargo **majoritário**, e o STF (ADI 5.081) afastou a perda de mandato por infidelidade nesses cargos.",
    [Q("reparticao", "Rui e Lino assinam a ficha do Partido B.", [P("gestor", "esq", "pega", "feliz", "documento"), P("gestor", "dir", "fala", "feliz")], (1, "Bem-vindos ao Partido B!")),
     Q("forum", "O Partido A pede os mandatos na Justiça Eleitoral.", [P("advogado", "esq", "fala", "bravo"), P("juiz", "dir", "neutro", "serio")], (0, "O mandato é do partido!"))],
    "Proporcional perde; majoritário não | alerta",
    comp("Troca de partido", ("Deputado (proporcional)", "Pode perder o mandato", "erro", ["salvo anuência ou justa causa", "art. 17, § 6º"]), ("Senador (majoritário)", "Não perde", "ok", ["mandato é do eleito", "ADI 5.081"]))),
    N(40, 42))
m("Partidos políticos (art. 17)", 17)
