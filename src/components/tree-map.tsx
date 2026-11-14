import type { TreeNode } from "@/domain/content/tree-map";

const TONES = ["#B3261E", "#1F5FBF", "#1E8E5A", "#8A3FC4", "#C77700", "#2A2D33"];

function Sub({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="mt-1.5 space-y-1.5">
      {nodes.map((n, i) => (
        <li key={i} className="text-[0.92em] leading-snug">
          <span className="flex gap-2">
            <span className="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-current opacity-60" aria-hidden />
            <span>{n.label}</span>
          </span>
          {n.children.length > 0 && <div className="ml-3.5"><Sub nodes={n.children} /></div>}
        </li>
      ))}
    </ul>
  );
}

/** Mapa mental em árvore como card visual: raiz no topo e um cartão colorido por ramo. */
export function TreeMapCard({ root, nodes }: { root: string; nodes: TreeNode[] }) {
  return (
    <div className="not-prose my-4 font-sans" data-testid="mapa-arvore" role="group" aria-label={`Mapa mental: ${root}`}>
      <div className="mx-auto w-fit max-w-full rounded-full bg-[#0D0E11] px-5 py-2.5 text-center text-sm font-extrabold uppercase tracking-wide text-white shadow">
        {root}
      </div>
      <div className="mx-auto h-4 w-px bg-[#2A2D33]/40" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-2">
        {nodes.map((n, i) => {
          const tone = TONES[i % TONES.length]!;
          const m = /^(\d+)\.\s*(.*)$/.exec(n.label);
          return (
            <div key={i} className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: `${tone}55`, borderTop: `4px solid ${tone}` }}>
              <p className="flex items-start gap-2 text-[0.95em] font-bold leading-snug" style={{ color: tone }}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white" style={{ background: tone }} aria-hidden>
                  {m ? m[1] : i + 1}
                </span>
                <span>{m ? m[2] : n.label}</span>
              </p>
              {n.children.length > 0 && <Sub nodes={n.children} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
