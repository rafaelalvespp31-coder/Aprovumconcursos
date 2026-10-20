from helpers import *

# ============================================================== 13 — Domicílio e dados
sec("aprofundamento", "Módulo 3 — Inviolabilidade do domicílio (XI), Tema 280 do STF e proteção de dados (LXXIX)", """
### XI — A casa é asilo inviolável

Ninguém pode penetrar na casa **sem consentimento do morador**, **salvo**:
- em caso de **flagrante delito** — **a qualquer hora**;
- em caso de **desastre** — **a qualquer hora**;
- para **prestar socorro** — **a qualquer hora**;
- por **determinação judicial** — **somente durante o dia**.

| Hipótese | Dia | Noite |
|---|---|---|
| Consentimento do morador | ✅ | ✅ |
| Flagrante delito | ✅ | ✅ |
| Desastre | ✅ | ✅ |
| Prestar socorro | ✅ | ✅ |
| **Determinação judicial** | ✅ | ❌ |

**Macete:** "**F**ui **D**ar **S**ocorro a qualquer hora; o **J**uiz só de dia" — **F**lagrante, **D**esastre, **S**ocorro (24h) × **J**udicial (dia).

📌 **"Dia":** a CF não define. A doutrina usa o critério físico-astronômico (**aurora ao crepúsculo**) ou o cronológico (**6h às 18h**). A **Lei de Abuso de Autoridade** (Lei 13.869/2019, art. 22, § 1º, III) pune quem cumpre mandado de busca domiciliar **após as 21h ou antes das 5h** — critério que reforçou a discussão.

### Conceito constitucional de "casa"

É **amplo**: abrange qualquer **compartimento habitado**, **aposento ocupado de habitação coletiva** (quarto de hotel ou pensão ocupado) e **compartimento não aberto ao público onde alguém exerce profissão ou atividade** (escritório, consultório, área interna de estabelecimento comercial). Fonte: interpretação do STF e conceito do art. 150, § 4º, do Código Penal.

Não é "casa": a **parte aberta ao público** de bares e lojas, enquanto aberta; **veículo** (em regra, salvo quando usado como habitação, como trailer ou boleia usada para morar).

📌 **Fiscalização tributária e sanitária** também não pode entrar sem consentimento ou ordem judicial na parte não aberta ao público.

---

### Tema 280 do STF (RE 603.616, 2015) — entrada forçada sem mandado

O STF fixou tese no sentido de que a **entrada forçada em domicílio sem mandado judicial** só é lícita, **mesmo em período noturno**, quando amparada em **fundadas razões**, **devidamente justificadas a posteriori**, que indiquem que dentro da casa ocorre situação de **flagrante delito**, sob pena de **responsabilidade disciplinar, civil e penal** do agente ou da autoridade, e de **nulidade dos atos praticados**.

**O que isso significa na prática policial:**
- **Crime permanente** (ex.: tráfico na modalidade "ter em depósito", posse de arma) mantém o flagrante enquanto dura — **mas isso, sozinho, não autoriza a entrada**. É preciso que a polícia tenha, **antes de entrar**, **fundadas razões** (elementos objetivos) de que o crime está ocorrendo ali.
- **Não bastam:** denúncia anônima isolada, "atitude suspeita", fuga do suspeito ao avistar a viatura, nervosismo ou o simples fato de ser local conhecido como ponto de tráfico — a jurisprudência do **STJ** tem anulado provas nesses casos.
- **Justificativa a posteriori:** os policiais devem **documentar** o que motivou a entrada. Se as fundadas razões só "aparecem" depois de encontrada a droga, a entrada é ilícita.
- **Consentimento do morador** precisa ser **livre e voluntário**; o STJ exige que a polícia comprove esse consentimento (registro escrito, testemunhas e, quando possível, **gravação audiovisual**), sobretudo quando o morador é abordado em situação de pressão.
- **Consequência da entrada ilícita:** as provas obtidas são **ilícitas** (LVI) e as derivadas também, além da responsabilização do agente.

⚠️ **Pegadinha:** "Por se tratar de crime permanente, a polícia pode ingressar na casa a qualquer momento, independentemente de qualquer indício prévio." **Errado** — exige **fundadas razões prévias**, justificadas depois.

---

### LXXIX — Proteção de dados pessoais

Incluído pela **EC 115/2022**: é assegurado, **nos termos da lei**, o **direito à proteção dos dados pessoais, inclusive nos meios digitais**. A mesma emenda atribuiu à **União** a competência para **legislar** sobre proteção e tratamento de dados (art. 22, XXX) e para **organizar e fiscalizar** a matéria (art. 21, XXVI). A lei de referência é a **LGPD** (Lei 13.709/2018).

📌 Antes da emenda, o STF já havia reconhecido a proteção de dados como direito fundamental autônomo ao suspender o compartilhamento de dados de usuários de telefonia com o IBGE (ADI 6.387, 2020).
""" + ex(
    "Policiais recebem denúncia anônima de que há drogas na casa de Rui. Sem qualquer outra diligência, às 2h da manhã, arrombam a porta e encontram 50 g de cocaína.",
    "A entrada foi lícita?",
    "**Não.** Embora o tráfico (ter em depósito) seja crime permanente, o Tema 280 exige **fundadas razões prévias**, objetivamente justificadas. Denúncia anônima **isolada**, sem diligências que a confirmem, não basta. A droga apreendida é **prova ilícita**, e os agentes podem responder disciplinar, civil e penalmente.",
    [Q("delegacia", "Chega uma denúncia anônima sobre a casa de Rui.", [P("delegado", "esq", "pega", "neutro", "celular"), P("pm", "dir", "fala", "serio")], (1, "Vamos lá agora mesmo!")),
     Q("casa", "2h da manhã: a porta é arrombada.", [P("pm", "esq", "ataca", "serio"), P("investigado", "dir", "neutro", "surpreso")], None, "CRASH!"),
     Q("forum", "A defesa alega entrada ilegal.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Sem fundadas razões. Prova ilícita."))],
    "Denúncia anônima isolada não basta | erro",
    fluxo("Entrada sem mandado (Tema 280)", [("Crime permanente?", "ok", "Tráfico: ter em depósito"), ("Fundadas razões ANTES de entrar?", "erro", "Só denúncia anônima"), ("Justificativa documentada depois?", "erro")], ("Entrada ilícita: provas nulas", "erro"))),
    N(30, 32))
m("Privacidade, domicílio e dados (art. 5º, X, XI, XII e LXXIX)", 13)

# ============================================================== 14 — Propriedade
sec("explicacao", "Módulo 4 — Direito de propriedade (incisos XXII a XXXII)", """
### XXII e XXIII — Garantia e função social

- **XXII:** é garantido o **direito de propriedade**.
- **XXIII:** a propriedade **atenderá a sua função social**.

A propriedade não é mais um direito absoluto: ela deve cumprir uma **função social**. A Constituição define o que isso significa para a propriedade **urbana** (art. 182, § 2º — atender às exigências do **plano diretor**) e para a **rural** (art. 186 — aproveitamento racional, preservação ambiental, respeito às relações de trabalho e bem-estar).

---

### XXIV e XXV — Desapropriação × requisição

- **XXIV (desapropriação):** a lei estabelecerá o procedimento para desapropriação por **necessidade ou utilidade pública**, ou por **interesse social**, mediante **justa e prévia indenização em dinheiro**, **ressalvados os casos previstos nesta Constituição**.
- **XXV (requisição):** no caso de **iminente perigo público**, a autoridade competente poderá **usar** de propriedade particular, assegurada ao proprietário **indenização ulterior, se houver dano**.

| | **Desapropriação** | **Requisição administrativa** |
|---|---|---|
| Efeito | **Transfere** a propriedade ao Poder Público | Apenas **uso temporário** do bem |
| Pressuposto | Necessidade/utilidade pública ou interesse social | **Iminente perigo público** |
| Indenização | **Prévia**, **justa** e, em regra, **em dinheiro** | **Ulterior** (posterior) e **só se houver dano** |
| Exemplo | Desapropriar terreno para construir hospital | Usar um galpão privado para abrigar vítimas de enchente |

**Desapropriações com regra própria (os "casos ressalvados"):**
| Espécie | Base | Indenização |
|---|---|---|
| **Urbana sancionatória** (imóvel não edificado/subutilizado) | art. 182, § 4º, III | **Títulos da dívida pública** |
| **Reforma agrária** (imóvel rural que não cumpre função social) | art. 184 | **Títulos da dívida agrária**; benfeitorias úteis e necessárias em dinheiro |
| **Confiscatória** (culturas ilegais de psicotrópicos ou trabalho escravo) | art. 243 | **Sem indenização** |

⚠️ **Pegadinha:** "Toda intervenção estatal na propriedade exige indenização prévia em dinheiro." **Errado** — a requisição tem indenização **posterior e condicionada ao dano**; há desapropriações pagas em **títulos** e uma **sem indenização** (art. 243).

---

### XXVI a XXXII — Demais incisos patrimoniais

- **XXVI:** a **pequena propriedade rural**, assim definida em lei, **desde que trabalhada pela família**, **não será objeto de penhora** para pagamento de débitos **decorrentes de sua atividade produtiva**, dispondo a lei sobre os meios de financiar seu desenvolvimento.
- **XXVII:** aos **autores** pertence o direito **exclusivo** de utilização, publicação ou reprodução de suas obras, **transmissível aos herdeiros** pelo tempo que a lei fixar.
- **XXVIII:** são assegurados, nos termos da lei: (a) a proteção às **participações individuais em obras coletivas** e à reprodução da imagem e voz humanas, **inclusive nas atividades desportivas**; (b) o **direito de fiscalização** do aproveitamento econômico das obras pelos criadores, intérpretes e respectivas representações sindicais e associativas.
- **XXIX:** a lei assegurará aos autores de **inventos industriais** **privilégio temporário** para sua utilização, bem como proteção às criações industriais, à propriedade das **marcas**, aos nomes de empresas e a outros signos distintivos, tendo em vista o **interesse social** e o **desenvolvimento tecnológico e econômico** do País.
- **XXX:** é garantido o **direito de herança**.
- **XXXI:** a sucessão de bens de **estrangeiros situados no País** será regulada pela **lei brasileira** em benefício do **cônjuge ou dos filhos brasileiros**, **sempre que não lhes seja mais favorável a lei pessoal do "de cujus"**.
- **XXXII:** o **Estado promoverá**, **na forma da lei**, a **defesa do consumidor** (base do CDC — Lei 8.078/1990).

📌 **Autor × inventor:** o direito do **autor** é **exclusivo** e transmissível aos herdeiros pelo prazo da lei; o do **inventor** é um **privilégio temporário**. A banca troca os dois.

📌 **Sucessão de estrangeiro:** aplica-se a lei **mais favorável** ao cônjuge ou filhos **brasileiros** — a brasileira ou a pessoal do falecido.
""" + ex(
    "Durante uma enchente, a Defesa Civil ocupa por 10 dias o galpão de uma empresa para abrigar desabrigados. Ao final, o galpão é devolvido sem nenhum dano.",
    "A empresa tem direito a indenização?",
    "**Não.** Trata-se de **requisição administrativa** (art. 5º, XXV): diante de **iminente perigo público**, a autoridade pode **usar** a propriedade particular, e a indenização é **ulterior** e **só existe se houver dano**. Como não houve dano, não há o que indenizar.",
    [Q("obra", "A enchente desaloja dezenas de famílias.", [P("servidor", "esq", "fala", "serio"), P("gestor", "dir", "neutro", "surpreso")], (0, "Vamos usar seu galpão agora.")),
     Q("reparticao", "Dez dias depois, o galpão é devolvido intacto.", [P("gestor", "esq", "fala", "neutro", "documento"), P("servidor", "dir", "neutro", "feliz")], (0, "Sem dano, sem indenização?"))],
    "Requisição: indeniza só se houver dano | ok",
    comp("Intervenção na propriedade", ("Desapropriação", "Indenização prévia e justa", "neutro", ["transfere a propriedade", "regra: em dinheiro"]), ("Requisição", "Indenização posterior, se dano", "ok", ["uso temporário", "iminente perigo público"]))),
    N(34, 35, 36))
m("Propriedade (art. 5º, XXII a XXXII)", 14)

# ============================================================== 15 — Petição, inafastabilidade, segurança jurídica
sec("explicacao", "Módulo 5 — Direito de petição, inafastabilidade da jurisdição e segurança jurídica (incisos XXXIV a XXXVI)", """
### XXXIV — Petição e certidões

São a todos assegurados, **independentemente do pagamento de taxas**:
- **(a)** o **direito de petição** aos Poderes Públicos em **defesa de direitos** ou contra **ilegalidade ou abuso de poder**;
- **(b)** a **obtenção de certidões** em repartições públicas, para **defesa de direitos** e **esclarecimento de situações de interesse pessoal**.

📌 O direito de petição **não exige advogado** e pode ser exercido por **qualquer pessoa**, física ou jurídica, nacional ou estrangeira. Não se confunde com o direito de **ação** (ir ao Judiciário), que em regra exige capacidade postulatória.
📌 Se a certidão for **negada**, o instrumento é o **mandado de segurança** — e **não** o habeas data (que trata de dados **pessoais** do impetrante).

---

### XXXV — Inafastabilidade da jurisdição

A lei **não excluirá da apreciação do Poder Judiciário lesão ou ameaça a direito**.

- Protege contra **lesão** (repressiva) e **ameaça** (preventiva).
- Em regra, **não é preciso esgotar a via administrativa** antes de ir ao Judiciário.

**Exceções e situações especiais (cobradas em prova):**
| Situação | Regra |
|---|---|
| **Justiça Desportiva** (art. 217, § 1º) | O Judiciário só admite ações sobre **disciplina e competições desportivas** **após esgotadas as instâncias da justiça desportiva** (que tem **60 dias** para decidir — § 2º) |
| **Habeas data** | A Lei 9.507/1997 exige prova da **recusa** do pedido administrativo (Súmula 2 do STJ) |
| **Benefício previdenciário** | O STF exige **prévio requerimento administrativo** para caracterizar o interesse de agir, **sem** exigir o esgotamento (RE 631.240 — Tema 350) |
| **Reclamação contra descumprimento de súmula vinculante pela Administração** | Exige o **esgotamento das vias administrativas** (Lei 11.417/2006, art. 7º, § 1º) |

⚠️ **Pegadinha:** não generalize — essas exigências são **específicas**; a regra é o **acesso direto** ao Judiciário.

📌 **Arbitragem** é constitucional (STF, SE 5.206): as partes escolhem **voluntariamente** submeter conflito sobre direitos patrimoniais disponíveis a um árbitro — não há exclusão imposta pela lei.

### LXXIV — Assistência jurídica

O Estado prestará **assistência jurídica integral e gratuita** aos que **comprovarem insuficiência de recursos**. Quem presta é, principalmente, a **Defensoria Pública** (art. 134).

| Expressão | Alcance |
|---|---|
| **Assistência jurídica** | Mais ampla: inclui **orientação e consultoria extrajudicial** |
| **Assistência judiciária** | Patrocínio da causa **em juízo** |
| **Gratuidade de justiça** | **Isenção de custas e despesas** processuais (CPC, arts. 98 a 102) |

---

### XXXVI — Segurança jurídica

A lei **não prejudicará** o **direito adquirido**, o **ato jurídico perfeito** e a **coisa julgada**.

| Instituto | Conceito (LINDB, art. 6º) | Exemplo |
|---|---|---|
| **Direito adquirido** | Direito que já se **incorporou ao patrimônio** do titular, por terem sido preenchidos os requisitos, ainda que não exercido | Servidor que completou os requisitos da aposentadoria sob a lei antiga |
| **Ato jurídico perfeito** | Ato **já consumado** segundo a lei vigente ao tempo em que se efetuou | Contrato celebrado e aperfeiçoado sob a lei anterior |
| **Coisa julgada** | Decisão judicial de que **já não caiba recurso** | Sentença transitada em julgado |

📌 **Limites:** não há direito adquirido a **regime jurídico** (STF), nem contra **norma constitucional originária**. A **lei penal mais benéfica** retroage mesmo diante da coisa julgada (XL). A **proteção da confiança** e a **boa-fé** completam a ideia de segurança jurídica.
""", N(38, 39, 40, 45))
m("Acesso à justiça e garantias processuais (art. 5º, XXXIV a XXXVIII, LIII a LX, LXXIV e LXXVIII)", 15)

# ============================================================== 16 — Juiz natural e júri
sec("explicacao", "Módulo 5 — Juiz natural (XXXVII e LIII) e tribunal do júri (XXXVIII)", """
### Juiz natural

- **XXXVII:** **não haverá juízo ou tribunal de exceção**.
- **LIII:** ninguém será **processado nem sentenciado** senão pela **autoridade competente**.

**Duas faces do princípio:**
1. **Proibição de tribunal de exceção** — órgão criado **depois do fato**, especificamente para julgar aquele caso ou aquela pessoa.
2. **Juiz competente** — o julgador deve estar previamente definido por **regras gerais e abstratas** de competência, fixadas antes do fato.

📌 **Não violam o juiz natural:** varas especializadas criadas por lei; foro por prerrogativa de função previsto na CF; convocação de juízes de primeiro grau para atuar em tribunais, nos termos da lei; desaforamento no júri, nas hipóteses legais.

---

### XXXVIII — Tribunal do júri

É **reconhecida** a instituição do júri, com a **organização que lhe der a lei**, assegurados:
- **(a)** a **plenitude de defesa**;
- **(b)** o **sigilo das votações**;
- **(c)** a **soberania dos veredictos**;
- **(d)** a **competência para o julgamento dos crimes dolosos contra a vida**.

**Macete PSSC:** **P**lenitude de defesa · **S**igilo das votações · **S**oberania dos veredictos · **C**ompetência (dolosos contra a vida).

**Pontos que caem:**
- **Plenitude de defesa** é **mais ampla** que a ampla defesa: permite argumentos **extrajurídicos** (sociais, emocionais, de clemência).
- **Competência mínima:** crimes **dolosos contra a vida** (homicídio, induzimento/instigação/auxílio a suicídio ou automutilação, infanticídio, aborto) e os **conexos**. A lei pode **ampliar**, mas não reduzir.
- **Latrocínio** (roubo seguido de morte) é crime **contra o patrimônio**: julgado pelo **juiz singular** (Súmula 603 do STF).
- **Foro por prerrogativa de função previsto na CF prevalece sobre o júri**; mas o **foro previsto exclusivamente em Constituição estadual** **não prevalece** (Súmula Vinculante 45).
- **Soberania dos veredictos não é absoluta:** cabe apelação quando a decisão for **manifestamente contrária à prova dos autos**, e a consequência é um **novo júri** (não a reforma direta pelo tribunal); cabe também **revisão criminal**.
- **Execução imediata da condenação pelo júri:** o STF fixou (Tema 1.068, 2024) que a soberania dos veredictos autoriza a **execução imediata** da pena imposta pelo júri, **independentemente do total** da pena aplicada.
""" + ex(
    "Bruno mata a vítima para roubar seu celular. A acusação pede que ele seja julgado pelo Tribunal do Júri, por haver uma morte dolosa.",
    "Quem julga Bruno?",
    "O **juiz singular** (vara criminal comum). O latrocínio é crime **contra o patrimônio** (CP, art. 157, § 3º), e não doloso **contra a vida** — por isso não se enquadra na competência do júri (Súmula 603 do STF).",
    [Q("forum", "O promotor pede a remessa ao júri.", [P("promotor", "esq", "fala", "serio", "documento"), P("juiz", "dir", "neutro", "serio")], (0, "Houve morte: júri!")),
     Q("forum", "O juiz decide sobre a competência.", [P("juiz", "centro", "fala", "serio", "carimbo")], (0, "Latrocínio é crime patrimonial."))],
    "Latrocínio: juiz singular | alerta",
    comp("Quem julga?", ("Homicídio doloso", "Tribunal do Júri", "ok", ["crime doloso contra a vida", "art. 5º, XXXVIII, d"]), ("Latrocínio", "Juiz singular", "alerta", ["crime contra o patrimônio", "Súmula 603 do STF"]))),
    N(41, 42))
m("Acesso à justiça e garantias processuais (art. 5º, XXXIV a XXXVIII, LIII a LX, LXXIV e LXXVIII)", 16)

# ============================================================== 17 — Devido processo, contraditório, provas, publicidade
sec("explicacao", "Módulo 5 — Devido processo legal, contraditório e ampla defesa, provas ilícitas, publicidade e razoável duração (LIV, LV, LVI, LX e LXXVIII)", """
### LIV — Devido processo legal

Ninguém será **privado da liberdade ou de seus bens** sem o **devido processo legal**.

| Dimensão | Conteúdo |
|---|---|
| **Formal (procedimental)** | Direito a um **processo regular**: juiz competente, citação, contraditório, defesa, prova, recurso |
| **Material (substantiva)** | Exige que as leis e decisões sejam **razoáveis e proporcionais** — é a base constitucional da **proporcionalidade** |

### LV — Contraditório e ampla defesa

Aos **litigantes**, em **processo judicial ou administrativo**, e aos **acusados em geral** são assegurados o **contraditório** e a **ampla defesa**, com os **meios e recursos a ela inerentes**.

- **Contraditório:** direito de ser **informado** dos atos e de **reagir** a eles (ciência + participação + poder de influenciar a decisão).
- **Ampla defesa:** direito de usar **todos os meios lícitos** de defesa — **defesa técnica** (por advogado) e **autodefesa** (presença, interrogatório, direito de audiência).

**Processo administrativo — súmulas cobradíssimas:**
| Enunciado | Conteúdo |
|---|---|
| **Súmula Vinculante 5** | A **falta de defesa técnica por advogado** no **processo administrativo disciplinar** **não ofende** a Constituição |
| **Súmula Vinculante 3** | Nos processos perante o **TCU**, asseguram-se contraditório e ampla defesa quando a decisão puder anular ou revogar ato que beneficie o interessado, **excetuada** a apreciação da legalidade do ato **inicial** de aposentadoria, reforma e pensão |
| **Súmula Vinculante 21** | É **inconstitucional** exigir **depósito ou arrolamento prévio** de bens para **recurso administrativo** |
| **Súmula Vinculante 14** | Defesa tem acesso aos elementos de prova **já documentados** no procedimento investigatório (ver Jurisprudência) |

📌 **Inquérito policial:** por ser procedimento **inquisitivo** e não processo, a doutrina e a jurisprudência entendem que nele **não há contraditório pleno** — mas o advogado tem acesso aos elementos já documentados (SV 14) e o investigado tem direito ao silêncio e à assistência de advogado.

📌 No **processo penal**, a falta de defesa técnica é **nulidade absoluta**; sua deficiência só anula se houver **prova de prejuízo** (Súmula 523 do STF).

---

### LVI — Provas ilícitas

São **inadmissíveis**, no processo, as provas **obtidas por meios ilícitos**.

| Classificação (doutrina) | Conceito | Exemplo |
|---|---|---|
| **Prova ilícita** | Obtida violando **direito material** (constitucional ou legal) | Interceptação sem ordem judicial; confissão sob tortura |
| **Prova ilegítima** | Produzida violando **norma processual** | Laudo assinado por um só perito não oficial, quando a lei exige dois |
| **Prova ilícita por derivação** | Lícita em si, mas **obtida a partir** de uma ilícita | Arma encontrada graças à confissão obtida sob tortura |

**Teoria dos frutos da árvore envenenada** (adotada no CPP, art. 157, § 1º): as derivadas também são inadmissíveis, **salvo** quando:
- **não evidenciado o nexo de causalidade** entre elas;
- puderem ser obtidas por **fonte independente** da primeira;
- (doutrina e jurisprudência também tratam da **descoberta inevitável**, prevista no § 2º do art. 157 com a definição de fonte independente).

📌 **Prova ilícita pro reo:** a doutrina e a jurisprudência admitem a prova ilícita **para absolver** o acusado (proporcionalidade), mas não para condenar.
📌 **Consequência processual:** a prova ilícita deve ser **desentranhada** e **inutilizada** (CPP, art. 157, § 3º).

---

### LX e LXXVIII — Publicidade e razoável duração

- **LX:** a lei só poderá **restringir a publicidade** dos atos processuais quando a **defesa da intimidade** ou o **interesse social** o exigirem. (Ver também o art. 93, IX: julgamentos públicos e decisões fundamentadas.)
- **LXXVIII** (EC 45/2004): a todos, no âmbito **judicial e administrativo**, são assegurados a **razoável duração do processo** e os **meios que garantam a celeridade** de sua tramitação.

⚠️ **Pegadinha:** "A razoável duração do processo aplica-se apenas aos processos judiciais." **Errado** — vale também para os **administrativos**.
""", N(43, 44, 45))
m("Acesso à justiça e garantias processuais (art. 5º, XXXIV a XXXVIII, LIII a LX, LXXIV e LXXVIII)", 17)
