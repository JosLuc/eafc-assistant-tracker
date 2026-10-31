import { readContainer, moduleBytes, type SaveContainer } from './container';
import { findDatabases, readTables, readRows, type Row, type TableDef } from './t3db';
import { calibrate } from './calibrate';
import { readStandings, type StandingRow } from './modules/standings';
import { readLineups, type TeamLineup } from './modules/lineups';

export interface CareerSave {
  slotName: string;
  /** Tabelas calibradas por nome, ex.: tables.players, tables.teams, tables.career_playermatchratinghistory */
  tables: Record<string, Row[]>;
  userTeamId: number | null;
  standings: Map<number, StandingRow[]>;
  lineups: TeamLineup[];
  container: SaveContainer;
}

export function readSave(file: Uint8Array): CareerSave {
  const container = readContainer(file);
  const { blob } = container;
  const dbs = findDatabases(blob);
  if (dbs.length < 2) throw new Error(`Esperava 2 bancos t3db, achei ${dbs.length}`);
  const tables: Record<string, Row[]> = {};
  dbs.forEach((o, i) => {
    for (const t of readTables(blob, o)) {
      tables[t.name] = calibrate(readRows(blob, t), t, i === 0 ? 'career' : 'main');
    }
  });

  const teamIds = new Set((tables.teams ?? []).map((r) => r.teamid as number));
  const fcem = moduleBytes(container, 'fcem');
  const hstm = moduleBytes(container, 'hstm');
  return {
    slotName: container.slotName,
    tables,
    userTeamId: userTeam(tables),
    standings: fcem ? readStandings(fcem, (id) => teamIds.has(id)) : new Map(),
    lineups: hstm ? readLineups(hstm) : [],
    container,
  };
}

/**
 * Time do usuário: o clube onde está a maioria dos jogadores de `career_playergrowthuserseason`
 * (tabela que o jogo só preenche para o elenco do usuário).
 */
function userTeam(t: Record<string, Row[]>): number | null {
  const growth = new Set((t.career_playergrowthuserseason ?? []).map((r) => r.playerid as number));
  if (!growth.size) return null;
  const count = new Map<number, number>();
  for (const l of t.teamplayerlinks ?? []) {
    if (growth.has(l.playerid as number)) count.set(l.teamid as number, (count.get(l.teamid as number) ?? 0) + 1);
  }
  let best: number | null = null, n = 0;
  for (const [team, c] of count) if (c > n) { best = team; n = c; }
  return best;
}

export type { Row, TableDef, StandingRow, TeamLineup };
