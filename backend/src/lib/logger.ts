/**
 * Winston Logger Configuration
 * Structured logging for production-ready applications
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Custom format for console output (development)
const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add stack trace for errors
  if (stack) {
    msg += `\n${stack}`;
  }

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`;
  }

  return msg;
});

// Define transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      consoleFormat
    ),
  })
);

// File transports (production only)
if (process.env.NODE_ENV === 'production') {
  const logsDir = path.join(process.cwd(), 'logs');

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Don't exit on uncaught errors
  exitOnError: false,
});

// Stream for Morgan HTTP logger
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
