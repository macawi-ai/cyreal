import { SecurityLevel } from '../types/system';

/**
 * Token pair for mutual authentication
 */
export interface TokenPair {
  cyrealToken: string;
  mcpToken: string;
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
  authenticate(mcpToken: string, cyrealToken: string): Promise<AuthResult>;
  
  /**
   * Revoke a token
   */
  revokeToken(mcpToken: string): Promise<void>;
  
  /**
   * List all active tokens
   */
  listTokens(): Promise<TokenPair[]>;
  
  /**
   * Renew a token
   */
  renewToken(mcpToken: string): Promise<TokenPair>;
  
  /**
   * Get token permissions
   */
  getPermissions(mcpToken: string): Promise<TokenPermissions | null>;
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