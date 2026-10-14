import json
from helpers import *

MOD = {}
def m(title, *idx):
    for i in idx: MOD[i] = title

# ---------------------------------------------------------------- 1
sec("introducao", "Apresentação: o CTB do zero ao avançado", """
**Legislação de Trânsito — Código de Trânsito Brasileiro (CTB, Lei nº 9.503/1997).** Aula completa para carreiras policiais (Polícia Penal, PRF, PC, PM), guardas municipais e demais cargos que cobram trânsito.

**Objetivos — ao final você será capaz de:**
- explicar o conceito legal de **trânsito**, onde o CTB se aplica e a **responsabilidade objetiva** dos órgãos do SNT;
- identificar a **composição do Sistema Nacional de Trânsito** e o papel de cada órgão (normativo, executivo, policiamento, julgador);
- dominar os **conceitos do Anexo I** (via, rodovia × estrada, parada × estacionamento…);
- aplicar as **normas de circulação** e a **ordem de prevalência da sinalização** (art. 89);
- diferenciar **registro** de **licenciamento**, as **categorias da CNH** e a **validade** do exame;
- calcular **pontos**, identificar **penalidades** × **medidas administrativas** e seguir os **prazos do processo**;
- reconhecer os **crimes de trânsito** e suas penas.

**Metodologia:** conceito → fundamentação legal → explicação → exemplo → como a prova cobra → fixação.

**Legenda:** 📜 lei seca • 📘 explicação • 💡 exemplo • 🎯 foco na prova • 🚨 pegadinha • ⚠️ atenção/conferir • 🧠 memorize.

> ⚠️ **Atualizações de 2026.** A apostila-base cita normas de 2026 (Leis 15.428/2026 e 15.503/2026, Resolução CONTRAN 1.031/2026 e Deliberação CONTRAN 279/2026). Elas estão marcadas como **"conferir"**: confirme a redação no Planalto e no site da SENATRAN antes da prova.

> ⚠️ As questões deste tema são **inéditas, elaboradas para estudo** — não são questões oficiais de provas.
""" + ex(
    "Um carro bate em outro dentro do estacionamento de um shopping. O dono do carro atingido diz que \"ali o CTB não vale, porque é área particular\".",
    "O CTB se aplica nesse estacionamento?",
    "**Sim.** O art. 2º, parágrafo único, considera vias terrestres também as **áreas de estacionamento de estabelecimentos privados de uso coletivo**, as **praias abertas à circulação** e as **vias internas de condomínios**.",
    [Q("transito", "Batida no estacionamento do shopping.", [P("cidadao", "esq", "fala", "bravo"), P("cidadao", "centro", "neutro", "surpreso")], (0, "Aqui o CTB não vale!"), "CRASH!"),
     Q("transito", "O agente explica a regra.", [P("pm", "esq", "aponta", "serio", "documento"), P("cidadao", "dir", "neutro", "surpreso")], (0, "Vale sim: art. 2º, parágrafo único."))],
    "CTB se aplica | ok",
    comp("Onde o CTB se aplica", ("Vias terrestres (art. 2º)", "Vale o CTB", "ok", ["Ruas, avenidas, rodovias, estradas", "Praias abertas à circulação", "Vias internas de condomínios", "Estacionamentos privados de uso coletivo"]),
         ("Ponto de atenção", "Garagem de uso exclusivo", "alerta", ["Fora do conceito de via aberta", "Analise o caso concreto"]))),
    ["N0040", "N0041"])
m("Visão geral e lei seca", 1)

# ---------------------------------------------------------------- 2
sec("esquema", "Mapa mental do CTB", """
**CTB (Lei 9.503/1997)** — os 10 blocos que a prova cobra:

| Bloco | Artigos | O que guardar |
|---|---|---|
| **Disposições preliminares** | 1º e 2º | Conceito de trânsito; trânsito seguro é direito de todos; responsabilidade **objetiva**; prioridade à **vida** |
| **SNT** | 5º a 25 | CONTRAN (máximo normativo) → CETRAN/CONTRANDIFE → executivos de trânsito e rodoviários → PRF → PM → JARI |
| **Normas de circulação** | 26 a 67 | Domínio do veículo, ultrapassagem pela **esquerda**, luz baixa, cinto, crianças, motos |
| **Pedestres** | 68 a 71 | Ciclista **desmontado** = pedestre |
| **Sinalização** | 80 a 90 | Prevalência: **Agente > Semáforo > Sinais > Normas** (art. 89) |
| **Veículos** | 96 a 135 | Registro (único) × licenciamento (anual) |
| **Habilitação** | 140 a 160 | Requisitos, exames, validade **10/5/3**, categorias **A a E** |
| **Infrações** | 161 a 255 | Leve 3, média 4, grave 5, gravíssima 7 pontos |
| **Penalidades × medidas** | 256 a 279 | Penalidade só a **autoridade**; medida pela **autoridade ou agente** |
| **Processo** | 280 a 290 | Autuação → notificação → defesa → penalidade → JARI → CETRAN |
| **Crimes** | 291 a 312-B | Homicídio e lesão culposos, embriaguez, racha, fuga, omissão de socorro |

**Fluxograma de uma infração:** conduta → **autuação** (AIT) → **notificação da autuação** (até 30 dias, senão arquiva) → **defesa** → **notificação da penalidade** → **recurso à JARI** → **recurso ao CETRAN/CONTRANDIFE**.

🧠 **MEMORIZE (pontos):** **L**eve **3** · **M**édia **4** · **G**rave **5** · **G**ravíssima **7** → "3-4-5-7".
""", ["N0040", "N0043", "N0046", "N0047", "N0050", "N0051", "N0052", "N0057", "N0060", "N0061", "N0062"])
m("Visão geral e lei seca", 2)

# ---------------------------------------------------------------- 3
LAW = open("conteudo-catalogo-ctb/law.txt", encoding="utf8").read().strip().split("\n")
sec("texto_legal", "📜 Lei seca: artigos-chave do CTB", """
Trechos do **CTB (Lei nº 9.503/1997)** estudados nesta aula, na redação vigente até a data de corte da apostila. No art. 256, o inciso IV (apreensão do veículo) foi **revogado** pela Lei 13.281/2016 e não aparece abaixo.

""" + "\n\n".join(LAW), [f"N{i:04d}" for i in range(1, 40)], "N0001")
m("Visão geral e lei seca", 3)

json.dump({"S": S, "MOD": MOD}, open("conteudo-catalogo-ctb/p1.json", "w", encoding="utf8"), ensure_ascii=False)
print(len(S))
