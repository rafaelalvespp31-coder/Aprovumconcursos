import json
from helpers import *

CASOS = [
    ("Favorecimento pessoal", "O secretário de administração muda o critério de distribuição de vagas de estacionamento para que só o setor do seu cunhado tenha vagas cobertas.", "Qual princípio é violado?", "(A) Eficiência • (B) Impessoalidade • (C) Publicidade", "**B — Impessoalidade** (e moralidade).", "O ato foi praticado para **favorecer pessoa determinada**, e não para atender o interesse público: há **desvio de finalidade**."),
    ("Publicidade institucional", "O governo veicula campanha de vacinação com a frase-símbolo e a foto do governador.", "A campanha é regular?", "(A) Sim, informa a população • (B) Não, há promoção pessoal", "**B.**", "A campanha deve ser **educativa, informativa ou de orientação social**, sem **nomes, símbolos ou imagens** de promoção pessoal (art. 37, § 1º)."),
    ("Distribuição interna de competências", "O Estado divide sua Secretaria de Segurança em superintendências regionais subordinadas ao secretário.", "Que fenômeno ocorreu?", "(A) Descentralização por outorga • (B) Desconcentração • (C) Delegação", "**B — Desconcentração.**", "Competências foram distribuídas **dentro da mesma pessoa jurídica** (o Estado), criando **órgãos** com **hierarquia**. Nenhuma pessoa nova surgiu."),
    ("Criação de entidade administrativa", "Lei estadual autoriza a criação de empresa com capital 100% do Estado, organizada como sociedade limitada, para prestar serviços de informática ao governo.", "Que entidade é essa e é válida a forma?", "(A) Sociedade de economia mista, inválida • (B) Empresa pública, válida • (C) Autarquia, inválida", "**B — Empresa pública, forma válida.**", "Capital **integralmente público** caracteriza **empresa pública**, que pode adotar **qualquer forma societária** (Lei 13.303/2016, art. 3º)."),
    ("Ato ilegal", "Descobre-se que uma licença de funcionamento foi concedida sem a vistoria que a lei exige. A licença foi expedida há 8 meses.", "O que a Administração deve fazer?", "(A) Revogar, com efeitos futuros • (B) Anular, garantindo contraditório se houver efeitos concretos • (C) Nada, pois gerou direito adquirido", "**B.**", "Há **ilegalidade** → **anulação** (dever — Lei 9.784/1999, art. 53), com efeitos **retroativos**; como o ato já produziu efeitos, o desfazimento deve ser precedido de **processo administrativo** (STF, Tema 138). Ato ilegal não gera direito adquirido (Súmula 473)."),
    ("Retirada de ato válido", "A prefeitura autorizou, de forma precária, a instalação de mesas de bar na calçada. Agora a calçada será usada para uma ciclovia.", "Qual é a forma de retirada?", "(A) Anulação • (B) Revogação • (C) Cassação por ilegalidade", "**B — Revogação.**", "O ato era **válido**; deixou de ser **conveniente e oportuno**. A revogação tem efeitos **ex nunc** e só pode ser feita pela própria Administração."),
    ("Concurso público", "O edital fixa validade de 1 ano. No fim do prazo, a Administração prorroga por 2 anos.", "A prorrogação é válida?", "(A) Sim, o máximo é 2 anos • (B) Não, a prorrogação deve ser por igual período (1 ano)", "**B.**", "Art. 37, III: validade **até 2 anos**, prorrogável **uma vez**, por **igual período**. Se a validade foi de 1 ano, a prorrogação só pode ser de **1 ano**."),
    ("Acumulação de cargos", "Uma professora da rede estadual (manhã) é aprovada para professora da rede municipal (tarde).", "Ela pode acumular?", "(A) Não, a acumulação é vedada • (B) Sim, se houver compatibilidade de horários e respeitado o teto", "**B.**", "Dois cargos de **professor** é exceção expressa (art. 37, XVI, \"a\"), com **compatibilidade de horários** e observado o **teto** (inciso XI)."),
    ("Eficiência administrativa", "Um órgão adota agendamento on-line e metas de atendimento, reduzindo filas de 3 horas para 20 minutos, sem alterar requisitos legais.", "Qual princípio se destaca?", "(A) Eficiência • (B) Publicidade • (C) Moralidade", "**A — Eficiência.**", "Melhor resultado com bom uso de recursos, **dentro da legalidade** — a Administração gerencial trazida pela EC 19/1998."),
    ("Responsabilidade estatal", "Durante uma tempestade de intensidade excepcional e imprevisível, uma árvore saudável, sob manutenção regular, cai sobre um carro estacionado.", "O Município responde?", "(A) Sempre, a responsabilidade é objetiva • (B) Não, se ficar provada a força maior que rompeu o nexo causal", "**B.**", "A teoria do **risco administrativo** admite **excludentes**: a **força maior** rompe o nexo causal. Se, ao contrário, a árvore estivesse condenada e o Município tivesse sido avisado, haveria responsabilidade."),
]
body = "Cada caso traz a **situação**, a **pergunta**, as **possibilidades**, a **resposta** e a **justificativa**. Tente responder antes de ler o gabarito.\n\n"
for i, (t, s, p, a, r, j) in enumerate(CASOS, 1):
    body += f"**💡 Caso {i} — {t}**\n\n{s}\n\n**Pergunta:** {p}\n\n**Possibilidades:** {a}\n\n✅ **Resposta:** {r} {j}\n\n"
sec("exemplos", "Módulo 9 — Casos práticos resolvidos", body, ["N0035", "N0038", "N0027", "N0032", "N0046", "N0004", "N0052", "N0039", "N0055", "N0057"])

sec("pegadinhas", "🚨 Certo ou errado? As pegadinhas mais cobradas", """
1. "Na desconcentração, a Administração cria nova pessoa jurídica." → ❌ **Errado.** Cria **órgãos** dentro da mesma pessoa.
2. "Entre o ente federativo e a autarquia que ele criou há hierarquia." → ❌ **Errado.** Há **vinculação** (controle finalístico).
3. "Autarquia tem a criação autorizada por lei e adquire personalidade com o registro." → ❌ **Errado.** É **criada** por lei, sem registro.
4. "Empresa pública deve ser constituída sob a forma de sociedade anônima." → ❌ **Errado.** Pode adotar **qualquer forma**; S/A obrigatória é para a **sociedade de economia mista**.
5. "Sociedade de economia mista tem capital integralmente público." → ❌ **Errado.** Capital **misto**, com **maioria do capital votante** público.
6. "Fundação pública sempre tem personalidade de direito privado." → ❌ **Errado.** Pode ser de direito **público** ou **privado**.
7. "Razoabilidade está expressa no caput do art. 37." → ❌ **Errado.** Só o **LIMPE** está ali.
8. "A eficiência consta do art. 37 desde a promulgação da CF/1988." → ❌ **Errado.** Entrou com a **EC 19/1998**.
9. "O Judiciário pode revogar ato discricionário do Executivo por julgá-lo inconveniente." → ❌ **Errado.** O Judiciário **anula** atos ilegais; **não revoga** atos de outro Poder.
10. "A anulação produz efeitos ex nunc." → ❌ **Errado.** Em regra, **ex tunc** (retroativos).
11. "O concurso pode ser prorrogado duas vezes, desde que o total não passe de quatro anos." → ❌ **Errado.** Prorrogação **uma única vez**, por **igual período**.
12. "Função de confiança pode ser exercida por pessoa sem vínculo com a Administração." → ❌ **Errado.** **Exclusivamente** por servidor **efetivo**.
13. "É permitido acumular um cargo de professor com outro técnico ou científico, havendo compatibilidade de horários." → ✅ **Certo** (XVI, "b").
14. "Nomear primo do prefeito para cargo em comissão viola a SV 13." → ❌ **Errado pela SV 13**: primo é **4º grau** (a lei local pode proibir).
15. "A responsabilidade civil do Estado é objetiva e, por isso, ele responde por qualquer dano, sem exceção." → ❌ **Errado.** Há **excludentes** (culpa exclusiva da vítima, força maior, fato de terceiro).
16. "A vítima pode escolher processar diretamente o servidor causador do dano." → ❌ **Errado** segundo o STF (Tema 940): a ação é contra o **Estado**.
17. "O direito de regresso contra o agente depende de dolo ou culpa." → ✅ **Certo.**
18. "Improbidade administrativa importa a cassação dos direitos políticos." → ❌ **Errado.** **Suspensão** (art. 37, § 4º).
""", ["N0027", "N0028", "N0030", "N0031", "N0032", "N0033", "N0034", "N0046", "N0004", "N0006", "N0009", "N0053", "N0055", "N0056", "N0016"])

sec("interpretacao_banca", "Como as bancas cobram este tema", """
- **Estilo certo/errado (Cebraspe):** troca de **uma palavra** muda o gabarito — "criada" × "autorizada", "hierarquia" × "vinculação", "ex tunc" × "ex nunc", "suspensão" × "cassação", "uma vez" × "duas vezes". Leia devagar os verbos e as quantidades.
- **Estilo múltipla escolha (FGV, Vunesp, outras):** casos práticos curtos pedindo o **princípio violado**, a **entidade** correta ou a **forma de retirada do ato** (anular × revogar). Muitas vezes duas alternativas parecem certas; a correta é a que usa o **fundamento exato**.
- **Lei seca do art. 37:** incisos **II, III, V, XVI, XIX** e §§ **1º, 4º e 6º** aparecem com frequência na forma literal, com uma palavra trocada.
- **Doutrina × lei × CF:** a banca adora perguntar **onde** está o princípio (art. 37 × Lei 9.784/1999 × implícito).
- **Jurisprudência:** SV 13 (nepotismo), SV 43 e 44 (concurso), Súmulas 346 e 473 (autotutela), Temas 161 e 784 (nomeação), Tema 940 (dupla garantia) e Tema 592 (morte de detento).
- 🎯 **Dica do professor:** quando a questão disser "segundo o STF", responda com a jurisprudência; quando disser "segundo a doutrina majoritária", responda com a doutrina — nos temas de **omissão estatal** e **cargos políticos x nepotismo**, as duas podem divergir.
""", ["N0018", "N0001", "N0034", "N0045", "N0048", "N0054"])

sec("flashcards", "Flashcards de revisão", """
**Sentido subjetivo da Administração Pública?**
→ **Quem** administra: órgãos, entidades e agentes (orgânico/formal).

**Sentido objetivo?**
→ **A atividade**: serviço público, polícia administrativa, fomento, intervenção (material/funcional).

**Órgão tem personalidade jurídica?**
→ **Não.** Entidade tem. Órgão = centro de competências (Lei 9.784/1999, art. 1º, § 2º).

**Desconcentração × descentralização?**
→ Desconcentração: **dentro** da mesma pessoa, com hierarquia. Descentralização: para **outra** pessoa, com vinculação.

**Qual entidade da Indireta é CRIADA por lei?**
→ A **autarquia** (e a fundação de direito público). EP, SEM e fundação privada: lei **autoriza**.

**Empresa pública × sociedade de economia mista?**
→ EP: capital **100% público**, **qualquer** forma. SEM: capital **misto** (maioria votante pública), **S/A**.

**O que é o LIMPE?**
→ **L**egalidade, **I**mpessoalidade, **M**oralidade, **P**ublicidade, **E**ficiência (art. 37, caput).

**Quando a eficiência entrou na CF?**
→ Com a **EC 19/1998**.

**Anulação × revogação?**
→ Anulação: **ilegalidade**, ex tunc, Administração ou Judiciário. Revogação: **mérito**, ex nunc, só a Administração.

**Prazo para anular ato favorável?**
→ **5 anos**, salvo **má-fé** (Lei 9.784/1999, art. 54).

**Validade do concurso?**
→ **Até 2 anos**, prorrogável **uma vez**, por **igual período** (art. 37, III).

**Quem exerce função de confiança?**
→ **Exclusivamente** servidor de **cargo efetivo** (art. 37, V).

**Exceções à vedação de acumular?**
→ Professor + professor; professor + técnico/científico; dois privativos de saúde — com **horários compatíveis** e **teto**.

**SV 13 alcança até que grau?**
→ **3º grau** (inclui tios e sobrinhos; primo, 4º grau, não).

**Responsabilidade do Estado × regresso?**
→ Estado: **objetiva**. Regresso contra o agente: **dolo ou culpa**.
""", ["N0019", "N0020", "N0026", "N0027", "N0030", "N0032", "N0033", "N0034", "N0039", "N0046", "N0047", "N0004", "N0006", "N0052", "N0053", "N0055", "N0056"])

sec("resumo", "Resumo por módulo, revisão de véspera e glossário", """
**🔁 Resumo estruturado**
- **M1 — Fundamentos:** Administração executa; Governo decide. Subjetivo = quem; objetivo = atividade. Função administrativa existe nos três Poderes.
- **M2 — Organização:** Direta = entes + órgãos (hierarquia). Indireta = autarquias, fundações, EP e SEM (vinculação). Órgão ≠ entidade. Desconcentração cria órgão; descentralização transfere para outra pessoa.
- **M3 — Entidades:** autarquia (pública, **criada** por lei); fundação (pública ou privada; LC define áreas); EP (privada, capital 100% público, qualquer forma); SEM (privada, capital misto, S/A).
- **M4 — LIMPE:** só esses cinco no caput; eficiência pela EC 19/1998; § 1º veda promoção pessoal; § 4º improbidade com **suspensão** de direitos políticos.
- **M5 — Outros princípios:** supremacia (prerrogativas) × indisponibilidade (limites); continuidade; razoabilidade/proporcionalidade/motivação/segurança jurídica na Lei 9.784/1999; especialidade.
- **M6 — Autotutela:** anula o ilegal (dever, ex tunc), revoga o inconveniente (faculdade, ex nunc); 5 anos para anular ato favorável, salvo má-fé; Súmulas 346 e 473.
- **M7 — Cargos:** concurso de provas ou provas e títulos; validade até 2 + 2; comissão (qualquer pessoa) × confiança (só efetivo); acumulação só nas exceções; SV 13 até o 3º grau.
- **M8 — Responsabilidade:** objetiva (risco administrativo, com excludentes); regresso exige dolo ou culpa; vítima processa o Estado (Tema 940); omissão específica → objetiva segundo o STF.

**⏱️ Revisão de véspera (10 linhas)**
1. LIMPE — e mais nada no caput. 2. Eficiência = EC 19/1998. 3. Autarquia **criada**; demais **autorizadas**. 4. EP 100% pública, qualquer forma; SEM mista, S/A. 5. Órgão sem personalidade. 6. Desconcentração = hierarquia; descentralização = vinculação. 7. Anula ilegal (ex tunc); revoga inconveniente (ex nunc). 8. Concurso: 2 anos + 1 prorrogação igual. 9. Confiança só efetivo; comissão qualquer pessoa. 10. Estado objetivo; agente só com dolo ou culpa.

**📚 Glossário**
- **Autotutela:** poder de rever os próprios atos sem ir ao Judiciário.
- **Desvio de finalidade:** ato praticado para fim diverso do interesse público previsto na lei.
- **Ex tunc / ex nunc:** efeitos retroativos / efeitos daqui para frente.
- **Mérito administrativo:** margem de conveniência e oportunidade do ato discricionário.
- **Nexo causal:** ligação entre a conduta e o dano.
- **Outorga / delegação:** transferência por lei da titularidade e execução / transferência por contrato ou ato só da execução.
- **Teoria do órgão:** a atuação do agente é imputada à pessoa jurídica.
- **Vinculação (tutela):** controle finalístico do ente sobre a entidade que criou, nos limites da lei.
""", ["N0018", "N0023", "N0029", "N0034", "N0040", "N0045", "N0048", "N0054"])

sec("checklist", "Checklist: você consegue…", """
- [ ] Diferenciar sentido **subjetivo** e **objetivo** e Administração × **Governo**?
- [ ] Dar um exemplo de função **atípica** de cada Poder?
- [ ] Explicar por que um **órgão** não tem personalidade e quem responde pelos atos dele?
- [ ] Distinguir **desconcentração** e **descentralização** (outorga × delegação)?
- [ ] Diferenciar **hierarquia** de **vinculação**?
- [ ] Preencher, de cabeça, a tabela das **quatro entidades** da Indireta?
- [ ] Explicar por que **EP** e **SEM** são diferentes quanto ao **capital** e à **forma**?
- [ ] Dizer o **LIMPE** e onde estão a razoabilidade e a proporcionalidade?
- [ ] Decidir entre **anular** e **revogar** um ato, com os efeitos e o prazo de 5 anos?
- [ ] Aplicar as regras de **validade do concurso** e o direito à nomeação (Tema 161)?
- [ ] Diferenciar **cargo em comissão** de **função de confiança**?
- [ ] Listar as exceções à **vedação de acumular** cargos?
- [ ] Dizer até que grau vai a **SV 13** e o que é nepotismo **cruzado**?
- [ ] Resolver um caso de **responsabilidade civil** com excludentes e **regresso**?
""", ["N0019", "N0020", "N0021", "N0022", "N0026", "N0027", "N0028", "N0029", "N0034", "N0046", "N0049", "N0051", "N0052", "N0053", "N0055", "N0056"])

json.dump(S, open("conteudo-catalogo-adm/sec4.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(len(S), [len(s["bodyMarkdown"]) for s in S])
