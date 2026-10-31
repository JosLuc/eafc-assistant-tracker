import { decompress } from 'fzstd';
import { ascii, indexOf, u32 } from './bytes';

/**
 * Contêiner do save de carreira do FC 27 (arquivo CmMgrC<timestamp>, PC).
 * - "FBCHUNKS" + nome do slot em 0x12
 * - chunk "BNRY....LTLE" com a TOC de 80 módulos (tag de 4 bytes invertida + offset u32)
 * - um único frame zstd (sem dicionário) com todo o conteúdo
 */
export interface SaveModule { tag: string; start: number; end: number }
export interface SaveContainer { slotName: string; blob: Uint8Array; modules: Record<string, SaveModule> }

const ZSTD_MAGIC = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd]);
const LTLE = new TextEncoder().encode('LTLE');
/** Diferença entre o offset gravado na TOC e a posição no blob descomprimido. */
const TOC_BASE = 0x63b;
const MODULE_COUNT = 80;

export function readContainer(file: Uint8Array): SaveContainer {
  if (ascii(file, 0, 8) !== 'FBCHUNKS') throw new Error('Não parece um save do FC (cabeçalho FBCHUNKS ausente)');
  const nameEnd = file.indexOf(0, 0x12);
  const slotName = new TextDecoder().decode(file.subarray(0x12, nameEnd > 0 ? Math.min(nameEnd, 0x40) : 0x40));

  const z = indexOf(file, ZSTD_MAGIC, 0x400);
  if (z < 0) throw new Error('Frame zstd não encontrado');
  const blob = decompress(file.subarray(z, z + zstdFrameLength(file, z)));

  const end = trimmedLength(blob);
  let p = indexOf(file, LTLE, 0x400);
  if (p < 0) throw new Error('TOC dos módulos não encontrada');
  p += 6;
  const toc: { tag: string; start: number }[] = [];
  for (let i = 0; i < MODULE_COUNT; i++, p += 8) {
    const tag = ascii(file, p, 4).split('').reverse().join('').trim();
    toc.push({ tag, start: u32(file, p + 4) - TOC_BASE });
  }
  const modules: Record<string, SaveModule> = {};
  toc.forEach((m, i) => {
    modules[m.tag] = { tag: m.tag, start: Math.max(0, m.start), end: toc[i + 1]?.start ?? end };
  });
  return { slotName, blob, modules };
}

/** Tamanho de um frame zstd (o arquivo tem preenchimento depois dele, que o fzstd não aceita). */
export function zstdFrameLength(b: Uint8Array, start: number): number {
  const fhd = b[start + 4]!;
  const fcsFlag = fhd >> 6, single = (fhd >> 5) & 1, checksum = (fhd >> 2) & 1, dictFlag = fhd & 3;
  let p = start + 5 + (single ? 0 : 1) + [0, 1, 2, 4][dictFlag]!;
  p += [single ? 1 : 0, 2, 4, 8][fcsFlag]!;
  for (;;) {
    const h = b[p]! | (b[p + 1]! << 8) | (b[p + 2]! << 16);
    const last = h & 1, type = (h >> 1) & 3, size = h >>> 3;
    p += 3 + (type === 1 ? 1 : size); // bloco RLE ocupa 1 byte
    if (last) break;
    if (p >= b.length) throw new Error('Frame zstd truncado');
  }
  return p + (checksum ? 4 : 0) - start;
}

function trimmedLength(b: Uint8Array) {
  let n = b.length;
  while (n > 0 && b[n - 1] === 0) n--;
  return n;
}

export const moduleBytes = (c: SaveContainer, tag: string) => {
  const m = c.modules[tag];
  return m ? c.blob.subarray(m.start, m.end) : undefined;
};
