import { SecurityLevel } from '../types/system';

/**
 * Token pair for mutual authentication
 */
export interface TokenPair {
  cyrealToken: string;
  a2aToken: string;
  createdAt: Date;
  expiresAt?: Date;
  renewable?: boolean;
  lastUsed?: Date;
}

/**
 * Token permissions
 */
export interface TokenPermissions {
  portId: string;
  read: boolean;
  write: boolean;
  configure: boolean;
  securityLevel: SecurityLevel;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  tokenPair?: TokenPair;
  permissions?: TokenPermissions;
  reason?: string;
}

/**
 * Security event
 */
export interface SecurityEvent {
  timestamp: Date;
  type: 'auth_success' | 'auth_failure' | 'device_change' | 'rate_limit' | 'permission_denied';
  portId?: string;
  tokenId?: string;
  details: Record<string, any>;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Token manager interface
 */
export interface ITokenManager {
  /**
   * Generate a new token pair
   */
  generateTokenPair(
    portId: string,
    permissions: Omit<TokenPermissions, 'portId'>,
    expiresIn?: number
  ): Promise<TokenPair>;
  
  /**
   * Authenticate with token pair
   */
  authenticate(a2aToken: string, cyrealToken: string): Promise<AuthResult>;
  
  /**
   * Revoke a token
   */
  revokeToken(a2aToken: string): Promise<void>;
  
  /**
   * List all active tokens
   */
  listTokens(): Promise<TokenPair[]>;
  
  /**
   * Renew a token
   */
  renewToken(a2aToken: string): Promise<TokenPair>;
  
  /**
   * Get token permissions
   */
  getPermissions(a2aToken: string): Promise<TokenPermissions | null>;
}

/**
 * A2A Agent authentication
 */
export interface A2AAuthResult {
  success: boolean;
  agentCard?: import('./protocol').A2AAgentCard;
  tokenPair?: TokenPair;
  permissions?: TokenPermissions;
  reason?: string;
}

/**
 * Security governor interface
 */
export interface ISecurityGovernor {
  /**
   * Check if operation is allowed
   */
  authorize(
    tokenId: string,
    operation: 'read' | 'write' | 'configure',
    portId: string
  ): Promise<boolean>;
  
  /**
   * Record security event
   */
  recordEvent(event: SecurityEvent): void;
  
  /**
   * Get recent security events
   */
  getRecentEvents(limit?: number): SecurityEvent[];
  
  /**
   * Update security level
   */
  setSecurityLevel(level: SecurityLevel): void;
  
  /**
   * Get current threat assessment
   */
  getThreatAssessment(): {
    level: 'low' | 'medium' | 'high' | 'critical';
    indicators: string[];
    recommendations: string[];
  };
}

/**
 * A2A Token Manager extending base token manager
 */
export interface IA2ATokenManager extends ITokenManager {
  /**
   * Authenticate with A2A Agent Card
   */
  authenticateAgent(agentCard: import('./protocol').A2AAgentCard): Promise<A2AAuthResult>;
  
  /**
   * Validate agent card authenticity
   */
  validateAgentCard(agentCard: import('./protocol').A2AAgentCard): Promise<boolean>;
  
  /**
   * Get agent by token
   */
  getAgentByToken(a2aToken: string): Promise<import('./protocol').A2AAgentCard | null>;
}