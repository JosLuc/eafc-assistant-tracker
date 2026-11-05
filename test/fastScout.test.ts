import { describe, expect, it } from 'vitest';
import { fastScoutContext, parseFastScout, type FastScoutOptions } from '../src/lib/career/fastScout';

const o: FastScoutOptions = {
  leagues: [[13, 'Premier League'], [16, 'Ligue 1'], [7, 'Série A Brasil']],
  teams: [[1, 'Arsenal'], [5, 'Chelsea'], [10, 'Manchester City'], [11, 'Manchester United']],
  nations: [[54, 'Brazil'], [14, 'England']],
  styles: [['trait1_64', 'Rapid'], ['icontrait1_64', 'Rapid+']],
};

describe('Scout rápida', () => {
  it('monta o contexto com as opções do save', () => {
    const c = fastScoutContext(o);
    expect(c).toContain('Premier League');
    expect(c).toContain('LE = lateral esquerdo');
    expect(c).toContain('Rapid');
  });

  it('lê o JSON da IA, mesmo com texto e cercas em volta', () => {
    const r = parseFastScout('Aqui:\n```json\n{"ranges":{"age":[null,22],"potential":[84,null],"value":[null,15],"inventado":[1,2]},"pos":["LE","ALE"],"league":"premier league","nation":"Brasil","foot":"esquerdo","styles":["Rapid"],"roles":[{"pos":"LE","name":"Inverted Wingback","plus":2}],"sort":{"key":"potential","dir":"desc"},"note":"Laterais jovens"}\n```', o);
    expect(r.filter.ranges).toEqual({ age: [null, 22], potential: [84, null], value: [null, 15] });
    expect(r.filter.pos).toEqual([7, 8]);
    expect(r.filter.league).toBe(13);
    expect(r.filter.foot).toBe(2);
    expect(r.filter.styles).toEqual(['trait1_64']);
    expect(r.filter.roles).toEqual([147]);
    expect(r.sort).toEqual({ key: 'potential', dir: -1 });
    expect(r.note).toBe('Laterais jovens');
    expect(r.ignored).toContain('inventado');
    expect(r.ignored).toContain('Brasil');
  });

  it('limita as faixas ao mínimo e máximo de cada filtro', () => {
    const r = parseFastScout('{"ranges":{"overallrating":[10,120]}}', o);
    expect(r.filter.ranges.overallrating).toEqual([40, 99]);
  });

  it('acha o clube pelo nome mais curto que contém o texto', () => {
    expect(parseFastScout('{"team":"Manchester"}', o).filter.team).toBe(10);
    expect(parseFastScout('{"team":"chelsea fc"}', o).filter.team).toBe(5);
  });

  it('dá erro claro sem JSON', () => {
    expect(() => parseFastScout('não sei', o)).toThrow(/filtros/);
  });
});
