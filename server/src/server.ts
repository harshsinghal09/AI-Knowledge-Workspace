import { createApp } from "./app";
import { connectMongo } from "./config/db";
import { connectRedis } from "./config/redis";
import { env } from "./config/env";
import { logger } from "./utils/logger";

async function main(): Promise<void> {
  await connectMongo();
  await connectRedis();

  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port} [${env.nodeEnv}]`);
  });
}

main().catch((err) => {
  logger.error(`Fatal startup error: ${err.message}`);
  process.exit(1);
});
