'use client';
import { Fragment, useState } from 'react';
import type { CareerSnapshot, YouthPlayer } from '@/lib/career/snapshot';
import { lineOf, posLabel } from '@/lib/career/positions';
import { Ovr, Pic, money } from '../home/ui';
import type { Ea } from '../home/names';
import { GROUPS, KPI, SORTS, type SortKey } from './SquadPage';

/**
 * Aba Base: rede de olheiros e jogadores da categoria de base, agrupados por linha.
 * Além das colunas do elenco, mostra o quanto cada jovem ainda pode crescer e há quanto tempo está na base.
 */
type P = { s: CareerSnapshot; ea: Ea };

/** O jogo guarda experiência e julgamento de 0 a 4; na tela do jogo são de 1 a 5 estrelas. */
const stars = (n: number) => Math.min(5, Math.max(0, n + 1));
/** Regiões de observação confirmadas comparando com o jogo; as outras aparecem pelo número. */
const REGION: Record<number, string> = { 4: 'Europa Central' };
const FOOT = ['', 'Destro', 'Canhoto'];
const sortVal = (p: YouthPlayer, k: SortKey) => (k === 'value' ? p.value ?? 0 : k === 'wage' ? p.wage ?? 0 : p[k]);

function Stars({ n }: { n: number }) {
  return <span className="text-accent tracking-tight">{'★'.repeat(stars(n))}<span className="text-card-2">{'★'.repeat(5 - stars(n))}</span></span>;
}

function ScoutingNetwork({ s }: P) {
  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h3 className="title mb-3 text-[15px]">Rede de olheiros</h3>
      {s.scouts.length === 0 ? <p className="text-sm text-muted">Nenhum olheiro contratado. Contrate um na Central de Base para receber jovens.</p> : (
        <div className="flex flex-wrap gap-3">
          {s.scouts.map((x, i) => (
            <div key={i} className="flex items-center gap-4 rounded-md bg-card-2 px-3 py-2">
              <div><div className="text-sm font-semibold">{x.name}</div><div className="text-[11px] text-muted">Cobre {REGION[x.region] ?? `região ${x.region}`}</div></div>
              <div className="text-center"><div className="text-[9px] font-semibold uppercase tracking-wider text-muted">Experiência</div><Stars n={x.experience} /></div>
              <div className="text-center"><div className="text-[9px] font-semibold uppercase tracking-wider text-muted">Julgamento</div><Stars n={x.knowledge} /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Growth({ p }: { p: YouthPlayer }) {
  const gap = p.pot - p.ovr;
  const color = gap >= 20 ? 'text-good' : gap >= 10 ? 'text-mid' : 'text-muted';
  return <span className={`tabular-nums font-semibold ${color}`}>+{gap}</span>;
}

function YouthTable({ s, ea, sort, setSort, open, toggle }: P & { sort: SortKey; setSort: (k: SortKey) => void; open: Set<number>; toggle: (id: number) => void }) {
  const head = ['#', 'Jogador', 'Pos', 'Idade', 'OVR', 'POT', 'Cresce', 'Valor', 'Salário', 'Contrato', ''];
  const sortable: Record<string, SortKey> = { Idade: 'age', OVR: 'ovr', POT: 'pot', Valor: 'value', Salário: 'wage' };
  const COLS = head.length;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
            {head.map((h, i) => {
              const k = sortable[h];
              return <th key={i} className={`px-2 py-2 font-semibold ${i <= 2 ? 'text-left' : 'text-right'}`}>
                {k ? <button onClick={() => setSort(k)} className={`uppercase ${sort === k ? 'text-white' : 'hover:text-white'}`}>{h}{sort === k ? ' ▼' : ''}</button> : h}
              </th>;
            })}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((g) => {
            const list = s.youth.filter((p) => lineOf(p.pos) === g.line).sort((a, b) => sortVal(b, sort) - sortVal(a, sort) || b.pot - a.pot);
            if (!list.length) return null;
            const avg = (list.reduce((a, p) => a + p.ovr, 0) / list.length).toFixed(1).replace('.', ',');
            return (
              <Fragment key={g.line}>
                <tr className="bg-card-2"><td colSpan={COLS} className="px-3 py-2"><div className="flex items-center"><span className="title text-sm">{g.label}</span><span className="ml-auto text-xs text-muted">{list.length} {list.length === 1 ? 'jogador' : 'jogadores'} · OVR médio <b className="text-white">{avg}</b></span></div></td></tr>
                {list.map((p) => {
                  const isOpen = open.has(p.id);
                  return (
                    <Fragment key={p.id}>
                      <tr onClick={() => toggle(p.id)} className={`cursor-pointer border-t border-line hover:bg-card-2 ${isOpen ? 'bg-card-2' : ''}`}>
                        <td className="px-2 py-1.5 text-muted tabular-nums">{p.jersey || '—'}</td>
                        <td className="px-2 py-1.5">
                          <span className="flex items-center gap-2">
                            <Pic src={ea.player(p.id).avatar} name={ea.player(p.id).name} size={28} />
                            <span className="min-w-0">
                              <span className="block font-semibold">{ea.player(p.id).short}</span>
                              {!!p.altPos?.length && <span className="block text-[11px] text-muted">Também {p.altPos.map(posLabel).join(' · ')}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="px-2 py-1.5 font-semibold">{posLabel(p.pos)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{p.age}</td>
                        <td className="px-2 py-1.5 text-right"><Ovr v={p.ovr} /></td>
                        <td className="px-2 py-1.5 text-right"><Ovr v={p.pot} /></td>
                        <td className="px-2 py-1.5 text-right"><Growth p={p} /></td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{p.value != null ? money(p.value) : '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{p.wage != null ? money(p.wage) : '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted">{p.contractUntil ? `jun/${p.contractUntil}` : '—'}</td>
                        <td className="px-2 py-1.5 text-right text-muted">{isOpen ? '⌃' : '⌄'}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#161617]"><td colSpan={COLS} className="px-4 pb-3 pt-1">
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted">
                            {p.foot ? <span>Pé <b className="text-white">{FOOT[p.foot] ?? '—'}</b></span> : null}
                            {p.weakFoot ? <span>Pé ruim <b className="text-white">{'★'.repeat(p.weakFoot)}</b></span> : null}
                            {p.skillMoves ? <span>Dribles <b className="text-white">{'★'.repeat(p.skillMoves)}</b></span> : null}
                            {p.monthsInSquad != null && <span>Na base há <b className="text-white">{p.monthsInSquad} {p.monthsInSquad === 1 ? 'mês' : 'meses'}</b></span>}
                            <span>Pode crescer <b className="text-white">{p.pot - p.ovr} pontos</b> até o potencial</span>
                          </div>
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function YouthCards({ s, ea, sort }: P & { sort: SortKey }) {
  const list = [...s.youth].sort((a, b) => sortVal(b, sort) - sortVal(a, sort) || b.pot - a.pot);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {list.map((p) => (
        <div key={p.id} className="rounded-lg border border-line bg-card p-3 text-center">
          <div className="flex items-center justify-between"><Ovr v={p.ovr} /><span className="text-xs font-semibold text-muted">{posLabel(p.pos)}</span><Ovr v={p.pot} /></div>
          <div className="my-2 flex justify-center"><Pic src={ea.player(p.id).avatar} name={ea.player(p.id).name} size={56} /></div>
          <div className="truncate font-semibold">{ea.player(p.id).short}</div>
          <div className="mt-1 flex justify-between text-[10px] text-muted"><span>{p.age} anos</span><Growth p={p} /><span>{p.value != null ? money(p.value) : '—'}</span></div>
        </div>
      ))}
    </div>
  );
}

export function YouthPage({ s, ea }: P) {
  const [sort, setSort] = useState<SortKey>('pot');
  const [view, setView] = useState<'lista' | 'cartas'>('lista');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const y = s.youth, n = y.length;
  const value = y.reduce((a, p) => a + (p.value ?? 0), 0);
  const wages = y.reduce((a, p) => a + (p.wage ?? 0), 0);
  const best = [...y].sort((a, b) => b.pot - a.pot)[0];
  const allOpen = n > 0 && open.size >= n;
  return (
    <div className="space-y-4">
      <ScoutingNetwork s={s} ea={ea} />
      <div className="flex flex-wrap items-end gap-6">
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Categoria de base</div><h2 className="title text-2xl">Jovens</h2></div>
        <KPI label="Jogadores" value={n} />
        <KPI label="Idade média" value={n ? (y.reduce((a, p) => a + p.age, 0) / n).toFixed(1).replace('.', ',') : '—'} />
        <KPI label="Valor" value={value ? money(value) : '—'} />
        <KPI label="Salários/sem" value={wages ? money(wages) : '—'} />
        <KPI label="Maior potencial" value={best ? <span className="flex items-center gap-1.5"><Ovr v={best.pot} /><span className="text-sm">{ea.player(best.id).short}</span></span> : '—'} />
        <KPI label="Nível da base" value={`${s.club.youthDevelopment}/10`} />
      </div>
      {n === 0 ? <p className="rounded-lg border border-line bg-card p-6 text-center text-sm text-muted">Base vazia. Mande um olheiro buscar jovens e promova os relatórios para a base.</p> : <>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button onClick={() => setOpen(allOpen ? new Set() : new Set(y.map((p) => p.id)))} className="rounded border border-line px-2.5 py-1.5 font-semibold hover:bg-card-2">{allOpen ? '⌃ Recolher detalhes' : '⌄ Abrir todos os detalhes'}</button>
          <div className="flex overflow-hidden rounded border border-line">
            {(['lista', 'cartas'] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`px-2.5 py-1.5 font-semibold ${view === v ? 'bg-accent text-white' : 'text-muted hover:bg-card-2'}`}>{v === 'lista' ? '☰ Lista' : '▦ Cartas'}</button>)}
          </div>
          <span className="ml-auto text-muted">Ordenar:</span>
          {SORTS.map((x) => <button key={x.key} onClick={() => setSort(x.key)} className={`rounded px-2 py-1 font-semibold ${sort === x.key ? 'bg-card-2 text-white' : 'text-muted hover:text-white'}`}>{x.label}</button>)}
        </div>
        {view === 'lista' ? <YouthTable s={s} ea={ea} sort={sort} setSort={setSort} open={open} toggle={toggle} /> : <YouthCards s={s} ea={ea} sort={sort} />}
        <p className="text-[11px] text-muted">Cresce = pontos entre o OVR atual e o potencial. Verde: 20 ou mais, amarelo: 10 a 19. Saves enviados antes desta versão mostram só posição, idade, OVR e POT até você enviar um save novo.</p>
      </>}
    </div>
  );
}
