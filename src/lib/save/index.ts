import { readContainer, moduleBytes, type SaveContainer } from './container';
import { findDatabases, readTables, readRows, type Row, type TableDef } from './t3db';
import { calibrate } from './calibrate';
import { readStandings, type StandingRow } from './modules/standings';
import { readLineups, type TeamLineup } from './modules/lineups';
import { readFixtures, type RawFixture } from './modules/fixtures';
import { readCompetitions, type Competition } from './modules/competitions';
import { readFitness, type Fitness } from './modules/fitness';
import { readCards, type CardRecord } from './modules/cards';
import { readTransfers, readTransferHistory, type TransferRecord } from './modules/transfers';
import { readNames, type SaveNames } from './modules/names';
import { readFinances, type Finances } from './modules/finances';
import { readRoles, type SquadRoles } from './modules/roles';
import { readMorale, type PlayerMorale } from './modules/morale';
import { readManagerHistory, type ManagerHistory } from './modules/manager';
import { readPlayerStats, type PlayerStatRecord } from './modules/playerStats';
import { readLoans, type LoanRecord } from './modules/loans';
import { readPreseason, type PreseasonTour } from './modules/preseason';
import { readAwardsRace, type AwardContender } from './modules/awards';
import { readBudgets, type ClubBudget } from './modules/budgets';
import { readPlayerValues, readPlayerForm, type PlayerForm } from './modules/playerValues';
import { readSocial, EMAIL, type SocialPost } from './modules/social';
import { readDynamicOvr, type DynamicOvr } from './modules/dynamicOvr';
import { readCoaches, type Coach } from './modules/coaches';
import { readSeasonStats, type SeasonHistory } from './modules/seasonStats';
import { readJobSecurity, type ClubJobSecurity } from './modules/jobs';
import { readSuggestedPlayers, readMarketList, readLeagueLists, type SuggestedPlayer, type MarketListing, type LeagueList } from './modules/market';

export interface CareerSave {
  slotName: string;
  /** Tabelas calibradas por nome, ex.: tables.players, tables.teams, tables.career_playermatchratinghistory */
  tables: Record<string, Row[]>;
  userTeamId: number | null;
  standings: Map<number, StandingRow[]>;
  lineups: TeamLineup[];
  fixtures: RawFixture[];
  /** Registro de competições (id → asset do troféu e país). */
  competitions: Map<number, Competition>;
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
  /** Orçamentos de transferências e salários dos clubes da IA (budm). */
  budgets: ClubBudget[];
  /** Valor de mercado dos jogadores do seu clube (pvlm). */
  playerValues: Map<number, number>;
  /** Forma e últimas notas dos jogadores do seu clube (plfm). */
  playerForm: PlayerForm[];
  /** Feed de notícias do jogo: time da semana, jogador do mês, demissões, rumores (socm). */
  social: SocialPost[];
  /** Caixa de e-mails do técnico (emlm). */
  emails: SocialPost[];
  /** OVR dinâmico: quanto a forma e o cansaço mudam o OVR e os atributos (dovm). */
  dynamicOvr: DynamicOvr[];
  /** Comissão técnica do clube e mercado de treinadores (coam). */
  coaches: Coach[];
  /** Estatísticas da temporada passada por competição, de 3.886 jogadores (stvm). */
  seasonStats: SeasonHistory[];
  /** Segurança no cargo do técnico de cada clube da IA (jbom). */
  jobSecurity: ClubJobSecurity[];
  /** Provável: jogadores sugeridos/observados para o clube (pdrm). */
  suggestedPlayers: SuggestedPlayer[];
  /** Provável: lista do mercado do mundo durante a janela (plmm). */
  marketList: MarketListing[];
  /** Provável: jogadores do mesmo nível do clube, por liga (psrm). */
  leagueLists: LeagueList[];
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
  const club = userTeam(tables);
  return {
    slotName: container.slotName,
    tables,
    userTeamId: club,
    standings: fcem ? readStandings(fcem, (id) => teamIds.has(id)) : new Map(),
    lineups: hstm ? readLineups(hstm) : [],
    fixtures: fcem ? readFixtures(fcem) : [],
    competitions: (() => { try { return fcem ? readCompetitions(fcem) : new Map(); } catch { return new Map(); } })(),
    fitness: mod('fitm', readFitness),
    cards: mod('susm', readCards),
    transfers: mod('trfm', (b) => { const a = readTransfers(b), h = readTransferHistory(b); return [...a, ...h.filter((x) => !a.some((y) => y.playerId === x.playerId && y.toTeam === x.toTeam))]; }),
    names: one('ytpm', (b) => readNames(b, (id) => playerIds.has(id))) ?? { people: new Map(), dict: new Map() },
    finances: one('tfnm', readFinances),
    roles: one('pstm', readRoles),
    morale: one('pllm', readMorale),
    managerHistory: one('mhrm', (b) => readManagerHistory(b, (id) => teamIds.has(id))),
    playerStats: (() => { try { return fcem ? readPlayerStats(fcem, playerIds) : []; } catch { return []; } })(),
    loans: mod('lnsm', readLoans),
    preseason: mod('psem', readPreseason),
    awardsRace: mod('awrm', readAwardsRace),
    budgets: mod('budm', readBudgets),
    social: mod('socm', (b) => readSocial(b)),
    emails: mod('emlm', (b) => readSocial(b, EMAIL)),
    dynamicOvr: mod('dovm', readDynamicOvr),
    coaches: mod('coam', readCoaches),
    seasonStats: mod('stvm', readSeasonStats),
    jobSecurity: mod('jbom', readJobSecurity),
    suggestedPlayers: mod('pdrm', readSuggestedPlayers),
    marketList: mod('plmm', readMarketList),
    leagueLists: mod('psrm', readLeagueLists),
    playerValues: one('pvlm', readPlayerValues) ?? new Map(),
    playerForm: mod('plfm', (b) => readPlayerForm(b, new Set((tables.teamplayerlinks ?? []).filter((l) => l.teamid === club).map((l) => l.playerid as number)))),
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

export type { Row, TableDef, StandingRow, TeamLineup, RawFixture, Fitness, CardRecord, TransferRecord, SaveNames, Finances, SquadRoles, PlayerMorale, ManagerHistory, PlayerStatRecord, LoanRecord, PreseasonTour, AwardContender, ClubBudget, PlayerForm, SocialPost, DynamicOvr };
