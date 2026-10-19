import { readFileSync, writeFileSync } from "node:fs";
import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure } from "@/domain/content/extract";
const raw = readFileSync("conteudo-catalogo-furto/law.txt", "utf8");
const n = normalizeContent(raw);
const ex = extractStructure(n.normalized ?? (n as unknown as { text: string }).text);
writeFileSync("conteudo-catalogo-furto/nodes.json", JSON.stringify({ source: n.normalized ?? (n as unknown as { text: string }).text, nodes: ex.nodes }, null, 0));
for (const x of ex.nodes) console.log(x.key, x.kind, x.marker, "|", x.title.slice(0, 60), "| parent", x.parentKey);
