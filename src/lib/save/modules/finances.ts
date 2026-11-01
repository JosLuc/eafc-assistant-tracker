import { u32 } from '../bytes';

/**
 * Finanças do clube do usuário (módulo `tfnm`). Conferido com a tela de orçamento do jogo (save "contratacao"):
 *  - u64 em 0x0f: compra de atletas; u64 em 0x27: aumentos salariais (gastos da temporada)
 *  - bloco 01 01 01 em 0x7b7: u64 0x7c2 = verba inicial de transferências; u32 0x7db = orçamento atual
 */
export interface Finances { initialBudget: number; currentBudget: number; spentOnPlayers: number; wageRaises: number }

const u64 = (b: Uint8Array, o: number) => u32(b, o) + u32(b, o + 4) * 2 ** 32;

export function readFinances(tfnm: Uint8Array): Finances | null {
  if (tfnm.length < 0x7e0 || tfnm[0x7b7] !== 1 || tfnm[0x7b8] !== 1 || tfnm[0x7b9] !== 1) return null;
  const initialBudget = u64(tfnm, 0x7c2);
  const currentBudget = u32(tfnm, 0x7db);
  if (!initialBudget || initialBudget > 1e13) return null;
  return { initialBudget, currentBudget, spentOnPlayers: u64(tfnm, 0x0f), wageRaises: u64(tfnm, 0x27) };
}
