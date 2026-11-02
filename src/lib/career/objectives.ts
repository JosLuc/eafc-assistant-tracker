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

/** Objetivo de copa nacional (byte depois do da liga no mhrm). 7 conferido no print: "Vencer a copa". */
export const CUP_OBJECTIVE: Record<number, string> = { 7: 'Vencer a copa' };
export const cupObjective = (code: number) => CUP_OBJECTIVE[code] ?? `Meta da copa (código ${code})`;
export const continentalObjective = (code: number) => `Meta continental (código ${code})`;
/** Copa principal do país (a que o jogo usa no objetivo de copa). */
const MAIN_CUP = /FA Cup|Copa do Brasil|Coppa Italia|Copa del Rey|DFB|Coupe de France|Ta[cç]a de Portugal|KNVB|Copa MX/i;
export function mainCup<T extends { name: string; kind: string }>(cups: T[]): T | undefined {
  const dom = cups.filter((c) => c.kind === 'cup');
  return dom.find((c) => MAIN_CUP.test(c.name)) ?? dom[0];
}
