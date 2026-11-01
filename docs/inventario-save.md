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

## 2. Têm dados de carreira, ainda não decodificados (próximos)

| Módulo | O que parece ser | Evidência |
|---|---|---|
| stvm | Histórico de cada jogador por clube (3.886 jogadores, registros com clube e campos de bits) | 98 KB, ~4.100 IDs de jogador |
| psrm | Dados por jogador que crescem na temporada (forma/avaliações?) | 4,5 KB no início → 10 KB no fim, 1.122 jogadores |
| budm | Orçamentos e finanças de todos os clubes | 5,6 KB → 29 KB, ~900 times |
| sagm | Diretoria: valor do clube, limites de orçamento, regras de demissão | textos "ClubWorth", "BudgetThreshold", "FiredStrict" |
| jbom | Vagas e ofertas de emprego para técnicos | ~820 times |
| socm | Feed de notícias/rede social do jogo | textos "CM_Social_Injury…", "InterestingResult_RivalMatch" |
| emlm | Caixa de e-mails | textos "CM_Email_…" (aposentadoria, volta de suspensão) |
| pvlm | Valores por clube/jogador | ~720 times |
| dovm, plcm, pdrm, plfm, plvm, plmm | Dados por jogador que mudam a cada save (contratos, desenvolvimento, propostas?) | tamanhos mudam entre saves |
| plgm | Crescimento de todos os jogadores do mundo (21.946) | 326 KB |
| intm | Seleções e convocações | "MatchTypeIntFriendly" |
| coam, stfm, sctm | Comissão técnica, funcionários e olheiros disponíveis | nomes |
| tskm, mssm, inrm, phmg, uevm, accm, tmvm, crsm | Tarefas, mensagens, eventos inesperados, notícias | pequenos, mudam entre saves |

## 3. Vazios ou fixos em todos os saves

- Tabelas vazias nos 8 saves: career_teamofweek (time da semana), career_playerawards (prêmios de jogadores), career_clinchedobjectives, career_scoutmission, career_youthplayerhistory. O jogo só preenche depois de eventos que ainda não aconteceram nesses saves (ex.: cerimônia de prêmios no fim da temporada).
- objm (objetivos): vazio. Os objetivos da diretoria por temporada vêm do mhrm (já no app, em Histórico de temporadas).
- Fixos (iguais nos 8 saves): vpro, ssmg, dbsg (o banco em si), cran, cobm, ctas, fixm, mahm, pmom, papm, pprs, pact, page, plsm, plrm, cdgm, sdym, tlmm, tccm, tpcm, crtm, trom, ytmg, lvsm, lsnm, lgdm, arch, eosm, polm, rivm, dctl, audd.

## Limites do jogo

- O valor das transferências antigas não fica no save: o jogo só guarda as ~60 mais recentes. O app acumula de todos os saves enviados, então enviar saves com frequência guarda mais valores.
- 2.003 jogadores mudaram de clube entre o início e o fim da temporada do Pisa; 1.614 têm a linha em previousteam. O resto são voltas de empréstimo e jogadores livres, que ainda faltam cruzar.
