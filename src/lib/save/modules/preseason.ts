import { u32 } from '../bytes';

/**
 * Torneios de pré-temporada (convites), módulo `psem`. Cada torneio:
 *   u32 tamanho | nome "cm_pst_…" | 01 | n u32 | n × teamid u32 | 01 | k u32 | k × u32 (sede?) | prêmio u32
 * Conferido com o CM Tracker no save do América: European International Cup $2,5M, Champions Trophy $2M,
 * European Shield $2,1M, 8 times cada.
 */
export interface PreseasonTour { key: string; name: string; teams: number[]; prize: number }

const WORDS: Record<string, string> = { eu: 'European', intl: 'International', cup: 'Cup', champions: 'Champions', trophy: 'Trophy', shield: 'Shield' };

export function tourName(key: string) {
  return key.replace(/^cm_pst_/, '').split('_').map((w) => WORDS[w] ?? w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function readPreseason(b: Uint8Array): PreseasonTour[] {
  const out: PreseasonTour[] = [];
  const pat = [0x63, 0x6d, 0x5f, 0x70, 0x73, 0x74, 0x5f]; // "cm_pst_"
  for (let i = 4; i + 7 < b.length; i++) {
    if (!pat.every((c, k) => b[i + k] === c)) continue;
    const len = u32(b, i - 4);
    if (len < 7 || len > 64) continue;
    const key = String.fromCharCode(...b.subarray(i, i + len));
    let o = i + len;
    if (b[o] !== 1) continue;
    const n = u32(b, o + 1); o += 5;
    if (n > 64) continue;
    const teams = Array.from({ length: n }, (_, k) => u32(b, o + 4 * k)); o += 4 * n;
    if (b[o] !== 1) continue;
    const k = u32(b, o + 1); o += 5 + 4 * k;
    if (k > 8 || o + 4 > b.length) continue;
    out.push({ key, name: tourName(key), teams, prize: u32(b, o) });
    i = o;
  }
  return out;
}
