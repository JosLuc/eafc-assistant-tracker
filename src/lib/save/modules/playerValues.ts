import { u32 } from '../bytes';

/**
 * Valor de mercado dos jogadores do seu clube, módulo `pvlm`: 01 01 01 | n u32 | n × (playerid u32 | valor u32).
 * Depois vêm os coeficientes (double) da fórmula de valor do jogo.
 * Ex.: Newcastle, 255069 = €43 mi; Pisa, 264480 = €2,9 mi.
 */
export function readPlayerValues(b: Uint8Array): Map<number, number> {
  const out = new Map<number, number>();
  const n = u32(b, 7);
  if (n > 200) return out;
  for (let k = 0, o = 11; k < n && o + 8 <= b.length; k++, o += 8) out.set(u32(b, o), u32(b, o + 4));
  return out;
}

/**
 * Forma dos jogadores do seu clube, módulo `plfm`. Para cada jogador:
 *   01 | playerid u32 | forma u32 (0–100) | tendência u8 | 01 | 10 notas recentes f32 (a mais nova por último) | …
 * Conferido no jogo do 1x1 com o Liverpool: Wissa (gol) com forma 61 e tendência 5; Pope 67.
 */
export interface PlayerForm { playerId: number; form: number; trend: number; ratings: number[] }

export function readPlayerForm(b: Uint8Array, squad: Set<number>): PlayerForm[] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out: PlayerForm[] = [];
  for (let o = 0; o + 51 <= b.length; o++) {
    if (b[o] !== 1 || b[o + 10] !== 1 || !squad.has(u32(b, o + 1))) continue;
    const form = u32(b, o + 5);
    if (form > 100) continue;
    const ratings = Array.from({ length: 10 }, (_, i) => Math.round(dv.getFloat32(o + 11 + 4 * i, true) * 10) / 10);
    if (ratings.some((r) => !(r >= 0 && r <= 10))) continue;
    out.push({ playerId: u32(b, o + 1), form, trend: b[o + 9]!, ratings });
    o += 50;
  }
  return out;
}
