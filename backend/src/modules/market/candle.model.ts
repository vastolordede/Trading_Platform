import { Schema, model, Document } from "mongoose";

export interface ICandle extends Document {
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openTime: Date;
  closeTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

const candleSchema = new Schema<ICandle>(
  {
    symbol: { type: String, required: true },
    interval: { type: String, required: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, required: true },
    openTime: { type: Date, required: true },
    closeTime: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const CandleModel = model<ICandle>("Candle", candleSchema);