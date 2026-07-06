import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

export const redisClient = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

redisClient.on("error", (err) => {
  logger.error(`Redis error: ${err.message}`);
});

export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
    logger.info(`Redis connected -> ${env.redisHost}:${env.redisPort}`);
  } catch (err) {
    logger.error(`Redis connection failed, continuing without cache: ${(err as Error).message}`);
  }
}

const DEFAULT_TTL_SECONDS = 600;

export async function cacheGet(key: string): Promise<string | null> {
  try {
    if (redisClient.status !== "ready") return null;
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
  try {
    if (redisClient.status !== "ready") return;
    await redisClient.set(key, value, "EX", ttlSeconds);
  } catch {
    // Cache failures must never break the request path.
  }
}
