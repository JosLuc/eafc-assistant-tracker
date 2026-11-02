import type { Attr } from './playerdb';

/**
 * Nota estimada em cada posição a partir dos atributos (pesos no estilo da fórmula do jogo).
 * Calibrada pelo OVR real na posição principal, para que ela bata com o jogo; as demais são estimativas.
 */
type W = Partial<Record<Attr, number>>;
const F: Record<string, W> = {
  GOL: { gkdiving: .21, gkhandling: .21, gkkicking: .05, gkreflexes: .21, gkpositioning: .21, reactions: .11 },
  ZAG: { defensiveawareness: .17, standingtackle: .17, slidingtackle: .13, headingaccuracy: .10, strength: .10, aggression: .07, interceptions: .13, shortpassing: .05, ballcontrol: .04, reactions: .05, jumping: .03, sprintspeed: .02 },
  LAT: { acceleration: .05, sprintspeed: .07, stamina: .08, reactions: .08, ballcontrol: .07, shortpassing: .07, interceptions: .12, defensiveawareness: .08, standingtackle: .11, slidingtackle: .14, crossing: .09, headingaccuracy: .04 },
  ALA: { acceleration: .04, sprintspeed: .06, stamina: .10, reactions: .08, ballcontrol: .08, dribbling: .07, shortpassing: .10, crossing: .12, interceptions: .12, defensiveawareness: .07, standingtackle: .08, slidingtackle: .11 },
  VOL: { shortpassing: .14, longpassing: .10, ballcontrol: .10, reactions: .07, interceptions: .14, defensiveawareness: .14, standingtackle: .12, slidingtackle: .05, stamina: .06, strength: .04, aggression: .05, vision: .04 },
  MC: { shortpassing: .17, longpassing: .13, vision: .13, ballcontrol: .14, dribbling: .07, reactions: .08, interceptions: .05, defensiveawareness: .05, standingtackle: .06, stamina: .06, longshots: .04, positioning: .06 },
  MEI: { shortpassing: .16, vision: .14, ballcontrol: .15, dribbling: .13, positioning: .09, reactions: .07, agility: .03, acceleration: .04, longshots: .05, finishing: .07, shotpower: .05 },
  ME: { crossing: .10, dribbling: .15, ballcontrol: .13, shortpassing: .11, vision: .07, acceleration: .07, sprintspeed: .06, stamina: .05, reactions: .07, positioning: .08, longpassing: .05, agility: .03, curve: .02 },
  PE: { crossing: .09, dribbling: .16, ballcontrol: .14, shortpassing: .09, vision: .06, acceleration: .07, sprintspeed: .06, agility: .03, reactions: .07, positioning: .09, finishing: .10, longshots: .04 },
  SA: { finishing: .11, shotpower: .05, longshots: .04, positioning: .13, headingaccuracy: .02, dribbling: .14, ballcontrol: .15, shortpassing: .09, vision: .08, reactions: .09, acceleration: .05, sprintspeed: .05 },
  ATA: { finishing: .18, positioning: .13, headingaccuracy: .10, shotpower: .10, reactions: .08, dribbling: .07, ballcontrol: .10, volleys: .02, longshots: .03, acceleration: .04, sprintspeed: .05, strength: .05 },
};
/** Grupo de fórmula para cada código de posição do jogo (0 GOL … 27 PE). */
const GROUP: Record<number, string> = {
  0: 'GOL', 1: 'ZAG', 2: 'ALA', 3: 'LAT', 4: 'ZAG', 5: 'ZAG', 6: 'ZAG', 7: 'LAT', 8: 'ALA', 9: 'VOL', 10: 'VOL', 11: 'VOL',
  12: 'ME', 13: 'MC', 14: 'MC', 15: 'MC', 16: 'ME', 17: 'MEI', 18: 'MEI', 19: 'MEI', 20: 'SA', 21: 'SA', 22: 'SA', 23: 'PE', 24: 'ATA', 25: 'ATA', 26: 'ATA', 27: 'PE',
};
/** Posições mostradas no campinho (código do jogo e rótulo). */
export const PITCH: { code: number; label: string; x: number; y: number }[] = [
  { code: 25, label: 'ATA', x: 50, y: 10 }, { code: 27, label: 'PE', x: 15, y: 18 }, { code: 23, label: 'PD', x: 85, y: 18 },
  { code: 18, label: 'MEI', x: 50, y: 32 }, { code: 16, label: 'ME', x: 15, y: 45 }, { code: 14, label: 'MC', x: 50, y: 48 }, { code: 12, label: 'MD', x: 85, y: 45 },
  { code: 10, label: 'VOL', x: 50, y: 63 }, { code: 7, label: 'LE', x: 15, y: 75 }, { code: 5, label: 'ZAG', x: 50, y: 78 }, { code: 3, label: 'LD', x: 85, y: 75 },
  { code: 0, label: 'GOL', x: 50, y: 93 },
];
function raw(code: number, a: Record<string, number>) {
  const w = F[GROUP[code] ?? 'MC']!;
  let s = 0, t = 0;
  for (const [k, v] of Object.entries(w)) { s += (a[k] ?? 0) * v!; t += v!; }
  return s / t;
}
export function positionRatings(a: Record<string, number>, mainPos: number, ovr: number) {
  const off = ovr - raw(mainPos, a);
  return new Map(PITCH.map((p) => [p.code, Math.max(1, Math.min(99, Math.round(raw(p.code, a) + off)))]));
}
