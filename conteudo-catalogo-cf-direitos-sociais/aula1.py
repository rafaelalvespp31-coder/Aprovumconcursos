from helpers import *

# ============================================================== 1 — Introdução
sec("introducao", "Módulo 1 — Introdução: direitos sociais na Constituição (arts. 6º a 11)", """
**Direitos sociais** são direitos fundamentais ligados às **condições materiais de vida**, à **dignidade**, ao **trabalho**, à **proteção social** e à **participação na comunidade**. Estão no **Capítulo II do Título II** da Constituição (arts. 6º a 11) e são desenvolvidos no **Título VIII — Da Ordem Social** (saúde, previdência, assistência, educação etc.).

| Artigo | Conteúdo |
|---|---|
| **6º** | Rol geral dos direitos sociais + **renda básica familiar** (parágrafo único) |
| **7º** | Direitos dos **trabalhadores urbanos e rurais** (34 incisos) + **domésticos** (parágrafo único) |
| **8º** | **Liberdade e organização sindical** |
| **9º** | **Direito de greve** |
| **10** | Participação de trabalhadores e empregadores em **colegiados de órgãos públicos** |
| **11** | **Representante dos empregados** nas empresas com mais de 200 empregados |

🎯 **O que mais cai em concursos policiais:** o rol do art. 6º (e as emendas que incluíram direitos), números do art. 7º (8h/44h, 6h nos turnos de revezamento, 50% da hora extra, 1/3 de férias, 120 dias de licença, 30 dias de aviso, 5 anos/2 anos de prescrição, idades de 14/16/18 anos), unicidade sindical, estabilidade do dirigente e a **proibição de greve para policiais e militares**.

📘 **Distinção que a banca cobra:** o texto constitucional traz a **regra**; a **CLT** e as **leis** trazem os detalhes; a **jurisprudência** resolve as controvérsias. Não confunda as três fontes.

**Mapa da aula:**
- **Teoria:** conceito, natureza prestacional, eficácia, mínimo existencial × reserva do possível, vedação ao retrocesso, judicialização
- **Art. 6º:** os 11 direitos + renda básica familiar
- **Art. 7º:** inciso por inciso, com quadro de regra, exceção, requisito e pegadinha
- **Arts. 8º a 11:** sindicatos, greve, participação
- **Revisão:** jurisprudência, quadros, pegadinhas, mapa mental, revisão relâmpago e literalidade
""" + ex(
    "Um município deixa de oferecer vaga em creche a uma criança de 3 anos, alegando falta de verba e que a educação infantil é 'meta programática'.",
    "A família pode exigir a vaga na Justiça?",
    "**Sim.** O STF (Tema 548) fixou que a **educação básica**, incluída a **educação infantil em creche e pré-escola**, é direito fundamental **exigível judicialmente** — o poder público tem o dever jurídico de garantir a vaga. Direitos sociais não são simples recomendações políticas.",
    [Q("escola", "A mãe procura a creche municipal.", [P("cidadao", "esq", "fala", "triste"), P("servidor", "dir", "bracos_cruzados", "neutro")], (1, "Não há vaga nem verba.")),
     Q("forum", "O caso chega ao Judiciário.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Creche é direito exigível."))],
    "Direito social exigível | ok",
    fluxo("Vaga em creche (Tema 548 do STF)", [("Criança de 0 a 5 anos", "neutro"), ("Pedido de vaga negado", "erro"), ("Ação judicial", "neutro")], ("Município deve garantir a vaga", "ok"))),
    N(1, 6, 11, 24, 31, 36, 39, 40))
m("Introdução aos direitos sociais", 1)

# ============================================================== 2 — Natureza, eficácia, mínimo existencial
sec("conceitos_fundamentais", "Módulo 1 — Natureza dos direitos sociais, eficácia, mínimo existencial, reserva do possível e vedação ao retrocesso", """
### Conceito e natureza

Direitos sociais são direitos fundamentais de **segunda dimensão** (valor **igualdade material**). Muitos exigem **prestações positivas** do Estado (serviços públicos, políticas públicas, benefícios), mas **não são simples recomendações políticas sem valor jurídico**: têm **força normativa**, vinculam os Poderes e podem ser exigidos judicialmente nas condições reconhecidas pela jurisprudência.

📌 Alguns direitos sociais têm natureza **de defesa** (liberdade): a **liberdade sindical** e o **direito de greve**, por exemplo, exigem principalmente que o Estado **não interfira**.

### Eficácia

- Aplica-se o art. 5º, **§ 1º** (aplicação imediata), que fala em **direitos e garantias fundamentais** em geral.
- Muitas normas sociais são de **eficácia limitada** ou **programáticas** (dependem de lei ou de políticas), mas mesmo elas têm eficácia **negativa**: impedem leis contrárias e orientam a interpretação.
- Quando a falta de norma **inviabiliza** o exercício do direito, cabem **mandado de injunção** e **ação direta de inconstitucionalidade por omissão** (Parte IV). Exemplo: o STF reconheceu a omissão na regulamentação da **licença-paternidade** (ADO 20, 2023).

---

### Mínimo existencial × reserva do possível

| | **Mínimo existencial** | **Reserva do possível** |
|---|---|---|
| Ideia | Núcleo de condições **indispensáveis** a uma vida digna (saúde básica, educação fundamental, assistência aos desamparados, acesso à justiça) | O Estado tem **recursos limitados**; prestações dependem de **disponibilidade orçamentária** e de escolhas legítimas |
| Quem invoca | Em regra, quem pede a prestação | Em regra, o Estado |
| Peso | Funciona como **limite** à alegação de falta de recursos | **Não pode ser usada de forma genérica** para esvaziar direitos; o Estado deve **comprovar** a impossibilidade concreta |
| Origem | Doutrina e jurisprudência alemãs e brasileiras | Jurisprudência alemã (caso *numerus clausus*) |

⚠️ **Equilíbrio:** nenhum dos conceitos é **fórmula automática**. O mínimo existencial não autoriza conceder **qualquer** prestação pedida, e a reserva do possível não autoriza **negar** prestações essenciais com uma alegação abstrata de falta de verba.

### Vedação ao retrocesso social (efeito *cliquet*)

Princípio de origem doutrinária, acolhido em julgados do STF: uma vez concretizado por lei um direito social, o Estado **não pode simplesmente suprimi-lo** sem medidas compensatórias, esvaziando seu núcleo. Não impede **reformas**; impede **retrocessos arbitrários** que atinjam o núcleo essencial.

### Princípio da progressividade

Os tratados de direitos econômicos, sociais e culturais (como o **PIDESC** e o **Protocolo de San Salvador**) impõem a realização **progressiva** desses direitos, até o máximo dos recursos disponíveis.
""", N(2, 3, 4))
m("Teoria dos direitos sociais", 2)

# ============================================================== 3 — Judicialização
sec("aprofundamento", "Módulo 1 — Judicialização de políticas públicas: saúde, educação e os limites do Judiciário", """
O Judiciário pode determinar que o poder público cumpra direitos sociais? **Sim, com parâmetros.** A separação de Poderes não impede o controle judicial quando há **omissão** ou **deficiência grave**, mas o juiz não deve substituir o administrador nas escolhas legítimas de política pública.

### Tema 698 do STF (RE 684.612, 2023) — parâmetros para a intervenção

Em resumo didático, o STF fixou que:
1. A intervenção do Judiciário em políticas públicas voltadas à realização de direitos fundamentais, em caso de **ausência ou deficiência grave do serviço**, **não viola** a separação de Poderes.
2. A decisão judicial, como regra, deve **apontar as finalidades** a serem alcançadas e determinar que a **Administração apresente um plano** e/ou os meios para atingi-las, em vez de determinar medidas pontuais.
3. Deve-se considerar a **capacidade institucional** dos órgãos e as escolhas técnicas da Administração.

### Saúde (art. 196)

A saúde é **direito de todos e dever do Estado**. Pontos jurisprudenciais:
- **Responsabilidade solidária** dos entes federados (União, Estados, DF e Municípios) nas demandas de saúde, cabendo ao juiz direcionar o cumprimento conforme as regras de repartição de competências — **Tema 793** (RE 855.178).
- **Medicamentos sem registro na Anvisa:** em regra, o Estado **não é obrigado** a fornecer; excepcionalmente, sim, em caso de mora irrazoável da Anvisa e presentes requisitos — **Tema 500** (RE 657.718). Medicamentos **experimentais** não podem ser exigidos.
- **Medicamentos registrados, mas não incorporados ao SUS:** o STF fixou requisitos cumulativos e rigorosos para a concessão judicial (**Tema 6** — RE 566.471) e organizou a competência e o custeio entre os entes (**Tema 1.234**); em 2024 editou as **Súmulas Vinculantes 60 e 61** sobre o tema.

### Educação (arts. 205 a 214)

- A **educação básica** é obrigatória e gratuita dos **4 aos 17 anos** (art. 208, I).
- **Educação infantil em creche e pré-escola** (até 5 anos) é direito **exigível judicialmente**: **Tema 548** (RE 1.008.166, 2022).
- O acesso ao ensino obrigatório e gratuito é **direito público subjetivo** (art. 208, § 1º) — sua oferta irregular importa **responsabilidade da autoridade competente** (§ 2º).

### Segurança pública

A segurança aparece duas vezes: como **direito individual** (caput do art. 5º — segurança jurídica e pessoal) e como **direito social** (art. 6º). O art. 144 diz que a segurança pública é **dever do Estado, direito e responsabilidade de todos**. A **Polícia Penal** foi incluída no art. 144 pela **EC 104/2019**.
""" + ex(
    "Um paciente com doença rara pede, na Justiça, que o Estado forneça um medicamento importado ainda em fase experimental, sem registro em nenhum país.",
    "O Estado é obrigado a fornecer?",
    "**Não.** Pelo **Tema 500** do STF, o Estado não pode ser obrigado a fornecer **medicamentos experimentais**. Mesmo para remédios sem registro na Anvisa, o fornecimento é **excepcional** e depende de requisitos (como mora irrazoável da agência e registro em agências estrangeiras renomadas).",
    [Q("hospital", "O paciente recebe a prescrição do remédio experimental.", [P("cidadao", "esq", "pega", "triste", "documento"), P("servidor", "dir", "neutro", "serio")], (1, "Não temos esse medicamento.")),
     Q("forum", "O juiz aplica a tese do STF.", [P("juiz", "centro", "fala", "serio")], (0, "Experimental não pode ser exigido."))],
    "Experimental: não | erro",
    comp("Medicamentos e o Judiciário", ("Experimental", "Não pode ser exigido", "erro", ["sem eficácia comprovada", "Tema 500"]), ("Registrado e não incorporado", "Requisitos rigorosos", "alerta", ["Tema 6 e SV 61", "análise caso a caso"]))),
    N(5))
m("Teoria dos direitos sociais", 3)

# ============================================================== 4 — Art. 6º
sec("explicacao", "Módulo 2 — Art. 6º: o rol dos direitos sociais e a renda básica familiar", """
### O caput do art. 6º (redação vigente)

São direitos sociais: a **educação**, a **saúde**, a **alimentação**, o **trabalho**, a **moradia**, o **transporte**, o **lazer**, a **segurança**, a **previdência social**, a **proteção à maternidade e à infância** e a **assistência aos desamparados**, na forma desta Constituição.

**Macete — "EDU-SA-ALI-TRA-MO-TRANS-LA-SE-PRE-PRO-AS":** ou, para memorizar em bloco:
- **Os do texto original:** educação, saúde, trabalho, lazer, segurança, previdência social, proteção à maternidade e à infância, assistência aos desamparados.
- **Incluídos por emenda (os três que mais caem):**

| Direito | Emenda | Ano |
|---|---|---|
| **Moradia** | EC **26** | **2000** |
| **Alimentação** | EC **64** | **2010** |
| **Transporte** | EC **90** | **2015** |

**Ordem de inclusão — "MAT":** **M**oradia (2000) → **A**limentação (2010) → **T**ransporte (2015).

⚠️ **Não estão no rol do art. 6º** (pegadinhas comuns): **meio ambiente** (art. 225), **cultura** e **desporto** como itens autônomos do art. 6º, **felicidade** (houve proposta de emenda, não aprovada), **água** e **internet** como direitos expressos do art. 6º. Cuidado: alguns desses estão protegidos **em outras partes** da Constituição, mas **não** nesse rol.

### Parágrafo único — renda básica familiar (EC 114/2021)

Todo brasileiro em situação de **vulnerabilidade social** terá direito a uma **renda básica familiar**, garantida pelo poder público em **programa permanente de transferência de renda**, cujas normas e requisitos de acesso serão determinados **em lei**, observada a **legislação fiscal e orçamentária**.

Pontos de prova:
- Titular: **brasileiro** em situação de **vulnerabilidade social**.
- Natureza: **programa permanente** de transferência de renda.
- Dependência de **lei** (requisitos de acesso) e respeito à **legislação fiscal e orçamentária**.
- Antes da emenda, o STF já havia determinado a implementação da renda básica de cidadania prevista na **Lei 10.835/2004** para a população em extrema pobreza (MI 7.300, 2021).

### Breve leitura de cada direito

| Direito | Onde é desenvolvido na CF | Ideia-chave |
|---|---|---|
| Educação | arts. 205 a 214 | Direito de todos e dever do Estado e da família; ensino obrigatório dos 4 aos 17 anos |
| Saúde | arts. 196 a 200 | Direito de todos e dever do Estado; SUS com acesso universal e igualitário |
| Alimentação | art. 6º; políticas de segurança alimentar | Combate à fome |
| Trabalho | arts. 7º a 11 e 170 | Valor social do trabalho (art. 1º, IV) |
| Moradia | arts. 6º, 23, IX, 183 | Programas habitacionais; usucapião urbana |
| Transporte | arts. 6º e 30, V | Transporte coletivo como serviço essencial (art. 30, V) |
| Lazer | arts. 6º, 217, § 3º, 227 | Incentivo ao lazer como forma de promoção social |
| Segurança | arts. 6º e 144 | Dever do Estado, direito e responsabilidade de todos |
| Previdência social | arts. 201 e 202 | **Contributiva** e de filiação obrigatória |
| Proteção à maternidade e à infância | arts. 7º, XVIII e XXV; 201, II; 203, I; 227 | Prioridade absoluta à criança |
| Assistência aos desamparados | arts. 203 e 204 | **Independe de contribuição** |

📌 **Previdência × assistência:** a **previdência** exige **contribuição**; a **assistência social** é prestada **a quem dela necessitar, independentemente de contribuição** (art. 203). A banca troca uma pela outra.
""", N(7, 8, 9, 10))
m("Art. 6º — rol dos direitos sociais", 4)
