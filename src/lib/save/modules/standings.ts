import { u16, u32 } from '../bytes';

/**
 * Classificações guardadas no módulo `fcem` (motor de competições).
 * Cada linha tem 23 bytes: ff 01 | índice u16 | competição/fase u16 | teamid u32 (real) | 13 bytes:
 *   [slot, casaV, casaE, casaD, casaGP, casaGC, foraV, foraE, foraD, foraGP, foraGC, pontos, 0]
 * Calibrado com o save "depois do jogo 1" (Newcastle 1x2 Juventus) e com uma temporada completa
 * (Championship 24 times / 46 jogos, fase de liga da Champions 36 times / 8 jogos).
 */
export interface StandingRow {
  stageId: number; slot: number; teamId: number;
  home: Record_; away: Record_; points: number;
  played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number;
}
type Record_ = { w: number; d: number; l: number; gf: number; ga: number };

export function readStandings(fcem: Uint8Array, validTeam: (id: number) => boolean): Map<number, StandingRow[]> {
  const out = new Map<number, StandingRow[]>();
  for (let i = fcem.indexOf(0xff); i !== -1 && i + 23 <= fcem.length; i = fcem.indexOf(0xff, i + 1)) {
    if (fcem[i + 1] !== 0x01) continue;
    const stageId = u16(fcem, i + 4);
    const teamId = u32(fcem, i + 6);
    const s = fcem.subarray(i + 10, i + 23);
    if (!stageId || !validTeam(teamId) || s[12] !== 0) continue;
    const home = rec(s, 1), away = rec(s, 6);
    const row: StandingRow = {
      stageId, slot: s[0]!, teamId, home, away, points: s[11]!,
      won: home.w + away.w, drawn: home.d + away.d, lost: home.l + away.l,
      goalsFor: home.gf + away.gf, goalsAgainst: home.ga + away.ga, played: 0,
    };
    row.played = row.won + row.drawn + row.lost;
    if (row.points !== row.won * 3 + row.drawn && row.points > row.won * 3 + row.drawn) continue; // descarta falsos positivos
    (out.get(stageId) ?? out.set(stageId, []).get(stageId)!).push(row);
    i += 22;
  }
  for (const rows of out.values()) rows.sort(compareRows);
  return out;
}

const rec = (s: Uint8Array, o: number): Record_ => ({ w: s[o]!, d: s[o + 1]!, l: s[o + 2]!, gf: s[o + 3]!, ga: s[o + 4]! });

export const compareRows = (a: StandingRow, b: StandingRow) =>
  b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor;
