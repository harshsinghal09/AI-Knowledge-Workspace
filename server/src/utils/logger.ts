type Level = "info" | "warn" | "error";

function log(level: Level, message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export const logger = {
  info: (message: string) => log("info", message),
  warn: (message: string) => log("warn", message),
  error: (message: string) => log("error", message)
};
