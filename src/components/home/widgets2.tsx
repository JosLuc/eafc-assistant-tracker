'use client';
import type { CareerSnapshot, SquadPlayer } from '@/lib/career/snapshot';
import { posLabel } from '@/lib/career/positions';
import { Card, Ovr, Pic, Stat, Table, dateBr, money, PN } from './ui';
import type { Career } from '@/lib/career/merge';
import type { Ea } from './names';
import { leagueObjective, securityLevel } from '@/lib/career/objectives';

/** Cards com os dados novos do save: forma, OVR dinâmico, valor, temporada passada, comissão técnica, notícias, e-mails e rivais. */
type P = { s: CareerSnapshot; ea: Ea; career?: Career };

function Face({ id, ea, size = 24 }: { id: number; ea: Ea; size?: number }) {
  const p = ea.player(id);
  return <Pic src={p.avatar} name={p.name} size={size} />;
}
function Crest({ id, name, ea, size = 16 }: { id: number; name: string; ea: Ea; size?: number }) {
  return <Pic src={ea.crest(id)} name={name} size={size} round={false} />;
}
function Name({ id, ea, sub }: { id: number; ea: Ea; sub?: React.ReactNode }) {
  return <span className="flex items-center gap-2"><Face id={id} ea={ea} size={22} /><span><span className="block"><PN id={id} ea={ea} /></span>{sub && <span className="block text-[11px] text-muted">{sub}</span>}</span></span>;
}
const signed = (n: number | undefined) => (n == null ? '—' : n > 0 ? `+${n}` : String(n));
const deltaColor = (n: number | undefined) => (n == null || n === 0 ? 'text-muted' : n > 0 ? 'text-good' : 'text-bad');
const Delta = ({ v }: { v: number | undefined }) => <span className={`tabular-nums ${deltaColor(v)}`}>{signed(v)}</span>;
const formColor = (v: number) => (v >= 70 ? 'text-good' : v >= 45 ? 'text-mid' : 'text-bad');
const Section = ({ children }: { children: React.ReactNode }) => <p className="mt-2 border-t border-line pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{children}</p>;

/** Forma (0–100), tendência e quanto forma e cansaço estão mudando o OVR (plfm + dovm). */
export function SquadForm({ s, ea }: P) {
  const list = s.squad.filter((p) => p.formScore != null);
  const help = 'Forma de cada jogador (0 a 100) pelas últimas notas, e quanto a forma e o cansaço estão somando ou tirando do OVR agora.';
  if (!list.length) return <Card title="Forma e cansaço" help={help} empty="Este save não trouxe a forma do elenco." />;
  const avg = Math.round(list.reduce((a, p) => a + p.formScore!, 0) / list.length);
  const best = [...list].sort((a, b) => b.formScore! - a.formScore!).slice(0, 3);
  const tired = s.squad.filter((p) => (p.ovrFatigue ?? 0) < 0).sort((a, b) => a.ovrFatigue! - b.ovrFatigue!).slice(0, 3);
  const line = (p: SquadPlayer, right: React.ReactNode) => (
    <li key={p.id} className="flex items-center gap-2 py-1 text-sm"><Face id={p.id} ea={ea} /><span className="truncate"><PN id={p.id} ea={ea} /></span><span className="text-xs text-muted">{posLabel(p.pos)}</span><span className="ml-auto flex items-center gap-2">{right}</span></li>
  );
  return (
    <Card title="Forma e cansaço" help={help}
      more={() => <Table head={['Jogador', 'Forma', 'Últimas notas', 'OVR', 'Forma no OVR', 'Cansaço no OVR']} align={['l', 'r', 'l', 'r', 'r', 'r']}
        rows={[...s.squad].sort((a, b) => (b.formScore ?? -1) - (a.formScore ?? -1)).map((p) => [
          <Name key="n" id={p.id} ea={ea} sub={posLabel(p.pos)} />,
          p.formScore != null ? <span key="f" className={`font-semibold ${formColor(p.formScore)}`}>{p.formScore}</span> : '—',
          <span key="r" className="text-xs tabular-nums text-muted">{(p.recentRatings ?? []).filter((x) => x > 0).slice(-5).map((x) => x.toFixed(1).replace('.', ',')).join(' · ') || '—'}</span>,
          <Ovr key="o" v={p.ovr} />, <Delta key="df" v={p.ovrForm} />, <Delta key="dc" v={p.ovrFatigue} />])} />}>
      <div className="mb-2 flex items-baseline gap-2"><span className={`text-4xl font-bold ${formColor(avg)}`}>{avg}</span><span className="text-xs text-muted">forma média do elenco</span></div>
      <Section>Em melhor forma</Section>
      <ul>{best.map((p) => line(p, <><Delta v={p.ovrForm} /><span className={`w-6 text-right font-semibold tabular-nums ${formColor(p.formScore!)}`}>{p.formScore}</span></>))}</ul>
      <Section>Mais cansados</Section>
      {tired.length ? <ul>{tired.map((p) => line(p, <><span className="text-xs text-muted">OVR</span><Delta v={p.ovrFatigue} /></>))}</ul> : <p className="py-1 text-xs text-muted">Ninguém perdendo OVR por cansaço.</p>}
    </Card>
  );
}

/** Valor de mercado do elenco (pvlm). */
export function SquadValue({ s, ea }: P) {
  const list = s.squad.filter((p) => p.value != null).sort((a, b) => b.value! - a.value!);
  const help = 'Valor de mercado de cada jogador do elenco, como o jogo calcula, e o valor total.';
  if (!list.length) return <Card title="Valor do elenco" help={help} empty="Este save não trouxe o valor dos jogadores." />;
  const total = list.reduce((a, p) => a + p.value!, 0);
  return (
    <Card title="Valor do elenco" help={help}
      more={() => <Table head={['Jogador', 'Pos', 'Idade', 'OVR', 'POT', 'Valor']} align={['l', 'l', 'r', 'r', 'r', 'r']}
        rows={list.map((p) => [<Name key="n" id={p.id} ea={ea} />, posLabel(p.pos), p.age, <Ovr key="o" v={p.ovr} />, p.pot, money(p.value!)])} />}>
      <div className="mb-1 text-3xl font-bold">{money(total)}</div>
      <Stat label="Média por jogador" value={money(Math.round(total / list.length))} />
      <Section>Mais valiosos</Section>
      <ul>{list.slice(0, 5).map((p) => (
        <li key={p.id} className="flex items-center gap-2 py-1 text-sm"><Face id={p.id} ea={ea} /><span className="truncate"><PN id={p.id} ea={ea} /></span><span className="text-xs text-muted">{p.age} anos</span><span className="ml-auto font-semibold tabular-nums">{money(p.value!)}</span></li>
      ))}</ul>
    </Card>
  );
}

/** Temporada passada de cada jogador, somando as competições (stvm). */
export function LastSeason({ s, ea }: P) {
  const comp = (id: number) => s.lastSeasonComps?.[id] ?? `Competição ${id}`;
  const rows = s.squad.filter((p) => p.lastSeason?.length).map((p) => {
    const t = p.lastSeason!.reduce((a, c) => ({ apps: a.apps + c.apps, goals: a.goals + c.goals, assists: a.assists + c.assists, cs: a.cs + c.cleanSheets }), { apps: 0, goals: 0, assists: 0, cs: 0 });
    return { p, ...t };
  });
  const help = 'Números da temporada passada dos jogadores do elenco, somando todas as competições. O jogo guarda isso só para parte dos jogadores.';
  if (!rows.length) return <Card title="Temporada passada" help={help} empty="O save não trouxe a temporada passada de nenhum jogador do elenco." />;
  const top = [...rows].sort((a, b) => b.goals + b.assists - (a.goals + a.assists) || b.apps - a.apps).slice(0, 5);
  return (
    <Card title="Temporada passada" help={help}
      more={() => <Table head={['Jogador', 'Competição', 'Jogos', 'Gols', 'Assist.', 'Sem sofrer gol', 'Amarelos', 'Vermelhos']} align={['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r']}
        rows={rows.flatMap(({ p }) => p.lastSeason!.map((c, i) => [i === 0 ? <Name key="n" id={p.id} ea={ea} sub={posLabel(p.pos)} /> : '', comp(c.competitionId), c.apps, c.goals, c.assists, p.pos === 0 ? c.cleanSheets : '—', c.yellows, c.reds]))} />}>
      <div className="mb-2 text-xs text-muted">{rows.length} de {s.squad.length} jogadores com números da temporada passada</div>
      <div className="mb-1 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[11px] font-semibold uppercase text-muted"><span>Jogador</span><span>J</span><span>G</span><span>A</span></div>
      <ul>{top.map(({ p, apps, goals, assists }) => (
        <li key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 py-1 text-sm">
          <span className="flex min-w-0 items-center gap-2"><Face id={p.id} ea={ea} /><span className="truncate"><PN id={p.id} ea={ea} /></span></span>
          <span className="tabular-nums text-muted">{apps}</span><span className="font-semibold tabular-nums">{goals}</span><span className="tabular-nums">{assists}</span>
        </li>
      ))}</ul>
    </Card>
  );
}

const Stars = ({ n, max = 3 }: { n: number; max?: number }) => <span className="text-mid" title={`Nível ${n} de ${max}`}>{'★'.repeat(Math.min(n, max))}<span className="text-line">{'★'.repeat(Math.max(0, max - n))}</span></span>;
const yearsAt = (birth: number, today: number) => Math.floor((today - birth) / 10000);

/** Comissão técnica do clube e mercado de treinadores (coam). */
export function CoachingStaff({ s }: P) {
  const all = s.coaches ?? [];
  const staff = all.filter((c) => c.hired), market = all.filter((c) => !c.hired);
  const help = 'Os treinadores contratados pelo clube, com nível (1 a 3 estrelas), idade e salário. As 4 notas de 1 a 5 aparecem como no save; o que cada uma mede ainda não foi conferido com a tela do jogo.';
  if (!all.length) return <Card title="Comissão técnica" help={help} empty="Este save não trouxe a comissão técnica." />;
  const table = (list: typeof all) => <Table head={['Treinador', 'Idade', 'Nível', 'Notas', 'Salário/sem']} align={['l', 'r', 'l', 'l', 'r']}
    rows={list.map((c) => [c.name, yearsAt(c.birthDate, s.gameDate), <Stars key="s" n={c.level} />, <span key="r" className="tabular-nums text-muted">{c.ratings.join(' · ') || '—'}</span>, money(c.wage)])} />;
  return (
    <Card title="Comissão técnica" help={help}
      more={() => <div className="space-y-4"><div><div className="mb-1 font-semibold">Do clube · {staff.length}</div>{table(staff)}</div>{market.length > 0 && <div><div className="mb-1 font-semibold">Disponíveis no mercado · {market.length}</div>{table(market)}</div>}</div>}>
      <Stat label="Treinadores do clube" value={staff.length} />
      <Stat label="Folha da comissão (semana)" value={money(staff.reduce((a, c) => a + c.wage, 0))} />
      <Section>Do clube</Section>
      <ul>{staff.slice(0, 4).map((c) => (
        <li key={c.id} className="flex items-center gap-2 py-1 text-sm">
          <div className="min-w-0 flex-1"><div className="truncate font-semibold">{c.name}</div><div className="text-[11px] text-muted">{yearsAt(c.birthDate, s.gameDate)} anos · {money(c.wage)}/sem</div></div>
          <Stars n={c.level} />
        </li>
      ))}</ul>
      {market.length > 0 && <p className="mt-1 text-xs text-muted">{market.length} treinadores disponíveis no mercado</p>}
    </Card>
  );
}

/** Texto em português para as chaves do feed e dos e-mails do jogo (pelo tipo da chave). */
const NEWS: [RegExp, string][] = [
  [/WasFired/, 'Técnico demitido'], [/NewManager_Welcome/, 'Novo técnico apresentado'], [/MM_Replacement|MM_.*Market/, 'Mercado de técnicos'],
  [/POTM_Fight/, 'Disputa pelo jogador do mês'], [/POTM_UM/, 'Jogador do mês'], [/TOTW|Player_Awards/, 'Time da semana'],
  [/User_POTMatch/, 'Melhor em campo do seu time'], [/Opponent_POTMatch/, 'Melhor em campo do adversário'],
  [/InterestingResult_RivalMatch/, 'Resultado de rival'], [/Rival_Match_Preview/, 'Prévia do clássico'],
  [/InjuryReturn/, 'Volta de lesão'], [/Injury/, 'Lesão'], [/TransferRumour/, 'Rumor de transferência'],
  [/TransferMove|Transfers_TransferType|BolsterSocial/, 'Transferência'], [/PreviousSeason_Goals/, 'Artilheiros da temporada passada'],
  [/PreviousSeason_Assists|TopAssist/, 'Garçons da temporada passada'], [/PoorRun/, 'Má fase'], [/BadPreSeasonForm/, 'Pré-temporada ruim'],
  [/OneToWatch/, 'Jogador para ficar de olho'], [/Debut/, 'Estreia'], [/FinancialTakeover/, 'Clube comprado por investidores'],
  [/Supercup|USC_Winner/, 'Supercopa'], [/News_Goals/, 'Gols'], [/News_Assists/, 'Assistências'], [/News_Matches/, 'Jogos'],
  [/DefaultPost_Media/, 'Imprensa'],
];
const MAIL: [RegExp, string][] = [
  [/SackWarn/, 'Diretoria: risco de demissão'], [/VeryInsecureJobSecurity/, 'Diretoria: cargo muito ameaçado'], [/InsecureDownJobSecurity/, 'Diretoria: segurança no cargo caiu'],
  [/OkayUpJobSecurity/, 'Diretoria: segurança no cargo subiu'], [/UnhappyWage/, 'Diretoria: salários altos'], [/ManagerMarket/, 'Mercado de técnicos'],
  [/YouthAcademy/, 'Categoria de base'], [/ToYouthSquad/, 'Jogador enviado à base'], [/ToTeamSheets/, 'Escalação'], [/InjuryReturn/, 'Volta de lesão'], [/TM_Injury/, 'Lesão'],
  [/BackFromSuspension/, 'Volta de suspensão'], [/Suspension/, 'Suspensão'], [/LoanExpiration/, 'Fim de empréstimo'], [/DevelopmentPlan/, 'Plano de desenvolvimento concluído'],
  [/RetirementConfirmation/, 'Aposentadoria confirmada'], [/RetirementWarning/, 'Aviso de aposentadoria'], [/PRESEASON_TOURNAMENT|Preseason/, 'Pré-temporada'],
  [/AssistantCaptain|Leadership/, 'Liderança no elenco'], [/RescheduledMatch/, 'Jogo remarcado'], [/DynamicOverall/, 'Bônus de OVR da pré-temporada'],
  [/Retract_offer/, 'Proposta retirada (jogador lesionado)'],
];
const label = (key: string, dict: [RegExp, string][]) => dict.find(([r]) => r.test(key))?.[1] ?? key.replace(/^CM[A-Z]*_(Social_|Email_|Mail_|News_)?/i, '').replace(/_(Body|Title)?_?\d*_?[UMF]{0,2}$/, '').replace(/_/g, ' ');
type Post = CareerSnapshot['news'][number];
const postPlayers = (x: Post) => [...new Set([...x.players, ...x.params.filter(([k, v]) => (k === 8 || k === 10 || k === 9) && v > 0 && v < 999999).map(([, v]) => v)])];
const byDate = (a: Post, b: Post) => (b.date ?? 0) - (a.date ?? 0);
/** Alguns posts trazem uma data que não é a da notícia (ex.: 2046); só vale data até o dia atual do jogo. */
const fixDates = (list: Post[], today: number) => list.map((x) => (x.date != null && x.date > today ? { ...x, date: null } : x));

function PostItem({ x, ea, dict }: { x: Post; ea: Ea; dict: [RegExp, string][] }) {
  const pl = postPlayers(x).slice(0, 2), teams = (x.teams ?? []).slice(0, 2);
  return (
    <li className="border-b border-line py-1.5 text-sm last:border-0">
      <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{label(x.key, dict)}</span><span className="shrink-0 text-[11px] text-muted">{x.date ? dateBr(x.date) : ''}</span></div>
      {(pl.length > 0 || teams.length > 0) && (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          {pl.map((id) => <span key={`p${id}`} className="flex items-center gap-1"><Face id={id} ea={ea} size={14} /><PN id={id} ea={ea} /></span>)}
          {teams.map((t) => <span key={`t${t.id}`} className="flex items-center gap-1"><Crest id={t.id} name={t.name} ea={ea} size={12} />{t.name}</span>)}
        </div>
      )}
    </li>
  );
}

/** Feed de notícias do jogo (socm), acumulado entre os saves da carreira. */
export function NewsFeed({ s, ea }: P) {
  const list = fixDates((s.news ?? []).filter((x) => !x.key.startsWith('CM_Player_Awards')), s.gameDate).sort(byDate);
  const help = 'Notícias e posts que o jogo publicou: demissões de técnicos, transferências, rumores, lesões, clássicos. O app junta as notícias de todos os saves da carreira.';
  if (!list.length) return <Card title="Notícias" help={help} empty="Nenhuma notícia neste save." />;
  return (
    <Card title="Notícias" help={help} more={() => <ul>{list.map((x, i) => <PostItem key={i} x={x} ea={ea} dict={NEWS} />)}</ul>}>
      <ul>{list.slice(0, 7).map((x, i) => <PostItem key={i} x={x} ea={ea} dict={NEWS} />)}</ul>
    </Card>
  );
}

/** Caixa de e-mails do técnico (emlm). */
export function Inbox({ s, ea }: P) {
  // O jogo guarda título e corpo do mesmo e-mail como entradas separadas: mostra uma por assunto e dia.
  const seen = new Set<string>();
  const list = fixDates(s.emails ?? [], s.gameDate).sort(byDate).filter((x) => { const k = `${label(x.key, MAIL)}|${x.date}|${postPlayers(x).join(',')}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const help = 'E-mails da caixa de entrada: avisos da diretoria, lesões, suspensões, base, fim de empréstimo. O app junta os e-mails de todos os saves da carreira.';
  if (!list.length) return <Card title="Caixa de entrada" help={help} empty="Nenhum e-mail neste save." />;
  const board = list.filter((x) => /Board|JobSecurity|UnhappyWage/.test(x.key)).length;
  return (
    <Card title="Caixa de entrada" help={help} more={() => <ul>{list.map((x, i) => <PostItem key={i} x={x} ea={ea} dict={MAIL} />)}</ul>}>
      {board > 0 && <p className="mb-1 text-xs text-bad">{board} {board === 1 ? 'aviso' : 'avisos'} da diretoria</p>}
      <ul>{list.slice(0, 7).map((x, i) => <PostItem key={i} x={x} ea={ea} dict={MAIL} />)}</ul>
    </Card>
  );
}

/** Time da semana e jogador do mês publicados no feed (socm). */
export function LeagueAwards({ s, ea }: P) {
  const totw = [...(s.teamOfWeek ?? [])].sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
  const potm = [...(s.playerOfMonth ?? [])].sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
  const help = 'Time da semana e jogador do mês que o jogo publicou. Os jogadores do seu clube ficam em destaque.';
  if (!totw.length && !potm.length) return <Card title="Time da semana e jogador do mês" help={help} empty="O save não trouxe time da semana nem jogador do mês." />;
  const mine = new Set(s.squad.map((p) => p.id));
  const last = totw[0];
  return (
    <Card title="Time da semana e jogador do mês" help={help}
      more={() => <div className="space-y-4">
        {potm.length > 0 && <div><div className="mb-1 font-semibold">Jogador do mês</div><ul>{potm.map((x, i) => <li key={i} className="flex items-center gap-2 py-1 text-sm"><Face id={x.playerId} ea={ea} /><PN id={x.playerId} ea={ea} /><span className="text-xs text-muted">{x.teamName}</span><span className="ml-auto text-xs text-muted">{x.date ? dateBr(x.date) : ''}</span></li>)}</ul></div>}
        {totw.map((t, i) => <div key={i}><div className="mb-1 font-semibold">Time da semana · {t.date ? dateBr(t.date) : ''}</div><ul className="grid grid-cols-2 gap-1 text-sm">{t.players.map((id) => <li key={id} className={`flex items-center gap-1 ${mine.has(id) ? 'font-semibold text-accent' : ''}`}><Face id={id} ea={ea} size={18} /><PN id={id} ea={ea} /></li>)}</ul></div>)}
      </div>}>
      {potm[0] && <>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Jogador do mês</p>
        <div className="flex items-center gap-2 py-1 text-sm"><Face id={potm[0].playerId} ea={ea} size={32} /><div><div className="font-semibold"><PN id={potm[0].playerId} ea={ea} /></div><div className="text-[11px] text-muted">{potm[0].teamName} · {potm[0].date ? dateBr(potm[0].date) : ''}</div></div></div>
      </>}
      {last && <>
        <Section>Time da semana · {last.date ? dateBr(last.date) : ''}</Section>
        <ul className="grid grid-cols-2 gap-x-2 text-xs">{last.players.map((id) => <li key={id} className={`flex items-center gap-1 py-0.5 ${mine.has(id) ? 'font-semibold text-accent' : ''}`}><Face id={id} ea={ea} size={16} /><span className="truncate"><PN id={id} ea={ea} /></span></li>)}</ul>
      </>}
    </Card>
  );
}

/** Rivais da liga: orçamento de transferências e segurança no cargo do técnico de cada clube (budm + jbom). */
export function LeagueRivals({ s, ea }: P) {
  const list = s.leagueRivals ?? [];
  const help = 'Quanto cada clube da sua liga ainda tem para gastar em transferências (e quanto tinha no início), o orçamento salarial e a segurança no cargo do técnico (0 a 100; começa em 80).';
  if (!list.length) return <Card title="Rivais da liga" help={help} empty="O save não trouxe os orçamentos dos clubes da liga." />;
  const risk = list.filter((x) => x.security != null && x.security < 60);
  return (
    <Card title="Rivais da liga" help={help}
      more={() => <Table head={['Clube', 'Orçamento atual', 'No início', 'Salarial/sem', 'Cargo do técnico']} align={['l', 'r', 'r', 'r', 'r']}
        rows={list.map((x) => [<span key="c" className="flex items-center gap-1"><Crest id={x.teamId} name={x.name} ea={ea} size={14} />{x.name}</span>, money(x.current), money(x.initial), money(x.wage),
          x.security != null ? <span key="s" className={x.security < 60 ? 'text-bad' : ''}>{x.security}</span> : '—'])} />}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Maiores orçamentos</p>
      <ul>{list.slice(0, 5).map((x) => (
        <li key={x.teamId} className="flex items-center gap-2 py-1 text-sm"><Crest id={x.teamId} name={x.name} ea={ea} size={18} /><span className="truncate">{x.name}</span><span className="ml-auto font-semibold tabular-nums">{money(x.current)}</span></li>
      ))}</ul>
      <Section>Técnicos ameaçados</Section>
      {risk.length ? <ul>{risk.slice(0, 3).map((x) => <li key={x.teamId} className="flex items-center gap-2 py-1 text-sm"><Crest id={x.teamId} name={x.name} ea={ea} size={16} />{x.name}<span className="ml-auto font-semibold text-bad tabular-nums">{x.security}</span></li>)}</ul>
        : <p className="py-1 text-xs text-muted">Nenhum técnico da liga ameaçado.</p>}
    </Card>
  );
}

/**
 * Objetivos da diretoria (versão simples): meta da liga da temporada, campanha atual, segurança no cargo,
 * competições da temporada e recados da diretoria. Mínimo/meta/stretch por competição ainda não foram decifrados no save.
 */
export function BoardObjectives({ s, ea }: P) {
  const m = s.manager;
  const season = m?.history?.filter((x) => x.teamId === s.club.id).at(-1);
  const help = 'O que a diretoria espera nesta temporada: a meta da liga, como está a campanha e a segurança no cargo. Mínimo, meta e stretch de cada competição ainda vão entrar.';
  if (!m || !season) return <Card title="Objetivos da diretoria" help={help} empty="Este save não trouxe os objetivos da temporada." />;
  const table = s.standings.find((t) => t.isLeague);
  const started = table?.rows.some((r) => r.played) ?? false;
  const idx = table?.rows.findIndex((r) => r.teamId === s.club.id) ?? -1;
  const sec = m.jobSecurity;
  const lvl = sec != null ? securityLevel(sec) : null;
  // Recém-chegado a outro clube e sem jogos: os recados que existem são do emprego anterior.
  const prev = m.history!.at(-2);
  const newJob = season.played === 0 && prev != null && prev.teamId !== s.club.id;
  const seen = new Set<string>();
  const board = fixDates((newJob ? [] : s.emails ?? []).filter((x) => /Board|JobSecurity|UnhappyWage|SackWarn/.test(x.key) && (x.teams ?? []).every((t) => t.id === s.club.id)), s.gameDate).sort(byDate)
    .filter((x) => { const k = `${label(x.key, MAIL)}|${x.date}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const cups = s.cups ?? [];
  return (
    <Card title="Objetivos da diretoria" help={help}>
      <div className="rounded-md bg-[#1d1d20] p-2.5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted"><Crest id={s.club.id} name={s.club.name} ea={ea} size={14} />{s.club.leagueName} · {s.season}</div>
        <p className="mt-1 text-[15px] font-semibold">{leagueObjective(season.objective)}</p>
        <p className="mt-0.5 text-xs text-muted tabular-nums">
          {started && idx >= 0 ? `${idx + 1}º de ${table!.rows.length}` : 'Liga ainda não começou'}
          {season.played > 0 && ` · ${season.played} J, ${season.won}V ${season.drawn}E ${season.lost}D, ${season.points} pts`}
        </p>
      </div>
      {sec != null && lvl && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm"><span>Segurança no cargo</span><span className="flex items-center gap-2"><span className="font-semibold tabular-nums">{sec}</span><span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-black" style={{ background: lvl.color }}>{lvl.label}</span></span></div>
          <div className="mt-1 h-1.5 rounded bg-[#2c2c30]"><div className="h-full rounded" style={{ width: `${sec}%`, background: lvl.color }} /></div>
        </div>
      )}
      {cups.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">Outras competições</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">{cups.map((c) => <li key={c.id} className="rounded bg-[#1d1d20] px-2 py-0.5 text-xs">{c.name}</li>)}</ul>
        </div>
      )}
      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-wide text-muted">Recados da diretoria</p>
        {board.length ? <ul>{board.slice(0, 3).map((x, i) => <PostItem key={i} x={x} ea={ea} dict={MAIL} />)}</ul>
          : <p className="mt-1 text-xs text-muted">Nenhum recado da diretoria ainda.</p>}
      </div>
      <p className="mt-2 text-[11px] text-muted">Mínimo, meta e stretch de cada competição: em breve.</p>
    </Card>
  );
}
