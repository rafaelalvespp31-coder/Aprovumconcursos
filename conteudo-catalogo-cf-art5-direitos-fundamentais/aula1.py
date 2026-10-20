from helpers import *

# ============================================================== 1 — Introdução
sec("introducao", "Módulo 1 — Introdução: o que são direitos e garantias fundamentais", """
**Direitos e garantias fundamentais** são as posições jurídicas que a Constituição considera essenciais para a pessoa viver com **dignidade**, **liberdade**, **igualdade** e **participação** na vida política. Eles estão no **Título II** da Constituição Federal de 1988 (arts. 5º a 17), que se divide em cinco capítulos:

| Capítulo do Título II | Artigos | Aula do APROVUM |
|---|---|---|
| I — Direitos e deveres individuais e coletivos | art. 5º | **esta aula (Parte I)** e a Parte IV (remédios) |
| II — Direitos sociais | arts. 6º a 11 | Parte II |
| III — Nacionalidade | arts. 12 e 13 | Parte III |
| IV — Direitos políticos | arts. 14 a 16 | Parte III |
| V — Partidos políticos | art. 17 | Parte III |

📘 **Como esta aula está organizada:** primeiro a **teoria geral** (conceito, dimensões, características, eficácia, tratados, cláusulas pétreas e colisões); depois o **art. 5º** agrupado por assunto — igualdade e legalidade, liberdades, privacidade, propriedade, acesso à justiça, garantias penais e da pessoa presa; em seguida os **direitos coletivos**, a **jurisprudência essencial** e a **revisão** (quadros, mapa mental, pegadinhas e revisão relâmpago). Os **remédios constitucionais** (habeas corpus, mandado de segurança, mandado de injunção, habeas data e ação popular) têm aula própria — a **Parte IV**.

🎯 **Por que cai tanto:** o art. 5º é o artigo mais cobrado da Constituição em concursos policiais. A banca costuma trocar uma palavra que muda tudo: "**durante o dia**" por "a qualquer hora", "**independentemente de autorização**" por "mediante autorização", "**decisão judicial**" por "decisão administrativa", "**trânsito em julgado**" por "decisão de segunda instância".

**Como ler esta aula:**
- 🔴 **Palavras-chave e exceções** aparecem em **negrito** — são elas que a banca troca.
- ⚖️ **Texto constitucional** aparece resumido com as expressões decisivas entre aspas; **doutrina** e **jurisprudência** são identificadas como tais.
- 🧩 **Exemplos** com nomes são **hipotéticos**.
- ✍️ As **questões** são **autorais (APROVUM)**, no estilo das bancas — não são questões oficiais.

**Mapa rápido do art. 5º por assunto:**
- **Igualdade e legalidade:** caput, I, II, III
- **Liberdades:** IV a IX, XIII a XX
- **Privacidade e dados:** X, XI, XII, LXXIX
- **Propriedade:** XXII a XXXII
- **Acesso à justiça e segurança jurídica:** XXXIV a XXXVIII, LIII a LVI, LX, LXXIV, LXXVIII
- **Garantias penais e da pessoa presa:** XXXIX a LII, LVII a LIX, LXI a LXVII, LXXV
- **Remédios constitucionais:** LXVIII a LXXIII (Parte IV)
- **Gratuidades:** LXXVI e LXXVII
- **Regras de interpretação e tratados:** §§ 1º a 4º
""" + ex(
    "Durante uma prova, o candidato lê: 'A casa é asilo inviolável, podendo nela penetrar qualquer pessoa, a qualquer hora, por determinação judicial.'",
    "A afirmação está correta?",
    "**Não.** A Constituição só permite o ingresso por **determinação judicial** **durante o dia** (art. 5º, XI). À noite, sem consentimento, só nas hipóteses de **flagrante delito**, **desastre** ou para **prestar socorro**. A banca trocou 'durante o dia' por 'a qualquer hora'.",
    [Q("forum", "O mandado judicial foi expedido.", [P("juiz", "esq", "fala", "serio", "documento"), P("delegado", "dir", "neutro", "neutro")], (0, "Cumpra durante o dia.")),
     Q("casa", "São 23h. Sem flagrante, a equipe aguarda.", [P("delegado", "esq", "bracos_cruzados", "serio"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Voltamos ao amanhecer."))],
    "Mandado só de dia | alerta",
    comp("Ingresso com mandado judicial", ("Durante o dia", "Ingresso permitido", "ok", ["ordem judicial", "cumprimento diurno"]), ("À noite", "Não pela ordem judicial", "erro", ["só flagrante, desastre", "ou socorro", "ou consentimento"]))),
    N(1, 13, 18, 28, 33, 37, 46, 57, 61, 62))
m("Introdução e mapa do art. 5º", 1)

# ============================================================== 2 — Conceito e direitos × garantias
sec("conceitos_fundamentais", "Módulo 1 — Conceito de direitos fundamentais e diferença entre direitos e garantias", """
**Conceito.** Direitos fundamentais são posições jurídicas essenciais **reconhecidas e protegidas pela Constituição**, destinadas a resguardar a **dignidade humana** (fundamento da República — CF, art. 1º, III), a liberdade, a igualdade, a participação política e as condições materiais mínimas de existência.

Exemplos: **direito à vida**, **liberdade de expressão**, **igualdade perante a lei**, **saúde**, **educação**, **voto** e o **devido processo legal**.

**Dupla função.** Direitos fundamentais não servem apenas para **impedir abusos** do Estado (função de **defesa** — o Estado deve se abster). Também podem **exigir ações positivas**, como políticas públicas e serviços essenciais (função **prestacional**), e impõem ao Estado o dever de **proteger** a pessoa contra violações vindas de terceiros (dever de proteção).

**Direitos humanos × direitos fundamentais (distinção doutrinária muito cobrada):**
| Expressão | Onde estão | Exemplo |
|---|---|---|
| **Direitos humanos** | Plano **internacional** (tratados, declarações) | Convenção Americana de Direitos Humanos |
| **Direitos fundamentais** | **Positivados na Constituição** de um Estado | Art. 5º da CF/88 |
| **Direitos do homem** (expressão doutrinária) | Plano **filosófico/jusnaturalista**, antes da positivação | Ideia de direitos naturais |

---

### Direitos × garantias

- **Direitos fundamentais** = os **bens e posições protegidos** (vida, liberdade, propriedade, intimidade). São **declaratórios**: afirmam que o bem existe e é protegido.
- **Garantias fundamentais** = os **instrumentos que protegem** esses direitos e permitem defendê-los. São **assecuratórias**: asseguram o exercício do direito.

| Direito (o que se protege) | Garantia (como se protege) |
|---|---|
| Liberdade de locomoção | **Habeas corpus** (LXVIII) |
| Acesso a dados pessoais em registros públicos | **Habeas data** (LXXII) |
| Direito líquido e certo não amparado por HC ou HD | **Mandado de segurança** (LXIX) |
| Liberdade em geral diante da prisão | Prisão só em **flagrante** ou por **ordem judicial escrita e fundamentada** (LXI) |
| Vida, liberdade e bens | **Devido processo legal** (LIV) |
| Liberdade de manifestação | **Vedação ao anonimato** e **direito de resposta** (IV e V) |

**Atenção:** a mesma norma pode **declarar um direito e estabelecer sua garantia** ao mesmo tempo. Exemplo: o inciso VI declara a liberdade de crença (direito) e garante a **proteção aos locais de culto** (garantia).

**Garantias × remédios constitucionais.** Todo remédio constitucional é uma garantia, mas **nem toda garantia é remédio**. Remédios são as **ações** específicas (HC, MS, MI, HD, ação popular); garantias incluem também regras como o juiz natural, a vedação de penas cruéis e a irretroatividade da lei penal mais grave.

⚠️ **Pegadinha:** "Garantias fundamentais são sinônimo de remédios constitucionais." **Errado** — remédios são uma **espécie** de garantia.
""", N(2, 3))
m("Teoria geral dos direitos fundamentais", 2)

# ============================================================== 3 — Dimensões e características
sec("explicacao", "Módulo 1 — Dimensões e características dos direitos fundamentais", """
### Dimensões (ou gerações)

A classificação tradicional separa os direitos fundamentais em **dimensões históricas**, ligadas ao lema da Revolução Francesa (**liberdade, igualdade, fraternidade**). A doutrina prefere "**dimensões**" a "gerações" justamente para mostrar que **uma não substitui a outra** — elas se **somam**.

| Dimensão | Valor | Natureza | Exemplos | Marco histórico (doutrinário) |
|---|---|---|---|---|
| **1ª** | **Liberdade** | **Negativa** (abstenção do Estado) — direitos **civis e políticos** | vida, liberdade de expressão, propriedade, voto, devido processo legal | Revoluções liberais do séc. XVIII |
| **2ª** | **Igualdade** (material) | **Positiva** (prestação estatal) — direitos **sociais, econômicos e culturais** | saúde, educação, previdência, direitos trabalhistas | Constituição mexicana (1917) e de Weimar (1919) |
| **3ª** | **Fraternidade / solidariedade** | **Transindividual** (titularidade coletiva/difusa) | meio ambiente equilibrado, paz, desenvolvimento, proteção do consumidor | Pós-Segunda Guerra |

🔎 **4ª e 5ª dimensões:** há autores que falam em 4ª dimensão (democracia, informação, pluralismo, biotecnologia) e 5ª (direito à paz). **Não há consenso** sobre a quantidade nem sobre o conteúdo dessas dimensões. Para a prova, domine as três tradicionais e a ideia central de cada uma.

⚠️ **Pegadinhas:**
- "A 2ª dimensão **substituiu** a 1ª." **Errado** — as dimensões **coexistem**.
- "Todos os direitos de uma dimensão surgiram ao mesmo tempo." **Errado** — a classificação é didática, não uma cronologia rígida.
- "O direito de voto é de 2ª dimensão." **Errado** — direitos **políticos** são de **1ª**.

**Macete LIF:** **L**iberdade (1ª) · **I**gualdade (2ª) · **F**raternidade (3ª).

---

### Características

| Característica | O que significa | Ressalva importante |
|---|---|---|
| **Historicidade** | São reconhecidos e transformados ao longo da história | Não são "eternos e imutáveis" |
| **Universalidade** | Destinam-se a todas as pessoas (ou aos titulares definidos pelo ordenamento) | Alguns direitos têm titulares específicos (ex.: voto, só para cidadãos) |
| **Relatividade (limitabilidade)** | Em regra **não são absolutos** — podem ceder diante de outros direitos | A doutrina aponta exceções discutíveis, como a **vedação à tortura** |
| **Irrenunciabilidade** | Não se renuncia definitiva e irrestritamente à titularidade | Admite-se **não exercer** ou limitar o exercício em certas situações (ex.: expor a própria imagem em reality show) |
| **Inalienabilidade** | Não podem ser vendidos ou transferidos como mercadoria | Aspectos patrimoniais (ex.: exploração econômica da imagem) podem ser negociados |
| **Imprescritibilidade** | O direito não se perde pelo decurso do tempo | A **pretensão de reparação** por sua violação pode prescrever |
| **Indivisibilidade e interdependência** | Formam um conjunto; a violação de um afeta os demais | Devem ser interpretados de modo sistemático |
| **Concorrência** | Podem ser exercidos cumulativamente | Ex.: um jornalista exerce, ao mesmo tempo, expressão, informação e profissão |
| **Vedação ao retrocesso** (doutrina) | Conquistas sociais não devem ser simplesmente suprimidas | Princípio doutrinário/jurisprudencial, aplicado com cautela |

⚠️ **Não transforme características em afirmações absolutas.** A banca adora frases como "os direitos fundamentais são **absolutos**" ou "a renúncia é **sempre** vedada" — ambas **erradas**.
""" + ex(
    "Uma emissora contrata Júlia para um programa de confinamento com câmeras 24 horas. Ela assina contrato autorizando a exibição de sua imagem.",
    "Júlia renunciou definitivamente ao direito à imagem e à intimidade?",
    "**Não.** Ela **limitou temporariamente o exercício** desses direitos, por vontade própria e dentro de um contrato. A **titularidade** continua com ela: a emissora não pode, por exemplo, usar a imagem de forma vexatória ou fora do que foi autorizado. Isso ilustra a **irrenunciabilidade** com ressalvas.",
    [Q("reparticao", "Júlia assina o contrato do programa.", [P("cidadao", "esq", "pega", "feliz", "documento"), P("gestor", "dir", "fala", "neutro")], (1, "Imagem só no programa, ok?")),
     Q("forum", "Uso abusivo da imagem é levado à Justiça.", [P("juiz", "centro", "fala", "serio")], (0, "A titularidade continua dela."))],
    "Limitou, não renunciou | ok",
    comp("Renúncia × limitação do exercício", ("Renúncia total", "Não admitida", "erro", ["perder a titularidade", "para sempre"]), ("Limitação voluntária", "Admitida com limites", "ok", ["temporária", "dentro do autorizado"]))),
    N(4, 5))
m("Teoria geral dos direitos fundamentais", 3)

# ============================================================== 4 — Destinatários, eficácia e aplicação imediata
sec("aprofundamento", "Módulo 1 — Destinatários, eficácia vertical e horizontal e aplicação imediata", """
### Quem são os titulares

O caput do art. 5º menciona "**brasileiros e estrangeiros residentes no País**". A interpretação, porém, é **ampliativa**:
- **Estrangeiros não residentes** (turistas, pessoas em trânsito) também têm direitos fundamentais compatíveis com sua condição — por exemplo, podem impetrar **habeas corpus** e têm direito ao **devido processo legal**. Esse é o entendimento consolidado do STF.
- **Pessoas jurídicas** são titulares dos direitos compatíveis com sua natureza (propriedade, sigilo, devido processo, honra objetiva). Pessoas jurídicas **de direito público** também podem invocar garantias processuais, como contraditório e ampla defesa.
- Alguns direitos têm **titular específico**: só o **cidadão** propõe ação popular; só o **brasileiro nato** ocupa certos cargos (art. 12, § 3º); direitos trabalhistas pertencem a **trabalhadores**.

⚠️ **Pegadinha:** "Estrangeiro não residente não pode impetrar habeas corpus, pois o art. 5º fala em estrangeiros **residentes**." **Errado.**

---

### Eficácia vertical e horizontal

| | **Eficácia vertical** | **Eficácia horizontal** |
|---|---|---|
| **Relação** | **Estado × indivíduo** | **Particular × particular** |
| **Ideia** | Proteger a pessoa contra o poder público | Direitos fundamentais também se irradiam para relações privadas |
| **Exemplo** | Autoridade não pode prender arbitrariamente | Associação privada não pode excluir associado sem garantir defesa |
| **Fundamento** | Origem histórica dos direitos (limitar o Estado) | Jurisprudência do STF (ex.: RE 201.819 — exclusão de associado) |

Existe ainda a ideia de **eficácia diagonal**, usada pela doutrina para relações entre particulares **desiguais** (ex.: empregador × empregado, fornecedor × consumidor).

📌 A **intensidade** da eficácia horizontal **varia** conforme o direito, a relação e a desigualdade entre as partes — não é aplicação automática e idêntica à relação com o Estado.

---

### Aplicação imediata (art. 5º, § 1º)

O § 1º diz que as normas definidoras dos direitos e garantias fundamentais têm "**aplicação imediata**". Isso significa que o intérprete deve buscar a **máxima efetividade** possível, sem esperar o legislador quando a norma já permite aplicação.

⚠️ **Mas atenção:** aplicação imediata **não é o mesmo que eficácia plena**. Algumas normas do próprio art. 5º dependem de lei (ex.: "**na forma da lei**", "**nos termos da lei**"). Quando a falta de lei **inviabiliza** o exercício de um direito, o instrumento é o **mandado de injunção** (LXXI — Parte IV).

| Afirmação | Certo/Errado |
|---|---|
| O § 1º obriga juízes e administração a aplicar diretamente os direitos fundamentais sempre que possível | **Certo** |
| Pelo § 1º, todas as normas de direitos fundamentais têm eficácia plena e dispensam qualquer lei | **Errado** |
| A falta de norma regulamentadora que inviabilize um direito pode ser combatida por mandado de injunção | **Certo** |
""" + ex(
    "Uma associação recreativa expulsa um associado por decisão da diretoria, sem lhe dar oportunidade de se defender, alegando que o estatuto é 'assunto privado'.",
    "Os direitos fundamentais se aplicam a essa relação entre particulares?",
    "**Sim.** É a **eficácia horizontal**: o STF já reconheceu que a exclusão de associado sem ampla defesa viola direitos fundamentais, mesmo em entidade privada. A associação tem autonomia, mas não pode ignorar o **contraditório e a ampla defesa** ao punir.",
    [Q("reparticao", "A diretoria decide a expulsão sem ouvir o associado.", [P("gestor", "esq", "aponta", "bravo", "documento"), P("cidadao", "dir", "neutro", "triste")], (0, "Está expulso. Assunto interno.")),
     Q("forum", "O associado recorre à Justiça.", [P("advogado", "esq", "fala", "serio"), P("juiz", "dir", "neutro", "serio")], (0, "Faltou o direito de defesa!"))],
    "Eficácia horizontal | ok",
    fluxo("Direitos fundamentais entre particulares", [("Relação privada (associação)", "neutro"), ("Punição grave ao associado", "alerta"), ("Sem defesa prévia", "erro")], ("Exclusão inválida: eficácia horizontal", "ok"))),
    N(6, 7, 8))
m("Teoria geral dos direitos fundamentais", 4)

# ============================================================== 5 — Tratados, TPI e cláusulas pétreas
sec("aprofundamento", "Módulo 1 — Tratados internacionais, Tribunal Penal Internacional e cláusulas pétreas", """
### § 2º — Rol aberto (cláusula de abertura)

O § 2º afirma que os direitos e garantias expressos na Constituição **não excluem outros** decorrentes do **regime e dos princípios** adotados por ela, ou dos **tratados internacionais** de que o Brasil seja parte. Consequência: o rol do art. 5º é **exemplificativo**, não taxativo. Há direitos fundamentais **fora** do art. 5º — por exemplo, a **anterioridade tributária** (art. 150, III, b), reconhecida pelo STF como garantia individual.

### § 3º — Tratados com equivalência de emenda

Incluído pela **EC 45/2004**: tratados e convenções sobre **direitos humanos** aprovados, em **cada Casa do Congresso**, em **dois turnos**, por **três quintos** dos votos dos respectivos membros, serão **equivalentes às emendas constitucionais**.

Exemplos aprovados por esse rito: a **Convenção sobre os Direitos das Pessoas com Deficiência** e seu Protocolo Facultativo, o **Tratado de Marraqueche** (acesso a obras publicadas por pessoas cegas) e a **Convenção Interamericana contra o Racismo**.

### Hierarquia dos tratados no Brasil (jurisprudência do STF)

| Tipo de tratado | Status | Base |
|---|---|---|
| Direitos humanos aprovado pelo rito do § 3º | **Equivalente a emenda constitucional** | Art. 5º, § 3º |
| Direitos humanos **não** aprovado pelo rito do § 3º | **Supralegal** (abaixo da CF, acima das leis) | STF, RE 466.343 (2008) |
| Tratado comum (não é de direitos humanos) | **Lei ordinária** | Jurisprudência do STF |

⚠️ **Não confunda supralegal com constitucional.** O Pacto de San José da Costa Rica foi aprovado **antes** da EC 45/2004 e **sem** o rito do § 3º; por isso é **supralegal**. Foi esse status que "paralisou" a lei que autorizava a prisão do **depositário infiel** (Súmula Vinculante 25 — ver módulo da pessoa presa).

### § 4º — Tribunal Penal Internacional

Também incluído pela EC 45/2004: o Brasil **se submete à jurisdição do TPI** a cuja criação tenha manifestado adesão (Estatuto de Roma). O TPI julga crimes como **genocídio**, **crimes contra a humanidade**, **crimes de guerra** e **agressão**, e atua de forma **complementar** às jurisdições nacionais.

📌 **Entrega × extradição:** a doutrina diferencia a **entrega** (surrender) de uma pessoa ao TPI — tribunal internacional do qual o Brasil faz parte — da **extradição** a outro Estado. Por isso se sustenta que a vedação de extraditar brasileiro nato não impede, por si só, a entrega ao TPI. O tema ainda é debatido.

---

### Cláusulas pétreas (art. 60, § 4º, IV)

Não será objeto de deliberação a proposta de emenda **tendente a abolir** os **direitos e garantias individuais**.

O que a prova cobra:
- A proteção alcança direitos individuais **dentro e fora do art. 5º** — o STF reconheceu a anterioridade tributária (art. 150) como cláusula pétrea (ADI 939).
- A vedação é contra emendas **tendentes a abolir** — não proíbe **qualquer** alteração. Emenda que **amplia** ou apenas **reorganiza** um direito, sem atingir seu **núcleo essencial**, é possível.
- Examina-se o **conteúdo** da emenda, não seu título.
- Se os direitos **sociais** também são cláusulas pétreas é ponto de **divergência doutrinária**; a posição ampliativa é forte, mas a banca normalmente cobra a literalidade: "**direitos e garantias individuais**".

⚠️ **Pegadinha:** "Os direitos e garantias individuais não podem ser alterados por emenda constitucional." **Errado** — o que se veda é a emenda **tendente a abolir**.
""", N(9, 10, 11))
m("Teoria geral dos direitos fundamentais", 5)

# ============================================================== 6 — Colisão e proporcionalidade
sec("explicacao", "Módulo 1 — Colisão de direitos fundamentais e proporcionalidade", """
Como os direitos fundamentais **não são absolutos**, é comum que **dois direitos entrem em tensão** no caso concreto: liberdade de imprensa × intimidade; liberdade religiosa × saúde pública; direito de reunião × liberdade de locomoção.

**Como se resolve:** não há hierarquia abstrata entre direitos fundamentais. A solução exige **interpretação sistemática**, **análise do caso concreto** e **ponderação**, preservando ao máximo os dois direitos (**concordância prática** ou harmonização) e sem atingir o **núcleo essencial** de nenhum deles.

### A proporcionalidade em três testes

| Teste | Pergunta | Se falhar... |
|---|---|---|
| **1. Adequação** | A medida é **apta** a alcançar a finalidade pretendida? | A medida é inconstitucional — não serve para o fim |
| **2. Necessidade** | Existe meio **igualmente eficaz e menos restritivo**? | Deve-se usar o meio menos gravoso |
| **3. Proporcionalidade em sentido estrito** | O **benefício** compensa o **grau de restrição** imposto? | Restrição excessiva diante do ganho |

📌 A ordem importa: só se passa ao teste seguinte se o anterior for superado.

**Limites dos limites.** Toda restrição a direito fundamental precisa: ter **base constitucional ou legal**; perseguir **finalidade legítima**; respeitar a **proporcionalidade**; preservar o **núcleo essencial**. Proporcionalidade **não é autorização** para o Estado limitar direitos de forma arbitrária — é justamente um **freio** às restrições.

**Restrições previstas na própria Constituição:**
- **Diretas:** o próprio texto já limita (ex.: reunião "**sem armas**"; associação para fins **lícitos**, vedada a de caráter **paramilitar**).
- **Indiretas (reserva legal):** a CF autoriza a lei a restringir (ex.: profissões, "**atendidas as qualificações profissionais que a lei estabelecer**").
- **Estado de defesa e de sítio** (arts. 136 a 139): permitem restrições temporárias a certos direitos, nas hipóteses e limites constitucionais.

### Exemplos de colisões decididas pelo STF (para reconhecer na prova)
- **Biografias não autorizadas** (ADI 4.815): prevaleceu a liberdade de expressão — é inexigível autorização prévia do biografado; abusos se resolvem com **responsabilização posterior** (indenização, direito de resposta).
- **Discurso de ódio** (HC 82.424 — caso Ellwanger): a liberdade de expressão **não protege** manifestações racistas; publicações antissemitas configuram **racismo**.
- **Marcha da Maconha** (ADPF 187): manifestação pública pela **descriminalização** de drogas é exercício legítimo das liberdades de reunião e expressão — não é apologia ao crime.
""" + ex(
    "Uma lei municipal proíbe totalmente qualquer manifestação em vias públicas para 'garantir o trânsito livre'.",
    "A lei passa no teste da proporcionalidade?",
    "**Não.** A medida pode até ser **adequada** (evita bloqueios), mas falha na **necessidade**: existem meios menos restritivos, como o **aviso prévio** e a organização do trânsito. Uma proibição total esvazia o **núcleo essencial** do direito de reunião (art. 5º, XVI).",
    [Q("rua", "Manifestantes chegam à praça com faixas.", [P("cidadao", "esq", "fala", "feliz"), P("pm", "dir", "neutro", "neutro")], (0, "Avisamos a prefeitura ontem!")),
     Q("forum", "A lei de proibição total é questionada.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Há meio menos restritivo."))],
    "Falha na necessidade | erro",
    fluxo("Teste da proporcionalidade", [("Adequação: a medida serve ao fim?", "ok", "Evita bloqueios"), ("Necessidade: há meio menos gravoso?", "erro", "Aviso prévio e organização do trânsito"), ("Sentido estrito", "neutro", "Nem chega a ser examinado")], ("Lei inconstitucional", "erro"))),
    N(12))
m("Teoria geral dos direitos fundamentais", 6)
