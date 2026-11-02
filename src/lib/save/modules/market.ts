import { u32 } from '../bytes';

/**
 * Jogadores sugeridos/observados para o seu clube (módulo `pdrm`), provável.
 * Cabeçalho: 01 01 | u32 | 00 08 00 00 | 01 | data aaaammdd | 01 01 | n u32, depois n registros de 18 bytes:
 *   01 | playerid u32 | estado u16 (0–2) | categoria u16 (32–37) | nota u32 | data em que entrou aaaammdd | ff
 * No início da carreira do América são agentes livres e jogadores da Liga MX; depois, jogadores de OVR 72–83.
 */
export interface SuggestedPlayer { playerId: number; status: number; category: number; score: number; date: number }

export function readSuggestedPlayers(b: Uint8Array): SuggestedPlayer[] {
  const out: SuggestedPlayer[] = [];
  if (b.length < 25 || b[19] !== 1 || b[20] !== 1) return out;
  const n = u32(b, 21);
  for (let k = 0, o = 25; k < n && o + 18 <= b.length; k++, o += 18) {
    if (b[o] !== 1 || b[o + 17] !== 0xff) break;
    out.push({ playerId: u32(b, o + 1), status: b[o + 5]! | (b[o + 6]! << 8), category: b[o + 7]! | (b[o + 8]! << 8), score: u32(b, o + 9), date: u32(b, o + 13) });
  }
  return out;
}

/**
 * Lista do mercado do mundo durante a janela (módulo `plmm`), provável.
 * 01 01 01 | n u32 | n registros de 21 bytes: 01 | playerid u32 | flags u32 (um bit por motivo) | fim da janela aaaammdd | u32 | contador u32
 * Vazia com a janela fechada (save do Pisa em maio).
 */
export interface MarketListing { playerId: number; flags: number; until: number; count: number }

export function readMarketList(b: Uint8Array): MarketListing[] {
  const out: MarketListing[] = [];
  if (b.length < 11) return out;
  const n = u32(b, 7);
  for (let k = 0, o = 11; k < n && o + 21 <= b.length; k++, o += 21) {
    if (b[o] !== 1) break;
    out.push({ playerId: u32(b, o + 1), flags: u32(b, o + 5), until: u32(b, o + 9), count: u32(b, o + 17) });
  }
  return out;
}

/**
 * Listas de jogadores do mesmo nível do seu clube por liga (módulo `psrm`), provável.
 * Cabeçalho fixo, depois 01 | n listas u32 (6) e cada lista: 01 | n u32 | n × (01 | playerid u32 | marca u16 | i16).
 * Lista 0 = sua liga, listas 1 e 2 = duas ligas estrangeiras de nível parecido (Newcastle: Serie A e La Liga;
 * Pisa: Serie B, Turquia e Segunda espanhola; América: Liga MX, MLS e outras). As listas 3–5 vêm vazias.
 * Provável: busca de mercado/olheiros. Marca (1, −1) em parte dos jogadores, significado em aberto.
 */
export interface LeagueList { players: { playerId: number; mark: number; extra: number }[] }

export function readLeagueLists(b: Uint8Array): LeagueList[] {
  const out: LeagueList[] = [];
  let o = -1;
  for (let i = 40; i < Math.min(b.length - 5, 120); i++) if (b[i] === 1 && u32(b, i + 1) === 6 && b[i + 5] === 1) { o = i; break; }
  if (o < 0) return out;
  const nl = u32(b, o + 1);
  o += 5;
  for (let l = 0; l < nl; l++) {
    if (b[o] !== 1) break;
    const n = u32(b, o + 1);
    o += 5;
    const players: LeagueList['players'] = [];
    for (let k = 0; k < n && o + 9 <= b.length; k++, o += 9) {
      if (b[o] !== 1) return out;
      const e = b[o + 7]! | (b[o + 8]! << 8);
      players.push({ playerId: u32(b, o + 1), mark: b[o + 5]! | (b[o + 6]! << 8), extra: e > 32767 ? e - 65536 : e });
    }
    out.push({ players });
  }
  return out;
}
