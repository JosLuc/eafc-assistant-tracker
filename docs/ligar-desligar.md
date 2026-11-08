# Ligar e desligar o app (plano gratuito)

O app tem uma peça só na nuvem: o projeto **na Vercel** (front em Next.js + duas rotas de servidor,
`app/api/ai` e `app/api/ea`). Não há banco de dados: o save é lido no navegador e o resumo fica no
IndexedDB do próprio navegador. Por isso não existe "back no Supabase" para desligar.

## Precisa desligar?

Na prática, não:

- **Custo zero parado.** As rotas são funções serverless: só rodam quando alguém abre o site. Sem acesso,
  não há consumo. No plano Hobby a Vercel não cobra nada; se um limite for atingido, o projeto para até o
  mês virar, sem fatura.
- **Ninguém de fora usa.** O projeto está com *Vercel Authentication* ligada para todas as URLs
  `*.vercel.app` (Settings > Deployment Protection). Quem não está logado na sua conta da Vercel cai na
  tela de login, então ninguém gasta a cota das chaves do Gemini/Groq. Deixar o repositório público
  não muda isso: o código fica visível, o site continua fechado.
- **As chaves não estão no código.** `GEMINI_API_KEY` e `GROQ_API_KEY` ficam só nas variáveis de
  ambiente da Vercel.

Desligar faz sentido só se você quiser garantir que a URL fique fora do ar por um tempo.

## Como pausar e voltar (Vercel)

Pelo terminal, com a [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel` e `vercel login`):

```bash
vercel project pause eafc-assistant-tracker-xmdi    # tira a produção do ar (pede para digitar o nome)
vercel project resume eafc-assistant-tracker-xmdi   # volta a servir
```

Enquanto pausado, quem abrir a URL vê uma página de erro da Vercel. O código, as variáveis e os
deploys continuam lá; nada é apagado.

Alternativas mais leves:

- **Parar novos deploys automáticos:** Settings > Git > desconectar o repositório (ou
  "Ignored Build Step" com `exit 0`). O site atual continua no ar.
- **Rodar só local:** `npm run dev` com um `.env.local` (veja `.env.example`). Assim nem precisa da Vercel.

## Se um dia houver banco (Supabase ou Neon)

- **Supabase grátis:** pausa sozinho depois de 7 dias sem uso. Para pausar na mão: Dashboard >
  Project Settings > General > *Pause project*; para voltar, *Restore project* (leva alguns minutos).
  Projeto pausado por mais de 90 dias não volta pelo painel; só dá para baixar o backup.
- **Neon grátis:** o banco "dorme" sozinho após 5 minutos sem consulta e acorda na primeira consulta.
  Não precisa fazer nada.

## Para mostrar a alguém (entrevista)

A proteção bloqueia quem não tem conta na Vercel. Opções:

1. Rodar local e compartilhar a tela (mais simples).
2. Settings > Deployment Protection > *Shareable Links*: gera um link que libera um deploy específico.
3. Desligar a proteção só no dia e religar depois. Se fizer isso, as chaves de IA ficam expostas a uso
   por qualquer um durante esse período.
