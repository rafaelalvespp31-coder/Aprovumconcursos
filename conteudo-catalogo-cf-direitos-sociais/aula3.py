from helpers import *

# ============================================================== 13 — Art. 8º I a III
sec("explicacao", "Módulo 4 — Art. 8º (1/2): fundação de sindicatos, unicidade sindical e defesa da categoria (incisos I a III)", """
O caput do art. 8º afirma que é **livre a associação profissional ou sindical**, observadas as regras dos incisos.

### I — Fundação e autonomia

A lei **não poderá exigir autorização do Estado** para a fundação de sindicato, **ressalvado o registro no órgão competente**, **vedadas ao Poder Público a interferência e a intervenção** na organização sindical.

- O **registro** não é autorização: serve para verificar a **unicidade sindical**. Segundo o STF (**Súmula 677**), até que a lei disponha a respeito, incumbe ao **Ministério do Trabalho** proceder ao registro e zelar pela unicidade.
- O sindicato adquire **personalidade jurídica** com o registro civil, mas a **representação da categoria** depende do registro sindical.

### II — Unicidade sindical

É **vedada a criação de mais de uma organização sindical**, **em qualquer grau**, representativa de **categoria profissional ou econômica**, **na mesma base territorial**, que será definida pelos **trabalhadores ou empregadores interessados**, **não podendo ser inferior à área de um Município**.

| Elemento | Regra |
|---|---|
| Quantos sindicatos por categoria e base? | **Apenas um** (unicidade) |
| Em qual grau? | **Em qualquer grau** (sindicato, federação, confederação) |
| Quem define a base territorial? | Os **trabalhadores ou empregadores interessados** — **não** o Estado |
| Área mínima | **Um Município** |

📌 **Unicidade × pluralidade × unidade:** o Brasil adota a **unicidade** (imposta pela CF). A **pluralidade** (vários sindicatos concorrendo) é o modelo da **Convenção 87 da OIT**, **não ratificada** pelo Brasil justamente por isso. A **unidade** seria a escolha **espontânea** de um único sindicato, sem imposição legal.

⚠️ **Pegadinhas:**
- "A base territorial mínima é o Estado." **Errado** — **Município**.
- "A base territorial é definida pelo Ministério do Trabalho." **Errado** — pelos **interessados**.
- "A Constituição adota a pluralidade sindical." **Errado** — **unicidade**.

### III — Defesa da categoria

Ao sindicato cabe a **defesa dos direitos e interesses coletivos ou individuais da categoria**, **inclusive em questões judiciais ou administrativas**.

📌 O STF entende que o sindicato atua como **substituto processual** de **toda a categoria** (filiados ou não), na defesa de direitos coletivos **e individuais homogêneos**, tanto na fase de conhecimento quanto na **liquidação e execução**, **independentemente de autorização** dos substituídos (RE 883.642 — Tema 823).

| | Associação (art. 5º, XXI) | Sindicato (art. 8º, III) |
|---|---|---|
| Natureza da atuação | **Representação** | **Substituição processual** |
| Autorização dos membros | **Expressa** | **Dispensada** |
| Quem é beneficiado | Filiados que autorizaram | **Toda a categoria** |
""", N(25, 26, 27))
m("Arts. 8º a 11 — sindicatos, greve e participação", 13)

# ============================================================== 14 — Art. 8º IV a VIII
sec("explicacao", "Módulo 4 — Art. 8º (2/2): contribuições, filiação, negociação, aposentado, estabilidade do dirigente e sindicatos rurais (IV a VIII e p. ú.)", """
### IV — Contribuições

A **assembleia geral** fixará a contribuição que, em se tratando de **categoria profissional**, será **descontada em folha**, para custeio do **sistema confederativo** da representação sindical respectiva, **independentemente da contribuição prevista em lei**.

**As quatro contribuições — não confunda:**
| Contribuição | Base | Quem paga hoje |
|---|---|---|
| **Confederativa** | art. 8º, IV (fixada em assembleia) | **Só os filiados** — **Súmula Vinculante 40** |
| **Sindical** (antigo "imposto sindical") | "Prevista em lei" — CLT | **Facultativa** desde a **Lei 13.467/2017** (reforma trabalhista), com **autorização prévia e expressa** do trabalhador; o STF julgou constitucional o fim da obrigatoriedade (ADI 5.794) |
| **Assistencial** | Acordo ou convenção coletiva | O STF (**Tema 935**, 2023) admitiu a cobrança de **todos os empregados da categoria, ainda que não sindicalizados**, **desde que assegurado o direito de oposição** |
| **Mensalidade sindical** | Estatuto | Só os associados |

### V a VIII

- **V:** **ninguém** será obrigado a **filiar-se** ou a **manter-se filiado** a sindicato.
- **VI:** é **obrigatória a participação dos sindicatos** nas **negociações coletivas** de trabalho.
- **VII:** o **aposentado filiado** tem direito a **votar e ser votado** nas organizações sindicais.
- **VIII:** é **vedada a dispensa** do empregado **sindicalizado** a partir do **registro da candidatura** a cargo de **direção ou representação sindical** e, **se eleito, ainda que suplente**, **até um ano após o final do mandato**, **salvo** se cometer **falta grave** nos termos da lei.

**Estabilidade do dirigente sindical — linha do tempo:**
**Registro da candidatura** → eleição (titular **ou suplente**) → mandato → **1 ano após o fim do mandato**. Dispensa só por **falta grave**, apurada nos termos da lei (inquérito judicial — CLT).

⚠️ **Pegadinhas:**
- "A estabilidade começa com a posse." **Errado** — com o **registro da candidatura**.
- "O suplente não tem estabilidade." **Errado** — "**ainda que suplente**".
- "A estabilidade termina com o fim do mandato." **Errado** — **um ano após**.
- "O aposentado não pode ser votado no sindicato." **Errado** — se **filiado**, vota e é votado.
- "A contribuição confederativa é exigível de toda a categoria." **Errado** — só dos **filiados** (SV 40).

### Parágrafo único

As disposições do art. 8º aplicam-se à organização de **sindicatos rurais** e de **colônias de pescadores**, atendidas as condições que a lei estabelecer.
""" + ex(
    "Rogério registrou sua candidatura a suplente da diretoria do sindicato em março. Foi eleito suplente em maio. Em junho, a empresa o dispensou sem justa causa.",
    "A dispensa é válida?",
    "**Não.** A estabilidade sindical começa com o **registro da candidatura** e alcança o eleito **ainda que suplente**, até **um ano após o fim do mandato**. Só **falta grave**, apurada nos termos da lei, permitiria a dispensa (art. 8º, VIII).",
    [Q("reparticao", "Rogério registra a candidatura no sindicato.", [P("cidadao", "esq", "pega", "feliz", "documento"), P("servidor", "dir", "neutro", "neutro")], (0, "Candidato a suplente!")),
     Q("reparticao", "Em junho, chega a carta de dispensa.", [P("gestor", "esq", "aponta", "serio", "documento"), P("cidadao", "dir", "neutro", "surpreso")], (1, "Mas eu sou suplente eleito!"))],
    "Suplente tem estabilidade | ok",
    linha("Estabilidade do dirigente sindical", "meses", [(0, "Registro da candidatura", "ok"), (2, "Eleito suplente", "ok"), (3, "Dispensa: inválida", "erro"), (6, "Até 1 ano após o mandato", "alerta")])),
    N(28, 29, 30))
m("Arts. 8º a 11 — sindicatos, greve e participação", 14)

# ============================================================== 15 — Art. 9º Greve
sec("explicacao", "Módulo 5 — Art. 9º: direito de greve no setor privado, no serviço público e a vedação para policiais e militares", """
### O texto constitucional

- **Caput:** é **assegurado o direito de greve**, competindo **aos trabalhadores** decidir sobre a **oportunidade** de exercê-lo e sobre os **interesses** que devam por meio dele defender.
- **§ 1º:** a **lei definirá os serviços ou atividades essenciais** e disporá sobre o **atendimento das necessidades inadiáveis da comunidade**.
- **§ 2º:** os **abusos** cometidos sujeitam os responsáveis às **penas da lei**.

A lei é a **Lei 7.783/1989**, que lista as atividades essenciais (água, energia, saúde, transporte coletivo, telecomunicações, controle de tráfego aéreo, compensação bancária, entre outras) e exige, nelas, a manutenção dos serviços indispensáveis e comunicação prévia de **72 horas** (nas demais atividades, **48 horas**).

### Greve no serviço público

| Grupo | Regra | Fonte |
|---|---|---|
| **Empregados da iniciativa privada** | Direito assegurado; Lei 7.783/1989 | art. 9º |
| **Servidores públicos civis** | Exercido **nos termos e nos limites definidos em lei específica** | **art. 37, VII** |
| **Militares** (Forças Armadas e, por extensão, PMs e bombeiros — art. 42, § 1º) | **Proibidas a sindicalização e a greve** | **art. 142, § 3º, IV** |
| **Policiais civis e servidores que atuam diretamente na segurança pública** | **Vedado o exercício do direito de greve** | **STF, Tema 541** (ARE 654.432, 2017) |

📌 **Servidores civis — omissão legislativa:** como a lei específica não foi editada, o STF, nos **MIs 670, 708 e 712** (2007), determinou a aplicação, **no que couber**, da **Lei 7.783/1989** aos servidores (teoria **concretista geral**).

📌 **Tema 541 — detalhes:** o STF fixou que o exercício do direito de greve, **sob qualquer forma ou modalidade**, é **vedado aos policiais civis** e a **todos os servidores públicos que atuem diretamente na área de segurança pública**, sendo **obrigatória a participação do Poder Público em mediação** instaurada pelos órgãos classistas (CPC, art. 165) para vocalização dos interesses da categoria. Pela própria lógica da tese (servidores que atuam **diretamente** na segurança pública), ela alcança carreiras como a **Polícia Penal** (art. 144, VI, incluído pela EC 104/2019).

📌 **Desconto dos dias parados — Tema 531 (RE 693.456, 2016):** a administração **deve** descontar os dias de paralisação dos servidores, **permitida a compensação** em caso de acordo; o desconto **não** é cabível se a greve foi provocada por **conduta ilícita do Poder Público**.

⚠️ **Pegadinhas:**
- "Os policiais civis podem fazer greve, desde que mantenham os serviços essenciais." **Errado** — vedação total (Tema 541).
- "A greve do servidor civil depende de lei complementar." **Errado** — **lei específica** (ordinária), após a EC 19/1998.
- "Cabe ao sindicato decidir sobre a oportunidade da greve." O texto atribui a decisão **aos trabalhadores** (na prática, por assembleia convocada pelo sindicato).
""" + ex(
    "Policiais penais de um Estado decidem cruzar os braços por melhores salários, mantendo apenas 30% do efetivo nas unidades prisionais.",
    "A paralisação é lícita?",
    "**Não.** Pelo **Tema 541** do STF, o exercício do direito de greve é **vedado**, sob qualquer forma, aos policiais civis e a **todos os servidores que atuem diretamente na segurança pública** — o que abrange a Polícia Penal (art. 144, VI). Manter percentual mínimo não torna a greve lícita. A categoria pode buscar **mediação**, com participação obrigatória do Poder Público.",
    [Q("cela", "Os servidores anunciam a paralisação.", [P("policial_penal", "esq", "fala", "bravo"), P("policial_penal", "dir", "bracos_cruzados", "serio")], (0, "Vamos parar, com 30% na escala.")),
     Q("forum", "O Estado leva o caso ao Judiciário.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Segurança pública não faz greve."))],
    "Greve vedada (Tema 541) | erro",
    comp("Greve no serviço público", ("Servidor civil em geral", "Pode, nos limites da lei", "ok", ["art. 37, VII", "Lei 7.783/1989 no que couber"]), ("Segurança pública e militares", "Vedada", "erro", ["Tema 541 do STF", "art. 142, § 3º, IV"]))),
    N(32, 33, 34, 35))
m("Arts. 8º a 11 — sindicatos, greve e participação", 15)

# ============================================================== 16 — Arts. 10 e 11
sec("explicacao", "Módulo 6 — Arts. 10 e 11: participação dos trabalhadores em colegiados públicos e representante nas empresas", """
### Art. 10 — Colegiados de órgãos públicos

É assegurada a **participação dos trabalhadores e empregadores** nos **colegiados dos órgãos públicos** em que seus **interesses profissionais ou previdenciários** sejam objeto de **discussão e deliberação**.

Exemplos práticos: **Conselho Curador do FGTS**, **Conselho Deliberativo do FAT**, **Conselho Nacional de Previdência Social**.

📌 Note que a participação é de **trabalhadores e empregadores** — não só de trabalhadores.

### Art. 11 — Representante dos empregados

Nas empresas de **mais de 200 empregados**, é assegurada a **eleição de um representante** destes com a **finalidade exclusiva** de promover-lhes o **entendimento direto com os empregadores**.

| Elemento | Regra |
|---|---|
| Porte da empresa | **Mais de 200** empregados |
| Quantos representantes | **Um** (pela CF) |
| Escolha | **Eleição** pelos empregados |
| Finalidade | **Exclusiva**: entendimento direto com o empregador |

📌 A **Lei 13.467/2017** (reforma trabalhista) disciplinou a **comissão de representantes dos empregados** (CLT, arts. 510-A e seguintes), com número variável de membros conforme o tamanho da empresa — detalhe **legal**, não constitucional.

⚠️ **Pegadinhas:**
- "Nas empresas com 200 ou mais empregados..." **Errado** — **mais de** 200.
- "O representante tem a finalidade de negociar convenções coletivas." **Errado** — finalidade **exclusiva** de **entendimento direto** com o empregador; negociação coletiva é papel do **sindicato** (art. 8º, VI).
- "O art. 10 assegura participação apenas dos trabalhadores." **Errado** — **trabalhadores e empregadores**.
""", N(37, 38))
m("Arts. 8º a 11 — sindicatos, greve e participação", 16)
