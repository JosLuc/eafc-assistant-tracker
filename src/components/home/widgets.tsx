'use client';
import { useState } from 'react';
import type { CareerSnapshot, SquadPlayer, StatLine } from '@/lib/career/snapshot';
import { buildTips, starters } from '@/lib/career/tips';
import { fromYmd, seasonOf } from '@/lib/career/dates';
import { lineOf, posLabel, xOf } from '@/lib/career/positions';
import type { Match } from '@/lib/career/snapshot';
import { Bar, Card, Ovr, Pic, Stat, Table, Tabs, dateBr, money, timeBr, PN } from './ui';
import type { Career } from '@/lib/career/merge';
import type { Ea } from './names';

type P = { s: CareerSnapshot; ea: Ea; career?: Career };

function Face({ id, ea, size = 28 }: { id: number; ea: Ea; size?: number }) {
  const p = ea.player(id);
  return <Pic src={p.avatar} name={p.name} size={size} />;
}

function Crest({ id, name, ea, size = 18 }: { id: number | null; name: string; ea: Ea; size?: number }) {
  return <Pic src={id != null ? ea.crest(id) : undefined} name={name} size={size} round={false} />;
}

/** Resultado do ponto de vista do clube: V, E ou D. */
function outcome(m: Match, clubId: number): 'V' | 'E' | 'D' | null {
  if (m.homeGoals == null || m.awayGoals == null) return null;
  const [mine, theirs] = m.homeId === clubId ? [m.homeGoals, m.awayGoals] : [m.awayGoals, m.homeGoals];
  return mine > theirs ? 'V' : mine === theirs ? 'E' : 'D';
}
const OUT_COLOR = { V: 'bg-good text-black', E: 'bg-mid text-black', D: 'bg-bad text-white' } as const;
function FormBadge({ r }: { r: 'V' | 'E' | 'D' }) {
  return <span className={`inline-grid h-5 w-5 place-items-center rounded text-[11px] font-bold ${OUT_COLOR[r]}`}>{r}</span>;
}
const upcoming = (s: CareerSnapshot) => s.matches.filter((m) => !m.played && m.date >= s.gameDate);
const results = (s: CareerSnapshot) => s.matches.filter((m) => m.played);

function MatchTable({ list, s, ea }: { list: Match[]; s: CareerSnapshot; ea: Ea }) {
  return <Table head={['Data', 'Competição', 'Jogo', 'Placar', '']} align={['l', 'l', 'l', 'r', 'r']} rows={list.map((m) => {
    const r = outcome(m, s.club.id);
    return [dateBr(m.date), <span key="c" className="text-muted">{m.competition}{m.round ? ` · R${m.round}` : ''}</span>,
      <span key="j" className="flex items-center gap-1"><Crest id={m.homeId} name={m.homeName} ea={ea} size={14} />{m.homeName} x {m.awayName}<Crest id={m.awayId} name={m.awayName} ea={ea} size={14} /></span>,
      m.played ? `${m.homeGoals}–${m.awayGoals}` : timeBr(m.time), r ? <FormBadge key="r" r={r} /> : ''];
  })} />;
}

function PlayerName({ id, ea, sub }: { id: number; ea: Ea; sub?: React.ReactNode }) {
  return <span className="flex items-center gap-2"><Face id={id} ea={ea} size={22} /><span><span className="block"><PN id={id} ea={ea} /></span>{sub && <span className="block text-[11px] text-muted">{sub}</span>}</span></span>;
}

/** Tabela do elenco inteiro (janela "Ver tudo" de vários cards). */
function SquadTable({ s, ea, cols }: { s: CareerSnapshot; ea: Ea; cols: 'geral' | 'papeis' | 'moral' }) {
  const list = [...s.squad].sort((a, b) => cols === 'moral' ? (a.morale ?? 0) - (b.morale ?? 0) : b.ovr - a.ovr);
  if (cols === 'moral') return <Table head={['Jogador', 'Moral', 'Desemp. time', 'Desemp. jogador', 'Contrato', 'Tempo de jogo']} align={['l', 'r', 'r', 'r', 'r', 'r']}
    rows={list.map((p) => [<PlayerName key="n" id={p.id} ea={ea} sub={posLabel(p.pos)} />, p.morale ?? '—', p.moraleTeam ?? '—', p.moralePlayer ?? '—', p.moraleContract ?? '—', p.playingTime ?? '—'])} />;
  if (cols === 'papeis') return <Table head={['Jogador', 'Pos', 'Papel', 'Contrato até', 'Salário/sem', 'OVR']} align={['l', 'l', 'l', 'r', 'r', 'r']}
    rows={[...list].sort((a, b) => b.wage - a.wage).map((p) => [<PlayerName key="n" id={p.id} ea={ea} />, posLabel(p.pos), <span key="r" className={p.role ? ROLE_COLOR[p.role] : ''}>{p.role ? ROLE[p.role] : '—'}</span>, p.contractUntil, money(p.wage), <Ovr key="o" v={p.ovr} />])} />;
  return <Table head={['Jogador', 'Pos', 'Idade', 'OVR', 'POT', 'Contrato', 'Salário/sem', 'Condição']} align={['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r']}
    rows={list.map((p) => [<PlayerName key="n" id={p.id} ea={ea} sub={p.injured ? '✚ lesionado' : undefined} />, posLabel(p.pos), p.age, <Ovr key="o" v={p.ovr} />, p.pot, p.contractUntil, money(p.wage), p.condition != null ? `${p.condition}%` : '—'])} />;
}

function PlayerLine({ p, ea, right }: { p: SquadPlayer; ea: Ea; right?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 py-1 text-sm">
      <Face id={p.id} ea={ea} size={24} />
      <span className="truncate"><PN id={p.id} ea={ea} /></span>
      <span className="text-xs text-muted">{posLabel(p.pos)}</span>
      <span className="ml-auto flex items-center gap-2">{right ?? <Ovr v={p.ovr} />}</span>
    </li>
  );
}

export function AssistantTips({ s, ea }: P) {
  const tips = buildTips(s, (id) => ea.player(id).short);
  return (
    <Card wide title="Dica do auxiliar" help="Alertas calculados a partir do save: contratos de titulares, posições sem reserva, jovens sem minutos e salários altos fora do time." className="border-accent/50">
      {tips.length === 0 ? <p className="text-sm text-muted">Nada urgente no elenco agora.</p> : (
        <ul className="space-y-2 text-sm">
          {tips.map((t, i) => <li key={i} className="flex gap-2"><span className="text-accent">›</span><span>{t.text}</span></li>)}
        </ul>
      )}
    </Card>
  );
}

export function Calendar({ s, ea }: P) {
  const d = fromYmd(s.gameDate);
  const days = Array.from({ length: 7 }, (_, i) => new Date(d.getTime() + i * 86_400_000));
  const wd = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const ymd = (x: Date) => x.getUTCFullYear() * 10000 + (x.getUTCMonth() + 1) * 100 + x.getUTCDate();
  const byDay = new Map(s.matches.map((m) => [m.date, m]));
  const week = days.map(ymd);
  const games = s.matches.filter((m) => week.includes(m.date));
  const back = s.squad.filter((p) => p.injuryReturn && week.includes(p.injuryReturn));
  return (
    <Card title="Calendário" help="Data do jogo e os próximos 7 dias, com os jogos do seu clube e a volta de lesionados. Em Ver tudo, a temporada inteira." more={() => <MatchTable list={s.matches} s={s} ea={ea} />}>
      <p className="mb-3 text-sm"><span className="mr-2 text-xs font-semibold text-accent">HOJE</span>{d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((x, i) => {
          const m = byDay.get(ymd(x));
          const opp = m && (m.homeId === s.club.id ? { id: m.awayId, name: m.awayName } : { id: m.homeId, name: m.homeName });
          return (
            <div key={i} className={`flex flex-col items-center rounded border p-1 text-center ${i === 0 ? 'border-accent bg-accent/15' : 'border-line bg-card-2'}`}>
              <div className="text-[10px] text-muted">{wd[x.getUTCDay()]}</div>
              <div className="text-lg font-semibold">{x.getUTCDate()}</div>
              <div className="h-5">{opp && <Crest id={opp.id} name={opp.name} ea={ea} size={18} />}</div>
            </div>
          );
        })}
      </div>
      <ul className="mt-3 space-y-1 text-xs">
        {games.map((m) => (
          <li key={m.date + m.homeName} className="flex gap-2"><span className="w-10 text-muted">{dateBr(m.date).slice(0, 5)}</span>
            <span className="truncate">{m.homeName} x {m.awayName}{m.played ? ` · ${m.homeGoals}–${m.awayGoals}` : ` · ${timeBr(m.time)}`}</span></li>
        ))}
        {back.map((p) => <li key={p.id} className="flex gap-2"><span className="w-10 text-muted">{dateBr(p.injuryReturn!).slice(0, 5)}</span><span>✚ <PN id={p.id} ea={ea} /> volta de lesão</span></li>)}
        {!games.length && !back.length && <li className="text-muted">Nenhum jogo nos próximos 7 dias.</li>}
      </ul>
    </Card>
  );
}

export function NextMatch({ s, ea }: P) {
  const m = upcoming(s)[0];
  if (!m) return <Card title="Próximo jogo" empty="Nenhum jogo marcado no calendário deste save." />;
  const home = m.homeId === s.club.id;
  const opp = home ? m.awayId : m.homeId;
  const table = s.standings.find((t) => t.isLeague);
  const pos = (id: number | null) => { const i = table?.rows.findIndex((r) => r.teamId === id) ?? -1; return i >= 0 && table!.rows.some((r) => r.played) ? `${i + 1}º` : ''; };
  const last = results(s).filter((x) => x.homeId === opp || x.awayId === opp).at(-1);
  const days = Math.round((fromYmd(m.date).getTime() - fromYmd(s.gameDate).getTime()) / 86_400_000);
  const side = (id: number | null, name: string) => (
    <div className="flex w-28 flex-col items-center gap-1 text-center">
      <Crest id={id} name={name} ea={ea} size={48} />
      <span className="text-sm font-semibold leading-tight">{name}</span>
      <span className="text-[11px] text-muted">{pos(id)}</span>
    </div>
  );
  return (
    <Card title="Próximo jogo" help="Adversário, competição, data e local do próximo jogo, direto do calendário do save.">
      <p className="mb-3 text-center text-xs text-muted">{m.competition} · {home ? 'Em casa' : 'Fora'}</p>
      <div className="flex items-center justify-center gap-3">
        {side(m.homeId, m.homeName)}
        <div className="text-center">
          <div className="title text-2xl">{timeBr(m.time)}</div>
          <div className="text-xs text-muted">{dateBr(m.date)}</div>
          <div className="mt-1 text-[11px] font-semibold text-accent">{days === 0 ? 'HOJE' : days === 1 ? 'AMANHÃ' : `EM ${days} DIAS`}</div>
        </div>
        {side(m.awayId, m.awayName)}
      </div>
      {last && <p className="mt-3 text-center text-xs text-muted">Último confronto: {last.homeName} {last.homeGoals}–{last.awayGoals} {last.awayName}</p>}
    </Card>
  );
}

export function Results({ s, ea }: P) {
  const list = results(s).slice(-5).reverse();
  if (!list.length) return <Card title="Resultados" help="Últimos jogos do clube e a sequência recente." empty="Nenhum jogo disputado ainda nesta temporada." />;
  const all = results(s).map((m) => outcome(m, s.club.id)!);
  const n = (r: string) => all.filter((x) => x === r).length;
  return (
    <Card title="Resultados" help="Últimos jogos do clube na temporada (todas as competições) e o retrospecto." more={() => <MatchTable list={results(s).reverse()} s={s} ea={ea} />}>
      <div className="mb-3 flex items-center gap-1">{all.slice(-5).map((r, i) => <FormBadge key={i} r={r} />)}<span className="ml-auto text-xs text-muted">{n('V')}V {n('E')}E {n('D')}D</span></div>
      <ul className="space-y-2">
        {list.map((m, i) => {
          const r = outcome(m, s.club.id)!;
          return (
            <li key={i} className="flex items-center gap-2 text-sm">
              <FormBadge r={r} />
              <span className="flex flex-1 items-center justify-end gap-1 truncate text-right">{m.homeName}<Crest id={m.homeId} name={m.homeName} ea={ea} size={16} /></span>
              <span className="w-12 text-center font-semibold tabular-nums">{m.homeGoals}–{m.awayGoals}</span>
              <span className="flex flex-1 items-center gap-1 truncate"><Crest id={m.awayId} name={m.awayName} ea={ea} size={16} />{m.awayName}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted">{list[0]!.competition} · {dateBr(list[0]!.date)}</p>
    </Card>
  );
}

export function Fixtures({ s, ea }: P) {
  const list = upcoming(s).slice(0, 8);
  if (!list.length) return <Card title="Próximos jogos" empty="Nenhum jogo marcado." />;
  return (
    <Card title="Próximos jogos" help="Os próximos jogos do calendário, em todas as competições." more={() => <MatchTable list={upcoming(s)} s={s} ea={ea} />}>
      <ul className="space-y-2">
        {list.map((m, i) => {
          const home = m.homeId === s.club.id;
          const opp = home ? { id: m.awayId, name: m.awayName } : { id: m.homeId, name: m.homeName };
          return (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="w-11 text-xs text-muted">{dateBr(m.date).slice(0, 5)}</span>
              <Crest id={opp.id} name={opp.name} ea={ea} size={18} />
              <span className="truncate">{opp.name}</span>
              <span className="text-[11px] text-muted">{home ? '(C)' : '(F)'}</span>
              <span className="ml-auto truncate text-[11px] text-muted">{m.competition}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function Availability({ s, ea }: P) {
  const injured = s.squad.filter((p) => p.injured);
  const tired = s.squad.filter((p) => !p.injured && p.condition != null && p.condition < 85).sort((a, b) => a.condition! - b.condition!);
  const all = [...s.squad].filter((p) => p.condition != null).sort((a, b) => Number(b.injured) - Number(a.injured) || a.condition! - b.condition!);
  return (
    <Card title="Departamento médico" help="Lesionados com a data prevista de volta e jogadores com condição física baixa (abaixo de 85%)."
      more={all.length ? () => <Table head={['Jogador', 'Pos', 'Condição', 'Situação']} align={['l', 'l', 'r', 'l']}
        rows={all.map((p) => [<PlayerName key="n" id={p.id} ea={ea} />, posLabel(p.pos), `${p.condition}%`, p.injured ? <span key="i" className="text-bad">✚ volta {p.injuryReturn ? dateBr(p.injuryReturn) : '?'}</span> : p.condition! < 85 ? <span key="c" className="text-mid">cansado</span> : 'ok'])} /> : undefined}>
      {!injured.length && !tired.length ? <p className="text-sm text-muted">Ninguém lesionado ou cansado.</p> : (
        <ul>
          {injured.map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="text-xs text-bad">✚ volta {p.injuryReturn ? dateBr(p.injuryReturn).slice(0, 5) : '?'}</span>} />)}
          {tired.slice(0, 8).map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="text-xs text-mid">condição {p.condition}%</span>} />)}
        </ul>
      )}
    </Card>
  );
}

export function Discipline({ s, ea }: P) {
  const banned = s.squad.filter((p) => (p.banGames ?? 0) > 0);
  const yellow = s.squad.filter((p) => (p.yellows ?? 0) > 0 && !(p.banGames ?? 0)).sort((a, b) => b.yellows! - a.yellows!);
  return (
    <Card title="Disponibilidade" help="Suspensos e jogadores pendurados com amarelos acumulados."
      more={banned.length + yellow.length > 8 ? () => <Table head={['Jogador', 'Amarelos', 'Suspensão']} align={['l', 'r', 'r']} rows={[...banned, ...yellow].map((p) => [<PlayerName key="n" id={p.id} ea={ea} />, p.yellows ?? 0, p.banGames ? `${p.banGames} jogo(s)` : '—'])} /> : undefined}>
      {!banned.length && !yellow.length ? <p className="text-sm text-muted">Nenhum suspenso ou pendurado.</p> : (
        <ul>
          {banned.map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="text-xs text-bad">■ suspenso {p.banGames} jogo{p.banGames! > 1 ? 's' : ''}</span>} />)}
          {yellow.slice(0, 8).map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="flex items-center gap-1 text-xs"><span className="inline-block h-3 w-2 rounded-[2px] bg-mid" />{p.yellows}</span>} />)}
        </ul>
      )}
    </Card>
  );
}

function TransferRow({ t, s, ea, fee = true }: { t: { date: number; playerId: number; fromId: number; fromName: string; toId: number; toName: string; fee?: number }; s: CareerSnapshot; ea: Ea; fee?: boolean }) {
  const mine = t.toId === s.club.id || t.fromId === s.club.id;
  return (
    <li className={`flex items-center gap-2 rounded p-1 text-sm ${mine ? 'bg-accent/15' : ''}`}>
      <Face id={t.playerId} ea={ea} size={28} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold"><PN id={t.playerId} ea={ea} /></div>
        <div className="flex items-center gap-1 truncate text-[11px] text-muted">
          <Crest id={t.fromId} name={t.fromName} ea={ea} size={12} />{t.fromName} → <Crest id={t.toId} name={t.toName} ea={ea} size={12} />{t.toName}
        </div>
      </div>
      <div className="text-right">{fee && <div className="text-xs font-semibold tabular-nums">{feeText(t)}</div>}<div className="text-[10px] text-muted">{dateBr(t.date).slice(0, 5)}</div></div>
    </li>
  );
}

/** Todas as transferências conhecidas: as recentes com valor (trfm) e o histórico do mundo (previousteam), acumuladas de todos os saves. */
function allTransfers(s: CareerSnapshot) {
  const map = new Map<string, { date: number; playerId: number; fromId: number; fromName: string; toId: number; toName: string; fee?: number; wage?: number }>();
  for (const t of [...(s.worldTransfers ?? []), ...s.transfers]) {
    const k = `${t.playerId}-${t.toId}`;
    const old = map.get(k);
    if (!old || (t.fee != null && old.fee == null)) map.set(k, { ...old, ...t });
  }
  return [...map.values()].sort((a, b) => b.date - a.date);
}
const feeText = (t: { fee?: number }) => t.fee == null ? '—' : t.fee ? money(t.fee) : 'Livre';

/** Mercado: as transferências pelo mundo que o save registra. */
export function TransferMarket({ s, ea }: P) {
  const list = allTransfers(s).filter((t) => t.toId !== s.club.id && t.fromId !== s.club.id);
  const help = 'Transferências entre outros clubes na carreira. O save guarda o clube anterior de cada jogador, então o histórico é completo; o valor só aparece nas mais recentes (o jogo apaga o das antigas, por isso vale enviar saves com frequência).';
  if (!list.length) return <Card title="Mercado de transferências" help={help} empty="Nenhuma transferência registrada neste save. Aparece quando os clubes negociam." />;
  return (
    <Card title="Mercado de transferências" help={help}
      more={() => <Table head={['Data', 'Jogador', 'De', 'Para', 'Valor']} align={['l', 'l', 'l', 'l', 'r']} rows={list.map((t) => [dateBr(t.date), <PlayerName key="n" id={t.playerId} ea={ea} />, t.fromName, t.toName, feeText(t)])} />}>
      <div className="mb-2 text-xs text-muted">{list.length} transferências na carreira</div>
      <ul className="space-y-1">{list.slice(0, 6).map((t, i) => <TransferRow key={i} t={t} s={s} ea={ea} fee={t.fee != null} />)}</ul>
    </Card>
  );
}

export function Transfers({ s, ea }: P) {
  const list = allTransfers(s).filter((t) => t.toId === s.club.id || t.fromId === s.club.id);
  if (!list.length) return <Card title="Transferências do clube" help="Contratações e vendas do seu clube." empty="Seu clube ainda não fez negócios na carreira." />;
  const spent = list.filter((t) => t.toId === s.club.id).reduce((a, t) => a + (t.fee ?? 0), 0);
  const got = list.filter((t) => t.fromId === s.club.id).reduce((a, t) => a + (t.fee ?? 0), 0);
  return (
    <Card title="Transferências do clube" help="Contratações e vendas do seu clube na carreira, com valor e salário quando o save ainda guarda."
      more={() => <Table head={['Data', 'Jogador', 'De', 'Para', 'Valor', 'Salário/sem']} align={['l', 'l', 'l', 'l', 'r', 'r']} rows={list.map((t) => [dateBr(t.date), <PlayerName key="n" id={t.playerId} ea={ea} />, t.fromName, t.toName, feeText(t), t.wage ? money(t.wage) : '—'])} />}>
      <div className="mb-2 flex gap-4 text-xs"><span>Chegaram <b>{list.filter((t) => t.toId === s.club.id).length}</b></span><span>Saíram <b>{list.filter((t) => t.fromId === s.club.id).length}</b></span><span>Gasto <b className="text-bad">{money(spent)}</b></span><span>Recebido <b className="text-good">{money(got)}</b></span></div>
      <ul className="space-y-1">{list.slice(0, 6).map((t, i) => <TransferRow key={i} t={t} s={s} ea={ea} fee={t.fee != null} />)}</ul>
    </Card>
  );
}

export function LeaguePosition({ s, ea }: P) {
  const league0 = s.standings.find((x) => x.isLeague);
  const t = (league0?.rows.some((r) => r.played > 0) ? league0 : s.standings.find((x) => x.rows.some((r) => r.played > 0))) ?? s.standings[0];
  if (!t) return <Card title="Posição na liga" empty="Nenhuma classificação com o seu clube neste save." />;
  const i = t.rows.findIndex((r) => r.teamId === s.club.id);
  const from = Math.max(0, Math.min(i - 3, t.rows.length - 7));
  const rows = t.rows.slice(from, from + 7);
  const league = s.standings.find((x) => x.isLeague);
  const full = () => (
    <div className="space-y-6">{s.standings.map((st) => (
      <div key={st.stageId}>
        <h3 className="mb-2 text-sm font-semibold">{st.title}</h3>
        <Table head={['#', 'Time', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Pts']} align={['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']}
          rows={st.rows.map((r, k) => [k + 1, <span key="t" className={`flex items-center gap-2 ${r.teamId === s.club.id ? 'font-bold text-accent' : ''}`}><Crest id={r.teamId} name={r.name} ea={ea} size={16} />{r.name}</span>, r.played, r.won, r.drawn, r.lost, r.gf, r.ga, r.gf - r.ga, <b key="p">{r.points}</b>])} />
      </div>
    ))}</div>
  );
  return (
    <Card title="Posição na liga" help="Tabela em volta do seu clube. Antes da liga começar, mostra a competição que já está em andamento (ex.: pré-temporada)." more={full}>
      <p className="mb-2 text-xs text-muted">{t.title}{league && !league.rows.some((r) => r.played) && t !== league ? ` · ${league.title} ainda não começou` : ''}</p>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-[11px] text-muted"><tr><th className="text-left">#</th><th className="text-left">Time</th><th>J</th><th>SG</th><th>Pts</th></tr></thead>
        <tbody>
          {rows.map((r, k) => {
            const me = r.teamId === s.club.id;
            return (
              <tr key={r.teamId} className={me ? 'bg-accent/15 font-semibold' : ''}>
                <td className="py-1 pl-1">{from + k + 1}</td>
                <td className="flex items-center gap-2 py-1"><Crest id={r.teamId} name={r.name} ea={ea} size={16} /><span className="truncate">{r.name}</span></td>
                <td className="text-center">{r.played}</td>
                <td className="text-center">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                <td className="text-center">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {(() => { const form = results(s).filter((m) => m.competition === t.title).slice(-5).map((m) => outcome(m, s.club.id)!); return form.length ? <div className="mt-3 flex items-center gap-1 text-xs text-muted">Forma {form.map((r, k) => <FormBadge key={k} r={r} />)}</div> : null; })()}
    </Card>
  );
}

export function TeamPower({ s }: P) {
  return (
    <Card title="Força do time" help="Overall do clube e das linhas de ataque, meio e defesa, como o jogo calcula para o melhor time.">
      <div className="flex items-center gap-5">
        <div className="text-center"><div className="text-5xl font-bold">{s.club.ovr}</div><div className="text-[10px] text-muted">OVR DO TIME</div></div>
        <div className="flex-1 space-y-2"><Bar label="ATA" v={s.club.att} /><Bar label="MEI" v={s.club.mid} /><Bar label="DEF" v={s.club.def} /></div>
      </div>
    </Card>
  );
}

export function StartingXI({ s, ea }: P) {
  const tac = s.tactic;
  const byId = new Map(s.squad.map((p) => [p.id, p]));
  const xi = tac?.players.length === 11 ? tac.players : null;
  const avg = (ids: number[]) => Math.round(ids.reduce((a, id) => a + (byId.get(id)?.ovr ?? 0), 0) / Math.max(1, ids.length));
  return (
    <Card title="Escalação" help="Os titulares da tática salva no jogo, na posição do campo. Embaixo, o OVR médio por linha."
      more={xi ? () => <Table head={['Jogador', 'Posição', 'OVR']} align={['l', 'l', 'r']} rows={xi.map((p) => [<PlayerName key="n" id={p.playerId} ea={ea} />, posLabel(p.pos), <Ovr key="o" v={byId.get(p.playerId)?.ovr ?? 0} />])} /> : undefined}>
      {tac && <p className="mb-2 text-xs text-muted">{tac.formation} · {tac.name}</p>}
      {xi ? (
        <div className="relative mx-auto h-[330px] max-w-[320px] rounded-md bg-gradient-to-b from-[#1d4d2b] to-[#163c22]">
          {xi.map((p) => {
            const pl = byId.get(p.playerId);
            return (
              <div key={p.playerId} className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: `${p.x * 100}%`, top: `${92 - p.y * 84}%` }}>
                <div className="relative"><Face id={p.playerId} ea={ea} size={32} />{pl && <span className="absolute -right-3 -top-1"><Ovr v={pl.ovr} /></span>}</div>
                <span className="mt-0.5 w-full truncate text-[10px] font-semibold"><PN id={p.playerId} ea={ea} />{p.playerId === tac!.captain ? ' (C)' : ''}</span>
              </div>
            );
          })}
        </div>
      ) : <LegacyXI s={s} ea={ea} />}
      {xi && <p className="mt-2 text-center text-[11px] text-muted">OVR médio dos titulares <b className="text-white">{avg(xi.map((p) => p.playerId))}</b></p>}
    </Card>
  );
}

function LegacyXI({ s, ea }: P) {
  const xi = starters(s);
  const rows = (['ATA', 'MEI', 'DEF', 'GOL'] as const).map((l) => xi.filter((p) => lineOf(p.slot < 28 ? p.slot : p.pos) === l).sort((a, b) => xOf(a.slot < 28 ? a.slot : a.pos) - xOf(b.slot < 28 ? b.slot : b.pos)));
  return (
    <div className="space-y-3 rounded-md bg-gradient-to-b from-[#1d4d2b] to-[#163c22] p-3">
      {rows.map((r, i) => (
        <div key={i} className="flex justify-center gap-3">
          {r.map((p) => (
            <div key={p.id} className="flex w-16 flex-col items-center text-center">
              <div className="relative"><Face id={p.id} ea={ea} size={32} /><span className="absolute -right-3 -top-1"><Ovr v={p.ovr} /></span></div>
              <span className="mt-1 w-full truncate text-[11px] font-semibold"><PN id={p.id} ea={ea} /></span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SquadOverview({ s, ea }: P) {
  const n = s.squad.length;
  const avgAge = s.squad.reduce((a, p) => a + p.age, 0) / Math.max(1, n);
  const u21 = s.squad.filter((p) => p.age <= 21).length;
  const best = s.squad[0];
  const bestPot = [...s.squad].sort((a, b) => b.pot - a.pot)[0];
  const nations = new Set(s.squad.map((p) => p.nationality)).size;
  const wages = s.squad.reduce((a, p) => a + p.wage, 0);
  return (
    <Card title="Elenco" help="Tamanho do elenco, idade média, sub-21, melhor jogador e maior potencial. Em Ver tudo, o elenco inteiro." more={() => <SquadTable s={s} ea={ea} cols="geral" />}>
      <Stat label="Jogadores" value={n} />
      <Stat label="Idade média" value={avgAge.toFixed(1).replace('.', ',')} />
      <Stat label="Sub-21" value={u21} />
      <Stat label="Nacionalidades" value={nations} />
      <Stat label="Folha salarial (semana)" value={money(wages)} />
      <ul className="mt-2 border-t border-line pt-2">
        {best && <PlayerLine p={best} ea={ea} right={<><span className="text-xs text-muted">melhor jogador</span><Ovr v={best.ovr} /></>} />}
        {bestPot && <PlayerLine p={bestPot} ea={ea} right={<><span className="text-xs text-muted">maior potencial</span><Ovr v={bestPot.pot} /></>} />}
      </ul>
    </Card>
  );
}

export function Contracts({ s, ea }: P) {
  const season = seasonOf(fromYmd(s.gameDate));
  const list = s.squad.filter((p) => p.contractUntil <= season.end + 1).sort((a, b) => a.contractUntil - b.contractUntil || b.ovr - a.ovr);
  const all = [...s.squad].sort((a, b) => a.contractUntil - b.contractUntil || b.ovr - a.ovr);
  return (
    <Card title="Contratos acabando" help={`Jogadores com contrato até ${season.end} (fim desta temporada) ou ${season.end + 1}.`}
      more={() => <Table head={['Jogador', 'Pos', 'Idade', 'Contrato até', 'Salário/sem', 'OVR']} align={['l', 'l', 'r', 'r', 'r', 'r']} rows={all.map((p) => [<PlayerName key="n" id={p.id} ea={ea} />, posLabel(p.pos), p.age, <span key="c" className={p.contractUntil <= season.end ? 'text-bad' : p.contractUntil <= season.end + 1 ? 'text-mid' : ''}>{p.contractUntil}</span>, money(p.wage), <Ovr key="o" v={p.ovr} />])} />}>
      <div className="mb-2 flex items-baseline gap-2"><span className="text-4xl font-bold">{list.length}</span><span className="text-xs text-muted">contratos acabam em {season.end + 1} ou antes</span></div>
      {list.length === 0 ? <p className="text-sm text-muted">Nenhum contrato vence nas próximas duas temporadas.</p> : (
        <ul>{list.slice(0, 7).map((p) => (
          <PlayerLine key={p.id} p={p} ea={ea} right={<><span className={`text-xs ${p.contractUntil <= season.end ? 'text-bad' : 'text-mid'}`}>até {p.contractUntil}</span><Ovr v={p.ovr} /></>} />
        ))}</ul>
      )}
    </Card>
  );
}

export function Wages({ s, ea }: P) {
  const total = s.squad.reduce((a, p) => a + p.wage, 0);
  const top = [...s.squad].sort((a, b) => b.wage - a.wage).slice(0, 5);
  return (
    <Card title="Salários" help="Folha salarial do elenco e os maiores salários.">
      <Stat label="Folha total por semana" value={money(total)} />
      <Stat label="Média por jogador (semana)" value={money(Math.round(total / Math.max(1, s.squad.length)))} />
      <ul className="mt-2 border-t border-line pt-2">{top.map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="text-xs tabular-nums">{money(p.wage)}/sem</span>} />)}</ul>
    </Card>
  );
}

const stars = (n: number) => '★'.repeat(Math.round(n / 2)).padEnd(5, '☆');

export function Club({ s, ea }: P) {
  const c = s.club;
  const ten = (n: number) => `${n}/10`;
  return (
    <Card title="Clube" help="Valor, prestígio, popularidade, categoria de base, rival e títulos, do banco do jogo.">
      <Stat label="Valor do clube" value={c.clubWorth ? money(c.clubWorth * 1000) : '—'} />
      <Stat label="Prestígio nacional" value={ten(c.domesticPrestige)} />
      <Stat label="Prestígio internacional" value={ten(c.internationalPrestige)} />
      {c.popularity > 0 && <Stat label="Popularidade" value={ten(c.popularity)} />}
      <Stat label="Categoria de base" value={ten(c.youthDevelopment)} />
      <Stat label="Rival" value={<span className="flex items-center gap-1"><Crest id={c.rivalId} name={c.rivalName} ea={ea} size={16} />{c.rivalName}</span>} />
      <Stat label="Estádio" value={`${c.stadiumCapacity.toLocaleString('pt-BR')} lugares`} />
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        <div><div className="text-2xl font-bold">{c.leagueTitles}</div><div className="text-[10px] text-muted">Títulos da liga</div></div>
        <div><div className="text-2xl font-bold">{c.domesticCups}</div><div className="text-[10px] text-muted">Copas nacionais</div></div>
        <div><div className="text-2xl font-bold">{c.prevPosition ? `${c.prevPosition}º` : '—'}</div><div className="text-[10px] text-muted">Última liga</div></div>
      </div>
    </Card>
  );
}

const BUILD_UP = ['Equilibrada', 'Jogo curto', 'Bola longa', 'Contra-ataque rápido'];

export function SetPieces({ s, ea }: P) {
  const t = s.tactic;
  const byId = new Map(s.squad.map((p) => [p.id, p]));
  if (!t) {
    const c = s.club;
    const row = (label: string, id: number) => <Stat label={label} value={id > 0 ? ea.player(id).short : '—'} />;
    return <Card title="Tática e bolas paradas" help="Capitão e cobradores definidos no time salvo.">{row('Capitão', c.captainId)}{row('Pênaltis', c.penaltyTakerId)}{row('Faltas', c.freeKickTakerId)}{row('Escanteios', c.cornerTakerId)}</Card>;
  }
  const row = (label: string, ids: number[]) => {
    const list = [...new Set(ids.filter((x) => x > 0))];
    return (
      <li className="flex items-center gap-2 border-b border-line/60 py-1.5 text-sm">
        <span className="w-36 text-[11px] font-semibold uppercase text-muted">{label}</span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3">{list.length ? list.map((id) => <span key={id} className="flex items-center gap-1"><Face id={id} ea={ea} size={20} /><PN id={id} ea={ea} /></span>) : '—'}</span>
        {list[0] && byId.get(list[0]) && <Ovr v={byId.get(list[0])!.ovr} />}
      </li>
    );
  };
  return (
    <Card wide title="Tática e bolas paradas" help="A tática salva no jogo: formação, capitão, cobradores de bola parada, apoio nos escanteios, profundidade defensiva, saída de bola e o código para compartilhar a tática.">
      <p className="mb-3 text-xs text-muted">{t.formation} · {t.name}</p>
      <ul>
        {row('Capitão', [t.captain])}
        {row('Pênaltis', [t.penalties])}
        {row('Faltas E / D', [t.freeKickL, t.freeKickR])}
        {row('Escanteios E / D', [t.cornerL, t.cornerR])}
        {row('Faltas longas', [t.longKick])}
        {row('Lateral esquerdo', [t.throwL])}
        {row('Lateral direito', [t.throwR])}
        {row('Apoio no escanteio', t.cornerSupport)}
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-3">
        <Stat label="Profundidade defensiva" value={t.defensiveDepth} />
        <Stat label="Saída de bola" value={BUILD_UP[t.buildUp] ?? t.buildUp} />
        {t.code && <Stat label="Código da tática" value={<span className="flex items-center gap-2 font-mono">{t.code}<button className="rounded border border-line px-1.5 text-[11px] text-muted hover:text-white" onClick={() => navigator.clipboard?.writeText(t.code)}>Copiar</button></span>} />}
      </div>
    </Card>
  );
}

export function LastMatch({ s, ea }: P) {
  const last = Math.max(0, ...s.ratings.map((r) => r.date));
  const rows = s.ratings.filter((r) => r.date === last).sort((a, b) => b.rating - a.rating);
  if (!rows.length) return <Card title="Último jogo" help="Notas e minutos do último jogo do seu time." empty="Nenhum jogo disputado ainda neste save." />;
  const byId = new Map(s.squad.map((p) => [p.id, p]));
  return (
    <Card title="Último jogo" help="Notas e minutos do último jogo, da tabela de notas da carreira.">
      <p className="mb-2 text-xs text-muted">{dateBr(last)}</p>
      <ul>{rows.slice(0, 8).map((r) => {
        const p = byId.get(r.playerId);
        return p ? <PlayerLine key={r.playerId} p={p} ea={ea} right={<><span className="text-xs text-muted">{r.minutes}&apos;</span><span className="w-6 text-right font-semibold tabular-nums">{r.rating}</span></>} /> : null;
      })}</ul>
    </Card>
  );
}

const ROLE = ['', 'Crucial', 'Importante', 'Rodízio', 'Esporádico', 'Promessa'] as const;
const ROLE_COLOR = ['', 'text-accent', 'text-good', 'text-mid', 'text-muted', 'text-[#c084fc]'] as const;

export function SquadMorale({ s, ea }: P) {
  const m = s.morale;
  if (!m) return <Card title="Moral do elenco" empty="Este save não trouxe a moral do elenco." />;
  const low = s.squad.filter((p) => p.morale != null).sort((a, b) => a.morale! - b.morale!).slice(0, 3);
  return (
    <Card title="Moral do elenco" help="Média da moral do elenco e o que pesa nela: desempenho do time, do jogador, contrato e tempo de jogo. Abaixo, os 3 mais insatisfeitos." more={() => <SquadTable s={s} ea={ea} cols="moral" />}>
      <div className="mb-2 flex items-baseline gap-2"><span className="text-4xl font-bold">{m.average}</span><span className="text-xs text-muted">média do elenco</span></div>
      <Stat label="Desempenho do time" value={m.teamPerformance} />
      <Stat label="Desempenho do jogador" value={m.playerPerformance} />
      <Stat label="Contrato" value={m.contract} />
      <Stat label="Tempo de jogo" value={m.playingTime} />
      <p className="mt-2 border-t border-line pt-2 text-[11px] font-semibold text-muted">MORAL MAIS BAIXA</p>
      <ul>{low.map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="w-6 text-right font-semibold tabular-nums">{p.morale}</span>} />)}</ul>
    </Card>
  );
}

export function SquadRoles({ s, ea }: P) {
  const counts = [1, 2, 3, 4, 5].map((r) => s.squad.filter((p) => p.role === r).length);
  if (!counts.some(Boolean)) return <Card title="Papéis e salários" empty="Este save não trouxe os papéis do elenco." />;
  const season = seasonOf(fromYmd(s.gameDate));
  const months = (until: number) => Math.max(0, (until - season.start) * 12 - ((fromYmd(s.gameDate).getUTCMonth() + 6) % 12));
  const top = [...s.squad].sort((a, b) => b.wage - a.wage).slice(0, 5);
  return (
    <Card title="Papéis e salários" help="Quantos jogadores há em cada papel prometido (crucial, importante, rodízio, esporádico, promessa) e os maiores salários, com o fim do contrato." more={() => <SquadTable s={s} ea={ea} cols="papeis" />}>
      <div className="mb-3 grid grid-cols-5 gap-1 text-center">
        {counts.map((n, i) => <div key={i}><div className="text-xl font-bold">{n}</div><div className="text-[10px] text-muted">{ROLE[i + 1]}</div></div>)}
      </div>
      <ul>{top.map((p) => (
        <li key={p.id} className="flex items-center gap-2 py-1 text-sm">
          <Face id={p.id} ea={ea} size={24} />
          <div className="min-w-0 flex-1">
            <div className="truncate"><PN id={p.id} ea={ea} /></div>
            <div className="text-[11px] text-muted"><span className={p.role ? ROLE_COLOR[p.role] : ''}>{p.role ? ROLE[p.role] : '—'}</span> · até {p.contractUntil} · {months(p.contractUntil)} meses</div>
          </div>
          <span className="text-xs font-semibold tabular-nums">{money(p.wage)}/sem</span>
        </li>
      ))}</ul>
    </Card>
  );
}

/** Tipos de movimentação do módulo tfnm. 13, 16 e 18 conferidos com o CM Tracker; 7, 9 e 11 aparecem em dias de jogo em casa (palpite). */
const TX: Record<number, { label: string; sign: 1 | -1 | 0 }> = {
  13: { label: 'Merchandising', sign: 1 }, 16: { label: 'Salários dos jogadores', sign: -1 }, 18: { label: 'Salários da comissão', sign: -1 },
  7: { label: 'Renda de jogo em casa', sign: 1 }, 9: { label: 'Custos de dia de jogo', sign: -1 }, 11: { label: 'Prêmio / bônus', sign: 0 },
};
function TxLine({ t }: { t: { date: number; amount: number; type: number } }) {
  const k = TX[t.type] ?? { label: `Movimentação (tipo ${t.type})`, sign: 0 };
  return (
    <li className="flex items-center gap-2 py-1 text-sm">
      <span className="text-muted">{k.sign > 0 ? '↙' : '↗'}</span>
      <div className="flex-1"><div>{k.label}</div><div className="text-[11px] text-muted">{dateBr(t.date)}</div></div>
      <span className={`font-semibold tabular-nums ${k.sign > 0 ? 'text-good' : k.sign < 0 ? 'text-bad' : ''}`}>{k.sign > 0 ? '+' : k.sign < 0 ? '−' : ''}{money(t.amount)}</span>
    </li>
  );
}

export function ClubFinances({ s }: P) {
  const f = s.finances;
  if (!f) return <Card title="Finanças" empty="Este save não trouxe o orçamento do clube." />;
  const used = Math.max(0, f.initialBudget - f.currentBudget);
  const pct = f.initialBudget ? Math.round((f.currentBudget / f.initialBudget - 1) * 100) : 0;
  const wages = s.squad.reduce((a, p) => a + p.wage, 0);
  return (
    <Card title="Finanças" help="Orçamento de transferências no início da temporada, quanto já foi usado, os principais gastos e as últimas movimentações do clube."
      more={f.transactions?.length ? () => <ul>{f.transactions!.map((t, i) => <TxLine key={i} t={t} />)}</ul> : undefined}>
      <div className="mb-1 flex items-baseline justify-between"><span className="text-xs text-muted">Orçamento atual</span><span className={`text-xs ${pct < 0 ? 'text-bad' : 'text-good'}`}>{pct > 0 ? '+' : ''}{pct}%</span></div>
      <div className="title mb-2 text-3xl">{money(f.currentBudget)}</div>
      <div className="mb-1 h-2 overflow-hidden rounded bg-card-2"><div className="h-full bg-accent" style={{ width: `${Math.min(100, (f.currentBudget / Math.max(1, f.initialBudget)) * 100)}%` }} /></div>
      <div className="mb-3 flex justify-between text-[11px] text-muted"><span>Usado {money(used)}</span><span>Verba inicial {money(f.initialBudget)}</span></div>
      <Stat label="Compra de atletas" value={<span className="text-bad">−{money(f.spentOnPlayers)}</span>} />
      <Stat label="Aumentos salariais" value={<span className="text-bad">−{money(f.wageRaises)}</span>} />
      <Stat label="Folha do elenco (semana)" value={money(wages)} />
      {!!f.transactions?.length && <>
        <p className="mt-2 border-t border-line pt-2 text-[11px] font-semibold text-muted">ÚLTIMAS MOVIMENTAÇÕES</p>
        <ul>{f.transactions.slice(0, 4).map((t, i) => <TxLine key={i} t={t} />)}</ul>
      </>}
    </Card>
  );
}

const nota = (x: number) => x.toFixed(2).replace('.', ',');

/** Soma as competições oficiais do seu time (sem pré-temporada). */
function seasonTotals(s: CareerSnapshot): StatLine[] {
  const by = new Map<number, StatLine>();
  for (const c of s.stats ?? []) {
    if (/pré-temporada/i.test(c.competition)) continue;
    for (const l of c.players) {
      if (l.teamId !== s.club.id) continue;
      const x = by.get(l.playerId);
      if (!x) { by.set(l.playerId, { ...l }); continue; }
      const apps = x.apps + l.apps;
      by.set(l.playerId, { ...x, apps, minutes: x.minutes + l.minutes, goals: x.goals + l.goals, assists: x.assists + l.assists,
        cleanSheets: x.cleanSheets + l.cleanSheets, potm: x.potm + l.potm, yellows: x.yellows + l.yellows,
        avgRating: apps ? (x.avgRating * x.apps + l.avgRating * l.apps) / apps : 0 });
    }
  }
  return [...by.values()];
}

export function SeasonLeaders({ s, ea }: P) {
  const all = seasonTotals(s);
  const row = (label: string, id: number | undefined, value: React.ReactNode) => id == null ? null : (
    <li key={label} className="flex items-center gap-2 py-1.5">
      <Face id={id} ea={ea} size={30} />
      <div className="min-w-0 flex-1"><div className="text-[11px] text-muted">{label}</div><div className="truncate text-sm font-semibold"><PN id={id} ea={ea} /></div></div>
      <span className="text-xl font-bold tabular-nums">{value}</span>
    </li>
  );
  if (all.length) {
    const top = (f: (x: StatLine) => number, list = all) => { const x = [...list].sort((a, b) => f(b) - f(a))[0]; return x && f(x) > 0 ? x : undefined; };
    const minApps = Math.max(1, Math.ceil(Math.max(...all.map((x) => x.apps)) / 3));
    const g = top((x) => x.goals), a = top((x) => x.assists), m = top((x) => x.apps), cs = top((x) => x.cleanSheets), p = top((x) => x.potm);
    const r = top((x) => x.avgRating, all.filter((x) => x.apps >= minApps));
    return (
      <Card title="Destaques da temporada" help="Líderes do seu time somando as competições oficiais da temporada (sem amistosos e pré-temporada). MC = melhor em campo."
        more={() => <Table head={['Jogador', 'J', 'Min', 'G', 'A', 'Sem sofrer', 'MC', 'Amar.', 'Nota']} align={['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']}
        rows={[...all].sort((a, b) => b.goals - a.goals || b.apps - a.apps).map((x) => [<PlayerName key="n" id={x.playerId} ea={ea} sub={undefined} />, x.apps, x.minutes, x.goals, x.assists, x.cleanSheets, x.potm, x.yellows, nota(x.avgRating)])} />}>
        <ul>
          {row('Artilheiro', g?.playerId, g?.goals)}
          {row('Assistências', a?.playerId, a?.assists)}
          {row('Mais jogos', m?.playerId, m?.apps)}
          {row('Jogos sem sofrer gol', cs?.playerId, cs?.cleanSheets)}
          {row(`Melhor nota média (${minApps}+ jogos)`, r?.playerId, r && nota(r.avgRating))}
          {row('Melhor em campo', p?.playerId, p?.potm)}
        </ul>
      </Card>
    );
  }
  const start = seasonOf(fromYmd(s.gameDate)).start * 10000 + 701;
  const inSquad = new Set(s.squad.map((p) => p.id));
  const scorer = s.scorers.find((x) => inSquad.has(x.playerId));
  const apps = new Map<number, { n: number; sum: number }>();
  for (const r of s.ratings) if (r.date >= start && r.minutes > 0) { const x = apps.get(r.playerId) ?? { n: 0, sum: 0 }; x.n++; x.sum += r.rating; apps.set(r.playerId, x); }
  const most = [...apps].sort((a, b) => b[1].n - a[1].n)[0];
  if (!scorer && !most) return <Card title="Destaques da temporada" help="Artilheiro, assistências, mais jogos, jogos sem sofrer gol e melhor nota média do seu time." empty="Ainda não há jogos nesta temporada." />;
  return (
    <Card title="Destaques da temporada" help="Artilheiro e quem mais jogou (histórico de jogos do técnico).">
      <ul>
        {row('Artilheiro', scorer?.playerId, scorer?.goals)}
        {row('Mais jogos', most?.[0], most?.[1].n)}
      </ul>
    </Card>
  );
}

const RACE = [
  { id: 'goals', label: 'Gols', f: (x: StatLine) => x.goals },
  { id: 'assists', label: 'Assist.', f: (x: StatLine) => x.assists },
  { id: 'cs', label: 'Sem sofrer gol', f: (x: StatLine) => x.cleanSheets },
  { id: 'rating', label: 'Nota média', f: (x: StatLine) => x.avgRating },
] as const;

export function GoldenBoot({ s, ea }: P) {
  const comps = (s.stats ?? []).filter((c) => !/pré-temporada/i.test(c.competition));
  const [ci, setCi] = useState(0);
  const [ti, setTi] = useState(0);
  if (!comps.length) return <Card title="Corrida da artilharia" help="Gols, assistências, jogos sem sofrer gol e nota média por competição." empty="Ainda não há jogos oficiais nesta temporada." />;
  const c = comps[Math.min(ci, comps.length - 1)]!;
  const t = RACE[ti]!;
  const teamName = new Map(s.standings.flatMap((x) => x.rows.map((r) => [r.teamId, r.name] as const)));
  const minApps = Math.max(1, Math.ceil(Math.max(...c.players.map((x) => x.apps)) / 3));
  const list = [...c.players].filter((x) => t.id !== 'rating' || x.apps >= minApps).filter((x) => t.f(x) > 0)
    .sort((a, b) => t.f(b) - t.f(a) || a.apps - b.apps).slice(0, 5);
  return (
    <Card title="Corrida da artilharia" help={`Líderes de ${c.competition}${c.isLeague ? ' (todos os times)' : ' (seu time)'}. Nota média só para quem tem ${minApps}+ jogos.`}
      action={comps.length > 1 ? (
        <select value={ci} onChange={(e) => setCi(+e.target.value)} className="rounded border border-line bg-card-2 px-1 py-0.5 text-xs">
          {comps.map((x, i) => <option key={x.competitionId} value={i}>{x.competition}</option>)}
        </select>
      ) : <span className="text-xs text-muted">{c.competition}</span>}
      more={() => <Table head={['Jogador', 'J', 'Min', 'G', 'A', 'Sem sofrer', 'MC', 'Amar.', 'Nota']} align={['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']}
        rows={[...c.players].sort((a, b) => b.goals - a.goals || b.apps - a.apps).map((x) => [<PlayerName key="n" id={x.playerId} ea={ea} sub={teamName.get(x.teamId) ?? (x.teamId === s.club.id ? s.club.name : '')} />, x.apps, x.minutes, x.goals, x.assists, x.cleanSheets, x.potm, x.yellows, nota(x.avgRating)])} />}>
      <div className="mb-2 flex gap-1">
        {RACE.map((x, i) => (
          <button key={x.id} onClick={() => setTi(i)} className={`rounded px-2 py-0.5 text-xs ${i === ti ? 'bg-accent text-black' : 'bg-card-2 text-muted hover:text-white'}`}>{x.label}</button>
        ))}
      </div>
      {list.length ? (
        <ol>
          {list.map((x, i) => (
            <li key={x.playerId} className={`flex items-center gap-2 py-1 ${x.teamId === s.club.id ? 'text-white' : 'text-[#cfcfd6]'}`}>
              <span className="w-4 text-right text-xs text-muted">{i + 1}</span>
              <Face id={x.playerId} ea={ea} size={26} />
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm ${x.teamId === s.club.id ? 'font-semibold' : ''}`}><PN id={x.playerId} ea={ea} /></div>
                <div className="flex items-center gap-1 text-[11px] text-muted"><Crest id={x.teamId} name={teamName.get(x.teamId) ?? ''} ea={ea} size={12} />{teamName.get(x.teamId) ?? (x.teamId === s.club.id ? s.club.name : '')} · {x.apps} jogos</div>
              </div>
              <span className="text-lg font-bold tabular-nums">{t.id === 'rating' ? nota(x.avgRating) : t.f(x)}</span>
            </li>
          ))}
        </ol>
      ) : <p className="text-sm text-muted">Ninguém pontuou nesta categoria ainda.</p>}
    </Card>
  );
}

const OBJECTIVE: Record<number, string> = { 0: 'Ser campeão da liga', 6: 'Conseguir o acesso direto' };

const MANAGER_AWARD: Record<number, string> = { 0: 'Técnico do mês' };
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function ManagerCV({ s }: P) {
  const m = s.manager;
  if (!m) return <Card title="Currículo do técnico" empty="Não achei o técnico neste save." />;
  const clubs = m.history ?? [];
  return (
    <Card title="Currículo do técnico" help="Salário, ganhos na carreira, maior vitória e pior sequência de derrotas, e os clubes por onde passou.">
      <p className="mb-2 text-sm font-semibold">{m.name}</p>
      {m.wage != null && <Stat label="Salário do técnico" value={money(m.wage)} />}
      {m.earnings != null && <Stat label="Ganhos na carreira" value={money(m.earnings)} />}
      <Stat label="Maior vitória" value={m.biggestWin ? `${m.biggestWin.score} vs ${m.biggestWin.opponent}` : '—'} />
      <Stat label="Pior sequência de derrotas" value={m.worstStreak ?? 0} />
      <Stat label="No clube desde" value={dateBr(m.joined)} />
      {(m.awards?.length ?? 0) > 0 && <Stat label="Prêmios" value={m.awards!.map((a) => `${MANAGER_AWARD[a.type] ?? 'Prêmio'} (${MONTHS[fromYmd(a.date).getUTCMonth()]}/${String(fromYmd(a.date).getUTCFullYear()).slice(2)}, ${a.teamName})`).join(' · ')} />}
      {clubs.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
          {clubs.map((c, i) => (
            <li key={i}><span className="font-semibold text-white">{c.teamName}</span> <span className="text-muted">· {c.league} · {c.played} J, {c.won}V {c.drawn}E {c.lost}D, {c.points} pts{c.position ? ` · ${c.position}º` : ''}</span></li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function JobSecurity({ s }: P) {
  const v = s.manager?.jobSecurity;
  if (v == null) return <Card title="Segurança no cargo" empty="Este save não trouxe a segurança no cargo." />;
  const color = v >= 60 ? '#22c55e' : v >= 35 ? '#eab308' : '#ef4444';
  const label = v >= 60 ? 'SEGURO' : v >= 35 ? 'ATENÇÃO' : 'EM RISCO';
  const a = Math.PI * (1 - v / 100);
  return (
    <Card title="Segurança no cargo" help="Confiança da diretoria no seu trabalho (0 a 100). Abaixo de 35 o risco de demissão é alto.">
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 120 70" className="w-48">
          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#2c2c30" strokeWidth="10" strokeLinecap="round" />
          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} />
          <line x1="60" y1="60" x2={60 + 42 * Math.cos(a)} y2={60 - 42 * Math.sin(a)} stroke="#ececf1" strokeWidth="2" />
        </svg>
        <div className="-mt-2 text-4xl font-bold">{v}</div>
        <span className="mt-1 rounded px-2 py-0.5 text-[11px] font-semibold text-black" style={{ background: color }}>{label}</span>
      </div>
    </Card>
  );
}

export function SeasonHistory({ s }: P) {
  const h = s.manager?.history ?? [];
  if (!h.length) return <Card title="Histórico de temporadas" empty="Nenhuma temporada registrada ainda." />;
  return (
    <Card wide title="Histórico de temporadas" help="Cada temporada do técnico: clube, liga, posição, objetivo da diretoria, campanha e gols.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm tabular-nums">
          <thead className="text-[11px] text-muted"><tr><th className="text-left">Clube</th><th className="text-left">Liga</th><th>Pos</th><th className="text-left">Objetivo</th><th>V-E-D</th><th>J</th><th>Pts</th><th>Gols</th></tr></thead>
          <tbody>{h.map((x, i) => (
            <tr key={i} className="border-t border-line">
              <td className="py-1.5 font-semibold">{x.teamName}</td><td className="text-muted">{x.league}</td>
              <td className="text-center">{x.position || '—'}</td><td className="text-xs">{OBJECTIVE[x.objective] ?? 'Objetivo da diretoria'}</td>
              <td className="text-center">{x.won}-{x.drawn}-{x.lost}</td><td className="text-center">{x.played}</td>
              <td className="text-center">{x.points}</td><td className="text-center">{x.goalsFor}-{x.goalsAgainst}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Card>
  );
}

export function YouthAcademy({ s, ea }: P) {
  const y = s.youth;
  return (
    <Card title="Categoria de base" help="Jogadores na sua base, com posição, idade, overall e potencial."
      more={y.length > 6 ? () => <Table head={['Jogador', 'Pos', 'Idade', 'OVR', 'POT']} align={['l', 'l', 'r', 'r', 'r']} rows={y.map((p) => [<PlayerName key="n" id={p.id} ea={ea} />, posLabel(p.pos), p.age, <Ovr key="o" v={p.ovr} />, <Ovr key="p" v={p.pot} />])} /> : undefined}>
      <div className="mb-2 flex items-baseline gap-2"><span className="text-4xl font-bold">{y.length}</span><span className="text-xs text-muted">jogadores na base</span></div>
      {y.length === 0 ? <p className="text-sm text-muted">Base vazia. Mande um olheiro buscar jovens.</p> : (
        <ul>{y.slice(0, 6).map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-1 text-sm">
            <Face id={p.id} ea={ea} size={24} />
            <span className="truncate">{ea.player(p.id).name}</span>
            <span className="text-xs text-muted">{posLabel(p.pos)} · {p.age} anos</span>
            <span className="ml-auto flex items-center gap-1"><Ovr v={p.ovr} /><span className="text-[10px] text-muted">→</span><Ovr v={p.pot} /></span>
          </li>
        ))}</ul>
      )}
    </Card>
  );
}

export function ScoutStaff({ s }: P) {
  // O jogo guarda 0–4; na tela do jogo são 1–5 estrelas.
  const st = (n: number) => '★'.repeat(Math.min(5, n + 1)).padEnd(5, '☆');
  return (
    <Card title="Olheiros" help="Olheiros contratados, com experiência e julgamento (estrelas)."
      more={s.scouts.length > 4 ? () => <Table head={['Olheiro', 'Experiência', 'Julgamento']} rows={s.scouts.map((x) => [x.name, st(x.experience), st(x.knowledge)])} /> : undefined}>
      {s.scouts.length === 0 ? <p className="text-sm text-muted">Nenhum olheiro contratado.</p> : (
        <ul className="space-y-2">{s.scouts.map((x, i) => (
          <li key={i} className="text-sm">
            <div className="font-semibold">{x.name}</div>
            <div className="flex gap-4 text-[11px] text-muted"><span>Experiência <span className="text-mid">{st(x.experience)}</span></span><span>Julgamento <span className="text-mid">{st(x.knowledge)}</span></span></div>
          </li>
        ))}</ul>
      )}
    </Card>
  );
}

/** Identidade da carreira: técnico, saves enviados e desde quando. */
export function CareerIdentity({ s, career }: P) {
  const first = career?.snaps[0] ?? s;
  const clubs = [...new Set((career?.snaps ?? [s]).map((x) => x.club.name))];
  return (
    <Card title="Identidade da carreira" help="A carreira é reconhecida pelo técnico. Saves do mesmo técnico entram na mesma carreira, mesmo se ele trocar de clube.">
      <p className="mb-2 font-semibold">{s.manager?.name ?? '—'}</p>
      <Stat label="Primeiro save enviado" value={dateBr(first.gameDate)} />
      <Stat label="Clubes na carreira" value={clubs.join(' → ')} />
      <Stat label="Temporada atual" value={s.season} />
      <Stat label="Slot do save" value={<span className="text-xs">{s.slotName}</span>} />
    </Card>
  );
}

/** Situação dos saves enviados desta carreira. */
export function SaveStatus({ s, career }: P) {
  const snaps = career?.snaps ?? [s];
  const seasons = new Set(snaps.map((x) => x.season)).size;
  return (
    <Card title="Status do save" help="Data do jogo no último save, temporada e quantos saves e temporadas desta carreira já foram enviados."
      more={snaps.length > 1 ? () => <Table head={['Data no jogo', 'Clube', 'Temporada', 'Slot', 'Enviado em']} rows={[...snaps].reverse().map((x) => [dateBr(x.gameDate), x.club.name, x.season, x.slotName, new Date(x.importedAt).toLocaleString('pt-BR')])} /> : undefined}>
      <Stat label="Data no jogo" value={dateBr(s.gameDate)} />
      <Stat label="Temporada" value={s.season} />
      <Stat label="Temporadas acompanhadas" value={seasons} />
      <Stat label="Saves enviados" value={snaps.length} />
      <Stat label="Último envio" value={new Date(s.importedAt).toLocaleString('pt-BR')} />
    </Card>
  );
}

/** O que mudou entre o save anterior e o atual desta carreira. */
export function WhatChanged({ s, ea, career }: P) {
  const prev = career?.previous;
  if (!prev) return <Card title="O que mudou desde o último save" help="Compara este save com o anterior da mesma carreira: contratações, saídas, mudanças de OVR, resultados e orçamento." empty="Aparece quando você enviar o segundo save desta carreira." />;
  if (prev.club.id !== s.club.id) return (
    <Card title="O que mudou desde o último save" help="Compara este save com o anterior da mesma carreira.">
      <p className="mb-2 text-xs text-muted">{dateBr(prev.gameDate)} → {dateBr(s.gameDate)}</p>
      <p className="text-sm">Trocou de clube: <b>{prev.club.name}</b> → <b>{s.club.name}</b></p>
      <p className="mt-2 text-sm text-muted">Os próximos saves no {s.club.name} vão mostrar contratações, saídas e mudanças de OVR.</p>
    </Card>
  );
  const before = new Map(prev.squad.map((p) => [p.id, p]));
  const now = new Map(s.squad.map((p) => [p.id, p]));
  const joined = s.squad.filter((p) => !before.has(p.id));
  const left = prev.squad.filter((p) => !now.has(p.id));
  const ovr = s.squad.filter((p) => before.has(p.id) && before.get(p.id)!.ovr !== p.ovr).map((p) => ({ p, d: p.ovr - before.get(p.id)!.ovr })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const games = s.matches.filter((m) => m.played && m.date > prev.gameDate);
  const budget = s.finances && prev.finances ? s.finances.currentBudget - prev.finances.currentBudget : 0;
  const lines: React.ReactNode[] = [
    games.length ? <span key="g">{games.length} jogo(s): {games.map((m) => `${m.homeName} ${m.homeGoals}–${m.awayGoals} ${m.awayName}`).slice(-3).join(' · ')}</span> : null,
    ...joined.map((p) => <span key={'j' + p.id}><span className="text-good">Chegou</span> <PN id={p.id} ea={ea} /></span>),
    ...left.map((p) => <span key={'l' + p.id}><span className="text-bad">Saiu</span> <PN id={p.id} ea={ea} /></span>),
    budget ? <span key="b">Orçamento {budget > 0 ? '+' : '−'}{money(Math.abs(budget))}</span> : null,
    ...ovr.map(({ p, d }) => <span key={'o' + p.id}><PN id={p.id} ea={ea} /> <span className={d > 0 ? 'text-good' : 'text-bad'}>{d > 0 ? '+' : ''}{d} OVR</span> ({p.ovr})</span>),
  ].filter(Boolean);
  return (
    <Card title="O que mudou desde o último save" help={`Comparação com o save de ${dateBr(prev.gameDate)}: jogos, contratações, saídas, orçamento e mudanças de OVR (o OVR do FC 27 varia com forma, moral e condição).`}
      more={lines.length > 9 ? () => <ul className="space-y-1 text-sm">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : undefined}>
      <p className="mb-2 text-xs text-muted">{dateBr(prev.gameDate)} → {dateBr(s.gameDate)}</p>
      {lines.length ? <ul className="space-y-1 text-sm">{lines.slice(0, 9).map((l, i) => <li key={i}>{l}</li>)}</ul> : <p className="text-sm text-muted">Nada mudou entre os dois saves.</p>}
    </Card>
  );
}

/** Competições do seu clube na temporada e a situação em cada uma. */
export function Silverware({ s }: P) {
  const comps = [...new Map(s.matches.map((m) => [m.competitionId, m.competition])).entries()];
  const table = s.standings.find((t) => t.isLeague);
  const status = (id: number, name: string) => {
    const games = s.matches.filter((m) => m.competitionId === id);
    const left = games.filter((m) => !m.played).length;
    if (table && name === table.title) {
      const pos = table.rows.findIndex((r) => r.teamId === s.club.id) + 1;
      return left ? `${pos}º · em andamento` : pos === 1 ? '🏆 Campeão' : `Terminou em ${pos}º`;
    }
    return left ? 'Em andamento' : 'Encerrada';
  };
  const cups = (s.stats ?? []).some((c) => c.competitionId === -1);
  return (
    <Card title="Troféus" help="As competições do seu clube nesta temporada e a situação em cada uma, e os títulos do clube.">
      <p className="mb-1 text-[11px] font-semibold text-muted">SUAS COMPETIÇÕES</p>
      <ul className="mb-3 space-y-1.5">
        {comps.map(([id, name]) => <li key={id} className="flex items-center gap-2 text-sm"><span className="text-mid">🏆</span><span className="flex-1">{name}</span><span className="text-xs text-muted">{status(id, name)}</span></li>)}
        {cups && <li className="flex items-center gap-2 text-sm"><span className="text-mid">🏆</span><span className="flex-1">Copa nacional</span><span className="text-xs text-muted">disputada</span></li>}
      </ul>
      <p className="mb-1 text-[11px] font-semibold text-muted">TÍTULOS DO CLUBE</p>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded bg-card-2 p-2"><div className="text-2xl font-bold">{s.club.leagueTitles}</div><div className="text-[10px] text-muted">Ligas</div></div>
        <div className="rounded bg-card-2 p-2"><div className="text-2xl font-bold">{s.club.domesticCups}</div><div className="text-[10px] text-muted">Copas nacionais</div></div>
      </div>
    </Card>
  );
}

/** Empréstimos: jogadores do clube emprestados e os que vieram emprestados (módulo lnsm). */
export function Loans({ s, ea }: P) {
  const list = s.loans ?? [];
  const out = list.filter((l) => l.dir === 'out'), inn = list.filter((l) => l.dir === 'in');
  const title = 'Empréstimos';
  const help = 'Jogadores do seu clube emprestados a outros times e os que chegaram emprestados, com fim do empréstimo e opção de compra.';
  if (!list.length) return <Card title={title} help={help} empty="Nenhum empréstimo ativo neste save." />;
  const row = (l: (typeof list)[number]) => (
    <li key={`${l.dir}-${l.playerId}`} className="flex items-center gap-2 py-1 text-sm">
      <Face id={l.playerId} ea={ea} size={24} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold"><PN id={l.playerId} ea={ea} /></div>
        <div className="flex items-center gap-1 truncate text-[11px] text-muted">{l.dir === 'out' ? 'Para' : 'De'} <Crest id={l.clubId} name={l.clubName} ea={ea} size={12} />{l.clubName} · até {dateBr(l.until)}</div>
      </div>
      {l.ovr > 0 && <Ovr v={l.ovr} />}
    </li>
  );
  const group = (label: string, g: typeof list, n: number) => g.length > 0 && (
    <div className="mb-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label} · {g.length}</div><ul>{g.slice(0, n).map(row)}</ul></div>
  );
  return (
    <Card title={title} help={help}
      more={() => <Table head={['Jogador', 'Situação', 'Clube', 'Pos', 'Idade', 'OVR', 'Até', 'Opção de compra']} align={['l', 'l', 'l', 'l', 'r', 'r', 'r', 'r']}
        rows={list.map((l) => [<PlayerName key="n" id={l.playerId} ea={ea} />, l.dir === 'out' ? 'Emprestado' : 'Recebido', l.clubName, posLabel(l.pos), l.age, <Ovr key="o" v={l.ovr} />, dateBr(l.until), l.buyOption != null ? money(l.buyOption) : '—'])} />}>
      {group('Emprestados', out, 4)}
      {group('Recebidos', inn, 3)}
    </Card>
  );
}

/** Pré-temporada: convites para torneios de verão, times e prêmio (módulo psem). */
export function PreseasonTour({ s, ea }: P) {
  const tours = s.preseason ?? [];
  const help = 'Convites para torneios de pré-temporada: os times de cada torneio e o prêmio em dinheiro. Aparece na pré-temporada, quando chegam os convites.';
  if (!tours.length) return <Card title="Pré-temporada" help={help} empty="Nenhum convite de pré-temporada neste save." />;
  const inTour = (t: (typeof tours)[number]) => t.teams.some((x) => x.id === s.club.id);
  return (
    <Card title="Pré-temporada" help={help}
      more={() => <div className="space-y-4">{tours.map((t, i) => (
        <div key={`${t.key}-${i}`}><div className="mb-1 font-semibold">{t.name} · prêmio {money(t.prize)}</div>
          <ul className="grid grid-cols-2 gap-1 text-sm">{t.teams.map((x) => <li key={x.id} className={`flex items-center gap-1 ${x.id === s.club.id ? 'font-semibold text-accent' : ''}`}><Crest id={x.id} name={x.name} ea={ea} size={14} />{x.name}</li>)}</ul></div>
      ))}</div>}>
      <div className="mb-2 text-xs text-muted">{tours.length} {tours.length === 1 ? 'convite' : 'convites'}</div>
      <ul className="space-y-2">{tours.slice(0, 3).map((t, i) => (
        <li key={`${t.key}-${i}`} className="rounded border border-line p-2 text-sm">
          <div className="flex items-center justify-between font-semibold">{t.name}<span className="text-[10px] font-normal uppercase text-muted">{inTour(t) ? 'a decidir' : ''}</span></div>
          <div className="flex justify-between text-xs text-muted"><span>Times</span><b className="text-white">{t.teams.length}</b></div>
          <div className="flex justify-between text-xs text-muted"><span>Prêmio</span><b className="text-white">{money(t.prize)}</b></div>
        </li>
      ))}</ul>
    </Card>
  );
}

/** Corrida dos prêmios: os candidatos das grandes ligas, como no CM Tracker (pela posição na temporada anterior). */
export function AwardsRace({ s, ea }: P) {
  const list = s.awardsRace ?? [];
  const help = 'Times candidatos aos prêmios da temporada nas grandes ligas, pela posição na temporada anterior. O jogo guarda o elenco de cada um.';
  if (!list.length) return <Card title="Corrida dos prêmios" help={help} empty="O save não trouxe a corrida dos prêmios." />;
  return (
    <Card title="Corrida dos prêmios" help={help}
      more={() => <Table head={['Time', 'Liga', 'Posição', 'Jogadores']} align={['l', 'l', 'r', 'r']}
        rows={list.map((x) => [<span key="t" className="flex items-center gap-1"><Crest id={x.teamId} name={x.teamName} ea={ea} size={14} />{x.teamName}</span>, x.league, x.rank ? `${x.rank}º` : '—', x.players.length])} />}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Candidatos da temporada</div>
      <ul>{list.slice(0, 6).map((x) => (
        <li key={`${x.leagueId}-${x.teamId}`} className="flex items-center gap-2 py-1 text-sm">
          <Crest id={x.teamId} name={x.teamName} ea={ea} size={20} />
          <div className="min-w-0"><div className="truncate font-semibold">{x.teamName}</div><div className="text-[11px] text-muted">{x.league} · {x.rank ? `${x.rank}º` : '—'} na temporada passada</div></div>
        </li>
      ))}</ul>
    </Card>
  );
}
