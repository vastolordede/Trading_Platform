import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.route";
import { env } from "./config/env";
import { notFoundMiddleware } from "./common/middleware/notfound.middleware";
import { errorMiddleware } from "./common/middleware/error.middleware";
import marketRoutes from "./modules/market/market.route";

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/market", marketRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;