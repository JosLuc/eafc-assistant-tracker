'use client';
import { useEffect, useMemo, useState } from 'react';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import { addSnapshot, loadSnapshots, parseInWorker, removeCareer } from '@/lib/client/store';
import { careerKey, groupCareers, type Career } from '@/lib/career/merge';
import { useEa } from './names';
import { Header, type Page } from './Header';
import { Upload } from './Upload';
import * as W from './widgets';
import * as W2 from './widgets2';
import { SquadPage } from '../squad/SquadPage';
import { YouthPage } from '../squad/YouthPage';
import { TrophiesPage } from '../squad/TrophiesPage';


const SECTIONS = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'elenco', label: 'Elenco' },
  { id: 'lesoes', label: 'Lesões e suspensões' },
  { id: 'contratos', label: 'Transferências e contratos' },
  { id: 'competicoes', label: 'Competições' },
  { id: 'clube', label: 'Clube e finanças' },
  { id: 'tecnico', label: 'Técnico e diretoria' },
  { id: 'base', label: 'Base e olheiros' },
  { id: 'mundo', label: 'Mundo' },
] as const;
type Section = (typeof SECTIONS)[number]['id'];

const WIDGETS: { id: string; sections: Section[]; C: (p: { s: CareerSnapshot; ea: ReturnType<typeof useEa>; career: Career }) => React.ReactNode; wide?: boolean }[] = [
  { id: 'dica', sections: ['geral'], C: W.AssistantTips, wide: true },
  { id: 'calendario', sections: ['geral'], C: W.Calendar },
  { id: 'proximo', sections: ['geral'], C: W.NextMatch },
  { id: 'liga', sections: ['geral', 'competicoes'], C: W.LeaguePosition },
  { id: 'forca', sections: ['geral'], C: W.TeamPower },
  { id: 'xi', sections: ['geral'], C: W.StartingXI },
  { id: 'moral', sections: ['geral'], C: W.SquadMorale },
  { id: 'identidade', sections: ['geral'], C: W.CareerIdentity },
  { id: 'mudou', sections: ['geral'], C: W.WhatChanged },
  { id: 'status', sections: ['geral'], C: W.SaveStatus },
  { id: 'elenco', sections: ['elenco'], C: W.SquadOverview },
  { id: 'destaques', sections: ['elenco'], C: W.SeasonLeaders },
  { id: 'papeis', sections: ['elenco'], C: W.SquadRoles },
  { id: 'forma', sections: ['geral', 'elenco'], C: W2.SquadForm },
  { id: 'valor', sections: ['elenco', 'clube'], C: W2.SquadValue },
  { id: 'temporada-passada', sections: ['elenco'], C: W2.LastSeason },
  { id: 'tatica', sections: ['elenco'], C: W.SetPieces, wide: true },
  { id: 'lesoes', sections: ['lesoes'], C: W.Availability },
  { id: 'cartoes', sections: ['lesoes'], C: W.Discipline },
  { id: 'mercado', sections: ['contratos', 'mundo'], C: W.TransferMarket },
  { id: 'transferencias', sections: ['contratos'], C: W.Transfers },
  { id: 'emprestimos', sections: ['contratos'], C: W.Loans },
  { id: 'contratos', sections: ['contratos'], C: W.Contracts },
  { id: 'artilharia', sections: ['competicoes'], C: W.GoldenBoot },
  { id: 'trofeus', sections: ['competicoes'], C: W.Silverware },
  { id: 'time-semana', sections: ['competicoes'], C: W2.LeagueAwards },
  { id: 'resultados', sections: ['competicoes'], C: W.Results },
  { id: 'jogos', sections: ['competicoes'], C: W.Fixtures },
  { id: 'clube', sections: ['clube'], C: W.Club },
  { id: 'financas', sections: ['clube'], C: W.ClubFinances },
  { id: 'comissao', sections: ['clube'], C: W2.CoachingStaff },
  { id: 'cv', sections: ['tecnico'], C: W.ManagerCV },
  { id: 'cargo', sections: ['tecnico'], C: W.JobSecurity },
  { id: 'emails', sections: ['tecnico'], C: W2.Inbox },
  { id: 'historico', sections: ['tecnico'], C: W.SeasonHistory, wide: true },
  { id: 'base', sections: ['base'], C: W.YouthAcademy },
  { id: 'olheiros', sections: ['base'], C: W.ScoutStaff },
  { id: 'pretemporada', sections: ['mundo'], C: W.PreseasonTour },
  { id: 'noticias', sections: ['mundo'], C: W2.NewsFeed },
  { id: 'rivais', sections: ['mundo', 'clube'], C: W2.LeagueRivals },
  { id: 'premios', sections: ['base', 'competicoes'], C: W.AwardsRace },
];

/** Jogadores citados no feed, nos e-mails, no time da semana e no jogador do mês (para buscar nome e foto). */
function newsPlayers(s: CareerSnapshot) {
  const posts = [...(s.news ?? []), ...(s.emails ?? [])];
  return [...posts.flatMap((x) => [...x.players, ...x.params.filter(([k, v]) => (k === 8 || k === 9 || k === 10) && v > 0 && v < 999999).map(([, v]) => v)]),
    ...(s.teamOfWeek ?? []).flatMap((t) => t.players), ...(s.playerOfMonth ?? []).map((x) => x.playerId)];
}

export function Home() {
  const [snaps, setSnaps] = useState<CareerSnapshot[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [section, setSection] = useState<Section>('geral');
  const [page, setPage] = useState<Page>('inicio');

  const [sel, setSel] = useState<string>();
  useEffect(() => {
    loadSnapshots().then(setSnaps);
    try { setSel(localStorage.getItem('fc27:career') ?? undefined); } catch { /* sem armazenamento */ }
  }, []);
  const careers = useMemo(() => groupCareers(snaps ?? []), [snaps]);
  const career = careers.find((c) => c.key === sel) ?? careers[0];
  const s = career?.view;
  const choose = (k: string) => { setSel(k); try { localStorage.setItem('fc27:career', k); } catch { /* ok */ } };

  async function onFile(f: File) {
    setBusy(true); setError(undefined);
    try {
      const snap = await parseInWorker(await f.arrayBuffer());
      setSnaps(await addSnapshot(snap)); setUploading(false); choose(careerKey(snap));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  const ids = useMemo(() => (s ? [...new Set([...s.squad.map((p) => p.id), ...s.transfers.map((t) => t.playerId), ...s.youth.map((y) => y.id), ...(s.stats ?? []).flatMap((c) => c.players.map((x) => x.playerId)), ...(s.worldTransfers ?? []).map((t) => t.playerId), ...(s.tactic?.cornerSupport ?? []), ...(s.loans ?? []).map((l) => l.playerId), ...newsPlayers(s)])] : []), [s]);
  const teamIds = useMemo(() => (s ? [...new Set([s.club.id, ...s.standings.flatMap((t) => t.rows.map((r) => r.teamId)),
    ...s.matches.flatMap((m) => [m.homeId, m.awayId]).filter((x): x is number => x != null),
    ...s.transfers.flatMap((t) => [t.fromId, t.toId]), ...(s.stats ?? []).flatMap((c) => c.players.map((x) => x.teamId)), ...(s.worldTransfers ?? []).flatMap((t) => [t.fromId, t.toId]), s.club.rivalId, ...(s.loans ?? []).map((l) => l.clubId), ...(s.preseason ?? []).flatMap((t) => t.teams.map((x) => x.id)), ...(s.awardsRace ?? []).map((x) => x.teamId), ...(s.leagueRivals ?? []).map((x) => x.teamId), ...[...(s.news ?? []), ...(s.emails ?? [])].flatMap((x) => (x.teams ?? []).map((t) => t.id))])] : []), [s]);
  const ea = useEa(ids, teamIds, s?.names);

  if (!snaps) return <p className="p-8 text-muted">Carregando…</p>;
  if (!s || uploading) return <main className="p-4 pt-16"><Upload onFile={onFile} busy={busy} error={error} onCancel={s ? () => setUploading(false) : undefined} /></main>;

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-4 md:px-6">
      <Header s={s} ea={ea} onUpload={() => setUploading(true)} careers={careers} current={career!} onChoose={choose} page={page} setPage={setPage}
        onRemove={async (k) => { if (confirm('Apagar esta carreira e todos os saves dela deste navegador?')) setSnaps(await removeCareer(careerKey, k)); }} />
      {page === 'elenco' ? <SquadPage s={s} ea={ea} /> : page === 'base' ? <YouthPage s={s} ea={ea} /> : page === 'trofeus' ? <TrophiesPage s={s} ea={ea} career={career!} /> : (
        <div>
          <div className="flex items-baseline justify-between"><h2 className="title text-[15px]">Visão do clube</h2><span className="text-xs text-muted">Do save enviado · temporada {s.season}</span></div>
          <nav className="sticky top-0 z-30 -mx-4 mb-2 flex gap-5 overflow-x-auto border-b border-line bg-bg/95 px-4 backdrop-blur md:-mx-6 md:px-6">
            {SECTIONS.map((x) => {
              const n = WIDGETS.filter((w) => w.sections[0] === x.id).length;
              return (
                <a key={x.id} href={`#${x.id}`} onClick={() => setSection(x.id)}
                  className={`title whitespace-nowrap border-b-2 py-3 text-[13px] ${section === x.id ? 'border-accent text-white' : 'border-transparent text-muted hover:text-white'}`}>
                  {x.label} <span className="ml-1 text-[11px] font-normal text-faint">{n}</span>
                </a>
              );
            })}
          </nav>
          {SECTIONS.map((x) => {
            const list = WIDGETS.filter((w) => w.sections[0] === x.id);
            if (!list.length) return null;
            return (
              <section key={x.id} id={x.id} className="scroll-mt-14 pt-6">
                <div className="mb-3 flex items-baseline justify-between"><h2 className="title text-[15px]">{x.label}</h2><span className="text-xs text-faint">{list.length} cards</span></div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
                  {list.map(({ id, C, wide }) => <div key={id} className={wide ? 'md:col-span-2 xl:col-span-12' : 'xl:col-span-4'}><C s={s} ea={ea} career={career!} /></div>)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
