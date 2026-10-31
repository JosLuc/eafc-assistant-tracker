'use client';
import type { CareerSnapshot, SquadPlayer } from '@/lib/career/snapshot';
import { buildTips, starters } from '@/lib/career/tips';
import { fromYmd, seasonOf } from '@/lib/career/dates';
import { lineOf, posLabel, xOf } from '@/lib/career/positions';
import { Bar, Card, Ovr, Stat, dateBr, money } from './ui';
import type { Ea } from './names';

type P = { s: CareerSnapshot; ea: Ea };

function Face({ id, ea, size = 28 }: { id: number; ea: Ea; size?: number }) {
  const src = ea.player(id).avatar;
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt="" width={size} height={size} className="rounded-full bg-card-2 object-cover" style={{ width: size, height: size }} />
    : <span className="inline-block rounded-full bg-card-2" style={{ width: size, height: size }} />;
}

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

export function Calendar({ s }: P) {
  const d = fromYmd(s.gameDate);
  const days = Array.from({ length: 7 }, (_, i) => new Date(d.getTime() + i * 86_400_000));
  const wd = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  return (
    <Card title="Calendário" help="Data do jogo e os próximos 7 dias. Jogos, prazos de transferência e eventos entram quando o módulo de calendário for decodificado.">
      <p className="mb-3 text-sm"><span className="mr-2 text-xs font-semibold text-accent">HOJE</span>{d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((x, i) => (
          <div key={i} className={`rounded border p-1 text-center ${i === 0 ? 'border-accent bg-accent/15' : 'border-line bg-card-2'}`}>
            <div className="text-[10px] text-muted">{wd[x.getUTCDay()]}</div>
            <div className="text-lg font-semibold">{x.getUTCDate()}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Jogos e eventos da semana aparecem na onda 2.</p>
    </Card>
  );
}

export function NextMatch() {
  return <Card title="Próximo jogo" help="Adversário, competição, data e local do próximo jogo." empty="Ainda não lemos o calendário de jogos deste save." wave={2} />;
}

export function LeaguePosition({ s, ea }: P) {
  const t = s.standings.find((x) => x.rows.some((r) => r.played > 0)) ?? s.standings[0];
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
            const crest = ea.crest(r.teamId);
            return (
              <tr key={r.teamId} className={me ? 'bg-accent/15 font-semibold' : ''}>
                <td className="py-1 pl-1">{from + k + 1}</td>
                <td className="flex items-center gap-2 py-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {crest ? <img src={crest} alt="" className="h-4 w-4 object-contain" /> : <span className="h-4 w-4" />}
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
