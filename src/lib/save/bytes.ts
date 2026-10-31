/** Pequenos utilitários de leitura binária (little-endian). */
export const u16 = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8);
export const u32 = (b: Uint8Array, o: number) =>
  (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;
export const ascii = (b: Uint8Array, o: number, n: number) =>
  String.fromCharCode(...b.subarray(o, o + n));

/** Lê `depth` bits (até 32) a partir de `bit`, LSB primeiro, dentro de um registro. */
export function getBits(rec: Uint8Array, bit: number, depth: number): number {
  let v = 0;
  for (let i = 0; i < depth; i++) {
    const p = bit + i;
    if ((rec[p >> 3]! >> (p & 7)) & 1) v += 2 ** i;
  }
  return v;
}

/** Procura `pat` em `b` a partir de `from`. */
export function indexOf(b: Uint8Array, pat: Uint8Array, from = 0): number {
  const first = pat[0]!;
  outer: for (let i = b.indexOf(first, from); i !== -1 && i <= b.length - pat.length; i = b.indexOf(first, i + 1)) {
    for (let k = 1; k < pat.length; k++) if (b[i + k] !== pat[k]) continue outer;
    return i;
  }
  return -1;
}
