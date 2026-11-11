/**
 * COMANDO-MESTRE DO TÓPICO: um comando só para o tópico inteiro do plano, com TODOS os subtópicos.
 * O ChatGPT escreve uma aula por subtópico (cada uma no padrão do comando de subtópico) e o resultado
 * inteiro vai num único .txt para a importação em massa. Puro.
 */
import { DELIVERY_CONTRACT } from "./delivery";
import { visualRulesCompact } from "./export";
import { groupHeaderLines, type OutlineGroup } from "./topic-group";
import { itemModules, pieces } from "./subtopic-prompt";

export function buildTopicMasterPrompt(input: { disciplineMode: string; group: OutlineGroup; year?: number }): string {
  const { group } = input;
  const subs = group.subtopics;
  if (!subs.length) return "";
  const all = subs.map((sub) => pieces({ disciplineMode: input.disciplineMode, group, sub, year: input.year }));
  const first = all[0]!;
  const topicLabel = `${group.code ? `${group.code}. ` : ""}${group.title}`;

  const list = all
    .map((p, i) => `SUBTÓPICO ${i + 1} DE ${all.length}\n${groupHeaderLines(group, subs[i]!).join("\n")}\nTEXTO-BASE (copie exatamente, um item por linha):\n${p.items.map((it) => `${it.key} ${it.title}`).join("\n")}`)
    .join("\n\n");

  return `COMANDO-MESTRE DO TÓPICO — APROVUM

Você vai escrever as aulas de UM TÓPICO do edital, com TODOS os subtópicos dele, no PADRÃO APROVUM (a profundidade da aula-modelo de Homicídio do catálogo).

TÓPICO: ${topicLabel}
SUBTÓPICOS: ${all.length}
${subs.map((s, i) => `${i + 1}. ${s.code ? `${s.code} ` : ""}${s.title}`).join("\n")}

COMO TRABALHAR
1. Escreva UMA AULA POR SUBTÓPICO, na ordem acima. Cada aula é completa e independente (aula, referências e questões), como se fosse o único comando.
2. Cada aula vai em UM bloco de código próprio, começando em "=== AULA ===". Nada antes nem depois dos blocos, exceto a linha de controle do passo 4.
3. Não ensine o que é de outro subtópico do tópico: cite-o só para diferenciar.
4. Se não couber tudo numa mensagem, entregue quantas aulas completas couberem e termine com a linha: "Entreguei os subtópicos X a Y de ${all.length}. Digite 'próximo'." Quando eu digitar "próximo", continue do subtópico seguinte. Nunca entregue uma aula pela metade; se cortar, eu digito "continue" e você retoma exatamente de onde parou, sem repetir.
5. Ao terminar o último subtópico, escreva: "Tópico completo: ${all.length} aulas entregues."

${DELIVERY_CONTRACT}

${first.updates}

${first.review}

${visualRulesCompact()}

${first.sectionRules}

DADOS DE CADA SUBTÓPICO
Em cada aula, use no bloco "=== AULA ===" as linhas "Tópico:" e "Subtópico:" exatamente como abaixo e copie o TEXTO-BASE exatamente. Em "Itens:", use SOMENTE números que existam no TEXTO-BASE daquela aula. Cada item do TEXTO-BASE ganha o próprio módulo (explicação e, quando couber, pegadinhas) e deve ser ESGOTADO: regras, hipóteses, exceções, súmulas/teses, pegadinhas e casos de prova.

${list}

ESQUELETO PADRÃO (use o mesmo para TODAS as aulas; troque Título, Subtópico, TEXTO-BASE e os módulos de item de cada subtópico)
${first.lesson(itemModules(first.items, first.slots))}

${first.refs}

${first.qs}

ANTES DE ENTREGAR CADA AULA, CONFIRA
- Todas as aulas têm "Tópico:" e "Subtópico:" iguais aos da lista; nenhum subtópico ficou de fora ou repetido.
- Cada TEXTO-BASE é igual ao da lista; cada "Itens:" só cita números do próprio TEXTO-BASE.
- Cada aula tem 12 questões fáceis, 12 médias e 12 difíceis (mínimo de 10 por nível), com gabarito igual à justificativa.
- Cada aula está em um bloco de código próprio, começando em "=== AULA ===".`;
}
