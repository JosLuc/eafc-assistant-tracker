import { hasAbility } from './playstyles';
import { ATTRS, ATTR_LABEL, FREE_AGENT_LEAGUES, estimateValue, type DbField, type PlayerDb } from './playerdb';

/**
 * Filtros da aba Scout sobre o banco de jogadores do save. Tudo roda no navegador:
 * 22 mil jogadores filtram em poucos milissegundos.
 */

export type Group = 'geral' | 'atributos' | 'aparencia';
export interface RangeDef { key: string; label: string; group: Group; min: number; max: number; sub?: string; unit?: 'mi' | 'mil' }

/** Colunas derivadas, calculadas uma vez por banco. */
export interface Derived { value: Float64Array; estimated: Uint8Array; growth: Int16Array; total: Int16Array }
export function derive(db: PlayerDb): Derived {
  const n = db.id.length, c = db.cols;
  const value = new Float64Array(n), estimated = new Uint8Array(n), growth = new Int16Array(n), total = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const real = c.value![i]!;
    if (real >= 0) value[i] = real;
    else { value[i] = estimateValue(c.overallrating![i]!, c.potential![i]!, c.age![i]!); estimated[i] = 1; }
    growth[i] = c.potential![i]! - c.overallrating![i]!;
    let t = 0; for (const a of ATTRS) t += c[a]![i]!; total[i] = t;
  }
  return { value, estimated, growth, total };
}

const SUB: Record<string, string> = { crossing: 'Ataque', dribbling: 'Habilidade', acceleration: 'Movimento', shotpower: 'Força', aggression: 'Mentalidade', defensiveawareness: 'Defesa', gkdiving: 'Goleiro' };

export const RANGES: RangeDef[] = [
  { key: 'age', label: 'Idade', group: 'geral', min: 15, max: 45 },
  { key: 'overallrating', label: 'Overall', group: 'geral', min: 40, max: 99 },
  { key: 'potential', label: 'Potencial', group: 'geral', min: 40, max: 99 },
  { key: 'growth', label: 'Crescimento', group: 'geral', min: 0, max: 50 },
  { key: 'total', label: 'Total de atributos', group: 'geral', min: 300, max: 2500 },
  { key: 'skillmoves', label: 'Dribles (estrelas)', group: 'geral', min: 1, max: 5 },
  { key: 'weakfootabilitytypecode', label: 'Pé ruim (estrelas)', group: 'geral', min: 1, max: 5 },
  { key: 'internationalrep', label: 'Reputação internacional', group: 'geral', min: 1, max: 5 },
  { key: 'value', label: 'Valor (€ mi)', group: 'geral', min: 0, max: 250, unit: 'mi' },
  { key: 'wage', label: 'Salário (€ mil/sem)', group: 'geral', min: 0, max: 800, unit: 'mil' },
  { key: 'releaseclause', label: 'Multa (€ mi)', group: 'geral', min: 0, max: 500, unit: 'mi' },
  { key: 'contractvaliduntil', label: 'Contrato até', group: 'geral', min: 2026, max: 2035 },
  ...ATTRS.map((a): RangeDef => ({ key: a, label: ATTR_LABEL[a], group: 'atributos', min: 1, max: 99, sub: SUB[a] })),
  { key: 'height', label: 'Altura (cm)', group: 'aparencia', min: 150, max: 210 },
  { key: 'weight', label: 'Peso (kg)', group: 'aparencia', min: 45, max: 110 },
];
export const RANGE = Object.fromEntries(RANGES.map((r) => [r.key, r]));

export interface ScoutFilter {
  ranges: Record<string, [number | null, number | null]>;
  pos: number[]; posMode: 'or' | 'and'; posScope: 'main' | 'any';
  gender: number | null; league: number | null; team: number | null; foot: number | null; retiring: number | null;
  free: boolean; generated: boolean;
  nation: number | null; styles: string[]; stylesMode: 'or' | 'and';
}
export const EMPTY: ScoutFilter = { ranges: {}, pos: [], posMode: 'or', posScope: 'any', gender: 0, league: null, team: null, foot: null, retiring: null, free: false, generated: false, nation: null, styles: [], stylesMode: 'or' };

/** Valor de um jogador numa chave de faixa, já na unidade mostrada (mi, mil, estrelas 1–5). */
export function rangeValue(db: PlayerDb, d: Derived, key: string, i: number): number {
  const c = db.cols;
  switch (key) {
    case 'value': return d.value[i]! / 1e6;
    case 'growth': return d.growth[i]!;
    case 'total': return d.total[i]!;
    case 'wage': return c.wage![i]! / 1e3;
    case 'releaseclause': return c.releaseclause![i]! / 1e6;
    case 'skillmoves': return c.skillmoves![i]! + 1;
    default: return c[key as DbField]![i]!;
  }
}

/** Índices dos jogadores que passam no filtro. `nameIds` vem da busca por nome (null = sem busca). */
export function runScout(db: PlayerDb, d: Derived, f: ScoutFilter, opts: { nameIds: Set<number> | null; generatedIds: Set<number> }): number[] {
  const c = db.cols, out: number[] = [];
  const ranges = Object.entries(f.ranges).filter(([, [a, b]]) => a != null || b != null);
  const POS = [c.preferredposition1!, c.preferredposition2!, c.preferredposition3!, c.preferredposition4!];
  for (let i = 0; i < db.id.length; i++) {
    if (opts.nameIds && !opts.nameIds.has(db.id[i]!)) continue;
    if (f.gender != null && c.gender![i] !== f.gender) continue;
    const team = c.team![i]!, league = db.leagueOfTeam[team];
    if (f.team != null && team !== f.team) continue;
    if (f.league != null && league !== f.league) continue;
    if (f.free && !(league != null && FREE_AGENT_LEAGUES.has(league))) continue;
    if (f.generated && !opts.generatedIds.has(db.id[i]!)) continue;
    if (f.foot != null && c.preferredfoot![i] !== f.foot) continue;
    if (f.retiring != null && c.isretiring![i] !== f.retiring) continue;
    if (f.nation != null && c.nationality![i] !== f.nation) continue;
    if (f.styles?.length) {
      const has = (k: string) => hasAbility(c, i, k);
      if (f.stylesMode === 'and' ? !f.styles.every(has) : !f.styles.some(has)) continue;
    }
    if (f.pos.length) {
      const has = (p: number) => (f.posScope === 'main' ? POS[0]![i] === p : POS.some((col) => col[i] === p));
      if (f.posMode === 'and' ? !f.pos.every(has) : !f.pos.some(has)) continue;
    }
    let ok = true;
    for (const [k, [a, b]] of ranges) {
      const v = rangeValue(db, d, k, i);
      if ((a != null && v < a) || (b != null && v > b)) { ok = false; break; }
    }
    if (ok) out.push(i);
  }
  return out;
}

/** Quantos filtros estão ativos (para o contador e os chips). */
export function activeCount(f: ScoutFilter): number {
  return Object.values(f.ranges).filter(([a, b]) => a != null || b != null).length + (f.pos.length ? 1 : 0)
    + [f.league, f.team, f.foot, f.retiring].filter((x) => x != null).length + (f.gender !== 0 ? 1 : 0) + (f.free ? 1 : 0) + (f.generated ? 1 : 0) + (f.nation != null ? 1 : 0) + (f.styles?.length ? 1 : 0);
}
