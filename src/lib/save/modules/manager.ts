import { u16, u32 } from '../bytes';

/**
 * Histórico do técnico (módulo `mhrm`). Conferido com o CM Tracker (América: 44 J, 21-7-16, 72-63, 70 pts, 9º;
 * salário $1K, ganhos na carreira $720K, segurança no cargo 28) e com os amistosos do Newcastle.
 *  - cabeçalho em 120: 01 | clube u32 | ffffffff | 01 | data de chegada u32 | 01 | início da carreira u32
 *    | 4 × u32 | salário u32 | ganhos na carreira u32
 *  - temporadas: 01 | clube u32 | 01 | ? | liga u16 | objetivo u8 | u32 | J W E u8 | GP GC Pts u16 | D u8 | posição u8
 *    | gastos u32 | 16 bytes | segurança no cargo u32
 *  - jogos: 01 | data u32 | n | n × (gols u8, playerid u24) | gols casa | gols fora | ffff | u8 | ffff | índice u8 | 01
 *    | tipo u8 (5 casa, 6 fora; +0x80 amistoso) | u16 | adversário (teamid+1, 16 bits baixos) u16 | 3 bytes
 *    Os autores de gol listados são só do time do usuário.
 */
export interface ManagerSeason {
  teamId: number; leagueId: number; objective: number; played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; points: number; position: number; spent: number; jobSecurity: number;
}
export interface ManagerMatch { date: number; home: boolean; friendly: boolean; homeGoals: number; awayGoals: number; opponentKey: number; scorers: { playerId: number; goals: number }[] }
/** Objetivos da diretoria da temporada atual: 01 | clube u32 | 01 00 | liga u16 | liga u8 | continental u8 | copa u8 (ff = sem objetivo). */
export interface BoardObjectives { leagueId: number; league: number | null; continental: number | null; cup: number | null }
export interface ManagerHistory { clubId: number; joined: number; careerStart: number; wage: number; earnings: number; seasons: ManagerSeason[]; matches: ManagerMatch[]; objectives?: BoardObjectives }

export function readManagerHistory(m: Uint8Array, isTeam: (id: number) => boolean): ManagerHistory | null {
  const h = 120;
  if (m.length < h + 60 || m[h] !== 1 || u32(m, h + 5) !== 0xffffffff) return null;
  const out: ManagerHistory = {
    clubId: u32(m, h + 1), joined: u32(m, h + 10), careerStart: u32(m, h + 15),
    wage: u32(m, h + 35), earnings: u32(m, h + 39), seasons: [], matches: [],
  };
  for (let i = h + 40; i + 45 < m.length; i++) {
    if (m[i] !== 1 || m[i + 5] !== 1 || !isTeam(u32(m, i + 1))) continue;
    const o = i + 6;
    const s: ManagerSeason = {
      teamId: u32(m, i + 1), leagueId: u16(m, o + 1), objective: m[o + 3]!,
      played: m[o + 8]!, won: m[o + 9]!, drawn: m[o + 10]!, goalsFor: u16(m, o + 11), goalsAgainst: u16(m, o + 13),
      points: u16(m, o + 15), lost: m[o + 17]!, position: m[o + 18]!, spent: u32(m, o + 19), jobSecurity: u32(m, o + 39),
    };
    if (s.won + s.drawn + s.lost !== s.played || s.points !== s.won * 3 + s.drawn || s.jobSecurity > 100) continue;
    out.seasons.push(s); i = o + 42;
  }
  for (let i = h + 40; i + 20 < m.length; i++) {
    if (m[i] !== 1) continue;
    const date = u32(m, i + 1);
    if (date < 20000101 || date > 21001231 || date % 100 > 31 || Math.floor(date / 100) % 100 > 12) continue;
    let p = i + 5; const n = m[p++]!;
    if (n > 15 || p + 4 * n + 18 > m.length) continue;
    const scorers: ManagerMatch['scorers'] = []; let goals = 0;
    for (let k = 0; k < n; k++, p += 4) { scorers.push({ goals: m[p]!, playerId: m[p + 1]! | (m[p + 2]! << 8) | (m[p + 3]! << 16) }); goals += m[p]!; }
    const hg = m[p]!, ag = m[p + 1]!;
    if (m[p + 2] !== 0xff || m[p + 3] !== 0xff || m[p + 5] !== 0xff || m[p + 6] !== 0xff || m[p + 8] !== 1) continue;
    const kind = m[p + 9]!; const home = (kind & 3) === 1;
    if ((kind & 0x7f) !== 5 && (kind & 0x7f) !== 6) continue;
    if (goals !== (home ? hg : ag)) continue;
    out.matches.push({ date, home, friendly: (kind & 0x80) !== 0, homeGoals: hg, awayGoals: ag, opponentKey: u16(m, p + 12), scorers });
    i = p + 16;
  }
  out.matches.sort((a, b) => a.date - b.date);
  // Conferido com o print do jogo (Newcastle: liga 2 = zona da Champions, copa 7 = vencer a copa) e com América/Pisa.
  const league = out.seasons.filter((x) => x.teamId === out.clubId).at(-1)?.leagueId;
  for (let k = h + 40; league != null && k + 14 < m.length; k++) {
    if (m[k - 1] !== 1 || u32(m, k) !== out.clubId || m[k + 4] !== 1 || m[k + 5] !== 0 || u16(m, k + 6) !== league) continue;
    const v = (x: number) => (x === 0xff ? null : x);
    out.objectives = { leagueId: league, league: v(m[k + 8]!), continental: v(m[k + 9]!), cup: v(m[k + 10]!) };
    break;
  }
  return out;
}
