from helpers import *

# ============================================================== 19 — Glossário
G = [
    ("Legalidade", "Só lei em sentido estrito cria crime e comina pena (art. 1º; CF, art. 5º, XXXIX)", "Sem lei, não há crime", "Decreto não cria crime", "Achar que costume pode criar crime"),
    ("Reserva legal", "Matéria penal incriminadora reservada à lei federal", "Quem cria crime é o Congresso", "MP não trata de direito penal (CF, art. 62, § 1º, I, b)", "Confundir com anterioridade"),
    ("Anterioridade", "A lei incriminadora deve ser anterior ao fato", "A regra vem antes da jogada", "Lei de junho não pune fato de maio", "Esquecer que vale também para a pena"),
    ("Analogia in malam partem", "Integração de lacuna contra o réu", "Esticar a lei para prejudicar", "Proibida", "Achar que toda analogia é proibida"),
    ("Interpretação extensiva", "Ampliar o alcance da palavra para atingir o que a lei quis dizer", "A lei disse menos do que queria", "Bigamia abrange poligamia", "Confundir com analogia (não há lacuna)"),
    ("Lei penal em branco", "Preceito incompleto, completado por outra norma", "Falta um pedaço, outra norma preenche", "Lista de drogas da Anvisa", "Confundir homogênea com heterogênea"),
    ("Novatio legis incriminadora", "Lei nova que cria crime", "Passou a ser crime", "Não retroage", "Achar que alcança fatos anteriores"),
    ("Novatio legis in pejus", "Lei nova que agrava a situação", "Piorou", "Não retroage", "—"),
    ("Novatio legis in mellius", "Lei nova que beneficia de qualquer modo", "Melhorou", "Retroage, mesmo após o trânsito", "Achar que a coisa julgada impede"),
    ("Abolitio criminis", "Lei posterior deixa de considerar o fato crime", "Deixou de ser crime", "Adultério (Lei 11.106/2005)", "Achar que apaga efeitos civis"),
    ("Continuidade normativo-típica", "Revoga-se o tipo, mas a conduta continua punida em outro", "Mudou de endereço", "Art. 214 → art. 213", "Confundir com abolitio"),
    ("Ultra-atividade", "Aplicação da lei após revogada aos fatos de sua vigência", "Lei velha ainda vale para o passado", "Lei temporária (art. 3º)", "Confundir com retroatividade"),
    ("Lei intermediária", "Lei que vigorou só entre o fato e o julgamento", "A lei do meio", "Aplica-se se for a mais benéfica", "Achar que nunca se aplica"),
    ("Lex tertia", "Combinação das partes benéficas de duas leis", "Terceira lei criada pelo juiz", "Vedada pelo STF (Tema 169) e STJ (Súm. 501)", "Achar que a doutrina é pacífica"),
    ("Lei temporária", "Vigência com prazo pré-fixado", "Tem data para acabar", "Lei Geral da Copa (tipos até 31/12/2014)", "Confundir com excepcional"),
    ("Lei excepcional", "Vigora enquanto durar situação anormal", "Acaba quando a crise acaba", "Lei de calamidade", "Confundir com temporária"),
    ("Teoria da atividade", "Tempo do crime = momento da conduta", "Vale a hora do tiro", "Art. 4º", "Usar para o lugar do crime"),
    ("Teoria da ubiquidade", "Lugar do crime = conduta ou resultado", "Vale onde agiu ou onde aconteceu o resultado", "Art. 6º", "Usar para o tempo do crime"),
    ("Territorialidade temperada", "Lei brasileira no território, salvo tratados", "Regra com exceções internacionais", "Imunidade diplomática", "Achar que embaixada é território estrangeiro"),
    ("Extraterritorialidade", "Lei brasileira aplicada a crime fora do território", "O Brasil julga crime lá de fora", "Art. 7º", "Exigir condições do § 2º no inciso I"),
    ("Dupla tipicidade", "Fato punível também no país onde foi praticado", "Tem de ser crime lá e cá", "Art. 7º, § 2º, b", "Exigir no inciso I"),
    ("Homologação", "Reconhecimento de sentença estrangeira pelo STJ", "Dar validade aqui à decisão de fora", "Art. 9º; CF, art. 105, I, i", "Dizer que é do STF"),
]
sec("conceitos_fundamentais", "Glossário da aplicação da lei penal", "| Termo | Definição técnica | Em palavras simples | Exemplo | Confusão frequente |\n|---|---|---|---|---|\n" + "\n".join(
    f"| **{a}** | {b} | {c} | {d} | {e} |" for a, b, c, d, e in G),
    ["N0001", "N0002", "N0003", "N0004", "N0005", "N0006", "N0009", "N0010", "N0021", "N0023", "N0031"])
m("Glossário", 19)

# ============================================================== 20 — Quadro comparativo
sec("quadro_comparativo", "Quadro comparativo: sucessão de leis, teorias e regimes de extraterritorialidade", """
| Instituto | Regra | Retroage / se aplica? | Base | Pegadinha típica |
|---|---|---|---|---|
| **Novatio legis incriminadora** | Cria crime | **Não** retroage | Art. 1º; CF, 5º, XL | "Alcança fatos anteriores" |
| **Novatio legis in pejus** | Agrava | **Não** retroage | CF, 5º, XL | "Aplica-se ao processo em curso" |
| **Novatio legis in mellius** | Beneficia | **Retroage** (até após o trânsito) | Art. 2º, p. ú. | "Salvo coisa julgada" |
| **Abolitio criminis** | Descriminaliza | **Retroage**; extingue a punibilidade | Art. 2º, caput; art. 107, III | "Apaga efeitos civis" |
| **Continuidade normativo-típica** | Conduta migra para outro tipo | Aplica-se a lei mais benéfica entre as duas | Construção jurisprudencial | "Houve abolitio" |
| **Lei temporária/excepcional** | Vigência limitada | **Ultra-ativa** aos fatos da vigência | Art. 3º | "Fim da vigência = abolitio" |
| **Tempo do crime** | Atividade | Momento da conduta | Art. 4º | "Data do resultado" |
| **Lugar do crime** | Ubiquidade | Conduta **ou** resultado | Art. 6º | "Só onde houve a conduta" |
| **Extraterritorialidade incondicionada** | Art. 7º, I | Sem condições; vale mesmo com absolvição lá | Art. 7º, § 1º | "Exige entrada no Brasil" |
| **Extraterritorialidade condicionada** | Art. 7º, II | 5 condições cumulativas | Art. 7º, § 2º | "Basta entrar no Brasil" |
| **§ 3º (estrangeiro × brasileiro)** | Fora do Brasil | 5 condições + extradição não pedida/negada + requisição do MJ | Art. 7º, § 3º | "Dispensa requisição" |
| **Pena cumprida no estrangeiro** | Art. 8º | Idênticas: computa · diversas: atenua | Art. 8º | "Diversas: computa" |
| **Sentença estrangeira** | Art. 9º | Homologação (STJ): efeitos civis ou medida de segurança | Art. 9º; CF, 105, I, i | "Serve para executar prisão" |
| **Prazo penal** | Art. 10 | Inclui o dia do começo; não prorroga | Art. 10 | "Exclui o 1º dia" |
| **Frações** | Art. 11 | Desprezam-se frações de dia | Art. 11 | "Arredonda para cima" |
| **Leis especiais** | Art. 12 | CP subsidiário, salvo disposição diversa | Art. 12 | "CP sempre prevalece" |
""", ["N0002", "N0003", "N0004", "N0005", "N0009", "N0011", "N0016", "N0020", "N0021", "N0027", "N0030", "N0031", "N0037", "N0038", "N0039"])
m("Comparações e quadros", 20)

# ============================================================== 21 — Comparações
sec("comparacao", "Comparações que derrubam candidatos: tempo × lugar, art. 7º × art. 8º e prazo penal × processual", """
| Comparação | Lado A | Lado B | Como distinguir |
|---|---|---|---|
| **Tempo × lugar do crime** | Tempo: **atividade** (art. 4º) | Lugar: **ubiquidade** (art. 6º) | **LUTA**: Lugar-Ubiquidade, Tempo-Atividade |
| **Lugar do crime (CP) × competência (CPP)** | CP, art. 6º: **se** a lei brasileira incide | CPP, art. 70: **qual juízo** julga (consumação) | CP = lei aplicável; CPP = foro |
| **Abolitio × continuidade normativo-típica** | Conduta deixa de ser crime | Conduta continua crime em outro tipo | A conduta migrou? |
| **Retroatividade × ultra-atividade** | Lei nova alcança o passado | Lei velha continua valendo após revogada | Para onde a lei "viaja" no tempo? |
| **Lei temporária × excepcional** | Prazo fixo no texto | Dura enquanto dura a situação | Data certa × circunstância |
| **Incondicionada × condicionada** | Art. 7º, I: sem condições | Art. 7º, II: 5 condições do § 2º | Qual inciso? |
| **Art. 7º, § 1º × art. 8º** | Permite novo julgamento no Brasil | Desconta ou atenua a pena | Pode julgar? × Quanto resta? |
| **Penas idênticas × diversas (art. 8º)** | **Computa** (desconta) | **Atenua** (reduz) | Mesma natureza? |
| **Prazo penal × processual** | Inclui o 1º dia; não prorroga | Exclui o 1º dia; prorroga para dia útil | Afeta o direito de punir? |
| **Analogia × interpretação extensiva** | Integra lacuna | Interpreta o que a lei já abrange | Há lacuna? |
| **Embarcação pública × privada brasileira** | Extensão do território **onde quer que esteja** | Só em **alto-mar** | Pública/a serviço do governo? |

### Exemplos rápidos
- Tiro em 30/12 (agente com 17 anos), morte em 05/01 (agente com 18) → **atividade**: inimputável.
- Conduta no Uruguai, resultado no Brasil → **ubiquidade**: crime praticado no Brasil.
- Brasileiro absolvido no exterior por crime contra o patrimônio da União → **pode** ser julgado no Brasil (art. 7º, I, "b", e § 1º).
- Brasileiro absolvido no exterior por furto comum → **não** pode (art. 7º, II, "b", e § 2º, "d").
""" + ex(
    "Dois brasileiros cometem crimes no exterior e são absolvidos lá. Ana desviou bens de uma empresa pública federal brasileira; Beto furtou a bolsa de uma turista.",
    "A absolvição estrangeira tem o mesmo efeito para os dois?",
    "**Não.** Ana: crime contra o patrimônio de **empresa pública** → **art. 7º, I, \"b\"** → extraterritorialidade **incondicionada**; pelo **§ 1º**, ela pode ser punida no Brasil **ainda que absolvida** lá. Beto: crime praticado **por brasileiro** → **art. 7º, II, \"b\"** → **condicionada**; a absolvição no estrangeiro **impede** a aplicação da lei brasileira (§ 2º, \"d\").",
    [Q("forum", "Ana: crime contra empresa pública federal.", [P("promotor", "esq", "aponta", "serio", "documento"), P("investigado", "dir", "neutro", "triste")], (0, "Inciso I: incondicionada.")),
     Q("forum", "Beto: furto comum no exterior.", [P("advogado", "esq", "fala", "feliz", "documento"), P("juiz", "dir", "neutro", "serio")], (0, "Absolvido lá: § 2º, d."))],
    "Inciso I × inciso II | alerta",
    comp("Absolvição no estrangeiro", ("Art. 7º, I (Ana)", "Não impede", "erro", ["Incondicionada", "§ 1º", "Pode ser julgada aqui"]),
         ("Art. 7º, II (Beto)", "Impede", "ok", ["Condicionada", "§ 2º, alínea d", "Lei brasileira não incide"]))),
    ["N0005", "N0009", "N0013", "N0018", "N0020", "N0025", "N0030", "N0037"])
m("Comparações e quadros", 21)

# ============================================================== 22 — Exemplos
sec("exemplos", "Casos práticos: qual regra resolve?", """
**Caso 1 — Lei nova mais grave no meio do processo.** Fato em 15/02/2026; lei mais grave em vigor em 01/04/2026; sentença em 10/09/2026.
→ Aplica-se a lei **de 15/02/2026** (mais benéfica, ultra-ativa). A lei mais grave **não retroage** (CF, art. 5º, XL).

**Caso 2 — Redução de pena após o trânsito.** Condenado definitivamente em 2025; em 2026, lei reduz a pena do crime.
→ A lei nova **retroage** (art. 2º, p. ú.), aplicada pelo **juízo da execução** (Súmula 611/STF).

**Caso 3 — Revogação com migração.** Lei revoga o artigo X e, no mesmo ato, descreve a mesma conduta no artigo Y, com pena menor.
→ **Continuidade normativo-típica**: não há abolitio; aplica-se a **pena menor** (lei mais benéfica).

**Caso 4 — Lei temporária vencida.** Crime praticado em 2014 sob tipo da Lei Geral da Copa (vigente até 31/12/2014), julgado em 2016.
→ **Ultra-atividade** (art. 3º): aplica-se a lei temporária.

**Caso 5 — Idade.** Agente com 17 anos esfaqueia a vítima; ela morre 40 dias depois, quando ele já tem 18.
→ **Inimputável** (art. 4º, atividade; CP, art. 27; ECA, art. 104, p. ú.).

**Caso 6 — Navio mercante brasileiro em alto-mar.** Homicídio a bordo.
→ **Lei brasileira** (art. 5º, § 1º: extensão do território).

**Caso 7 — Avião estrangeiro privado pousado em Guarulhos.** Furto a bordo.
→ **Lei brasileira** (art. 5º, § 2º).

**Caso 8 — Brasileiro comete fato lícito no país estrangeiro.** Ele retorna ao Brasil, onde o fato é crime.
→ **Não** se aplica a lei brasileira: falta a **dupla tipicidade** (art. 7º, II, "b", e § 2º, "b").

**Caso 9 — Estrangeiro mata brasileiro no exterior.** Ele entra no Brasil; extradição não pedida; há requisição do Ministro da Justiça; fato punível lá; não houve julgamento nem extinção da punibilidade.
→ **Lei brasileira aplicável** (art. 7º, § 3º, com as condições do § 2º).

**Caso 10 — Prazo de decadência.** Conhecimento da autoria em 01/03/2026.
→ Último dia: **31/08/2026** (inclui o dia do começo; calendário comum — art. 10).

**Caso 11 — Contravenção tentada.** Agente tenta praticar contravenção e é impedido.
→ **Não é punível** (LCP, art. 4º; art. 12 do CP: disposição diversa).

**Caso 12 — Sentença estrangeira e reincidência.** Condenado definitivamente na Argentina; comete crime no Brasil.
→ É **reincidente** (art. 63 do CP), **sem** necessidade de homologação.
""" + ex(
    "Em 01/03/2026, Joana descobre que Rui a difamou (crime de ação penal privada). Ela quer saber até quando pode oferecer a queixa.",
    "Qual o último dia do prazo decadencial de 6 meses?",
    "**31/08/2026.** O prazo decadencial é **penal** (art. 103 do CP) e segue o **art. 10**: inclui-se o dia do começo (01/03) e contam-se os meses pelo calendário comum, de data a data. Seis meses a partir de 01/03, incluído o primeiro dia, terminam em 31/08. Não há prorrogação se o último dia cair em fim de semana.",
    [Q("casa", "01/03: Joana descobre a difamação.", [P("vitima", "centro", "pega", "bravo", "celular")]),
     Q("forum", "A advogada conta o prazo.", [P("advogado", "esq", "aponta", "serio", "documento"), P("vitima", "dir", "neutro", "neutro")], (0, "Inclui o dia 1º: vence em 31/08."))],
    "Art. 10: inclui o 1º dia | ok",
    linha("Decadência de Joana", "meses", [(0, "01/03: conhecimento", "neutro"), (6, "31/08: último dia", "alerta")])),
    ["N0002", "N0003", "N0004", "N0005", "N0007", "N0008", "N0018", "N0023", "N0027", "N0037", "N0039"])
m("Casos práticos", 22)

# ============================================================== 23 — Aplicação
sec("aplicacao", "Casos comentados com linha do tempo: sucessão de leis, permanência e extraterritorialidade", """
**Aplicação 1 — Lei mista.** Lei nova reduz a pena do crime, mas cria regime inicial obrigatoriamente fechado.
→ O juiz compara **as duas leis aplicadas por inteiro** ao caso e escolhe a mais favorável; não pode pegar a pena da nova e o regime da antiga (vedação da *lex tertia*, na linha do Tema 169/STF e da Súmula 501/STJ).

**Aplicação 2 — Crime continuado atravessando lei mais grave.** Três furtos em continuidade (março, abril e junho); lei mais grave em vigor em maio.
→ **Súmula 711/STF**: a lei mais grave se aplica ao crime continuado, pois entrou em vigor **antes** de cessar a continuidade.

**Aplicação 3 — Crime instantâneo de efeitos permanentes.** Homicídio em 10/04; lei mais grave em 20/04; a vítima morre em 25/04.
→ Aplica-se a lei de **10/04** (atividade). Homicídio não é crime permanente: a Súmula 711 **não** se aplica.

**Aplicação 4 — Funcionário público no exterior.** Diplomata brasileiro exige vantagem indevida no exterior, em razão da função.
→ **Art. 7º, I, "c"** (crime contra a administração pública por quem está a seu serviço): **incondicionada**.

**Aplicação 5 — Navio brasileiro privado em porto estrangeiro.** Lesão corporal a bordo; o país local não processa.
→ **Art. 7º, II, "c"**: condicionada — exige as cinco condições do § 2º.

**Aplicação 6 — Pena cumprida lá fora, crime do inciso I.** 18 meses cumpridos no exterior; condenação de 4 anos no Brasil.
→ **Penas idênticas**: computa-se → restam **2 anos e 6 meses** (art. 8º).

**Aplicação 7 — Prazo processual × penal no mesmo caso.** O réu é intimado da sentença numa quarta-feira, 18/03/2026, e tem 5 dias para apelar.
→ Prazo **processual** (CPP, art. 798, § 1º): exclui-se o dia 18 → conta de 19 a 23/03; como 23/03 é segunda-feira (dia útil), vence em **23/03/2026**.

**Aplicação 8 — Lei especial silente.** Crime de lei especial sem regra sobre prescrição.
→ Aplicam-se as regras de prescrição do **CP** (art. 12).
""" + ex(
    "Uma quadrilha mantém uma vítima em cárcere privado de 10/03 a 25/03/2026. Em 18/03/2026 entra em vigor lei que aumenta a pena do crime. A defesa alega que a lei mais grave não pode retroagir.",
    "A defesa tem razão?",
    "**Não.** O sequestro e cárcere privado (art. 148) é **crime permanente**: a conduta se prolongou até 25/03. A lei mais grave entrou em vigor **antes de cessar a permanência**, então se aplica a todo o crime — **Súmula 711 do STF**. Não há retroatividade: a lei nova alcança uma conduta que **ainda acontecia** na sua vigência.",
    [Q("casa", "10/03: a vítima é mantida em cárcere.", [P("investigado", "esq", "aponta", "bravo"), P("vitima", "dir", "neutro", "triste")]),
     Q("forum", "O juiz rejeita a tese da defesa.", [P("advogado", "esq", "fala", "serio", "documento"), P("juiz", "dir", "fala", "serio")], (1, "Crime permanente: Súmula 711."))],
    "Permanência + lei nova | alerta",
    linha("Cárcere privado e lei nova", "dias", [(0, "10/03: início", "alerta"), (8, "18/03: lei mais grave", "erro"), (15, "25/03: libertação", "ok")])),
    ["N0003", "N0005", "N0014", "N0019", "N0021", "N0030", "N0037", "N0039"])
m("Casos práticos", 23)

# ============================================================== 24 — Pegadinhas (certo/errado)
PG = [
    ("Legalidade (fácil)", "Medida provisória pode definir crimes, desde que convertida em lei pelo Congresso no prazo constitucional.", False, "A CF veda medida provisória sobre direito penal (art. 62, § 1º, I, \"b\"). A conversão posterior não convalida a criação de crime por MP."),
    ("Analogia (fácil)", "A analogia in bonam partem é admitida no Direito Penal; vedada é a analogia in malam partem.", True, "A vedação decorre da reserva legal e protege o réu; a analogia favorável é aceita pela doutrina majoritária."),
    ("Lei penal em branco (médio)", "Na lei penal em branco heterogênea, o complemento é dado por norma de hierarquia diversa, como uma portaria.", True, "Ex.: lista de drogas da Anvisa (Portaria SVS/MS 344/1998), que complementa a Lei 11.343/2006."),
    ("Retroatividade (fácil)", "A lei posterior mais benéfica não se aplica a fatos já decididos por sentença condenatória transitada em julgado.", False, "Art. 2º, parágrafo único: aplica-se \"ainda que decididos por sentença condenatória transitada em julgado\"."),
    ("Abolitio criminis (médio)", "A abolitio criminis faz cessar a execução da pena e todos os efeitos da condenação, inclusive a obrigação de reparar o dano.", False, "Cessam os efeitos penais; os efeitos civis, como a obrigação de indenizar, permanecem."),
    ("Continuidade normativo-típica (difícil)", "A revogação formal de um tipo penal sempre implica abolitio criminis.", False, "Se a conduta continua punida em outro dispositivo, há continuidade normativo-típica, não abolitio."),
    ("Lei intermediária (difícil)", "A lei penal intermediária mais benéfica pode ser aplicada, ainda que não estivesse em vigor nem na data do fato nem na data da sentença.", True, "Posição majoritária: ela é retroativa em relação ao fato e ultra-ativa em relação à sentença."),
    ("Combinação de leis (difícil)", "Segundo o STF (Tema 169) e o STJ (Súmula 501), é possível aplicar a causa de diminuição da Lei 11.343/2006 à pena da Lei 6.368/1976.", False, "Os tribunais vedam a combinação: aplica-se, por inteiro, a lei mais favorável."),
    ("Lei temporária (fácil)", "Encerrada a vigência de uma lei temporária, ocorre abolitio criminis quanto aos fatos praticados durante sua vigência.", False, "Art. 3º: a lei temporária é ultra-ativa e continua alcançando os fatos praticados durante sua vigência."),
    ("Lei excepcional (médio)", "A lei excepcional vigora enquanto perdurarem as circunstâncias que a determinaram.", True, "É a diferença para a lei temporária, cuja vigência tem prazo pré-fixado."),
    ("Tempo do crime (fácil)", "O Código Penal adota a teoria do resultado para definir o tempo do crime.", False, "Art. 4º: teoria da atividade (momento da ação ou omissão)."),
    ("Idade do agente (médio)", "Se o agente, com 17 anos, pratica a conduta e o resultado ocorre quando ele já tem 18 anos, responde como imputável.", False, "Considera-se o momento da conduta (art. 4º; ECA, art. 104, p. ú.): ele é inimputável."),
    ("Súmula 711 (médio)", "A lei penal mais grave aplica-se ao crime permanente se sua vigência for anterior à cessação da permanência.", True, "Literalidade da Súmula 711 do STF."),
    ("Súmula 711 (difícil)", "Pela Súmula 711 do STF, a lei mais grave que entra em vigor entre a conduta e o resultado de um homicídio aplica-se ao crime.", False, "Homicídio é crime instantâneo (de efeitos permanentes), não permanente; vale a lei da data da conduta."),
    ("Territorialidade (médio)", "As embarcações brasileiras privadas são consideradas extensão do território nacional onde quer que se encontrem.", False, "\"Onde quer que se encontrem\" vale para as públicas ou a serviço do governo; as privadas, só em alto-mar."),
    ("Embaixadas (médio)", "A sede de embaixada estrangeira no Brasil é território estrangeiro para fins penais.", False, "A sede é inviolável, mas continua sendo território brasileiro; o que há são imunidades de pessoas."),
    ("Lugar do crime (fácil)", "Considera-se praticado o crime tanto no lugar da ação ou omissão quanto onde se produziu ou deveria produzir-se o resultado.", True, "Art. 6º: teoria da ubiquidade."),
    ("Lugar × competência (difícil)", "A teoria da ubiquidade do art. 6º do CP é a mesma regra usada pelo CPP para fixar a competência territorial.", False, "O CPP (art. 70) fixa a competência, em regra, pelo lugar da consumação; o art. 6º do CP define se a lei brasileira incide."),
    ("Incondicionada (médio)", "Nos crimes do art. 7º, I, do CP, o agente é punido pela lei brasileira ainda que absolvido no estrangeiro.", True, "Art. 7º, § 1º."),
    ("Condições do § 2º (difícil)", "As condições do art. 7º, § 2º, do CP aplicam-se a todas as hipóteses de extraterritorialidade.", False, "Aplicam-se ao inciso II e, por remissão, ao § 3º; não ao inciso I (incondicionado)."),
    ("§ 3º (difícil)", "Para aplicar a lei brasileira ao crime de estrangeiro contra brasileiro no exterior, exige-se, além das condições do § 2º, que a extradição não tenha sido pedida ou tenha sido negada e que haja requisição do Ministro da Justiça.", True, "Art. 7º, § 3º, alíneas \"a\" e \"b\"."),
    ("Pena no estrangeiro (médio)", "A pena cumprida no estrangeiro é computada na pena imposta no Brasil quando diversas, e a atenua quando idênticas.", False, "É o inverso: atenua quando diversas e é computada quando idênticas (art. 8º)."),
    ("Sentença estrangeira (médio)", "A homologação de sentença estrangeira para efeitos civis depende de pedido da parte interessada e compete ao STJ.", True, "Art. 9º, p. ú., \"a\"; CF, art. 105, I, \"i\"."),
    ("Prazo penal (fácil)", "No cômputo dos prazos penais, exclui-se o dia do começo e inclui-se o do vencimento.", False, "Essa é a regra processual (CPP, art. 798, § 1º). No CP, inclui-se o dia do começo (art. 10)."),
    ("Frações (fácil)", "Nas penas privativas de liberdade, as frações de dia são desprezadas.", True, "Art. 11 do CP."),
    ("Art. 12 (médio)", "As regras gerais do Código Penal sempre prevalecem sobre a legislação especial.", False, "Aplicam-se às leis especiais se estas não dispuserem de modo diverso (art. 12)."),
]
sec("pegadinhas", "Pegadinhas para julgar: certo ou errado?", "\n\n".join(
    f"**Pegadinha {i} — {t}.** {s}\n→ **{'Certo' if v else 'Errado'}.** {j}" for i, (t, s, v, j) in enumerate(PG, 1)),
    ["N0001", "N0002", "N0003", "N0004", "N0005", "N0007", "N0009", "N0020", "N0021", "N0027", "N0030", "N0034", "N0037", "N0038", "N0039"])
m("Pegadinhas", 24)

# ============================================================== 25 — Como as bancas cobram
sec("interpretacao_banca", "Como as bancas cobram aplicação da lei penal (e as armadilhas recorrentes)", """
**O que mais cai, por assunto**
- **Legalidade:** reserva legal × MP; analogia contra/a favor do réu; lei penal em branco e retroatividade do complemento.
- **Lei no tempo:** casos com **datas** (fato, lei nova, sentença); "de qualquer modo favorecer"; trânsito em julgado; abolitio × continuidade normativo-típica; lei intermediária; combinação de leis.
- **Art. 3º:** "fim da vigência = abolitio?" (não).
- **Tempo do crime:** idade do agente; crimes permanentes e continuados (Súmula 711).
- **Territorialidade:** tabela de navios e aeronaves (pública × privada; brasileira × estrangeira; alto-mar × porto).
- **Lugar do crime:** ubiquidade × competência do CPP; crimes à distância.
- **Extraterritorialidade:** enquadrar a hipótese no inciso certo; as **cinco** condições do § 2º; os **dois** requisitos extras do § 3º.
- **Arts. 8º a 12:** idênticas × diversas; homologação pelo STJ; prazo penal × processual; frações; art. 12.

**Estilos de cobrança**
- **Certo/errado:** troca de uma palavra-chave ("computa" × "atenua"; "inclui" × "exclui"; "atividade" × "ubiquidade"; "pública" × "privada").
- **Múltipla escolha com caso:** datas e locais para o candidato montar a linha do tempo ou o mapa.
- **Lei seca:** alíneas do art. 7º, I e II, e do § 2º.

**Armadilhas recorrentes — com a técnica para escapar**
1. **Trocar teorias** (tempo/lugar) → use **LUTA**.
2. **Esquecer o "ainda que transitada em julgado"** → a lei benéfica retroage sempre.
3. **Abolitio apagando efeitos civis** → só os **penais** cessam.
4. **Revogação = abolitio** → verifique se a conduta **migrou**.
5. **Fim da lei temporária = impunidade** → art. 3º: ultra-atividade.
6. **Súmula 711 para crime instantâneo** → só **permanente** ou **continuado**.
7. **"Onde quer que se encontrem" para navio privado** → só para **públicos/a serviço do governo**.
8. **Condições do § 2º no inciso I** → o inciso I é **incondicionado**.
9. **Faltar o Ministro da Justiça no § 3º** → requisição é obrigatória.
10. **Inverter o art. 8º** → **I**dênticas → **C**omputa (IC); **D**iversas → **A**tenua (DA).
11. **Prazo penal excluindo o 1º dia** → no CP, o dia do começo **conta**.
12. **"CP sempre prevalece"** → art. 12: **salvo** disposição diversa.

⚠️ As tendências acima são observações gerais de estilo de cobrança, **não** regras oficiais das bancas. As questões desta aula são **autorais** e não reproduzem provas reais.
""", ["N0001", "N0002", "N0004", "N0005", "N0007", "N0009", "N0011", "N0021", "N0027", "N0030", "N0037", "N0039"])
m("Pegadinhas", 25)

# ============================================================== 26 — Flashcards
FC = [
    ("O que diz o art. 1º do CP?", "Não há crime sem lei anterior que o defina; não há pena sem prévia cominação legal."),
    ("Quais as quatro garantias da legalidade?", "Lex praevia, lex scripta, lex stricta e lex certa."),
    ("Analogia é admitida no Direito Penal?", "Só in bonam partem (a favor do réu)."),
    ("O que é lei penal em branco heterogênea?", "Complemento em norma de fonte diversa (ex.: portaria da Anvisa)."),
    ("Lei mais benéfica retroage após o trânsito?", "Sim (art. 2º, p. ú.), aplicada pelo juízo da execução (Súm. 611/STF)."),
    ("Abolitio criminis apaga efeitos civis?", "Não; cessam a execução e os efeitos penais."),
    ("O que é continuidade normativo-típica?", "Revogação do tipo com migração da conduta para outro: não há abolitio."),
    ("Lei intermediária mais benéfica se aplica?", "Sim, pela posição majoritária."),
    ("Pode combinar leis (lex tertia)?", "Os tribunais superiores vedam (Tema 169/STF; Súm. 501/STJ)."),
    ("O que é ultra-atividade?", "Aplicação da lei revogada aos fatos de sua vigência."),
    ("Lei temporária × excepcional?", "Temporária: prazo fixo. Excepcional: dura enquanto dura a situação."),
    ("Teoria do tempo do crime?", "Atividade (art. 4º)."),
    ("Teoria do lugar do crime?", "Ubiquidade (art. 6º)."),
    ("O que diz a Súmula 711/STF?", "Lei mais grave aplica-se ao crime continuado ou permanente se vigente antes de cessar a continuidade/permanência."),
    ("Navio brasileiro privado é território nacional?", "Só em alto-mar (art. 5º, § 1º)."),
    ("Avião estrangeiro privado sobre o Brasil?", "Lei brasileira (art. 5º, § 2º)."),
    ("Hipóteses do art. 7º, I?", "Presidente (vida/liberdade); patrimônio/fé pública de entes públicos; administração pública por quem a serve; genocídio por brasileiro ou domiciliado."),
    ("Hipóteses do art. 7º, II?", "Tratado/convenção; praticado por brasileiro; aeronave/embarcação brasileira privada no estrangeiro e lá não julgado."),
    ("Quais as 5 condições do § 2º?", "Entrar no Brasil; dupla tipicidade; crime extraditável; não absolvido nem cumprida a pena lá; não perdoado nem extinta a punibilidade."),
    ("Requisitos extras do § 3º?", "Extradição não pedida ou negada + requisição do Ministro da Justiça."),
    ("Art. 8º: idênticas × diversas?", "Idênticas: computa. Diversas: atenua."),
    ("Quem homologa sentença estrangeira?", "O STJ (CF, art. 105, I, i)."),
    ("Prazo penal inclui o dia do começo?", "Sim (art. 10). O processual exclui (CPP, art. 798, § 1º)."),
    ("Frações de dia na pena privativa?", "Desprezam-se (art. 11)."),
    ("O CP vale para as leis especiais?", "Sim, salvo disposição diversa (art. 12)."),
]
sec("flashcards", "Flashcards de revisão", "\n\n".join(f"**{q}**\n→ {a}" for q, a in FC),
    ["N0001", "N0002", "N0003", "N0004", "N0005", "N0007", "N0008", "N0009", "N0011", "N0016", "N0021", "N0027", "N0030", "N0031", "N0037", "N0038", "N0039"])
m("Revisão final", 26)

# ============================================================== 27 — Resumo
sec("resumo", "Resumo final", """
1. **Art. 1º:** não há crime sem lei anterior nem pena sem prévia cominação — só **lei federal** (não MP, decreto ou costume); **analogia só a favor** do réu.
2. **Lei no tempo:** aplica-se a lei do tempo do fato; a mais grave **não retroage**; a mais benéfica **retroage de qualquer modo**, mesmo após o trânsito (juízo da execução — Súm. 611/STF).
3. **Abolitio criminis:** extingue a punibilidade (art. 107, III); cessam execução e efeitos **penais**; efeitos civis ficam. **Revogação com migração** = continuidade normativo-típica (não é abolitio).
4. **Lei intermediária** mais benéfica aplica-se; **combinação de leis** vedada pelos tribunais superiores (Tema 169/STF; Súm. 501/STJ).
5. **Art. 3º:** leis temporárias e excepcionais são **ultra-ativas** — o fim da vigência não é abolitio.
6. **Art. 4º:** tempo do crime = **atividade** (conduta). Idade conta na data da conduta. **Súm. 711/STF** para crime permanente/continuado.
7. **Art. 5º:** territorialidade **temperada**; navio/aeronave pública brasileira: em qualquer lugar; privada: em alto-mar; estrangeira privada: em porto/mar territorial ou espaço aéreo brasileiro.
8. **Art. 6º:** lugar do crime = **ubiquidade** (conduta ou resultado). Competência é outra coisa (CPP, art. 70).
9. **Art. 7º:** I **incondicionada** (pune mesmo com absolvição lá); II **condicionada** (5 condições do § 2º); § 3º = 5 condições + extradição não pedida/negada + requisição do MJ.
10. **Art. 8º:** idênticas → **computa**; diversas → **atenua**.
11. **Art. 9º:** homologação pelo **STJ** para efeitos civis (pedido da parte) ou medida de segurança (tratado ou requisição do MJ). Reincidência dispensa homologação.
12. **Arts. 10 a 12:** prazo penal **inclui** o 1º dia e não prorroga; desprezam-se frações de dia; o CP vale para leis especiais **salvo disposição diversa**.
""", ["N0001", "N0002", "N0003", "N0004", "N0005", "N0006", "N0009", "N0010", "N0030", "N0031", "N0037", "N0038", "N0039"])
m("Revisão final", 27)

# ============================================================== 28 — Módulos 16, 17 e 18
sec("checklist", "Módulos 16, 17 e 18 — Questões comentadas, simulado final e checklist de domínio", """
### Como funcionam as questões desta aula (Módulo 16)
- O card **Questões de fixação** traz **32 questões autorais (APROVUM)** de múltipla escolha, com alternativas **A a E**, distribuídas por todos os módulos — **não** são questões oficiais e **não** são atribuídas a nenhuma banca.
- São três níveis: **fácil** (conceitos e identificação da regra), **médio** (aplicação a exemplos) e **difícil** (casos com datas, territorialidade, extraterritorialidade, prazos e súmulas).
- **Correção:** o gabarito **só aparece depois** da resposta. Cada questão mostra: a alternativa correta; a **fundamentação legal**; o comentário da correta; a explicação de **cada alternativa errada**; a **pegadinha** usada; e uma **dica de resolução**.

### Simulado final (Módulo 17)
- O nível **difícil** funciona como **simulado final**: **12 questões** de casos hipotéticos, usando a mesma mecânica de seleção, correção automática, pontuação e comentários da plataforma.
- **Regras de domínio do APROVUM** (as mesmas de todas as aulas): é preciso acertar **pelo menos 90%** de cada nível para liberar o seguinte. As respostas ficam registradas; as questões erradas voltam nas **revisões espaçadas**.
- **Progresso:** cada card concluído é marcado no topo da aula; a aula conta como estudada quando você conclui a leitura dos cards e é aprovado nos três níveis.

### Checklist de domínio (Módulo 18)
- [ ] **Legalidade e anterioridade:** explico reserva legal, as quatro garantias, analogia e lei penal em branco.
- [ ] **Sucessão de leis penais:** classifico incriminadora, in pejus, in mellius e abolitio; aplico a lei intermediária; sei a vedação da combinação de leis.
- [ ] **Abolitio criminis:** sei seus efeitos (penais × civis) e a diferença para a continuidade normativo-típica.
- [ ] **Lei temporária e excepcional:** explico a ultra-atividade do art. 3º.
- [ ] **Tempo do crime:** aplico a teoria da atividade, a regra da idade e a Súmula 711.
- [ ] **Lugar do crime:** aplico a ubiquidade e separo lugar do crime de competência.
- [ ] **Territorialidade:** resolvo a tabela de navios e aeronaves (art. 5º, §§ 1º e 2º).
- [ ] **Extraterritorialidade:** enquadro nos incisos I e II e no § 3º e lembro as cinco condições do § 2º.
- [ ] **Pena cumprida no exterior:** idênticas → computa; diversas → atenua.
- [ ] **Sentença estrangeira:** sei para que serve a homologação, quem homologa e de que depende.
- [ ] **Contagem de prazos:** conto prazo penal (inclui o 1º dia) e diferencio do processual.
- [ ] **Frações da pena:** desprezo frações de dia e leio corretamente a referência histórica ao "cruzeiro".
- [ ] **Aplicação às leis especiais:** aplico o art. 12 e reconheço quando a lei especial dispõe de modo diverso.
- [ ] Fui aprovado nos três níveis de questões desta aula.

**Errou?** Cada comentário indica o artigo e o conceito cobrado: volte ao módulo correspondente, releia o card e refaça o nível nas revisões.
""", ["N0001", "N0002", "N0004", "N0005", "N0006", "N0009", "N0010", "N0030", "N0031", "N0037", "N0038", "N0039"])
m("Revisão final", 28)

# ============================================================== 29 — Referências
sec("referencias", "Referências e conferência das fontes", """
**Legislação (conferida em 19/10/2026):**
- BRASIL. Código Penal (Decreto-Lei nº 2.848/1940), arts. 1º a 12, com a redação da Lei nº 7.209/1984 — [planalto.gov.br — Código Penal compilado](https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm). Texto comparado artigo por artigo; sem alterações posteriores a 1984 nesses dispositivos.
- Constituição Federal, art. 5º, XXXIX, XL e LI; art. 22, I; art. 62, § 1º, I, "b"; art. 105, I, "i".
- Código de Processo Penal, arts. 70, 787 a 790 e 798 (comparação de prazos e competência).
- Lei 13.445/2017 (Lei de Migração), art. 82 — hipóteses em que não se concede extradição (consulta por resumo do dispositivo).
- Leis citadas como exemplo: Lei 8.617/1993 (mar territorial); Lei 7.565/1986 (Código Brasileiro de Aeronáutica); Lei 11.106/2005; Lei 12.015/2009; Lei 12.663/2012 (Lei Geral da Copa); Lei 11.343/2006; Lei 10.826/2003; Lei 9.455/1997; Lei 13.869/2019; Lei 9.605/1998; Decreto-Lei 3.688/1941 (Lei das Contravenções Penais).

**Jurisprudência:**
- STF, **Súmula 711** (24/09/2003) — [jurisprudencia.stf.jus.br](https://jurisprudencia.stf.jus.br/pages/search/seq-sumula711/false)
- STJ, **Súmula 501** (Terceira Seção, 23/10/2013; DJe 28/10/2013) — [stj.jus.br — Súmula 501](https://stj.jus.br/publicacaoinstitucional/index.php/sumstj/article/download/5177/5302)
- STF, **Tema 169 de Repercussão Geral** (RE 600.817/MS, Plenário, rel. Min. Ricardo Lewandowski, 07/11/2013) — tese conferida em repositório de teses; consulta no [portal do STF](https://portal.stf.jus.br/)
- STF, **Súmula 611** — enunciado conferido em repositório de súmulas; consulta no [portal de jurisprudência do STF](https://jurisprudencia.stf.jus.br/)
- STF, **Súmula 310** (contagem de prazo processual com intimação na sexta-feira) — citada com base na jurisprudência consolidada.

**Observações sobre as fontes:**
- **Texto literal da lei** aparece em citação (">"). **Explicações** são doutrinárias, baseadas na terminologia consolidada do Direito Penal; quando há divergência (combinação de leis, retroatividade do complemento da lei em branco, classificação de princípios da extraterritorialidade, vacatio legis), a aula indica.
- **Exemplos com nomes** são **hipotéticos**. **Questões** são **autorais (APROVUM)**.
""", ["N0001", "N0003", "N0005", "N0010", "N0031", "N0037"])
m("Revisão final", 29)
