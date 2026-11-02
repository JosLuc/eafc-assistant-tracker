'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/** Contexto da tela: temporada (subtítulo das gavetas) e como abrir a página de um jogador. */
export const HubContext = createContext<{ season: string; openPlayer?: (id: number) => void }>({ season: '' });
export const useHub = () => useContext(HubContext);

/** Gaveta lateral de 880px (o "Ver tudo"): ✕ ou Esc fecham, o conteúdo rola dentro dela. */
export function Drawer({ title, onClose, children, icon = '▤' }: { title: string; onClose: () => void; children: React.ReactNode; icon?: string }) {
  const { season } = useHub();
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', on);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', on); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="flex h-full w-full max-w-[880px] flex-col bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center border-b border-line px-5 py-4">
          <h2 className="title text-lg">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="ml-auto grid h-8 w-8 place-items-center rounded-md text-xl text-muted hover:bg-[#232323] hover:text-white">×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">
          {season && <p className="mb-4 flex items-center gap-2 text-[13px] text-muted"><span>{icon}</span><span className="text-white/90">Temporada {season}</span><span>Dados completos do save enviado</span></p>}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Grupo de botões em que um fica marcado (segmented control). */
export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`rounded-md border px-3 py-1.5 text-[13px] ${value === o.id ? 'border-accent bg-accent/15 text-white' : 'border-line bg-[#232323] text-[#d4d4d4] hover:text-white'}`}>{o.label}</button>
      ))}
    </div>
  );
}

export function Search({ value, onChange, placeholder = 'Buscar jogador' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-line bg-[#191919] px-3 py-2 text-[13px] text-muted">
      <span>⌕</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-white outline-none placeholder:text-muted" />
    </label>
  );
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#5865f2]" />{label}</label>;
}

/** Faixa de números grandes (ex.: 6 Crucial · 14 Importante …). Clicável quando onPick é passado. */
export function Kpis({ items, active, onPick }: { items: { id?: string; value: React.ReactNode; label: string }[]; active?: string; onPick?: (id: string) => void }) {
  return (
    <div className="grid overflow-hidden rounded-lg border border-line" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
      {items.map((k, i) => (
        <button key={i} disabled={!onPick || !k.id} onClick={() => k.id && onPick?.(k.id)}
          className={`border-l border-line px-3 py-2 text-left first:border-0 ${active && k.id === active ? 'bg-accent/15' : ''} ${onPick && k.id ? 'hover:bg-[#232323]' : ''}`}>
          <div className="num text-xl font-bold">{k.value}</div><div className="text-[11px] text-muted">{k.label}</div>
        </button>
      ))}
    </div>
  );
}

export interface Col<T> { key: string; label: string; align?: 'l' | 'r' | 'c'; sort?: (r: T) => number | string; render: (r: T) => React.ReactNode; className?: string }

/** Tabela com ordenação em todas as colunas que têm `sort` (⇅; a coluna ativa mostra ↑ ou ↓). */
export function SortTable<T>({ cols, rows, initial, rowKey, highlight, empty = 'Nada para mostrar.' }: {
  cols: Col<T>[]; rows: T[]; initial?: { key: string; dir: 1 | -1 }; rowKey: (r: T) => string | number; highlight?: (r: T) => boolean; empty?: string;
}) {
  const [sort, setSort] = useState(initial);
  const sorted = useMemo(() => {
    const c = cols.find((x) => x.key === sort?.key);
    if (!c?.sort || !sort) return rows;
    return [...rows].sort((a, b) => { const x = c.sort!(a), y = c.sort!(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [rows, cols, sort]);
  const al = (a?: string) => (a === 'r' ? 'text-right' : a === 'c' ? 'text-center' : 'text-left');
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-[13px]">
        <thead className="bg-[#191919]">
          <tr className="text-[11px] uppercase tracking-wide text-muted">
            {cols.map((c) => (
              <th key={c.key} className={`whitespace-nowrap px-3 py-2.5 font-semibold ${al(c.align)}`}>
                {c.sort ? (
                  <button className={`uppercase ${sort?.key === c.key ? 'text-white' : 'hover:text-white'}`}
                    onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: typeof c.sort!(rows[0]!) === 'string' ? 1 : -1 }))}>
                    {c.label} <span className="text-[10px]">{sort?.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : '⇅'}</span>
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} className={`border-t border-line ${highlight?.(r) ? 'bg-accent/15' : ''}`}>
              {cols.map((c) => <td key={c.key} className={`whitespace-nowrap px-3 py-2 tabular-nums ${al(c.align)} ${c.className ?? ''}`}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <h4 className="label mb-2 mt-6">{children}</h4>;
}

/** Gavetas por título de card: quando existe, o "Ver tudo" do card abre esta gaveta (no lugar da lista simples). */
export const DrawerRegistry = createContext<Record<string, { title: string; render: () => React.ReactNode }>>({});
