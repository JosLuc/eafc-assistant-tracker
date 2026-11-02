/**
 * Registro de competições do fcem (equivalente ao compobj do jogo).
 * Cada competição aparece como: ff 01 | id u16 | id u16 | nível u8 (3 = competição) | pai u16 | "C<asset>" | "TrophyName_Abbr15_<asset>".
 * O asset é o id do troféu: para ligas é igual ao leagueid do banco (818 → 13 Premier League);
 * para copas é um id próprio (627 → 202, a Carabao Cup). O pai é a federação/país.
 */
export interface Competition { id: number; parent: number; asset: number }

export function readCompetitions(b: Uint8Array): Map<number, Competition> {
  const out = new Map<number, Competition>();
  const u16 = (p: number) => b[p]! | (b[p + 1]! << 8);
  const key = new TextEncoder().encode('TrophyName_Abbr15_');
  outer: for (let i = 12; i < b.length - key.length; i++) {
    for (let k = 0; k < key.length; k++) if (b[i + k] !== key[k]) continue outer;
    let j = i + key.length, asset = 0;
    while (b[j]! >= 48 && b[j]! <= 57) asset = asset * 10 + b[j++]! - 48;
    // Volta até o nome curto "C<asset>" logo antes.
    const short = new TextEncoder().encode(`C${asset}`);
    let sp = -1;
    search: for (let p = i - short.length; p > i - 64 && p > 8; p--) {
      for (let k = 0; k < short.length; k++) if (b[p + k] !== short[k]) continue search;
      sp = p; break;
    }
    if (sp < 0 || b[sp - 9] !== 0xff || b[sp - 8] !== 0x01) continue;
    const id = u16(sp - 7);
    if (id !== u16(sp - 5) || b[sp - 3] !== 3) continue;
    if (!out.has(id)) out.set(id, { id, parent: u16(sp - 2), asset });
  }
  return out;
}
