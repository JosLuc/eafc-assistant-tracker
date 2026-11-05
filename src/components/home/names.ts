'use client';
import { useEffect, useState } from 'react';
import type { EaLookup, EaMeta, EaPlayer } from '../../../app/api/ea/route';

/**
 * Busca nomes, fotos e escudos na API da EA (via nosso servidor). Quem não está na EA vem do SoFIFA.
 * Ordem: EA > nome guardado no save (base/regens) > SoFIFA (pedido depois, aos poucos) > "Jogador #id".
 */
const SOFIFA_KEY = 'fc27:sofifa';
type SofifaCache = Record<number, { n: string | null; at: number }>;
function readSofifa(): SofifaCache {
  try { return JSON.parse(localStorage.getItem(SOFIFA_KEY) ?? '{}') as SofifaCache; } catch { return {}; }
}
function writeSofifa(c: SofifaCache) {
  try { localStorage.setItem(SOFIFA_KEY, JSON.stringify(c)); } catch { /* sem espaço: tudo bem */ }
}

export function useEa(ids: number[], teamIds: number[], saveNames: Record<number, string> = {}) {
  const [data, setData] = useState<EaLookup | null>(null);
  const [extra, setExtra] = useState<Record<number, EaPlayer>>({});
  const key = ids.join(',') + '|' + teamIds.join(',');
  useEffect(() => {
    let alive = true;
    fetch('/api/ea', { method: 'POST', body: JSON.stringify({ ids, teamIds, noFallback: ids.filter((id) => saveNames[id]) }) })
      .then((r) => r.json()).then((d: EaLookup) => {
        if (!alive) return;
        setData(d);
        void loadSofifa(d.missing ?? [], () => alive, setExtra);
      }).catch(() => alive && setData({ players: {}, crests: {}, available: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const player = (id: number): EaPlayer => {
    const hit = data?.players[id];
    if (hit) return hit;
    const n = saveNames[id];
    // Jogadores gerados pelo jogo (base, regens) não estão na base da EA, mas o save guarda o nome.
    if (n) return { name: n, short: n.split(' ').at(-1)!, avatar: '' };
    return extra[id] ?? { name: `Jogador #${id}`, short: `#${id}`, avatar: '' };
  };
  return { player, crest: (id: number) => data?.crests[id], loading: !data, available: data?.available ?? true };
}

/**
 * Quem não está na EA: nome pelo SoFIFA, em lotes de 20 (o elenco vem primeiro na lista).
 * Fica guardado no navegador por 30 dias (7 dias quando não achou), então só a primeira visita espera.
 */
async function loadSofifa(missing: number[], alive: () => boolean, set: (f: (p: Record<number, EaPlayer>) => Record<number, EaPlayer>) => void) {
  const cache = readSofifa();
  const now = Date.now();
  const fresh = (c?: { n: string | null; at: number }) => !!c && now - c.at < (c.n ? 30 : 7) * 864e5;
  const toPlayer = (n: string): EaPlayer => ({ name: n, short: n.split(' ').at(-1)!, avatar: '', src: 'sofifa' });
  const known: Record<number, EaPlayer> = {};
  for (const id of missing) { const c = cache[id]; if (fresh(c) && c!.n) known[id] = toPlayer(c!.n); }
  if (Object.keys(known).length) set((p) => ({ ...p, ...known }));
  const todo = missing.filter((id) => !fresh(cache[id])).slice(0, 400);
  for (let i = 0; i < todo.length && alive(); i += 20) {
    const batch = todo.slice(i, i + 20);
    try {
      const r = (await (await fetch('/api/ea', { method: 'POST', body: JSON.stringify({ sofifa: batch }) })).json()) as { players: Record<number, EaPlayer> };
      for (const id of batch) cache[id] = { n: r.players[id]?.name ?? null, at: Date.now() };
      writeSofifa(cache);
      if (alive() && Object.keys(r.players).length) set((p) => ({ ...p, ...r.players }));
    } catch { /* tenta de novo na próxima visita */ }
  }
}
export type Ea = ReturnType<typeof useEa>;

const META_KEY = 'fc27:eameta';
/** Nomes dos PlayStyles e dos países (da base da EA), guardados no navegador por 7 dias. */
export function useEaMeta(): EaMeta | null {
  const [m, setM] = useState<EaMeta | null>(null);
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(META_KEY) ?? 'null') as { at: number; m: EaMeta } | null;
      if (c && Date.now() - c.at < 7 * 864e5 && c.m.available) { setM(c.m); return; }
    } catch { /* sem cache */ }
    fetch('/api/ea?meta=1').then((r) => r.json()).then((d: EaMeta) => {
      setM(d);
      if (d.available) try { localStorage.setItem(META_KEY, JSON.stringify({ at: Date.now(), m: d })); } catch { /* ok */ }
    }).catch(() => setM({ abilities: {}, nations: {}, available: false }));
  }, []);
  return m;
}
