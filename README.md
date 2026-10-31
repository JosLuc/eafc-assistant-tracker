# EA FC 27 – Tracker e Auxiliar do Modo Carreira

App web pessoal para importar o save do Modo Carreira do EA SPORTS FC 27 (PC), mostrar todos os dados
(inspirado no CM Tracker) e oferecer um auxiliar com IA para táticas, negociações e decisões.

Plano completo: https://claude.ai/artifact/SkAzgWrU529sn2TECfVsor

## Fase 1: leitor do save (`src/lib/save`)

Lê o arquivo `CmMgrC…` direto no navegador ou no Node, sem servidor:

- `container.ts`: cabeçalho FBCHUNKS, frame zstd (via `fzstd`) e a tabela dos 80 módulos.
- `t3db.ts`: os 2 bancos internos (carreira e principal), com nomes de tabelas e campos da meta do FC 26.
- `calibrate.ts`: correções do FC 27 (IDs do banco principal gravados como real+1, ano do contrato).
- `modules/standings.ts`: classificações de todas as competições (módulo `fcem`).
- `modules/lineups.ts`: escalações e minutos das últimas partidas (módulo `hstm`).

```bash
npm install
npm test                 # testes sintéticos + saves reais em ./saves (se existirem)
npm run inspect -- ./saves/s4.sav
```

Os saves nunca entram no repositório (`saves/` está no `.gitignore`). Para os testes com saves reais, coloque
`s1.sav` (antes do jogo 1), `s2.sav` (depois do jogo 1), `s3.sav` (renovação aceita) e `s4.sav` (contratação)
em `./saves` ou aponte `FC27_SAVES_DIR`.
