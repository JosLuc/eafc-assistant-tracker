import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSave, type CareerSave } from '../src/lib/save';

/**
 * Testes com saves reais (não versionados). Coloque em ./saves (ou FC27_SAVES_DIR):
 * s1.sav antes do jogo 1 · s2.sav depois do jogo 1 · s3.sav renovação aceita · s4.sav contratação
 */
const DIR = process.env.FC27_SAVES_DIR ?? join(__dirname, '..', 'saves');
const has = ['s1', 's2', 's3', 's4'].every((s) => existsSync(join(DIR, `${s}.sav`)));
const cache = new Map<string, CareerSave>();
const load = (s: string) => cache.get(s) ?? cache.set(s, readSave(new Uint8Array(readFileSync(join(DIR, `${s}.sav`))))).get(s)!;
const player = (sv: CareerSave, id: number) => sv.tables.players!.find((p) => p.playerid === id)!;
const squad = (sv: CareerSave, team: number) =>
  new Set(sv.tables.teamplayerlinks!.filter((l) => l.teamid === team).map((l) => l.playerid as number));

describe.skipIf(!has)('saves reais do FC 27', () => {
  it('abre o contêiner, os 2 bancos e os 80 módulos', () => {
    const s = load('s1');
    expect(s.slotName).toBe('antes do jogo');
    expect(Object.keys(s.container.modules)).toHaveLength(80);
    expect(s.tables.players!.length).toBeGreaterThan(20000);
    expect(s.tables.teams!.find((t) => t.teamid === 13)!.teamname).toBe('Newcastle United');
  }, 60_000);

  it('calibra IDs e valores do banco principal', () => {
    const s = load('s1');
    const ronaldo = player(s, 20801);
    expect(ronaldo.height).toBe(187);
    expect(player(s, 158023).preferredfoot).toBe(2); // Messi canhoto
    expect(s.userTeamId).toBe(13);
  });

  it('jogo 1: classificação e notas', () => {
    const s = load('s2');
    const table = [...s.standings.values()].find((rows) => rows.some((r) => r.teamId === 13 && r.played > 0))!;
    const nc = table.find((r) => r.teamId === 13)!;
    const ju = table.find((r) => r.teamId === 45)!;
    expect(nc).toMatchObject({ played: 1, lost: 1, goalsFor: 1, goalsAgainst: 2, points: 0 });
    expect(ju).toMatchObject({ won: 1, goalsFor: 2, goalsAgainst: 1, points: 3 });
    const ratings = s.tables.career_playermatchratinghistory!;
    expect(ratings).toHaveLength(14);
    const nSquad = squad(s, 13);
    expect(ratings.every((r) => nSquad.has(r.playerid as number))).toBe(true);
    const lineup = s.lineups.find((l) => l.teamId === 13)!;
    expect(lineup.players.map((p) => p.playerId).sort()).toEqual(ratings.map((r) => r.playerid).sort());
    expect(load('s1').tables.career_playermatchratinghistory).toHaveLength(0);
  }, 60_000);

  it('renovação: contrato e salário mudam', () => {
    const before = player(load('s2'), 206085), after = player(load('s3'), 206085);
    expect([before.contractvaliduntil, after.contractvaliduntil]).toEqual([2027, 2028]);
    expect([before.wage, after.wage]).toEqual([115000, 145000]);
  }, 60_000);

  it('contratação: novo jogador no elenco', () => {
    const s3 = squad(load('s3'), 13), s4 = squad(load('s4'), 13);
    expect([...s4].filter((p) => !s3.has(p))).toEqual([74463]);
    expect(player(load('s4'), 74463)).toMatchObject({ contractvaliduntil: 2031, wage: 30500 });
  }, 60_000);
});
