import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { readSave } from '../src/lib/save';
import { buildSnapshot, type CareerSnapshot } from '../src/lib/career/snapshot';
import { buildTips } from '../src/lib/career/tips';
import { ageAt, fromGameDays, seasonOf, fromYmd } from '../src/lib/career/dates';

describe('datas', () => {
  it('converte dias do jogo e calcula temporada', () => {
    expect(fromGameDays(0).toISOString().slice(0, 10)).toBe('1582-10-14');
    expect(seasonOf(fromYmd(20260808)).label).toBe('26/27');
    expect(seasonOf(fromYmd(20270511)).label).toBe('26/27');
    expect(ageAt(new Date(Date.UTC(2000, 7, 9)), fromYmd(20260808))).toBe(25);
  });
});

const DIR = process.env.FC27_SAVES_DIR ?? join(__dirname, '..', 'saves');
describe.skipIf(!existsSync(join(DIR, 's4.sav')))('resumo da Home com save real', () => {
  let s: CareerSnapshot;
  beforeAll(() => { s = buildSnapshot(readSave(new Uint8Array(readFileSync(join(DIR, 's4.sav')))), new Date('2026-10-31T00:00:00Z')); }, 60_000);
  it('monta clube, data, elenco e tabelas', () => {
    expect(s.club).toMatchObject({ id: 13, name: 'Newcastle United', leagueName: 'England Premier League', rivalName: 'Sunderland' });
    expect(s.gameDate).toBe(20260808);
    expect(s.season).toBe('26/27');
    expect(s.squad).toHaveLength(27);
    expect(s.squad.find((p) => p.id === 206085)).toMatchObject({ contractUntil: 2028, wage: 145000 });
    expect(s.standings[0]).toMatchObject({ isLeague: true, title: 'England Premier League' });
    expect(s.standings[0]!.rows).toHaveLength(20);
    const pre = s.standings.find((t) => t.rows.some((r) => r.teamId === 13 && r.played > 0))!;
    expect(pre.title).toBe('Torneio de pré-temporada');
    expect(pre.rows.find((r) => r.teamId === 13)).toMatchObject({ played: 2, points: 0 });
    expect(JSON.stringify(s).length).toBeLessThan(400_000);
  }, 60_000);
  it('lê jogos, lesões, cartões e transferências', () => {
    expect(s.standings.filter((t) => t.isLeague)).toHaveLength(1);
    expect(s.matches).toHaveLength(41);
    expect(s.matches[0]).toMatchObject({ date: 20260801, homeId: 13, awayName: 'Juventus', homeGoals: 1, awayGoals: 2, competition: 'Torneio de pré-temporada' });
    expect(s.matches.filter((m) => m.competition === 'England Premier League')).toHaveLength(38);
    expect(s.matches.find((m) => !m.played && m.date >= s.gameDate)).toMatchObject({ date: 20260808, awayName: 'Bayer 04 Leverkusen' });
    expect(s.matches.find((m) => m.competitionId === 818)).toMatchObject({ date: 20260823, time: 1630, awayName: 'Liverpool' });
    expect(s.squad.find((p) => p.id === 274246)).toMatchObject({ injured: true, injuryReturn: 20260824, condition: 44 });
    expect(s.squad.filter((p) => p.yellows).map((p) => p.id).sort()).toEqual([251809, 255069, 257470]);
    expect(s.transfers.find((t) => t.playerId === 74463)).toMatchObject({ fromName: 'FC Barcelona', toId: 13, fee: 37_500_000, wage: 30_500 });
  });
  it('lê finanças, papéis, moral e técnico', () => {
    expect(s.finances).toMatchObject({ initialBudget: 1_129_626_816, currentBudget: 1_087_579_956, spentOnPlayers: 38_620_960, wageRaises: 2_843_500 });
    expect(s.squad.filter((p) => p.role).length).toBe(27);
    expect(s.morale?.average).toBeGreaterThan(50);
    expect(s.manager).toMatchObject({ name: 'Matthias Jaissle', jobSecurity: 80, earnings: 355_000 });
    expect(s.scorers.map((x) => x.playerId).sort()).toEqual([234824, 257470]);
  });
  it('lê as estatísticas da Premier League (s6: 1x1 com o Liverpool, gol do Wissa)', () => {
    const s6 = buildSnapshot(readSave(new Uint8Array(readFileSync(join(DIR, 's6.sav')))));
    const pl = s6.stats.find((c) => c.isLeague)!;
    expect(pl.competition).toBe('England Premier League');
    expect(pl.players.find((x) => x.playerId === 234824)).toMatchObject({ teamId: 13, apps: 1, minutes: 90, goals: 1, yellows: 1, avgRating: 7.8 });
  }, 60_000);
  it('gera dicas do auxiliar', () => {
    const tips = buildTips(s, (id) => `#${id}`);
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.every((t) => t.text.length > 10)).toBe(true);
  });
});

describe.skipIf(!existsSync(join(DIR, 'b.sav')))('outra carreira (América → Pisa)', () => {
  it('confere com o CM Tracker', () => {
    const a = buildSnapshot(readSave(new Uint8Array(readFileSync(join(DIR, 'a.sav')))));
    expect(a.morale).toMatchObject({ average: 72, teamPerformance: 83, playerPerformance: 55, contract: 79 });
    expect(a.manager?.jobSecurity).toBe(80);
    const b = buildSnapshot(readSave(new Uint8Array(readFileSync(join(DIR, 'b.sav')))));
    expect(b.club.name).toBe('Pisa');
    expect([1, 2, 3, 4, 5].map((r) => b.squad.filter((p) => p.role === r).length)).toEqual([4, 13, 4, 5, 0]);
    expect(b.manager).toMatchObject({ wage: 1000, earnings: 720_000, jobSecurity: 28, biggestWin: { score: '4-1' } });
    expect(b.manager?.history?.[0]).toMatchObject({ teamName: 'América', played: 44, won: 21, drawn: 7, lost: 16, goalsFor: 72, goalsAgainst: 63, points: 70, position: 9 });
    expect(Object.values(b.names)).toContain('Ichem Ferrah');
    // Estatísticas da temporada (CM Tracker: Loyola 38 jogos, Scuffet 13 sem sofrer gol, Ferrah 7,26, Buffon 7 assist.).
    const serieB = b.stats.find((c) => c.isLeague)!;
    const stat = (id: number) => b.stats.filter((c) => !c.competition.includes('pré')).flatMap((c) => c.players).filter((x) => x.playerId === id);
    const sum = (id: number, k: 'apps' | 'goals' | 'assists' | 'cleanSheets' | 'potm') => stat(id).reduce((a, x) => a + x[k], 0);
    expect(serieB.competition).toBe('Italy Serie B');
    expect([...serieB.players].sort((x, y) => y.goals - x.goals).slice(0, 3).map((x) => [x.playerId, x.goals])).toEqual([[230737, 21], [220165, 20], [279491, 19]]);
    expect(sum(71230, 'apps')).toBe(38);
    expect(sum(220048, 'cleanSheets')).toBe(13);
    expect(sum(77379, 'assists')).toBe(7);
    expect(sum(77379, 'potm')).toBe(6);
    const f = stat(279491); expect((f.reduce((a, x) => a + x.avgRating * x.apps, 0) / sum(279491, 'apps')).toFixed(2)).toBe('7.26');
  }, 60_000);
});

describe.skipIf(!existsSync(join(DIR, 's6.sav')))('várias carreiras', () => {
  it('separa Newcastle de América/Pisa e junta saves da mesma carreira', async () => {
    const { groupCareers, upsert } = await import('../src/lib/career/merge');
    const load = (f: string) => buildSnapshot(readSave(new Uint8Array(readFileSync(join(DIR, `${f}.sav`)))));
    const [a, b, s5, s6] = ['a', 'b', 's5', 's6'].map(load) as [ReturnType<typeof load>, ReturnType<typeof load>, ReturnType<typeof load>, ReturnType<typeof load>];
    let all = [s6, a, s5, b];
    all = upsert(all, s6); // reenviar o mesmo save não duplica
    const careers = groupCareers(all);
    expect(careers.length).toBe(2);
    const pisa = careers.find((c) => c.view.club.name === 'Pisa')!;
    expect(pisa.snaps.map((x) => x.club.name)).toEqual(['América', 'Pisa']);
    const nc = careers.find((c) => c.view.club.name === 'Newcastle United')!;
    expect(nc.snaps.length).toBe(2);
    expect(nc.previous?.gameDate).toBe(s5.gameDate);
    expect(b.tactic).toMatchObject({ formation: '4-3-3', code: 'TAsX&hrbf5nQ', defensiveDepth: 25, buildUp: 0 });
    // Empréstimos (conferido com o CM Tracker: América com 4 emprestados e 1 recebido do Wolverhampton)
    expect(a.loans.filter((l) => l.dir === 'out').map((l) => l.playerId).sort()).toEqual([211625, 276880, 85704, 89903]);
    expect(a.loans.filter((l) => l.dir === 'in')).toMatchObject([{ playerId: 237658, clubId: 110, until: 20270630 }]);
    expect(b.loans.find((l) => l.playerId === 277309)).toMatchObject({ dir: 'out', buyOption: 11_100_000 });
    // Moral de todo o elenco também depois de jogo oficial (o save guarda eventos de moral no meio dos registros)
    expect(s5.squad.filter((p) => p.morale != null)).toHaveLength(s5.squad.length);
    // Histórico de transferências do mundo (previousteam): a temporada inteira do Pisa
    expect(b.worldTransfers.length).toBeGreaterThan(1500);
    // Transferências recentes com valor (trfm, bloco de 70 bytes)
    expect(b.transfers.find((t) => t.playerId === 240277)).toMatchObject({ date: 20270201, fromName: 'Villarreal CF', toName: 'Milano FC', fee: 21_000_000, wage: 51_000 });
    expect(b.worldTransfers.filter((t) => t.fee != null).length).toBeGreaterThan(40);
    // Valor de mercado e forma (pvlm, plfm): Wissa fez o gol no 1x1 com o Liverpool
    expect(s6.squad.find((p) => p.id === 255069)?.value).toBe(43_000_000);
    expect(s6.squad.find((p) => p.id === 266127)).toMatchObject({ formScore: 61, formTrend: 5 });
    expect(s6.squad.filter((p) => p.formScore != null)).toHaveLength(s6.squad.length);
    // Feed de notícias (socm): time da semana, jogador do mês e a troca América → Pisa
    expect(b.teamOfWeek[0]).toMatchObject({ date: 20270427, players: expect.arrayContaining([237497, 216531]) });
    expect(b.playerOfMonth[0]).toMatchObject({ date: 20270505, playerId: 237497, teamName: 'Toluca' });
    expect(b.news.find((x) => x.key.startsWith('CM_Social_NewManager_WasFired'))).toMatchObject({ date: 20270511 });
    // E-mails (emlm): aviso de demissão da diretoria
    expect(b.emails.some((x) => x.key === 'CM_Email_Board_SackWarn')).toBe(true);
    // OVR dinâmico (dovm): Wissa +4 de forma e −3 de cansaço depois do jogo
    expect(s6.squad.find((p) => p.id === 266127)).toMatchObject({ ovrForm: 4, ovrFatigue: -3 });
    expect(s5.squad.find((p) => p.id === 266127)).toMatchObject({ ovrForm: 4, ovrFatigue: 0 });
    // Temporada passada por competição (stvm)
    const sb = readSave(new Uint8Array(readFileSync('saves/b.sav'))).seasonStats;
    expect(sb).toHaveLength(3886);
    expect(sb.find((x) => x.playerId === 239085)?.comps[0]).toMatchObject({ competitionId: 818, goals: 27, assists: 8, apps: 35 });
    expect(sb.find((x) => x.playerId === 230621)?.comps[0]).toMatchObject({ competitionId: 818, cleanSheets: 15, apps: 34 });
    // Comissão técnica (coam): 4 treinadores do clube + mercado de treinadores
    expect(b.coaches.filter((c) => c.hired).map((c) => c.name)).toEqual(['Enrico Palmieri', 'Julian Brunel', 'Giulio Valentini', 'Marc Schmitt']);
    expect(b.coaches.find((c) => c.name === 'Enrico Palmieri')).toMatchObject({ birthDate: 19680520, nationality: 27, wage: 3192, level: 2, ratings: [1, 1, 3, 1] });
    expect(b.coaches.length).toBe(24);
    expect(s6.coaches.find((c) => c.name === 'Selma Ritter')).toMatchObject({ hired: true, ratings: [2, 3, 5, 5] });
    // Orçamentos dos clubes da IA (budm)
    expect(b.budgets.find((x) => x[0] === 1)).toEqual([1, 264_994_256, 164_438_612, 5_159_799]);
    // Corrida dos prêmios (igual ao CM Tracker) e técnico do mês em set/2026 no América
    expect(a.awardsRace.slice(0, 6).map((x) => [x.teamName, x.rank])).toEqual([['Arsenal', 1], ['Manchester City', 2], ['Manchester United', 3], ['Aston Villa', 4], ['Paris Saint-Germain', 1], ['RC Lens', 2]]);
    expect(b.manager?.awards).toMatchObject([{ date: 20260901, teamName: 'América', type: 0 }]);
    // Pré-temporada: 3 convites no save do América
    expect(a.preseason.map((t) => [t.name, t.prize, t.teams.length])).toEqual([
      ['European International Cup', 2_500_000, 8], ['Champions Trophy', 2_000_000, 8], ['European Shield', 2_100_000, 8]]);
  }, 60_000);
});
