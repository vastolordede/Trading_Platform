import { useCallback, useEffect, useState } from "react";
import {
  getCandlesApi,
  getCurrentPriceApi,
  CandleResponseItem,
  CurrentPriceResponse,
} from "../api/market.api";

export const useMarket = (symbol: string, timeframe: string) => {
  const [candles, setCandles] = useState<CandleResponseItem[]>([]);
  const [currentPrice, setCurrentPrice] =
    useState<CurrentPriceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [candlesData, priceData] = await Promise.all([
        getCandlesApi(symbol, timeframe, 100),
        getCurrentPriceApi(symbol),
      ]);

      setCandles(candlesData);
      setCurrentPrice(priceData);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    void fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchMarketData();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchMarketData]);

  return {
    candles,
    currentPrice,
    loading,
    error,
    refetch: fetchMarketData,
  };
};