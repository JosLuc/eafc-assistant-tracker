'use client';
import type { CareerSnapshot, Match } from '@/lib/career/snapshot';
import type { Career } from '@/lib/career/merge';
import { Pic, dateBr } from '../home/ui';
import type { Ea } from '../home/names';

/**
 * Aba Troféus: estante (títulos conquistados na carreira), campanha nas copas desta temporada
 * e histórico por temporada. Os títulos de liga vêm do histórico do técnico (posição 1);
 * os de copa, de uma final vencida em algum save enviado.
 */
type P = { s: CareerSnapshot; ea: Ea; career: Career };
type Status = 'vivo' | 'sorteio' | 'eliminado' | 'campeao' | 'sem-jogo';
const BADGE: Record<Status, { label: string; cls: string; icon: string }> = {
  vivo: { label: 'Ainda vivo', cls: 'border-accent/60 bg-accent/15 text-link', icon: '▶' },
  sorteio: { label: 'Aguardando sorteio', cls: 'border-line text-muted', icon: '⧗' },
  'sem-jogo': { label: 'Sem jogo marcado ainda', cls: 'border-line text-muted', icon: '⧗' },
  eliminado: { label: 'Eliminado', cls: 'border-bad/50 bg-bad/10 text-bad', icon: '✕' },
  campeao: { label: 'Campeão', cls: 'border-good/50 bg-good/10 text-good', icon: '🏆' },
};

function Badge({ st }: { st: Status }) {
  const b = BADGE[st];
  return <span className={`title inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] ${b.cls}`}><span>{b.icon}</span>{b.label}</span>;
}

/** Situação do clube numa copa, olhando os jogos desta temporada. */
function cupRun(s: CareerSnapshot, compId: number) {
  const mine = (m: Match) => m.homeId === s.club.id || m.awayId === s.club.id;
  const games = s.matches.filter((m) => m.competitionId === compId && mine(m)).sort((a, b) => a.date - b.date);
  const played = games.filter((m) => m.played), next = games.find((m) => !m.played);
  const last = played.at(-1);
  // Nas copas da EA a 1ª fase do clube costuma ser a rodada 2 (os grandes entram depois); o save guarda a fase a partir de 0.
  const stage = (m: Match) => `Rodada ${m.round + 1}`;
  let status: Status = 'sem-jogo';
  if (next) status = 'vivo';
  else if (last) {
    const [f, a] = last.homeId === s.club.id ? [last.homeGoals ?? 0, last.awayGoals ?? 0] : [last.awayGoals ?? 0, last.homeGoals ?? 0];
    status = f < a ? 'eliminado' : 'sorteio';
  }
  return { status, next, last, reached: next ? stage(next) : last ? stage(last) : undefined };
}

function Section({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] bg-card px-[18px] pb-[18px] pt-4">
      <h3 className="title mb-3 flex items-baseline gap-3 text-[15px]">{title}{extra && <span className="font-sans text-xs font-normal normal-case tracking-normal text-muted">{extra}</span>}</h3>
      {children}
    </section>
  );
}

export function TrophiesPage({ s, ea, career }: P) {
  const snaps = career.snaps.length ? career.snaps : [s];
  // Títulos de liga: temporadas do histórico do técnico terminadas em 1º.
  const won: { name: string; season: string; club: string }[] = [];
  const hist = s.manager?.history ?? [];
  const startYear = Number(s.season.slice(0, 2));
  // O histórico é por passagem por clube, não por temporada: um técnico demitido no meio do ano tem duas passagens na mesma temporada.
  // A temporada de cada passagem é estimada para trás, sem passar da temporada em que a carreira começou.
  const cs = s.manager?.careerStart;
  const firstYear = cs ? (Math.floor(cs / 100) % 100 >= 7 ? Math.floor(cs / 10000) : Math.floor(cs / 10000) - 1) % 100 : 0;
  const yearOf = (k: number) => Math.max(firstYear, startYear - k);
  // O último item do histórico é a temporada atual; as anteriores já terminaram.
  const past = hist.slice(0, -1);
  past.forEach((h, i) => {
    if (h.position === 1 && h.played > 0) {
      const y = yearOf(past.length - i);
      won.push({ name: h.league, season: `${String(y).padStart(2, '0')}/${String(y + 1).padStart(2, '0')}`, club: h.teamName });
    }
  });
  const seasons = [...new Set(snaps.map((x) => x.season))];
  const cups = s.cups ?? [];
  const different = new Set(won.map((w) => w.name)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="title flex items-center gap-2 text-lg"><span>🏆</span>Estante de troféus</h2>
        <span className="text-xs text-muted" title="Títulos de liga vêm do histórico do técnico guardado no save. Copas aparecem quando um save mostra a final vencida.">ⓘ</span>
        <div className="ml-auto flex overflow-hidden rounded-[10px] border border-line bg-card">
          {[['Troféus ganhos', won.length], ['Troféus diferentes', different], ['Temporadas acompanhadas', seasons.length]].map(([l, v]) => (
            <div key={l as string} className="border-l border-line px-4 py-2 first:border-0"><div className="text-[11px] text-muted">{l}</div><div className="num text-2xl font-bold">{v}</div></div>
          ))}
        </div>
      </div>

      <Section title="Troféus ganhos">
        {won.length === 0 ? (
          <div className="grid place-items-center rounded-lg border border-dashed border-[#3a3a3a] px-4 py-14 text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#232323] text-xl">🏆</div>
            <p className="font-semibold">Nenhum troféu ainda</p>
            <p className="mt-1 max-w-md text-sm text-muted">Quando o clube ganhar uma liga ou copa no jogo, o troféu aparece aqui depois do próximo save enviado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {won.map((w, i) => (
              <div key={i} className="rounded-lg bg-[#232323] p-4 text-center">
                <div className="text-3xl">🏆</div>
                <div className="mt-2 font-semibold">{w.name}</div>
                <div className="text-xs text-muted">{w.season} · {w.club}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Campanha nas copas" extra={`Temporada ${s.season}`}>
        {cups.length === 0 ? <p className="text-sm text-muted">Nenhuma copa encontrada no save para o seu clube nesta temporada.</p> : (
          <div className="space-y-3">
            {cups.map((c) => {
              const r = cupRun(s, c.id);
              const opp = r.next ? (r.next.homeId === s.club.id ? { id: r.next.awayId, name: r.next.awayName, home: true } : { id: r.next.homeId, name: r.next.homeName, home: false }) : null;
              return (
                <div key={c.id} className="rounded-lg border border-line px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <span className="title text-[15px]">{c.name}</span>
                    <Badge st={r.status} />
                  </div>
                  {r.reached && <p className="ml-11 mt-0.5 text-[13px] text-muted">Fase alcançada: {r.reached}</p>}
                  {r.next && opp && (
                    <div className="ml-11 mt-2 flex flex-wrap items-center gap-3 rounded-md bg-[#232323] px-3 py-2 text-[13px]">
                      <span className="label">Próximo jogo</span>
                      {opp.id != null && <Pic src={ea.crest(opp.id)} name={opp.name} size={18} round={false} />}
                      <b>{opp.name}</b>
                      <span className="text-muted">Rodada {r.next.round + 1} · {dateBr(r.next.date)} · {opp.home ? 'Em casa' : 'Fora'}</span>
                    </div>
                  )}
                  {!r.next && r.last && (
                    <p className="ml-11 mt-1 text-[13px] text-muted">Último jogo: {r.last.homeName} {r.last.homeGoals}–{r.last.awayGoals} {r.last.awayName} · {dateBr(r.last.date)}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Histórico por temporada">
        <div className="space-y-5">
          <SeasonBlock season={s.season} club={s.club.name} clubId={s.club.id} ea={ea} current
            rows={[
              { name: s.club.leagueName, type: 'Liga', result: <LeagueResult s={s} /> },
              ...cups.map((c) => ({ name: c.name, type: c.kind === 'cup' ? 'Copa nacional' : 'Continental', result: <Badge st={cupRun(s, c.id).status} /> })),
            ]} />
          {[...past].reverse().map((h, i) => {
            const y = yearOf(1 + i);
            return (
              <SeasonBlock key={i} season={`${String(y).padStart(2, '0')}/${String(y + 1).padStart(2, '0')}`} club={h.teamName} clubId={h.teamId} ea={ea}
                rows={[{ name: h.league, type: 'Liga', result: <span className="text-sm">{h.position === 1 ? '🏆 Campeão' : h.position ? `${h.position}º lugar` : 'Participou'} <span className="text-xs text-muted">· {h.won}V {h.drawn}E {h.lost}D</span></span> }]} />
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function LeagueResult({ s }: { s: CareerSnapshot }) {
  const t = s.standings.find((x) => x.isLeague);
  const pos = t ? t.rows.findIndex((r) => r.teamId === s.club.id) + 1 : 0;
  const played = t?.rows.find((r) => r.teamId === s.club.id)?.played ?? 0;
  return <span className="text-sm text-muted">{played ? `${pos}º lugar agora` : 'Participando'}</span>;
}

function SeasonBlock({ season, club, clubId, ea, current, rows }: { season: string; club: string; clubId: number; ea: Ea; current?: boolean; rows: { name: string; type: string; result: React.ReactNode }[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="num text-lg font-bold">{season}</span>
        {current && <span className="title rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">Em andamento</span>}
        <Pic src={ea.crest(clubId)} name={club} size={20} round={false} /><span className="font-semibold">{club}</span>
      </div>
      <div className="ml-4 space-y-2 border-l border-line pl-5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="text-lg">🏆</span>
            <div><div className="text-[14px]">{r.name}</div><div className="text-xs text-muted">{r.type}</div></div>
            <div className="ml-auto">{r.result}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
