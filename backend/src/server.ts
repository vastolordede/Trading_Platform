import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { connectRedis } from "./config/redis";

const startServer = async () => {
  await connectDB();
  await connectRedis();

  app.listen(env.port, () => {
    console.log(`Server running at http://localhost:${env.port}`);
  });
};

startServer();