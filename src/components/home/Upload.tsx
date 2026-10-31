'use client';
import { useRef, useState } from 'react';

const SAVE_PATH = 'C:\\Users\\<seu usuário>\\Documents\\EA SPORTS FC 27\\settings';

export function Upload({ onFile, busy, error, onCancel }: { onFile: (f: File) => void; busy: boolean; error?: string; onCancel?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-line bg-card p-6">
      <h2 className="title mb-1 text-xl">Enviar save</h2>
      <p className="mb-4 text-sm text-muted">O arquivo é lido aqui no seu navegador e não sai do seu PC. Só o resumo fica salvo.</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        onClick={() => input.current?.click()}
        className={`grid cursor-pointer place-items-center rounded-lg border-2 border-dashed p-10 text-center ${over ? 'border-accent bg-accent/10' : 'border-line bg-card-2'}`}
      >
        {busy ? <p className="text-sm">Lendo o save…</p> : (
          <div><div className="mb-2 text-3xl">⇪</div><p className="font-semibold">Arraste o arquivo CmMgrC… aqui</p><p className="text-xs text-muted">ou clique para escolher</p></div>
        )}
        <input ref={input} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      </div>
      <p className="mt-3 text-xs text-muted">Os saves de carreira ficam em <code className="text-[#cfcfd6]">{SAVE_PATH}</code> (arquivos que começam com CmMgrC).</p>
      {error && <p className="mt-3 rounded bg-bad/15 p-2 text-sm text-bad">Não consegui ler: {error}</p>}
      {onCancel && <button onClick={onCancel} className="mt-4 text-sm text-muted hover:text-white">Cancelar</button>}
    </div>
  );
}
