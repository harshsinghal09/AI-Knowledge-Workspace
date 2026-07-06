import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "5000", 10),

  mongoUri: required("MONGO_URI", "mongodb://localhost:27017/ai_knowledge_workspace"),

  redisHost: process.env.REDIS_HOST ?? "localhost",
  redisPort: parseInt(process.env.REDIS_PORT ?? "6379", 10),

  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev_access_secret"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev_refresh_secret"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",

  pythonAiUrl: process.env.PYTHON_AI_URL ?? "http://localhost:8000",
  internalServiceSecret: required("INTERNAL_SERVICE_SECRET", "dev_internal_secret"),

  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",

  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "15", 10)
};
