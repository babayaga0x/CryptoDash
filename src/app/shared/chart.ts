import { DatePipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { UsdPipe } from './format';

interface Point {
  p: number;
  t: number;
}

/**
 * Dependency-free SVG chart. Without `interactive` it is a sparkline,
 * with `interactive` it is a large chart with a cursor and tooltip.
 */
@Component({
  selector: 'app-chart',
  imports: [DatePipe, UsdPipe],
  template: `
    @if (geo(); as g) {
      <div class="chart" [class.big]="interactive()" [class.up]="g.up" [class.down]="!g.up">
        <svg
          [attr.viewBox]="'0 0 ' + g.w + ' ' + g.h"
          preserveAspectRatio="none"
          role="img"
          aria-label="Price chart"
          (mousemove)="move($event)"
          (mouseleave)="hover.set(null)"
        >
          <path class="area" [attr.d]="g.area" />
          <path class="line" [attr.d]="g.line" />
          @if (point(); as p) {
            <line class="cursor" [attr.x1]="p.x" [attr.x2]="p.x" y1="0" [attr.y2]="g.h" />
          }
        </svg>
        @if (point(); as p) {
          <div class="tip" [style.left.%]="p.tipPct">
            <strong>{{ p.price | usd }}</strong>
            <span>{{ p.t | date: 'd MMM, HH:mm' }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .chart {
        position: relative;
      }
      svg {
        display: block;
        width: 100%;
        height: 40px;
      }
      .big svg {
        height: 260px;
        cursor: crosshair;
      }
      .line {
        fill: none;
        stroke: var(--c);
        stroke-width: 1.5;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
      }
      .area {
        fill: var(--c);
        opacity: 0.12;
        stroke: none;
      }
      .cursor {
        stroke: var(--muted);
        stroke-width: 1;
        stroke-dasharray: 3 3;
        vector-effect: non-scaling-stroke;
      }
      .up {
        --c: var(--up);
      }
      .down {
        --c: var(--down);
      }
      .tip {
        position: absolute;
        top: 4px;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 4px 10px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface-2);
        font-size: 0.8rem;
        pointer-events: none;
        white-space: nowrap;
      }
      .tip span {
        color: var(--muted);
        font-size: 0.72rem;
      }
    `,
  ],
})
export class Chart {
  readonly values = input.required<number[]>();
  /** Timestamps in ms, one per value (only needed for the tooltip). */
  readonly times = input<number[]>([]);
  readonly interactive = input(false);

  protected readonly hover = signal<number | null>(null);

  /** Downsample to ~240 points so the chart stays light even over 90 days. */
  private readonly pts = computed<Point[]>(() => {
    const v = this.values();
    if (!v.length) return [];
    const t = this.times();
    const step = Math.max(1, Math.ceil(v.length / 240));
    const out: Point[] = [];
    for (let i = 0; i < v.length; i += step) out.push({ p: v[i], t: t[i] ?? 0 });
    if ((v.length - 1) % step !== 0) out.push({ p: v[v.length - 1], t: t[v.length - 1] ?? 0 });
    return out;
  });

  protected readonly geo = computed(() => {
    const pts = this.pts();
    if (pts.length < 2) return null;

    const w = 600;
    const h = this.interactive() ? 260 : 40;
    const pad = 3;
    let min = Infinity;
    let max = -Infinity;
    for (const { p } of pts) {
      if (p < min) min = p;
      if (p > max) max = p;
    }
    const span = max - min || 1;
    const n = pts.length;
    const x = (i: number) => (i / (n - 1)) * w;
    const y = (p: number) => h - pad - ((p - min) / span) * (h - pad * 2);

    const line = 'M' + pts.map((q, i) => `${x(i).toFixed(1)},${y(q.p).toFixed(1)}`).join(' L');
    return {
      w,
      h,
      n,
      x,
      line,
      area: `${line} L${w},${h} L0,${h} Z`,
      up: pts[n - 1].p >= pts[0].p,
    };
  });

  protected readonly point = computed(() => {
    const i = this.hover();
    const g = this.geo();
    if (i == null || !g || !this.interactive()) return null;
    const q = this.pts()[Math.min(i, g.n - 1)];
    const pct = (i / (g.n - 1)) * 100;
    return {
      x: g.x(i),
      // keep the tooltip from overflowing the chart edges
      tipPct: Math.min(88, Math.max(12, pct)),
      price: q.p,
      t: q.t,
    };
  });

  protected move(e: MouseEvent): void {
    const g = this.geo();
    if (!g || !this.interactive()) return;
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    this.hover.set(Math.round(ratio * (g.n - 1)));
  }
}
