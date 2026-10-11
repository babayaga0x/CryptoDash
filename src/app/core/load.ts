import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, startWith } from 'rxjs';

/** State of a single request: loading, data or error. */
export interface Load<T> {
  loading: boolean;
  data?: T;
  error?: string;
}

export function describeError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 429) return 'CoinGecko rate limit reached. Wait a minute and try again.';
    if (e.status === 404) return 'Not found.';
    if (e.status === 0) {
      return 'Cannot reach the API. A blocked request is often a rate-limit response (429) without CORS headers, so wait a minute and retry.';
    }
    return `API error: ${e.status}`;
  }
  return 'Something went wrong.';
}

/** Wraps a request into a stream of Load<T> states: loading first, then data or error. */
export function toLoad<T>(source: Observable<T>): Observable<Load<T>> {
  return source.pipe(
    map((data): Load<T> => ({ loading: false, data })),
    catchError((e) => of<Load<T>>({ loading: false, error: describeError(e) })),
    startWith({ loading: true } as Load<T>),
  );
}
