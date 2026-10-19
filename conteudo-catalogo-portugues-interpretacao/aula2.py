from helpers import sec, ex, P, Q, fluxo, comp, m

sec("explicacao", "Módulo 2 — Gênero textual × tipo textual e os cinco tipos", r"""
### 2.1 A diferença que mais derruba candidatos
📘 **Tipo textual** (ou **sequência textual**) é o **modo de organização** do texto: narrar, descrever, expor, argumentar, instruir. São **poucos** (cinco, na classificação mais usada em provas) e definidos por **traços linguísticos** (tempos verbais, conectivos, estrutura).
📘 **Gênero textual** é a **forma social** concreta em que o texto circula: notícia, receita, edital, charge, e-mail. São **inúmeros**, reconhecidos pela **função social, pelo suporte, pelo estilo e pela forma de composição**.
🗣️ **Em linguagem simples:** o gênero é a "embalagem social" (receita, notícia); o tipo é o "jeito de montar o conteúdo" lá dentro (instruir, narrar). Uma **receita** (gênero) é predominantemente **injuntiva** (tipo), mas costuma ter uma parte **descritiva** (lista de ingredientes).
⚠️ **Um gênero pode combinar vários tipos.** A **notícia** narra o fato, descreve o local e pode expor dados. O que a banca pede, em geral, é o tipo **predominante**.
⚠️ **O gênero não se identifica pelo assunto.** Um texto sobre segurança pública pode ser notícia, editorial, charge ou campanha. O que define o gênero é **finalidade + forma + circulação**, não o tema.

### 2.2 Os cinco tipos textuais
**1) Narração**
- **Definição:** relato de **ações** encadeadas no **tempo**, envolvendo personagens.
- **Características:** fatos em sequência, narrador, personagens, tempo, espaço, conflito e desfecho.
- **Finalidade:** contar o que aconteceu (real ou ficcional).
- **Marcas linguísticas:** verbos de ação no **pretérito perfeito/imperfeito**; marcadores temporais (*depois, no dia seguinte, quando*).
- **Exemplo autoral:** *"Às 6h, o agente assumiu o plantão. Uma hora depois, o alarme do pavilhão B disparou, e ele correu para verificar."*
- **Como cai:** "O texto é predominantemente narrativo porque…"; identificar o narrador ou a sequência dos fatos.
- 🚨 **Pegadinha:** confundir narração com **relato** jornalístico (gênero notícia) — a notícia **usa** a narração, mas o gênero é outro.

**2) Descrição**
- **Definição:** **retrato** de seres, objetos, lugares ou processos, como uma "fotografia em palavras".
- **Características:** caracterização, simultaneidade (não há progressão temporal), detalhamento.
- **Finalidade:** fazer o leitor "ver" o que é descrito.
- **Marcas linguísticas:** **adjetivos**, verbos de estado/ligação (*ser, estar, parecer, ter*), presente ou pretérito imperfeito, enumerações.
- **Exemplo autoral:** *"A sala era estreita, com paredes cinzentas e uma janela alta, protegida por grades enferrujadas."*
- **Como cai:** "No trecho X predomina a descrição"; identificar a função dos adjetivos.
- 🚨 **Pegadinha:** achar que **todo** texto com adjetivos é descritivo — num artigo de opinião, adjetivos podem ser **avaliativos** (argumentação).

**3) Exposição (dissertação expositiva)**
- **Definição:** **apresenta e explica** informações, conceitos ou dados, sem defender abertamente uma tese.
- **Características:** linguagem objetiva, definições, exemplos, classificações, dados.
- **Finalidade:** informar, explicar, ensinar.
- **Marcas linguísticas:** presente atemporal (*o sistema funciona…*), terceira pessoa, conectivos explicativos (*isto é, por exemplo*).
- **Exemplo autoral:** *"A audiência de custódia é a apresentação do preso em flagrante a um juiz, que avalia a legalidade e a necessidade da prisão."*
- **Como cai:** distinguir exposição de argumentação; identificar definição e exemplificação.
- 🚨 **Pegadinha:** classificar como argumentativo um texto apenas porque trata de tema polêmico — se ele só **explica**, é expositivo.

**4) Argumentação (dissertação argumentativa)**
- **Definição:** defende um **ponto de vista (tese)** com **argumentos** para convencer o leitor.
- **Características:** tese, argumentos (dados, exemplos, autoridade, causa e consequência), contra-argumentação, conclusão.
- **Finalidade:** persuadir.
- **Marcas linguísticas:** conectivos de causa, conclusão e oposição (*porque, portanto, embora, no entanto*), modalizadores (*é preciso, certamente*), adjetivos e advérbios **avaliativos**.
- **Exemplo autoral:** *"Investir em formação continuada dos policiais é urgente, pois agentes mais bem preparados erram menos e protegem melhor a população."*
- **Como cai:** identificar a tese, separar tese de argumento, reconhecer a estratégia argumentativa.
- 🚨 **Pegadinha:** tomar um **argumento** pela **tese** (ex.: "agentes preparados erram menos" é argumento; a tese é "investir em formação é urgente").

**5) Injunção (texto instrucional)**
- **Definição:** **orienta** o leitor a fazer algo, passo a passo, ou estabelece condutas.
- **Características:** sequência de comandos, ordem de execução, objetividade.
- **Finalidade:** levar o leitor a **agir**.
- **Marcas linguísticas:** verbos no **imperativo** (*misture, preencha, apresente*) ou **infinitivo** com valor de ordem (*Não fumar*), numeração, futuro do presente com valor de ordem (*o candidato deverá…*).
- **Exemplo autoral:** *"Leia o comando da questão, sublinhe as palavras restritivas e só então compare as alternativas com o texto."*
- **Como cai:** receitas, manuais, editais (parte de instruções), campanhas.
- 🚨 **Pegadinha:** achar que o imperativo **sempre** indica injunção — em propaganda, o imperativo (*"Experimente!"*) serve à **persuasão**.

🧠 **Resumo:** narrar (ações no tempo) · descrever (características) · expor (explicar) · argumentar (convencer) · injungir (orientar a agir).
""" + ex(
    "Um texto diz: \"Para renovar a CNH, agende o exame médico, reúna os documentos e compareça à unidade na data marcada. O procedimento é simples e rápido.\"",
    "Qual é o tipo predominante? Há outro tipo presente?",
    "Predomina a **injunção**: verbos no imperativo (*agende, reúna, compareça*) orientam o leitor a agir. A última frase (*O procedimento é simples e rápido*) traz uma **avaliação** — marca leve de argumentação/persuasão. Lembre: um gênero (aqui, um comunicado/orientação) pode **combinar tipos**; a banca costuma pedir o **predominante**.",
    [Q("reparticao", "O servidor entrega o aviso ao cidadão.", [P("servidor", "esq", "fala", "feliz", "documento"), P("cidadao", "dir", "neutro", "neutro")], fala=(0, "Agende, reúna e compareça!")),
     Q("reparticao", "O cidadão percebe os verbos de comando.", [P("cidadao", "centro", "aponta", "surpreso", "documento")], fala=(0, "Imperativo: texto injuntivo."))],
    "Injunção predominante | ok",
    comp("Gênero × tipo", ("Gênero", "Forma social", "neutro", ["Notícia, receita, edital", "Função + suporte + estilo", "Inúmeros"]), ("Tipo", "Modo de organizar", "alerta", ["Narrar, descrever, expor", "Argumentar, instruir", "Cinco tipos"])),
), ["N0006", "N0007", "N0008"])

sec("explicacao", "Módulo 2 — Os principais gêneros textuais e suas pistas", r"""
Para cada gênero: **finalidade · características · pistas de identificação**. Lembre-se: identifique pela **função e pela forma**, não pelo assunto.

| Gênero | Finalidade | Características | Pistas de identificação |
|---|---|---|---|
| **Notícia** | Informar um fato recente | Linguagem objetiva, 3ª pessoa, lide (o quê, quem, quando, onde, como, por quê) | Título informativo, data, fato atual, fontes citadas |
| **Reportagem** | Aprofundar um tema | Mais extensa, entrevistas, dados, contexto | Várias fontes, investigação, subtítulos |
| **Editorial** | Expressar a opinião **do veículo** | Argumentativo, sem assinatura individual | Posicionamento institucional ("este jornal entende…") |
| **Artigo de opinião** | Defender a opinião **do autor** | Argumentativo, assinado | Tese pessoal, 1ª pessoa possível, assinatura |
| **Crônica** | Refletir sobre o cotidiano com leveza | Narrativa curta, humor/lirismo, linguagem próxima da oral | Fato banal que vira reflexão; publicação em jornal/revista |
| **Conto** | Narrar ficção curta | Poucos personagens, conflito único, desfecho | Narrador, enredo ficcional, tensão |
| **Poema** | Expressão estética | Versos, ritmo, imagens, conotação | Estrofes, sonoridade, linguagem figurada |
| **Charge** | Criticar um fato atual com humor | Imagem + texto curto, caricatura | Remete a acontecimento da época; ironia |
| **Tira / HQ** | Narrar com humor em quadrinhos | Sequência de quadros, balões, desfecho surpreendente | Quadros, onomatopeias, quebra de expectativa |
| **Propaganda / anúncio** | Vender produto, serviço ou ideia | Persuasão, apelo emocional, imperativo, slogan | Marca, chamada para ação, imagem atrativa |
| **Campanha de utilidade pública** | Mudar comportamento em benefício coletivo | Persuasiva, sem fim comercial | Órgão público ou ONG, tema de saúde/segurança/cidadania |
| **Receita** | Ensinar a preparar | Ingredientes (descrição) + modo de preparo (injunção) | Lista + imperativos/infinitivos |
| **Manual de instruções** | Orientar o uso | Passos numerados, advertências | Imperativo, ilustrações, avisos de segurança |
| **Edital** | Tornar pública uma regra/convocação oficial | Formal, normativo, itens numerados | Órgão emissor, prazos, requisitos, "fica estabelecido" |
| **E-mail / mensagem** | Comunicar algo a destinatário específico | Saudação, assunto, despedida; registro varia | Remetente, destinatário, vocativo |
| **Infográfico** | Explicar visualmente dados ou processos | Texto + gráficos, ícones, setas | Dados quantitativos, leitura não linear |
| **Texto científico / divulgação científica** | Divulgar conhecimento | Linguagem técnica (científico) ou acessível (divulgação), dados, fontes | Pesquisas citadas, termos explicados |
| **Relato** | Contar experiência vivida | Narrativo, 1ª pessoa frequente | "Eu", lembranças, experiência pessoal |
| **Entrevista** | Apresentar falas de alguém sobre um tema | Perguntas e respostas | Estrutura P/R, identificação do entrevistado |
| **Resenha** | Descrever e **avaliar** uma obra | Resumo + opinião | Dados da obra, juízo de valor |
| **Comunicado oficial** | Informar decisão ou orientação de uma instituição | Formal, impessoal, objetivo | Timbre/assinatura institucional, data, destinatários |

### Combinações que caem em prova
- **Notícia × reportagem:** a notícia relata o **fato**; a reportagem **aprofunda** o tema com investigação e várias fontes.
- **Editorial × artigo de opinião:** ambos argumentam; o **editorial** expressa a voz do **veículo** (sem assinatura), o **artigo**, a do **autor** (assinado).
- **Propaganda × campanha:** a propaganda busca **lucro**; a campanha de utilidade pública busca **comportamento social** (ainda que use as mesmas estratégias persuasivas).
- **Crônica × conto:** a crônica parte do **cotidiano real** e reflete com leveza; o conto é **ficção** com conflito estruturado.
- **Charge × tira:** a charge costuma ser **um quadro** e depende de **fato atual**; a tira é uma **sequência** de quadros e pode ser atemporal.

🚨 **Pegadinha:** "Como o texto fala de vacinação, é uma notícia." → **Errado.** Pode ser campanha, artigo, infográfico… o **assunto não define o gênero**.
🛡️ **Como não errar:** pergunte **"para que este texto existe e onde ele circularia?"**.
✍️ **Fixação:** texto curto, assinado por um delegado, defendendo mais investimentos em perícia, publicado na seção "Opinião" de um jornal → **artigo de opinião** (voz individual, assinada, argumentativa).
""" + ex(
    "Num ônibus há um cartaz: imagem de um celular quebrado ao lado de um capacete e a frase \"No trânsito, a mensagem pode esperar. Você, não.\" — assinado pelo Departamento de Trânsito.",
    "Qual o gênero? Por que não é propaganda comercial?",
    "**Campanha de utilidade pública.** O objetivo é mudar um comportamento (não usar celular no trânsito) em benefício coletivo, e o emissor é um órgão público. Usa estratégias **persuasivas** (apelo emocional, jogo de palavras com \"mensagem\"), mas **não vende** produto — por isso não é propaganda comercial.",
    [Q("rua", "No ponto de ônibus, o cartaz chama a atenção.", [P("cidadao", "esq", "aponta", "surpreso", "celular"), P("servidor", "dir", "fala", "serio")], fala=(1, "Quem assina é o órgão de trânsito.")),
     Q("rua", "A finalidade fica clara.", [P("cidadao", "centro", "fala", "feliz")], fala=(0, "Não vende nada: muda comportamento!"))],
    "Campanha, não propaganda | ok",
    fluxo("Como identificar o gênero", [("Qual a finalidade?", "neutro", "Informar, convencer, instruir, vender…"), ("Quem fala e onde circula?", "neutro", "Veículo, autor, órgão público"), ("Que forma ele tem?", "alerta", "Quadros, itens, versos, lide…")], ("Assunto NÃO define o gênero", "erro")),
), ["N0006", "N0009"])
m("Gêneros textuais e tipos textuais", 2, 3)
