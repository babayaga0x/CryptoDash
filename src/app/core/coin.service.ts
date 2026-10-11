import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import { Observable, RetryConfig, map, retry, shareReplay, throwError, timer } from 'rxjs';
import { describeError } from './load';
import { Coin, CoinDetail, GlobalResponse, GlobalStats, MarketChart } from './models';

/**
 * In dev, requests go through the dev-server proxy (proxy.conf.json). CoinGecko's error
 * responses (e.g. 429) carry no CORS headers, so a browser calling it directly reports
 * them as a CORS failure and hides the real status. Through the proxy the status is visible.
 */
const API = isDevMode() ? '/api/v3' : 'https://api.coingecko.com/api/v3';

/** The free CoinGecko API is tightly rate-limited, so responses are cached for 5 minutes. */
const TTL = 300_000;

/** On 429 (shared free pool exhausted) wait and retry instead of failing right away. */
const BACKOFF: RetryConfig = {
  count: 2,
  delay: (err: unknown, attempt: number) => {
    if (!(err instanceof HttpErrorResponse) || err.status !== 429) return throwError(() => err);
    const header = Number(err.headers.get('retry-after'));
    const seconds = Number.isFinite(header) && header > 0 ? Math.min(header, 30) : attempt * 4;
    return timer(seconds * 1000);
  },
};

function toStats({ data }: GlobalResponse): GlobalStats {
  return {
    marketCap: data.total_market_cap['usd'],
    volume: data.total_volume['usd'],
    marketCapChange24h: data.market_cap_change_percentage_24h_usd,
    btcDominance: data.market_cap_percentage['btc'],
    ethDominance: data.market_cap_percentage['eth'],
    activeCoins: data.active_cryptocurrencies,
  };
}

@Injectable({ providedIn: 'root' })
export class CoinService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, { at: number; req: Observable<unknown> }>();
  private globalWanted = false;

  // Signal-based store: pages read, the service writes.
  readonly coins = signal<Coin[]>([]);
  readonly global = signal<GlobalStats | null>(null);
  readonly loading = signal(false);
  readonly globalLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly updatedAt = signal<Date | null>(null);

  readonly top = computed(() => this.coins().slice(0, 5));
  readonly gainers = computed(() => this.ranked(1));
  readonly losers = computed(() => this.ranked(-1));

  /**
   * Top 100 coins with 7-day sparklines: one request that feeds the overview, the list
   * and the whole details page. Calling it again without `force` does nothing.
   */
  loadMarkets(force = false): void {
    if (this.loading() || (!force && this.coins().length)) return;
    this.loading.set(true);
    this.error.set(null);

    this.get<Coin[]>('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 100,
      page: 1,
      sparkline: true,
    }).subscribe({
      next: (coins) => {
        this.coins.set(coins);
        this.updatedAt.set(new Date());
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(describeError(e));
        this.loading.set(false);
      },
    });
  }

  /** Global stats are only needed on the overview page, so they are loaded separately. */
  loadGlobal(force = false): void {
    this.globalWanted = true;
    if (this.globalLoading() || (!force && this.global())) return;
    this.globalLoading.set(true);

    this.get<GlobalResponse>('/global')
      .pipe(map(toStats))
      .subscribe({
        next: (stats) => {
          this.global.set(stats);
          this.globalLoading.set(false);
        },
        // The stat cards are optional, a failure here is not a page-level error.
        error: () => this.globalLoading.set(false),
      });
  }

  /** Re-fetches what the user has already seen. */
  refresh(): void {
    this.loadMarkets(true);
    if (this.globalWanted) this.loadGlobal(true);
  }

  /** Long description + homepage. Requested on demand only, it costs one API call. */
  getCoin(id: string): Observable<CoinDetail> {
    return this.cached(`coin:${id}`, () =>
      this.get<CoinDetail>(`/coins/${encodeURIComponent(id)}`, {
        localization: false,
        tickers: false,
        market_data: false,
        community_data: false,
        developer_data: false,
        sparkline: false,
      }),
    );
  }

  getChart(id: string, days: number): Observable<MarketChart> {
    return this.cached(`chart:${id}:${days}`, () =>
      this.get<MarketChart>(`/coins/${encodeURIComponent(id)}/market_chart`, {
        vs_currency: 'usd',
        days,
      }),
    );
  }

  private get<T>(
    path: string,
    params: Record<string, string | number | boolean> = {},
  ): Observable<T> {
    return this.http.get<T>(`${API}${path}`, { params }).pipe(retry(BACKOFF));
  }

  private ranked(dir: 1 | -1): Coin[] {
    return this.coins()
      .filter((c) => c.price_change_percentage_24h != null)
      .sort(
        (a, b) =>
          dir * ((b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)),
      )
      .slice(0, 5);
  }

  private cached<T>(key: string, factory: () => Observable<T>): Observable<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return hit.req as Observable<T>;
    const req = factory().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.cache.set(key, { at: Date.now(), req });
    return req;
  }
}
