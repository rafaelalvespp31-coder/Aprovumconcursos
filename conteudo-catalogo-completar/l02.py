from lib import build

M1 = ("2.12.2 Territorialidade e conceito de território (art. 5º)", [
("texto_legal", "Código Penal, arts. 5º e 6º (lei seca)", """
**Art. 5º** Aplica-se a lei brasileira, sem prejuízo de convenções, tratados e regras de direito internacional, ao crime cometido no território nacional.

**§ 1º** Para os efeitos penais, consideram-se como extensão do território nacional as embarcações e aeronaves brasileiras, de natureza pública ou a serviço do governo brasileiro onde quer que se encontrem, bem como as aeronaves e as embarcações brasileiras, mercantes ou de propriedade privada, que se achem, respectivamente, no espaço aéreo correspondente ou em alto-mar.

**§ 2º** É também aplicável a lei brasileira aos crimes praticados a bordo de aeronaves ou embarcações estrangeiras de propriedade privada, achando-se aquelas em pouso no território nacional ou em voo no espaço aéreo correspondente, e estas em porto ou mar territorial do Brasil.

**Art. 6º** Considera-se praticado o crime no lugar em que ocorreu a ação ou omissão, no todo ou em parte, bem como onde se produziu ou deveria produzir-se o resultado.
"""),
("explicacao", "Princípio da territorialidade temperada", """
**Regra.** A lei penal brasileira aplica-se aos crimes cometidos **no território nacional** (princípio da **territorialidade**). O Brasil adota a **territorialidade temperada (ou mitigada)**, porque o art. 5º ressalva "convenções, tratados e regras de direito internacional". Exemplos de ressalvas: imunidades diplomáticas e consulares, tratados de extradição, Estatuto de Roma (Tribunal Penal Internacional, aceito pelo art. 5º, § 4º, da CF).

**O que é território para fins penais**
- **Solo** (terra firme, ilhas, rios e lagos), **subsolo**, **mar territorial** (12 milhas marítimas a partir da linha de base — Lei 8.617/1993) e **espaço aéreo** sobrejacente (coluna atmosférica acima do solo e do mar territorial).
- **Território por extensão** (art. 5º, § 1º): embarcações e aeronaves **brasileiras**:
  - **públicas ou a serviço do governo brasileiro**, onde quer que estejam (inclusive em porto estrangeiro);
  - **mercantes ou privadas**, quando estiverem em **alto-mar** ou no **espaço aéreo correspondente** (ou seja, fora de qualquer território).
- **Embarcações e aeronaves estrangeiras privadas** são alcançadas pela lei brasileira quando estiverem em **porto ou mar territorial do Brasil** (embarcação) ou em **pouso/voo no espaço aéreo brasileiro** (aeronave) — art. 5º, § 2º.

**Quadro de decisão (navios e aviões)**

| Quem/Onde | Lei aplicável |
|---|---|
| Navio **militar ou público brasileiro**, em qualquer lugar | Brasileira (extensão do território) |
| Navio **mercante/privado brasileiro**, em alto-mar | Brasileira |
| Navio **mercante/privado brasileiro**, em porto/mar territorial **estrangeiro** | Em regra, a lei do país onde está (territorialidade do Estado local); a brasileira só por extraterritorialidade (art. 7º, II, *c*) |
| Navio **estrangeiro privado** em porto/mar territorial brasileiro | Brasileira (art. 5º, § 2º) |
| Navio **estrangeiro público/militar** em águas brasileiras | Lei do pavilhão (a embarcação é extensão do território do seu Estado); a brasileira não incide, salvo tratado |
| Aeronave estrangeira privada pousada/voando no espaço aéreo brasileiro | Brasileira |

**Embaixadas e consulados** brasileiros no exterior **não** são território nacional (equiparação é mito). Já as **embaixadas estrangeiras no Brasil** também não são território do outro Estado: são invioláveis, mas **o crime ali cometido está sujeito à lei brasileira**, ressalvadas as imunidades dos agentes diplomáticos.

**Imunidades.** Agentes diplomáticos gozam de **imunidade de jurisdição penal** (Convenção de Viena de 1961). Os cônsules, apenas nos atos oficiais (Convenção de 1963). Imunidade não exclui o crime; apenas impede o processo no Estado acreditado, que pode pedir a renúncia ou o julgamento pelo Estado de origem.

:::exemplo
Situação: Um brasileiro mata outro brasileiro a bordo de um navio de bandeira brasileira, de propriedade privada, em alto-mar.
Pergunta: Qual lei se aplica?
Resposta: A **brasileira**: o navio mercante brasileiro em alto-mar é extensão do território (art. 5º, § 1º). Sobre a competência, veja a CF, art. 109, IX (navios de grande porte, conforme o STJ), no módulo 2.12.6.
:::
"""),
], None)

M2 = ("2.12.3 Lugar do crime e teoria da ubiquidade (art. 6º)", [
("explicacao", "Teorias sobre o lugar do crime e a ubiquidade", """
Um crime pode ter a **conduta** em um lugar e o **resultado** em outro. Para saber qual lei e qual jurisdição se aplicam, a doutrina formulou três teorias:

| Teoria | Lugar do crime é... | Observação |
|---|---|---|
| **Atividade** | Onde ocorreu a ação ou omissão | Usada no CP para o **tempo** do crime (art. 4º) |
| **Resultado** | Onde se produziu (ou deveria produzir-se) o resultado | Usada no CPP, como regra de competência (art. 70) |
| **Ubiquidade (mista ou unitária)** | **Tanto** onde ocorreu a conduta **quanto** onde ocorreu (ou deveria ocorrer) o resultado | **Adotada pelo art. 6º do CP** |

**Art. 6º — leitura completa.** "Considera-se praticado o crime no lugar em que ocorreu a **ação ou omissão**, **no todo ou em parte**, bem como onde se **produziu ou deveria produzir-se o resultado**." Isso significa que:
- se **qualquer fração** da conduta (um ato de execução, um ato preparatório punível) ocorreu no Brasil, o crime é considerado praticado no Brasil;
- se o resultado ocorreu no Brasil, o crime é considerado praticado aqui;
- na **tentativa**, vale também o lugar onde **deveria** produzir-se o resultado (por isso a expressão "deveria produzir-se").

**Tempo × lugar.** Não confunda: o **tempo** do crime segue a **teoria da atividade** (art. 4º: momento da ação ou omissão, ainda que outro seja o do resultado). O **lugar** segue a **ubiquidade** (art. 6º).

**Crimes à distância × plurilocais**
- **Crime à distância (ou de espaço máximo):** conduta e resultado em **países diferentes**. Aplica-se o art. 6º: o Brasil é competente se a conduta *ou* o resultado ocorreram aqui. Ex.: atirador dispara da fronteira argentina e a vítima morre em território brasileiro.
- **Crime plurilocal:** conduta e resultado em **comarcas/estados diferentes do mesmo país**. Resolve-se pelo CPP (art. 70) e, para a lei penal, não há conflito: a lei é a mesma.
- **Crime em trânsito:** o iter criminis percorre vários locais (ex.: sequestro que atravessa o país). Cada local por onde passou é lugar do crime para fins de ubiquidade.
- **Crime de espaço mínimo:** ocorre em um só lugar. Não gera problema.

**Aplicação por modalidade**
- **Crime omissivo:** lugar onde deveria ter ocorrido a ação devida e/ou onde ocorreu o resultado.
- **Crime permanente:** todo lugar onde se prolongou a consumação.
- **Crime tentado:** onde ocorreu a conduta *ou* onde se produziria o resultado.
- **Crime formal e de mera conduta:** a rigor, o lugar da conduta (não há resultado naturalístico necessário); para formais, também o lugar em que *deveria* ocorrer o resultado.

:::exemplo
Situação: Hugo, em Ciudad del Este (Paraguai), posta uma ameaça escrita pela internet contra Lara, que lê a mensagem em Foz do Iguaçu (Brasil).
Pergunta: A lei penal brasileira pode ser aplicada?
Resposta: **Sim.** Pela ubiquidade, o resultado (a ciência da ameaça) ocorreu no Brasil. O crime é considerado praticado no Brasil (art. 6º), sem prejuízo de convenções e do exame de competência (CPP).
:::

:::exemplo
Situação: Marcos, em Buenos Aires, remete veneno por correio a Lúcia, em São Paulo, que o ingere e morre.
Pergunta: Qual é o lugar do crime?
Resposta: Tanto Buenos Aires (conduta) quanto São Paulo (resultado). Há jurisdição brasileira, pois o resultado se produziu no Brasil.
:::
"""),
], None)

M3 = ("2.12.4 Extraterritorialidade da lei penal (art. 7º)", [
("texto_legal", "Código Penal, art. 7º (lei seca)", """
**Art. 7º** Ficam sujeitos à lei brasileira, embora cometidos no estrangeiro:

**I** — os crimes:
- **a)** contra a vida ou a liberdade do Presidente da República;
- **b)** contra o patrimônio ou a fé pública da União, do Distrito Federal, de Estado, de Território, de Município, de empresa pública, sociedade de economia mista, autarquia ou fundação instituída pelo Poder Público;
- **c)** contra a administração pública, por quem está a seu serviço;
- **d)** de genocídio, quando o agente for brasileiro ou domiciliado no Brasil;

**II** — os crimes:
- **a)** que, por tratado ou convenção, o Brasil se obrigou a reprimir;
- **b)** praticados por brasileiro;
- **c)** praticados em aeronaves ou embarcações brasileiras, mercantes ou de propriedade privada, quando em território estrangeiro e aí não sejam julgados.

**§ 1º** Nos casos do inciso I, o agente é punido segundo a lei brasileira, ainda que absolvido ou condenado no estrangeiro.

**§ 2º** Nos casos do inciso II, a aplicação da lei brasileira depende do concurso das seguintes condições:
- **a)** entrar o agente no território nacional;
- **b)** ser o fato punível também no país em que foi praticado;
- **c)** estar o crime incluído entre aqueles pelos quais a lei brasileira autoriza a extradição;
- **d)** não ter sido o agente absolvido no estrangeiro ou não ter aí cumprido a pena;
- **e)** não ter sido o agente perdoado no estrangeiro ou, por outro motivo, não estar extinta a punibilidade, segundo a lei mais favorável.

**§ 3º** A lei brasileira aplica-se também ao crime cometido por estrangeiro contra brasileiro fora do Brasil, se, reunidas as condições previstas no parágrafo anterior:
- **a)** não foi pedida ou foi negada a extradição;
- **b)** houve requisição do Ministro da Justiça.
"""),
("explicacao", "Extraterritorialidade incondicionada, condicionada e hipercondicionada", """
**Conceito.** Extraterritorialidade é a aplicação da lei penal brasileira a crimes cometidos **fora** do território nacional. Pode ser:

**1) Incondicionada (art. 7º, I e § 1º).** A lei brasileira se aplica **sem qualquer condição**, mesmo que o agente já tenha sido julgado (absolvido ou condenado) no exterior. Hipóteses:
- crimes contra a **vida ou a liberdade do Presidente da República** (princípio da **defesa** ou real);
- crimes contra o **patrimônio ou a fé pública** de entes políticos e entidades da administração indireta (princípio da defesa);
- crimes **contra a administração pública, por quem a serviço dela** (defesa);
- **genocídio**, quando o agente for **brasileiro ou domiciliado no Brasil** (justiça universal/nacionalidade).

> **Atenção ao bis in idem.** Na incondicionada, o agente pode ser punido duas vezes (Brasil e exterior). O **art. 8º** mitiga: a pena cumprida no estrangeiro atenua a pena imposta no Brasil, ou é nela computada.

**2) Condicionada (art. 7º, II e § 2º).** Só se aplica a lei brasileira se **todas** as condições do § 2º forem preenchidas **cumulativamente**:
1. **Entrada do agente** no território nacional (mesmo que depois saia);
2. **Dupla incriminação:** o fato é punível também no país onde foi praticado;
3. **Crime extraditável** (o crime está entre aqueles que a lei brasileira autoriza a extradição);
4. O agente **não foi absolvido** no estrangeiro e **não cumpriu pena** lá;
5. O agente **não foi perdoado** no estrangeiro nem está extinta a punibilidade, segundo a lei mais favorável.

Hipóteses do inciso II:
- crimes que o Brasil se obrigou a reprimir por **tratado ou convenção** (princípio da **justiça universal** ou cosmopolita; ex.: tortura, tráfico internacional de pessoas — conforme tratados);
- crimes **praticados por brasileiro** (**nacionalidade ativa**);
- crimes em **aeronaves ou embarcações brasileiras, mercantes ou privadas**, em território estrangeiro, **quando aí não sejam julgados** (princípio da **representação** ou do pavilhão).

**3) Hipercondicionada (art. 7º, § 3º).** Crime cometido **por estrangeiro contra brasileiro** fora do Brasil (**nacionalidade passiva**). Exige, além das condições do § 2º, que:
- **não tenha sido pedida ou tenha sido negada a extradição**; e
- haja **requisição do Ministro da Justiça**.

**Tabela de memorização**

| Modalidade | Dispositivo | Princípio | Condições |
|---|---|---|---|
| Incondicionada | Art. 7º, I | Defesa; justiça universal (genocídio) | Nenhuma; pode haver *bis in idem* |
| Condicionada | Art. 7º, II e § 2º | Justiça universal; nacionalidade ativa; representação | 5 condições cumulativas |
| Hipercondicionada | Art. 7º, § 3º | Nacionalidade passiva | § 2º + extradição não pedida/negada + requisição do MJ |

**Quando a lei brasileira se aplica a estrangeiro que mata brasileiro no exterior?** Apenas se reunidas as condições do § 2º **e** as do § 3º. É a pergunta preferida das bancas.

**Estatuto de Roma.** O Brasil se submete à jurisdição do TPI (CF, art. 5º, § 4º), pelo princípio da **complementaridade**.

:::exemplo
Situação: Cláudio, brasileiro, comete lesão corporal grave contra outro brasileiro em Lisboa e depois retorna ao Brasil. O fato é crime em Portugal, Cláudio não foi julgado lá e não houve extinção da punibilidade.
Pergunta: A lei brasileira se aplica?
Resposta: **Sim.** Extraterritorialidade **condicionada** (art. 7º, II, *b*): agente brasileiro, entrou no território, dupla incriminação, crime extraditável, não absolvido nem condenado, sem perdão. O processo se inicia, em regra, no juízo da Capital do Estado onde residiu por último (CPP, art. 88).
:::

:::exemplo
Situação: Um estrangeiro desvia dinheiro público de uma autarquia federal brasileira estando em outro país.
Pergunta: Aplica-se a lei brasileira? Há condição?
Resposta: **Sim, sem condições** (art. 7º, I, *b*). A extraterritorialidade é incondicionada; ainda que ele seja julgado fora, o Brasil pode puni-lo (compensando-se a pena pelo art. 8º).
:::
"""),
], None)

M4 = ("2.12.5 Pena cumprida no estrangeiro e sentença estrangeira (arts. 8º e 9º)", [
("explicacao", "Art. 8º: vedação ao bis in idem e art. 9º: homologação de sentença estrangeira", """
**Art. 8º — Pena cumprida no estrangeiro.** "A pena cumprida no estrangeiro **atenua** a pena imposta no Brasil pelo mesmo crime, quando **diversas**, ou nela é **computada**, quando **idênticas**."

| Situação | Efeito |
|---|---|
| Penas **da mesma natureza** (ex.: privativa de liberdade nos dois países) | O tempo cumprido no exterior é **computado** (abatido, como na detração) |
| Penas de **natureza diversa** (ex.: multa lá, prisão aqui) | A pena estrangeira **atenua** a brasileira (o juiz reduz a pena) |

Esse artigo atende ao princípio do *ne bis in idem* sem impedir a persecução no Brasil.

**Art. 9º — Eficácia de sentença estrangeira.** A sentença estrangeira, quando a aplicação da lei brasileira produz na espécie as mesmas consequências, pode ser **homologada** no Brasil para:
- **I** — obrigar o condenado à **reparação do dano**, a restituições e a outros efeitos civis;
- **II** — sujeitá-lo a **medida de segurança**.

**Requisitos de homologação (parágrafo único)**
- Para o inciso I (efeitos civis): **pedido da parte interessada**.
- Para o inciso II (medida de segurança): existência de **tratado de extradição** com o país de origem da sentença ou, na falta de tratado, **requisição do Ministro da Justiça**.

**Órgão competente.** Cabe ao **STJ** homologar sentença estrangeira (CF, art. 105, I, *i*). Depois, a execução corre na Justiça Federal (CF, art. 109, X).

**Pontos de prova**
- A homologação **não** serve para impor a pena privativa de liberdade estrangeira no Brasil (para isso existe a transferência de execução penal, por tratado).
- Sentença estrangeira **não homologada** não produz os efeitos do art. 9º; o art. 8º, por outro lado, considera a pena efetivamente cumprida lá, sem exigir homologação.

:::exemplo
Situação: Camila foi condenada nos EUA a 3 anos de prisão por um crime também punido no Brasil, e cumpriu 1 ano e 6 meses. Depois, foi condenada no Brasil pelo mesmo fato (art. 7º, I) a 4 anos.
Pergunta: Como se aplica o art. 8º?
Resposta: As penas são idênticas em natureza (privativas de liberdade), então o tempo cumprido nos EUA (1 ano e 6 meses) é **computado**; restam 2 anos e 6 meses.
:::
"""),
], None)

M5 = ("2.12.6 Lugar do crime, competência e cooperação internacional", [
("aprofundamento", "Da lei aplicável à competência: CPP, arts. 70, 88 a 90 e CF, art. 109", """
Definir que a **lei brasileira** se aplica (art. 5º ao 7º do CP) é uma coisa; definir **qual juiz** julga é outra. As regras de competência estão no CPP e na CF.

**Regra geral — CPP, art. 70.** A competência é determinada pelo **lugar em que se consumar a infração** (teoria do **resultado**) ou, na tentativa, pelo lugar do **último ato de execução**.
- **§ 1º:** se, iniciada a execução no território nacional, a infração se consumar fora dele, a competência será determinada pelo lugar em que tiver sido praticado, no Brasil, o **último ato de execução**.
- **§ 2º:** quando o último ato de execução for praticado fora do território nacional, será competente o juiz do lugar em que o crime, **embora parcialmente**, tenha produzido ou devia produzir seu resultado.
- **§ 3º:** quando incerto o limite territorial entre duas ou mais jurisdições, ou quando incerta a jurisdição por ter sido a infração consumada ou tentada nas divisas, ou quando se tratar de infração continuada ou permanente praticada em território de duas ou mais jurisdições, a competência firmar-se-á pela **prevenção**.
- **§ 4º:** no estelionato praticado mediante depósito, cheque sem fundos ou frustrado, ou transferência de valores (art. 171 do CP), a competência é do **local do domicílio da vítima** (Lei 14.155/2021); com várias vítimas, firma-se pela prevenção.

**Homicídio e a teoria da atividade na prática.** Embora o art. 70 aponte o resultado, o **STJ** tem firmado que no homicídio é competente, em regra, o juízo do **local da conduta**, por conveniência da instrução probatória, ainda que a morte ocorra em outro lugar.

**Crimes cometidos fora do Brasil (CPP, art. 88).** Será competente o juízo da **Capital do Estado onde houver por último residido** o acusado; se nunca residiu no Brasil, o juízo da **Capital da República** (Brasília).

**Crimes em navios e aeronaves**
- **Art. 89 (navios):** justiça do **primeiro porto brasileiro** em que tocar a embarcação após o crime, ou, se afastar-se do País, do **último** em que houver tocado.
- **Art. 90 (aeronaves):** juiz da comarca em cujo território se verificar o **pouso** após o crime, ou da comarca de onde houver partido a aeronave.
- **CF, art. 109, IX:** compete à **Justiça Federal** julgar os crimes cometidos a bordo de **navios ou aeronaves**, ressalvada a competência da Justiça Militar. Para o STJ, "navio" aqui é embarcação de **grande porte**, apta a viagens internacionais.

**Competência da Justiça Federal em crimes transnacionais**
- **CF, art. 109, V:** crimes previstos em **tratado ou convenção internacional**, quando, iniciada a execução no País, o resultado tenha ou devesse ter ocorrido no estrangeiro, ou reciprocamente.
- **CF, art. 109, V-A e § 5º:** causas relativas a **grave violação de direitos humanos** (incidente de deslocamento de competência).

**Cooperação internacional.** Extradição (CF, art. 5º, LI e LII; Lei 13.445/2017, Lei de Migração, arts. 81 e ss.), homologação de sentença estrangeira, carta rogatória e auxílio direto.

> **Distinção que cai:** o art. 6º (lugar do crime) determina a **aplicação da lei penal brasileira** (jurisdição). O art. 70 do CPP determina **qual comarca/juiz** é competente. Mesma palavra "lugar", finalidades distintas.

:::exemplo
Situação: Telma, em Curitiba, inicia a execução de um crime e o resultado se produz em Buenos Aires.
Pergunta: Qual é o foro competente no Brasil?
Resposta: Pelo CPP, art. 70, § 1º, o do lugar em que foi praticado o **último ato de execução** no Brasil (Curitiba), ficando a lei brasileira aplicável pela ubiquidade (art. 6º do CP).
:::
"""),
], None)

M6 = ("2.12.7 Casos resolvidos e pegadinhas", [
("pegadinhas", "Pegadinhas e quadro final de revisão", """
1. **"O CP adota a teoria do resultado quanto ao lugar do crime."** ❌ Adota a **ubiquidade** (art. 6º). A teoria da atividade vale para o **tempo** (art. 4º).
2. **"A embaixada brasileira no exterior é território nacional."** ❌ Não é.
3. **"Navio mercante brasileiro em porto estrangeiro está sob lei brasileira por extensão do território."** ❌ Só em **alto-mar**; em porto estrangeiro, prevalece a lei local (a brasileira pode incidir por extraterritorialidade, art. 7º, II, *c*, se não for julgado lá).
4. **"Na extraterritorialidade incondicionada, a absolvição no exterior impede a ação penal no Brasil."** ❌ Art. 7º, § 1º: pune-se **ainda que absolvido ou condenado** no exterior (compensando-se pelo art. 8º).
5. **"Estrangeiro que comete crime contra brasileiro no exterior sempre é julgado no Brasil."** ❌ Exige as condições do § 2º **e** do § 3º (extradição não pedida/negada e requisição do Ministro da Justiça).
6. **"A entrada do agente no território nacional é condição apenas da hipercondicionada."** ❌ É condição de **todas** as hipóteses do inciso II e do § 3º.
7. **"Genocídio praticado por qualquer pessoa no exterior é incondicionado."** ❌ Só se o agente for **brasileiro ou domiciliado no Brasil** (art. 7º, I, *d*).
8. **"Crime contra a administração pública cometido no exterior por particular é incondicionado."** ❌ O art. 7º, I, *c* exige que o agente esteja **a serviço** da administração.
9. **"A sentença estrangeira é executada diretamente no Brasil."** ❌ Precisa de **homologação pelo STJ** (art. 9º; CF, art. 105, I, *i*).
10. **"Território brasileiro inclui o espaço aéreo ilimitadamente."** ❌ Apenas a coluna atmosférica sobrejacente ao solo e ao mar territorial.

**Revisão-relâmpago**

| Tema | Regra |
|---|---|
| Território | Solo, subsolo, mar territorial (12 milhas), espaço aéreo + extensão (art. 5º, § 1º) |
| Lugar do crime | Ubiquidade (art. 6º) |
| Tempo do crime | Atividade (art. 4º) |
| Extraterritorialidade | Incondicionada (I), condicionada (II + § 2º), hipercondicionada (§ 3º) |
| Pena cumprida fora | Atenua ou é computada (art. 8º) |
| Sentença estrangeira | Homologação no STJ: efeitos civis ou medida de segurança (art. 9º) |
| Crimes fora do Brasil (CPP) | Capital do último domicílio; senão, Brasília (art. 88) |

:::exemplo
Situação: Um policial federal brasileiro, em missão em outro país, desvia verba pública federal.
Pergunta: Há extraterritorialidade? De que tipo?
Resposta: **Incondicionada** (art. 7º, I, *b* e *c*): crime contra o patrimônio da União e contra a administração pública por quem está a seu serviço.
:::

:::exemplo
Situação: Um turista estrangeiro agride outro estrangeiro dentro de um navio de bandeira estrangeira, privado, atracado no porto de Santos.
Pergunta: Qual lei se aplica?
Resposta: A **brasileira** (art. 5º, § 2º): embarcação estrangeira privada em porto brasileiro. Ressalvam-se tratados.
:::
"""),
], None)

FLASH = """

**Qual teoria o CP adota quanto ao lugar do crime?**
→ A **ubiquidade** (art. 6º): conduta ou resultado, no todo ou em parte.

**E quanto ao tempo do crime?**
→ A teoria da **atividade** (art. 4º).

**O que é extraterritorialidade incondicionada?**
→ Aplicação da lei brasileira a crimes cometidos no exterior sem condições (art. 7º, I): contra o Presidente, contra o patrimônio/fé pública de entes públicos, contra a administração por quem a serve, e genocídio (agente brasileiro ou domiciliado).

**Quais as condições da extraterritorialidade condicionada?**
→ Entrada no território; dupla incriminação; crime extraditável; não absolvição nem cumprimento de pena; não perdão/extinção da punibilidade (art. 7º, § 2º).

**O que é a extraterritorialidade hipercondicionada?**
→ Crime de estrangeiro contra brasileiro no exterior: exige o § 2º + extradição não pedida ou negada + requisição do Ministro da Justiça (§ 3º).

**O que faz o art. 8º do CP?**
→ A pena cumprida no exterior atenua a brasileira (penas diversas) ou é computada (penas idênticas).

**Quem homologa sentença penal estrangeira?**
→ O STJ (CF, art. 105, I, *i*), para efeitos civis ou medida de segurança (art. 9º).

**Navio mercante brasileiro em alto-mar: que lei?**
→ A brasileira (extensão do território, art. 5º, § 1º).

**Qual o foro para crimes cometidos no exterior (CPP, art. 88)?**
→ Capital do Estado em que o acusado residiu por último; se nunca residiu no Brasil, Brasília.
"""

build("l02.json", "aplicacao-da-lei-penal-2-12-lei-penal-no-espaco-lugar-do-crime-e-teoria-da-ubiquidade", 4, [M1, M2, M3, M4, M5, M6], FLASH)
