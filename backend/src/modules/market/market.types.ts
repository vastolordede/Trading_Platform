export type Timeframe =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d";

export interface CandleDTO {
  symbol: string;
  timeframe: Timeframe;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CurrentPriceDTO {
  symbol: string;
  price: number;
}

export interface GetCandlesParams {
  symbol: string;
  timeframe: Timeframe;
  limit?: number;
}

export interface MarketQuery {
  symbol?: string;
  timeframe?: Timeframe;
  limit?: string;
}