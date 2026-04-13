import { Schema, model, Document, Types } from "mongoose";

export interface IPortfolio extends Document {
  userId: Types.ObjectId;
  totalEquity: number;
  totalPnL: number;
  createdAt: Date;
  updatedAt: Date;
}

const portfolioSchema = new Schema<IPortfolio>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    totalEquity: {
      type: Number,
      default: 1000,
    },
    totalPnL: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const PortfolioModel = model<IPortfolio>("Portfolio", portfolioSchema);