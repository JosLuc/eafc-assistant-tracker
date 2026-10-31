'use client';
import { get, set } from 'idb-keyval';
import type { CareerSnapshot } from '../career/snapshot';

/** Guarda os resumos no navegador (IndexedDB). O banco na nuvem entra numa fase seguinte. */
const KEY = 'fc27:snapshots';
export async function loadSnapshots(): Promise<CareerSnapshot[]> {
  try { return ((await get(KEY)) as CareerSnapshot[] | undefined) ?? []; } catch { return []; }
}
export async function addSnapshot(s: CareerSnapshot) {
  const all = await loadSnapshots();
  all.push(s);
  await set(KEY, all.slice(-30));
  return all;
}
export function parseInWorker(buf: ArrayBuffer): Promise<CareerSnapshot> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('../../workers/save.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => { w.terminate(); e.data.ok ? resolve(e.data.snapshot) : reject(new Error(e.data.error)); };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message)); };
    w.postMessage(buf, [buf]);
  });
}
