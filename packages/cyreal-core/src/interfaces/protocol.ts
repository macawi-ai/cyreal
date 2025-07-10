/**
 * Protocol engine types
 */
export type ProtocolType = 'messagepack-rpc' | 'custom-binary' | 'json-rpc' | 'a2a-jsonrpc';

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
 * A2A Agent Card for capability discovery
 */
export interface A2AAgentCard {
  agentId: string;
  name: string;
  description: string;
  version: string;
  capabilities: A2ACapability[];
  endpoints: A2AEndpoint[];
  metadata?: Record<string, any>;
  lastSeen: Date;
}

/**
 * A2A Agent Capability
 */
export interface A2ACapability {
  id: string;
  name: string;
  description: string;
  input?: A2ASchema;
  output?: A2ASchema;
  category: 'serial' | 'network' | 'governance' | 'monitoring' | 'custom';
}

/**
 * A2A Service Endpoint
 */
export interface A2AEndpoint {
  url: string;
  protocol: 'https' | 'wss';
  methods: string[];
  authentication: 'token' | 'mutual-tls' | 'none';
}

/**
 * A2A Schema definition for inputs/outputs
 */
export interface A2ASchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
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