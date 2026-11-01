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

/**
 * Transferências concluídas com valor, segundo bloco do `trfm` (registros de 70 bytes; o jogo mantém só as ~60 mais recentes):
 *   00 01 | data u32 | 01 | data 2 u32 | 01 | u32 | tipo u8 | ffffffff | u32 | 01 | playerid | para | de | salário | valor
 *   | 12×ff | cláusula/valor extra u32 | ffffffff | 00000000
 * Conferido no save do Pisa: o jogador já está no clube "para" (ex.: 240277 Villarreal → Milano FC, €21 mi, 01/02/2027).
 */
export function readTransferHistory(trfm: Uint8Array): TransferRecord[] {
  const out: TransferRecord[] = [];
  const date = (o: number) => { const d = u32(trfm, o); return d > 20000101 && d < 21000101 ? d : 0; };
  for (let o = 0; o + 70 <= trfm.length; o++) {
    if (trfm[o + 1] !== 1 || trfm[o + 6] !== 1 || trfm[o + 11] !== 1 || trfm[o + 25] !== 1) continue;
    const d = date(o + 2);
    if (!d || !date(o + 7)) continue;
    const playerId = u32(trfm, o + 26);
    if (playerId <= 0 || playerId >= 400000) continue;
    out.push({ date: d, type: trfm[o + 16]!, toTeam: u32(trfm, o + 30), fromTeam: u32(trfm, o + 34), playerId, wage: u32(trfm, o + 38), fee: u32(trfm, o + 42) });
    o += 69;
  }
  return out;
}
