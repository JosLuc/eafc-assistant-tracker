import { u32 } from '../bytes';

/**
 * Segurança no cargo do técnico de cada clube da IA (módulo `jbom`).
 * 01 01 | n u32 (836) | n registros de 24 bytes: teamid u32 | 01 | segurança u8 | 00 | 14 bytes de vagas | 00 00 ff
 * Começa em 80 para quase todos (o mesmo valor inicial do técnico do usuário no mhrm). No fim da temporada
 * cai para 55 ou 40 em alguns clubes e as vagas ganham ids de jogadores (provável: metas da diretoria).
 * Depois vem o mercado de técnicos (ofertas datadas, ex.: 10/05/2027, um dia antes de o Pisa contratar o usuário),
 * ainda sem formato fechado. O clube do usuário não entra nesta lista.
 */
export interface ClubJobSecurity { teamId: number; security: number }

export function readJobSecurity(b: Uint8Array): ClubJobSecurity[] {
  const out: ClubJobSecurity[] = [];
  if (b.length < 10) return out;
  const n = u32(b, 6);
  for (let k = 0, o = 10; k < n && o + 24 <= b.length; k++, o += 24) {
    if (b[o + 4] !== 1) break;
    out.push({ teamId: u32(b, o), security: b[o + 5]! });
  }
  return out;
}
