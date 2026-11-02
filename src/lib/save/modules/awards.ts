import { u32 } from '../bytes';

/**
 * Corrida dos prêmios (módulo `awrm`): os times candidatos das grandes ligas, com o elenco de cada um.
 * Conferido com o card "Awards race" do CM Tracker (Arsenal #1, Man City #2, Man United #3, Aston Villa #4, PSG #1, Lens #2).
 *   01 01 | teamid u32 | leagueid u32 | u32 | jogador destaque u32 | ffffffff | posição (bits 1,2,32,64 = 1º..4º) | 01 | n u32
 *   n × (01 | playerid u32 | posição u32 | 00 | 01 | nascimento aaaammdd u32)
 */
export interface AwardContender { teamId: number; leagueId: number; rank: number; star: number; players: number[] }

const RANK: Record<number, number> = { 1: 1, 2: 2, 32: 3, 64: 4 };

export function readAwardsRace(b: Uint8Array): AwardContender[] {
  const out: AwardContender[] = [];
  let o = 11;
  while (o + 28 <= b.length && b[o] === 1 && b[o + 1] === 1) {
    const n = u32(b, o + 24);
    if (n > 80 || o + 28 + 15 * n > b.length) break;
    out.push({
      teamId: u32(b, o + 2), leagueId: u32(b, o + 6), star: u32(b, o + 14), rank: RANK[b[o + 22]!] ?? 0,
      players: Array.from({ length: n }, (_, i) => u32(b, o + 28 + 15 * i + 1)),
    });
    o += 28 + 15 * n;
  }
  return out;
}
