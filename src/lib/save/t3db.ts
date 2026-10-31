import { getBits, u16, u32, indexOf, ascii } from './bytes';
import meta from './meta-fc26.json';

/** Banco t3db (formato "DB\0\x08") usado pelo jogo. Nomes vêm da meta do FC 26, que cobre o FC 27. */
export type FieldType = 0 | 3 | 4; // 0 texto, 3 inteiro em bits, 4 float
export interface FieldDef { short: string; name: string; type: number; bit: number; depth: number; rangeLow: number }
export interface TableDef { short: string; name: string; recordSize: number; rows: number; recordsAt: number; fields: FieldDef[] }
export type Row = Record<string, number | string>;

type Meta = Record<string, { name: string; fields: Record<string, [string, number]> }>;
const META = meta as unknown as Meta;
/** Campos que a meta do FC 26 não lista numa tabela mas lista em outra (ex.: players.wage = cmGX). */
const ANY_FIELD: Record<string, [string, number]> = {};
for (const t of Object.values(META)) for (const [k, v] of Object.entries(t.fields)) ANY_FIELD[k] ??= v;
const DB_SIG = new Uint8Array([0x44, 0x42, 0x00, 0x08, 0, 0, 0, 0]);

export function findDatabases(blob: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = indexOf(blob, DB_SIG); i !== -1; i = indexOf(blob, DB_SIG, i + 1)) out.push(i);
  return out;
}

export function readTables(blob: Uint8Array, dbOffset: number): TableDef[] {
  const nTables = u32(blob, dbOffset + 16);
  const idx = dbOffset + 24;
  const base = idx + 8 * nTables + 4;
  const tables: TableDef[] = [];
  for (let i = 0; i < nTables; i++) {
    const short = ascii(blob, idx + 8 * i, 4);
    const p = base + u32(blob, idx + 8 * i + 4);
    const recordSize = u32(blob, p + 4);
    const rows = u16(blob, p + 18); // registros válidos
    const nFields = blob[p + 24]!;
    const tm = META[short];
    const fields: FieldDef[] = [];
    for (let k = 0; k < nFields; k++) {
      const q = p + 36 + 16 * k;
      const fs = ascii(blob, q + 8, 4);
      const fm = tm?.fields[fs] ?? ANY_FIELD[fs];
      fields.push({ short: fs, name: fm?.[0] ?? fs, type: u32(blob, q), bit: u32(blob, q + 4), depth: u32(blob, q + 12), rangeLow: fm?.[1] ?? 0 });
    }
    tables.push({ short, name: tm?.name ?? short, recordSize, rows, recordsAt: p + 36 + 16 * nFields, fields });
  }
  return tables;
}

const utf8 = new TextDecoder();

/** Lê os registros crus (sem calibração). */
export function readRows(blob: Uint8Array, t: TableDef): Row[] {
  const out: Row[] = [];
  const dv = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  for (let r = 0; r < t.rows; r++) {
    const start = t.recordsAt + r * t.recordSize;
    const rec = blob.subarray(start, start + t.recordSize);
    const row: Row = {};
    for (const f of t.fields) {
      if (f.type === 0) {
        const s = rec.subarray(f.bit >> 3, (f.bit >> 3) + (f.depth >> 3));
        const z = s.indexOf(0);
        row[f.name] = utf8.decode(z >= 0 ? s.subarray(0, z) : s);
      } else if (f.type === 4) {
        row[f.name] = Math.round(dv.getFloat32(start + (f.bit >> 3), true) * 1e4) / 1e4;
      } else {
        row[f.name] = getBits(rec, f.bit, f.depth);
      }
    }
    out.push(row);
  }
  return out;
}
