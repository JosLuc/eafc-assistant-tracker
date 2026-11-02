/**
 * Roles do FC 27. O save guarda até 5 por jogador (players.role1..role5):
 * código 1–49 = Role+, código + 100 = Role++. Nomes conferidos jogador a jogador.
 */
export const ROLES: Record<number, { name: string; pos: string }> = {
  1: { name: 'Goalkeeper', pos: 'GOL' }, 2: { name: 'Sweeper Keeper', pos: 'GOL' },
  3: { name: 'Fullback', pos: 'LD' }, 4: { name: 'Falseback', pos: 'LD' }, 5: { name: 'Wingback', pos: 'LD' }, 6: { name: 'Attacking Wingback', pos: 'LD' },
  7: { name: 'Fullback', pos: 'LE' }, 8: { name: 'Falseback', pos: 'LE' }, 9: { name: 'Wingback', pos: 'LE' }, 10: { name: 'Attacking Wingback', pos: 'LE' },
  11: { name: 'Defender', pos: 'ZAG' }, 12: { name: 'Stopper', pos: 'ZAG' }, 13: { name: 'Ball-Playing Defender', pos: 'ZAG' },
  14: { name: 'Holding', pos: 'VOL' }, 15: { name: 'Centre Half', pos: 'VOL' }, 16: { name: 'Deep-Lying Playmaker', pos: 'VOL' }, 17: { name: 'Wide Half', pos: 'VOL' },
  18: { name: 'Box-to-Box', pos: 'MC' }, 19: { name: 'Holding', pos: 'MC' }, 20: { name: 'Deep-Lying Playmaker', pos: 'MC' }, 21: { name: 'Playmaker', pos: 'MC' }, 22: { name: 'Half Winger', pos: 'MC' },
  23: { name: 'Winger', pos: 'MD' }, 24: { name: 'Wide Midfielder', pos: 'MD' }, 25: { name: 'Wide Playmaker', pos: 'MD' }, 26: { name: 'Inside Forward', pos: 'MD' },
  27: { name: 'Winger', pos: 'ME' }, 28: { name: 'Wide Midfielder', pos: 'ME' }, 29: { name: 'Wide Playmaker', pos: 'ME' }, 30: { name: 'Inside Forward', pos: 'ME' },
  31: { name: 'Playmaker', pos: 'MEI' }, 32: { name: 'Shadow Striker', pos: 'MEI' }, 33: { name: 'Half Winger', pos: 'MEI' }, 34: { name: 'Classic 10', pos: 'MEI' },
  35: { name: 'Winger', pos: 'PD' }, 36: { name: 'Inside Forward', pos: 'PD' }, 37: { name: 'Wide Playmaker', pos: 'PD' },
  38: { name: 'Winger', pos: 'PE' }, 39: { name: 'Inside Forward', pos: 'PE' }, 40: { name: 'Wide Playmaker', pos: 'PE' },
  41: { name: 'Advanced Forward', pos: 'ATA' }, 42: { name: 'Poacher', pos: 'ATA' }, 43: { name: 'False 9', pos: 'ATA' }, 44: { name: 'Target Forward', pos: 'ATA' },
  45: { name: 'Ball-Playing Keeper', pos: 'GOL' }, 46: { name: 'Inverted Wingback', pos: 'LD' }, 47: { name: 'Inverted Wingback', pos: 'LE' },
  48: { name: 'Wide Back', pos: 'ZAG' }, 49: { name: 'Box Crasher', pos: 'VOL' },
};
export const ROLE_FIELDS = ['role1', 'role2', 'role3', 'role4', 'role5'] as const;

export interface PlayerRole { code: number; name: string; pos: string; plus: 1 | 2 }
/** Roles de um jogador na ordem do save. */
export function playerRoles(v: Partial<Record<(typeof ROLE_FIELDS)[number], number>>): PlayerRole[] {
  const out: PlayerRole[] = [];
  for (const f of ROLE_FIELDS) {
    const raw = v[f] ?? 0;
    const code = raw % 100, r = ROLES[code];
    if (raw > 0 && r) out.push({ code, ...r, plus: raw >= 100 ? 2 : 1 });
  }
  return out;
}
/** Filtro da Scout: chave "26" = Role+ ou melhor naquele código; "126" = só Role++. */
export function hasRole(cols: Partial<Record<(typeof ROLE_FIELDS)[number], number[]>>, i: number, key: number): boolean {
  for (const f of ROLE_FIELDS) {
    const raw = cols[f]?.[i] ?? 0;
    if (key >= 100 ? raw === key : raw % 100 === key && raw > 0) return true;
  }
  return false;
}
