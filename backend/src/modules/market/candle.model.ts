import { Schema, model, Document } from "mongoose";

export interface ICandle extends Document {
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

const candleSchema = new Schema<ICandle>(
  {
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    timeframe: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    openTime: {
      type: Number,
      required: true,
      index: true,
    },
    closeTime: {
      type: Number,
      required: true,
    },
    open: {
      type: Number,
      required: true,
    },
    high: {
      type: Number,
      required: true,
    },
    low: {
      type: Number,
      required: true,
    },
    close: {
      type: Number,
      required: true,
    },
    volume: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

candleSchema.index(
  { symbol: 1, timeframe: 1, openTime: 1 },
  { unique: true }
);

export const CandleModel = model<ICandle>("Candle", candleSchema);