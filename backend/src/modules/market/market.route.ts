import { Router } from "express";
import {
  getCandlesController,
  getCurrentPriceController,
  getMarketSymbolsController,
} from "./market.controller";

const marketRouter = Router();

marketRouter.get("/symbols", getMarketSymbolsController);
marketRouter.get("/candles", getCandlesController);
marketRouter.get("/price", getCurrentPriceController);

export default marketRouter;