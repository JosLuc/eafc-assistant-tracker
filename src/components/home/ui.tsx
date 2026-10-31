'use client';
import { useState } from 'react';

export function Card({ title, help, wave, empty, className = '', action, children }: {
  title: string; help?: string; wave?: number; empty?: string; className?: string; action?: React.ReactNode; children?: React.ReactNode;
}) {
  const [tip, setTip] = useState(false);
  return (
    <section className={`relative rounded-lg border border-line bg-card p-4 ${empty ? 'border-dashed' : ''} ${className}`}>
      <header className="mb-3 flex items-center gap-2">
        <h3 className="title text-[15px]">{title}</h3>
        {help && (
          <button aria-label="Ajuda" onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)} onClick={() => setTip((v) => !v)}
            className="grid h-4 w-4 place-items-center rounded-full border border-muted text-[10px] text-muted">i</button>
        )}
        <div className="ml-auto">{action}</div>
        {tip && help && (
          <div className="absolute left-4 top-10 z-20 max-w-72 rounded-md border border-line bg-card-2 p-3 text-xs text-[#cfcfd6] shadow-xl">{help}</div>
        )}
      </header>
      {empty ? (
        <div className="grid min-h-40 place-items-center text-center text-sm text-muted">
          <div>
            <div className="mb-2 text-2xl">⧗</div>
            <p>{empty}</p>
            {wave && <p className="mt-1 text-xs">Chega na onda {wave} da Home.</p>}
          </div>
        </div>
      ) : children}
    </section>
  );
}

export function Ovr({ v, size = 'sm' }: { v: number; size?: 'sm' | 'lg' }) {
  const color = v >= 75 ? 'bg-good text-black' : v >= 65 ? 'bg-mid text-black' : 'bg-[#4b4b52] text-white';
  return <span className={`inline-grid place-items-center rounded font-bold tabular-nums ${color} ${size === 'lg' ? 'h-9 min-w-11 px-2 text-xl' : 'h-5 min-w-7 px-1 text-xs'}`}>{v}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-muted" title={hint}>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-8 font-semibold text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-card-2"><div className="h-full rounded bg-good" style={{ width: `${Math.min(100, v)}%` }} /></div>
      <Ovr v={v} />
    </div>
  );
}

export const money = (n: number) =>
  n >= 1e6 ? `€${(n / 1e6).toFixed(1).replace('.', ',')} mi` : n >= 1e3 ? `€${Math.round(n / 1e3)} mil` : `€${n}`;
export const dateBr = (ymd: number) => `${String(ymd % 100).padStart(2, '0')}/${String(Math.floor(ymd / 100) % 100).padStart(2, '0')}/${Math.floor(ymd / 10000)}`;
