import { describe, expect, it } from 'vitest';
import { tabsToTables } from '../src/lib/ai/markdown';

describe('tabsToTables', () => {
  it('converte linhas separadas por tabulação em tabela Markdown', () => {
    const out = tabsToTables('Titulares\nPos\tJogador\tOVR\nGOL\tPope\t84\nZAG\tBotman\t81\nfim');
    expect(out).toContain('| Pos | Jogador | OVR |');
    expect(out).toContain('| --- | --- | --- |');
    expect(out).toContain('| ZAG | Botman | 81 |');
    expect(out.startsWith('Titulares')).toBe(true);
    expect(out.trim().endsWith('fim')).toBe(true);
  });
  it('não mexe em texto sem tabulação', () => {
    expect(tabsToTables('| a | b |\n|---|---|\n| 1 | 2 |')).toBe('| a | b |\n|---|---|\n| 1 | 2 |');
  });
});
