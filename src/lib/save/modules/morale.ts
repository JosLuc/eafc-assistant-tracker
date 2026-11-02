import { u32 } from '../bytes';

/**
 * Moral do elenco (módulo `pllm`): 01 01 | time u32 | ... | quantidade u32 (offset 16) | n registros de 67 bytes:
 *   01 | playerid u32 | nível u32 | 65 u32 | 8×ff | 7f u32 | desempenho do time i32 | desempenho do jogador i32
 *   | ? i32 | ? i32 | contrato i32 | moral i32 | f32 | tempo de jogo i32 | f32 | 00 01 | n eventos u32
 * Depois de jogos oficiais, cada registro ganha n eventos de moral (ex.: "CM_Morale_Update_GoodPerformance"):
 *   01 | f32 | f32 | 00 01 01 | tamanho u32 | texto | 01 | u32
 * Conferido com o CM Tracker (América no início: média 72; time 83, jogador 55, contrato 79, tempo de jogo 71).
 */
export interface PlayerMorale { playerId: number; morale: number; teamPerformance: number; playerPerformance: number; contract: number; playingTime: number }

export function readMorale(pllm: Uint8Array): { teamId: number; players: PlayerMorale[] } | null {
  if (pllm.length < 20) return null;
  const dv = new DataView(pllm.buffer, pllm.byteOffset, pllm.byteLength);
  const teamId = u32(pllm, 6), n = u32(pllm, 16);
  const players: PlayerMorale[] = [];
  for (let k = 0, p = 20; k < n && p + 67 <= pllm.length; k++) {
    if (pllm[p] !== 1) break;
    const i = (o: number) => dv.getInt32(p + o, true);
    const m: PlayerMorale = { playerId: u32(pllm, p + 1), teamPerformance: i(25), playerPerformance: i(29), contract: i(41), morale: i(45), playingTime: i(53) };
    // Depois de um bom jogo a moral passa de 100 no save (ex.: 120); a tela do jogo vai até 100.
    if ([m.morale, m.teamPerformance, m.playerPerformance, m.contract, m.playingTime].some((x) => x < 0 || x > 200)) break;
    for (const k of ['morale', 'teamPerformance', 'playerPerformance', 'contract', 'playingTime'] as const) m[k] = Math.min(100, m[k]);
    players.push(m);
    // pula os eventos de moral que vêm depois do registro
    const events = u32(pllm, p + 63);
    p += 67;
    for (let e = 0; e < events && events < 100; e++) {
      if (pllm[p] !== 1) return { teamId, players };
      p += 21 + u32(pllm, p + 12);
    }
  }
  return { teamId, players };
}
