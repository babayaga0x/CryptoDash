import { Pipe, PipeTransform } from '@angular/core';

const fmt = (digits: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });

const full: Record<number, Intl.NumberFormat> = { 2: fmt(2), 4: fmt(4), 8: fmt(8) };

const compact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

/** $1,234.56 for regular prices, more decimals for sub-cent coins, $1.2T for large sums. */
@Pipe({ name: 'usd' })
export class UsdPipe implements PipeTransform {
  transform(value: number | null | undefined, short = false): string {
    if (value == null || Number.isNaN(value)) return '—';
    if (short) return compact.format(value);
    const abs = Math.abs(value);
    return full[abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8].format(value);
  }
}

/** +1.23% / -0.45% */
@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 2): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
  }
}
