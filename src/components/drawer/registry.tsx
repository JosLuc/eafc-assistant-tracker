'use client';
import type { CareerSnapshot } from '@/lib/career/snapshot';
import type { Career } from '@/lib/career/merge';
import type { Ea } from '../home/names';
import * as D from './drawers';

/** Liga cada card da Home à sua gaveta "Ver tudo" (mesma organização do CM Tracker). */
export function drawerRegistry(s: CareerSnapshot, ea: Ea, career?: Career) {
  const p = { s, ea, career };
  const tables = { title: 'Tabelas e jogos', render: () => <D.TablesDrawer {...p} /> };
  const squad = (tab: D.SquadTab, sortBy?: string) => ({ title: 'Elenco inteiro', render: () => <D.WholeSquad {...p} tab={tab} sortBy={sortBy} /> });
  return {
    'Calendário': { title: 'Calendário da temporada', render: () => <D.CalendarDrawer {...p} /> },
    'Posição na liga': tables, 'Resultados': tables, 'Próximos jogos': tables,
    'Moral do elenco': { title: 'Moral do elenco', render: () => <D.MoraleDrawer {...p} /> },
    'Destaques da temporada': { title: 'Destaques da temporada', render: () => <D.SeasonLeadersDrawer {...p} /> },
    'Papéis e salários': squad('papeis'), 'Contratos acabando': squad('papeis', 'ends'), 'Disponibilidade': squad('disciplina'), 'Elenco': squad('papeis'),
    'Departamento médico': { title: 'Condição e lesões', render: () => <D.FitnessDrawer {...p} /> },
    'Mercado de transferências': { title: 'Mercado de transferências', render: () => <D.MarketDrawer {...p} /> },
    'Transferências do clube': { title: 'Todas as transferências', render: () => <D.AllTransfersDrawer {...p} /> },
    'Corrida da artilharia': { title: 'Líderes por competição', render: () => <D.LeadersDrawer {...p} /> },
    'Finanças': { title: 'Finanças do clube', render: () => <D.FinancesDrawer {...p} /> },
    'Olheiros': { title: 'Olheiros', render: () => <D.ScoutsDrawer {...p} /> },
  };
}
