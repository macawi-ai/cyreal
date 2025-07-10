/**
 * A2A (Agent-to-Agent) Protocol Interface
 * 
 * Implements Google's A2A protocol for secure agent communication
 * with enhanced security through RFC-1918 address restrictions
 */

import { A2AAgentCard, A2ACapability, A2AEndpoint, Message } from './protocol';
import { TokenPair, A2AAuthResult } from './security';
import { IGovernor } from './governor';

/**
 * A2A Configuration with security defaults
 */
export interface A2AConfig {
  // Server configuration
  server: {
    host: string; // Must be RFC-1918 or localhost
    port: number;
    httpsOnly: boolean; // Default: true
    certPath?: string;
    keyPath?: string;
  };
  
  // Agent identification
  agent: {
    id: string;
    name: string;
    description: string;
    version: string;
  };
  
  // Security configuration
  security: {
    enforceRFC1918: boolean; // Default: true (HARD restriction)
    requireMutualAuth: boolean; // Default: true
    tokenExpiryMinutes: number; // Default: 60
    maxAgentsConnected: number; // Default: 10
  };
  
  // Service discovery
  discovery: {
    enabled: boolean; // Default: true
    broadcastInterval: number; // Default: 30000ms
    agentTimeout: number; // Default: 120000ms
  };
}

/**
 * A2A Agent Registry for managing connected agents
 */
export interface IA2AAgentRegistry {
  /**
   * Register a new agent
   */
  registerAgent(agentCard: A2AAgentCard, token: string): Promise<void>;
  
  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): Promise<void>;
  
  /**
   * Get all registered agents
   */
  getAgents(): Promise<A2AAgentCard[]>;
  
  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability: string): Promise<A2AAgentCard[]>;
  
  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Promise<A2AAgentCard | null>;
  
  /**
   * Update agent heartbeat
   */
  updateHeartbeat(agentId: string): Promise<void>;
  
  /**
   * Cleanup expired agents
   */
  cleanupExpiredAgents(): Promise<string[]>;
}

/**
 * A2A Service Discovery interface
 */
export interface IA2AServiceDiscovery {
  /**
   * Start service discovery
   */
  start(): Promise<void>;
  
  /**
   * Stop service discovery
   */
  stop(): Promise<void>;
  
  /**
   * Announce this agent's capabilities
   */
  announce(): Promise<void>;
  
  /**
   * Discover available agents
   */
  discover(): Promise<A2AAgentCard[]>;
  
  /**
   * Subscribe to agent discovery events
   */
  onAgentDiscovered(callback: (agent: A2AAgentCard) => void): void;
  
  /**
   * Subscribe to agent disconnection events
   */
  onAgentLost(callback: (agentId: string) => void): void;
}

/**
 * A2A Server interface
 */
export interface IA2AServer {
  /**
   * Start the A2A server
   */
  start(config: A2AConfig): Promise<void>;
  
  /**
   * Stop the A2A server
   */
  stop(): Promise<void>;
  
  /**
   * Get server status
   */
  getStatus(): {
    running: boolean;
    connectedAgents: number;
    uptime: number;
    lastError?: string;
  };
  
  /**
   * Handle incoming agent requests
   */
  handleRequest(agentId: string, message: Message): Promise<Message>;
  
  /**
   * Send request to another agent
   */
  sendRequest(targetAgentId: string, message: Message): Promise<Message>;
  
  /**
   * Broadcast message to all agents
   */
  broadcast(message: Message, excludeAgentId?: string): Promise<void>;
  
  /**
   * Get current agent card for this server
   */
  getAgentCard(): A2AAgentCard;
}

/**
 * A2A Client interface for connecting to other agents
 */
export interface IA2AClient {
  /**
   * Connect to a remote A2A agent
   */
  connect(endpoint: A2AEndpoint, agentCard: A2AAgentCard): Promise<A2AAuthResult>;
  
  /**
   * Disconnect from remote agent
   */
  disconnect(): Promise<void>;
  
  /**
   * Send request to connected agent
   */
  sendRequest(message: Message): Promise<Message>;
  
  /**
   * Subscribe to notifications from connected agent
   */
  onNotification(callback: (message: Message) => void): void;
  
  /**
   * Get connection status
   */
  isConnected(): boolean;
}

/**
 * A2A Governor implementing cybernetic control for agent coordination
 */
export interface IA2AGovernor extends IGovernor {
  /**
   * Monitor agent health and performance
   */
  monitorAgentHealth(): Promise<void>;
  
  /**
   * Optimize agent communication patterns
   */
  optimizeCommunication(): Promise<void>;
  
  /**
   * Handle agent failures and recovery
   */
  handleAgentFailure(agentId: string, error: Error): Promise<void>;
  
  /**
   * Balance load across available agents
   */
  balanceLoad(): Promise<void>;
  
  /**
   * Get agent performance metrics
   */
  getAgentMetrics(): Promise<{
    agentId: string;
    responseTime: number;
    reliability: number;
    load: number;
  }[]>;
}

/**
 * RFC-1918 Address Validator
 */
export interface IRFC1918Validator {
  /**
   * Validate if address is RFC-1918 compliant
   */
  isRFC1918Address(address: string): boolean;
  
  /**
   * Validate if address is localhost
   */
  isLocalhost(address: string): boolean;
  
  /**
   * Check if binding to address is allowed
   */
  isBindingAllowed(address: string): boolean;
  
  /**
   * Get RFC-1918 violation message
   */
  getViolationMessage(address: string): string;
}