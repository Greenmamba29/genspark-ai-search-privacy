/**
 * Simple Logger Utility
 * Basic logging functionality for SimStudio integration
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_COLORS = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m'  // Red
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  constructor(name = 'App', level = 'INFO') {
    this.name = name;
    this.level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const color = LOG_COLORS[level] || '';
    const prefix = `${color}[${timestamp}] [${level}] [${this.name}]${RESET_COLOR}`;
    
    if (typeof message === 'string') {
      const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      return `${prefix} ${message}${metaString}`;
    }
    
    return `${prefix} ${JSON.stringify(message)}`;
  }

  log(level, message, meta = {}) {
    const levelNum = LOG_LEVELS[level];
    if (levelNum >= this.level) {
      const formatted = this.formatMessage(level, message, meta);
      console.log(formatted);
    }
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }
}

// Global logger instances cache
const loggers = new Map();

/**
 * Create or get a logger instance
 */
export function createLogger(name = 'App', level = 'INFO') {
  const key = `${name}:${level}`;
  
  if (!loggers.has(key)) {
    loggers.set(key, new Logger(name, level));
  }
  
  return loggers.get(key);
}

/**
 * Set global log level for all future loggers
 */
let globalLogLevel = 'INFO';

export function setGlobalLogLevel(level) {
  globalLogLevel = level.toUpperCase();
}

export function getGlobalLogLevel() {
  return globalLogLevel;
}

// Default export
export default createLogger;