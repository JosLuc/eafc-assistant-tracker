import type { CareerSnapshot } from './snapshot';

/**
 * Página do jogador: números da carreira somando os saves enviados (uma linha por temporada e competição)
 * e a projeção do OVR por idade.
 */

export interface CareerStatRow { season: string; competition: string; apps: number; goals: number; assists: number; cleanSheets: number; yellows: number; minutes: number | null; avgRating: number | null }

/** Temporada anterior no formato do save ("26/27" → "25/26"). */
export function previousSeason(season: string): string {
  const m = /^(\d{2})\/(\d{2})$/.exec(season);
  if (!m) return '';
  const p = (n: number) => String((n + 100) % 100).padStart(2, '0');
  return `${p(Number(m[1]) - 1)}/${p(Number(m[2]) - 1)}`;
}

/**
 * Estatísticas do jogador por temporada e competição. Cada temporada usa o save mais recente dela
 * (os números do jogo são acumulados). A temporada anterior à primeira enviada vem do resumo que o
 * save guarda dos jogadores do elenco (sem minutos e nota).
 */
export function careerStats(snaps: CareerSnapshot[], id: number): CareerStatRow[] {
  const bySeason = new Map<string, CareerSnapshot>();
  for (const s of [...snaps].sort((a, b) => a.gameDate - b.gameDate)) bySeason.set(s.season, s);
  const out: CareerStatRow[] = [];
  const seasons = [...bySeason.keys()];
  const first = snaps.length ? [...snaps].sort((a, b) => a.gameDate - b.gameDate)[0]! : undefined;
  const prev = first ? previousSeason(first.season) : '';
  if (first && prev && !bySeason.has(prev)) {
    const sq = first.squad.find((p) => p.id === id);
    for (const c of sq?.lastSeason ?? []) {
      if (!c.apps) continue;
      out.push({ season: prev, competition: first.lastSeasonComps?.[c.competitionId] ?? 'Competição', apps: c.apps, goals: c.goals, assists: c.assists, cleanSheets: c.cleanSheets, yellows: c.yellows, minutes: null, avgRating: null });
    }
  }
  for (const season of seasons) {
    const s = bySeason.get(season)!;
    for (const c of s.stats ?? []) {
      const x = c.players.find((p) => p.playerId === id);
      if (!x || !x.apps) continue;
      out.push({ season, competition: c.competition, apps: x.apps, goals: x.goals, assists: x.assists, cleanSheets: x.cleanSheets, yellows: x.yellows, minutes: x.minutes, avgRating: x.avgRating || null });
    }
  }
  return out;
}

/** Soma das linhas (nota média ponderada pelos jogos que têm nota). */
export function totalStats(rows: CareerStatRow[]) {
  const rated = rows.filter((r) => r.avgRating != null);
  const ratedApps = rated.reduce((a, r) => a + r.apps, 0);
  return {
    apps: rows.reduce((a, r) => a + r.apps, 0), goals: rows.reduce((a, r) => a + r.goals, 0), assists: rows.reduce((a, r) => a + r.assists, 0),
    cleanSheets: rows.reduce((a, r) => a + r.cleanSheets, 0), yellows: rows.reduce((a, r) => a + r.yellows, 0),
    minutes: rows.reduce((a, r) => a + (r.minutes ?? 0), 0),
    avgRating: ratedApps ? rated.reduce((a, r) => a + r.avgRating! * r.apps, 0) / ratedApps : null,
  };
}

/**
 * Projeção do OVR por idade, no padrão do modo carreira: cresce rumo ao potencial até uns 27 anos
 * (mais rápido quanto mais novo), fica estável até 30 e cai depois (1 por ano até 32, 2 a 3 depois).
 * É uma estimativa: treino, minutos e forma mudam o ritmo real.
 */
export function projectOvr(ovr: number, pot: number, age: number, until = 36): { age: number; ovr: number }[] {
  const out = [{ age, ovr }];
  let cur = ovr;
  const peak = Math.max(age + 1, 27);
  for (let a = age + 1; a <= Math.max(until, age + 3); a++) {
    if (a <= peak && cur < pot) {
      const yearsLeft = peak - a + 1;
      cur = Math.min(pot, cur + Math.max(1, Math.round((pot - cur) / yearsLeft)));
    } else if (a >= 33) cur -= a >= 35 ? 3 : 2;
    else if (a >= 31) cur -= 1;
    out.push({ age: a, ovr: Math.max(40, cur) });
  }
  return out;
}

/** OVR do jogador em cada save enviado (para comparar com a projeção). */
export function ovrHistory(snaps: CareerSnapshot[], id: number): { season: string; date: number; age: number; ovr: number }[] {
  return [...snaps].sort((a, b) => a.gameDate - b.gameDate).flatMap((s) => {
    const p = s.squad.find((x) => x.id === id) ?? s.youth.find((x) => x.id === id);
    return p ? [{ season: s.season, date: s.gameDate, age: p.age, ovr: p.ovr }] : [];
  });
}
