'use client';
import { Fragment, useMemo, useState } from 'react';
import type { CareerSnapshot, SquadPlayer, StatLine } from '@/lib/career/snapshot';
import { posLabel, type Line } from '@/lib/career/positions';
import { Ovr, Pic, dateBr, money } from '../home/ui';
import { StartingXI } from '../home/widgets';
import type { Ea } from '../home/names';

/**
 * Aba Elenco: tabela agrupada por linha, com ordenação dentro do grupo, estatísticas por competição
 * na linha expandida, vista em cartas e uma coluna lateral com escalação, bolas paradas e força do clube.
 * Inspirada na organização do CM Tracker, montada com os dados do save.
 */
type P = { s: CareerSnapshot; ea: Ea };
export type SortKey = 'age' | 'ovr' | 'pot' | 'value' | 'wage';
export const GROUPS: { line: Line; label: string }[] = [
  { line: 'GOL', label: 'Goleiros' }, { line: 'DEF', label: 'Defensores' }, { line: 'MEI', label: 'Meio-campistas' }, { line: 'ATA', label: 'Atacantes' },
];
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'age', label: 'Idade' }, { key: 'ovr', label: 'OVR' }, { key: 'pot', label: 'POT' }, { key: 'value', label: 'Valor' }, { key: 'wage', label: 'Salário' },
];
const sortVal = (p: SquadPlayer, k: SortKey) => (k === 'value' ? p.value ?? 0 : p[k]);
const monthYear = (y: number) => `jun/${y}`;
const ROLE = ['', 'Crucial', 'Importante', 'Rodízio', 'Esporádico', 'Promessa'];

export function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div><div className="title text-xl">{value}</div></div>;
}

function useTakers(s: CareerSnapshot) {
  return useMemo(() => {
    const t = s.tactic, tags = new Map<number, string[]>();
    if (!t) return tags;
    const add = (id: number, tag: string) => { if (id > 0) tags.set(id, [...(tags.get(id) ?? []), tag]); };
    add(t.penalties, 'PEN'); add(t.freeKickL, 'FE'); add(t.freeKickR, 'FD'); add(t.longKick, 'FL'); add(t.cornerL, 'EE'); add(t.cornerR, 'ED');
    return tags;
  }, [s.tactic]);
}

/** Linhas de estatística da temporada por competição para um jogador. */
function statsOf(s: CareerSnapshot, id: number) {
  return (s.stats ?? []).map((c) => ({ comp: c.competition, line: c.players.find((x) => x.playerId === id) })).filter((x): x is { comp: string; line: StatLine } => !!x.line);
}

function StatsRow({ s, p, cols }: { s: CareerSnapshot; p: SquadPlayer; cols: number }) {
  const rows = statsOf(s, p.id);
  const total = rows.reduce((a, { line: x }) => ({ apps: a.apps + x.apps, goals: a.goals + x.goals, assists: a.assists + x.assists, cs: a.cs + x.cleanSheets, y: a.y + x.yellows, min: a.min + x.minutes, potm: a.potm + x.potm, r: a.r + x.avgRating * x.apps }), { apps: 0, goals: 0, assists: 0, cs: 0, y: 0, min: 0, potm: 0, r: 0 });
  const last = p.lastSeason ?? [];
  const head = ['Competição', 'J', 'G', 'A', 'SG', 'CA', 'Min', 'MC', 'Nota'];
  const td = 'px-2 py-1 text-right tabular-nums';
  return (
    <tr className="bg-[#161617]">
      <td colSpan={cols} className="px-3 pb-3 pt-1">
        {rows.length ? (
          <table className="w-full text-xs">
            <thead><tr className="text-[10px] uppercase tracking-wide text-muted">{head.map((h, i) => <th key={h} className={`px-2 py-1 font-semibold ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(({ comp, line: x }) => (
                <tr key={comp} className="border-t border-line"><td className="px-2 py-1 font-semibold">{comp}</td><td className={td}>{x.apps}</td><td className={td}>{x.goals}</td><td className={td}>{x.assists}</td><td className={td}>{p.line === 'GOL' ? x.cleanSheets : '—'}</td><td className={td}>{x.yellows}</td><td className={td}>{x.minutes}</td><td className={td}>{x.potm}</td><td className={td}>{x.avgRating ? x.avgRating.toFixed(2).replace('.', ',') : '—'}</td></tr>
              ))}
              {rows.length > 1 && <tr className="border-t border-line font-semibold"><td className="px-2 py-1">Total</td><td className={td}>{total.apps}</td><td className={td}>{total.goals}</td><td className={td}>{total.assists}</td><td className={td}>{p.line === 'GOL' ? total.cs : '—'}</td><td className={td}>{total.y}</td><td className={td}>{total.min}</td><td className={td}>{total.potm}</td><td className={td}>{total.apps ? (total.r / total.apps).toFixed(2).replace('.', ',') : '—'}</td></tr>}
            </tbody>
          </table>
        ) : <p className="py-1 text-xs text-muted">Sem jogos nesta temporada.</p>}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted">
          {p.formScore != null && <span>Forma <b className="text-white">{p.formScore}</b>{p.recentRatings?.some((x) => x > 0) && <> · últimas notas {p.recentRatings.filter((x) => x > 0).slice(-5).map((x) => x.toFixed(1).replace('.', ',')).join(' · ')}</>}</span>}
          {(p.ovrForm || p.ovrFatigue) ? <span>OVR agora: forma {p.ovrForm! > 0 ? '+' : ''}{p.ovrForm ?? 0} · cansaço {p.ovrFatigue ?? 0}</span> : null}
          {p.morale != null && <span>Moral <b className="text-white">{p.morale}</b></span>}
          {p.condition != null && <span>Condição <b className="text-white">{p.condition}%</b></span>}
          {last.length > 0 && <span>Temporada passada: <b className="text-white">{last.reduce((a, c) => a + c.apps, 0)} J · {last.reduce((a, c) => a + c.goals, 0)} G · {last.reduce((a, c) => a + c.assists, 0)} A</b></span>}
        </div>
      </td>
    </tr>
  );
}

function SquadTable({ s, ea, sort, setSort, open, toggle }: P & { sort: SortKey; setSort: (k: SortKey) => void; open: Set<number>; toggle: (id: number) => void }) {
  const tags = useTakers(s);
  const captain = s.tactic?.captain ?? s.club.captainId;
  const xi = new Set((s.tactic?.players ?? []).map((p) => p.playerId));
  const inXi = (p: SquadPlayer) => (xi.size ? xi.has(p.id) : p.slot < 28);
  const slotOf = new Map((s.tactic?.players ?? []).map((p) => [p.playerId, p.pos]));
  const head = ['#', 'Jogador', 'Pos', 'Papel', 'Idade', 'OVR', 'POT', 'Valor', 'Salário', 'Contrato', 'Forma', ''];
  const sortable: Record<string, SortKey> = { Idade: 'age', OVR: 'ovr', POT: 'pot', Valor: 'value', Salário: 'wage' };
  const COLS = head.length;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
            {head.map((h, i) => {
              const k = sortable[h];
              return <th key={i} className={`px-2 py-2 font-semibold ${i <= 1 ? 'text-left' : i >= 4 ? 'text-right' : 'text-left'}`}>
                {k ? <button onClick={() => setSort(k)} className={`uppercase ${sort === k ? 'text-white' : 'hover:text-white'}`}>{h}{sort === k ? ' ▼' : ''}</button> : h}
              </th>;
            })}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((g) => {
            const list = s.squad.filter((p) => p.line === g.line).sort((a, b) => sortVal(b, sort) - sortVal(a, sort) || b.ovr - a.ovr);
            if (!list.length) return null;
            const avg = (list.reduce((a, p) => a + p.ovr, 0) / list.length).toFixed(1).replace('.', ',');
            return (
              <Fragment key={g.line}>
                <tr className="bg-card-2"><td colSpan={COLS} className="px-3 py-2"><div className="flex items-center"><span className="title text-sm">{g.label}</span><span className="ml-auto text-xs text-muted">{list.length} jogadores · {list.filter(inXi).length} no XI · OVR médio <b className="text-white">{avg}</b></span></div></td></tr>
                {list.map((p) => {
                  const isOpen = open.has(p.id), t = tags.get(p.id);
                  return (
                    <Fragment key={p.id}>
                      <tr onClick={() => toggle(p.id)} className={`cursor-pointer border-t border-line hover:bg-card-2 ${isOpen ? 'bg-card-2' : ''}`}>
                        <td className="px-2 py-1.5 text-muted tabular-nums">{p.jersey || '—'}</td>
                        <td className="px-2 py-1.5">
                          <span className="flex items-center gap-2">
                            <Pic src={ea.player(p.id).avatar} name={ea.player(p.id).name} size={28} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1 font-semibold">{ea.player(p.id).short}{p.id === captain && <span className="rounded border border-muted px-1 text-[9px] leading-tight text-muted">C</span>}{p.injured && <span className="text-[11px] text-bad" title="Lesionado">✚</span>}</span>
                              {(p.altPos.length > 0 || t) && <span className="block text-[11px] text-muted">{p.altPos.length > 0 && `Também ${p.altPos.map(posLabel).join(' · ')}`}{t && <span className="ml-1 text-accent">{t.join(' ')}</span>}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="px-2 py-1.5 font-semibold">{posLabel(p.pos)}</td>
                        <td className="px-2 py-1.5">{inXi(p) ? <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold" title={slotOf.has(p.id) ? `Titular: ${posLabel(slotOf.get(p.id)!)}` : 'Titular'}>XI</span> : <span className="text-xs text-muted">{p.role ? ROLE[p.role] : 'Banco'}</span>}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{p.age}</td>
                        <td className="px-2 py-1.5 text-right"><Ovr v={p.ovr} /></td>
                        <td className="px-2 py-1.5 text-right"><Ovr v={p.pot} /></td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{p.value != null ? money(p.value) : '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{money(p.wage)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted">{monthYear(p.contractUntil)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{p.formScore ?? '—'}</td>
                        <td className="px-2 py-1.5 text-right text-muted">{isOpen ? '⌃' : '⌄'}</td>
                      </tr>
                      {isOpen && <StatsRow s={s} p={p} cols={COLS} />}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
          <LoanedOut s={s} ea={ea} cols={COLS} />
        </tbody>
      </table>
    </div>
  );
}

function LoanedOut({ s, ea, cols }: P & { cols: number }) {
  const out = (s.loans ?? []).filter((l) => l.dir === 'out');
  if (!out.length) return null;
  return (
    <>
      <tr className="bg-card-2"><td colSpan={cols} className="px-3 py-2"><div className="flex items-center"><span className="title text-sm">Emprestados</span><span className="ml-auto text-xs text-muted">{out.length} jogadores</span></div></td></tr>
      {out.map((l) => (
        <tr key={l.playerId} className="border-t border-line">
          <td className="px-2 py-1.5 text-muted">—</td>
          <td className="px-2 py-1.5"><span className="flex items-center gap-2"><Pic src={ea.player(l.playerId).avatar} name={ea.player(l.playerId).name} size={28} /><span><span className="block font-semibold">{ea.player(l.playerId).short}</span><span className="block text-[11px] text-muted">No {l.clubName} até {dateBr(l.until)}</span></span></span></td>
          <td className="px-2 py-1.5 font-semibold">{posLabel(l.pos)}</td>
          <td className="px-2 py-1.5 text-xs text-muted">Emprestado</td>
          <td className="px-2 py-1.5 text-right tabular-nums">{l.age || '—'}</td>
          <td className="px-2 py-1.5 text-right">{l.ovr > 0 ? <Ovr v={l.ovr} /> : '—'}</td>
          <td colSpan={cols - 6} className="px-2 py-1.5 text-right text-xs text-muted">{l.buyOption != null ? `Opção de compra ${money(l.buyOption)}` : ''}</td>
        </tr>
      ))}
    </>
  );
}

function SquadCards({ s, ea, sort }: P & { sort: SortKey }) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const list = s.squad.filter((p) => p.line === g.line).sort((a, b) => sortVal(b, sort) - sortVal(a, sort) || b.ovr - a.ovr);
        if (!list.length) return null;
        return (
          <div key={g.line}>
            <div className="title mb-2 text-sm">{g.label}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((p) => (
                <div key={p.id} className="rounded-lg border border-line bg-card p-3 text-center">
                  <div className="flex items-center justify-between"><Ovr v={p.ovr} /><span className="text-xs font-semibold text-muted">{posLabel(p.pos)}</span><Ovr v={p.pot} /></div>
                  <div className="my-2 flex justify-center"><Pic src={ea.player(p.id).avatar} name={ea.player(p.id).name} size={56} /></div>
                  <div className="text-[11px] text-muted">#{p.jersey || '—'}</div>
                  <div className="truncate font-semibold">{ea.player(p.id).short}</div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted"><span>{p.age} anos</span><span>{p.value != null ? money(p.value) : '—'}</span><span>{money(p.wage)}</span></div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SetPiecesBox({ s, ea }: P) {
  const t = s.tactic;
  const byId = new Map(s.squad.map((p) => [p.id, p]));
  const rows: [string, number][] = t
    ? [['Capitão', t.captain], ['Pênaltis', t.penalties], ['Faltas E / D', t.freeKickL === t.freeKickR ? t.freeKickL : t.freeKickL], ['Faltas longas', t.longKick], ['Escanteio E', t.cornerL], ['Escanteio D', t.cornerR]]
    : [['Capitão', s.club.captainId], ['Pênaltis', s.club.penaltyTakerId], ['Faltas', s.club.freeKickTakerId], ['Escanteios', s.club.cornerTakerId]];
  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h3 className="title mb-2 text-[15px]">Capitão e bolas paradas</h3>
      <ul>{rows.filter(([, id]) => id > 0).map(([label, id]) => (
        <li key={label} className="flex items-center gap-2 border-t border-line py-1.5 text-sm first:border-0">
          <span className="w-24 shrink-0 text-[11px] uppercase text-muted">{label}</span>
          <Pic src={ea.player(id).avatar} name={ea.player(id).name} size={22} />
          <span className="truncate font-semibold">{ea.player(id).short}</span>
          {byId.get(id) && <span className="ml-auto"><Ovr v={byId.get(id)!.ovr} /></span>}
        </li>
      ))}</ul>
    </section>
  );
}

function ClubRatings({ s }: P) {
  const bar = (label: string, v: number) => (
    <div key={label} className="flex items-center gap-3 text-xs"><span className="w-8 font-semibold text-muted">{label}</span><div className="h-2 flex-1 rounded bg-card-2"><div className="h-full rounded bg-good" style={{ width: `${Math.min(100, v)}%` }} /></div><Ovr v={v} /></div>
  );
  const dots = (label: string, v: number) => (
    <div key={label} className="flex items-center gap-2 text-xs"><span className="flex-1 text-muted">{label}</span><span className="flex gap-0.5">{Array.from({ length: 10 }, (_, i) => <span key={i} className={`h-2 w-1.5 rounded-sm ${i < v ? 'bg-white' : 'bg-card-2'}`} />)}</span><b className="w-8 text-right">{v}/10</b></div>
  );
  const c = s.club;
  return (
    <section className="space-y-2 rounded-lg border border-line bg-card p-4">
      <h3 className="title mb-1 text-[15px]">Força do clube</h3>
      {bar('OVR', c.ovr)}{bar('ATA', c.att)}{bar('MEI', c.mid)}{bar('DEF', c.def)}
      <div className="space-y-1.5 border-t border-line pt-2">
        {dots('Prestígio nacional', c.domesticPrestige)}{dots('Prestígio internacional', c.internationalPrestige)}{dots('Popularidade', c.popularity)}{dots('Categoria de base', c.youthDevelopment)}
      </div>
    </section>
  );
}

export function SquadPage({ s, ea }: P) {
  const [sort, setSort] = useState<SortKey>('ovr');
  const [view, setView] = useState<'lista' | 'cartas'>('lista');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const n = s.squad.length;
  const value = s.squad.reduce((a, p) => a + (p.value ?? 0), 0);
  const wages = s.squad.reduce((a, p) => a + p.wage, 0);
  const loaned = (s.loans ?? []).filter((l) => l.dir === 'out').length;
  const allOpen = open.size >= n;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-end gap-6">
          <h2 className="title text-2xl">Elenco</h2>
          <KPI label="Jogadores" value={n} />
          <KPI label="Idade média" value={(s.squad.reduce((a, p) => a + p.age, 0) / Math.max(1, n)).toFixed(1).replace('.', ',')} />
          <KPI label="Valor do elenco" value={value ? money(value) : '—'} />
          <KPI label="Salários/sem" value={money(wages)} />
          <KPI label="Emprestados" value={loaned} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button onClick={() => setOpen(allOpen ? new Set() : new Set(s.squad.map((p) => p.id)))} className="rounded border border-line px-2.5 py-1.5 font-semibold hover:bg-card-2">{allOpen ? '⌃ Recolher estatísticas' : '⌄ Abrir todas as estatísticas'}</button>
          <div className="flex overflow-hidden rounded border border-line">
            {(['lista', 'cartas'] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`px-2.5 py-1.5 font-semibold capitalize ${view === v ? 'bg-accent text-white' : 'text-muted hover:bg-card-2'}`}>{v === 'lista' ? '☰ Lista' : '▦ Cartas'}</button>)}
          </div>
          <span className="ml-auto text-muted">Ordenar:</span>
          {SORTS.map((x) => <button key={x.key} onClick={() => setSort(x.key)} className={`rounded px-2 py-1 font-semibold ${sort === x.key ? 'bg-card-2 text-white' : 'text-muted hover:text-white'}`}>{x.label}</button>)}
        </div>
        {view === 'lista' ? <SquadTable s={s} ea={ea} sort={sort} setSort={setSort} open={open} toggle={toggle} /> : <SquadCards s={s} ea={ea} sort={sort} />}
        <p className="text-[11px] text-muted">Clique num jogador para ver os números por competição. PEN pênaltis · FE/FD faltas pela esquerda/direita · FL faltas longas · EE/ED escanteios.</p>
      </div>
      <aside className="space-y-4">
        <StartingXI s={s} ea={ea} />
        <SetPiecesBox s={s} ea={ea} />
        <ClubRatings s={s} ea={ea} />
      </aside>
    </div>
  );
}
