/**
 * Comandos prontos para pedir a aula ou as questões ao ChatGPT (ou outro assistente) já no
 * formato que o painel entende. O administrador copia, troca o tema, cola no ChatGPT e cola a
 * resposta no campo de texto do painel.
 */

import { visualRules } from "./export";

export const LESSON_PROMPT = `Você vai escrever uma aula completa para concursos públicos (carreiras policiais e jurídicas) no PADRÃO APROVUM.

TEMA: [ESCREVA AQUI O TEMA, A LEI E OS ARTIGOS — ex.: Furto, Código Penal, art. 155]

FORMATO OBRIGATÓRIO
- Responda SOMENTE com o texto no formato abaixo, dentro de UM único bloco de código, sem nada antes ou depois.
- Mantenha exatamente os marcadores (=== … === e --- … ---) e os nomes dos campos (Título:, Matéria:, Itens:, Enunciado:, Gabarito: etc.).
- Conteúdo das seções em Markdown: parágrafos curtos, **negrito** nos termos-chave, listas com "-", listas numeradas, tabelas com "|". Caixas de destaque com ">" no começo da linha, ex.: "> **Pegadinha:** …", "> **Por que isso importa na prova:** …", "> **A campeã de prova:** …".
- Não use os marcadores === ou --- dentro do conteúdo. Cada seção com no máximo 10.000 caracteres.
- Se a resposta for cortada por tamanho, eu vou pedir "continue": continue exatamente de onde parou, sem repetir nada e sem abrir explicações.

${visualRules()}

=== AULA ===
Título: (nome do tema + dispositivo, ex.: Furto (CP, art. 155))
Matéria: (uma destas: Direito Penal, Direito Processual Penal, Direito Constitucional, Direito Administrativo, Legislação Especial, Língua Portuguesa, Matemática, Raciocínio Lógico, Informática, Conhecimentos Específicos)
Tipo: (dispositivo, se for artigo de lei; tema, se não for)
Lei: (sigla ou número: CP, CPP, CF, LEP, CTB, ECA, Lei 11.343 …; vazio se for tema)
Artigos: (ex.: 155 ou 155, 155-A; vazio se for tema)
Tópico: (opcional: número e nome do tópico do edital que agrupa esta aula, ex.: 4. Ilicitude; vazio se a aula for avulsa)
Subtópico: (opcional: número e nome do subtópico, ex.: 4.1 Causas de exclusão da ilicitude; vazio se a aula for avulsa)
Sinônimos: (outros nomes pelos quais o aluno procura o assunto, separados por ;)
Tempo estimado: (minutos, entre 60 e 120)
Objetivo: (uma frase: "Dominar o art. X …: tipo penal, formas, penas, temas ligados e diferenças em relação aos crimes próximos.")
Resumo: (duas ou três frases)

=== TEXTO-BASE ===
(Primeiro o texto LITERAL e VIGENTE dos artigos, um dispositivo por linha: "Art. 155 - …", "Pena - …", "§ 1º …", "I - …", "a) …". Dispositivo revogado: "VI - (revogado pela Lei nº …)".
Depois, um sumário numerado dos subtemas da aula, um por linha, de 6 a 10 itens:
1 Tipo penal: bem jurídico, sujeitos, consumação e classificação
2 …
Se for tema (não lei), escreva só o sumário numerado, com subitens 1.1, 1.2 quando precisar.)

=== MÓDULO: Visão geral e lei seca ===

--- SEÇÃO: introdução | Visão geral: o que o art. X protege ---
Itens: (dispositivos/itens do TEXTO-BASE tratados, separados por ;, ex.: Art. 155; 1)
(O que é o crime em uma frase; lista com Bem jurídico, Quem pode cometer, Quem pode ser vítima; caixa "> **Por que isso importa na prova:** …"; lista numerada "Nesta aula você vai estudar, bloco por bloco: …".)

--- SEÇÃO: esquema | Mapa do art. X (bloco por bloco) ---
Itens: (caput e parágrafos)
(Tabela | Bloco | O que diz | Pena ou efeito | com uma linha por caput/parágrafo. Depois da tabela, os dispositivos revogados.)

--- SEÇÃO: texto legal | Texto legal do art. X ---
Itens: (todos os dispositivos do texto legal)
(O texto legal literal, cada linha começando com "> ".)

=== MÓDULO: O crime de … ===

--- SEÇÃO: conceitos fundamentais | Tipo penal: elementos, consumação e classificação ---
(Tipo objetivo, tipo subjetivo, consumação, tentativa; "Classificação doutrinária (decore):" em lista; caixa "> **Pegadinha:** …".)

--- SEÇÃO: explicação | (elemento subjetivo: dolo e culpa, ou o equivalente do tema) ---
(Conceitos com tabela comparativa | Espécie | O que o agente pensa | Exemplo |; caixa "> **A campeã de prova:** …".)

--- SEÇÃO: explicação | Iter criminis, tentativa e institutos da Parte Geral ligados ao tema ---

=== MÓDULO: Formas privilegiadas, qualificadas e majorantes ===
(Uma seção "explicação" ou "aprofundamento" para cada bloco do artigo: privilégio, cada grupo de qualificadoras, causas de aumento, parágrafos novos e revogados. Use tabelas sempre que houver lista de hipóteses.)

=== MÓDULO: Forma culposa e particularidades ===
(Uma ou duas seções: forma culposa, aumentos, perdão judicial ou o equivalente do tema. Se o crime não tiver forma culposa, diga isso e trate das particularidades.)

=== MÓDULO: Temas da Parte Geral que caem junto ===
(Duas ou três seções "aprofundamento": nexo causal, omissão, erros, concurso de pessoas — só o que tem relação com o tema.)

=== MÓDULO: Combinações, crimes próximos e julgamento ===
--- SEÇÃO: aprofundamento | (combinações possíveis, ex.: privilegiado-qualificado) ---
--- SEÇÃO: comparação | (o crime × figuras parecidas, em tabela) ---
--- SEÇÃO: quadro comparativo | (o crime × crimes próximos) ---
(Tabela | Crime | Artigo | Como diferenciar | Pena |.)
--- SEÇÃO: aplicação | (competência, ação penal, hediondez, dosimetria e benefícios) ---

=== MÓDULO: Casos práticos e pegadinhas ===
--- SEÇÃO: exemplos | Casos práticos resolvidos ---
(De 4 a 6 casos: "**Caso 1 — Título.** situação" e na linha seguinte "→ resposta com o enquadramento".)
--- SEÇÃO: pegadinhas | Pegadinhas de prova ---
(Lista numerada: "**\"afirmação falsa\"** Errado: explicação.")
--- SEÇÃO: exceções | Exceções e particularidades ---

=== MÓDULO: Doutrina, jurisprudência e bancas ===
--- SEÇÃO: doutrina | Como a doutrina explica ---
(Posições majoritárias, sem inventar autores.)
--- SEÇÃO: jurisprudência | O que os tribunais têm decidido ---
(Só súmulas e entendimentos que você tem certeza que existem, com tribunal e número. Nunca invente número de processo, tese ou súmula.)
--- SEÇÃO: interpretação da banca | Como as bancas cobram o art. X ---
(Como cobram Cebraspe, FGV, VUNESP/AOCP; tendências recentes; "Roteiro para resolver qualquer caso:" em lista numerada.)

=== MÓDULO: Revisão final ===
--- SEÇÃO: resumo | Resumo para revisão ---
(Tabela | Pergunta | Resposta | com 10 a 14 linhas: penas, frações, competência, hediondez, diferenças-chave.)
--- SEÇÃO: checklist | Checklist: você consegue… ---
(Lista "- [ ] …?" com 10 a 15 itens. Última linha: "Marcou tudo? Passe para as questões de fixação: são três níveis (fácil, médio e difícil), e cada um exige 90% de acertos.")
--- SEÇÃO: flashcards | Flashcards de revisão ---
(12 a 15 cartões no formato "**Pergunta?**" e, na linha seguinte, "→ resposta", separados por linha em branco.)

=== REFERÊNCIAS ===
Lei: (lei principal e artigos usados)
Lei: (cada lei que alterou o artigo, com número e ano)
Jurisprudência: (súmulas citadas, ex.: STJ, Súmula 18)

=== A CONFERIR ===
(Uma linha para cada ponto que precisa ser conferido na fonte oficial antes de publicar: redação de dispositivos alterados recentemente, hediondez, súmulas e entendimentos novos.)

=== QUESTÕES: FÁCIL ===
(12 questões: 6 de múltipla escolha e 6 de certo ou errado. Cobram a letra da lei, penas e conceitos básicos. Marque "Essencial: sim" em 6 delas.)

--- QUESTÃO ---
Tipo: múltipla escolha
Item: (um dispositivo ou item do TEXTO-BASE, ex.: § 1º ou 3)
Essencial: sim
Dificuldade: 1
Enunciado: (texto da questão)
A) (alternativa)
Comentário: (por que está certa ou errada, em uma frase)
B) (alternativa)
Comentário: (…)
C) (alternativa)
Comentário: (…)
D) (alternativa)
Comentário: (…)
E) (alternativa)
Comentário: (…)
Gabarito: (letra)
Justificativa: (explicação curta e objetiva da resposta)

--- QUESTÃO ---
Tipo: certo ou errado
Item: (…)
Essencial: não
Dificuldade: 1
Enunciado: (afirmação para julgar)
Gabarito: (Certo ou Errado)
Justificativa: (começa com "Certo." ou "Errado." e explica)

=== QUESTÕES: MÉDIO ===
(12 questões, mesmo formato: 9 de múltipla escolha e 3 de certo ou errado, Dificuldade: 3. Casos curtos que exigem aplicar o conceito; 5 essenciais.)

=== QUESTÕES: DIFÍCIL ===
(12 questões, mesmo formato: 7 de múltipla escolha e 5 de certo ou errado, Dificuldade: 4 ou 5. Casos longos no estilo FGV, combinação de institutos, crimes próximos e jurisprudência; 2 essenciais.)

REGRAS DAS QUESTÕES: todas autorais (não atribua a banca nem a concurso real); 5 alternativas (A a E) nas de múltipla escolha, todas plausíveis e com comentário; gabarito sempre coerente com a justificativa; distribua as letras corretas entre A e E; cada questão ligada a um "Item:" que exista no TEXTO-BASE; não repita questões.`;

export const QUESTIONS_PROMPT = `Organize as questões de concurso abaixo no formato a seguir. [COLE AQUI AS QUESTÕES OU DESCREVA A PROVA]

Responda SOMENTE com o texto no formato abaixo, dentro de UM único bloco de código, sem comentários antes ou depois. Mantenha exatamente os marcadores === e --- e os nomes dos campos. Não invente questões, gabaritos, bancas ou anos: use apenas o que foi informado.

=== PADRÃO ===
Matéria: (uma destas: Língua Portuguesa, Informática, Matemática, Direito Penal, Direito Constitucional, Direitos Humanos, Direito Processual Penal, Legislação Especial, Direito Administrativo)
Assunto: (assunto > subassunto, ex.: Crimes contra a vida > Homicídio)
Banca: (ex.: FGV)
Ano: (ex.: 2025)
Concurso: (nome do concurso/cargo)
Órgão: (ex.: PC MG)
Cargo: (ex.: Investigador)
Dificuldade: (difícil, muito difícil ou extrema)

=== QUESTÕES ===

--- QUESTÃO ---
Número: (número na prova)
Assunto: (só se for diferente do PADRÃO)
Enunciado: (texto completo)
A) (alternativa)
B) (alternativa)
C) (alternativa)
D) (alternativa)
E) (alternativa)
Gabarito: (letra)
Justificativa: (obrigatória: por que o gabarito está certo e as outras alternativas erradas, com base na lei)

--- QUESTÃO ---
Tipo: certo ou errado
Enunciado: (afirmação)
Gabarito: (Certo ou Errado)
Justificativa: (obrigatória)

Regras: se for questão autoral (não de prova), deixe Banca, Ano e Concurso vazios. Qualquer campo do PADRÃO pode ser repetido dentro de uma questão para valer só para ela.`;
