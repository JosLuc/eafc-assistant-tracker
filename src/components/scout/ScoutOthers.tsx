'use client';
import { useMemo, useState } from 'react';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import type { ClubRow, ManagerRow, PlayerDb } from '@/lib/career/playerdb';
import { derive } from '@/lib/career/scout';
import { fromGameDays, toYmd } from '@/lib/career/dates';
import { useEa, useEaMeta } from '../home/names';
import { Ovr, Pic, dateBr, money } from '../home/ui';
import { Check, Search, SortTable, type Col } from '../drawer/kit';

/** Scout · Times e Técnicos: todos os clubes de liga do save e quem treina cada um. */
type P = { s: CareerSnapshot; db: PlayerDb };
const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function useLeagueFilter(db: PlayerDb, s: CareerSnapshot) {
  const [q, setQ] = useState('');
  const [league, setLeague] = useState<number | null>(null);
  const [mine, setMine] = useState(false);
  const [women, setWomen] = useState(false);
  const myLeague = db.leagueOfTeam[s.club.id];
  const leagues = useMemo(() => [...new Set((db.clubs ?? []).map((c) => c.league))].map((id) => [id, db.leagues[id] ?? `Liga ${id}`] as const).sort((a, b) => a[1].localeCompare(b[1])), [db]);
  const womenTeam = useMemo(() => new Set((db.clubs ?? []).filter((c) => c.women).map((c) => c.id)), [db]);
  const pass = (lg: number, text: string, team: number) => womenTeam.has(team) === women && (!mine || lg === myLeague) && (league == null || lg === league) && (!q || norm(text).includes(norm(q)));
  const bar = (placeholder: string) => (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-60 flex-1"><Search value={q} onChange={setQ} placeholder={placeholder} /></div>
      <select value={league ?? ''} onChange={(e) => setLeague(e.target.value === '' ? null : Number(e.target.value))} className="rounded-md border border-line bg-[#191919] px-2.5 py-2 text-[13px]">
        <option value="">Todas as ligas</option>
        {leagues.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
      </select>
      <Check checked={mine} onChange={setMine} label="Só a minha liga" />
      <Check checked={women} onChange={setWomen} label="Futebol feminino" />
    </div>
  );
  return { pass, bar };
}

export function ClubsView({ s, db }: P) {
  const { pass, bar } = useLeagueFilter(db, s);
  const d = useMemo(() => derive(db), [db]);
  // Elenco de cada clube somado a partir do banco de jogadores.
  const squad = useMemo(() => {
    const m = new Map<number, { n: number; age: number; value: number; best: number }>();
    const c = db.cols;
    for (let i = 0; i < db.id.length; i++) {
      const t = c.team![i]!;
      const x = m.get(t) ?? { n: 0, age: 0, value: 0, best: 0 };
      x.n++; x.age += c.age![i]!; x.value += d.value[i]!; x.best = Math.max(x.best, c.overallrating![i]!);
      m.set(t, x);
    }
    return m;
  }, [db, d]);
  const rows = (db.clubs ?? []).filter((c) => pass(c.league, c.name, c.id));
  const ea = useEa([], useMemo(() => (db.clubs ?? []).map((c) => c.id), [db]), s.names);
  const sq = (c: ClubRow) => squad.get(c.id) ?? { n: 0, age: 0, value: 0, best: 0 };
  const cols: Col<ClubRow>[] = [
    { key: 'name', label: 'Clube', sort: (c) => c.name, render: (c) => <span className="flex items-center gap-2"><Pic src={ea.crest(c.id)} name={c.name} size={22} round={false} /><span className={c.id === s.club.id ? 'font-semibold text-link' : 'font-semibold'}>{c.name}</span></span> },
    { key: 'league', label: 'Liga', sort: (c) => db.leagues[c.league] ?? '', render: (c) => <span className="text-muted">{db.leagues[c.league] ?? '—'}</span> },
    { key: 'ovr', label: 'OVR', align: 'c', sort: (c) => c.ovr, render: (c) => <Ovr v={c.ovr} /> },
    { key: 'att', label: 'ATA', align: 'c', sort: (c) => c.att, render: (c) => <Ovr v={c.att} /> },
    { key: 'mid', label: 'MEI', align: 'c', sort: (c) => c.mid, render: (c) => <Ovr v={c.mid} /> },
    { key: 'def', label: 'DEF', align: 'c', sort: (c) => c.def, render: (c) => <Ovr v={c.def} /> },
    { key: 'n', label: 'Elenco', align: 'r', sort: (c) => sq(c).n, render: (c) => sq(c).n },
    { key: 'age', label: 'Idade méd.', align: 'r', sort: (c) => (sq(c).n ? sq(c).age / sq(c).n : 0), render: (c) => (sq(c).n ? (sq(c).age / sq(c).n).toFixed(1).replace('.', ',') : '—') },
    { key: 'value', label: 'Valor do elenco', align: 'r', sort: (c) => sq(c).value, render: (c) => `~${money(sq(c).value)}` },
    { key: 'worth', label: 'Valor do clube', align: 'r', sort: (c) => c.worth, render: (c) => (c.worth ? money(c.worth) : '—') },
    { key: 'prest', label: 'Prestígio', align: 'c', sort: (c) => c.domPrestige * 10 + c.intPrestige, render: (c) => <span title="Nacional / internacional">{c.domPrestige} / {c.intPrestige}</span> },
    { key: 'youth', label: 'Base', align: 'c', sort: (c) => c.youth, render: (c) => c.youth },
    { key: 'titles', label: 'Títulos', align: 'r', sort: (c) => c.leagueTitles * 100 + c.cups + c.ucl * 1000, render: (c) => <span title="Ligas · copas nacionais · Champions · Europa League">{c.leagueTitles} · {c.cups}{c.ucl ? ` · ${c.ucl} UCL` : ''}{c.uel ? ` · ${c.uel} UEL` : ''}</span> },
  ];
  return (
    <div className="space-y-3">
      {bar('Buscar clube')}
      <p className="text-[13px] text-muted"><span className="title num text-[18px] text-white">{rows.length}</span> clubes · valor do elenco somado pelo valor de cada jogador (~ inclui estimativas)</p>
      <div className="overflow-x-auto rounded-[10px] bg-card p-2">
        <SortTable cols={cols} rows={rows} initial={{ key: 'ovr', dir: -1 }} rowKey={(c) => c.id} highlight={(c) => c.id === s.club.id} />
      </div>
    </div>
  );
}

export function ManagersView({ s, db }: P) {
  const { pass, bar } = useLeagueFilter(db, s);
  const meta = useEaMeta();
  const rows = (db.managers ?? []).filter((m) => pass(db.leagueOfTeam[m.team] ?? -1, `${m.name} ${db.teams[m.team] ?? ''}`, m.team));
  const ea = useEa([], useMemo(() => [...new Set((db.managers ?? []).map((m) => m.team))], [db]), s.names);
  const cols: Col<ManagerRow>[] = [
    { key: 'name', label: 'Técnico', sort: (m) => m.name, render: (m) => {
      const n = meta?.nations[m.nation];
      return <span className="flex items-center gap-2">{n?.flag && <img src={n.flag} alt="" title={n.label} className="h-3 w-4 rounded-[1px] object-cover" />}<span className={m.team === s.club.id ? 'font-semibold text-link' : 'font-semibold'}>{m.name || '—'}</span></span>;
    } },
    { key: 'team', label: 'Clube', sort: (m) => db.teams[m.team] ?? '', render: (m) => <span className="flex items-center gap-1.5"><Pic src={ea.crest(m.team)} name={db.teams[m.team] ?? '?'} size={18} round={false} />{db.teams[m.team] ?? '—'}</span> },
    { key: 'league', label: 'Liga', sort: (m) => db.leagues[db.leagueOfTeam[m.team]!] ?? '', render: (m) => <span className="text-muted">{db.leagues[db.leagueOfTeam[m.team]!] ?? '—'}</span> },
    { key: 'stars', label: 'Reputação', align: 'c', sort: (m) => m.stars, render: (m) => <span className="text-accent" title={`${m.stars} estrelas`}>{m.stars > 0 ? '★'.repeat(Math.floor(m.stars)) + (m.stars % 1 ? '½' : '') : '—'}</span> },
    { key: 'age', label: 'Idade', align: 'r', sort: (m) => m.age, render: (m) => m.age || '—' },
    { key: 'nation', label: 'País', sort: (m) => meta?.nations[m.nation]?.label ?? '', render: (m) => <span className="text-muted">{meta?.nations[m.nation]?.label ?? '—'}</span> },
    { key: 'joined', label: 'No clube desde', align: 'r', sort: (m) => m.joined, render: (m) => (m.joined > 0 ? dateBr(toYmd(fromGameDays(m.joined))) : '—') },
  ];
  return (
    <div className="space-y-3">
      {bar('Buscar técnico ou clube')}
      <p className="text-[13px] text-muted"><span className="title num text-[18px] text-white">{rows.length}</span> técnicos</p>
      <div className="overflow-x-auto rounded-[10px] bg-card p-2">
        <SortTable cols={cols} rows={rows} initial={{ key: 'stars', dir: -1 }} rowKey={(m) => m.id} highlight={(m) => m.team === s.club.id} />
      </div>
    </div>
  );
}
