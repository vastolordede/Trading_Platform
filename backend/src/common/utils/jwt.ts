import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export type JwtPayloadType = {
  userId: string;
  email: string;
};

export const signAccessToken = (payload: JwtPayloadType): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): JwtPayloadType => {
  return jwt.verify(token, env.jwtSecret) as JwtPayloadType;
};