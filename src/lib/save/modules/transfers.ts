import { u32 } from '../bytes';

/**
 * Transferências concluídas recentes, módulo `trfm`. Registro:
 *   01 | data u32 | 01 | tipo u32 | 01 | destino u32 | origem u32 | playerid u32 | salário u32 | valor u32 | ? u32 | valor u32
 * Conferido: Barcelona → Newcastle, jogador 74463, salário 30.500, €37,5 mi, em 08/08/2026.
 */
export interface TransferRecord { date: number; type: number; toTeam: number; fromTeam: number; playerId: number; wage: number; fee: number }

export function readTransfers(trfm: Uint8Array): TransferRecord[] {
  const out: TransferRecord[] = [];
  for (let i = 0; i + 43 <= trfm.length; i++) {
    if (trfm[i] !== 1 || trfm[i + 5] !== 1 || trfm[i + 10] !== 1) continue;
    const date = u32(trfm, i + 1);
    if (date < 20000101 || date > 21000101) continue;
    const type = u32(trfm, i + 6);
    const playerId = u32(trfm, i + 19);
    const fee = u32(trfm, i + 27);
    if (type > 20 || playerId <= 0 || playerId >= 400000 || fee !== u32(trfm, i + 35)) continue;
    out.push({ date, type, toTeam: u32(trfm, i + 11), fromTeam: u32(trfm, i + 15), playerId, wage: u32(trfm, i + 23), fee });
    i += 38;
  }
  return out;
}
