from helpers import *

# ============================================================== 10 — HD (1/2)
sec("explicacao", "Módulo 6 — Habeas data (1/2): hipóteses de cabimento e recusa administrativa prévia", """
### Fundamento (art. 5º, LXXII; Lei 9.507/1997)

Conceder-se-á habeas data:
- **a)** para **assegurar o conhecimento de informações relativas à pessoa do impetrante**, constantes de **registros ou bancos de dados de entidades governamentais ou de caráter público**;
- **b)** para a **retificação de dados**, quando não se prefira fazê-lo por processo sigiloso, judicial ou administrativo.

A Lei 9.507/1997 (art. 7º, III) acrescentou uma terceira hipótese:
- **c)** para a **anotação**, nos assentamentos do interessado, de **contestação ou explicação** sobre dado **verdadeiro, mas justificável**, e que esteja sob pendência judicial ou amigável.

**Macete "CRA":** **C**onhecer · **R**etificar · **A**notar.

### O que é registro "de caráter público"

Considera-se de caráter público **todo registro ou banco de dados** contendo informações que sejam ou que possam ser **transmitidas a terceiros** ou que **não sejam de uso privativo** do órgão ou entidade produtora ou depositária das informações (Lei, art. 1º, parágrafo único).

**Exemplos de entidades sujeitas ao HD:** órgãos públicos em geral, **SPC**, **Serasa** e outros cadastros de proteção ao crédito (por divulgarem dados a terceiros), cadastros da Receita Federal.

**Não se sujeitam:** bancos de dados de **uso exclusivamente interno** de uma empresa privada (ex.: ficha funcional interna de um empregado em empresa privada).

📌 **STF, Tema 582 (RE 673.707, 2015):** o habeas data é **cabível** para que o contribuinte obtenha os **dados a seu respeito** constantes dos **sistemas informatizados de apoio à arrecadação** dos órgãos fazendários.

### Recusa administrativa prévia — requisito de interesse de agir

A petição inicial deve ser instruída com a **prova** (Lei, art. 8º, parágrafo único):

| Pedido administrativo | Prova exigida |
|---|---|
| **Acesso** às informações | **Recusa** **ou** decurso de **mais de 10 dias** sem decisão |
| **Retificação** | **Recusa** **ou** decurso de **mais de 15 dias** sem decisão |
| **Anotação** de contestação ou explicação | **Recusa** **ou** decurso de **mais de 15 dias** sem decisão |

**Súmula 2 do STJ:** **não cabe** habeas data se **não houve recusa** de informações por parte da autoridade administrativa.

**Macete 10-15-15:** acesso 10 · retificação 15 · anotação 15.

⚠️ **Pegadinhas:**
- "O HD pode ser impetrado diretamente, sem prévio pedido administrativo." **Errado** — Súmula 2 do STJ.
- "O HD serve para obter informações sobre terceiros." **Errado** — só **relativas à pessoa do impetrante**.
- "O HD só cabe contra entidades governamentais." **Errado** — também contra entidades **de caráter público** (SPC, Serasa).
""", N(25, 26, 27))
m("Habeas data", 10)

# ============================================================== 11 — HD (2/2)
sec("explicacao", "Módulo 6 — Habeas data (2/2): legitimidade, gratuidade, competência e distinções", """
### Legitimidade, advogado e custas

- **Ativa:** o **titular dos dados** — pessoa física ou jurídica, nacional ou estrangeira. É ação **personalíssima**: não se usa para obter dados de outra pessoa. A jurisprudência admite, excepcionalmente, a impetração por **herdeiros ou cônjuge** para dados do **falecido**.
- **Passiva:** a entidade **governamental** ou **de caráter público** que mantém o registro.
- **Exige advogado.**
- **Gratuito:** são gratuitos o **procedimento administrativo** e a **ação** de habeas data (CF, art. 5º, LXXVII; Lei 9.507/1997, art. 21).

### Prioridade de tramitação

O processo de habeas data tem **prioridade** sobre todos os atos judiciais, **exceto** habeas corpus e mandado de segurança (Lei, art. 19).

### Competência (exemplos)

| Ato de | Competência |
|---|---|
| Presidente da República, Mesas da Câmara e do Senado, TCU, PGR e do próprio STF | **STF** (art. 102, I, d) |
| Ministro de Estado, Comandantes das Forças Armadas e do próprio STJ | **STJ** (art. 105, I, b) |
| Juiz federal | **TRF** (art. 108, I, c) |
| Autoridade federal (excetuados os casos dos tribunais) | **Juiz federal** (art. 109, VIII) |

### Habeas data × acesso à informação pública × proteção de dados × mandado de segurança

| Situação | Instrumento |
|---|---|
| Quero **meus dados** em registro público ou de caráter público e o pedido foi recusado | **Habeas data** |
| Quero **informações públicas** sobre atividades do Estado (contratos, gastos) — art. 5º, XXXIII e **Lei 12.527/2011** | Pedido pela **LAI** e, se negado, **mandado de segurança** |
| Quero **certidão** para defesa de direitos (XXXIV, b) e foi negada | **Mandado de segurança** |
| Quero que uma empresa privada **apague ou corrija** dados meus tratados irregularmente | Direitos da **LGPD** (Lei 13.709/2018), na via administrativa (ANPD) ou ação comum; HD se o banco for de caráter público |
| Quero conhecer o **conteúdo de um processo** administrativo em que sou parte | Em regra, **mandado de segurança** (direito de vista) |

📌 A proteção de dados pessoais é hoje **direito fundamental autônomo** (art. 5º, LXXIX, EC 115/2022). O habeas data é **um** dos instrumentos dessa proteção, mas não o único.

⚠️ **Pegadinhas:**
- "O habeas data dispensa advogado, como o habeas corpus." **Errado** — exige advogado; o que os dois têm em comum é a **gratuidade**.
- "Cabe HD para obter cópia de contratos da prefeitura." **Errado** — informação pública geral → LAI e mandado de segurança.
- "Negada a certidão, cabe habeas data." **Errado** — mandado de segurança.
""" + ex(
    "Paulo descobre que seu nome consta como inadimplente no cadastro de um serviço de proteção ao crédito por uma dívida já paga. Ele pede a correção diretamente ao órgão, que fica 20 dias sem responder.",
    "Paulo pode impetrar habeas data?",
    "**Sim.** O cadastro de proteção ao crédito é **banco de dados de caráter público** (transmite informações a terceiros), o dado é **relativo ao próprio Paulo** e houve **decurso de mais de 15 dias** sem decisão sobre o pedido de **retificação** — o que supre a exigência de recusa prévia (Lei 9.507/1997, art. 8º). A ação é **gratuita**, mas exige advogado.",
    [Q("reparticao", "Paulo protocola o pedido de correção.", [P("cidadao", "esq", "pega", "serio", "documento"), P("servidor", "dir", "neutro", "neutro")], (0, "Essa dívida já foi paga!")),
     Q("forum", "Vinte dias depois, sem resposta, o advogado impetra HD.", [P("advogado", "esq", "fala", "serio", "maleta"), P("juiz", "dir", "neutro", "serio")], (0, "Mais de 15 dias sem decisão."))],
    "Retificação: 15 dias sem resposta | ok",
    linha("Habeas data para retificação", "dias", [(0, "Pedido administrativo", "neutro"), (15, "Prazo sem decisão", "alerta"), (20, "Impetração do HD", "ok")])),
    N(27, 28))
m("Habeas data", 11)

# ============================================================== 12 — Ação popular (1/2)
sec("explicacao", "Módulo 7 — Ação popular (1/2): objeto, lesividade e legitimidade", """
### Fundamento (art. 5º, LXXIII; Lei 4.717/1965)

**Qualquer cidadão** é parte legítima para propor ação popular que vise a **anular ato lesivo**:
- ao **patrimônio público** ou de **entidade de que o Estado participe**;
- à **moralidade administrativa**;
- ao **meio ambiente**;
- ao **patrimônio histórico e cultural**;

ficando o autor, **salvo comprovada má-fé**, **isento de custas judiciais e do ônus da sucumbência**.

**Macete dos bens protegidos — "PAMOMEHI":** **Pa**trimônio público · **Mo**ralidade · **Me**io ambiente · patrimônio **Hi**stórico e cultural.

### Lesividade e ilegalidade

- A Lei 4.717/1965 trata da ação contra atos **nulos** ou **anuláveis** e **lesivos** (incompetência, vício de forma, ilegalidade do objeto, inexistência dos motivos, desvio de finalidade — art. 2º).
- **STF, Tema 836 (ARE 824.781, 2015):** **não é condição** para a propositura da ação popular a demonstração de **prejuízo material aos cofres públicos** — a lesão à **moralidade administrativa**, por si só, autoriza a ação.
- Também cabe contra **omissão** lesiva e atos **preventivamente**, antes da consumação do dano.

### Legitimidade ativa — o cidadão

- **Cidadão** = brasileiro (nato ou naturalizado) **no gozo dos direitos políticos** — o português equiparado também. A prova da cidadania se faz com o **título de eleitor** ou documento correspondente (Lei, art. 1º, § 3º).
- **Súmula 365 do STF:** **pessoa jurídica não tem legitimidade** para propor ação popular.
- **Não podem propor:** estrangeiros, pessoas com direitos políticos suspensos, o **Ministério Público** (como autor originário) e associações.
- O eleitor de **16 ou 17 anos** pode propor (é cidadão); a doutrina discute se precisa de assistência — majoritariamente, **não** precisa, por se tratar de direito político.
- O eleitor **não precisa ter domicílio eleitoral** no local do ato impugnado.

### Legitimidade passiva (Lei, art. 6º)

A ação é proposta **contra**:
- as **pessoas jurídicas**, públicas ou privadas, em nome das quais foi praticado o ato;
- as **autoridades, funcionários ou administradores** que houverem autorizado, aprovado, ratificado ou praticado o ato, ou que, por omissão, tiverem dado oportunidade à lesão;
- os **beneficiários diretos** do ato.

📌 **Intervenção móvel (art. 6º, § 3º):** a pessoa jurídica de direito público ou privado cujo ato é impugnado pode **abster-se de contestar** ou até **atuar ao lado do autor**, se isso atender ao interesse público.

⚠️ **Pegadinhas:**
- "O Ministério Público pode propor ação popular." **Errado** — o MP acompanha e pode **prosseguir** se o autor desistir, mas não é autor originário.
- "Pessoa jurídica pode propor ação popular." **Errado** — Súmula 365.
- "A ação popular exige prejuízo financeiro ao erário." **Errado** — Tema 836.
""", N(29, 30, 31))
m("Ação popular", 12)

# ============================================================== 13 — Ação popular (2/2)
sec("aprofundamento", "Módulo 7 — Ação popular (2/2): papel do MP, competência, custas, sentença e coisa julgada", """
### O Ministério Público na ação popular (Lei 4.717/1965)

- **Acompanha** a ação como **fiscal da ordem jurídica**, devendo **apressar a produção da prova** e **promover a responsabilidade**, civil ou criminal, dos que nela incidirem.
- É **vedado ao MP, em qualquer hipótese, assumir a defesa do ato impugnado** ou de seus autores (art. 6º, § 4º).
- Se o **autor desistir** ou der causa à extinção do processo, qualquer **cidadão** ou o **MP** pode **promover o prosseguimento** da ação (art. 9º).

### Competência

- É do **juízo de primeiro grau** competente conforme a **origem do ato** (Justiça Federal se houver interesse da União; Justiça Estadual nos demais casos).
- **Não há foro por prerrogativa de função** em ação popular: mesmo que o réu seja o Presidente da República, a ação corre em **primeira instância** (o STF já firmou esse entendimento).

### Liminar e procedimento

- Cabe **suspensão liminar** do ato lesivo impugnado (art. 5º, § 4º).
- Prazo de **20 dias** para contestação, prorrogável por mais 20.
- **Prescrição:** a ação popular prescreve em **5 anos** (art. 21).

### Custas e sucumbência

| Situação | Consequência |
|---|---|
| Ação julgada **procedente** | Réus condenados ao ressarcimento, custas e honorários |
| Ação julgada **improcedente**, autor de **boa-fé** | Autor **isento** de custas e sucumbência (CF, art. 5º, LXXIII) |
| Ação **temerária** / **comprovada má-fé** | Autor condenado ao **décuplo das custas** (Lei, art. 13) e às despesas |

### Sentença e coisa julgada (Lei, arts. 18 e 19)

- A sentença terá eficácia de **coisa julgada oponível *erga omnes***, **exceto** no caso de **improcedência por deficiência de prova**: nessa hipótese, **qualquer cidadão** pode propor **outra ação idêntica**, com **nova prova** (coisa julgada **secundum eventum probationis**).
- A sentença que concluir pela **carência ou improcedência** da ação está sujeita ao **duplo grau de jurisdição obrigatório** (reexame necessário) — o inverso da regra comum, porque aqui se protege o interesse público defendido pelo autor.

⚠️ **Pegadinhas:**
- "A sentença de improcedência na ação popular sempre faz coisa julgada material para todos." **Errado** — não faz se a improcedência for por **deficiência de prova**.
- "Na ação popular, a sentença de procedência está sujeita a reexame necessário." **Errado** — a de **improcedência ou carência**.
- "O autor da ação popular sempre paga custas se perder." **Errado** — só com **comprovada má-fé**.
""" + ex(
    "Ana, eleitora em Belo Horizonte, propõe ação popular contra contrato da prefeitura de Betim que pagou o triplo do preço de mercado por merenda escolar. A ação é julgada improcedente porque as notas fiscais juntadas eram insuficientes. Meses depois, Bruno, outro eleitor, obtém novas provas.",
    "Bruno pode propor nova ação popular sobre o mesmo contrato?",
    "**Sim.** A improcedência por **deficiência de prova** **não** faz coisa julgada *erga omnes* (Lei 4.717/1965, art. 18), e **qualquer cidadão** pode propor ação idêntica com nova prova. Ana, ainda que derrotada, fica **isenta de custas e sucumbência**, pois agiu de **boa-fé**. Também não importa que ela seja eleitora em outro município.",
    [Q("forum", "A ação de Ana é julgada improcedente.", [P("juiz", "esq", "fala", "serio", "documento"), P("cidadao", "dir", "neutro", "triste")], (0, "Provas insuficientes.")),
     Q("forum", "Bruno chega com novas provas.", [P("cidadao", "esq", "pega", "feliz", "documento"), P("advogado", "dir", "fala", "serio")], (1, "Cabe nova ação popular."))],
    "Sem prova, sem coisa julgada erga omnes | alerta",
    comp("Coisa julgada na ação popular", ("Procedência ou improcedência com provas", "Erga omnes", "neutro", ["vale para todos"]), ("Improcedência por falta de prova", "Nova ação é possível", "ok", ["qualquer cidadão", "com nova prova"]))),
    N(31, 32))
m("Ação popular", 13)

# ============================================================== 14 — ACP
sec("explicacao", "Módulo 8 — Ação civil pública e tutela coletiva complementar (Lei 7.347/1985)", """
Embora **não seja** um dos remédios constitucionais típicos do art. 5º, a **ação civil pública (ACP)** é o principal instrumento de **tutela coletiva** do país. A Constituição a menciona como **função institucional do Ministério Público** (art. 129, III), sem exclusividade (art. 129, § 1º).

### Objeto (Lei 7.347/1985, art. 1º)

Responsabilidade por danos morais e patrimoniais causados ao **meio ambiente**; ao **consumidor**; a **bens e direitos de valor artístico, estético, histórico, turístico e paisagístico**; a **qualquer outro interesse difuso ou coletivo**; por **infração da ordem econômica**; à **ordem urbanística**; à **honra e à dignidade de grupos raciais, étnicos ou religiosos**; e ao **patrimônio público e social**.

**Não cabe ACP** para veicular pretensões que envolvam **tributos**, **contribuições previdenciárias**, **FGTS** ou outros **fundos de natureza institucional** cujos beneficiários possam ser individualmente determinados (art. 1º, parágrafo único).

### Legitimados (art. 5º) — concorrentes e disjuntivos

| Legitimado | Observação |
|---|---|
| **Ministério Público** | Pode instaurar **inquérito civil** antes (art. 8º, § 1º); se não for parte, atua como fiscal |
| **Defensoria Pública** | O STF reconheceu a legitimidade ampla (ADI 3.943) |
| **União, Estados, DF e Municípios** | — |
| **Autarquias, empresas públicas, fundações e sociedades de economia mista** | — |
| **Associações** | Constituídas há **pelo menos 1 ano** nos termos da lei civil e com **finalidade institucional** ligada ao bem protegido (pertinência temática); o juiz pode **dispensar** o requisito de pré-constituição quando houver **manifesto interesse social** (§ 4º) |

**Cidadão não propõe ACP** (ele tem a ação popular).

### Pontos processuais

- **Competência:** foro do **local do dano** (art. 2º).
- **Termo de ajustamento de conduta (TAC):** órgãos públicos legitimados podem tomar compromisso com **eficácia de título executivo extrajudicial** (art. 5º, § 6º).
- **Custas:** sem adiantamento; a **associação autora** não é condenada em honorários e custas, **salvo comprovada má-fé** (art. 18).
- **Coisa julgada:** *erga omnes*; o **STF (Tema 1.075, RE 1.101.937, 2021)** declarou inconstitucional a limitação dos efeitos da sentença aos limites da **competência territorial** do órgão prolator (art. 16 da Lei 7.347/1985, na redação da Lei 9.494/1997).

### Ação civil pública × ação popular × mandado de segurança coletivo

| Critério | **Ação popular** | **Ação civil pública** | **MS coletivo** |
|---|---|---|---|
| Base | art. 5º, LXXIII | art. 129, III; Lei 7.347/1985 | art. 5º, LXX |
| É remédio típico do art. 5º? | **Sim** | **Não** | **Sim** |
| Quem propõe | **Cidadão** | MP, Defensoria, entes públicos, entidades da administração indireta, associações (1 ano) | Partido com representação no CN, sindicato, entidade de classe, associação (1 ano) |
| Objeto | **Anular ato lesivo** ao patrimônio público, moralidade, meio ambiente e patrimônio histórico-cultural | Responsabilidade por danos a interesses **difusos, coletivos** e **individuais homogêneos** | Direito **líquido e certo** coletivo ou individual homogêneo contra **ato de autoridade** |
| Prova | Ampla | Ampla | **Pré-constituída** |
| Custas do autor | Isento, salvo má-fé | Associação isenta, salvo má-fé | Regras do MS |

⚠️ **Pegadinha:** "Associação, cidadão e MP têm a mesma legitimidade em todos esses instrumentos." **Errado** — o **cidadão** só na ação popular; o **MP** na ACP (e acompanha a popular); a **associação** na ACP e no MS coletivo, cada um com seus requisitos.
""", N(33, 34, 35))
m("Ação civil pública e tutela coletiva", 14)
