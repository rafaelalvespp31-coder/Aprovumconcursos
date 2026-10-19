from helpers import sec, ex, P, Q, fluxo, comp, m

# ---------------------------------------------------------------- Card 6 — Veja na prática
sec("exemplos", "Casos práticos: escrito, inferível, não concluível ou extrapolação?", r"""
Para cada texto, classifique as afirmações. As respostas vêm logo abaixo.

**Caso 1 — O plantão.** *"O agente Marcos voltou a trabalhar no turno da noite depois de dois anos na administração."*
→ "Marcos trabalhava no turno da noite antes de ir para a administração": **inferível** (pressuposto de *voltou a*). "Marcos prefere o turno da noite": **não concluível**. "Marcos ficou dois anos na administração": **escrito**.

**Caso 2 — A obra.** *"A reforma da escola, iniciada em março, ainda não terminou."*
→ "A reforma começou em março": **escrito**. "Esperava-se que a reforma já tivesse terminado": **inferível** (o *ainda* cria expectativa de término). "A reforma está atrasada por falta de verba": **extrapolação** (o motivo não é dado).

**Caso 3 — O índice.** *"Alguns bairros registraram queda nos roubos no último trimestre."*
→ "Houve queda de roubos em parte dos bairros": **escrito/paráfrase fiel**. "A cidade toda ficou mais segura": **extrapolação** (generalização de *alguns*). "Houve bairros sem queda": **inferível** (o *alguns* sugere que não foram todos).

**Caso 4 — A fala.** *"Segundo o secretário, as novas viaturas vão reduzir o tempo de resposta."*
→ "O secretário prevê redução no tempo de resposta": **escrito**. "O autor do texto garante que o tempo de resposta cairá": **distorção** (a previsão é **do secretário**). "As viaturas já reduziram o tempo de resposta": **contradição temporal** (*vão reduzir* = futuro).

**Caso 5 — A conclusão apressada.** *"Desde que a praça foi iluminada, as famílias voltaram a frequentá-la à noite."*
→ "A praça passou a ser iluminada": **inferível** (*desde que foi iluminada*). "Antes, as famílias frequentavam a praça à noite": **inferível** (*voltaram a*). "A iluminação acabou com a criminalidade no bairro": **extrapolação**.

**Caso 6 — A ressalva.** *"O curso melhorou o desempenho da maioria dos alunos, embora alguns não tenham apresentado avanço."*
→ "Todos os alunos melhoraram": **contradição**. "A maioria melhorou": **escrito**. "O curso é ineficaz": **contradição** (a ressalva não anula o resultado principal).

**Caso 7 — O e-mail.** *"Os documentos devem ser entregues até sexta, salvo para quem já os enviou digitalmente."*
→ "Quem enviou digitalmente não precisa entregar até sexta": **inferível/explícito** (*salvo*). "Todos devem entregar até sexta": **generalização** (ignora *salvo*).

**Caso 8 — A charge.** Personagem engravatado diz "A saúde vai muito bem!" enquanto, ao fundo, pacientes aguardam em macas no corredor.
→ "A charge critica a distância entre o discurso oficial e a realidade": **inferível** (relação imagem × fala). "O personagem é médico": **não concluível**.
""" + ex(
    "Texto: \"Muitos candidatos deixam a redação para a última hora, embora ela possa valer até 40% da nota.\"",
    "Classifique: (a) a redação pode valer até 40%; (b) a redação sempre vale 40%; (c) o autor considera arriscado deixar a redação para depois; (d) a maioria dos candidatos é reprovada na redação.",
    "(a) **Escrito**. (b) **Generalização/distorção** — *pode valer até* ≠ *sempre vale*. (c) **Inferível** — a concessão (*embora…*) mostra que o autor vê contradição entre o peso da redação e a atitude dos candidatos. (d) **Extrapolação** — o texto não fala de reprovação, e *muitos* ≠ *a maioria*.",
    [Q("escola", "O professor apresenta a frase.", [P("professor", "esq", "fala", "serio", "documento"), P("cidadao", "dir", "neutro", "neutro")], fala=(0, "Pode valer ATÉ 40%.")),
     Q("escola", "O aluno separa escrito e inferido.", [P("cidadao", "centro", "fala", "feliz")], fala=(0, "\"Pode até\" não é \"sempre\"!"))],
    "Classifique antes de marcar | ok",
    fluxo("Classificação em 4 caixas", [("Está escrito?", "ok", "Explícito"), ("Uma pista autoriza?", "ok", "Inferível"), ("Falta base?", "alerta", "Não concluível"), ("Acrescenta ou generaliza?", "erro", "Extrapolação")]),
), ["N0004", "N0011", "N0012", "N0013", "N0005", "N0043"])

sec("aplicacao", "Aplicação guiada: conectivos, referentes e gêneros em questões de prova", r"""
**Aplicação 1 — Relação de sentido.** *"O efetivo foi reforçado; consequentemente, as fugas diminuíram."*
→ *Consequentemente* = **conclusão/consequência**. Troca por *por isso*: ✔️ preserva. Troca por *no entanto*: ❌ (oposição: absurdo lógico).

**Aplicação 2 — Concessão.** *"Mesmo que o prazo seja curto, a equipe entregará o relatório."*
→ **Concessão**. Reescrita com *apesar de*: *"Apesar de o prazo ser curto, a equipe entregará o relatório."* ✔️ (verbo no infinitivo).

**Aplicação 3 — Referente.** *"A diretora conversou com a psicóloga e lhe pediu um parecer sobre o caso, que já se arrastava há meses."*
→ *lhe* = **à psicóloga** (quem recebe o pedido). *que* = **o caso** (é o caso que se arrastava; o parecer ainda não existia).

**Aplicação 4 — Catáfora.** *"O recado foi este: ninguém sai sem autorização."*
→ *este* antecipa **"ninguém sai sem autorização"** (catáfora).

**Aplicação 5 — Gênero.** Texto com título, data, local, "Fica estabelecido que…", itens numerados, prazos e requisitos, assinado por uma secretaria → **edital/comunicado oficial** (normativo, institucional).

**Aplicação 6 — Tipo textual dentro do gênero.** Uma reportagem traz: (1) relato de uma operação; (2) descrição do local; (3) dados estatísticos explicados; (4) opinião de um especialista entrevistado. → Tipos: **narração** (1), **descrição** (2), **exposição** (3); (4) é **argumentação da fonte**, não do repórter.

**Aplicação 7 — Modalização.** *"É possível que a prova seja adiada."* → alternativa *"o texto informa que a prova será adiada"*: ❌ troca **possibilidade** por **certeza**.

**Aplicação 8 — Coerência.** *"Ele nunca faltou ao trabalho; por isso, recebeu advertência por faltas."* → **incoerente**: a conclusão contradiz a premissa.

**Aplicação 9 — Intertexto.** Um anúncio de cursinho: *"Penso, logo passo."* → **paródia** (alusão a frase filosófica conhecida, com o sentido transformado para o contexto de concursos, gerando humor).

**Aplicação 10 — Linguagem não verbal.** Gráfico em que o eixo vertical começa em 90 (e não em zero) mostra duas barras, 92 e 96. Alternativa: "o índice B é mais que o dobro do A". → ❌ A escala distorce a percepção; 96 é cerca de 4% maior que 92.
""", ["N0023", "N0024", "N0025", "N0027", "N0029", "N0030", "N0008", "N0009", "N0020", "N0034", "N0046", "N0042"])

# ---------------------------------------------------------------- Card 7 — Atenção à banca
sec("interpretacao_banca", "Módulo 13 — As 14 pegadinhas das bancas (com técnica para escapar)", r"""
Para cada armadilha: **definição · texto · alternativa errada · por que erra · alternativa correta · técnica.**

**1. Extrapolação** — acrescenta informação não autorizada.
Texto: *"O número de vagas aumentou."* ✗ *"O governo investiu mais em segurança."* → o texto não fala de investimento. ✔ *"Há mais vagas do que antes."* 🛡️ Pergunte: "onde está escrito?".

**2. Redução** — ignora parte importante do texto.
Texto: *"O curso melhora a técnica e a segurança do agente."* ✗ *"O curso melhora a técnica do agente"* como **resumo completo**. → omitiu metade da ideia. ✔ *"O curso traz ganhos técnicos e de segurança."* 🛡️ Em perguntas de síntese, confira se **todas** as partes estão presentes.

**3. Inversão** — altera a relação entre as ideias.
Texto: *"A falta de sono prejudica a memória."* ✗ *"A falta de memória prejudica o sono."* ✔ *"Dormir mal compromete a memória."* 🛡️ Marque quem age sobre quem.

**4. Generalização** — torna universal o que é limitado.
Texto: *"Alguns concursos exigem teste físico."* ✗ *"Concursos exigem teste físico."* ✔ *"Há concursos que exigem teste físico."* 🛡️ Circule quantificadores.

**5. Contradição** — afirma o oposto.
Texto: *"A medida não reduziu as filas."* ✗ *"A medida reduziu as filas."* ✔ *"As filas permaneceram apesar da medida."* 🛡️ Leia o **não** duas vezes.

**6. Troca de causa e consequência.**
Texto: *"Como a estrada foi interditada, o ônibus atrasou."* ✗ *"A estrada foi interditada porque o ônibus atrasou."* ✔ *"O atraso decorreu da interdição."* 🛡️ Pergunte: "o que veio primeiro?".

**7. Confusão entre tese e argumento.**
Texto: *"A câmera corporal deve ser obrigatória, pois reduz denúncias falsas."* ✗ *"A tese é que câmeras reduzem denúncias falsas."* ✔ *"A tese é a obrigatoriedade; a redução de denúncias é argumento."* 🛡️ Tese = posição; argumento = razão.

**8. Opinião do autor × fala de personagem ou fonte.**
Texto: *"Para o sindicato, o reajuste é insuficiente."* ✗ *"O autor considera o reajuste insuficiente."* ✔ *"O sindicato avalia o reajuste como insuficiente."* 🛡️ Sublinhe *segundo, para, de acordo com, afirma*.

**9. Alteração do sentido de conectivos.**
Texto: *"Embora caro, o curso é bom."* ✗ *"Porque é caro, o curso é bom."* ✔ *"O curso é caro, mas é bom."* 🛡️ Nomeie a relação antes de avaliar a troca.

**10. Desconsideração de negações.**
Texto: *"Não é verdade que todos os candidatos estudam pouco."* ✗ *"Todos os candidatos estudam pouco."* ✔ *"Há candidatos que não estudam pouco."* 🛡️ Negações duplas e "não é verdade que" invertem o sentido: reescreva com calma.

**11. Desconsideração de palavras restritivas** (*apenas, alguns, nem sempre, principalmente, quase*).
Texto: *"O frio afeta principalmente os idosos."* ✗ *"O frio afeta apenas os idosos."* ✔ *"Os idosos são os mais afetados pelo frio."* 🛡️ *Principalmente* ≠ *apenas*; *nem sempre* ≠ *nunca*.

**12. Inferência excessiva.**
Texto: *"Após a reforma, o número de visitantes da biblioteca cresceu."* ✗ *"A reforma foi a causa do crescimento."* ✔ *"O crescimento ocorreu depois da reforma."* 🛡️ Sucessão no tempo **não prova** causa.

**13. Leitura isolada de frase que depende do contexto.**
Texto: *"Ótimo trabalho!", disse o chefe, olhando o relatório cheio de erros.* ✗ *"O chefe elogiou sinceramente o relatório."* ✔ *"O chefe foi irônico."* 🛡️ Releia o parágrafo inteiro antes de interpretar uma frase.

**14. Alternativa parcialmente correta, mas que não responde ao comando.**
Comando: *"O objetivo principal do texto é…"* ✗ uma informação **verdadeira**, porém secundária. ✔ a finalidade central (informar, alertar, convencer). 🛡️ Releia o comando antes de marcar.

### Como as bancas cobram interpretação (tendências de estilo)
- **Cebraspe (Cebraspe/CESPE):** itens de **certo/errado** com reescritas ("preserva o sentido e a correção") e inferências sutis; uma única palavra (*apenas, sempre, pode*) decide o item.
- **FGV:** textos longos, alternativas extensas e parecidas; cobra **tese, intenção, relação entre parágrafos** e sentido de conectivos em contexto.
- **VUNESP:** questões objetivas sobre **informação explícita, sentido de palavras e expressões**, conectivos e reescritas.
- **AOCP, IBFC, IBADE, SELECON:** combinam interpretação com **gêneros**, **figuras** e **referenciação**; frequentemente trazem charges e tiras.
⚠️ Essas são **tendências de estilo** observadas em provas, não regras fixas: cada edital e cada banca podem variar.
""", ["N0049", "N0050", "N0051", "N0052", "N0005", "N0016", "N0024", "N0021"])

sec("pegadinhas", "Pegadinhas para julgar: certo ou errado?", r"""
**Pegadinha 1 — Inferência (fácil).** No trecho "Ana voltou a estudar inglês", infere-se que Ana já havia estudado inglês antes.
→ **Certo.** *Voltar a* pressupõe que a ação já ocorreu e foi interrompida.

**Pegadinha 2 — Generalização (fácil).** Se o texto diz "alguns agentes foram promovidos", é correto concluir que a maioria dos agentes foi promovida.
→ **Errado.** *Alguns* não equivale a *a maioria*; a conclusão generaliza.

**Pegadinha 3 — Gênero (fácil).** Um texto deve ser classificado como notícia sempre que tratar de um fato real e atual.
→ **Errado.** O assunto não define o gênero: o fato pode aparecer em editorial, charge, crônica, campanha.

**Pegadinha 4 — Tipo textual (médio).** O uso de verbos no imperativo é suficiente para classificar um texto como injuntivo.
→ **Errado.** O imperativo também aparece na propaganda a serviço da persuasão; é preciso analisar a finalidade predominante.

**Pegadinha 5 — Pressuposto (médio).** Em "O índice de evasão continua alto", pressupõe-se que o índice já era alto anteriormente.
→ **Certo.** *Continuar* pressupõe a permanência de um estado anterior.

**Pegadinha 6 — Subentendido (médio).** O subentendido é uma informação marcada por uma palavra específica da frase e não pode ser negado pelo falante.
→ **Errado.** Essa é a descrição do pressuposto. O subentendido depende do contexto e pode ser negado.

**Pegadinha 7 — Tese (médio).** Em um texto argumentativo, a primeira frase sempre apresenta a tese do autor.
→ **Errado.** O autor pode abrir com uma opinião que vai refutar; a tese costuma ser indicada por conectivos de conclusão ou oposição.

**Pegadinha 8 — Modalização (médio).** Se o texto diz que uma medida "pode reduzir" a criminalidade, é correto afirmar que o autor garante essa redução.
→ **Errado.** *Pode* indica possibilidade, não certeza.

**Pegadinha 9 — Conectivo (médio).** Em "Estudou muito, mas não foi aprovado", a substituição de "mas" por "portanto" preserva o sentido.
→ **Errado.** *Portanto* indica conclusão; a relação de oposição desaparece e o período fica ilógico.

**Pegadinha 10 — Concessão (difícil).** "Embora tenha chovido, o jogo aconteceu" pode ser reescrito como "Choveu, mas o jogo aconteceu", sem prejuízo do sentido.
→ **Certo.** A concessiva vira a primeira coordenada, e a ideia que prevalece (o jogo aconteceu) fica após o *mas*.

**Pegadinha 11 — Concessão (difícil).** "Embora tenha chovido, o jogo aconteceu" equivale a "O jogo aconteceu, mas choveu".
→ **Errado.** Inverte o destaque: agora a ideia que prevalece é *choveu*.

**Pegadinha 12 — Proporção (difícil).** "À medida que" e "na medida em que" são sempre intercambiáveis na norma-padrão.
→ **Errado.** *À medida que* exprime proporção; *na medida em que*, causa.

**Pegadinha 13 — Referente (médio).** Em uma retomada dupla, "este" refere-se ao termo mais distante e "aquele" ao mais próximo.
→ **Errado.** É o contrário: *este* retoma o mais próximo; *aquele*, o mais distante.

**Pegadinha 14 — Coesão × coerência (médio).** A presença de conectivos garante a coerência de um texto.
→ **Errado.** Um texto pode ter conectivos e ser incoerente (ex.: *choveu; portanto, o chão ficou seco*).

**Pegadinha 15 — Figuras (fácil).** Em "Já te avisei mil vezes", há hipérbole.
→ **Certo.** Exagero intencional para dar ênfase.

**Pegadinha 16 — Figuras (difícil).** Em "um silêncio ensurdecedor" há antítese, pois são apresentadas ideias opostas lado a lado.
→ **Errado.** É paradoxo (oxímoro): ideias opostas fundidas na mesma expressão.

**Pegadinha 17 — Ironia (médio).** A ironia só pode ser identificada quando o autor a anuncia expressamente.
→ **Errado.** A ironia se percebe pelo contexto (contradição entre o dito e a situação, aspas, exagero).

**Pegadinha 18 — Multissemiose (médio).** Em uma charge, a imagem tem função apenas decorativa, e o sentido deve ser buscado somente no texto verbal.
→ **Errado.** Na charge, o sentido nasce da relação entre imagem e texto; a imagem pode contradizer ou ironizar a fala.

**Pegadinha 19 — Paródia (médio).** Toda retomada de um texto conhecido é uma paródia.
→ **Errado.** Se o sentido é mantido, há paráfrase, citação ou alusão; paródia subverte o sentido.

**Pegadinha 20 — Fonte citada (difícil).** Em "Para o sindicato, o reajuste é insuficiente", o autor do texto expressa sua própria opinião sobre o reajuste.
→ **Errado.** A opinião é atribuída ao sindicato (fonte citada), não ao autor.

**Pegadinha 21 — Restritivos (difícil).** "O frio afeta principalmente os idosos" autoriza concluir que o frio afeta apenas os idosos.
→ **Errado.** *Principalmente* indica maior incidência, não exclusividade.

**Pegadinha 22 — Causa (difícil).** Se um fato ocorreu depois de outro, o texto autoriza concluir que o primeiro causou o segundo.
→ **Errado.** Sucessão temporal não comprova causa; essa conclusão é inferência excessiva.
""", ["N0012", "N0050", "N0007", "N0008", "N0016", "N0020", "N0024", "N0026", "N0030", "N0034", "N0038", "N0021", "N0043", "N0046", "N0051", "N0052"])

# ---------------------------------------------------------------- Card 8 — flashcards
sec("flashcards", "Flashcards de revisão", r"""
**Compreensão × interpretação?**
→ Compreensão: o que está **expresso**. Interpretação: conclusões **autorizadas** pelas pistas.

**Gênero × tipo textual?**
→ Gênero: forma social (notícia, edital). Tipo: modo de organização (narrar, descrever, expor, argumentar, instruir).

**Quais são os cinco tipos textuais?**
→ Narração, descrição, exposição, argumentação e injunção.

**Pressuposto × subentendido?**
→ Pressuposto: marcado na frase e resiste à negação. Subentendido: depende do contexto e pode ser negado.

**O que pressupõe "voltou a"?**
→ Que a ação já ocorreu antes e foi interrompida.

**Inferência × extrapolação?**
→ Inferência tem pista no texto; extrapolação vai além do que o texto autoriza.

**Tema × ideia central?**
→ Tema: o recorte discutido. Ideia central: o que o texto diz principalmente sobre esse recorte.

**Tese × argumento?**
→ Tese: o que se defende. Argumento: por que se defende.

**Fato × opinião?**
→ Fato é verificável (mesmo que falso); opinião é juízo de valor.

**"Pode", "deve", "certamente": o que indicam?**
→ Possibilidade, obrigação e certeza (modalização).

**Mas × embora?**
→ *Mas*: oposição, a ideia seguinte prevalece. *Embora*: concessão, fato que não impede o principal.

**"Pois" anteposto × posposto ao verbo?**
→ Anteposto: causa/explicação. Posposto (entre vírgulas): conclusão.

**À medida que × na medida em que?**
→ Proporção × causa (norma-padrão).

**Anáfora × catáfora?**
→ Anáfora retoma o que veio antes; catáfora antecipa o que virá.

**Coesão × coerência?**
→ Coesão: costura gramatical. Coerência: lógica do sentido.

**Antítese × paradoxo?**
→ Antítese: opostos lado a lado. Paradoxo: opostos fundidos no mesmo ser.

**Paráfrase × paródia?**
→ Paráfrase mantém o sentido; paródia o subverte (humor/crítica).

**O que fazer primeiro numa questão de interpretação?**
→ Ler o **comando**.
""", ["N0003", "N0007", "N0008", "N0012", "N0013", "N0015", "N0016", "N0019", "N0020", "N0024", "N0025", "N0026", "N0029", "N0034", "N0038", "N0046", "N0048"])

# ---------------------------------------------------------------- Card 9 — resumo, checklist (desafio final), referências
sec("resumo", "Resumo final", r"""
1. **Texto** = sentido + contexto + finalidade + leitor. **Compreender** é ver o que está expresso; **interpretar** é concluir com base nas pistas.
2. **Gênero** é a forma social (notícia, edital, charge); **tipo** é a organização (narrar, descrever, expor, argumentar, instruir). Um gênero combina tipos; o **assunto não define o gênero**.
3. **Explícito** está escrito; **implícito** tem pista. **Pressuposto** está na frase (*voltou a, deixou de, ainda*); **subentendido** está no contexto. Sem pista = **extrapolação**.
4. **Assunto** → **tema** → **ideia central** → **tese**. Tese é o que se defende; **argumento**, por quê.
5. **Fato** é verificável; **opinião** é juízo de valor. Atenção a adjetivos, advérbios, **modalizadores** e **ironia**.
6. **Conectivos** definem relações — e o contexto define o conectivo. **Mas** (oposição) × **embora** (concessão); **pois** anteposto × posposto; **à medida que** (proporção) × **na medida em que** (causa).
7. **Referenciação:** anáfora retoma, catáfora antecipa; teste a concordância para achar o referente.
8. **Coesão** é costura; **coerência** é sentido — conectivo não garante lógica.
9. **Conotação** e **figuras** se interpretam pelo **efeito**; **ambiguidade** pode ser lexical ou sintática.
10. Em textos **multissemióticos**, imagem e texto se completam, reforçam, contradizem ou ironizam.
11. **Paráfrase** mantém, **paródia** subverte; use as pistas do enunciado antes da memória.
12. **Método:** comando → gênero → centro → palavras-chave → expresso × inferido → comparar → eliminar → responder exatamente.
""", ["N0001", "N0006", "N0010", "N0014", "N0018", "N0022", "N0028", "N0032", "N0036", "N0040", "N0044", "N0048"])

sec("checklist", "Módulos 15 e 16 — Questões, desafio final e checklist de domínio", r"""
### Como funcionam as questões e o desafio final desta aula
- **Questões autorais (Módulo 15):** o card **Questões de fixação** traz **25 questões inéditas** de múltipla escolha (A a E), elaboradas para o APROVUM no estilo das bancas — **não** são questões oficiais. São três níveis: **fácil → médio → difícil**.
- **Correção:** o gabarito **só aparece depois** que você responde. Cada questão mostra a explicação da alternativa correta, o comentário de **cada alternativa errada**, o **conceito cobrado**, a **pegadinha** usada e uma **dica de prova**.
- **Desafio final (Módulo 16):** o nível **difícil** funciona como simulado final. A plataforma registra suas respostas, calcula o percentual de acertos de cada nível e libera o nível seguinte conforme as **regras de domínio do APROVUM**: é preciso acertar **pelo menos 90%** de cada nível. Depois, a aula entra nas **revisões espaçadas**, em que você volta às questões.
- **Progresso:** cada card concluído fica marcado no topo da aula (anel de % por card); a aula conta como estudada quando você conclui a leitura dos cards e é aprovado nos três níveis.

### Checklist de domínio — marque mentalmente cada item
- [ ] Sei diferenciar **compreensão** de **interpretação** e leio o **comando** antes do texto.
- [ ] Distingo **gênero** de **tipo** e identifico os cinco tipos pelas marcas linguísticas.
- [ ] Reconheço os principais **gêneros** pela finalidade, forma e circulação — não pelo assunto.
- [ ] Separo **explícito**, **inferível**, **não concluível** e **extrapolação**.
- [ ] Identifico **pressupostos** (*voltar a, deixar de, continuar, passar a, perceber, ainda*) e **subentendidos**.
- [ ] Extraio **assunto, tema, ideia central, tese, argumentos, intenção e público-alvo**.
- [ ] Separo **fato** de **opinião** e reconheço **modalizadores** e **ironia**.
- [ ] Domino as relações dos **conectivos** e julgo se uma **substituição** preserva o sentido.
- [ ] Converto **concessão ⇄ oposição** sem inverter o destaque.
- [ ] Encontro o **referente** de pronomes, relativos e expressões resumitivas.
- [ ] Diferencio **coesão** de **coerência** e reconheço incoerências.
- [ ] Interpreto **figuras de linguagem** pelo efeito e desfaço **ambiguidades**.
- [ ] Leio **charges, tiras, gráficos e infográficos** relacionando imagem e texto.
- [ ] Distingo **citação, alusão, paráfrase e paródia**.
- [ ] Reconheço as **14 pegadinhas** e aplico o **método de 8 passos**.
- [ ] Fui aprovado nos três níveis de questões desta aula.

**Errou questões?** Volte ao módulo indicado no comentário (conceito cobrado), releia o card correspondente e refaça o nível nas revisões.
""", ["N0054", "N0055", "N0048", "N0049"])

sec("referencias", "Referências e conferência das fontes", r"""
**Fontes consultadas nesta preparação (conferidas em 19/10/2026):**
- COSTA VAL, Maria da Graça. *Gêneros textuais* (apresentação, Pnaic, jul. 2013). Faculdade de Letras/UFMG e Ceale — FaE/UFMG. Distinção entre gênero textual (forma relativamente estável ligada a situações sociais: tema, forma composicional e estilo) e aspectos tipológicos. Disponível em: [cake.ceale.fae.ufmg.br — Gêneros textuais (PDF)](https://cake.ceale.fae.ufmg.br/files/uploads/palestras_do_pnaic/generos_graca_val_jul_2013.pdf)
- PODER JUDICIÁRIO DE SANTA CATARINA (TJSC). *Aprofundando a coesão textual* — seção "Dicas de português" (cita GARCEZ, Lucília H. do Carmo. *Técnica de redação*. São Paulo: Martins Fontes, 2012). Coesão referencial, lexical, elipse e substituição. Disponível em: [tjsc.jus.br — Aprofundando a coesão textual](https://www.tjsc.jus.br/web/servidor/dicas-de-portugues/-/asset_publisher/0rjJEBzj2Oes/content/aprofundando-a-coesao-textual)
- SIMON, Maria Lúcia Mexias. *A construção do texto: coesão e coerência textuais*. I Simpósio de Estudos Filológicos e Linguísticos (CiFEFiL/FFP-UERJ, 2008). Mecanismos de coesão e princípios de coerência (repetição, progressão, não contradição, relação). Disponível em: [biblio.direito.ufmg.br — A construção do texto (PDF)](https://biblio.direito.ufmg.br/wp-content/uploads/2020/07/a_construcao_de_texto.pdf)
- NOVA ESCOLA. *Propostas em Língua Portuguesa da BNCC focam na gramática e nos gêneros digitais*. Organização da BNCC em práticas de linguagem (leitura, produção de textos, oralidade, análise linguística/semiótica), campos de atuação e centralidade do texto e dos gêneros. Disponível em: [novaescola.org.br — BNCC: Língua Portuguesa](https://novaescola.org.br/bncc/conteudo/22/propostas-em-lingua-portuguesa-da-bncc-focam-na-gramatica-e-nos-generos-digitais)

**Documento oficial de referência (não acessado diretamente nesta preparação):**
- BRASIL. Ministério da Educação. *Base Nacional Comum Curricular* (BNCC), 2018 — [basenacionalcomum.mec.gov.br](http://basenacionalcomum.mec.gov.br/). ⚠️ A BNCC é referência **educacional** da educação básica, **não** é edital de concurso: o conteúdo cobrado em cada prova é o do respectivo edital.

**Observações:**
- Os conceitos de pressuposto/subentendido, coesão/coerência, gênero/tipo e as figuras de linguagem seguem a terminologia consolidada da linguística textual e das gramáticas escolares; quando há variação de nomenclatura entre autores e bancas, a aula indica.
- As "tendências de estilo" das bancas são observações gerais de cobrança, **não** regras oficiais.
- Todos os textos-base, exemplos e questões são **autorais** (criados para o APROVUM); nenhuma questão é oficial.
""", ["N0001", "N0007", "N0033", "N0034"])
m("Casos práticos", 22, 23)
m("Pegadinhas das bancas", 24, 25)
m("Revisão final", 26, 27, 28, 29)
