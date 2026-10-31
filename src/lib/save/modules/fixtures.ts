import { u16, u32 } from '../bytes';

/**
 * Jogos da temporada inteira, no módulo `fcem`. Cada jogo tem 22 bytes:
 *   ff 01 | idx u16 | competição u16 | rodada u8 | data u32 (aaaammdd) | hora u16 (hhmm)
 *   | linha do mandante u16 | gols u8 | ff | linha do visitante u16 | gols u8 | ff | jogado u8
 * Os times vêm como "linha" de uma classificação (StandingRow.rowIdx), não como teamid.
 * Gols 255 = jogo ainda não disputado. Conferido: Newcastle 1x2 Juventus (01/08), Lombardia 2x1 Newcastle (04/08).
 */
export interface RawFixture {
  idx: number; competitionId: number; round: number; date: number; time: number;
  homeRow: number; awayRow: number; homeGoals: number | null; awayGoals: number | null; played: boolean;
}

export function readFixtures(fcem: Uint8Array): RawFixture[] {
  const out: RawFixture[] = [];
  for (let i = fcem.indexOf(0xff); i !== -1 && i + 24 <= fcem.length; i = fcem.indexOf(0xff, i + 1)) {
    if (fcem[i + 1] !== 0x01) continue;
    const date = u32(fcem, i + 7);
    if (date < 20000101 || date > 21000101 || fcem[i + 16] !== 0xff || fcem[i + 20] !== 0xff) continue;
    const time = u16(fcem, i + 11);
    if (time > 2359 || time % 100 > 59) continue;
    const hg = fcem[i + 15]!, ag = fcem[i + 19]!;
    out.push({
      idx: u16(fcem, i + 2), competitionId: u16(fcem, i + 4), round: fcem[i + 6]!, date, time,
      homeRow: u16(fcem, i + 13), awayRow: u16(fcem, i + 17),
      homeGoals: hg === 0xff ? null : hg, awayGoals: ag === 0xff ? null : ag, played: fcem[i + 21] !== 0,
    });
    i += 21;
  }
  return out;
}
