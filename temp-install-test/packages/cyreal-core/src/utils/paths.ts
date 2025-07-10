import * as path from 'path';
import * as os from 'os';

/**
 * Cross-platform path utilities for Cyreal
 */

/**
 * Get the appropriate log directory path for the current platform
 */
export function getLogDirectory(): string {
  if (process.platform === 'win32') {
    // Windows: Use AppData/Local
    return path.join(process.env.LOCALAPPDATA || os.homedir(), 'cyreal', 'logs');
  } else {
    // Unix-like systems: Use /var/log if writable, otherwise home directory
    return process.getuid && process.getuid() === 0 
      ? '/var/log/cyreal'
      : path.join(os.homedir(), '.cyreal', 'logs');
  }
}

/**
 * Get the appropriate data directory path for the current platform
 */
export function getDataDirectory(): string {
  if (process.platform === 'win32') {
    // Windows: Use AppData/Roaming
    return path.join(process.env.APPDATA || os.homedir(), 'cyreal', 'data');
  } else {
    // Unix-like systems: Use /var/lib if writable, otherwise home directory
    return process.getuid && process.getuid() === 0
      ? '/var/lib/cyreal'
      : path.join(os.homedir(), '.cyreal', 'data');
  }
}

/**
 * Get the appropriate config directory path for the current platform
 */
export function getConfigDirectory(): string {
  if (process.platform === 'win32') {
    // Windows: Use AppData/Roaming
    return path.join(process.env.APPDATA || os.homedir(), 'cyreal', 'config');
  } else {
    // Unix-like systems: Use /etc if writable, otherwise home directory
    return process.getuid && process.getuid() === 0
      ? '/etc/cyreal'
      : path.join(os.homedir(), '.config', 'cyreal');
  }
}

/**
 * Get a full path for a log file
 */
export function getLogPath(filename: string): string {
  return path.join(getLogDirectory(), filename);
}

/**
 * Get a full path for a data file
 */
export function getDataPath(filename: string): string {
  return path.join(getDataDirectory(), filename);
}

/**
 * Get a full path for a config file
 */
export function getConfigPath(filename: string): string {
  return path.join(getConfigDirectory(), filename);
}

/**
 * Normalize a serial port path for the current platform
 */
export function normalizeSerialPath(portPath: string): string {
  if (process.platform === 'win32') {
    // Ensure Windows COM ports are uppercase
    return portPath.toUpperCase();
  }
  // Unix paths are case-sensitive
  return portPath;
}