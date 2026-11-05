/** Nome do jogador a partir do título da página do SoFIFA ("Leo Shahar - FC27 | SoFIFA"). */
export function parseSofifaTitle(html: string): string | null {
  const m = /<title>\s*([^<]+?)\s+-\s+FC\s?\d+\s*\|\s*SoFIFA\s*<\/title>/i.exec(html);
  if (!m) return null;
  const name = (m[1] ?? '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&').replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
  return name && name.length <= 60 ? name : null;
}
