'use client';
import { useEffect, useState } from 'react';
import type { EaLookup, EaPlayer } from '../../../app/api/ea/route';

/** Busca nomes, fotos e escudos na API da EA (via nosso servidor). Sem resposta, mostra "Jogador #id". */
export function useEa(ids: number[], teamIds: number[]) {
  const [data, setData] = useState<EaLookup | null>(null);
  const key = ids.join(',') + '|' + teamIds.join(',');
  useEffect(() => {
    let alive = true;
    fetch('/api/ea', { method: 'POST', body: JSON.stringify({ ids, teamIds }) })
      .then((r) => r.json()).then((d) => alive && setData(d)).catch(() => alive && setData({ players: {}, crests: {}, available: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const player = (id: number): EaPlayer => data?.players[id] ?? { name: `Jogador #${id}`, short: `#${id}`, avatar: '' };
  return { player, crest: (id: number) => data?.crests[id], loading: !data, available: data?.available ?? true };
}
export type Ea = ReturnType<typeof useEa>;
