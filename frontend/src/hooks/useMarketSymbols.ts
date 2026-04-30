import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMarketSymbolsApi,
  MarketSymbolResponse,
} from "../api/market.api";

const INITIAL_VISIBLE_COUNT = 15;
const LOAD_MORE_VISIBLE_COUNT = 15;

export const useMarketSymbols = () => {
  const [symbols, setSymbols] = useState<MarketSymbolResponse[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [query, setQuery] = useState("");
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [symbolsError, setSymbolsError] = useState("");

  const fetchSymbols = useCallback(async () => {
    try {
      setLoadingSymbols(true);
      setSymbolsError("");

      const data = await getMarketSymbolsApi();
      setSymbols(data);
    } catch (err: any) {
      setSymbolsError(
        err?.response?.data?.message || "Failed to load market symbols"
      );
    } finally {
      setLoadingSymbols(false);
    }
  }, []);

  useEffect(() => {
    void fetchSymbols();
  }, [fetchSymbols]);

  const filteredSymbols = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase();

    if (!normalizedQuery) return symbols;

    return symbols.filter((item) => item.symbol.includes(normalizedQuery));
  }, [symbols, query]);

  const visibleSymbols = useMemo(() => {
    return filteredSymbols.slice(0, visibleCount);
  }, [filteredSymbols, visibleCount]);

  const loadMoreVisibleSymbols = useCallback(() => {
    setVisibleCount((prev) => {
      return Math.min(prev + LOAD_MORE_VISIBLE_COUNT, filteredSymbols.length);
    });
  }, [filteredSymbols.length]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [query]);

  return {
    visibleSymbols,
    query,
    setQuery,
    loadingSymbols,
    symbolsError,
    loadMoreVisibleSymbols,
    hasMoreSymbols: visibleCount < filteredSymbols.length,
    totalSymbols: filteredSymbols.length,
  };
};