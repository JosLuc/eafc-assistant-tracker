import { u32 } from '../bytes';

/**
 * Escalações das últimas partidas no módulo `hstm` (magic "mtsh").
 * Formato: "mtsh" 01 01 | nTimes u32 | por time: teamid u32 (real), 01, nJogadores u32,
 *   e para cada jogador 9 bytes: 01 01 + 7 bytes. Nos 7 bytes: playerid nos 19 bits baixos
 *   (gravado como real+1, igual ao banco principal) e minutos+1 no 4º byte.
 * Os demais bits (posição, nota, flags de reserva) ainda estão em análise.
 */
export interface LineupEntry { playerId: number; minutes: number; raw: number[] }
export interface TeamLineup { teamId: number; players: LineupEntry[] }

export function readLineups(hstm: Uint8Array): TeamLineup[] {
  if (String.fromCharCode(...hstm.subarray(0, 4)) !== 'mtsh') return [];
  const teams: TeamLineup[] = [];
  const nTeams = u32(hstm, 6);
  let p = 10;
  for (let t = 0; t < nTeams && p + 9 <= hstm.length; t++) {
    const teamId = u32(hstm, p);
    const n = u32(hstm, p + 5);
    p += 9;
    const players: LineupEntry[] = [];
    for (let k = 0; k < n && p + 9 <= hstm.length; k++, p += 9) {
      const e = hstm.subarray(p + 2, p + 9);
      const v = e[0]! | (e[1]! << 8) | (e[2]! << 16);
      players.push({ playerId: (v & 0x7ffff) - 1, minutes: e[3]! - 1, raw: [...e] });
    }
    teams.push({ teamId, players });
  }
  return teams;
}
