import json
from helpers import *

# ---------------------------------------------------------------- 18 autotutela
sec("explicacao", "Módulo 6 — Autotutela: anular e revogar", """
📘 **Autotutela** é o poder-dever de a Administração **rever os próprios atos**, **sem precisar ir ao Judiciário**: ela **anula** os ilegais e pode **revogar** os inconvenientes ou inoportunos.

🏛️ **STF, Súmula 346:** "A Administração Pública pode declarar a nulidade dos seus próprios atos."

🏛️ **STF, Súmula 473:** "A administração pode anular seus próprios atos, quando eivados de vícios que os tornam ilegais, porque deles não se originam direitos; ou revogá-los, por motivo de conveniência ou oportunidade, respeitados os direitos adquiridos, e ressalvada, em todos os casos, a apreciação judicial."

📜 **LEI SECA — Lei nº 9.784/1999**
> Art. 53. A Administração deve anular seus próprios atos, quando eivados de vício de legalidade, e pode revogá-los por motivo de conveniência ou oportunidade, respeitados os direitos adquiridos.

> Art. 54. O direito da Administração de anular os atos administrativos de que decorram efeitos favoráveis para os destinatários decai em cinco anos, contados da data em que foram praticados, salvo comprovada má-fé.

🔴 **ANULAÇÃO = ILEGALIDADE.**
🔴 **REVOGAÇÃO = CONVENIÊNCIA E OPORTUNIDADE, DENTRO DOS LIMITES LEGAIS.**

📘 **Legalidade × mérito.** **Mérito administrativo** é a margem de escolha (conveniência e oportunidade) que a lei deixa ao administrador nos atos **discricionários**. O Judiciário controla a **legalidade** (inclusive razoabilidade e proporcionalidade), mas **não substitui** o mérito — por isso **não revoga** atos de outro Poder.

**Limites da autotutela**
- ⏱️ **Prazo:** 5 anos para anular atos **favoráveis** ao destinatário, salvo **má-fé** (art. 54). Nos efeitos patrimoniais contínuos, o prazo conta da percepção do primeiro pagamento (art. 54, § 1º).
- **Devido processo:** 🏛️ STF, RE 594.296 (Tema 138): se o ato já produziu **efeitos concretos** na esfera do interessado, o desfazimento deve ser precedido de **processo administrativo** com contraditório e ampla defesa.
- **Convalidação:** vícios **sanáveis** que não lesam o interesse público nem terceiros podem ser **convalidados** (Lei 9.784/1999, art. 55).
- **Atos irrevogáveis (doutrina):** atos **vinculados**, atos **consumados/exauridos**, os que geraram **direito adquirido**, os que integram procedimento já ultrapassado (**preclusão**) e os **meramente enunciativos** (certidões, atestados).
""" + ex(
    "Em 2019, um servidor passou a receber um adicional concedido por erro de interpretação da lei, sem qualquer fraude. Em 2026 a Administração percebe o erro e quer cancelar o pagamento e anular o ato.",
    "Ainda é possível anular o ato?",
    "**Em regra, não.** O ato é **favorável** ao servidor, não houve **má-fé** e já se passaram **mais de 5 anos** desde o primeiro pagamento: o direito de anular **decaiu** (Lei 9.784/1999, art. 54 e § 1º). Se houvesse má-fé comprovada, o prazo não correria.",
    [Q("reparticao", "2019: adicional concedido por erro.", [P("servidor", "esq", "neutro", "feliz"), P("gestor", "dir", "pega", "neutro", "documento")], (1, "Adicional deferido.")),
     Q("reparticao", "2026: a Administração descobre o erro.", [P("gestor", "esq", "aponta", "surpreso", "documento"), P("advogado", "dir", "fala", "serio")], (1, "Mais de 5 anos e boa-fé: decaiu."))],
    "Prazo decaído | alerta",
    {"tipo": "linha_tempo", "titulo": "Prazo do art. 54 (boa-fé)", "unidade": "anos", "marcos": [{"em": 0, "rotulo": "1º pagamento", "estado": "neutro"}, {"em": 5, "rotulo": "Fim do prazo para anular", "estado": "alerta"}, {"em": 7, "rotulo": "Erro descoberto: tarde demais", "estado": "erro"}]}),
    ["N0045", "N0046", "N0047"])

# ---------------------------------------------------------------- 19 quadro anulação × revogação
sec("quadro_comparativo", "📊 Anulação × revogação (e o fluxograma da decisão)", """
| | **Anulação** | **Revogação** |
|---|---|---|
| Motivo | 🔴 **Ilegalidade** (vício) | 🔴 **Conveniência e oportunidade** (mérito) |
| Ato atingido | Ato **ilegal** | Ato **válido** (legal) e discricionário |
| Quem pode | **Administração** (de ofício ou provocada) **e Judiciário** (provocado) | **Só a Administração que praticou o ato** (inclusive o Judiciário e o Legislativo quanto aos **próprios** atos administrativos) |
| Efeitos | **Retroativos (ex tunc)**, ressalvados terceiros de boa-fé | **Para o futuro (ex nunc)** |
| Natureza | **Dever** (art. 53: "deve anular") | **Faculdade** ("pode revogá-los") |
| Prazo | 5 anos para atos favoráveis, salvo má-fé (art. 54) | Não há prazo, mas há limites (atos irrevogáveis) |
| Direitos adquiridos | Ato ilegal não gera direito (Súmula 473) | Devem ser **respeitados** |
| Como a banca cobra | "O Judiciário pode anular ato administrativo ilegal" ✅ | "O Judiciário pode revogar ato discricionário do Executivo" ❌ |

**Fluxograma**

**O ato tem vício de legalidade?**
→ **SIM** → o vício é sanável e não prejudica ninguém? → **sim**: pode **convalidar** • **não**: **ANULAR** (efeito ex tunc; atenção ao prazo de 5 anos se for favorável e houver boa-fé).
→ **NÃO** (o ato é válido) → ele ainda é conveniente e oportuno? → **sim**: mantém • **não**: pode **REVOGAR** (efeito ex nunc), **salvo** ato vinculado, exaurido, que gerou direito adquirido, ou enunciativo.

🧠 **MEMORIZE:** **A**nulação = **A**to **A**legal (ilegal), efeito para **A**trás. **R**evogação = **R**ecomeça daqui pra frente, por **R**azões de mérito.
""" + ex(
    "O prefeito autorizou o uso de uma praça para uma feira todos os sábados (autorização válida e precária). Meses depois, decide reformar a praça e cancela a autorização. Em outro caso, descobre que uma licença foi concedida sem o documento obrigatório exigido por lei.",
    "Em cada caso, é anulação ou revogação?",
    "**Feira: revogação** — o ato era válido, mas deixou de ser conveniente; efeitos **daqui para frente**. **Licença sem documento obrigatório: anulação** — há **ilegalidade**; efeitos **retroativos**, respeitado o devido processo se já houver efeitos concretos.",
    [Q("rua", "Caso 1: a feira na praça vai sair para a reforma.", [P("gestor", "esq", "aponta", "neutro"), P("cidadao", "dir", "neutro", "triste")], (0, "Autorização revogada a partir de hoje.")),
     Q("reparticao", "Caso 2: licença sem documento obrigatório.", [P("servidor", "esq", "pega", "surpreso", "documento"), P("gestor", "dir", "neutro", "serio")], (0, "Falta documento exigido por lei!"))],
    "Revoga × anula | alerta",
    comp("Os dois casos", ("Feira na praça", "Revogação (ex nunc)", "neutro", ["Ato válido", "Conveniência e oportunidade", "Só a Administração"]),
         ("Licença irregular", "Anulação (ex tunc)", "erro", ["Ato ilegal", "Administração ou Judiciário", "Prazo do art. 54 se favorável"]))),
    ["N0046", "N0047"])

# ---------------------------------------------------------------- 20 concurso
sec("explicacao", "Módulo 7 — Acesso aos cargos e concurso público (art. 37, I a IV e § 2º)", """
📘 **Acesso (inciso I):** cargos, empregos e funções são acessíveis aos **brasileiros** que preencham os requisitos **da lei** e aos **estrangeiros, na forma da lei** (norma de eficácia limitada quanto aos estrangeiros). Requisitos (idade, altura, exame psicotécnico) só valem se **previstos em lei** e **compatíveis com o cargo**.

🏛️ **Súmula Vinculante 44:** "Só por lei se pode sujeitar a exame psicotécnico a habilitação de candidato a cargo público."

📘 **Concurso (inciso II):** a investidura em **cargo ou emprego** depende de concurso de **provas** ou de **provas e títulos** (nunca **só** de títulos), conforme a natureza e a complexidade do cargo. Vale para a Direta **e** a Indireta (inclusive empresas estatais).

**Exceções à regra do concurso (previstas na Constituição)**
- **Cargo em comissão** declarado em lei de livre nomeação e exoneração (art. 37, II, parte final);
- **Contratação temporária** por excepcional interesse público (art. 37, IX), por processo seletivo simplificado conforme a lei;
- **Mandatos eletivos** e nomeações previstas diretamente na Constituição (ex.: ministros dos tribunais superiores e o quinto constitucional).

🏛️ **Súmula Vinculante 43:** "É inconstitucional toda modalidade de provimento que propicie ao servidor investir-se, sem prévia aprovação em concurso público destinado ao seu provimento, em cargo que não integra a carreira na qual anteriormente investido."

⏱️ **Validade (inciso III):** **até dois anos**, prorrogável **uma vez**, **por igual período**. O edital pode fixar prazo menor (ex.: 1 ano + 1 ano).

📘 **Prioridade (inciso IV):** durante o prazo **improrrogável** previsto no edital, o aprovado tem **prioridade** sobre novos concursados.

📜 **§ 2º:** desrespeitar os incisos **II e III** gera **nulidade do ato** e **punição da autoridade** responsável.

🏛️ **Direito à nomeação**
- **STF, RE 598.099 (Tema 161):** aprovado **dentro do número de vagas** do edital tem **direito subjetivo** à nomeação (salvo situações excepcionalíssimas e motivadas).
- **STF, RE 837.311 (Tema 784):** surgimento de novas vagas ou abertura de novo concurso durante a validade **não gera**, por si só, direito a quem foi aprovado **fora das vagas** — salvo **preterição arbitrária e imotivada**.
- **STF, Súmula 15:** dentro da validade, o aprovado tem direito à nomeação quando o cargo é preenchido **sem observância da classificação**.
""" + ex(
    "O edital oferece 10 vagas com validade de 2 anos. Ana passa em 8º lugar. No fim do prazo, a Administração prorroga o concurso por mais 1 ano e, depois, por mais 1 ano, sem nomear Ana.",
    "As prorrogações e a não nomeação são válidas?",
    "**Não.** A validade é de **até 2 anos**, prorrogável **uma única vez**, por **igual período** (2 anos + 2 anos). Prorrogar duas vezes viola o inciso III. E Ana, aprovada **dentro das vagas**, tem **direito subjetivo à nomeação** (STF, Tema 161).",
    [Q("reparticao", "Ana passou em 8º lugar para 10 vagas.", [P("cidadao", "esq", "pega", "feliz", "documento"), P("gestor", "dir", "neutro", "neutro")], (0, "Estou dentro das vagas!")),
     Q("forum", "O concurso é prorrogado duas vezes e ela não é chamada.", [P("advogado", "esq", "aponta", "serio"), P("juiz", "dir", "fala", "serio")], (1, "Prorrogação é uma vez só. Nomeie a candidata."))],
    "Direito à nomeação | ok",
    {"tipo": "linha_tempo", "titulo": "Validade do concurso (art. 37, III)", "unidade": "anos", "marcos": [{"em": 0, "rotulo": "Homologação", "estado": "neutro"}, {"em": 2, "rotulo": "Fim da validade inicial", "estado": "neutro"}, {"em": 4, "rotulo": "Fim da única prorrogação", "estado": "ok"}, {"em": 5, "rotulo": "2ª prorrogação: inválida", "estado": "erro"}]}),
    ["N0049", "N0002", "N0003", "N0004", "N0005", "N0015"])

# ---------------------------------------------------------------- 21 cargos x empregos x funções
sec("quadro_comparativo", "Cargo × emprego × função; cargo em comissão × função de confiança", """
| | **Cargo público** | **Emprego público** | **Função pública** |
|---|---|---|---|
| O que é | Conjunto de atribuições criado por **lei**, com denominação própria | Núcleo de atribuições ocupado sob **contrato** | **Atribuição** exercida **sem cargo ou emprego** próprio |
| Vínculo | **Estatutário** (lei) | **Contratual** (CLT) | Função de confiança ou contratação temporária |
| Onde predomina | Direta, autarquias e fundações de direito público | Empresas públicas e sociedades de economia mista | Toda a Administração |
| Ingresso | Concurso (salvo comissão) | Concurso | Confiança: servidor efetivo designado; temporária: seleção simplificada |
| Pegadinha | — | "Emprego público dispensa concurso" ❌ | "Função de confiança pode ser dada a quem não é servidor" ❌ |

📜 **Art. 37, V (lei seca):** "as funções de confiança, exercidas **exclusivamente** por servidores ocupantes de cargo efetivo, e os cargos em comissão, a serem preenchidos por servidores de carreira nos casos, condições e percentuais mínimos previstos em lei, destinam-se **apenas** às atribuições de **direção, chefia e assessoramento**".

| | **Cargo em comissão** | **Função de confiança** |
|---|---|---|
| Quem pode ocupar | **Qualquer pessoa**, respeitado o **percentual mínimo** de servidores de carreira previsto em lei | 🔴 **Só servidor efetivo** |
| É um cargo? | **Sim** (cargo próprio, criado por lei) | **Não**: é um **acréscimo de atribuições** a quem já tem cargo efetivo |
| Nomeação/exoneração | **Livre** nomeação e exoneração (*ad nutum*) | Livre designação e dispensa |
| Atribuições | **Só** direção, chefia e assessoramento | **Só** direção, chefia e assessoramento |
| Estabilidade | Não gera | Não gera estabilidade na função |
| Como a banca cobra | "Cargo em comissão pode ser ocupado por pessoa sem vínculo" ✅ | "Função de confiança pode ser exercida por comissionado sem vínculo" ❌ |

🏛️ **STF, RE 1.041.210 (Tema 1.010):** cargos em comissão só se justificam para **direção, chefia e assessoramento** (não para funções técnicas, burocráticas ou operacionais); exigem **relação de confiança**; o número deve ser **proporcional** à necessidade e ao número de efetivos; e as atribuições devem estar **descritas na lei** que os cria.
""" + ex(
    "Uma prefeitura cria, por lei, 40 cargos em comissão de \"auxiliar administrativo\" para digitar documentos e atender o balcão, e preenche todos com pessoas sem vínculo.",
    "Essa criação é válida?",
    "**Não.** Cargo em comissão serve **apenas** para **direção, chefia e assessoramento** (art. 37, V). Digitação e balcão são tarefas **burocráticas/técnicas**, que exigem **cargo efetivo** provido por **concurso** (STF, Tema 1.010). É uma forma de burlar o concurso.",
    [Q("reparticao", "40 comissionados para o balcão.", [P("gestor", "esq", "pega", "feliz", "documento"), P("cidadao", "dir", "neutro", "feliz")], (0, "Contratei sem concurso!")),
     Q("forum", "O Ministério Público questiona a lei.", [P("promotor", "esq", "aponta", "serio"), P("juiz", "dir", "fala", "serio")], (1, "Balcão não é chefia: precisa de concurso."))],
    "Burla ao concurso | erro",
    comp("Cargo em comissão × função de confiança", ("Cargo em comissão", "Qualquer pessoa (com % mínimo)", "neutro", ["Cargo próprio", "Livre nomeação e exoneração", "Só direção, chefia e assessoramento"]),
         ("Função de confiança", "Só servidor efetivo", "ok", ["Acréscimo de atribuições", "Designação e dispensa", "Só direção, chefia e assessoramento"]))),
    ["N0050", "N0051", "N0006"])

# ---------------------------------------------------------------- 22 acumulação
sec("explicacao", "Acumulação remunerada de cargos (art. 37, XVI e XVII)", """
🔴 **Regra:** é **vedada** a acumulação remunerada de cargos públicos.

📘 **Exceções do inciso XVI** — sempre com **compatibilidade de horários** e respeitado o **teto** (inciso XI):
- **a)** dois cargos de **professor**;
- **b)** um cargo de **professor** com outro **técnico ou científico**;
- **c)** dois cargos ou empregos **privativos de profissionais de saúde**, com profissões **regulamentadas**.

📘 **Inciso XVII:** a proibição **estende-se a empregos e funções** e alcança **autarquias, fundações, empresas públicas, sociedades de economia mista, suas subsidiárias e sociedades controladas**, direta ou indiretamente, pelo poder público.

| | Regra | Exceção / detalhe que cai |
|---|---|---|
| Acumular dois cargos públicos remunerados | **Proibido** | As três hipóteses do XVI, com horários compatíveis |
| Alcance | Cargos, **empregos e funções**, Direta e Indireta | Inclui subsidiárias e controladas (XVII) |
| Cargo "técnico ou científico" | Exige conhecimento **específico** (formação técnica ou superior) | Cargo de atribuições meramente burocráticas **não** se enquadra (entendimento jurisprudencial) |
| Teto | Respeitado "em qualquer caso" | 🏛️ STF (Temas 377 e 384): nos casos de acumulação **autorizada**, o teto é aplicado **a cada vínculo isoladamente** |
| Outras exceções constitucionais | — | Juiz e membro do MP podem exercer **uma** função de **magistério** (arts. 95, par. único, I, e 128, § 5º, II, "d"); **vereador** com horários compatíveis acumula o cargo e o mandato (art. 38, III) |

🚨 **PEGADINHA:** "policial + professor" — o cargo de policial não é, em regra, enquadrado como "técnico ou científico" para fins do XVI, "b"; a resposta depende das atribuições do cargo na lei. Já "**dois cargos de professor**" e "**médico + médico**" estão expressamente permitidos.

⚠️ **ATENÇÃO:** o verbo é "**remunerada**": a vedação mira o recebimento de duas remunerações. E sem **compatibilidade de horários**, nenhuma exceção se aplica.
""" + ex(
    "Paulo é enfermeiro concursado em um hospital estadual (manhã) e passa em concurso de enfermeiro de um hospital municipal (noite). Pedro é técnico administrativo de nível médio e quer assumir também um cargo de assistente administrativo em outra prefeitura.",
    "Quem pode acumular?",
    "**Paulo pode**: são **dois cargos privativos de profissional de saúde** com profissão regulamentada, com **horários compatíveis** (XVI, \"c\"). **Pedro não pode**: dois cargos administrativos não estão em nenhuma das exceções; a vedação alcança a Administração de todos os entes (XVI e XVII).",
    [Q("hospital", "Paulo: enfermeiro de manhã e à noite.", [P("cidadao", "esq", "fala", "feliz"), P("servidor", "dir", "neutro", "neutro")], (0, "Dois cargos de saúde, horários ok!")),
     Q("reparticao", "Pedro quer dois cargos administrativos.", [P("servidor", "esq", "pega", "feliz", "documento"), P("gestor", "dir", "bracos_cruzados", "serio")], (1, "Essa acumulação é vedada."))],
    "Só Paulo pode | alerta",
    comp("Pode acumular?", ("Paulo (enfermeiro + enfermeiro)", "Pode (XVI, c)", "ok", ["Privativos de saúde", "Profissão regulamentada", "Horários compatíveis"]),
         ("Pedro (administrativo + administrativo)", "Não pode", "erro", ["Fora das exceções do XVI", "Vedação alcança todos os entes", "XVII estende a empregos e funções"]))),
    ["N0052", "N0007", "N0008", "N0009", "N0010", "N0011"])

# ---------------------------------------------------------------- 23 nepotismo
sec("jurisprudencia", "Nepotismo: Súmula Vinculante 13", """
🏛️ **STF, Súmula Vinculante 13:** "A nomeação de cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau, inclusive, da autoridade nomeante ou de servidor da mesma pessoa jurídica investido em cargo de direção, chefia ou assessoramento, para o exercício de cargo em comissão ou de confiança ou, ainda, de função gratificada na administração pública direta e indireta em qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios, compreendido o ajuste mediante designações recíprocas, viola a Constituição Federal."

📘 **Fundamento:** decorre **diretamente** dos princípios do art. 37 (**moralidade** e **impessoalidade**) — por isso **não depende de lei** para ser proibido.

**Quem está proibido de ser nomeado** (para cargo em comissão, de confiança ou função gratificada):

| Vínculo com a autoridade nomeante ou com servidor da mesma pessoa jurídica em direção, chefia ou assessoramento | Exemplos |
|---|---|
| **Cônjuge ou companheiro** | Esposa, marido, companheira |
| **Linha reta** (até o 3º grau) | Pais, filhos, avós, netos, bisavós, bisnetos |
| **Colateral** (até o 3º grau) | Irmãos (2º), **tios e sobrinhos (3º)** |
| **Afinidade** (até o 3º grau) | Sogros, genros, noras, enteados, cunhados |

🚨 **PEGADINHAS**
- **Primo** é parente colateral de **4º grau**: **não** é alcançado pela SV 13 (normas locais podem ser mais rígidas).
- **Nepotismo cruzado** ("designações recíprocas") também é proibido: o prefeito nomeia o filho do secretário e o secretário nomeia o filho do prefeito.
- A SV 13 trata de cargos de **confiança** (comissão, função gratificada). Parente aprovado em **concurso** para cargo efetivo **não** é nepotismo.
- ⚖️ **Cargos políticos** (ministros, secretários de Estado e municipais): o STF, em regra, **afasta** a SV 13, **salvo** fraude, nepotismo cruzado ou falta evidente de qualificação técnica ou idoneidade moral — ponto que a banca cobra como "exceção".
""" + ex(
    "O prefeito nomeia o sobrinho como assessor em cargo em comissão. O secretário de obras nomeia a prima como chefe de setor. O secretário de saúde é irmão do prefeito.",
    "Há nepotismo em cada caso?",
    "**Sobrinho: sim** — colateral de **3º grau**, cargo em comissão (SV 13). **Prima: não pela SV 13** — é parente de **4º grau** (verifique a lei local). **Irmão secretário: em regra, não** — cargo de natureza **política**, salvo fraude ou falta evidente de qualificação.",
    [Q("reparticao", "O prefeito nomeia o sobrinho assessor.", [P("gestor", "esq", "fala", "feliz", "documento"), P("cidadao", "dir", "neutro", "feliz")], (0, "Bem-vindo, sobrinho!")),
     Q("forum", "O promotor confere os graus de parentesco.", [P("promotor", "esq", "aponta", "serio"), P("gestor", "dir", "neutro", "surpreso")], (0, "Sobrinho é 3º grau: SV 13."))],
    "Sobrinho: nepotismo | erro",
    fluxo("Teste da SV 13", [("É cargo em comissão, confiança ou função gratificada?", "neutro"), ("Parente até o 3º grau ou cônjuge?", "erro", "Sobrinho: 3º grau"), ("É cargo político?", "alerta", "Em regra, afasta a SV 13")], ("Sobrinho assessor: nepotismo", "erro"))),
    ["N0053", "N0037"])

# ---------------------------------------------------------------- 24 responsabilidade
sec("explicacao", "Módulo 8 — Responsabilidade civil do Estado (art. 37, § 6º)", """
📜 **LEI SECA — CF, art. 37, § 6º:** "As pessoas jurídicas de direito público e as de direito privado prestadoras de serviços públicos responderão pelos danos que seus agentes, nessa qualidade, causarem a terceiros, assegurado o direito de regresso contra o responsável nos casos de dolo ou culpa."

📘 **Quem responde:** (1) pessoas jurídicas de **direito público** (entes, autarquias, fundações de direito público) e (2) pessoas de **direito privado prestadoras de serviço público** (estatais prestadoras e **concessionárias/permissionárias**).

📘 **Responsabilidade objetiva — teoria do risco administrativo.** A vítima **não precisa provar culpa**. Basta demonstrar:
1. **Conduta** de agente público **"nessa qualidade"** (no exercício da função ou a pretexto dela);
2. **Dano** (material ou moral);
3. **Nexo causal** entre a conduta e o dano.

⚠️ **Não é automática:** o risco administrativo **admite excludentes** que rompem o nexo causal — **culpa exclusiva da vítima**, **caso fortuito ou força maior** e **fato exclusivo de terceiro**. A **culpa concorrente** da vítima **reduz** a indenização. 🔴 Não afirme que "o Estado responde por todo e qualquer dano".

⚖️ **Risco integral** (sem excludentes) é exceção, admitida em hipóteses específicas, como o **dano nuclear** (CF, art. 21, XXIII, "d").

🏛️ **STF, RE 591.874 (Tema 130):** a concessionária responde **objetivamente** também perante **terceiros não usuários** do serviço.

🏛️ **STF, RE 1.027.633 (Tema 940) — "dupla garantia":** a ação deve ser proposta **contra o Estado** (ou a prestadora de serviço público); o **agente** é **parte ilegítima** para a ação da vítima, assegurado o regresso nos casos de dolo ou culpa.

**Condutas omissivas**
- ⚖️ **Doutrina tradicional:** na omissão, a responsabilidade é **subjetiva** (culpa do serviço: o serviço não funcionou, funcionou mal ou tarde).
- 🏛️ **STF:** quando há **dever específico de agir** e o Estado se omite, aplica-se a responsabilidade **objetiva**. Exemplo: **RE 841.526 (Tema 592)** — o Estado responde pela **morte de detento** quando descumpre o dever específico de proteção do art. 5º, XLIX (integridade física e moral dos presos).
- ⚠️ Há divergência doutrinária: na prova, siga o comando da questão ("segundo o STF" × "segundo a doutrina").
""" + ex(
    "Um preso é morto por outro detento dentro da cela, em uma unidade prisional estadual, sem que a administração tenha adotado as medidas de vigilância exigidas. A família pede indenização.",
    "O Estado responde? Precisa provar culpa?",
    "**Sim, responde.** Segundo o STF (Tema 592), o Estado tem **dever específico de proteção** dos presos (CF, art. 5º, XLIX); descumprido esse dever, a responsabilidade é **objetiva** — basta demonstrar conduta (omissão específica), dano e nexo. O Estado só se livraria provando que **não podia evitar** a morte, o que rompe o nexo causal.",
    [Q("cela", "Briga entre presos dentro da cela.", [P("preso", "esq", "ataca", "bravo"), P("preso", "dir", "neutro", "surpreso")], None, "PÁ!"),
     Q("forum", "A família pede indenização ao Estado.", [P("advogado", "esq", "aponta", "serio", "documento"), P("juiz", "dir", "fala", "serio")], (1, "Dever específico de proteção: Tema 592."))],
    "Estado responde | erro",
    fluxo("Responsabilidade pela morte do preso", [("Dever específico: proteger o preso", "neutro", "CF, art. 5º, XLIX"), ("Omissão: vigilância não adotada", "erro"), ("Dano e nexo causal", "erro")], ("Responsabilidade objetiva do Estado", "ok", "Excludente só se a morte era inevitável"))),
    ["N0054", "N0055", "N0057", "N0017"])

# ---------------------------------------------------------------- 25 regresso e quadros
sec("comparacao", "Responsabilidade objetiva × direito de regresso; regra × exceção", """
| | **Responsabilidade do Estado** (vítima × Estado) | **Direito de regresso** (Estado × agente) |
|---|---|---|
| Tipo | **Objetiva** | 🔴 **Subjetiva**: exige **dolo ou culpa** do agente |
| Quem prova o quê | A vítima prova conduta, dano e nexo | O Estado prova o dolo ou a culpa do agente |
| Polo passivo | O Estado / a prestadora (Tema 940: **não** o agente) | O **agente** causador |
| Requisito prévio | — | O Estado ter **indenizado** a vítima |
| Prazo | — | 🏛️ Ressarcimento por ilícito civil **prescreve** (STF, Tema 666); é **imprescritível** só quando decorre de **ato doloso de improbidade** (Tema 897) |
| Como a banca cobra | "A vítima deve provar a culpa do servidor" ❌ | "O regresso independe de dolo ou culpa" ❌ |

📊 **Regra constitucional × exceção constitucional (resumo do art. 37)**

| Tema | **Regra** | **Exceção** |
|---|---|---|
| Ingresso | Concurso de provas ou provas e títulos (II) | Cargo em comissão; temporários (IX) |
| Validade do concurso | Até 2 anos (III) | Prorrogação **uma vez**, por igual período |
| Cargos de confiança | Só direção, chefia e assessoramento (V) | — (não há exceção para funções técnicas) |
| Acumulação | **Vedada** (XVI) | Professor + professor; professor + técnico/científico; saúde + saúde (com horários compatíveis) |
| Criação de entidades | Lei específica **cria** autarquia (XIX) | EP, SEM e fundação: lei **autoriza** |
| Subsidiárias | Dependem de autorização legislativa (XX) | — |
| Responsabilidade | **Objetiva** (§ 6º) | Excludentes rompem o nexo; regresso é **subjetivo** |

🧠 **MEMORIZE o § 6º em 3 passos:** **vítima → Estado (objetiva)** • **Estado → agente (dolo ou culpa)** • **vítima ✗ agente direto (Tema 940)**.
""" + ex(
    "Um motorista da prefeitura, em serviço, avança o sinal vermelho e atinge uma moto. O Município paga a indenização ao motociclista e quer cobrar do motorista.",
    "O Município pode cobrar do motorista? O que precisa provar?",
    "**Pode**, pela **ação de regresso** (art. 37, § 6º), desde que prove **dolo ou culpa** do motorista — aqui, a **culpa** (imprudência ao avançar o sinal). Perante o motociclista, o Município respondeu **objetivamente**; perante o motorista, a responsabilidade é **subjetiva**.",
    [Q("obra", "O carro da prefeitura avança o sinal e atinge a moto.", [P("servidor", "esq", "neutro", "surpreso"), P("cidadao", "dir", "fala", "triste")], (1, "Ele avançou o vermelho!"), "CRASH!"),
     Q("forum", "Indenização paga, o Município cobra o motorista.", [P("advogado", "esq", "aponta", "serio", "documento"), P("servidor", "dir", "neutro", "triste")], (0, "Regresso: houve culpa do motorista."))],
    "Regresso com culpa | ok",
    fluxo("Os dois momentos do § 6º", [("Vítima processa o Município", "ok", "Objetiva: conduta, dano e nexo"), ("Município indeniza", "neutro"), ("Município aciona o motorista", "alerta", "Precisa provar dolo ou culpa")])),
    ["N0055", "N0056", "N0017"])

json.dump(S, open("conteudo-catalogo-adm/sec3.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(len(S), [len(s["bodyMarkdown"]) for s in S])
