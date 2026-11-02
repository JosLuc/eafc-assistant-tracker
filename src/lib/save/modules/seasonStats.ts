import { u32 } from '../bytes';

/**
 * Estatísticas da temporada passada de cada jogador, por competição (módulo `stvm`).
 * 01 01 01 | n u32 | n jogadores:
 *   01 | playerid u32 | 01 | m u32 | m × (01 | 8 bytes de bits) | t u8 | t × clube u32
 * Bits de cada competição (LSB primeiro): competição (0,11) | gols (12,6) | assistências (21,5)
 *   | jogos sem sofrer gol (29,5, só goleiros) | amarelos (35,4) | vermelhos (41,2) | jogos (54,6) | ? (62,1)
 * Conferido com jogadores conhecidos: Haaland 27 gols em 35 jogos na Premier League (818), 8 na Champions (135);
 * Kane 36 gols na Bundesliga (1016); Raya 15 jogos sem sofrer gol.
 * Os clubes são os da temporada (2 quando o jogador trocou de clube). Quase não muda durante a temporada:
 * provável que seja atualizado na virada da temporada.
 */
export interface SeasonCompStats { competitionId: number; goals: number; assists: number; cleanSheets: number; yellows: number; reds: number; apps: number }
export interface SeasonHistory { playerId: number; comps: SeasonCompStats[]; clubs: number[] }

const bits = (lo: number, hi: number, at: number, w: number) => {
  const v = at >= 32 ? hi >>> (at - 32) : at + w <= 32 ? lo >>> at : (lo >>> at) | (hi << (32 - at));
  return v & ((1 << w) - 1);
};

export function readSeasonStats(b: Uint8Array): SeasonHistory[] {
  const out: SeasonHistory[] = [];
  if (b.length < 11) return out;
  const n = u32(b, 7);
  let o = 11;
  for (let k = 0; k < n; k++) {
    if (o + 10 > b.length || b[o] !== 1 || b[o + 5] !== 1) break;
    const playerId = u32(b, o + 1), m = u32(b, o + 6);
    if (m > 40) break;
    o += 10;
    const comps: SeasonCompStats[] = [];
    for (let j = 0; j < m; j++) {
      if (b[o] !== 1) return out;
      const lo = u32(b, o + 1), hi = u32(b, o + 5);
      comps.push({
        competitionId: bits(lo, hi, 0, 11), goals: bits(lo, hi, 12, 6), assists: bits(lo, hi, 21, 5), cleanSheets: bits(lo, hi, 29, 5),
        yellows: bits(lo, hi, 35, 4), reds: bits(lo, hi, 41, 2), apps: bits(lo, hi, 54, 6),
      });
      o += 9;
    }
    const t = b[o]!;
    const clubs: number[] = [];
    for (let j = 0; j < t; j++) clubs.push(u32(b, o + 1 + 4 * j));
    o += 1 + 4 * t;
    out.push({ playerId, comps, clubs });
  }
  return out;
}
