from helpers import sec, ex, P, Q, fluxo, comp, m

sec("explicacao", "Módulo 3 — Informações explícitas e implícitas: inferência, pressuposto e subentendido", r"""
### 3.1 Inferência textual
📘 **Conceito:** inferir é chegar a uma informação **não escrita** combinando **pistas do texto** com **conhecimento de mundo** compartilhado.
🗣️ **Em linguagem simples:** é "ler nas entrelinhas" **com prova**. Se você não consegue apontar a pista, não é inferência — é chute.
🧪 **Exemplo:** *"Ao chegar, João fechou o guarda-chuva e tirou o casaco encharcado."* → infere-se que **chovia**. Pistas: guarda-chuva + casaco encharcado. Conhecimento de mundo: guarda-chuva serve para chuva.
📘 **Conhecimento de mundo** é o saber geral que um leitor médio tem (o fogo queima, a noite é escura, eleições ocorrem periodicamente). A banca pode exigir esse saber **básico**, mas **não** conhecimento especializado que o texto não forneça.

### 3.2 Pressuposição
📘 **Pressuposto** é uma informação **marcada na própria estrutura linguística** da frase: está "embutida" em uma palavra ou construção. Característica clássica: o pressuposto **continua verdadeiro mesmo se a frase for negada ou transformada em pergunta**.
🧪 *"Carla **deixou de** fumar."* → pressuposto: **Carla fumava**. Negue: *"Carla não deixou de fumar"* → continua pressupondo que ela fumava.
🔎 **Marcadores comuns de pressuposição** (quando empregados com esse efeito):
| Marcador | Exemplo | Pressuposto |
|---|---|---|
| **continuar** | *O índice continua alto.* | O índice já era alto antes |
| **deixar de** | *Ele deixou de faltar.* | Ele faltava |
| **voltar a** | *A empresa voltou a contratar.* | Ela já contratou e parou |
| **passar a** | *O órgão passou a exigir laudo.* | Antes não exigia |
| **perceber / descobrir / saber** (verbos factivos) | *Ela percebeu que o pneu estava furado.* | O pneu **estava** furado |
| **ainda / já / agora** | *O processo ainda não terminou.* | Espera-se que termine |
| **também / até / inclusive** | *Até o diretor compareceu.* | Outros compareceram; a presença dele era menos provável |
| **adjetivos/orações que qualificam** | *O novo sistema falhou.* | Havia um sistema anterior |

### 3.3 Subentendido
📘 **Subentendido** é uma insinuação que **depende do contexto** e da intenção do falante; **não** está marcado em uma palavra específica, e o falante pode **negar** que quis dizê-lo.
🧪 Numa sala abafada, alguém diz: *"Está calor aqui, não?"* → subentendido possível: **"abra a janela"**. O falante pode dizer "eu só comentei o tempo".
| | **Pressuposto** | **Subentendido** |
|---|---|---|
| Onde está | Na **estrutura** da frase (marcador linguístico) | No **contexto** da enunciação |
| Responsabilidade | O falante **não pode negar** sem contradição | O falante **pode negar** ("não foi isso que eu quis dizer") |
| Resiste à negação? | **Sim** | Não necessariamente |

📘 **Implicatura contextual** é o nome técnico (da pragmática) para esse tipo de sentido que o ouvinte deduz do **contexto** e das expectativas de cooperação na conversa. Em prova, aparece como "o que o personagem **quis dizer**" ou "a fala **sugere**".

### 3.4 Limites da inferência
⚠️ Uma inferência **precisa ser sustentada pelo texto**. O candidato **não pode inventar**. Quatro categorias para treinar:
| Categoria | O que é | Exemplo (texto: *"Alguns agentes da unidade concluíram o curso de tiro em 2025."*) |
|---|---|---|
| **Escrito expressamente** | Está na frase | Agentes da unidade concluíram o curso de tiro. |
| **Pode ser inferido** | Pista obriga/autoriza | Houve curso de tiro em 2025; nem todos os agentes concluíram (o "alguns" sugere parte). |
| **Não pode ser concluído** | O texto não dá base | Os agentes que concluíram foram promovidos. |
| **Extrapola** | Generaliza ou acrescenta | Todos os agentes do estado sabem atirar. |

🚨 **Pegadinha:** a alternativa traz uma conclusão **plausível no mundo** ("quem fez o curso atira melhor") — mas o texto **não disse**. É extrapolação.
🛡️ **Como não errar:** para cada inferência, nomeie a **pista**. Sem pista → descarte.
✍️ **Fixação:** *"O prefeito voltou a prometer a obra."* Qual o pressuposto? → **Ele já havia prometido a obra antes.** E o subentendido possível (contexto crítico)? → que a promessa anterior **não foi cumprida** (depende do contexto, não é obrigatório).
""" + ex(
    "Diálogo numa unidade: o chefe pergunta \"Quem fechou o relatório de ontem?\" e o agente responde: \"Bom, eu cheguei às 7h e o relatório já estava na mesa.\"",
    "O que a resposta pressupõe e o que ela subentende?",
    "**Pressuposto** (marcado por *já estava*): o relatório estava pronto **antes** das 7h. **Subentendido** (contexto): o agente **não** foi quem fechou o relatório — ele insinua isso sem afirmar diretamente, e poderia negar a insinuação. Em prova: o pressuposto é **conclusão segura**; o subentendido é **sentido sugerido** pelo contexto.",
    [Q("reparticao", "O chefe quer saber quem fez o relatório.", [P("gestor", "esq", "fala", "serio", "documento"), P("servidor", "dir", "neutro", "neutro")], fala=(0, "Quem fechou o relatório?")),
     Q("reparticao", "A resposta insinua sem afirmar.", [P("servidor", "centro", "fala", "neutro")], fala=(0, "Quando cheguei, já estava na mesa..."))],
    "Pressuposto ≠ subentendido | alerta",
    comp("Pressuposto × subentendido", ("Pressuposto", "Na frase", "ok", ["Marcador linguístico", "Resiste à negação", "Não dá para negar"]), ("Subentendido", "No contexto", "alerta", ["Insinuação", "Depende da situação", "Pode ser negado"])),
), ["N0010", "N0011", "N0012", "N0013"])

sec("explicacao", "Módulo 4 — Assunto, tema, ideia central, tese e intenção do autor", r"""
### 4.1 Oito conceitos que a banca adora misturar
| Conceito | O que é | Pergunta-guia |
|---|---|---|
| **Assunto** | O **objeto** geral de que o texto trata (uma palavra ou expressão) | "Sobre o que se fala?" |
| **Tema** | O **recorte** do assunto: o campo de discussão delimitado | "Que aspecto do assunto é discutido?" |
| **Ideia central** | O que o texto **comunica principalmente** sobre o tema | "Qual a mensagem principal?" |
| **Tese** | O **ponto de vista** defendido (só em textos argumentativos) | "O que o autor quer provar?" |
| **Argumento** | A **razão** que sustenta a tese | "Por que o autor pensa assim?" |
| **Objetivo comunicativo** | O que o texto quer **provocar** (informar, convencer, orientar, divertir) | "Para que o texto foi escrito?" |
| **Intenção do autor** | O efeito que o autor **busca** no leitor (alertar, criticar, emocionar) | "O que o autor quer que eu sinta/pense/faça?" |
| **Público-alvo** | A quem o texto se dirige | "Para quem foi escrito?" |

🗣️ **Em linguagem simples:** **assunto** = segurança pública; **tema** = o uso de câmeras corporais por policiais; **ideia central** = as câmeras reduzem conflitos e protegem tanto o cidadão quanto o agente; **tese** (se for opinativo) = o uso das câmeras deve ser obrigatório.
⚠️ **Tema ≠ título.** O título pode ser irônico, metafórico ou só chamar a atenção.
⚠️ **Tese ≠ argumento.** A tese é **o que** se defende; o argumento é **por que** se defende.

### 4.2 Exercício guiado com tabela preenchida
**Texto-base (autoral):** *"Muitos candidatos acreditam que estudar mais horas é o caminho mais curto para a aprovação. A experiência mostra o contrário: quem revisa com regularidade e resolve questões retém mais conteúdo do que quem apenas acumula horas de leitura. Por isso, mais importante do que a quantidade de horas é a qualidade do método. Estudar melhor vale mais do que estudar mais."*

| Passo | Elemento | Resposta | Pista no texto |
|---|---|---|---|
| 1 | **Assunto** | Estudo para concursos | "candidatos", "aprovação" |
| 2 | **Tema** | Quantidade de horas × qualidade do método de estudo | "estudar mais horas", "qualidade do método" |
| 3 | **Ideia central** | O método de estudo pesa mais que a quantidade de horas | "mais importante do que a quantidade de horas é a qualidade do método" |
| 4 | **Tese** | Estudar melhor vale mais do que estudar mais | última frase, introduzida por "Por isso" |
| 5 | **Argumento** | Quem revisa e resolve questões retém mais | "A experiência mostra…" |
| 6 | **Objetivo comunicativo** | Convencer | estrutura tese + argumento + conclusão |
| 7 | **Intenção do autor** | Corrigir uma crença comum dos candidatos | "Muitos candidatos acreditam… A experiência mostra o contrário" |
| 8 | **Público-alvo** | Candidatos a concursos | vocabulário e exemplos |

🔎 **Repare na estratégia:** o texto começa com uma **opinião comum** (que ele vai refutar) e depois apresenta o contra-argumento. Isso é muito cobrado: a primeira frase **não** é a tese — é a ideia que o autor **contesta**.
🚨 **Pegadinha:** marcar como tese "estudar mais horas é o caminho mais curto". → **Errado:** é a crença que o autor **refuta**.
🛡️ **Como não errar:** procure conectivos de **conclusão** (*por isso, portanto, logo*) e de **oposição** (*mas, porém, ao contrário*) — eles costumam anunciar a tese.
✍️ **Fixação:** em *"Embora o celular facilite a vida, seu uso excessivo prejudica o sono"*, qual parte carrega a tese? → **"seu uso excessivo prejudica o sono"** (a oração concessiva só reconhece um ponto contrário).
""" + ex(
    "Texto: \"O número de vagas no concurso foi ampliado de 200 para 600. Para quem se prepara há anos, a notícia é um alívio — mas também um alerta: mais vagas atraem mais candidatos.\"",
    "Qual é a ideia central? E qual a intenção do autor ao usar \"mas também um alerta\"?",
    "**Ideia central:** a ampliação das vagas é positiva, mas também aumenta a concorrência. **Intenção:** **alertar** o candidato para não relaxar — o conectivo *mas* introduz o ponto que o autor quer destacar. Assunto: concurso; tema: efeitos da ampliação de vagas.",
    [Q("escola", "O professor comenta a notícia das vagas.", [P("professor", "esq", "fala", "feliz", "documento"), P("cidadao", "dir", "neutro", "feliz")], fala=(0, "Vagas triplicadas!")),
     Q("escola", "E completa com o alerta.", [P("professor", "centro", "aponta", "serio")], fala=(0, "Mas a concorrência também cresce!"))],
    "Ideia central + intenção | ok",
    fluxo("Do assunto à tese", [("Assunto", "neutro", "Sobre o que se fala"), ("Tema", "neutro", "O recorte discutido"), ("Ideia central", "alerta", "A mensagem principal"), ("Tese", "ok", "O ponto de vista defendido")], ("Argumento = por que se defende a tese", "neutro")),
), ["N0014", "N0015", "N0016", "N0017"])

sec("explicacao", "Módulo 5 — Fato, opinião, modalização e ironia", r"""
### 5.1 Fato × opinião
📘 **Fato:** informação **verificável** — pode ser confirmada ou desmentida por dados, documentos, observação. *"A unidade tem 420 vagas."*
📘 **Opinião:** **juízo de valor** de quem fala — expressa avaliação, crença, gosto. *"A unidade é mal administrada."*
⚠️ A distinção **depende do contexto**, e as duas coisas frequentemente aparecem **juntas**: *"A lotação, **absurda**, chegou a 600 presos."* → fato (600 presos) + avaliação (*absurda*).
⚠️ **Verificável ≠ verdadeiro.** "A Terra é plana" é uma afirmação **factual falsa** (pode ser verificada e desmentida), não uma opinião.

### 5.2 Marcas de avaliação
| Marca | Exemplos | Efeito |
|---|---|---|
| **Adjetivos valorativos** | *lamentável, brilhante, inaceitável, excelente* | Exprimem juízo do autor |
| **Advérbios e expressões avaliativas** | *infelizmente, felizmente, lamentavelmente, sem dúvida, curiosamente* | Mostram a atitude do autor diante do fato |
| **Escolhas lexicais** | *"invasão"* × *"ocupação"*; *"gasto"* × *"investimento"* | A palavra escolhida revela posição |
| **Aspas de distanciamento** | *a "reforma" do prédio durou dez anos* | Ironia ou desconfiança |
| **Diminutivos/aumentativos** | *um "probleminha" de R$ 2 milhões* | Ironia, desprezo, ênfase |

### 5.3 Modalização: o grau de certeza do autor
📘 **Modalizar** é indicar **como** o autor se posiciona em relação ao que diz.
| Modalidade | Marcas | Exemplo |
|---|---|---|
| **Certeza** | *certamente, sem dúvida, é evidente, comprovadamente* | *É evidente que o efetivo é insuficiente.* |
| **Possibilidade / dúvida** | *talvez, possivelmente, pode, é provável, parece* | *A medida **pode** reduzir as fugas.* |
| **Obrigação / necessidade** | *deve, é preciso, é necessário, tem de* | *O Estado **deve** garantir a custódia.* |
| **Avaliação afetiva** | *felizmente, lamentavelmente* | *Felizmente, ninguém se feriu.* |
🚨 **Pegadinha clássica:** o texto diz *"a medida **pode** reduzir as fugas"* e a alternativa afirma *"o texto **garante** que a medida reduz as fugas"*. → **Errado:** troca **possibilidade** por **certeza**.

### 5.4 Ironia e posicionamento implícito
📘 **Ironia:** dizer algo para significar o **contrário** (ou algo diferente), apoiado no contexto. *"Que pontualidade! Só três horas de atraso."*
- Pistas: contradição entre o que se diz e a situação; exagero; aspas; pontuação expressiva.
📘 **Linguagem aparentemente neutra:** um texto pode **parecer** objetivo e, ainda assim, posicionar-se pela **seleção** de fatos, pela **ordem** em que os apresenta e pelas **palavras** escolhidas. *"O deputado, investigado em três processos, apresentou projeto de combate à corrupção."* — nenhum adjetivo, mas a justaposição sugere crítica.

### 5.5 Informação objetiva × interpretação do autor
| Informação objetiva | Interpretação do autor |
|---|---|
| *As fugas caíram 30% após a instalação de câmeras.* | *As câmeras resolveram o problema das fugas.* |
| Dado verificável | Conclusão do autor (pode extrapolar: queda de 30% não é "resolver") |
🛡️ **Como não errar:** sublinhe adjetivos, advérbios e verbos modais. Eles separam o **fato** da **posição** do autor.
✍️ **Fixação:** *"Lamentavelmente, a audiência foi adiada pela terceira vez."* Fato? → **a audiência foi adiada pela terceira vez.** Opinião? → **lamentavelmente** (avaliação negativa do autor).
""" + ex(
    "Um editorial diz: \"Depois de apenas cinco anos de obras, o 'moderno' viaduto finalmente foi inaugurado — já com rachaduras.\"",
    "O texto é neutro? Que recursos revelam a posição do autor?",
    "**Não é neutro: é irônico e crítico.** Recursos: (1) **\"apenas cinco anos\"** — o *apenas* é irônico (cinco anos é muito tempo); (2) aspas em **'moderno'** — distanciamento: o autor não acredita que seja moderno; (3) **\"finalmente\"** — avaliação de demora; (4) **\"já com rachaduras\"** — o *já* reforça a crítica. Fatos verificáveis: as obras duraram cinco anos e o viaduto foi inaugurado com rachaduras.",
    [Q("rua", "A inauguração do viaduto.", [P("gestor", "esq", "fala", "feliz", "documento"), P("cidadao", "dir", "bracos_cruzados", "bravo")], fala=(0, "Obra moderna e entregue!")),
     Q("rua", "O cidadão aponta as rachaduras.", [P("cidadao", "centro", "aponta", "bravo")], fala=(0, "'Moderno'... e já rachado."))],
    "Ironia = crítica | alerta",
    comp("Fato × opinião", ("Fato", "Verificável", "ok", ["Dados, datas, números", "Pode ser confirmado", "Pode ser falso"]), ("Opinião", "Juízo de valor", "alerta", ["Adjetivos valorativos", "Advérbios avaliativos", "Modalizadores"])),
), ["N0018", "N0019", "N0020", "N0021"])
m("Informações explícitas e implícitas", 4)
m("Tema, assunto, ideia central e tese", 5)
m("Fato, opinião e posicionamento do autor", 6)
