import { u32 } from '../bytes';

/**
 * Papéis no elenco (módulo `pstm`): 01 | time u32 | quantidade u32 | 01 u32 | n × (01 | playerid u32 | papel u8 | 00 00).
 * Papéis: 1 Crucial, 2 Importante, 3 Rodízio, 4 Esporádico, 5 Promessa.
 * Conferido com o CM Tracker (Pisa: 4 cruciais, 13 importantes, 4 rodízio, 5 esporádicos).
 */
export interface SquadRoles { teamId: number; roles: Map<number, number> }

export function readRoles(pstm: Uint8Array): SquadRoles | null {
  if (pstm.length < 19) return null;
  const teamId = u32(pstm, 6), n = u32(pstm, 10);
  const roles = new Map<number, number>();
  let p = 19; // depois do cabeçalho vem 01 + u32 (capacidade)
  for (let k = 0; k < n && p + 8 <= pstm.length; k++, p += 8) {
    if (pstm[p] !== 1) break;
    const id = u32(pstm, p + 1), role = pstm[p + 5]!;
    if (id !== 0xffffffff && role >= 1 && role <= 5) roles.set(id, role);
  }
  return { teamId, roles };
}
