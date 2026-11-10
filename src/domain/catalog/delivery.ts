/**
 * Entrega obrigatória de toda aula pedida ao ChatGPT: as questões dos três níveis e os flashcards.
 * Pede 12 por nível (o sistema só publica com 10 válidas em cada nível, e 2 de folga cobrem uma questão descartada).
 */
export const QUESTIONS_PER_LEVEL = 12;
export const MIN_VALID_PER_LEVEL = 10;

/** Bloco de "contrato de entrega" para o começo do comando (aula inteira). */
export const DELIVERY_CONTRACT = `ENTREGA OBRIGATÓRIA — NADA DISTO PODE FALTAR
1. QUESTÕES: ${QUESTIONS_PER_LEVEL} em "=== QUESTÕES: FÁCIL ===", ${QUESTIONS_PER_LEVEL} em "=== QUESTÕES: MÉDIO ===" e ${QUESTIONS_PER_LEVEL} em "=== QUESTÕES: DIFÍCIL ===" (${QUESTIONS_PER_LEVEL * 3} no total). O sistema só publica a aula com no mínimo ${MIN_VALID_PER_LEVEL} válidas em CADA nível; por isso nunca entregue menos de ${QUESTIONS_PER_LEVEL}. Toda questão com Enunciado, alternativas (A a E) ou Certo/Errado, Gabarito e Justificativa.
2. FLASHCARDS: a seção "--- SEÇÃO: flashcards | Flashcards de revisão ---" com 12 a 15 cartões, no último módulo. Aula sem flashcards é aula incompleta.
3. Se o espaço da resposta acabar, NÃO corte questões nem flashcards para caber: encurte explicações, termine o bloco onde parou e eu escrevo "continue"; siga de onde parou, sem repetir. Nunca encerre a resposta antes da última questão DIFÍCIL.
4. CONFERÊNCIA ANTES DE ENCERRAR (faça por dentro, sem escrever): contei ${QUESTIONS_PER_LEVEL} fáceis, ${QUESTIONS_PER_LEVEL} médias e ${QUESTIONS_PER_LEVEL} difíceis? Os flashcards estão lá? Se algo faltar, complete antes de terminar.`;

/** Lembrete curto para o fim do comando (o que está no fim é o que o modelo mais obedece). */
export const DELIVERY_REMINDER = `LEMBRETE FINAL: a resposta só está completa com ${QUESTIONS_PER_LEVEL} questões FÁCEIS, ${QUESTIONS_PER_LEVEL} MÉDIAS e ${QUESTIONS_PER_LEVEL} DIFÍCEIS e com a seção de flashcards (12 a 15 cartões). Se faltar qualquer uma, a aula não pode ser publicada.`;

/** Versão só de questões (comando das questões de fixação). */
export const QUESTIONS_CONTRACT = `ENTREGA OBRIGATÓRIA: ${QUESTIONS_PER_LEVEL} questões em cada nível pedido (o sistema só publica com ${MIN_VALID_PER_LEVEL} válidas por nível). Cada uma com Enunciado, alternativas ou Certo/Errado, Gabarito e Justificativa. Se cortar por tamanho, eu escrevo "continue": siga de onde parou, sem repetir, e nunca encerre antes do último nível.`;
