import { u32 } from '../bytes';

/**
 * Feed de notícias / rede social do jogo, módulo `socm`. Cada post tem uma chave de texto
 * (ex.: "CM_Social_POTM_UM", "CM_Social_NewManager_WasFired_Title_1_UM") e parâmetros:
 *   01 | n u32 | n × (01 | valor u32 | tipo u8 | …)  — tipos vistos: 8/10 jogador, 15/16 clube, 28 competição, 29 semanas.
 * "CM_Player_Awards_N" é o time da semana: 01 0 | 01 0 | 01 | 11 u32 | 11 playerids, seguido da data.
 * Conferido no save do fim da temporada: jogador do mês 237497 (Toluca, Liga MX) em 05/05/2027;
 * América → Pisa (técnico demitido e contratado) em 11/05/2027.
 */
export interface SocialPost { key: string; date: number | null; params: [number, number][]; players: number[] }

const SOCIAL = /^CM_(Social|News|Transfer|Player_Awards)/;
/** E-mails da caixa de entrada (módulo emlm), mesmo formato de parâmetros. Só o corpo; o assunto é o mesmo texto com _Subject. */
export const EMAIL = /^CM(YS)?_(Email|Mail|MAIL|Preseason)(?!.*(_Subject|_subject|Saga_Special))/;

const validDate = (d: number) => {
  const y = Math.floor(d / 10000), m = Math.floor(d / 100) % 100, day = d % 100;
  return y >= 2020 && y < 2100 && m >= 1 && m <= 12 && day >= 1 && day <= 31;
};

export function readSocial(b: Uint8Array, keep: RegExp = SOCIAL): SocialPost[] {
  const out: SocialPost[] = [];
  for (let i = 0; i + 8 < b.length; i++) {
    if (b[i] !== 0x43 || b[i + 1] !== 0x4d) continue; // "CM"
    let e = i;
    while (e < b.length && /[A-Za-z0-9_]/.test(String.fromCharCode(b[e]!))) e++;
    const key = String.fromCharCode(...b.subarray(i, e));
    if (!keep.test(key)) { i = e; continue; }
    const params: [number, number][] = [];
    let players: number[] = [];
    let o = e;
    if (key.startsWith('CM_Player_Awards')) {
      const n = u32(b, o + 11);
      if (n > 0 && n <= 11) { players = Array.from({ length: n }, (_, k) => u32(b, o + 15 + 4 * k)); o += 15 + 4 * n; }
    } else if (b[o] === 1 && u32(b, o + 1) < 10) {
      const n = u32(b, o + 1);
      let q = o + 5;
      for (let k = 0; k < n && b[q] === 1; k++) {
        params.push([b[q + 5]!, u32(b, q + 1)]);
        q += 6;
        while (q < o + 200 && b[q] !== 1) q++;
        if (b[q + 1] === 0xff) q += 2;
      }
      o = q;
    }
    let date: number | null = null;
    for (let q = o; q < Math.min(o + 260, b.length - 4); q++) {
      const v = u32(b, q);
      if (validDate(v)) { date = v; break; }
    }
    out.push({ key, date, params, players });
    i = e;
  }
  return out;
}
