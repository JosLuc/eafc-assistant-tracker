'use client';
import { useEffect, useMemo, useState } from 'react';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import { addSnapshot, loadSnapshots, parseInWorker } from '@/lib/client/store';
import { useEa } from './names';
import { Header } from './Header';
import { Upload } from './Upload';
import * as W from './widgets';

const SECTIONS = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'elenco', label: 'Elenco' },
  { id: 'contratos', label: 'Contratos e salários' },
  { id: 'competicoes', label: 'Competições' },
  { id: 'clube', label: 'Clube' },
] as const;
type Section = (typeof SECTIONS)[number]['id'];

const WIDGETS: { id: string; sections: Section[]; C: (p: { s: CareerSnapshot; ea: ReturnType<typeof useEa> }) => React.ReactNode; wide?: boolean }[] = [
  { id: 'dica', sections: ['geral'], C: W.AssistantTips, wide: true },
  { id: 'calendario', sections: ['geral', 'competicoes'], C: W.Calendar },
  { id: 'proximo', sections: ['geral', 'competicoes'], C: W.NextMatch },
  { id: 'liga', sections: ['geral', 'competicoes'], C: W.LeaguePosition },
  { id: 'forca', sections: ['geral', 'elenco'], C: W.TeamPower },
  { id: 'xi', sections: ['geral', 'elenco'], C: W.StartingXI },
  { id: 'ultimo', sections: ['geral', 'competicoes', 'elenco'], C: W.LastMatch },
  { id: 'elenco', sections: ['geral', 'elenco'], C: W.SquadOverview },
  { id: 'contratos', sections: ['geral', 'contratos'], C: W.Contracts },
  { id: 'salarios', sections: ['geral', 'contratos'], C: W.Wages },
  { id: 'clube', sections: ['geral', 'clube'], C: W.Club },
  { id: 'bolas', sections: ['geral', 'elenco', 'clube'], C: W.SetPieces },
];

export function Home() {
  const [snaps, setSnaps] = useState<CareerSnapshot[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [section, setSection] = useState<Section>('geral');

  useEffect(() => { loadSnapshots().then(setSnaps); }, []);
  const s = snaps?.at(-1);

  async function onFile(f: File) {
    setBusy(true); setError(undefined);
    try {
      const snap = await parseInWorker(await f.arrayBuffer());
      setSnaps(await addSnapshot(snap)); setUploading(false);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  const ids = useMemo(() => s?.squad.map((p) => p.id) ?? [], [s]);
  const teamIds = useMemo(() => (s ? [s.club.id, ...s.standings.flatMap((t) => t.rows.map((r) => r.teamId))] : []), [s]);
  const ea = useEa(ids, teamIds);

  if (!snaps) return <p className="p-8 text-muted">Carregando…</p>;
  if (!s || uploading) return <main className="p-4 pt-16"><Upload onFile={onFile} busy={busy} error={error} onCancel={s ? () => setUploading(false) : undefined} /></main>;

  const visible = WIDGETS.filter((w) => w.sections.includes(section));
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4">
      <Header s={s} ea={ea} onUpload={() => setUploading(true)} />
      <nav className="flex gap-1 overflow-x-auto border-b border-line">
        {SECTIONS.map((x) => {
          const n = WIDGETS.filter((w) => w.sections.includes(x.id)).length;
          return (
            <button key={x.id} onClick={() => setSection(x.id)}
              className={`title whitespace-nowrap border-b-2 px-3 py-2 text-sm ${section === x.id ? 'border-accent text-white' : 'border-transparent text-muted hover:text-white'}`}>
              {x.label} <span className="text-xs text-muted">{n}</span>
            </button>
          );
        })}
      </nav>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map(({ id, C, wide }) => <div key={id} className={wide ? 'md:col-span-2 xl:col-span-3' : ''}><C s={s} ea={ea} /></div>)}
      </div>
    </main>
  );
}
