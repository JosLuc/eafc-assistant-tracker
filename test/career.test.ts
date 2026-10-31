import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSave } from '../src/lib/save';
import { buildSnapshot } from '../src/lib/career/snapshot';
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
  const s = buildSnapshot(readSave(new Uint8Array(readFileSync(join(DIR, 's4.sav')))), new Date('2026-10-31T00:00:00Z'));
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
    expect(JSON.stringify(s).length).toBeLessThan(60_000);
  }, 60_000);
  it('gera dicas do auxiliar', () => {
    const tips = buildTips(s, (id) => `#${id}`);
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.every((t) => t.text.length > 10)).toBe(true);
  });
});
