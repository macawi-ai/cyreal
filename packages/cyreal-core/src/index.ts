// Export all types
export * from './types/system';

// Export all interfaces
export * from './interfaces/governor';
export * from './interfaces/port';
export * from './interfaces/protocol';
export * from './interfaces/security';
export * from './interfaces/event';
export * from './interfaces/gpio';
export * from './interfaces/a2a';

// Device discovery system removed - will be reimplemented after manufacturer consultation

// Export utilities
export * from './utils/paths';
export * from './utils/rfc1918-validator';

// Export A2A implementation
export * from './a2a/a2a-server';

// Export security components
export * from './security/a2a-token-manager';
export * from './security/message-validator';

// Export constants
export * from './constants/legal';

// Version
export const VERSION = '0.1.0';