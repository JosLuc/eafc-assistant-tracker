import type { CareerSave, Row } from '../save';
import { fromGameDays, ageAt } from './dates';

/**
 * Banco de jogadores do save (≈22 mil), em colunas para ocupar pouco no navegador.
 * Serve a página do jogador e a Scout. Cada coluna é um array de números na mesma ordem de `id`.
 */
export const ATTRS = [
  'crossing', 'finishing', 'headingaccuracy', 'shortpassing', 'volleys',
  'dribbling', 'curve', 'freekickaccuracy', 'longpassing', 'ballcontrol',
  'acceleration', 'sprintspeed', 'agility', 'reactions', 'balance',
  'shotpower', 'jumping', 'stamina', 'strength', 'longshots',
  'aggression', 'interceptions', 'positioning', 'vision', 'penalties', 'composure',
  'defensiveawareness', 'standingtackle', 'slidingtackle',
  'gkdiving', 'gkhandling', 'gkkicking', 'gkpositioning', 'gkreflexes',
] as const;
export type Attr = (typeof ATTRS)[number];
export const ATTR_LABEL: Record<Attr, string> = {
  crossing: 'Cruzamento', finishing: 'Finalização', headingaccuracy: 'Cabeceio', shortpassing: 'Passe curto', volleys: 'Voleio',
  dribbling: 'Drible', curve: 'Curva', freekickaccuracy: 'Falta', longpassing: 'Passe longo', ballcontrol: 'Controle de bola',
  acceleration: 'Aceleração', sprintspeed: 'Velocidade', agility: 'Agilidade', reactions: 'Reação', balance: 'Equilíbrio',
  shotpower: 'Força do chute', jumping: 'Impulsão', stamina: 'Fôlego', strength: 'Força', longshots: 'Chute de longe',
  aggression: 'Agressividade', interceptions: 'Interceptação', positioning: 'Posicionamento', vision: 'Visão', penalties: 'Pênaltis', composure: 'Compostura',
  defensiveawareness: 'Noção defensiva', standingtackle: 'Desarme em pé', slidingtackle: 'Carrinho',
  gkdiving: 'Elasticidade', gkhandling: 'Manejo', gkkicking: 'Chute (GOL)', gkpositioning: 'Posicionamento (GOL)', gkreflexes: 'Reflexos',
};

/**
 * Valor de mercado estimado (o save só guarda o valor de quem o seu clube acompanha).
 * Calibrado com os valores reais dos saves: cresce ~22% por ponto de OVR, jovens com margem de
 * crescimento valem mais e o valor cai depressa depois dos 30.
 */
export function estimateValue(ovr: number, pot: number, age: number): number {
  const base = 2.2e6 * Math.exp(0.2 * (ovr - 70));
  const ageF = age <= 21 ? 1.5 : age <= 24 ? 1.35 : age <= 27 ? 1.15 : age <= 30 ? 0.85 : age <= 32 ? 0.45 : age === 33 ? 0.25 : age === 34 ? 0.12 : 0.08;
  const growth = age <= 25 ? 1 + 0.12 * Math.max(0, pot - ovr) : 1;
  const v = base * ageF * growth;
  // Arredonda como o jogo: 10 mil abaixo de 1 mi, 100 mil acima.
  const step = v < 1e6 ? 1e4 : 1e5;
  return Math.max(1e4, Math.round(v / step) * step);
}

const BASE = [
  'overallrating', 'potential', 'birthdate', 'preferredposition1', 'preferredposition2', 'preferredposition3', 'preferredposition4',
  'nationality', 'height', 'weight', 'preferredfoot', 'weakfootabilitytypecode', 'skillmoves', 'wage', 'contractvaliduntil', 'releaseclause',
  'internationalrep', 'pacdiv', 'shohan', 'paskic', 'driref', 'defspe', 'phypos', 'isretiring', 'playerjointeamdate', 'bodytypecode',
  'emotion', 'personality', 'gender', 'trait1', 'trait2', 'icontrait1', 'icontrait2', 'role1', 'role2', 'role3', 'role4', 'role5',
] as const;
export const DB_FIELDS = [...BASE, ...ATTRS] as const;
export type DbField = (typeof DB_FIELDS)[number] | 'team' | 'jersey' | 'age' | 'value';

export interface ClubRow { id: number; name: string; league: number; ovr: number; att: number; mid: number; def: number; worth: number; domPrestige: number; intPrestige: number; popularity: number; youth: number; capacity: number; founded: number; leagueTitles: number; cups: number; ucl: number; uel: number; rival: number; women: boolean }
export interface ManagerRow { id: number; name: string; team: number; nation: number; stars: number; age: number; joined: number }
export interface PlayerDb {
  gameDate: number; id: number[]; cols: Partial<Record<DbField, number[]>>; teams: Record<number, string>; leagueOfTeam: Record<number, number>; leagues: Record<number, string>;
  /** Times e técnicos para a Scout (ausentes em bancos montados antes desta versão). */
  clubs?: ClubRow[]; managers?: ManagerRow[];
}

/** Ligas que não são o campeonato nacional do time (continentais, seleções, salvos, base). */
const NOT_DOMESTIC = new Set([78, 1003, 1014, 2000, 2028, 2136]);
/** Seleções. */
const NATIONAL = new Set([78, 2136]);
/** Times que não existem no modo carreira: clássicos/lendas, Soccer Aid, times de marketing e de teste. */
const HIDDEN_LEAGUES = new Set([2092, 2240, 2255]);
const HIDDEN_TEAMS = new Set([132727, 132728, 132888, 114019, 112428]);
/** Agentes livres (masculino e feminino). */
export const FREE_AGENT_LEAGUES = new Set([382]);

const num = (r: Row | undefined, k: string) => { const v = r?.[k]; return typeof v === 'number' ? v : Number(v ?? 0) || 0; };

export function buildPlayerDb(save: CareerSave, today: Date, gameDate: number): PlayerDb {
  const t = save.tables;
  const players = t.players ?? [];
  // Liga de cada time: a liga nacional, não a copa continental nem as ligas técnicas do jogo.
  const leagueOf = new Map<number, number>();
  for (const r of t.leagueteamlinks ?? []) {
    const tid = num(r, 'teamid'), lid = num(r, 'leagueid');
    if (!leagueOf.has(tid) || NOT_DOMESTIC.has(leagueOf.get(tid)!)) leagueOf.set(tid, lid);
  }
  // Clube de cada jogador: o primeiro vínculo com um time que está numa liga (seleções ficam de fora).
  const club = new Map<number, { team: number; jersey: number }>();
  for (const l of t.teamplayerlinks ?? []) {
    const pid = num(l, 'playerid'), tid = num(l, 'teamid');
    if (!leagueOf.has(tid)) continue;
    // Seleção só vale se o jogador não tiver clube.
    const cur = club.get(pid);
    if (!cur || (NATIONAL.has(leagueOf.get(cur.team)!) && !NATIONAL.has(leagueOf.get(tid)!))) club.set(pid, { team: tid, jersey: num(l, 'jerseynumber') });
  }
  const cols: PlayerDb['cols'] = {};
  for (const f of [...DB_FIELDS, 'team', 'jersey', 'age', 'value'] as DbField[]) cols[f] = [];
  const id: number[] = [];
  for (const p of players) {
    const pid = num(p, 'playerid');
    if (num(p, 'overallrating') <= 0) continue;
    // Lendas, times clássicos e times de marketing do jogo não entram no banco (não estão no modo carreira).
    const home = club.get(pid)?.team;
    if (home != null && (HIDDEN_LEAGUES.has(leagueOf.get(home)!) || HIDDEN_TEAMS.has(home))) continue;
    id.push(pid);
    for (const f of DB_FIELDS) cols[f]!.push(num(p, f));
    const c = club.get(pid);
    cols.team!.push(c?.team ?? -1); cols.jersey!.push(c?.jersey ?? 0);
    cols.age!.push(ageAt(fromGameDays(num(p, 'birthdate')), today));
    cols.value!.push(save.playerValues.get(pid) ?? -1);
  }
  const usedTeams = new Set(cols.team!);
  const teams: Record<number, string> = {};
  for (const r of t.teams ?? []) { const tid = num(r, 'teamid'); if (usedTeams.has(tid)) teams[tid] = String(r.teamname ?? ''); }
  const leagueOfTeam: Record<number, number> = {};
  for (const tid of usedTeams) if (leagueOf.has(tid)) leagueOfTeam[tid] = leagueOf.get(tid)!;
  const leagues: Record<number, string> = {};
  for (const r of t.leagues ?? []) leagues[num(r, 'leagueid')] = String(r.leaguename ?? '').replace(/\s*\(\d+\)\s*$/, '');
  // Times de liga (sem seleções, clássicos e times técnicos) e os técnicos de cada um.
  const clubs: ClubRow[] = [];
  for (const r of t.teams ?? []) {
    const tid = num(r, 'teamid'), lg = leagueOf.get(tid);
    if (lg == null || NATIONAL.has(lg) || HIDDEN_LEAGUES.has(lg) || HIDDEN_TEAMS.has(tid) || FREE_AGENT_LEAGUES.has(lg) || lg === 383 || lg === 2028 || lg === 2000) continue;
    teams[tid] ??= String(r.teamname ?? '');
    leagueOfTeam[tid] ??= lg;
    clubs.push({ id: tid, name: String(r.teamname ?? ''), league: lg, ovr: num(r, 'overallrating'), att: num(r, 'attackrating'), mid: num(r, 'midfieldrating'), def: num(r, 'defenserating'),
      worth: num(r, 'clubworth') * 1000, domPrestige: num(r, 'domesticprestige'), intPrestige: num(r, 'internationalprestige'), popularity: num(r, 'popularity'), youth: num(r, 'youthdevelopment'),
      capacity: num(r, 'teamstadiumcapacity'), founded: num(r, 'foundationyear'), leagueTitles: num(r, 'leaguetitles'), cups: num(r, 'domesticcups'), ucl: num(r, 'uefa_cl_wins'), uel: num(r, 'uefa_el_wins'), rival: num(r, 'rivalteam'), women: num(r, 'gender') === 1 });
  }
  const clubIds = new Set(clubs.map((c) => c.id));
  const managers: ManagerRow[] = [];
  for (const m of t.manager ?? []) {
    const team = num(m, 'teamid');
    if (!clubIds.has(team)) continue;
    const name = String(m.commonname || `${m.firstname ?? ''} ${m.surname ?? ''}`).trim();
    managers.push({ id: num(m, 'managerid'), name, team, nation: num(m, 'nationality'), stars: num(m, 'starrating'), age: num(m, 'birthdate') > 0 ? ageAt(fromGameDays(num(m, 'birthdate')), today) : 0, joined: num(m, 'managerjointeamdate') });
  }
  return { gameDate, id, cols, teams, leagueOfTeam, leagues, clubs, managers };
}

/** Uma linha do banco como objeto. */
export function dbRow(db: PlayerDb, pid: number): Record<DbField, number> & { id: number } | null {
  const i = db.id.indexOf(pid);
  if (i < 0) return null;
  const o: Record<string, number> = { id: pid };
  for (const [k, v] of Object.entries(db.cols)) o[k] = v![i]!;
  return o as Record<DbField, number> & { id: number };
}
