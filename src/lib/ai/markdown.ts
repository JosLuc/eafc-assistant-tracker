/** Alguns modelos montam tabela com tabulação em vez de "|": converte para tabela Markdown. */
export function tabsToTables(text: string): string {
  const out: string[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; ) {
    if (!lines[i]!.includes('\t')) { out.push(lines[i]!); i++; continue; }
    const block: string[][] = [];
    while (i < lines.length && lines[i]!.includes('\t')) block.push(lines[i++]!.split('\t').map((c) => c.trim().replace(/\|/g, '/')));
    if (block.length < 2) { out.push(block[0]!.join(' ')); continue; }
    const n = Math.max(...block.map((r) => r.length));
    const row = (r: string[]) => `| ${Array.from({ length: n }, (_, k) => r[k] ?? '').join(' | ')} |`;
    out.push('', row(block[0]!), `|${' --- |'.repeat(n)}`, ...block.slice(1).map(row), '');
  }
  return out.join('\n');
}
