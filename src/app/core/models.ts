export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  ath_change_percentage: number;
  circulating_supply: number | null;
  max_supply: number | null;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price: number[] };
}

export interface GlobalResponse {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
  };
}

export interface GlobalStats {
  marketCap: number;
  volume: number;
  marketCapChange24h: number;
  btcDominance: number;
  ethDominance: number;
  activeCoins: number;
}

/** Only what is fetched on demand: the long description and the homepage link. */
export interface CoinDetail {
  id: string;
  description: { en: string };
  links: { homepage: string[] };
}

export interface MarketChart {
  prices: [number, number][];
}
