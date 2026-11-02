import { NextResponse } from 'next/server';

/**
 * Assistente do modo carreira. O Gemini responde primeiro; se falhar ou bater o limite, o Groq assume.
 * As chaves ficam só nas variáveis de ambiente da Vercel (GEMINI_API_KEY e GROQ_API_KEY), nunca no navegador.
 */
// Plano gratuito da Vercel aceita até 300 s; cada provedor tem seu próprio limite abaixo.
export const maxDuration = 120;
const GEMINI_TIMEOUT = 40_000, GROQ_TIMEOUT = 45_000;

export interface AiMessage { role: 'user' | 'assistant'; content: string; images?: string[] }
export interface AiRequest { messages: AiMessage[]; context: string }
export interface AiResponse { text?: string; provider?: 'gemini' | 'groq'; error?: string }

const SYSTEM = `Você é o Auxiliar, assistente técnico de um jogador do Modo Carreira do EA SPORTS FC 27.
Responda sempre em português do Brasil, direto e prático, como um auxiliar técnico experiente.
Use os dados do save abaixo (elenco, tabela, jogos, finanças, diretoria) para basear cada conselho. Cite jogadores pelo nome.
Táticas: sugira formação, instruções de equipe do FC 27 (estilo de construção, profundidade defensiva, etc.) e funções (Roles) por posição, explicando o porquê com os atributos e a forma dos jogadores.
Negociações: avalie valor, salário, idade, potencial e contrato; diga quanto oferecer, até quanto ir e quando desistir. Se receber o print de uma proposta, leia os números do print.
Se faltar algum dado, diga o que falta em vez de inventar. Use listas curtas e negrito só no essencial.`;

// Modelos tentados em ordem: se um for desativado pelo provedor, o próximo assume. Dá para trocar pelas variáveis de ambiente.
const list = (env: string | undefined, def: string[]) => (env ? env.split(',').map((x) => x.trim()) : def);
const GEMINI_MODELS = list(process.env.GEMINI_MODEL, ['gemini-flash-latest', 'gemini-2.5-flash']);
const GROQ_MODELS = list(process.env.GROQ_MODEL, ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile']);
const GROQ_VISION = list(process.env.GROQ_VISION_MODEL, ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct']);

async function firstOk(models: string[], call: (model: string) => Promise<string>): Promise<string> {
  let last: unknown;
  for (const m of models) {
    try { return await call(m); } catch (e) { last = e; if (/ 429| 401| 403|TimeoutError|aborted/.test(String(e))) break; }
  }
  throw last;
}

const splitDataUrl = (u: string) => { const m = /^data:([^;]+);base64,(.*)$/.exec(u); return m ? { mime: m[1]!, data: m[2]! } : null; };

async function gemini(key: string, req: AiRequest, model: string): Promise<string> {
  const contents = req.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }, ...(m.images ?? []).map(splitDataUrl).filter(Boolean).map((x) => ({ inline_data: { mime_type: x!.mime, data: x!.data } }))],
  }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(GEMINI_TIMEOUT),
    body: JSON.stringify({ systemInstruction: { parts: [{ text: `${SYSTEM}\n\nDADOS DO SAVE:\n${req.context}` }] }, contents, generationConfig: { temperature: 0.6 } }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  const text = (d.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
  if (!text) throw new Error('Gemini sem resposta');
  return text;
}

async function groq(key: string, req: AiRequest, model: string): Promise<string> {
  const messages = [
    { role: 'system', content: `${SYSTEM}\n\nDADOS DO SAVE:\n${req.context}` },
    ...req.messages.map((m) => (m.images?.length
      ? { role: m.role, content: [{ type: 'text', text: m.content }, ...m.images.map((url) => ({ type: 'image_url', image_url: { url } }))] }
      : { role: m.role, content: m.content })),
  ];
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(GROQ_TIMEOUT),
    body: JSON.stringify({ model, messages, temperature: 0.6, ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}) }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  const text = d.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq sem resposta');
  return text;
}

export async function GET() {
  return NextResponse.json({ gemini: !!process.env.GEMINI_API_KEY, groq: !!process.env.GROQ_API_KEY });
}

export async function POST(r: Request) {
  const req = (await r.json()) as AiRequest;
  if (!Array.isArray(req.messages) || !req.messages.length) return NextResponse.json<AiResponse>({ error: 'Mensagem vazia.' }, { status: 400 });
  // Limita o tamanho para não estourar o plano gratuito: últimas 12 mensagens e contexto de até ~60 mil caracteres.
  const body: AiRequest = { messages: req.messages.slice(-12), context: String(req.context ?? '').slice(0, 60_000) };
  const gk = process.env.GEMINI_API_KEY, qk = process.env.GROQ_API_KEY;
  if (!gk && !qk) return NextResponse.json<AiResponse>({ error: 'sem-chaves' }, { status: 503 });
  const errors: string[] = [];
  if (gk) {
    try { return NextResponse.json<AiResponse>({ text: await firstOk(GEMINI_MODELS, (m) => gemini(gk, body, m)), provider: 'gemini' }); }
    catch (e) { errors.push(String(e)); console.warn('ai: gemini falhou, indo para o Groq:', String(e)); }
  }
  if (qk) {
    try { return NextResponse.json<AiResponse>({ text: await firstOk(body.messages.some((m) => m.images?.length) ? GROQ_VISION : GROQ_MODELS, (m) => groq(qk, body, m)), provider: 'groq' }); }
    catch (e) { errors.push(String(e)); }
  }
  console.error('ai', errors);
  return NextResponse.json<AiResponse>({ error: 'Os dois provedores falharam. Tente de novo em instantes.' }, { status: 502 });
}
