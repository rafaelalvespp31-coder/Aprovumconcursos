/**
 * Divide o enunciado de uma questão nos três blocos da tela de resolver:
 * título (a frase que apresenta o assunto), texto-base (assertivas, trecho de lei, caso) e a pergunta
 * ("Assinale a alternativa correta:"). Funciona sobre o texto como foi cadastrado; quando não há estrutura
 * para separar, tudo fica no título e a pergunta padrão aparece.
 */
export interface EnunciadoPartes {
  titulo: string | null;
  base: string | null;
  pergunta: string;
}

const PERGUNTA = /^(assinale|marque|indique|aponte|julgue|escolha|selecione|identifique|responda|analise e assinale)\b/i;

export function perguntaPadrao(certoErrado: boolean): string {
  return certoErrado ? "Julgue o item e marque Certo ou Errado:" : "Assinale a alternativa correta:";
}

const colar = (linhas: string[]) => linhas.join(" ").replace(/\s+/g, " ").trim();

export function splitEnunciado(input: { statement: string; caseContext: string | null; certoErrado: boolean }): EnunciadoPartes {
  const padrao = perguntaPadrao(input.certoErrado);
  const statement = input.statement.trim();
  const caso = input.caseContext?.trim() || null;
  const linhas = statement.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);

  // Texto-base cadastrado à parte: o enunciado inteiro é a pergunta que vem depois dele.
  if (caso) return { titulo: null, base: caso, pergunta: colar(linhas) || padrao };

  const ultima = linhas[linhas.length - 1] ?? "";
  if (linhas.length >= 3 && PERGUNTA.test(ultima)) return { titulo: linhas[0]!, base: linhas.slice(1, -1).join("\n"), pergunta: ultima };
  if (linhas.length === 2 && PERGUNTA.test(ultima)) return { titulo: linhas[0]!, base: null, pergunta: ultima };
  if (linhas.length >= 2) return { titulo: linhas[0]!, base: linhas.slice(1).join("\n"), pergunta: padrao };

  // Uma linha só: se a frase termina numa ordem ("… Assinale a alternativa correta"), ela vira a pergunta.
  const m = /^(.*?[.:?!])\s+((?:assinale|marque|indique|aponte|julgue|escolha|selecione|identifique|responda)\b[^]*)$/i.exec(statement);
  if (m && m[1]!.length >= 20) return { titulo: m[1]!, base: null, pergunta: m[2]! };
  return { titulo: statement || null, base: null, pergunta: padrao };
}
