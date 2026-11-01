import { u32 } from '../bytes';

/**
 * Finanças do clube do usuário (módulo `tfnm`). Conferido com a tela de orçamento do jogo (save "contratacao"):
 *  - u64 em 0x0f: compra de atletas; u64 em 0x27: aumentos salariais (gastos da temporada)
 *  - bloco 01 01 01 em 0x7b7: u64 0x7c2 = verba inicial de transferências; u32 0x7db = orçamento atual
 */
export interface Finances {
  initialBudget: number; currentBudget: number; spentOnPlayers: number; wageRaises: number;
  /** Últimas movimentações (o jogo guarda ~20 num buffer circular). */
  transactions?: { date: number; amount: number; type: number }[];
}

const u64 = (b: Uint8Array, o: number) => u32(b, o) + u32(b, o + 4) * 2 ** 32;

export function readFinances(tfnm: Uint8Array): Finances | null {
  if (tfnm.length < 0x7e0 || tfnm[0x7b7] !== 1 || tfnm[0x7b8] !== 1 || tfnm[0x7b9] !== 1) return null;
  const initialBudget = u64(tfnm, 0x7c2);
  const currentBudget = u32(tfnm, 0x7db);
  if (!initialBudget || initialBudget > 1e13) return null;
  return { initialBudget, currentBudget, spentOnPlayers: u64(tfnm, 0x0f), wageRaises: u64(tfnm, 0x27), transactions: readTransactions(tfnm) };
}

/**
 * Movimentações: registros de 17 bytes (flag u8 | índice u32 | valor u32 | tipo u32 | data aaaammdd u32), índices 0, 1, 2…
 * Tipos conferidos com o CM Tracker (Pisa): 13 merchandising, 16 salários dos jogadores, 18 salários da comissão.
 */
function readTransactions(b: Uint8Array) {
  const ok = (o: number, k: number) => o + 17 <= b.length && u32(b, o + 1) === k && u32(b, o + 13) > 19000101 && u32(b, o + 13) < 21000101;
  for (let s = 0; s < Math.min(800, b.length); s++) {
    let n = 0;
    while (ok(s + 17 * n, n)) n++;
    if (n >= 2 || (n === 1 && u32(b, s + 5) > 0)) {
      return Array.from({ length: n }, (_, k) => ({ amount: u32(b, s + 17 * k + 5), type: u32(b, s + 17 * k + 9), date: u32(b, s + 17 * k + 13) }))
        .sort((x, y) => y.date - x.date);
    }
  }
  return [];
}
