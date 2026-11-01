import { u32 } from '../bytes';

/**
 * Moral do elenco (módulo `pllm`): 01 01 | time u32 | ... | quantidade u32 (offset 16) | n registros de 67 bytes:
 *   01 | playerid u32 | nível u32 | 65 u32 | 8×ff | 7f u32 | desempenho do time i32 | desempenho do jogador i32
 *   | ? i32 | ? i32 | contrato i32 | moral i32 | f32 | tempo de jogo i32 | f32 | 6 bytes
 * Conferido com o CM Tracker (América no início: média 72; time 83, jogador 55, contrato 79, tempo de jogo 71).
 */
export interface PlayerMorale { playerId: number; morale: number; teamPerformance: number; playerPerformance: number; contract: number; playingTime: number }

export function readMorale(pllm: Uint8Array): { teamId: number; players: PlayerMorale[] } | null {
  if (pllm.length < 20) return null;
  const dv = new DataView(pllm.buffer, pllm.byteOffset, pllm.byteLength);
  const teamId = u32(pllm, 6), n = u32(pllm, 16);
  const players: PlayerMorale[] = [];
  for (let k = 0, p = 20; k < n && p + 67 <= pllm.length; k++, p += 67) {
    if (pllm[p] !== 1) break;
    const i = (o: number) => dv.getInt32(p + o, true);
    const m: PlayerMorale = { playerId: u32(pllm, p + 1), teamPerformance: i(25), playerPerformance: i(29), contract: i(41), morale: i(45), playingTime: i(53) };
    if ([m.morale, m.teamPerformance, m.playerPerformance, m.contract, m.playingTime].some((x) => x < 0 || x > 100)) break;
    players.push(m);
  }
  return { teamId, players };
}
