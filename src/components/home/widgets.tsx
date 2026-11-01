'use client';
import { useState } from 'react';
import type { CareerSnapshot, SquadPlayer, StatLine } from '@/lib/career/snapshot';
import { buildTips, starters } from '@/lib/career/tips';
import { fromYmd, seasonOf } from '@/lib/career/dates';
import { lineOf, posLabel, xOf } from '@/lib/career/positions';
import type { Match } from '@/lib/career/snapshot';
import { Bar, Card, Ovr, Pic, Stat, dateBr, money, timeBr } from './ui';
import type { Ea } from './names';

type P = { s: CareerSnapshot; ea: Ea };

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

function PlayerLine({ p, ea, right }: { p: SquadPlayer; ea: Ea; right?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 py-1 text-sm">
      <Face id={p.id} ea={ea} size={24} />
      <span className="truncate">{ea.player(p.id).short}</span>
      <span className="text-xs text-muted">{posLabel(p.pos)}</span>
      <span className="ml-auto flex items-center gap-2">{right ?? <Ovr v={p.ovr} />}</span>
    </li>
  );
}

export function AssistantTips({ s, ea }: P) {
  const tips = buildTips(s, (id) => ea.player(id).short);
  return (
    <Card title="Dica do auxiliar" help="Alertas calculados a partir do save: contratos de titulares, posições sem reserva, jovens sem minutos e salários altos fora do time." className="border-accent/50">
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
    <Card title="Calendário" help="Data do jogo e os próximos 7 dias, com os jogos do seu clube e a volta de lesionados.">
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
        {back.map((p) => <li key={p.id} className="flex gap-2"><span className="w-10 text-muted">{dateBr(p.injuryReturn!).slice(0, 5)}</span><span>✚ {ea.player(p.id).short} volta de lesão</span></li>)}
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
    <Card title="Resultados" help="Últimos jogos do clube na temporada (todas as competições) e o retrospecto.">
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
  const list = upcoming(s).slice(0, 6);
  if (!list.length) return <Card title="Próximos jogos" empty="Nenhum jogo marcado." />;
  return (
    <Card title="Próximos jogos" help="Os próximos jogos do calendário, em todas as competições.">
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
  return (
    <Card title="Lesões" help="Lesionados com a data prevista de volta e jogadores com condição física baixa (abaixo de 85%).">
      {!injured.length && !tired.length ? <p className="text-sm text-muted">Ninguém lesionado ou cansado.</p> : (
        <ul>
          {injured.map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="text-xs text-bad">✚ volta {p.injuryReturn ? dateBr(p.injuryReturn).slice(0, 5) : '?'}</span>} />)}
          {tired.slice(0, 5).map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="text-xs text-mid">condição {p.condition}%</span>} />)}
        </ul>
      )}
    </Card>
  );
}

export function Discipline({ s, ea }: P) {
  const banned = s.squad.filter((p) => (p.banGames ?? 0) > 0);
  const yellow = s.squad.filter((p) => (p.yellows ?? 0) > 0 && !(p.banGames ?? 0)).sort((a, b) => b.yellows! - a.yellows!);
  return (
    <Card title="Cartões e suspensões" help="Suspensos e jogadores com amarelos acumulados, por competição somada.">
      {!banned.length && !yellow.length ? <p className="text-sm text-muted">Nenhum suspenso ou pendurado.</p> : (
        <ul>
          {banned.map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="text-xs text-bad">■ suspenso {p.banGames} jogo{p.banGames! > 1 ? 's' : ''}</span>} />)}
          {yellow.map((p) => <PlayerLine key={p.id} p={p} ea={ea} right={<span className="flex items-center gap-1 text-xs"><span className="inline-block h-3 w-2 rounded-[2px] bg-mid" />{p.yellows}</span>} />)}
        </ul>
      )}
    </Card>
  );
}

export function Transfers({ s, ea }: P) {
  const list = s.transfers.slice(0, 6);
  if (!list.length) return <Card title="Transferências" help="Transferências recentes registradas no save." empty="Nenhuma transferência registrada no save." />;
  return (
    <Card title="Transferências" help="Transferências recentes que o jogo guarda no save. As do seu clube aparecem destacadas. O histórico completo vai crescer comparando os saves que você enviar.">
      <ul className="space-y-2">
        {list.map((t, i) => {
          const mine = t.toId === s.club.id || t.fromId === s.club.id;
          return (
            <li key={i} className={`flex items-center gap-2 rounded p-1 text-sm ${mine ? 'bg-accent/15' : ''}`}>
              <Face id={t.playerId} ea={ea} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{ea.player(t.playerId).short}</div>
                <div className="flex items-center gap-1 truncate text-[11px] text-muted">
                  <Crest id={t.fromId} name={t.fromName} ea={ea} size={12} />{t.fromName} → <Crest id={t.toId} name={t.toName} ea={ea} size={12} />{t.toName}
                </div>
              </div>
              <div className="text-right"><div className="text-xs font-semibold tabular-nums">{t.fee ? money(t.fee) : 'Livre'}</div><div className="text-[10px] text-muted">{dateBr(t.date).slice(0, 5)}</div></div>
            </li>
          );
        })}
      </ul>
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
  return (
    <Card title="Posição na liga" help="Tabela em volta do seu clube. Antes da liga começar, mostra a competição que já está em andamento (ex.: pré-temporada).">
      <p className="mb-2 text-xs text-muted">{t.title}{league && !league.rows.some((r) => r.played) && t !== league ? ` · ${league.title} ainda não começou` : ''}</p>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-[11px] text-muted"><tr><th className="text-left">#</th><th className="text-left">Time</th><th>J</th><th>SG</th><th>Pts</th></tr></thead>
        <tbody>
          {rows.map((r, k) => {
            const me = r.teamId === s.club.id;
            return (
              <tr key={r.teamId} className={me ? 'bg-accent/15 font-semibold' : ''}>
                <td className="py-1 pl-1">{from + k + 1}</td>
                <td className="flex items-center gap-2 py-1">
                  <Crest id={r.teamId} name={r.name} ea={ea} size={16} />
                  <span className="truncate">{r.name}</span>
                </td>
                <td className="text-center">{r.played}</td>
                <td className="text-center">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                <td className="text-center">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
  const xi = starters(s);
  const rows = (['ATA', 'MEI', 'DEF', 'GOL'] as const).map((l) => xi.filter((p) => lineOf(p.slot < 28 ? p.slot : p.pos) === l).sort((a, b) => xOf(a.slot < 28 ? a.slot : a.pos) - xOf(b.slot < 28 ? b.slot : b.pos)));
  return (
    <Card title="Escalação" help="Os titulares que estão no time salvo no jogo, por linha.">
      <div className="space-y-3 rounded-md bg-gradient-to-b from-[#1d4d2b] to-[#163c22] p-3">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-center gap-3">
            {r.map((p) => (
              <div key={p.id} className="flex w-16 flex-col items-center text-center">
                <div className="relative"><Face id={p.id} ea={ea} size={36} /><span className="absolute -right-3 -top-1"><Ovr v={p.ovr} /></span></div>
                <span className="mt-1 w-full truncate text-[11px] font-semibold">{ea.player(p.id).short}{p.id === s.club.captainId ? ' (C)' : ''}</span>
                <span className="text-[10px] text-white/60">{posLabel(p.slot < 28 ? p.slot : p.pos)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SquadOverview({ s, ea }: P) {
  const n = s.squad.length;
  const avgAge = s.squad.reduce((a, p) => a + p.age, 0) / Math.max(1, n);
  const u21 = s.squad.filter((p) => p.age <= 21).length;
  const best = s.squad[0];
  const bestPot = [...s.squad].sort((a, b) => b.pot - a.pot)[0];
  const nations = new Set(s.squad.map((p) => p.nationality)).size;
  return (
    <Card title="Elenco" help="Tamanho do elenco, idade média, sub-21, melhor jogador e maior potencial.">
      <Stat label="Jogadores" value={n} />
      <Stat label="Idade média" value={avgAge.toFixed(1).replace('.', ',')} />
      <Stat label="Sub-21" value={u21} />
      <Stat label="Nacionalidades" value={nations} />
      <ul className="mt-2 border-t border-line pt-2">
        {best && <PlayerLine p={best} ea={ea} right={<><span className="text-xs text-muted">melhor</span><Ovr v={best.ovr} /></>} />}
        {bestPot && <PlayerLine p={bestPot} ea={ea} right={<><span className="text-xs text-muted">potencial</span><Ovr v={bestPot.pot} /></>} />}
      </ul>
    </Card>
  );
}

export function Contracts({ s, ea }: P) {
  const season = seasonOf(fromYmd(s.gameDate));
  const list = s.squad.filter((p) => p.contractUntil <= season.end + 1).sort((a, b) => a.contractUntil - b.contractUntil || b.ovr - a.ovr);
  return (
    <Card title="Contratos acabando" help={`Jogadores com contrato até ${season.end} (fim desta temporada) ou ${season.end + 1}.`}>
      {list.length === 0 ? <p className="text-sm text-muted">Nenhum contrato vence nas próximas duas temporadas.</p> : (
        <ul>{list.slice(0, 8).map((p) => (
          <PlayerLine key={p.id} p={p} ea={ea} right={<><span className={`text-xs ${p.contractUntil <= season.end ? 'text-bad' : 'text-mid'}`}>{p.contractUntil}</span><Ovr v={p.ovr} /></>} />
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

export function Club({ s }: P) {
  const c = s.club;
  return (
    <Card title="Clube" help="Prestígio, rival, estádio e histórico do clube no banco do jogo.">
      <Stat label="Prestígio nacional" value={<span className="text-mid">{stars(c.domesticPrestige)}</span>} />
      <Stat label="Prestígio internacional" value={<span className="text-mid">{stars(c.internationalPrestige)}</span>} />
      <Stat label="Categoria de base" value={<span className="text-mid">{stars(c.youthDevelopment)}</span>} />
      <Stat label="Rival" value={c.rivalName} />
      <Stat label="Estádio" value={`${c.stadiumCapacity.toLocaleString('pt-BR')} lugares`} />
      <Stat label="Títulos (liga / copas)" value={`${c.leagueTitles} / ${c.domesticCups}`} />
      <Stat label="Posição na última liga" value={c.prevPosition ? `${c.prevPosition}º` : '—'} />
      <Stat label="Fundação" value={c.founded} />
    </Card>
  );
}

export function SetPieces({ s, ea }: P) {
  const c = s.club;
  const row = (label: string, id: number) => <Stat label={label} value={id > 0 ? ea.player(id).short : '—'} />;
  return (
    <Card title="Bolas paradas" help="Capitão e cobradores definidos no time salvo.">
      {row('Capitão', c.captainId)}{row('Pênaltis', c.penaltyTakerId)}{row('Faltas', c.freeKickTakerId)}{row('Escanteios', c.cornerTakerId)}
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
    <Card title="Moral do elenco" help="Média da moral do elenco e o que pesa nela: desempenho do time, do jogador, contrato e tempo de jogo. Abaixo, os 3 mais insatisfeitos.">
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
  const top = [...s.squad].sort((a, b) => b.wage - a.wage).slice(0, 6);
  return (
    <Card title="Papéis e salários" help="Quantos jogadores há em cada papel prometido (crucial, importante, rodízio, esporádico, promessa) e os maiores salários, com o fim do contrato.">
      <div className="mb-3 grid grid-cols-5 gap-1 text-center">
        {counts.map((n, i) => <div key={i}><div className="text-xl font-bold">{n}</div><div className="text-[10px] text-muted">{ROLE[i + 1]}</div></div>)}
      </div>
      <ul>{top.map((p) => (
        <li key={p.id} className="flex items-center gap-2 py-1 text-sm">
          <Face id={p.id} ea={ea} size={24} />
          <div className="min-w-0 flex-1">
            <div className="truncate">{ea.player(p.id).short}</div>
            <div className="text-[11px] text-muted"><span className={p.role ? ROLE_COLOR[p.role] : ''}>{p.role ? ROLE[p.role] : '—'}</span> · até {p.contractUntil} · {months(p.contractUntil)} meses</div>
          </div>
          <span className="text-xs font-semibold tabular-nums">{money(p.wage)}/sem</span>
        </li>
      ))}</ul>
    </Card>
  );
}

export function ClubFinances({ s }: P) {
  const f = s.finances;
  if (!f) return <Card title="Finanças" empty="Este save não trouxe o orçamento do clube." />;
  const used = Math.max(0, f.initialBudget - f.currentBudget);
  const pct = f.initialBudget ? Math.round((f.currentBudget / f.initialBudget - 1) * 100) : 0;
  const wages = s.squad.reduce((a, p) => a + p.wage, 0);
  return (
    <Card title="Finanças" help="Orçamento de transferências no início da temporada, quanto já foi usado e os principais gastos. Valores do save, iguais aos da tela de orçamento do jogo.">
      <div className="mb-1 flex items-baseline justify-between"><span className="text-xs text-muted">Orçamento atual</span><span className={`text-xs ${pct < 0 ? 'text-bad' : 'text-good'}`}>{pct > 0 ? '+' : ''}{pct}%</span></div>
      <div className="title mb-2 text-3xl">{money(f.currentBudget)}</div>
      <div className="mb-1 h-2 overflow-hidden rounded bg-card-2"><div className="h-full bg-accent" style={{ width: `${Math.min(100, (f.currentBudget / Math.max(1, f.initialBudget)) * 100)}%` }} /></div>
      <div className="mb-3 flex justify-between text-[11px] text-muted"><span>Usado {money(used)}</span><span>Verba inicial {money(f.initialBudget)}</span></div>
      <Stat label="Compra de atletas" value={<span className="text-bad">−{money(f.spentOnPlayers)}</span>} />
      <Stat label="Aumentos salariais" value={<span className="text-bad">−{money(f.wageRaises)}</span>} />
      <Stat label="Folha do elenco (semana)" value={money(wages)} />
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
      <div className="min-w-0 flex-1"><div className="text-[11px] text-muted">{label}</div><div className="truncate text-sm font-semibold">{ea.player(id).short}</div></div>
      <span className="text-xl font-bold tabular-nums">{value}</span>
    </li>
  );
  if (all.length) {
    const top = (f: (x: StatLine) => number, list = all) => { const x = [...list].sort((a, b) => f(b) - f(a))[0]; return x && f(x) > 0 ? x : undefined; };
    const minApps = Math.max(1, Math.ceil(Math.max(...all.map((x) => x.apps)) / 3));
    const g = top((x) => x.goals), a = top((x) => x.assists), m = top((x) => x.apps), cs = top((x) => x.cleanSheets), p = top((x) => x.potm);
    const r = top((x) => x.avgRating, all.filter((x) => x.apps >= minApps));
    return (
      <Card title="Destaques da temporada" help="Líderes do seu time somando as competições oficiais da temporada (sem amistosos e pré-temporada).">
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
    .sort((a, b) => t.f(b) - t.f(a) || a.apps - b.apps).slice(0, 10);
  return (
    <Card title="Corrida da artilharia" help={`Líderes de ${c.competition}${c.isLeague ? ' (todos os times)' : ' (seu time)'}. Nota média só para quem tem ${minApps}+ jogos.`}
      action={comps.length > 1 ? (
        <select value={ci} onChange={(e) => setCi(+e.target.value)} className="rounded border border-line bg-card-2 px-1 py-0.5 text-xs">
          {comps.map((x, i) => <option key={x.competitionId} value={i}>{x.competition}</option>)}
        </select>
      ) : <span className="text-xs text-muted">{c.competition}</span>}>
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
                <div className={`truncate text-sm ${x.teamId === s.club.id ? 'font-semibold' : ''}`}>{ea.player(x.playerId).short}</div>
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
    <Card title="Histórico de temporadas" help="Cada temporada do técnico: clube, liga, posição, objetivo da diretoria, campanha e gols.">
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
    <Card title="Categoria de base" help="Jogadores na sua base, com posição, idade, overall e potencial.">
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
  const st = (n: number) => '★'.repeat(n).padEnd(5, '☆');
  return (
    <Card title="Olheiros" help="Olheiros contratados, com experiência e julgamento (estrelas).">
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
