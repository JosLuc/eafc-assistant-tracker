import { describe, expect, it } from 'vitest';
import { parseSofifaTitle } from '../src/lib/ea/sofifa';

describe('nome pelo SoFIFA', () => {
  it('lê o nome do título da página', () => {
    expect(parseSofifaTitle('<html><head><title>Leo Shahar - FC27 | SoFIFA</title>')).toBe('Leo Shahar');
    expect(parseSofifaTitle('<title>Anthony Junior Munda - FC 27 | SoFIFA</title>')).toBe('Anthony Junior Munda');
    expect(parseSofifaTitle('<title>Ant&#245;nio O&#039;Neil - FC27 | SoFIFA</title>')).toBe("Antõnio O'Neil");
  });
  it('ignora páginas sem jogador (desafio, erro)', () => {
    expect(parseSofifaTitle('<title>Just a moment...</title>')).toBeNull();
    expect(parseSofifaTitle('')).toBeNull();
  });
});
