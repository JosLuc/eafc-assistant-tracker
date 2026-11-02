'use client';
import { useEffect } from 'react';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import { starters } from '@/lib/career/tips';
import { Ovr, Pic, dateBr } from './ui';
import type { Ea } from './names';
import type { Career } from '@/lib/career/merge';

export const PAGES = [
  { id: 'inicio', label: 'Início', icon: '⌂' },
  { id: 'elenco', label: 'Elenco', icon: '☷' },
  { id: 'base', label: 'Base', icon: '✪' },
] as const;
export type Page = (typeof PAGES)[number]['id'];

/** Campanha da temporada nos jogos oficiais já disputados (V-E-D e gols). */
function record(s: CareerSnapshot) {
  const r = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  for (const m of s.matches) {
    if (!m.played || m.homeGoals == null || m.awayGoals == null || /pré-temporada/i.test(m.competition)) continue;
    const home = m.homeId === s.club.id; if (!home && m.awayId !== s.club.id) continue;
    const [f, a] = home ? [m.homeGoals, m.awayGoals] : [m.awayGoals, m.homeGoals];
    r.gf += f; r.ga += a; if (f > a) r.w++; else if (f === a) r.d++; else r.l++;
  }
  return r;
}

export function Header({ s, ea, onUpload, careers, current, onChoose, onRemove, page, setPage }: {
  s: CareerSnapshot; ea: Ea; onUpload: () => void; careers: Career[]; current: Career; onChoose: (k: string) => void; onRemove: (k: string) => void;
  page: Page; setPage: (p: Page) => void;
}) {
  const xi = starters(s);
  const bestXi = Math.round(xi.reduce((a, p) => a + p.ovr, 0) / Math.max(1, xi.length));
  const crest = ea.crest(s.club.id);
  const r = record(s), gd = r.gf - r.ga;

  // Q e E trocam de aba, como atalho de teclado.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || /input|select|textarea/i.test(el.tagName)) return;
      const i = PAGES.findIndex((x) => x.id === page);
      if (e.key.toLowerCase() === 'q') setPage(PAGES[(i - 1 + PAGES.length) % PAGES.length]!.id);
      if (e.key.toLowerCase() === 'e') setPage(PAGES[(i + 1) % PAGES.length]!.id);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [page, setPage]);

  return (
    <div className="rounded-[10px] bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 text-xs">
        <span className="text-muted">Carreira</span>
        <select value={current.key} onChange={(e) => onChoose(e.target.value)} className="rounded-md border border-line bg-[#232323] px-2 py-1">
          {careers.map((c) => <option key={c.key} value={c.key}>{c.view.manager?.name ?? '?'} · {c.view.club.name} · {c.snaps.length} save{c.snaps.length > 1 ? 's' : ''}</option>)}
        </select>
        <button onClick={onUpload} className="rounded-md border border-line px-2 py-1 hover:bg-[#232323]">+ Nova carreira</button>
        <button onClick={() => onRemove(current.key)} className="rounded-md px-2 py-1 text-muted hover:text-bad">Apagar</button>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-muted"><span className="h-2 w-2 rounded-full bg-accent" />Save · {dateBr(s.gameDate)}</span>
        <button onClick={onUpload} className="rounded-md bg-accent px-3 py-1.5 font-semibold text-white hover:brightness-110">⇪ Enviar save novo</button>
      </div>
      <div className="flex flex-wrap items-center gap-5 px-5 py-5">
        <Pic src={crest} name={s.club.name} size={84} round={false} />
        <div className="min-w-0">
          <h1 className="title text-[30px] leading-tight tracking-[.01em]">{s.club.name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[13px] text-muted">
            {s.manager && <span className="font-semibold text-white">{s.manager.name}</span>}
            <span>{s.club.leagueName}</span><span>FC 27</span><span>Temporada {s.season}</span>
          </p>
        </div>
        <div className="ml-auto flex items-end gap-5">
          <div className="text-center"><div className="label mb-1">Melhor XI</div><Ovr v={bestXi} /></div>
          <div className="text-center"><div className="label mb-1">Campanha</div>
            <div className="num text-lg font-bold"><span className="text-[11px] text-faint">V</span>{r.w} <span className="text-[11px] text-faint">E</span>{r.d} <span className="text-[11px] text-faint">D</span>{r.l}</div></div>
          <div className="text-center"><div className="label mb-1">Gols</div>
            <div className="num text-lg font-bold">{r.gf}:{r.ga} {gd !== 0 && <span className={`text-xs ${gd > 0 ? 'text-good' : 'text-bad'}`}>{gd > 0 ? '+' : ''}{gd}</span>}</div></div>
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-3">
        <kbd className="mr-1 rounded border border-line px-1.5 text-[10px] text-muted" title="Aba anterior">Q</kbd>
        {PAGES.map((x) => (
          <button key={x.id} onClick={() => setPage(x.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium uppercase tracking-[.06em] ${page === x.id ? 'border-accent text-white' : 'border-transparent text-muted hover:text-white'}`}>
            <span className="text-[15px]">{x.icon}</span>{x.label}
          </button>
        ))}
        <kbd className="ml-auto rounded border border-line px-1.5 text-[10px] text-muted" title="Próxima aba">E</kbd>
      </nav>
      {!ea.available && <p className="border-t border-line px-5 py-2 text-[11px] text-muted">Nomes e fotos indisponíveis agora (API da EA fora do ar). Último save “{s.slotName}”, enviado em {new Date(s.importedAt).toLocaleString('pt-BR')}.</p>}
    </div>
  );
}
