/** Sorteio simples para variar os avisos do Mentor. `rand` é injetável para testar. */
export type Rand = () => number;

export function sortear<T>(lista: readonly T[], rand: Rand = Math.random): T {
  return lista[Math.min(lista.length - 1, Math.floor(rand() * lista.length))] as T;
}

/** Embaralha sem alterar a lista original. */
export function embaralhar<T>(lista: readonly T[], rand: Rand = Math.random): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}
