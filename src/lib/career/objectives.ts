/**
 * Objetivo da liga que a diretoria passa em cada temporada (byte do histórico do técnico, mhrm).
 * Códigos conferidos: 0 no América (Liga MX), 6 no Pisa (Serie B, acesso direto), 2 no Newcastle (print do jogo: zona da Champions).
 * Os outros textos ainda não foram confirmados com a tela do jogo.
 */
export const LEAGUE_OBJECTIVE: Record<number, string> = { 0: 'Ser campeão da liga', 2: 'Terminar na zona da Champions League', 6: 'Conseguir o acesso direto' };

export const leagueObjective = (code: number) => LEAGUE_OBJECTIVE[code] ?? `Meta da liga (código ${code})`;

export function securityLevel(v: number) {
  if (v >= 60) return { label: 'SEGURO', color: '#22c55e' };
  if (v >= 35) return { label: 'ATENÇÃO', color: '#eab308' };
  return { label: 'EM RISCO', color: '#ef4444' };
}
