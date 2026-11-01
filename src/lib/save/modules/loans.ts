import { u32 } from '../bytes';

/**
 * Empréstimos ativos no mundo inteiro, módulo `lnsm` (conferido com o CM Tracker no save do América:
 * 4 emprestados e 1 recebido, todos até 30/06/2027).
 *   cabeçalho: tag | 01 01 | data u32 | 01 | n1 u32 | n1 × 11 bytes | 01 | n u32
 *   registro (20 B): 01 | playerid u32 | clube dono u32 | 01 | fim aaaammdd u32 | ff se tem opção de compra | valor u32 | ff
 * O clube onde o jogador está fica em teamplayerlinks.
 */
export interface LoanRecord { playerId: number; ownerId: number; until: number; buyOption: number | null }

export function readLoans(b: Uint8Array): LoanRecord[] {
  if (b.length < 20 || b[10] !== 1) return [];
  const n1 = u32(b, 11);
  let o = 15 + 11 * n1;
  if (n1 > 1000 || b[o] !== 1) return [];
  const n = u32(b, o + 1);
  o += 5;
  if (o + 20 * n > b.length) return [];
  const out: LoanRecord[] = [];
  for (let i = 0; i < n; i++) {
    const q = o + 20 * i;
    if (b[q] !== 1) break;
    const until = u32(b, q + 10);
    if (until < 19000101 || until > 21000101) continue;
    out.push({ playerId: u32(b, q + 1), ownerId: u32(b, q + 5), until, buyOption: b[q + 14] === 0xff ? u32(b, q + 15) : null });
  }
  return out;
}
