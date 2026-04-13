import { UserModel } from "../user/user.model";
import { hashPassword, comparePassword } from "../../common/utils/hash";
import { signAccessToken } from "../../common/utils/jwt";
import { RegisterBody, LoginBody } from "./auth.types";
import { createInitialDemoTransaction } from "../transaction/transaction.service";
import { PortfolioModel } from "../portfolio/portfolio.model";

export const registerUser = async (payload: RegisterBody) => {
  const existingUser = await UserModel.findOne({
    email: payload.email.toLowerCase(),
  });

  if (existingUser) {
    throw new Error("Email already exists");
  }

  const hashedPassword = await hashPassword(payload.password);

  const user = await UserModel.create({
    fullName: payload.fullName,
    email: payload.email.toLowerCase(),
    password: hashedPassword,
    demoBalance: 1000,
  });

  await PortfolioModel.create({
    userId: user._id,
    totalEquity: 1000,
    totalPnL: 0,
  });

  await createInitialDemoTransaction(String(user._id));

  const token = signAccessToken({
    userId: String(user._id),
    email: user.email,
  });

  return {
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      demoBalance: user.demoBalance,
    },
    token,
  };
};

export const loginUser = async (payload: LoginBody) => {
  const user = await UserModel.findOne({
    email: payload.email.toLowerCase(),
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await comparePassword(payload.password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const token = signAccessToken({
    userId: String(user._id),
    email: user.email,
  });

  return {
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      demoBalance: user.demoBalance,
    },
    token,
  };
};

export const getMyProfile = async (userId: string) => {
  const user = await UserModel.findById(userId).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};