/**
 * PlayStyles do save: trait1/trait2 (PlayStyle) e icontrait1/icontrait2 (PlayStyle+) são máscaras de bits.
 * A base da EA nomeia cada bit com o mesmo formato, por exemplo "trait1_64" = Low Driven Shot.
 */
export const TRAIT_FIELDS = ['trait1', 'trait2', 'icontrait1', 'icontrait2'] as const;
export type TraitField = (typeof TRAIT_FIELDS)[number];

/** Chaves ("trait1_64", "icontrait1_1"…) dos bits ligados nos quatro campos. */
export function abilityKeys(v: Record<TraitField, number>): string[] {
  const out: string[] = [];
  for (const f of TRAIT_FIELDS) {
    const n = (v[f] ?? 0) >>> 0;
    for (let b = 0; b < 32; b++) if (n & (2 ** b)) out.push(`${f}_${2 ** b}`);
  }
  return out;
}
export const isPlus = (key: string) => key.startsWith('icon');

/** Testa um bit pela chave, direto nas colunas do banco (para os filtros da Scout). */
export function hasAbility(cols: Partial<Record<TraitField, number[]>>, i: number, key: string): boolean {
  const k = key.lastIndexOf('_');
  const f = key.slice(0, k) as TraitField, bit = Number(key.slice(k + 1));
  const n = (cols[f]?.[i] ?? 0) >>> 0;
  return Math.floor(n / bit) % 2 === 1;
}
