import { Routes } from '@angular/router';

// Every page is lazy-loaded: a separate chunk that is fetched only when its route is opened.
export const routes: Routes = [
  {
    path: '',
    title: 'Overview · CryptoDash',
    loadComponent: () => import('./features/overview/overview').then((m) => m.Overview),
  },
  {
    path: 'coins',
    title: 'Coins · CryptoDash',
    loadComponent: () => import('./features/list/coin-list').then((m) => m.CoinList),
  },
  {
    path: 'coins/:id',
    title: 'Coin · CryptoDash',
    loadComponent: () => import('./features/details/coin-details').then((m) => m.CoinDetails),
  },
  { path: '**', redirectTo: '' },
];
