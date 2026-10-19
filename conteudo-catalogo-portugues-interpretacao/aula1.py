from helpers import sec, ex, P, Q, fluxo, comp, m

# ---------------------------------------------------------------- Card 1 — Entenda o conceito
sec("introducao", "Módulo 1 — Fundamentos da leitura e da interpretação", r"""
**Interpretar texto é a habilidade mais cobrada em Língua Portuguesa nos concursos** — e não é "dom": é método. Nesta aula você vai aprender a ler como a banca lê: separando o que o texto **diz**, o que ele **permite concluir** e o que ele **não autoriza**.

### 1.1 O que é texto
📘 **Conceito:** texto é uma unidade de sentido produzida para comunicar algo a alguém, numa situação concreta. Pode ser verbal (palavras), não verbal (imagem, gesto, cor) ou misto (charge, anúncio, infográfico).
🗣️ **Em linguagem simples:** texto não é "um monte de frases". É uma mensagem completa, com assunto, propósito e destinatário. Uma placa "PARE" é texto; uma lista de palavras soltas sem relação, não.
🔎 **Quatro elementos que você sempre deve observar:**
| Elemento | Pergunta que você faz | Exemplo |
|---|---|---|
| **Texto** | O que está escrito (ou mostrado)? | "Vacine-se até sexta-feira." |
| **Contexto** | Em que situação, época e lugar ele circula? | Campanha de saúde pública em período de surto |
| **Finalidade** | Para que ele foi produzido? | Levar o leitor a agir (vacinar-se) |
| **Leitor** | Para quem ele foi feito? | População em geral |

### 1.2 Compreensão × interpretação
| **Compreensão** | **Interpretação** |
|---|---|
| Identifica o que está **expresso** no texto. | Constrói **conclusões justificadas** pelas pistas textuais. |
| Localiza informações e relações **explícitas**. | Identifica sentidos, intenções e consequências **autorizadas** pelo texto. |
| Pergunta típica: "Segundo o texto…", "De acordo com o autor…" | Pergunta típica: "Infere-se do texto…", "O texto permite concluir…", "Depreende-se…" |

⚠️ **Atenção:** compreensão e interpretação **se relacionam** — não há interpretação correta sem compreensão correta. E as bancas **nem sempre** usam esses termos com separação rígida: às vezes "interpretação" aparece num enunciado que só pede para localizar uma informação. **Leia o comando, não o rótulo.**

### 1.3 Informação explícita × informação implícita
- **Explícita:** está **escrita**. Você consegue apontar a frase. Ex.: *"O concurso terá 300 vagas."* → há 300 vagas.
- **Implícita:** **não está escrita**, mas o texto **obriga** ou **autoriza** a conclusão a partir de pistas. Ex.: *"Pedro voltou a fumar."* → implícito: Pedro já fumou e parou.

🧪 **Exemplo comparativo** — texto: *"Apesar da chuva forte, o jogo começou no horário."*
| Afirmação | Classificação |
|---|---|
| O jogo começou no horário. | **Explícita** (está escrita) |
| A chuva poderia ter atrasado o jogo. | **Implícita autorizada** (o "apesar de" indica expectativa contrária) |
| O jogo foi cancelado no segundo tempo. | **Não autorizada** (o texto não fala disso) |
| Os jogadores reclamaram da chuva. | **Extrapolação** (acrescenta fato inexistente) |

### 1.4 Resposta apoiada no texto × opinião pessoal
🎯 **Regra de ouro:** a resposta certa **sempre tem lastro no texto**. Se, para defender uma alternativa, você precisa dizer "mas na vida real…" ou "eu acho que…", ela provavelmente está errada.
- **Apoiada no texto:** você consegue apontar a palavra, a frase ou a relação que sustenta a conclusão.
- **Opinião pessoal:** depende do que **você** pensa sobre o assunto, não do que o **autor** escreveu.

### 1.5 Por que uma alternativa pode parecer lógica e, mesmo assim, estar errada
As bancas criam alternativas **verdadeiras no mundo**, mas **sem apoio no texto**. Ex.: texto sobre aumento de furtos de celulares em um bairro → alternativa: *"A falta de policiamento é a principal causa da criminalidade."* Pode até ser uma tese defensável, mas **o texto não disse isso**. Em prova de interpretação, **o que vale é o texto**, não o mundo.
🚨 **Pegadinha:** "Faz sentido, então está certo." → **Errado.** Faz sentido ≠ está no texto.
🛡️ **Como não errar:** para cada alternativa, pergunte **"onde está isso no texto?"**. Sem resposta → elimine.
✍️ **Fixação:** no texto *"Muitos candidatos estudam à noite"*, a alternativa *"A maioria dos candidatos trabalha durante o dia"* é explícita, implícita ou extrapolação? → **Extrapolação** (o texto não fala de trabalho, e "muitos" não é "a maioria").
""" + ex(
    "Um enunciado traz: \"Desde que a biblioteca passou a abrir aos sábados, o número de estudantes que a frequentam dobrou.\" A alternativa diz: \"A biblioteca não abria aos sábados antes da mudança.\"",
    "A alternativa é explícita, implícita autorizada ou extrapolação?",
    "**Implícita autorizada.** A expressão **\"passou a abrir\"** pressupõe que antes ela **não** abria aos sábados — a conclusão é obrigatória a partir do texto. Já uma alternativa como \"os estudantes preferem estudar no fim de semana\" seria **extrapolação**: o texto fala de aumento de frequência, não de preferência.",
    [Q("escola", "Uma candidata lê o aviso da biblioteca.", [P("cidadao", "esq", "aponta", "neutro", "documento"), P("professor", "dir", "fala", "feliz")], fala=(1, "\"Passou a abrir\": o que isso pressupõe?")),
     Q("escola", "Ela encontra a pista no próprio texto.", [P("cidadao", "centro", "fala", "surpreso")], fala=(0, "Que antes não abria aos sábados!"))],
    "Implícito autorizado | ok",
    fluxo("Explícito, implícito ou extrapolação?", [("Está escrito?", "neutro", "Sim → explícito"), ("Uma pista do texto obriga a conclusão?", "ok", "Sim → implícito autorizado"), ("Depende de algo que o texto não diz?", "erro", "Sim → extrapolação")], ("Sempre: aponte a pista no texto", "alerta")),
), ["N0001", "N0002", "N0003", "N0004", "N0005"])
m("Fundamentos da leitura e interpretação", 1)
