# EA FC 27: Tracker e Auxiliar do Modo Carreira

App web que lê o arquivo de save do Modo Carreira do **EA SPORTS FC 27** (PC), mostra tudo o que
acontece na carreira (elenco, base, calendário, finanças, transferências, troféus, scout) e traz um
**auxiliar com IA** que usa esses dados para sugerir escalações, táticas e valores de negociação.

Projeto pessoal, feito para uso próprio e como estudo de engenharia reversa, front-end e integração
com LLMs. Não é afiliado à EA.

## O problema

O jogo guarda a carreira num arquivo binário fechado (`CmMgrC…`, ~16 MB) e mostra os dados espalhados
em dezenas de menus. Ferramentas como o CM Tracker resolvem parte disso, mas eu queria:

1. ver tudo num painel só, com os dados que o próprio save tem (inclusive os que nenhuma ferramenta mostra);
2. perguntar a um "auxiliar técnico" coisas como *"qual time uso na copa sem desgastar os titulares?"*
   e receber resposta baseada no **meu** elenco, não em conselho genérico.

## Como foi pensado

### 1. Entender o formato antes de escrever tela

Não existe documentação pública do save do FC 27. O caminho foi:

- **Container:** cabeçalho `FBCHUNKS` + um frame zstd. Dentro, uma tabela com **80 módulos** binários e
  **2 bancos t3db** (o da carreira e o "banco principal" do jogo).
- **Bancos t3db:** decodificados com a meta (nomes de tabelas e campos) do FC 26, que é compatível.
  Diferenças do FC 27 viraram correções explícitas em `src/lib/save/calibrate.ts`
  (ex.: IDs gravados como `real + 1`).
- **Módulos:** cada um foi decifrado comparando **saves de antes e depois** de um evento conhecido
  (um jogo, uma renovação, uma contratação) e conferindo com o que o jogo mostra na tela. Cada
  módulo em `src/lib/save/modules/` traz no comentário o caso real usado para validar.
- O inventário completo do que já foi decodificado está em [`docs/inventario-save.md`](docs/inventario-save.md).

### 2. Tudo no navegador

O save tem ~16 MB e o limite de corpo de uma função grátis da Vercel é 4,5 MB. Em vez de pagar ou
fatiar o upload, o save é lido **no próprio navegador**, num Web Worker (`src/workers/save.worker.ts`),
e vira um resumo de ~20 KB (`src/lib/career/snapshot.ts`) guardado no IndexedDB. Consequências boas:

- o save do usuário nunca sai da máquina dele;
- não há banco de dados nem custo de armazenamento;
- o mesmo parser roda no Node para testes e para o script `npm run inspect`.

### 3. Dados que o save não tem

O save guarda IDs, não nomes nem fotos. A rota `app/api/ea` consulta a API pública de ratings da EA
(~18 mil jogadores), guarda em cache por 7 dias e devolve só os IDs pedidos; o que faltar vem do
SoFIFA aos poucos. Assim o navegador não esbarra em CORS e a EA recebe poucas chamadas.

### 4. Auxiliar com IA, grátis e resiliente

- `src/lib/ai/context.ts` transforma o resumo da carreira num texto compacto (alguns milhares de tokens):
  clube, objetivos da diretoria, tabela, próximos jogos, elenco com atributos, forma e condição física.
- `app/api/ai` chama o **Gemini** primeiro e cai para o **Groq** se der erro, timeout ou limite.
- Os provedores aposentam modelos com frequência, então a rota **lista os modelos disponíveis em
  tempo real** e escolhe o mais novo de cada família, em vez de usar nomes fixos.
- Aceita prints de telas do jogo (negociação, renovação) e lê os números com um modelo de visão.
- A Scout tem um modo rápido em que a IA só devolve filtros em JSON, aplicados localmente.
- As chaves ficam só nas variáveis de ambiente do servidor, nunca no navegador.

### 5. Interface

Next.js (App Router) + React 19 + Tailwind 4. Telas: Home com widgets, Elenco, Base, Troféus, Scout,
página do jogador e Auxiliar. O layout se inspira no CM Tracker; código e componentes são próprios.

## Stack

| Parte | Escolha | Por quê |
|---|---|---|
| Front + rotas | Next.js 15, React 19, TypeScript | um projeto só para UI e as 2 rotas de servidor |
| Estilo | Tailwind CSS 4 | rápido de iterar tela a tela |
| Leitura do save | TypeScript puro + `fzstd` em Web Worker | roda no navegador e no Node |
| Persistência | IndexedDB (`idb-keyval`) | sem banco, sem custo, save fica com o usuário |
| IA | Gemini + Groq (fetch direto) | planos gratuitos, com fallback |
| Deploy | Vercel Hobby | grátis, deploy a cada push |
| Qualidade | Vitest + `tsc` no GitHub Actions | testes com saves sintéticos e reais |

## Estrutura

```
app/                 páginas e rotas de servidor (api/ai, api/ea)
src/lib/save/        parser do save: container, t3db, calibração e módulos
src/lib/career/      regras do modo carreira: snapshot, posições, roles, scout, objetivos
src/lib/ai/          contexto e Markdown do auxiliar
src/components/      telas (home, squad, scout, player, assistant, gavetas)
src/workers/         Web Worker que lê o save
test/                testes (sintéticos sempre; com saves reais quando existirem)
docs/                inventário do save e operação
```

## Rodando local

```bash
npm install
cp .env.example .env.local   # opcional: chaves do Gemini/Groq para o auxiliar
npm run dev                  # http://localhost:3000, arraste o save CmMgrC… na tela
npm test
npm run typecheck
npm run inspect -- ./saves/s4.sav   # resumo de um save no terminal
```

O save fica em `C:\Users\<você>\Documents\EA SPORTS FC 27\settings`. Saves nunca entram no
repositório (`saves/`, `*.sav` e `CmMgrC*` estão no `.gitignore`). Os testes com saves reais
procuram em `./saves` ou em `FC27_SAVES_DIR` e são pulados se não houver arquivos.

## Deploy

Vercel, plano Hobby, com Vercel Authentication ligada (o site não fica aberto ao público, para ninguém
gastar a cota das chaves de IA). Como pausar, voltar e mostrar a alguém:
[`docs/ligar-desligar.md`](docs/ligar-desligar.md).

## Próximos passos

- Decodificar os módulos que ainda faltam (ver inventário).
- Histórico entre saves: comparar temporadas e a evolução de cada jogador.
- Auxiliar com memória da carreira e sugestões proativas antes de cada janela de transferências.
