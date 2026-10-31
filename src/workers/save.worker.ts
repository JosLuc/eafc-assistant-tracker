/// <reference lib="webworker" />
import { readSave } from '../lib/save';
import { buildSnapshot } from '../lib/career/snapshot';

/** Lê o save fora da thread principal: recebe os bytes e devolve o resumo. */
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  try {
    const snapshot = buildSnapshot(readSave(new Uint8Array(e.data)));
    self.postMessage({ ok: true, snapshot });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
