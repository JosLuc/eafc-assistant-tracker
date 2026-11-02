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
  /** Papel no elenco: 1 Crucial, 2 Importante, 3 Rodízio, 4 Esporádico, 5 Promessa (módulo pstm). */
  role?: number;
  moraleTeam?: number; moralePlayer?: number; moraleContract?: number;
  /** Valor de mercado (pvlm), forma 0–100, tendência e últimas notas (plfm). */
  formScore?: number; formTrend?: number; recentRatings?: number[];
  /** OVR dinâmico (dovm): pontos de OVR ganhos/perdidos pela forma e pelo cansaço. */
  ovrForm?: number; ovrFatigue?: number;
  /** Temporada passada por competição (stvm). */
  lastSeason?: { competitionId: number; goals: number; assists: number; cleanSheets: number; yellows: number; reds: number; apps: number }[];
  /** Moral 0–100 e seus componentes (módulo pllm). */
  morale?: number; playingTime?: number;
}
export interface YouthPlayer {
  id: number; age: number; pos: number; ovr: number; pot: number;
  /** Campos extras (saves lidos a partir da aba Base). */
  altPos?: number[]; wage?: number; value?: number; contractUntil?: number; nationality?: number;
  foot?: number; skillMoves?: number; weakFoot?: number; jersey?: number;
  /** career_youthplayers: nível do jogador (tier) e meses no time da base. */
  tier?: number; monthsInSquad?: number;
}
export interface Scout { name: string; nationality: number; experience: number; knowledge: number; region: number }
export interface SeasonRecord { teamId: number; teamName: string; league: string; objective: number; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number; position: number }
export interface Match {
  date: number; time: number; competitionId: number; competition: string; round: number;
  homeId: number | null; awayId: number | null; homeName: string; awayName: string;
  homeGoals: number | null; awayGoals: number | null; played: boolean;
}
export interface Transfer { date: number; playerId: number; fromId: number; fromName: string; toId: number; toName: string; fee: number; wage: number }
/** Números de um jogador numa competição da temporada. avgRating = nota média (ex.: 7.26). */
export interface StatLine { playerId: number; teamId: number; apps: number; minutes: number; goals: number; assists: number; cleanSheets: number; potm: number; yellows: number; avgRating: number }
export interface CompetitionStats { competitionId: number; competition: string; isLeague: boolean; players: StatLine[] }
export interface TableRow { teamId: number; name: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }
export interface Standing { stageId: number; title: string; isLeague: boolean; rows: TableRow[] }
export interface CareerSnapshot {
  version: 3;
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
    popularity: number;
  };
  manager: {
    name: string; joined: number; wage?: number; earnings?: number; jobSecurity?: number;
    history?: SeasonRecord[];
    biggestWin?: { score: string; opponent: string; date: number };
    /** Prêmios do técnico (ex.: técnico do mês). */
    awards?: { date: number; season: number; teamId: number; teamName: string; type: number; count: number }[];
    worstStreak?: number;
  } | null;
  /** Nomes que o save guarda (jogadores gerados pelo jogo: base e regens). Reais vêm da EA. */
  names: Record<number, string>;
  finances: { initialBudget: number; currentBudget: number; spentOnPlayers: number; wageRaises: number; transactions?: { date: number; amount: number; type: number }[] } | null;
  morale: { average: number; teamPerformance: number; playerPerformance: number; contract: number; playingTime: number } | null;
  /** Gols do seu time na temporada, por jogador (histórico de jogos do técnico, inclui amistosos). */
  scorers: { playerId: number; goals: number }[];
  youth: YouthPlayer[];
  scouts: Scout[];
  squad: SquadPlayer[];
  standings: Standing[];
  lastLineup: { playerId: number; minutes: number }[];
  ratings: { playerId: number; rating: number; minutes: number; date: number }[];
  /** Todos os jogos do clube na temporada, em ordem de data. */
  matches: Match[];
  /** Transferências registradas no save envolvendo qualquer clube (o jogo guarda só as recentes). */
  transfers: Transfer[];
  /** Estatísticas da temporada por competição: todo o seu elenco e, na liga, os líderes dos outros times. */
  stats: CompetitionStats[];
  /** Identifica a carreira (técnico + data de nascimento), para juntar saves da mesma carreira. */
  careerKey: string;
  /** Tática ativa e cobradores de bola parada. */
  tactic: Tactic | null;
  /** Transferências pelo mundo registradas no save (persistent_events). */
  worldTransfers: { date: number; playerId: number; fromId: number; fromName: string; toId: number; toName: string; fee?: number; wage?: number }[];
  /** Empréstimos do clube: emprestados (out) e recebidos (in). */
  loans: Loan[];
  /** Convites de torneios de pré-temporada. */
  preseason: { key: string; name: string; prize: number; teams: { id: number; name: string }[] }[];
  /** Corrida dos prêmios: times candidatos das grandes ligas (posição na temporada anterior). */
  /** Orçamento de transferências de cada clube da IA: [teamid, inicial, atual, orçamento salarial]. */
  budgets: [number, number, number, number][];
  /** Feed de notícias do jogo (chave do texto, parâmetros [tipo, valor], jogadores, data). */
  news: { key: string; date: number | null; params: [number, number][]; players: number[]; teams?: { id: number; name: string }[] }[];
  /** E-mails da caixa de entrada (diretoria, lesões, base, empréstimos…). */
  emails: { key: string; date: number | null; params: [number, number][]; players: number[]; teams?: { id: number; name: string }[] }[];
  /** Clubes da sua liga: orçamento de transferências (inicial e atual), orçamento salarial e segurança no cargo do técnico. */
  /** Nome das competições que aparecem na temporada passada do elenco (liga do clube mais comum entre os jogadores). */
  lastSeasonComps: Record<number, string>;
  leagueRivals: { teamId: number; name: string; initial: number; current: number; wage: number; security: number | null }[];
  /** Times da semana publicados no feed. */
  teamOfWeek: { date: number | null; players: number[] }[];
  /** Jogadores do mês publicados no feed. */
  playerOfMonth: { date: number | null; playerId: number; teamId: number; teamName: string; competitionId: number }[];
  awardsRace: { teamId: number; teamName: string; leagueId: number; league: string; rank: number; star: number; players: number[] }[];
  /** Comissão técnica: treinadores do clube (hired) e mercado de treinadores. Função e notas ainda prováveis. */
  coaches: { id: number; name: string; birthDate: number; nationality: number; wage: number; role: number; level: number; ratings: number[]; hired: boolean }[];
}
export interface Loan { dir: 'out' | 'in'; playerId: number; clubId: number; clubName: string; until: number; buyOption: number | null; ovr: number; age: number; pos: number }
export interface Tactic {
  name: string; formation: string; code: string; defensiveDepth: number; buildUp: number;
  /** Titulares na ordem da formação, com posição e coordenadas no campo (0..1). */
  players: { playerId: number; pos: number; x: number; y: number }[];
  captain: number; penalties: number; freeKickL: number; freeKickR: number; cornerL: number; cornerR: number;
  longKick: number; throwL: number; throwR: number; cornerSupport: number[];
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

  // Papéis e moral do elenco.
  if (save.roles?.teamId === clubId) for (const p of squad) p.role = save.roles.roles.get(p.id);
  const forms = new Map(save.playerForm.map((f) => [f.playerId, f]));
  const dyn = new Map(save.dynamicOvr.map((d) => [d.playerId, d]));
  const prev = new Map(save.seasonStats.map((x) => [x.playerId, x.comps]));
  const withTeams = <T extends { params: [number, number][] }>(x: T) => ({
    ...x, teams: [...new Set(x.params.filter(([k, v]) => (k === 15 || k === 16) && v > 0 && v < 999999).map(([, v]) => v))].map((id) => ({ id, name: teamName(id) })),
  });
  for (const p of squad) {
    p.value = save.playerValues.get(p.id);
    const f = forms.get(p.id);
    if (f) { p.formScore = f.form; p.formTrend = f.trend; p.recentRatings = f.ratings; }
    const d = dyn.get(p.id);
    if (d) { p.ovrForm = d.form; p.ovrFatigue = d.fatigue; }
    const ls = prev.get(p.id);
    if (ls) p.lastSeason = ls;
  }
  let morale: CareerSnapshot['morale'] = null;
  if (save.morale?.teamId === clubId && save.morale.players.length) {
    const ms = save.morale.players;
    const byId = new Map(ms.map((x) => [x.playerId, x]));
    for (const p of squad) { const x = byId.get(p.id); if (x) { p.morale = x.morale; p.playingTime = x.playingTime; p.moraleTeam = x.teamPerformance; p.moralePlayer = x.playerPerformance; p.moraleContract = x.contract; } }
    const avg = (f: (x: (typeof ms)[number]) => number) => Math.round(ms.reduce((a, x) => a + f(x), 0) / ms.length);
    morale = { average: avg((x) => x.morale), teamPerformance: avg((x) => x.teamPerformance), playerPerformance: avg((x) => x.playerPerformance), contract: avg((x) => x.contract), playingTime: avg((x) => x.playingTime) };
  }

  // Nomes guardados no save (gerados pelo jogo). Os ids de nome no banco vêm calibrados com −1.
  const names: Record<number, string> = {};
  const nameOf = (id: number) => {
    const person = save.names.people.get(id);
    if (person) return person.common || `${person.first} ${person.last}`.trim();
    const p = players.get(id);
    const first = save.names.dict.get(num(p, 'firstnameid') + 1), last = save.names.dict.get(num(p, 'lastnameid') + 1);
    return first && last ? `${first} ${last}` : undefined;
  };

  // Base.
  const youth: YouthPlayer[] = (t.career_youthplayers ?? []).map((y) => {
    const id = num(y, 'playerid'), p = players.get(id);
    const pos = num(p, 'preferredposition1');
    const link = (t.teamplayerlinks ?? []).find((l) => num(l, 'playerid') === id);
    return {
      id, age: ageAt(fromGameDays(num(p, 'birthdate')), today), pos, ovr: num(p, 'overallrating'), pot: num(p, 'potential'),
      altPos: [2, 3, 4].map((i) => num(p, `preferredposition${i}`)).filter((x) => x >= 0 && x !== pos),
      wage: num(p, 'wage'), value: save.playerValues.get(id), contractUntil: num(p, 'contractvaliduntil'), nationality: num(p, 'nationality'),
      foot: num(p, 'preferredfoot'), skillMoves: num(p, 'skillmoves') + 1, weakFoot: num(p, 'weakfootabilitytypecode'),
      jersey: link ? num(link, 'jerseynumber') : undefined, tier: num(y, 'playertier'), monthsInSquad: num(y, 'monthsinsquad'),
    };
  }).filter((y) => y.ovr > 0).sort((a, b) => b.pot - a.pot);
  const scouts: Scout[] = (t.career_scouts ?? []).map((x) => ({
    name: `${str(x, 'firstname')} ${str(x, 'lastname')}`.trim(), nationality: num(x, 'nationality'),
    experience: num(x, 'experience'), knowledge: num(x, 'knowledge'), region: num(x, 'regionid'),
  }));
  for (const id of [...squad.map((p) => p.id), ...youth.map((y) => y.id), ...save.transfers.map((x) => x.playerId)]) {
    const n = nameOf(id); if (n) names[id] = n;
  }

  // Histórico do técnico.
  const mh = save.managerHistory?.clubId === clubId ? save.managerHistory : null;
  const leagueName = (id: number) => cleanLeague(str((t.leagues ?? []).find((r) => num(r, 'leagueid') === id), 'leaguename')) || `Liga ${id}`;
  const teamByKey = new Map<number, number>();
  for (const id of teams.keys()) if (!teamByKey.has((id + 1) & 0xffff)) teamByKey.set((id + 1) & 0xffff, id);
  const seasonStart = seasonOf(today).start * 10000 + 701;
  const official = mh?.matches ?? [];
  let biggestWin: NonNullable<CareerSnapshot['manager']>['biggestWin'];
  let best = -1, streak = 0, worstStreak = 0;
  for (const m of official) {
    const [mine, theirs] = m.home ? [m.homeGoals, m.awayGoals] : [m.awayGoals, m.homeGoals];
    if (mine - theirs > best && mine > theirs) {
      best = mine - theirs;
      const opp = teamByKey.get(m.opponentKey);
      biggestWin = { score: `${mine}-${theirs}`, opponent: opp != null ? teamName(opp) : 'adversário', date: m.date };
    }
    streak = mine < theirs ? streak + 1 : 0; worstStreak = Math.max(worstStreak, streak);
  }
  const goals = new Map<number, number>();
  for (const m of official) if (m.date >= seasonStart) for (const sc of m.scorers) goals.set(sc.playerId, (goals.get(sc.playerId) ?? 0) + sc.goals);
  const scorers = [...goals].map(([playerId, g]) => ({ playerId, goals: g })).sort((a, b) => b.goals - a.goals);

  const stats = competitionStats(save, clubId, matches, rowTeam);
  for (const c of stats) for (const x of c.players) if (!names[x.playerId]) { const n = nameOf(x.playerId); if (n) names[x.playerId] = n; }
  for (const e of t.persistent_events ?? []) { const id = num(e, 'player1id'); if (id > 0 && !names[id]) { const n = nameOf(id); if (n) names[id] = n; } }

  const mgr = (t.manager ?? []).find((m) => num(m, 'teamid') === clubId);
  const lineup = save.lineups.find((l) => l.teamId === clubId);
  const squadIds = new Set(squad.map((p) => p.id));

  return {
    version: 3,
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
      popularity: num(team, 'popularity'),
    },
    manager: mgr ? {
      name: str(mgr, 'commonname') || `${str(mgr, 'firstname')} ${str(mgr, 'surname')}`.trim(),
      joined: mh && mh.joined > 20100101 ? mh.joined : toYmd(fromGameDays(num(mgr, 'managerjointeamdate'))),
      wage: mh?.wage, earnings: mh?.earnings, jobSecurity: mh?.seasons.at(-1)?.jobSecurity,
      history: mh?.seasons.map((x) => ({ ...x, teamName: teamName(x.teamId), league: leagueName(x.leagueId) })),
      biggestWin, worstStreak,
      awards: (t.career_managerawards ?? []).map((r) => ({ date: toYmd(fromGameDays(num(r, 'receiveddate'))), season: num(r, 'season'), teamId: num(r, 'teamid'), teamName: teamName(num(r, 'teamid')), type: num(r, 'typeid'), count: num(r, 'count') })),
    } : null,
    names, finances: save.finances, morale, scorers, youth, scouts,
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
    stats,
    careerKey: careerKeyOf(mgr, clubId),
    tactic: readTactic(t, clubId),
    worldTransfers: worldTransfers(save, teamName, players),
    news: save.social.filter((x) => !x.key.startsWith('CM_SM_')).map(withTeams),
    emails: save.emails.map(withTeams),
    lastSeasonComps: lastSeasonComps(save, squad, leagueName),
    leagueRivals: save.budgets.filter((x) => leagueTeams.has(x.teamId) && x.teamId !== clubId).map((x) => ({
      teamId: x.teamId, name: teamName(x.teamId), initial: x.initial, current: x.current, wage: x.wageBudget,
      security: save.jobSecurity.find((j) => j.teamId === x.teamId)?.security ?? null,
    })).sort((a, b) => b.current - a.current),
    teamOfWeek: save.social.filter((x) => x.key.startsWith('CM_Player_Awards') && x.players.length === 11).map((x) => ({ date: x.date, players: x.players })),
    playerOfMonth: save.social.filter((x) => x.key === 'CM_Social_POTM_UM').map((x) => {
      const get = (...types: number[]) => x.params.find(([t]) => types.includes(t))?.[1] ?? 0;
      return { date: x.date, playerId: get(8, 10), teamId: get(15, 16), teamName: teamName(get(15, 16)), competitionId: get(28) };
    }),
    budgets: save.budgets.map((x) => [x.teamId, x.initial, x.current, x.wageBudget]),
    awardsRace: save.awardsRace.map((x) => ({ ...x, teamName: teamName(x.teamId), league: leagueName(x.leagueId) })),
    loans: clubLoans(save, clubId, teamName, players, today),
    coaches: save.coaches.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, birthDate: c.birthDate, nationality: c.nationality, wage: c.wage, role: c.role, level: c.level, ratings: c.ratings, hired: c.hired })),
    preseason: save.preseason.map((x) => ({ key: x.key, name: x.name, prize: x.prize, teams: x.teams.map((id) => ({ id, name: teamName(id) })) })),
  };
}

/** Nomeia as competições da temporada passada: se quase todos os jogadores daquela competição são de clubes de uma liga, é ela. */
function lastSeasonComps(save: CareerSave, squad: SquadPlayer[], leagueName: (id: number) => string): Record<number, string> {
  const want = new Set(squad.flatMap((p) => p.lastSeason?.map((c) => c.competitionId) ?? []));
  const leagueOf = new Map((save.tables.leagueteamlinks ?? []).map((r) => [num(r, 'teamid'), num(r, 'leagueid')]));
  const votes = new Map<number, Map<number, number>>();
  for (const h of save.seasonStats) for (const c of h.comps) {
    if (!want.has(c.competitionId)) continue;
    const lg = leagueOf.get(h.clubs[h.clubs.length - 1] ?? -1);
    if (lg == null) continue;
    const m = votes.get(c.competitionId) ?? new Map<number, number>();
    m.set(lg, (m.get(lg) ?? 0) + 1); votes.set(c.competitionId, m);
  }
  const out: Record<number, string> = { 135: 'Champions League' };
  for (const [comp, m] of votes) {
    if (out[comp]) continue;
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    const [lg, n] = [...m].sort((a, b) => b[1] - a[1])[0]!;
    out[comp] = n / total >= 0.8 ? leagueName(lg) : 'Copa ou outro torneio';
  }
  return out;
}

/**
 * Transferências do mundo inteiro na carreira. Fontes:
 *  - previousteam (clube anterior) + teamplayerlinks (clube atual) + players.playerjointeamdate (data):
 *    o jogo acrescenta uma linha a cada transferência, então dá o histórico completo (1.743 no fim da temporada do Pisa);
 *  - persistent_events eventid 5 (transferências marcantes);
 *  - trfm (só as recentes, com valor e salário).
 * O valor só existe para as recentes; o jogo não guarda o das antigas.
 */
function worldTransfers(save: CareerSave, teamName: (id: number) => string, players: Map<number, Row>) {
  const t = save.tables;
  const intl = new Set((t.leagues ?? []).filter((l) => num(l, 'isinternationalleague')).map((l) => num(l, 'leagueid')));
  const clubs = new Set((t.leagueteamlinks ?? []).filter((l) => !intl.has(num(l, 'leagueid'))).map((l) => num(l, 'teamid')));
  const club = new Map<number, number>();
  for (const l of t.teamplayerlinks ?? []) if (clubs.has(num(l, 'teamid'))) club.set(num(l, 'playerid'), num(l, 'teamid'));
  // Só o que aconteceu na carreira (o banco inicial já traz o clube anterior de quem chegou antes).
  const careerStart = 20260701;
  const fee = new Map(save.transfers.map((x) => [`${x.playerId}-${x.toTeam}`, x]));
  const out = new Map<string, CareerSnapshot['worldTransfers'][number]>();
  const add = (x: CareerSnapshot['worldTransfers'][number]) => { const k = `${x.playerId}-${x.toId}`; if (!out.has(k) || (x.fee && !out.get(k)!.fee)) out.set(k, x); };
  for (const r of t.previousteam ?? []) {
    const pid = num(r, 'playerid'), from = num(r, 'previousteamid'), to = club.get(pid);
    const date = toYmd(fromGameDays(num(players.get(pid), 'playerjointeamdate')));
    if (to == null || to === from || date < careerStart) continue;
    const f = fee.get(`${pid}-${to}`);
    add({ date, playerId: pid, fromId: from, fromName: teamName(from), toId: to, toName: teamName(to), fee: f?.fee, wage: f?.wage });
  }
  for (const x of save.transfers) {
    if (x.date < careerStart) continue;
    add({ date: x.date, playerId: x.playerId, fromId: x.fromTeam, fromName: teamName(x.fromTeam), toId: x.toTeam, toName: teamName(x.toTeam), fee: x.fee, wage: x.wage });
  }
  for (const e of t.persistent_events ?? []) {
    if (num(e, 'eventid') !== 5 || num(e, 'player1id') <= 0) continue;
    add({ date: num(e, 'eventdate'), playerId: num(e, 'player1id'), fromId: num(e, 'team1id'), fromName: teamName(num(e, 'team1id')), toId: num(e, 'team2id'), toName: teamName(num(e, 'team2id')) });
  }
  // Times internos do jogo (ex.: "Youth Squad [DO NOT USE]", times sem nome) não são transferências de verdade.
  const real = (name: string) => !/DO NOT USE/i.test(name) && !/^Time \d+$/.test(name);
  return [...out.values()].filter((x) => real(x.fromName) && real(x.toName)).sort((a, b) => b.date - a.date);
}

function clubLoans(save: CareerSave, clubId: number, teamName: (id: number) => string, players: Map<number, Row>, today: Date): Loan[] {
  const at = new Map<number, number>();
  for (const l of save.tables.teamplayerlinks ?? []) at.set(num(l, 'playerid'), num(l, 'teamid'));
  return save.loans.flatMap((x): Loan[] => {
    const where = at.get(x.playerId);
    const dir = x.ownerId === clubId ? 'out' : where === clubId ? 'in' : null;
    if (!dir) return [];
    const p = players.get(x.playerId);
    const clubIdOther = dir === 'out' ? where ?? 0 : x.ownerId;
    return [{ dir, playerId: x.playerId, clubId: clubIdOther, clubName: teamName(clubIdOther), until: x.until, buyOption: x.buyOption,
      ovr: num(p, 'overallrating'), age: ageAt(fromGameDays(num(p, 'birthdate')), today), pos: num(p, 'preferredposition1') }];
  });
}

/** Carreira = técnico do usuário (nome + nascimento). O mesmo técnico pode trocar de clube (ex.: América → Pisa). */
function careerKeyOf(mgr: Row | undefined, clubId: number) {
  if (!mgr) return `clube-${clubId}`;
  const name = str(mgr, 'commonname') || `${str(mgr, 'firstname')} ${str(mgr, 'surname')}`.trim();
  return `${name}|${num(mgr, 'birthdate')}|${num(mgr, 'nationality')}`;
}

function readTactic(t: CareerSave['tables'], clubId: number): Tactic | null {
  const m = (t.cm_mentalities ?? []).find((r) => num(r, 'teamid') === clubId) ?? t.cm_mentalities?.[0];
  const ts = (t.cm_teamsheets ?? []).find((r) => num(r, 'teamid') === clubId) ?? t.cm_teamsheets?.[0];
  if (!m && !ts) return null;
  const formation = (t.formations ?? []).find((f) => num(f, 'formationid') === num(m, 'sourceformationid'));
  const players = Array.from({ length: 11 }, (_, i) => ({
    playerId: num(m, `playerid${i}`), pos: num(m, `position${i}`), x: num(m, `offset${i}x`), y: num(m, `offset${i}y`),
  })).filter((p) => p.playerId > 0);
  const id = (k: string) => num(ts, k);
  return {
    name: str(m, 'tactic_name') || str(ts, 'teamsheetname'), formation: str(formation, 'formationname'), code: str(m, 'code'),
    defensiveDepth: num(m, 'defensivedepth'), buildUp: num(m, 'buildupplay'), players,
    captain: id('captainid'), penalties: id('penaltytakerid'), freeKickL: id('leftfreekicktakerid'), freeKickR: id('rightfreekicktakerid'),
    cornerL: id('leftcornerkicktakerid'), cornerR: id('rightcornerkicktakerid'), longKick: id('longkicktakerid'),
    throwL: id('throwerleft'), throwR: id('throwerright'),
    cornerSupport: [...new Set(Array.from({ length: 9 }, (_, i) => id(`cksupport${i + 1}`)).filter((x) => x > 0))],
  };
}

/**
 * Agrupa os registros de estatística do fcem por competição.
 * A região guarda, competição por competição, um bloco de registros por time. A competição de cada bloco
 * do seu time sai dos times vizinhos: é aquela (entre as dos seus jogos) que tem mais desses times.
 * Blocos que não batem com nenhuma competição oficial (amistosos) ficam de fora.
 */
function competitionStats(save: CareerSave, clubId: number, matches: Match[], rowTeam: Map<number, number>): CompetitionStats[] {
  const recs = save.playerStats;
  if (!recs.length) return [];
  const key = (id: number) => (id + 1) & 0xffff;
  const clubKey = key(clubId);
  const teamOfKey = new Map<number, number>();
  const compTeams = new Map<number, Set<number>>();
  for (const f of save.fixtures) for (const row of [f.homeRow, f.awayRow]) {
    const id = rowTeam.get(row); if (id == null) continue;
    teamOfKey.set(key(id), id);
    let set = compTeams.get(f.competitionId); if (!set) compTeams.set(f.competitionId, (set = new Set()));
    set.add(key(id));
  }
  const myComps = [...new Set(matches.map((m) => m.competitionId))];
  const compName = new Map(matches.map((m) => [m.competitionId, m.competition]));

  // Sequências de registros do mesmo time.
  const runs: { team: number; from: number; to: number }[] = [];
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i]!, last = runs.at(-1);
    if (last && last.team === r.teamKey && recs[last.to]!.index === r.index - 1) last.to = i;
    else runs.push({ team: r.teamKey, from: i, to: i });
  }
  const line = (r: (typeof recs)[number]): StatLine => ({
    playerId: r.playerId, teamId: teamOfKey.get(r.teamKey) ?? (r.teamKey === clubKey ? clubId : -1),
    apps: r.apps, minutes: r.minutes, goals: r.goals, assists: r.assists, cleanSheets: r.cleanSheets, potm: r.potm, yellows: r.yellows,
    avgRating: r.apps ? r.ratingSum / r.apps / 10 : 0,
  });
  const out = new Map<number, Map<number, StatLine>>();
  const add = (comp: number, l: StatLine) => {
    let m = out.get(comp); if (!m) out.set(comp, (m = new Map()));
    const x = m.get(l.playerId);
    if (!x) { m.set(l.playerId, l); return; }
    const apps = x.apps + l.apps;
    m.set(l.playerId, { ...x, apps, minutes: x.minutes + l.minutes, goals: x.goals + l.goals, assists: x.assists + l.assists,
      cleanSheets: x.cleanSheets + l.cleanSheets, potm: x.potm + l.potm, yellows: x.yellows + l.yellows,
      avgRating: apps ? (x.avgRating * x.apps + l.avgRating * l.apps) / apps : 0 });
  };
  // Para cada bloco do seu time, a competição com mais times vizinhos. Se dois blocos caem na mesma,
  // o de maior coincidência fica com ela e o outro é uma copa que o save não lista nos jogos (ex.: Coppa Italia).
  const OTHER = -1;
  const picks: { ri: number; comp: number; score: number }[] = [];
  runs.forEach((run, ri) => {
    if (run.team !== clubKey) return;
    const near = new Set(runs.slice(Math.max(0, ri - 12), ri + 13).map((x) => x.team));
    let best: number | undefined, score = 1;
    for (const c of myComps) {
      const set = compTeams.get(c); if (!set) continue;
      let n = 0; for (const k of near) if (k !== clubKey && set.has(k)) n++;
      if (n > score) { score = n; best = c; }
    }
    if (best != null) picks.push({ ri, comp: best, score });
  });
  const winner = new Map<number, number>();
  for (const x of picks) if ((picks.find((y) => y.ri === winner.get(x.comp))?.score ?? -1) < x.score) winner.set(x.comp, x.ri);
  for (const { ri, comp } of picks) {
    const run = runs[ri]!;
    if (winner.get(comp) !== ri) { for (let i = run.from; i <= run.to; i++) if (recs[i]!.apps > 0) add(OTHER, line(recs[i]!)); continue; }
    const set = compTeams.get(comp)!;
    const isLeague = set.size > 8 && matches.filter((m) => m.competitionId === comp).length > set.size;
    // Na liga, pega o bloco inteiro (todos os times) para a artilharia; nas copas, só o seu time.
    let a = ri, b = ri;
    if (isLeague) {
      const seen = new Set([clubKey]);
      while (a > 0 && set.has(runs[a - 1]!.team) && !seen.has(runs[a - 1]!.team)) seen.add(runs[--a]!.team);
      while (b + 1 < runs.length && set.has(runs[b + 1]!.team) && !seen.has(runs[b + 1]!.team)) seen.add(runs[++b]!.team);
    }
    for (let k = a; k <= b; k++) for (let i = runs[k]!.from; i <= runs[k]!.to; i++) if (recs[i]!.apps > 0) add(comp, line(recs[i]!));
  }
  const res: CompetitionStats[] = [];
  for (const [comp, m] of out) {
    const all = [...m.values()];
    if (all.filter((x) => x.teamId === clubId).length < 5) continue; // registro solto, não é uma competição jogada
    const set = compTeams.get(comp) ?? new Set();
    const isLeague = set.size > 8 && matches.filter((x) => x.competitionId === comp).length > set.size;
    // Guarda o elenco inteiro e o top 10 de cada categoria dos outros times.
    const keep = new Set(all.filter((x) => x.teamId === clubId).map((x) => x.playerId));
    const minApps = Math.max(1, Math.ceil(Math.max(0, ...all.map((x) => x.apps)) / 3));
    const top = (f: (x: StatLine) => number, list = all) => [...list].sort((p, q) => f(q) - f(p)).slice(0, 10).forEach((x) => f(x) > 0 && keep.add(x.playerId));
    top((x) => x.goals); top((x) => x.assists); top((x) => x.cleanSheets); top((x) => x.potm);
    top((x) => x.avgRating, all.filter((x) => x.apps >= minApps));
    res.push({ competitionId: comp, competition: comp === OTHER ? 'Copas' : compName.get(comp) ?? `Competição ${comp}`, isLeague, players: all.filter((x) => keep.has(x.playerId)) });
  }
  return res.sort((p, q) => Number(q.isLeague) - Number(p.isLeague));
}

const cleanLeague = (s: string) => s.replace(/\s*\(\d+\)\s*$/, '');

/** Data atual do jogo: módulo `cldm` (calendário), inteiro aaaammdd no offset 21. */
function currentDate(save: CareerSave): number | null {
  const m = moduleBytes(save.container, 'cldm');
  if (!m || m.length < 25) return null;
  const v = u32(m, 21);
  return v > 19000101 && v < 21000101 ? v : null;
}
