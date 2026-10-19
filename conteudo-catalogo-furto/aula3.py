from helpers import *

# ============================================================== 11 — Repouso noturno
sec("aprofundamento", "Repouso noturno (§ 1º): conceito, majorante, Temas 1.144 e 1.087", """
### 5.1 Conceito — não confunda
- **Noite:** fenômeno astronômico (ausência de luz solar).
- **Horário noturno:** faixa de horas definida em outras leis para outros fins (ex.: trabalho noturno) — **não** serve, por si só, para o § 1º.
- **Período habitual de repouso:** o tempo em que a população **do lugar** costuma se recolher para descansar.
- **Situação concreta de descanso:** o sossego e a tranquilidade do período da noite naquele local.
- **Redução da vigilância:** o motivo do aumento — à noite, em repouso, os bens ficam menos vigiados e a vítima tem menor capacidade de resistir.
- **Circunstâncias do local:** zona rural × centro urbano; rua movimentada × deserta; estabelecimento 24h × fechado.
⚠️ Não existe um **horário universal e rígido** (ex.: "das 22h às 6h") fixado pela lei. O juiz avalia o caso.

### 5.2 Majorante
- **Majorante** (causa de aumento) é aplicada na **3ª fase** da dosimetria, por fração fixa.
- **Fração vigente:** **metade** (Lei 15.397/2026, DOU de 4/5/2026). Antes: **um terço**. Fatos anteriores a 4/5/2026 seguem com **1/3** (lei mais grave não retroage).
- **Analise:** o horário; a situação de repouso e sossego; a vigilância do local; o movimento de pessoas.
- **Não se presume pelo relógio:** "foi às 23h" não basta sozinho.

### 5.3 Jurisprudência
⚖️ **Tema Repetitivo 1.144/STJ** (Terceira Seção, REsp 1.979.989/RS, Rel. Min. Joel Ilan Paciornik, julgado em 22/6/2022), em síntese fiel:
1. Pelo § 1º, se o furto é praticado durante o repouso noturno, a pena é aumentada (a tese, de 2022, menciona **um terço** — fração vigente à época);
2. **Repouso noturno** compreende o período em que a população se recolhe para descansar, devendo o julgador atentar às características do caso concreto;
3. A situação de repouso existe quando há **sossego/tranquilidade** do período da noite, que, pela **menor vigilância** dos bens ou pela **menor capacidade de resistência** da vítima, facilita a prática do crime;
4. **É irrelevante** se as vítimas estavam ou não dormindo no momento do crime e o **local** — estabelecimento comercial, via pública, residência desabitada ou veículo —, bastando que o furto ocorra **à noite e em situação de repouso**.

⚖️ **Tema Repetitivo 1.087/STJ** (Terceira Seção, REsp 1.890.981/SP e outros, Rel. Min. João Otávio de Noronha, julgado em 25/5/2022): "A causa de aumento prevista no § 1º do art. 155 do Código Penal (prática do crime de furto no período noturno) **não incide** no crime de furto na sua forma **qualificada** (§ 4º)."
- Isso **alterou** o entendimento anterior do próprio STJ, que admitia a cumulação; à época, o STF tinha precedentes admitindo (ex.: HC 130.952/MG, 2ª Turma). **Verifique** se houve mudança posterior no STF antes da prova.
- **Regra legal × interpretação:** a lei só diz "aumenta-se... durante o repouso noturno"; quem definiu o alcance (o que é repouso, onde vale, se cabe no qualificado) foi a **jurisprudência**.

### 5.4 Casos obrigatórios (hipotéticos)
1. **Madrugada, residência com moradores dormindo:** à noite e em repouso → **incide** (furto simples).
2. **Madrugada, comércio fechado:** o Tema 1.144 diz que o local é irrelevante → **pode incidir**, se presente a situação de repouso.
3. **Via pública à noite:** **pode incidir** (Tema 1.144 menciona via pública), desde que haja sossego e menor vigilância — depende dos fatos.
4. **Local movimentado à noite** (rua de bares lotada às 23h): a situação de repouso é **duvidosa** → não incide automaticamente; o juiz analisa as circunstâncias.
5. **Durante o dia:** **não incide**.
6. **Furto qualificado à noite:** **não incide** o § 1º (Tema 1.087/STJ) — a noite pode, no máximo, ser considerada nas circunstâncias judiciais, conforme o caso.
""" + ex(
    "Às 3h da manhã, Mateus arromba a porta de uma loja fechada, numa rua deserta, e leva notebooks.",
    "Incide o aumento do repouso noturno?",
    "**Não.** Houve **rompimento de obstáculo** (porta arrombada) → furto **qualificado** (§ 4º, I). Pelo **Tema 1.087/STJ**, a majorante do repouso noturno **não incide** no furto qualificado. Além disso, notebooks atraem o **§ 6º, II** (computador portátil), com pena de 4 a 10 anos para fatos a partir de 4/5/2026. Se, no mesmo horário, ele tivesse entrado por uma porta **destrancada** e levado objetos sem qualificadora, aí sim o aumento poderia incidir (furto simples, à noite, em situação de repouso — Tema 1.144).",
    [Q("rua", "3h da manhã. Rua deserta.", [P("investigado", "centro", "ataca", "serio")], efeito="CRAC!"),
     Q("delegacia", "No inquérito, a dúvida sobre o aumento.", [P("delegado", "esq", "fala", "serio", "documento"), P("promotor", "dir", "neutro", "neutro")], (0, "Qualificado: o § 1º não incide."))],
    "Sem repouso noturno (Tema 1.087) | alerta",
    fluxo("O § 1º incide?", [
        ("É furto qualificado?", "erro", "Sim → não incide (Tema 1.087)"),
        ("Se simples: foi à noite?", "neutro", "Dia → não incide"),
        ("Havia repouso/sossego?", "alerta", "Local movimentado → analisar"),
    ], ("Simples + noite + repouso → aumento de metade", "ok", "1/3 para fatos antes de 4/5/2026"))),
    ["N0003", "N0006"])
m("Repouso noturno e privilégio", 11)

# ============================================================== 12 — Furto privilegiado
sec("explicacao", "Furto privilegiado (§ 2º) e a Súmula 511 do STJ", """
📜 **§ 2º:** "Se o criminoso é primário, e é de pequeno valor a coisa furtada, o juiz pode substituir a pena de reclusão pela de detenção, diminuí-la de um a dois terços, ou aplicar somente a pena de multa."

**Destrinchando:**
- **Primariedade:** é primário quem **não é reincidente** (reincidente é quem comete novo crime depois de condenado definitivamente por crime anterior, dentro do período do art. 64 do CP). Maus antecedentes, por si sós, não afastam a primariedade.
- **Coisa de pequeno valor:** avaliada no momento do crime. A jurisprudência do STJ costuma usar como **referência** o **salário mínimo** vigente à época do fato, **sem caráter absoluto** — o valor econômico **não** é critério isolado; observa-se o caso.
- **Requisitos legais:** os dois, **cumulativos** (primário **e** pequeno valor).
- **Efeitos (alternativos):** (1) substituir reclusão por **detenção**; (2) **diminuir** a pena de **1/3 a 2/3**; (3) aplicar **somente multa**.
- **"Pode" ou "deve"?** Presentes os requisitos, a doutrina e a jurisprudência majoritárias tratam o benefício como **direito subjetivo** do réu; o juiz escolhe qual dos efeitos aplicar, fundamentadamente.

⚖️ **Súmula 511/STJ** (Terceira Seção, 2014): "É possível o reconhecimento do privilégio previsto no § 2º do art. 155 do CP nos casos de crime de furto qualificado, se estiverem presentes a primariedade do agente, o pequeno valor da coisa e a qualificadora for de ordem objetiva."
- **Compatibilidade com furto qualificado:** sim — o chamado **furto híbrido** ou **qualificado-privilegiado**.
- **Qualificadora objetiva × subjetiva:** objetiva liga-se ao **modo de execução** (rompimento de obstáculo, escalada, chave falsa, concurso de pessoas); a doutrina costuma apontar o **abuso de confiança** como de natureza **subjetiva** (ligada à relação pessoal) — o que, pela Súmula 511, impede o privilégio. Fraude e destreza têm classificação discutida; confira a posição adotada pela banca.
- **§ 8º:** a própria lei manda aplicar o § 2º "**em qualquer caso**" ao furto de fios, cabos e equipamentos.

**Pequeno valor × insignificância:**
| | **Furto privilegiado (§ 2º)** | **Princípio da insignificância** | **Furto qualificado (§ 4º e ss.)** |
|---|---|---|---|
| Natureza | Causa de **diminuição**/substituição de pena | Exclui a **tipicidade material** (não há crime) | Forma mais grave, com **nova pena-base** |
| Base | Lei (art. 155, § 2º) | Construção da jurisprudência (STF e STJ) | Lei (§§ 4º a 10) |
| Requisitos | Primário + pequeno valor | Vetores do STF: mínima ofensividade, nenhuma periculosidade, reduzidíssima reprovabilidade, inexpressividade da lesão | Hipótese legal específica (obstáculo, fraude etc.) |
| Valor da coisa | Pequeno (referência: até cerca de 1 salário mínimo, sem rigidez) | **Ínfimo**, avaliado no contexto | Indiferente para a qualificação |
| Resultado | Condena, com pena menor ou só multa | **Absolve** (fato atípico) | Condena, com pena maior |
| Combinações | Cabe no qualificado se a qualificadora for objetiva (Súm. 511) | Em regra, a jurisprudência resiste no qualificado, mas analisa caso a caso | Pode receber o privilégio (Súm. 511) |

🚨 **Não transforme o valor em critério absoluto:** coisa de valor pequeno subtraída de vítima muito pobre, ou com grande prejuízo concreto, pode afastar a insignificância e até o privilégio, conforme o caso.
""" + ex(
    "Paulo, primário, pula um muro baixo de 1 metro e leva duas galinhas de um quintal, valendo bem menos que um salário mínimo.",
    "Há privilégio? Há qualificadora?",
    "Pular um muro de **1 metro** dificilmente configura **escalada** (exige esforço incomum, via anormal) — a qualificadora depende de prova e das circunstâncias. Se não houver qualificadora, é furto simples com **privilégio** possível (primário + pequeno valor). **Atenção:** galinhas de criação podem ser **semovente domesticável de produção** (§ 6º, I, pena de 4 a 10 anos para fatos a partir de 4/5/2026). Se reconhecido o § 6º, I, discute-se o privilégio pela **Súmula 511**, se a qualificadora for considerada objetiva — confira a posição da banca. Insignificância: análise separada.",
    [Q("casa", "Paulo pula um muro baixo.", [P("cidadao", "centro", "neutro", "neutro")]),
     Q("forum", "Na audiência, discute-se o privilégio.", [P("juiz", "esq", "fala", "serio"), P("advogado", "dir", "aponta", "neutro", "documento")], (1, "Réu primário e coisa de pequeno valor!"))],
    "Depende das qualificadoras | alerta",
    comp("Privilégio × insignificância", ("Privilégio (§ 2º)", "Pena menor", "ok", ["Primário", "Pequeno valor", "Condena"]),
         ("Insignificância", "Absolvição", "alerta", ["Lesão ínfima", "Vetores do STF", "Sem valor fixo"]))),
    ["N0004", "N0019", "N0024"])
m("Repouso noturno e privilégio", 12)

# ============================================================== 13 — Energia
sec("aprofundamento", "Furto de energia (§ 3º): gato, medidor adulterado e estelionato", """
📜 **§ 3º:** "Equipara-se à coisa móvel a energia elétrica ou qualquer outra que tenha valor econômico."

- **O que é energia elétrica:** fluxo de cargas elétricas fornecido pela distribuidora, medido em kWh e cobrado conforme o consumo registrado pelo medidor.
- **Por que a lei permite o enquadramento:** a energia tem **valor econômico** e pode ser **desviada** do patrimônio da distribuidora, mas não é "coisa" corpórea; por isso a lei a **equipara** à coisa móvel.
- **Equiparação jurídica:** a lei manda tratar algo como se fosse outra coisa, para um fim específico. Aqui: energia = coisa móvel, para fins de furto.
- **Ligação clandestina:** conexão feita **à margem** do sistema da distribuidora (ex.: puxar fio direto do poste), para consumir energia **sem passar pela medição**.
- **Sistema de medição (noções):** a energia chega pela rede, passa pelo **medidor** do consumidor, que registra o consumo; a fatura é calculada com base nesse registro.
- **Conduta concreta importa:** o enquadramento depende de **como** a energia foi obtida e de **como** a fraude (se houver) foi executada.
- **Requisitos para o furto de energia:** subtração (desvio) + dolo + fim de assenhoramento.

### 7.1 Ligação clandestina ("gato")
📘 O agente desvia energia antes do medidor, consumindo-a sem registro e sem que a distribuidora saiba. **Enquadramento possível:** **furto de energia** (art. 155, § 3º), em regra **simples**; analise se há qualificadora (ex.: § 4º, II, fraude — há divergência sobre usar a fraude como qualificadora aqui). **Ressalvas:** prova pericial do desvio; quem fez a ligação × quem se beneficiou; dolo de cada um.
⚖️ **Pagamento do débito:** a Terceira Seção do STJ (RHC 101.299/RS, 2019) entendeu que o pagamento antes da denúncia **não extingue** a punibilidade no furto de energia (não se aplica a regra dos crimes tributários) — **conferir** atualização.

### 7.2 Furto de energia × estelionato
- **No furto**, o agente **subtrai**: a energia sai do patrimônio da vítima **sem** que ela participe e **sem** perceber; a fraude, quando existe, serve para **burlar a vigilância**.
- **No estelionato** (art. 171: "obter, para si ou para outrem, vantagem ilícita, em prejuízo alheio, induzindo ou mantendo alguém em erro, mediante artifício, ardil, ou qualquer outro meio fraudulento"), a fraude **induz ou mantém a vítima em erro**, e é a **própria vítima** que, enganada, entrega a vantagem (aqui: cobra menos do que o devido).
- **Papel da fraude:** furto → fraude para **diminuir a vigilância**; estelionato → fraude para **enganar a vítima, que colabora**.
- **Participação da vítima:** furto → nenhuma; estelionato → a vítima, iludida, pratica o ato que lhe causa prejuízo.

### 7.3 Casos comparativos
**Caso A — ligação clandestina antes do medidor:** em tese, **furto de energia** (§ 3º). Verifique perícia, autoria e dolo.

**Caso B — alteração fraudulenta do medidor:** ⚖️ **STJ, 5ª Turma, AREsp 1.418.119/DF**, Rel. Min. Joel Ilan Paciornik, julgado em 7/5/2019 (Informativo 648): a alteração do sistema de medição para que **registre consumo inferior ao real**, com o serviço **regularmente prestado e faturado**, configura **estelionato** — há "induzimento em erro da companhia de eletricidade". O próprio julgado registrou entendimento anterior em sentido diverso (RHC 62.437/SC, 2016, furto mediante fraude). **Não generalize** para todas as fraudes em medidores.

**Caso C — substituição do medidor por equipamento clandestino paralelo:** o acórdão do STJ indicado para conferência (publicação de 10/3/2026, registro 202504114410) **não pôde ser acessado** nesta preparação. Por isso, **nenhuma tese é atribuída a ele aqui**. Analise o caso pelos critérios: a energia passou a ser consumida **fora** da medição da distribuidora (aproxima-se do furto) ou a distribuidora continuou faturando com base num registro **falseado** (aproxima-se do estelionato)?

### 7.4 Quadro comparativo
| Critério | **Ligação clandestina ("gato")** | **Medidor adulterado (registra menos)** | **Medidor paralelo/substituído** |
|---|---|---|---|
| Mecanismo | Desvio antes da medição | Registro falseado, serviço faturado | Depende do arranjo técnico |
| Papel da fraude | Burlar a vigilância (se houver) | Induzir a concessionária em erro | A apurar no caso |
| Papel da vítima | Nenhum | Fatura com base no registro falso | A apurar no caso |
| Enquadramento possível | Furto de energia (art. 155, § 3º) | Estelionato (art. 171) | Furto ou estelionato, conforme os fatos |
| Precedente | Entendimento consolidado sobre "gato" | AREsp 1.418.119/DF (2019) | Acórdão de 2026 pendente de conferência |
| Limites | Prova pericial e dolo | Precedente de Turma, não vinculante | Não generalizar |
""" + ex(
    "Na casa de Renata, a perícia encontra um fio ligado diretamente à rede da rua, antes do medidor, abastecendo o chuveiro e o ar-condicionado.",
    "Qual o enquadramento possível?",
    "Em tese, **furto de energia** (art. 155, § 3º): a energia é consumida **fora** da medição, **sem** que a distribuidora participe ou perceba. Precisam ser provados: o desvio (perícia), **quem** fez ou manteve a ligação e o **dolo**. Se, em vez disso, Renata tivesse adulterado o **medidor** para registrar menos, com a conta sendo emitida normalmente, o STJ já enquadrou situação assim como **estelionato** (AREsp 1.418.119/DF) — sempre conforme os fatos.",
    [Q("casa", "A perícia acha um fio direto da rede.", [P("perito", "esq", "aponta", "serio", "documento"), P("vitima", "dir", "neutro", "surpreso")], (0, "Ligação antes do medidor.")),
     Q("delegacia", "O delegado analisa o enquadramento.", [P("delegado", "centro", "fala", "serio", "documento")], (0, "Gato: art. 155, § 3º."))],
    "Furto de energia | erro",
    fluxo("Árvore de decisão: energia", [
        ("A energia passou pelo medidor?", "neutro", "Não → desvio fora da medição"),
        ("Desvio sem a distribuidora saber?", "erro", "Sim → furto (§ 3º)"),
        ("Medidor alterado, conta emitida?", "alerta", "Induzimento em erro"),
        ("Distribuidora cobra a menos, enganada?", "alerta", "Possível estelionato (art. 171)"),
    ], ("Sempre: perícia, autoria e dolo", "neutro"))),
    ["N0005", "N0008"])
m("Energia e qualificadoras", 13)

# ============================================================== 14 — Qualificadoras em detalhe
sec("aprofundamento", "Qualificadoras em detalhe: confiança, fraude, destreza, escalada, chave falsa, concurso e furto eletrônico", """
Para cada uma: **texto · termos · requisitos · incide · não incide · pena · semelhantes · jurisprudência · pegadinha · resumo.**

**Abuso de confiança (§ 4º, II)** — pena 2 a 8.
Termos: confiança **especial**, acima da comum, que **facilita** a subtração. Requisitos: relação de confiança qualificada + aproveitamento dela para subtrair. ✅ Caseira de longa data, com acesso livre a cofres e chaves, leva joias. ❌ Empregado recém-contratado, sem acesso especial, furta objeto do balcão → confiança cotidiana não basta. Semelhante: **apropriação indébita** (art. 168) — o bem **já estava na posse** do agente, entregue pela vítima. Pegadinha: "Todo furto praticado por empregado doméstico é qualificado." → **Errado.** 🧠 Confiança especial + facilitação.

**Fraude (§ 4º, II)** — pena 2 a 8.
Termos: artifício, ardil, disfarce para **reduzir a vigilância** da vítima e permitir a subtração. ✅ Falso técnico distrai a moradora enquanto o comparsa leva o celular. ❌ A vítima, enganada, **entrega** o bem ao agente → **estelionato** (art. 171). Exemplo clássico de prova: falso comprador pede para "testar" o carro e foge → a doutrina e a jurisprudência majoritárias apontam **furto mediante fraude** (a vítima entrega só a **posse vigiada**, não a disponibilidade). Pegadinha: "Furto mediante fraude e estelionato se diferenciam pelo valor do bem." → **Errado.** 🧠 Fraude para tirar a vigilância (furto) × fraude para a vítima entregar (estelionato).

**Destreza (§ 4º, II)** — pena 2 a 8.
Termos: habilidade **especial** que faz a vítima **não perceber** (punguista, "batedor de carteira"). ✅ Retirar a carteira do bolso do passageiro no metrô sem que ele sinta. ❌ Vítima dormindo ou embriagada que não percebe por estar inconsciente → para parte relevante da doutrina, não há destreza (falta a habilidade especial); se a vítima **percebe** a ação, também se nega a qualificadora. Pegadinha: "Furto de pessoa que dormia é sempre qualificado pela destreza." → **Errado.** 🧠 Habilidade especial + vítima atenta que não percebe.

**Escalada (§ 4º, II)** — pena 2 a 8.
Termos: acesso por **via anormal**, com **esforço incomum** (muro alto, telhado, janela elevada, túnel). Requisitos: circunstâncias concretas; em regra, **perícia** (art. 171 do CPP). ✅ Escalar muro de 3 m com escada. ❌ Pular muro baixo ou cerca simples, sem esforço relevante. Pegadinha: "Entrar por qualquer janela configura escalada." → **Errado.** 🧠 Via anormal + esforço incomum, comprovados.

**Chave falsa (§ 4º, III)** — pena 2 a 8.
Termos: instrumento, com ou sem forma de chave, que abre fechadura sem ser a chave verdadeira (gazua, mixa, grampo moldado). ❌ Não diga que **qualquer** objeto improvisado é automaticamente chave falsa: analise a função e a prova. A chave **verdadeira** obtida por fraude ou subtraída tem enquadramento **discutido** (fraude? chave falsa?). Pegadinha: "Usar a chave verdadeira esquecida na porta é chave falsa." → **Errado** (a chave é verdadeira). 🧠 Instrumento que imita a função da chave verdadeira.

**Concurso de pessoas (§ 4º, IV)** — pena 2 a 8.
Termos: **duas ou mais pessoas** concorrendo para o furto (art. 29 do CP: cada um responde na medida de sua culpabilidade). Requisitos: pluralidade de agentes, liame subjetivo, contribuição relevante. Majoritário: computam-se **inimputáveis** e **partícipes**; parte da doutrina exige presença na execução. ⚖️ **Súmula 442/STJ:** não se aplica, no furto qualificado pelo concurso, a majorante do roubo. Pegadinha: "No furto com concurso, aumenta-se a pena de 1/3 até metade, como no roubo." → **Errado** (Súm. 442). 🧠 2+ pessoas → § 4º, IV (2 a 8).

**Furto eletrônico (§ 4º-B e § 4º-C)** — pena 4 a 10 (Lei 15.397/2026).
Termos: furto **mediante fraude** cometido por **dispositivo eletrônico ou informático**. Requisitos: subtração (a vítima **não** entrega) + fraude eletrônica. ✅ Invasão de conta bancária e transferência sem a vítima perceber. ❌ Vítima convencida a fazer ela mesma o Pix → **fraude eletrônica** (art. 171, § 2º-A — estelionato, 4 a 8 anos pela Lei 15.397/2026). **Outras infrações digitais:** invasão de dispositivo informático (art. 154-A), quando não houver subtração. **Aumentos (§ 4º-C):** servidor fora do país (1/3 a 2/3); idoso ou vulnerável (1/3 ao dobro). Pegadinha: "Furto mediante fraude eletrônica e fraude eletrônica do art. 171 têm a mesma pena." → **Errado** (4 a 10 × 4 a 8, pela Lei 15.397/2026). 🧠 Subtração por meio eletrônico → § 4º-B; vítima entrega por erro → art. 171, § 2º-A.

**Rompimento de obstáculo (§ 4º, I)** — pena 2 a 8.
Termos: obstáculo **externo** à coisa, que a protege (porta, cadeado, vidro, alarme). Requisitos: destruição/rompimento + **perícia**, em regra. ✅ Quebrar o vidro do carro para pegar a mochila. ❌ Danificar a própria coisa furtada para levá-la (parte da doutrina não admite). Pegadinha: "A perícia é sempre dispensável se houver testemunhas." → **Errado** (art. 158 do CPP: indispensável quando há vestígios). 🧠 Obstáculo destruído/rompido + perícia.
""" + ex(
    "Luana pede para \"testar\" a bicicleta anunciada por Pedro; ele deixa, ela dá uma volta no quarteirão e foge com a bicicleta.",
    "Furto mediante fraude ou estelionato?",
    "Para a doutrina e a jurisprudência majoritárias, **furto mediante fraude** (§ 4º, II): Pedro entregou apenas a **posse vigiada** e momentânea para o teste, **sem** intenção de transferir a bicicleta; a fraude serviu para **afastar a vigilância** e permitir a subtração. No **estelionato**, a vítima, enganada, **transfere** o bem por vontade viciada (ex.: entrega a bicicleta como venda, recebendo um comprovante falso de pagamento).",
    [Q("rua", "Luana pede para testar a bicicleta.", [P("cidadao", "esq", "fala", "feliz"), P("vitima", "dir", "neutro", "neutro")], (0, "Posso dar uma voltinha?")),
     Q("rua", "Ela some com a bicicleta.", [P("vitima", "centro", "fala", "bravo")], (0, "Ela não voltou!"))],
    "Furto mediante fraude | erro",
    comp("Fraude: onde está o engano?", ("Furto mediante fraude", "§ 4º, II", "erro", ["Fraude afasta a vigilância", "Vítima não transfere o bem", "Agente subtrai"]),
         ("Estelionato", "Art. 171", "alerta", ["Fraude induz a vítima em erro", "Vítima entrega o bem", "Vontade viciada"]))),
    ["N0006", "N0007", "N0008", "N0009", "N0010", "N0013", "N0014", "N0015", "N0016"])
m("Energia e qualificadoras", 14)

# ============================================================== 15 — Insignificância
sec("aprofundamento", "Princípio da insignificância no furto", """
- **Conceito:** o Direito Penal não deve se ocupar de lesões **ínfimas** ao bem jurídico. Aplicado o princípio, o fato é **materialmente atípico** — não há crime.
- **Tipicidade formal:** a conduta se encaixa na descrição da lei ("subtrair coisa alheia móvel").
- **Tipicidade material:** a conduta causa **lesão ou perigo relevante** ao bem jurídico. Na insignificância, há tipicidade formal, mas **não material**.
- **Critérios jurisprudenciais** — vetores do STF (HC 84.412/SP, 2004, Rel. Min. Celso de Mello): (1) **mínima ofensividade** da conduta; (2) **nenhuma periculosidade social** da ação; (3) **reduzidíssimo grau de reprovabilidade** do comportamento; (4) **inexpressividade da lesão** jurídica provocada.
- **Importância do valor do bem:** relevante, mas **não exclusiva**. **Não há limite monetário universal** fixado em lei ou em precedente vinculante para o furto; julgados usam referências diferentes, sempre somadas às circunstâncias.
- **Relevância das circunstâncias:** condição econômica da vítima, importância do bem para ela, modo de execução (qualificadoras costumam pesar contra), contexto.
- **Reincidência e habitualidade:** o STF (Plenário, 2015, HC 123.108, 123.533 e 123.734) decidiu que a aplicação deve ser analisada **caso a caso** — a reincidência **não impede automaticamente** a insignificância, mas a **reiteração** costuma afastá-la. **Sem automatismos.**
- **Restituição do objeto:** pode ser considerada, mas **não torna** o fato insignificante por si só.
- **Diferença em relação ao furto privilegiado:** privilégio = **pena menor** (há crime); insignificância = **não há crime** (atipicidade material). Valor **pequeno** ≠ valor **ínfimo**.

⚠️ **Conferir antes da prova:** os entendimentos atuais do STF e do STJ sobre insignificância (furto qualificado, reiteração, valor de referência) mudam com frequência; confirme nos informativos recentes.
""" + ex(
    "Gustavo, sem antecedentes, subtrai um pacote de biscoitos de baixíssimo valor de um grande supermercado, é detido na saída e o produto é devolvido.",
    "O juiz pode reconhecer a insignificância?",
    "**Pode**, se presentes os vetores do STF (mínima ofensividade, nenhuma periculosidade social, reduzidíssima reprovabilidade e inexpressividade da lesão) — o valor ínfimo, a ausência de violência, a vítima de grande porte e a falta de reiteração apontam nesse sentido. Mas **não é automático**: o juiz analisa o contexto. Se reconhecida, o fato é **materialmente atípico** e Gustavo é absolvido. Se não, ainda se analisa o **privilégio** (§ 2º).",
    [Q("rua", "Gustavo sai com um pacote de biscoitos.", [P("cidadao", "centro", "neutro", "triste")]),
     Q("forum", "O juiz analisa o caso.", [P("juiz", "centro", "fala", "serio", "documento")], (0, "Analiso os quatro vetores."))],
    "Insignificância: caso a caso | alerta",
    fluxo("Insignificância (vetores do STF)", [
        ("Mínima ofensividade?", "ok"),
        ("Nenhuma periculosidade social?", "ok"),
        ("Reduzidíssima reprovabilidade?", "ok"),
        ("Lesão inexpressiva?", "ok"),
    ], ("Todos presentes → atipicidade material", "ok", "Sem valor fixo; reincidência caso a caso"))),
    ["N0001", "N0004"])
m("Insignificância e processo", 15)

# ============================================================== 16 — Processo
sec("doutrina", "Aspectos processuais do furto (seção de Processo Penal)", """
⚠️ Furto é tema de **Direito Penal material**. Esta seção reúne o que costuma cair junto, do **Código de Processo Penal** e de leis processuais — conferir sempre as fontes oficiais.

- **Notícia-crime e registro de ocorrência:** a vítima comunica o fato (boletim de ocorrência); a autoridade policial instaura o **inquérito** (art. 5º do CPP).
- **Ação penal:** **pública incondicionada**, em regra. Exceções do Código Penal: **art. 181** (isenção de pena — cônjuge na constância da sociedade conjugal; ascendente ou descendente); **art. 182** (ação **condicionada à representação** — cônjuge separado, irmão, tio ou sobrinho com quem o agente coabita); **art. 183** (as imunidades **não** se aplicam se houver violência ou grave ameaça, ao estranho que participa do crime e se a vítima tiver **60 anos ou mais**).
- **Preservação de vestígios e cadeia de custódia:** arts. **158-A a 158-F** do CPP (todo o caminho do vestígio, do reconhecimento ao descarte, deve ser documentado).
- **Prova pericial:** **art. 158** (vestígios → exame de corpo de delito indispensável, direto ou indireto; a confissão não supre) e **art. 171** (furto com **rompimento de obstáculo** ou **escalada**: os peritos descrevem vestígios, instrumentos, meios e época provável).
- **Prova testemunhal e imagens de câmeras:** meios de prova válidos, que devem ser preservados com a cadeia de custódia; reconhecimento de pessoas segue o **art. 226** do CPP.
- **Identificação e avaliação do bem:** **art. 172** do CPP (avaliação das coisas destruídas, deterioradas ou que constituam produto do crime) — importante para privilégio, insignificância e reparação.
- **Restituição de coisa apreendida:** **arts. 118 a 124** do CPP (não se restitui enquanto interessar ao processo; restituição pela autoridade policial ou pelo juiz, conforme o caso).
- **Prisão em flagrante:** **art. 302** do CPP (está cometendo; acabou de cometer; é perseguido logo após; é encontrado logo depois com objetos que façam presumir a autoria).
- **Fiança pela autoridade policial:** **art. 322** do CPP — só para infração com pena máxima **não superior a 4 anos**. Com a pena do furto simples elevada a **6 anos** (Lei 15.397/2026), o delegado **não** pode mais arbitrar fiança no furto simples (fatos novos); cabe ao **juiz**.
- **Prisão preventiva:** **art. 313, I** do CPP admite para crime doloso com pena máxima **superior a 4 anos** — requisito objetivo agora presente no furto simples (fatos novos), sem dispensar os demais requisitos (art. 312).
- **Acordo de não persecução penal (art. 28-A do CPP):** infração **sem violência ou grave ameaça**, com pena mínima **inferior a 4 anos** → cabível, em tese, no furto simples e no qualificado do § 4º (mínima de 2), observados os demais requisitos.
- **Suspensão condicional do processo (art. 89 da Lei 9.099/1995):** pena mínima **igual ou inferior a 1 ano** → cabível, em tese, no furto **simples** (mínima de 1 ano).
- **Juizado Especial:** furto **não** é infração de menor potencial ofensivo (pena máxima acima de 2 anos).
- **Competência:** em regra, **Justiça Estadual**; **Justiça Federal** se o furto atingir bens, serviços ou interesse da **União**, autarquias ou empresas públicas federais (art. 109, IV, da CF).

🚨 Não afirme que **todo** furto exige uma única forma de prova, nem que a falta de um elemento produz sempre a mesma consequência: cada caso depende dos vestígios e da prova produzida.
""", ["N0001", "N0002", "N0007", "N0008"])
m("Insignificância e processo", 16)
