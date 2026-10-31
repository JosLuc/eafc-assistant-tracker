import { u32 } from '../bytes';

/**
 * Condição física e lesões do elenco do usuário, módulo `fitm` ("mtif").
 * Cabeçalho de 16 bytes (contagem em 12), depois registros de 20 bytes:
 *   01 | playerid u32 (real) | ffffffff | condição u8 | lesionado u8 | tipo u8 | gravidade u8
 *   | data de volta u32 (aaaammdd; 20080101 = sem lesão) | 3 bytes
 */
export interface Fitness { playerId: number; condition: number; injured: boolean; injuryType: number; injurySeverity: number; returnDate: number | null }

export function readFitness(fitm: Uint8Array): Fitness[] {
  if (String.fromCharCode(...fitm.subarray(0, 4)) !== 'mtif' || fitm.length < 16) return [];
  const n = u32(fitm, 12);
  const out: Fitness[] = [];
  for (let k = 0, p = 16; k < n && p + 20 <= fitm.length; k++, p += 20) {
    if (fitm[p] !== 1) break;
    const injured = fitm[p + 10] === 1;
    const ret = u32(fitm, p + 13);
    out.push({
      playerId: u32(fitm, p + 1), condition: fitm[p + 9]!, injured,
      injuryType: fitm[p + 11]!, injurySeverity: fitm[p + 12]!, returnDate: injured && ret > 20080101 ? ret : null,
    });
  }
  return out;
}
