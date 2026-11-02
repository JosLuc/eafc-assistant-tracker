'use client';
import { get, set } from 'idb-keyval';
import type { CareerSnapshot } from '../career/snapshot';
import { careerKey, upsert } from '../career/merge';
import type { PlayerDb } from '../career/playerdb';

/** Guarda os resumos no navegador (IndexedDB). O banco na nuvem entra numa fase seguinte. */
const KEY = 'fc27:snapshots';
export async function loadSnapshots(): Promise<CareerSnapshot[]> {
  try {
    const all = ((await get(KEY)) as CareerSnapshot[] | undefined) ?? [];
    // Resumos de versões antigas não têm os campos novos: completa com valores vazios.
    return all.map((s) => ({
      ...s, matches: s.matches ?? [], transfers: s.transfers ?? [], stats: s.stats ?? [], names: s.names ?? {}, finances: s.finances ?? null,
      morale: s.morale ?? null, scorers: s.scorers ?? [], youth: s.youth ?? [], scouts: s.scouts ?? [],
      careerKey: s.careerKey ?? '', tactic: s.tactic ?? null, worldTransfers: s.worldTransfers ?? [], loans: s.loans ?? [], coaches: s.coaches ?? [], leagueRivals: s.leagueRivals ?? [], lastSeasonComps: s.lastSeasonComps ?? {}, preseason: s.preseason ?? [], awardsRace: s.awardsRace ?? [], budgets: s.budgets ?? [], news: s.news ?? [], emails: s.emails ?? [], teamOfWeek: s.teamOfWeek ?? [], playerOfMonth: s.playerOfMonth ?? [],
      club: { ...s.club, popularity: s.club.popularity ?? 0 },
    }));
  } catch { return []; }
}
export async function addSnapshot(s: CareerSnapshot) {
  const all = upsert(await loadSnapshots(), s).slice(-80);
  await set(KEY, all);
  return all;
}
/** Apaga todos os saves de uma carreira deste navegador. */
export async function removeCareer(keyOf: (s: CareerSnapshot) => string, key: string) {
  const all = (await loadSnapshots()).filter((s) => keyOf(s) !== key);
  await set(KEY, all);
  return all;
}
/** Banco de jogadores: guardado à parte, só o do save mais recente de cada carreira (é grande). */
const dbKey = (career: string) => `fc27:db:${career}`;
export async function saveDb(snap: CareerSnapshot, db: PlayerDb | null) {
  if (!db) return;
  try {
    const old = (await get(dbKey(careerKey(snap)))) as PlayerDb | undefined;
    if (!old || old.gameDate <= db.gameDate) await set(dbKey(careerKey(snap)), db);
  } catch { /* sem espaço: a página do jogador fica sem atributos */ }
}
export async function loadDb(career: string): Promise<PlayerDb | null> {
  try { return ((await get(dbKey(career))) as PlayerDb | undefined) ?? null; } catch { return null; }
}
export function parseInWorker(buf: ArrayBuffer): Promise<{ snapshot: CareerSnapshot; db: PlayerDb | null }> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('../../workers/save.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => { w.terminate(); e.data.ok ? resolve({ snapshot: e.data.snapshot, db: e.data.db }) : reject(new Error(e.data.error)); };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message)); };
    w.postMessage(buf, [buf]);
  });
}
