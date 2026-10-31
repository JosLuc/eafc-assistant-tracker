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

}
export interface TableRow { teamId: number; name: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }
export interface Standing { stageId: number; title: string; isLeague: boolean; rows: TableRow[] }
export interface CareerSnapshot {
  version: 1;
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

  const standings: Standing[] = [];
  for (const [stageId, rows] of save.standings) {
    if (!rows.some((r) => r.teamId === clubId)) continue;
    const isLeague = rows.length === leagueTeams.size && rows.every((r) => leagueTeams.has(r.teamId));
    standings.push({
      stageId, isLeague,
      title: isLeague ? cleanLeague(str(league, 'leaguename')) : rows.length <= 8 ? 'Torneio de pré-temporada' : `Competição ${stageId}`,
      rows: rows.map((r) => ({ teamId: r.teamId, name: teamName(r.teamId), played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, gf: r.goalsFor, ga: r.goalsAgainst, points: r.points })),
    });
  }
  standings.sort((a, b) => Number(b.isLeague) - Number(a.isLeague));

  const mgr = (t.manager ?? []).find((m) => num(m, 'teamid') === clubId);
  const lineup = save.lineups.find((l) => l.teamId === clubId);
  const squadIds = new Set(squad.map((p) => p.id));

  return {
    version: 1,
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
