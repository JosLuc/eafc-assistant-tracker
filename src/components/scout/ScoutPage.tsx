'use client';
import { useEffect, useMemo, useState } from 'react';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import type { PlayerDb } from '@/lib/career/playerdb';
import { POS, posLabel } from '@/lib/career/positions';
import { EMPTY, RANGE, RANGES, activeCount, derive, rangeValue, runScout, type Group, type ScoutFilter } from '@/lib/career/scout';
import { useEa, useEaMeta } from '../home/names';
import { Ovr, Pic, money } from '../home/ui';
import { useHub } from '../drawer/kit';

/**
 * Aba Scout: busca em todos os jogadores do save (≈22 mil) com filtros por faixa, posições com Ou/E,
 * chips removíveis, filtros salvos, colunas configuráveis, CSV da página e paginação 15/25/50.
 */
type P = { s: CareerSnapshot; db: PlayerDb | null };

type Col = { key: string; label: string; title: string; num: (i: number) => number; show: (i: number) => React.ReactNode; badge?: boolean; csv?: (i: number) => string | number };

const POS_PICK = [0, 5, 3, 7, 2, 8, 10, 14, 12, 16, 18, 23, 27, 21, 25];
const FOOT = ['', 'Direito', 'Esquerdo'];
const DEFAULT_COLS = ['overallrating', 'potential', 'age', 'pacdiv', 'shohan', 'paskic', 'driref', 'defspe', 'phypos', 'dribbling', 'value', 'wage'];
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function ScoutPage({ s, db }: P) {
  const { openPlayer } = useHub();
  const d = useMemo(() => (db ? derive(db) : null), [db]);
  const meta = useEaMeta();
  const [f, setF] = useState<ScoutFilter>(EMPTY);
  const [q, setQ] = useState('');
  const [nameIds, setNameIds] = useState<Set<number> | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'overallrating', dir: -1 });
  const [per, setPer] = useState(25);
  const [page, setPage] = useState(0);
  const [cols, setCols] = useState<string[]>(DEFAULT_COLS);
  const [saved, setSaved] = useState<{ name: string; f: ScoutFilter }[]>([]);
  const [find, setFind] = useState('');
  const [open, setOpen] = useState<Record<Group, boolean>>({ geral: true, atributos: false, aparencia: false });
  const [colMenu, setColMenu] = useState(false);
  const [savedMenu, setSavedMenu] = useState(false);
  const [goto, setGoto] = useState('');

  useEffect(() => { setCols(load('fc27:scout:cols', DEFAULT_COLS)); setPer(load('fc27:scout:per', 25)); setSaved(load('fc27:scout:saved', [])); }, []);

  // Busca por nome: a base da EA (no servidor) + os nomes que o save guarda (jogadores gerados).
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) { setNameIds(null); return; }
    const local = Object.entries(s.names ?? {}).filter(([, n]) => norm(n).includes(norm(text))).map(([id]) => Number(id));
    setNameIds(new Set(local));
    const t = setTimeout(() => {
      fetch(`/api/ea?q=${encodeURIComponent(text)}`).then((r) => r.json()).then((j: { ids: number[] }) => setNameIds(new Set([...local, ...j.ids]))).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q, s.names]);

  const generatedIds = useMemo(() => new Set(Object.keys(s.names ?? {}).map(Number)), [s.names]);
  const set = (patch: Partial<ScoutFilter>) => { setF((x) => ({ ...x, ...patch })); setPage(0); };
  const setRange = (k: string, i: 0 | 1, v: string) => {
    const cur = f.ranges[k] ?? [null, null];
    const n = v === '' ? null : Number(v);
    const next: [number | null, number | null] = i === 0 ? [n, cur[1]] : [cur[0], n];
    set({ ranges: { ...f.ranges, [k]: next } });
  };

  const C: Col[] = useMemo(() => {
    if (!db || !d) return [];
    const c = db.cols;
    const r = (key: string, label: string, title: string, badge = true): Col => ({ key, label, title, badge, num: (i) => rangeValue(db, d, key, i), show: (i) => rangeValue(db, d, key, i) });
    return [
      r('overallrating', 'OVR', 'Overall'), r('potential', 'POT', 'Potencial'), r('age', 'IDA', 'Idade', false),
      r('pacdiv', 'RIT', 'Ritmo (ou Elasticidade, no goleiro)'), r('shohan', 'FIN', 'Finalização (ou Manejo)'), r('paskic', 'PAS', 'Passe (ou Chute)'),
      r('driref', 'DRI', 'Drible (ou Reflexos)'), r('defspe', 'DEF', 'Defesa (ou Velocidade)'), r('phypos', 'FÍS', 'Físico (ou Posicionamento)'),
      r('dribbling', 'DRB', 'Atributo Drible'),
      { key: 'value', label: 'VAL', title: 'Valor de mercado (~ = estimado)', num: (i) => d.value[i]!, show: (i) => <span className={d.estimated[i] ? 'text-muted' : 'font-semibold'}>{d.estimated[i] ? '~' : ''}{money(d.value[i]!)}</span>, csv: (i) => d.value[i]! },
      { key: 'wage', label: 'SAL', title: 'Salário por semana', num: (i) => c.wage![i]!, show: (i) => money(c.wage![i]!), csv: (i) => c.wage![i]! },
      r('growth', 'CRE', 'Crescimento (POT − OVR)', false), r('total', 'TOT', 'Total de atributos', false),
      r('skillmoves', 'DRI★', 'Dribles (estrelas)', false), r('weakfootabilitytypecode', 'PÉ★', 'Pé ruim (estrelas)', false),
      r('internationalrep', 'REP', 'Reputação internacional', false), r('height', 'ALT', 'Altura (cm)', false), r('weight', 'PES', 'Peso (kg)', false),
      r('contractvaliduntil', 'CONT', 'Contrato até', false),
      { key: 'releaseclause', label: 'MULTA', title: 'Multa rescisória', num: (i) => c.releaseclause![i]!, show: (i) => (c.releaseclause![i]! > 0 ? money(c.releaseclause![i]!) : '—'), csv: (i) => c.releaseclause![i]! },
      { key: 'team', label: 'CLUBE', title: 'Clube', num: (i) => c.team![i]!, show: (i) => db.teams[c.team![i]!] ?? '—', csv: (i) => db.teams[c.team![i]!] ?? '' },
      { key: 'league', label: 'LIGA', title: 'Liga', num: (i) => db.leagueOfTeam[c.team![i]!] ?? 0, show: (i) => db.leagues[db.leagueOfTeam[c.team![i]!]!] ?? '—', csv: (i) => db.leagues[db.leagueOfTeam[c.team![i]!]!] ?? '' },
    ];
  }, [db, d]);

  const rows = useMemo(() => {
    if (!db || !d) return [];
    const list = runScout(db, d, f, { nameIds, generatedIds });
    const col = C.find((x) => x.key === sort.key);
    if (col) list.sort((a, b) => (col.num(a) - col.num(b)) * sort.dir || db.cols.overallrating![b]! - db.cols.overallrating![a]!);
    return list;
  }, [db, d, f, nameIds, generatedIds, sort, C]);

  const pages = Math.max(1, Math.ceil(rows.length / per));
  const pg = Math.min(page, pages - 1);
  const view = rows.slice(pg * per, pg * per + per);
  const pageIds = db ? view.map((i) => db.id[i]!) : [];
  const pageTeams = db ? [...new Set(view.map((i) => db.cols.team![i]!))] : [];
  const ea = useEa(pageIds, pageTeams, s.names);

  if (!db || !d) {
    return <div className="rounded-[10px] bg-card p-8 text-center text-sm text-muted">A Scout usa a base completa de jogadores do save. Envie o save de novo (botão “Enviar save novo”) para ela ser montada neste navegador.</div>;
  }

  const shown = C.filter((c) => cols.includes(c.key));
  const leagues = Object.entries(db.leagues).filter(([id, n]) => n && Object.values(db.leagueOfTeam).includes(Number(id))).sort((a, b) => a[1].localeCompare(b[1]));
  const teams = Object.entries(db.teams).filter(([id]) => f.league == null || db.leagueOfTeam[Number(id)] === f.league).sort((a, b) => a[1].localeCompare(b[1]));
  const match = (label: string) => !find || norm(label).includes(norm(find));

  const usedNations = new Set(db.cols.nationality);
  const nations: [number, string][] = Object.entries(meta?.nations ?? {}).filter(([id]) => usedNations.has(Number(id))).map(([id, n]): [number, string] => [Number(id), n.label]).sort((a, b) => a[1].localeCompare(b[1]));
  // PlayStyle+ por último, depois dos normais, cada grupo em ordem alfabética.
  const styleOpts = Object.entries(meta?.abilities ?? {}).sort((a, b) => Number(a[1].plus) - Number(b[1].plus) || a[1].label.localeCompare(b[1].label));
  const chips: { label: string; clear: () => void }[] = [];
  for (const [k, [a, b]] of Object.entries(f.ranges)) {
    if (a == null && b == null) continue;
    chips.push({ label: `${RANGE[k]?.label}: ${a ?? '…'}–${b ?? '…'}`, clear: () => { const r = { ...f.ranges }; delete r[k]; set({ ranges: r }); } });
  }
  if (f.pos.length) chips.push({ label: `${f.posScope === 'main' ? 'Posição principal' : 'Posição'}: ${f.pos.map(posLabel).join(f.posMode === 'and' ? ' e ' : ' ou ')}`, clear: () => set({ pos: [] }) });
  if (f.gender !== 0) chips.push({ label: `Gênero: ${f.gender === 1 ? 'Feminino' : 'Todos'}`, clear: () => set({ gender: 0 }) });
  if (f.league != null) chips.push({ label: `Liga: ${db.leagues[f.league]}`, clear: () => set({ league: null, team: null }) });
  if (f.team != null) chips.push({ label: `Clube: ${db.teams[f.team]}`, clear: () => set({ team: null }) });
  if (f.foot != null) chips.push({ label: `Pé: ${FOOT[f.foot]}`, clear: () => set({ foot: null }) });
  if (f.retiring != null) chips.push({ label: f.retiring ? 'Aposentando' : 'Não aposenta', clear: () => set({ retiring: null }) });
  if (f.free) chips.push({ label: 'Agentes livres', clear: () => set({ free: false }) });
  if (f.generated) chips.push({ label: 'Jogadores gerados', clear: () => set({ generated: false }) });
  if (f.nation != null) chips.push({ label: `País: ${meta?.nations[f.nation]?.label ?? f.nation}`, clear: () => set({ nation: null }) });
  if (f.styles?.length) chips.push({ label: `PlayStyles: ${f.styles.map((k) => meta?.abilities[k]?.label ?? k).join(f.stylesMode === 'and' ? ' e ' : ' ou ')}`, clear: () => set({ styles: [] }) });

  const csv = () => {
    const head = ['Jogador', 'Posições', 'Clube', ...shown.map((c) => c.title)];
    const lines = view.map((i) => [ea.player(db.id[i]!).name, posList(db, i).map(posLabel).join(' '), db.teams[db.cols.team![i]!] ?? '', ...shown.map((c) => (c.csv ? c.csv(i) : c.num(i)))]);
    const text = [head, ...lines].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = `scout-pagina-${pg + 1}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const Sel = ({ label, value, onChange, options }: { label: string; value: number | null; onChange: (v: number | null) => void; options: [number | string, string][] }) => match(label) ? (
    <label className="block"><span className="mb-1 block text-[12px] text-muted">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className="w-full rounded-md border border-line bg-[#191919] px-2.5 py-2 text-[13px]">
        <option value="">{label}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  ) : null;

  const Range = ({ k }: { k: string }) => {
    const r = RANGE[k]!, [a, b] = f.ranges[k] ?? [null, null];
    if (!match(r.label)) return null;
    return (
      <div><span className="mb-1 block text-[12px] text-muted">{r.label}</span>
        <div className="flex gap-2">
          {[a, b].map((v, i) => (
            <input key={i} type="number" inputMode="numeric" placeholder={String(i ? r.max : r.min)} defaultValue={v ?? ''} min={r.min} max={r.max}
              onBlur={(e) => setRange(k, i as 0 | 1, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="num w-full rounded-md border border-line bg-[#191919] px-2.5 py-1.5 text-[13px] placeholder:text-[#555]" />
          ))}
        </div>
      </div>
    );
  };

  const Acc = ({ g, label, children }: { g: Group; label: string; children: React.ReactNode }) => (
    <div className="rounded-lg border border-line">
      <button onClick={() => setOpen((o) => ({ ...o, [g]: !o[g] }))} className="title flex w-full items-center justify-between px-3 py-3 text-[14px]">{label}<span className="text-muted">{open[g] || find ? '▴' : '▾'}</span></button>
      {(open[g] || find) && <div className="space-y-3 border-t border-line px-3 py-3">{children}</div>}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[290px_1fr]">
      {/* Painel de filtros */}
      <aside className="rounded-[10px] bg-card p-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
        <h2 className="title mb-3 text-[15px]">Buscar jogadores</h2>
        <div className="relative">
          <button onClick={() => setSavedMenu((v) => !v)} className="flex w-full items-center gap-2 rounded-md border border-line px-3 py-2 text-[13px] hover:bg-[#232323]">☆ Filtros salvos <span className="ml-auto text-faint">{saved.length}</span></button>
          {savedMenu && (
            <div className="absolute inset-x-0 top-11 z-20 space-y-1 rounded-md border border-line bg-[#181818] p-2 text-[13px] shadow-xl">
              {saved.length === 0 && <p className="px-1 py-1 text-muted">Nenhum filtro salvo ainda.</p>}
              {saved.map((x, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button onClick={() => { setF({ ...EMPTY, ...x.f }); setPage(0); setSavedMenu(false); }} className="flex-1 truncate rounded px-2 py-1 text-left hover:bg-[#232323]">{x.name}</button>
                  <button aria-label="Apagar" onClick={() => { const n = saved.filter((_, j) => j !== i); setSaved(n); save('fc27:scout:saved', n); }} className="px-1 text-faint hover:text-bad">✕</button>
                </div>
              ))}
              {activeCount(f) > 0 && (
                <button onClick={() => { const name = prompt('Nome do filtro'); if (!name) return; const n = [...saved, { name, f }]; setSaved(n); save('fc27:scout:saved', n); }}
                  className="mt-1 w-full rounded bg-accent px-2 py-1.5 font-semibold text-white">Salvar filtro atual</button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 flex items-center justify-between"><span className="label">Filtros aplicados</span>{chips.length > 0 && <button onClick={() => { setF(EMPTY); setPage(0); }} className="text-[12px] text-link hover:underline">Limpar</button>}</div>
          {chips.length === 0 ? <p className="text-[13px] text-muted">Nenhum ainda. Escolha um filtro abaixo.</p> : (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => <button key={c.label} onClick={c.clear} className="rounded-full border border-accent/60 bg-accent/15 px-2.5 py-1 text-[12px] hover:bg-accent/25">{c.label} ✕</button>)}
            </div>
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 rounded-md border border-line bg-[#191919] px-3 py-2 text-[13px] text-muted">
          <span>⌕</span><input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Encontrar um filtro" className="w-full bg-transparent text-white outline-none placeholder:text-muted" />
        </label>

        <div className="mt-3 space-y-3">
          <Acc g="geral" label="Geral">
            <Sel label="Gênero" value={f.gender} onChange={(v) => set({ gender: v })} options={[[0, 'Masculino'], [1, 'Feminino']]} />
            <Sel label="Liga" value={f.league} onChange={(v) => set({ league: v, team: null })} options={leagues} />
            <Sel label="Clube" value={f.team} onChange={(v) => set({ team: v })} options={teams} />
            <Sel label="Pé preferido" value={f.foot} onChange={(v) => set({ foot: v })} options={[[1, 'Direito'], [2, 'Esquerdo']]} />
            <Sel label="Aposentando" value={f.retiring} onChange={(v) => set({ retiring: v })} options={[[1, 'Sim'], [0, 'Não']]} />
            <Sel label="Nacionalidade" value={f.nation} onChange={(v) => set({ nation: v })} options={nations} />
            {match('PlayStyles') && styleOpts.length > 0 && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[12px] text-muted">
                  <span>PlayStyles</span>
                  <span className="flex gap-1">
                    {(['or', 'and'] as const).map((x) => <button key={x} onClick={() => set({ stylesMode: x })} className={`rounded px-1.5 py-0.5 ${f.stylesMode === x ? 'bg-accent text-white' : 'border border-line'}`}>{x === 'or' ? 'Ou' : 'E'}</button>)}
                  </span>
                </div>
                <select value="" onChange={(e) => e.target.value && set({ styles: [...new Set([...(f.styles ?? []), e.target.value])] })} className="w-full rounded-md border border-line bg-[#191919] px-2.5 py-2 text-[13px]">
                  <option value="">Adicionar PlayStyle</option>
                  {styleOpts.map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
                </select>
                {(f.styles ?? []).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {f.styles.map((k) => <button key={k} onClick={() => set({ styles: f.styles.filter((x) => x !== k) })} className={`rounded px-2 py-0.5 text-[11px] font-semibold ${meta?.abilities[k]?.plus ? 'bg-[#ffd200] text-[#111]' : 'bg-accent text-white'}`}>{meta?.abilities[k]?.label ?? k} ✕</button>)}
                  </div>
                )}
              </div>
            )}
            {match('Posições') && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[12px] text-muted">
                  <span>Posições</span>
                  <span className="flex gap-1">
                    {(['any', 'main'] as const).map((x) => <button key={x} onClick={() => set({ posScope: x })} className={`rounded px-1.5 py-0.5 ${f.posScope === x ? 'bg-accent text-white' : 'border border-line'}`}>{x === 'any' ? 'Qualquer' : 'Principal'}</button>)}
                    {(['or', 'and'] as const).map((x) => <button key={x} onClick={() => set({ posMode: x })} className={`rounded px-1.5 py-0.5 ${f.posMode === x ? 'bg-accent text-white' : 'border border-line'}`}>{x === 'or' ? 'Ou' : 'E'}</button>)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {POS_PICK.map((p) => {
                    const on = f.pos.includes(p);
                    return <button key={p} onClick={() => set({ pos: on ? f.pos.filter((x) => x !== p) : [...f.pos, p] })} className={`w-11 rounded py-1 text-[11px] font-semibold ${on ? 'bg-accent text-white' : 'bg-[#232323] text-muted hover:text-white'}`}>{POS[p]}</button>;
                  })}
                </div>
              </div>
            )}
            {RANGES.filter((r) => r.group === 'geral').map((r) => <Range key={r.key + JSON.stringify(f.ranges[r.key] ?? null)} k={r.key} />)}
          </Acc>
          <Acc g="atributos" label="Atributos">
            {RANGES.filter((r) => r.group === 'atributos').map((r) => (
              <div key={r.key}>
                {r.sub && match(r.label) && <div className="label mb-1 mt-2 !text-[10px]">{r.sub}</div>}
                <Range key={r.key + JSON.stringify(f.ranges[r.key] ?? null)} k={r.key} />
              </div>
            ))}
          </Acc>
          <Acc g="aparencia" label="Aparência">
            {RANGES.filter((r) => r.group === 'aparencia').map((r) => <Range key={r.key + JSON.stringify(f.ranges[r.key] ?? null)} k={r.key} />)}
          </Acc>
        </div>
      </aside>

      {/* Resultados */}
      <div className="min-w-0 space-y-3">
        <label className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-[14px] text-muted">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Buscar jogadores pelo nome" className="w-full bg-transparent text-white outline-none placeholder:text-muted" />
          <span>⌕</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => set({ free: !f.free })} className={`rounded-full border px-3 py-1 text-[12px] ${f.free ? 'border-accent bg-accent/20 text-white' : 'border-line text-muted hover:text-white'}`}>Agentes livres</button>
          <button onClick={() => set({ generated: !f.generated })} className={`rounded-full border px-3 py-1 text-[12px] ${f.generated ? 'border-accent bg-accent/20 text-white' : 'border-line text-muted hover:text-white'}`}>Jogadores gerados</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2"><span className="title num text-[20px]">{rows.length.toLocaleString('pt-BR')}</span> <span className="text-[13px] text-muted">jogadores</span></span>
          <div className="relative">
            <button onClick={() => setColMenu((v) => !v)} className="rounded-md border border-line px-3 py-1.5 text-[13px] hover:bg-[#232323]">▥ Colunas <span className="text-faint">{shown.length + 1}</span></button>
            {colMenu && (
              <div className="absolute left-0 top-10 z-20 grid w-64 grid-cols-1 gap-1 rounded-md border border-line bg-[#181818] p-2 text-[13px] shadow-xl">
                {C.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-[#232323]">
                    <input type="checkbox" className="accent-[#5865f2]" checked={cols.includes(c.key)} onChange={(e) => { const n = e.target.checked ? [...cols, c.key] : cols.filter((x) => x !== c.key); const ord = C.map((x) => x.key).filter((k) => n.includes(k)); setCols(ord); save('fc27:scout:cols', ord); }} />
                    <span className="w-12 font-semibold">{c.label}</span><span className="truncate text-muted">{c.title}</span>
                  </label>
                ))}
                <button onClick={() => { setCols(DEFAULT_COLS); save('fc27:scout:cols', DEFAULT_COLS); }} className="mt-1 text-left text-[12px] text-link hover:underline">Restaurar padrão</button>
              </div>
            )}
          </div>
          <button onClick={csv} className="rounded-md border border-line px-3 py-1.5 text-[13px] hover:bg-[#232323]">⇩ CSV <span className="text-faint">· esta página</span></button>
          <span className="ml-auto flex items-center gap-2 text-[13px] text-muted">
            <span className="num">{rows.length ? pg * per + 1 : 0}–{Math.min(rows.length, pg * per + per)} de {rows.length.toLocaleString('pt-BR')}</span>
            <button disabled={pg === 0} onClick={() => setPage(pg - 1)} className="px-1.5 disabled:opacity-30">‹</button>
            <button disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} className="px-1.5 disabled:opacity-30">›</button>
          </span>
        </div>

        <div className="overflow-x-auto rounded-[10px] bg-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-[.06em] text-muted">
                <th className="px-3 py-3 text-left font-semibold">Jogador</th>
                {shown.map((c) => (
                  <th key={c.key} title={c.title} className="px-1.5 py-3 text-center font-semibold">
                    <button onClick={() => { setSort((x) => ({ key: c.key, dir: x.key === c.key ? (x.dir === 1 ? -1 : 1) : -1 })); setPage(0); }}
                      className={`title whitespace-nowrap border-b-2 pb-1 ${sort.key === c.key ? 'border-accent text-white' : 'border-transparent hover:text-white'}`}>
                      {c.label} {sort.key === c.key ? (sort.dir === -1 ? '↓' : '↑') : '⇅'}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((i) => {
                const id = db.id[i]!, p = ea.player(id), team = db.cols.team![i]!, ps = posList(db, i);
                return (
                  <tr key={id} className="border-b border-line/60 last:border-0 hover:bg-[#232323]">
                    <td className="px-3 py-2">
                      <span className="flex min-w-[210px] items-center gap-3">
                        <Pic src={p.avatar} name={p.name} size={40} />
                        <span className="min-w-0">
                          <button onClick={() => openPlayer?.(id)} className={`block truncate text-left font-semibold hover:text-link hover:underline ${team === s.club.id ? 'text-link' : ''}`}>{p.name}</button>
                          <span className="flex items-center gap-1.5 text-[11px] text-muted">
                            {meta?.nations[db.cols.nationality![i]!]?.flag && <img src={meta.nations[db.cols.nationality![i]!]!.flag} alt="" title={meta.nations[db.cols.nationality![i]!]!.label} className="h-2.5 w-3.5 rounded-[1px] object-cover" />}
                            <Pic src={ea.crest(team)} name={db.teams[team] ?? '?'} size={14} round={false} />
                            <span className="font-semibold text-white">{posLabel(ps[0]!)}</span>{ps.slice(1).map((x) => <span key={x}>{posLabel(x)}</span>)}
                          </span>
                        </span>
                      </span>
                    </td>
                    {shown.map((c) => <td key={c.key} className="num px-1.5 py-2 text-center">{c.badge ? <span className="inline-flex justify-center"><Ovr v={c.num(i)} /></span> : c.show(i)}</td>)}
                  </tr>
                );
              })}
              {view.length === 0 && <tr><td colSpan={shown.length + 1} className="px-3 py-10 text-center text-muted">Nenhum jogador com esses filtros.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted">
          <span>Por página</span>
          {[15, 25, 50].map((n) => <button key={n} onClick={() => { setPer(n); setPage(0); save('fc27:scout:per', n); }} className={`rounded px-2 py-1 ${per === n ? 'bg-accent text-white' : 'border border-line hover:text-white'}`}>{n}</button>)}
          <span className="ml-auto flex items-center gap-1">
            {pageButtons(pg, pages).map((x, k) => x < 0 ? <span key={k} className="px-1">…</span> : (
              <button key={k} onClick={() => setPage(x)} className={`num min-w-8 rounded px-2 py-1 ${x === pg ? 'bg-accent text-white' : 'hover:text-white'}`}>{x + 1}</button>
            ))}
            <input value={goto} onChange={(e) => setGoto(e.target.value)} placeholder="Página" className="num ml-2 w-20 rounded-md border border-line bg-[#191919] px-2 py-1 text-white" />
            <button onClick={() => { const n = Number(goto); if (n >= 1 && n <= pages) setPage(n - 1); setGoto(''); }} className="rounded-md border border-line px-2 py-1 hover:text-white">Ir</button>
          </span>
        </div>
        <p className="text-[11px] text-faint">Valores com ~ são estimados pelo overall, potencial e idade: o save só guarda o valor dos jogadores que o seu clube acompanha. Nomes e fotos vêm da base da EA; jogadores gerados usam o nome salvo no save.</p>
      </div>
    </div>
  );
}

function posList(db: PlayerDb, i: number): number[] {
  const c = db.cols;
  return [c.preferredposition1![i]!, c.preferredposition2![i]!, c.preferredposition3![i]!, c.preferredposition4![i]!].filter((x, k, a) => x >= 0 && a.indexOf(x) === k);
}

/** 1 2 3 4 … 778 (como no CM Tracker), com a página atual no meio. */
function pageButtons(cur: number, total: number): number[] {
  if (total <= 7) return [...Array(total).keys()];
  const set = new Set([0, total - 1, cur - 1, cur, cur + 1].filter((x) => x >= 0 && x < total));
  if (cur < 3) [1, 2, 3].forEach((x) => set.add(x));
  const list = [...set].sort((a, b) => a - b), out: number[] = [];
  list.forEach((x, k) => { if (k && x - list[k - 1]! > 1) out.push(-1); out.push(x); });
  return out;
}
