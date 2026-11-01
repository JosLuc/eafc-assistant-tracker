import { u32 } from '../bytes';

/**
 * Comissão técnica (módulo `coam`). Cada treinador:
 *   01 | id u32 | 01 | tam u32 | nome | 01 | tam u32 | sobrenome | nascimento aaaammdd u32 | provável salário u32
 *   | provável custo u32 (= 6× salário) | nacionalidade u32 | flag | 01 | estado u32 (2 = com grupo de treino) | 01 01 | função u8 | 01 | nível u32
 *   | 00 01 | 4 notas u32 (1–5, provável: atributos de treino)
 * Primeiro vêm os treinadores contratados, depois o mercado de treinadores (00 01 | n | n registros).
 * No fim: 0c u32 | 01 | ids dos 4 treinadores do clube.
 * Função e notas ainda sem conferência com a tela do jogo.
 */
export interface Coach {
  id: number; firstName: string; lastName: string; birthDate: number; nationality: number;
  wage: number; cost: number; role: number; level: number; ratings: number[]; hired: boolean;
}

const dec = new TextDecoder();
const name = (b: Uint8Array, o: number, n: number) => dec.decode(b.subarray(o, o + n));
const printable = (b: Uint8Array, o: number, n: number) => { for (let i = o; i < o + n; i++) if (b[i]! < 32) return false; return true; };

export function readCoaches(b: Uint8Array): Coach[] {
  const out: Coach[] = [];
  let end = 0;
  for (let i = 4; i < b.length - 64; i++) {
    if (b[i] !== 1 || b[i + 5] !== 1) continue;
    const l1 = u32(b, i + 6);
    if (l1 < 2 || l1 > 24 || !printable(b, i + 10, l1)) continue;
    const j = i + 10 + l1;
    if (b[j] !== 1) continue;
    const l2 = u32(b, j + 1);
    if (l2 < 1 || l2 > 30 || !printable(b, j + 5, l2)) continue;
    const k = j + 5 + l2;
    const birthDate = u32(b, k);
    if (birthDate < 19300101 || birthDate > 20201231) continue;
    const r = k + 16;
    // estado 2 = treinador com grupo de treino atribuído: antes das notas vem 01 | grupo u8 | 01 01 | f32 | 01
    const state = u32(b, r + 2), base = state === 2 && b[r + 16] === 1 ? r + 25 : r + 16;
    const simple = b[r + 14] === 0 && b[r + 15] === 1 && state <= 2;
    out.push({
      id: u32(b, i + 1), firstName: name(b, i + 10, l1), lastName: name(b, j + 5, l2), birthDate,
      wage: u32(b, k + 4), cost: u32(b, k + 8), nationality: u32(b, k + 12),
      role: b[r + 8]!, level: u32(b, r + 10),
      ratings: simple ? [0, 1, 2, 3].map((x) => u32(b, base + 4 * x)) : [], hired: false,
    });
    end = k + 16; i = k + 15;
  }
  // ids dos treinadores do clube no fim do módulo
  for (let p = end; p < b.length - 21; p++) {
    if (u32(b, p) === 12 && b[p + 4] === 1) {
      const ids = new Set([0, 1, 2, 3].map((x) => u32(b, p + 5 + 4 * x)));
      if ([...ids].every((id) => out.some((c) => c.id === id))) { for (const c of out) c.hired = ids.has(c.id); break; }
    }
  }
  return out;
}
