import { POS } from './positions';
import { ROLES } from './roles';
import { EMPTY, RANGE, RANGES, type ScoutFilter } from './scout';

/**
 * Scout rápida com IA: o técnico descreve o jogador em texto livre e a IA devolve um JSON com os filtros.
 * Aqui ficam as instruções que vão para a IA (com as opções válidas do save) e a leitura da resposta,
 * que confere cada campo e descarta o que não existir (liga, clube, país ou PlayStyle desconhecidos).
 */

export interface FastScoutOptions {
  leagues: [number, string][];
  teams: [number, string][];
  nations: [number, string][];
  /** [chave, nome] dos PlayStyles (ex.: ["trait1_64", "Rapid"]). */
  styles: [string, string][];
}
export interface FastScoutResult { filter: ScoutFilter; sort?: { key: string; dir: 1 | -1 }; note?: string; ignored: string[] }

const POS_NAMES: Record<string, string> = {
  GOL: 'goleiro', LD: 'lateral direito', LE: 'lateral esquerdo', ALD: 'ala direito', ALE: 'ala esquerdo', ZAG: 'zagueiro',
  VOL: 'volante', MC: 'meio-campista central', MD: 'meia direita', ME: 'meia esquerda', MEI: 'meia ofensivo (camisa 10)',
  PD: 'ponta direita', PE: 'ponta esquerda', ATA: 'centroavante', SA: 'segundo atacante',
};
/** Códigos usados pela Scout para cada sigla (os mesmos do seletor de posições). */
const POS_CODE: Record<string, number> = { GOL: 0, LD: 3, LE: 7, ALD: 2, ALE: 8, ZAG: 5, VOL: 10, MC: 14, MD: 12, ME: 16, MEI: 18, PD: 23, PE: 27, ATA: 25, SA: 21 };

export const FAST_SCOUT_SYSTEM = `Você transforma o pedido de um técnico do Modo Carreira do EA FC 27 em filtros de busca de jogadores.
Responda SOMENTE com um objeto JSON, sem texto antes ou depois e sem bloco de código. Formato:
{
  "ranges": { "<chave>": [mín ou null, máx ou null] },
  "pos": ["LE"],              // siglas de posição; vazio = qualquer
  "posScope": "main" | "any", // "main" = só a posição principal (padrão "any")
  "league": "nome exato da lista" | null,
  "team": "nome do clube" | null,
  "nation": "nome do país em inglês" | null,
  "foot": "direito" | "esquerdo" | null,
  "free": true | false,       // só agentes livres (sem clube)
  "generated": true | false,  // só jogadores gerados pelo jogo (regens e base)
  "gender": "masculino" | "feminino",
  "styles": ["nome do PlayStyle da lista"], "stylesMode": "or" | "and",
  "roles": [{ "pos": "LE", "name": "Inverted Wingback", "plus": 1 ou 2 }], "rolesMode": "or" | "and",
  "sort": { "key": "<chave de faixa>", "dir": "desc" | "asc" },
  "note": "1 frase em português explicando a busca"
}
Regras:
- Use só as chaves, siglas e nomes listados abaixo. Omita o que o pedido não menciona.
- Valor e multa em milhões de euros; salário em milhares de euros por semana.
- "Jovem" sem idade = até 21 anos. "Promessa"/"wonderkid" = até 21 anos e potencial 80 ou mais. "Barato" sem valor = até 10 milhões.
- "Rápido" = sprintspeed e acceleration de 80 ou mais (ajuste ao nível pedido). "Alto" = altura 188 ou mais.
- Se pedirem o melhor/maior de algo, use "sort" nessa chave.`;

/** Lista das opções válidas do save, que vai como contexto para a IA. */
export function fastScoutContext(o: FastScoutOptions): string {
  const ranges = RANGES.map((r) => `${r.key} = ${r.label} (${r.min}–${r.max})`).join('; ');
  const pos = Object.entries(POS_NAMES).map(([k, v]) => `${k} = ${v}`).join('; ');
  const roles = [...new Set(Object.values(ROLES).map((r) => `${r.pos}: ${r.name}`))].join('; ');
  return [
    `CHAVES DE FAIXA: ${ranges}`,
    `POSIÇÕES: ${pos}`,
    `LIGAS: ${o.leagues.map(([, n]) => n).join('; ')}`,
    `ROLES (pos: nome): ${roles}`,
    o.styles.length ? `PLAYSTYLES: ${o.styles.map(([, n]) => n).join('; ')}` : '',
  ].filter(Boolean).join('\n');
}

const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** Procura um nome numa lista: igual primeiro, depois "contém" (o menor nome que contém o texto). */
function findName<K>(list: [K, string][], text: unknown): K | undefined {
  if (typeof text !== 'string' || !text.trim()) return undefined;
  const t = norm(text);
  const exact = list.find(([, n]) => norm(n) === t);
  if (exact) return exact[0];
  const part = list.filter(([, n]) => norm(n).includes(t) || t.includes(norm(n))).sort((a, b) => a[1].length - b[1].length);
  return part[0]?.[0];
}
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : typeof x === 'string' && x.trim() && Number.isFinite(Number(x)) ? Number(x) : null);

/** Lê a resposta da IA (JSON, mesmo cercado de texto) e monta o filtro da Scout. */
export function parseFastScout(text: string, o: FastScoutOptions): FastScoutResult {
  const m = /\{[\s\S]*\}/.exec(text.replace(/```(?:json)?/g, ''));
  if (!m) throw new Error('A IA não devolveu filtros. Tente descrever de outro jeito.');
  let j: Record<string, unknown>;
  try { j = JSON.parse(m[0]) as Record<string, unknown>; } catch { throw new Error('A IA devolveu filtros num formato inválido. Tente de novo.'); }
  const f: ScoutFilter = { ...EMPTY, ranges: {} };
  const ignored: string[] = [];

  for (const [k, v] of Object.entries((j.ranges as Record<string, unknown>) ?? {})) {
    const def = RANGE[k];
    if (!def || !Array.isArray(v)) { ignored.push(k); continue; }
    const clamp = (x: number | null) => (x == null ? null : Math.min(def.max, Math.max(def.min, x)));
    const a = clamp(num(v[0])), b = clamp(num(v[1]));
    if (a != null || b != null) f.ranges[k] = [a, b];
  }
  if (Array.isArray(j.pos)) {
    for (const p of j.pos) { const c = POS_CODE[String(p).toUpperCase()] ?? POS.indexOf(String(p).toUpperCase() as (typeof POS)[number]); if (c >= 0) f.pos.push(c); else ignored.push(String(p)); }
    f.pos = [...new Set(f.pos)];
  }
  if (j.posScope === 'main') f.posScope = 'main';
  if (j.league != null) { const id = findName(o.leagues, j.league); if (id != null) f.league = id; else ignored.push(String(j.league)); }
  if (j.team != null) { const id = findName(o.teams, j.team); if (id != null) f.team = id; else ignored.push(String(j.team)); }
  if (j.nation != null) { const id = findName(o.nations, j.nation); if (id != null) f.nation = id; else ignored.push(String(j.nation)); }
  if (typeof j.foot === 'string') f.foot = /esq|left/i.test(j.foot) ? 2 : /dir|right/i.test(j.foot) ? 1 : null;
  if (j.free === true) f.free = true;
  if (j.generated === true) f.generated = true;
  if (typeof j.gender === 'string' && /fem/i.test(j.gender)) f.gender = 1;
  if (Array.isArray(j.styles)) {
    for (const s of j.styles) { const k = findName(o.styles, s); if (k) f.styles.push(k); else ignored.push(String(s)); }
    f.styles = [...new Set(f.styles)];
  }
  if (j.stylesMode === 'and') f.stylesMode = 'and';
  if (Array.isArray(j.roles)) {
    for (const r of j.roles as { pos?: string; name?: string; plus?: number }[]) {
      const hit = Object.entries(ROLES).find(([, x]) => x.pos === String(r?.pos ?? '').toUpperCase() && norm(x.name) === norm(String(r?.name ?? '')));
      if (hit) f.roles.push(Number(hit[0]) + (r.plus === 2 ? 100 : 0)); else ignored.push(`${r?.pos ?? ''} ${r?.name ?? ''}`.trim());
    }
    f.roles = [...new Set(f.roles)];
  }
  if (j.rolesMode === 'and') f.rolesMode = 'and';

  let sort: FastScoutResult['sort'];
  const s = j.sort as { key?: string; dir?: string } | undefined;
  if (s?.key && (RANGE[s.key] || s.key === 'value' || s.key === 'wage')) sort = { key: s.key, dir: s.dir === 'asc' ? 1 : -1 };
  return { filter: f, sort, note: typeof j.note === 'string' ? j.note : undefined, ignored };
}
