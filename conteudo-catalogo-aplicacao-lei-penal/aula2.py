from helpers import *

# ============================================================== 7 — Módulo 3 (1/2)
sec("explicacao", "Módulo 3 — Lei penal no tempo (1/2): regra geral, retroatividade benéfica, as quatro modalidades e a abolitio criminis", """
> **Art. 2º** - Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória.
> **Parágrafo único** - A lei posterior, que de qualquer modo favorecer o agente, aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado.
> **CF, art. 5º, XL** - a lei penal não retroagirá, salvo para beneficiar o réu.

### 3.1 Regra geral: a lei do tempo do fato
📘 **Conceito técnico:** em regra, aplica-se a lei **vigente ao tempo do fato** (*tempus regit actum*). O "tempo do fato" é definido pelo art. 4º (momento da **conduta** — Módulo 5).
🗣️ **Em linguagem simples:** julga-se o fato pela lei que existia quando ele aconteceu — **a não ser** que a lei nova seja melhor para o réu.

### 3.2 Irretroatividade da lei mais grave × retroatividade da mais benéfica
- **Lei mais grave** (*lex gravior*): **não retroage**. Fatos anteriores continuam regidos pela lei antiga, mais branda (que fica **ultra-ativa**).
- **Lei mais benéfica** (*lex mitior*): **retroage** — e "**de qualquer modo**": pena menor, regime melhor, novo benefício, requisito mais fácil, prazo prescricional menor etc.
- Retroage **ainda que** já exista **sentença condenatória transitada em julgado**. Não há coisa julgada contra a lei mais benéfica.
🚨 **Pegadinha:** "A lei penal mais benéfica retroage, salvo se já houver trânsito em julgado" → **Errado** (p. ú. do art. 2º).

### 3.3 As quatro modalidades de sucessão legislativa
| Modalidade | O que a lei nova faz | Retroage? | Exemplo com datas (hipotético) |
|---|---|---|---|
| **Novatio legis incriminadora** | Torna crime fato antes lícito | **Não** | Lei de 01/06/2026 cria crime; fato de 20/05/2026 é atípico |
| **Novatio legis in pejus** | Agrava: pena maior, nova qualificadora, regime mais rígido | **Não** | Pena sobe de 1–4 para 2–6 anos em 01/06/2026; fato de 20/05/2026 → 1–4 |
| **Novatio legis in mellius** | Beneficia de qualquer modo, mantendo o crime | **Sim** | Pena cai de 2–6 para 1–4 em 01/06/2026; fato de 20/05/2026 → 1–4 |
| **Abolitio criminis** | Deixa de considerar o fato crime | **Sim** | Tipo revogado sem migração em 01/06/2026; condenados por fato de 2025 → punibilidade extinta |
⚠️ **Lei mista** (uma parte melhor, outra pior): o juiz deve verificar **qual lei, aplicada por inteiro, é mais favorável** no caso concreto — ver a vedação à combinação de leis no Módulo 3 (2/2).

### 3.4 Abolitio criminis
📘 **Conceito técnico:** é a **lei posterior que deixa de considerar o fato crime** (descriminalização). É causa de **extinção da punibilidade** (CP, art. 107, III: "pela retroatividade de lei que não mais considera o fato como criminoso").
🧪 **Exemplo real:** a **Lei 11.106/2005** revogou o art. 240 do CP (**adultério**). A conduta deixou de ser crime em todo o ordenamento: houve **abolitio criminis**.

**Efeitos da abolitio criminis:**
| Efeito | O que acontece |
|---|---|
| **Execução da pena** | **Cessa** imediatamente (o preso deve ser solto, se preso só por esse crime) |
| **Efeitos penais da condenação** | **Cessam**: a condenação não gera **reincidência** nem maus antecedentes; desaparecem os efeitos penais secundários |
| **Momento** | Pode ser reconhecida em **qualquer fase**: inquérito, processo, recurso ou **após o trânsito em julgado** (execução) |
| **Efeitos civis (extrapenais)** | **Permanecem**: a obrigação de **reparar o dano** (art. 91, I) não desaparece, porque a lei nova afeta a esfera penal |
🚨 **Pegadinha:** "A abolitio criminis apaga todos os efeitos da sentença, inclusive a obrigação de indenizar" → **Errado**: só os efeitos **penais**.

### 3.5 Revogação formal × efetiva descriminalização
**Revogar um artigo não significa, por si só, abolitio criminis.** Se a conduta continua punida em **outro** dispositivo (ou na mesma lei, com outra redação), houve só mudança de "endereço" — é a **continuidade normativo-típica** (Módulo 3, parte 2). Abolitio exige que a **conduta** deixe de ser crime.
| Pergunta | Abolitio | Continuidade normativo-típica |
|---|---|---|
| O artigo foi revogado? | Sim | Sim |
| A conduta continua punida em outro tipo? | **Não** | **Sim** |
| Extingue a punibilidade? | **Sim** (art. 107, III) | **Não** (aplica-se a lei mais benéfica entre as duas) |
🛡️ **Como não errar:** antes de dizer "abolitio", procure se a conduta **migrou** para outro artigo.
✍️ **Fixação:** lei nova reduz a pena de um crime depois que o réu já foi condenado definitivamente. Ela se aplica? → **Sim** (p. ú. do art. 2º), pelo juízo da execução.
""" + ex(
    "Lúcia cumpre pena por um crime cuja conduta, em 01/08/2026, deixa de ser prevista como crime em qualquer lei (não houve migração para outro tipo). A vítima também tem uma ação de indenização em andamento.",
    "O que acontece com a pena de Lúcia e com a indenização?",
    "**A pena se extingue; a indenização segue.** Houve **abolitio criminis** (art. 2º, caput): cessam a **execução** e os **efeitos penais** da condenação (ela não será reincidente por esse fato), mesmo com trânsito em julgado — causa de extinção da punibilidade (art. 107, III). Já a obrigação de **reparar o dano** é efeito **civil** e **permanece**.",
    [Q("cela", "Lúcia cumpre pena.", [P("preso", "esq", "neutro", "triste"), P("policial_penal", "dir", "fala", "neutro", "documento")], (1, "Chegou decisão do juiz da execução.")),
     Q("forum", "O juiz declara extinta a punibilidade.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Abolitio: extinta a punibilidade."))],
    "Abolitio: só efeitos penais | ok",
    comp("Efeitos da abolitio criminis", ("Esfera penal", "Cessa tudo", "ok", ["Execução da pena", "Reincidência", "Vale após o trânsito"]),
         ("Esfera civil", "Permanece", "alerta", ["Reparação do dano", "Restituições", "Ação cível segue"]))),
    ["N0002", "N0003"])
m("Lei penal no tempo", 7)

# ============================================================== 8 — Módulo 3 (2/2)
sec("aprofundamento", "Módulo 3 — Lei penal no tempo (2/2): lei intermediária, ultra-atividade, continuidade normativo-típica e combinação de leis", """
### 3.6 Ultra-atividade
📘 **Conceito técnico:** é a aplicação de uma lei **depois de revogada**, aos fatos praticados durante sua vigência. Acontece quando a lei revogada é **mais benéfica** do que a nova (a nova, mais grave, não retroage) e nas **leis temporárias e excepcionais** (art. 3º — Módulo 4).
🗣️ **Em linguagem simples:** a lei "morre", mas continua valendo para o passado porque é melhor para o réu.
| Fenômeno | Direção | Quando ocorre |
|---|---|---|
| **Retroatividade** | Lei nova alcança fato **anterior** | Lei nova mais benéfica |
| **Ultra-atividade** | Lei velha alcança fato **sob a nova** (após revogada) | Lei velha mais benéfica; leis temporárias e excepcionais |
| **Extra-atividade** | Gênero que abrange as duas | Lei aplicada fora do seu período de vigência |

### 3.7 Lei penal intermediária
📘 **Conceito técnico:** é a lei que **entra e sai** de vigência **entre** a data do fato e a data do julgamento. Se for a **mais benéfica** das três, prevalece o entendimento (doutrina majoritária e STF) de que ela deve ser aplicada — é, ao mesmo tempo, **retroativa** (em relação ao fato) e **ultra-ativa** (em relação ao julgamento).
🧪 **Exemplo com datas (hipotético):**
- **Lei A** (vigente na data do fato, 10/01/2025): pena de 2 a 8 anos.
- **Lei B** (de 01/06/2025 a 31/12/2025): pena de 1 a 4 anos.
- **Lei C** (desde 01/01/2026, vigente no julgamento): pena de 2 a 6 anos.
→ Aplica-se a **Lei B**, a mais benéfica, embora não estivesse vigente nem no fato nem no julgamento.

### 3.8 Continuidade normativo-típica
📘 **Conceito técnico:** ocorre quando a lei nova **revoga formalmente** um tipo penal, mas a **mesma conduta** continua criminalizada em outro dispositivo. **Não há abolitio criminis**; há mera alteração topográfica (ou de redação). Aplica-se a lei mais benéfica entre a antiga e a nova.
🧪 **Exemplos reais:**
- A **Lei 12.015/2009** revogou o art. 214 do CP (**atentado violento ao pudor**), mas a conduta passou a integrar o **estupro** (art. 213, nova redação). Não houve abolitio.
- A **Lei 11.106/2005** revogou o art. 219 (**rapto**), e a conduta passou a ser forma qualificada do **sequestro e cárcere privado** (art. 148, § 1º, V).
🚨 **Pegadinha:** "Revogado o art. 214, os condenados por atentado violento ao pudor tiveram a punibilidade extinta" → **Errado**: continuidade normativo-típica.

### 3.9 Combinação de leis penais (lex tertia)
📘 **O problema:** a lei antiga tem uma parte boa (ex.: pena-base menor) e a nova tem outra parte boa (ex.: uma causa de diminuição). O juiz pode **juntar as partes boas** das duas?
| Posição | Argumento |
|---|---|
| **Contra a combinação** (prevalece nos tribunais superiores) | O juiz criaria uma **terceira lei** (*lex tertia*) que o legislador nunca fez, violando a **legalidade** e a **separação de Poderes** |
| **A favor** (parte da doutrina) | Se o juiz pode aplicar a lei nova inteira ou a velha inteira, pode aplicar o que há de melhor em cada uma, em nome da retroatividade benéfica |
**Jurisprudência (sucessão das Leis de Drogas — Lei 6.368/1976 × Lei 11.343/2006):**
- **STF, Tema 169 de Repercussão Geral (RE 600.817/MS, Plenário, 07/11/2013):** é inadmissível aplicar a causa de diminuição do art. 33, § 4º, da Lei 11.343/2006 à pena da Lei 6.368/1976; não é possível conjugar partes das duas leis; o juiz deve verificar qual lei é mais favorável e **aplicá-la integralmente**.
- **STJ, Súmula 501:** admite a retroatividade da Lei 11.343/2006 se o resultado da sua aplicação **na íntegra** for mais favorável, **vedada a combinação de leis**.
⚠️ **Limites:** a vedação foi firmada nesse contexto. Na prova, se a questão pedir a "posição dos tribunais superiores", marque a **vedação**; se pedir a "controvérsia doutrinária", reconheça as duas correntes.

### 3.10 Quem aplica a lei mais benéfica?
- **Antes do trânsito em julgado:** o juiz ou tribunal onde o processo estiver.
- **Depois do trânsito em julgado:** o **juízo da execução** — **Súmula 611 do STF** ("Transitada em julgado a sentença condenatória, compete ao juízo das execuções a aplicação de lei mais benigna") e LEP, art. 66, I.
⚠️ **Lei em vacatio legis:** se a lei benéfica foi publicada mas ainda não entrou em vigor, há divergência sobre aplicá-la desde já; a posição mais segura para a prova é a de que a retroatividade opera a partir da **vigência**, salvo se o enunciado trouxer outra orientação.
✍️ **Fixação:** lei intermediária mais benéfica, já revogada na data da sentença, pode ser aplicada? → **Sim**, pela posição majoritária.
""" + ex(
    "Fato em 10/01/2025 (pena de 2 a 8 anos). Em 01/06/2025, lei nova reduz a pena para 1 a 4 anos. Em 01/01/2026, outra lei eleva a pena para 2 a 6 anos. A sentença sai em março de 2026.",
    "Qual lei o juiz aplica?",
    "**A lei intermediária (1 a 4 anos).** Ela é a mais benéfica e, pela posição majoritária, deve ser aplicada: **retroage** em relação ao fato (que é anterior a ela) e é **ultra-ativa** em relação à sentença (proferida quando já revogada). A lei de 2026, mais grave, não retroage; a lei original, também mais grave que a intermediária, cede.",
    [Q("forum", "O juiz compara três leis.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Fato em 2025, sentença em 2026...")),
     Q("forum", "A defesa aponta a lei intermediária.", [P("advogado", "esq", "aponta", "feliz", "documento"), P("promotor", "dir", "neutro", "serio")], (0, "A lei do meio é a melhor!"))],
    "Intermediária mais benéfica | ok",
    linha("Três leis em sequência", "meses", [(0, "Fato: pena 2–8", "neutro"), (5, "Lei B: 1–4", "ok"), (12, "Lei C: 2–6", "alerta"), (14, "Sentença: aplica B", "ok")])),
    ["N0002", "N0003"])
m("Lei penal no tempo", 8)

# ============================================================== 9 — Módulo 4
sec("explicacao", "Módulo 4 — Leis temporárias e excepcionais (art. 3º): ultra-atividade e linhas do tempo", """
> **Art. 3º** - A lei excepcional ou temporária, embora decorrido o período de sua duração ou cessadas as circunstâncias que a determinaram, aplica-se ao fato praticado durante sua vigência.

### 4.1 Conceitos
| | **Lei temporária** | **Lei excepcional** |
|---|---|---|
| Conceito | Tem **prazo de vigência pré-fixado** no próprio texto | Vigora **enquanto durar** uma situação anormal (guerra, calamidade, epidemia) |
| Termo final | **Data certa** | **Cessação das circunstâncias** que a motivaram |
| Exemplo | Lei que diz "vigorará até 31/12/2026" | Lei editada "durante o estado de calamidade" |
| Fim da vigência | Autorrevogação na data | Autorrevogação quando a situação acaba |
Ambas são chamadas de **leis intermitentes** ou **autorrevogáveis**: deixam de vigorar sem precisar de lei revogadora.

🧪 **Exemplo citado com frequência em provas:** a **Lei Geral da Copa (Lei 12.663/2012)** criou crimes (ex.: uso indevido de símbolos oficiais) e previu, no art. 36, que esses tipos penais teriam vigência **até 31/12/2014** — típica **lei temporária**.

### 4.2 Ultra-atividade: o coração do art. 3º
📘 As leis temporárias e excepcionais **continuam se aplicando** aos fatos praticados **durante sua vigência**, mesmo depois que o período acaba ou que as circunstâncias cessam.
🗣️ **Em linguagem simples:** quem cometeu o crime durante a vigência da lei temporária continua respondendo por ele, ainda que a lei já tenha "vencido".
🎯 **Por quê?** Se o fim da vigência funcionasse como abolitio, bastaria **atrasar o processo** até o prazo acabar para ficar impune — a lei perderia toda a força intimidativa justamente quando é mais necessária.

🚨 **PEGADINHA CENTRAL:** "Encerrado o prazo de vigência de uma lei temporária, opera-se a abolitio criminis em relação aos fatos praticados durante sua vigência." → **ERRADO.** O encerramento da vigência **não elimina** a possibilidade de aplicar a lei aos fatos praticados enquanto ela vigorava (art. 3º).

### 4.3 Linha do tempo comentada (hipotética)
- **01/03/2026:** entra em vigor lei excepcional que pune a venda de álcool em gel acima do preço tabelado durante a calamidade.
- **15/04/2026:** João pratica a conduta.
- **30/06/2026:** a calamidade termina; a lei deixa de vigorar.
- **10/09/2026:** João é julgado → **responde** com base na lei excepcional (art. 3º).
- **05/07/2026:** Maria pratica a mesma conduta → **fato atípico** (a lei já não vigorava).

### 4.4 Relação com a sucessão de leis e o art. 2º
- O fim da vigência da lei temporária/excepcional **não é** "lei posterior que deixa de considerar o fato crime" (art. 2º): a sociedade **não mudou de opinião** sobre a conduta; apenas a **situação especial** acabou.
- ⚠️ **Lei posterior mais benéfica durante a vigência:** se, **ainda durante** o período excepcional, nova lei **abranda** o tratamento da mesma conduta (ou seja, muda a valoração daquela situação), prevalece na doutrina que ela **retroage** aos fatos anteriores do mesmo período, por força do art. 5º, XL, da CF. O que **não** beneficia o réu é o simples **término** da vigência.

### 4.5 Limites constitucionais
- A CF diz que a lei penal **não retroagirá, salvo para beneficiar** (art. 5º, XL). Parte da doutrina critica o art. 3º por, em tese, impedir a retroatividade da "lei" que volta a valer depois do período.
- **Prevalece** que o art. 3º é **compatível com a CF**: o elemento **tempo** integra a própria proibição ("durante a calamidade"), de modo que não há lei posterior mais benéfica sobre o **mesmo fato** — há só o fim da situação.
- A lei temporária/excepcional **também não retroage para prejudicar**: fatos anteriores à sua entrada em vigor não são alcançados (art. 1º).
✍️ **Fixação:** fato praticado na vigência de lei temporária, julgado depois do prazo final. Aplica-se a lei? → **Sim** (ultra-atividade, art. 3º).
""" + ex(
    "Durante um estado de calamidade, entra em vigor lei excepcional que pune o desvio de doações oficiais. Rita desvia doações em maio. A calamidade acaba em julho, e o julgamento ocorre em outubro.",
    "Rita pode ser condenada com base na lei que já não vigora?",
    "**Sim.** A lei excepcional é **ultra-ativa** (art. 3º): aplica-se aos fatos praticados **durante sua vigência**, ainda que as circunstâncias tenham cessado. O fim da calamidade **não** é abolitio criminis. Só não seriam alcançados fatos praticados **antes** de a lei entrar em vigor ou **depois** de cessada a calamidade.",
    [Q("reparticao", "Maio: Rita desvia doações.", [P("investigado", "esq", "pega", "neutro", "maleta"), P("servidor", "dir", "neutro", "surpreso")]),
     Q("forum", "Outubro: a calamidade já acabou.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Fato na vigência: aplica-se o art. 3º."))],
    "Ultra-atividade | ok",
    linha("Lei excepcional e o fato", "meses", [(0, "Lei entra em vigor", "neutro"), (2, "Fato de Rita", "alerta"), (4, "Fim da calamidade", "neutro"), (7, "Julgamento: aplica", "ok")])),
    ["N0004"])
m("Leis temporárias e excepcionais", 9)

# ============================================================== 10 — Módulo 5
sec("explicacao", "Módulo 5 — Tempo do crime (art. 4º): teoria da atividade, idade do agente e a Súmula 711 do STF", """
> **Art. 4º** - Considera-se praticado o crime no momento da ação ou omissão, ainda que outro seja o momento do resultado.

### 5.1 Conceito e teorias
📘 **Tempo do crime** é o momento em que o crime se considera praticado. Ele define **qual lei** se aplica (Módulo 3) e a **imputabilidade** do agente (idade).
| Teoria | O crime é praticado quando… | Adotada no CP? |
|---|---|---|
| **Atividade** | ocorre a **ação ou omissão** | **Sim — art. 4º** |
| **Resultado** (evento) | ocorre o **resultado** | Não (para o tempo do crime) |
| **Ubiquidade** (mista) | ocorre a conduta **ou** o resultado | Não para o tempo (é a do **lugar**, art. 6º) |
🗣️ **Em linguagem simples:** vale a hora do **tiro**, não a hora da **morte**.

### 5.2 Ação e resultado em momentos distintos
🧪 Em 20/05/2026, Bruno envenena a vítima; ela morre em 02/06/2026. Em 01/06/2026 entra em vigor lei que aumenta a pena do homicídio. → **Aplica-se a lei de 20/05/2026** (data da conduta); a lei mais grave não retroage.

### 5.3 Idade do agente no momento da conduta
- **CP, art. 27:** os menores de 18 anos são **penalmente inimputáveis** (sujeitos ao ECA).
- **ECA, art. 104, parágrafo único:** considera-se a idade do adolescente **à data do fato**.
🧪 Tiago, com **17 anos e 11 meses**, atira na vítima; ela morre quando Tiago já tem **18 anos**. → Tiago é **inimputável** para o Direito Penal: conta o momento da **ação**. Responde pelo **ato infracional** segundo o ECA.
🚨 **Pegadinha:** "Como o resultado ocorreu quando o agente já era maior, ele responde pelo homicídio" → **Errado** (art. 4º).
⚠️ **Não confunda com a prescrição:** o prazo prescricional começa, em regra, do dia em que o crime **se consumou** (art. 111, I) — regra específica, diferente do tempo do crime.

### 5.4 Crimes permanentes e continuados
- **Crime permanente:** a consumação **se prolonga** no tempo (ex.: sequestro, art. 148; extorsão mediante sequestro, art. 159). Enquanto a vítima está privada da liberdade, o crime **está sendo praticado**.
- **Crime continuado (art. 71):** vários crimes da mesma espécie, em condições semelhantes, tratados como **um só** para fins de pena.
- Se uma lei **mais grave** entra em vigor **antes de cessar** a permanência ou a continuidade, ela se aplica a **todo** o crime.

**Súmula 711 do STF:** "A lei penal mais grave aplica-se ao crime continuado ou ao crime permanente, se a sua vigência é anterior à cessação da continuidade ou da permanência." (aprovada em 24/09/2003; consulta oficial em jurisprudencia.stf.jus.br)
🧪 Sequestro iniciado em 10/05/2026; lei mais grave entra em vigor em 15/05/2026; vítima libertada em 20/05/2026. → Aplica-se a **lei mais grave**, porque ela entrou em vigor **antes** de cessar a permanência.
⚠️ **Não amplie a súmula:**
- Ela vale **só** para crime **continuado** ou **permanente**.
- Exige que a lei mais grave tenha entrado em vigor **antes** de cessar a continuidade/permanência.
- **Não** se aplica a crime **instantâneo de efeitos permanentes** (ex.: homicídio — o resultado dura, mas a conduta não se prolonga): ali vale a lei da data da conduta.
- No crime continuado, a súmula **não** autoriza punir com a lei nova um crime parcelar que, isolado, tenha terminado antes dela **e** não integre a continuidade.

### 5.5 Sucessão de leis durante a execução ou antes do resultado
| Situação | Lei aplicável |
|---|---|
| Crime instantâneo; lei nova mais grave entre a conduta e o resultado | Lei da **data da conduta** (art. 4º) |
| Crime instantâneo; lei nova **mais benéfica** depois da conduta | Lei **nova** (retroatividade benéfica) |
| Crime permanente/continuado; lei mais grave antes de cessar | Lei **mais grave** (Súmula 711) |
| Crime permanente; lei mais grave depois de cessar | Lei **anterior** |
✍️ **Fixação:** em crime permanente, a lei mais grave que entra em vigor durante a permanência se aplica? → **Sim** (Súmula 711/STF).
""" + ex(
    "Em 28/04/2026, um grupo sequestra um empresário. Em 05/05/2026 entra em vigor lei que aumenta a pena da extorsão mediante sequestro. A vítima é libertada em 12/05/2026.",
    "Qual pena se aplica: a anterior ou a nova, mais grave?",
    "**A nova, mais grave.** A extorsão mediante sequestro é **crime permanente**: enquanto a vítima esteve privada da liberdade, o crime **continuava sendo praticado**. Como a lei mais grave entrou em vigor **antes** de cessar a permanência, aplica-se a **Súmula 711 do STF**. Não há retroatividade: a lei alcança uma conduta que ainda acontecia na sua vigência.",
    [Q("casa", "28/04: o empresário é sequestrado.", [P("investigado", "esq", "ataca", "bravo", "arma"), P("vitima", "dir", "neutro", "surpreso")]),
     Q("delegacia", "12/05: a vítima é libertada.", [P("delegado", "esq", "fala", "serio", "documento"), P("vitima", "dir", "neutro", "feliz")], (0, "A lei nova pegou a permanência."))],
    "Súmula 711/STF | alerta",
    linha("Crime permanente e lei nova", "dias", [(0, "Início do sequestro", "alerta"), (7, "Lei mais grave", "erro"), (14, "Libertação", "ok")])),
    ["N0005"])
m("Tempo do crime", 10)
