from helpers import *

# ============================================================== 1 — Introdução (Módulo 1)
sec("introducao", "Módulo 1 — Introdução: quando, onde e a quem se aplica a lei penal", """
**Aplicação da lei penal** é o conjunto de regras que responde a três perguntas antes de qualquer análise de crime: **qual lei vale** para aquele fato (lei no **tempo**), **onde** a lei brasileira alcança o fato (lei no **espaço**) e **como** se contam prazos e frações de pena. Em palavras simples: antes de perguntar "que crime é este?", o juiz precisa saber **se** e **qual** lei penal brasileira pode ser aplicada.

📘 **Onde se estuda:** Código Penal (Decreto-Lei nº 2.848/1940), **Parte Geral**, **Título I — Da aplicação da lei penal**, **arts. 1º a 12**, com a redação da **Lei nº 7.209/1984** (reforma da Parte Geral). Conferido no Planalto em 19/10/2026: **nenhum desses artigos foi alterado depois de 1984**.

🎯 **Por que cai tanto em concursos policiais:** o policial lida com o fato no momento em que ele acontece — e a prova cobra exatamente isso: o crime começou numa lei e terminou em outra? A conduta foi aqui e o resultado no exterior? O crime foi a bordo de um navio? O preso já cumpriu pena lá fora? São perguntas de **lei seca + casos com datas e lugares**.

**Lei penal, tempo, espaço e fato criminoso — a relação:**
| Pergunta | Regra | Artigo |
|---|---|---|
| Existe lei que defina o fato como crime **antes** dele? | Legalidade e anterioridade | Art. 1º |
| A lei mudou depois do fato? | Irretroatividade da lei mais grave; retroatividade da mais benéfica | Arts. 2º e 3º |
| **Quando** o crime foi praticado? | Teoria da **atividade** | Art. 4º |
| O fato ocorreu **no Brasil**? | Territorialidade (temperada) | Art. 5º |
| **Onde** o crime foi praticado? | Teoria da **ubiquidade** | Art. 6º |
| A lei brasileira alcança fato **no exterior**? | Extraterritorialidade | Art. 7º |
| Já houve pena ou sentença no exterior? | Desconto/atenuação; homologação | Arts. 8º e 9º |
| Como contar prazos e frações? | Inclui o dia do começo; desprezam-se frações | Arts. 10 e 11 |
| E as leis especiais? | Regras gerais do CP, salvo disposição diversa | Art. 12 |

**Princípios constitucionais ligados ao tema:**
- **Legalidade e anterioridade** — CF, art. 5º, **XXXIX**: não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal.
- **Irretroatividade da lei penal, salvo para beneficiar o réu** — CF, art. 5º, **XL**.
- **Competência privativa da União para legislar sobre direito penal** — CF, art. 22, I.
- **Vedação de medida provisória sobre direito penal** — CF, art. 62, § 1º, I, "b".
- **Homologação de sentença estrangeira pelo STJ** — CF, art. 105, I, "i" (redação da EC 45/2004).

**Mapa inicial dos assuntos desta aula:**
- **Lei penal no tempo:** arts. 1º a 3º (legalidade, sucessão de leis, leis temporárias e excepcionais)
- **Tempo do crime:** art. 4º (atividade)
- **Lei penal no espaço:** art. 5º (territorialidade)
- **Lugar do crime:** art. 6º (ubiquidade)
- **Extraterritorialidade:** art. 7º (incondicionada, condicionada e a do § 3º)
- **Pena cumprida no estrangeiro:** art. 8º
- **Eficácia da sentença estrangeira:** art. 9º
- **Contagem dos prazos:** art. 10
- **Frações não computáveis da pena:** art. 11
- **Regras gerais e leis especiais:** art. 12

> ⚠️ Nesta aula, o **texto literal da lei** aparece em citação (com ">"); as **explicações** são doutrinárias; a **jurisprudência** traz tribunal e número; **exemplos** com nomes são **hipotéticos**; e as **questões** são **autorais (APROVUM)** — não são questões oficiais de nenhuma banca.
""" + ex(
    "Em 2026, Caio pratica uma conduta que, naquele dia, não estava prevista como crime. Meses depois, uma lei nova passa a punir exatamente aquela conduta.",
    "Caio pode ser processado com base na lei nova?",
    "**Não.** Pela **legalidade e anterioridade** (art. 1º do CP e CF, art. 5º, XXXIX), só é crime o fato que a lei já definia como crime **no momento** em que foi praticado. A lei nova é uma **novatio legis incriminadora** e **não retroage** (CF, art. 5º, XL). Ela só alcança fatos praticados **depois** de entrar em vigor.",
    [Q("delegacia", "A conduta de Caio ainda não era crime.", [P("investigado", "esq", "neutro", "neutro"), P("delegado", "dir", "fala", "serio", "documento")], (1, "Isso virou crime só agora...")),
     Q("forum", "O juiz aplica o art. 1º do CP.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Lei posterior não alcança o fato."))],
    "Lei nova não retroage | ok",
    linha("Antes da lei, não há crime", "meses", [(0, "Conduta de Caio", "neutro"), (4, "Lei nova incrimina", "alerta"), (6, "Fatos novos: crime", "ok")])),
    ["N0001", "N0002", "N0005", "N0006", "N0009", "N0010", "N0030", "N0031", "N0037", "N0038", "N0039"])
m("Introdução à aplicação da lei penal", 1)

# ============================================================== 2 — Mapa principal (Módulo 15)
sec("esquema", "Módulo 15 — Mapas mentais (1/2): o mapa principal e o quadro dos arts. 1º a 12", """
**Mapa principal — APLICAÇÃO DA LEI PENAL**
- **Princípio da legalidade (art. 1º):** sem lei anterior, não há crime nem pena · lex praevia, scripta, stricta e certa
- **Lei penal no tempo (art. 2º):** regra: lei do tempo do fato · mais grave não retroage · mais benéfica retroage
- **Sucessão de leis:** incriminadora · in pejus · in mellius · abolitio criminis · continuidade normativo-típica
- **Lei temporária e excepcional (art. 3º):** ultra-ativas para os fatos praticados durante a vigência
- **Tempo do crime (art. 4º):** teoria da **atividade** (momento da ação ou omissão)
- **Territorialidade (art. 5º):** regra, temperada por tratados · § 1º extensão do território · § 2º estrangeiras privadas
- **Lugar do crime (art. 6º):** teoria da **ubiquidade** (ação, omissão ou resultado)
- **Extraterritorialidade (art. 7º):** I incondicionada · II condicionada (5 condições do § 2º) · § 3º estrangeiro contra brasileiro
- **Pena cumprida no estrangeiro (art. 8º):** idênticas → computa · diversas → atenua
- **Sentença estrangeira (art. 9º):** homologação (STJ) para efeitos civis ou medida de segurança
- **Contagem de prazo (art. 10):** inclui o dia do começo · calendário comum
- **Frações da pena (art. 11):** desprezam-se frações de dia (e, na multa, frações da moeda)
- **Leis especiais (art. 12):** regras gerais do CP, se a lei especial não dispuser de modo diverso

**Quadro dos arts. 1º a 12 (lei seca em uma linha)**
| Artigo | Assunto | Palavra-chave para a prova |
|---|---|---|
| 1º | Anterioridade da lei | **lei anterior** + **prévia cominação** |
| 2º, caput | Abolitio criminis | cessa a **execução** e os **efeitos penais** |
| 2º, p. ú. | Lei mais benéfica | **de qualquer modo** favorecer · **ainda que** transitada em julgado |
| 3º | Lei excepcional ou temporária | aplica-se ao fato praticado **durante sua vigência** |
| 4º | Tempo do crime | **momento da ação ou omissão** |
| 5º | Territorialidade | **sem prejuízo** de convenções e tratados |
| 6º | Lugar do crime | **ação/omissão** ou **resultado** (produziu ou deveria) |
| 7º | Extraterritorialidade | I incondicionada · II e § 3º condicionadas |
| 8º | Pena cumprida no estrangeiro | **atenua** (diversas) · **computa** (idênticas) |
| 9º | Sentença estrangeira | **homologação**: efeitos civis e medida de segurança |
| 10 | Contagem de prazo | **inclui** o dia do começo |
| 11 | Frações não computáveis | **desprezam-se** frações de dia |
| 12 | Legislação especial | **salvo** disposição diversa |
""", ["N0001", "N0002", "N0003", "N0004", "N0005", "N0006", "N0009", "N0010", "N0030", "N0031", "N0037", "N0038", "N0039"])
m("Mapas mentais e quadros de revisão", 2)

sec("esquema", "Módulo 15 — Mapas mentais (2/2): sucessão de leis, teorias, extraterritorialidade e pegadinhas", """
**Quadro das modalidades de sucessão legislativa**
- **Novatio legis incriminadora:** passa a punir fato antes lícito → **não retroage**
- **Novatio legis in pejus (lex gravior):** piora a situação (pena maior, regime pior) → **não retroage**
- **Novatio legis in mellius (lex mitior):** melhora de qualquer modo → **retroage**, mesmo após o trânsito em julgado
- **Abolitio criminis:** deixa de considerar o fato crime → **retroage**; cessa a execução e os efeitos **penais**
- **Continuidade normativo-típica:** revoga o artigo, mas a conduta continua punida em outro → **não é abolitio**

**Quadro das teorias do tempo e do lugar do crime**
- **Atividade:** importa o momento/lugar da **conduta** → o CP adota para o **TEMPO** (art. 4º)
- **Resultado:** importa o momento/lugar do **resultado** → não adotada nos arts. 4º e 6º (o CPP, art. 70, usa a consumação para **competência**)
- **Ubiquidade (mista):** conduta **ou** resultado → o CP adota para o **LUGAR** (art. 6º)
- **Macete LUTA:** **L**ugar → **U**biquidade · **T**empo → **A**tividade

**Quadro da extraterritorialidade**
- **Incondicionada (art. 7º, I):** Presidente (vida/liberdade) · patrimônio/fé pública de entes públicos · administração pública por quem está a seu serviço · genocídio (agente brasileiro ou domiciliado) → pune **ainda que absolvido ou condenado** no estrangeiro (§ 1º)
- **Condicionada (art. 7º, II):** tratado/convenção · praticado por brasileiro · aeronave/embarcação brasileira privada no estrangeiro e lá não julgado → exige as **5 condições do § 2º**
- **§ 3º (estrangeiro contra brasileiro no exterior):** 5 condições do § 2º **+** extradição não pedida ou negada **+** requisição do Ministro da Justiça

**Lista de pegadinhas recorrentes**
- **Abolitio apaga efeitos civis?** Não: cessam os efeitos **penais**; a obrigação de reparar o dano permanece
- **A lei mais benéfica deixa de valer depois do trânsito em julgado?** Não: ela retroage **mesmo assim**, aplicada pelo juízo da execução (Súmula 611/STF)
- **Fim da lei temporária = abolitio?** Não: ela continua alcançando os fatos praticados durante a vigência (art. 3º)
- **Tempo do crime = data do resultado?** Não: é o momento da **conduta** (atividade)
- **Lugar do crime = só onde houve a conduta?** Não: também onde se produziu **ou deveria produzir-se** o resultado
- **Condições do § 2º valem para o inciso I?** Não: o inciso I é **incondicionado**
- **Prazo penal exclui o dia do começo?** Não: no CP **inclui** (art. 10); quem exclui é o prazo **processual** (CPP, art. 798, § 1º)
- **Pode combinar as partes boas de duas leis?** O STF (Tema 169) e o STJ (Súmula 501) vedam a combinação na sucessão das Leis de Drogas
""", ["N0001", "N0002", "N0003", "N0004", "N0005", "N0009", "N0011", "N0016", "N0020", "N0021", "N0027", "N0037"])
m("Mapas mentais e quadros de revisão", 3)

# ============================================================== 4 — Texto legal
sec("texto_legal", "Arts. 1º a 12 do Código Penal — redação vigente (conferida no Planalto em 19/10/2026)", """
> **TÍTULO I — DA APLICAÇÃO DA LEI PENAL**
>
> **Anterioridade da Lei**
> Art. 1º - Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.
>
> **Lei penal no tempo**
> Art. 2º - Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória.
> Parágrafo único - A lei posterior, que de qualquer modo favorecer o agente, aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado.
>
> **Lei excepcional ou temporária**
> Art. 3º - A lei excepcional ou temporária, embora decorrido o período de sua duração ou cessadas as circunstâncias que a determinaram, aplica-se ao fato praticado durante sua vigência.
>
> **Tempo do crime**
> Art. 4º - Considera-se praticado o crime no momento da ação ou omissão, ainda que outro seja o momento do resultado.
>
> **Territorialidade**
> Art. 5º - Aplica-se a lei brasileira, sem prejuízo de convenções, tratados e regras de direito internacional, ao crime cometido no território nacional.
> § 1º - Para os efeitos penais, consideram-se como extensão do território nacional as embarcações e aeronaves brasileiras, de natureza pública ou a serviço do governo brasileiro onde quer que se encontrem, bem como as aeronaves e as embarcações brasileiras, mercantes ou de propriedade privada, que se achem, respectivamente, no espaço aéreo correspondente ou em alto-mar.
> § 2º - É também aplicável a lei brasileira aos crimes praticados a bordo de aeronaves ou embarcações estrangeiras de propriedade privada, achando-se aquelas em pouso no território nacional ou em vôo no espaço aéreo correspondente, e estas em porto ou mar territorial do Brasil.
>
> **Lugar do crime**
> Art. 6º - Considera-se praticado o crime no lugar em que ocorreu a ação ou omissão, no todo ou em parte, bem como onde se produziu ou deveria produzir-se o resultado.
>
> **Extraterritorialidade**
> Art. 7º - Ficam sujeitos à lei brasileira, embora cometidos no estrangeiro:
> I - os crimes:
> a) contra a vida ou a liberdade do Presidente da República;
> b) contra o patrimônio ou a fé pública da União, do Distrito Federal, de Estado, de Território, de Município, de empresa pública, sociedade de economia mista, autarquia ou fundação instituída pelo Poder Público;
> c) contra a administração pública, por quem está a seu serviço;
> d) de genocídio, quando o agente for brasileiro ou domiciliado no Brasil;
> II - os crimes:
> a) que, por tratado ou convenção, o Brasil se obrigou a reprimir;
> b) praticados por brasileiro;
> c) praticados em aeronaves ou embarcações brasileiras, mercantes ou de propriedade privada, quando em território estrangeiro e aí não sejam julgados.
> § 1º - Nos casos do inciso I, o agente é punido segundo a lei brasileira, ainda que absolvido ou condenado no estrangeiro.
> § 2º - Nos casos do inciso II, a aplicação da lei brasileira depende do concurso das seguintes condições:
> a) entrar o agente no território nacional;
> b) ser o fato punível também no país em que foi praticado;
> c) estar o crime incluído entre aqueles pelos quais a lei brasileira autoriza a extradição;
> d) não ter sido o agente absolvido no estrangeiro ou não ter aí cumprido a pena;
> e) não ter sido o agente perdoado no estrangeiro ou, por outro motivo, não estar extinta a punibilidade, segundo a lei mais favorável.
> § 3º - A lei brasileira aplica-se também ao crime cometido por estrangeiro contra brasileiro fora do Brasil, se, reunidas as condições previstas no parágrafo anterior:
> a) não foi pedida ou foi negada a extradição;
> b) houve requisição do Ministro da Justiça.
>
> **Pena cumprida no estrangeiro**
> Art. 8º - A pena cumprida no estrangeiro atenua a pena imposta no Brasil pelo mesmo crime, quando diversas, ou nela é computada, quando idênticas.
>
> **Eficácia de sentença estrangeira**
> Art. 9º - A sentença estrangeira, quando a aplicação da lei brasileira produz na espécie as mesmas conseqüências, pode ser homologada no Brasil para:
> I - obrigar o condenado à reparação do dano, a restituições e a outros efeitos civis;
> II - sujeitá-lo a medida de segurança.
> Parágrafo único - A homologação depende:
> a) para os efeitos previstos no inciso I, de pedido da parte interessada;
> b) para os outros efeitos, da existência de tratado de extradição com o país de cuja autoridade judiciária emanou a sentença, ou, na falta de tratado, de requisição do Ministro da Justiça.
>
> **Contagem de prazo**
> Art. 10 - O dia do começo inclui-se no cômputo do prazo. Contam-se os dias, os meses e os anos pelo calendário comum.
>
> **Frações não computáveis da pena**
> Art. 11 - Desprezam-se, nas penas privativas de liberdade e nas restritivas de direitos, as frações de dia, e, na pena de multa, as frações de cruzeiro.
>
> **Legislação especial**
> Art. 12 - As regras gerais deste Código aplicam-se aos fatos incriminados por lei especial, se esta não dispuser de modo diverso.

📅 **Conferência:** texto comparado, artigo por artigo, com o Código Penal compilado do Planalto em 19/10/2026 — palavras, pontuação, incisos e alíneas idênticos. Todos os dispositivos trazem a nota "Redação dada pela Lei nº 7.209, de 11.7.1984"; não há alteração posterior. A grafia "vôo" (art. 5º, § 2º) e "conseqüências" (art. 9º) é a da redação original de 1984.
""", [f"N{i:04d}" for i in range(1, 40)])
m("Texto legal: arts. 1º a 12", 4)

# ============================================================== 5 — Módulo 2 (1/2)
sec("explicacao", "Módulo 2 — Legalidade e anterioridade (1/2): reserva legal e as quatro garantias (lex praevia, scripta, stricta, certa)", """
> **Art. 1º** - Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.
> **CF, art. 5º, XXXIX** - não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal.

### 2.1 Princípio da legalidade
📘 **Conceito técnico:** só a **lei em sentido estrito** pode criar crimes e cominar penas. É a principal garantia do cidadão contra o poder punitivo do Estado (*nullum crimen, nulla poena sine lege*).
🗣️ **Em linguagem simples:** se a lei não diz que é crime, **não é crime** — por pior que pareça a conduta.
🧪 **Exemplo:** uma conduta moralmente reprovável, mas não descrita em nenhum tipo penal, não pode gerar prisão nem processo criminal.
🎯 **Como cai:** "A legalidade impede que costume ou decreto criem crimes" → **Certo**.

### 2.2 Reserva legal
📘 **Conceito técnico:** a matéria penal incriminadora é **reservada à lei** editada pelo Congresso Nacional (competência privativa da União — CF, art. 22, I). **Medida provisória não pode tratar de direito penal** (CF, art. 62, § 1º, I, "b"); decreto, resolução e portaria também não criam crime.
🗣️ **Em linguagem simples:** quem cria crime é o **Legislativo**, por **lei**. O Executivo não pode.
🚨 **Pegadinha:** "Lei estadual pode criar crime para proteger o meio ambiente local." → **Errado**: legislar sobre direito penal é competência **privativa da União**.
⚠️ Doutrina e jurisprudência discutem se medida provisória **benéfica** (que não incrimine) poderia tratar de matéria penal; a vedação constitucional, porém, é expressa e não faz essa distinção. Na prova, siga a letra da CF salvo se o enunciado pedir a controvérsia.

### 2.3 Anterioridade
📘 **Conceito técnico:** a lei que define o crime e comina a pena deve ser **anterior ao fato**. Daí decorre a **proibição de incriminação retroativa**: lei nova que cria crime ou piora a situação **não alcança fatos passados** (CF, art. 5º, XL).
🗣️ **Em linguagem simples:** a regra do jogo tem de existir **antes** da jogada.
🧪 **Exemplo:** lei de 10/03/2026 aumenta a pena de um crime. O fato praticado em 09/03/2026 continua com a pena antiga.
🎯 **Prévia cominação legal da pena:** não basta descrever a conduta; a **pena** também tem de estar prevista antes. Por isso o art. 1º tem **duas frases** — uma para o **crime**, outra para a **pena**.

### 2.4 As quatro garantias (desdobramentos da legalidade)
| Garantia | Exigência | O que proíbe | Exemplo de violação |
|---|---|---|---|
| **Lex praevia** | Lei **anterior** ao fato | Retroatividade incriminadora ou mais grave | Punir hoje fato de ontem com lei de hoje |
| **Lex scripta** | Lei **escrita** | Costume como fonte de crime ou pena | "Sempre se puniu isso na região" |
| **Lex stricta** | Interpretação **estrita** | **Analogia** contra o réu (*in malam partem*) | Estender tipo a caso parecido não previsto |
| **Lex certa** | Lei **clara e determinada** (taxatividade) | Tipos vagos e indeterminados | "Será punido quem praticar ato contrário aos bons costumes" |
⚠️ O **costume** não cria nem agrava crime, mas pode ajudar a **interpretar** elementos do tipo (ex.: o que é "ato obsceno" numa época) — é fonte **interpretativa**, não incriminadora.
🛡️ **Como não errar:** legalidade = **quem** pode criar crime (lei) + **quando** (antes) + **como** (escrita, estrita e clara).
✍️ **Fixação:** decreto presidencial que crie crime viola qual garantia? → **Reserva legal / lex scripta** (não é lei em sentido estrito).
""" + ex(
    "Um prefeito edita decreto municipal prevendo pena de detenção para quem jogar lixo na rua. Um morador é preso com base no decreto.",
    "A prisão é válida?",
    "**Não.** O decreto viola a **legalidade/reserva legal**: crime e pena só podem ser criados por **lei federal** (CF, art. 22, I). Além disso, decreto não é lei em sentido estrito (**lex scripta**). A conduta pode, conforme o caso, gerar **sanção administrativa** prevista em norma municipal, mas não crime.",
    [Q("reparticao", "O prefeito assina um decreto criando 'crime'.", [P("gestor", "centro", "fala", "serio", "documento")], (0, "Quem sujar a rua vai preso!")),
     Q("forum", "O juiz analisa a prisão.", [P("juiz", "esq", "fala", "serio", "documento"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Decreto não cria crime."))],
    "Só lei federal cria crime | erro",
    fluxo("Este ato pode criar crime?", [
        ("É lei em sentido estrito?", "alerta", "Decreto, portaria e MP: não"),
        ("É lei federal (União)?", "alerta", "CF, art. 22, I"),
        ("É anterior ao fato?", "neutro", "lex praevia"),
        ("É clara e determinada?", "neutro", "lex certa"),
    ], ("Tudo sim → pode haver crime", "ok"))),
    ["N0001"])
m("Princípio da legalidade e anterioridade", 5)

# ============================================================== 6 — Módulo 2 (2/2)
sec("aprofundamento", "Módulo 2 — Legalidade e anterioridade (2/2): analogia, interpretação extensiva e lei penal em branco", """
### 2.5 Analogia e seus limites
📘 **Conceito técnico:** **analogia** é método de **integração** (não de interpretação): aplica-se a um caso **não previsto** a regra feita para um caso **semelhante**, porque há uma **lacuna** na lei.
- **Analogia in malam partem** (contra o réu): **proibida** no Direito Penal — viola a reserva legal (*lex stricta*).
- **Analogia in bonam partem** (a favor do réu): **admitida** pela doutrina majoritária, desde que haja lacuna involuntária e não se trate de norma excepcional.
🗣️ **Em linguagem simples:** o juiz pode "esticar" a lei para **ajudar** o réu numa lacuna, nunca para **prejudicá-lo**.
🧪 **Exemplo:** usar um tipo penal que fala em "carta" para punir quem viola mensagem de aplicativo, sem previsão legal, seria analogia **in malam partem** → proibida.
🚨 **Pegadinha:** "A analogia é vedada no Direito Penal" → **incompleto/errado** conforme o enunciado: vedada é a analogia **contra** o réu.

### 2.6 Analogia × interpretação extensiva × interpretação analógica
| | **Analogia** | **Interpretação extensiva** | **Interpretação analógica** |
|---|---|---|---|
| Natureza | **Integração** (há lacuna) | **Interpretação** (a lei disse menos do que queria) | **Interpretação** autorizada pela própria lei |
| Há norma para o caso? | **Não** | **Sim**, alcançada pelo sentido da palavra | **Sim**: fórmula casuística + **cláusula genérica** |
| Contra o réu? | **Vedada** | Admitida por parte da doutrina e da jurisprudência, com controvérsia | **Admitida** (a lei manda) |
| Exemplo | Aplicar regra a caso não previsto | Exemplo clássico da doutrina: o crime de **bigamia** (art. 235) abrange também a **poligamia** (quem casa três vezes) | Art. 121, § 2º, IV: "traição, emboscada, dissimulação **ou outro recurso** que dificulte ou torne impossível a defesa" |
⚠️ Na **interpretação analógica**, a própria lei dá exemplos e depois usa uma expressão genérica para casos semelhantes. Não há lacuna: a lei **quis** abranger os casos parecidos.

### 2.7 Lei penal em branco
📘 **Conceito técnico:** é a norma penal cujo **preceito** (a descrição da conduta) é **incompleto** e precisa de **complemento** em outra norma.
- **Em branco homogênea (em sentido amplo):** o complemento está em **lei** (mesma fonte). Ex.: crimes que dependem de conceitos do Código Civil (impedimentos do casamento, no art. 237 do CP).
- **Em branco heterogênea (em sentido estrito):** o complemento está em **norma infralegal** (fonte diversa). Ex.: **Lei de Drogas** — o que é "droga" é definido em lista da **Anvisa** (Portaria SVS/MS nº 344/1998), conforme o art. 66 da Lei 11.343/2006.
- **Em branco inversa (ao revés):** o **preceito** é completo, mas a **pena** é que precisa de complemento — e esse complemento tem de vir de **lei**, por causa da reserva legal (ex.: art. 1º da Lei 2.889/1956, genocídio, que remete às penas de outros artigos do CP).
🗣️ **Em linguagem simples:** a lei penal "deixa um espaço em branco" que outra norma preenche — a lei de drogas pune "droga", e a lista diz quais substâncias são.
🎯 **Compatível com a legalidade?** Prevalece que **sim**: o núcleo da proibição está na lei; o complemento só detalha aspectos técnicos.
⚠️ **Mudança do complemento e retroatividade (tema controvertido):** se o complemento muda porque a sociedade **deixou de considerar** aquela conduta reprovável (ex.: substância **retirada** da lista), prevalece que a alteração **benéfica retroage**. Se o complemento é **temporário ou excepcional** por natureza (ex.: tabela oficial de preços de um período), a alteração **não retroage** (aplica-se a lógica do art. 3º).

### 2.8 Relação com a CF, art. 5º, XXXIX
O art. 1º do CP **repete** a garantia constitucional. Por estar na **Constituição**, a legalidade é **cláusula pétrea** (direito individual — CF, art. 60, § 4º, IV): nem emenda constitucional pode aboli-la.
✍️ **Fixação:** o juiz aplica a pena de um crime a uma conduta parecida, não prevista em lei, para punir o réu. → **Analogia in malam partem**: proibida.
""" + ex(
    "Pedro foi preso transportando uma substância que, na data do fato, constava da lista de drogas proibidas da Anvisa. Antes do julgamento, a substância é retirada da lista por se entender que não causa dependência.",
    "A retirada da substância da lista beneficia Pedro?",
    "**Em regra, sim.** O tráfico é **lei penal em branco heterogênea**: o conceito de droga vem da lista da Anvisa. Quando o complemento muda porque a conduta deixou de ser considerada reprovável, prevalece que a mudança equivale a uma **abolitio criminis** para aquela substância e **retroage** (art. 2º do CP; CF, art. 5º, XL). Seria diferente se o complemento fosse **temporário/excepcional** por natureza. É um tema com debate doutrinário — na prova, observe o que o enunciado afirma.",
    [Q("delegacia", "Pedro é autuado com a substância.", [P("delegado", "esq", "fala", "serio", "documento"), P("investigado", "dir", "neutro", "triste")], (0, "Consta na lista da Anvisa.")),
     Q("forum", "A defesa traz a lista nova.", [P("advogado", "esq", "aponta", "feliz", "documento"), P("juiz", "dir", "neutro", "serio")], (0, "Saiu da lista: retroage!"))],
    "Complemento benéfico retroage | ok",
    comp("Mudança do complemento", ("Muda a valoração", "Retroage", "ok", ["Substância sai da lista", "Conduta deixa de ser reprovável", "Efeito de abolitio"]),
         ("Complemento temporário", "Não retroage", "alerta", ["Tabela de preços de um período", "Lógica do art. 3º", "Fato no período continua punível"]))),
    ["N0001", "N0002"])
m("Princípio da legalidade e anterioridade", 6)
