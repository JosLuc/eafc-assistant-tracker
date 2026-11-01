'use client';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import { starters } from '@/lib/career/tips';
import { Ovr, Pic, dateBr } from './ui';
import type { Ea } from './names';
import type { Career } from '@/lib/career/merge';

export function Header({ s, ea, onUpload, careers, current, onChoose, onRemove }: {
  s: CareerSnapshot; ea: Ea; onUpload: () => void; careers: Career[]; current: Career; onChoose: (k: string) => void; onRemove: (k: string) => void;
}) {
  const xi = starters(s);
  const bestXi = Math.round(xi.reduce((a, p) => a + p.ovr, 0) / Math.max(1, xi.length));
  const crest = ea.crest(s.club.id);
  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-wrap items-center gap-4">
        <Pic src={crest} name={s.club.name} size={64} round={false} />
        <div className="min-w-0">
          <h1 className="title text-3xl">{s.club.name}</h1>
          <p className="text-sm text-muted">
            {s.manager && <span className="mr-3 font-semibold text-white">{s.manager.name}</span>}
            {s.club.leagueName} · FC 27 · Temporada {s.season} · {dateBr(s.gameDate)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-center"><div className="text-[10px] font-semibold text-muted">MELHOR XI</div><Ovr v={bestXi} /></div>
          <button onClick={onUpload} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold hover:brightness-110">⇪ Enviar save novo</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">Carreira:</span>
        <select value={current.key} onChange={(e) => onChoose(e.target.value)} className="rounded border border-line bg-card-2 px-2 py-1">
          {careers.map((c) => <option key={c.key} value={c.key}>{c.view.manager?.name ?? '?'} · {c.view.club.name} · {c.snaps.length} save{c.snaps.length > 1 ? 's' : ''}</option>)}
        </select>
        <button onClick={onUpload} className="rounded border border-line px-2 py-1 hover:bg-card-2">+ Nova carreira</button>
        <button onClick={() => onRemove(current.key)} className="rounded px-2 py-1 text-muted hover:text-bad">Apagar carreira</button>
      </div>
      <p className="mt-2 text-xs text-muted">Envie saves novos desta carreira quando quiser: o app reconhece o técnico e junta os dados. Último save “{s.slotName}” · enviado em {new Date(s.importedAt).toLocaleString('pt-BR')}{!ea.available && ' · nomes e fotos indisponíveis agora (API da EA fora do ar)'}</p>
    </div>
  );
}
