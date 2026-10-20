from helpers import *

# ============================================================== 1 — Introdução
sec("introducao", "Módulo 1 — Introdução: o que são os remédios constitucionais", """
**Remédios constitucionais** são **ações** previstas na própria Constituição para **proteger direitos** diante de situações específicas: quando a liberdade de locomoção é ameaçada, quando uma autoridade viola direito comprovável de plano, quando falta lei para exercer um direito, quando alguém não consegue acessar ou corrigir seus próprios dados, ou quando um ato lesa o patrimônio público e a moralidade.

São **garantias fundamentais** (instrumentos), não direitos em si. Todo remédio é garantia, mas nem toda garantia é remédio.

### Os seis remédios do art. 5º

| Inciso | Remédio | Lei regulamentadora |
|---|---|---|
| **LXVIII** | **Habeas corpus** | CPP, arts. 647 a 667 |
| **LXIX** | **Mandado de segurança individual** | **Lei 12.016/2009** |
| **LXX** | **Mandado de segurança coletivo** | Lei 12.016/2009, arts. 21 e 22 |
| **LXXI** | **Mandado de injunção** (individual e coletivo) | **Lei 13.300/2016** |
| **LXXII** | **Habeas data** | **Lei 9.507/1997** |
| **LXXIII** | **Ação popular** | **Lei 4.717/1965** |

### O que NÃO é remédio constitucional típico (do art. 5º)

- **Ação civil pública** (art. 129, III; Lei 7.347/1985) — instrumento de **tutela coletiva**, estudado no Módulo 8 como complemento.
- **Ação direta de inconstitucionalidade por omissão**, **ADI**, **ADC**, **ADPF** — ações do **controle concentrado** (art. 102 e 103).
- **Reclamação constitucional** — preserva a competência e a autoridade das decisões dos tribunais (art. 102, I, l; art. 103-A, § 3º).
- **Direito de petição** (XXXIV) — é garantia, mas exercida **administrativamente**, sem natureza de ação judicial.

⚠️ **Pegadinha:** "A ação civil pública é um dos remédios constitucionais previstos no art. 5º." **Errado.**

### Como estudar cada remédio

Para cada um, responda: **(1)** o que protege? **(2)** quem pode propor (legitimidade ativa)? **(3)** contra quem (legitimidade passiva)? **(4)** precisa de advogado? **(5)** é gratuito? **(6)** tem prazo? **(7)** quais são os efeitos da decisão? **(8)** quando **não** cabe?
""" + ex(
    "Um cidadão quer, ao mesmo tempo: (1) impedir uma prisão ilegal iminente; (2) anular um contrato superfaturado da prefeitura; (3) corrigir um dado errado sobre ele no cadastro de um órgão público.",
    "Qual remédio serve para cada pedido?",
    "**(1) Habeas corpus preventivo** — ameaça à liberdade de locomoção. **(2) Ação popular** — anular ato lesivo ao patrimônio público e à moralidade (só o **cidadão** propõe). **(3) Habeas data** — retificação de dados relativos à **própria pessoa** em registro de entidade governamental ou de caráter público.",
    [Q("rua", "O cidadão recebe três problemas no mesmo dia.", [P("cidadao", "esq", "pega", "surpreso", "documento"), P("advogado", "dir", "fala", "neutro")], (1, "Cada problema tem seu remédio.")),
     Q("forum", "Três ações diferentes são protocoladas.", [P("advogado", "esq", "pega", "feliz", "documento"), P("juiz", "dir", "neutro", "serio")], (0, "HC, ação popular e habeas data."))],
    "Um remédio para cada caso | ok",
    fluxo("Escolhendo o remédio", [("Liberdade de locomoção?", "ok", "Habeas corpus"), ("Ato lesivo ao patrimônio público?", "ok", "Ação popular"), ("Dados da própria pessoa?", "ok", "Habeas data")], ("Restante com direito líquido e certo: MS", "neutro"))),
    N(1, 2, 4, 10, 15, 19, 25, 29, 33, 37))
m("Visão geral dos remédios constitucionais", 1)

# ============================================================== 2 — Quadro comparativo geral
sec("quadro_comparativo", "Módulo 1 — Quadro comparativo obrigatório dos remédios constitucionais", """
| Instrumento | Finalidade central | Ponto decisivo | Legitimado ativo | Advogado? | Custas |
|---|---|---|---|---|---|
| **Habeas corpus** | Proteger a **liberdade de locomoção** contra ilegalidade ou abuso de poder | **Ameaça ou restrição** à locomoção | **Qualquer pessoa**, em favor próprio ou de terceiro; MP | **Dispensado** | **Gratuito** (LXXVII) |
| **Mandado de segurança individual** | Proteger **direito líquido e certo** não amparado por HC ou HD | **Prova pré-constituída** + ato de autoridade + **120 dias** | Titular do direito (pessoa física ou jurídica, órgãos com capacidade processual) | **Exigido** | Há custas; **sem honorários** (Súmula 512 do STF; Lei, art. 25) |
| **Mandado de segurança coletivo** | Proteger direitos **coletivos** ou **individuais homogêneos** | **Legitimados coletivos** | Partido com representação no CN; sindicato, entidade de classe, associação (1 ano) | **Exigido** | Como o MS individual |
| **Mandado de injunção** | Viabilizar direito ou prerrogativa inviabilizados por **falta de norma regulamentadora** | **Omissão normativa** que **inviabiliza** o exercício | Titular do direito; no coletivo: MP, partido, sindicato/entidade/associação, Defensoria | **Exigido** | Há custas |
| **Habeas data** | **Conhecer**, **retificar** ou **anotar** dados **da própria pessoa** | Dados **do impetrante** + **recusa administrativa** prévia | O **titular** dos dados | **Exigido** | **Gratuito** (LXXVII) |
| **Ação popular** | **Anular ato lesivo** ao patrimônio público, à moralidade administrativa, ao meio ambiente e ao patrimônio histórico e cultural | **Cidadão** + **lesividade** | **Cidadão** (eleitor) | **Exigido** | **Isento**, **salvo má-fé** comprovada |

**Ordem de "subsidiariedade" do mandado de segurança:** primeiro se pergunta se cabe **habeas corpus** (locomoção) ou **habeas data** (dados pessoais). **Só se não couberem**, e se houver direito líquido e certo, cabe o **mandado de segurança** — ele é **residual**.

**Gratuidade — memorize:**
- **HC e HD:** gratuitos (art. 5º, LXXVII).
- **Ação popular:** autor isento de custas e sucumbência, **salvo comprovada má-fé** (LXXIII).
- **MS e MI:** **não** são gratuitos por força da CF.

⚠️ **O quadro não substitui os módulos específicos.** Cada remédio tem detalhes próprios (prazos, súmulas, hipóteses de não cabimento) estudados a seguir.
""", N(3, 2))
m("Visão geral dos remédios constitucionais", 2)

# ============================================================== 3 — HC (1/2)
sec("explicacao", "Módulo 2 — Habeas corpus (1/2): fundamento, espécies e legitimidade", """
### Fundamento (art. 5º, LXVIII)

Conceder-se-á habeas corpus **sempre que alguém sofrer ou se achar ameaçado de sofrer violência ou coação em sua liberdade de locomoção**, **por ilegalidade ou abuso de poder**.

Bem protegido: **liberdade de locomoção** (ir, vir e permanecer). É o remédio mais antigo — no Brasil, surgiu no Código de Processo Criminal de 1832 e foi constitucionalizado em 1891.

📌 **Doutrina brasileira do habeas corpus:** na Primeira República, o HC chegou a ser usado para proteger **outros direitos** (antes da criação do mandado de segurança, em 1934). Hoje, restringe-se à **locomoção**.

### Espécies

| Espécie | Situação | Resultado |
|---|---|---|
| **Preventivo** | **Ameaça** concreta de violência ou coação ilegal à locomoção | **Salvo-conduto** |
| **Repressivo (liberatório)** | Coação **já concretizada** (pessoa presa ilegalmente) | **Alvará de soltura** |
| **De ofício** | O juiz ou tribunal verifica a ilegalidade no curso de um processo | Concessão sem pedido (CPP, art. 654, § 2º) |
| **Coletivo** | Grupo de pessoas em situação idêntica | Admitido pelo STF (**HC 143.641**, 2018 — gestantes, puérperas e mães de crianças presas preventivamente) |

### Legitimidade

| Figura | Quem é | Detalhes |
|---|---|---|
| **Impetrante** | Quem **pede** a ordem | **Qualquer pessoa**, nacional ou estrangeira, capaz ou incapaz, **independentemente de capacidade postulatória**; também o **MP** e a **pessoa jurídica** (em favor de pessoa física) |
| **Paciente** | Quem **sofre** a coação | **Só pessoa física** — pessoa jurídica não tem liberdade de locomoção |
| **Autoridade coatora** (ou coator) | Quem **pratica** a coação | Autoridade pública **ou particular** (ex.: hospital que retém paciente por dívida; clínica que interna alguém contra a vontade) |

📌 Impetrante e paciente podem ser a **mesma pessoa** (HC em favor próprio).
📌 **Pessoa jurídica como paciente:** o STF não admite HC em favor de pessoa jurídica, mesmo em crimes ambientais, pois não há liberdade de locomoção a proteger.
📌 **Juiz não pode impetrar** HC no exercício da jurisdição; ele **concede de ofício**.
""" + ex(
    "Um hospital particular impede a saída de um paciente que recebeu alta, alegando que a conta não foi paga. A irmã do paciente, sem advogado, redige um pedido de habeas corpus à mão.",
    "O habeas corpus é cabível? A irmã pode impetrá-lo?",
    "**Sim e sim.** O HC cabe também contra **particular** que restrinja ilegalmente a locomoção (cobrança de dívida não autoriza reter ninguém). E **qualquer pessoa** pode impetrar, em favor de terceiro, **sem advogado** e **sem custas**.",
    [Q("hospital", "O paciente recebe alta, mas é impedido de sair.", [P("cidadao", "esq", "neutro", "triste"), P("gestor", "dir", "bracos_cruzados", "bravo")], (1, "Só sai depois de pagar a conta.")),
     Q("forum", "A irmã entrega o pedido escrito à mão.", [P("cidadao", "esq", "pega", "serio", "documento"), P("juiz", "dir", "fala", "serio")], (1, "HC concedido: está livre."))],
    "HC contra particular | ok",
    fluxo("Habeas corpus", [("Restrição à locomoção?", "ok", "Paciente retido no hospital"), ("Ilegalidade ou abuso?", "ok", "Dívida não autoriza retenção"), ("Quem pode impetrar?", "ok", "Qualquer pessoa, sem advogado")], ("Ordem concedida", "ok"))),
    N(5, 6, 7))
m("Habeas corpus", 3)

# ============================================================== 4 — HC (2/2)
sec("aprofundamento", "Módulo 2 — Habeas corpus (2/2): competência, gratuidade e hipóteses de não cabimento", """
### Gratuidade e advogado

- **Gratuito** (art. 5º, LXXVII).
- **Dispensa advogado** — o Estatuto da Advocacia (Lei 8.906/1994, art. 1º, § 1º) exclui expressamente a impetração de HC da atividade privativa de advogado.

### Competência (principais regras constitucionais)

| Coator ou paciente | Competência |
|---|---|
| Paciente: Presidente, Vice, membros do CN, Ministros do STF, PGR (crimes comuns); coator: Tribunal Superior | **STF** (art. 102, I, d e i) |
| Coator: tribunal sujeito à jurisdição do STJ, Ministro de Estado, Comandantes das Forças Armadas; paciente com foro no STJ | **STJ** (art. 105, I, c) |
| Coator: juiz federal | **TRF** (art. 108, I, d) |
| Matéria criminal da competência federal; coator autoridade federal não sujeita a outra jurisdição | **Juiz federal** (art. 109, VII) |

### Hipóteses de não cabimento — súmulas e regras

| Fonte | Não cabe habeas corpus... |
|---|---|
| **CF, art. 142, § 2º** | ...em relação a **punições disciplinares militares** |
| **Súmula 693 do STF** | ...contra decisão condenatória a **pena de multa**, ou em processo cuja única pena cominada seja **pecuniária** |
| **Súmula 694 do STF** | ...contra a imposição da pena de **exclusão de militar** ou de **perda de patente ou de função pública** |
| **Súmula 695 do STF** | ...quando **já extinta a pena privativa de liberdade** |
| **Súmula 606 do STF** | ...originário para o **Tribunal Pleno** contra decisão de **Turma** ou do Plenário proferida em HC ou recurso |
| **Súmula 691 do STF** | ...no STF contra decisão de **relator** que indefere **liminar** em HC impetrado em tribunal superior (súmula **mitigada** em casos de flagrante ilegalidade) |
| Regra geral | ...para discutir questão **puramente patrimonial**, sem reflexo sobre a liberdade (ex.: perda de bens, multa de trânsito) |
| Regra geral | ...para reexame aprofundado de **provas** (o HC não comporta dilação probatória) |

### Punições disciplinares militares — leitura correta

O art. 142, § 2º, veda o HC contra punições disciplinares militares. Mas o STF entende que a vedação alcança o **mérito** da punição (conveniência e oportunidade); cabe HC para examinar os **pressupostos de legalidade**: **hierarquia**, **poder disciplinar**, **ato ligado à função** e **pena suscetível de ser aplicada disciplinarmente**. Ex.: punição aplicada por autoridade **incompetente** pode ser atacada por HC.

⚠️ **Pegadinhas:**
- "Não cabe HC contra ato de particular." **Errado** — cabe.
- "O HC exige advogado quando impetrado em tribunal superior." **Errado** — dispensa sempre.
- "Pessoa jurídica pode ser paciente em HC por crime ambiental." **Errado** (STF).
- "Não cabe HC contra punição disciplinar militar em nenhuma hipótese." **Incompleto** — cabe para analisar a **legalidade** (não o mérito).
- "Cabe HC contra condenação exclusivamente a pena de multa." **Errado** — Súmula 693.
""", N(8, 9))
m("Habeas corpus", 4)
