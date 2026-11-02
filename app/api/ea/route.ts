import { NextResponse } from 'next/server';

/**
 * Nomes e fotos dos jogadores pela API pública de ratings da EA (o save não tem nomes).
 * O servidor percorre a lista inteira (≈18 mil jogadores, 100 por página), guarda em cache por 7 dias
 * e devolve só os IDs pedidos, além dos escudos dos times que aparecerem.
 */
export const maxDuration = 60;
const BASE = 'https://drop-api.ea.com/rating/ea-sports-fc?locale=en&limit=100&offset=';
const WEEK = 60 * 60 * 24 * 7;

interface EaItem {
  id: number; firstName: string; lastName: string; commonName: string | null; avatarUrl: string;
  team?: { id: number; label: string; imageUrl: string };
  nationality?: { id: number; label: string; imageUrl: string };
  playerAbilities?: { id: string; label: string; description?: string; type?: { id: string } }[];
}
/** Nomes que o save não tem: PlayStyles (id = "trait1_64", o bit no save) e países (id do save). */
export interface EaMeta { abilities: Record<string, { label: string; desc: string; plus: boolean }>; nations: Record<number, { label: string; flag: string }>; available: boolean }
export interface EaPlayer { name: string; short: string; avatar: string }
export interface EaLookup { players: Record<number, EaPlayer>; crests: Record<number, string>; available: boolean }

async function page(offset: number): Promise<{ items: EaItem[]; totalItems: number }> {
  const res = await fetch(BASE + offset, { next: { revalidate: WEEK } });
  if (!res.ok) throw new Error(`EA ${res.status}`);
  return res.json();
}

let index: Promise<Map<number, EaItem>> | null = null;
async function loadIndex() {
  const first = await page(0);
  const map = new Map(first.items.map((i) => [i.id, i]));
  const offsets: number[] = [];
  for (let o = 100; o < first.totalItems; o += 100) offsets.push(o);
  for (let i = 0; i < offsets.length; i += 20) {
    const pages = await Promise.all(offsets.slice(i, i + 20).map(page));
    for (const p of pages) for (const it of p.items) map.set(it.id, it);
  }
  return map;
}

export async function POST(req: Request) {
  const { ids = [], teamIds = [] } = (await req.json()) as { ids?: number[]; teamIds?: number[] };
  return lookup(ids, teamIds);
}

/** Diagnóstico pelo navegador: /api/ea?ids=158023,231747&teams=13 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  // Busca por nome (Scout): /api/ea?q=bruno → { ids } de quem tem o nome parecido.
  if (q.get('q')) return search(q.get('q')!);
  if (q.get('meta')) return meta();
  const list = (k: string) => (q.get(k) ?? '').split(',').map(Number).filter(Boolean);
  return lookup(list('ids'), list('teams'));
}

async function lookup(ids: number[], teamIds: number[]) {
  try {
    index ??= loadIndex().catch((e) => { index = null; throw e; });
    const map = await index;
    const players: EaLookup['players'] = {};
    for (const id of ids.slice(0, 2000)) {
      const it = map.get(id);
      if (it) players[id] = { name: `${it.firstName} ${it.lastName}`.trim(), short: it.commonName || it.lastName || it.firstName, avatar: it.avatarUrl };
    }
    const want = new Set(teamIds);
    const crests: EaLookup['crests'] = {};
    for (const it of map.values()) if (it.team && want.has(it.team.id)) crests[it.team.id] = it.team.imageUrl;
    return NextResponse.json({ players, crests, available: true } satisfies EaLookup);
  } catch (e) {
    console.error('Falha ao ler a API da EA:', e);
    return NextResponse.json({ players: {}, crests: {}, available: false } satisfies EaLookup);
  }
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function search(text: string) {
  try {
    index ??= loadIndex().catch((e) => { index = null; throw e; });
    const map = await index;
    const words = norm(text).split(/\s+/).filter(Boolean).slice(0, 4);
    const ids: number[] = [];
    for (const it of map.values()) {
      const n = norm(`${it.firstName} ${it.lastName} ${it.commonName ?? ''}`);
      if (words.every((w) => n.includes(w))) ids.push(it.id);
      if (ids.length >= 1000) break;
    }
    return NextResponse.json({ ids, available: true });
  } catch {
    return NextResponse.json({ ids: [], available: false });
  }
}

async function meta() {
  try {
    index ??= loadIndex().catch((e) => { index = null; throw e; });
    const map = await index;
    const out: EaMeta = { abilities: {}, nations: {}, available: true };
    for (const it of map.values()) {
      if (it.nationality && !out.nations[it.nationality.id]) out.nations[it.nationality.id] = { label: it.nationality.label, flag: it.nationality.imageUrl };
      for (const a of it.playerAbilities ?? []) {
        if (!out.abilities[a.id]) out.abilities[a.id] = { label: a.label, desc: a.description ?? '', plus: a.type?.id === 'playStylePlus' };
      }
    }
    return NextResponse.json(out, { headers: { 'Cache-Control': `public, s-maxage=${WEEK}` } });
  } catch {
    return NextResponse.json({ abilities: {}, nations: {}, available: false } satisfies EaMeta);
  }
}
