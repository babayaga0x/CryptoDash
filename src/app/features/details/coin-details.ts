import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { CoinService } from '../../core/coin.service';
import { Load, toLoad } from '../../core/load';
import { CoinDetail, MarketChart } from '../../core/models';
import { Change } from '../../shared/change';
import { Chart } from '../../shared/chart';
import { UsdPipe } from '../../shared/format';

type Period = 1 | 7 | 30 | 90;

interface Series {
  loading: boolean;
  error?: string;
  values: number[];
  times: number[];
}

const HOUR = 3_600_000;

@Component({
  selector: 'app-coin-details',
  imports: [RouterLink, DecimalPipe, UsdPipe, Change, Chart],
  templateUrl: './coin-details.html',
})
export class CoinDetails {
  protected readonly api = inject(CoinService);

  /** Comes from the coins/:id route thanks to withComponentInputBinding(). */
  readonly id = input.required<string>();

  protected readonly periods: { days: Period; label: string }[] = [
    { days: 1, label: '24h' },
    { days: 7, label: '7d' },
    { days: 30, label: '30d' },
    { days: 90, label: '90d' },
  ];
  protected readonly days = signal<Period>(7);

  /** Price, stats and rank all come from the already loaded list, so they cost no request. */
  protected readonly coin = computed(() => this.api.coins().find((c) => c.id === this.id()));

  // Only periods other than 7d hit the API (one request each, cached for 5 minutes).
  // signal -> observable -> switchMap (cancels the stale request) -> signal again.
  private readonly remoteChart = toSignal(
    toObservable(computed(() => ({ id: this.id(), days: this.days() }))).pipe(
      switchMap((q) => (q.days === 7 ? of(null) : toLoad(this.api.getChart(q.id, q.days)))),
    ),
    { initialValue: null as Load<MarketChart> | null },
  );

  protected readonly series = computed<Series>(() => {
    if (this.days() === 7) {
      // The list's sparkline is hourly and ends at the last list refresh,
      // so timestamps are derived (accurate to about an hour).
      const prices = this.coin()?.sparkline_in_7d?.price ?? [];
      const end = this.api.updatedAt()?.getTime() ?? Date.now();
      return {
        loading: false,
        values: prices,
        times: prices.map((_, i) => end - (prices.length - 1 - i) * HOUR),
      };
    }
    const r = this.remoteChart();
    const points = r?.data?.prices ?? [];
    return {
      loading: !r || r.loading,
      error: r?.error,
      values: points.map((p) => p[1]),
      times: points.map((p) => p[0]),
    };
  });

  protected readonly periodChange = computed(() => {
    const v = this.series().values;
    return v.length > 1 && v[0] !== 0 ? ((v[v.length - 1] - v[0]) / v[0]) * 100 : null;
  });

  // The description needs a separate API call, so it is loaded only when the user asks.
  protected readonly aboutKey = signal<{ id: string; n: number } | null>(null);
  private readonly aboutRaw = toSignal(
    toObservable(this.aboutKey).pipe(
      switchMap((k) => (k ? toLoad(this.api.getCoin(k.id)) : of(null))),
    ),
    { initialValue: null as Load<CoinDetail> | null },
  );
  protected readonly aboutState = computed(() =>
    this.aboutKey()?.id === this.id() ? this.aboutRaw() : null,
  );

  /**
   * The description arrives as HTML. DOMParser builds an inert document (no scripts run,
   * no resources load), and textContent strips the tags and decodes entities.
   * The result is rendered through interpolation, never innerHTML.
   */
  protected readonly about = computed(() => {
    const html = this.aboutState()?.data?.description?.en ?? '';
    const text = (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').trim();
    return text.length > 700 ? text.slice(0, 700).trimEnd() + '…' : text;
  });

  /** Only http(s) links from the API are shown, anything else is dropped. */
  protected readonly homepage = computed(() =>
    this.aboutState()?.data?.links?.homepage?.find((u) => /^https?:\/\//i.test(u)),
  );

  constructor() {
    this.api.loadMarkets();
  }

  protected loadAbout(): void {
    this.aboutKey.set({ id: this.id(), n: Date.now() });
  }
}
