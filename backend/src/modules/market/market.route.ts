import { Router } from "express";
import {
  getCandlesController,
  getCurrentPriceController,
} from "./market.controller";

const marketRouter = Router();

marketRouter.get("/candles", getCandlesController);
marketRouter.get("/price", getCurrentPriceController);

export default marketRouter;