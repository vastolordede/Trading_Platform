import { Schema, model, Document, Types } from "mongoose";

export interface IPosition extends Document {
  userId: Types.ObjectId;
  symbol: string;
  side: "long" | "short";
  quantity: number;
  entryPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const positionSchema = new Schema<IPosition>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    side: {
      type: String,
      enum: ["long", "short"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    entryPrice: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const PositionModel = model<IPosition>("Position", positionSchema);