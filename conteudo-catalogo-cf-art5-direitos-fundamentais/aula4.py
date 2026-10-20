from helpers import *

# ============================================================== 18 — Garantias penais XXXIX a XLVIII
sec("explicacao", "Módulo 6 — Garantias penais: legalidade, irretroatividade, crimes inafiançáveis e penas (incisos XXXIX a XLVIII)", """
### XXXIX e XL — Legalidade e irretroatividade penal

- **XXXIX:** **não há crime sem lei anterior que o defina**, nem **pena sem prévia cominação legal** (legalidade + anterioridade).
- **XL:** a lei penal **não retroagirá**, **salvo para beneficiar o réu**.

📌 Lei penal **mais benéfica** retroage **mesmo após o trânsito em julgado** (aplicada pelo juízo da execução — Súmula 611 do STF). Lei **mais grave** nunca retroage. Nos crimes **permanentes e continuados**, aplica-se a lei mais grave se sua vigência for **anterior à cessação** da permanência ou da continuidade (**Súmula 711 do STF**).

---

### XLI a XLIV — Discriminação e crimes de tratamento rigoroso

- **XLI:** a lei **punirá** qualquer **discriminação atentatória** dos direitos e liberdades fundamentais.
- **XLII:** a prática do **racismo** constitui crime **inafiançável e imprescritível**, sujeito à pena de **reclusão**, nos termos da lei.
- **XLIII:** a lei considerará crimes **inafiançáveis e insuscetíveis de graça ou anistia** a prática da **tortura**, o **tráfico** ilícito de entorpecentes e drogas afins, o **terrorismo** e os definidos como crimes **hediondos**, por eles respondendo os **mandantes**, os **executores** e os que, **podendo evitá-los, se omitirem**.
- **XLIV:** constitui crime **inafiançável e imprescritível** a ação de **grupos armados, civis ou militares**, contra a **ordem constitucional e o Estado Democrático**.

**O quadro mais cobrado de todo o art. 5º:**
| Crime | Inafiançável | Imprescritível | Sem graça/anistia |
|---|---|---|---|
| **Racismo** (XLII) | ✅ | ✅ | — |
| **Ação de grupos armados** contra a ordem constitucional (XLIV) | ✅ | ✅ | — |
| **Tortura, Tráfico, Terrorismo, Hediondos** — **3TH** (XLIII) | ✅ | ❌ | ✅ |

**Macetes:**
- **Imprescritíveis = RAÇÃO**: **RA**cismo + a**ÇÃO** de grupos armados.
- **3TH** (Tortura, Tráfico, Terrorismo e Hediondos) = inafiançáveis + **sem graça nem anistia**, mas **prescrevem**.

📌 **Injúria racial:** o STF entendeu que a injúria racial é espécie de **racismo** e, portanto, **imprescritível** (HC 154.248, 2021); depois, a **Lei 14.532/2023** levou a injúria racial para a Lei 7.716/1989.
📌 **Homotransfobia:** o STF enquadrou condutas homofóbicas e transfóbicas no conceito de **racismo** (ADO 26 e MI 4.733, 2019), até que o Congresso edite lei específica.
📌 **Inafiançável ≠ sem liberdade provisória:** o STF admite **liberdade provisória sem fiança** em crimes inafiançáveis quando ausentes os requisitos da prisão preventiva (ex.: tráfico — julgamento sobre o art. 44 da Lei 11.343/2006).

---

### XLV a XLVIII — A pena

- **XLV (personalidade/intranscendência):** **nenhuma pena passará da pessoa do condenado**, podendo a **obrigação de reparar o dano** e a decretação do **perdimento de bens** ser **estendidas aos sucessores** e contra eles executadas, **até o limite do valor do patrimônio transferido**.
- **XLVI (individualização):** a lei regulará a individualização da pena e adotará, entre outras: (a) **privação ou restrição da liberdade**; (b) **perda de bens**; (c) **multa**; (d) **prestação social alternativa**; (e) **suspensão ou interdição de direitos**.
- **XLVII (penas proibidas):** não haverá penas: (a) **de morte, salvo em caso de guerra declarada**, nos termos do art. 84, XIX; (b) **de caráter perpétuo**; (c) **de trabalhos forçados**; (d) **de banimento**; (e) **cruéis**.
- **XLVIII:** a pena será cumprida em **estabelecimentos distintos**, de acordo com a **natureza do delito**, a **idade** e o **sexo** do apenado.

**Macete das penas proibidas — "MOR-PER-TRA-BA-CRU":** **Mor**te (salvo guerra declarada) · **Per**pétua · **Tra**balhos forçados · **Ba**nimento · **Cru**éis.

⚠️ **Pegadinhas:**
- "A multa pode ser executada contra os herdeiros do condenado." **Errado** — multa é **pena** e não passa da pessoa do condenado; o que passa aos sucessores é a **reparação do dano** e o **perdimento de bens**, **até o limite da herança**.
- "Trabalho do preso é vedado por ser trabalho forçado." **Errado** — o trabalho do condenado é **dever** previsto na LEP e é remunerado; o que se veda é o trabalho **forçado** como pena.
- "A pena de morte é totalmente proibida no Brasil." **Errado** — exceção: **guerra declarada**.
- A individualização da pena é uma lista **exemplificativa** ("entre outras").
""" + ex(
    "Carlos foi condenado a pena de multa e a reparar os danos causados à vítima. Ele morre antes de pagar. Deixa herança de R$ 30 mil. A reparação fixada é de R$ 50 mil.",
    "O que pode ser cobrado dos herdeiros?",
    "A **multa não** pode ser cobrada: é pena e **não passa da pessoa do condenado** (XLV). A **reparação do dano** pode ser exigida dos sucessores, mas **só até o limite do patrimônio transferido** — ou seja, até **R$ 30 mil**.",
    [Q("forum", "Carlos é condenado à multa e à reparação.", [P("juiz", "esq", "fala", "serio", "documento"), P("investigado", "dir", "neutro", "triste")], (0, "Multa e reparação de 50 mil.")),
     Q("casa", "Após a morte de Carlos, os herdeiros recebem a cobrança.", [P("cidadao", "esq", "pega", "surpreso", "documento"), P("advogado", "dir", "fala", "neutro")], (1, "Multa não. Reparação até 30 mil."))],
    "Pena não passa do condenado | ok",
    comp("O que passa aos herdeiros?", ("Multa (pena)", "Não passa", "erro", ["intranscendência da pena", "extinta com a morte"]), ("Reparação do dano", "Passa até o limite", "ok", ["limite: patrimônio transferido", "aqui: R$ 30 mil"]))),
    N(47, 48, 49))
m("Garantias penais e direitos da pessoa presa (art. 5º, XXXIX a LII, LVII a LXVII, LXXV a LXXVII)", 18)

# ============================================================== 19 — Pessoa presa e extradição
sec("explicacao", "Módulo 6 — Direitos da pessoa presa e extradição (incisos XLIX, L, LI, LII, LXII, LXIII e LXIV)", """
### Direitos da pessoa presa

| Inciso | Garantia |
|---|---|
| **XLIX** | É assegurado aos presos o **respeito à integridade física e moral** |
| **L** | Às **presidiárias** serão asseguradas condições para que possam **permanecer com seus filhos durante o período de amamentação** |
| **LXII** | A prisão de qualquer pessoa e o local onde se encontre serão **comunicados imediatamente** ao **juiz competente** e à **família do preso ou à pessoa por ele indicada** |
| **LXIII** | O preso será **informado de seus direitos**, entre os quais o de **permanecer calado**, sendo-lhe assegurada a **assistência da família e de advogado** |
| **LXIV** | O preso tem direito à **identificação dos responsáveis por sua prisão ou por seu interrogatório policial** |

**Comunicação da prisão — dois destinatários (LXII):** **juiz competente** + **família ou pessoa indicada**. Em seguida, o CPP (art. 306) e a regulamentação da **audiência de custódia** exigem apresentação ao juiz em até **24 horas**.

**Direito ao silêncio (LXIII) — alcance real:**
- Vale para **qualquer pessoa** investigada ou acusada, presa ou solta — não só para o "preso" do texto.
- Abrange o direito de **não produzir prova contra si mesmo** (*nemo tenetur se detegere*): não é obrigado a participar de reconstituição, fornecer padrão de voz ou escrita, ou soprar o etilômetro.
- O silêncio **não pode ser interpretado em prejuízo da defesa** (CPP, art. 186, p. ú.).
- Os agentes devem **informar** esse direito: a falta do aviso pode tornar ilícita a confissão informal obtida (o STF já anulou provas de "entrevista" sem advertência — o chamado **aviso de Miranda**).
- **Não** abrange mentir sobre a própria **identidade**: atribuir-se falsa identidade perante autoridade é crime (Súmula 522 do STJ).

📌 **Súmula Vinculante 11 (algemas):** só é lícito o uso de algemas em caso de **resistência** e de **fundado receio de fuga** ou de **perigo à integridade física** própria ou alheia, por parte do preso ou de terceiros, **justificada a excepcionalidade por escrito**, sob pena de responsabilidade disciplinar, civil e penal do agente ou da autoridade e de nulidade da prisão ou do ato processual, sem prejuízo da responsabilidade civil do Estado.

---

### LI e LII — Extradição

- **LI:** **nenhum brasileiro será extraditado**, **salvo o naturalizado**, em caso de **crime comum, praticado antes da naturalização**, ou de **comprovado envolvimento em tráfico ilícito de entorpecentes e drogas afins**, na forma da lei.
- **LII:** **não será concedida extradição de estrangeiro por crime político ou de opinião**.

| Pessoa | Pode ser extraditada? |
|---|---|
| **Brasileiro nato** | **Nunca** |
| **Brasileiro naturalizado** | **Sim**, por (1) **crime comum anterior** à naturalização ou (2) **tráfico de drogas**, a **qualquer tempo** (antes ou depois) |
| **Estrangeiro** | **Sim**, em regra — **exceto** por **crime político ou de opinião** |

📌 **Como funciona:** o pedido é feito por Estado estrangeiro; o **STF** julga a legalidade (art. 102, I, g); a decisão final de entregar é do **Presidente da República**. A Lei de Migração (Lei 13.445/2017) disciplina o procedimento.
📌 **Extradição × expulsão × deportação × repatriação × entrega:** só a **extradição** atende a pedido de outro país para julgamento ou cumprimento de pena; **expulsão** retira o estrangeiro que cometeu crime aqui ou é nocivo; **deportação** retira quem está em situação migratória irregular; **entrega** é ao TPI.
📌 **Súmula 421 do STF:** **não impede a extradição** a circunstância de ser o extraditando **casado com brasileira ou ter filho brasileiro**.

⚠️ **Pegadinha:** "O brasileiro naturalizado pode ser extraditado por tráfico de drogas apenas se o crime for anterior à naturalização." **Errado** — no tráfico, **pouco importa o momento**; a exigência de anterioridade vale para o **crime comum**.
""" + ex(
    "Pierre, francês naturalizado brasileiro em 2015, é procurado pela França por tráfico internacional de drogas praticado em 2022, e por um furto cometido em 2010.",
    "Pierre pode ser extraditado? Por quais crimes?",
    "**Sim, pelos dois.** O **furto de 2010** é **crime comum praticado antes da naturalização** (2015). O **tráfico de 2022**, embora posterior à naturalização, também autoriza a extradição, porque no tráfico a CF não exige anterioridade (art. 5º, LI). Se Pierre fosse **brasileiro nato**, não poderia ser extraditado em nenhum caso.",
    [Q("forum", "O STF recebe o pedido de extradição.", [P("juiz", "esq", "pega", "serio", "documento"), P("advogado", "dir", "fala", "serio")], (1, "Ele é brasileiro naturalizado!")),
     Q("forum", "O relator explica a regra do inciso LI.", [P("juiz", "centro", "fala", "serio")], (0, "Crime anterior e tráfico: cabe."))],
    "Naturalizado: crime comum anterior ou tráfico | alerta",
    linha("Extradição de naturalizado (art. 5º, LI)", "anos", [(2010, "Furto: crime comum", "alerta"), (2015, "Naturalização", "neutro"), (2022, "Tráfico de drogas", "alerta")])),
    N(50, 51))
m("Garantias penais e direitos da pessoa presa (art. 5º, XXXIX a LII, LVII a LXVII, LXXV a LXXVII)", 19)

# ============================================================== 20 — Presunção de inocência, identificação, ação privada subsidiária
sec("explicacao", "Módulo 6 — Presunção de inocência (LVII), identificação criminal (LVIII) e ação penal privada subsidiária (LIX)", """
### LVII — Presunção de inocência (não culpabilidade)

**Ninguém será considerado culpado até o trânsito em julgado de sentença penal condenatória.**

**Três dimensões (doutrina):**
| Dimensão | Significado prático |
|---|---|
| **Regra de tratamento** | O acusado não pode ser tratado como culpado (exposição vexatória, antecipação de pena) |
| **Regra probatória** | O **ônus da prova** da culpa é da **acusação** |
| **Regra de julgamento** | Na dúvida, **absolve-se** (*in dubio pro reo*) |

**Prisão antes do trânsito em julgado — o que vale hoje:**
- **Prisão cautelar** (flagrante convertido, preventiva, temporária) **é compatível** com a presunção de inocência, porque não é pena: depende de **fundamentos cautelares concretos** (CPP, arts. 312 e 313).
- **Execução provisória da pena** após condenação em **segunda instância**: o STF admitiu entre 2016 e 2019, mas **mudou o entendimento** nas **ADCs 43, 44 e 54 (novembro de 2019)**: é **constitucional o art. 283 do CPP**, e a pena só pode ser executada **após o trânsito em julgado**.
- **Exceção atual — júri:** no Tema 1.068 (2024), o STF admitiu a **execução imediata** da condenação imposta pelo **Tribunal do Júri**, com base na soberania dos veredictos.

⚠️ **Não apresente o entendimento de 2016 como vigente.** Frase errada típica: "Segundo o STF, a pena pode ser executada após a confirmação da condenação em segundo grau."

📌 **Súmula 444 do STJ:** é vedada a utilização de **inquéritos policiais e ações penais em curso** para **agravar a pena-base** — aplicação direta da presunção de inocência.
📌 **Concurso público:** o STF (Tema 22) entende que, sem previsão constitucional adequada, a eliminação de candidato apenas por responder a inquérito ou ação penal **sem condenação definitiva** viola a presunção de inocência — ressalvadas carreiras com exigências legais específicas e a análise da **vida pregressa** com critérios razoáveis.

---

### LVIII — Identificação criminal

O **civilmente identificado** **não será submetido a identificação criminal**, **salvo nas hipóteses previstas em lei**. A lei é a **Lei 12.037/2009**, que admite a identificação criminal (datiloscópica e fotográfica, e, em certas hipóteses, coleta de perfil genético) quando, por exemplo, o documento apresentar rasura, for insuficiente, houver documentos conflitantes ou quando for **essencial às investigações** por **decisão judicial**.

---

### LIX — Ação penal privada subsidiária da pública

Será admitida **ação privada** nos crimes de **ação pública**, **se esta não for intentada no prazo legal**.

- Pressuposto: **inércia do Ministério Público** — ele não ofereceu denúncia, não pediu arquivamento nem requisitou diligências no prazo legal (5 dias com réu preso; 15 dias com réu solto — CPP, art. 46).
- **Não cabe** quando o MP pediu o **arquivamento** do inquérito: arquivar não é ficar inerte.
- O MP continua atuando: pode **aditar** a queixa, **repudiá-la** e oferecer **denúncia substitutiva**, intervir em todos os termos e **retomar a ação** como parte principal se o querelante for negligente (CPP, art. 29).
""", N(52, 53))
m("Garantias penais e direitos da pessoa presa (art. 5º, XXXIX a LII, LVII a LXVII, LXXV a LXXVII)", 20)

# ============================================================== 21 — Prisão, liberdade provisória, prisão civil, indenização, gratuidades
sec("explicacao", "Módulo 6 — Prisão, relaxamento, liberdade provisória, prisão civil, indenização e gratuidades (LXI, LXV, LXVI, LXVII, LXXV a LXXVII)", """
### LXI — Quando alguém pode ser preso

Ninguém será preso **senão em flagrante delito** ou por **ordem escrita e fundamentada de autoridade judiciária competente**, **salvo** nos casos de **transgressão militar** ou **crime propriamente militar**, definidos em lei.

| Hipótese | Exige ordem judicial? |
|---|---|
| **Flagrante delito** | **Não** — qualquer do povo **pode** e a polícia **deve** prender (CPP, art. 301) |
| **Prisão preventiva** | **Sim** — escrita e fundamentada |
| **Prisão temporária** (Lei 7.960/1989) | **Sim** — só na fase de investigação |
| **Transgressão militar / crime propriamente militar** | **Não** necessariamente judicial — exceção constitucional |

**Prisões em nível constitucional (sem substituir o Processo Penal):**
| | **Flagrante** | **Preventiva** | **Temporária** |
|---|---|---|---|
| Quem decreta | Ninguém (é captura); depois o juiz analisa na audiência de custódia | **Juiz** | **Juiz** |
| Momento | No ato ou logo após o crime | **Investigação ou processo** | **Só na investigação** |
| Prazo | Até a análise judicial (24h) | **Sem prazo fixo** (revisão a cada 90 dias — CPP, art. 316, p. ú.) | **5 + 5 dias**; **30 + 30** nos hediondos e equiparados |
| De ofício? | — | **Não** (após o Pacote Anticrime) | **Não** |

---

### LXV e LXVI — Relaxamento e liberdade provisória

- **LXV:** a prisão **ilegal** será **imediatamente relaxada** pela autoridade judiciária.
- **LXVI:** ninguém será levado à prisão ou nela mantido quando a lei admitir a **liberdade provisória, com ou sem fiança**.

| | **Relaxamento** | **Liberdade provisória** | **Revogação** |
|---|---|---|---|
| Prisão é... | **Ilegal** | **Legal**, mas desnecessária | Preventiva que perdeu seus fundamentos |
| Exemplo | Flagrante forjado; prazo excedido | Flagrante válido, sem requisitos da preventiva | Testemunha já ouvida, risco cessou |
| Base | LXV | LXVI | CPP, art. 316 |

---

### LXVII — Prisão civil por dívida

**Não haverá prisão civil por dívida**, **salvo** a do responsável pelo **inadimplemento voluntário e inescusável de obrigação alimentícia** e a do **depositário infiel**.

**Mas atenção — o texto não reflete a prática atual:**
- O **Pacto de San José da Costa Rica** (art. 7.7) só admite prisão por dívida **alimentar**.
- Como o tratado tem **status supralegal** (RE 466.343, 2008), ele **paralisou a eficácia** das leis que regulamentavam a prisão do depositário.
- **Súmula Vinculante 25:** é **ilícita a prisão civil de depositário infiel**, **qualquer que seja a modalidade do depósito**.

**Resultado:** hoje, **só existe prisão civil do devedor de alimentos** (regime fechado, separado dos presos comuns, por 1 a 3 meses — CPC, art. 528).

⚠️ **Pegadinha:** "A Constituição autoriza a prisão civil do depositário infiel, sendo possível sua decretação." O texto **menciona**, mas a decretação é **ilícita** (SV 25). Se a pergunta for "**segundo o texto constitucional**", a menção existe; se for sobre a **aplicação atual**, é vedada.

---

### LXXV a LXXVII — Indenização e gratuidades

- **LXXV:** o Estado **indenizará o condenado por erro judiciário**, assim como **o que ficar preso além do tempo fixado na sentença**.
- **LXXVI:** são **gratuitos para os reconhecidamente pobres**, na forma da lei: (a) o **registro civil de nascimento**; (b) a **certidão de óbito**.
- **LXXVII:** são **gratuitas** as ações de **habeas corpus** e **habeas data** e, na forma da lei, os **atos necessários ao exercício da cidadania**.

| Gratuidade | Para quem |
|---|---|
| Registro de nascimento e certidão de óbito (LXXVI) | **Reconhecidamente pobres** (a Lei 9.534/1997 estendeu a **todos**) |
| **Habeas corpus e habeas data** (LXXVII) | **Todos** |
| Atos necessários à cidadania (LXXVII) | Todos, **na forma da lei** (Lei 9.265/1996) |

⚠️ **Mandado de segurança, mandado de injunção e ação popular não estão no LXXVII.** A ação popular tem regra própria (LXXIII): autor isento de custas e sucumbência, **salvo má-fé**.
""", N(54, 55, 56))
m("Garantias penais e direitos da pessoa presa (art. 5º, XXXIX a LII, LVII a LXVII, LXXV a LXXVII)", 21)

# ============================================================== 22 — Direitos coletivos
sec("explicacao", "Módulo 7 — Direitos e garantias coletivos: classificação, associações e tutela coletiva", """
O Capítulo I fala em direitos e deveres individuais **e coletivos**. Direitos coletivos (em sentido amplo) protegem **interesses de grupos, categorias ou da coletividade**. A classificação legal está no **Código de Defesa do Consumidor** (Lei 8.078/1990, art. 81, parágrafo único), usada em todo o sistema de processo coletivo.

| Espécie | Titulares | Vínculo entre eles | Objeto | Exemplo |
|---|---|---|---|---|
| **Difusos** | **Indeterminados** e indetermináveis | **Circunstâncias de fato** | **Indivisível** | Poluição de um rio; propaganda enganosa na TV |
| **Coletivos em sentido estrito** | Grupo, categoria ou classe **determinável** | **Relação jurídica base** entre si ou com a parte contrária | **Indivisível** | Aumento ilegal da mensalidade para todos os alunos de uma escola |
| **Individuais homogêneos** | **Determinados** | **Origem comum** | **Divisível** (cada um tem sua parte) | Consumidores lesados por um mesmo lote de produto defeituoso |

**Macete:** difuso = **fato** + indeterminado · coletivo = **relação jurídica** + determinável · individual homogêneo = **origem comum** + divisível.

---

### XXI — Associações representando seus filiados

As **entidades associativas**, **quando expressamente autorizadas**, têm legitimidade para **representar seus filiados judicial ou extrajudicialmente**.

**Representação × substituição processual:**
| | **Representação processual** | **Substituição processual** (legitimidade extraordinária) |
|---|---|---|
| Em nome de quem atua | Em **nome alheio**, defendendo direito **alheio** | Em **nome próprio**, defendendo direito **alheio** |
| Autorização dos associados | **Exige** autorização **expressa** (individual ou em assembleia) | **Dispensa** autorização |
| Exemplo | Associação em ação coletiva de **procedimento comum** (art. 5º, XXI) | **Mandado de segurança coletivo** (LXX); **sindicato** (art. 8º, III) |
| Súmulas | STF, RE 573.232 (Tema 82): exige autorização expressa; não basta previsão genérica no estatuto | **Súmula 629 do STF**: a impetração de MS coletivo por entidade de classe **independe da autorização** dos associados |

📌 **Tema 499 do STF:** na ação coletiva de rito ordinário ajuizada por associação, a eficácia da sentença alcança os filiados **residentes no âmbito da jurisdição** do órgão julgador que o fossem **em momento anterior ou até a data da propositura** da ação, constantes da relação juntada à inicial.

⚠️ **Não aplique a mesma regra a todas as ações coletivas.** Autorização expressa é exigida na **representação** (XXI); **não** é exigida no **MS coletivo** nem na atuação do **sindicato** como substituto.

---

### Instrumentos de tutela coletiva

| Instrumento | Base | Quem propõe |
|---|---|---|
| **Mandado de segurança coletivo** | art. 5º, LXX; Lei 12.016/2009 | Partido com representação no Congresso; organização sindical, entidade de classe ou associação (esta, constituída e em funcionamento há **pelo menos 1 ano**) |
| **Mandado de injunção coletivo** | art. 5º, LXXI; Lei 13.300/2016 | MP, partido, sindicato/entidade/associação, Defensoria |
| **Ação popular** | art. 5º, LXXIII; Lei 4.717/1965 | **Cidadão** |
| **Ação civil pública** | art. 129, III; Lei 7.347/1985 | MP, Defensoria, entes federativos, autarquias, empresas públicas, fundações, sociedades de economia mista e associações |

⚠️ **Pegadinha:** a **ação civil pública** é instrumento de **tutela coletiva**, mas **não** é um dos **remédios constitucionais típicos** do art. 5º. Ela está prevista no art. 129, III, como função do MP. Os remédios são estudados em detalhe na **Parte IV**.
""", N(58, 59, 60))
m("Direitos e garantias coletivos", 22)
