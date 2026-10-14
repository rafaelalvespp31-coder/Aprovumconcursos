import json
from helpers import *

MOD = {}
n0 = 13
def m(title, k):
    MOD[n0 + k] = title

# ---------------------------------------------------------------- 14
sec("explicacao", "Módulo 9 — Infrações: natureza, pontos, valores e responsabilidade", """
📘 **Infração de trânsito** é a inobservância de qualquer preceito do CTB, da legislação complementar ou das resoluções do CONTRAN (art. 161). Cada infração tem **natureza** (leve, média, grave ou gravíssima), que define **pontos** e **valor da multa**.

| Natureza | Pontos (art. 259) | Multa (art. 258) |
|---|---|---|
| **Gravíssima** | **7** | R$ 293,47 |
| **Grave** | **5** | R$ 195,23 |
| **Média** | **4** | R$ 130,16 |
| **Leve** | **3** | R$ 88,38 |

🎯 **Fator multiplicador:** a multa só é multiplicada **quando o próprio artigo da infração prevê** (ex.: "multa (dez vezes)"). A natureza continua a mesma; muda apenas o valor.

**Infrações que mais caem:**

| Artigo | Conduta | Natureza | Penalidade | Medida administrativa |
|---|---|---|---|---|
| **162, I** | Dirigir **sem possuir** CNH, PPD ou ACC | Gravíssima | Multa **(3x)** | Retenção até apresentação de condutor habilitado |
| **165** | Dirigir **sob a influência de álcool** ou outra substância psicoativa | Gravíssima | Multa **(10x)** + suspensão por **12 meses** | Recolhimento da CNH e retenção do veículo |
| **165-A** | **Recusar** teste, exame clínico ou perícia (art. 277) | Gravíssima | Multa **(10x)** + suspensão por **12 meses** | Recolhimento da CNH e retenção do veículo |
| **167** | Deixar o condutor ou passageiro de usar o **cinto** | **Grave** | Multa | Retenção até a colocação do cinto |
| **218, III** | Velocidade **mais de 50%** acima da máxima | Gravíssima | Multa **(3x)** + suspensão | Recolhimento da CNH |
| **244, I** | Moto **sem capacete** (condutor ou passageiro) | Gravíssima | Multa + suspensão | Recolhimento da CNH |
| **252, par. único** | Dirigir **segurando ou manuseando celular** | Gravíssima | Multa | — |
| **181, I** | Estacionar na esquina ou a **menos de 5 m** do alinhamento da via transversal | Média | Multa | Remoção do veículo |
| **233** | Deixar de efetuar o registro do veículo em **30 dias** (art. 123) | **Grave** | Multa | Retenção para regularização |

📘 **Velocidade (art. 218):** até **20%** acima → **média**; de **20% a 50%** → **grave**; **mais de 50%** → **gravíssima** (3x + suspensão).

**Quem responde (art. 257):**
- **Proprietário:** infrações ligadas à **regularização e formalidades** do veículo (registro, licenciamento, equipamentos).
- **Condutor:** infrações decorrentes de **atos praticados na direção**.
- **Indicação do condutor (§ 7º):** o proprietário tem **30 dias** (Lei 14.071/2020) para indicar quem dirigia; se não indicar, ele mesmo é considerado responsável.
- **Pessoa jurídica que não indica (§ 8º):** além da multa original, é lavrada **nova multa (NIC)**, de valor igual ao da multa **multiplicado pelo número de infrações iguais** cometidas no período de **12 meses**.

🚨 **PEGADINHA (apostila corrigida):** o art. 233 (registro fora do prazo) é infração **grave**, não gravíssima. E a multa NIC da pessoa jurídica **não** é "sempre em dobro".
""" + ex(
    "Numa blitz, o agente para um carro: o motorista não possui CNH e o passageiro do banco da frente está sem cinto.",
    "Quais infrações e medidas cabem?",
    "**Duas infrações.** Art. 162, I (dirigir sem possuir habilitação): **gravíssima**, multa **(3x)**, **retenção** até apresentação de condutor habilitado. Art. 167 (passageiro sem cinto): **grave**, multa e **retenção** até a colocação do cinto. A multa do cinto é do **condutor**, que responde pelos atos praticados na direção.",
    [Q("transito", "Blitz: motorista sem CNH.", [P("pm", "esq", "aponta", "serio", "documento"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Habilitação, por favor."), "PARE!"),
     Q("transito", "O carro fica retido.", [P("pm", "esq", "fala", "serio"), P("cidadao", "dir", "neutro", "triste")], (0, "Só sai com condutor habilitado."))],
    "Retenção do veículo | alerta",
    comp("Duas infrações na mesma abordagem", ("Art. 162, I — sem CNH", "Gravíssima · 3x", "erro", ["Multa multiplicada por 3", "Retenção do veículo", "Liberação a condutor habilitado"]),
         ("Art. 167 — sem cinto", "Grave · 5 pontos", "alerta", ["Vale para condutor e passageiros", "Retenção até colocar o cinto", "Responde o condutor"]))),
    ["N0057", "N0058", "N0025", "N0026", "N0027", "N0028", "N0029"])
m("Infrações e pontuação", 1)

# ---------------------------------------------------------------- 15
sec("aprofundamento", "Pontuação, suspensão do direito de dirigir e cassação", """
📘 **Duas formas de suspensão (art. 261):**
1. **Por pontos** — somatório no período de **12 meses**: **20** pontos (com 2+ gravíssimas), **30** (com 1 gravíssima) ou **40** (sem gravíssima). Prazo da suspensão: **6 meses a 1 ano**; reincidente em 12 meses: **8 meses a 2 anos**.
2. **Por infração específica** — quando o próprio artigo prevê "suspensão do direito de dirigir" (ex.: arts. 165, 165-A, 218, III, 244, I). Prazo: **2 a 8 meses**, salvo prazo próprio no artigo (o art. 165 traz **12 meses**); reincidente em 12 meses: **8 a 18 meses**.

**Condutor que exerce atividade remunerada (EAR):**
- limite de **40 pontos**, qualquer que seja a natureza das infrações;
- ao atingir **30 pontos**, pode fazer **curso preventivo de reciclagem**; concluído, os pontos são zerados (não pode repetir o benefício no período de 12 meses).

**Suspensão cumprida:** o condutor só volta a dirigir após **curso de reciclagem** (art. 268).

**Cassação da CNH (art. 263):**
- dirigir com o direito de dirigir **suspenso**;
- **reincidência**, em 12 meses, em infrações específicas (ex.: arts. 162, III; 165; 173; 174 e 175);
- **condenação judicial** por crime de trânsito.
Depois de **2 anos** da cassação, o condutor pode requerer a **reabilitação**, refazendo o processo de habilitação.

**Permissão para Dirigir (art. 148):** dura **1 ano**. A CNH definitiva só é concedida se o condutor **não** cometer infração **grave ou gravíssima** nem for **reincidente em média**. Caso contrário, reinicia todo o processo.

🧠 **MEMORIZE:** **20-30-40** (2+ gravíssimas / 1 gravíssima / nenhuma) · EAR **40** com curso aos **30**.
""" + ex(
    "Marcos, motorista de aplicativo com a observação EAR na CNH, somou 32 pontos em 12 meses, incluindo duas gravíssimas.",
    "A CNH de Marcos será suspensa?",
    "**Não, por enquanto.** Para o condutor com **EAR**, o limite é de **40 pontos**, independentemente da natureza das infrações. Com **30 ou mais**, ele já pode fazer o **curso preventivo de reciclagem** e zerar a pontuação.",
    [Q("reparticao", "Marcos: 32 pontos, motorista de aplicativo.", [P("cidadao", "esq", "fala", "surpreso", "celular"), P("servidor", "dir", "pega", "neutro", "documento")], (0, "Vou perder a CNH?")),
     Q("reparticao", "A regra do EAR.", [P("cidadao", "esq", "neutro", "feliz"), P("servidor", "dir", "aponta", "serio")], (1, "Seu limite é 40. Faça o curso preventivo."))],
    "Ainda não suspende | ok",
    fluxo("Condutor com EAR", [("Até 29 pontos", "ok", "Segue normalmente"), ("30 a 39 pontos", "alerta", "Pode fazer o curso preventivo"), ("40 pontos", "erro", "Suspensão do direito de dirigir")])),
    ["N0059", "N0021", "N0022", "N0023", "N0024"])
m("Infrações e pontuação", 2)

# ---------------------------------------------------------------- 16
sec("comparacao", "Módulo 10 — Penalidades × medidas administrativas", """
📜 **Penalidades (art. 256):** advertência por escrito • multa • suspensão do direito de dirigir • cassação da CNH • cassação da PPD • frequência obrigatória em curso de reciclagem. (A **apreensão do veículo**, antigo inciso IV, foi **revogada** pela Lei 13.281/2016.)

📘 **Medidas administrativas (art. 269):** retenção do veículo • remoção do veículo • recolhimento da CNH, da PPD, do CRV e do CLA • transbordo do excesso de carga • teste de dosagem de alcoolemia ou perícia de substância entorpecente • recolhimento de animais na via, entre outras.

| | **Penalidade** | **Medida administrativa** |
|---|---|---|
| **Natureza** | **Punição** pela infração | **Providência** para corrigir a situação ou proteger a via |
| **Quem aplica** | Só a **autoridade de trânsito** (art. 256) | A **autoridade de trânsito ou seus agentes** (art. 269) |
| **Quando** | **Depois** do processo administrativo, com defesa | **Na hora**, durante a fiscalização |
| **Exemplos** | Multa, suspensão, cassação | Retenção, remoção, recolhimento da CNH |

**Retenção × remoção:**

| **Retenção (art. 270)** | **Remoção (art. 271)** |
|---|---|
| O veículo **fica no local** até a irregularidade ser sanada | O veículo é **levado ao depósito** |
| Ex.: falta de cinto, condutor sem CNH | Ex.: estacionamento irregular, veículo não licenciado |
| Não sanada no local → pode ser removido ou, em certos casos, liberado com recolhimento do CLA | Restituição após pagamento das despesas de remoção e estada e demais encargos |

📘 **Advertência por escrito (art. 267, Lei 14.071/2020):** **deve** ser imposta à infração **leve ou média**, punível com multa, se o infrator **não tiver cometido nenhuma outra infração** nos últimos **12 meses**.

🚨 **PEGADINHA:** "O agente de trânsito aplica a multa no momento da autuação." ❌ O agente **autua** e adota **medidas administrativas**; a **penalidade** é imposta pela **autoridade**, após o processo.
""" + ex(
    "Um PM, em convênio com o DETRAN, flagra um motociclista sem capacete e diz: \"Está suspenso o seu direito de dirigir a partir de agora\".",
    "O PM pode aplicar a suspensão?",
    "**Não.** A suspensão é **penalidade** e só a **autoridade de trânsito** a aplica, após o processo (art. 256). O PM **autua** e adota a **medida administrativa** prevista no art. 244, I: **recolhimento do documento de habilitação**.",
    [Q("transito", "Motociclista sem capacete.", [P("pm", "esq", "fala", "bravo"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Está suspenso a partir de agora!")),
     Q("reparticao", "Quem suspende é a autoridade.", [P("gestor", "esq", "aponta", "serio", "documento"), P("pm", "dir", "neutro", "surpreso")], (0, "Você autua; a penalidade vem no processo."))],
    "Agente não aplica penalidade | erro",
    comp("Quem faz o quê", ("Agente de trânsito", "Autua e adota medidas", "alerta", ["Lavra o auto de infração", "Retém ou remove o veículo", "Recolhe a CNH"]),
         ("Autoridade de trânsito", "Aplica penalidades", "ok", ["Após o processo e a defesa", "Multa, suspensão, cassação", "Advertência por escrito"]))),
    ["N0060", "N0018", "N0019", "N0020", "N0021", "N0022", "N0023", "N0024"])
m("Penalidades e medidas administrativas", 3)

# ---------------------------------------------------------------- 17
sec("explicacao", "Módulo 11 — Processo administrativo de trânsito: etapas e prazos", """
📘 **Fluxo do processo (arts. 280 a 290):**

1. **Auto de infração (AIT)** — lavrado pelo agente (art. 280), com tipificação, local, data, hora e identificação do veículo.
2. **Notificação da autuação** — deve ser **expedida em até 30 dias**; se não for, o auto é **arquivado** e o registro julgado **insubsistente** (art. 281, parágrafo único, II).
3. **Defesa da autuação** (defesa prévia) — no prazo indicado na notificação.
4. **Notificação da penalidade** (art. 282) — com prazo para recurso **não inferior a 30 dias** (art. 282, § 4º).
5. **Recurso à JARI** — 1ª instância (art. 285).
6. **Recurso ao CETRAN / CONTRANDIFE** (ou ao colegiado indicado no art. 289) — 2ª instância, no prazo de **30 dias** da publicação ou notificação da decisão da JARI (art. 288).

**Regras que caem:**
- O recurso contra multa pode ser apresentado **sem recolher** o valor (art. 286).
- **Desconto (art. 284):** pagar até o vencimento dá **20%** de desconto; quem adere ao **sistema de notificação eletrônica** e **abre mão de defesa e recurso** paga **60%** do valor (desconto de 40%).
- **Proprietário × condutor:** o proprietário tem **30 dias** para indicar o condutor (art. 257, § 7º).

⚠️ **Prazos a conferir:** a apostila-base cita prazos de **180/360 dias** para notificar a penalidade, prazo de **24 meses** para julgamento e regras de **efeito suspensivo** do recurso. Esses pontos foram alterados por leis recentes e por resoluções do CONTRAN; confira o artigo e a redação vigentes antes de citá-los na prova.

🧠 **MEMORIZE:** **A**uto → **N**otificação (30 dias) → **D**efesa → **P**enalidade → **J**ARI → **C**ETRAN = "**A**gente **N**ota, **D**efesa **P**ede **J**ulgamento **C**erto".
""" + ex(
    "Ana foi autuada por avanço de sinal em 2 de março. A notificação da autuação só foi expedida em 20 de abril.",
    "O que acontece com o auto de infração?",
    "**É arquivado.** A notificação da autuação deve ser expedida em até **30 dias**; fora disso, o auto é arquivado e o registro julgado **insubsistente** (art. 281, parágrafo único, II).",
    [Q("reparticao", "Notificação expedida 49 dias depois.", [P("cidadao", "esq", "aponta", "bravo", "documento"), P("servidor", "dir", "neutro", "surpreso")], (0, "Passou de 30 dias!")),
     Q("reparticao", "O auto cai.", [P("cidadao", "esq", "neutro", "feliz"), P("servidor", "dir", "pega", "serio", "carimbo")], (1, "Arquivado: insubsistente."), "TUM!")],
    "Auto arquivado | ok",
    {"tipo": "linha_tempo", "titulo": "Prazo da notificação da autuação", "unidade": "dias",
     "marcos": [{"em": 0, "rotulo": "Infração e autuação", "estado": "neutro"}, {"em": 30, "rotulo": "Limite para expedir a notificação", "estado": "alerta"}, {"em": 49, "rotulo": "Expedida: auto arquivado", "estado": "erro"}]}),
    ["N0061"])
m("Processo administrativo", 4)

# ---------------------------------------------------------------- 18
sec("explicacao", "Módulo 12 — Crimes de trânsito: disposições gerais", """
📜 **Art. 291:** aos crimes cometidos na direção de veículos automotores aplicam-se as normas gerais do **Código Penal** e do **Código de Processo Penal**, e a **Lei 9.099/1995** no que couber.

📘 **Lesão corporal culposa (art. 291, § 1º):** aplicam-se os benefícios da Lei 9.099/1995 (composição civil, transação penal e representação), **exceto** se o agente estiver:
- **I** — sob a influência de **álcool** ou outra substância psicoativa;
- **II** — participando de **racha** (corrida, disputa ou competição não autorizada);
- **III** — em velocidade superior à máxima da via em **50 km/h**.
Nesses casos, instaura-se **inquérito policial** (§ 2º).

🚨 **PEGADINHA (apostila corrigida):** a exceção do inciso III é **50 km/h acima** do limite — **não** "50% acima". E dirigir **sem habilitação** **não** está entre as exceções do § 1º.

| Regra | Artigo | Resumo |
|---|---|---|
| Suspensão ou proibição de obter CNH/PPD | 292 e 293 | Isolada ou cumulativa; de **2 meses a 5 anos** |
| Suspensão cautelar | 294 | Em qualquer fase, por decisão motivada do juiz |
| Agravantes específicas | 298 | Ex.: sem habilitação, com dano potencial a muitas pessoas, em faixa de pedestres |
| **Socorro afasta flagrante** | **301** | Quem presta **pronto e integral socorro** à vítima **não** é preso em flagrante nem paga fiança |
| Penas restritivas específicas | 312-A | Serviços em pronto-socorros, centros de reabilitação e afins |
| **Vedação de substituição** | **312-B** | **Não** cabe pena restritiva de direitos nos crimes dos arts. **302, § 3º** e **303, § 2º** (com álcool) |
""" + ex(
    "Após uma batida sem álcool, racha nem excesso de velocidade, Rui causa lesão leve em um pedestre e chama o SAMU na hora, ficando no local.",
    "Rui pode ser preso em flagrante? Cabem os benefícios da Lei 9.099?",
    "**Não cabe flagrante:** quem presta **pronto e integral socorro** não é preso em flagrante nem paga fiança (art. 301). **Cabem** os benefícios da Lei 9.099 (art. 291, § 1º), pois não há álcool, racha nem velocidade 50 km/h acima do limite.",
    [Q("rua", "Rui socorre a vítima.", [P("cidadao", "esq", "fala", "triste", "celular"), P("vitima", "dir", "neutro", "triste")], (0, "SAMU? Preciso de ajuda aqui!")),
     Q("delegacia", "Sem flagrante.", [P("delegado", "esq", "fala", "serio"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Prestou socorro: art. 301."))],
    "Sem flagrante | ok",
    fluxo("Lesão culposa: cabe Lei 9.099?", [("Álcool ou psicoativa?", "erro", "Se sim: inquérito"), ("Racha?", "erro", "Se sim: inquérito"), ("50 km/h acima do limite?", "erro", "Se sim: inquérito")], ("Nenhuma: cabe a Lei 9.099", "ok"))),
    ["N0062", "N0063"])
m("Crimes de trânsito", 5)

# ---------------------------------------------------------------- 19
sec("quadro_comparativo", "📊 Crimes em espécie (arts. 302 a 312) e suas penas", """
| Art. | Crime | Pena |
|---|---|---|
| **302** | **Homicídio culposo** na direção | Detenção, **2 a 4 anos** + suspensão/proibição |
| 302, § 1º | Aumento de **1/3 à metade**: sem CNH/PPD; na **faixa ou calçada**; deixar de socorrer (quando possível sem risco); no transporte profissional de passageiros | — |
| **302, § 3º** | Homicídio culposo **sob influência de álcool** ou psicoativa | **Reclusão, 5 a 8 anos** + suspensão/proibição |
| **303** | **Lesão corporal culposa** na direção | Detenção, **6 meses a 2 anos** + suspensão/proibição |
| **303, § 2º** | Lesão culposa **com álcool** **e** resultado de lesão **grave ou gravíssima** | **Reclusão, 2 a 5 anos** |
| **304** | **Omissão de socorro** (se não for elemento de crime mais grave) | Detenção, 6 meses a 1 ano, **ou** multa |
| **305** | **Fuga do local** do acidente para fugir à responsabilidade | Detenção, 6 meses a 1 ano, **ou** multa |
| **306** | **Embriaguez ao volante** (capacidade psicomotora alterada) | Detenção, **6 meses a 3 anos**, multa + suspensão/proibição |
| **307** | **Violar a suspensão ou proibição** de dirigir | Detenção, **6 meses a 1 ano**, multa + nova imposição por **igual prazo** |
| **308** | **Racha** gerando situação de risco | Detenção, 6 meses a 3 anos; lesão grave: reclusão **3 a 6**; morte: reclusão **5 a 10** |
| **309** | Dirigir **sem habilitação**, **gerando perigo de dano** | Detenção, 6 meses a 1 ano, **ou** multa |
| **310** | **Entregar a direção** a não habilitado, embriagado ou inapto | Detenção, 6 meses a 1 ano, **ou** multa |
| **311** | Velocidade incompatível perto de escolas, hospitais, estações e aglomerações, gerando perigo de dano | Detenção, 6 meses a 1 ano, **ou** multa |
| **312** | **Inovar artificiosamente** o local do acidente para induzir a erro | Detenção, 6 meses a 1 ano, **ou** multa |

🎯 **Jurisprudência que cai:**
- **Súmula 720 do STF:** o art. 309 exige **perigo concreto** de dano. Dirigir sem habilitação **sem** gerar perigo é **só infração** (art. 162).
- **Súmula 575 do STJ:** o art. 310 (entregar a direção) é crime de **perigo abstrato** — dispensa lesão ou perigo concreto.
- **Art. 304, parágrafo único:** responde pela omissão ainda que ela seja **suprida por terceiros** ou que se trate de vítima com **morte instantânea** ou **ferimentos leves**.

🚨 **PEGADINHA (apostila corrigida):** a pena do **art. 307** é de **6 meses a 1 ano** (não 2 anos). E o § 2º do art. 303 exige **as duas coisas** juntas: **álcool + lesão grave ou gravíssima**.
""" + ex(
    "Bruno, sem CNH, pega o carro do pai e dirige devagar e corretamente por uma rua vazia até ser parado numa blitz. O pai havia entregado a chave sabendo que ele não era habilitado.",
    "Bruno comete o crime do art. 309? E o pai, o do art. 310?",
    "**Bruno, não:** sem **perigo concreto**, há só a infração do **art. 162, I** (Súmula 720 do STF). **O pai, sim:** o art. 310 é de **perigo abstrato** e se consuma com a entrega da direção a quem não é habilitado (Súmula 575 do STJ).",
    [Q("transito", "Bruno dirige sem CNH, com cuidado.", [P("pm", "esq", "aponta", "serio"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Sem habilitação? Sem perigo: só infração.")),
     Q("forum", "E o pai que entregou a chave?", [P("juiz", "esq", "fala", "serio", "documento"), P("cidadao", "dir", "neutro", "triste")], (0, "Art. 310: perigo abstrato. Responde."))],
    "Pai responde | erro",
    comp("Arts. 309 × 310", ("Art. 309 — dirigir sem CNH", "Exige perigo concreto", "alerta", ["Súmula 720 do STF", "Sem perigo: só o art. 162, I"]),
         ("Art. 310 — entregar a direção", "Perigo abstrato", "erro", ["Súmula 575 do STJ", "Dispensa lesão ou perigo concreto"]))),
    ["N0064", "N0030", "N0031", "N0032", "N0033", "N0034", "N0035", "N0036", "N0037", "N0038", "N0039"])
m("Crimes de trânsito", 6)

# ---------------------------------------------------------------- 20
sec("comparacao", "Álcool ao volante: infração (arts. 165 e 165-A) × crime (art. 306)", """
| | **Infração (art. 165)** | **Crime (art. 306)** |
|---|---|---|
| **Conduta** | Dirigir **sob a influência** de álcool ou psicoativa | Dirigir com **capacidade psicomotora alterada** |
| **Prova** | Qualquer concentração, observadas as margens de tolerância do CONTRAN | **≥ 0,3 mg/L de ar alveolar** **ou** **≥ 6 dg/L de sangue**, **ou** sinais de alteração |
| **Consequência** | Gravíssima, multa **(10x)**, suspensão por **12 meses** | Detenção de **6 meses a 3 anos**, multa e suspensão/proibição |
| **Esfera** | Administrativa | Penal (e também administrativa) |

📘 **Recusa ao bafômetro (art. 165-A):** recusar o teste, exame clínico, perícia ou procedimento do art. 277 é infração **autônoma**, com as **mesmas penalidades e medidas** do art. 165. A recusa **não** gera, sozinha, o crime do art. 306.

📘 **Provas do crime (art. 306, § 2º):** teste de alcoolemia, exame clínico, perícia, **vídeo**, **prova testemunhal** e outros meios admitidos — a alteração pode ser comprovada por **sinais**, mesmo sem bafômetro.

🚨 **PEGADINHA:** "O crime do art. 306 só se comprova com bafômetro ou exame de sangue." ❌ Admite também **sinais de alteração**, vídeo e testemunhas.
""" + ex(
    "Numa blitz da lei seca, Paulo sopra o bafômetro e o resultado é 0,40 mg/L de ar alveolar. Em outra viatura, Lúcia se recusa a soprar, mas não apresenta sinais de embriaguez.",
    "Qual a situação de cada um?",
    "**Paulo:** comete a **infração do art. 165** **e** o **crime do art. 306** (resultado acima de 0,3 mg/L). **Lúcia:** comete a **infração do art. 165-A** (recusa), com as mesmas penalidades do art. 165; sem sinais de alteração, **não** há prova do crime.",
    [Q("rodovia", "Blitz da lei seca: Paulo sopra.", [P("pm", "esq", "aponta", "serio", "documento"), P("cidadao", "dir", "neutro", "surpreso")], (0, "0,40 mg/L: infração e crime.")),
     Q("rodovia", "Lúcia recusa o teste.", [P("cidadao", "esq", "bracos_cruzados", "bravo"), P("pm", "dir", "fala", "serio")], (1, "Recusa: art. 165-A, mesma multa."))],
    "Recusa também é infração | alerta",
    comp("Infração × crime", ("Infração — art. 165", "Administrativa", "alerta", ["Qualquer concentração (com tolerância)", "Multa 10x + suspensão 12 meses", "Recusa: art. 165-A"]),
         ("Crime — art. 306", "Penal", "erro", ["≥ 0,3 mg/L de ar ou ≥ 6 dg/L de sangue", "Ou sinais de alteração", "Detenção de 6 meses a 3 anos"]))),
    ["N0036", "N0037", "N0062", "N0064"])
m("Crimes de trânsito", 7)

# ---------------------------------------------------------------- 21
CASOS = [
    ("Abrangência do CTB", "Um motorista atropela um pedestre na via interna de um condomínio fechado.", "O CTB se aplica?", "(A) Não, área particular • (B) Sim, art. 2º, parágrafo único", "**B.**", "Vias internas de condomínios são consideradas vias terrestres para efeito do CTB."),
    ("Prevalência da sinalização", "O semáforo está verde, mas o agente de trânsito faz sinal de parada.", "O condutor deve obedecer a quem?", "(A) Ao semáforo • (B) Ao agente", "**B.**", "Art. 89: as ordens do agente prevalecem sobre as normas de circulação e os outros sinais, inclusive o semáforo."),
    ("Velocidade", "Na via de 60 km/h, o radar registra 95 km/h.", "Qual a natureza da infração?", "(A) Grave • (B) Gravíssima, multa 3x e suspensão", "**B.**", "95 km/h é mais de 50% acima de 60 (limite de 90): art. 218, III — gravíssima, multa (3x) e suspensão."),
    ("Pontuação", "Em 12 meses, um condutor comum soma 3 graves e 2 médias (23 pontos), sem gravíssima.", "Ele terá o direito de dirigir suspenso?", "(A) Sim, passou de 20 • (B) Não, o limite é 40", "**B.**", "Sem gravíssima, o limite é de 40 pontos (art. 261, I, c)."),
    ("Agente × autoridade", "Durante a fiscalização, o agente recolhe a CNH de um condutor flagrado sob efeito de álcool.", "O recolhimento é penalidade?", "(A) Sim • (B) Não, é medida administrativa", "**B.**", "Recolhimento da CNH é medida administrativa (art. 269); a suspensão (penalidade) depende de processo."),
    ("Crime com socorro", "Após atropelar culposamente um ciclista, a motorista presta socorro imediato e integral.", "Ela pode ser presa em flagrante?", "(A) Sim • (B) Não", "**B.**", "Art. 301: não se impõe prisão em flagrante nem se exige fiança de quem presta pronto e integral socorro."),
    ("Racha com morte", "Dois condutores disputam corrida não autorizada na avenida; um deles atinge e mata um pedestre.", "Qual crime?", "(A) Art. 302 • (B) Art. 308, § 2º", "**B.**", "Racha com resultado morte, quando as circunstâncias não indicam dolo: art. 308, § 2º — reclusão de 5 a 10 anos."),
    ("Lesão com álcool", "Embriagado, um condutor causa lesão leve em outro motorista.", "Aplica-se o art. 303, § 2º?", "(A) Sim • (B) Não, o § 2º exige lesão grave ou gravíssima", "**B.**", "Sem lesão grave ou gravíssima, é o art. 303, caput (com o art. 306 em concurso, conforme o caso), sem os benefícios da Lei 9.099 por causa do álcool."),
]
body = "Cada caso traz a **situação**, a **pergunta**, as **possibilidades**, a **resposta** e a **justificativa**. Tente responder antes de ler o gabarito.\n\n"
for i, (t, s, p, a, r, j) in enumerate(CASOS, 1):
    body += f"**💡 Caso {i} — {t}**\n\n{s}\n\n**Pergunta:** {p}\n\n**Possibilidades:** {a}\n\n✅ **Resposta:** {r} {j}\n\n"
sec("exemplos", "Módulo 13 — Casos práticos resolvidos", body, ["N0041", "N0014", "N0015", "N0058", "N0059", "N0060", "N0063", "N0064"])
m("Casos práticos e pegadinhas", 8)

# ---------------------------------------------------------------- 22
sec("pegadinhas", "🚨 Certo ou errado? As pegadinhas mais cobradas", """
1. "O CTB não se aplica a estacionamentos de shoppings." → ❌ **Errado.** São vias terrestres para o CTB (art. 2º, parágrafo único).
2. "Os órgãos do SNT respondem subjetivamente pelos danos causados." → ❌ **Errado.** Respondem **objetivamente** (art. 1º, § 3º).
3. "O CONTRAN julga os recursos contra decisões da JARI." → ❌ **Errado.** Quem julga é o **CETRAN** (ou CONTRANDIFE).
4. "O semáforo prevalece sobre as ordens do agente." → ❌ **Errado.** **Agente > semáforo > sinais > normas** (art. 89).
5. "Infração grave vale 6 pontos." → ❌ **Errado.** **3-4-5-7**: grave = **5**.
6. "O agente de trânsito pode aplicar a multa." → ❌ **Errado.** O agente **autua**; a penalidade é da **autoridade**.
7. "A apreensão do veículo é penalidade do art. 256." → ❌ **Errado.** Foi **revogada** (Lei 13.281/2016).
8. "Deixar de registrar o veículo em 30 dias é gravíssima." → ❌ **Errado.** Art. 233: **grave**.
9. "O condutor com EAR é suspenso ao atingir 20 pontos." → ❌ **Errado.** O limite do EAR é **40**.
10. "A exceção do art. 291, § 1º, III, é velocidade 50% acima da máxima." → ❌ **Errado.** É **50 km/h** acima.
11. "Dirigir sem habilitação, por si só, é crime." → ❌ **Errado.** O art. 309 exige **perigo de dano** (Súmula 720 do STF).
12. "Entregar a direção a pessoa não habilitada exige perigo concreto." → ❌ **Errado.** Perigo **abstrato** (Súmula 575 do STJ).
13. "A pena por violar a suspensão do direito de dirigir (art. 307) chega a 2 anos." → ❌ **Errado.** **6 meses a 1 ano**, multa e nova imposição.
14. "Recusar o bafômetro não gera nenhuma consequência." → ❌ **Errado.** Art. 165-A: mesmas penalidades do art. 165.
15. "Quem presta socorro à vítima pode ser preso em flagrante normalmente." → ❌ **Errado.** Art. 301 afasta o flagrante e a fiança.

**Como as bancas cobram este tema:** literalidade dos artigos-chave (1º, 7º, 89, 256, 259, 269, 291, 301 a 312), **troca de números** (pontos, prazos, percentuais), **troca de sujeito** (agente × autoridade, JARI × CETRAN) e **situações-problema** com álcool, velocidade e falta de habilitação.
""", ["N0041", "N0004", "N0013", "N0014", "N0025", "N0018", "N0059", "N0063", "N0064"])
m("Casos práticos e pegadinhas", 9)

# ---------------------------------------------------------------- 23
sec("flashcards", "Flashcards de revisão", """
**O que é trânsito (art. 1º, § 1º)?**
→ Utilização das vias por **pessoas, veículos e animais** para **circulação, parada, estacionamento e carga/descarga**.

**Responsabilidade dos órgãos do SNT?**
→ **Objetiva**, por ação, omissão ou erro (art. 1º, § 3º).

**Órgão máximo normativo do SNT?**
→ **CONTRAN**.

**Quem julga recurso em 1ª e em 2ª instância?**
→ **JARI** (1ª) e **CETRAN/CONTRANDIFE** (2ª).

**Ordem de prevalência (art. 89)?**
→ **Agente > semáforo > sinais > normas**.

**Pontos por natureza?**
→ Leve **3**, média **4**, grave **5**, gravíssima **7**.

**Limites de pontos para suspensão?**
→ **20** (2+ gravíssimas), **30** (1 gravíssima), **40** (nenhuma); EAR: **40**.

**Validade do exame de aptidão física e mental?**
→ **10** anos (até 49), **5** (50 a 69), **3** (70+).

**Quem aplica penalidade? E medida administrativa?**
→ Penalidade: só a **autoridade**. Medida: **autoridade ou agentes**.

**Prazo para expedir a notificação da autuação?**
→ **30 dias**, sob pena de arquivamento.

**Exceções à Lei 9.099 na lesão culposa?**
→ **Álcool**, **racha**, **50 km/h** acima do limite.

**Limite de álcool para o crime do art. 306?**
→ **0,3 mg/L** de ar alveolar ou **6 dg/L** de sangue (ou sinais).

**Homicídio culposo com álcool?**
→ Art. 302, § 3º: **reclusão de 5 a 8 anos**.
""", ["N0002", "N0004", "N0007", "N0013", "N0014", "N0025", "N0059", "N0053", "N0060", "N0061", "N0063", "N0036", "N0030"])
m("Revisão final", 10)

# ---------------------------------------------------------------- 24
sec("resumo", "Resumo por módulo, revisão de véspera e glossário", """
**Resumo por módulo**
- **Introdução:** trânsito = uso das vias; trânsito seguro é direito de todos; responsabilidade **objetiva**; prioridade à **vida**; vias internas de condomínio, praias e estacionamentos coletivos são vias terrestres.
- **SNT:** CONTRAN (normativo máximo) • CETRAN/CONTRANDIFE • executivos de trânsito e rodoviários • PRF • PM • JARI.
- **Circulação e sinalização:** ultrapassagem pela **esquerda**; agente > semáforo > sinais > normas.
- **Veículos:** **registro** (uma vez, e na transferência) × **licenciamento** (anual).
- **Habilitação:** validade **10/5/3**; categorias **A a E**; PPD de **1 ano**.
- **Infrações:** **3-4-5-7** pontos; multiplicador só quando o artigo prevê.
- **Suspensão:** **20/30/40** pontos; EAR **40** (curso aos 30); por infração específica, 2 a 8 meses (salvo prazo próprio).
- **Penalidades × medidas:** autoridade × autoridade ou agente.
- **Processo:** notificação da autuação em **30 dias**; recurso sem recolher a multa; JARI → CETRAN.
- **Crimes:** 302 (2 a 4; com álcool, 5 a 8), 303 (6m a 2; § 2º, 2 a 5), 306 (6m a 3), 307 (6m a 1), 308 (6m a 3; 3 a 6; 5 a 10).

**Revisão de véspera (10 frases)**
1. Responsabilidade do SNT: **objetiva**.
2. JARI julga em **1ª** instância; CETRAN, em **2ª**.
3. **Agente > semáforo > sinais > normas.**
4. **3-4-5-7** pontos.
5. **20-30-40** para suspensão; EAR, **40**.
6. Penalidade só pela **autoridade**.
7. Notificação da autuação em **30 dias**.
8. Lei 9.099 na lesão culposa, **salvo** álcool, racha e **50 km/h** acima.
9. Socorro pronto e integral **afasta flagrante** (art. 301).
10. Art. 309 exige **perigo concreto**; art. 310 é **perigo abstrato**.

**Glossário**
- **AIT:** auto de infração de trânsito.
- **CLA / CRLV:** certificado de licenciamento anual (documento do licenciamento).
- **CRV:** certificado de registro do veículo.
- **EAR:** observação na CNH de quem exerce atividade remunerada ao volante.
- **JARI:** Junta Administrativa de Recursos de Infrações.
- **NIC:** multa por não indicação do condutor pela pessoa jurídica.
- **PPD:** Permissão para Dirigir, válida por 1 ano.
- **RENACH / RENAVAM:** registros nacionais de condutores e de veículos.
""", ["N0040", "N0043", "N0047", "N0050", "N0051", "N0052", "N0057", "N0060", "N0061", "N0062"])
m("Revisão final", 11)

# ---------------------------------------------------------------- 25
sec("checklist", "Checklist: você consegue…", """
- [ ] Dizer o conceito de **trânsito** e onde o CTB se aplica?
- [ ] Explicar a **responsabilidade objetiva** dos órgãos do SNT?
- [ ] Listar a **composição do SNT** e quem julga recursos em cada instância?
- [ ] Recitar a **ordem de prevalência** da sinalização?
- [ ] Diferenciar **registro** de **licenciamento**?
- [ ] Dizer a **validade** do exame e as **categorias** da CNH?
- [ ] Calcular **pontos** e dizer quando a CNH é **suspensa** (20/30/40 e EAR)?
- [ ] Separar **penalidades** de **medidas administrativas** e dizer quem aplica cada uma?
- [ ] Explicar o **fluxo do processo** e o prazo de **30 dias** da notificação da autuação?
- [ ] Citar as exceções do **art. 291, § 1º**?
- [ ] Dar as penas dos crimes dos **arts. 302 a 310**?
- [ ] Diferenciar a **infração** (art. 165) do **crime** (art. 306) de álcool ao volante?
""", ["N0041", "N0042", "N0044", "N0014", "N0051", "N0053", "N0054", "N0059", "N0060", "N0061", "N0063", "N0064"])
m("Revisão final", 12)

json.dump({"S": S, "MOD": MOD}, open("conteudo-catalogo-ctb/p3.json", "w", encoding="utf8"), ensure_ascii=False)
print(len(S))
