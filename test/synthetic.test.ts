import { describe, expect, it } from 'vitest';
import { getBits } from '../src/lib/save/bytes';
import { readStandings } from '../src/lib/save/modules/standings';
import { readLineups } from '../src/lib/save/modules/lineups';

describe('getBits', () => {
  it('lê bits LSB primeiro atravessando bytes', () => {
    const rec = new Uint8Array([0b1010_1100, 0b0000_0011]);
    expect(getBits(rec, 2, 3)).toBe(0b011);
    expect(getBits(rec, 6, 4)).toBe(0b1110);
    expect(getBits(new Uint8Array([0xff, 0xff, 0xff, 0xff]), 0, 32)).toBe(0xffffffff);
  });
});

describe('readStandings', () => {
  it('lê linhas de classificação do fcem e ordena por pontos', () => {
    const row = (idx: number, team: number, s: number[]) =>
      [0xff, 0x01, idx & 0xff, idx >> 8, 0x89, 0x07, team & 0xff, (team >> 8) & 0xff, team >> 16, 0, ...s];
    const buf = new Uint8Array([
      ...row(1, 13, [0, 0, 0, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0]), // Newcastle perdeu 1x2 em casa
      ...row(2, 45, [1, 0, 0, 0, 0, 0, 1, 0, 0, 2, 1, 3, 0]), // Juventus venceu 2x1 fora
    ]);
    const t = readStandings(buf, (id) => id === 13 || id === 45).get(0x789)!;
    expect(t.map((r) => r.teamId)).toEqual([45, 13]);
    expect(t[0]).toMatchObject({ points: 3, won: 1, goalsFor: 2, goalsAgainst: 1 });
    expect(t[1]).toMatchObject({ points: 0, lost: 1, goalsFor: 1, goalsAgainst: 2 });
  });
});

describe('readLineups', () => {
  it('lê time, jogador e minutos do hstm', () => {
    const buf = new Uint8Array([
      ...'mtsh'.split('').map((c) => c.charCodeAt(0)), 1, 1, 1, 0, 0, 0,
      13, 0, 0, 0, 1, 1, 0, 0, 0,
      1, 1, 0x79, 0xf3, 0x0b, 0x5b, 0xce, 0, 0,
    ]);
    expect(readLineups(buf)).toEqual([{ teamId: 13, players: [{ playerId: 258936, minutes: 90, raw: [0x79, 0xf3, 0x0b, 0x5b, 0xce, 0, 0] }] }]);
  });
});
