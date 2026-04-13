import axios from "axios";
import { CandleModel } from "./candle.model";
import {
  CandleDTO,
  CurrentPriceDTO,
  GetCandlesParams,
  Timeframe,
} from "./market.types";
import { redisClient } from "../../config/redis";

const BINANCE_BASE_URL =
  process.env.BINANCE_BASE_URL || "https://data-api.binance.vision";

const PRICE_CACHE_TTL_SECONDS = 10;
const CANDLES_CACHE_TTL_SECONDS = 60;

const ALLOWED_TIMEFRAMES: Timeframe[] = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d",
];

const DEFAULT_SYMBOL = "BTCUSDT";
const DEFAULT_TIMEFRAME: Timeframe = "1h";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

const normalizeSymbol = (symbol?: string): string => {
  return (symbol || DEFAULT_SYMBOL).trim().toUpperCase();
};

const normalizeTimeframe = (timeframe?: string): Timeframe => {
  const tf = (timeframe || DEFAULT_TIMEFRAME).trim() as Timeframe;

  if (!ALLOWED_TIMEFRAMES.includes(tf)) {
    throw new Error(`Invalid timeframe: ${timeframe}`);
  }

  return tf;
};

const normalizeLimit = (limit?: number): number => {
  const parsed = Number(limit || DEFAULT_LIMIT);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
};

const mapBinanceKlinesToCandles = (
  rows: any[],
  symbol: string,
  timeframe: Timeframe
): CandleDTO[] => {
  return rows.map((row) => ({
    symbol,
    timeframe,
    openTime: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    closeTime: Number(row[6]),
  }));
};

const saveCandlesToMongo = async (candles: CandleDTO[]): Promise<void> => {
  if (!candles.length) return;

  await CandleModel.bulkWrite(
    candles.map((candle) => ({
      updateOne: {
        filter: {
          symbol: candle.symbol,
          timeframe: candle.timeframe,
          openTime: candle.openTime,
        },
        update: { $set: candle },
        upsert: true,
      },
    }))
  );
};

const fetchCandlesFromBinance = async (
  symbol: string,
  timeframe: Timeframe,
  limit: number
): Promise<CandleDTO[]> => {
  const response = await axios.get(`${BINANCE_BASE_URL}/api/v3/klines`, {
    params: {
      symbol,
      interval: timeframe,
      limit,
    },
    timeout: 15000,
  });

  return mapBinanceKlinesToCandles(response.data, symbol, timeframe);
};

const fetchCurrentPriceFromBinance = async (
  symbol: string
): Promise<CurrentPriceDTO> => {
  const response = await axios.get(`${BINANCE_BASE_URL}/api/v3/ticker/price`, {
    params: { symbol },
    timeout: 15000,
  });

  return {
    symbol: String(response.data.symbol),
    price: Number(response.data.price),
  };
};

export const getCandlesService = async (
  params: GetCandlesParams
): Promise<CandleDTO[]> => {
  const symbol = normalizeSymbol(params.symbol);
  const timeframe = normalizeTimeframe(params.timeframe);
  const limit = normalizeLimit(params.limit);

  const cacheKey = `candles:${symbol}:${timeframe}:${limit}`;

try {
  const cached = await redisClient.get(cacheKey);

  console.log("Checking cache:", cacheKey);

  if (cached) {
    console.log("CACHE HIT:", cacheKey);
    return JSON.parse(cached) as CandleDTO[];
  }

  console.log("CACHE MISS:", cacheKey);
} catch (error) {
  console.error("Redis read candles error:", error);
}

  try {
    const candles = await fetchCandlesFromBinance(symbol, timeframe, limit);

    await saveCandlesToMongo(candles);

    try {
      await redisClient.set(cacheKey, JSON.stringify(candles), {
        EX: CANDLES_CACHE_TTL_SECONDS,
      });
    } catch (error) {
      console.error("Redis write candles error:", error);
    }

    return candles;
  } catch (apiError) {
    console.error("Fetch candles from API failed, fallback to Mongo:", apiError);

    const candlesFromMongo = await CandleModel.find({ symbol, timeframe })
      .sort({ openTime: -1 })
      .limit(limit)
      .lean();

    return candlesFromMongo.reverse().map((item) => ({
      symbol: item.symbol,
      timeframe: item.timeframe as Timeframe,
      openTime: item.openTime,
      closeTime: item.closeTime,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));
  }
};

export const getCurrentPriceService = async (
  symbolInput?: string
): Promise<CurrentPriceDTO> => {
  const symbol = normalizeSymbol(symbolInput);
  const cacheKey = `price:${symbol}`;

try {
  const cached = await redisClient.get(cacheKey);

  console.log("Checking cache:", cacheKey);

  if (cached) {
    console.log("CACHE HIT:", cacheKey);
    return JSON.parse(cached) as CurrentPriceDTO;
  }

  console.log("CACHE MISS:", cacheKey);
} catch (error) {
  console.error("Redis read price error:", error);
}

  const data = await fetchCurrentPriceFromBinance(symbol);

  try {
    await redisClient.set(cacheKey, JSON.stringify(data), {
      EX: PRICE_CACHE_TTL_SECONDS,
    });
  } catch (error) {
    console.error("Redis write price error:", error);
  }

  return data;
};

export const syncMarketDataService = async (): Promise<void> => {
  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];
  const timeframes: Timeframe[] = ["1m", "5m", "1h", "1d"];

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      try {
        await getCandlesService({
          symbol,
          timeframe,
          limit: 100,
        });

        await getCurrentPriceService(symbol);
      } catch (error) {
        console.error(`Sync failed for ${symbol} - ${timeframe}:`, error);
      }
    }
  }
  
};