import { u32 } from '../bytes';

/**
 * Nomes que o próprio save guarda (módulo `ytpm`): jogadores gerados pelo jogo (base, "regens")
 * e o jogador criado. Os jogadores reais não têm nome no save; esses vêm da base da EA.
 *  - pessoas: playerid u32 | 4 textos (nome, sobrenome, nome na camisa, apelido)
 *  - dicionário: nameid u32 | texto. Os `firstnameid`/`lastnameid` da tabela players apontam para cá.
 * Cada texto é: 01 | tamanho u32 | bytes UTF-8.
 */
export interface SaveNames { people: Map<number, { first: string; last: string; common: string }>; dict: Map<number, string> }

const dec = new TextDecoder();
const NAME = /^[\p{L}\p{M} .'\-]+$/u;

export function readNames(ytpm: Uint8Array, isPlayer: (id: number) => boolean): SaveNames {
  const str = (p: number): [string, number] | null => {
    if (ytpm[p] !== 1 || p + 5 > ytpm.length) return null;
    const n = u32(ytpm, p + 1);
    if (n > 60 || p + 5 + n > ytpm.length) return null;
    return [dec.decode(ytpm.subarray(p + 5, p + 5 + n)), p + 5 + n];
  };
  const people: SaveNames['people'] = new Map();
  const dict = new Map<number, string>();
  for (let i = 0; i + 9 < ytpm.length; i++) {
    const id = u32(ytpm, i);
    if (isPlayer(id) && ytpm[i + 4] === 1) {
      let p = i + 4; const parts: string[] = [];
      for (let k = 0; k < 4; k++) { const r = str(p); if (!r) break; parts.push(r[0]); p = r[1]; }
      if (parts.length === 4 && (parts[0]! + parts[1]!).length > 0 && parts.every((x) => x === '' || NAME.test(x))) {
        people.set(id, { first: parts[0]!, last: parts[1]!, common: parts[3]! });
        i = p - 1; continue;
      }
    }
    const r = str(i + 4);
    if (r && r[0].length >= 2 && id > 0 && id < 1_000_000 && NAME.test(r[0])) { dict.set(id, r[0]); i = r[1] - 1; }
  }
  return { people, dict };
}
