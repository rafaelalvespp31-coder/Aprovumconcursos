from lib import build

M1 = ("6.2.2 Jurisdição, competência e juiz natural", [
("explicacao", "Conceitos básicos e princípios", """
**Jurisdição** é o poder-dever do Estado de aplicar o direito ao caso concreto, resolvendo o conflito. É **una** (todo juiz tem jurisdição). **Competência** é a **medida da jurisdição**: define qual órgão julga cada caso. **Atribuição** é a esfera de atuação de autoridades **não jurisdicionais** (delegado, promotor).

| Conceito | Quem exerce | Exemplo |
|---|---|---|
| Jurisdição | Juízes e tribunais | Julgar |
| Competência | Cada órgão jurisdicional, dentro de sua parcela | Vara Criminal da Comarca X |
| Atribuição | Polícia, Ministério Público | Delegado titular da delegacia de homicídios |

**Princípios que regem a competência**
- **Juiz natural (CF, art. 5º, XXXVII e LIII):** ninguém será processado nem sentenciado senão pela **autoridade competente**; proíbem-se **tribunais de exceção** e juízos constituídos após o fato (*ex post facto*). A regra de competência vale desde a lei anterior ao fato (*tempus regit actum*) — a redistribuição por lei posterior se aplica a processos em curso, desde que não ocorra manipulação.
- **Improrrogabilidade e indelegabilidade:** a competência absoluta não se modifica por vontade das partes; o órgão não pode delegar sua competência (exceção: carta precatória).
- **Perpetuatio jurisdictionis (CPP, art. 81):** a competência uma vez fixada permanece, ainda que haja absolvição ou desclassificação, salvo se a nova competência for absoluta.
- **Kompetenz-Kompetenz:** o juiz decide sobre a própria competência.
- **Devido processo legal e duplo grau.**

**Como se determina a competência: o roteiro de três etapas**
1. **Qual Justiça?** (comum estadual, federal, militar, eleitoral): critério material e pessoal.
2. **Qual órgão ou juízo dentro da Justiça?** (originária de tribunal por prerrogativa; Júri; Juizado; Vara especializada).
3. **Qual comarca/foro?** (critério territorial, art. 70 do CPP) e, dentro dela, **qual juiz** (distribuição ou prevenção).

Essa sequência é a chave para as questões de prova.
"""),
], None)

M2 = ("6.2.3 Critério territorial (ratione loci): arts. 69 a 73 do CPP", [
("explicacao", "Lugar da infração, domicílio do réu e regras especiais", """
**Critérios determinantes (CPP, art. 69):** lugar da infração; domicílio ou residência do réu; natureza da infração; distribuição; conexão ou continência; prevenção; prerrogativa de função.

**1. Lugar da infração (art. 70) — regra geral.** Competência do local da **consumação** (teoria do **resultado**) ou, na tentativa, do **último ato de execução**.
- Execução iniciada no Brasil e consumada no exterior: lugar do último ato de execução no Brasil (§ 1º).
- Último ato fora do Brasil: lugar onde o crime produziu ou devia produzir seu resultado, ainda que parcialmente (§ 2º).
- Limites incertos, infração nas divisas, permanente ou continuada em duas ou mais jurisdições: **prevenção** (§ 3º).
- **Estelionato mediante depósito, cheque sem fundos ou frustrado, ou transferência de valores (art. 171 do CP):** domicílio da **vítima**; várias vítimas: prevenção (§ 4º, Lei 14.155/2021).

**Exceções ao resultado — a prática dos tribunais**
- **Homicídio:** o STJ prestigia o **local da conduta** (onde se colhem as provas), embora o resultado ocorra em outra comarca.
- **Infração de menor potencial ofensivo (Lei 9.099/1995, art. 63):** lugar em que foi **praticada** a infração (teoria da atividade).
- **Crimes de roubo, extorsão em geral:** consumação (extorsão consuma-se com o ato, Súmula 96/STJ).

**2. Domicílio ou residência do réu (art. 72)** — quando **não se conhece o lugar da infração**. Réu com mais de uma residência: prevenção. Sem residência certa ou ignorado: onde for encontrado.

**3. Ação penal exclusivamente privada (art. 73):** o querelante pode optar pelo **domicílio do réu**, ainda que conhecido o lugar da infração.

**4. Crimes cometidos fora do território (art. 88):** Capital do Estado em que o réu residiu por último; se nunca residiu no Brasil, a Capital da República.

**5. Crimes em embarcações e aeronaves (arts. 89 e 90):** primeiro porto brasileiro em que tocar a embarcação após o crime (ou último em que tocou, se afastar-se do País); comarca do pouso após o crime ou de onde partiu a aeronave.

**6. Foro da execução penal.** Juízo da execução do local onde o condenado cumpre a pena (LEP, arts. 65 e 66). **Súmula 192/STJ:** compete ao juízo das execuções penais do Estado a execução das penas impostas a sentenciados pela Justiça Federal, Militar ou Eleitoral, quando recolhidos a estabelecimentos sujeitos à administração estadual.

**Natureza da incompetência territorial: relativa.** Pode ser **prorrogada** se não arguida no momento oportuno (resposta à acusação, via exceção de incompetência — CPP, art. 108). Não pode ser declarada de ofício após a preclusão (**Súmula 33/STJ**). Nulidade relativa: art. 564, I, e art. 572 do CPP.

:::exemplo
Situação: Um golpista em Recife aplica fraude em vítima de Curitiba, que faz transferência bancária (PIX).
Pergunta: Qual é o foro?
Resposta: **Curitiba**, domicílio da vítima (CPP, art. 70, § 4º, incluído pela Lei 14.155/2021).
:::

:::exemplo
Situação: Um homicídio doloso foi praticado por disparo em Sorocaba, e a vítima morreu em hospital de São Paulo.
Pergunta: Qual comarca?
Resposta: Pela letra do art. 70, o local do resultado; mas o STJ, por conveniência da instrução, define como **Sorocaba (local da conduta)**.
:::
"""),
], None)

M3 = ("6.2.4 Critério material (ratione materiae): qual Justiça é competente", [
("explicacao", "Justiça Federal, Militar, Eleitoral, Júri, Juizados e varas especializadas", """
**Justiça Comum Estadual — competência residual.** Tudo que não for atribuído às Justiças especiais ou à Federal. Inclui as **contravenções** (inclusive contra a União, Súmula 38/STJ) e os crimes de **policial penal, civil, militar estadual não militares** (crimes comuns).

**Justiça Federal (CF, art. 109)** — rol taxativo:
- **IV:** infrações penais contra **bens, serviços ou interesse da União**, de suas entidades autárquicas ou empresas públicas, excluídas as **contravenções** e ressalvada a competência da Justiça Militar e da Eleitoral.
- **V:** crimes previstos em **tratado ou convenção internacional**, quando, iniciada a execução no País, o resultado tenha ocorrido ou devesse ocorrer no estrangeiro, ou reciprocamente (ex.: tráfico internacional de drogas, art. 70 da Lei 11.343/2006).
- **V-A e § 5º:** grave violação de direitos humanos (incidente de deslocamento de competência, a cargo do STJ, por provocação do PGR).
- **VI:** crimes contra a organização do trabalho e, nos casos determinados por lei, contra o sistema financeiro e a ordem econômico-financeira.
- **IX:** crimes cometidos a bordo de **navios ou aeronaves**, ressalvada a competência da Justiça Militar (navio = grande porte, segundo o STJ).
- **X:** crimes de ingresso ou permanência irregular de estrangeiro, execução de carta rogatória e sentença estrangeira homologada, e a **opção de nacionalidade**.
- **XI:** disputa sobre direitos indígenas.

**Súmulas de Justiça Federal e Estadual (STJ)**
- **Súmula 38:** contravenções penais — Justiça Estadual, ainda que contra bens da União.
- **Súmula 122:** compete à Justiça Federal o processo e julgamento unificado dos crimes conexos de competência federal e estadual.
- **Súmula 147:** compete à Justiça Federal julgar crimes praticados **contra funcionário público federal** quando relacionados com o exercício da função.
- **Súmula 140:** compete à Justiça Estadual crime em que o **indígena** figure como autor ou vítima.
- **Súmula 75:** compete à Justiça Comum Estadual o **policial militar** pelo crime de promover ou facilitar a fuga de preso de estabelecimento penal (crime comum, não militar).

**Justiça Militar**
- **Da União (CF, art. 124):** crimes militares definidos em lei (CPM, art. 9º; Lei 13.491/2017 ampliou os crimes militares por extensão). Militares das Forças Armadas que matam civil dolosamente em certas circunstâncias: JMU (Lei 13.491/2017, art. 9º, § 2º, do CPM).
- **Estadual (CF, art. 125, §§ 3º a 5º):** julga **policiais e bombeiros militares** em crimes militares; **não julga civis**. Nos crimes dolosos contra a vida de civil, o **Tribunal do Júri** julga o militar estadual (art. 125, § 4º).
- **Súmula 53/STJ:** compete à Justiça Comum Estadual processar e julgar civil acusado de prática de crime contra instituições militares estaduais.

**Justiça Eleitoral (CF, art. 121; Código Eleitoral).** Crimes eleitorais e **conexos** (STF, Inq 4.435 AgR-QO: crimes comuns conexos a eleitoral são da Justiça Eleitoral).

**Tribunal do Júri (CF, art. 5º, XXXVIII, *d*; CPP, art. 74, § 1º).** Crimes **dolosos contra a vida**, tentados ou consumados: homicídio (art. 121), feminicídio, induzimento/instigação/auxílio a suicídio (art. 122), infanticídio (art. 123) e aborto (arts. 124 a 127), além dos conexos. **Não vão ao júri:** latrocínio (Súmula 603/STF, juiz singular), extorsão mediante sequestro com resultado morte, lesão corporal seguida de morte e homicídio culposo.

**Juizados Especiais Criminais (Lei 9.099/1995, arts. 60 e 61).** Infrações de menor potencial ofensivo: contravenções e crimes com pena máxima **≤ 2 anos**. Competência pelo **lugar da prática** (art. 63).

**Violência doméstica (Lei 11.340/2006, art. 14).** Juizados/Varas de Violência Doméstica e Familiar contra a Mulher, com competência cível e criminal. O STJ admite o Júri para crimes dolosos contra a vida no âmbito doméstico (competência do Tribunal do Júri, com atuação da Vara especializada nas medidas protetivas).

:::exemplo
Situação: Um tráfico de drogas começa no Paraguai e termina no Brasil.
Pergunta: Qual Justiça?
Resposta: **Federal** (CF, art. 109, V; Lei 11.343/2006, art. 70): transnacionalidade do delito.
:::

:::exemplo
Situação: Um policial militar estadual comete lesão corporal contra civil durante serviço, em local não militar.
Pergunta: Qual Justiça?
Resposta: **Justiça Comum** (crime não militar, art. 9º do CPM), salvo hipótese de crime militar. Se fosse homicídio doloso, seria julgado pelo **Júri** (CF, art. 125, § 4º).
:::
"""),
], None)

M4 = ("6.2.5 Competência por prerrogativa de função (ratione personae)", [
("explicacao", "Foro por prerrogativa: quem, onde e até quando", """
**Fundamento.** A função (e não a pessoa) é protegida: o julgamento de certas autoridades cabe a tribunais, para garantir a independência do cargo. Não é privilégio pessoal.

**Quadro de competências originárias (crimes comuns)**

| Tribunal | Autoridades (exemplos) | Base |
|---|---|---|
| **STF** | Presidente e Vice, deputados federais e senadores, Ministros de Estado, Comandantes das Forças, PGR, Ministros do STF | CF, art. 102, I, *b* e *c* |
| **STJ** | Governadores dos Estados e do DF, desembargadores dos TJs e TRFs, conselheiros de TCE, membros dos TRFs/TRTs/TREs | CF, art. 105, I, *a* |
| **TRFs** | Juízes federais, membros do MPU (exceto os que oficiam em tribunais) | CF, art. 108, I, *a* |
| **TJs** | Juízes estaduais, membros do MP estadual, prefeitos (art. 29, X) e, conforme a Constituição Estadual, secretários de Estado, deputados estaduais | CF, art. 96, III; art. 125, § 1º |

**Foro por prerrogativa e o cargo atual.** O STF (**AP 937 QO, 2018**) restringiu o foro de deputados federais e senadores: aplica-se apenas aos crimes cometidos **durante o exercício do cargo** e **relacionados às funções desempenhadas**. Após o fim da instrução, a competência não se altera por mudança posterior de cargo (a "perpetuação" do foro).

**Súmulas e SV**
- **Súmula 451/STF:** a competência por prerrogativa de função não se estende ao crime cometido **após a cessação** definitiva do exercício funcional.
- **Súmula Vinculante 45 (Súmula 721/STF):** a competência constitucional do **Tribunal do Júri prevalece** sobre o foro por prerrogativa de função estabelecido **exclusivamente pela Constituição estadual**. Mas um foro previsto na **CF** (ex.: deputado federal) prevalece sobre o júri.
- **Súmula 702/STF:** a competência do TJ para julgar **prefeitos** restringe-se aos crimes da Justiça comum estadual; nos demais (federais), o respectivo TRF.
- **Súmula 704/STF:** não viola as garantias do juiz natural, da ampla defesa e do devido processo legal a atração por **continência ou conexão** do processo do corréu ao foro por prerrogativa de função de um dos denunciados.
- **Súmula 208/STJ:** compete à Justiça Federal processar e julgar prefeito por desvio de verba sujeita a prestação de contas perante órgão federal.
- **Súmula 209/STJ:** compete à Justiça Estadual processar e julgar prefeito por desvio de verba transferida e incorporada ao patrimônio municipal.

**Natureza da incompetência por prerrogativa de função:** **absoluta** (nulidade absoluta, reconhecível de ofício).

:::exemplo
Situação: Um ex-deputado federal responde por crime cometido durante o mandato, mas sem relação com o exercício do cargo.
Pergunta: Quem julga?
Resposta: **Primeira instância** (AP 937 QO): o foro no STF exige que o crime tenha sido cometido durante o mandato **e** em razão das funções.
:::
"""),
], None)

M5 = ("6.2.6 Distribuição, prevenção e natureza da competência (absoluta × relativa)", [
("aprofundamento", "Quando duas varas são igualmente competentes e o que acontece com o erro de competência", """
**Distribuição (CPP, art. 75).** Se na mesma circunscrição houver mais de um juiz igualmente competente, a **precedência da distribuição** fixa a competência. A distribuição de qualquer ato (inclusive a comunicação de prisão em flagrante, cautelar ou pedido anterior à denúncia) previne a competência.

**Prevenção (CPP, art. 83).** Verifica-se por prevenção a competência quando, concorrendo dois ou mais juízes igualmente competentes ou com jurisdição cumulativa, um deles se antecipa aos outros na prática de algum ato do processo ou de medida a este relativa, mesmo antes da denúncia. **Súmula 706/STF:** é **relativa** a nulidade decorrente da inobservância da competência penal por prevenção.

**Competência absoluta × relativa**

| Aspecto | Absoluta | Relativa |
|---|---|---|
| Critérios | Matéria (*ratione materiae*), pessoa/prerrogativa (*ratione personae*), hierarquia (funcional) | Território (*ratione loci*), prevenção, distribuição |
| Interesse protegido | Público | Das partes |
| Prorrogação | Não | Sim |
| Reconhecimento | A qualquer tempo, de ofício | Só até a preclusão; sem ofício depois (Súmula 33/STJ) |
| Nulidade | Absoluta (prejuízo presumido) | Relativa (precisa de arguição oportuna e prejuízo) |
| Efeitos dos atos | Atos **decisórios** nulos; instrutórios podem ser **ratificados** (STF/STJ) | Atos válidos se ratificados |
| Meio de arguição | Exceção de incompetência (CPP, arts. 108 e 109) e qualquer momento (HC) | Exceção de incompetência no prazo da defesa |

**Competência funcional (hierárquica):** recurso para tribunal; fase processual (juiz do júri na 1ª fase e presidente na 2ª); objeto do juízo (juízo da execução).

**Efeito do reconhecimento da incompetência (CPP, art. 567).** A incompetência do juízo anula **somente os atos decisórios**, devendo o processo, quando for declarada a nulidade, ser remetido ao juiz competente. O Código admite **ratificação** dos atos instrutórios (STF: HC 83.006; STJ).

**Conflito de competência (CPP, arts. 113 a 117; CF, art. 105, I, *d*).** Pode ser **positivo** (dois ou mais juízes se consideram competentes) ou **negativo** (nenhum se considera). Cabe ao **STJ** julgar conflito entre tribunais, entre tribunal e juiz a ele não vinculado e entre juízes vinculados a tribunais diversos. Dentro do mesmo tribunal, resolve o próprio tribunal. **Súmula 3/STJ:** compete ao TRF dirimir conflito entre juiz federal e juiz estadual investido de jurisdição federal da mesma Região. Entre juiz federal e estadual, o conflito é resolvido pelo STJ (Súmula 428/STJ: compete ao TRF decidir conflito entre juizado especial federal e juízo federal da mesma seção judiciária).

:::exemplo
Situação: Duas varas criminais de mesma competência existem em uma comarca; o inquérito sobre um furto foi distribuído à 2ª Vara, que decretou medida cautelar antes da denúncia.
Pergunta: Qual vara é prevento?
Resposta: A **2ª Vara**, que se antecipou na prática de ato (CPP, art. 83): ela julgará a ação penal.
:::
"""),
], None)

M6 = ("6.2.7 Conexão e continência: modificação da competência", [
("explicacao", "Conexão (art. 76), continência (art. 77) e unidade de julgamento", """
**Por que existem.** Para evitar decisões contraditórias e reunir provas, o CPP manda que processos ligados sejam julgados **juntos** (*simultaneus processus*), mesmo contra as regras comuns de competência.

**Conexão (CPP, art. 76)**

| Espécie | Hipótese | Exemplo |
|---|---|---|
| **Intersubjetiva por simultaneidade** | Duas ou mais infrações, praticadas ao mesmo tempo, por várias pessoas reunidas | Saque a uma loja por multidão |
| **Intersubjetiva por concurso** | Várias pessoas em concurso, embora diverso o tempo e o lugar | Roubos praticados em vários lugares pela mesma quadrilha |
| **Intersubjetiva por reciprocidade** | Várias pessoas, umas contra as outras | Rixa com lesões recíprocas |
| **Objetiva (teleológica ou consequencial)** | Uma infração praticada para facilitar ou ocultar outra, ou para conseguir impunidade ou vantagem | Homicídio para ocultar roubo |
| **Instrumental (probatória)** | A prova de uma infração influi na prova de outra | Furto e receptação |

**Continência (CPP, art. 77)**
- **I — Cumulação subjetiva:** duas ou mais pessoas são acusadas pela **mesma infração** (coautoria/participação).
- **II — Cumulação objetiva:** infração cometida nas condições dos arts. 51, § 1º, 53, segunda parte, e 54 do CP (concurso formal, *aberratio ictus* com unidade de ação, *aberratio criminis*).

**Prevalência na reunião (CPP, art. 78)**
1. No concurso de **jurisdições da mesma categoria**: a do lugar da infração mais grave; a do maior número de infrações (se igual gravidade); a da prevenção (se igual número).
2. No concurso entre **Júri e outro órgão** da jurisdição comum: **prevalece o Tribunal do Júri** (art. 78, I).
3. No concurso de **jurisdições de diversas categorias**: prevalece a de maior graduação.
4. No concurso de **jurisdição comum e especial**: prevalece a **especial** (militar, eleitoral). Mas a Justiça Militar e a comum se separam em regra (art. 79, I).
5. **Súmula 122/STJ:** crimes conexos de competência federal e estadual — Justiça Federal julga todos.

**Separação de processos (CPP, arts. 79 e 80)**
- **Obrigatória (art. 79):** concurso entre jurisdição comum e militar; entre jurisdição comum e juízo de menores (ECA); se, no processo, um dos réus foge ou doença mental superveniente.
- **Facultativa (art. 80):** infrações praticadas em circunstâncias de tempo ou lugar diferentes, excessivo número de acusados, ou outro motivo relevante.

**Exceções à reunião**
- **Súmula 235/STJ:** a conexão não determina a reunião dos processos se um deles já foi julgado (sentenciado).
- **Súmula 704/STF:** a atração por conexão ou continência do corréu ao foro de prerrogativa de função de outro denunciado não ofende o juiz natural.
- **Perpetuação (art. 81):** reunidos os processos por conexão ou continência, o juiz ou tribunal que proferir sentença absolutória ou desclassificar a infração para outra fora da sua competência **continua competente** em relação aos demais processos.

**Avocação.** Juízo ou tribunal superior pode avocar o processo (CPP, art. 82), exceto se já houver sentença definitiva.

:::exemplo
Situação: Um homicídio foi praticado para ocultar um roubo. O réu é o mesmo.
Pergunta: Há reunião? Onde são julgados?
Resposta: **Conexão objetiva consequencial** (art. 76, II). Prevalece o **Tribunal do Júri** para julgar o homicídio e o roubo conexo (art. 78, I).
:::
"""),
], None)

M7 = ("6.2.8 Quadros de revisão e pegadinhas", [
("pegadinhas", "O que mais cai sobre competência penal", """
1. **"A competência territorial é absoluta."** ❌ É **relativa** (prorroga-se se não arguida a tempo).
2. **"O foro por prerrogativa de função é relativo."** ❌ É **absoluto**.
3. **"O CPP adota, como regra, o local da conduta para fixar competência."** ❌ Regra: **consumação** (resultado). Exceções: tentativa, JECrim e a jurisprudência do homicídio.
4. **"Contravenção penal em detrimento da União vai à Justiça Federal."** ❌ Súmula 38/STJ: Justiça Estadual.
5. **"A Justiça Militar estadual julga civis."** ❌ Julga apenas policiais e bombeiros militares.
6. **"Latrocínio é julgado pelo Júri."** ❌ Súmula 603/STF: juiz singular (é crime contra o patrimônio).
7. **"A competência do júri prevalece sempre sobre qualquer foro por prerrogativa."** ❌ Prevalece só sobre foro fixado **exclusivamente por Constituição estadual** (SV 45).
8. **"A conexão sempre obriga a reunião."** ❌ Exceções: Súmula 235/STJ, art. 79, separação facultativa.
9. **"O juiz absolutamente incompetente pode praticar atos válidos."** ⚠️ Atos decisórios nulos; atos instrutórios, ratificáveis.
10. **"O estelionato por cheque sem fundos é julgado onde se recusou o pagamento."** ❌ Hoje, domicílio da vítima (art. 70, § 4º, após a Lei 14.155/2021).
11. **"O foro por prerrogativa subsiste depois que a autoridade deixa o cargo, para qualquer crime."** ❌ Súmula 451/STF e AP 937 QO.
12. **"Crime praticado por funcionário público federal contra funcionário federal vai sempre à Justiça Federal."** ⚠️ Depende da relação com o exercício da função (Súmula 147/STJ).

**Árvore de decisão para a prova**

| Passo | Pergunta | Se sim |
|---|---|---|
| 1 | Há prerrogativa de função prevista na CF? | Tribunal competente (STF/STJ/TRF/TJ) |
| 2 | É crime militar, eleitoral ou federal (art. 109)? | Justiça especial ou federal |
| 3 | É doloso contra a vida? | Tribunal do Júri |
| 4 | É menor potencial ofensivo? | JECrim |
| 5 | É violência doméstica contra a mulher? | Vara/Juizado de violência doméstica |
| 6 | Qual o lugar da infração? | Comarca (art. 70) |
| 7 | Há mais de uma vara igualmente competente? | Distribuição/prevenção |
| 8 | Há conexão ou continência? | Reunião (art. 78) ou separação (arts. 79 e 80) |

:::exemplo
Situação: Um policial penal estadual comete concussão. Quem julga?
Pergunta: Há foro especial?
Resposta: Não há foro por prerrogativa para policial penal; a competência é do juízo **comum estadual**, no lugar da consumação (art. 70 do CPP).
:::
"""),
], None)

FLASH = """

**Qual a diferença entre jurisdição e competência?**
→ Jurisdição é o poder de julgar; competência é a medida desse poder para cada órgão.

**Qual a regra geral de competência territorial?**
→ O lugar da consumação (teoria do resultado); na tentativa, o do último ato de execução (CPP, art. 70).

**Qual o foro do estelionato por transferência ou cheque sem fundos?**
→ O domicílio da vítima (CPP, art. 70, § 4º).

**A incompetência territorial é absoluta ou relativa?**
→ Relativa.

**Quais as competências absolutas?**
→ Em razão da matéria, da pessoa (prerrogativa de função) e funcional.

**Qual Justiça julga contravenções contra bens da União?**
→ A Estadual (Súmula 38/STJ).

**O que diz a SV 45?**
→ O júri prevalece sobre foro por prerrogativa fixado exclusivamente em Constituição estadual.

**Quando há conexão intersubjetiva por reciprocidade?**
→ Quando várias pessoas cometem infrações umas contra as outras (ex.: rixa).

**Quem prevalece quando há conexão entre júri e outro órgão comum?**
→ O Tribunal do Júri (CPP, art. 78, I).

**A conexão obriga a reunião se um processo já foi sentenciado?**
→ Não (Súmula 235/STJ).
"""

build("l06.json", "jurisdicao-competencia-e-atr-6-2-competencia-penal-conceito-criterios-de-determinac-0js5dx6", 2, [M1, M2, M3, M4, M5, M6, M7], FLASH)
