import type { CareerSave, Row } from '../save';
import { moduleBytes } from '../save/container';
import { u32 } from '../save/bytes';
import { ageAt, fromGameDays, fromYmd, seasonOf, toYmd } from './dates';
import { lineOf, type Line } from './positions';

/**
 * Resumo compacto de um save, pronto para a Home e para guardar no navegador.
 * Tudo aqui é derivado do save; nomes e fotos dos jogadores vêm depois, da base da EA.
 */
export interface SquadPlayer {
  id: number; age: number; ovr: number; pot: number; pos: number; line: Line; altPos: number[];
  slot: number; jersey: number; wage: number; value?: number; contractUntil: number; joined: number;
  foot: number; skillMoves: number; weakFoot: number; nationality: number; form: number; injured: boolean;
  /** Condição física 0–100 (módulo fitm). */
  condition?: number;
  /** Lesão: data prevista de volta (aaaammdd). */
  injuryReturn?: number;
  /** Cartões amarelos acumulados e jogos de suspensão (módulo susm). */
  yellows?: number; banGames?: number;
}
export interface Match {
  date: number; time: number; competitionId: number; competition: string; round: number;
  homeId: number | null; awayId: number | null; homeName: string; awayName: string;
  homeGoals: number | null; awayGoals: number | null; played: boolean;
}
export interface Transfer { date: number; playerId: number; fromId: number; fromName: string; toId: number; toName: string; fee: number; wage: number }
export interface TableRow { teamId: number; name: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }
export interface Standing { stageId: number; title: string; isLeague: boolean; rows: TableRow[] }
export interface CareerSnapshot {
  version: 2;
  slotName: string;
  importedAt: string;
  gameDate: number; // aaaammdd
  season: string;
  club: {
    id: number; name: string; leagueId: number; leagueName: string;
    ovr: number; att: number; mid: number; def: number;
    domesticPrestige: number; internationalPrestige: number; youthDevelopment: number;
    rivalId: number; rivalName: string; stadiumCapacity: number; founded: number; clubWorth: number;
    captainId: number; penaltyTakerId: number; freeKickTakerId: number; cornerTakerId: number;
    leagueTitles: number; domesticCups: number; prevPosition: number;
  };
  manager: { name: string; joined: number } | null;
  squad: SquadPlayer[];
  standings: Standing[];
  lastLineup: { playerId: number; minutes: number }[];
  ratings: { playerId: number; rating: number; minutes: number; date: number }[];
  /** Todos os jogos do clube na temporada, em ordem de data. */
  matches: Match[];
  /** Transferências registradas no save envolvendo qualquer clube (o jogo guarda só as recentes). */
  transfers: Transfer[];
}

const num = (r: Row | undefined, k: string) => (r?.[k] as number | undefined) ?? 0;
const str = (r: Row | undefined, k: string) => (r?.[k] as string | undefined) ?? '';

export function buildSnapshot(save: CareerSave, importedAt = new Date()): CareerSnapshot {
  const t = save.tables;
  const clubId = save.userTeamId;
  if (clubId == null) throw new Error('Não achei o time do usuário neste save');
  const teams = new Map((t.teams ?? []).map((r) => [num(r, 'teamid'), r]));
  const team = teams.get(clubId);
  const teamName = (id: number) => str(teams.get(id), 'teamname') || `Time ${id}`;

  const gameDate = currentDate(save) ?? toYmd(importedAt);
  const today = fromYmd(gameDate);
  const season = seasonOf(today);

  const ltl = (t.leagueteamlinks ?? []).find((r) => num(r, 'teamid') === clubId);
  const leagueId = num(ltl, 'leagueid');
  const league = (t.leagues ?? []).find((r) => num(r, 'leagueid') === leagueId);
  const leagueTeams = new Set((t.leagueteamlinks ?? []).filter((r) => num(r, 'leagueid') === leagueId).map((r) => num(r, 'teamid')));

  const players = new Map((t.players ?? []).map((p) => [num(p, 'playerid'), p]));
  const growth = new Set((t.career_playergrowthuserseason ?? []).map((r) => num(r, 'playerid')));
  const squad: SquadPlayer[] = (t.teamplayerlinks ?? [])
    .filter((l) => num(l, 'teamid') === clubId)
    .map((l) => {
      const id = num(l, 'playerid');
      const p = players.get(id);
      const pos = num(p, 'preferredposition1');
      return {
        id,
        age: ageAt(fromGameDays(num(p, 'birthdate')), today),
        ovr: num(p, 'overallrating'), pot: num(p, 'potential'), pos, line: lineOf(pos),
        altPos: [2, 3, 4].map((i) => num(p, `preferredposition${i}`)).filter((x) => x >= 0 && x !== pos),
        slot: num(l, 'position'), jersey: num(l, 'jerseynumber'),
        wage: num(p, 'wage'), contractUntil: num(p, 'contractvaliduntil'),
        joined: toYmd(fromGameDays(num(p, 'playerjointeamdate'))),
        foot: num(p, 'preferredfoot'), skillMoves: num(p, 'skillmoves') + 1, weakFoot: num(p, 'weakfootabilitytypecode'),
        nationality: num(p, 'nationality'), form: num(l, 'form'), injured: num(l, 'injury') > 0,
      };
    })
    .sort((a, b) => b.ovr - a.ovr);

  // Jogos referenciam times pela "linha" de uma classificação (rowIdx). Linhas sem time = mata-mata a definir.
  const rowTeam = new Map<number, number>(), rowStage = new Map<number, number>();
  for (const [stageId, rows] of save.standings) for (const r of rows) { rowTeam.set(r.rowIdx, r.teamId); rowStage.set(r.rowIdx, stageId); }
  const clubFixtures = save.fixtures.filter((f) => rowTeam.get(f.homeRow) === clubId || rowTeam.get(f.awayRow) === clubId);
  // A tabela da liga é a fase usada pela competição com mais jogos do clube (ex.: Premier League = 38 jogos).
  const perComp = new Map<number, number>();
  for (const f of clubFixtures) perComp.set(f.competitionId, (perComp.get(f.competitionId) ?? 0) + 1);
  const mainComp = [...perComp].sort((a, b) => b[1] - a[1])[0]?.[0];
  const compStage = new Map<number, number>();
  for (const f of clubFixtures) { const st = rowStage.get(f.homeRow); if (st != null && !compStage.has(f.competitionId)) compStage.set(f.competitionId, st); }
  const leagueStage = mainComp != null ? compStage.get(mainComp) : undefined;
  const stageTitle = (stageId: number, rows: { teamId: number }[]) => {
    const isLeague = leagueStage != null ? stageId === leagueStage
      : rows.length === leagueTeams.size && rows.every((r) => leagueTeams.has(r.teamId));
    return { isLeague, title: isLeague ? cleanLeague(str(league, 'leaguename')) : rows.length <= 8 ? 'Torneio de pré-temporada' : `Competição ${stageId}` };
  };

  const standings: Standing[] = [];
  for (const [stageId, rows] of save.standings) {
    if (!rows.some((r) => r.teamId === clubId)) continue;
    if (leagueStage != null && stageId !== leagueStage && rows.length > 8 && ![...compStage.values()].includes(stageId)) continue; // cópias da tabela sem jogos
    const { isLeague, title } = stageTitle(stageId, rows);
    standings.push({
      stageId, isLeague, title,
      rows: rows.map((r) => ({ teamId: r.teamId, name: teamName(r.teamId), played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, gf: r.goalsFor, ga: r.goalsAgainst, points: r.points })),
    });
  }
  standings.sort((a, b) => Number(b.isLeague) - Number(a.isLeague));

  const compTitle = (compId: number) => {
    const st = compStage.get(compId);
    return st != null ? stageTitle(st, save.standings.get(st) ?? []).title : `Competição ${compId}`;
  };
  const matches: Match[] = clubFixtures
    .map((f) => {
      const h = rowTeam.get(f.homeRow) ?? null, a = rowTeam.get(f.awayRow) ?? null;
      return {
        date: f.date, time: f.time, competitionId: f.competitionId, competition: compTitle(f.competitionId), round: f.round,
        homeId: h, awayId: a, homeName: h != null ? teamName(h) : 'A definir', awayName: a != null ? teamName(a) : 'A definir',
        homeGoals: f.homeGoals, awayGoals: f.awayGoals, played: f.homeGoals != null && f.awayGoals != null,
      };
    })
    .sort((x, y) => x.date - y.date || x.time - y.time);

  // Condição física, lesões e cartões do elenco.
  const fit = new Map(save.fitness.map((f) => [f.playerId, f]));
  const cards = new Map<number, { yellows: number; banGames: number }>();
  for (const c of save.cards) {
    if (c.teamId !== clubId) continue;
    const x = cards.get(c.playerId) ?? { yellows: 0, banGames: 0 };
    x.yellows += c.yellows; x.banGames += c.banGames; cards.set(c.playerId, x);
  }
  for (const p of squad) {
    const f = fit.get(p.id);
    if (f) { p.condition = f.condition; if (f.injured && f.returnDate) { p.injured = true; p.injuryReturn = f.returnDate; } }
    const c = cards.get(p.id);
    if (c) { p.yellows = c.yellows; p.banGames = c.banGames; }
  }

  const mgr = (t.manager ?? []).find((m) => num(m, 'teamid') === clubId);
  const lineup = save.lineups.find((l) => l.teamId === clubId);
  const squadIds = new Set(squad.map((p) => p.id));

  return {
    version: 2,
    slotName: save.slotName,
    importedAt: importedAt.toISOString(),
    gameDate,
    season: season.label,
    club: {
      id: clubId, name: teamName(clubId), leagueId, leagueName: cleanLeague(str(league, 'leaguename')),
      ovr: num(team, 'overallrating'), att: num(team, 'attackrating'), mid: num(team, 'midfieldrating'), def: num(team, 'defenserating'),
      domesticPrestige: num(team, 'domesticprestige'), internationalPrestige: num(team, 'internationalprestige'),
      youthDevelopment: num(team, 'youthdevelopment'),
      rivalId: num(team, 'rivalteam'), rivalName: teamName(num(team, 'rivalteam')),
      stadiumCapacity: num(team, 'teamstadiumcapacity'), founded: num(team, 'foundationyear'), clubWorth: num(team, 'clubworth'),
      captainId: num(team, 'captainid'), penaltyTakerId: num(team, 'penaltytakerid'),
      freeKickTakerId: num(team, 'freekicktakerid'), cornerTakerId: num(team, 'leftcornerkicktakerid'),
      leagueTitles: num(team, 'leaguetitles'), domesticCups: num(team, 'domesticcups'),
      prevPosition: num(ltl, 'previousyeartableposition'),
    },
    manager: mgr ? { name: str(mgr, 'commonname') || `${str(mgr, 'firstname')} ${str(mgr, 'surname')}`.trim(), joined: toYmd(fromGameDays(num(mgr, 'managerjointeamdate'))) } : null,
    squad,
    standings,
    lastLineup: lineup?.players.map((p) => ({ playerId: p.playerId, minutes: p.minutes })) ?? [],
    ratings: (t.career_playermatchratinghistory ?? [])
      .filter((r) => squadIds.has(num(r, 'playerid')))
      .map((r) => ({ playerId: num(r, 'playerid'), rating: num(r, 'rating'), minutes: num(r, 'minsplayed'), date: num(r, 'date') })),
    matches,
    transfers: save.transfers
      .map((x) => ({ date: x.date, playerId: x.playerId, fromId: x.fromTeam, fromName: teamName(x.fromTeam), toId: x.toTeam, toName: teamName(x.toTeam), fee: x.fee, wage: x.wage }))
      .sort((a, b) => b.date - a.date),
  };
}

const cleanLeague = (s: string) => s.replace(/\s*\(\d+\)\s*$/, '');

/** Data atual do jogo: módulo `cldm` (calendário), inteiro aaaammdd no offset 21. */
function currentDate(save: CareerSave): number | null {
  const m = moduleBytes(save.container, 'cldm');
  if (!m || m.length < 25) return null;
  const v = u32(m, 21);
  return v > 19000101 && v < 21000101 ? v : null;
}
