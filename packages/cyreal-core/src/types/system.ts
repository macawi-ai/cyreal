/**
 * VSM System Levels
 */
export enum SystemLevel {
  OPERATIONAL = 1,
  COORDINATION = 2,
  MANAGEMENT = 3,
  INTELLIGENCE = 4,
  META_SYSTEM = 5
}

/**
 * Governor domains for System 1
 */
export enum GovernorDomain {
  SECURITY = 'security',
  COMMUNICATION = 'communication',
  HEALTH = 'health',
  SERIAL_PORT = 'serial_port',
  NETWORK = 'network'
}

/**
 * Port status for 5-color industrial indicator
 */
export enum PortStatus {
  OPERATIONAL = 'operational',    // Green
  WARNING = 'warning',           // Yellow
  ERROR = 'error',              // Red
  STANDBY = 'standby',          // Blue
  MAINTENANCE = 'maintenance'    // White
}

/**
 * Security levels
 */
export enum SecurityLevel {
  PARANOID = 'paranoid',
  BALANCED = 'balanced',
  PERMISSIVE = 'permissive',
  DEBUG = 'debug'
}

/**
 * Buffer modes
 */
export enum BufferMode {
  LINE_ORIENTED = 'line',
  STREAM = 'stream',
  RAW = 'raw',
  AUTO = 'auto'
}

/**
 * Reliability modes
 */
export enum ReliabilityMode {
  FULL = 'full',
  SELECTIVE = 'selective',
  BEST_EFFORT = 'best_effort',
  AUTO_DETECT = 'auto_detect'
}