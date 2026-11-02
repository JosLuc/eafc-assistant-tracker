'use client';
import { useMemo, useState } from 'react';
import type { CareerSnapshot, Match, SquadPlayer } from '@/lib/career/snapshot';
import type { Career } from '@/lib/career/merge';
import { fromYmd, seasonOf } from '@/lib/career/dates';
import { posLabel } from '@/lib/career/positions';
import { Ovr, Pic, dateBr, money, timeBr } from '../home/ui';
import type { Ea } from '../home/names';
import { Check, Kpis, Search, Seg, SortTable, Sub, useHub, type Col } from './kit';

/**
 * Conteúdo das gavetas "Ver tudo", no mesmo formato das do CM Tracker:
 * filtros em botões, busca, "Só meu clube" e tabelas ordenáveis.
 */
type P = { s: CareerSnapshot; ea: Ea; career?: Career };
const ROLE = ['', 'Crucial', 'Importante', 'Rodízio', 'Esporádico', 'Promessa'];
const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Nome clicável do jogador (abre a página dele). */
export function PName({ id, ea, sub, size = 22 }: { id: number; ea: Ea; sub?: React.ReactNode; size?: number }) {
  const { openPlayer } = useHub();
  const p = ea.player(id);
  return (
    <span className="flex items-center gap-2">
      <Pic src={p.avatar} name={p.name} size={size} />
      <span className="min-w-0">
        <button onClick={() => openPlayer?.(id)} className="block truncate text-left text-link hover:underline">{p.short}</button>
        {sub && <span className="block text-[11px] text-muted">{sub}</span>}
      </span>
    </span>
  );
}
function Club({ id, name, ea }: { id: number | null; name: string; ea: Ea }) {
  return <span className="flex items-center gap-1.5"><Pic src={id != null ? ea.crest(id) : undefined} name={name} size={16} round={false} />{name}</span>;
}

// ───────────────────────── Elenco inteiro ─────────────────────────
export type SquadTab = 'valor' | 'ovr' | 'papeis' | 'disciplina';
export function WholeSquad({ s, ea, career, tab: initial = 'papeis', sortBy }: P & { tab?: SquadTab; sortBy?: string }) {
  const [tab, setTab] = useState<SquadTab>(initial);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string>();
  const prev = new Map((career?.previous?.squad ?? []).map((p) => [p.id, p]));
  const season = seasonOf(fromYmd(s.gameDate));
  const today = fromYmd(s.gameDate);
  const monthsLeft = (until: number) => Math.max(0, (until - season.start) * 12 + 6 - ((today.getUTCMonth() + 6) % 12) - 6 + 0);
  const rows = s.squad.filter((p) => (!q || norm(ea.player(p.id).name).includes(norm(q))) && (!role || String(p.role) === role));
  const name: Col<SquadPlayer> = { key: 'n', label: 'Jogador', sort: (p) => ea.player(p.id).short, render: (p) => <PName id={p.id} ea={ea} /> };
  const pos: Col<SquadPlayer> = { key: 'pos', label: 'Pos', sort: (p) => p.pos, render: (p) => posLabel(p.pos) };
  const cols: Record<SquadTab, Col<SquadPlayer>[]> = {
    papeis: [name, pos,
      { key: 'role', label: 'Papel', sort: (p) => p.role ?? 9, render: (p) => (p.role ? ROLE[p.role] : '—') },
      { key: 'ends', label: 'Fim do contrato', align: 'r', sort: (p) => p.contractUntil, render: (p) => p.contractUntil },
      { key: 'len', label: 'Restam', align: 'r', sort: (p) => p.contractUntil, render: (p) => `${monthsLeft(p.contractUntil)} meses` },
      { key: 'wage', label: 'Salário', align: 'r', sort: (p) => p.wage, render: (p) => money(p.wage) },
      { key: 'value', label: 'Valor', align: 'r', sort: (p) => p.value ?? 0, render: (p) => (p.value != null ? money(p.value) : '—') }],
    disciplina: [name, pos,
      { key: 'ban', label: 'Suspensão (jogos)', align: 'r', sort: (p) => p.banGames ?? 0, render: (p) => (p.banGames ? <span className="text-bad">{p.banGames}</span> : '—') },
      { key: 'y', label: 'Amarelos', align: 'r', sort: (p) => p.yellows ?? 0, render: (p) => p.yellows ?? 0 },
      { key: 'form', label: 'Forma', align: 'r', sort: (p) => p.formScore ?? 0, render: (p) => p.formScore ?? '—' },
      { key: 'apps', label: 'Jogos', align: 'r', sort: (p) => apps(s, p.id), render: (p) => apps(s, p.id) }],
    valor: [name, pos,
      { key: 'v', label: 'Valor', align: 'r', sort: (p) => p.value ?? 0, render: (p) => (p.value != null ? money(p.value) : '—') },
      { key: 'd', label: 'Variação', align: 'r', sort: (p) => (p.value ?? 0) - (prev.get(p.id)?.value ?? p.value ?? 0), render: (p) => <Delta v={prev.get(p.id)?.value != null && p.value != null ? p.value - prev.get(p.id)!.value! : undefined} fmt={money} /> }],
    ovr: [name, pos,
      { key: 'o', label: 'OVR', align: 'r', sort: (p) => p.ovr, render: (p) => <Ovr v={p.ovr} /> },
      { key: 'd', label: 'Variação', align: 'r', sort: (p) => p.ovr - (prev.get(p.id)?.ovr ?? p.ovr), render: (p) => <Delta v={prev.has(p.id) ? p.ovr - prev.get(p.id)!.ovr : undefined} /> },
      { key: 'pot', label: 'POT', align: 'r', sort: (p) => p.pot, render: (p) => <Ovr v={p.pot} /> }],
  };
  const initialSort = tab === 'papeis' ? { key: sortBy ?? 'wage', dir: (sortBy === 'ends' ? 1 : -1) as 1 | -1 } : tab === 'disciplina' ? { key: 'y', dir: -1 as const } : { key: 'd', dir: -1 as const };
  return (
    <div className="space-y-3">
      <Seg value={tab} onChange={setTab} options={[{ id: 'valor', label: 'Variação de valor' }, { id: 'ovr', label: 'Variação de OVR' }, { id: 'papeis', label: 'Papéis, salários e contratos' }, { id: 'disciplina', label: 'Disciplina e forma' }]} />
      {tab === 'papeis' && <Kpis active={role} onPick={(r) => setRole(role === r ? undefined : r)} items={[1, 2, 3, 4, 5].map((r) => ({ id: String(r), value: s.squad.filter((p) => p.role === r).length, label: ROLE[r]! }))} />}
      {(tab === 'valor' || tab === 'ovr') && !career?.previous && <p className="text-xs text-muted">A variação aparece a partir do segundo save enviado desta carreira.</p>}
      <Search value={q} onChange={setQ} />
      <SortTable key={tab} cols={cols[tab]} rows={rows} rowKey={(p) => p.id} initial={initialSort} />
    </div>
  );
}
const apps = (s: CareerSnapshot, id: number) => (s.stats ?? []).reduce((a, c) => a + (c.players.find((x) => x.playerId === id)?.apps ?? 0), 0);
function Delta({ v, fmt = String }: { v?: number; fmt?: (n: number) => string }) {
  if (v == null) return <span className="text-muted">—</span>;
  if (v === 0) return <span className="text-muted">0</span>;
  return <span className={v > 0 ? 'text-good' : 'text-bad'}>{v > 0 ? '+' : '−'}{fmt(Math.abs(v))}</span>;
}

// ───────────────────────── Destaques da temporada ─────────────────────────
type Agg = { id: number; pos: number; apps: number; min: number; g: number; a: number; potm: number; cs: number; y: number; rating: number };
function aggregate(s: CareerSnapshot): Agg[] {
  const by = new Map<number, Agg>();
  for (const c of s.stats ?? []) for (const x of c.players) {
    if (x.teamId !== s.club.id) continue;
    const r = by.get(x.playerId) ?? { id: x.playerId, pos: s.squad.find((p) => p.id === x.playerId)?.pos ?? 0, apps: 0, min: 0, g: 0, a: 0, potm: 0, cs: 0, y: 0, rating: 0 };
    r.rating = (r.rating * r.apps + x.avgRating * x.apps) / Math.max(1, r.apps + x.apps);
    r.apps += x.apps; r.min += x.minutes; r.g += x.goals; r.a += x.assists; r.potm += x.potm; r.cs += x.cleanSheets; r.y += x.yellows;
    by.set(x.playerId, r);
  }
  return [...by.values()];
}
export function SeasonLeadersDrawer({ s, ea }: P) {
  const rows = aggregate(s);
  const top = (f: (r: Agg) => number, label: string) => { const r = [...rows].sort((a, b) => f(b) - f(a))[0]; return r && f(r) > 0 ? { r, label, v: f(r) } : null; };
  const hl = [top((r) => r.min, 'Mais minutos'), top((r) => r.g, 'Artilheiro'), top((r) => r.y, 'Mais amarelos')].filter(Boolean) as { r: Agg; label: string; v: number }[];
  const n = (k: keyof Agg, label: string): Col<Agg> => ({ key: k, label, align: 'r', sort: (r) => r[k] as number, render: (r) => r[k] as number });
  const out = (s.loans ?? []).filter((l) => l.dir === 'out');
  return (
    <div className="space-y-3">
      {hl.length > 0 && <div className="grid gap-3 sm:grid-cols-3">{hl.map((h) => <div key={h.label} className="rounded-lg bg-[#232323] p-3"><div className="label">{h.label}</div><div className="mt-1 flex items-center justify-between"><PName id={h.r.id} ea={ea} /><span className="num text-lg font-bold">{h.v}</span></div></div>)}</div>}
      <Sub>Todos os jogadores</Sub>
      <SortTable rows={rows} rowKey={(r) => r.id} initial={{ key: 'min', dir: -1 }} cols={[
        { key: 'n', label: 'Jogador', sort: (r) => ea.player(r.id).short, render: (r) => <PName id={r.id} ea={ea} sub={posLabel(r.pos)} /> },
        n('apps', 'J'), n('min', 'Min'), n('g', 'G'), n('a', 'A'),
        { key: 'rating', label: 'Nota', align: 'r', sort: (r) => r.rating, render: (r) => (r.rating ? r.rating.toFixed(2).replace('.', ',') : '—') },
        n('potm', 'MC'), n('cs', 'SG'), n('y', 'CA')]} />
      {out.length > 0 && <><Sub>Emprestados</Sub>
        <SortTable rows={out} rowKey={(l) => l.playerId} cols={[
          { key: 'n', label: 'Jogador', render: (l) => <PName id={l.playerId} ea={ea} sub={posLabel(l.pos)} /> },
          { key: 'c', label: 'Clube', render: (l) => <Club id={l.clubId} name={l.clubName} ea={ea} /> },
          { key: 'u', label: 'Até', align: 'r', render: (l) => dateBr(l.until) }]} /></>}
    </div>
  );
}

// ───────────────────────── Moral ─────────────────────────
export function MoraleDrawer({ s, ea }: P) {
  const n = (k: keyof SquadPlayer, label: string): Col<SquadPlayer> => ({ key: k, label, align: 'r', sort: (p) => (p[k] as number) ?? -1, render: (p) => <MoraleNum v={p[k] as number | undefined} /> });
  return <SortTable rows={s.squad.filter((p) => p.morale != null)} rowKey={(p) => p.id} initial={{ key: 'morale', dir: 1 }} empty="Este save não trouxe a moral do elenco." cols={[
    { key: 'n', label: 'Jogador', sort: (p) => ea.player(p.id).short, render: (p) => <PName id={p.id} ea={ea} sub={posLabel(p.pos)} /> },
    n('morale', 'Moral'), n('moraleTeam', 'Desemp. time'), n('moralePlayer', 'Desemp. jogador'), n('moraleContract', 'Contrato'), n('playingTime', 'Tempo de jogo')]} />;
}
function MoraleNum({ v }: { v?: number }) {
  if (v == null) return <span className="text-muted">—</span>;
  return <span className={v >= 70 ? 'text-good' : v >= 45 ? 'text-mid' : 'text-bad'}>{v}</span>;
}

// ───────────────────────── Condição e lesões ─────────────────────────
export function FitnessDrawer({ s, ea }: P) {
  const [q, setQ] = useState('');
  const rows = s.squad.filter((p) => !q || norm(ea.player(p.id).name).includes(norm(q)));
  return (
    <div className="space-y-3">
      <Search value={q} onChange={setQ} />
      <SortTable rows={rows} rowKey={(p) => p.id} initial={{ key: 'fit', dir: 1 }} cols={[
        { key: 'n', label: 'Jogador', sort: (p) => ea.player(p.id).short, render: (p) => <PName id={p.id} ea={ea} sub={posLabel(p.pos)} /> },
        { key: 'fit', label: 'Condição', align: 'r', sort: (p) => (p.injured ? -1 : p.condition ?? 100), render: (p) => <FitBar v={p.condition} /> },
        { key: 'st', label: 'Situação', sort: (p) => Number(p.injured), render: (p) => (p.injured ? <span className="text-bad">✚ Lesionado</span> : (p.condition ?? 100) < 85 ? <span className="text-mid">Cansado</span> : <span className="text-muted">Disponível</span>) },
        { key: 'ret', label: 'Volta prevista', align: 'r', sort: (p) => p.injuryReturn ?? 0, render: (p) => (p.injured && p.injuryReturn ? dateBr(p.injuryReturn) : '—') }]} />
    </div>
  );
}
function FitBar({ v }: { v?: number }) {
  if (v == null) return <span className="text-muted">—</span>;
  const c = v >= 85 ? 'bg-good' : v >= 70 ? 'bg-mid' : 'bg-bad';
  return <span className="inline-flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded bg-[#2e2e2e]"><span className={`block h-full ${c}`} style={{ width: `${v}%` }} /></span><span className="w-9 text-right">{v}%</span></span>;
}

// ───────────────────────── Mercado / transferências ─────────────────────────
type Tx = { date: number; playerId: number; fromId: number; fromName: string; toId: number; toName: string; fee?: number; wage?: number };
const kindOf = (t: Tx) => (t.fee == null ? 'loan' : t.fee === 0 ? 'free' : 'perm');
const feeText = (t: Tx) => (t.fee == null ? 'Empréstimo' : t.fee === 0 ? 'Livre' : money(t.fee));

export function MarketDrawer({ s, ea, scope: initialScope = 'mundo' }: P & { scope?: 'clube' | 'mundo' }) {
  const [scope, setScope] = useState<'clube' | 'mundo'>(initialScope);
  const [kind, setKind] = useState<'all' | 'perm' | 'loan' | 'free'>('all');
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(50);
  const club = s.club.id;
  const base: Tx[] = scope === 'clube' ? s.transfers : s.worldTransfers;
  const rows = base.filter((t) => (kind === 'all' || kindOf(t) === kind) && (!mine || t.fromId === club || t.toId === club)
    && (!q || norm(`${ea.player(t.playerId).name} ${t.fromName} ${t.toName}`).includes(norm(q))));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Seg value={scope} onChange={setScope} options={[{ id: 'clube', label: 'Clube' }, { id: 'mundo', label: 'Mundo' }]} />
        <Seg value={kind} onChange={setKind} options={[{ id: 'all', label: 'Todas' }, { id: 'perm', label: 'Definitivas' }, { id: 'loan', label: 'Empréstimos' }, { id: 'free', label: 'Livres' }]} />
        <Check checked={mine} onChange={setMine} label="Só meu clube" />
      </div>
      <Search value={q} onChange={setQ} placeholder="Buscar jogador ou clube" />
      <SortTable rows={rows.slice(0, shown)} rowKey={(t) => `${t.date}-${t.playerId}-${t.toId}`} initial={{ key: 'd', dir: -1 }} highlight={(t) => t.fromId === club || t.toId === club} cols={[
        { key: 'd', label: 'Data', sort: (t) => t.date, render: (t) => dateBr(t.date) },
        { key: 'n', label: 'Jogador', sort: (t) => ea.player(t.playerId).short, render: (t) => <PName id={t.playerId} ea={ea} /> },
        { key: 'f', label: 'De', sort: (t) => t.fromName, render: (t) => <Club id={t.fromId} name={t.fromName} ea={ea} /> },
        { key: 't', label: 'Para', sort: (t) => t.toName, render: (t) => <Club id={t.toId} name={t.toName} ea={ea} /> },
        { key: 'fee', label: 'Valor', align: 'r', sort: (t) => t.fee ?? -1, render: (t) => feeText(t) }]} />
      {rows.length > shown && <button onClick={() => setShown(shown + 50)} className="title w-full rounded-md border border-line py-2 text-[12px] text-link hover:bg-[#232323]">Mostrar mais ({rows.length - shown})</button>}
    </div>
  );
}

export function AllTransfersDrawer({ s, ea }: P) {
  const [dir, setDir] = useState<'all' | 'in' | 'out'>('all');
  const [kind, setKind] = useState<'all' | 'perm' | 'loan' | 'free'>('all');
  const [q, setQ] = useState('');
  const club = s.club.id;
  const ins = s.transfers.filter((t) => t.toId === club), outs = s.transfers.filter((t) => t.fromId === club);
  const spent = ins.reduce((a, t) => a + (t.fee ?? 0), 0), received = outs.reduce((a, t) => a + (t.fee ?? 0), 0);
  const record = [...ins].sort((a, b) => (b.fee ?? 0) - (a.fee ?? 0))[0];
  const rows = s.transfers.filter((t) => (dir === 'all' || (dir === 'in' ? t.toId === club : t.fromId === club)) && (kind === 'all' || kindOf(t) === kind) && (!q || norm(`${ea.player(t.playerId).name} ${t.fromName} ${t.toName}`).includes(norm(q))));
  return (
    <div className="space-y-3">
      <Kpis items={[{ value: money(spent), label: 'Gasto' }, { value: money(received), label: 'Recebido' }, { value: <span className={received - spent >= 0 ? 'text-good' : 'text-bad'}>{received - spent >= 0 ? '+' : '−'}{money(Math.abs(received - spent))}</span>, label: 'Saldo' }]} />
      {record && (record.fee ?? 0) > 0 && <div className="flex items-center gap-3 rounded-lg bg-[#232323] p-3"><span className="label">Contratação recorde</span><PName id={record.playerId} ea={ea} sub={`de ${record.fromName}`} /><span className="num ml-auto text-lg font-bold">{money(record.fee!)}</span></div>}
      <div className="flex flex-wrap gap-3">
        <Seg value={dir} onChange={setDir} options={[{ id: 'all', label: 'Todas' }, { id: 'in', label: 'Chegadas' }, { id: 'out', label: 'Saídas' }]} />
        <Seg value={kind} onChange={setKind} options={[{ id: 'all', label: 'Todas' }, { id: 'perm', label: 'Definitivas' }, { id: 'loan', label: 'Empréstimos' }, { id: 'free', label: 'Livres' }]} />
      </div>
      <Search value={q} onChange={setQ} placeholder="Buscar jogador ou clube" />
      <SortTable rows={rows} rowKey={(t) => `${t.date}-${t.playerId}`} initial={{ key: 'd', dir: -1 }} empty="Nenhuma transferência do clube nesta carreira ainda." cols={[
        { key: 'd', label: 'Data', sort: (t) => t.date, render: (t) => dateBr(t.date) },
        { key: 'n', label: 'Jogador', sort: (t) => ea.player(t.playerId).short, render: (t) => <PName id={t.playerId} ea={ea} /> },
        { key: 'io', label: 'Entrada/saída', sort: (t) => Number(t.toId === club), render: (t) => (t.toId === club ? <span className="text-good">Chegada</span> : <span className="text-bad">Saída</span>) },
        { key: 'c', label: 'De/para', render: (t) => (t.toId === club ? <Club id={t.fromId} name={t.fromName} ea={ea} /> : <Club id={t.toId} name={t.toName} ea={ea} />) },
        { key: 'fee', label: 'Valor', align: 'r', sort: (t) => t.fee ?? -1, render: (t) => feeText(t) },
        { key: 'w', label: 'Salário', align: 'r', sort: (t) => t.wage ?? 0, render: (t) => (t.wage ? money(t.wage) : '—') }]} />
    </div>
  );
}

// ───────────────────────── Líderes por competição ─────────────────────────
const METRICS = [
  { id: 'goals', label: 'Gols' }, { id: 'assists', label: 'Assistências' }, { id: 'cleanSheets', label: 'Sem sofrer gol' }, { id: 'potm', label: 'Melhor em campo' },
  { id: 'yellows', label: 'Amarelos' }, { id: 'minutes', label: 'Minutos' }, { id: 'avgRating', label: 'Nota média' },
] as const;
type Metric = (typeof METRICS)[number]['id'];
export function LeadersDrawer({ s, ea, metric: m0 = 'goals' }: P & { metric?: Metric }) {
  const comps = (s.stats ?? []).filter((c) => c.players.length);
  const [ci, setCi] = useState(comps[0]?.competitionId ?? 0);
  const [metric, setMetric] = useState<Metric>(m0);
  const [mine, setMine] = useState(false);
  const teamNames = new Map<number, string>([...s.standings.flatMap((t) => t.rows.map((r) => [r.teamId, r.name] as [number, string])), ...s.matches.flatMap((m) => [[m.homeId ?? -1, m.homeName], [m.awayId ?? -1, m.awayName]] as [number, string][])]);
  const c = comps.find((x) => x.competitionId === ci) ?? comps[0];
  if (!c) return <p className="text-sm text-muted">Ainda não há jogos nesta temporada.</p>;
  const rows = c.players.filter((x) => (!mine || x.teamId === s.club.id) && (metric !== 'avgRating' || x.apps >= 3));
  return (
    <div className="space-y-3">
      <div className="label">Suas competições</div>
      <Seg value={String(c.competitionId)} onChange={(v) => setCi(Number(v))} options={comps.map((x) => ({ id: String(x.competitionId), label: x.competition }))} />
      <div className="flex flex-wrap items-center gap-3">
        <Seg value={metric} onChange={setMetric} options={METRICS.map((x) => ({ id: x.id, label: x.label }))} />
        <Check checked={mine} onChange={setMine} label="Só meu clube" />
      </div>
      <SortTable key={`${ci}-${metric}`} rows={rows} rowKey={(x) => `${x.playerId}-${x.teamId}`} initial={{ key: 'm', dir: -1 }} highlight={(x) => x.teamId === s.club.id} cols={[
        { key: 'n', label: 'Jogador', sort: (x) => ea.player(x.playerId).short, render: (x) => <PName id={x.playerId} ea={ea} sub={teamNames.get(x.teamId)} /> },
        { key: 'apps', label: 'J', align: 'r', sort: (x) => x.apps, render: (x) => x.apps },
        { key: 'm', label: METRICS.find((x) => x.id === metric)!.label, align: 'r', sort: (x) => x[metric], render: (x) => (metric === 'avgRating' ? x.avgRating.toFixed(2).replace('.', ',') : x[metric]) }]} />
    </div>
  );
}

// ───────────────────────── Tabelas e jogos ─────────────────────────
export function TablesDrawer({ s, ea }: P) {
  const tables = s.standings;
  const [ti, setTi] = useState(String(tables[0]?.stageId ?? ''));
  const [list, setList] = useState<'res' | 'fix'>('res');
  const [mine, setMine] = useState(true);
  const t = tables.find((x) => String(x.stageId) === ti) ?? tables[0];
  const comp = t?.title;
  const ms = s.matches.filter((m) => m.competition === comp && (!mine || m.homeId === s.club.id || m.awayId === s.club.id));
  const res = ms.filter((m) => m.played).sort((a, b) => b.date - a.date), fix = ms.filter((m) => !m.played).sort((a, b) => a.date - b.date);
  return (
    <div className="space-y-3">
      <Seg value={ti} onChange={setTi} options={tables.map((x) => ({ id: String(x.stageId), label: x.title }))} />
      {t && <SortTable rows={t.rows.map((r, i) => ({ ...r, pos: i + 1 }))} rowKey={(r) => r.teamId} initial={{ key: 'pos', dir: 1 }} highlight={(r) => r.teamId === s.club.id} cols={[
        { key: 'pos', label: '#', sort: (r) => r.pos, render: (r) => r.pos },
        { key: 'n', label: 'Clube', sort: (r) => r.name, render: (r) => <Club id={r.teamId} name={r.name} ea={ea} /> },
        ...(['played', 'won', 'drawn', 'lost', 'gf', 'ga'] as const).map((k) => ({ key: k, label: { played: 'J', won: 'V', drawn: 'E', lost: 'D', gf: 'GP', ga: 'GC' }[k], align: 'r' as const, sort: (r: typeof t.rows[number]) => r[k], render: (r: typeof t.rows[number]) => r[k] })),
        { key: 'gd', label: 'SG', align: 'r', sort: (r) => r.gf - r.ga, render: (r) => r.gf - r.ga },
        { key: 'pts', label: 'Pts', align: 'r', sort: (r) => r.points, render: (r) => <b>{r.points}</b> }]} />}
      <div className="flex items-center gap-3 pt-2">
        <Seg value={list} onChange={setList} options={[{ id: 'res', label: `Resultados (${res.length})` }, { id: 'fix', label: `Próximos (${fix.length})` }]} />
        <Check checked={mine} onChange={setMine} label="Só meu clube" />
      </div>
      <MatchList s={s} ea={ea} list={list === 'res' ? res : fix} />
      {!mine && <p className="text-[11px] text-muted">O save guarda os jogos completos só das competições do seu clube.</p>}
    </div>
  );
}

function MatchList({ s, ea, list }: { s: CareerSnapshot; ea: Ea; list: Match[] }) {
  if (!list.length) return <p className="py-4 text-center text-sm text-muted">Nenhum jogo.</p>;
  const days = [...new Set(list.map((m) => m.date))];
  return (
    <div className="space-y-3">
      {days.map((d) => (
        <div key={d}>
          <div className="label mb-1">{dateBr(d)}</div>
          {list.filter((m) => m.date === d).map((m, i) => {
            const mine = m.homeId === s.club.id || m.awayId === s.club.id;
            return (
              <div key={i} className={`grid grid-cols-[1fr_70px_1fr] items-center gap-2 rounded-md px-3 py-1.5 text-[13px] ${mine ? 'bg-accent/15' : 'odd:bg-[#232323]'}`}>
                <span className="flex justify-end"><Club id={m.homeId} name={m.homeName} ea={ea} /></span>
                <span className="num text-center font-bold">{m.played ? `${m.homeGoals} – ${m.awayGoals}` : timeBr(m.time)}</span>
                <Club id={m.awayId} name={m.awayName} ea={ea} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Calendário da temporada ─────────────────────────
export function CalendarDrawer({ s, ea }: P) {
  const comps = [...new Set(s.matches.map((m) => m.competition))];
  const [comp, setComp] = useState('all');
  const [where, setWhere] = useState<'all' | 'home' | 'away'>('all');
  const [state, setState] = useState<'all' | 'played' | 'next'>('all');
  const [view, setView] = useState<'mes' | 'lista'>('mes');
  const mine = s.matches.filter((m) => m.homeId === s.club.id || m.awayId === s.club.id);
  const list = mine.filter((m) => (comp === 'all' || m.competition === comp) && (where === 'all' || (where === 'home') === (m.homeId === s.club.id)) && (state === 'all' || (state === 'played') === m.played)).sort((a, b) => a.date - b.date);
  const rec = mine.filter((m) => m.played && m.homeGoals != null).reduce((r, m) => { const [f, a] = m.homeId === s.club.id ? [m.homeGoals!, m.awayGoals!] : [m.awayGoals!, m.homeGoals!]; f > a ? r.w++ : f === a ? r.d++ : r.l++; return r; }, { w: 0, d: 0, l: 0 });
  const next = mine.filter((m) => !m.played).sort((a, b) => a.date - b.date)[0];
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">{mine.length} jogos · V{rec.w} E{rec.d} D{rec.l}{next && <> · Próximo: <b className="text-white">{next.homeId === s.club.id ? next.awayName : next.homeName}</b> em {dateBr(next.date)}</>}</p>
      <div className="flex flex-wrap gap-3">
        <Seg value={view} onChange={setView} options={[{ id: 'mes', label: 'Mês' }, { id: 'lista', label: 'Lista' }]} />
        <Seg value={where} onChange={setWhere} options={[{ id: 'all', label: 'Todos' }, { id: 'home', label: 'Em casa' }, { id: 'away', label: 'Fora' }]} />
        <Seg value={state} onChange={setState} options={[{ id: 'all', label: 'Todos' }, { id: 'played', label: 'Jogados' }, { id: 'next', label: 'A jogar' }]} />
      </div>
      <Seg value={comp} onChange={setComp} options={[{ id: 'all', label: 'Todas' }, ...comps.map((c) => ({ id: c, label: c }))]} />
      {view === 'lista' ? <MatchList s={s} ea={ea} list={list} /> : <MonthGrid s={s} ea={ea} list={list} />}
    </div>
  );
}

function MonthGrid({ s, ea, list }: { s: CareerSnapshot; ea: Ea; list: Match[] }) {
  const today = s.gameDate;
  const [ym, setYm] = useState(Math.floor(today / 100));
  const y = Math.floor(ym / 100), mo = ym % 100;
  const first = new Date(Date.UTC(y, mo - 1, 1)), days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const byDay = useMemo(() => new Map(list.filter((m) => Math.floor(m.date / 100) === ym).map((m) => [m.date % 100, m])), [list, ym]);
  const shift = (d: number) => { const t = new Date(Date.UTC(y, mo - 1 + d, 1)); setYm(t.getUTCFullYear() * 100 + t.getUTCMonth() + 1); };
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button onClick={() => shift(-1)} className="rounded-md border border-line px-2 py-1 hover:bg-[#232323]">‹</button>
        <span className="title flex-1 text-center text-sm">{MONTHS[mo - 1]} {y}</span>
        <button onClick={() => setYm(Math.floor(today / 100))} className="rounded-md border border-line px-2 py-1 text-xs hover:bg-[#232323]">Hoje</button>
        <button onClick={() => shift(1)} className="rounded-md border border-line px-2 py-1 hover:bg-[#232323]">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px]">
        {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((d) => <div key={d} className="label text-center">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1, m = byDay.get(d), isToday = ym * 100 + d === today;
          const home = m && m.homeId === s.club.id, opp = m ? (home ? { id: m.awayId, n: m.awayName } : { id: m.homeId, n: m.homeName }) : null;
          return (
            <div key={d} className={`min-h-[74px] rounded-md p-1.5 ${isToday ? 'ring-2 ring-accent' : ''} ${m ? 'bg-[#232323]' : 'bg-[#191919]'}`}>
              <div className="num text-[11px] text-muted">{d}</div>
              {m && opp && <div className="mt-0.5 space-y-0.5">
                <div className="flex items-center gap-1"><Pic src={opp.id != null ? ea.crest(opp.id) : undefined} name={opp.n} size={14} round={false} /><span className="truncate">{opp.n}</span></div>
                <div className="flex justify-between text-muted"><span>{home ? 'C' : 'F'}</span><b className="text-white">{m.played ? `${m.homeGoals}-${m.awayGoals}` : timeBr(m.time)}</b></div>
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Finanças ─────────────────────────
const TX: Record<number, { label: string; sign: 1 | -1 | 0 }> = {
  13: { label: 'Merchandising', sign: 1 }, 16: { label: 'Salários dos jogadores', sign: -1 }, 18: { label: 'Salários da comissão', sign: -1 },
  7: { label: 'Renda de jogo em casa', sign: 1 }, 9: { label: 'Custos de dia de jogo', sign: -1 }, 11: { label: 'Prêmio / bônus', sign: 0 },
};
export function FinancesDrawer({ s }: P) {
  const [flow, setFlow] = useState<'all' | 'in' | 'out'>('all');
  const f = s.finances;
  if (!f) return <p className="text-sm text-muted">Este save não trouxe as finanças do clube.</p>;
  const tx = (f.transactions ?? []).map((t) => ({ ...t, k: TX[t.type] ?? { label: `Movimentação (tipo ${t.type})`, sign: 0 as const } }));
  const income = tx.filter((t) => t.k.sign > 0).reduce((a, t) => a + t.amount, 0), exp = tx.filter((t) => t.k.sign < 0).reduce((a, t) => a + t.amount, 0);
  const cats = [...new Set(tx.map((t) => t.k.label))].map((l) => ({ l, sign: tx.find((t) => t.k.label === l)!.k.sign, v: tx.filter((t) => t.k.label === l).reduce((a, t) => a + t.amount, 0) })).sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...cats.map((c) => c.v));
  const wages = s.squad.reduce((a, p) => a + p.wage, 0);
  const rows = tx.filter((t) => flow === 'all' || (flow === 'in' ? t.k.sign > 0 : t.k.sign < 0));
  return (
    <div className="space-y-3">
      <Kpis items={[{ value: <span className="text-good">{money(income)}</span>, label: 'Receitas na temporada' }, { value: <span className="text-bad">{money(exp)}</span>, label: 'Despesas na temporada' }, { value: money(income - exp), label: 'Saldo' }]} />
      <Kpis items={[{ value: money(f.currentBudget), label: 'Verba de transferências' }, { value: money(wages), label: 'Salários dos jogadores/sem' }, { value: money(f.spentOnPlayers), label: 'Gasto com jogadores' }]} />
      <Sub>Receitas e despesas por categoria</Sub>
      <div className="space-y-1.5">{cats.map((c) => (
        <div key={c.l} className="flex items-center gap-3 text-[13px]"><span className="w-48 truncate">{c.l}</span><span className="h-2 flex-1 overflow-hidden rounded bg-[#2e2e2e]"><span className={`block h-full ${c.sign > 0 ? 'bg-good' : c.sign < 0 ? 'bg-bad' : 'bg-muted'}`} style={{ width: `${(c.v / max) * 100}%` }} /></span><span className="w-24 text-right tabular-nums">{money(c.v)}</span></div>
      ))}</div>
      <div className="flex items-center gap-3 pt-2"><Sub>Lançamentos</Sub><span className="ml-auto mt-4"><Seg value={flow} onChange={setFlow} options={[{ id: 'all', label: 'Todos' }, { id: 'in', label: 'Receitas' }, { id: 'out', label: 'Despesas' }]} /></span></div>
      <SortTable rows={rows} rowKey={(t) => `${t.date}-${t.type}-${t.amount}`} initial={{ key: 'd', dir: -1 }} cols={[
        { key: 'd', label: 'Data', sort: (t) => t.date, render: (t) => dateBr(t.date) },
        { key: 'c', label: 'Categoria', sort: (t) => t.k.label, render: (t) => t.k.label },
        { key: 'v', label: 'Valor', align: 'r', sort: (t) => t.amount * (t.k.sign || 1), render: (t) => <span className={t.k.sign > 0 ? 'text-good' : t.k.sign < 0 ? 'text-bad' : ''}>{t.k.sign > 0 ? '+' : t.k.sign < 0 ? '−' : ''}{money(t.amount)}</span> }]} />
    </div>
  );
}

// ───────────────────────── Olheiros ─────────────────────────
export function ScoutsDrawer({ s }: P) {
  const st = (n: number) => '★'.repeat(Math.min(5, n + 1)).padEnd(5, '☆');
  return <SortTable rows={s.scouts.map((x, i) => ({ ...x, i }))} rowKey={(x) => x.i} empty="Nenhum olheiro contratado." cols={[
    { key: 'n', label: 'Olheiro', sort: (x) => x.name, render: (x) => x.name },
    { key: 'e', label: 'Experiência', sort: (x) => x.experience, render: (x) => <span className="text-accent">{st(x.experience)}</span> },
    { key: 'j', label: 'Julgamento', sort: (x) => x.knowledge, render: (x) => <span className="text-accent">{st(x.knowledge)}</span> }]} />;
}
