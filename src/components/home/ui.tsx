'use client';
import { useEffect, useState } from 'react';

/**
 * Card da Home. Todos têm a mesma altura (como no CM Tracker); o que não cabe fica em "Ver tudo",
 * que abre uma janela com a lista completa.
 */
export function Card({ title, help, wave, empty, className = '', action, children, more, wide }: {
  title: string; help?: string; wave?: number; empty?: string; className?: string; action?: React.ReactNode; children?: React.ReactNode;
  /** Conteúdo completo mostrado na janela "Ver tudo". */
  more?: React.ReactNode | (() => React.ReactNode);
  /** Cards largos (linha inteira) crescem com o conteúdo. */
  wide?: boolean;
}) {
  const [tip, setTip] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <section className={`relative flex h-full flex-col rounded-[10px] px-[18px] pb-[18px] pt-4 ${wide ? 'min-h-[220px]' : 'min-h-[460px] max-h-[560px]'} ${empty ? 'border border-dashed border-[#3a3a3a] bg-transparent' : 'bg-card'} ${className}`}>
      <header className="mb-3 flex shrink-0 items-center gap-2">
        <h3 className="title text-[15px] tracking-[.06em]">{title}</h3>
        {help && (
          <button aria-label="Ajuda" onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)} onClick={() => setTip((v) => !v)}
            className="grid h-4 w-4 place-items-center rounded-full border border-muted text-[10px] text-muted">i</button>
        )}
        <div className="ml-auto">{action}</div>
        {tip && help && (
          <div className="absolute left-4 top-10 z-20 max-w-72 rounded-md border border-line bg-card-2 p-3 text-xs text-[#cfcfd6] shadow-xl">{help}</div>
        )}
      </header>
      <div className={`min-h-0 flex-1 ${wide ? '' : 'overflow-hidden'}`}>
        {empty ? (
          <div className="grid h-full min-h-40 place-items-center text-center text-sm text-muted">
            <div>
              <div className="mb-2 text-2xl">⧗</div>
              <p>{empty}</p>
              {wave && <p className="mt-1 text-xs">Chega na onda {wave} da Home.</p>}
            </div>
          </div>
        ) : children}
      </div>
      {more && !empty && (
        <button onClick={() => setOpen(true)} className="title mt-3 self-start rounded-md border border-line px-3 py-1.5 text-[12px] text-link hover:bg-[#232323]">Ver tudo ›</button>
      )}
      {open && <Modal title={title} onClose={() => setOpen(false)}>{typeof more === 'function' ? more() : more}</Modal>}
    </section>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-4xl overflow-y-auto border-l border-line bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center">
          <h2 className="title text-lg">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="ml-auto rounded px-2 text-xl text-muted hover:text-white">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Tabela simples para as janelas "Ver tudo". */
export function Table({ head, rows, align }: { head: React.ReactNode[]; rows: React.ReactNode[][]; align?: ('l' | 'r')[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-[11px] uppercase text-muted">
          {head.map((h, i) => <th key={i} className={`px-2 py-1.5 font-semibold ${align?.[i] === 'r' ? 'text-right' : ''}`}>{h}</th>)}
        </tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i} className="border-b border-line/50 hover:bg-card-2">
            {r.map((c, j) => <td key={j} className={`px-2 py-1.5 ${align?.[j] === 'r' ? 'text-right tabular-nums' : ''}`}>{c}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/** Abas pequenas (ex.: Gols / Assist.). */
export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={`rounded px-2 py-0.5 text-xs ${o.id === value ? 'bg-accent text-black' : 'bg-card-2 text-muted hover:text-white'}`}>{o.label}</button>
      ))}
    </div>
  );
}

/** Escala de cor do rating: verde forte 80+, verde 75+, amarelo 70+, âmbar 61+, laranja 50+, vermelho abaixo. */
export const ratingColor = (v: number) => (v >= 80 ? '#12eb83' : v >= 75 ? '#14b341' : v >= 70 ? '#ffd200' : v >= 61 ? '#ffb020' : v >= 50 ? '#ff860a' : '#ff6460');

export function Ovr({ v, size = 'sm' }: { v: number; size?: 'sm' | 'lg' }) {
  return <span style={{ background: ratingColor(v) }} className={`num inline-grid place-items-center rounded-[5px] font-bold text-[#0b0b0b] ${size === 'lg' ? 'h-9 min-w-11 px-2 text-xl' : 'h-6 min-w-8 px-1 text-[13px]'}`}>{v}</span>;
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

const initials = (name: string) => name.replace(/^(Jogador )?#\d+$/, '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

/** Foto/escudo com reserva: se a imagem não existir ou falhar ao carregar, mostra as iniciais. */
export function Pic({ src, name, size = 28, round = true }: { src?: string; name: string; size?: number; round?: boolean }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, fontSize: Math.max(9, size * 0.38) };
  if (!src || broken)
    return <span className={`inline-grid shrink-0 place-items-center bg-card-2 font-semibold text-muted ${round ? 'rounded-full' : 'rounded'}`} style={style}>{initials(name)}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className={`shrink-0 ${round ? 'rounded-full bg-card-2 object-cover' : 'object-contain'}`} style={style} />;
}

export const timeBr = (hhmm: number) => `${String(Math.floor(hhmm / 100)).padStart(2, '0')}:${String(hhmm % 100).padStart(2, '0')}`;
