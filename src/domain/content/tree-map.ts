/**
 * Mapa mental escrito como árvore de texto ("|-- item", "├── item") dentro de uma seção:
 * separa o texto antes/depois e devolve a árvore (raiz + filhos) para virar card visual.
 */
export interface TreeNode {
  label: string;
  children: TreeNode[];
}
export interface TreeSplit {
  before: string;
  root: string;
  nodes: TreeNode[];
  after: string;
}

const TABLE_SEP = /^\s*\|?[\s:|-]*$/;
const isMark = (l: string) => MARK.test(l) && !TABLE_SEP.test(l);
const MARK = /^([\s|│]*?)([|├└]?)[-─]{2,}\s*(.*)$/;
const clean = (s: string) => s.replace(/\*\*/g, "").trim();

export function splitTreeMap(md: string): TreeSplit | null {
  const lines = md.split("\n");
  const first = lines.findIndex(isMark);
  if (first < 1) return null;
  // Raiz: linha de texto logo acima (pulando "|" soltos e vazias).
  let r = first - 1;
  while (r >= 0 && /^[\s|│]*$/.test(lines[r]!)) r--;
  if (r < 0 || isMark(lines[r]!)) return null;
  let last = first;
  for (let i = first; i < lines.length; i++) {
    if (isMark(lines[i]!)) last = i;
    else if (!/^[\s|│]*$/.test(lines[i]!)) break;
  }
  const items = lines.slice(first, last + 1).flatMap((l) => {
    const m = isMark(l) ? MARK.exec(l) : null;
    return m && m[3]!.trim() ? [{ col: m[1]!.length, label: clean(m[3]!) }] : [];
  });
  if (items.length < 3) return null;
  const roots: TreeNode[] = [];
  const stack: Array<{ col: number; node: TreeNode }> = [];
  for (const it of items) {
    const node: TreeNode = { label: it.label, children: [] };
    while (stack.length && stack.at(-1)!.col >= it.col) stack.pop();
    (stack.length ? stack.at(-1)!.node.children : roots).push(node);
    stack.push({ col: it.col, node });
  }
  return {
    before: lines.slice(0, r).join("\n").trim(),
    root: clean(lines[r]!),
    nodes: roots,
    after: lines.slice(last + 1).join("\n").trim(),
  };
}
