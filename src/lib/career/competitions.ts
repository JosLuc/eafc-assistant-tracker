import type { Competition } from '../save/modules/competitions';

/**
 * Nomes das copas pelo asset do troféu (o save só traz a chave de tradução "TrophyName_Abbr15_<asset>").
 * Ligas não precisam daqui: o asset delas é o leagueid do banco.
 * Confirmados com o CM Tracker/saves: 202 Carabao Cup, 223 Champions League, 210 Coppa Italia. Os demais seguem
 * a ordem das copas de cada país no registro (copa nacional, copa da liga, supercopa).
 */
const CUPS: Record<number, string> = {
  201: 'FA Cup', 202: 'Carabao Cup', 203: 'Community Shield',
  204: 'Coupe de France', 206: 'DFB-Pokal', 208: 'Copa del Rey', 210: 'Coppa Italia',
  223: 'Champions League', 224: 'Europa League', 226: 'Conference League', 227: 'Supercopa da UEFA',
  85: 'Liga MX · Apertura', 84: 'Liga MX · Clausura',
};

/** Supercopas (jogo único entre campeões): não entram na lista de copas que o clube disputa por padrão. */
export const SUPER_CUPS = new Set([203, 227]);

export type CompKind = 'league' | 'cup' | 'continental' | 'friendly';

/** Nome e tipo de uma competição a partir do registro do fcem. */
export function competitionInfo(id: number, reg: Map<number, Competition>, leagueName: (leagueId: number) => string | undefined): { name: string; kind: CompKind; asset?: number } {
  const c = reg.get(id);
  if (!c) return { name: 'Torneio de pré-temporada', kind: 'friendly' };
  const lg = leagueName(c.asset);
  if (lg) return { name: lg, kind: 'league', asset: c.asset };
  const continental = c.parent < 100; // federações (UEFA = 84) ficam antes dos países no registro
  if (c.asset === 84 || c.asset === 85) return { name: CUPS[c.asset]!, kind: 'league', asset: c.asset };
  return { name: CUPS[c.asset] ?? (continental ? `Torneio continental (${c.asset})` : `Copa nacional (${c.asset})`), kind: continental ? 'continental' : 'cup', asset: c.asset };
}
