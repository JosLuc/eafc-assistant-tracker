import { u16, u32 } from '../bytes';

/**
 * Cartões acumulados e suspensões, módulo `susm` ("mvsus"). Contagem u32 no offset 7, registros de 16 bytes:
 *   01 | competição u16 | playerid u24 (real) | 00 | teamid u32 | amarelos u32 | jogos de suspensão u8
 */
export interface CardRecord { competitionId: number; playerId: number; teamId: number; yellows: number; banGames: number }

export function readCards(susm: Uint8Array): CardRecord[] {
  if (String.fromCharCode(...susm.subarray(0, 4)) !== 'msus' || susm.length < 11) return [];
  const n = u32(susm, 7);
  const out: CardRecord[] = [];
  for (let k = 0, p = 11; k < n && p + 16 <= susm.length; k++, p += 16) {
    if (susm[p] !== 1) break;
    out.push({
      competitionId: u16(susm, p + 1),
      playerId: susm[p + 3]! | (susm[p + 4]! << 8) | (susm[p + 5]! << 16),
      teamId: u32(susm, p + 7), yellows: u32(susm, p + 11), banGames: susm[p + 15]!,
    });
  }
  return out;
}
