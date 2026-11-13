from lib import build

M1 = ("5.12.2 Reparação do dano e a independência relativa das instâncias", [
("explicacao", "Responsabilidade civil e penal: onde se cruzam", """
**Ideia central.** O mesmo fato pode ser **crime** e **ilícito civil**. O Brasil adota a **independência relativa (mitigada) das instâncias** civil e penal: em regra, uma não depende da outra, mas a sentença penal projeta **efeitos** na esfera civil.

**Base legal**
- **Código Civil, art. 935:** a responsabilidade civil é independente da criminal; não se poderá, porém, questionar mais sobre a existência do fato, ou sobre quem seja o seu autor, quando estas questões se acharem decididas no juízo criminal.
- **CP, art. 91, I:** é efeito **automático** da condenação **tornar certa a obrigação de indenizar o dano causado pelo crime**.
- **CPP, art. 63:** transitada em julgado a sentença condenatória, poderão promover-lhe a **execução**, no juízo cível, para o efeito da reparação do dano, o ofendido, seu representante legal ou seus herdeiros. Parágrafo único: transitada em julgado a sentença condenatória, a execução poderá ser efetuada pelo valor fixado nos termos do inciso IV do art. 387, sem prejuízo da **liquidação** para a apuração do dano efetivamente sofrido.

**Vias de reparação (resumo)**

| Via | Quando | Característica |
|---|---|---|
| **Execução civil da sentença penal condenatória** (CPP, art. 63; CPC, art. 515, VI) | Há condenação transitada | Título executivo judicial; dispensa nova discussão sobre o fato e a autoria; exige **liquidação** para apurar o dano |
| **Valor mínimo fixado na sentença** (CPP, art. 387, IV) | Pedido expresso na denúncia/queixa e contraditório | Já é título; o ofendido pode complementar no cível |
| **Ação civil ex delicto de conhecimento** (CPP, art. 64) | Sem condenação (absolvição por falta de prova, arquivamento, extinção da punibilidade) ou para ampliar a indenização | Processo de conhecimento comum, no juízo cível |

**Expressão ex delicto.** "Ação civil nascida do delito": ação de **responsabilidade civil** ajuizada para reparar o dano causado por fato criminoso.

**Legitimidade.** Ativa: o **ofendido**, seu representante legal ou seus herdeiros (art. 63). Se o ofendido for pobre, a ação pode ser proposta pelo **Ministério Público** (art. 68) — dispositivo reconhecido pelo STF como em **processo de inconstitucionalização**: onde a Defensoria Pública já está estruturada, a legitimidade é dela (RE 135.328/SP).

**Passiva:** o autor do crime (condenado ou não), seus herdeiros (até o limite da herança, CC art. 943) e o **responsável civil** (empregador por ato do empregado, CC arts. 932 e 933; pai pelo filho menor).

:::exemplo
Situação: Mário foi condenado definitivamente por lesão corporal em acidente de trânsito. A vítima, Paulo, teve R$ 30 mil em despesas médicas.
Pergunta: Como Paulo obtém a indenização?
Resposta: Executa no juízo cível a sentença penal condenatória (CPP, art. 63), que já é **título executivo**, mas precisa **liquidar** o valor, a menos que a sentença tenha fixado o mínimo (art. 387, IV).
:::
"""),
], None)

M2 = ("5.12.3 Texto legal: arts. 63 a 68 e 387 do CPP", [
("texto_legal", "Código de Processo Penal — Título IV: da ação civil", """
> **Art. 63.** Transitada em julgado a sentença condenatória, poderão promover-lhe a execução, no juízo cível, para o efeito da reparação do dano, o ofendido, seu representante legal ou seus herdeiros.
> **Parágrafo único.** Transitada em julgado a sentença condenatória, a execução poderá ser efetuada pelo valor fixado nos termos do inciso IV do art. 387 deste Código sem prejuízo da liquidação para a apuração do dano efetivamente sofrido.

> **Art. 64.** Sem prejuízo do disposto no artigo anterior, a ação para ressarcimento do dano poderá ser proposta no juízo cível, contra o autor do crime e, se for caso, contra o responsável civil.
> **Parágrafo único.** Intentada a ação penal, o juiz da ação civil poderá suspender o curso desta, até o julgamento definitivo daquela.

> **Art. 65.** Faz coisa julgada no cível a sentença penal que reconhecer ter sido o ato praticado em estado de necessidade, em legítima defesa, em estrito cumprimento de dever legal ou no exercício regular de direito.

> **Art. 66.** Não obstante a sentença absolutória no juízo criminal, a ação civil poderá ser proposta quando não tiver sido, categórica e inequivocamente, reconhecida a inexistência material do fato.

> **Art. 67.** Não impedirão igualmente a propositura da ação civil:
> I - o despacho de arquivamento do inquérito ou das peças de informação;
> II - a decisão que julgar extinta a punibilidade;
> III - a sentença absolutória que decidir que o fato imputado não constitui crime.

> **Art. 68.** Quando o titular do direito à reparação do dano for pobre, a execução da sentença condenatória (art. 63) ou a ação civil (art. 64) será promovida, a seu requerimento, pelo Ministério Público.

> **Art. 387.** O juiz, ao proferir sentença condenatória: [...] IV - fixará valor mínimo para reparação dos danos causados pela infração, considerando os prejuízos sofridos pelo ofendido.
"""),
], None)

M3 = ("5.12.4 Efeitos da sentença penal no cível: condenação e absolvição", [
("explicacao", "Sentença condenatória: efeitos civis", """
**Efeito automático (CP, art. 91, I).** A condenação criminal **torna certa a obrigação de indenizar** o dano causado pelo crime. Não precisa de pedido específico nem de motivação na sentença. O que **depende de pedido** é a **fixação do valor mínimo** (CPP, art. 387, IV).

**Título executivo judicial.** A sentença penal condenatória transitada em julgado é título executivo no cível (CPC, art. 515, VI). Decorre dela:
- a **certeza do an debeatur** (dever de indenizar): não se rediscute a existência do fato nem a autoria (CC, art. 935);
- a necessidade de **liquidação** do quantum (salvo se já houver valor mínimo fixado, que serve para execução imediata, sem prejuízo de a vítima buscar a diferença).

**Valor mínimo para reparação (CPP, art. 387, IV).** Requisitos fixados pelo STJ (Tema 983, REsp 1.675.874/MS): é necessário **pedido expresso** na denúncia ou queixa, para que o réu possa se defender (contraditório), mas **não** se exige a indicação do valor ou instrução probatória específica. O valor fixado é **mínimo**; a vítima pode complementar no juízo cível.

**Execução em face do condenado e do responsável civil.** O responsável civil (empregador, por exemplo) **não** participou do processo penal e, por isso, a sentença penal **não** é título executivo contra ele. Contra o responsável civil, é preciso ação de conhecimento no cível.

**Prescrição da pretensão civil.** O prazo de 3 anos (CC, art. 206, § 3º, V) para reparação civil só começa a correr **após o trânsito em julgado** da sentença penal, quando a ação civil depender do fato apurado no juízo criminal (CC, art. 200).

**Sentença absolutória: o que impede e o que não impede a ação civil**

| Fundamento da absolvição / decisão | Efeito no cível | Dispositivo |
|---|---|---|
| **Inexistência material do fato** (CPP, art. 386, I) | **Faz coisa julgada** no cível: impede a ação de reparação | CPP, art. 66 *a contrario sensu*; CC, art. 935 |
| **Negativa de autoria** (art. 386, IV — se afirmada categoricamente) | Impede a ação civil contra o absolvido | CC, art. 935 |
| **Estado de necessidade, legítima defesa, estrito cumprimento do dever legal ou exercício regular de direito** (art. 386, VI, 1ª parte) | **Faz coisa julgada** no cível, **em regra** | CPP, art. 65 |
| **Insuficiência de prova** (art. 386, VII) | **Não impede** a ação civil | CPP, art. 66 |
| **Fato não constitui infração penal** (art. 386, III) | **Não impede** | CPP, art. 67, III |
| **Extinção da punibilidade** (prescrição, morte, etc.) | **Não impede** | CPP, art. 67, II |
| **Arquivamento do inquérito** | **Não impede** | CPP, art. 67, I |
| **Dúvida sobre excludente (art. 386, VI, 2ª parte)** | Não faz coisa julgada | — |
| **Ausência de dolo / culpa** (fato atípico por falta do elemento subjetivo) | Pode haver responsabilidade civil culposa | Depende do caso |

**Exceções importantes à coisa julgada do art. 65.**
- Estado de necessidade **agressivo** (art. 929 e 930 do CC): quem age em estado de necessidade pode ser obrigado a indenizar o dono da coisa destruída, se este não for culpado do perigo.
- **Legítima defesa com erro na execução** (*aberratio ictus*): o terceiro atingido pode pedir reparação ao agente (CC, art. 930, parágrafo único), com direito de regresso contra o agressor.

:::exemplo
Situação: Ricardo é absolvido de lesão corporal por "não existir prova suficiente" (art. 386, VII). A vítima ajuíza ação indenizatória.
Pergunta: A absolvição impede a ação civil?
Resposta: **Não.** A absolvição por insuficiência de provas não faz coisa julgada no cível (CPP, art. 66); lá, o ônus e o padrão probatório são diferentes.
:::

:::exemplo
Situação: João é absolvido por legítima defesa (art. 386, VI). O agredido pede indenização ao João no cível.
Pergunta: Procede?
Resposta: Em regra **não**, porque a sentença penal reconheceu legítima defesa e faz coisa julgada no cível (CPP, art. 65). Exceção: terceiro inocente atingido (aberratio ictus).
:::
"""),
], None)

M4 = ("5.12.5 Ação civil ex delicto de conhecimento: regras processuais", [
("aprofundamento", "Ajuizamento, suspensão e relação com o processo penal", """
**Direito de ação autônomo (CPP, art. 64).** A vítima pode ajuizar a ação civil de conhecimento **sem esperar** a sentença penal, contra o autor do crime e, se for o caso, o responsável civil. O juiz cível, intentada a ação penal, **pode suspender** o curso da ação civil até o julgamento definitivo da penal (art. 64, parágrafo único): é **faculdade**, não obrigação. O prazo de suspensão é de **1 ano** (CPC, art. 315, § 2º), com possibilidade de o juiz prosseguir após esse período.

**Competência.** Juízo cível, estadual ou federal, conforme as partes e as regras do CPC.

**Quando a ação civil independe do resultado penal.** A responsabilidade civil por **culpa** mesmo que o fato seja atípico (por exemplo, dano culposo, que não é crime) subsiste. A ação civil exige: **conduta, dano, nexo causal e culpa** (ou risco, na responsabilidade objetiva).

**Responsabilidade civil objetiva do Estado.** O Estado responde objetivamente por danos causados por agentes públicos (CF, art. 37, § 6º), sem relação com a condenação penal do agente.

**Efeitos da sentença penal estrangeira.** Para efeitos civis (CP, art. 9º, I), a sentença estrangeira pode ser homologada pelo STJ.

**Transação penal e suspensão condicional do processo.** Em ações de menor potencial ofensivo, a **composição civil dos danos** (Lei 9.099/1995, arts. 72 e 74) **extingue a punibilidade** nos crimes de ação penal privada ou pública condicionada à representação (art. 74, parágrafo único) e vale como **título executivo no juízo civil** (art. 74, *caput*). A **reparação do dano** é condição na suspensão condicional do processo (art. 89, § 1º, I) e no ANPP (CPP, art. 28-A, I).

**Reparação do dano e institutos penais.**

| Instituto | Papel da reparação |
|---|---|
| Arrependimento posterior (CP, art. 16) | Reparação até o recebimento da denúncia, em crime sem violência/grave ameaça: pena reduzida de 1/3 a 2/3 |
| Atenuante genérica (CP, art. 65, III, *b*) | Reparar o dano antes do julgamento |
| Sursis (CP, art. 78, § 2º) | Reparação do dano como requisito do sursis especial |
| Livramento condicional (CP, art. 83, IV) | Reparar o dano, salvo impossibilidade |
| Reabilitação (CP, art. 94, III) | Ter ressarcido o dano |
| Peculato culposo (CP, art. 312, § 3º) | Reparação antes da sentença extingue a punibilidade; depois, reduz a pena pela metade |
| Pena restritiva (prestação pecuniária, art. 45, § 1º) | Pagamento à vítima, dedutível de condenação civil |

**Confisco e indenização.** O CP, art. 91, II, permite a perda de instrumentos e produto do crime em favor da União, **ressalvado o direito do lesado ou de terceiro de boa-fé**. A reparação à vítima prevalece sobre o confisco (art. 91, II, parte final).

:::exemplo
Situação: Carolina foi vítima de estelionato e propôs ação cível de indenização enquanto corre a ação penal contra o fraudador.
Pergunta: O juiz cível pode suspender a ação?
Resposta: **Pode** (CPP, art. 64, parágrafo único; CPC, art. 315), por até 1 ano, mas não é obrigado. Se houver sentença penal condenatória definitiva, a questão da autoria estará resolvida (CC, art. 935).
:::
"""),
], None)

M5 = ("5.12.6 Pegadinhas, quadro final e casos", [
("pegadinhas", "Pegadinhas e revisão", """
1. **"A sentença penal condenatória é título executivo, sem necessidade de liquidação."** ❌ Em regra exige liquidação, salvo no valor mínimo do art. 387, IV.
2. **"A absolvição penal sempre impede a ação civil."** ❌ Depende do fundamento: só impede a inexistência do fato, a negativa de autoria categórica e as excludentes do art. 65.
3. **"O arquivamento do inquérito faz coisa julgada no cível."** ❌ Art. 67, I.
4. **"A extinção da punibilidade impede a ação civil."** ❌ Art. 67, II.
5. **"O valor mínimo do art. 387, IV, exige que a denúncia indique o valor exato."** ❌ Exige pedido expresso, não necessariamente o valor (STJ, Tema 983).
6. **"A sentença penal é título executivo contra o responsável civil que não foi parte."** ❌ É preciso ação de conhecimento contra ele.
7. **"A ação civil deve esperar o fim do processo penal."** ❌ Pode ser proposta antes; a suspensão é faculdade do juiz.
8. **"A legítima defesa reconhecida na esfera penal nunca gera dever de indenizar."** ⚠️ Em regra, não; mas o terceiro inocente atingido por erro na execução pode pedir reparação.
9. **"O prazo prescricional da ação civil corre normalmente durante a ação penal."** ❌ Quando a ação depende do fato apurado no juízo criminal, só corre após o trânsito em julgado (CC, art. 200).
10. **"O MP pode sempre ajuizar a ação civil pelo pobre."** ⚠️ Art. 68 do CPP, mas o STF entende que, onde há Defensoria Pública estruturada, a legitimidade é dela.

**Quadro final**

| Cenário | Efeito no cível |
|---|---|
| Condenação transitada | Título executivo; certeza do dever de indenizar; liquidação |
| Absolvição: inexistência do fato / autoria negada | Impede a ação civil |
| Absolvição: legítima defesa, necessidade etc. | Faz coisa julgada, em regra (art. 65) |
| Absolvição: insuficiência de provas | Não impede (art. 66) |
| Fato não é crime / extinção da punibilidade / arquivamento | Não impede (art. 67) |

:::exemplo
Situação: Um motorista é absolvido do crime de homicídio culposo por "não ter sido ele o condutor do veículo" (negativa de autoria, reconhecida categoricamente). A família ajuíza ação indenizatória contra ele.
Pergunta: A ação pode prosperar?
Resposta: **Não**, em regra: a negativa categórica de autoria faz coisa julgada no cível (CC, art. 935).
:::
"""),
], None)

FLASH = """

**O que significa ação civil ex delicto?**
→ Ação de responsabilidade civil para reparar o dano causado por fato criminoso (CPP, arts. 63 a 68).

**Qual o efeito automático da condenação (CP, art. 91, I)?**
→ Tornar certa a obrigação de indenizar o dano causado pelo crime.

**O que fixa o art. 387, IV, do CPP?**
→ O valor mínimo para reparação dos danos causados pela infração, mediante pedido expresso.

**A sentença penal condenatória exige liquidação?**
→ Em regra sim, para apurar o dano efetivo; o valor mínimo fixado pode ser executado de imediato.

**O que impede a ação civil após a absolvição?**
→ Inexistência material do fato, negativa de autoria categórica e excludentes do art. 65 (necessidade, legítima defesa, dever legal, exercício regular).

**Quais decisões não impedem a ação civil (art. 67)?**
→ Arquivamento do inquérito, extinção da punibilidade e absolvição por fato que não constitui crime.

**A absolvição por insuficiência de provas impede a ação civil?**
→ Não (art. 66).

**Quem pode executar a sentença penal no cível?**
→ O ofendido, seu representante legal ou herdeiros (art. 63); o MP, se o titular for pobre (art. 68).

**O juiz cível deve suspender a ação civil enquanto corre a penal?**
→ Pode (art. 64, parágrafo único), por até 1 ano.
"""

build("l05.json", "acao-penal-5-12-acao-civil-ex-delicto-e-efeitos-da-sentenca-penal-na-esfera-civil", 2, [M1, M2, M3, M4, M5], FLASH)
