import json
from helpers import *

MOD = {}
n0 = 3
def m(title, k):
    MOD[n0 + k] = title

# ---------------------------------------------------------------- 4
sec("conceitos_fundamentais", "Módulo 1 — Trânsito, abrangência e responsabilidade objetiva", """
📜 **Art. 1º, § 1º:** trânsito é **a utilização das vias por pessoas, veículos e animais**, isolados ou em grupos, conduzidos ou não, para fins de **circulação, parada, estacionamento e operação de carga ou descarga**.

📘 **Em linguagem simples:** tudo o que acontece na via — andar, dirigir, parar, estacionar, carregar e descarregar — é trânsito. Até um animal sendo conduzido na estrada.

| Regra | Onde está | Como a banca cobra |
|---|---|---|
| Trânsito seguro é **direito de todos** e **dever** dos órgãos do SNT | Art. 1º, § 2º | "Dever apenas do condutor" ❌ |
| Órgãos do SNT respondem **objetivamente** por danos de **ação, omissão ou erro** em programas, projetos e serviços | Art. 1º, § 3º | Trocar "objetivamente" por "subjetivamente" ❌ |
| **Prioridade à defesa da vida**, incluída a preservação da saúde e do meio ambiente | Art. 1º, § 5º | "Prioridade à fluidez" ❌ |
| Vias terrestres incluem **praias abertas**, **vias internas de condomínios** e **estacionamentos privados de uso coletivo** | Art. 2º, parágrafo único | "Estacionamento de shopping está fora do CTB" ❌ |

📘 **Vias terrestres (art. 2º):** ruas, avenidas, logradouros, caminhos, passagens, estradas e rodovias — urbanas e rurais.

🚨 **PEGADINHA:** responsabilidade **objetiva** dispensa a prova de culpa do órgão; basta o dano e o nexo com a ação, omissão ou erro.
""" + ex(
    "Um buraco sem sinalização numa avenida municipal, conhecido há meses, causa a queda de um motociclista.",
    "Que regra do CTB fundamenta o pedido de indenização contra o órgão de trânsito?",
    "O **art. 1º, § 3º**: os órgãos do SNT respondem **objetivamente** por danos decorrentes de **ação, omissão ou erro** na execução e manutenção de serviços que garantam o trânsito seguro. O motociclista prova o dano e o nexo; não precisa provar culpa.",
    [Q("obra", "Buraco sem sinalização há meses.", [P("cidadao", "esq", "neutro", "triste"), P("servidor", "dir", "neutro", "surpreso")], (0, "Caí por causa do buraco!"), "TOMBO!"),
     Q("forum", "O pedido de indenização.", [P("advogado", "esq", "aponta", "serio", "documento"), P("juiz", "dir", "fala", "serio")], (1, "Omissão do órgão: responsabilidade objetiva."))],
    "Responsabilidade objetiva | alerta",
    fluxo("Art. 1º, § 3º", [("Ação, omissão ou erro do órgão", "erro"), ("Dano ao cidadão", "erro"), ("Nexo entre os dois", "alerta")], ("Responde objetivamente", "ok", "Sem precisar provar culpa"))),
    ["N0041", "N0042", "N0001", "N0002", "N0003", "N0004", "N0005"])
m("Introdução e Sistema Nacional de Trânsito", 1)

# ---------------------------------------------------------------- 5
sec("quadro_comparativo", "Módulo 2 — Sistema Nacional de Trânsito: composição e competências", """
📘 **Art. 5º:** o SNT é o conjunto de órgãos e entidades da **União, dos Estados, do DF e dos Municípios** que cuidam de planejamento, normatização, registro e licenciamento de veículos, formação e habilitação de condutores, educação, engenharia, operação, policiamento, fiscalização e **julgamento de recursos**.

📜 **Art. 7º — composição:** CONTRAN • CETRAN e CONTRANDIFE • órgãos executivos de trânsito • órgãos executivos rodoviários • PRF • Polícias Militares • JARI.

| Órgão | Natureza | Função principal | Pegadinha |
|---|---|---|---|
| **CONTRAN** | Coordenador do SNT e **órgão máximo normativo** | Edita resoluções, estabelece normas regulamentares | Não é órgão executivo |
| **SENATRAN** | Órgão **executivo** de trânsito da União | Coordena RENACH e RENAVAM, estatísticas | É o antigo DENATRAN |
| **CETRAN / CONTRANDIFE** | **Normativos, consultivos e coordenadores** (Estados / DF) | Julgam recursos contra decisões das JARI (2ª instância) | CONTRANDIFE é só do DF |
| **DETRAN** | Executivo de trânsito estadual (art. 22) | Habilitação, registro e licenciamento de veículos | Não julga recurso |
| **Órgão municipal** | Executivo de trânsito do município (art. 24) | Engenharia, operação, fiscalização e multas no perímetro urbano | Precisa integrar o SNT |
| **Executivos rodoviários** (ex.: DNIT, DER) | Executivos rodoviários | Fiscalizam e operam as rodovias da sua esfera | — |
| **PRF** (art. 20) | Policiamento e fiscalização | Patrulhamento ostensivo das **rodovias federais** | Não atua em rodovia estadual por regra |
| **Polícia Militar** (art. 23) | Policiamento ostensivo | Fiscalização mediante **convênio** com o órgão executivo | — |
| **JARI** | **Julgadora** | Julga recursos contra penalidades (**1ª instância**) | Não é órgão normativo |

⚠️ **Composição do CONTRAN:** foi alterada por leis recentes (é formado por representantes de ministérios, presidido pelo ministro a que a SENATRAN se subordina). Os detalhes mudam com frequência — confira a redação atual do art. 10 antes da prova.

🧠 **MEMORIZE (art. 7º):** **C**ON**C**E **E**xe **R**odo **P**RF **PM** **J**ARI → "**Contran Cetran Executivos Rodoviários, PRF, PM e JARI**".
""" + ex(
    "O candidato lê: \"O CONTRAN julga em 1ª instância os recursos contra multas aplicadas pelo DETRAN\".",
    "A afirmação está correta?",
    "**Não.** Quem julga em **1ª instância** é a **JARI**; da decisão da JARI cabe recurso ao **CETRAN** (ou CONTRANDIFE, no DF). O CONTRAN é o **órgão máximo normativo** e coordenador do sistema.",
    [Q("reparticao", "A questão mistura os órgãos.", [P("cidadao", "esq", "pega", "surpreso", "documento"), P("professor", "dir", "aponta", "serio")], (1, "CONTRAN não julga multa!")),
     Q("reparticao", "Quem faz o quê.", [P("servidor", "esq", "fala", "feliz"), P("gestor", "dir", "neutro", "neutro")], (0, "JARI julga; CETRAN revisa."))],
    "Órgão errado | erro",
    fluxo("Caminho do recurso", [("Penalidade aplicada pela autoridade", "neutro"), ("Recurso à JARI", "ok", "1ª instância"), ("Recurso ao CETRAN / CONTRANDIFE", "ok", "2ª instância")], ("CONTRAN: normas, não julgamento", "alerta"))),
    ["N0043", "N0044", "N0045", "N0006", "N0007", "N0008", "N0009", "N0010", "N0011", "N0012", "N0013"])
m("Introdução e Sistema Nacional de Trânsito", 2)

# ---------------------------------------------------------------- 6
sec("conceitos_fundamentais", "Módulo 3 — Conceitos do Anexo I", """
📘 O **art. 4º** remete os conceitos e definições ao **Anexo I** do CTB. Os que mais caem:

| Conceito | Definição (resumida) | Pegadinha |
|---|---|---|
| **Via** | Superfície por onde transitam veículos, pessoas e animais: pista, calçada, acostamento, ilha e canteiro central | Calçada **também** é via |
| **Rodovia** | Via **rural pavimentada** | Rodovia × estrada |
| **Estrada** | Via **rural não pavimentada** | — |
| **Parada** | Imobilização pelo **tempo estritamente necessário** para embarque ou desembarque de passageiros | Parada ≠ estacionamento |
| **Estacionamento** | Imobilização por tempo **superior** ao necessário para embarque/desembarque | — |
| **Acostamento** | Parte da via diferenciada da pista, destinada à parada ou estacionamento em emergência e à circulação de pedestres e bicicletas quando não houver local próprio | — |
| **Calçada** | Parte da via, normalmente segregada e em nível diferente, reservada ao trânsito de pedestres (e, quando possível, mobiliário e vegetação) | — |
| **Passeio** | Parte da calçada ou da pista, separada por pintura ou elemento físico, livre de interferências, destinada à circulação de pedestres (e, excepcionalmente, de ciclistas) | Passeio é parte da calçada |
| **Faixa de trânsito** | Subdivisões longitudinais da pista, demarcadas ou não | — |
| **Ultrapassagem** | Movimento de passar à frente de outro veículo que se desloca no **mesmo sentido**, em menor velocidade e **na mesma faixa**, saindo e retornando a ela | Ultrapassagem ≠ passagem por outro veículo em faixa diferente |
| **Veículo automotor** | Veículo a motor de propulsão que circula por seus próprios meios | Inclui os elétricos |

⚠️ **Bicicleta elétrica:** a apostila-base informa que a **Resolução CONTRAN 996/2023** classifica como bicicleta elétrica o veículo com motor de até **1.000 W**, velocidade máxima de **32 km/h** e **sem acelerador** (pedal assistido). Confira prazos de adaptação e a redação vigente.

🧠 **MEMORIZE:** **R**odovia = **R**evestida (pavimentada). **E**strada = **E**m terra (não pavimentada).
""" + ex(
    "Um motorista para em fila dupla em frente à escola, desliga o carro e fica 15 minutos esperando o filho sair da aula.",
    "Foi parada ou estacionamento?",
    "**Estacionamento.** Parada é a imobilização pelo **tempo estritamente necessário** para embarque ou desembarque. Ficar 15 minutos esperando ultrapassa esse tempo — é estacionamento (e, no caso, irregular).",
    [Q("transito", "O carro fica parado em frente à escola.", [P("cidadao", "esq", "neutro", "neutro"), P("pm", "dir", "aponta", "serio")], (0, "Só estou esperando meu filho...")),
     Q("transito", "15 minutos depois.", [P("pm", "esq", "pega", "serio", "documento"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Isso já é estacionamento."))],
    "Estacionamento | alerta",
    comp("Parada × estacionamento", ("Parada", "Tempo estritamente necessário", "ok", ["Embarque ou desembarque", "Motorista no veículo"]),
         ("Estacionamento", "Tempo superior ao necessário", "alerta", ["Espera prolongada", "Sujeito às regras de estacionamento"]))),
    ["N0046"])
m("Conceitos do Anexo I", 3)

# ---------------------------------------------------------------- 7
sec("explicacao", "Módulo 4 — Normas gerais de circulação e conduta (arts. 26 a 67)", """
| Regra | Artigo | O que diz | Como a banca cobra |
|---|---|---|---|
| Não obstruir o trânsito | Art. 26 | Abster-se de atos que constituam perigo ou obstáculo e de lançar objetos na via | — |
| Verificar o veículo | Art. 27 | Antes de colocar o veículo em circulação, verificar a boa condição de funcionamento e o combustível | — |
| **Domínio do veículo** | Art. 28 | Ter, **a todo momento**, domínio do veículo, dirigindo com atenção e cuidados indispensáveis | — |
| Circulação pela **direita** | Art. 29, I | Admitidas as exceções sinalizadas | — |
| **Distância de segurança** | Art. 29, II | Lateral e frontal, considerando velocidade, condições do local e do clima | — |
| Ultrapassagem pela **esquerda** | Art. 29, IX | **Exceto** quando o veículo a ultrapassar sinalizar que vai **entrar à esquerda** | "Sempre pela esquerda" ❌ |
| Sinalizar manobras | Arts. 34 e 35 | Sinalizar com antecedência e verificar se a manobra é segura | — |
| **Conversão à direita no vermelho** | Art. 44-A (Lei 14.071/2020) | Livre **onde houver sinalização indicativa** que permita | "Livre em qualquer cruzamento" ❌ |
| Estacionar perto da esquina | Art. 181, I | Infração estacionar a menos de **5 m** do bordo do alinhamento da via transversal | — |

📘 **Ultrapassagem — exemplo:** o caminhão da frente liga a seta para a esquerda para entrar numa rua: você **pode** ultrapassá-lo pela **direita**.

⚠️ **Art. 44-A** é novidade da Lei 14.071/2020: sem placa autorizando, o vermelho continua obrigando a parar.
""" + ex(
    "No cruzamento, o semáforo está vermelho e há uma placa indicando que a conversão à direita é permitida. Um motorista converte à direita, com cuidado e dando preferência aos pedestres.",
    "A conduta é regular?",
    "**Sim.** O **art. 44-A** (Lei 14.071/2020) permite a conversão à direita no vermelho **onde houver sinalização indicativa**, respeitadas as preferências (pedestres e veículos). Sem a placa, a conversão seria infração.",
    [Q("transito", "Vermelho com placa autorizando a conversão.", [P("cidadao", "esq", "aponta", "neutro"), P("pm", "dir", "neutro", "neutro")], (0, "Tem placa: posso virar à direita.")),
     Q("transito", "O agente confere a sinalização.", [P("pm", "centro", "fala", "feliz")], (0, "Correto: art. 44-A."))],
    "Conversão permitida | ok",
    fluxo("Posso virar à direita no vermelho?", [("Há placa permitindo a conversão?", "neutro"), ("Sim: converte com cuidado", "ok", "Preferência a pedestres e veículos"), ("Não: para e aguarda o verde", "erro")])),
    ["N0047", "N0048"])
m("Circulação, conduta e sinalização", 4)

# ---------------------------------------------------------------- 8
sec("explicacao", "Luzes, cinto, crianças, motocicletas e pedestres", """
| Tema | Regra | Base |
|---|---|---|
| **Luz baixa de dia** | Obrigatória em **túneis**, sob **chuva, neblina ou cerração** e em **rodovias de pista simples** fora do perímetro urbano (para veículos **sem** luz de rodagem diurna — DRL) | Art. 40, I (Lei 14.071/2020) |
| **Motocicletas** | Farol aceso **dia e noite** (conduzir com os faróis apagados é infração) | Art. 244, IV |
| **Cinto de segurança** | Obrigatório para **condutor e passageiros**, em **todas as vias** | Art. 65 |
| **Crianças no carro** | Menores de **10 anos** que não tenham atingido **1,45 m** de altura: **banco traseiro** e **dispositivo de retenção** adequado | Art. 64 (Lei 14.071/2020) |
| **Criança em moto** | Transportar criança **menor de 10 anos** (ou que não tenha condições de cuidar da própria segurança) é infração **gravíssima** | Art. 244, V (Lei 14.071/2020 — antes, 7 anos) |
| **Capacete** | Condutor e passageiro de moto, com **viseira ou óculos** | Arts. 54 e 55 |
| **Ciclista desmontado** | Empurrando a bicicleta, **equipara-se ao pedestre** | Art. 68, § 1º |
| **Pedestre na rodovia** | Sem passeio, circula pelo **acostamento** ou, se não for possível, pela pista, em **fila única** e em **sentido contrário** ao dos veículos | Art. 68, § 3º |

⚠️ **Dispositivos de retenção:** o tipo (bebê-conforto, cadeirinha, assento de elevação) por idade, peso e altura é definido em **resolução do CONTRAN**. Confira a tabela atual antes da prova — a apostila-base trazia faixas de idade que não batem com todas as versões.

🚨 **PEGADINHAS:** (1) "luz baixa em **qualquer** rodovia de dia" ❌ — a regra é para **pista simples** fora do perímetro urbano; (2) "criança em moto: proibido para menores de **7** anos" ❌ — desde a Lei 14.071/2020, são **10** anos.
""" + ex(
    "Numa rodovia de pista simples, fora da cidade, às 14h, um carro sem luz de rodagem diurna circula com os faróis apagados. Na garupa de uma moto que passa ao lado vai uma criança de 8 anos.",
    "Há infrações?",
    "**Sim, duas.** O carro deveria estar com a **luz baixa acesa** (art. 40, I — rodovia de pista simples fora do perímetro urbano, veículo sem DRL). E transportar criança **menor de 10 anos** em moto é infração **gravíssima** (art. 244, V, com a redação da Lei 14.071/2020).",
    [Q("rodovia", "Carro de farol apagado na rodovia de pista simples.", [P("pm", "esq", "aponta", "serio"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Farol baixo é obrigatório aqui!")),
     Q("rodovia", "Na moto, uma criança de 8 anos.", [P("pm", "esq", "pega", "bravo", "documento"), P("cidadao", "dir", "neutro", "triste")], (0, "Menor de 10 anos não pode na moto."))],
    "Duas infrações | erro",
    comp("O que mudou com a Lei 14.071/2020", ("Antes", "Regras antigas", "neutro", ["Criança em moto: menor de 7 anos", "Luz baixa: rodovias em geral"]),
         ("Depois", "Regras atuais", "ok", ["Criança em moto: menor de 10 anos", "Luz baixa: pista simples, sem DRL", "Retenção até 10 anos e 1,45 m"]))),
    ["N0049"])
m("Circulação, conduta e sinalização", 5)

# ---------------------------------------------------------------- 9
sec("explicacao", "Módulo 5 — Sinalização e ordem de prevalência (art. 89)", """
📜 **Art. 89 — ordem de prevalência:**
1. as **ordens do agente de trânsito** sobre as normas de circulação e outros sinais;
2. as indicações do **semáforo** sobre os demais sinais;
3. as indicações dos **sinais** sobre as demais **normas** de trânsito.

🧠 **MEMORIZE:** **A**gente > **S**emáforo > **S**inais > **N**ormas → "**A Semana Sem Normas**".

📘 **Tipos de sinalização (art. 87):** **vertical** (placas de regulamentação, advertência e indicação), **horizontal** (marcas no pavimento), **dispositivos de sinalização auxiliar**, **luminosa** (semáforos), **sonora** (apitos) e **gestos** do agente e do condutor.

| Situação | Quem prevalece | Por quê |
|---|---|---|
| Semáforo **vermelho**, agente manda **passar** | **Agente** | Art. 89, I |
| Placa de "Pare", semáforo **verde** | **Semáforo** | Art. 89, II |
| Placa de **60 km/h**, norma geral prevê 80 km/h | **Placa** | Art. 89, III: sinal prevalece sobre a norma |

⚠️ **Resolução CONTRAN 1.031/2026** (segundo a apostila-base): atualiza os procedimentos de fiscalização do consumo de álcool (etilômetro, teste passivo, reteste e drogômetro) em substituição à antiga Resolução 432/2013, **sem criar infração nova**. Confira a redação.
""" + ex(
    "O semáforo está verde, mas um agente de trânsito, no meio do cruzamento, faz sinal para o motorista parar.",
    "O motorista deve obedecer a quem?",
    "**Ao agente.** Pelo **art. 89, I**, as ordens do agente prevalecem sobre as normas de circulação e sobre outros sinais — inclusive o semáforo.",
    [Q("transito", "Verde, mas o agente manda parar.", [P("pm", "esq", "aponta", "serio"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Pare!")),
     Q("transito", "O motorista obedece.", [P("cidadao", "centro", "fala", "neutro")], (0, "O agente vale mais que o semáforo."))],
    "Agente prevalece | ok",
    fluxo("Ordem de prevalência (art. 89)", [("1º Agente de trânsito", "ok"), ("2º Semáforo", "neutro"), ("3º Sinais (placas e marcas)", "neutro"), ("4º Normas gerais de circulação", "neutro")])),
    ["N0050", "N0014", "N0015", "N0016", "N0017"])
m("Circulação, conduta e sinalização", 6)

# ---------------------------------------------------------------- 10
sec("quadro_comparativo", "Módulo 6 — Veículos: registro × licenciamento", """
| | **Registro** | **Licenciamento** |
|---|---|---|
| O que é | Inscrição do veículo no órgão executivo de trânsito (gera o **CRV**) | Autorização **anual** para circular (**CRLV**, hoje digital: CRLV-e) |
| Base | Art. 120 | Arts. 130 a 133 |
| Quando | Na aquisição e nas transferências (**30 dias** para transferir — art. 123, § 1º) | **Todo ano**, com a quitação de débitos (tributos, encargos e multas vinculadas) |
| Se não fizer | Deixar de registrar em 30 dias após transferência: infração **grave** (art. 233) | Conduzir veículo não licenciado: infração **gravíssima** + **remoção** do veículo (art. 230, V) |
| Porte do documento | — | Dispensado quando a fiscalização puder consultar o sistema (art. 133, parágrafo único) |

📘 **Classificação dos veículos (art. 96):** quanto à **tração** (automotor, elétrico, de propulsão humana, de tração animal, reboque/semirreboque); quanto à **espécie** (passageiros, carga, misto, competição, tração, especial, coleção); quanto à **categoria** (oficial, representação diplomática, particular, aluguel, aprendizagem).

⚠️ **Recall:** a Lei 14.071/2020 vinculou o licenciamento ao atendimento de campanha de **recall** não atendida há mais de um ano. Confira o dispositivo exato.

🚨 **PEGADINHA:** a apostila-base tratava o art. 233 como gravíssima — o CTB classifica como **grave**.
""" + ex(
    "Bruno comprou um carro usado e, 45 dias depois, ainda não tinha feito a transferência. Além disso, o licenciamento do ano estava vencido. Ele é parado numa blitz.",
    "Quais as consequências?",
    "**Duas infrações:** deixar de registrar a transferência em **30 dias** — **grave** (art. 233); e conduzir veículo **não licenciado** — **gravíssima**, com **remoção** do veículo ao pátio (art. 230, V).",
    [Q("transito", "Blitz: o agente consulta o sistema.", [P("pm", "esq", "pega", "serio", "celular"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Licenciamento vencido.")),
     Q("transito", "O carro vai para o pátio.", [P("pm", "esq", "aponta", "serio"), P("cidadao", "dir", "neutro", "triste")], (0, "Remoção do veículo."))],
    "Grave + gravíssima | erro",
    comp("O que Bruno deixou de fazer", ("Transferência", "Grave (art. 233)", "alerta", ["Prazo de 30 dias", "Gera o novo CRV"]),
         ("Licenciamento", "Gravíssima + remoção", "erro", ["Anual", "CRLV-e", "Art. 230, V"]))),
    ["N0051"])
m("Veículos e habilitação", 7)

# ---------------------------------------------------------------- 11
sec("explicacao", "Módulo 7 — Habilitação: requisitos, exames, validade e categorias", """
📘 **Requisitos (art. 140):** ser **penalmente imputável**, saber **ler e escrever** e possuir **documento de identidade** (e CPF).

📘 **Permissão para Dirigir (art. 148):** o aprovado recebe a **PPD**, válida por **1 ano**. Só recebe a CNH definitiva se, nesse ano, **não cometer infração grave ou gravíssima** nem for **reincidente em infração média**.

📘 **Exames (art. 147):** aptidão física e mental, avaliação psicológica (nos casos previstos), legislação de trânsito e direção veicular.

| Idade | Validade do exame de aptidão física e mental (art. 147, § 2º — Lei 14.071/2020) |
|---|---|
| **Menos de 50 anos** | **10 anos** |
| **50 a 69 anos** | **5 anos** |
| **70 anos ou mais** | **3 anos** |

> O médico perito pode reduzir o prazo se houver indício de deficiência que recomende avaliação antecipada.

| Categoria | Veículos | Requisito para mudar |
|---|---|---|
| **A** | Motocicletas, motonetas, triciclos (2 ou 3 rodas) | — |
| **B** | Veículos com PBT até **3.500 kg** e até **8 lugares** além do motorista | — |
| **C** | Carga com PBT **acima de 3.500 kg** | Estar habilitado há **1 ano na B** |
| **D** | Transporte de passageiros com **mais de 8 lugares** além do motorista | **21 anos** e habilitado há **2 anos na B** ou **1 ano na C** |
| **E** | Combinações em que a unidade acoplada tenha **6.000 kg** ou mais de PBT, ou mais de 8 lugares, ou articulados | **21 anos** e habilitado há **1 ano na C** |

🧠 **MEMORIZE (validade):** **10 / 5 / 3** — antes dos 50, dos 50 aos 69, a partir dos 70.
""" + ex(
    "Mariana, 55 anos, renova a CNH. Ela pergunta se a próxima renovação será em 10 anos.",
    "Qual o prazo de validade do exame dela?",
    "**5 anos.** Pela redação da Lei 14.071/2020 (art. 147, § 2º): menos de 50 anos — 10 anos; de 50 a 69 — **5 anos**; 70 ou mais — 3 anos. O médico ainda pode reduzir o prazo.",
    [Q("reparticao", "Mariana, 55 anos, renova a CNH.", [P("cidadao", "esq", "fala", "feliz"), P("servidor", "dir", "pega", "neutro", "documento")], (0, "Volto daqui a 10 anos?")),
     Q("reparticao", "A servidora do DETRAN explica.", [P("servidor", "centro", "aponta", "feliz")], (0, "Dos 50 aos 69: validade de 5 anos."))],
    "5 anos | ok",
    {"tipo": "linha_tempo", "titulo": "Validade por idade (art. 147, § 2º)", "unidade": "anos", "marcos": [{"em": 18, "rotulo": "Até 49: 10 anos", "estado": "ok"}, {"em": 50, "rotulo": "50 a 69: 5 anos", "estado": "alerta"}, {"em": 70, "rotulo": "70+: 3 anos", "estado": "erro"}]}),
    ["N0052", "N0053", "N0054"])
m("Veículos e habilitação", 8)

# ---------------------------------------------------------------- 12
sec("aprofundamento", "⚠️ Atualizações de 2026 (conferir)", """
> ⚠️ **Conteúdo a conferir.** As normas abaixo são de 2026 e foram trazidas pela apostila-base. A apostila informa que conferiu a **Lei 15.503/2026** no Planalto, mas que o texto da **Lei 15.428/2026** foi reconstruído a partir de **fontes secundárias**, porque a página oficial estava fora do ar. **Antes de usar em prova, confirme a redação oficial.**

| Norma (2026) | O que muda, segundo a apostila-base | Ponto de atenção |
|---|---|---|
| **Lei 15.503/2026** (art. 143, § 2º-A) | Condutor da **categoria B** pode dirigir veículo de propulsão **elétrica** ou **híbrida com tração predominantemente elétrica** com PBT de até **4.250 kg**, observados os critérios do CONTRAN | **Só** elétricos e híbridos de tração predominantemente elétrica; a lotação continua até **8 lugares** além do motorista. Veículo a combustão de 4.100 kg continua exigindo a **C** |
| **Lei 15.428/2026** (art. 159) | CNH **física ou digital**, à escolha do condutor, com fé pública e valor de identidade | Conferir redação |
| **Lei 15.428/2026** (art. 268-A, § 7º) | Condutor do **RNPC** ("bom condutor"), sem infração pontuável em 12 meses, teria **renovação automática** da CNH, **dispensados** os procedimentos do art. 147 **exceto o exame de aptidão física e mental** | O exame médico **continua obrigatório** — não é isenção total |
| **Deliberação CONTRAN 279/2026** | Prorrogação de CNHs vencidas entre 05/06 e 08/12/2026 até **09/12/2026** | Regra temporária |
| **Resolução CONTRAN 1.031/2026** | Novo procedimento de fiscalização de alcoolemia (substitui a Res. 432/2013) | Não cria infração |

🎯 **Como a banca deve cobrar (se cobrar):** o limite de **4.250 kg** vale **só** para elétricos e híbridos de tração predominantemente elétrica — "qualquer veículo até 4.250 kg na categoria B" estaria errado.
""" + ex(
    "Segundo a Lei 15.503/2026 (conferir redação), um condutor da categoria B quer dirigir duas vans de 8 lugares e 4.100 kg de PBT: uma elétrica e outra a diesel.",
    "Ele pode dirigir as duas?",
    "**Só a elétrica**, segundo a apostila-base. O § 2º-A do art. 143 (incluído pela Lei 15.503/2026) amplia o limite da B para **4.250 kg apenas** para veículos **elétricos ou híbridos com tração predominantemente elétrica**. A van a diesel acima de 3.500 kg continua exigindo a **categoria C**. ⚠️ Confira a redação oficial.",
    [Q("rodovia", "Duas vans de 4.100 kg: elétrica e diesel.", [P("cidadao", "esq", "aponta", "neutro"), P("pm", "dir", "neutro", "neutro")], (0, "Com a B, dirijo as duas?")),
     Q("rodovia", "O agente explica a novidade.", [P("pm", "centro", "fala", "serio", "documento")], (0, "B até 4.250 kg só se for elétrica."))],
    "Só a elétrica | alerta",
    comp("Categoria B (segundo a Lei 15.503/2026)", ("Van elétrica 4.100 kg", "Pode com B", "ok", ["Elétrica ou híbrida predominante", "Até 4.250 kg", "Até 8 lugares"]),
         ("Van diesel 4.100 kg", "Exige categoria C", "erro", ["Combustão: limite de 3.500 kg", "Regra geral do art. 143"]))),
    ["N0055"])
m("Veículos e habilitação", 9)

# ---------------------------------------------------------------- 13
sec("quadro_comparativo", "Módulo 8 — O que mudou com a Lei 14.071/2020", """
📘 A **Lei 14.071/2020** alterou dezenas de dispositivos do CTB e entrou em vigor em **12 de abril de 2021**. As mudanças mais cobradas:

| Tema | Antes | Depois (Lei 14.071/2020) |
|---|---|---|
| **Pontuação para suspensão** (art. 261) | 20 pontos em 12 meses, para todos | **20** pontos se houver **2 ou mais gravíssimas**; **30** se houver **1 gravíssima**; **40** se **não houver** gravíssima |
| **Condutor com EAR** (atividade remunerada) | 20 pontos | **40** pontos, independentemente da natureza das infrações; pode fazer **curso preventivo** ao atingir **30** |
| **Validade da CNH** (art. 147, § 2º) | 5 anos (até 65); 3 anos (65+) | **10** anos (até 49); **5** (50 a 69); **3** (70+) |
| **Advertência por escrito** (art. 267) | **Podia** ser aplicada se não houvesse reincidência na mesma infração em 12 meses | **Deve** ser aplicada à infração **leve ou média** se o infrator **não tiver cometido outra infração** nos últimos 12 meses |
| **Indicação do condutor** (art. 257, § 7º) | 15 dias | **30 dias** |
| **Criança em moto** (art. 244, V) | Menor de 7 anos | Menor de **10** anos |
| **Retenção de crianças no carro** (art. 64) | Menores de 10 anos no banco traseiro; dispositivo definido por resolução | Menores de **10 anos** e com menos de **1,45 m**: banco traseiro com dispositivo |
| **Conversão à direita no vermelho** | Proibida | Permitida **onde houver sinalização** (art. 44-A) |
| **Exame toxicológico** | Exigido de condutores **C, D e E** (art. 148-A) | Criada infração para quem dirige sem o exame em dia (art. 165-B) |
| **Crimes com álcool** (art. 312-B) | Substituição por restritiva era possível | **Vedada** a substituição por pena restritiva de direitos nos crimes dos arts. 302, § 3º, e 303, § 2º |

⚠️ **Advertência:** a apostila-base dizia "sem gravíssima em 12 meses"; o texto da Lei 14.071/2020 exige que o infrator **não tenha cometido nenhuma outra infração** nos 12 meses. Confira a redação vigente.
""" + ex(
    "Em 12 meses, Carla (motorista comum) somou 1 gravíssima (7), 2 graves (10) e 1 média (4) = 21 pontos. Diego somou 2 gravíssimas (14) e 2 graves (10) = 24 pontos.",
    "Algum dos dois terá a CNH suspensa por pontos?",
    "**Só Diego.** Carla tem **1 gravíssima**: o limite dela é **30 pontos** — com 21, não suspende. Diego tem **2 gravíssimas**: o limite é **20 pontos** — com 24, suspende (art. 261, I, com a redação da Lei 14.071/2020).",
    [Q("reparticao", "Carla: 21 pontos com 1 gravíssima.", [P("cidadao", "esq", "fala", "feliz"), P("servidor", "dir", "pega", "neutro", "documento")], (1, "Seu limite é 30: não suspende.")),
     Q("reparticao", "Diego: 24 pontos com 2 gravíssimas.", [P("cidadao", "esq", "neutro", "triste"), P("servidor", "dir", "aponta", "serio")], (1, "Seu limite é 20: suspensão."))],
    "Só Diego suspende | erro",
    fluxo("Limite de pontos (art. 261, I)", [("2 ou mais gravíssimas", "erro", "20 pontos"), ("1 gravíssima", "alerta", "30 pontos"), ("Nenhuma gravíssima", "ok", "40 pontos")], ("EAR: 40 pontos sempre", "neutro", "Curso preventivo aos 30"))),
    ["N0056"])
m("Lei 14.071/2020", 10)

json.dump({"S": S, "MOD": MOD}, open("conteudo-catalogo-ctb/p2.json", "w", encoding="utf8"), ensure_ascii=False)
print(len(S))
