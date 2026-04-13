import { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.validation";
import { getMyProfile, loginUser, registerUser } from "./auth.service";
import { sendError, sendSuccess } from "../../common/utils/response";

export const registerController = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await registerUser(parsed);

    return sendSuccess(res, "Register successful", result, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Register failed";
    return sendError(res, message, 400);
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await loginUser(parsed);

    return sendSuccess(res, "Login successful", result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return sendError(res, message, 400);
  }
};

export const meController = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, "Unauthorized", 401);
    }

    const user = await getMyProfile(req.user.userId);

    return sendSuccess(res, "Profile fetched successfully", user, 200);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch profile";
    return sendError(res, message, 400);
  }
};