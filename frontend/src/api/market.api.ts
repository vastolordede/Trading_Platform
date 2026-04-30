import { api } from "./axios";

export interface CandleResponseItem {
  symbol: string;
  timeframe: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CurrentPriceResponse {
  symbol: string;
  price: number;
}

export interface MarketSymbolResponse {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

export const getCandlesApi = async (
  symbol: string,
  timeframe: string,
  limit = 100,
  endTime?: number
): Promise<CandleResponseItem[]> => {
  const response = await api.get("/market/candles", {
    params: {
      symbol,
      timeframe,
      limit,
      ...(endTime ? { endTime } : {}),
    },
  });

  return response.data.data;
};

export const getCurrentPriceApi = async (
  symbol: string
): Promise<CurrentPriceResponse> => {
  const response = await api.get("/market/price", {
    params: { symbol },
  });

  return response.data.data;
};

export const getMarketSymbolsApi = async (): Promise<MarketSymbolResponse[]> => {
  const response = await api.get("/market/symbols");

  return response.data.data;
};