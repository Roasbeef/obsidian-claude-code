/**
 * Log levels for the logger.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Abstraction over logging functionality.
 * Allows for easy mocking in tests and swapping implementations.
 */
export interface ILogger {
  /**
   * Log a debug message.
   */
  debug(component: string, message: string, data?: unknown): void;

  /**
   * Log an info message.
   */
  info(component: string, message: string, data?: unknown): void;

  /**
   * Log a warning message.
   */
  warn(component: string, message: string, data?: unknown): void;

  /**
   * Log an error message.
   */
  error(component: string, message: string, data?: unknown): void;

  /**
   * Set the minimum log level.
   */
  setLevel(level: LogLevel): void;

  /**
   * Get the current log level.
   */
  getLevel(): LogLevel;
}

/**
 * Create a no-op logger for testing or when logging is disabled.
 */
export function createNoOpLogger(): ILogger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    setLevel: () => {},
    getLevel: () => "error",
  };
}

/**
 * Create a console logger for development.
 */
export function createConsoleLogger(minLevel: LogLevel = "info"): ILogger {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  let currentLevel = minLevel;

  const shouldLog = (level: LogLevel): boolean => {
    return levels.indexOf(level) >= levels.indexOf(currentLevel);
  };

  const formatMessage = (level: LogLevel, component: string, message: string, data?: unknown): string => {
    const timestamp = new Date().toISOString();
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}${dataStr}`;
  };

  return {
    debug(component, message, data) {
      if (shouldLog("debug")) {
        console.debug(formatMessage("debug", component, message, data));
      }
    },
    info(component, message, data) {
      if (shouldLog("info")) {
        console.info(formatMessage("info", component, message, data));
      }
    },
    warn(component, message, data) {
      if (shouldLog("warn")) {
        console.warn(formatMessage("warn", component, message, data));
      }
    },
    error(component, message, data) {
      if (shouldLog("error")) {
        console.error(formatMessage("error", component, message, data));
      }
    },
    setLevel(level) {
      currentLevel = level;
    },
    getLevel() {
      return currentLevel;
    },
  };
}
