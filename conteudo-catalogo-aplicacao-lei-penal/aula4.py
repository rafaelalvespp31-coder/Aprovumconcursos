from helpers import *

# ============================================================== 15 — Módulos 9 e 10
sec("explicacao", "Módulos 9 e 10 — Pena cumprida no estrangeiro (art. 8º) e eficácia da sentença estrangeira (art. 9º)", """
> **Art. 8º** - A pena cumprida no estrangeiro atenua a pena imposta no Brasil pelo mesmo crime, quando diversas, ou nela é computada, quando idênticas.

### 9.1 Finalidade
📘 O art. 8º evita que a pessoa seja **punida duas vezes** pelo **mesmo crime** sem nenhuma compensação (vedação do *bis in idem* material). Ele importa sobretudo na **extraterritorialidade incondicionada** (art. 7º, I), em que o § 1º permite novo julgamento no Brasil **mesmo após condenação lá fora**.
🗣️ **Em linguagem simples:** o que já foi cumprido lá fora é "descontado" ou "aliviado" aqui.

### 9.2 Penas idênticas × penas diversas
| Situação | Exemplo | Consequência (art. 8º) |
|---|---|---|
| **Penas idênticas** (mesma natureza: prisão × prisão) | Cumpriu **2 anos** de prisão no exterior; condenado a **6 anos** de reclusão no Brasil | **Computa**: desconta-se → restam **4 anos** |
| **Penas diversas** (natureza diferente: multa × prisão) | Pagou **multa** no exterior; condenado a **prisão** no Brasil | **Atenua**: o juiz **reduz** a pena brasileira (a lei não fixa o quanto) |
⚠️ **Não confunda com a condicionada:** nas hipóteses do **inciso II** e do **§ 3º**, se o agente **já cumpriu a pena no estrangeiro**, a lei brasileira **nem se aplica** (§ 2º, "d"). O art. 8º atua quando há **nova punição possível** — típico do inciso I.

### 9.3 Art. 8º × art. 7º, § 1º
| | **Art. 7º, § 1º** | **Art. 8º** |
|---|---|---|
| Pergunta | O Brasil **pode** julgar de novo? | **Quanto** de pena resta? |
| Resposta | **Sim**, ainda que absolvido ou condenado lá (inciso I) | Desconta (idênticas) ou atenua (diversas) |
| Função | Garante a aplicação da lei brasileira | Evita a dupla punição integral |

> **Art. 9º** - A sentença estrangeira, quando a aplicação da lei brasileira produz na espécie as mesmas conseqüências, pode ser homologada no Brasil para: **I** - obrigar o condenado à reparação do dano, a restituições e a outros efeitos civis; **II** - sujeitá-lo a medida de segurança.
> **Parágrafo único** - A homologação depende: **a)** para os efeitos previstos no inciso I, de pedido da parte interessada; **b)** para os outros efeitos, da existência de tratado de extradição com o país de cuja autoridade judiciária emanou a sentença, ou, na falta de tratado, de requisição do Ministro da Justiça.

### 10.1 Conceito e homologação
📘 **Sentença estrangeira** é a decisão de autoridade judiciária de outro país. Para produzir **certos efeitos** no Brasil, precisa ser **homologada**.
📘 **Homologação** é o ato pelo qual o Judiciário brasileiro **reconhece** a decisão estrangeira, verificando requisitos formais e a compatibilidade com a ordem pública. A competência é do **Superior Tribunal de Justiça** (CF, art. 105, I, "i", com a redação da EC 45/2004 — antes, era do STF). O procedimento está no CPP (arts. 787 a 790) e no Regimento Interno do STJ.

### 10.2 Para que se homologa (art. 9º) — e com quais condições
| Finalidade | Exemplos | Depende de |
|---|---|---|
| **I — Efeitos civis** | Reparação do dano, restituições, outros efeitos civis | **Pedido da parte interessada** (ex.: a vítima) |
| **II — Medida de segurança** | Internação ou tratamento ambulatorial de inimputável | **Tratado de extradição** com o país da sentença ou, sem tratado, **requisição do Ministro da Justiça** |
- **Condição geral:** a lei brasileira deve produzir, **no caso**, **as mesmas consequências** (o fato também deve gerar esses efeitos segundo a lei brasileira).

### 10.3 Homologação × reconhecimento automático
- A homologação do art. 9º **não** serve para executar no Brasil a **pena privativa de liberdade** imposta lá fora. Para isso existem mecanismos próprios de **cooperação internacional** (tratados e a Lei de Migração, que disciplinam a transferência de pessoas condenadas e da execução da pena).
- Alguns efeitos **independem** de homologação. Exemplo: a **reincidência** — o art. 63 do CP considera reincidente quem comete novo crime depois de transitar em julgado sentença que, **no País ou no estrangeiro**, o tenha condenado por crime anterior.
🚨 **Pegadinha:** "Para gerar reincidência, a sentença penal estrangeira precisa ser homologada pelo STJ" → **Errado** (art. 63).
🚨 **Pegadinha:** "A homologação de sentença estrangeira compete ao STF" → **Errado** desde a EC 45/2004: compete ao **STJ**.
✍️ **Fixação:** a vítima quer executar no Brasil a indenização fixada em sentença penal estrangeira. Do que depende a homologação? → **Pedido da parte interessada** (p. ú., "a").
""" + ex(
    "Marcos foi condenado na Itália por desviar dinheiro de uma autarquia federal brasileira (art. 7º, I, \"b\") e cumpriu 3 anos de prisão lá. No Brasil, é condenado pelo mesmo fato a 5 anos de reclusão. A autarquia também quer a reparação fixada pela Justiça italiana.",
    "Quanto de pena resta no Brasil? E a reparação?",
    "**Restam 2 anos.** Como o caso é de extraterritorialidade **incondicionada**, ele pode ser julgado no Brasil (art. 7º, § 1º), mas as penas são **idênticas** (prisão × prisão): os 3 anos cumpridos são **computados** (art. 8º). Quanto à **reparação**, a sentença italiana pode ser **homologada pelo STJ** para efeitos civis, a **pedido da parte interessada** (art. 9º, I, e p. ú., \"a\").",
    [Q("forum", "Marcos já cumpriu 3 anos na Itália.", [P("advogado", "esq", "fala", "serio", "documento"), P("juiz", "dir", "neutro", "serio")], (0, "Cumpriu 3 anos lá fora!")),
     Q("forum", "O juiz aplica o art. 8º.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Penas idênticas: computo os 3 anos."))],
    "Idênticas: computa | ok",
    comp("Art. 8º — pena cumprida no estrangeiro", ("Penas idênticas", "Computa", "ok", ["Prisão lá × prisão aqui", "Desconta o tempo cumprido", "6 − 2 = 4 anos"]),
         ("Penas diversas", "Atenua", "alerta", ["Multa lá × prisão aqui", "Juiz reduz a pena", "Sem fração fixa na lei"]))),
    ["N0030", "N0031", "N0032", "N0033", "N0034", "N0035", "N0036"])
m("Pena cumprida no estrangeiro e sentença estrangeira", 15)

# ============================================================== 16 — Módulos 11 e 12
sec("explicacao", "Módulos 11 e 12 — Contagem do prazo penal (art. 10) e frações não computáveis da pena (art. 11)", """
> **Art. 10** - O dia do começo inclui-se no cômputo do prazo. Contam-se os dias, os meses e os anos pelo calendário comum.

### 11.1 As duas regras do art. 10
1. **Inclui-se o dia do começo:** o dia em que o prazo começa **já conta**, ainda que tenha começado no fim do dia.
2. **Calendário comum:** meses e anos contam-se **de data a data**, sem importar se o mês tem 28, 30 ou 31 dias ou se o ano é bissexto.
🗣️ **Em linguagem simples:** o dia em que começou já é o "dia 1".

### 11.2 Exemplos com datas
- **Pena de 1 ano** iniciada em **10/03/2026** → termina em **09/03/2027** (o dia 10/03/2026 já contou).
- **Pena de 3 meses** iniciada em **15/01/2026** → termina em **14/04/2026**.
- **Decadência** (prazo de 6 meses para a queixa — art. 103 do CP): a vítima soube quem é o autor em **10/02/2026** → o prazo termina em **09/08/2026**, mesmo sendo **domingo**: o prazo **penal** **não se prorroga** para o dia útil seguinte.

### 11.3 Prazo penal × prazo processual penal
| | **Prazo penal (CP, art. 10)** | **Prazo processual penal (CPP, art. 798)** |
|---|---|---|
| Dia do começo | **Inclui** | **Exclui** (§ 1º: "Não se computará no prazo o dia do começo, incluindo-se, porém, o do vencimento") |
| Vencimento em domingo/feriado | **Não prorroga** | **Prorroga** para o dia útil seguinte (§ 3º) |
| Natureza | Atinge o direito de punir ou a liberdade | Regula atos do processo |
| Exemplos | Duração da pena, sursis, livramento condicional, **prescrição**, **decadência** | Prazo de recurso, de resposta à acusação, de alegações finais |
🧪 **Exemplo processual:** intimação em **sexta-feira, 13/03/2026**, para recurso de 5 dias. Pela **Súmula 310 do STF**, quando a intimação ocorre na sexta-feira, o prazo começa na **segunda-feira** seguinte → dias 16, 17, 18, 19 e 20/03 → vence em **20/03/2026**.
⚠️ **Prazos com natureza penal previstos no CPP** (ex.: a decadência também aparece no art. 38 do CPP) seguem a regra do **CP**, por afetarem o direito de punir. Prevalece que, havendo dúvida sobre a natureza, aplica-se a regra mais favorável ao réu.
🚨 **Pegadinha:** "No prazo decadencial, exclui-se o dia do começo, como nos prazos processuais." → **Errado**: decadência é prazo **penal** → **inclui** o dia do começo.
🛡️ **Cuidado com regras especiais:** feriados, suspensões de expediente e prazos de leis especiais devem ser conferidos caso a caso; a regra geral é a do art. 10 (penal) ou a do art. 798 (processual).

> **Art. 11** - Desprezam-se, nas penas privativas de liberdade e nas restritivas de direitos, as frações de dia, e, na pena de multa, as frações de cruzeiro.

### 12.1 Frações de dia nas penas privativas de liberdade e restritivas de direitos
📘 Nas penas privativas de liberdade e restritivas de direitos, **não se computam horas**: as frações de dia são **desprezadas** (sempre em favor do condenado).
🧪 Pena de **20 dias**, reduzida de **1/3**: 20 × 2/3 = **13,33 dias** → **13 dias** (despreza-se a fração).
🧪 Pena de **10 dias** aumentada de **1/6**: 10 + 1,66 = **11,66 dias** → **11 dias**.

### 12.2 Pena de multa e a referência ao "cruzeiro"
- A redação de **1984** fala em "frações de **cruzeiro**", a moeda da época. **O cruzeiro não é a moeda atual**: desde o Plano Real (Lei 9.069/1995), a moeda é o **real**.
- A **redação legal não foi atualizada** e deve ser lida como está. A doutrina entende que a regra continua a ordenar o desprezo das **frações da unidade monetária** no cálculo da multa (hoje, os centavos).
- Contexto do cálculo da multa: o CP adota o sistema de **dias-multa** (art. 49): de **10 a 360 dias-multa**, cada um entre **1/30 do salário mínimo e 5 vezes** esse valor, com atualização monetária na execução (art. 49, § 2º).

### 12.3 Relação com o cálculo e a execução penal
O art. 11 orienta a **dosimetria** (aumentos e diminuições em frações) e a fixação final da pena. Na **execução** (progressão, livramento, remição), aplicam-se as regras da **Lei de Execução Penal**, que convivem com a regra geral do CP (art. 12).
✍️ **Fixação:** pena final de 1 ano, 2 meses, 3 dias e 8 horas. O que se faz com as 8 horas? → **Desprezam-se** (art. 11).
""" + ex(
    "A vítima de um crime de ação penal privada descobre quem é o autor em 10/02/2026 e decide oferecer a queixa no último dia possível.",
    "Qual é o último dia do prazo decadencial de 6 meses?",
    "**09/08/2026** (domingo). A decadência é prazo **penal** (art. 103 do CP): conta-se pelo art. 10 — **inclui-se o dia do começo** (10/02) e conta-se pelo calendário comum, de data a data. Por ser prazo penal, **não se prorroga** para o dia útil seguinte. Na prática, a vítima deve se antecipar.",
    [Q("delegacia", "10/02: a vítima descobre o autor.", [P("vitima", "esq", "fala", "surpreso", "documento"), P("delegado", "dir", "neutro", "serio")], (0, "Agora sei quem foi!")),
     Q("forum", "O advogado conta o prazo.", [P("advogado", "centro", "aponta", "serio", "documento")], (0, "Inclui o dia 10: vence em 09/08."))],
    "Prazo penal inclui o 1º dia | alerta",
    linha("Prazo decadencial (6 meses)", "meses", [(0, "10/02: conhecimento", "neutro"), (3, "Prazo correndo", "neutro"), (6, "09/08: último dia", "alerta")])),
    ["N0037", "N0038"])
m("Contagem de prazo e frações da pena", 16)

# ============================================================== 17 — Módulo 13
sec("explicacao", "Módulo 13 — Regras gerais do CP e leis especiais (art. 12)", """
> **Art. 12** - As regras gerais deste Código aplicam-se aos fatos incriminados por lei especial, se esta não dispuser de modo diverso.

### 13.1 Aplicação subsidiária
📘 **Conceito:** as **regras gerais** do Código Penal (Parte Geral: tentativa, concurso de pessoas, erro, excludentes de ilicitude, concurso de crimes, prescrição etc.) aplicam-se **também** aos crimes previstos em **leis especiais** — **salvo** se a lei especial **dispuser de modo diverso**.
🗣️ **Em linguagem simples:** a lei especial "pega emprestada" a Parte Geral do CP naquilo que não regula; no que regula de forma própria, vale a regra especial (**princípio da especialidade**).

### 13.2 Exemplos
| Lei especial | Ponto | Resultado |
|---|---|---|
| **Estatuto do Desarmamento** (Lei 10.826/2003) | Não traz regra própria sobre tentativa ou concurso de pessoas | Aplicam-se o art. 14 (tentativa) e o art. 29 (concurso de pessoas) do CP |
| **Lei de Drogas** (Lei 11.343/2006) | **Art. 30:** prescrição da imposição e da execução das penas do art. 28 (porte para consumo) em **2 anos** | **Dispõe de modo diverso** → afasta o prazo prescricional geral do CP; a lei manda observar, quanto à interrupção, os arts. 107 e seguintes do CP |
| **Lei de Tortura** (Lei 9.455/1997) | **Art. 2º:** aplica-se ainda que o crime não tenha sido cometido no Brasil, sendo a vítima brasileira ou estando o agente em local sob jurisdição brasileira | Regra **própria** de extraterritorialidade, que convive com o art. 7º |
| **Lei de Abuso de Autoridade** (Lei 13.869/2019) | Traz regras próprias sobre ação penal (art. 3º) e efeitos da condenação (art. 4º) | Nesses pontos, prevalecem as regras especiais; no restante (ex.: tentativa, concurso de pessoas), aplica-se o CP |
| **Lei das Contravenções Penais** (Decreto-Lei 3.688/1941) | **Art. 4º:** não é punível a **tentativa** de contravenção; **art. 2º:** só se aplica à contravenção praticada no território nacional | **Dispõe de modo diverso** → afasta o art. 14, II, e o art. 7º do CP |
| **Lei de Crimes Ambientais** (Lei 9.605/1998) | Prevê responsabilidade penal da **pessoa jurídica** (art. 3º) e penas próprias para ela | Regras especiais que o CP não tem |

### 13.3 Compatibilidade entre norma geral e disciplina especial
- **Regra:** aplica-se a Parte Geral do CP.
- **Exceção:** quando a lei especial **regula de forma diferente** o mesmo ponto, ela **prevalece** (especialidade).
- **Silêncio da lei especial** → **não** é "disposição diversa": aplica-se o CP.
🚨 **Pegadinha:** "Pelo art. 12, as normas do Código Penal sempre prevalecem sobre as da legislação especial." → **Errado**: é o contrário quando a lei especial dispõe de modo diverso.
🚨 **Pegadinha:** "As regras gerais do CP não se aplicam às leis especiais, que formam sistemas autônomos." → **Errado**: aplicam-se, **salvo** disposição diversa.
✍️ **Fixação:** tentativa de contravenção penal é punível? → **Não** (LCP, art. 4º — disposição diversa, art. 12 do CP).
""" + ex(
    "Dois amigos são flagrados juntos transportando, no carro de um deles, arma de fogo de uso permitido sem autorização. A Lei 10.826/2003 não traz regra própria sobre concurso de pessoas.",
    "Aplica-se a regra do CP sobre concurso de pessoas?",
    "**Sim.** Pelo **art. 12 do CP**, as regras gerais do Código aplicam-se aos crimes de lei especial quando esta **não dispõe de modo diverso**. Como o Estatuto do Desarmamento é silente sobre o tema, incide o **art. 29 do CP** (concurso de pessoas): ambos respondem pelo crime, na medida de sua culpabilidade. O mesmo raciocínio vale para outras regras gerais, como as excludentes de ilicitude.",
    [Q("transito", "A blitz encontra a arma no carro.", [P("pm", "esq", "aponta", "serio"), P("investigado", "dir", "neutro", "surpreso", "arma")], (0, "De quem é essa arma?")),
     Q("delegacia", "O delegado aplica as regras gerais.", [P("delegado", "centro", "fala", "serio", "documento")], (0, "Lei especial silente: vale o CP."))],
    "Art. 12: CP subsidiário | ok",
    fluxo("Aplica-se a regra do CP?", [
        ("O fato está em lei especial?", "neutro"),
        ("A lei especial regula esse ponto?", "alerta", "tentativa, prescrição, extraterritorialidade…"),
        ("Regula de modo diverso?", "alerta", "Se sim, prevalece a especial"),
    ], ("Silêncio → aplica-se o CP (art. 12)", "ok"))),
    ["N0039"])
m("Aplicação às leis especiais", 17)

# ============================================================== 18 — Módulo 14
sec("jurisprudencia", "Módulo 14 — Jurisprudência e súmulas relevantes (conferidas em 19/10/2026)", """
**1. Súmula 711 — Supremo Tribunal Federal**
- **Enunciado:** "A lei penal mais grave aplica-se ao crime continuado ou ao crime permanente, se a sua vigência é anterior à cessação da continuidade ou da permanência."
- **Contexto:** aprovada em 24/09/2003. Nos crimes **permanentes** e **continuados**, a conduta se prolonga; a lei mais grave que entra em vigor **antes de cessar** a permanência/continuidade alcança o crime **sem** retroatividade.
- **Como cai:** sequestro iniciado antes da lei nova e encerrado depois dela; série de crimes em continuidade que atravessa a vigência de lei mais grave.
- **Pegadinha:** aplicar a súmula a **crime instantâneo de efeitos permanentes** (ex.: homicídio) ou a lei que entrou em vigor **depois** de cessada a permanência.
- **Consulta oficial:** [jurisprudencia.stf.jus.br — Súmula 711](https://jurisprudencia.stf.jus.br/pages/search/seq-sumula711/false)

**2. Súmula 501 — Superior Tribunal de Justiça**
- **Enunciado (essência):** é cabível a aplicação retroativa da Lei 11.343/2006, desde que o resultado da incidência das suas disposições, **na íntegra**, seja mais favorável ao réu do que o da Lei 6.368/1976, **vedada a combinação de leis**.
- **Contexto:** Terceira Seção, aprovada em 23/10/2013 (DJe 28/10/2013). Resolveu a disputa sobre aplicar a causa de diminuição do art. 33, § 4º, da Lei nova à pena-base da Lei antiga.
- **Como cai:** "o juiz pode aplicar o § 4º do art. 33 da Lei 11.343/2006 sobre a pena da Lei 6.368/1976?" → **Não**.
- **Pegadinha:** confundir **vedação da combinação** com **vedação da retroatividade**: a lei nova **retroage**, desde que aplicada **por inteiro**.
- **Consulta oficial:** [stj.jus.br — Súmulas do STJ (Súmula 501)](https://stj.jus.br/publicacaoinstitucional/index.php/sumstj/article/download/5177/5302)

**3. Tema 169 de Repercussão Geral — Supremo Tribunal Federal (RE 600.817/MS)**
- **Tese (essência):** é inadmissível aplicar a causa de diminuição do art. 33, § 4º, da Lei 11.343/2006 à pena de crime cometido na vigência da Lei 6.368/1976; não é possível conjugar partes mais benéficas das duas normas para criar uma terceira lei, sob pena de violar a legalidade e a separação de Poderes; o juiz deve avaliar, no caso concreto, qual lei é mais favorável e **aplicá-la integralmente**.
- **Contexto:** Plenário, relator Min. Ricardo Lewandowski, julgado em 07/11/2013.
- **Como cai:** "segundo o STF, é possível a combinação de leis penais?" → no contexto da sucessão das Leis de Drogas, **não**.
- **Pegadinha:** afirmar que a questão é pacífica na **doutrina** — não é; o que se pacificou foi a posição dos **tribunais superiores**.
- **Consulta oficial:** pesquisa de temas de repercussão geral no [portal do STF](https://portal.stf.jus.br/) (Tema 169).

**4. Súmula 611 — Supremo Tribunal Federal**
- **Enunciado:** "Transitada em julgado a sentença condenatória, compete ao juízo das execuções a aplicação de lei mais benigna."
- **Contexto:** complementa o art. 2º, parágrafo único, do CP e o art. 66, I, da LEP.
- **Como cai:** quem aplica a lei mais benéfica depois do trânsito em julgado? → o **juízo da execução**.
- **Pegadinha:** dizer que, após o trânsito, a lei benéfica só pode ser aplicada por **revisão criminal**.
- **Consulta oficial:** pesquisa de súmulas no [portal de jurisprudência do STF](https://jurisprudencia.stf.jus.br/).

**5. Entendimentos consolidados (sem número de julgado específico nesta aula)**
- **Lei intermediária mais benéfica:** prevalece, na doutrina e no STF, que deve ser aplicada (retroatividade + ultra-atividade). *Não citamos aqui número de processo por não termos conferido o acórdão diretamente nesta preparação.*
- **Continuidade normativo-típica:** a revogação do art. 214 do CP pela Lei 12.015/2009 **não** gerou abolitio do atentado violento ao pudor, pois a conduta passou ao art. 213 — entendimento pacífico nos tribunais superiores.
- **Retroatividade benéfica após o trânsito:** aplica-se mesmo com coisa julgada (CP, art. 2º, p. ú.; CF, art. 5º, XL).

⚠️ **Diferencie sempre:** o **texto da lei** (arts. 1º a 12), o **enunciado de súmula** (entre aspas, quando transcrito), a **tese** de repercussão geral (resumida) e a **explicação doutrinária** (sem aspas).
""", ["N0002", "N0003", "N0005"])
m("Jurisprudência e súmulas relevantes", 18)
