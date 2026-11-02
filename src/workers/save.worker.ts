/// <reference lib="webworker" />
import { readSave } from '../lib/save';
import { buildSnapshot } from '../lib/career/snapshot';
import { buildPlayerDb } from '../lib/career/playerdb';
import { fromYmd } from '../lib/career/dates';

/** Lê o save fora da thread principal: recebe os bytes e devolve o resumo e o banco de jogadores. */
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  try {
    const save = readSave(new Uint8Array(e.data));
    const snapshot = buildSnapshot(save);
    let db = null;
    try { db = buildPlayerDb(save, fromYmd(snapshot.gameDate), snapshot.gameDate); } catch { /* banco é opcional */ }
    self.postMessage({ ok: true, snapshot, db });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
