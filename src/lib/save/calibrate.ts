import type { FieldDef, Row, TableDef } from './t3db';

/**
 * Converte valores crus em valores reais, calibrado com saves do FC 27:
 * - Banco principal (db2: players, teams, teamplayerlinks...): IDs gravados como real+1
 *   (Ronaldo 20801 aparece como 20802, Newcastle 13 como 14). Demais inteiros: cru + rangelow.
 * - Banco de carreira (db1: career_*, cm_*): cru + rangelow (IDs já são reais).
 * - contractvaliduntil vem como ano-2000 → somamos 2000.
 */
export function calibrate(rows: Row[], t: TableDef, db: 'career' | 'main'): Row[] {
  const ints = t.fields.filter((f) => f.type !== 0 && f.type !== 4);
  return rows.map((raw) => {
    const r: Row = { ...raw };
    for (const f of ints) r[f.name] = value(raw[f.name] as number, f, db);
    return r;
  });
}

function value(v: number, f: FieldDef, db: 'career' | 'main'): number {
  if (db === 'main' && isId(f)) return v - 1;
  let out = v + f.rangeLow;
  if (f.name === 'contractvaliduntil' && out < 1000) out += 2000;
  return out;
}

const isId = (f: FieldDef) => f.name.endsWith('id') && [0, 1, -1].includes(f.rangeLow);
