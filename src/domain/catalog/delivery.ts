/**
 * Entrega obrigatória de toda aula pedida ao ChatGPT: as questões dos três níveis e os flashcards.
 * Pede 12 por nível (o sistema só publica com 10 válidas em cada nível, e 2 de folga cobrem uma questão descartada).
 */
export const QUESTIONS_PER_LEVEL = 12;
export const MIN_VALID_PER_LEVEL = 10;

/** Bloco de "contrato de entrega" para o começo do comando (aula inteira). */
export const DELIVERY_CONTRACT = `ENTREGA OBRIGATÓRIA EM ETAPAS (é assim que nada fica faltando)
Uma resposta só não comporta aula + flashcards + ${QUESTIONS_PER_LEVEL * 3} questões; por isso entregue em ETAPAS, cada uma em UM bloco de código, na ordem, e só passe para a próxima quando eu escrever "continuar":
- ETAPA 1: do cabeçalho da aula até o fim do último módulo, incluindo o Resumo e o Checklist (sem flashcards e sem questões ainda). Termine com a linha "[FIM DA ETAPA 1 — escreva continuar]" FORA do bloco de código.
- ETAPA 2: a seção "--- SEÇÃO: flashcards | Flashcards de revisão ---" com 12 a 15 cartões, as seções de referências e de itens a conferir.
- ETAPA 3: ${QUESTIONS_PER_LEVEL} em "=== QUESTÕES: FÁCIL ===".
- ETAPA 4: ${QUESTIONS_PER_LEVEL} em "=== QUESTÕES: MÉDIO ===".
- ETAPA 5: ${QUESTIONS_PER_LEVEL} em "=== QUESTÕES: DIFÍCIL ===".
Regras: (1) NUNCA resuma a aula para sobrar espaço: a aula é completa e as etapas seguintes existem justamente para isso. (2) Cada etapa começa exatamente onde a anterior parou, sem repetir nem reabrir o cabeçalho da aula. (3) Se uma etapa for cortada por tamanho, termine onde parou e, quando eu escrever "continue", siga dali. (4) O sistema só publica a aula com no mínimo ${MIN_VALID_PER_LEVEL} questões válidas em CADA nível, por isso entregue ${QUESTIONS_PER_LEVEL} por nível, cada uma com Enunciado, alternativas (A a E) ou Certo/Errado, Gabarito e Justificativa. (5) Aula sem flashcards ou sem os três níveis de questões é aula incompleta: nunca encerre sem as 5 etapas.

COBERTURA TOTAL E ATUALIDADE (obrigatórias)
- A aula é 100% estruturada, sem erros e totalmente atualizada até a data deste pedido: ensine somente o que está vigente hoje (leis, alterações, revogações, súmulas, teses e entendimento atual do STF e do STJ) e registre na seção de itens a conferir o que não tiver certeza.
- Não falte nada: toda pegadinha de concurso que costuma cair no assunto (as de cada item e as que misturam itens), toda didática (exemplo do dia a dia, caso de prova resolvido, tabela, esquema, comparação com figuras próximas, passo a passo), toda exceção e toda aula específica que o assunto pede. Se o assunto for extenso, abra mais módulos e seções em vez de resumir.
- Ensine tudo de forma coordenada e estruturada: do geral ao específico, cada item do edital no seu módulo, na ordem do TEXTO-BASE, sempre ligando um item ao seguinte.`;

/** Lembrete curto para o fim do comando (o que está no fim é o que o modelo mais obedece). */
export const DELIVERY_REMINDER = `LEMBRETE FINAL: entregue em etapas (aula, flashcards e referências, fácil, médio, difícil) e só está completo com ${QUESTIONS_PER_LEVEL} questões FÁCEIS, ${QUESTIONS_PER_LEVEL} MÉDIAS e ${QUESTIONS_PER_LEVEL} DIFÍCEIS e com a seção de flashcards (12 a 15 cartões). Se faltar qualquer uma, a aula não pode ser publicada.`;

/** Versão só de questões (comando das questões de fixação). */
export const QUESTIONS_CONTRACT = `ENTREGA OBRIGATÓRIA: ${QUESTIONS_PER_LEVEL} questões em cada nível pedido (o sistema só publica com ${MIN_VALID_PER_LEVEL} válidas por nível). Cada uma com Enunciado, alternativas ou Certo/Errado, Gabarito e Justificativa. Se cortar por tamanho, eu escrevo "continue": siga de onde parou, sem repetir, e nunca encerre antes do último nível.`;
