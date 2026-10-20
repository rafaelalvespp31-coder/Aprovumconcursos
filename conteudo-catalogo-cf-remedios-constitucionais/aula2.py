from helpers import *

# ============================================================== 5 — MS individual (1/2)
sec("explicacao", "Módulo 3 — Mandado de segurança individual (1/2): direito líquido e certo, autoridade coatora e legitimidade", """
### Fundamento (art. 5º, LXIX; Lei 12.016/2009)

Conceder-se-á mandado de segurança para proteger **direito líquido e certo**, **não amparado por habeas corpus ou habeas data**, quando o responsável pela **ilegalidade ou abuso de poder** for **autoridade pública** ou **agente de pessoa jurídica no exercício de atribuições do Poder Público**.

### Direito líquido e certo

É o direito cujos **fatos** podem ser comprovados **de plano**, por **prova documental pré-constituída**, juntada com a inicial — **sem dilação probatória** (não há perícia, testemunhas ou instrução).

⚠️ "Líquido e certo" **não significa** que o direito seja **simples** ou que a questão jurídica seja fácil:
- **Súmula 625 do STF:** **controvérsia sobre matéria de direito não impede** concessão de mandado de segurança.
- O que precisa ser incontroverso são os **fatos** (comprovados por documento), não a interpretação da lei.

📌 Se o documento necessário estiver em poder de autoridade que se recusa a fornecê-lo, o juiz ordenará sua exibição (Lei 12.016/2009, art. 6º, § 1º).

### Ato de autoridade

| Pode ser coator | Não cabe MS contra |
|---|---|
| Autoridades da administração **direta e indireta** de qualquer ente | **Atos de gestão comercial** praticados por administradores de **empresas públicas**, **sociedades de economia mista** e **concessionárias** (Lei, art. 1º, § 2º) |
| **Agentes de pessoas jurídicas privadas** no exercício de **atribuições do Poder Público** (ex.: diretor de universidade particular ao negar matrícula; dirigente de concessionária em ato de serviço público delegado) | Atos **puramente privados** |
| Representantes de **partidos políticos**, dirigentes de autarquias e órgãos equiparados | — |

**Autoridade coatora** é quem **praticou o ato** ou de quem **emanou a ordem** para sua prática (Lei, art. 6º, § 3º) — e não o mero executor.

### Legitimidade

- **Ativa:** o **titular do direito líquido e certo** — pessoa física ou jurídica, nacional ou estrangeira, e até **órgãos públicos despersonalizados** com prerrogativas próprias (ex.: Mesa de Casa Legislativa) e entes com capacidade processual (espólio, massa falida).
- **Terceiro (Lei, art. 3º):** o titular de direito líquido e certo **decorrente de direito de terceiro** pode impetrar em favor do direito originário se o titular não o fizer em **30 dias**, após notificado judicialmente.
- **Passiva:** discute-se na doutrina; pela Lei 12.016/2009, a **autoridade coatora** presta informações e a **pessoa jurídica** a que ela pertence é cientificada e pode ingressar no feito (art. 7º, II).
- **Exige advogado** (capacidade postulatória).
""" + ex(
    "Aprovado em concurso dentro do número de vagas, Diego não é nomeado até o fim do prazo de validade. Ele tem o edital, o resultado homologado e a publicação do fim da validade.",
    "Cabe mandado de segurança?",
    "**Sim.** O STF reconhece o **direito subjetivo à nomeação** do aprovado dentro das vagas (RE 598.099 — Tema 161). Os fatos estão comprovados por **documentos** (prova pré-constituída), e o ato omissivo é de autoridade pública. O prazo de **120 dias** conta a partir do **fim da validade** do concurso.",
    [Q("reparticao", "Diego confere a lista de aprovados.", [P("cidadao", "esq", "pega", "feliz", "documento"), P("servidor", "dir", "neutro", "neutro")], (0, "Fiquei dentro das vagas!")),
     Q("forum", "O advogado impetra o MS com os documentos.", [P("advogado", "esq", "fala", "serio", "maleta"), P("juiz", "dir", "neutro", "serio")], (0, "Direito líquido e certo à nomeação."))],
    "Prova documental: MS cabível | ok",
    fluxo("Mandado de segurança", [("Direito comprovável por documento?", "ok"), ("Ato de autoridade pública?", "ok", "Omissão em nomear"), ("Cabe HC ou HD?", "neutro", "Não"), ("Dentro de 120 dias?", "ok", "Do fim da validade")], ("MS cabível", "ok"))),
    N(10, 11, 12))
m("Mandado de segurança individual", 5)

# ============================================================== 6 — MS individual (2/2)
sec("aprofundamento", "Módulo 3 — Mandado de segurança individual (2/2): prazo de 120 dias, liminar, não cabimento e efeitos", """
### Prazo decadencial (Lei 12.016/2009, art. 23)

O direito de requerer mandado de segurança **extingue-se** decorridos **120 dias**, contados da **ciência, pelo interessado, do ato impugnado**.

- É prazo **decadencial**: **não se suspende nem se interrompe**.
- **Súmula 632 do STF:** é **constitucional** lei que fixa o prazo de decadência para a impetração.
- **Súmula 430 do STF:** **pedido de reconsideração** na via administrativa **não interrompe** o prazo.
- **Omissão:** quando a lei fixa prazo para a autoridade agir, os 120 dias começam após o fim desse prazo; em omissões de **trato sucessivo** (que se renovam), o prazo se renova.
- O MS **preventivo** (diante de ameaça) não se sujeita ao prazo enquanto a ameaça persiste.

### Não cabe mandado de segurança (Lei, art. 5º, e súmulas)

| Fonte | Hipótese |
|---|---|
| Lei, art. 5º, I | Ato do qual caiba **recurso administrativo com efeito suspensivo**, **independentemente de caução** |
| Lei, art. 5º, II | **Decisão judicial** da qual caiba **recurso com efeito suspensivo** (Súmula 267 do STF) |
| Lei, art. 5º, III | **Decisão judicial transitada em julgado** (Súmula 268 do STF) |
| Súmula 266 do STF | Contra **lei em tese** (salvo lei de efeitos concretos) |
| Súmula 269 do STF | Como **substitutivo de ação de cobrança** |
| Súmula 271 do STF | A concessão **não produz efeitos patrimoniais** em relação a **período pretérito** (cobram-se pela via própria) |
| Lei, art. 1º, § 2º | Atos de **gestão comercial** de empresas públicas, sociedades de economia mista e concessionárias |

📌 O cabimento de recurso administrativo com efeito suspensivo **não obriga** o interessado a esgotar a via administrativa — apenas impede o MS **enquanto** o recurso puder suspender o ato. Se o interessado deixar passar o prazo do recurso, cabe o MS (dentro dos 120 dias).

### Liminar (Lei, art. 7º, III)

O juiz pode **suspender o ato** que deu motivo ao pedido quando houver **fundamento relevante** e do ato impugnado puder resultar a **ineficácia da medida**, caso deferida ao final — podendo exigir caução, fiança ou depósito.

📌 **ADI 4.296 (2021):** o STF declarou **inconstitucional** a vedação genérica de liminares do **art. 7º, § 2º** (compensação de créditos tributários, entrega de mercadorias do exterior, reclassificação ou equiparação de servidores, concessão de aumento ou extensão de vantagens) e a exigência de **oitiva prévia** da pessoa jurídica de direito público em **72 horas** antes de liminar no **MS coletivo** (art. 22, § 2º).

### Sentença, recursos e efeitos

- **Não cabe condenação em honorários advocatícios** (Lei, art. 25; **Súmula 512** do STF) nem **embargos infringentes**.
- Concedida a segurança, a sentença está sujeita ao **duplo grau obrigatório** (reexame necessário — art. 14, § 1º), mas **pode ser executada provisoriamente** (salvo vedações legais).
- Da sentença cabe **apelação** (art. 14).
- **Denegação sem resolução do mérito** (ex.: falta de prova pré-constituída) **não impede** que o interessado busque seus direitos pela **via ordinária** (art. 19) ou renove o MS **dentro do prazo decadencial** (art. 6º, § 6º).

⚠️ **Pegadinhas:**
- "O prazo do MS é de 120 dias contados da prática do ato." **Errado** — da **ciência** do ato pelo interessado.
- "O pedido de reconsideração interrompe o prazo." **Errado** — Súmula 430.
- "Questão jurídica complexa impede o MS." **Errado** — Súmula 625.
- "No MS, há condenação em honorários." **Errado** — Súmula 512.
- "O MS pode ser usado para cobrar parcelas atrasadas anteriores à impetração." **Errado** — Súmulas 269 e 271.
""", N(13, 14))
m("Mandado de segurança individual", 6)

# ============================================================== 7 — MS coletivo
sec("explicacao", "Módulo 4 — Mandado de segurança coletivo: legitimados, direitos tutelados e coisa julgada", """
### Legitimados (art. 5º, LXX, e Lei 12.016/2009, art. 21)

| Legitimado | Requisito | O que pode defender |
|---|---|---|
| **Partido político** | Com **representação no Congresso Nacional** (ao menos um parlamentar) | Interesses legítimos relativos a seus **integrantes** ou à **finalidade partidária** |
| **Organização sindical** | Legalmente constituída | Direitos dos **membros**, pertinentes às suas finalidades |
| **Entidade de classe** | Legalmente constituída | Idem |
| **Associação** | Legalmente constituída e **em funcionamento há pelo menos 1 ano** | Direitos da **totalidade ou de parte** dos associados, pertinentes às suas finalidades |

📌 **O requisito de 1 ano de funcionamento** se aplica, segundo o STF, **só às associações** — não a sindicatos e entidades de classe.
📌 **Pertinência temática:** a entidade só pode defender direitos ligados às suas **finalidades estatutárias**.
📌 **Ministério Público e Defensoria** não estão listados no art. 5º, LXX — mas são legitimados no **mandado de injunção coletivo** (Lei 13.300/2016) e na **ação civil pública**.

### Dispensa de autorização — substituição processual

- **Súmula 629 do STF:** a impetração de MS coletivo por entidade de classe em favor dos associados **independe da autorização** destes.
- **Súmula 630 do STF:** a entidade de classe tem legitimação para o MS **ainda quando a pretensão interesse apenas a uma parte** da categoria.
- A Lei 12.016/2009 (art. 21) reforça: **dispensada, para tanto, autorização especial**.

### Direitos tutelados (Lei, art. 21, parágrafo único)

| Espécie | Definição legal |
|---|---|
| **Coletivos** | **Transindividuais**, de natureza **indivisível**, de que seja titular **grupo ou categoria** ligada entre si ou com a parte contrária por uma **relação jurídica básica** |
| **Individuais homogêneos** | Decorrentes de **origem comum** e da atividade ou situação específica da totalidade ou de parte dos associados ou membros |

📌 A lei **não menciona os direitos difusos**; a doutrina discute se o MS coletivo poderia tutelá-los. Para a prova, siga a **lei**: coletivos e individuais homogêneos.

### Coisa julgada e ações individuais (Lei, art. 22)

- A sentença faz **coisa julgada limitadamente aos membros** do grupo ou categoria **substituídos** pelo impetrante.
- O MS coletivo **não induz litispendência** para as ações individuais.
- Mas os efeitos da coisa julgada **não beneficiarão** o impetrante individual que **não requerer a desistência** de seu MS individual no prazo de **30 dias** a contar da **ciência comprovada** da impetração coletiva.

⚠️ **Pegadinhas:**
- "Partido político sem representação no Congresso pode impetrar MS coletivo." **Errado.**
- "O sindicato deve estar em funcionamento há pelo menos 1 ano." **Errado** — exigência só para **associação**.
- "O MS coletivo exige autorização expressa dos associados." **Errado** — Súmula 629.
- "O MS coletivo induz litispendência em relação aos MS individuais." **Errado.**
""" + ex(
    "Uma associação de policiais penais, fundada há 8 meses, impetra mandado de segurança coletivo contra ato do Secretário de Estado que suspendeu um adicional de todos os associados. O sindicato da categoria, fundado no mesmo mês, impetra outro MS coletivo sobre o mesmo tema.",
    "Os dois têm legitimidade?",
    "**A associação não**: precisa estar **em funcionamento há pelo menos 1 ano** (art. 5º, LXX, b). **O sindicato sim**: segundo o STF, o requisito de 1 ano **não se aplica** às organizações sindicais. Nenhum dos dois precisa de autorização dos associados (Súmula 629).",
    [Q("reparticao", "A associação e o sindicato protocolam suas ações.", [P("policial_penal", "esq", "pega", "serio", "documento"), P("advogado", "dir", "fala", "neutro", "maleta")], (1, "Dois mandados de segurança coletivos.")),
     Q("forum", "O juiz verifica a legitimidade de cada um.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Associação: falta 1 ano."))],
    "1 ano só para associação | alerta",
    comp("MS coletivo: legitimidade", ("Associação (8 meses)", "Ilegítima", "erro", ["exige 1 ano de funcionamento"]), ("Sindicato (8 meses)", "Legítimo", "ok", ["requisito de 1 ano não se aplica", "sem autorização: Súmula 629"]))),
    N(15, 16, 17, 18))
m("Mandado de segurança coletivo", 7)

# ============================================================== 8 — MI (1/2)
sec("explicacao", "Módulo 5 — Mandado de injunção (1/2): requisitos, legitimidade, competência e procedimento", """
### Fundamento (art. 5º, LXXI; Lei 13.300/2016)

Conceder-se-á mandado de injunção **sempre que a falta de norma regulamentadora torne inviável o exercício dos direitos e liberdades constitucionais e das prerrogativas inerentes à nacionalidade, à soberania e à cidadania**.

### Requisitos

1. **Norma constitucional** que reconheça direito, liberdade ou prerrogativa e que **dependa de regulamentação** (norma de **eficácia limitada**).
2. **Ausência total ou parcial** de norma regulamentadora. A Lei 13.300/2016 (art. 2º, parágrafo único) considera **parcial** a regulamentação quando forem **insuficientes** as normas editadas.
3. **Nexo de causalidade:** a omissão **torna inviável** o exercício do direito.

⚠️ **Não cabe MI:**
- quando a norma constitucional é **autoaplicável** (eficácia plena) ou já existe regulamentação suficiente;
- para pedir a **edição de lei** que a CF **não exige** (mera conveniência);
- para discutir a **qualidade** ou a **constitucionalidade** de lei existente (cabe ADI, não MI);
- quando o direito depende de regulamentação **infraconstitucional** facultativa.

### Legitimidade (Lei 13.300/2016, art. 3º)

- **Ativa:** **pessoas naturais ou jurídicas** que se afirmam **titulares** dos direitos, liberdades ou prerrogativas.
- **Passiva:** o **Poder, órgão ou autoridade** com atribuição para **editar a norma** regulamentadora (ex.: Congresso Nacional, Presidente da República quando a iniciativa é privativa dele).
- **Particular não pode ser réu** em mandado de injunção (só o ente estatal omisso).
- **Exige advogado.**

### Competência (exemplos constitucionais)

| Órgão omisso | Competência |
|---|---|
| Presidente da República, Congresso Nacional, Câmara, Senado, Mesas, TCU, Tribunais Superiores, STF | **STF** (art. 102, I, q) |
| Órgão, entidade ou autoridade federal da administração direta ou indireta (ressalvados os do STF e de outras justiças) | **STJ** (art. 105, I, h) |
| Decisão denegatória de MI pelo TSE (recurso) | **TSE** decide; recurso ao STF (art. 121, § 4º, V) |

### Procedimento (Lei 13.300/2016)

- Petição inicial com os requisitos do CPC, indicando o órgão impetrado e a pessoa jurídica que ele integra.
- Notificação do impetrado para **informações em 10 dias**; ciência ao órgão de representação judicial da pessoa jurídica.
- Oitiva do **Ministério Público** (10 dias).
- **Aplicam-se subsidiariamente** as normas do **mandado de segurança** e do **CPC** (art. 14).
""", N(19, 20, 21))
m("Mandado de injunção", 8)

# ============================================================== 9 — MI (2/2)
sec("aprofundamento", "Módulo 5 — Mandado de injunção (2/2): efeitos da decisão, teorias, MI coletivo e comparação com a ADO", """
### Efeitos da decisão (Lei 13.300/2016, arts. 8º a 11)

Reconhecido o **estado de mora legislativa**, será deferida a injunção para:
- **I —** determinar **prazo razoável** para que o impetrado promova a **edição da norma**;
- **II —** estabelecer as **condições** em que se dará o **exercício dos direitos**, liberdades ou prerrogativas reclamados **ou**, se for o caso, as condições em que poderá o interessado promover **ação própria** visando a exercê-los, **caso não seja suprida a mora** no prazo determinado.

📌 **Será dispensada** a fixação do prazo (inciso I) quando ficar comprovado que o impetrado **deixou de atender, em mandado de injunção anterior**, o prazo estabelecido.

| Efeito subjetivo | Regra |
|---|---|
| **Regra** | Eficácia **limitada às partes** (inter partes), até o advento da norma regulamentadora (art. 9º) |
| **Exceção** | Pode ser conferida eficácia **ultra partes** ou **erga omnes** quando isso for **inerente ou indispensável** ao exercício do direito (art. 9º, § 1º) |
| **Extensão** | Transitada em julgado, os efeitos podem ser **estendidos aos casos análogos** por **decisão monocrática do relator** (art. 9º, § 2º) |
| **Norma superveniente** | Produz efeitos **ex nunc** para os beneficiados por decisão transitada em julgado, **salvo se a aplicação da norma editada lhes for mais favorável** (art. 11) |

### Teorias sobre os efeitos (evolução no STF)

| Teoria | O que o Judiciário faz | Exemplo |
|---|---|---|
| **Não concretista** | Apenas **declara a mora** e comunica o órgão omisso | Posição inicial do STF (MI 107, 1989) |
| **Concretista geral** | Viabiliza o direito **para todos** (efeito erga omnes) | **MIs 670, 708 e 712** (2007): Lei 7.783/1989 aplicada à greve dos servidores |
| **Concretista individual direta** | Viabiliza o direito **só para o impetrante**, de imediato | MI 721 (aposentadoria especial de servidor) |
| **Concretista individual intermediária** | Fixa **prazo** para o órgão legislar; se não legislar, viabiliza o direito | Modelo adotado pela **Lei 13.300/2016** (art. 8º) |

📌 **Súmula Vinculante 33:** aplicam-se ao **servidor público**, no que couber, as regras do **regime geral de previdência** sobre **aposentadoria especial** (art. 40, § 4º, III), até a edição de lei complementar específica — fruto da reiteração de mandados de injunção.

### Mandado de injunção coletivo (Lei 13.300/2016, art. 12)

| Legitimado | Quando |
|---|---|
| **Ministério Público** | Tutela especialmente relevante para a defesa da **ordem jurídica**, do **regime democrático** ou dos **interesses sociais ou individuais indisponíveis** |
| **Partido político com representação no Congresso** | Direitos de seus **integrantes** ou relacionados à **finalidade partidária** |
| **Organização sindical, entidade de classe ou associação** (constituída e **em funcionamento há pelo menos 1 ano**) | Direitos da **totalidade ou de parte** dos membros, pertinentes às finalidades, **dispensada autorização especial** |
| **Defensoria Pública** | Tutela especialmente relevante para a promoção dos **direitos humanos** e a defesa dos direitos dos **necessitados** |

Coisa julgada **limitada** às pessoas da coletividade representada; não induz litispendência em relação aos individuais, mas o impetrante individual só se beneficia se **desistir** de sua ação em **30 dias** (art. 13).

### Mandado de injunção × ADO

| Critério | **Mandado de injunção** | **ADI por omissão (ADO)** |
|---|---|---|
| Controle | **Difuso/concreto** (caso concreto) | **Concentrado/abstrato** |
| Objetivo | Viabilizar o **exercício de um direito** do impetrante | Defender a **ordem constitucional** contra a omissão |
| Legitimados | **Qualquer titular** do direito (e os coletivos) | Só os do **art. 103** |
| Competência | STF, STJ, TJs e outros, conforme o órgão omisso | **STF** (CF) ou TJ (Constituição estadual) |
| Efeito típico | Viabiliza o direito (Lei 13.300/2016, art. 8º) | **Ciência** ao Poder omisso; órgão **administrativo** deve agir em **30 dias** (art. 103, § 2º) |

⚠️ **Pegadinhas:**
- "O MI cabe quando a lei existente é inconstitucional." **Errado** — cabe ADI; o MI é contra **omissão**.
- "A decisão no MI sempre tem eficácia erga omnes." **Errado** — regra: **inter partes**.
- "Particular pode figurar no polo passivo do MI." **Errado.**
- "O MI e a ADO têm os mesmos legitimados." **Errado.**
""" + ex(
    "Um servidor público que trabalha exposto a agentes nocivos à saúde pede aposentadoria especial, mas a lei complementar exigida pelo art. 40 da Constituição ainda não foi editada. O órgão de pessoal nega o pedido por falta de lei.",
    "Como a questão foi resolvida pelo STF?",
    "Após diversos **mandados de injunção**, o STF editou a **Súmula Vinculante 33**: aplicam-se ao servidor, no que couber, as regras do **regime geral** sobre aposentadoria especial, até a edição da lei complementar. É um exemplo de **posição concretista**: o Judiciário viabilizou o direito diante da omissão legislativa.",
    [Q("reparticao", "O servidor recebe a negativa da aposentadoria especial.", [P("servidor", "esq", "pega", "triste", "documento"), P("gestor", "dir", "fala", "neutro")], (1, "Não há lei complementar.")),
     Q("forum", "O STF analisa a omissão.", [P("juiz", "centro", "fala", "serio", "carimbo")], (0, "Aplica-se o regime geral até a lei."))],
    "Omissão suprida (SV 33) | ok",
    fluxo("Mandado de injunção", [("Direito previsto na CF", "ok", "Aposentadoria especial"), ("Falta norma regulamentadora", "erro", "Lei complementar não editada"), ("Exercício inviabilizado", "erro")], ("Judiciário viabiliza o direito", "ok"))),
    N(22, 23, 24))
m("Mandado de injunção", 9)
