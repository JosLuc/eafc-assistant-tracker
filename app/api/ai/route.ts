import { NextResponse } from 'next/server';

/**
 * Assistente do modo carreira. O Gemini responde primeiro; se falhar ou bater o limite, o Groq assume.
 * As chaves ficam só nas variáveis de ambiente da Vercel (GEMINI_API_KEY e GROQ_API_KEY), nunca no navegador.
 */
// Plano gratuito da Vercel aceita até 300 s; cada provedor tem seu próprio limite abaixo.
export const maxDuration = 120;
const GEMINI_TIMEOUT = 50_000, GROQ_TIMEOUT = 45_000;

export interface AiMessage { role: 'user' | 'assistant'; content: string; images?: string[] }
export interface AiRequest { messages: AiMessage[]; context: string }
export interface AiResponse { text?: string; provider?: 'gemini' | 'groq'; error?: string }

const SYSTEM = `Você é o Auxiliar, auxiliar técnico de um jogador do Modo Carreira do EA SPORTS FC 27. Fale em português do Brasil, como um auxiliar experiente conversando com o técnico: direto, confiante e específico.

COMO RESPONDER
- Responda exatamente o que foi perguntado, cobrindo todas as partes da pergunta. Se a pergunta tem várias partes (ex.: titular, reserva e misto + quando usar), responda cada uma em sua própria seção.
- Comece com 1 ou 2 frases de resumo (a resposta curta). Depois detalhe.
- Use os dados do save abaixo: cite jogadores pelo nome, com posição, OVR, forma, condição física e o motivo da escolha. Nunca invente jogador, número ou adversário que não esteja nos dados.
- Seja concreto: diga quem, quando e por quê. Evite conselhos genéricos.

FORMATO (Markdown)
- Títulos de seção com "### ".
- Escalações e comparações sempre em tabela Markdown, por exemplo: | Pos | Jogador | OVR | Por quê |.
- Calendário em tabela: | Data | Jogo | Competição | Time a usar |.
- Listas curtas com "- ". Negrito só em nomes e números-chave.
- Táticas: formação, instruções de equipe do FC 27 (construção, profundidade defensiva, largura etc.) e a Role (função) de cada titular.
- Negociações: valor justo, primeira oferta, teto, salário e quando desistir, em tabela.
- Termine com uma seção "### Próximo passo" de 1 a 3 itens práticos.
- Sem introduções do tipo "Claro!" ou "Ótima pergunta". Tamanho: completo, mas sem enrolação.

Se receber print de negociação, renovação ou outra tela do jogo, leia os números do print e use-os. Se faltar um dado, diga qual falta.`;

// Os provedores desativam modelos com frequência: em vez de nomes fixos, a rota pergunta a lista de modelos
// disponíveis e escolhe pela preferência. Dá para forçar um modelo com GEMINI_MODEL, GROQ_MODEL e GROQ_VISION_MODEL.
const list = (env: string | undefined) => (env ? env.split(',').map((x) => x.trim()).filter(Boolean) : []);
const ver = (n: string) => Number(/(\d+(?:\.\d+)?)/.exec(n)?.[1] ?? 0);
let geminiCache: { at: number; models: string[] } | null = null;
let groqCache: { at: number; text: string[]; vision: string[] } | null = null;
const HOUR = 3_600_000;

async function geminiModels(key: string): Promise<string[]> {
  const forced = list(process.env.GEMINI_MODEL);
  if (forced.length) return forced;
  if (geminiCache && Date.now() - geminiCache.at < HOUR) return geminiCache.models;
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(8000) });
    const d = (await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const names = (d.models ?? []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace(/^models\//, ''))
      .filter((n) => /^gemini-[\d.]+-flash$/.test(n)).sort((a, b) => ver(b) - ver(a));
    if (names.length) { geminiCache = { at: Date.now(), models: [...names.slice(0, 2), 'gemini-flash-latest'] }; return geminiCache.models; }
  } catch { /* usa a lista padrão */ }
  return ['gemini-flash-latest'];
}

async function groqModels(key: string): Promise<{ text: string[]; vision: string[] }> {
  const ft = list(process.env.GROQ_MODEL), fv = list(process.env.GROQ_VISION_MODEL);
  if (!groqCache || Date.now() - groqCache.at > HOUR) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
      const ids = ((await r.json()) as { data?: { id: string; active?: boolean }[] }).data?.filter((m) => m.active !== false).map((m) => m.id) ?? [];
      const pick = (res: RegExp[]) => res.flatMap((re) => ids.filter((id) => re.test(id)));
      const text = [...new Set(pick([/gpt-oss-120b/, /llama-?4.*maverick/i, /qwen.*3.*32b/i, /llama.*70b/i, /gpt-oss-20b/]))];
      const vision = [...new Set(pick([/llama-?4.*maverick/i, /llama-?4.*scout/i, /vision|vl/i]))];
      if (ids.length) groqCache = { at: Date.now(), text, vision };
    } catch { /* usa a lista padrão */ }
  }
  return {
    text: ft.length ? ft : groqCache?.text.length ? groqCache.text.slice(0, 3) : ['openai/gpt-oss-120b'],
    vision: fv.length ? fv : groqCache?.vision.length ? groqCache.vision.slice(0, 2) : ['meta-llama/llama-4-scout-17b-16e-instruct'],
  };
}

async function firstOk(models: string[], call: (model: string) => Promise<string>): Promise<string> {
  const errs: string[] = [];
  for (const m of models) {
    try { return await call(m); } catch (e) { errs.push(`${m}: ${String(e).slice(0, 160)}`); if (/ 429| 401| 403|TimeoutError|aborted/.test(String(e))) break; }
  }
  throw new Error(errs.join(' | ') || 'nenhum modelo');
}

const splitDataUrl = (u: string) => { const m = /^data:([^;]+);base64,(.*)$/.exec(u); return m ? { mime: m[1]!, data: m[2]! } : null; };

async function gemini(key: string, req: AiRequest, model: string, thinking = true): Promise<string> {
  const contents = req.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }, ...(m.images ?? []).map(splitDataUrl).filter(Boolean).map((x) => ({ inline_data: { mime_type: x!.mime, data: x!.data } }))],
  }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(GEMINI_TIMEOUT),
    body: JSON.stringify({ systemInstruction: { parts: [{ text: `${SYSTEM}\n\nDADOS DO SAVE:\n${req.context}` }] }, contents, generationConfig: { temperature: 0.6, ...(thinking ? { thinkingConfig: { thinkingLevel: 'low' } } : {}) } }),
  });
  // Modelos que não aceitam o nível de raciocínio: tenta de novo sem ele.
  if (res.status === 400 && thinking) return gemini(key, req, model, false);
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
    try { return NextResponse.json<AiResponse>({ text: await firstOk(await geminiModels(gk), (m) => gemini(gk, body, m)), provider: 'gemini' }); }
    catch (e) { errors.push(String(e)); console.warn('ai: gemini falhou, indo para o Groq:', String(e)); }
  }
  if (qk) {
    try {
      const gm = await groqModels(qk);
      return NextResponse.json<AiResponse>({ text: await firstOk(body.messages.some((m) => m.images?.length) ? gm.vision : gm.text, (m) => groq(qk, body, m)), provider: 'groq' });
    }
    catch (e) { errors.push(String(e)); }
  }
  console.error('ai', errors);
  return NextResponse.json<AiResponse>({ error: 'Os dois provedores falharam. Tente de novo em instantes.' }, { status: 502 });
}
