/**
 * Application Logger Service
 * Supports INFO, WARN, ERROR, DEBUG levels with ring buffer in memory and log export.
 */
import { getCurrentUtcIsoString } from '../lib/date/utc';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: string; // UTC ISO-8601
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs: number = 500;
  private listeners: Array<(entry: LogEntry) => void> = [];

  private addEntry(level: LogLevel, message: string, context?: string, data?: unknown): LogEntry {
    const entry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: getCurrentUtcIsoString(),
      level,
      message,
      context,
      data,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Also write to standard console
    const formatted = `[${entry.timestamp}] [${entry.level}]${entry.context ? ` [${entry.context}]` : ''}: ${entry.message}`;
    switch (level) {
      case 'DEBUG':
        console.debug(formatted, data ?? '');
        break;
      case 'INFO':
        console.info(formatted, data ?? '');
        break;
      case 'WARN':
        console.warn(formatted, data ?? '');
        break;
      case 'ERROR':
        console.error(formatted, data ?? '');
        break;
    }

    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (err) {
        console.error('Error in logger listener:', err);
      }
    });

    return entry;
  }

  public debug(message: string, context?: string, data?: unknown): LogEntry {
    return this.addEntry('DEBUG', message, context, data);
  }

  public info(message: string, context?: string, data?: unknown): LogEntry {
    return this.addEntry('INFO', message, context, data);
  }

  public warn(message: string, context?: string, data?: unknown): LogEntry {
    return this.addEntry('WARN', message, context, data);
  }

  public error(message: string, context?: string, data?: unknown): LogEntry {
    return this.addEntry('ERROR', message, context, data);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }

  public subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public exportLogsAsJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new LoggerService();
