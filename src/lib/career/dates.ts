/** Datas do jogo: dias desde 14/10/1582 (banco) ou inteiros aaaammdd (módulos). */
const GREGORIAN_START = Date.UTC(1582, 9, 14);
export const fromGameDays = (days: number) => new Date(GREGORIAN_START + days * 86_400_000);
export const fromYmd = (n: number) => new Date(Date.UTC(Math.floor(n / 10000), (Math.floor(n / 100) % 100) - 1, n % 100));
export const toYmd = (d: Date) => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
export function ageAt(birth: Date, at: Date) {
  let a = at.getUTCFullYear() - birth.getUTCFullYear();
  if (at.getUTCMonth() < birth.getUTCMonth() || (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate())) a--;
  return a;
}
/** Temporada europeia: a partir de julho começa a nova (ex.: 2026-08 → 2026/27). */
export function seasonOf(d: Date) {
  const start = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return { start, end: start + 1, label: `${start % 100}/${(start + 1) % 100}` };
}
