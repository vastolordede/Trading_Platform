import { TransactionModel } from "./transaction.model";

export const createInitialDemoTransaction = async (userId: string) => {
  return TransactionModel.create({
    userId,
    type: "deposit",
    asset: "USDT",
    amount: 1000,
    note: "Initial demo balance for new account",
  });
};