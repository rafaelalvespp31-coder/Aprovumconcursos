/**
 * Comandos prontos para pedir a aula ou as questões ao ChatGPT (ou outro assistente) já no
 * formato que o painel entende. O administrador copia, troca o tema, cola no ChatGPT e cola a
 * resposta no campo de texto do painel.
 */

export const LESSON_PROMPT = `Monte uma aula completa para concursos públicos sobre: [ESCREVA AQUI O TEMA, A LEI E OS ARTIGOS]

Responda SOMENTE com o texto no formato abaixo, dentro de UM único bloco de código, sem comentários antes ou depois. Mantenha exatamente os marcadores === e --- e os nomes dos campos.

=== AULA ===
Título: (nome da aula, ex.: Furto (art. 155 do CP))
Matéria: (uma destas: Língua Portuguesa, Matemática, Raciocínio Lógico, Informática, Direito Constitucional, Direito Administrativo, Direito Penal, Direito Processual Penal, Legislação Especial, Conhecimentos Específicos)
Tipo: (dispositivo, se for artigo de lei; tema, se não for)
Lei: (sigla: CP, CPP, CF, LEP, CTB, ECA ou o número, ex.: Lei 11.343; vazio se for tema)
Artigos: (ex.: 155 ou 121, 121-A; vazio se for tema)
Sinônimos: (outros nomes do assunto, separados por ;)
Tempo estimado: (minutos, ex.: 60)
Objetivo: (uma frase)
Resumo: (duas ou três frases)

=== TEXTO-BASE ===
(Se for lei: o texto literal dos artigos, um dispositivo por linha, começando com "Art.", "§", "I -", "a)". Se for tema: um sumário numerado, um tópico por linha: 1 Tópico; 1.1 Subtópico; 2 Tópico.)

=== MÓDULO: 1. Nome do módulo ===

--- SEÇÃO: tipo | Título da seção ---
Itens: (dispositivos ou tópicos do TEXTO-BASE que a seção ensina, separados por ;, ex.: Art. 155; § 1º; § 4º, I  — ou 1.1; 1.2)
(Conteúdo da seção em Markdown: parágrafos, listas, **negrito**, tabelas com |.)

(Repita as seções. Use de 4 a 7 módulos e de 12 a 28 seções no total. Tipos de seção permitidos: introdução, explicação, conceitos fundamentais, texto legal, exemplos, aplicação, comparação, quadro comparativo, exceções, pegadinhas, interpretação da banca, doutrina, jurisprudência, esquema, resumo, checklist, flashcards, próxima etapa. Inclua pelo menos: introdução, explicação, texto legal (quando for lei), exemplos, pegadinhas, quadro comparativo e resumo. Cada seção com no máximo 10.000 caracteres.)

=== REFERÊNCIAS ===
Lei: (ex.: Código Penal, art. 155)
Doutrina: (autor, obra)
Jurisprudência: (só cite decisões que você tem certeza que existem, com tribunal e número)

=== A CONFERIR ===
(Uma linha para cada afirmação que deve ser conferida na fonte oficial antes de publicar: números de súmulas, teses, julgados, alterações recentes da lei. Não invente número de processo, tese ou súmula.)

=== QUESTÕES: FÁCIL ===

--- QUESTÃO ---
Tipo: múltipla escolha
Item: (dispositivo ou tópico do TEXTO-BASE cobrado, ex.: § 4º, I)
Essencial: (sim ou não)
Enunciado: (texto da questão)
A) (alternativa)
Comentário: (por que está certa ou errada)
B) (alternativa)
Comentário: (por que está certa ou errada)
C) (alternativa)
Comentário: (…)
D) (alternativa)
Comentário: (…)
E) (alternativa)
Comentário: (…)
Gabarito: (letra)
Justificativa: (explicação completa da resposta)

--- QUESTÃO ---
Tipo: certo ou errado
Item: (…)
Enunciado: (afirmação)
Gabarito: (Certo ou Errado)
Justificativa: (…)

=== QUESTÕES: MÉDIO ===
(mesmo formato)

=== QUESTÕES: DIFÍCIL ===
(mesmo formato)

Regras: escreva PELO MENOS 12 questões em cada nível (fácil, médio e difícil), misturando múltipla escolha e certo ou errado, no estilo das bancas (FGV, CEBRASPE, VUNESP, FCC). Questões autorais: não atribua a nenhuma banca ou concurso real. Gabarito sempre coerente com a justificativa. Não use os marcadores === ou --- dentro do conteúdo.`;

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
Justificativa: (opcional)

--- QUESTÃO ---
Tipo: certo ou errado
Enunciado: (afirmação)
Gabarito: (Certo ou Errado)

Regras: se for questão autoral (não de prova), deixe Banca, Ano e Concurso vazios. Qualquer campo do PADRÃO pode ser repetido dentro de uma questão para valer só para ela.`;
