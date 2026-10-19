from helpers import sec, ex, P, Q, fluxo, comp, m

sec("explicacao", "Módulo 9 — Denotação, conotação, figuras de linguagem e ambiguidade", r"""
### 9.1 Denotação × conotação
📘 **Denotação:** sentido **literal**, de dicionário, objetivo. *"O **cofre** do banco foi arrombado."*
📘 **Conotação:** sentido **figurado**, ampliado pelo contexto, carregado de valor expressivo. *"Ela é um **cofre**: nunca conta segredos."*
⚠️ A mesma palavra pode ser denotativa num texto e conotativa em outro — **só o contexto decide**.

### 9.2 Figuras de linguagem: definição, exemplo, efeito e cobrança
| Figura | Definição | Exemplo autoral | Efeito de sentido | Como cai |
|---|---|---|---|---|
| **Metáfora** | Comparação **implícita**, sem conectivo | *"O plantão foi uma **maratona**."* | Intensifica, cria imagem | "A expressão X é empregada em sentido figurado para…" |
| **Comparação (símile)** | Comparação **explícita**, com conectivo (*como, tal qual*) | *"Corria **como** um raio."* | Aproxima por semelhança | Distinguir de metáfora |
| **Hipérbole** | **Exagero** intencional | *"Já te disse isso **mil vezes**."* | Ênfase | "Recurso de intensificação" |
| **Ironia** | Dizer o contrário do que se pensa | *"Que **ótimo**: perdi o ônibus de novo."* | Crítica, humor | Identificar a crítica implícita |
| **Personificação (prosopopeia)** | Atribuir características humanas a seres não humanos | *"A cidade **dormia**."* | Expressividade | "Atribui ação humana a…" |
| **Eufemismo** | **Suavizar** uma ideia desagradável | *"Ele **nos deixou**"* (= morreu). | Atenuar | "Expressão empregada para atenuar…" |
| **Antítese** | Aproximação de **ideias opostas** | *"Entre o **medo** e a **coragem**, escolheu agir."* | Contraste | Identificar o par oposto |
| **Paradoxo (oxímoro)** | Ideias opostas que parecem **impossíveis juntas**, mas fazem sentido | *"Um silêncio **ensurdecedor**."* | Reflexão, estranhamento | Diferenciar de antítese |
| **Metonímia** | Troca de um termo por outro com **relação de proximidade** (autor/obra, parte/todo, marca/produto, continente/conteúdo) | *"Leu **Machado** inteiro."* / *"Bebeu **dois copos**."* | Concisão | Identificar a relação |
| **Gradação** | Sequência **crescente ou decrescente** de ideias | *"Estudou, revisou, **dominou**."* | Intensificação progressiva | Reconhecer a progressão |

🔎 **Antítese × paradoxo:** na antítese os opostos **coexistem** lado a lado (*medo × coragem*); no paradoxo, os opostos se aplicam **ao mesmo ser** de forma aparentemente contraditória (*silêncio ensurdecedor*).
⚠️ **Interprete, não só identifique:** a banca raramente pergunta só o nome da figura; pergunta **o efeito** ("a hipérbole reforça a indignação do autor").

### 9.3 Ambiguidade
📘 **Ambiguidade** é a possibilidade de **mais de uma leitura**. Pode ser **intencional** (humor, publicidade) ou **defeito** (texto mal construído).
- **Lexical:** uma **palavra** com dois sentidos. *"O **banco** estava cheio."* (assento ou agência bancária?)
- **Sintática (estrutural):** a **organização** da frase permite duas leituras. *"Vi o assaltante **com o binóculo**."* (eu usava o binóculo ou o assaltante estava com ele?) · *"Policial prende suspeito **em sua casa**."* (casa de quem?)
🛡️ **Correção da ambiguidade sintática:** reordenar (*"Com o binóculo, vi o assaltante"*), usar pronome específico (*"na casa deste"*), pontuar.
🧪 **Ambiguidade intencional em propaganda:** *"Nosso seguro **cobre** tudo — inclusive você de cuidados."* → jogo entre *cobrir* (garantir) e *cobrir de cuidados*.
✍️ **Fixação:** *"Uma montanha de processos esperava o juiz."* → **metáfora/hipérbole** (exagero da quantidade), efeito: enfatizar o acúmulo de trabalho.
""" + ex(
    "Manchete: \"Prefeito visita hospital com novos médicos.\"",
    "A frase é ambígua? Que tipo de ambiguidade? Como corrigir?",
    "**Sim, ambiguidade sintática:** o prefeito levou novos médicos na visita, **ou** o hospital é que tem novos médicos? Correções: *\"Acompanhado de novos médicos, prefeito visita hospital\"* ou *\"Prefeito visita hospital que recebeu novos médicos\"*.",
    [Q("rua", "O jornaleiro mostra a manchete.", [P("cidadao", "esq", "aponta", "surpreso", "documento"), P("professor", "dir", "fala", "neutro")], fala=(1, "Quem trouxe os médicos?")),
     Q("escola", "A professora reescreve a frase.", [P("professor", "centro", "fala", "feliz", "documento")], fala=(0, "Reordenar desfaz a ambiguidade."))],
    "Ambiguidade sintática | alerta",
    comp("Antítese × paradoxo", ("Antítese", "Opostos lado a lado", "ok", ["Medo × coragem", "Contraste", "Ideias coexistem"]), ("Paradoxo", "Opostos fundidos", "alerta", ["Silêncio ensurdecedor", "Aparente contradição", "Mesmo ser"])),
), ["N0036", "N0037", "N0038", "N0039"])

sec("explicacao", "Módulo 10 — Linguagem verbal, não verbal e multissemiótica", r"""
📘 **Texto verbal:** usa palavras. **Não verbal:** imagens, cores, gestos, símbolos. **Multissemiótico (multimodal):** combina várias linguagens — é o caso da charge, do infográfico, do anúncio e de muitos textos digitais.
⚠️ Em textos multissemióticos, **o sentido nasce da relação** entre as linguagens. Ler só a parte verbal (ou só a imagem) leva ao erro.

### 10.1 O que observar em cada recurso
| Recurso | O que observar | Exemplo de leitura |
|---|---|---|
| **Imagens** | O que está em destaque, o que está ao fundo, o que falta | Um policial em primeiro plano e a cidade escura ao fundo → protagonismo do agente |
| **Símbolos** | Significados convencionais | Balança = justiça; caveira = perigo/morte; seta = direção/tendência |
| **Cores** | Associações culturais | Vermelho = alerta/perigo/paixão; verde = permitido/saúde; preto = luto/seriedade |
| **Expressões faciais e gestos** | Emoção e atitude | Sobrancelha franzida = raiva/desconfiança; dedo em riste = acusação |
| **Gráficos** | Eixos, unidade, período, tendência | Barra que cresce de 2020 a 2025 = aumento; **atenção à escala** |
| **Tabelas** | Linhas × colunas, totais, comparações | "Qual estado teve a maior variação?" |
| **Infográficos** | Ordem de leitura, legendas, setas | Fluxo de etapas de um processo |
| **Diagramação** | Tamanho da fonte, posição, negrito, caixa | O que está maior é o que se quer destacar |

### 10.2 Como a imagem se relaciona com o texto verbal
| Relação | O que acontece | Exemplo descrito |
|---|---|---|
| **Complementa** | Imagem acrescenta informação | Texto "Use cinto"; imagem mostra o passageiro de trás sem cinto → reforça que vale para todos |
| **Reforça** | Imagem repete a mensagem | Texto "Não beba e dirija" + imagem de taça ao lado de chave quebrada |
| **Contradiz / ironiza** | Imagem desmente a fala | Personagem diz "Está tudo sob controle" enquanto o prédio pega fogo ao fundo → ironia |
| **Modifica** | Imagem muda o sentido da frase | Frase "Mais um dia de trabalho" + imagem de uma fila enorme no posto de saúde → crítica ao serviço |

### 10.3 Gráficos e tabelas: armadilhas
- **Escala** que não começa no zero exagera diferenças.
- **Valor absoluto × percentual:** "aumentou 50%" pode ser de 2 para 3 casos.
- **Período:** a tendência em 3 meses não vale para 10 anos.
- **Correlação ≠ causa:** duas curvas que sobem juntas não provam que uma causa a outra.

### 10.4 Exercícios com situações visuais descritas
1. **Charge descrita:** um homem segura um cartaz "Educação é prioridade", mas está sentado sobre uma pilha de livros usados como banco. → **ironia/crítica**: o discurso não corresponde à prática.
2. **Tira descrita:** quadro 1 — mãe: "Vá estudar!". Quadro 2 — filho abre o livro. Quadro 3 — o livro está aberto sobre o rosto e ele dorme. → **quebra de expectativa** (humor); a imagem final contradiz a ação esperada.
3. **Infográfico descrito:** barras mostram que as fugas caíram de 40 (2023) para 12 (2025) após câmeras. Uma alternativa diz "as câmeras eliminaram as fugas". → **errada**: houve **redução**, não eliminação.
4. **Anúncio descrito:** foto de uma família sorrindo dentro de um carro e a frase "Segurança que cabe no seu bolso". → relação **complementar**; "cabe no seu bolso" é **conotação** (preço acessível).
🛡️ **Como não errar:** descreva para si mesmo **o que a imagem mostra** e **qual a relação** com o texto verbal antes de olhar as alternativas.
""" + ex(
    "Tira descrita: Quadro 1 — chefe diz ao agente: \"A partir de hoje, máxima atenção na revista!\". Quadro 2 — agente revista minuciosamente uma garrafa de água. Quadro 3 — atrás dele, um visitante passa carregando uma caixa enorme com a etiqueta \"NÃO ABRA\".",
    "Qual o efeito de sentido da tira? Que relação há entre imagem e texto?",
    "O humor nasce da **contradição entre a fala e a imagem**: a ordem é \"máxima atenção\", mas o agente concentra-se no irrelevante (a garrafa) e ignora o óbvio (a caixa \"NÃO ABRA\"). A imagem **ironiza** a ordem e **critica** o excesso de rigor no detalhe com falha no essencial. É uma leitura **multissemiótica**: só o texto verbal não revela a crítica.",
    [Q("cela", "O chefe dá a ordem.", [P("gestor", "esq", "aponta", "serio"), P("policial_penal", "dir", "neutro", "serio")], fala=(0, "Máxima atenção na revista!")),
     Q("cela", "A caixa passa despercebida.", [P("policial_penal", "esq", "pega", "serio", "copo"), P("cidadao", "dir", "neutro", "feliz", "maleta")], fala=(0, "Esta garrafa está suspeita..."))],
    "Imagem ironiza o texto | alerta",
    fluxo("Leitura multissemiótica", [("O que diz o texto verbal?", "neutro"), ("O que mostra a imagem?", "neutro"), ("Qual a relação?", "alerta", "complementa, reforça, contradiz, modifica"), ("Qual o efeito?", "ok", "humor, crítica, alerta")], ("Nunca leia só uma das linguagens", "erro")),
), ["N0040", "N0041", "N0042", "N0043"])

sec("explicacao", "Módulo 11 — Intertextualidade: citação, alusão, paráfrase, paródia e contexto", r"""
📘 **Intertextualidade** é a relação que um texto estabelece com **outro texto** — retomando, imitando, citando ou transformando-o. O sentido completo, às vezes, depende de reconhecer essa relação.

### 11.1 Formas de intertextualidade
| Forma | O que é | Exemplo autoral |
|---|---|---|
| **Citação** | Reprodução **literal** de outro texto, com indicação da fonte (aspas, recuo) | *Como diz o edital, "a prova terá duração de quatro horas".* |
| **Alusão** | **Referência indireta**, sem citar literalmente; o leitor reconhece a fonte | *"Ele teve uma vitória de Pirro"* (alude a episódio histórico: vitória com perdas tão grandes que equivale a derrota) |
| **Paráfrase** | Reescrita com **outras palavras**, **mantendo o sentido** original | *"Penso, logo existo"* → *"Pensar é a prova de que existo."* |
| **Paródia** | Imitação que **transforma** o sentido original, geralmente com **humor, crítica ou ironia** | Verso romântico do séc. XIX reaproveitado para criticar o serviço público: *"Minha terra tem filas, onde espera o cidadão"* |
| **Releitura** | Nova versão de uma obra, com outro olhar, sem necessariamente satirizar | Conto clássico recontado do ponto de vista do vilão |
| **Epígrafe** | Trecho de outro texto no início de uma obra, anunciando o tema | — |

### 11.2 Paráfrase × paródia
| | **Paráfrase** | **Paródia** |
|---|---|---|
| Sentido original | **Mantido** | **Alterado/subvertido** |
| Objetivo | Explicar, resumir, reformular | Criticar, satirizar, fazer humor |
| Relação com a fonte | De **fidelidade** | De **ruptura** |
| Em prova | "Reescrita que preserva o sentido" | "Retoma o texto original com intenção crítica/humorística" |
🚨 **Pegadinha:** classificar como paródia qualquer texto que **lembra** outro. Se o sentido foi **mantido**, é paráfrase (ou alusão).

### 11.3 Contexto histórico e social e conhecimento de mundo
- Uma charge sobre "fila de vacinação" exige saber que houve uma campanha de vacinação — **contexto social**.
- Uma paródia de hino ou de poema famoso só produz humor se o leitor reconhece o original — **conhecimento de mundo**.
⚠️ **Limite em prova:** a banca **não deve** exigir conhecimento externo específico quando a questão pode ser resolvida pelas **pistas do enunciado**. Se o texto-base fornece as pistas (título, fonte, nota), use-as antes de recorrer à memória.

### 11.4 Efeito de humor e crítica
O humor intertextual nasce do **contraste** entre o texto original (conhecido, às vezes solene) e a nova situação (banal, absurda ou crítica). Esse contraste é a chave da interpretação.
🧪 **Exemplo autoral:** num cartaz de órgão de trânsito: *"Se beber, não dirija. Se dirigir, não digite."* → retoma (alude a) um slogan já conhecido e o **amplia** para o uso do celular; efeito: memorização pela semelhança e atualização da mensagem.
🛡️ **Como não errar:** pergunte (1) **qual texto está sendo retomado?** (2) **o sentido foi mantido ou transformado?** (3) **com que finalidade?**
✍️ **Fixação:** *"Ser ou não ser aprovado, eis a questão"* num cartaz de cursinho → **paródia** (subverte o verso famoso para tratar de concursos, com humor).
""" + ex(
    "Cartaz de campanha: \"Minha terra tem palmeiras… e tem lixo nas calçadas. Cuide da sua cidade.\"",
    "Que tipo de intertextualidade há? Qual o efeito?",
    "**Paródia** (por alusão a um verso muito conhecido da literatura brasileira, que exalta a terra natal): o cartaz começa como o original e **subverte** o sentido com \"e tem lixo nas calçadas\". Efeito: **crítica** (contraste entre a terra idealizada e a realidade suja) e apelo à ação (\"Cuide da sua cidade\"). Mesmo sem lembrar o autor do original, as pistas do próprio cartaz (o tom elevado quebrado pela realidade) permitem perceber a crítica.",
    [Q("rua", "O cartaz começa com um verso conhecido.", [P("cidadao", "esq", "aponta", "feliz", "documento"), P("professor", "dir", "neutro", "neutro")], fala=(0, "Minha terra tem palmeiras...")),
     Q("rua", "E quebra a expectativa.", [P("professor", "centro", "fala", "serio")], fala=(0, "...e lixo nas calçadas: paródia crítica!"))],
    "Paródia = sentido subvertido | ok",
    comp("Paráfrase × paródia", ("Paráfrase", "Sentido mantido", "ok", ["Outras palavras", "Fidelidade", "Explicar ou resumir"]), ("Paródia", "Sentido subvertido", "alerta", ["Imita e transforma", "Ruptura", "Humor ou crítica"])),
), ["N0044", "N0045", "N0046", "N0047"])

sec("aprofundamento", "Módulo 12 — Método prático para resolver questões de interpretação", r"""
Use este roteiro em **toda** questão de interpretação. Ele leva poucos segundos e evita a maioria dos erros.

### Os 8 passos
1. **Leia o comando da questão primeiro.** Ele diz o que procurar: informação explícita ("segundo o texto"), inferência ("infere-se"), sentido de palavra, relação entre trechos, reescrita.
2. **Identifique o gênero e a finalidade do texto.** Notícia informa; editorial opina; campanha persuade; charge critica. Isso orienta a leitura (ex.: em charge, procure a crítica).
3. **Localize a informação central.** Tema, ideia central e, se houver, tese. Volte ao trecho que o comando indica (linha, parágrafo, expressão).
4. **Observe as "palavras-chave da prova":** conectivos (*mas, embora, portanto*), negações (*não, nunca, nem*), pronomes (a que se referem?), restritivos (*apenas, alguns, nem sempre, principalmente*) e marcadores de opinião (*infelizmente, deve, talvez*).
5. **Separe informação expressa de inferência.** O que está escrito × o que as pistas autorizam × o que ninguém autorizou.
6. **Compare cada alternativa com o texto**, palavra por palavra, especialmente quantificadores e verbos.
7. **Elimine** as que **acrescentam** (extrapolação), **distorcem** (inversão, troca de causa e consequência, generalização) ou **contradizem** o texto.
8. **Marque a alternativa que responde exatamente ao que foi perguntado** — não basta ser verdadeira; tem de responder ao **comando**.

### Aplicação completa 1 (inferência)
**Texto:** *"Desde que o presídio passou a usar scanners corporais, as apreensões de celulares na revista de visitantes caíram 70%. Para a direção, a queda indica que menos aparelhos estão tentando entrar."*
**Comando:** "De acordo com o texto, é correto inferir que…"
- (A) os scanners eliminaram a entrada de celulares. → **Extrapolação** (queda de 70% ≠ eliminação).
- (B) antes dos scanners, o presídio não usava esse equipamento. → **Correta**: *passou a usar* pressupõe que antes não usava.
- (C) os visitantes deixaram de levar celulares por medo de punição. → **Não autorizada** (o motivo não é dado).
- (D) a direção comprovou que menos aparelhos tentam entrar. → **Distorção**: a direção **interpreta** ("para a direção, a queda **indica**"), não comprova.
- (E) as apreensões aumentaram após os scanners. → **Contradição**.
**Passos decisivos:** 4 (o marcador *passou a*; o verbo *indica*) e 7 (eliminar acréscimo e distorção).

### Aplicação completa 2 (relação de sentido)
**Texto:** *"O efetivo da unidade é reduzido; ainda assim, os índices de segurança melhoraram."*
**Comando:** "A expressão 'ainda assim' estabelece relação de…"
- Passo 4: *ainda assim* = **concessão/oposição** (apesar do efetivo reduzido, os índices melhoraram).
- Teste de troca: *"…; **mesmo assim**, os índices melhoraram"* ✔️ · *"…; **por isso**, os índices melhoraram"* ❌ (vira causa: o efetivo reduzido teria causado a melhora).
**Resposta:** relação de **oposição/concessão** (expectativa contrariada).

### Aplicação completa 3 (alternativa verdadeira que não responde ao comando)
**Comando:** "O objetivo principal do texto é…"
**Alternativa tentadora:** um fato que **está** no texto, mas é **secundário**. Ela é verdadeira, mas **não responde** ao comando (pede o objetivo principal). Passo 8 elimina.

🧠 **Lembrete de bolso:** *comando → gênero → centro → palavras-chave → expresso × inferido → comparar → eliminar → responder exatamente.*
""" + ex(
    "Uma candidata acerta a inferência mas erra a questão porque escolheu a alternativa \"O texto informa que houve redução das apreensões\" quando o comando pedia \"o principal objetivo do texto\".",
    "Qual passo do método evitaria o erro?",
    "O **passo 8**: a alternativa escolhida é **verdadeira** (o texto informa a redução), mas **não responde ao comando**, que pedia o **objetivo principal**. O passo 1 (ler o comando primeiro) e o passo 8 (responder exatamente) trabalham juntos.",
    [Q("escola", "A candidata marca uma alternativa verdadeira.", [P("cidadao", "esq", "fala", "feliz", "documento"), P("professor", "dir", "neutro", "serio")], fala=(0, "Está no texto, então está certa!")),
     Q("escola", "O professor aponta o comando.", [P("professor", "centro", "aponta", "serio", "documento")], fala=(0, "Verdadeira, mas não responde à pergunta."))],
    "Responder ao comando | erro",
    fluxo("Método (8 passos em 6 blocos)", [("1. Ler o comando", "neutro"), ("2. Gênero e finalidade", "neutro"), ("3–4. Centro e palavras-chave", "alerta", "conectivos, negações, pronomes, restritivos"), ("5. Expresso × inferido", "alerta"), ("6–7. Comparar e eliminar", "erro", "acréscimo, distorção, contradição"), ("8. Responder exatamente", "ok")]),
), ["N0048"])
m("Denotação, conotação, figuras e ambiguidade", 11)
m("Linguagem verbal, não verbal e multissemiótica", 12)
m("Intertextualidade e contexto", 13)
m("Método prático para resolver questões", 14)
