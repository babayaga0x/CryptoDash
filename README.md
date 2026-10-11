# CryptoDash

A crypto market dashboard built with Angular 20: market overview, a searchable and sortable coin table, and per-coin price charts. Data comes from CoinGecko's free public API.

## Features

- **Overview**: total market cap, 24h volume, BTC dominance, top 5 coins with 7-day sparklines, top gainers and losers.
- **Coins**: top 100 by market cap with search, gainers/losers filter and sorting by any column.
- **Coin page**: price chart (24h / 7d / 30d / 90d) with a hover tooltip, key stats, and an on-demand description.
- Light and dark theme (follows the system setting).

## Tech

- Angular 20: standalone components, signals, new control flow (`@if`, `@for`, `@let`), lazy-loaded routes
- Functional DI (`inject()`), route params bound to `input()` via `withComponentInputBinding()`
- `HttpClient` with `fetch`, RxJS interop (`toSignal`, `toObservable`, `switchMap`)
- Hand-written SVG chart, no charting or UI libraries

## Getting started

Requires Node.js 22 (LTS) or newer.

```bash
npm install
npm start        # http://localhost:4200
```

Other scripts: `npm run build` (production build into `dist/`) and `npm test` (Karma, needs Chrome).

## API usage

The free CoinGecko API is limited to roughly 10-30 requests per minute per IP, so the app is built to make as few calls as possible:

| Action | Requests |
| --- | --- |
| Open the coin list or a coin page | 1 (top 100 coins with 7-day sparklines) |
| Open the overview | 2 (adds global stats) |
| Switch chart period on a coin page | 1 per period, cached for 5 minutes |
| Load a coin description | 1, only on button click |

Everything else (stats, rank, 7-day chart) is derived from the list that is already loaded. On `429` the app retries twice with a pause (honoring `Retry-After`) before showing an error.

### Dev proxy and CORS

In development, requests go through the dev-server proxy (`proxy.conf.json`, `/api/v3` to `api.coingecko.com`). CoinGecko's error responses (such as `429`) carry no CORS headers, so calling the API directly from the browser shows a misleading CORS error instead of the real status. Restart `npm start` after changing the proxy config.

In production builds the app calls `https://api.coingecko.com/api/v3` directly (see `API` in `src/app/core/coin.service.ts`). If your host's origin gets blocked, put a rewrite or proxy in front of the API and point `API` at it.

## Project structure

```
src/app/
  core/         models, CoinService (signal store, caching, 429 retry), request-state helper
  shared/       SVG chart, percent-change badge, formatting pipes
  features/
    overview/   market stats, top 5, gainers and losers
    list/       search, filter and sort table
    details/    coin chart, stats, on-demand description
proxy.conf.json dev proxy for the CoinGecko API
```

## Limitations

- Only the top 100 coins are available; a coin outside the top 100 shows a "not in the top 100" message.
- Timestamps on the 7-day chart are derived from an hourly sparkline, so they are accurate to about an hour.
- CoinGecko's keyless API is not meant for production workloads. For anything beyond a demo, use an API key behind your own backend.

## Data

Market data provided by [CoinGecko](https://www.coingecko.com/).
