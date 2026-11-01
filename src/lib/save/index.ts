import { readContainer, moduleBytes, type SaveContainer } from './container';
import { findDatabases, readTables, readRows, type Row, type TableDef } from './t3db';
import { calibrate } from './calibrate';
import { readStandings, type StandingRow } from './modules/standings';
import { readLineups, type TeamLineup } from './modules/lineups';
import { readFixtures, type RawFixture } from './modules/fixtures';
import { readFitness, type Fitness } from './modules/fitness';
import { readCards, type CardRecord } from './modules/cards';
import { readTransfers, type TransferRecord } from './modules/transfers';
import { readNames, type SaveNames } from './modules/names';
import { readFinances, type Finances } from './modules/finances';
import { readRoles, type SquadRoles } from './modules/roles';
import { readMorale, type PlayerMorale } from './modules/morale';
import { readManagerHistory, type ManagerHistory } from './modules/manager';
import { readPlayerStats, type PlayerStatRecord } from './modules/playerStats';
import { readLoans, type LoanRecord } from './modules/loans';
import { readPreseason, type PreseasonTour } from './modules/preseason';
import { readAwardsRace, type AwardContender } from './modules/awards';

export interface CareerSave {
  slotName: string;
  /** Tabelas calibradas por nome, ex.: tables.players, tables.teams, tables.career_playermatchratinghistory */
  tables: Record<string, Row[]>;
  userTeamId: number | null;
  standings: Map<number, StandingRow[]>;
  lineups: TeamLineup[];
  fixtures: RawFixture[];
  fitness: Fitness[];
  cards: CardRecord[];
  transfers: TransferRecord[];
  names: SaveNames;
  finances: Finances | null;
  roles: SquadRoles | null;
  morale: { teamId: number; players: PlayerMorale[] } | null;
  managerHistory: ManagerHistory | null;
  /** Estatísticas por jogador e competição (fcem). */
  playerStats: PlayerStatRecord[];
  /** Empréstimos ativos no mundo (lnsm). */
  loans: LoanRecord[];
  /** Convites de torneios de pré-temporada (psem). */
  preseason: PreseasonTour[];
  /** Times candidatos aos prêmios da temporada (awrm). */
  awardsRace: AwardContender[];
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
  const mod = <T,>(tag: string, read: (b: Uint8Array) => T[]): T[] => {
    const b = moduleBytes(container, tag);
    try { return b ? read(b) : []; } catch { return []; }
  };
  const one = <T,>(tag: string, read: (b: Uint8Array) => T | null): T | null => {
    const b = moduleBytes(container, tag);
    try { return b ? read(b) : null; } catch { return null; }
  };
  const playerIds = new Set((tables.players ?? []).map((r) => r.playerid as number));
  return {
    slotName: container.slotName,
    tables,
    userTeamId: userTeam(tables),
    standings: fcem ? readStandings(fcem, (id) => teamIds.has(id)) : new Map(),
    lineups: hstm ? readLineups(hstm) : [],
    fixtures: fcem ? readFixtures(fcem) : [],
    fitness: mod('fitm', readFitness),
    cards: mod('susm', readCards),
    transfers: mod('trfm', readTransfers),
    names: one('ytpm', (b) => readNames(b, (id) => playerIds.has(id))) ?? { people: new Map(), dict: new Map() },
    finances: one('tfnm', readFinances),
    roles: one('pstm', readRoles),
    morale: one('pllm', readMorale),
    managerHistory: one('mhrm', (b) => readManagerHistory(b, (id) => teamIds.has(id))),
    playerStats: (() => { try { return fcem ? readPlayerStats(fcem, playerIds) : []; } catch { return []; } })(),
    loans: mod('lnsm', readLoans),
    preseason: mod('psem', readPreseason),
    awardsRace: mod('awrm', readAwardsRace),
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

export type { Row, TableDef, StandingRow, TeamLineup, RawFixture, Fitness, CardRecord, TransferRecord, SaveNames, Finances, SquadRoles, PlayerMorale, ManagerHistory, PlayerStatRecord, LoanRecord, PreseasonTour, AwardContender };
