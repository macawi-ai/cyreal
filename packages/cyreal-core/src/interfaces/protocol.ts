/**
 * Protocol engine types
 */
export type ProtocolType = 'messagepack-rpc' | 'custom-binary' | 'json-rpc';

/**
 * Message types for protocol communication
 */
export interface Message {
  id: string;
  type: 'request' | 'response' | 'notification' | 'error';
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Protocol performance metrics
 */
export interface ProtocolMetrics {
  messagesEncoded: number;
  messagesDecoded: number;
  bytesEncoded: number;
  bytesDecoded: number;
  avgEncodingTimeMs: number;
  avgDecodingTimeMs: number;
  errors: number;
  lastError?: string;
}

/**
 * Protocol engine interface
 */
export interface IProtocolEngine {
  readonly type: ProtocolType;
  
  /**
   * Encode a message to buffer
   */
  encode(message: Message): Buffer;
  
  /**
   * Decode buffer to message
   */
  decode(buffer: Buffer): Message;
  
  /**
   * Get current metrics
   */
  getMetrics(): ProtocolMetrics;
  
  /**
   * Reset metrics
   */
  resetMetrics(): void;
  
  /**
   * Validate message format
   */
  validateMessage(message: Message): boolean;
}

/**
 * Protocol engine factory
 */
export interface IProtocolEngineFactory {
  /**
   * Create a protocol engine
   */
  create(type: ProtocolType): IProtocolEngine;
  
  /**
   * List available protocol types
   */
  getAvailableTypes(): ProtocolType[];
}

/**
 * Network transport options
 */
export interface TransportOptions {
  protocol: 'tcp' | 'udp';
  host: string;
  port: number;
  // Security
  tls?: {
    enabled: boolean;
    cert?: string;
    key?: string;
    ca?: string;
    rejectUnauthorized?: boolean;
  };
  // Reliability
  reliability?: {
    mode: 'stateless' | 'heartbeat' | 'sequence' | 'adaptive';
    heartbeatIntervalMs?: number;
    sequenceWindowSize?: number;
    retransmitTimeoutMs?: number;
    maxRetransmits?: number;
  };
}