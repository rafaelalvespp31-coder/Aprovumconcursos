from lib import build

M1 = ("1.2.2 Devido processo legal, contraditório e ampla defesa", [
("explicacao", "Devido processo legal: o princípio-mãe", """
**Fundamento:** CF, art. 5º, **LIV** ("ninguém será privado da liberdade ou de seus bens sem o devido processo legal"). Tem duas faces:
- **Formal (procedimental):** observância das regras do procedimento, com atos regulares, juiz competente, publicidade, prazos, defesa.
- **Material (substantiva):** razoabilidade e proporcionalidade das normas e decisões; vedação ao arbítrio.

Dele decorrem quase todos os demais princípios. Nenhuma sanção penal pode ser imposta sem o devido processo (*nulla poena sine judicio*).

**Contraditório e ampla defesa (CF, art. 5º, LV)** — "aos litigantes, em processo judicial ou administrativo, e aos acusados em geral são assegurados o contraditório e ampla defesa, com os meios e recursos a ela inerentes."

**Contraditório = informação + possibilidade de reação.** Binômio **ciência e participação**. Manifesta-se como:
- direito de ser **citado** e intimado dos atos;
- direito de **manifestar-se** sobre as provas e alegações da parte contrária;
- direito de **produzir provas** e participar da sua produção (reperguntas);
- **última palavra à defesa** (alegações finais da defesa depois da acusação; no caso de colaboração premiada, o delatado se manifesta após o delator — STF, HC 166.373).

**Ampla defesa = defesa técnica + autodefesa + direito de utilizar todos os meios.**

| Componente | Conteúdo | Observação |
|---|---|---|
| **Defesa técnica** | Patrocínio por advogado ou defensor | **Indisponível e obrigatória**: réu não pode abrir mão; juiz nomeia defensor se o réu não constituir (CPP, art. 261) |
| **Autodefesa** | Direito de presença, de audiência (interrogatório) e de postulação pessoal | **Disponível**: o réu pode não comparecer; silêncio |
| **Efetividade** | Defesa precisa ser **real**, não meramente formal | Súmula 523/STF: no processo penal, a falta da defesa constitui nulidade absoluta, mas a sua **deficiência** só o anulará se houver prova de prejuízo para o réu |
| **Direito ao silêncio** | CF, art. 5º, LXIII; CPP, art. 186 | O silêncio **não importa confissão** nem pode ser interpretado em prejuízo da defesa |
| **Vedação à autoincriminação (*nemo tenetur se detegere*)** | Ninguém é obrigado a produzir prova contra si | Inclui: não fornecer padrões gráficos, não soprar etilômetro, não participar de reprodução simulada |
| **Duplo grau e recursos** | Garantia de revisão | Pacto de São José, art. 8.2, *h* |

**Súmulas e SV sobre defesa**
- **SV 14:** acesso do defensor aos elementos já documentados no inquérito.
- **SV 5:** a falta de defesa técnica por advogado no processo administrativo disciplinar não ofende a Constituição.
- **Súmula 707/STF:** constitui nulidade a falta de intimação do denunciado para oferecer contrarrazões ao recurso interposto da rejeição da denúncia, não a suprindo a nomeação de defensor dativo.
- **Súmula 708/STF:** é nulo o julgamento da apelação se, após a manifestação nos autos da renúncia do único defensor, o réu não foi previamente intimado para constituir outro.
- **Súmula 523/STF:** acima.

**Interrogatório como meio de defesa.** Após a Lei 10.792/2003, o interrogatório é o **último ato** da instrução (CPP, art. 400), permitindo ao réu reagir às provas. Presença do defensor é obrigatória (art. 185). No **rito do júri**, também (art. 411) e o STF (HC 127.900) estendeu a regra do interrogatório ao final a todos os procedimentos.

:::exemplo
Situação: O réu foi interrogado no início da instrução, antes da oitiva das testemunhas.
Pergunta: Há nulidade?
Resposta: **Sim, se arguida a tempo e demonstrado prejuízo**: o interrogatório é o último ato da instrução (CPP, art. 400). A inobservância compromete a ampla defesa (nulidade relativa, conforme jurisprudência).
:::
"""),
], None)

M2 = ("1.2.3 Presunção de inocência e in dubio pro reo", [
("explicacao", "Estado de inocência: regra de tratamento, regra de prova e regra de julgamento", """
**Fundamento:** CF, art. 5º, **LVII** — "ninguém será considerado culpado até o trânsito em julgado de sentença penal condenatória." Também no Pacto de São José (art. 8.2) e na Declaração Universal.

**Três dimensões**

| Dimensão | Significado | Consequência |
|---|---|---|
| **Regra de tratamento** | O acusado não pode sofrer efeitos de condenado antes do trânsito | Vedação à antecipação de pena; prisão cautelar só excepcional; sem lançamento do nome no rol de culpados |
| **Regra probatória** | O **ônus da prova** cabe à **acusação** (CPP, art. 156, *caput*) | A defesa não precisa provar a inocência; cabe-lhe provar fatos excludentes que alegar |
| **Regra de julgamento (*in dubio pro reo*)** | Havendo dúvida razoável, absolve-se (CPP, art. 386, VII) | A condenação exige certeza (prova além da dúvida razoável) |

**Execução provisória da pena.** O STF oscilou: HC 126.292 (2016, permitindo após 2ª instância), mas nas **ADCs 43, 44 e 54 (2019)** firmou que o art. 283 do CPP é constitucional e a execução da pena exige o **trânsito em julgado**. A exceção é o **Tribunal do Júri**: o STF (Tema 1.068, RE 1.235.340, 2024) admitiu a execução imediata da condenação pelo júri, com pena igual ou superior a 15 anos, nos termos fixados; para as demais, vale a regra do trânsito. Prisão preventiva e demais cautelares seguem o art. 312 do CPP.

> Atenção: **presunção de inocência não impede a prisão cautelar**, desde que fundamentada em requisitos legais (art. 312), com necessidade concreta.

**Reflexos práticos**
- **Inquérito e ações penais em curso não podem agravar a pena-base** (Súmula 444/STJ): não se consideram maus antecedentes.
- **Reincidência** exige condenação definitiva.
- **Prova da materialidade e da autoria** com base apenas no inquérito é vedada (CPP, art. 155).

**Ônus da prova na prática**
- **Acusação:** provar o fato, a autoria, o dolo/culpa e as circunstâncias agravantes.
- **Defesa:** apenas as causas excludentes que alegar. Ainda assim, **dúvida sobre excludente** (legítima defesa) beneficia o réu, pois a acusação precisa derrubar a tese plausível.

**Presunção de inocência × presunção de culpabilidade em casos especiais.** Não há presunção de culpa na LCP, na Lei de Drogas ou em outras leis penais; qualquer inversão do ônus é suspeita (ex.: posse de objetos como presunção de receptação é matéria de prova, não de inversão legal).

:::exemplo
Situação: O juiz condena o réu apenas com base em depoimentos colhidos no inquérito, sem reproduzi-los em juízo, afirmando que "ninguém inocente fugiria".
Pergunta: Há violação de princípios?
Resposta: **Sim.** O art. 155 do CPP veda condenar exclusivamente com base no inquérito (elementos não repetidos em juízo), e a fuga não pode ser tratada como confissão (presunção de inocência e direito ao silêncio).
:::
"""),
], None)

M3 = ("1.2.4 Sistema acusatório, imparcialidade e juiz natural", [
("explicacao", "Acusatório × inquisitivo; imparcialidade; juiz de garantias", """
**Sistemas processuais**

| Sistema | Características | Exemplo |
|---|---|---|
| **Inquisitivo** | Juiz acusa, investiga e julga; confissão como rainha das provas; sigilo | Antigo processo europeu |
| **Acusatório** | Separação entre **acusar, defender e julgar**; contraditório; publicidade; imparcialidade | Adotado pelo Brasil |
| **Misto** | Fase inquisitiva (instrução) + fase acusatória | França (modelo clássico) |

**O Brasil adota o sistema acusatório** (CF, art. 129, I: ação penal pública privativa do MP; art. 5º, LV, e art. 93, IX). Com a Lei 13.964/2019, o **art. 3º-A do CPP** passou a dizer: "O processo penal terá estrutura acusatória, vedadas a iniciativa do juiz na fase de investigação e a substituição da atuação probatória do órgão de acusação."

**Reflexos do sistema acusatório**
- **Ne procedat iudex ex officio (inércia da jurisdição):** o juiz não inicia o processo sem provocação.
- **Titularidade da acusação** é do MP (ação pública) ou do ofendido (privada).
- **Iniciativa probatória do juiz** é matéria debatida: o art. 156, II, do CPP (diligências de ofício, no curso da instrução, para dirimir dúvida sobre ponto relevante) é questionado frente ao sistema acusatório; confira a posição adotada na questão.
- **Vedação da condenação sem pedido?** Em regra, o juiz pode condenar mesmo que o MP peça absolvição (CPP, art. 385), tema criticado por incompatibilidade com o sistema acusatório (o STF e o STJ já relativizaram em alguns julgados).
- **Princípio da correlação (congruência):** o juiz julga os fatos da denúncia; mudança de capitulação possível (*emendatio libelli*, art. 383), mudança de fatos exige aditamento (*mutatio libelli*, art. 384).

**Juiz de garantias (CPP, arts. 3º-B a 3º-F).** Juiz que atua na **fase de investigação** (controle da legalidade, cautelares, até o recebimento da denúncia); outro juiz atua na instrução e julgamento. O STF, na **ADI 6.298 (2023)**, declarou a constitucionalidade do instituto e fixou prazo de **12 meses**, prorrogável por mais 12, para implementação pelos tribunais.

**Imparcialidade e impedimentos/suspeições.** Garantia de que o juiz é equidistante das partes.
- **Impedimento (CPP, art. 252):** vínculos objetivos (cônjuge/parente envolvido, ter funcionado como defensor, órgão do MP, autoridade policial, auxiliar da justiça ou perito; ter sido parte ou diretamente interessado). Gera **nulidade absoluta**.
- **Suspeição (CPP, art. 254):** vínculos subjetivos (amizade íntima ou inimizade capital, ser credor ou devedor, aconselhar parte). Nulidade relativa.
- **Art. 256:** a suspeição não pode ser declarada ou reconhecida se a parte injuriar o juiz ou der motivo para criá-la.

Não ofende o juiz natural a convocação de juízes de primeiro grau para compor tribunal, desde que por critérios objetivos e previamente definidos (STF).

**Promotor natural.** O STF reconhece o princípio do promotor natural: vedada a designação arbitrária de promotor *ad hoc* ou para um caso específico (HC 67.759).

:::exemplo
Situação: O juiz, de ofício, no início do processo, decreta a quebra do sigilo bancário do investigado, sem pedido da autoridade policial nem do MP.
Pergunta: Isso viola o sistema acusatório?
Resposta: **Sim** (CPP, art. 3º-A): na fase de investigação, é vedada a iniciativa do juiz. Quebras de sigilo dependem de provocação das partes ou da autoridade.
:::
"""),
], None)

M4 = ("1.2.5 Publicidade, motivação, duração razoável e princípios procedimentais", [
("explicacao", "Publicidade, motivação, duração razoável, oralidade, imediatidade, concentração e identidade física", """
**1. Publicidade (CF, art. 5º, LX; art. 93, IX).** Os atos processuais são públicos, salvo quando a defesa da intimidade ou o interesse social exigirem restrição (**publicidade restrita**). Dois aspectos: **geral** (qualquer pessoa) e **específica** (partes e advogados). O **segredo de justiça** vale para casos de violência doméstica, crimes sexuais, menores, etc. (CPP, art. 792, § 1º; CPC, art. 189). O inquérito é sigiloso (CPP, art. 20); no processo, o sigilo é exceção.

**2. Motivação das decisões (CF, art. 93, IX; CPP, arts. 315 e 381).** Todas as decisões judiciais devem ser fundamentadas, sob pena de **nulidade**. O art. 315, § 2º, do CPP (Lei 13.964/2019) lista decisões **não fundamentadas** (mera reprodução de ato normativo, uso de conceitos indeterminados sem explicar, motivos genéricos, ausência de enfrentamento de argumentos, precedente sem identificar os fundamentos). Aplica-se a toda decisão sobre prisão cautelar e à sentença (art. 381).
- Sistema de apreciação da prova: **persuasão racional (livre convencimento motivado)**, não livre convicção. Exceção: **Júri** (íntima convicção dos jurados, sem fundamentação, resguardado o sigilo das votações).

**3. Duração razoável do processo (CF, art. 5º, LXXVIII).** Direito a processo sem dilações indevidas; critérios: complexidade do caso, comportamento das partes, atuação das autoridades (Corte IDH, Caso Genie Lacayo). **Excesso de prazo** na prisão cautelar leva ao relaxamento. Não há prazo fixo; análise concreta. A Lei 13.964/2019 criou a revisão obrigatória da prisão preventiva a cada 90 dias (art. 316, parágrafo único) — a inobservância não gera liberdade automática (STF, SL 1.395).

**4. Oralidade, imediatidade e concentração**
- **Oralidade:** prevalência da palavra falada nos atos (audiência, debates orais).
- **Imediatidade:** contato direto do juiz com as provas (ouvir testemunhas, ver o réu).
- **Concentração:** atos reunidos em audiência una, com instrução e julgamento (CPP, art. 400).
- **Identidade física do juiz (CPP, art. 399, § 2º):** o juiz que presidiu a instrução deverá proferir a sentença. A jurisprudência admite exceções (férias, promoção, aposentadoria, art. 132 do CPC por analogia).

**5. Lealdade processual e boa-fé.** Partes e juiz atuam com ética; vedada a prova obtida por meios fraudulentos.

**6. Economia processual e instrumentalidade das formas.** Nulidades só se declaram se houver **prejuízo** (*pas de nullité sans grief*, CPP, art. 563). Aproveitamento dos atos.

**7. Princípio da identidade e da correlação (congruência).** O juiz sentencia nos limites da acusação (arts. 383 e 384).

**8. Princípio da fungibilidade recursal (CPP, art. 579).** Salvo má-fé, a parte não é prejudicada pela interposição de um recurso por outro.

:::exemplo
Situação: A decisão que decretou a prisão preventiva diz apenas: "presentes o *fumus* e o *periculum*, decreto a prisão."
Pergunta: A decisão é válida?
Resposta: **Não.** Falta motivação concreta (CPP, art. 315, §§ 1º e 2º): é preciso indicar fatos que justifiquem a cautelar.
:::
"""),
], None)

M5 = ("1.2.6 Princípios probatórios: ilicitude, comunhão e liberdade de provas", [
("explicacao", "Provas ilícitas, derivadas e livre apreciação", """
**1. Vedação das provas ilícitas (CF, art. 5º, LVI; CPP, art. 157).** São inadmissíveis as provas obtidas por meios ilícitos. Considera-se **ilícita** a prova obtida em violação a normas constitucionais ou legais (art. 157, *caput*). A prova ilícita deve ser **desentranhada** do processo e inutilizada (art. 157, *caput* e § 3º).

**2. Provas ilícitas por derivação (art. 157, § 1º) — teoria dos frutos da árvore envenenada.** São também inadmissíveis as provas derivadas das ilícitas, **salvo** quando não evidenciado o nexo de causalidade entre umas e outras ou quando as derivadas puderem ser obtidas por **fonte independente**.
- **Fonte independente (§ 2º):** aquela que por si só, seguindo os trâmites típicos e de praxe, próprios da investigação ou instrução criminal, seria capaz de conduzir ao fato objeto da prova.
- **Descoberta inevitável:** a prova seria encontrada de qualquer modo por meios regulares (não está expressa, mas é reconhecida pelos tribunais).
- **Vício atenuado/contaminação expurgada:** a conexão entre a ilicitude e a prova derivada é fraca.
- **Boa-fé:** exceção de boa-fé admitida por parte da jurisprudência, não pacificada.

**3. Prova ilícita pro reo.** A doutrina e os tribunais admitem a prova ilícita **em favor do réu** em caso de **legítima defesa** ou **estado de necessidade** para provar a inocência.

**4. Juiz que conheceu da prova ilícita.** A Lei 13.964/2019 criou o § 5º do art. 157 (impedimento do juiz que conheceu da prova declarada inadmissível); o STF declarou o dispositivo inconstitucional na **ADI 6.298 (2023)**. Confira a posição cobrada na questão.

**5. Livre convencimento motivado e limitações (CPP, art. 155).** O juiz forma sua convicção pela livre apreciação da prova produzida em contraditório judicial, **não podendo fundamentar a decisão exclusivamente nos elementos informativos do inquérito**, ressalvadas as provas cautelares, não repetíveis e antecipadas.

**6. Comunhão (aquisição) da prova.** Produzida a prova, passa a pertencer ao processo; pode beneficiar ou prejudicar qualquer parte, independentemente de quem a produziu. Consequência: a parte não pode **desistir** da prova já realizada sem anuência (por exemplo, testemunha ouvida).

**7. Liberdade probatória e exceções.** Em regra, são admitidos todos os meios de prova (inclusive atípicos), desde que lícitos. **Exceção:** estado das pessoas segue a lei civil (CPP, art. 155, parágrafo único) e a **materialidade** nos crimes que deixam vestígios exige **exame de corpo de delito** (art. 158).

**8. Verdade real × verdade processual.** A "verdade real" é superada: o juiz busca a **verdade processual** possível, limitada pelas regras de admissibilidade (provas ilícitas) e pelo contraditório.

**9. Ônus da prova (art. 156) e distribuição.** A prova da alegação incumbe a quem a fizer; mas o ônus é da acusação quanto à culpa (presunção de inocência).

:::exemplo
Situação: A polícia invade uma casa sem mandado e sem fundadas razões e apreende droga. Com base no depoimento do morador preso, localiza o fornecedor.
Pergunta: As provas são válidas?
Resposta: A droga é **prova ilícita**. As provas derivadas (localização do fornecedor) são **ilícitas por derivação**, salvo se houver **fonte independente** (§§ 1º e 2º do art. 157).
:::
"""),
], None)

M6 = ("1.2.7 Princípios da ação penal e da persecução", [
("aprofundamento", "Obrigatoriedade, indisponibilidade, oficialidade, indivisibilidade e outros", """
| Princípio | Conteúdo | Aplicação |
|---|---|---|
| **Obrigatoriedade (legalidade processual)** | O MP, presentes os requisitos, **deve** oferecer a denúncia | Ação pública. Mitigado pela transação penal (Lei 9.099, art. 76), ANPP (CPP, art. 28-A), colaboração premiada |
| **Indisponibilidade** | O MP **não pode desistir** da ação penal pública já iniciada (CPP, art. 42) | Também não desiste de recurso (art. 576) |
| **Oficialidade** | Órgãos oficiais (MP, polícia) conduzem a persecução | Exceção: ação privada |
| **Oportunidade / conveniência** | O ofendido decide se aciona | **Ação privada** |
| **Disponibilidade** | O querelante pode desistir (perdão, perempção) | Ação privada |
| **Indivisibilidade** | A ação abrange **todos** os autores (CPP, art. 48) | Ação privada. Na pública, prevalece a divisibilidade (STF/STJ: o MP pode aditar depois) |
| **Intranscendência (pessoalidade)** | A ação não pode ir além do autor/participante | CF, art. 5º, XLV: nenhuma pena passará da pessoa do condenado |
| **Divisibilidade da ação pública** | O MP pode oferecer a ação contra alguns e continuar investigando outros | Posição do STF |
| **Ne bis in idem** | Ninguém pode ser processado ou punido duas vezes pelo mesmo fato | Pacto de São José, art. 8.4; reconhecido pela jurisprudência |
| **Non reformatio in pejus (CPP, art. 617)** | Em recurso exclusivo da defesa, o tribunal não pode agravar a situação do réu | Também a *reformatio in pejus indireta* é vedada (STF/STJ) |
| **Favor rei / favor libertatis** | Na dúvida, interpretação mais favorável | Fundamento do *in dubio pro reo* |
| **Duplo grau de jurisdição** | Direito de recorrer para órgão superior | Pacto de São José (art. 8.2, *h*); não é absoluto (foro por prerrogativa não tem duplo grau) |
| **Inércia da jurisdição** | O juiz só age quando provocado | CF, art. 129, I |
| **Vedação da revisão criminal *pro societate*** | A revisão só beneficia o réu | CPP, art. 621 |
| **Proporcionalidade** | Adequação, necessidade e proporcionalidade em sentido estrito | Cautelares, provas, penas |


**Ação penal privada subsidiária da pública (CF, art. 5º, LIX; CPP, art. 29).** Admitida se o MP não oferecer denúncia no prazo legal. Princípio da **inércia do MP** autoriza a ação do ofendido.

**Arquivamento (CPP, art. 28).** A Lei 13.964/2019 deslocou a decisão de arquivamento para o próprio MP, com comunicação à vítima e submissão ao órgão superior. O dispositivo foi objeto da ADI 6.298; confira o enunciado, pois o STF deu interpretação ao novo regime.

**Princípio do Promotor Natural e da independência funcional.** Membros do MP têm independência funcional (CF, art. 127, § 1º), unidade e indivisibilidade institucionais.

:::exemplo
Situação: O promotor oferece denúncia e, ao final, em alegações, pede a condenação, mas o juiz absolve. O promotor não recorre, então o Tribunal anula a sentença em recurso do réu.
Pergunta: A pena pode ser agravada no novo julgamento?
Resposta: Não. Vigora a vedação da *reformatio in pejus* (CPP, art. 617), inclusive indireta, em recurso exclusivo da defesa.
:::
"""),
], None)

M7 = ("1.2.8 Pegadinhas e quadro final", [
("pegadinhas", "Pegadinhas dos princípios do Processo Penal", """
1. **"O Brasil adota o sistema inquisitivo."** ❌ Adota o **acusatório** (art. 3º-A do CPP).
2. **"A presunção de inocência impede toda prisão antes do trânsito em julgado."** ❌ Não impede a **prisão cautelar** fundamentada.
3. **"O ônus da prova é do réu quanto à própria inocência."** ❌ É da acusação.
4. **"A defesa técnica é disponível; o réu pode dispensar o advogado."** ❌ É **indisponível**; a **autodefesa** é que é disponível.
5. **"A falta de defesa gera nulidade relativa."** ❌ A falta é nulidade **absoluta**; a **deficiência** só anula com prova de prejuízo (Súmula 523/STF).
6. **"O silêncio do réu pode ser interpretado em seu desfavor."** ❌ Art. 186, parágrafo único, do CPP.
7. **"O interrogatório é o primeiro ato da instrução."** ❌ É o **último** (art. 400).
8. **"As provas derivadas das ilícitas são sempre inadmissíveis."** ❌ Exceções: ausência de nexo, fonte independente, descoberta inevitável.
9. **"O juiz pode condenar com base exclusiva no inquérito."** ❌ Art. 155 do CPP.
10. **"O Júri aplica o princípio da persuasão racional."** ❌ Adota a **íntima convicção**.
11. **"Impedimento gera nulidade relativa."** ❌ É **absoluta**; a suspeição é relativa.
12. **"A ação penal pública é disponível após o oferecimento da denúncia."** ❌ É **indisponível** (art. 42).
13. **"A indivisibilidade se aplica à ação pública da mesma forma que à privada."** ⚠️ Em regra, só à privada (art. 48); na pública prevalece a divisibilidade.
14. **"No recurso exclusivo da defesa, o tribunal pode agravar a pena se houver erro técnico na sentença."** ❌ *Non reformatio in pejus* (art. 617).

**Quadro-resumo de fundamentos**

| Princípio | Base |
|---|---|
| Devido processo legal | CF, art. 5º, LIV |
| Contraditório e ampla defesa | CF, art. 5º, LV |
| Presunção de inocência | CF, art. 5º, LVII |
| Juiz natural | CF, art. 5º, XXXVII e LIII |
| Vedação de provas ilícitas | CF, art. 5º, LVI; CPP, art. 157 |
| Publicidade | CF, art. 5º, LX; art. 93, IX |
| Motivação | CF, art. 93, IX; CPP, art. 315 |
| Duração razoável | CF, art. 5º, LXXVIII |
| Silêncio | CF, art. 5º, LXIII; CPP, art. 186 |
| Estrutura acusatória | CPP, art. 3º-A; CF, art. 129, I |
"""),
], None)

FLASH = """

**Qual o princípio-mãe do processo penal?**
→ O devido processo legal (CF, art. 5º, LIV).

**A defesa técnica é disponível?**
→ Não. É indisponível; a autodefesa, sim, é disponível.

**Quais as três dimensões da presunção de inocência?**
→ Regra de tratamento, regra probatória (ônus da acusação) e regra de julgamento (*in dubio pro reo*).

**Qual o sistema processual brasileiro?**
→ Acusatório (CPP, art. 3º-A).

**O que é o juiz de garantias?**
→ Juiz que atua na fase de investigação, diferente do que julga a causa (CPP, arts. 3º-B a 3º-F; ADI 6.298).

**Provas ilícitas por derivação são admissíveis?**
→ Em regra não, salvo ausência de nexo de causalidade, fonte independente ou descoberta inevitável (CPP, art. 157, §§ 1º e 2º).

**Qual a diferença entre impedimento e suspeição?**
→ Impedimento: vínculo objetivo (nulidade absoluta); suspeição: vínculo subjetivo (relativa).

**O Júri adota qual sistema de apreciação de provas?**
→ Íntima convicção dos jurados.

**O que veda o art. 617 do CPP?**
→ A reformatio in pejus em recurso exclusivo da defesa.

**Quando o interrogatório é realizado na instrução?**
→ Ao final, como último ato (CPP, art. 400).
"""

build("l07.json", "fundamentos-do-direito-proce-1-2-principios-constitucionais-e-infraconstitucionais-14la94s", 2, [M1, M2, M3, M4, M5, M6, M7], FLASH)
