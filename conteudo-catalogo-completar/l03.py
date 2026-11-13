from lib import build

M1 = ("3.2.2 Infração penal: conceito formal, material e analítico", [
("texto_legal", "Lei de Introdução ao Código Penal (Decreto-Lei 3.914/1941), art. 1º", """
> **Art. 1º** Considera-se **crime** a infração penal a que a lei comina pena de **reclusão ou de detenção**, quer isoladamente, quer alternativa ou cumulativamente com a pena de **multa**; **contravenção**, a infração penal a que a lei comina, isoladamente, pena de **prisão simples** ou de **multa**, ou ambas, alternativa ou cumulativamente.

O Código Penal **não define** crime. A definição legal vem da Lei de Introdução ao Código Penal (LICP) e do critério da **pena cominada**.
"""),
("explicacao", "Infração penal, crime e delito: o gênero e as espécies", """
**Infração penal** é o **gênero**. Dele decorrem duas espécies no Brasil: **crime (ou delito)** e **contravenção penal**. Por isso se diz que o Brasil adota o **sistema bipartido (dicotômico)**: crime/delito de um lado, contravenção de outro.

| Sistema | Países | Divisão |
|---|---|---|
| **Bipartido** | **Brasil**, Alemanha, Itália | Crime (ou delito) × Contravenção |
| **Tripartido** | França e outros | Crime × Delito × Contravenção (graus de gravidade) |

**Crime e delito são sinônimos** no direito brasileiro. A distinção entre os dois só existe no sistema tripartido. Em prova, "o Brasil adota a tripartição" é **errado**.

**Ato infracional.** É a conduta descrita como **crime ou contravenção penal** praticada por criança ou adolescente (ECA, art. 103). Não é "infração penal" em sentido técnico, porque os menores de 18 anos são **inimputáveis** (CF, art. 228; CP, art. 27).

**Conceito de crime — três ângulos**

1. **Formal (nominal):** crime é a conduta proibida por lei sob ameaça de pena (reclusão ou detenção). É o conceito do art. 1º da LICP.
2. **Material (substancial):** crime é a conduta humana que **lesa ou expõe a perigo bens jurídicos** relevantes, protegidos pelo direito penal. Funda a intervenção mínima e a ofensividade.
3. **Analítico (dogmático):** decompõe o crime em seus elementos.
   - **Teoria tripartida (majoritária):** crime = **fato típico** + **ilícito (antijurídico)** + **culpável**.
   - **Teoria bipartida:** crime = fato típico + ilícito; a **culpabilidade** é pressuposto de aplicação da pena (adotada por parte da doutrina, como Damásio e Mirabete).
   - **Teoria quadripartida:** acrescenta a **punibilidade** (minoritária).

**Relevância.** O conceito formal define a classificação por **pena**; o material orienta a criminalização e a insignificância; o analítico guia a resolução das questões de teoria do delito.

**Distinção entre infração penal e ilícito civil/administrativo.** A diferença é **de grau e de política criminal** (critério quantitativo-valorativo): o legislador escolhe os bens mais relevantes e as ofensas mais graves para o direito penal (intervenção mínima, *ultima ratio*). Não há diferença ontológica.

:::exemplo
Situação: Uma lei prevê "reclusão de 1 a 3 anos" para quem falsificar determinado selo.
Pergunta: É crime ou contravenção? Por quê?
Resposta: **Crime (delito)**. O critério do art. 1º da LICP é a **pena cominada**: reclusão ou detenção caracteriza crime.
:::

:::exemplo
Situação: Um adolescente de 16 anos subtrai um celular, mediante grave ameaça.
Pergunta: Comete crime?
Resposta: Pratica **ato infracional** análogo ao roubo; é inimputável penalmente e responde pelo ECA (medidas socioeducativas).
:::
"""),
], None)

M2 = ("3.2.3 Crimes e delitos: espécies de pena e consequências", [
("explicacao", "Reclusão, detenção e multa: diferenças que importam", """
O critério legal da pena marca o crime: **reclusão ou detenção**, isoladas, cumuladas ou alternativas com **multa**. O CP (art. 33) distingue as duas penas privativas de liberdade:

| Aspecto | **Reclusão** | **Detenção** |
|---|---|---|
| Regime inicial | Fechado, semiaberto ou aberto | Semiaberto ou aberto (o fechado só por regressão — necessidade de transferência) |
| Ordem de execução | Primeiro a reclusão, depois a detenção (art. 69 do CP) | Depois |
| Medida de segurança | **Internação** (art. 97) | Pode ser **tratamento ambulatorial** |
| Efeitos da condenação | Incapacidade para o exercício do poder familiar, tutela e curatela em crimes dolosos punidos com reclusão contra filho, tutelado ou curatelado (art. 92, II) | Não se aplica (só reclusão) |
| Prisão preventiva (CPP, art. 313, I) | Cabe em crime doloso com pena máxima **superior a 4 anos** | Idem, se pena máxima superior a 4 anos |
| Flagrante e fiança | Regras gerais do CPP | Idem |

**Pena de multa (art. 49).** Pode ser cominada **isolada, cumulativa ou alternativamente**. É sanção penal. Na execução da multa, o STF (**ADI 3.150**) firmou que o **Ministério Público** tem legitimidade prioritária, e a Fazenda Pública, subsidiária.

**Classificação do crime quanto à pena.**
- **Crimes apenados com reclusão**: em geral os mais graves (homicídio, roubo, tráfico).
- **Crimes apenados com detenção**: em geral menos graves (lesão corporal leve, ameaça, desacato).
- **Crimes apenados só com multa:** não existe no CP; a multa isolada caracteriza **contravenção** (art. 1º da LICP). Crimes com pena alternativa (detenção ou multa), como a ameaça, continuam crimes.

**Infrações de menor potencial ofensivo (Lei 9.099/1995, art. 61).** São as **contravenções penais** e os **crimes com pena máxima não superior a 2 anos**, cumulada ou não com multa. Julgadas nos **Juizados Especiais Criminais**, com transação penal (art. 76) e rito sumaríssimo. Atenção: o conceito **não** é sinônimo de "contravenção"; abrange também crimes.

**Crime e prisão.** A pena cominada define também a possibilidade de medidas cautelares: pelo CPP, art. 283, § 1º, as cautelares do Título IX **não se aplicam** à infração a que não for isolada, cumulativa ou alternativamente cominada pena privativa de liberdade, ou seja, **infração punida só com multa não admite cautelares pessoais**.

:::exemplo
Situação: O crime de ameaça (art. 147) é punido com detenção de 1 a 6 meses ou multa.
Pergunta: É crime ou contravenção?
Resposta: **Crime.** A detenção, ainda que alternativa com multa, o caracteriza (art. 1º da LICP). Por ser crime de menor potencial ofensivo, segue o rito da Lei 9.099/1995.
:::
"""),
], None)

M3 = ("3.2.4 Contravenção penal: o regime próprio da LCP", [
("explicacao", "Contravenção penal: conceito e regras especiais (Decreto-Lei 3.688/1941)", """
**Conceito.** Contravenção penal é a infração penal a que a lei comina, isoladamente, **prisão simples** ou **multa**, ou ambas, alternativa ou cumulativamente (art. 1º da LICP). É chamada, na doutrina, de **crime-anão**, **delito liliputiano** ou **crime vagabundo**, por sua menor gravidade. A diferença com o crime é de **grau**, não de natureza.

**Principais contravenções (exemplos vigentes)**
- **Vias de fato** (art. 21): agressão sem lesão corporal (empurrão, tapa sem machucar), se o fato não constitui crime.
- **Perturbação do trabalho ou do sossego alheios** (art. 42): barulho excessivo.
- **Jogo de azar** (art. 50) e **jogo do bicho** (art. 58).
- **Exploração de loteria** e outras figuras da LCP.

> Algumas figuras foram **revogadas ou convertidas em crimes**. A **perturbação da tranquilidade** (art. 65) foi revogada pela Lei 14.132/2021, que criou o crime de **perseguição** (art. 147-A do CP). A **importunação ofensiva ao pudor** (art. 61) foi revogada pela Lei 13.718/2018, que criou o crime de **importunação sexual** (art. 215-A). A **mendicância** (art. 60) foi revogada pela Lei 11.983/2009. Antes de afirmar que uma conduta é contravenção, confirme se o artigo está vigente.

**Regras especiais da Lei das Contravenções Penais (LCP)**

| Tema | Regra |
|---|---|
| **Tentativa** | **Não é punível** (LCP, art. 4º). |
| **Extraterritorialidade** | A lei brasileira só se aplica à contravenção praticada **no território nacional** (art. 2º). |
| **Pena de prisão simples** | Cumprida **sem rigor penitenciário**, em estabelecimento especial ou seção especial de prisão comum, em **regime semiaberto ou aberto** (art. 6º); trabalho **facultativo** se a pena for superior a 15 dias (art. 6º, § 2º). |
| **Limite de duração** | A prisão simples **não pode exceder 5 anos** (art. 10); o limite de 40 anos do art. 75 do CP vale para crimes. |
| **Erro de direito** | Ignorância ou errada compreensão da lei, quando **escusáveis**, podem levar à **não aplicação da pena** (art. 8º). Diferente do crime, em que o erro de proibição escusável isenta de pena e o inescusável apenas diminui. |
| **Reincidência (art. 7º)** | Reincidência na contravenção: nova contravenção após condenação definitiva por **qualquer crime** (no Brasil ou no exterior) ou por contravenção **no Brasil**. |
| **Sursis** | Possível, de 1 a 3 anos (art. 11 da LCP). |
| **Ação penal** | **Pública incondicionada** (conforme a CF e o art. 17 da LCP, entendido à luz do art. 129, I, da CF). |
| **Conversão e prescrição** | Prescrição regida pelo art. 109 do CP, pela pena máxima em abstrato. |

**Reincidência: o que cai.**
- Crime anterior + **crime** novo → reincidente (CP, art. 63).
- Crime anterior + **contravenção** nova → reincidente (LCP, art. 7º).
- **Contravenção** anterior + **crime** novo → **não** reincidente (o CP só considera condenação por crime).
- Contravenção anterior + contravenção nova → reincidente.

:::exemplo
Situação: Lucas tem condenação definitiva por contravenção (vias de fato). Cinco anos depois, comete lesão corporal leve.
Pergunta: É reincidente?
Resposta: **Não.** O art. 63 do CP exige crime anterior; a condenação por contravenção não configura reincidência em relação a um novo crime.
:::

:::exemplo
Situação: Letícia tentou praticar vias de fato contra um vizinho, mas foi impedida por terceiros.
Pergunta: Pune-se a tentativa?
Resposta: **Não.** A tentativa de contravenção não é punível (art. 4º da LCP).
:::
"""),
], None)

M4 = ("3.2.5 Quadro comparativo e aspectos processuais", [
("quadro_comparativo", "Crime × contravenção: tabela de prova", """
| Critério | **Crime (delito)** | **Contravenção penal** |
|---|---|---|
| Critério legal | Reclusão ou detenção (isolada, cumulativa ou alternativa com multa) | Prisão simples e/ou multa |
| Tentativa | Punível (art. 14, II, do CP) | **Não** punível (LCP, art. 4º) |
| Extraterritorialidade | Possível (art. 7º do CP) | **Não** (LCP, art. 2º) |
| Limite da pena | Até 40 anos de cumprimento (art. 75 CP) | Prisão simples até **5 anos** (LCP, art. 10) |
| Regime | Fechado, semiaberto ou aberto | Semiaberto ou aberto, sem rigor penitenciário |
| Erro de direito | Erro de proibição (art. 21 CP): inevitável isenta; evitável diminui | Escusável pode deixar de aplicar a pena (art. 8º LCP) |
| Ação penal | Pública (incondicionada ou condicionada) ou privada | Pública incondicionada |
| Prisão preventiva | Cabe, nos casos do art. 313 CPP | **Não cabe** (o art. 313 exige crime doloso) |
| Competência | Varia (Vara Criminal, Júri, Federal etc.) | **Justiça Estadual**, mesmo se em detrimento da União (Súmula 38/STJ); JECrim |
| Menor potencial ofensivo | Se pena máxima ≤ 2 anos | **Sempre** (Lei 9.099/1995, art. 61) |
| Reincidência | Art. 63 CP | Art. 7º LCP |
| Prescrição | Art. 109 CP | Art. 109 CP (mesmos prazos pelo máximo da pena) |

**Aspectos processuais que mais caem**
- **Súmula 38/STJ:** compete à **Justiça Estadual Comum** processar e julgar contravenção penal, **ainda que em detrimento de bens, serviços ou interesses da União**. O art. 109, IV, da CF exclui as contravenções da competência federal.
- **Competência dos Juizados:** contravenções vão ao **JECrim**, qualquer que seja a pena; seguem a transação penal (Lei 9.099/1995, art. 76) e o termo circunstanciado de ocorrência (TCO) em vez de inquérito.
- **Súmula 589/STJ:** é inaplicável o princípio da insignificância nos crimes e **contravenções** praticados contra a mulher no âmbito das relações domésticas.
- **Violência doméstica:** a Lei Maria da Penha (Lei 11.340/2006) aplica-se às **contravenções**, e o **art. 41** afasta a Lei 9.099/1995 para esses casos (Súmula 536/STJ: suspensão condicional do processo e transação penal são inaplicáveis).
"""),
], None)

M5 = ("3.2.6 Pegadinhas e casos de prova", [
("pegadinhas", "Pegadinhas que mais caem em infração penal", """
1. **"Crime e delito são espécies distintas no Brasil."** ❌ São sinônimos; o Brasil é **bipartido**.
2. **"O Código Penal define crime."** ❌ A definição legal está na LICP (art. 1º).
3. **"Detenção, no CP, nunca admite regime fechado."** ⚠️ Admite, por **regressão**, nos termos do art. 33, *caput*.
4. **"Toda infração com pena de multa é contravenção."** ❌ Se a multa for **alternativa ou cumulativa** com reclusão ou detenção, é crime.
5. **"A tentativa de contravenção é punida com a pena do crime consumado, diminuída."** ❌ Não é punível (LCP, art. 4º).
6. **"A lei brasileira aplica-se a contravenção cometida no exterior por brasileiro."** ❌ LCP, art. 2º: só no território nacional.
7. **"Condenado por contravenção que comete crime é reincidente."** ❌ O art. 63 do CP exige crime anterior.
8. **"Contravenção em detrimento da União é julgada na Justiça Federal."** ❌ Súmula 38/STJ.
9. **"A Lei 9.099/1995 só se aplica a crimes."** ❌ Abrange também as contravenções.
10. **"A prisão simples cumpre-se em regime fechado."** ❌ Apenas semiaberto ou aberto, sem rigor penitenciário.
11. **"Ato infracional é crime praticado por adolescente."** ❌ É a conduta descrita como crime ou contravenção; o adolescente não comete "crime".
12. **"A diferença entre crime e contravenção é ontológica."** ❌ É de grau/política criminal.

**Caso resolvido.**

:::exemplo
Situação: Um indivíduo pratica "jogo do bicho" em um bairro. É apreendido, e o MP oferece transação penal.
Pergunta: Trata-se de crime ou contravenção? A transação é cabível?
Resposta: **Contravenção** (LCP, art. 58). Como toda contravenção é infração de menor potencial ofensivo, a **transação penal** (art. 76 da Lei 9.099/1995) é cabível, se preenchidos os requisitos do § 2º.
:::

:::exemplo
Situação: O sujeito, condenado definitivamente por estelionato, pratica depois uma vias de fato.
Pergunta: Qual regra de reincidência?
Resposta: Há reincidência pelo art. 7º da LCP (contravenção após condenação por crime).
:::
"""),
], None)

FLASH = """

**Qual dispositivo define crime e contravenção?**
→ O art. 1º da Lei de Introdução ao Código Penal (DL 3.914/1941), pelo critério da pena cominada.

**O Brasil adota o sistema bipartido ou tripartido?**
→ Bipartido: crime (ou delito) e contravenção penal.

**Crime e delito são diferentes?**
→ Não, são sinônimos no Brasil. A distinção só existe nos sistemas tripartidos.

**A tentativa de contravenção é punível?**
→ Não (LCP, art. 4º).

**A lei brasileira alcança contravenção cometida no exterior?**
→ Não, só no território nacional (LCP, art. 2º).

**Qual o limite da prisão simples?**
→ 5 anos (LCP, art. 10).

**Súmula 38/STJ?**
→ Contravenção penal é julgada pela Justiça Estadual, ainda que em detrimento da União.

**Contravenção anterior torna reincidente em novo crime?**
→ Não. O art. 63 do CP exige crime anterior.

**O que é ato infracional?**
→ Conduta descrita como crime ou contravenção praticada por criança ou adolescente (ECA, art. 103).

**Conceito analítico majoritário de crime?**
→ Fato típico + ilícito + culpável (teoria tripartida).
"""

build("l03.json", "teoria-geral-do-crime-3-2-conceito-de-infracao-penal-crime-delito-e-contravencao-penal", 4, [M1, M2, M3, M4, M5], FLASH)
