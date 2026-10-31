/** Códigos de posição do banco do jogo (preferredposition*, teamplayerlinks.position). */
export const POS = ['GOL', 'LIB', 'ALD', 'LD', 'ZAD', 'ZAG', 'ZAE', 'LE', 'ALE', 'VOD', 'VOL', 'VOE', 'MD', 'MCD', 'MC', 'MCE', 'ME', 'MAD', 'MEI', 'MAE', 'SAD', 'SA', 'SAE', 'PD', 'ATD', 'ATA', 'ATE', 'PE'] as const;
export const posLabel = (code: number) => POS[code] ?? '—';
export type Line = 'GOL' | 'DEF' | 'MEI' | 'ATA';
export function lineOf(code: number): Line {
  if (code === 0) return 'GOL';
  if (code <= 8) return 'DEF';
  if (code <= 19) return 'MEI';
  return 'ATA';
}
/** teamplayerlinks.position: 28 = banco, 29 = reserva. */
export const isStarterSlot = (code: number) => code < 28;
/** Posição horizontal no campinho (0 = esquerda, 1 = direita), para ordenar a escalação. */
const X: Record<number, number> = { 0: .5, 1: .5, 2: .95, 3: .9, 4: .65, 5: .5, 6: .35, 7: .1, 8: .05, 9: .65, 10: .5, 11: .35,
  12: .9, 13: .65, 14: .5, 15: .35, 16: .1, 17: .7, 18: .5, 19: .3, 20: .7, 21: .5, 22: .3, 23: .9, 24: .65, 25: .5, 26: .35, 27: .1 };
export const xOf = (code: number) => X[code] ?? .5;
