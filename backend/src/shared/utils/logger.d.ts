declare interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

export function createLogger(name?: string, level?: string): Logger;
export function setGlobalLogLevel(level: string): void;
export function getGlobalLogLevel(): string;

declare const _default: typeof createLogger;
export default _default;