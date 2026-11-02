import type { CareerSnapshot } from '../career/snapshot';
import type { PlayerDb } from '../career/playerdb';
import { ATTRS, estimateValue } from '../career/playerdb';
import { posLabel } from '../career/positions';
import { playerRoles } from '../career/roles';
import { abilityKeys, type TraitField } from '../career/playstyles';
import { leagueObjective } from '../career/objectives';

/**
 * Resumo do save em texto para o assistente: clube, diretoria, tabela, jogos, elenco com atributos,
 * finanças e base. Fica compacto (poucos milhares de tokens) para caber no plano gratuito.
 */
export interface Names { player: (id: number) => { name: string } }
export interface AbilityNames { [key: string]: { label: string } }

const mi = (v: number) => (Math.abs(v) >= 1e6 ? `€${(v / 1e6).toFixed(1)}mi` : `€${Math.round(v / 1e3)}mil`);
const ymd = (d: number) => `${d % 100}/${Math.floor(d / 100) % 100}/${Math.floor(d / 1e4)}`;
const SHORT: Record<string, string> = {
  crossing: 'CRU', finishing: 'FIN', headingaccuracy: 'CAB', shortpassing: 'PC', volleys: 'VOL', dribbling: 'DRI', curve: 'CUR',
  freekickaccuracy: 'FAL', longpassing: 'PL', ballcontrol: 'CON', acceleration: 'ACE', sprintspeed: 'VEL', agility: 'AGI',
  reactions: 'REA', balance: 'EQU', shotpower: 'FCH', jumping: 'IMP', stamina: 'FOL', strength: 'FOR', longshots: 'CHL',
  aggression: 'AGR', interceptions: 'INT', positioning: 'POS', vision: 'VIS', penalties: 'PEN', composure: 'COMP',
  defensiveawareness: 'MAR', standingtackle: 'DES', slidingtackle: 'CAR', gkdiving: 'GOL-ELA', gkhandling: 'GOL-MAN',
  gkkicking: 'GOL-CHU', gkpositioning: 'GOL-POS', gkreflexes: 'GOL-REF',
};
const ROLE = ['', 'Crucial', 'Importante', 'Rodízio', 'Esporádico', 'Promessa'];

export function buildContext(s: CareerSnapshot, ea: Names, db: PlayerDb | null, abilities?: AbilityNames | null): string {
  const L: string[] = [];
  const name = (id: number) => ea.player(id).name;
  const dbIdx = new Map<number, number>();
  if (db) db.id.forEach((id, i) => dbIdx.set(id, i));

  L.push(`# Clube: ${s.club.name} (${s.club.leagueName}), temporada ${s.season}, data do jogo ${ymd(s.gameDate)}`);
  L.push(`OVR do time ${s.club.ovr} (ATA ${s.club.att}, MEI ${s.club.mid}, DEF ${s.club.def}). Prestígio nacional ${s.club.domesticPrestige}/10, internacional ${s.club.internationalPrestige}/10. Rival: ${s.club.rivalName}.`);
  const m = s.manager;
  const season = m?.history?.filter((x) => x.teamId === s.club.id).at(-1);
  if (m) L.push(`Técnico: ${m.name}. Segurança no cargo: ${m.jobSecurity ?? '?'}/100. Meta da liga: ${season ? leagueObjective(season.objective) : '?'}.`);
  if (s.finances) L.push(`Orçamento de transferências: ${mi(s.finances.currentBudget)} (início ${mi(s.finances.initialBudget)}).`);
  if (s.tactic) L.push(`Tática ativa: ${s.tactic.name} (${s.tactic.formation}), titulares: ${s.tactic.players.map((p) => `${posLabel(p.pos)} ${name(p.playerId)}`).join(', ')}.`);

  const table = s.standings.find((t) => t.isLeague);
  if (table) {
    L.push(`\n# Tabela (${table.title})`);
    table.rows.forEach((r, i) => L.push(`${i + 1}. ${r.name}${r.teamId === s.club.id ? ' (NÓS)' : ''} – ${r.points} pts, ${r.played} J, ${r.won}V ${r.drawn}E ${r.lost}D, ${r.gf}:${r.ga}`));
  }
  const done = s.matches.filter((x) => x.played).slice(-6);
  const next = s.matches.filter((x) => !x.played && x.date >= s.gameDate).slice(0, 5);
  if (done.length) { L.push('\n# Últimos jogos'); done.forEach((x) => L.push(`${ymd(x.date)} ${x.competition}: ${x.homeName} ${x.homeGoals}–${x.awayGoals} ${x.awayName}`)); }
  if (next.length) {
    L.push('\n# Próximos jogos');
    next.forEach((x) => {
      const opp = x.homeId === s.club.id ? x.awayId : x.homeId;
      const pos = table ? table.rows.findIndex((r) => r.teamId === opp) : -1;
      L.push(`${ymd(x.date)} ${x.competition}: ${x.homeName} x ${x.awayName}${pos >= 0 ? ` (adversário ${pos + 1}º na liga)` : ''}`);
    });
  }

  L.push('\n# Elenco (pos, idade, OVR/POT, forma, moral, condição, papel, salário, contrato; atributos principais; Roles; PlayStyles)');
  const c = db?.cols;
  for (const p of [...s.squad].sort((a, b) => b.ovr - a.ovr)) {
    const bits = [`${name(p.id)}: ${posLabel(p.pos)}${p.altPos.length ? `/${p.altPos.map(posLabel).join('/')}` : ''}, ${p.age} anos, ${p.ovr}/${p.pot}`];
    if (p.formScore != null) bits.push(`forma ${p.formScore}`);
    if (p.morale != null) bits.push(`moral ${p.morale}`);
    if (p.condition != null) bits.push(`cond ${p.condition}`);
    if (p.role) bits.push(ROLE[p.role]!);
    bits.push(`sal ${mi(p.wage)}/sem`, `contrato até ${p.contractUntil}`, `valor ${mi(p.value ?? estimateValue(p.ovr, p.pot, p.age))}`);
    if (p.injured) bits.push(`LESIONADO${p.injuryReturn ? ` até ${ymd(p.injuryReturn)}` : ''}`);
    if (p.banGames) bits.push(`suspenso ${p.banGames} jogo(s)`);
    const i = dbIdx.get(p.id);
    if (c && i != null) {
      const gk = p.pos === 0;
      const keys = gk ? ['gkdiving', 'gkhandling', 'gkkicking', 'gkpositioning', 'gkreflexes'] : [...ATTRS].filter((a) => !a.startsWith('gk'));
      const top = keys.map((a) => [a, c[a as keyof typeof c]?.[i] ?? 0] as const).sort((x, y) => y[1] - x[1]).slice(0, gk ? 5 : 8);
      bits.push(top.map(([a, v]) => `${SHORT[a] ?? a} ${v}`).join(' '));
      const roles = playerRoles({ role1: c.role1?.[i], role2: c.role2?.[i], role3: c.role3?.[i], role4: c.role4?.[i], role5: c.role5?.[i] });
      if (roles.length) bits.push(`Roles: ${roles.map((r) => `${r.name}${r.plus === 2 ? '++' : '+'} (${r.pos})`).join(', ')}`);
      if (abilities) {
        const v = Object.fromEntries((['trait1', 'trait2', 'icontrait1', 'icontrait2'] as TraitField[]).map((f) => [f, c[f]?.[i] ?? 0])) as Record<TraitField, number>;
        const ps = abilityKeys(v).map((k) => (abilities[k] ? `${abilities[k]!.label}${k.startsWith('icon') ? '+' : ''}` : null)).filter(Boolean);
        if (ps.length) bits.push(`PlayStyles: ${ps.join(', ')}`);
      }
    }
    L.push(`- ${bits.join('; ')}`);
  }

  const league = s.stats.find((x) => x.isLeague);
  if (league) {
    const mine = league.players.filter((x) => x.teamId === s.club.id && x.apps > 0).sort((a, b) => b.goals - a.goals || b.avgRating - a.avgRating).slice(0, 12);
    if (mine.length) { L.push('\n# Estatísticas na liga'); mine.forEach((x) => L.push(`${name(x.playerId)}: ${x.apps} J, ${x.goals} G, ${x.assists} A, nota ${x.avgRating.toFixed(1)}`)); }
  }
  if (s.youth.length) { L.push('\n# Base'); s.youth.forEach((y) => L.push(`${name(y.id)}: ${posLabel(y.pos)}, ${y.age} anos, ${y.ovr}/${y.pot}`)); }
  if (s.loans.length) L.push(`\nEmpréstimos: ${s.loans.length}.`);
  return L.join('\n');
}
