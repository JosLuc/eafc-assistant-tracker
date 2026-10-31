import type { CareerSnapshot, SquadPlayer } from './snapshot';
import { fromYmd, seasonOf } from './dates';

/** Alertas simples para o cartão "Dica do auxiliar", calculados só com o save. */
export interface Tip { kind: 'contrato' | 'elenco' | 'jovem' | 'salario'; text: string; playerIds: number[] }

export function starters(s: CareerSnapshot): SquadPlayer[] {
  const xi = s.squad.filter((p) => p.slot < 28);
  return xi.length >= 11 ? xi : [...s.squad].sort((a, b) => b.ovr - a.ovr).slice(0, 11);
}

export function buildTips(s: CareerSnapshot, name: (id: number) => string): Tip[] {
  const tips: Tip[] = [];
  const season = seasonOf(fromYmd(s.gameDate));
  const xi = new Set(starters(s).map((p) => p.id));

  const expiring = s.squad.filter((p) => p.contractUntil <= season.end && xi.has(p.id));
  if (expiring.length)
    tips.push({ kind: 'contrato', playerIds: expiring.map((p) => p.id),
      text: `${list(expiring.map((p) => name(p.id)))} ${expiring.length > 1 ? 'são titulares e têm' : 'é titular e tem'} contrato só até ${season.end}. Renove antes de janeiro, quando outros clubes podem abordar.` });

  const gks = s.squad.filter((p) => p.line === 'GOL');
  if (gks.length < 2) tips.push({ kind: 'elenco', playerIds: gks.map((p) => p.id), text: 'Só há um goleiro no elenco. Uma lesão deixa o time sem reserva na posição.' });

  const byLine = (l: SquadPlayer['line']) => s.squad.filter((p) => p.line === l && !xi.has(p.id));
  for (const [l, label] of [['DEF', 'defesa'], ['MEI', 'meio-campo'], ['ATA', 'ataque']] as const) {
    if (byLine(l).length === 0) tips.push({ kind: 'elenco', playerIds: [], text: `Não há reservas para o ${label}.` });
  }

  const gems = s.squad.filter((p) => p.age <= 21 && p.pot - p.ovr >= 8 && !xi.has(p.id)).slice(0, 3);
  if (gems.length)
    tips.push({ kind: 'jovem', playerIds: gems.map((p) => p.id),
      text: `${list(gems.map((p) => `${name(p.id)} (${p.ovr}→${p.pot})`))} ${gems.length > 1 ? 'têm' : 'tem'} muito potencial e não ${gems.length > 1 ? 'estão' : 'está'} entre os titulares. Dar minutos ajuda a evolução e a moral.` });

  const avgWage = s.squad.reduce((a, p) => a + p.wage, 0) / Math.max(1, s.squad.length);
  const pricey = s.squad.filter((p) => p.wage > avgWage * 1.5 && !xi.has(p.id) && p.age >= 29).slice(0, 2);
  if (pricey.length)
    tips.push({ kind: 'salario', playerIds: pricey.map((p) => p.id),
      text: `${list(pricey.map((p) => name(p.id)))} ganha${pricey.length > 1 ? 'm' : ''} bem acima da média e não ${pricey.length > 1 ? 'são titulares' : 'é titular'}. Pode valer vender ou emprestar para liberar folha.` });

  return tips;
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs.at(-1)}`);
