'use client';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import { starters } from '@/lib/career/tips';
import { Ovr, dateBr } from './ui';
import type { Ea } from './names';

export function Header({ s, ea, onUpload }: { s: CareerSnapshot; ea: Ea; onUpload: () => void }) {
  const xi = starters(s);
  const bestXi = Math.round(xi.reduce((a, p) => a + p.ovr, 0) / Math.max(1, xi.length));
  const crest = ea.crest(s.club.id);
  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {crest ? <img src={crest} alt="" className="h-16 w-16 object-contain" /> : <div className="grid h-16 w-16 place-items-center rounded-full bg-card-2 title text-2xl">{s.club.name[0]}</div>}
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
      <p className="mt-3 text-xs text-muted">Save “{s.slotName}” · enviado em {new Date(s.importedAt).toLocaleString('pt-BR')}{!ea.available && ' · nomes e fotos indisponíveis agora (API da EA fora do ar)'}</p>
    </div>
  );
}
