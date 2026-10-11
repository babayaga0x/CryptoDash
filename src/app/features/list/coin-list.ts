import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CoinService } from '../../core/coin.service';
import { Coin } from '../../core/models';
import { Change } from '../../shared/change';
import { Chart } from '../../shared/chart';
import { UsdPipe } from '../../shared/format';

type SortKey =
  | 'market_cap_rank'
  | 'name'
  | 'current_price'
  | 'price_change_percentage_24h'
  | 'market_cap'
  | 'total_volume';
type Filter = 'all' | 'up' | 'down';

@Component({
  selector: 'app-coin-list',
  imports: [RouterLink, UsdPipe, Change, Chart],
  templateUrl: './coin-list.html',
})
export class CoinList {
  protected readonly api = inject(CoinService);
  private readonly router = inject(Router);

  protected readonly columns: { key: SortKey; label: string; num: boolean }[] = [
    { key: 'market_cap_rank', label: '#', num: false },
    { key: 'name', label: 'Coin', num: false },
    { key: 'current_price', label: 'Price', num: true },
    { key: 'price_change_percentage_24h', label: '24h', num: true },
    { key: 'market_cap', label: 'Market cap', num: true },
    { key: 'total_volume', label: 'Volume 24h', num: true },
  ];
  protected readonly filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'up', label: 'Gainers' },
    { key: 'down', label: 'Losers' },
  ];

  protected readonly query = signal('');
  protected readonly filter = signal<Filter>('all');
  protected readonly sortKey = signal<SortKey>('market_cap_rank');
  protected readonly sortDir = signal<1 | -1>(1);

  /** Filter + search + sort are recomputed automatically whenever any signal changes. */
  protected readonly rows = computed<Coin[]>(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    const k = this.sortKey();
    const d = this.sortDir();

    return this.api
      .coins()
      .filter((c) => {
        const change = c.price_change_percentage_24h ?? 0;
        const matchesFilter = f === 'all' || (f === 'up' ? change >= 0 : change < 0);
        const matchesQuery =
          !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
      })
      .sort((a, b) =>
        k === 'name' ? a.name.localeCompare(b.name) * d : ((a[k] ?? 0) - (b[k] ?? 0)) * d,
      );
  });

  constructor() {
    this.api.loadMarkets();
  }

  protected onSearch(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 1 ? -1 : 1));
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'name' || key === 'market_cap_rank' ? 1 : -1);
    }
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | null {
    if (this.sortKey() !== key) return null;
    return this.sortDir() === 1 ? 'ascending' : 'descending';
  }

  protected open(id: string): void {
    void this.router.navigate(['/coins', id]);
  }
}
