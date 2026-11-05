import { describe, expect, it } from 'vitest';
import { careerStats, previousSeason, projectOvr, totalStats } from '../src/lib/career/playerCareer';
import type { CareerSnapshot } from '../src/lib/career/snapshot';

const line = (playerId: number, apps: number, goals: number) => ({ playerId, teamId: 1, apps, minutes: apps * 90, goals, assists: 1, cleanSheets: 0, potm: 0, yellows: 0, avgRating: 7 });
const snap = (season: string, gameDate: number, apps: number): CareerSnapshot => ({
  season, gameDate, squad: [{ id: 9, age: 20, ovr: 70, pot: 80, lastSeason: [{ competitionId: 13, goals: 4, assists: 2, cleanSheets: 0, yellows: 1, reds: 0, apps: 10 }] }],
  youth: [], lastSeasonComps: { 13: 'Premier League' }, stats: [{ competitionId: 13, competition: 'Premier League', isLeague: true, players: [line(9, apps, 2)] }],
} as unknown as CareerSnapshot);

describe('carreira do jogador', () => {
  it('temporada anterior', () => {
    expect(previousSeason('26/27')).toBe('25/26');
    expect(previousSeason('00/01')).toBe('99/00');
  });
  it('usa o último save de cada temporada e o resumo da anterior', () => {
    const rows = careerStats([snap('26/27', 20270101, 10), snap('26/27', 20270301, 20), snap('27/28', 20271001, 5)], 9);
    expect(rows.map((r) => [r.season, r.apps])).toEqual([['25/26', 10], ['26/27', 20], ['27/28', 5]]);
    const t = totalStats(rows);
    expect(t.apps).toBe(35);
    expect(t.goals).toBe(8);
    expect(t.avgRating).toBe(7);
  });
  it('projeção cresce até o potencial e cai depois dos 30', () => {
    const p = projectOvr(70, 85, 19);
    expect(p[0]).toEqual({ age: 19, ovr: 70 });
    expect(p.find((x) => x.age === 27)!.ovr).toBe(85);
    expect(Math.max(...p.map((x) => x.ovr))).toBe(85);
    expect(p.find((x) => x.age === 34)!.ovr).toBeLessThan(85);
    // nunca sobe de um ano para o outro depois do pico
    const after = p.filter((x) => x.age >= 27);
    for (let i = 1; i < after.length; i++) expect(after[i]!.ovr).toBeLessThanOrEqual(after[i - 1]!.ovr);
  });
});
