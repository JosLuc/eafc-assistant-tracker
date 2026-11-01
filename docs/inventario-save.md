# Inventário dos dados do save (EA FC 27, modo carreira)

Feito em 01/11/2026 cruzando os **8 saves**: 6 do Newcastle (antes/depois do jogo 1, renovação, contratação, antes/depois do jogo oficial da Premier) e 2 da carreira América → Pisa (início e fim da temporada).
Cada save tem **80 módulos** e **41 tabelas**. A coluna "Saves" diz onde o dado aparece; "No app" diz se já é usado.

## 1. Já decodificados e usados no app

| Fonte | O que tem | Saves | No app |
|---|---|---|---|
| fcem | Tabelas de todas as competições, todos os jogos (data, hora, placar), estatísticas por jogador e competição | todos | Liga, jogos, resultados, artilharia, destaques |
| hstm | Escalação e minutos dos jogos do seu time | Newcastle após jogos | Último XI |
| fitm | Condição física e lesões (tipo, gravidade, volta) | todos | Departamento médico |
| susm | Cartões e suspensões por competição (mundo inteiro) | todos | Disciplina |
| trfm (bloco 1) | Negociação mais recente com valor e salário | Newcastle | Transferências |
| trfm (bloco 2) | **Transferências concluídas com valor, salário e data** (~60 mais recentes) | Pisa | Transferências / Mercado |
| previousteam + teamplayerlinks + players | **Histórico de transferências do mundo inteiro** (clube anterior, clube atual, data) | todos (1.743 no fim da temporada do Pisa) | Transferências / Mercado |
| persistent_events (5) | Transferências marcantes | todos | Mercado |
| lnsm | Empréstimos do mundo (dono, fim, opção de compra) | todos | Empréstimos |
| psem | Convites de pré-temporada (times, prêmio) | todos | Pré-temporada |
| awrm | Corrida dos prêmios (candidatos das grandes ligas e elencos) | todos | Corrida dos prêmios |
| tfnm | Orçamento, gastos e últimas movimentações financeiras | todos | Finanças |
| pstm | Papel de cada jogador no elenco | todos | Papéis |
| pllm | Moral por jogador (time, desempenho, contrato, tempo de jogo) | todos | Moral |
| mhrm | Histórico do técnico (temporadas, objetivo, segurança no cargo, ganhos) | todos | Técnico |
| ytpm | Nomes de jogadores gerados (base, regens) | todos | nomes |
| cldm | Data atual do jogo | todos | cabeçalho |
| players, teams, teamplayerlinks, leagues, leagueteamlinks, manager | Elenco, contratos, salários, OVR/POT, clubes, ligas, técnico | todos | vários |
| cm_mentalities, cm_teamsheets, formations | Tática ativa e cobradores | todos | Tática |
| career_scouts, career_youthplayers | Olheiros e base | todos | Base e olheiros |
| career_playermatchratinghistory | Nota de cada jogador por jogo | Newcastle após jogos | Destaques |
| career_managerawards | Prêmios do técnico (técnico do mês) | Pisa | Currículo |
| budm | Orçamento de transferências (início e atual) e salarial de todos os clubes da IA | todos (752 clubes no fim da temporada) | lido, sem card ainda |
| pvlm | Valor de mercado de cada jogador do seu elenco | todos | lido, sem card ainda |
| plfm | Forma 0–100, tendência e últimas 10 notas de cada jogador do seu elenco | todos | lido, sem card ainda |
| socm | Feed de notícias: **time da semana**, **jogador do mês**, demissões e contratações de técnicos, rumores, clássicos | todos (só os posts recentes; o app acumula) | lido, sem card ainda |
| emlm | Caixa de e-mails: aviso da diretoria, lesões, volta de lesão, base, fim de empréstimo, aposentadoria | todos | lido, sem card ainda |

## 2. Têm dados de carreira, ainda sem significado confirmado

Para fechar estes, preciso comparar com a tela do jogo (print) ou com um save tirado logo depois de uma ação conhecida.

| Módulo | O que já sei | Onde muda |
|---|---|---|
| stvm | Histórico de cada jogador por clube (3.886 jogadores; campos em bits de tamanho variável) | só entre temporadas/transferências (igual antes e depois do jogo da Premier) |
| dovm | Por jogador do seu elenco + outros (314 no Newcastle): lista de (atributo, nível 1–5). Provável plano de desenvolvimento | a cada save |
| plcm | Seu elenco + ~40 outros, cada um com um nível 1–3. Provável conversas/promessas ou interesse | a cada save |
| pdrm | 264 jogadores de outros clubes (Newcastle, janela aberta) e 67 no fim da temporada, com valor e data. Provável interesse/pedidos no mercado | a cada save |
| plmm | 86 jogadores de outros clubes durante a janela, vazio com a janela fechada. Provável lista de transferências do mercado | janela de transferências |
| psrm | 6 listas de jogadores da mesma liga do clube (86, 40…). Provável busca de olheiros / jogadores recomendados | cresce na temporada |
| coam | Seu elenco + nomes da comissão técnica (treinadores) | a cada save |
| jbom | 836 clubes com uma nota (80/65/55) e ofertas de técnicos no fim; provável mercado de técnicos | fim da temporada |
| intm | Seleções e jogos internacionais (132 jogadores no fim da temporada) | data FIFA |
| tskm, mssm, inrm, phmg, uevm, accm, tmvm, crsm | Tarefas, mensagens, eventos inesperados, conquistas | pequenos |
| plgm | Crescimento de todos os 21.946 jogadores do mundo | sempre |

## 3. Vazios ou fixos em todos os saves

- Tabelas vazias nos 8 saves: career_teamofweek e career_playerawards (o time da semana e o jogador do mês ficam no feed socm), career_clinchedobjectives, career_scoutmission, career_youthplayerhistory. O jogo só preenche depois de eventos que ainda não aconteceram nesses saves (ex.: cerimônia de prêmios no fim da temporada).
- objm (objetivos): vazio. Os objetivos da diretoria por temporada vêm do mhrm (já no app, em Histórico de temporadas).
- Fixos (iguais nos 8 saves): vpro, ssmg, dbsg (o banco em si), cran, cobm, ctas, fixm, mahm, pmom, papm, pprs, pact, page, plsm, plrm, cdgm, sdym, tlmm, tccm, tpcm, crtm, trom, ytmg, lvsm, lsnm, lgdm, arch, eosm, polm, rivm, dctl, audd.

## Limites do jogo

- O valor das transferências antigas não fica no save: o jogo só guarda as ~60 mais recentes. O app acumula de todos os saves enviados, então enviar saves com frequência guarda mais valores.
- 2.003 jogadores mudaram de clube entre o início e o fim da temporada do Pisa; 1.614 têm a linha em previousteam. O resto são voltas de empréstimo e jogadores livres, que ainda faltam cruzar.
