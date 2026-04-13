import { JwtPayloadType } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadType;
    }
  }
}

export {};