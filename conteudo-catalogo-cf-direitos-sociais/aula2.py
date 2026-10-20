from helpers import *

# ============================================================== 5 — Art. 7º I a III
sec("explicacao", "Módulo 3 — Art. 7º (1/6): destinatários, proteção contra despedida, seguro-desemprego e FGTS (incisos I a III)", """
O caput do art. 7º lista os direitos dos **trabalhadores urbanos e rurais**, **além de outros que visem à melhoria de sua condição social**. Duas consequências:
- **Igualdade entre urbanos e rurais** — a CF/88 equiparou os dois grupos.
- **Rol exemplificativo** — leis, convenções e acordos coletivos podem **ampliar** direitos ("além de outros").

📌 **Servidores públicos** não são destinatários diretos do art. 7º: o **art. 39, § 3º** escolhe quais incisos se aplicam a eles (ex.: salário mínimo, 13º, adicional noturno, salário-família, jornada, repouso, hora extra, férias com 1/3, licenças, proteção da mulher, redução de riscos, proibição de discriminação).

---

### I — Proteção contra despedida arbitrária ou sem justa causa

A relação de emprego é protegida contra despedida **arbitrária ou sem justa causa**, **nos termos de lei complementar**, que preverá **indenização compensatória**, dentre outros direitos.

- A **lei complementar nunca foi editada**. Enquanto isso, vale o **ADCT, art. 10, I**: a proteção se limita a uma indenização equivalente a **40% do FGTS** (multa rescisória).
- Não existe, como regra geral, **estabilidade** no emprego privado — existe proteção **indenizatória**.
- **ADCT, art. 10, II** prevê **estabilidades provisórias**: (a) do empregado eleito para **cargo de direção da CIPA**, desde o registro da candidatura até um ano após o mandato; (b) da **empregada gestante**, desde a **confirmação da gravidez** até **cinco meses após o parto**.

⚠️ **Pegadinha:** "A proteção contra despedida arbitrária é regulada por lei ordinária." **Errado** — **lei complementar** (ainda não editada).

### II — Seguro-desemprego

Em caso de desemprego **involuntário**. Quem pede demissão **não** tem direito. É regulamentado pela Lei 7.998/1990.

### III — FGTS

Fundo de garantia do tempo de serviço — direito de todo empregado (desde 1988 deixou de ser opção). O STF fixou que a prescrição para cobrar depósitos de FGTS é de **5 anos** (ARE 709.212, 2014), aplicando o inciso XXIX.
""" + ex(
    "Ana, gestante, foi dispensada sem justa causa. A empresa alega que não sabia da gravidez no momento da dispensa.",
    "Ana tem direito à estabilidade?",
    "**Sim.** A estabilidade da gestante vai da **confirmação da gravidez** até **cinco meses após o parto** (ADCT, art. 10, II, b). O STF (Tema 497) fixou que basta a gravidez ser **anterior à dispensa**; o desconhecimento do empregador **não afasta** o direito.",
    [Q("reparticao", "Ana recebe o aviso de dispensa.", [P("gestor", "esq", "pega", "neutro", "documento"), P("cidadao", "dir", "neutro", "triste")], (0, "Não sabíamos da gravidez.")),
     Q("forum", "Ana pede a reintegração.", [P("juiz", "centro", "fala", "serio")], (0, "Gravidez anterior: há estabilidade."))],
    "Estabilidade da gestante | ok",
    linha("Estabilidade da gestante (ADCT, art. 10, II, b)", "meses", [(0, "Confirmação da gravidez", "ok"), (9, "Parto", "neutro"), (14, "Fim: 5 meses após o parto", "alerta")])),
    N(12, 13))
m("Art. 7º — direitos dos trabalhadores", 5)

# ============================================================== 6 — Art. 7º IV a XII
sec("explicacao", "Módulo 3 — Art. 7º (2/6): salário mínimo, piso, irredutibilidade, 13º, adicional noturno, PLR e salário-família (incisos IV a XII)", """
### IV — Salário mínimo

Características previstas no texto:
- **fixado em lei** (não por decreto como regra, embora o STF tenha admitido decreto que apenas aplica fórmula definida em lei);
- **nacionalmente unificado** (não há salário mínimo estadual — mas os Estados podem instituir **piso salarial** por lei complementar delegada pela União, LC 103/2000);
- capaz de atender às **necessidades vitais básicas** do trabalhador **e de sua família**: moradia, alimentação, educação, saúde, lazer, vestuário, higiene, transporte e previdência social;
- **reajustes periódicos** que lhe preservem o poder aquisitivo;
- **vedada sua vinculação para qualquer fim**.

**Súmulas vinculantes ligadas ao inciso IV:**
| Súmula | Conteúdo resumido |
|---|---|
| **SV 4** | Salvo os casos previstos na CF, o salário mínimo **não pode ser usado como indexador** de base de cálculo de vantagem de servidor ou empregado, **nem ser substituído por decisão judicial** |
| **SV 6** | **Não viola** a CF a remuneração **inferior ao mínimo** para as **praças prestadoras de serviço militar inicial** |
| **SV 15** | O cálculo de gratificações e outras vantagens do servidor **não incide sobre o abono** utilizado para se atingir o salário mínimo |
| **SV 16** | Os arts. 7º, IV, e 39, § 3º, referem-se ao **total da remuneração** percebida pelo servidor |

### V a VII — Piso, irredutibilidade e salário variável

- **V:** **piso salarial** proporcional à **extensão e à complexidade** do trabalho.
- **VI:** **irredutibilidade do salário**, **salvo o disposto em convenção ou acordo coletivo**. → A redução só é possível por **negociação coletiva**, nunca por decisão unilateral ou acordo individual (como regra).
- **VII:** garantia de salário, **nunca inferior ao mínimo**, para os que percebem **remuneração variável** (comissionistas, por exemplo).

### VIII a XII

- **VIII:** **décimo terceiro salário** com base na **remuneração integral** ou no **valor da aposentadoria**.
- **IX:** remuneração do **trabalho noturno superior** à do diurno (a CF não fixa percentual — a CLT prevê 20% para o urbano).
- **X:** **proteção do salário** na forma da lei, **constituindo crime sua retenção dolosa**. (Mandado de criminalização ainda sem tipo penal específico.)
- **XI:** **participação nos lucros, ou resultados**, **desvinculada da remuneração**, e, **excepcionalmente**, **participação na gestão** da empresa, conforme definido em lei.
- **XII:** **salário-família** pago em razão do **dependente** do trabalhador **de baixa renda**, nos termos da lei (redação da EC 20/1998).

⚠️ **Pegadinhas:**
- "A irredutibilidade salarial é absoluta." **Errado** — ressalva da convenção ou acordo coletivo.
- "A participação nos lucros integra a remuneração." **Errado** — é **desvinculada** da remuneração.
- "O salário-família é devido a todos os trabalhadores com dependentes." **Errado** — só aos de **baixa renda**.
- "A participação na gestão da empresa é direito de todo trabalhador." **Errado** — é **excepcional**, conforme a lei.
""", N(14, 15))
m("Art. 7º — direitos dos trabalhadores", 6)

# ============================================================== 7 — Art. 7º XIII a XVI
sec("explicacao", "Módulo 3 — Art. 7º (3/6): jornada, turnos ininterruptos, repouso semanal e horas extras (incisos XIII a XVI)", """
| Inciso | Regra | Exceção/flexibilização | Número que cai |
|---|---|---|---|
| **XIII** | Duração do trabalho normal **não superior a 8 horas diárias e 44 semanais** | **Facultada** a **compensação** de horários e a **redução** da jornada, **mediante acordo ou convenção coletiva** | **8h / 44h** |
| **XIV** | Jornada de **6 horas** para o trabalho em **turnos ininterruptos de revezamento** | **Salvo negociação coletiva** | **6h** |
| **XV** | **Repouso semanal remunerado**, **preferencialmente aos domingos** | "Preferencialmente" — não obrigatoriamente | domingo |
| **XVI** | Remuneração do **serviço extraordinário** **superior, no mínimo, em 50%** à do normal | — | **50%** |

📌 **Turnos ininterruptos de revezamento:** trabalhador que alterna turnos (manhã, tarde, noite) de forma a cobrir as 24 horas. O desgaste justifica a jornada menor. Intervalos para descanso **não descaracterizam** o turno ininterrupto (Súmula 675 do STF).

📌 **Negociação coletiva** tem papel central nesses incisos. O STF fixou (**Tema 1.046**, ARE 1.121.633, 2022) que são **constitucionais** acordos e convenções coletivas que limitam ou afastam direitos trabalhistas, **independentemente de contrapartidas**, **desde que respeitados os direitos absolutamente indisponíveis**.

⚠️ **Pegadinhas:**
- "A jornada máxima é de 8 horas diárias e 48 semanais." **Errado** — **44** semanais (48 era a regra anterior a 1988).
- "O repouso semanal deve ser obrigatoriamente aos domingos." **Errado** — **preferencialmente**.
- "A hora extra deve ser remunerada com acréscimo de exatamente 50%." **Errado** — **no mínimo** 50%.
- "A compensação de jornada depende de lei." **Errado** — o texto fala em **acordo ou convenção coletiva**.
""" + ex(
    "Lucas trabalha numa siderúrgica em turnos que se alternam semanalmente entre manhã, tarde e madrugada. A empresa exige 8 horas diárias, sem qualquer acordo coletivo.",
    "A jornada está correta?",
    "**Não.** No regime de **turnos ininterruptos de revezamento**, a jornada constitucional é de **6 horas**, **salvo negociação coletiva** (art. 7º, XIV). Sem acordo ou convenção, as horas além da 6ª são **extras**, com adicional de **no mínimo 50%** (XVI).",
    [Q("obra", "Lucas cumpre o turno da madrugada.", [P("cidadao", "esq", "neutro", "triste"), P("gestor", "dir", "aponta", "serio")], (1, "Turno de 8 horas, como sempre.")),
     Q("forum", "Lucas reclama as horas extras.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Sem acordo coletivo: 6 horas."))],
    "Revezamento: 6h | alerta",
    comp("Jornada constitucional", ("Regra geral", "8h diárias / 44h semanais", "neutro", ["compensação e redução", "por acordo ou convenção"]), ("Turnos de revezamento", "6 horas", "alerta", ["salvo negociação coletiva"]))),
    N(16))
m("Art. 7º — direitos dos trabalhadores", 7)

# ============================================================== 8 — Art. 7º XVII a XXI
sec("explicacao", "Módulo 3 — Art. 7º (4/6): férias, licença à gestante, licença-paternidade, trabalho da mulher e aviso prévio (incisos XVII a XXI)", """
| Inciso | Direito | Detalhe constitucional | Complemento legal/jurisprudencial |
|---|---|---|---|
| **XVII** | **Férias anuais remuneradas** | Com, **pelo menos, um terço a mais** do que o salário normal | 30 dias (CLT) |
| **XVIII** | **Licença à gestante** | **Sem prejuízo do emprego e do salário**, com duração de **120 dias** | Prorrogação por 60 dias no Programa Empresa Cidadã (Lei 11.770/2008) |
| **XIX** | **Licença-paternidade** | **Nos termos fixados em lei** | Até a lei: **5 dias** (ADCT, art. 10, § 1º); +15 no Empresa Cidadã; o STF reconheceu a **omissão** do Congresso (ADO 20, 2023) |
| **XX** | **Proteção do mercado de trabalho da mulher** | Mediante **incentivos específicos**, nos termos da lei | — |
| **XXI** | **Aviso prévio proporcional ao tempo de serviço** | **No mínimo 30 dias**, nos termos da lei | Lei 12.506/2011: +3 dias por ano de serviço, até **90 dias** |

📌 **Licença à gestante — jurisprudência:**
- O STF entende que o termo inicial da licença e do salário-maternidade é a **alta hospitalar** da mãe ou do recém-nascido, o que ocorrer por último, quando a internação for superior a duas semanas (ADI 6.327).
- A licença-maternidade da **adotante** não pode ser inferior à da gestante, nem variar conforme a idade da criança adotada (RE 778.889 — Tema 782).
- O STF estendeu a licença de 120 dias ao **pai solo** servidor público (Tema 1.182, 2022).

⚠️ **Pegadinhas:**
- "As férias são remuneradas com um terço a mais." O texto diz "**pelo menos**" um terço — o mínimo é 1/3.
- "A licença à gestante é de 180 dias." **Errado** pelo texto: **120 dias** (os 180 dependem do Programa Empresa Cidadã ou de leis próprias, como no serviço público federal).
- "A licença-paternidade é de 5 dias, por força do art. 7º, XIX." **Errado** — o inciso remete à **lei**; os 5 dias estão no **ADCT**.
- "O aviso prévio é de 30 dias." Incompleto — **no mínimo** 30 dias e **proporcional** ao tempo de serviço.
""", N(17))
m("Art. 7º — direitos dos trabalhadores", 8)

# ============================================================== 9 — Art. 7º XXII a XXVIII
sec("explicacao", "Módulo 3 — Art. 7º (5/6): saúde e segurança, adicionais, aposentadoria, creche, negociação coletiva, automação e acidente de trabalho (incisos XXII a XXVIII)", """
- **XXII:** **redução dos riscos inerentes ao trabalho**, por meio de normas de **saúde, higiene e segurança**.
- **XXIII:** **adicional de remuneração** para as atividades **penosas, insalubres ou perigosas**, na forma da lei. (O adicional de **penosidade** ainda não foi regulamentado para os empregados em geral.)
- **XXIV:** **aposentadoria**.
- **XXV:** **assistência gratuita** aos **filhos e dependentes** **desde o nascimento até 5 anos de idade** em **creches e pré-escolas** (redação da **EC 53/2006** — antes eram 6 anos).
- **XXVI:** **reconhecimento das convenções e acordos coletivos** de trabalho.
- **XXVII:** **proteção em face da automação**, na forma da lei.
- **XXVIII:** **seguro contra acidentes de trabalho**, **a cargo do empregador**, **sem excluir a indenização** a que este está obrigado, **quando incorrer em dolo ou culpa**.

### O inciso XXVIII em detalhe

| Parcela | Quem paga | Depende de culpa? |
|---|---|---|
| **Seguro de acidente** (SAT/RAT, benefícios do INSS) | Custeado pelo **empregador** | **Não** (responsabilidade objetiva do sistema previdenciário) |
| **Indenização civil** do empregador | **Empregador** | Pelo texto, quando houver **dolo ou culpa** |

📌 **Tema 932 do STF (RE 828.040, 2020):** é **constitucional** a imputação da **responsabilidade objetiva** do empregador por danos decorrentes de acidente de trabalho nos casos especificados em lei ou quando a **atividade normalmente desenvolvida**, por sua natureza, apresentar **exposição habitual a risco especial**, com potencialidade lesiva e maior que a dos demais membros da coletividade.

### Convenção × acordo coletivo (XXVI)

| | **Convenção coletiva** | **Acordo coletivo** |
|---|---|---|
| Partes | **Sindicato dos trabalhadores** × **sindicato patronal** | **Sindicato dos trabalhadores** × **uma ou mais empresas** |
| Alcance | Toda a **categoria** na base territorial | Empregados das **empresas acordantes** |

⚠️ **Pegadinhas:**
- "A assistência em creches vai até os 6 anos." **Errado** após a EC 53/2006 — **até 5 anos**.
- "O seguro contra acidentes de trabalho exclui a indenização civil." **Errado** — **não exclui** quando houver dolo ou culpa.
- "O seguro de acidente é custeado pelo trabalhador." **Errado** — **a cargo do empregador**.
""", N(18))
m("Art. 7º — direitos dos trabalhadores", 9)

# ============================================================== 10 — Art. 7º XXIX a XXXIV
sec("explicacao", "Módulo 3 — Art. 7º (6/6): prescrição, proibições de discriminação, trabalho do menor e trabalhador avulso (incisos XXIX a XXXIV)", """
### XXIX — Prescrição trabalhista (redação da EC 28/2000)

Ação quanto aos créditos resultantes das relações de trabalho, com **prazo prescricional de 5 anos** para os trabalhadores **urbanos e rurais**, **até o limite de 2 anos após a extinção do contrato** de trabalho.

**Como ler:**
- **Prescrição bienal:** depois que o contrato termina, o trabalhador tem **2 anos** para ajuizar a ação.
- **Prescrição quinquenal:** ajuizada a ação, ele só recupera os créditos dos **5 anos anteriores ao ajuizamento** (não à extinção do contrato).

| Exemplo | Resultado |
|---|---|
| Contrato terminou em 01/03/2024; ação em 01/02/2026 | Dentro dos 2 anos ✅ — cobra créditos desde 01/02/2021 |
| Contrato terminou em 01/03/2023; ação em 01/04/2025 | Mais de 2 anos ❌ — prescrição total |

📌 Antes da EC 28/2000, o **rural** só tinha o limite de 2 anos após a extinção (sem a prescrição quinquenal no curso do contrato). A emenda **igualou** urbanos e rurais.

### XXX a XXXII — Proibições de discriminação

- **XXX:** proibição de diferença de **salários**, de **exercício de funções** e de **critério de admissão** por motivo de **sexo, idade, cor ou estado civil**.
- **XXXI:** proibição de **qualquer discriminação** no tocante a **salário e critérios de admissão** do trabalhador **portador de deficiência**.
- **XXXII:** proibição de **distinção entre trabalho manual, técnico e intelectual** ou entre os profissionais respectivos.

📌 O inciso XXX convive com diferenciações **justificadas** (ex.: limite de idade em concurso quando a natureza do cargo exige — Súmula 683 do STF; Lei 9.029/1995 proíbe exigir atestado de gravidez).

### XXXIII — Trabalho do menor de idade (redação da EC 20/1998)

Proibição de trabalho **noturno, perigoso ou insalubre** a **menores de 18 anos** e de **qualquer trabalho** a **menores de 16 anos**, **salvo** na condição de **aprendiz**, **a partir de 14 anos**.

| Idade | Pode trabalhar? |
|---|---|
| **Menos de 14** | **Não** (nenhum trabalho) |
| **14 e 15** | **Só como aprendiz** |
| **16 e 17** | **Sim**, mas **não** em trabalho **noturno, perigoso ou insalubre** |
| **18 ou mais** | Sim, sem essas restrições |

**Macete 14-16-18:** **14** aprendiz · **16** trabalho comum · **18** noturno, perigoso e insalubre.

### XXXIV — Trabalhador avulso

**Igualdade de direitos** entre o trabalhador com **vínculo empregatício permanente** e o **trabalhador avulso** (aquele que presta serviço a vários tomadores, sem vínculo, por intermediação do sindicato ou do órgão gestor de mão de obra — ex.: portuários).

⚠️ **Pegadinhas:**
- "A prescrição trabalhista é de 2 anos, contados do fato." **Errado** — 5 anos, até o limite de 2 anos após a extinção do contrato.
- "O menor de 16 anos pode trabalhar em atividade leve." **Errado** — só como **aprendiz**, a partir de **14**.
- "O maior de 16 e menor de 18 pode trabalhar à noite com autorização dos pais." **Errado** — trabalho noturno é proibido ao menor de 18.
""" + ex(
    "Bruna, de 15 anos, foi contratada por uma lanchonete como atendente, com carteira assinada, das 19h às 23h. Não há contrato de aprendizagem.",
    "A contratação é válida?",
    "**Não.** Aos **15 anos**, Bruna só pode trabalhar como **aprendiz** (art. 7º, XXXIII). Além disso, o horário inclui trabalho **noturno**, que é proibido a **qualquer menor de 18 anos**. São duas violações.",
    [Q("bar", "Bruna atende no balcão à noite.", [P("cidadao", "esq", "pega", "neutro", "copo"), P("gestor", "dir", "fala", "neutro")], (1, "Seu turno vai até as 23h.")),
     Q("reparticao", "A fiscalização do trabalho chega ao local.", [P("servidor", "esq", "aponta", "serio", "documento"), P("gestor", "dir", "neutro", "surpreso")], (0, "Menor de 16 só como aprendiz!"))],
    "Duas violações | erro",
    fluxo("Trabalho do menor (art. 7º, XXXIII)", [("Idade: 15 anos", "alerta"), ("É aprendiz?", "erro", "Não há contrato de aprendizagem"), ("Horário noturno?", "erro", "Proibido a menor de 18")], ("Contratação irregular", "erro"))),
    N(19, 20, 21, 22))
m("Art. 7º — direitos dos trabalhadores", 10)

# ============================================================== 11 — Domésticos
sec("explicacao", "Módulo 3 — Trabalhadores domésticos (art. 7º, parágrafo único, redação da EC 72/2013)", """
A **EC 72/2013** ampliou fortemente os direitos dos **trabalhadores domésticos**. O parágrafo único do art. 7º divide os direitos em dois grupos:

### Grupo 1 — direitos de aplicação direta (assegurados desde a emenda)

| Inciso | Direito |
|---|---|
| IV | Salário mínimo |
| VI | Irredutibilidade salarial |
| VII | Garantia de salário mínimo para remuneração variável |
| VIII | Décimo terceiro |
| X | Proteção do salário (retenção dolosa é crime) |
| XIII | Jornada de 8h diárias e 44h semanais |
| XV | Repouso semanal remunerado |
| XVI | Hora extra de no mínimo 50% |
| XVII | Férias com pelo menos 1/3 |
| XVIII | Licença à gestante de 120 dias |
| XIX | Licença-paternidade |
| XXI | Aviso prévio proporcional |
| XXII | Redução dos riscos do trabalho |
| XXIV | Aposentadoria |
| XXVI | Reconhecimento de convenções e acordos coletivos |
| XXX | Proibição de discriminação por sexo, idade, cor ou estado civil |
| XXXI | Proibição de discriminação da pessoa com deficiência |
| XXXIII | Proibição de trabalho do menor nos termos do inciso |

### Grupo 2 — direitos que dependem das condições estabelecidas em lei (com simplificação de obrigações)

| Inciso | Direito |
|---|---|
| I | Proteção contra despedida arbitrária |
| II | Seguro-desemprego |
| III | FGTS |
| IX | Adicional noturno |
| XII | Salário-família |
| XXV | Assistência em creches e pré-escolas |
| XXVIII | Seguro contra acidentes de trabalho |
| + | **Integração à previdência social** |

A regulamentação veio com a **Lei Complementar 150/2015** (FGTS obrigatório, seguro-desemprego, adicional noturno etc.).

### O que NÃO foi estendido aos domésticos pelo parágrafo único

Entre outros: **V** (piso salarial proporcional), **XI** (participação nos lucros), **XIV** (turnos ininterruptos), **XX** (proteção do mercado da mulher), **XXIII** (adicionais de penosidade, insalubridade e periculosidade), **XXVII** (automação), **XXIX** (prescrição — a LC 150/2015 trata do tema), **XXXII** e **XXXIV**.

**Macete:** o empregador doméstico **não tem atividade lucrativa** — por isso não faz sentido falar em **participação nos lucros**, **automação** ou **turnos ininterruptos de revezamento**.

⚠️ **Pegadinha:** "Após a EC 72/2013, todos os direitos do art. 7º foram estendidos aos domésticos." **Errado** — a extensão é **seletiva**, e parte dela depende de **lei**.
""", N(23))
m("Art. 7º — direitos dos trabalhadores", 11)

# ============================================================== 12 — Quadro do art. 7º
sec("quadro_comparativo", "Módulo 3 — Quadro do art. 7º: regra, exceção, requisito e pegadinha", """
| Inciso | Regra | Exceção / requisito | Pegadinha de concurso |
|---|---|---|---|
| I | Proteção contra despedida arbitrária | **Lei complementar** (não editada); ADCT: multa de 40% do FGTS | "lei ordinária" |
| II | Seguro-desemprego | Desemprego **involuntário** | "inclusive pedido de demissão" |
| IV | Salário mínimo | Fixado em lei, nacional, vedada vinculação | "salário mínimo estadual" |
| VI | Irredutibilidade | **Salvo** convenção ou acordo coletivo | "irredutibilidade absoluta" |
| VII | Remuneração variável | Nunca inferior ao mínimo | — |
| VIII | 13º | Remuneração integral ou valor da aposentadoria | — |
| IX | Noturno > diurno | CF não fixa percentual | "20% fixados na CF" |
| X | Proteção do salário | Retenção **dolosa** é crime | "retenção culposa" |
| XI | Participação nos lucros | **Desvinculada** da remuneração; gestão é **excepcional** | "integra o salário" |
| XII | Salário-família | Trabalhador de **baixa renda** | "todos os trabalhadores" |
| XIII | 8h/dia e 44h/semana | Compensação e redução por **acordo ou convenção coletiva** | "48h semanais" |
| XIV | 6h em turnos ininterruptos | **Salvo negociação coletiva** | "8h em qualquer regime" |
| XV | Repouso semanal | **Preferencialmente** aos domingos | "obrigatoriamente aos domingos" |
| XVI | Hora extra | **No mínimo** 50% | "exatamente 50%" |
| XVII | Férias | **Pelo menos** 1/3 a mais | "1/3 do salário em vez de 1/3 a mais" |
| XVIII | Licença à gestante | **120 dias**, sem prejuízo do emprego e do salário | "180 dias pela CF" |
| XIX | Licença-paternidade | Nos termos da lei (ADCT: 5 dias) | "5 dias no art. 7º" |
| XXI | Aviso prévio | **No mínimo 30 dias**, proporcional | "30 dias fixos" |
| XXV | Creche e pré-escola | **Até 5 anos** (EC 53/2006) | "até 6 anos" |
| XXVIII | Seguro de acidente | A cargo do empregador; **não exclui** indenização por dolo ou culpa | "exclui a indenização" |
| XXIX | Prescrição | **5 anos**, até **2 anos** após a extinção | "2 anos do fato" |
| XXXIII | Menor de idade | <14 nada; 14–15 aprendiz; <18 sem noturno/perigoso/insalubre | "menor de 16 em atividade leve" |
| XXXIV | Avulso | **Igualdade** com o empregado permanente | — |
| p. ú. | Domésticos | Extensão **seletiva**; parte depende de lei (LC 150/2015) | "todos os direitos" |
""", N(11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23))
m("Art. 7º — direitos dos trabalhadores", 12)
