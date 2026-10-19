from helpers import sec, ex, P, Q, fluxo, comp, m

sec("explicacao", "Módulo 6 — Conectivos e relações de sentido (1/2): o quadro completo", r"""
📘 **Conectivos** (conjunções, locuções e outras expressões) **ligam** orações e trechos e **estabelecem relações lógico-semânticas** entre eles: causa, oposição, conclusão etc.
⚠️ **O sentido depende do contexto.** A mesma palavra pode estabelecer relações diferentes (*como* pode ser causal, comparativo ou conformativo; *enquanto* pode ser temporal ou de oposição). **Nunca decore a lista sem ler a frase.**

| Relação | Conectivos frequentes | Efeito de sentido | Exemplo |
|---|---|---|---|
| **Adição** | e, nem, também, além disso, não só… mas também | Soma ideias na mesma direção | *Estudou **e** revisou.* |
| **Oposição (adversativa)** | mas, porém, contudo, todavia, entretanto, no entanto | Contraria a expectativa da oração anterior; **a ideia introduzida prevalece** | *Estudou, **mas** não passou.* |
| **Concessão** | embora, ainda que, mesmo que, apesar de (que), conquanto, se bem que | Admite um fato que poderia impedir o outro, mas **não impede** | ***Embora** tenha estudado, não passou.* |
| **Causa** | porque, pois (anteposto ao verbo), como (no início), já que, visto que, uma vez que | Indica o motivo | ***Como** choveu, o jogo atrasou.* |
| **Consequência** | tão… que, tanto… que, de modo que, de forma que | Indica o resultado de algo intenso | *Estudou **tanto que** passou em 1º.* |
| **Conclusão** | portanto, logo, por isso, assim, então, pois (posposto ao verbo) | Tira uma conclusão do que foi dito | *Revisou muito; **portanto**, está preparado.* |
| **Explicação** | pois, porque, que (após frase imperativa/opinativa) | Justifica uma afirmação/ordem | *Saia logo, **que** vai chover.* |
| **Condição** | se, caso, desde que, contanto que, a menos que | Hipótese para que algo ocorra | ***Se** estudar, passará.* |
| **Finalidade** | para que, a fim de que, para, a fim de | Objetivo | *Revisou **para que** não esquecesse.* |
| **Comparação** | como, tal qual, assim como, mais… (do) que, menos… (do) que | Compara termos | *Corre **como** um atleta.* |
| **Alternância** | ou… ou, ora… ora, quer… quer, seja… seja | Alterna ou exclui | ***Ou** estuda, **ou** desiste.* |
| **Proporção** | à medida que, à proporção que, quanto mais… mais | Duas ações que variam juntas | ***À medida que** estuda, aprende.* |
| **Tempo** | quando, enquanto, logo que, assim que, depois que, desde que (temporal) | Situa no tempo | ***Quando** chegou, a prova começou.* |
| **Conformidade** | conforme, segundo, consoante, como (= conforme) | Acordo com algo/alguém | ***Conforme** o edital, a prova é às 8h.* |
| **Exemplificação** | por exemplo, como, a saber, tais como | Ilustra uma ideia | *Gêneros, **por exemplo**, a crônica.* |
| **Restrição** | apenas, somente, só, exceto, salvo | Limita o alcance | *Passaram **apenas** dez.* |
| **Retificação** | ou melhor, aliás, isto é (corretivo), ou seja | Corrige ou reformula | *Eram cem, **ou melhor**, cento e dez.* |
| **Síntese / resumo** | em suma, enfim, em resumo, em síntese, ou seja | Fecha com resumo | ***Em suma**, o método importa.* |

### Os conectivos que mais caem — um a um
- **Mas, porém, contudo, entretanto, todavia, no entanto** → **oposição**. São intercambiáveis quanto ao sentido; muda a posição na frase (*porém/contudo/entretanto* podem vir deslocados: *"Estudou; não passou, **porém**."*).
- **Embora, ainda que, apesar de** → **concessão**. *Embora* e *ainda que* pedem **subjuntivo** (*embora **tenha**, ainda que **chova***); *apesar de* pede **infinitivo** ou **substantivo** (*apesar de **ter** estudado; apesar **da** chuva*).
- **Porque** → em geral **causa** ou **explicação**. **Como** → **causa** quando inicia o período (*Como estava doente, faltou*); **comparação** (*brilha como ouro*); **conformidade** (*como determina a lei*).
- **Portanto, logo, assim, por isso** → **conclusão**. ⚠️ *Assim* também pode ser **modo** (*fez assim*) ou **comparação** (*assim como*).
- **Pois** → **explicação/causa** quando **anteposto** ao verbo (*não saiu, **pois** chovia*); **conclusão** quando **posposto** ao verbo, entre vírgulas (*choveu muito; o jogo foi, **pois**, adiado*).
- **Se, caso** → **condição** (*caso* pede subjuntivo: *caso **chova***). ⚠️ *Se* também pode ser conjunção **integrante** (*não sei **se** virá*).
- **Para que, a fim de que** → **finalidade** (subjuntivo).
- **Conforme, segundo** → **conformidade** (*segundo o laudo…*). ⚠️ *Conforme* também pode ser **proporção** (*conforme subia, o ar rareava*).
- **À medida que** → **proporção** (≠ *na medida em que*, que é **causa** na norma-padrão).
- **Enquanto** → **tempo** (*enquanto estudava, ouvia música*) ou **oposição/contraste** (*ele estuda, **enquanto** o irmão dorme*).
- **Ou seja, isto é** → **explicação/reformulação** (às vezes **retificação** ou **síntese**).
- **Por exemplo** → **exemplificação**.
""" + ex(
    "Frase: \"Enquanto o efetivo diminuiu, o número de presos dobrou.\"",
    "Que relação o \"enquanto\" estabelece aqui? Poderia ser trocado por \"quando\"?",
    "Aqui *enquanto* marca **oposição/contraste** (efetivo diminuiu × presos dobraram), não apenas tempo. Trocar por *quando* **altera o sentido**: *quando* indicaria só simultaneidade, apagando o contraste. Uma substituição que **preserva** o sentido seria *ao passo que* (*O efetivo diminuiu, **ao passo que** o número de presos dobrou*).",
    [Q("reparticao", "O gestor apresenta os números.", [P("gestor", "esq", "aponta", "serio", "documento"), P("servidor", "dir", "neutro", "surpreso")], fala=(0, "Efetivo caiu; presos dobraram.")),
     Q("reparticao", "O servidor percebe o contraste.", [P("servidor", "centro", "fala", "serio")], fala=(0, "\"Enquanto\" aqui é oposição!"))],
    "Contexto define a relação | alerta",
    fluxo("Como descobrir a relação", [("Leia as duas orações", "neutro"), ("Qual a ligação lógica entre elas?", "alerta", "causa, oposição, tempo…"), ("Teste a troca por um conectivo típico", "ok", "o sentido se mantém?")], ("Contexto vence a lista decorada", "ok")),
), ["N0022", "N0023", "N0024", "N0025", "N0026"])

sec("aprofundamento", "Módulo 6 — Conectivos (2/2): oposição × concessão e a substituição que muda tudo", r"""
### 6.1 Mas × embora: a diferença mais cobrada
📘 **Oposição (mas):** liga duas orações em que a **segunda contraria a expectativa** criada pela primeira — e **a segunda prevalece** (é a que o autor quer destacar).
📘 **Concessão (embora):** apresenta um fato que **poderia** gerar uma expectativa (ou impedir o outro fato), mas essa expectativa **não prevalece** — o fato principal acontece **apesar** dele.
🧪 Compare:
- *"O candidato estudou muito, **mas** foi reprovado."* → destaque: **foi reprovado**.
- *"**Embora** o candidato tenha estudado muito, foi reprovado."* → mesmo conteúdo lógico; a oração com *embora* é a que **não impediu** o resultado.
🔁 **Conversão entre as duas (muito cobrada):** a oração que vem **após o "mas"** fica como **principal**; a que vem **antes** passa a ser a **concessiva**.
- *"Choveu, **mas** o jogo aconteceu."* ⇄ *"**Embora** tenha chovido, o jogo aconteceu."* ✔️
- *"Choveu, **mas** o jogo aconteceu."* ⇄ *"**Embora** o jogo tenha acontecido, choveu."* ❌ (inverte o que prevalece)

### 6.2 Causa × consequência × conclusão × explicação
| | Pergunta | Exemplo |
|---|---|---|
| **Causa** | Por que aconteceu? | *O voo atrasou **porque** houve neblina.* |
| **Consequência** | Qual o resultado de algo intenso? | *A neblina era **tão** densa **que** o voo atrasou.* |
| **Conclusão** | O que se deduz? | *Houve neblina; **logo**, o voo atrasou.* |
| **Explicação** | Por que eu afirmo/ordeno isso? | *Leve o casaco, **pois** vai esfriar.* |
🚨 **Pegadinha:** *"Ele deve ter chegado, **porque** a luz está acesa."* — a luz acesa **não causa** a chegada; ela **justifica** a afirmação → **explicação**, não causa.

### 6.3 Substituição de conectivos: preserva ou altera?
Para julgar uma substituição, faça três testes:
1. **Mesma relação?** (oposição por oposição, causa por causa).
2. **Mesma estrutura gramatical?** (*embora* exige subjuntivo; *apesar de* exige infinitivo/substantivo; *mas* exige oração coordenada).
3. **Mesmo destaque?** (o que prevalece continua prevalecendo?).
| Original | Substituição | Resultado |
|---|---|---|
| *Estudou, **mas** não passou.* | *Estudou, **porém** não passou.* | ✔️ preserva |
| *Estudou, **mas** não passou.* | *Estudou, **portanto** não passou.* | ❌ vira conclusão (absurdo lógico) |
| ***Embora** chovesse, saiu.* | ***Apesar de** chover, saiu.* | ✔️ preserva (ajuste para infinitivo) |
| ***Embora** chovesse, saiu.* | ***Porque** chovia, saiu.* | ❌ vira causa |
| ***Como** estava cansado, dormiu cedo.* | ***Já que** estava cansado, dormiu cedo.* | ✔️ preserva (causa) |
| ***Conforme** o edital, a prova será às 8h.* | ***Segundo** o edital, a prova será às 8h.* | ✔️ preserva (conformidade) |
| ***Caso** chova, a prova será adiada.* | ***Se** chover, a prova será adiada.* | ✔️ preserva (ajuste do verbo) |
| ***À medida que** estudava, ganhava confiança.* | ***Na medida em que** estudava…* | ⚠️ na norma-padrão, *na medida em que* é **causal** — muda o sentido |

### 6.4 Exercícios de identificação (com resposta)
1. *"Revisou todo o conteúdo, **de modo que** chegou tranquilo à prova."* → **consequência**.
2. *"**Ainda que** o salário seja bom, a rotina é desgastante."* → **concessão** (o salário bom não anula o desgaste).
3. *"O réu foi absolvido, **pois** não havia provas."* → **causa/explicação** (*pois* anteposto).
4. *"Não havia provas; o réu foi, **pois**, absolvido."* → **conclusão** (*pois* posposto).
5. *"**Quanto mais** treina, **mais** acerta."* → **proporção**.
6. Trocar *"no entanto"* por *"por conseguinte"* em *"Os índices caíram; **no entanto**, a sensação de insegurança aumentou"* preserva o sentido? → **Não**: *por conseguinte* é conclusão; destruiria o contraste.

🛡️ **Como não errar:** antes de julgar a troca, **diga em voz alta a relação** ("aqui é concessão") e só depois avalie o novo conectivo.
""" + ex(
    "Item de prova: \"No trecho 'Embora a lei seja clara, sua aplicação é falha', a substituição por 'A lei é clara, mas sua aplicação é falha' preserva o sentido original.\"",
    "Certo ou errado?",
    "**Certo.** A oração concessiva (*embora a lei seja clara*) vira a primeira coordenada, e a principal (*sua aplicação é falha*) passa para depois do *mas* — continua sendo a ideia que **prevalece**. Também se ajustou o verbo (*seja* → *é*). Se a troca fosse *'A aplicação é falha, mas a lei é clara'*, o destaque se inverteria e o sentido mudaria.",
    [Q("forum", "O juiz lê a frase da prova.", [P("juiz", "esq", "fala", "serio", "documento"), P("cidadao", "dir", "neutro", "neutro")], fala=(0, "Embora a lei seja clara...")),
     Q("forum", "O candidato converte corretamente.", [P("cidadao", "centro", "fala", "feliz")], fala=(0, "A lei é clara, MAS a aplicação é falha."))],
    "Concessão ⇄ oposição | ok",
    comp("Mas × embora", ("Mas (oposição)", "Destaca a 2ª ideia", "ok", ["Oração coordenada", "Indicativo", "A ideia após o mas prevalece"]), ("Embora (concessão)", "Fato que não impede", "alerta", ["Oração subordinada", "Subjuntivo", "A principal prevalece"])),
), ["N0024", "N0025", "N0026", "N0027"])

sec("explicacao", "Módulo 7 — Referenciação: anáfora, catáfora, pronomes e ambiguidade", r"""
### 7.1 Anáfora e catáfora
📘 **Referenciação** é o modo como o texto **retoma** ou **antecipa** ideias, garantindo a continuidade sem repetir tudo.
- **Anáfora:** retoma algo **já dito** (aponta para trás). *"O agente chegou cedo. **Ele** assumiu o plantão."* → *ele* = o agente.
- **Catáfora:** antecipa algo que **ainda será dito** (aponta para frente). *"O problema é **este**: falta efetivo."* → *este* = falta efetivo.

### 7.2 Recursos de referenciação
| Recurso | Exemplo | Referente |
|---|---|---|
| **Pronome pessoal** | *Ana revisou o edital e **o** enviou.* | o edital |
| **Pronome possessivo** | *Os candidatos levaram **seus** documentos.* | dos candidatos |
| **Demonstrativo (anafórico)** | *Faltam vagas e servidores. **Isso** preocupa.* | a falta de vagas e servidores |
| **Demonstrativo (catafórico)** | *Lembre-se **disto**: leia o comando.* | "leia o comando" |
| **Este × aquele (retomada dupla)** | *Pedro e Paulo foram aprovados; **este** em 1º, **aquele** em 5º.* | este = Paulo (o mais próximo); aquele = Pedro (o mais distante) |
| **Pronome relativo** | *O laudo **que** chegou ontem confirma a fraude.* | o laudo |
| **o qual / a qual (desfaz ambiguidade)** | *O irmão da advogada, **o qual** chegou ontem…* | o irmão (masculino) |
| **Advérbio** | *Fui a Belo Horizonte e **lá** fiz a prova.* | Belo Horizonte |
| **Sinônimo / hiperônimo** | *O **cão** fugiu. **O animal** foi encontrado.* | o cão |
| **Expressão resumitiva** | *Atrasos, falta de verba e greve: **essa situação** paralisou a obra.* | os três problemas |
| **Elipse** (omissão recuperável) | *Os agentes chegaram e Ø iniciaram a revista.* | os agentes |

### 7.3 Esse × este × aquele (uso na norma-padrão)
- **Este/esta/isto:** o que **vai ser dito** (catáfora) ou o **mais próximo** na retomada dupla; também o que está perto de quem fala.
- **Esse/essa/isso:** o que **já foi dito** (anáfora).
- **Aquele/aquela/aquilo:** o **mais distante** na retomada dupla.
⚠️ Em textos reais e em várias provas, o uso de *este* × *esse* nem sempre segue rigidamente a norma; **o contexto decide** o referente.

### 7.4 Como descobrir o referente (método)
1. Localize o pronome ou expressão.
2. Procure candidatos **antes** (anáfora) ou **depois** (catáfora).
3. Teste **concordância** (gênero e número): *a qual* só retoma termo feminino singular.
4. **Substitua** o pronome pelo candidato e leia a frase: o sentido se mantém?
5. Desconfie de **expressões resumitivas** (*essa medida, tal situação*) — muitas vezes retomam **uma ideia inteira**, não uma palavra.

### 7.5 Ambiguidade referencial
🧪 *"O delegado conversou com o agente sobre **sua** promoção."* → promoção **de quem**? Do delegado ou do agente? Ambíguo.
✔️ Correções: *"…sobre a promoção **deste**"* (do agente) ou *"…sobre a **própria** promoção"* (do delegado).
🧪 *"A filha da vizinha, **que** é médica, chegou."* → quem é médica? Ambíguo. ✔️ *"…a **qual** é médica"* não resolve (ambas femininas) — reescreva: *"A filha, médica, da vizinha…"*.
🚨 **Pegadinha:** a banca indica como referente o termo **mais próximo** do pronome — mas o referente correto é outro, identificado pela concordância ou pelo sentido.
✍️ **Fixação:** *"O governo anunciou novas vagas e o sindicato criticou **a medida**."* → *a medida* retoma **o anúncio de novas vagas** (expressão resumitiva).
""" + ex(
    "Texto: \"A fiscalização apreendeu celulares e drogas na unidade. Segundo a direção, esses itens entraram pelo muro dos fundos, o qual será reforçado.\"",
    "A que se referem \"esses itens\" e \"o qual\"?",
    "**\"Esses itens\"** é expressão resumitiva anafórica: retoma **celulares e drogas**. **\"O qual\"** retoma **o muro dos fundos** (masculino singular) — não *a unidade*, nem *a direção* (femininos). O teste de concordância resolve a dúvida.",
    [Q("delegacia", "A direção explica a apreensão.", [P("delegado", "esq", "fala", "serio", "documento"), P("servidor", "dir", "neutro", "neutro")], fala=(0, "Esses itens entraram pelo muro.")),
     Q("delegacia", "O servidor checa a concordância.", [P("servidor", "centro", "aponta", "feliz")], fala=(0, "\"O qual\" = o muro!"))],
    "Referente pela concordância | ok",
    fluxo("Achando o referente", [("Localize o pronome", "neutro"), ("Busque candidatos antes/depois", "neutro", "anáfora/catáfora"), ("Teste gênero e número", "alerta"), ("Substitua e releia", "ok")], ("Expressão resumitiva retoma ideias inteiras", "alerta")),
), ["N0028", "N0029", "N0030", "N0031"])

sec("explicacao", "Módulo 8 — Coesão, coerência e progressão textual", r"""
### 8.1 Coesão
📘 **Coesão** é a **ligação gramatical e lexical** entre as partes do texto — as "costuras" visíveis na superfície.
- **Coesão referencial:** retomadas por pronomes, sinônimos, elipses, expressões resumitivas (Módulo 7).
- **Coesão sequencial:** encadeamento por **conectivos** e por relações de tempo e lógica (Módulo 6).
- **Coesão lexical:** **repetição** intencional (para ênfase) e **substituição** por sinônimos, hiperônimos ou expressões equivalentes.

### 8.2 Coerência
📘 **Coerência** é a **lógica do sentido**: as ideias não se contradizem, combinam com o mundo de referência do texto e formam um todo com **unidade**.
⚠️ **Um texto pode ter conectivos (coesão) e ainda ser incoerente.**
🧪 Incoerente: *"Choveu o dia inteiro; **portanto**, o chão ficou seco."* — o conectivo existe, mas a relação de conclusão é absurda.
🧪 Incoerente: *"O candidato nunca estudou português. **Além disso**, ele é professor de português há dez anos."* — contradição.
🧪 Coerente sem conectivo explícito: *"Chovia muito. A estrada fechou."* — a relação causal é recuperada pelo leitor.

### 8.3 Princípios da coerência (base para analisar trechos)
| Princípio | O que exige | Problema típico |
|---|---|---|
| **Não contradição** | Ideias compatíveis entre si | Afirmar e negar o mesmo |
| **Relação/pertinência** | Ideias ligadas ao tema | Parágrafo que "foge" do assunto |
| **Progressão** | Acrescentar informação nova | Texto que só repete a mesma ideia |
| **Continuidade (repetição)** | Retomar o que foi dito | Saltos sem ligação |

### 8.4 Progressão temática e relação entre parágrafos
📘 **Progressão temática:** o texto avança somando informação nova ao que já foi dado (o "dado" retomado + o "novo" acrescentado).
🧪 *"O concurso abriu 600 vagas. **Essas vagas** serão distribuídas em 20 cidades. **As cidades** do interior concentram metade delas."* → cada frase retoma algo e acrescenta novidade.
📘 **Relação entre parágrafos:** cada parágrafo cumpre uma função (introduzir, argumentar, exemplificar, contra-argumentar, concluir). Em prova: "O 3º parágrafo, em relação ao 2º, apresenta… (um exemplo / uma objeção / uma consequência)".
📘 **Encadeamento de ideias:** a passagem de um parágrafo a outro costuma ser marcada por conectivos ou retomadas (*Diante disso…, Por outro lado…, Esse cenário…*).
📘 **Unidade de sentido:** tudo converge para o tema e a ideia central.

### 8.5 Trechos coerentes × incoerentes (com causa)
| Trecho | Coerente? | Por quê |
|---|---|---|
| *A unidade recebeu novas viaturas; por isso, o patrulhamento aumentou.* | ✔️ | Conclusão plausível |
| *A unidade recebeu novas viaturas; por isso, o patrulhamento diminuiu.* | ❌ | Conclusão contrária à lógica (sem explicação adicional) |
| *Embora estivesse com febre, foi trabalhar.* | ✔️ | Concessão adequada |
| *Embora estivesse saudável, foi trabalhar.* | ❌ | Não há expectativa contrária a ser vencida |
| *O suspeito fugiu a pé. Horas depois, o veículo dele foi encontrado abandonado longe dali.* | ⚠️ | Coerente se o texto admitir que ele usou o veículo antes; incoerente se disse que fugiu **só** a pé — depende do todo |
🛡️ **Como não errar:** coesão = **costura** (conectivos, pronomes); coerência = **sentido** (lógica). Avalie as duas separadamente.
✍️ **Fixação:** *"Ele é muito rico, mas mora numa mansão."* → **incoerente**: o *mas* sugere contraste, mas morar numa mansão é **esperado** para quem é rico.
""" + ex(
    "Trecho de redação: \"A segurança pública melhorou muito no bairro. Os moradores, portanto, passaram a evitar sair à noite com medo de assaltos.\"",
    "O trecho tem coesão? Tem coerência?",
    "**Tem coesão** (há retomada e o conectivo *portanto*), **mas não tem coerência**: se a segurança melhorou, o esperado seria os moradores saírem **mais**, não menos. O *portanto* cria uma conclusão **contraditória** com a premissa. Correção possível: *\"…Os moradores, portanto, voltaram a sair à noite.\"* ou trocar a premissa.",
    [Q("escola", "O professor corrige a redação.", [P("professor", "esq", "fala", "surpreso", "documento"), P("cidadao", "dir", "neutro", "neutro")], fala=(0, "Melhorou... e o medo aumentou?")),
     Q("escola", "O aluno entende o problema.", [P("cidadao", "centro", "fala", "triste")], fala=(0, "Tem conectivo, mas falta lógica!"))],
    "Coesão ≠ coerência | erro",
    comp("Coesão × coerência", ("Coesão", "Costura", "ok", ["Conectivos", "Pronomes e retomadas", "Superfície do texto"]), ("Coerência", "Sentido", "alerta", ["Não contradição", "Progressão e unidade", "Lógica com o mundo"])),
), ["N0032", "N0033", "N0034", "N0035"])
m("Conectivos e relações de sentido", 7, 8)
m("Referenciação", 9)
m("Coesão, coerência e progressão textual", 10)
