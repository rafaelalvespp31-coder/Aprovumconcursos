/**
 * Entrega obrigatória de toda aula pedida ao ChatGPT: as questões dos três níveis e os flashcards.
 * Pede 12 por nível (o sistema só publica com 10 válidas em cada nível, e 2 de folga cobrem uma questão descartada).
 */
export const QUESTIONS_PER_LEVEL = 12;
export const MIN_VALID_PER_LEVEL = 10;

/** Bloco de "contrato de entrega" para o começo do comando (aula inteira, numa resposta só). */
export const DELIVERY_CONTRACT = `ENTREGA OBRIGATÓRIA — UMA RESPOSTA SÓ, COMPLETA
Entregue TUDO numa única resposta, em UM bloco de código, nesta ordem: aula (módulos), flashcards, referências, itens a conferir e as questões. Não divida em etapas e não espere eu escrever nada.
1. ORÇAMENTO DE ESPAÇO: reserve desde o início o espaço das ${QUESTIONS_PER_LEVEL * 3} questões e dos flashcards (são obrigatórios). Escreva a aula DENSA e objetiva (tabelas, listas, sem repetir o que já disse, sem introduções vazias), sem cortar conteúdo: cada pegadinha, regra, exceção e exemplo entra uma vez, da forma mais enxuta. Comentário de alternativa: uma linha.
2. QUESTÕES: ${QUESTIONS_PER_LEVEL} em "=== QUESTÕES: FÁCIL ===", ${QUESTIONS_PER_LEVEL} em "=== QUESTÕES: MÉDIO ===" e ${QUESTIONS_PER_LEVEL} em "=== QUESTÕES: DIFÍCIL ===". O sistema só publica com no mínimo ${MIN_VALID_PER_LEVEL} válidas em CADA nível. Cada uma com Enunciado, alternativas (A a E) ou Certo/Errado, Gabarito e Justificativa.
3. FLASHCARDS: a seção "--- SEÇÃO: flashcards | Flashcards de revisão ---" com 12 a 15 cartões, no último módulo.
4. COBERTURA E ATUALIDADE: aula 100% estruturada, sem erros e atualizada até a data deste pedido (só o que está vigente hoje; dúvida vai em "=== A CONFERIR ==="). Não falte nenhuma pegadinha de concurso, didática, exceção ou aula específica do assunto; do geral ao específico, um módulo por item do edital, na ordem do TEXTO-BASE.
5. Se a resposta for cortada pelo limite do ChatGPT, eu escrevo "continue" e você segue exatamente de onde parou, sem repetir. Nunca encerre antes da última questão DIFÍCIL.
6. CONFERÊNCIA FINAL (por dentro, sem escrever): ${QUESTIONS_PER_LEVEL} fáceis, ${QUESTIONS_PER_LEVEL} médias, ${QUESTIONS_PER_LEVEL} difíceis e flashcards presentes? Se faltar algo, complete antes de terminar.`;

/** Lembrete curto para o fim do comando (o que está no fim é o que o modelo mais obedece). */
export const DELIVERY_REMINDER = `LEMBRETE FINAL: numa resposta só, com ${QUESTIONS_PER_LEVEL} questões FÁCEIS, ${QUESTIONS_PER_LEVEL} MÉDIAS e ${QUESTIONS_PER_LEVEL} DIFÍCEIS e a seção de flashcards (12 a 15 cartões). Aula densa para sobrar espaço; nada de etapas.`;

/** Versão só de questões (comando das questões de fixação). */
export const QUESTIONS_CONTRACT = `ENTREGA OBRIGATÓRIA: ${QUESTIONS_PER_LEVEL} questões em cada nível pedido (o sistema só publica com ${MIN_VALID_PER_LEVEL} válidas por nível). Cada uma com Enunciado, alternativas ou Certo/Errado, Gabarito e Justificativa. Se cortar por tamanho, eu escrevo "continue": siga de onde parou, sem repetir, e nunca encerre antes do último nível.`;
