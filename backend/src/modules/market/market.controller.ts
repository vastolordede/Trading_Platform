import { Request, Response } from "express";
import {
  getCandlesService,
  getCurrentPriceService,
  getMarketSymbolsService,
} from "./market.service";
import { MarketQuery } from "./market.types";

export const getCandlesController = async (
  req: Request<unknown, unknown, unknown, MarketQuery>,
  res: Response
): Promise<void> => {
  try {
    const { symbol, timeframe, limit, endTime } = req.query;

    const data = await getCandlesService({
      symbol: symbol || "BTCUSDT",
      timeframe: (timeframe || "1h") as any,
      limit: limit ? Number(limit) : 100,
      endTime: endTime ? Number(endTime) : undefined,
    });

    res.status(200).json({
      success: true,
      message: "Candles fetched successfully",
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch candles",
    });
  }
};

export const getCurrentPriceController = async (
  req: Request<unknown, unknown, unknown, MarketQuery>,
  res: Response
): Promise<void> => {
  try {
    const { symbol } = req.query;

    const data = await getCurrentPriceService(symbol);

    res.status(200).json({
      success: true,
      message: "Current price fetched successfully",
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch current price",
    });
  }
};

export const getMarketSymbolsController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await getMarketSymbolsService();

    res.status(200).json({
      success: true,
      message: "Market symbols fetched successfully",
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch market symbols",
    });
  }
};