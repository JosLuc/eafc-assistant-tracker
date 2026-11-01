import type { CareerSnapshot } from './snapshot';

/** Uma carreira: todos os saves enviados dela, em ordem de data do jogo. */
export interface Career {
  key: string;
  /** Saves em ordem cronológica do jogo (o último é o mais recente). */
  snaps: CareerSnapshot[];
  /** Visão juntada: o save mais recente, completado com o que só os saves anteriores tinham. */
  view: CareerSnapshot;
  /** Save anterior ao mais recente (para "o que mudou"). */
  previous?: CareerSnapshot;
}

export const careerKey = (s: CareerSnapshot) => s.careerKey || `${s.manager?.name ?? '?'}|${s.slotName}`;

/** Agrupa os saves por carreira, a mais recente primeiro. */
export function groupCareers(all: CareerSnapshot[]): Career[] {
  const by = new Map<string, CareerSnapshot[]>();
  for (const s of all) { const k = careerKey(s); by.set(k, [...(by.get(k) ?? []), s]); }
  return [...by].map(([key, list]) => {
    const snaps = [...list].sort((a, b) => a.gameDate - b.gameDate || a.importedAt.localeCompare(b.importedAt));
    return { key, snaps, view: mergeCareer(snaps), previous: snaps.at(-2) };
  }).sort((a, b) => b.view.importedAt.localeCompare(a.view.importedAt));
}

/** Coloca um save novo na lista: o mesmo dia de jogo da mesma carreira substitui o antigo. */
export function upsert(all: CareerSnapshot[], s: CareerSnapshot): CareerSnapshot[] {
  const k = careerKey(s);
  return [...all.filter((x) => !(careerKey(x) === k && x.gameDate === s.gameDate && x.club.id === s.club.id)), s];
}

const uniq = <T,>(list: T[], key: (x: T) => string) => { const seen = new Set<string>(); return list.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); };

/**
 * Junta os saves de uma carreira. A base é o save mais recente; o que ele não tem e um save anterior
 * do mesmo clube e temporada tem entra no lugar (ex.: um save sem a lista de jogos, ou transferências
 * que o jogo já apagou). Transferências e nomes acumulam de todos os saves.
 */
export function mergeCareer(snaps: CareerSnapshot[]): CareerSnapshot {
  const last = snaps.at(-1)!;
  const same = snaps.filter((s) => s.club.id === last.club.id && s.season === last.season).reverse();
  const pick = <K extends keyof CareerSnapshot>(k: K, empty: (v: CareerSnapshot[K]) => boolean): CareerSnapshot[K] =>
    same.find((s) => s[k] != null && !empty(s[k]))?.[k] ?? last[k];
  const arr = (v: unknown) => !Array.isArray(v) || v.length === 0;
  return {
    ...last,
    names: Object.assign({}, ...snaps.map((s) => s.names ?? {})),
    transfers: uniq(snaps.flatMap((s) => s.transfers ?? []).sort((a, b) => b.date - a.date), (t) => `${t.date}-${t.playerId}-${t.toId}`),
    worldTransfers: uniq(snaps.flatMap((s) => s.worldTransfers ?? []).sort((a, b) => b.date - a.date), (t) => `${t.date}-${t.playerId}-${t.toId}`),
    news: uniq(snaps.flatMap((s) => s.news ?? []).sort((a, b) => (b.date ?? 0) - (a.date ?? 0)), (x) => `${x.key}-${x.date}-${JSON.stringify(x.params)}`),
    emails: uniq(snaps.flatMap((s) => s.emails ?? []).sort((a, b) => (b.date ?? 0) - (a.date ?? 0)), (x) => `${x.key}-${x.date}-${JSON.stringify(x.params)}`),
    teamOfWeek: uniq(snaps.flatMap((s) => s.teamOfWeek ?? []).sort((a, b) => (b.date ?? 0) - (a.date ?? 0)), (x) => x.players.join(',')),
    playerOfMonth: uniq(snaps.flatMap((s) => s.playerOfMonth ?? []).sort((a, b) => (b.date ?? 0) - (a.date ?? 0)), (x) => `${x.date}-${x.playerId}`),
    matches: pick('matches', arr), stats: pick('stats', arr), standings: pick('standings', arr), scouts: pick('scouts', arr), youth: pick('youth', arr),
    finances: pick('finances', (v) => v == null), morale: pick('morale', (v) => v == null), tactic: pick('tactic', (v) => v == null),
    manager: pick('manager', (v) => v == null),
  };
}
