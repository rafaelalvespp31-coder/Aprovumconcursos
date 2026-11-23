/** Edital publicado pelo admin num concurso: regras puras da cópia que cada aluno recebe. */
export interface InfoPublicado {
  contestId: string;
  /** Preparação do admin de onde a estrutura foi copiada. */
  fonteEditalId: string;
  /** updated_at da fonte no momento da cópia (ISO). */
  fonteEm: string;
}

/** Marca única (por aluno e concurso) gravada em file_hash: impede cópia duplicada e nunca colide com o hash de um PDF. */
export const chaveCopia = (contestId: string): string => `publicado:${contestId}`;
export const caminhoCopia = (contestId: string): string => `publicado/${contestId}`;

export const ehCopiaPublicada = (stats: unknown): boolean => !!stats && typeof stats === "object" && !!(stats as { publicado?: unknown }).publicado;

/** Estatísticas da cópia: as da fonte, sem o que é do aluno-dono (pasta de estudo, vínculos calculados, espera de cargo). */
export function statsDaCopia(fonte: Record<string, unknown> | null | undefined, info: InfoPublicado, parserV: number): Record<string, unknown> {
  const { studyFolderId: _p, matchedAt: _m, matchV: _v, needRole: _n, failedAt: _f, errorCode: _e, ...resto } = (fonte ?? {}) as Record<string, unknown>;
  void [_p, _m, _v, _n, _f, _e];
  return { ...resto, parserV, publicado: info };
}

/** A preparação do admin só pode ser publicada se estiver pronta (concluída) e com matérias. */
export function podePublicar(prep: { status: string; user_id: string }, adminId: string, disciplinas: number): { ok: true } | { ok: false; motivo: string } {
  if (prep.user_id !== adminId) return { ok: false, motivo: "Esse edital não é seu." };
  if (prep.status !== "concluido") return { ok: false, motivo: "A leitura do edital ainda não terminou." };
  if (disciplinas < 1) return { ok: false, motivo: "O edital lido não tem matérias." };
  return { ok: true };
}

/** Estrutura importada pelo admin (análise feita no ChatGPT): a leitura não vem de PDF, então não há o que reler. */
export const ehImportada = (stats: unknown): boolean => !!stats && typeof stats === "object" && !!(stats as { importado?: unknown }).importado;
