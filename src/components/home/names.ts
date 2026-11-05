'use client';
import { useEffect, useState } from 'react';
import type { EaLookup, EaMeta, EaPlayer } from '../../../app/api/ea/route';

/**
 * Busca nomes, fotos e escudos na API da EA (via nosso servidor). Quem não está na EA vem do SoFIFA.
 * Ordem: EA > nome guardado no save (base/regens) > SoFIFA > "Jogador #id".
 */
export function useEa(ids: number[], teamIds: number[], saveNames: Record<number, string> = {}) {
  const [data, setData] = useState<EaLookup | null>(null);
  const key = ids.join(',') + '|' + teamIds.join(',');
  useEffect(() => {
    let alive = true;
    fetch('/api/ea', { method: 'POST', body: JSON.stringify({ ids, teamIds, noFallback: ids.filter((id) => saveNames[id]) }) })
      .then((r) => r.json()).then((d) => alive && setData(d)).catch(() => alive && setData({ players: {}, crests: {}, available: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const player = (id: number): EaPlayer => {
    const hit = data?.players[id];
    if (hit && !hit.src) return hit;
    const n = saveNames[id];
    if (!n && hit) return hit;
    // Jogadores gerados pelo jogo (base, regens) não estão na base da EA, mas o save guarda o nome.
    return n ? { name: n, short: n.split(' ').at(-1)!, avatar: '' } : { name: `Jogador #${id}`, short: `#${id}`, avatar: '' };
  };
  return { player, crest: (id: number) => data?.crests[id], loading: !data, available: data?.available ?? true };
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
