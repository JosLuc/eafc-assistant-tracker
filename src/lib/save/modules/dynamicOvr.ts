import { u32 } from '../bytes';

/**
 * OVR dinâmico do FC 27, módulo `dovm`. Para cada jogador do seu elenco (depois vêm outros, ex.: do próximo adversário):
 *   playerid u32 | 01 forma i8 | 01 cansaço i8 | 3 listas: 01 | n u32 | n × (01 | atributo u32 | variação i8)
 * Lista 1 = variação dos atributos pela forma; lista 2 = bônus de pré-temporada/treino; lista 3 = queda pelo cansaço.
 * Conferido no Newcastle: Wissa +4 de forma antes do jogo da Premier e −3 de cansaço depois dele (OVR 83);
 * no save logo após o jogo 1 quase todos aparecem com cansaço negativo, e voltam a 0 dias depois.
 */
export interface DynamicOvr { playerId: number; form: number; fatigue: number; formAttrs: Record<number, number>; boostAttrs: Record<number, number>; fatigueAttrs: Record<number, number> }

const s8 = (x: number) => (x > 127 ? x - 256 : x);

export function readDynamicOvr(b: Uint8Array): DynamicOvr[] {
  const out: DynamicOvr[] = [];
  const n = u32(b, 12);
  let o = 16;
  for (let k = 0; k < n && n < 200; k++) {
    if (o + 23 > b.length) break;
    const playerId = u32(b, o), form = s8(b[o + 5]!), fatigue = s8(b[o + 7]!);
    let q = o + 8;
    const lists: Record<number, number>[] = [];
    for (let l = 0; l < 3; l++) {
      if (b[q] !== 1) return out;
      const m = u32(b, q + 1);
      q += 5;
      const e: Record<number, number> = {};
      for (let j = 0; j < m && j < 64; j++) { if (b[q] !== 1) return out; e[u32(b, q + 1)] = s8(b[q + 5]!); q += 6; }
      lists.push(e);
    }
    out.push({ playerId, form, fatigue, formAttrs: lists[0]!, boostAttrs: lists[1]!, fatigueAttrs: lists[2]! });
    o = q;
  }
  return out;
}
