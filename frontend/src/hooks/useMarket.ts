import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCandlesApi,
  getCurrentPriceApi,
  CandleResponseItem,
  CurrentPriceResponse,
} from "../api/market.api";

const INITIAL_CANDLES_LIMIT = 100;
const NORMAL_LOAD_MORE_LIMIT = 100;
const FAST_LOAD_MORE_LIMIT = 500;
const MAX_CANDLES_IN_MEMORY = 5000;
const REFRESH_INTERVAL_MS = 10000;

type LoadMoreMode = "normal" | "fast";

const mergeCandles = (
  olderCandles: CandleResponseItem[],
  currentCandles: CandleResponseItem[]
): CandleResponseItem[] => {
  const map = new Map<number, CandleResponseItem>();

  for (const candle of olderCandles) {
    map.set(candle.openTime, candle);
  }

  for (const candle of currentCandles) {
    map.set(candle.openTime, candle);
  }

  return Array.from(map.values())
    .sort((a, b) => a.openTime - b.openTime)
    .slice(-MAX_CANDLES_IN_MEMORY);
};

export const useMarket = (symbol: string, timeframe: string) => {
  const [candles, setCandles] = useState<CandleResponseItem[]>([]);
  const [currentPrice, setCurrentPrice] =
    useState<CurrentPriceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const candlesRef = useRef<CandleResponseItem[]>([]);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [candlesData, priceData] = await Promise.all([
        getCandlesApi(symbol, timeframe, INITIAL_CANDLES_LIMIT),
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

  const refreshLatestPrice = useCallback(async () => {
    try {
      const priceData = await getCurrentPriceApi(symbol);
      setCurrentPrice(priceData);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to refresh price");
    }
  }, [symbol]);

  const loadMoreCandles = useCallback(
    async (mode: LoadMoreMode = "normal") => {
      if (loadingMoreRef.current) return;

      const currentCandles = candlesRef.current;

      if (!currentCandles.length) return;
      if (currentCandles.length >= MAX_CANDLES_IN_MEMORY) return;

      const remaining = MAX_CANDLES_IN_MEMORY - currentCandles.length;
      const requestedLimit =
        mode === "fast" ? FAST_LOAD_MORE_LIMIT : NORMAL_LOAD_MORE_LIMIT;
      const limit = Math.min(requestedLimit, remaining);

      try {
        loadingMoreRef.current = true;
        setLoadingMore(true);
        setError("");

        const oldestOpenTime = currentCandles[0].openTime;

        const olderCandles = await getCandlesApi(
          symbol,
          timeframe,
          limit,
          oldestOpenTime - 1
        );

        if (!olderCandles.length) return;

        setCandles((prev) => mergeCandles(olderCandles, prev));
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load more candles");
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [symbol, timeframe]
  );

  useEffect(() => {
    void fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshLatestPrice();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refreshLatestPrice]);

  return {
    candles,
    currentPrice,
    loading,
    loadingMore,
    error,
    refetch: fetchMarketData,
    loadMoreCandles,
    maxCandles: MAX_CANDLES_IN_MEMORY,
  };
};