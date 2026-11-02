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

const BASE = [
  'overallrating', 'potential', 'birthdate', 'preferredposition1', 'preferredposition2', 'preferredposition3', 'preferredposition4',
  'nationality', 'height', 'weight', 'preferredfoot', 'weakfootabilitytypecode', 'skillmoves', 'wage', 'contractvaliduntil', 'releaseclause',
  'internationalrep', 'pacdiv', 'shohan', 'paskic', 'driref', 'defspe', 'phypos', 'isretiring', 'playerjointeamdate', 'bodytypecode',
  'emotion', 'personality', 'gender', 'trait1', 'trait2', 'icontrait1', 'icontrait2', 'role1', 'role2', 'role3', 'role4', 'role5',
] as const;
export const DB_FIELDS = [...BASE, ...ATTRS] as const;
export type DbField = (typeof DB_FIELDS)[number] | 'team' | 'jersey' | 'age' | 'value';

export interface PlayerDb { gameDate: number; id: number[]; cols: Partial<Record<DbField, number[]>>; teams: Record<number, string>; leagueOfTeam: Record<number, number>; leagues: Record<number, string> }

const num = (r: Row | undefined, k: string) => { const v = r?.[k]; return typeof v === 'number' ? v : Number(v ?? 0) || 0; };

export function buildPlayerDb(save: CareerSave, today: Date, gameDate: number): PlayerDb {
  const t = save.tables;
  const players = t.players ?? [];
  const leagueOf = new Map((t.leagueteamlinks ?? []).map((r) => [num(r, 'teamid'), num(r, 'leagueid')]));
  // Clube de cada jogador: o primeiro vínculo com um time que está numa liga (seleções ficam de fora).
  const club = new Map<number, { team: number; jersey: number }>();
  for (const l of t.teamplayerlinks ?? []) {
    const pid = num(l, 'playerid'), tid = num(l, 'teamid');
    if (!club.has(pid) && leagueOf.has(tid)) club.set(pid, { team: tid, jersey: num(l, 'jerseynumber') });
  }
  const cols: PlayerDb['cols'] = {};
  for (const f of [...DB_FIELDS, 'team', 'jersey', 'age', 'value'] as DbField[]) cols[f] = [];
  const id: number[] = [];
  for (const p of players) {
    const pid = num(p, 'playerid');
    if (num(p, 'overallrating') <= 0) continue;
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
  return { gameDate, id, cols, teams, leagueOfTeam, leagues };
}

/** Uma linha do banco como objeto. */
export function dbRow(db: PlayerDb, pid: number): Record<DbField, number> & { id: number } | null {
  const i = db.id.indexOf(pid);
  if (i < 0) return null;
  const o: Record<string, number> = { id: pid };
  for (const [k, v] of Object.entries(db.cols)) o[k] = v![i]!;
  return o as Record<DbField, number> & { id: number };
}
