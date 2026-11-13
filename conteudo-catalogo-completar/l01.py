from lib import build

M1 = ("3.35.2 Crime instantâneo: conceito, espécies e exemplos", [
("explicacao", "Crime instantâneo: consumação em um único momento", """
**Conceito.** Crime instantâneo é aquele cuja consumação ocorre em um momento certo e determinado, sem se prolongar no tempo. Reunidos todos os elementos do tipo, o crime está consumado e **encerrado**. O que pode continuar são os *efeitos* do fato, nunca a consumação.

**Espécies de crime instantâneo**

| Espécie | Ideia central | Exemplos |
|---|---|---|
| Instantâneo **puro** (ou simples) | Consuma-se e acaba; nada de relevante persiste | Injúria (art. 140), lesão corporal leve (art. 129, *caput*), disparo de arma de fogo (art. 15 da Lei 10.826/2003) |
| Instantâneo **de efeitos permanentes** | A consumação é pontual, mas o resultado (o dano) é irreversível ou duradouro | Homicídio (art. 121), furto (art. 155), estelionato (art. 171), lesão corporal gravíssima que gera deformidade permanente (art. 129, § 2º) |

**Instantâneo de efeitos permanentes não é crime permanente.** No homicídio, a morte da vítima é definitiva, mas o crime se consumou no instante da morte. Por isso o prazo prescricional corre da consumação (art. 111, I, do CP), e não há flagrante "para sempre".

**Por que a classificação importa.** Ela responde a quatro perguntas de prova: (1) quando começa a prescrição; (2) até quando cabe prisão em flagrante; (3) qual lei se aplica se houve mudança legislativa; (4) onde e quando se considera praticado o crime.

**Momento da consumação nos crimes instantâneos.** Depende da estrutura do tipo:
- **Crimes materiais** (homicídio, furto): consumam-se com o resultado naturalístico.
- **Crimes formais** (extorsão, art. 158 — Súmula 96/STJ): consumam-se com a conduta, independentemente do resultado.
- **Crimes de mera conduta** (violação de domicílio na forma de "entrar", desobediência): consumam-se com a simples ação ou omissão.

> **Ressalva técnica.** A doutrina costuma classificar o **furto** como instantâneo de efeitos permanentes (consuma-se quando o agente obtém a posse desvigiada da coisa — Tema 934/STJ), ainda que a vítima fique sem o bem por anos. Se o agente continuar *com* a coisa, isso é mero exaurimento: não prolonga a consumação.

**Exemplo cotidiano.** João pega a carteira de Maria e foge. O furto se consumou quando ele teve a posse desvigiada. Se João é preso três dias depois com a carteira, **não há flagrante próprio por permanência**: o crime não é permanente (pode haver flagrante ficto, art. 302, IV, do CPP, se for encontrado logo depois, com a coisa, em situação que faça presumir ser o autor).

:::exemplo
Situação: Pedro matou Carlos em 2010. Em 2026, a família ainda sofre os efeitos da perda e o corpo continua desaparecido.
Pergunta: O homicídio é crime permanente por causa dos efeitos duradouros?
Resposta: **Não.** É instantâneo de efeitos permanentes. A consumação ocorreu no momento da morte; a prescrição correu desde então (art. 111, I, do CP). A *ocultação de cadáver* (art. 211) é crime autônomo e instantâneo.
:::
"""),
("explicacao", "Tipos mistos e núcleos: o mesmo crime pode ter condutas instantâneas e permanentes", """
Alguns tipos penais são **de ação múltipla** (tipo misto alternativo): descrevem vários verbos. Cada verbo pode ter natureza temporal diferente. É o ponto em que a banca mais derruba o candidato.

| Crime | Núcleo **instantâneo** | Núcleo **permanente** |
|---|---|---|
| Receptação (art. 180) | Adquirir, receber | Ter em depósito, ocultar |
| Tráfico de drogas (art. 33 da Lei 11.343/2006) | Vender, ofertar, entregar a consumo, fornecer | Ter em depósito, guardar, transportar, trazer consigo |
| Armas de fogo (Lei 10.826/2003) | Disparar (art. 15), adquirir | Manter sob guarda, ter em depósito, portar, possuir (arts. 12, 14 e 16) |
| Violação de domicílio (art. 150) | — | Permanecer (a modalidade "entrar" é de consumação pontual, mas a permanência na casa é contínua) |

**Regra de prova.** Identifique **qual verbo** o agente praticou. Quem *vende* droga pratica conduta instantânea; quem *guarda* droga em casa pratica conduta permanente. Isso muda o flagrante e a entrada na residência.

:::exemplo
Situação: Policiais recebem denúncia anônima, vão à casa de Lucas e, sem mandado, entram e encontram 200 g de cocaína guardados.
Pergunta: A natureza permanente do crime legitima, por si só, a entrada?
Resposta: A permanência do núcleo "guardar" **permite** o flagrante dentro da casa a qualquer hora (art. 5º, XI, CF; art. 303 do CPP), mas o STF (Tema 280, RE 603.616) exige **fundadas razões, justificadas depois**, de que havia flagrante. Denúncia anônima isolada, sem diligência prévia, não basta.
:::
"""),
], None)

M2 = ("3.35.3 Crime permanente: conceito, espécies e características", [
("explicacao", "Crime permanente: a consumação que se prolonga", """
**Conceito.** Crime permanente é aquele cuja consumação **se prolonga no tempo por vontade do agente** (ou sob o seu domínio). Enquanto persiste a situação antijurídica criada, o crime continua se consumando. A cessação depende do agente (ele solta a vítima, entrega a coisa, abandona o local) ou de ato externo (prisão, resgate).

**Estrutura em duas fases**
1. **Fase de realização:** o agente cria a situação (priva a liberdade, passa a guardar a droga).
2. **Fase de manutenção:** a situação perdura por ato voluntário do agente. É nela que o crime permanece em consumação.

**Espécies**
- **Necessariamente permanente:** a permanência é inerente ao tipo; sem ela não há crime. Ex.: sequestro e cárcere privado (art. 148); extorsão mediante sequestro (art. 159); redução a condição análoga à de escravo (art. 149); associação criminosa (art. 288) e organização criminosa (Lei 12.850/2013, art. 2º).
- **Eventualmente permanente (facultativamente permanente):** o crime pode se consumar de forma instantânea ou prolongada, conforme o caso concreto. Ex.: a ação de "ocultar" na receptação; "ter em depósito" ou "guardar" no tráfico.

**Exemplos que a prova cobra**
- Art. 148 (cárcere privado): a vítima fica presa por dias → permanente.
- Art. 159 (extorsão mediante sequestro): permanente enquanto a vítima estiver cativa.
- Art. 16 da Lei 10.826/2003 (posse/porte de arma de uso restrito): permanente enquanto o agente mantiver a arma.
- **Atenção:** não decore listas; leia o verbo do tipo e pergunte se a conduta *se prolonga por vontade do agente*.
- Art. 288 (associação criminosa): permanente enquanto durar o vínculo associativo.

**Características fundamentais**
- A consumação **não se esgota** em um momento; ela "dura".
- O agente tem **domínio da cessação**: pode fazer parar quando quiser.
- É possível **flagrante** a qualquer tempo durante a permanência.
- A prescrição **só começa** quando cessa a permanência (art. 111, III, do CP).

:::exemplo
Situação: Rui prende Ana em um quarto às 8h de segunda-feira; a polícia a liberta na quinta-feira, às 15h.
Pergunta: Quando o crime se consumou e quando cessou?
Resposta: O art. 148 se consumou assim que a liberdade foi privada por tempo juridicamente relevante e **permaneceu em consumação** até a quinta às 15h. A prescrição começa a correr dessa cessação (art. 111, III), e durante todo o período era possível prender Rui em flagrante.
:::
"""),
("aprofundamento", "Consequências processuais e penais do crime permanente", """
**1. Flagrante (CPP, art. 303).** Nas infrações permanentes, entende-se o agente em flagrante delito **enquanto não cessar a permanência**. Não se aplica a exigência de "logo após" do art. 302: o flagrante é próprio durante toda a permanência.

**2. Entrada em domicílio (CF, art. 5º, XI).** A casa é asilo inviolável, salvo flagrante delito, desastre, prestar socorro ou, durante o dia, por determinação judicial. Em crime permanente, o flagrante *ocorre* dentro da casa, mas o STF fixou no **Tema 280** que a entrada sem mandado exige **fundadas razões** (justa causa objetiva e concreta), comprovadas posteriormente, sob pena de nulidade das provas e responsabilidade do agente público. Isso dialoga com a Lei de Abuso de Autoridade (Lei 13.869/2019, art. 22).

**3. Prescrição (CP, art. 111, III).** Começa a correr **do dia em que cessou a permanência**. Se o crime permanente se estendeu de 2020 a 2024, a prescrição só inicia em 2024.

**4. Lei penal no tempo (Súmula 711/STF).** A lei penal mais grave aplica-se ao crime continuado ou ao crime permanente **se a sua vigência é anterior à cessação** da continuidade ou da permanência. Não ofende a irretroatividade: o agente continuou praticando o crime já sob a lei nova.

**5. Competência territorial (CPP, art. 71).** Se a permanência se estende por mais de um foro, a competência é firmada pela **prevenção**.

**6. Legítima defesa e estado de necessidade.** Enquanto a agressão (ou o perigo) persiste, a reação pode ser contemporânea. Ex.: a vítima de cárcere privado que se liberta e fere o sequestrador age sob a excludente enquanto a agressão atual continua.

**7. Concurso de pessoas.** Quem adere à empreitada **durante a permanência** responde como coautor ou partícipe, ainda que não tenha participado do início. Ex.: o terceiro que vigia a vítima por dois dias do sequestro responde pelo art. 148.

**8. Ação penal e prazo para representar/queixa.** Os prazos (ex.: decadência de seis meses) contam, em regra, do conhecimento da autoria; a permanência influencia o termo inicial da prescrição, não a decadência por si só. Confira o prazo específico de cada crime.

**Quadro-resumo**

| Instituto | Regra no crime permanente |
|---|---|
| Flagrante | Possível enquanto não cessar a permanência (art. 303 CPP) |
| Prescrição | Inicia na cessação da permanência (art. 111, III, CP) |
| Lei mais grave durante a permanência | Aplica-se (Súmula 711/STF) |
| Domicílio sem mandado | Só com fundadas razões, justificadas depois (Tema 280/STF) |
| Competência | Prevenção, se abranger mais de um foro (art. 71 CPP) |
"""),
], None)

M3 = ("3.35.4 Crime continuado (art. 71 do CP): requisitos e natureza", [
("explicacao", "Crime continuado: ficção jurídica e requisitos", """
**Conceito (CP, art. 71).** Há crime continuado quando o agente, mediante **mais de uma ação ou omissão**, pratica **dois ou mais crimes da mesma espécie** e, pelas condições de **tempo, lugar, maneira de execução e outras semelhantes**, os subsequentes devem ser havidos como **continuação do primeiro**.

**Natureza jurídica.** Adota-se a **teoria da ficção jurídica**: existem vários crimes de fato, mas a lei os trata como crime único *para fins de aplicação da pena*. Por isso a pena é a de um só crime aumentada, e não a soma (concurso material, art. 69).

**Teoria quanto aos requisitos.** O texto legal é *objetivo* (tempo, lugar, modo de execução). Porém, a jurisprudência do STF e do STJ adota a teoria **objetivo-subjetiva**: além dos requisitos objetivos, exige-se **unidade de desígnios** (um liame subjetivo entre as condutas, um plano comum). Sem isso, há concurso material. Na prova, "o art. 71 não exige elemento subjetivo" pode ser tratado como erro conforme a banca; leia o enunciado.

**Requisitos (todos cumulativos)**

| Requisito | Significado | Observação de prova |
|---|---|---|
| Pluralidade de condutas | Duas ou mais ações/omissões distintas | Uma só ação com vários resultados é concurso **formal** |
| Pluralidade de crimes | Dois ou mais crimes consumados ou tentados | — |
| **Mesma espécie** | Crimes previstos no mesmo tipo penal, ou que protegem o mesmo bem jurídico com modo de execução semelhante | Furto simples e furto qualificado: mesma espécie. Furto e roubo: **não** (roubo atinge também integridade/liberdade). Furto e estelionato: não. |
| Condições de tempo | Intervalo razoável entre os crimes | Jurisprudência admite, em regra, até **30 dias** entre um e outro |
| Condições de lugar | Mesma cidade ou cidades vizinhas/contíguas | Cidades distantes afastam a continuidade |
| Maneira de execução | Mesmo *modus operandi* | Ex.: sempre arrombando o mesmo tipo de portão |
| Unidade de desígnios | Vínculo subjetivo (plano único) | Exigência jurisprudencial |

**Pode haver continuidade em crimes culposos?** Sim, segundo a doutrina majoritária, desde que presentes os requisitos objetivos. **Em tentados?** Sim, a continuidade pode envolver tentativas.

**Habitualidade criminosa não é continuidade.** O agente que faz do crime seu meio de vida (criminoso habitual) tende a ter reconhecido concurso material, não crime continuado, pois falta a unidade de desígnios.

:::exemplo
Situação: Marta, caixa de uma loja, desvia R$ 200 por semana por três meses, sempre do mesmo modo.
Pergunta: Quantos crimes? Qual regime de pena?
Resposta: Trata-se de **vários crimes da mesma espécie** (apropriação indébita/furto qualificado, conforme o caso) que, por tempo, lugar, modo de execução e desígnio único, configuram **crime continuado**. Aplica-se a pena de um só crime, aumentada de 1/6 a 2/3 (art. 71).
:::
"""),
("aprofundamento", "Crime continuado: pena, fração de aumento e súmulas", """
**Regra geral (art. 71, *caput*).** Aplica-se a pena de **um só dos crimes**, se idênticas, ou a **mais grave**, se diversas, **aumentada de 1/6 a 2/3**. Chama-se **exasperação**. É mais benéfica ao réu que o cúmulo material.

**Critério da fração de aumento (Súmula 659/STJ).** O aumento é definido pelo **número de infrações**:

| Nº de infrações | Aumento |
|---|---|
| 2 | 1/6 |
| 3 | 1/5 |
| 4 | 1/4 |
| 5 | 1/3 |
| 6 | 1/2 |
| 7 ou mais | 2/3 |

**Continuidade delitiva específica (art. 71, parágrafo único).** Nos **crimes dolosos, contra vítimas diferentes, cometidos com violência ou grave ameaça à pessoa**, o juiz **pode** aumentar a pena de um só dos crimes (se idênticas) ou a mais grave (se diversas) **até o triplo**, considerando culpabilidade, antecedentes, conduta social, personalidade, motivos e circunstâncias. Observam-se o art. 70, parágrafo único (limite: não pode ser maior que o concurso material), e o art. 75 (limite de 40 anos de cumprimento).

> Na continuidade específica, o aumento pode **exceder 2/3**, mas é **facultativo** e o resultado não pode superar o que se obteria somando as penas (concurso material).

**Súmulas importantes**
- **Súmula 659/STJ:** fração conforme o número de infrações (tabela acima).
- **Súmula 711/STF:** lei mais grave aplica-se se entrou em vigor antes de cessar a continuidade ou permanência.
- **Súmula 497/STF:** na prescrição, no crime continuado, **considera-se a pena de cada crime isoladamente**, sem o acréscimo da continuação.
- **Súmula 723/STF** e **Súmula 243/STJ:** não cabe suspensão condicional do processo (art. 89 da Lei 9.099/1995) em crime continuado se a soma da pena mínima do crime mais grave com o aumento mínimo de 1/6 ultrapassar **1 ano**.
- Art. 119 do CP: no concurso de crimes (inclusive continuado), a extinção da punibilidade incide sobre a pena de **cada crime isoladamente**.

**Execução penal.** O reconhecimento da continuidade na fase de execução cabe ao juízo da execução (LEP, art. 66, III, *a*) quando as penas foram impostas em processos diferentes. Para a unificação, aplica-se o art. 71 do CP.

**Tentativa e crime continuado.** Mesmo na forma tentada, é possível a continuidade; a pena de cada crime é calculada com a diminuição da tentativa antes do aumento do art. 71.

:::exemplo
Situação: Bruno praticou cinco furtos simples, em semanas seguidas, no mesmo bairro, com a mesma técnica. Pena-base de cada um: 2 anos.
Pergunta: Qual é a pena total?
Resposta: Crime continuado com 5 infrações → aumento de **1/3** (Súmula 659/STJ). 2 anos + 1/3 = **2 anos e 8 meses** (aproximadamente), em vez de 10 anos pelo concurso material.
:::
"""),
], None)

M4 = ("3.35.5 Comparações: permanente × continuado × habitual × concurso", [
("quadro_comparativo", "Quadro comparativo: as classificações temporais e os concursos", """
| Critério | Instantâneo | Instantâneo de efeitos permanentes | **Permanente** | **Continuado** | Habitual |
|---|---|---|---|---|---|
| Nº de crimes | 1 | 1 | 1 | 2 ou mais, tratados como 1 | 1 (formado por reiteração) |
| Consumação | Momentânea | Momentânea | Prolongada | De cada crime | Só com a reiteração |
| Quem controla a duração | — | — | O agente | — | — |
| Flagrante | Imediato/ficto | Imediato/ficto | Durante toda a permanência | De cada crime | Difícil: precisa provar o hábito |
| Início da prescrição | Consumação | Consumação | Cessação da permanência | Contada **isoladamente** por crime (Súm. 497 STF) | Cessação da atividade habitual |
| Exemplo | Injúria | Homicídio, furto | Cárcere privado | Furtos em série | Curandeirismo (art. 284), exercício ilegal da medicina (art. 282) |

**Diferenças essenciais**
- **Permanente × continuado:** no permanente há **um** crime que dura; no continuado há **vários** crimes unidos por ficção. No permanente a pena é a do tipo; no continuado, pena de um crime + aumento.
- **Continuado × concurso material (art. 69):** concurso material soma as penas; continuado exaspera. A diferença está nos requisitos do art. 71.
- **Continuado × concurso formal (art. 70):** no formal, **uma** ação ou omissão gera dois ou mais resultados; no continuado, **várias** ações.
- **Continuado × habitual:** no habitual, a reiteração de atos *forma o tipo* (um ato isolado é, em regra, atípico). No continuado, cada ato já é crime.
- **Permanente × instantâneo de efeitos permanentes:** no primeiro, a *conduta* dura por vontade do agente; no segundo, só o *resultado* perdura.

**Exemplo de cada.**
- Instantâneo: calúnia. Permanente: sequestro. Continuado: três furtos semelhantes. Habitual: curandeirismo. Instantâneo de efeitos permanentes: homicídio.
"""),
], None)

M5 = ("3.35.6 Casos resolvidos e pegadinhas de prova", [
("exemplos", "Casos práticos resolvidos", """
:::exemplo
Situação: Em 2019, João foi preso em flagrante por manter arma de fogo de uso restrito em casa. Em 2020, entrou em vigor lei que aumentou a pena do art. 16 da Lei 10.826/2003, e ele continuou com a arma até ser preso em 2021.
Pergunta: Qual lei se aplica?
Resposta: Crime **permanente**. Pela **Súmula 711/STF**, aplica-se a lei mais grave, pois a permanência se estendeu sob a vigência da lei nova.
:::

:::exemplo
Situação: Paula furtou uma loja em janeiro, outra em fevereiro e outra em março, em cidades diferentes do país, sem relação entre os fatos.
Pergunta: Há crime continuado?
Resposta: **Não.** Faltam condições de lugar e unidade de desígnios. Há **concurso material** (art. 69), com soma das penas.
:::

:::exemplo
Situação: Rodrigo cometeu um roubo e, 10 dias depois, um furto no mesmo bairro, com o mesmo modo de agir.
Pergunta: Continuidade delitiva?
Resposta: **Não.** Roubo e furto não são crimes da *mesma espécie* (o roubo protege também a liberdade e a integridade física). Concurso material.
:::

:::exemplo
Situação: Débora sequestrou uma criança em 1º de março e a manteve até 10 de março, quando foi presa em flagrante.
Pergunta: Houve flagrante legítimo mesmo 9 dias depois?
Resposta: **Sim.** Crime permanente (art. 148): o flagrante durou enquanto durou a privação da liberdade (art. 303 do CPP).
:::

:::exemplo
Situação: Eduardo praticou 8 estelionatos, em dias seguidos, no mesmo bairro, com o mesmo golpe. Pena-base de cada um: 1 ano.
Pergunta: Qual é o aumento?
Resposta: Sete ou mais infrações → **2/3** (Súmula 659/STJ). 1 ano + 2/3 = **1 ano e 8 meses**.
:::

:::exemplo
Situação: Fernanda matou duas pessoas em dois dias seguidos, com o mesmo modo de execução e planejamento comum.
Pergunta: É possível continuidade em crimes contra a vida?
Resposta: **Sim, em tese.** O parágrafo único do art. 71 admite a continuidade específica em crimes dolosos contra vítimas diferentes com violência ou grave ameaça (a antiga Súmula 605/STF está superada). O juiz pode aumentar até o triplo.
:::
"""),
("pegadinhas", "Pegadinhas que mais caem", """
1. **"Crime permanente é aquele cujos efeitos duram."** ❌ É a *consumação* que dura. Efeitos duradouros = instantâneo de efeitos permanentes (homicídio).
2. **"O furto é permanente porque o agente continua com a coisa."** ❌ Furto é instantâneo; a posse posterior é exaurimento.
3. **"A prescrição do crime permanente começa da consumação."** ❌ Começa da **cessação da permanência** (art. 111, III).
4. **"Em crime permanente, só cabe flagrante logo após o fato."** ❌ Cabe **durante toda a permanência** (art. 303 CPP).
5. **"Furto e roubo, pelo mesmo modo, formam crime continuado."** ❌ Não são da mesma espécie.
6. **"O aumento do crime continuado é livre, de 1/6 a 2/3, a critério do juiz."** ❌ Critério vinculado ao **número de infrações** (Súmula 659/STJ).
7. **"A continuidade delitiva exige apenas requisitos objetivos."** ⚠️ O texto legal é objetivo, mas STF/STJ exigem **unidade de desígnios** (objetivo-subjetiva).
8. **"Vários resultados de uma só ação = crime continuado."** ❌ É **concurso formal** (art. 70).
9. **"No crime continuado, a prescrição considera o acréscimo do art. 71."** ❌ Súmula 497/STF: pena de cada crime isoladamente.
10. **"Associação criminosa é crime instantâneo."** ❌ É **permanente** enquanto durar o vínculo.
11. **"Crime permanente autoriza qualquer entrada em casa."** ❌ Tema 280/STF: exige fundadas razões, justificadas posteriormente.
12. **"A lei nova mais grave nunca atinge fatos anteriores."** ⚠️ Atinge o crime **permanente ou continuado** que continuou após a vigência (Súmula 711/STF).
"""),
], None)

FLASH = """

**O que é crime instantâneo de efeitos permanentes?**
→ Consumação em um só momento, com resultado duradouro (ex.: homicídio, furto). A permanência dos efeitos não torna o crime permanente.

**Cite crimes necessariamente permanentes.**
→ Sequestro e cárcere privado (art. 148), extorsão mediante sequestro (art. 159), redução a condição análoga à de escravo (art. 149), associação criminosa (art. 288).

**Quando começa a prescrição no crime permanente?**
→ No dia em que **cessa a permanência** (art. 111, III, CP).

**Qual o requisito de "espécie" do crime continuado?**
→ Os crimes devem ser da **mesma espécie** (mesmo tipo ou tipos que tutelam o mesmo bem com modo de execução semelhante). Furto e roubo não são da mesma espécie.

**Qual a fração de aumento para 5 infrações no crime continuado?**
→ **1/3** (Súmula 659/STJ). 2 → 1/6; 3 → 1/5; 4 → 1/4; 5 → 1/3; 6 → 1/2; 7 ou mais → 2/3.

**Até quanto pode chegar o aumento na continuidade específica?**
→ Até o **triplo** da pena (art. 71, parágrafo único), em crimes dolosos contra vítimas diferentes com violência ou grave ameaça.

**O que diz a Súmula 497/STF?**
→ No crime continuado, a prescrição considera a pena de **cada crime isoladamente**, sem o acréscimo da continuação.

**Qual a diferença entre crime continuado e concurso formal?**
→ No continuado, **várias** ações; no formal, **uma** ação gera vários resultados.

**O que diz o Tema 280/STF?**
→ A entrada em domicílio sem mandado exige fundadas razões de flagrante, justificadas posteriormente, sob pena de nulidade.

**Tráfico: "vender" e "guardar" têm a mesma natureza temporal?**
→ Não. Vender é instantâneo; guardar/ter em depósito/transportar é permanente.
"""

build("l01.json", "teoria-geral-do-crime-3-35-crime-instantaneo-permanente-e-continuado", 2, [M1, M2, M3, M4, M5], FLASH)
