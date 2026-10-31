'use client';
import { useEffect, useState } from 'react';
import type { EaLookup, EaPlayer } from '../../../app/api/ea/route';

/** Busca nomes, fotos e escudos na API da EA (via nosso servidor). Sem resposta, mostra "Jogador #id". */
export function useEa(ids: number[], teamIds: number[], saveNames: Record<number, string> = {}) {
  const [data, setData] = useState<EaLookup | null>(null);
  const key = ids.join(',') + '|' + teamIds.join(',');
  useEffect(() => {
    let alive = true;
    fetch('/api/ea', { method: 'POST', body: JSON.stringify({ ids, teamIds }) })
      .then((r) => r.json()).then((d) => alive && setData(d)).catch(() => alive && setData({ players: {}, crests: {}, available: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const player = (id: number): EaPlayer => {
    const hit = data?.players[id];
    if (hit) return hit;
    const n = saveNames[id];
    // Jogadores gerados pelo jogo (base, regens) não estão na base da EA, mas o save guarda o nome.
    return n ? { name: n, short: n.split(' ').at(-1)!, avatar: '' } : { name: `Jogador #${id}`, short: `#${id}`, avatar: '' };
  };
  return { player, crest: (id: number) => data?.crests[id], loading: !data, available: data?.available ?? true };
}
export type Ea = ReturnType<typeof useEa>;
