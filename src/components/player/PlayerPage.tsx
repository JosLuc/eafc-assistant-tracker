'use client';
import { useEffect } from 'react';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import { ATTRS, ATTR_LABEL, dbRow, estimateValue, type Attr, type PlayerDb } from '@/lib/career/playerdb';
import { PITCH, positionRatings } from '@/lib/career/posRatings';
import { fromGameDays, toYmd } from '@/lib/career/dates';
import { posLabel } from '@/lib/career/positions';
import { Ovr, Pic, dateBr, money, ratingColor } from '../home/ui';
import { useEaMeta, type Ea } from '../home/names';
import { abilityKeys } from '@/lib/career/playstyles';

/**
 * Página do jogador (abre ao clicar num nome): ficha, radar, nota por posição, atributos,
 * temporada (forma, OVR ao vivo, condição) e números por competição. Esc ou "← Voltar" fecham.
 */
type P = { s: CareerSnapshot; ea: Ea; db: PlayerDb | null; id: number; onBack: () => void };

const GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Ataque', keys: ['crossing', 'finishing', 'headingaccuracy', 'shortpassing', 'volleys'] },
  { label: 'Habilidade', keys: ['dribbling', 'curve', 'freekickaccuracy', 'longpassing', 'ballcontrol'] },
  { label: 'Movimento', keys: ['acceleration', 'sprintspeed', 'agility', 'reactions', 'balance'] },
  { label: 'Defesa', keys: ['defensiveawareness', 'standingtackle', 'slidingtackle'] },
  { label: 'Força', keys: ['shotpower', 'jumping', 'stamina', 'strength', 'longshots'] },
  { label: 'Mentalidade', keys: ['aggression', 'interceptions', 'positioning', 'vision', 'penalties', 'composure'] },
  { label: 'Goleiro', keys: ['gkdiving', 'gkhandling', 'gkkicking', 'gkpositioning', 'gkreflexes'] },
];
const FOOT = ['', 'Direito', 'Esquerdo'];
const stars = (n: number) => '★'.repeat(Math.max(0, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - n));

function Radar({ v, gk }: { v: number[]; gk?: boolean }) {
  // Goleiro usa as mesmas 6 colunas do card, com outros nomes (como na carta do jogo).
  const L = gk ? ['ELA', 'MAN', 'CHU', 'REF', 'VEL', 'POS'] : ['RIT', 'FIN', 'PAS', 'DRI', 'DEF', 'FÍS'];
  const pt = (i: number, r: number) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r]; };
  const poly = (r: (i: number) => number) => v.map((_, i) => pt(i, r(i)).join(',')).join(' ');
  return (
    <svg viewBox="0 -12 200 224" className="mx-auto w-full max-w-[260px]">
      {[1, 0.66, 0.33].map((k) => <polygon key={k} points={poly(() => 70 * k)} fill="none" stroke="#2e2e2e" />)}
      <polygon points={poly((i) => (70 * v[i]!) / 99)} fill="rgba(88,101,242,.35)" stroke="#5865f2" strokeWidth="2" />
      {v.map((x, i) => { const [cx, cy] = pt(i, 92); return <g key={i}><text x={cx} y={cy! - 4} textAnchor="middle" fontSize="10" fill="#a3a3a3" fontFamily="Tektur">{L[i]}</text><text x={cx} y={cy! + 9} textAnchor="middle" fontSize="12" fontWeight="700" fill={ratingColor(x)} fontFamily="Tektur">{x}</text></g>; })}
    </svg>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-md bg-[#232323] px-3 py-2"><div className="label !text-[10px]">{label}</div><div className="mt-0.5 font-semibold">{children}</div></div>;
}
function Tile({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[10px] bg-card px-[18px] pb-[18px] pt-4 ${className}`}><h3 className="title mb-3 text-[15px]">{title}</h3>{children}</section>;
}

export function PlayerPage({ s, ea, db, id, onBack }: P) {
  const meta = useEaMeta();
  useEffect(() => {
    // Captura antes da gaveta: Esc fecha só a página do jogador e volta para a gaveta aberta.
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onBack(); } };
    window.addEventListener('keydown', on, true);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', on, true); document.body.style.overflow = prev; };
  }, [onBack]);
  const r = db ? dbRow(db, id) : null;
  const nation = r && meta ? meta.nations[r.nationality] : undefined;
  // PlayStyle+ primeiro; bits sem nome na base da EA ficam de fora.
  const styles = r && meta ? abilityKeys(r).map((key) => ({ key, ...meta.abilities[key]! })).filter((x) => x.label).sort((a, b) => Number(b.plus) - Number(a.plus)) : [];
  const sq = s.squad.find((p) => p.id === id);
  const youth = s.youth.find((y) => y.id === id);
  const p = ea.player(id);
  const ovr = r?.overallrating ?? sq?.ovr ?? youth?.ovr ?? 0, pot = r?.potential ?? sq?.pot ?? youth?.pot ?? 0;
  const pos = r ? [r.preferredposition1, r.preferredposition2, r.preferredposition3, r.preferredposition4].filter((x) => x >= 0) : sq ? [sq.pos, ...sq.altPos] : [];
  const age = r?.age ?? sq?.age ?? youth?.age;
  const teamId = r && r.team >= 0 ? r.team : sq ? s.club.id : undefined;
  const teamName = teamId != null ? (db?.teams[teamId] ?? (teamId === s.club.id ? s.club.name : '')) : 'Sem clube';
  const attrs = r as unknown as Record<string, number> | null;
  const ratings = r ? positionRatings(attrs!, r.preferredposition1, ovr) : null;
  const ranking = ratings ? [...new Map(PITCH.map((x) => [x.label, ratings.get(x.code)!]))].sort((a, b) => b[1] - a[1]) : [];
  const best = ranking[0]?.[1];
  const total = attrs ? ATTRS.reduce((a, k) => a + (attrs[k] ?? 0), 0) : 0;
  const groups = attrs ? GROUPS.map((g) => ({ ...g, avg: Math.round(g.keys.reduce((a, k) => a + attrs[k]!, 0) / g.keys.length) })) : [];
  const bestGroup = [...groups].filter((g) => g.label !== 'Goleiro' || pos[0] === 0).sort((a, b) => b.avg - a.avg)[0];
  const value = sq?.value ?? youth?.value ?? (r && r.value >= 0 ? r.value : undefined);
  const est = value == null && r ? estimateValue(r.overallrating, r.potential, r.age) : undefined;
  const stats = (s.stats ?? []).map((c) => ({ comp: c.competition, x: c.players.find((y) => y.playerId === id) })).filter((c) => c.x);
  const born = r ? toYmd(fromGameDays(r.birthdate)) : undefined;
  const joined = r && r.playerjointeamdate > 0 ? toYmd(fromGameDays(r.playerjointeamdate)) : undefined;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-bg">
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 md:px-6">
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6">
        <button onClick={onBack} className="rounded-md border border-line px-3 py-1.5 text-[13px] hover:bg-[#232323]">← Voltar</button>
        <span className="label">Jogador</span><span className="title text-sm">{p.name}</span>
        <kbd className="ml-auto rounded border border-line px-1.5 text-[10px] text-muted">Esc</kbd>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-[10px] bg-card p-5 text-center">
            <div className="flex items-start justify-between"><div><div className="label">OVR</div><Ovr v={ovr} size="lg" /></div><div><div className="label">POT</div><Ovr v={pot} size="lg" /></div></div>
            <div className="-mt-4 flex justify-center"><Pic src={p.avatar} name={p.name} size={120} /></div>
            <h2 className="title mt-3 text-2xl">{p.short}</h2>
            <div className="mt-1 flex items-center justify-center gap-2 text-[13px] text-muted">
              {teamId != null && <Pic src={ea.crest(teamId)} name={teamName} size={18} round={false} />}<span>{teamName}</span>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-1">{pos.map((x, i) => <span key={i} className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${i === 0 ? 'bg-accent text-white' : 'bg-[#2e2e2e]'}`}>{posLabel(x)}</span>)}</div>
            {age != null && <p className="mt-2 text-[13px] text-muted">{age} anos</p>}
          </section>
          {r && <Tile title="Atributos principais"><Radar gk={r.preferredposition1 === 0} v={[r.pacdiv, r.shohan, r.paskic, r.driref, r.defspe, r.phypos]} /></Tile>}
          {ratings && (
            <Tile title="Nota por posição">
              <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] rounded-lg border border-[#2f5a3a] bg-[#1d3a26]">
                {PITCH.map((x) => {
                  const v = ratings.get(x.code)!, main = x.code === r!.preferredposition1;
                  return (
                    <div key={x.code} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${x.x}%`, top: `${x.y}%` }}>
                      <div className={`num grid h-8 w-10 place-items-center rounded-md text-sm font-bold ${v === best ? 'ring-2 ring-white' : ''}`} style={{ background: main ? '#5865f2' : ratingColor(v), color: main ? '#fff' : '#0b0b0b' }}>{v}</div>
                      <div className="mt-0.5 text-[10px] font-semibold text-white/80">{x.label}</div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[12px] text-muted">{ranking.slice(0, 6).map(([l, v]) => `${l} ${v}`).join(' · ')}</p>
              <p className="mt-1 text-[11px] text-faint">Estimativa pelos atributos, calibrada pelo OVR na posição principal.</p>
            </Tile>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-[10px] bg-card px-[18px] pb-[18px] pt-4">
            <p className="label">{pos[0] != null ? posLabel(pos[0]) : ''}{r?.jersey ? ` · #${r.jersey}` : sq?.jersey ? ` · #${sq.jersey}` : ''} · FC 27 · ID {id}</p>
            <h2 className="title mt-1 text-2xl">{p.name}</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <Fact label={est != null ? 'Valor (estimado)' : 'Valor'}>{value != null ? money(value) : est != null ? `~${money(est)}` : '—'}</Fact>
              <Fact label="Salário/sem">{sq ? money(sq.wage) : r ? money(r.wage) : '—'}</Fact>
              <Fact label="Multa">{r && r.releaseclause > 0 ? money(r.releaseclause) : '—'}</Fact>
              <Fact label="Contrato até">{sq?.contractUntil ?? r?.contractvaliduntil ?? '—'}</Fact>
              <Fact label="No clube desde">{joined ? dateBr(joined) : '—'}</Fact>
              <Fact label="Reputação int.">{r ? <span className="text-accent">{stars(r.internationalrep)}</span> : '—'}</Fact>
              <Fact label="Idade">{age ?? '—'}{born ? <span className="text-[11px] text-muted"> · {dateBr(born)}</span> : null}</Fact>
              <Fact label="Altura">{r ? `${r.height} cm` : '—'}</Fact>
              <Fact label="Peso">{r ? `${r.weight} kg` : '—'}</Fact>
              <Fact label="Pé preferido">{r ? FOOT[r.preferredfoot] ?? '—' : '—'}</Fact>
              <Fact label="Pé ruim">{r ? <span className="text-accent">{stars(r.weakfootabilitytypecode)}</span> : '—'}</Fact>
              <Fact label="Dribles">{r ? <span className="text-accent">{stars(r.skillmoves + 1)}</span> : '—'}</Fact>
              <Fact label="Crescimento">{pot - ovr > 0 ? `+${pot - ovr}` : '0'}</Fact>
              <Fact label="Aposentando">{r ? (r.isretiring ? 'Sim' : 'Não') : '—'}</Fact>
              <Fact label="Nacionalidade">{nation ? <span className="flex items-center gap-1.5">{nation.flag && <img src={nation.flag} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />}<span className="truncate">{nation.label}</span></span> : '—'}</Fact>
            </div>
            {styles.length > 0 && (
              <div className="mt-4">
                <div className="label mb-2">PlayStyles · {styles.length}</div>
                <div className="flex flex-wrap gap-1.5">
                  {styles.map((x) => (
                    <span key={x.key} title={x.desc} className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${x.plus ? 'bg-[#ffd200] text-[#111]' : 'border border-line bg-[#232323]'}`}>{x.label}</span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {attrs && (
            <Tile title={`Atributos · ${ATTRS.length} · total ${total.toLocaleString('pt-BR')}`}>
              <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                {groups.map((g) => (
                  <div key={g.label}>
                    <div className="mb-1.5 flex items-center gap-2"><span className="title text-[13px]">{g.label}</span><span className="ml-auto"><Ovr v={g.avg} /></span></div>
                    <div className="mb-2 h-1.5 overflow-hidden rounded bg-[#2e2e2e]"><div className="h-full" style={{ width: `${g.avg}%`, background: ratingColor(g.avg) }} /></div>
                    {g.keys.map((k) => { const v = attrs[k]!; return (
                      <div key={k} className="flex items-center gap-2 py-0.5 text-[13px]">
                        <span className="w-36 truncate text-muted">{ATTR_LABEL[k as Attr]}</span>
                        <span className="h-1 flex-1 overflow-hidden rounded bg-[#2e2e2e]"><span className="block h-full" style={{ width: `${v}%`, background: ratingColor(v) }} /></span>
                        <span className="num w-7 text-right font-bold" style={{ color: ratingColor(v) }}>{v}</span>
                      </div>
                    ); })}
                  </div>
                ))}
              </div>
              {bestGroup && <p className="mt-4 text-[12px] text-muted">Total de atributos <b className="text-white">{total.toLocaleString('pt-BR')}</b> · melhor grupo <b className="text-white">{bestGroup.label}</b></p>}
            </Tile>
          )}
          {!r && <p className="rounded-[10px] bg-card p-4 text-sm text-muted">Envie o save de novo para ver atributos, nota por posição e ficha completa (o banco de jogadores passou a ser guardado nesta versão).</p>}
        </div>
      </div>

      {(sq || stats.length > 0) && (
        <Tile title={`Temporada ${s.season}`}>
          {sq && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Fact label="Últimas notas">{sq.recentRatings?.some((x) => x > 0) ? sq.recentRatings.filter((x) => x > 0).slice(-4).map((x, i) => <span key={i} className="num mr-1 rounded px-1 text-[12px] text-[#0b0b0b]" style={{ background: ratingColor(Math.round(x * 10)) }}>{x.toFixed(1)}</span>) : '—'}</Fact>
              <Fact label="Forma">{sq.formScore ?? '—'}</Fact>
              <Fact label="OVR ao vivo">{ovr + (sq.ovrForm ?? 0) - Math.abs(sq.ovrFatigue ?? 0)} <span className="text-[11px] text-muted">forma {sq.ovrForm ? (sq.ovrForm > 0 ? '+' : '') + sq.ovrForm : 0} · cansaço {sq.ovrFatigue ?? 0}</span></Fact>
              <Fact label="Condição física">{sq.condition != null ? `${sq.condition}%` : '—'}{sq.injured && <span className="ml-1 text-bad">✚</span>}</Fact>
              <Fact label="Moral">{sq.morale ?? '—'}</Fact>
            </div>
          )}
          {stats.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-[13px] tabular-nums">
                <thead className="bg-[#191919] text-[11px] uppercase text-muted"><tr>{['Competição', 'Jogos', 'Gols', 'Assist.', 'Sem sofrer', 'Amarelos', 'Minutos', 'Nota'].map((h, i) => <th key={h} className={`px-3 py-2 ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
                <tbody>{stats.map(({ comp, x }) => <tr key={comp} className="border-t border-line"><td className="px-3 py-1.5">{comp}</td><td className="px-3 text-right">{x!.apps}</td><td className="px-3 text-right">{x!.goals}</td><td className="px-3 text-right">{x!.assists}</td><td className="px-3 text-right">{x!.cleanSheets}</td><td className="px-3 text-right">{x!.yellows}</td><td className="px-3 text-right">{x!.minutes}</td><td className="px-3 text-right">{x!.avgRating ? x!.avgRating.toFixed(2).replace('.', ',') : '—'}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {sq?.lastSeason?.length ? (
            <p className="mt-3 text-[12px] text-muted">Temporada passada: {sq.lastSeason.map((c) => `${s.lastSeasonComps[c.competitionId] ?? 'Competição'} ${c.apps} J · ${c.goals} G · ${c.assists} A`).join(' | ')}</p>
          ) : null}
        </Tile>
      )}
    </div>
    </div>
  );
}
