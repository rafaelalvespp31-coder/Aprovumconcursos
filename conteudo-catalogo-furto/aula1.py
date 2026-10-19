from helpers import *

# ============================================================== 1 — Introdução
sec("introducao", "Introdução: o que é furto e por onde começa a análise", """
**Furto** é o crime de **subtrair, para si ou para outrem, coisa alheia móvel** (art. 155 do Código Penal). Em palavras simples: tirar de alguém, sem violência ou grave ameaça, uma coisa móvel que não é sua, com a intenção de ficar com ela (ou entregá-la a outra pessoa).

📘 **Onde se estuda:** no **Direito Penal**, Parte Especial do Código Penal (Decreto-Lei nº 2.848/1940), **Título II — Dos crimes contra o patrimônio**, **Capítulo I — Do furto** (arts. 155 e 156). É o primeiro crime desse título; logo depois vêm o roubo e a extorsão (Capítulo II).

📘 **Por que é crime contra o patrimônio:** o que a lei protege é o conjunto de bens economicamente apreciáveis de uma pessoa. Quem furta diminui o patrimônio de alguém sem o consentimento dele.

**Peças do crime, uma por uma:**
- **Bem jurídico protegido:** o **patrimônio** — para a maior parte da doutrina, tanto a **propriedade** quanto a **posse** (e, para parte dela, também a detenção legítima).
- **Sujeito ativo** (quem pratica): **qualquer pessoa**, menos o próprio dono da coisa → é **crime comum**. O dono que "pega de volta" coisa sua que está legitimamente com outra pessoa não comete furto (a coisa não é *alheia*); conforme o caso, pode haver outro crime (ex.: art. 346 do CP, tirar coisa própria em poder de terceiro por determinação judicial ou convenção).
- **Sujeito passivo** (vítima): o **proprietário**, o **possuidor** ou, para parte da doutrina, o **detentor** que sofre o desfalque. Pode ser pessoa física ou jurídica.
- **Objeto material:** a **coisa alheia móvel** sobre a qual recai a conduta (o celular, a bicicleta, o dinheiro, a energia equiparada pelo § 3º).

**Patrimônio, propriedade, posse e detenção (sem confusão):**
| Figura | O que é | Exemplo |
|---|---|---|
| **Propriedade** | Direito de usar, gozar, dispor e reaver a coisa | Você é dono do seu carro |
| **Posse** | Poder de fato sobre a coisa, como se dono fosse (pode ser de quem não é dono) | O locatário que está com o carro alugado |
| **Detenção** | Contato físico com a coisa em nome de outro, por dependência | O manobrista que segura a chave do carro do cliente |

🎯 **Subtrair** = **retirar a coisa da esfera de disponibilidade da vítima**, trazendo-a para o poder do agente **sem o consentimento** do titular. Não é o mesmo que "pegar": quem pega algo **com autorização** ou que **lhe foi entregue** não subtrai (pode haver apropriação indébita, se depois inverter a posse — art. 168).

🎯 **Dolo:** o furto só existe na forma **dolosa**. Não há furto culposo. Além do dolo (vontade de subtrair), exige-se a **intenção de assenhoramento definitivo** — ter a coisa **para si ou para outrem** (*animus rem sibi habendi*, também chamado *animus furandi*).

⚠️ **Retirar um objeto de alguém não é automaticamente furto.** É preciso verificar, ao mesmo tempo: (1) se a coisa é **alheia**; (2) se é **móvel** e tem **valor**; (3) se houve **subtração** sem consentimento; (4) se havia **dolo** e **intenção de ficar** com a coisa; (5) se não houve **violência ou grave ameaça** (aí seria roubo); (6) se a pessoa já não tinha a **posse** legítima antes (aí, em tese, apropriação indébita); (7) se não houve **fraude para a vítima entregar** a coisa (aí, em tese, estelionato).

**Situações que NÃO permitem concluir de imediato que houve furto:**
- **Pegar** um guarda-chuva igual ao seu, por engano, na saída do restaurante → falta dolo (erro de tipo).
- **Transportar** um objeto a pedido do dono → há consentimento.
- **Guardar** a carteira encontrada no chão para entregá-la à polícia → não há subtração de coisa em poder de alguém; e, se depois o achador ficar com ela, o enquadramento a analisar é o do art. 169, parágrafo único, II (apropriação de coisa achada), não o furto.
- **Devolver** o objeto logo depois → a devolução **não apaga automaticamente** um furto já consumado; ela pode influir na pena (arrependimento posterior, art. 16) ou na análise da insignificância, conforme o caso.

> ⚠️ As questões, pegadinhas e casos desta aula são **inéditos, elaborados para estudo** — não são questões oficiais de provas. Casos com nomes de pessoas são **hipotéticos**, não julgados reais.

> 📅 **Atualização legal conferida em 19/10/2026:** o art. 155 foi alterado em 2025 e em 2026 (Leis 15.181/2025, 15.358/2026, 15.397/2026 e 15.517/2026). As penas e o § 1º mudaram. Veja o card **Leia a lei** e os módulos de cada parágrafo.
""" + ex(
    "Ana vê um celular sobre a mesa de uma lanchonete, guarda-o no bolso e sai. O dono, Bruno, só percebe minutos depois.",
    "Já dá para dizer que Ana cometeu furto? O que precisa ser investigado?",
    "**Ainda não dá para concluir sem os fatos.** É preciso saber: (1) **de quem é o aparelho** — se for de Ana, não há coisa alheia; (2) **em que circunstâncias** foi retirado — estava em poder de Bruno ou tinha sido esquecido/perdido? (3) **qual era a intenção** — ficar com o celular (furto) ou devolvê-lo ao dono/entregar à polícia; (4) se houve **violência ou ameaça** (roubo) ou **fraude para que Bruno entregasse** o aparelho (estelionato). Se o celular era de Bruno, estava na esfera de vigilância dele (sobre a mesa, ao lado) e Ana o levou para ficar com ele, há em tese **furto** — e, após a Lei 15.397/2026, a subtração de **aparelho de telefonia celular** passou a ter forma própria no **§ 6º, II** (reclusão de 4 a 10 anos).",
    [Q("bar", "Ana vê um celular sobre a mesa ao lado.", [P("cidadao", "esq", "pega", "neutro", "celular"), P("vitima", "dir", "neutro", "neutro")]),
     Q("bar", "Minutos depois, Bruno procura o aparelho.", [P("vitima", "centro", "fala", "surpreso")], (0, "Cadê meu celular?"))],
    "Depende dos fatos | alerta",
    fluxo("Antes de concluir que é furto", [
        ("A coisa é alheia e móvel?", "neutro", "De quem é o celular?"),
        ("Houve subtração sem consentimento?", "neutro", "Estava com o dono ou perdido?"),
        ("Havia intenção de ficar com ela?", "neutro", "Dolo + assenhoramento"),
        ("Sem violência, ameaça ou entrega por fraude?", "neutro", "Senão: roubo ou estelionato"),
    ], ("Tudo sim → furto (celular: § 6º, II)", "ok"))),
    ["N0001", "N0002"])
m("Visão geral e lei seca", 1)

# ============================================================== 2 — Mapas 1 a 6
sec("esquema", "Mapas mentais (1/2): estrutura do art. 155, elementos e figuras", """
**Mapa 1 — Estrutura do art. 155 (redação vigente em 19/10/2026)**
- **Caput:** furto simples → reclusão de **1 a 6 anos** e multa
- **§ 1º:** repouso noturno → aumenta de **metade**
- **§ 2º:** privilégio (primário + pequeno valor)
- **§ 3º:** energia elétrica ou outra com valor econômico = coisa móvel
- **§ 4º:** qualificado (2 a 8 anos): I obstáculo · II confiança, fraude, escalada, destreza · III chave falsa · IV concurso · V bens de órgãos públicos/serviços essenciais
- **§ 4º-A:** explosivo ou artefato análogo com perigo comum (4 a 10)
- **§ 4º-B:** fraude por dispositivo eletrônico ou informático (4 a 10) · **§ 4º-C:** aumentos (servidor no exterior; idoso ou vulnerável)
- **§ 5º:** veículo levado a outro Estado ou ao exterior (4 a 10)
- **§ 6º:** I semovente de produção ou animal doméstico · II celular, computador e similares (4 a 10)
- **§ 7º:** I explosivos e acessórios · II arma de fogo (4 a 10)
- **§ 8º:** fios, cabos e equipamentos de energia, telefonia, dados, ferroviários/metroviários (2 a 8)
- **§ 9º:** integrante de organização criminosa ultraviolenta, grupo paramilitar ou milícia (4 a 10)
- **§§ 10 a 12:** combustíveis e lubrificantes (4 a 10) e seus aumentos (1/3 e 2/3)

**Mapa 2 — Elementos do furto**
- **Conduta:** subtrair (retirar da esfera de disponibilidade da vítima)
- **Objeto:** coisa **alheia** + **móvel** + com valor (econômico; parte da doutrina admite afetivo)
- **Elemento subjetivo:** dolo + **fim de assenhoramento** (para si ou para outrem)
- **Ausência:** de violência/grave ameaça (senão: roubo) e de entrega pela vítima enganada (senão: estelionato)

**Mapa 3 — Furto simples (caput)**
- Pena: reclusão **1 a 6 anos** + multa (Lei 15.397/2026; antes, 1 a 4)
- Cabem, em tese: **privilégio** (§ 2º), **repouso noturno** (§ 1º), **insignificância** (análise do caso)
- Ação penal: **pública incondicionada** (ressalvas dos arts. 181 a 183)

**Mapa 4 — Repouso noturno (§ 1º)**
- Aumento de **metade** (fatos a partir de 4/5/2026) · **um terço** para fatos anteriores (lei mais grave não retroage)
- **Tema 1.144/STJ:** período de recolhimento da população; vale para casa, comércio, via pública, veículo; irrelevante se a vítima dormia
- **Tema 1.087/STJ:** **não incide** no furto **qualificado** (§ 4º)

**Mapa 5 — Furto privilegiado (§ 2º)**
- Requisitos **cumulativos:** criminoso **primário** + coisa de **pequeno valor**
- Efeitos (escolha do juiz): reclusão → detenção · diminuir de 1/3 a 2/3 · só multa
- **Súmula 511/STJ:** cabe no furto **qualificado**, se a qualificadora for de ordem **objetiva**
- ≠ insignificância (que afasta a tipicidade material)

**Mapa 6 — Furto qualificado (§ 4º e seguintes)**
- § 4º: I obstáculo · II abuso de confiança / fraude / escalada / destreza · III chave falsa · IV concurso de 2+ pessoas · V bens que comprometem órgãos públicos ou serviços essenciais
- Formas com pena própria: §§ 4º-A, 4º-B, 5º, 6º, 7º, 8º, 9º e 10
- Cada uma tem **requisitos e pena diferentes** — não misture
""", ["N0001", "N0002", "N0003", "N0004", "N0005", "N0006", "N0012", "N0013", "N0017", "N0018", "N0021", "N0024", "N0025", "N0026"])
m("Visão geral e lei seca", 2)

# ============================================================== 3 — Mapas 7 a 12
sec("esquema", "Mapas mentais (2/2): energia, consumação, comparações, insignificância e jurisprudência", """
**Mapa 7 — Furto de energia (§ 3º)**
- Energia elétrica (ou outra com valor econômico) **equipara-se** à coisa móvel
- **Ligação clandestina ("gato")**, antes do medidor → em tese, **furto de energia**
- Requisitos: subtração da energia + dolo + fim de assenhoramento
- Pagamento posterior do débito: segundo a Terceira Seção do STJ (RHC 101.299/RS, 2019), **não extingue** a punibilidade — conferir

**Mapa 8 — Energia: furto × estelionato**
- **Gato** (energia desviada sem passar pela medição) → furto
- **Medidor alterado** para registrar consumo menor, com serviço regularmente prestado e faturado → **STJ, AREsp 1.418.119/DF (2019): estelionato** (a concessionária é induzida em erro sobre o consumo)
- Há precedente anterior em sentido diverso (RHC 62.437/SC, 2016: furto mediante fraude) → **analise o caso concreto**

**Mapa 9 — Consumação e tentativa**
- **Consuma-se** com a **posse de fato** da coisa, ainda que breve e seguida de perseguição (**Tema 934/STJ**; teoria da *amotio*/inversão da posse)
- Posse **mansa e pacífica** ou **desvigiada**: **dispensável**
- Detido **ainda dentro** do estabelecimento, com os bens na mochila → STJ (5ª Turma, Inf. 886, 2026): **tentativa**
- Vigilância eletrônica/seguranças não tornam o crime impossível (**Súmula 567/STJ**)

**Mapa 10 — Furto × roubo × estelionato**
- **Furto:** subtração **sem** violência/grave ameaça · fraude, se houver, **diminui a vigilância** da vítima
- **Roubo (art. 157):** subtração **com** violência ou grave ameaça (ou meio que reduza a vítima à impossibilidade de resistência)
- **Estelionato (art. 171):** a **vítima entrega** o bem porque foi **induzida ou mantida em erro**

**Mapa 11 — Insignificância**
- Afasta a **tipicidade material** (o fato é formalmente típico, mas a lesão é ínfima)
- Vetores do STF (HC 84.412/SP): mínima ofensividade · nenhuma periculosidade social · reduzidíssimo grau de reprovabilidade · inexpressividade da lesão
- **Sem valor fixo universal**; reincidência e habitualidade são analisadas **caso a caso**

**Mapa 12 — Jurisprudência essencial**
- **Tema 934/STJ:** consumação com a posse de fato
- **Tema 1.144/STJ:** conceito de repouso noturno
- **Tema 1.087/STJ:** repouso noturno não incide no furto qualificado
- **Súmula 511/STJ:** privilégio no furto qualificado (qualificadora objetiva)
- **Súmula 567/STJ:** vigilância não torna impossível o furto
- **Súmula 442/STJ:** no furto qualificado pelo concurso, não se aplica a majorante do roubo
- **AREsp 1.418.119/DF:** medidor adulterado → estelionato
""" + ex(
    "Diego é preso em flagrante tentando sair de um supermercado com três barras de chocolate escondidas na mochila. Ele foi acompanhado o tempo todo pelas câmeras e por um segurança.",
    "A vigilância permanente torna o crime impossível?",
    "**Não.** Pela **Súmula 567 do STJ**, o sistema de vigilância por monitoramento eletrônico ou a existência de segurança no interior do estabelecimento, **por si só**, não torna impossível a configuração do furto. Como Diego foi detido **dentro** do estabelecimento, o STJ (5ª Turma, Informativo 886, 2026) entende que, em situação assim, o furto é **tentado** (não houve a *amotio*). A **insignificância** é análise **separada**, conforme o caso.",
    [Q("rua", "Diego guarda os chocolates na mochila.", [P("investigado", "esq", "pega", "neutro", "maleta")]),
     Q("rua", "O segurança o aborda antes da saída.", [P("servidor", "esq", "aponta", "serio"), P("investigado", "dir", "neutro", "surpreso")], (0, "Pare! Vimos tudo pelas câmeras."))],
    "Não é crime impossível | ok",
    comp("Vigilância e furto", ("Súmula 567/STJ", "Crime possível", "ok", ["Câmeras e seguranças", "não tornam impossível", "o furto, por si sós"]),
         ("Detido lá dentro", "Tentativa (Inf. 886)", "alerta", ["Bens na mochila", "Sem amotio", "Redução do art. 14, II"]))),
    ["N0005", "N0003", "N0004"])
m("Visão geral e lei seca", 3)

# ============================================================== 4 — Texto legal
sec("texto_legal", "Art. 155 do Código Penal — redação vigente (montada em 19/10/2026)", """
> Art. 155 - Subtrair, para si ou para outrem, coisa alheia móvel:
> Pena - reclusão, de 1 (um) a 6 (seis) anos, e multa.
> § 1º A pena aumenta-se de metade, se o crime é praticado durante o repouso noturno.
> § 2º Se o criminoso é primário, e é de pequeno valor a coisa furtada, o juiz pode substituir a pena de reclusão pela de detenção, diminuí-la de um a dois terços, ou aplicar somente a pena de multa.
> § 3º Equipara-se à coisa móvel a energia elétrica ou qualquer outra que tenha valor econômico.
> § 4º A pena é de reclusão, de 2 (dois) a 8 (oito) anos, e multa, se o crime é cometido:
> I - com destruição ou rompimento de obstáculo à subtração da coisa;
> II - com abuso de confiança, ou mediante fraude, escalada ou destreza;
> III - com emprego de chave falsa;
> IV - mediante concurso de duas ou mais pessoas;
> V - contra quaisquer bens que comprometam o funcionamento de órgãos da União, de Estado, do Distrito Federal ou de Município ou de estabelecimentos públicos ou privados que prestem serviços essenciais.
> § 4º-A A pena é de reclusão de 4 (quatro) a 10 (dez) anos e multa, se houver emprego de explosivo ou de artefato análogo que cause perigo comum.
> § 4º-B A pena é de reclusão, de 4 (quatro) a 10 (dez) anos, e multa, se o furto mediante fraude é cometido por meio de dispositivo eletrônico ou informático, conectado ou não à rede de computadores, com ou sem a violação de mecanismo de segurança ou a utilização de programa malicioso, ou por qualquer outro meio fraudulento análogo.
> § 4º-C A pena prevista no § 4º-B deste artigo, considerada a relevância do resultado gravoso:
> I - aumenta-se de 1/3 (um terço) a 2/3 (dois terços), se o crime é praticado mediante a utilização de servidor mantido fora do território nacional;
> II - aumenta-se de 1/3 (um terço) ao dobro, se o crime é praticado contra idoso ou vulnerável.
> § 5º A pena é de reclusão, de 4 (quatro) a 10 (dez) anos, e multa, se a subtração for de veículo automotor que venha a ser transportado para outro Estado ou para o exterior.
> § 6º A pena é de reclusão, de 4 (quatro) a 10 (dez) anos, e multa, se a subtração for:
> I - de semovente domesticável de produção, ainda que abatido ou dividido em partes no local da subtração, ou de animal doméstico;
> II - de aparelho de telefonia celular, de computador, inclusive portátil, ou de qualquer outro dispositivo eletrônico ou informático semelhante.
> § 7º A pena é de reclusão, de 4 (quatro) a 10 (dez) anos, e multa, se a subtração for:
> I - de substâncias explosivas ou de acessórios que, conjunta ou isoladamente, possibilitem sua fabricação, montagem ou emprego;
> II - de arma de fogo.
> § 8º A pena é de reclusão, de 2 (dois) a 8 (oito) anos, e multa, se a subtração for de fios, cabos ou equipamentos utilizados para fornecimento ou transmissão de energia elétrica ou de telefonia ou para transferência de dados, bem como equipamentos ou materiais ferroviários ou metroviários, aplicável, em qualquer caso, o disposto no § 2º deste artigo.
> § 9º A pena é de reclusão de 4 (quatro) a 10 (dez) anos e multa, se a subtração, para si ou para outrem, de coisa alheia móvel é cometida por integrante de organização criminosa ultraviolenta, grupo paramilitar ou milícia privada, no contexto da atuação ou para a consecução das condutas previstas no art. 2º da Lei nº 15.358, de 24 de março de 2026.
> § 10. A pena é de reclusão, de 4 (quatro) a 10 (dez) anos, e multa, se a subtração for de petróleo e derivados, gás natural e suas frações recuperáveis, álcool etílico hidratado carburante e demais combustíveis fluidos carburantes, inclusive biocombustíveis, ou de óleos lubrificantes, removidos dos estabelecimentos de produção ou de quaisquer instalações de armazenamento e de transporte de combustíveis, incluídos os dutos e as unidades de transporte em qualquer modal.
> § 11. A pena prevista no § 10 deste artigo aumenta-se de 1/3 (um terço) se o crime é cometido:
> I - com destruição ou rompimento de obstáculo à subtração ou com dano de qualquer natureza;
> II - mediante concurso de duas ou mais pessoas;
> III - com abuso de confiança ou por quem tenha vínculo, atual ou passado, com o ente lesado;
> IV - por ocupante de cargo, emprego ou função pública.
> § 12. A pena prevista no § 10 deste artigo aumenta-se de 2/3 (dois terços) se do crime resultar:
> I - suspensão ou paralisação das atividades do estabelecimento;
> II - desabastecimento;
> III - incêndio;
> IV - poluição efetiva ou potencial ao meio ambiente;
> V - lesão corporal grave;
> VI - morte.

⚠️ **Como esta redação foi montada:** a página do Código Penal compilado no Planalto não pôde ser lida por inteiro nesta preparação. A redação acima foi **montada pela equipe** a partir das páginas oficiais das leis que alteraram o artigo (Leis 15.181/2025, 15.358/2026, 15.397/2026 e 15.517/2026, no Planalto/Câmara, consultadas em 19/10/2026) e da redação já consolidada dos §§ 2º, 3º, 4º-A e 4º-C. **Penas, frações e hipóteses foram conferidas nessas páginas**; a **pontuação e palavras de ligação** podem ter pequenas diferenças. Antes da prova, confira a **letra exata** no CP compilado: planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm.

**Linha do tempo das alterações recentes:**
- **Lei 15.181/2025** (DOU 29/7/2025): incluiu o § 4º, V (bens de órgãos públicos e serviços públicos essenciais) e o § 8º (fios, cabos e equipamentos).
- **Lei 15.358/2026** (Lei Antifacção, de 24/3/2026): incluiu o § 9º (art. 33 da lei).
- **Lei 15.397/2026** (de 30/4/2026; DOU de 4/5/2026, vigência na publicação): nova pena do caput (**1 a 6 anos**), § 1º passou a **metade**, nova redação dos §§ 4º (inc. V), 4º-B, 5º, 6º, 7º e 8º, com penas maiores.
- **Lei 15.517/2026** (de 22/9/2026; DOU de 23/9/2026, vigência na publicação): incluiu os §§ 10, 11 e 12 (combustíveis e lubrificantes).

🚨 **Lei penal mais grave não retroage** (art. 5º, XL, da CF). Fatos anteriores a cada lei continuam com a pena antiga — ex.: furto simples praticado em março de 2026 → reclusão de **1 a 4 anos**; repouso noturno antes de 4/5/2026 → aumento de **1/3**.
""", [f"N{i:04d}" for i in range(1, 39)])
m("Visão geral e lei seca", 4)
