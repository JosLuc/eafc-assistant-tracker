import { getBits } from '../bytes';

/**
 * Estatísticas por jogador e competição no módulo fcem.
 * Uma região de registros de 64 bytes, agrupados por competição e, dentro dela, por time.
 * O registro começa em p (os 12 bytes antes dele terminam com o time: u16 em p-2 = (teamid+1) & 0xffff).
 * Campos em bits a partir de p (conferidos com o CM Tracker no save do Pisa e com o 1x1 do Newcastle):
 * id+1 (2, 19) · minutos (33, 15) · soma das notas ×10 (48, 16) · gols (72, 8) · amarelos (81, 5)
 * · jogos (93, 7) · assistências (107, 7) · melhor em campo (115, 6) · jogos sem sofrer gol (138, 6).
 */
export interface PlayerStatRecord {
  /** Posição do registro na região, para achar a competição pelos times vizinhos. */
  index: number;
  teamKey: number;
  playerId: number;
  apps: number; minutes: number; ratingSum: number;
  goals: number; assists: number; yellows: number; potm: number; cleanSheets: number;
}

const SIZE = 64;

function decode(b: Uint8Array, p: number) {
  const r = b.subarray(p, p + 52);
  const bit = (o: number, w: number) => getBits(r, o, w);
  return {
    teamKey: b[p - 2]! | (b[p - 1]! << 8),
    playerId: bit(2, 19) - 1,
    minutes: bit(33, 15), ratingSum: bit(48, 16), goals: bit(72, 8), yellows: bit(81, 5),
    apps: bit(93, 7), assists: bit(107, 7), potm: bit(115, 6), cleanSheets: bit(138, 6),
  };
}

export function readPlayerStats(fcem: Uint8Array, playerIds: Set<number>): PlayerStatRecord[] {
  const ok = (p: number) => p >= 12 && p + 52 <= fcem.length && playerIds.has(getBits(fcem.subarray(p, p + 3), 2, 19) - 1);
  // A região começa no primeiro ponto com vários registros válidos seguidos.
  let start = -1;
  for (let p = 12; p + SIZE * 8 < fcem.length; p++) {
    let k = 0;
    while (k < 8 && ok(p + k * SIZE)) k++;
    if (k === 8) { start = p; break; }
  }
  if (start < 0) return [];
  const out: PlayerStatRecord[] = [];
  for (let p = start, i = 0; ok(p); p += SIZE, i++) {
    const d = decode(fcem, p);
    if (d.apps > 80 || d.minutes > d.apps * 130 + 1 || d.ratingSum > d.apps * 100) continue;
    out.push({ index: i, ...d });
  }
  return out;
}
