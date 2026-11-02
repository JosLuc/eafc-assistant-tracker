import { u32 } from '../bytes';

/**
 * Orçamentos de todos os clubes da IA, módulo `budm` (o do seu clube fica no tfnm).
 *   01 01 | n u32 | n × 39 bytes: teamid u32 | 01 | verba inicial u64 | verba atual u64 | % a u8 | % b u8 | 8 bytes
 *   | orçamento salarial u32 | gasto extra u32
 * Ex.: Arsenal no save do Pisa: €265 mi no início da temporada, €164 mi no fim (gastou ~€100 mi).
 */
export interface ClubBudget { teamId: number; initial: number; current: number; wageBudget: number; pctA: number; pctB: number; extra: number }

const u64 = (b: Uint8Array, o: number) => u32(b, o) + u32(b, o + 4) * 2 ** 32;

export function readBudgets(b: Uint8Array): ClubBudget[] {
  const n = u32(b, 6);
  const out: ClubBudget[] = [];
  for (let k = 0, o = 10; k < n && o + 39 <= b.length; k++, o += 39) {
    if (b[o + 4] !== 1) break;
    out.push({ teamId: u32(b, o), initial: u64(b, o + 5), current: u64(b, o + 13), pctA: b[o + 21]!, pctB: b[o + 22]!, wageBudget: u32(b, o + 31), extra: u32(b, o + 35) });
  }
  return out;
}
