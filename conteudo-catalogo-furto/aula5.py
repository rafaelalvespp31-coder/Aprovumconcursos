from helpers import *

def peg(n, assunto, nivel, estilo, enunciado, certo, expl, fund, motivo):
    g = "Certo" if certo else "Errado"
    return f"**Pegadinha {n} — {assunto} ({nivel}, estilo {estilo}).** {enunciado}\n→ **{g}.** {expl} Fundamento: {fund}. Por que engana: {motivo}"

P1 = [
    peg(1, "Furto simples", "fácil", "Cebraspe", "O furto admite modalidade culposa quando o agente leva coisa alheia por descuido.", False, "Não existe furto culposo; levar por engano afasta o dolo (erro de tipo).", "art. 155 c/c art. 18, parágrafo único, e art. 20 do CP", "o candidato associa todo crime a uma forma culposa"),
    peg(2, "Furto simples", "fácil", "FGV", "A pena do furto simples, para fatos posteriores à Lei 15.397/2026, é de reclusão de 1 a 6 anos e multa.", True, "A Lei 15.397/2026 elevou o máximo de 4 para 6 anos.", "art. 155, caput, com redação da Lei 15.397/2026", "a pena antiga (1 a 4) ainda aparece em materiais desatualizados"),
    peg(3, "Lei no tempo", "médio", "Vunesp", "Furto simples praticado em março de 2026 deve receber a pena de 1 a 6 anos, pois a lei nova se aplica a todos os processos em curso.", False, "Lei penal mais grave não retroage: o fato de março segue com 1 a 4 anos.", "art. 5º, XL, da CF e art. 2º do CP", "confunde aplicação imediata com retroatividade"),
    peg(4, "Repouso noturno", "fácil", "Cebraspe", "Para incidir o aumento do repouso noturno, é preciso que a vítima esteja dormindo no local.", False, "É irrelevante se a vítima dormia.", "Tema 1.144/STJ", "a palavra 'repouso' sugere sono"),
    peg(5, "Repouso noturno", "médio", "FGV", "Após a Lei 15.397/2026, o furto praticado durante o repouso noturno tem a pena aumentada de metade.", True, "A fração passou de um terço para metade (fatos a partir de 4/5/2026).", "art. 155, § 1º, com redação da Lei 15.397/2026", "a fração de 1/3 é a que mais aparece em livros"),
    peg(6, "Repouso noturno", "médio", "AOCP", "Segundo o STJ, a causa de aumento do repouso noturno incide também no furto qualificado.", False, "O Tema 1.087/STJ afastou a incidência no furto qualificado.", "Tema 1.087/STJ", "entendimento antigo do próprio STJ e precedentes do STF admitiam"),
    peg(7, "Repouso noturno", "difícil", "IBFC", "Furto em via pública, à noite, não pode receber a majorante do repouso noturno, que se limita a residências habitadas.", False, "O Tema 1.144 inclui via pública, comércio e veículo, se houver situação de repouso.", "Tema 1.144/STJ", "doutrina antiga restringia a casas habitadas"),
    peg(8, "Repouso noturno", "difícil", "IBADE", "A lei fixa o período de repouso noturno entre 22h e 6h.", False, "Não há horário fixado em lei; avalia-se o caso concreto.", "Tema 1.144/STJ", "o candidato confunde com horário noturno trabalhista"),
    peg(9, "Privilégio", "fácil", "Cebraspe", "O furto privilegiado exige, cumulativamente, primariedade e pequeno valor da coisa.", True, "São os dois requisitos do § 2º.", "art. 155, § 2º", "bancas trocam 'e' por 'ou'"),
    peg(10, "Privilégio", "médio", "FGV", "Pequeno valor e valor insignificante são expressões sinônimas no furto.", False, "Pequeno valor reduz a pena; valor ínfimo pode afastar a tipicidade material.", "art. 155, § 2º; HC 84.412/SP (STF)", "as duas ideias falam de 'valor baixo'"),
    peg(11, "Privilégio", "médio", "Vunesp", "É possível reconhecer o privilégio no furto qualificado pelo rompimento de obstáculo, se o agente for primário e a coisa de pequeno valor.", True, "Rompimento de obstáculo é qualificadora objetiva.", "Súmula 511/STJ", "parece contraditório 'qualificado-privilegiado'"),
    peg(12, "Privilégio", "difícil", "AOCP", "Pela Súmula 511 do STJ, o privilégio cabe em qualquer furto qualificado, inclusive com abuso de confiança.", False, "A súmula exige qualificadora de ordem objetiva; o abuso de confiança costuma ser apontado como subjetivo.", "Súmula 511/STJ", "o candidato lembra só da primeira parte da súmula"),
    peg(13, "Energia", "fácil", "Cebraspe", "A energia elétrica equipara-se à coisa móvel para fins de furto.", True, "Equiparação expressa da lei.", "art. 155, § 3º", "parece estranho furtar algo imaterial"),
    peg(14, "Energia", "médio", "FGV", "Toda fraude envolvendo medidor de energia configura furto mediante fraude.", False, "O STJ já enquadrou a alteração do medidor com faturamento como estelionato.", "AREsp 1.418.119/DF (STJ)", "a palavra 'fraude' puxa para o § 4º, II"),
    peg(15, "Energia", "difícil", "IBADE", "Segundo a Terceira Seção do STJ, o pagamento do débito antes da denúncia extingue a punibilidade no furto de energia.", False, "O STJ entendeu que não extingue (não se aplica a regra dos crimes tributários) — conferir atualização.", "RHC 101.299/RS (STJ, 2019)", "analogia com os crimes tributários"),
    peg(16, "Energia", "médio", "IBFC", "A ligação clandestina de energia antes do medidor ('gato') pode configurar furto de energia.", True, "Desvio fora da medição, sem participação da vítima.", "art. 155, § 3º", "confusão com estelionato do medidor adulterado"),
]

P2 = [
    peg(17, "Qualificadoras", "fácil", "Cebraspe", "O furto mediante concurso de duas ou mais pessoas é qualificado.", True, "Hipótese do § 4º, IV.", "art. 155, § 4º, IV", "alguns confundem com causa de aumento"),
    peg(18, "Qualificadoras", "médio", "FGV", "No furto qualificado pelo concurso de agentes, aplica-se a majorante do roubo cometido em concurso.", False, "É inadmissível aplicar a majorante do roubo.", "Súmula 442/STJ", "parece proporcional igualar furto e roubo"),
    peg(19, "Qualificadoras", "médio", "Vunesp", "Todo furto praticado por empregado contra o patrão é qualificado pelo abuso de confiança.", False, "Exige confiança especial que facilite a subtração; relação de emprego, sozinha, não basta.", "art. 155, § 4º, II", "a relação de emprego sugere confiança"),
    peg(20, "Qualificadoras", "difícil", "AOCP", "Pular um muro baixo, sem esforço incomum, configura escalada.", False, "Escalada exige via anormal e esforço incomum, provados no caso.", "art. 155, § 4º, II; art. 171 do CPP", "qualquer 'pular muro' parece escalada"),
    peg(21, "Qualificadoras", "médio", "IBFC", "O furto de veículo automotor é qualificado pelo § 5º desde que o agente tenha a intenção de levá-lo para outro Estado.", False, "A corrente majoritária exige o transporte efetivo ('venha a ser transportado').", "art. 155, § 5º", "a intenção parece bastar"),
    peg(22, "Qualificadoras", "difícil", "FGV", "Após a Lei 15.397/2026, a subtração de aparelho celular passou a ter forma qualificada própria, com reclusão de 4 a 10 anos.", True, "Incluída no § 6º, II.", "art. 155, § 6º, II (Lei 15.397/2026)", "novidade legislativa ainda pouco conhecida"),
    peg(23, "Qualificadoras", "médio", "Cebraspe", "O § 4º-A trata do furto de substâncias explosivas.", False, "O § 4º-A trata do emprego de explosivo; o furto de explosivo está no § 7º, I.", "art. 155, §§ 4º-A e 7º", "as duas regras falam de explosivo"),
    peg(24, "Qualificadoras", "difícil", "IBADE", "O § 9º do art. 155 qualifica qualquer furto praticado em área dominada por facção criminosa.", False, "Exige que o autor seja integrante da organização e aja no contexto do art. 2º da Lei 15.358/2026.", "art. 155, § 9º (Lei 15.358/2026)", "o local parece suficiente"),
    peg(25, "Fraude eletrônica", "médio", "FGV", "Se a vítima, enganada por falso funcionário do banco, faz ela mesma a transferência, há furto mediante fraude eletrônica.", False, "A vítima entregou a vantagem induzida em erro: fraude eletrônica (art. 171, § 2º-A).", "art. 155, § 4º-B × art. 171, § 2º-A", "ambos usam meio eletrônico"),
    peg(26, "Fraude eletrônica", "difícil", "Vunesp", "Para fatos posteriores à Lei 15.397/2026, o furto mediante fraude eletrônica tem pena maior que a da fraude eletrônica do art. 171.", True, "§ 4º-B: 4 a 10 anos; art. 171, § 2º-A: 4 a 8 anos.", "Lei 15.397/2026", "antes as duas tinham 4 a 8"),
    peg(27, "Fraude eletrônica", "difícil", "AOCP", "O aumento do § 4º-C, II (vítima idosa ou vulnerável) aplica-se a qualquer furto.", False, "Aplica-se ao furto do § 4º-B.", "art. 155, § 4º-C", "a proteção ao idoso parece geral"),
    peg(28, "Consumação", "fácil", "Cebraspe", "Consuma-se o furto com a posse de fato da coisa, ainda que breve e seguida de perseguição.", True, "Tese do repetitivo.", "Tema 934/STJ", "muitos acham que exige posse tranquila"),
    peg(29, "Consumação", "médio", "FGV", "A recuperação do bem logo após a fuga transforma o furto consumado em tentado.", False, "A recuperação posterior não desfaz a consumação.", "Tema 934/STJ", "o 'final feliz' parece tentativa"),
    peg(30, "Consumação", "médio", "IBFC", "A existência de câmeras e seguranças no supermercado torna o furto crime impossível.", False, "A vigilância, por si só, não torna impossível o furto.", "Súmula 567/STJ", "a vigilância parece impedir o resultado"),
    peg(31, "Consumação", "difícil", "IBADE", "Para o STJ (Inf. 886, 2026), quem é detido ainda dentro da loja, com os produtos na mochila, comete furto tentado.", True, "Houve apprehensio, mas não amotio.", "AgRg no AgRg no AREsp 3.063.890/MS (STJ)", "parece contradizer o Tema 934"),
    peg(32, "Insignificância", "médio", "Cebraspe", "Existe valor monetário fixo, definido em lei, abaixo do qual o furto é insignificante.", False, "Não há valor fixo; aplicam-se os vetores do STF ao caso.", "HC 84.412/SP (STF)", "bancas inventam 'tetos'"),
    peg(33, "Insignificância", "difícil", "FGV", "A reincidência impede, de forma absoluta, a aplicação do princípio da insignificância.", False, "O STF determinou análise caso a caso.", "STF, Plenário, HC 123.108/MG (2015)", "o candidato decora regras absolutas"),
    peg(34, "Arrependimento", "médio", "Vunesp", "A devolução voluntária da coisa furtada, antes do recebimento da denúncia, extingue o crime de furto.", False, "O crime permanece; a pena é reduzida de 1/3 a 2/3.", "art. 16 do CP", "devolver parece 'apagar' o crime"),
]

sec("pegadinhas", "Pegadinhas de concurso (1/2): simples, repouso, privilégio e energia", "\n\n".join(P1), ["N0001", "N0002", "N0003", "N0004", "N0005"])
m("Casos práticos e pegadinhas", 22)
sec("pegadinhas", "Pegadinhas de concurso (2/2): qualificadoras, fraude eletrônica, consumação e insignificância", "\n\n".join(P2),
    ["N0010", "N0008", "N0017", "N0020", "N0012", "N0022", "N0025", "N0013", "N0014", "N0016"])
m("Casos práticos e pegadinhas", 23)

# ============================================================== 24 — Exceções
sec("excecoes", "Exceções e ressalvas: quando não é furto (ou é furto diferente)", """
- **Furto de uso:** uso momentâneo e devolução rápida e integral, sem fim de assenhoramento → em regra, **atípico**.
- **Coisa própria:** não é alheia → não há furto (cuidado com o **art. 346** do CP: tirar coisa própria em poder de terceiro por ordem judicial ou convenção).
- **Coisa abandonada (*res derelicta*) e de ninguém (*res nullius*):** não são alheias → não há furto.
- **Coisa perdida:** quem acha e não devolve em 15 dias responde pelo **art. 169, parágrafo único, II** (apropriação de coisa achada), não por furto.
- **Coisa comum:** condômino, coerdeiro ou sócio que subtrai coisa comum → **art. 156** (furto de coisa comum), com regras próprias (ação por representação; não é punível a subtração de coisa comum fungível cujo valor não exceda a quota do agente).
- **Furto famélico:** pode configurar **estado de necessidade** (art. 24), conforme o caso.
- **Imunidades patrimoniais:** isenção de pena (art. 181 — cônjuge na constância, ascendente, descendente); ação condicionada à representação (art. 182); exceções do art. 183 (violência/grave ameaça, estranho que participa, vítima com 60 anos ou mais).
- **Insignificância:** atipicidade material, conforme os vetores do STF.
- **Erro de tipo:** quem pensa que a coisa é sua não age com dolo (art. 20).
- **Violência ou grave ameaça:** muda o crime para **roubo** (art. 157), inclusive o **roubo impróprio** (§ 1º).
- **Entrega pela vítima enganada:** **estelionato** (art. 171).
- **Posse anterior lícita:** **apropriação indébita** (art. 168).
""", ["N0001", "N0004"])
m("Casos práticos e pegadinhas", 24)

# ============================================================== 25 — Bancas
sec("interpretacao_banca", "Como as bancas cobram furto", """
- **Cebraspe:** itens de certo/errado com **troca de uma palavra** ("ou" × "e" no privilégio; "intenção" × "efetivo transporte" no § 5º; "dormindo" no repouso noturno). Gosta de **súmulas e temas repetitivos** literais.
- **FGV:** **casos narrativos** pedindo o enquadramento (furto × roubo × estelionato × apropriação), com alternativas que diferem pela **fraude** e pela **posse anterior**. Cobra novidades legislativas.
- **Vunesp:** **literalidade** do art. 155 (frações, penas, incisos) e dos dispositivos da Parte Geral ligados (arts. 14, 15, 16).
- **AOCP / IBFC / IBADE:** misturam lei seca e jurisprudência consolidada (Temas 934, 1.087 e 1.144; Súmulas 442, 511 e 567).
- **Tendência 2026:** penas novas da **Lei 15.397/2026** (furto simples 1 a 6; § 1º de metade; § 6º, II celular; § 4º-B 4 a 10), § 9º da Lei Antifacção e §§ 10 a 12 (combustíveis).
- **Armadilha recorrente:** usar a pena **antiga** ou a fração **antiga** (1/3) em questão sobre fato novo — ou aplicar a lei nova a fato antigo.
""", ["N0001", "N0002", "N0003", "N0004", "N0017", "N0020"])
m("Casos práticos e pegadinhas", 25)

# ============================================================== 26 — Glossário
GL = [
    ("Abuso de confiança", "Aproveitamento de confiança especial depositada no agente para facilitar a subtração (§ 4º, II)", "Usar a confiança fora do comum para furtar", "Caseira antiga que tem a chave do cofre", "Achar que toda relação de emprego basta"),
    ("Animus furandi", "Intenção de subtrair para ter a coisa como própria (fim de assenhoramento)", "Querer ficar com a coisa", "Levar o celular para vender", "Confundir com o simples dolo de pegar"),
    ("Assenhoramento", "Fim de ter a coisa para si ou para outrem, de forma definitiva", "Agir como dono", "Esconder a bicicleta em casa", "Achar que usar por minutos e devolver é igual"),
    ("Bem jurídico", "Valor protegido pela norma penal (no furto, o patrimônio)", "O que a lei protege", "Propriedade e posse", "Confundir com objeto material"),
    ("Coisa alheia", "Coisa que pertence a outra pessoa", "Não é sua", "O carro do vizinho", "Incluir coisa abandonada ou perdida"),
    ("Consumação", "Momento em que se reúnem todos os elementos do tipo; no furto, a posse de fato (Tema 934)", "Quando o crime fica completo", "Sair da loja com o produto", "Exigir posse tranquila"),
    ("Dolo", "Consciência e vontade de realizar o tipo", "Querer fazer", "Saber que a coisa é alheia e querer tirá-la", "Achar que existe furto culposo"),
    ("Escalada", "Acesso por via anormal com esforço incomum (§ 4º, II)", "Entrar 'por onde não se entra'", "Subir no telhado com escada", "Achar que qualquer muro é escalada"),
    ("Estelionato", "Obter vantagem ilícita induzindo ou mantendo alguém em erro (art. 171)", "Enganar para a vítima entregar", "Vender produto que não existe", "Confundir com furto mediante fraude"),
    ("Furto privilegiado", "Furto de agente primário e coisa de pequeno valor, com pena reduzida (§ 2º)", "Furto 'mais leve'", "Primário furta objeto barato", "Confundir com insignificância"),
    ("Majorante", "Causa de aumento de pena aplicada em fração (3ª fase)", "Aumento por fração", "Repouso noturno: metade", "Confundir com qualificadora (nova pena-base)"),
    ("Objeto material", "Pessoa ou coisa sobre a qual recai a conduta", "A coisa furtada", "O relógio levado", "Confundir com bem jurídico"),
    ("Patrimônio", "Conjunto de bens e direitos de valor econômico de uma pessoa", "O que a pessoa tem de valor", "Dinheiro, carro, celular", "Incluir bens sem qualquer valor"),
    ("Posse", "Poder de fato sobre a coisa, como se dono fosse", "Estar com a coisa como dono", "Locatário com o carro alugado", "Confundir com propriedade"),
    ("Primariedade", "Condição de quem não é reincidente", "Não reincidente", "Réu sem condenação definitiva anterior que gere reincidência", "Achar que maus antecedentes tiram a primariedade"),
    ("Qualificadora", "Circunstância que cria nova pena-base, mais grave", "Forma mais grave com pena própria", "Rompimento de obstáculo: 2 a 8", "Confundir com causa de aumento"),
    ("Repouso noturno", "Período de recolhimento da população para o descanso noturno, em situação de sossego (Tema 1.144)", "Hora em que todos descansam", "Loja fechada de madrugada em rua deserta", "Exigir que a vítima durma"),
    ("Subtração", "Retirada da coisa da esfera de disponibilidade da vítima, sem consentimento", "Tirar de alguém", "Pegar a mochila da cadeira", "Confundir com receber"),
    ("Sujeito ativo", "Quem pratica o crime (no furto, qualquer pessoa, menos o dono)", "Autor", "Qualquer pessoa", "Incluir o proprietário da coisa"),
    ("Sujeito passivo", "Titular do bem jurídico atingido (proprietário, possuidor)", "Vítima", "Dono do celular furtado", "Excluir o possuidor"),
    ("Tentativa", "Execução iniciada que não se consuma por circunstâncias alheias (art. 14, II)", "Começou e não conseguiu", "Detido dentro da loja com o produto", "Confundir com desistência voluntária"),
    ("Tipicidade", "Adequação da conduta ao tipo: formal (encaixe na lei) e material (lesão relevante)", "Encaixar na lei e ofender de verdade", "Furto de valor ínfimo: típico formal, não material", "Achar que basta o encaixe formal"),
    ("Vigilância", "Esfera de proteção e disponibilidade do titular sobre a coisa", "Ficar de olho no bem", "Objeto ao lado do dono", "Achar que câmeras tornam o furto impossível"),
]
sec("conceitos_fundamentais", "Glossário jurídico do furto", "| Termo | Definição técnica | Em palavras simples | Exemplo | Confusão frequente |\n|---|---|---|---|---|\n" + "\n".join(
    f"| **{t}** | {d} | {s} | {e} | {c} |" for t, d, s, e, c in GL), ["N0001", "N0003", "N0004", "N0006", "N0008"])
m("Revisão final", 26)

# ============================================================== 27 — Flashcards
FC = [
    ("Pena do furto simples (fatos após 4/5/2026)?", "Reclusão de **1 a 6 anos** e multa."),
    ("Fração do repouso noturno (fatos após 4/5/2026)?", "**Metade** (antes: 1/3)."),
    ("Repouso noturno incide no furto qualificado?", "**Não** — Tema 1.087/STJ."),
    ("Requisitos do privilégio?", "**Primário** + **pequeno valor** (cumulativos)."),
    ("Súmula 511/STJ?", "Privilégio no furto qualificado se a qualificadora for **objetiva**."),
    ("Quando se consuma o furto?", "Com a **posse de fato**, ainda que breve e seguida de perseguição (Tema 934)."),
    ("Câmeras tornam o furto impossível?", "**Não** — Súmula 567/STJ."),
    ("Gato × medidor adulterado com faturamento?", "Gato: **furto de energia**; medidor: STJ já enquadrou como **estelionato** (AREsp 1.418.119/DF)."),
    ("Furto mediante fraude × estelionato?", "Fraude para **tirar a vigilância** (furto) × fraude para a **vítima entregar** (estelionato)."),
    ("Pena do § 4º-B (fraude eletrônica)?", "**4 a 10** anos (Lei 15.397/2026)."),
    ("O que o § 6º, II qualifica?", "Furto de **celular, computador** e dispositivos semelhantes (4 a 10)."),
    ("§ 4º-A × § 7º, I?", "4º-A: **com emprego** de explosivo; 7º, I: furto **de** explosivo."),
    ("Súmula 442/STJ?", "Não se aplica ao furto em concurso a **majorante do roubo**."),
    ("Devolver a coisa antes da denúncia?", "**Arrependimento posterior** (art. 16): reduz de 1/3 a 2/3; o crime continua."),
    ("Delegado pode arbitrar fiança no furto simples (fato novo)?", "**Não** — pena máxima de 6 anos (art. 322 do CPP)."),
]
sec("flashcards", "Flashcards de revisão", "\n\n".join(f"**{q}**\n→ {a}" for q, a in FC), ["N0001", "N0002", "N0003", "N0004", "N0013", "N0020"])
m("Revisão final", 27)

# ============================================================== 28 — Resumo
sec("resumo", "Resumo final", """
1. **Furto** = subtrair coisa alheia móvel, com dolo e fim de assenhoramento, sem violência — **1 a 6 anos** (Lei 15.397/2026).
2. **Consuma-se** com a posse de fato (Tema 934); detido dentro da loja → tentativa (Inf. 886, 2026); câmeras não tornam impossível (Súm. 567).
3. **Repouso noturno:** aumento de **metade** (fatos novos), conceito do Tema 1.144, **não** no qualificado (Tema 1.087).
4. **Privilégio:** primário + pequeno valor; cabe no qualificado com qualificadora objetiva (Súm. 511); ≠ insignificância.
5. **Energia** é coisa móvel por equiparação; gato → furto; medidor adulterado com faturamento → estelionato (STJ, 2019).
6. **Qualificadoras** do § 4º (2 a 8): obstáculo · confiança/fraude/escalada/destreza · chave falsa · concurso · bens públicos/serviços essenciais.
7. **Formas de 4 a 10:** explosivo (4º-A) · fraude eletrônica (4º-B, com aumentos do 4º-C) · veículo a outro Estado (5º) · semovente/animal/celular/computador (6º) · explosivos/arma (7º) · facção (9º) · combustíveis (10, com §§ 11 e 12).
8. **§ 8º** (fios e cabos): 2 a 8, com o § 2º aplicável.
9. **Insignificância:** vetores do STF, sem valor fixo, reincidência caso a caso.
10. **Lei mais grave não retroage:** confira sempre a **data do fato**.
""", ["N0001", "N0002", "N0003", "N0004", "N0005", "N0006", "N0012", "N0013", "N0014", "N0017", "N0018", "N0021", "N0024", "N0025", "N0026", "N0027", "N0032"])
m("Revisão final", 28)

# ============================================================== 29 — Checklist
sec("checklist", "Checklist final de completude e pendências", """
- [x] Dispositivos vigentes do art. 155 (caput e §§ 1º a 12), montados a partir das leis alteradoras (Planalto/Câmara, 19/10/2026)
- [x] Penas e frações das Leis 15.181/2025, 15.358/2026, 15.397/2026 e 15.517/2026
- [x] Alterações legislativas e vigência (data de publicação informada nas páginas oficiais)
- [x] Elementos do crime, furto simples e qualificado, repouso noturno, privilégio
- [x] Furto de energia × estelionato (casos A e B)
- [x] Consumação e tentativa (Tema 934; Inf. 886/2026), desistência e arrependimentos
- [x] Insignificância, aspectos processuais, jurisprudência, glossário, questões e gabaritos
- [ ] **Pendente:** conferir a **letra exata** do art. 155 no CP compilado do Planalto (a página não pôde ser lida por inteiro nesta preparação)
- [ ] **Pendente:** acórdão do STJ publicado em 10/3/2026 (registro 202504114410), sobre medidor substituído — **não acessado**; nenhuma tese foi atribuída a ele
- [ ] **Pendente:** conferir nas fontes oficiais os enunciados das Súmulas 442 e 567 e os precedentes citados de memória (HC 84.412/SP, HC 123.108/MG, RHC 101.299/RS)
- [ ] **Pendente:** posição atual do STF sobre repouso noturno no furto qualificado e sobre insignificância
- [ ] **Pendente:** vigência exata da Lei 15.358/2026 (data de publicação no DOU)

**Como estudar este tema:** leia o card **Leia a lei** com atenção às penas novas → faça os cards na ordem → responda às questões dos três níveis → revise com as pegadinhas e os flashcards.
""", ["N0001", "N0025", "N0026"])
m("Revisão final", 29)
