'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import type { PlayerDb } from '@/lib/career/playerdb';
import { buildContext } from '@/lib/ai/context';
import type { AiMessage, AiResponse } from '../../../app/api/ai/route';
import type { Ea } from '../home/names';
import { useEaMeta } from '../home/names';

/** Aba Auxiliar: chat com IA que usa o save como contexto (táticas, negociações, gestão). */
type Msg = AiMessage & { provider?: string; error?: boolean };

const QUICK = [
  { label: 'Tática para o próximo jogo', text: 'Monte a melhor tática para o próximo jogo: formação, titulares, funções (Roles) e instruções de equipe. Leve em conta forma, condição física, lesões e o adversário.' },
  { label: 'Quem vender ou liberar', text: 'Quais jogadores eu deveria vender, emprestar ou liberar agora, e por quanto pedir em cada um?' },
  { label: 'Reforços prioritários', text: 'Quais posições mais precisam de reforço, que perfil de jogador buscar (idade, OVR, potencial, Roles) e quanto do orçamento usar?' },
  { label: 'Avaliar uma proposta', text: 'Vou mandar o print de uma negociação. Leia os números e me diga se aceito, quanto contrapropor e até onde ir.' },
  { label: 'Situação com a diretoria', text: 'Como está minha situação com a diretoria e o que preciso fazer nos próximos jogos para cumprir a meta?' },
  { label: 'Plano para a base', text: 'Analise a minha base e o elenco jovem: quem promover, quem emprestar e quem tem mais futuro.' },
];

/** Reduz o print para no máximo 1600 px de lado, em JPEG, para não pesar na requisição. */
function shrink(file: File): Promise<string> {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      ok(cv.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = fail;
    img.src = URL.createObjectURL(file);
  });
}

/** Markdown simples: negrito, listas e parágrafos. */
function Rich({ text }: { text: string }) {
  const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.startsWith('**') ? <strong key={i} className="text-white">{x.slice(2, -2)}</strong> : x));
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={blocks.length} className="my-1 list-disc space-y-0.5 pl-5">{list.map((x, i) => <li key={i}>{inline(x)}</li>)}</ul>); list = []; } };
  for (const line of text.split('\n')) {
    const li = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) { list.push(li[1]!); continue; }
    flush();
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    if (h) blocks.push(<p key={blocks.length} className="mt-2 font-semibold text-white">{inline(h[1]!)}</p>);
    else if (line.trim()) blocks.push(<p key={blocks.length} className="my-1">{inline(line)}</p>);
  }
  flush();
  return <>{blocks}</>;
}

export function AssistantPage({ s, ea, db, careerKey }: { s: CareerSnapshot; ea: Ea; db: PlayerDb | null; careerKey: string }) {
  const store = `fc27:aux:${careerKey}`;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [keys, setKeys] = useState<{ gemini: boolean; groq: boolean } | null>(null);
  const [showCtx, setShowCtx] = useState(false);
  const meta = useEaMeta();
  const end = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const context = useMemo(() => buildContext(s, ea, db, meta?.abilities), [s, ea, db, meta]);

  useEffect(() => { try { setMsgs(JSON.parse(localStorage.getItem(store) ?? '[]')); } catch { setMsgs([]); } }, [store]);
  useEffect(() => {
    // Prints não ficam salvos no navegador (pesam); só o texto da conversa.
    try { localStorage.setItem(store, JSON.stringify(msgs.slice(-40).map(({ images: _i, ...m }) => m))); } catch { /* armazenamento cheio ou bloqueado */ }
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, store]);
  useEffect(() => { fetch('/api/ai').then((r) => r.json()).then(setKeys).catch(() => setKeys({ gemini: false, groq: false })); }, []);

  async function send(text: string) {
    if (busy || (!text.trim() && !images.length)) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text.trim() || 'Analise este print.', images: images.length ? images : undefined }];
    setMsgs(next); setInput(''); setImages([]); setBusy(true);
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ context, messages: next.filter((m) => !m.error).map(({ role, content, images }) => ({ role, content, images })) }) });
      const d = (await r.json().catch(() => ({ error: r.status === 504 ? 'A resposta demorou demais. Tente uma pergunta mais curta ou de novo em instantes.' : `Erro do servidor (${r.status}).` }))) as AiResponse;
      if (d.text) setMsgs([...next, { role: 'assistant', content: d.text, provider: d.provider }]);
      else setMsgs([...next, { role: 'assistant', error: true, content: d.error === 'sem-chaves' ? 'As chaves do Gemini e do Groq ainda não foram configuradas na Vercel.' : d.error ?? 'Não consegui responder agora.' }]);
    } catch {
      setMsgs([...next, { role: 'assistant', error: true, content: 'Sem conexão com o servidor. Tente de novo.' }]);
    } finally { setBusy(false); }
  }

  async function addFiles(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 3);
    const urls = await Promise.all(list.map(shrink));
    setImages((x) => [...x, ...urls].slice(0, 3));
  }

  const noKeys = keys && !keys.gemini && !keys.groq;
  return (
    <main className="mx-auto grid max-w-[1400px] gap-5 px-6 py-6 lg:grid-cols-[1fr_320px]">
      <section className="flex min-h-[calc(100vh-180px)] flex-col rounded-[10px] bg-card">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h1 className="title text-[18px]">Auxiliar</h1>
            <p className="text-xs text-muted">Pergunte sobre táticas, negociações e gestão. Ele usa os dados do seu save.</p>
          </div>
          {msgs.length > 0 && <button onClick={() => setMsgs([])} className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:text-white">Nova conversa</button>}
        </header>
        {noKeys && <p className="mx-5 mt-4 rounded-md border border-[#eab308]/40 bg-[#eab308]/10 px-3 py-2 text-xs text-[#eab308]">O assistente ainda não tem as chaves do Gemini e do Groq. Elas entram nas variáveis de ambiente da Vercel (GEMINI_API_KEY e GROQ_API_KEY).</p>}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-[14px] leading-relaxed">
          {msgs.length === 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {QUICK.map((q) => (
                <button key={q.label} onClick={() => (q.label.startsWith('Avaliar') ? (setInput(q.text), fileRef.current?.click()) : send(q.text))}
                  className="rounded-lg border border-line bg-[#1d1d20] px-3 py-2.5 text-left text-sm hover:border-link">
                  <span className="font-semibold">{q.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{q.text}</span>
                </button>
              ))}
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'ml-auto max-w-[80%] rounded-lg bg-[#2a2a4a] px-3.5 py-2' : `max-w-[90%] ${m.error ? 'text-bad' : 'text-[#d6d6dc]'}`}>
              {m.images?.length ? <div className="mb-1.5 flex gap-1.5">{m.images.map((u, k) => <img key={k} src={u} alt="" className="h-20 rounded" />)}</div> : null}
              {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : <Rich text={m.content} />}
              {m.provider && <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">{m.provider === 'gemini' ? 'Gemini' : 'Groq (reserva)'}</p>}
            </div>
          ))}
          {busy && <p className="animate-pulse text-sm text-muted">Pensando…</p>}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-line p-3"
          onPaste={(e) => { const f = [...e.clipboardData.files]; if (f.length) { e.preventDefault(); addFiles(f); } }}>
          {images.length > 0 && (
            <div className="mb-2 flex gap-2">{images.map((u, i) => (
              <div key={i} className="relative"><img src={u} alt="" className="h-16 rounded" />
                <button type="button" onClick={() => setImages((x) => x.filter((_, k) => k !== i))} className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-black text-xs">×</button></div>
            ))}</div>
          )}
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} title="Anexar print (ou cole com Ctrl+V)" className="h-10 shrink-0 rounded-md border border-line px-3 text-sm text-muted hover:text-white">📎</button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Pergunte algo ou cole um print de negociação…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className="max-h-40 min-h-10 flex-1 resize-y rounded-md border border-line bg-[#191919] px-3 py-2 text-sm outline-none focus:border-link" />
            <button disabled={busy} className="h-10 shrink-0 rounded-md bg-link px-4 text-sm font-semibold text-black disabled:opacity-50">Enviar</button>
          </div>
        </form>
      </section>
      <aside className="space-y-4">
        <div className="rounded-[10px] bg-card p-4 text-sm">
          <p className="title mb-2 text-[13px]">O que o auxiliar vê</p>
          <ul className="space-y-1 text-xs text-muted">
            <li>Elenco: {s.squad.length} jogadores{db ? ', com atributos, Roles e PlayStyles' : ' (envie o save de novo para incluir atributos)'}</li>
            <li>Tabela, últimos e próximos jogos</li>
            <li>Diretoria, orçamento e segurança no cargo</li>
            <li>Base: {s.youth.length} jogadores</li>
          </ul>
          <button onClick={() => setShowCtx((x) => !x)} className="mt-2 text-xs text-link">{showCtx ? 'Esconder' : 'Ver'} o resumo enviado</button>
          {showCtx && <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-[#191919] p-2 text-[10px] text-muted">{context}</pre>}
        </div>
        <div className="rounded-[10px] bg-card p-4 text-xs text-muted">
          <p className="title mb-2 text-[13px] text-white">Dicas</p>
          <p>Cole (Ctrl+V) ou anexe o print de uma proposta, de uma renovação ou da tela do adversário. O auxiliar lê os números do print.</p>
          <p className="mt-2">Usa o Gemini; se ele falhar ou bater o limite gratuito, o Groq responde no lugar.</p>
        </div>
      </aside>
    </main>
  );
}
