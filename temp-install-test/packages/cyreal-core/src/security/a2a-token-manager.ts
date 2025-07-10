/**
 * Secure A2A Token Manager
 * 
 * Implements cryptographically secure token authentication for A2A agents
 * with proper validation, expiry, and revocation mechanisms
 */

import * as crypto from 'crypto';
import * as winston from 'winston';
import { IA2ATokenManager, TokenPair, A2AAuthResult, TokenPermissions } from '../interfaces/security';
import { A2AAgentCard } from '../interfaces/protocol';

interface SecureTokenData {
  agentId: string;
  permissions: TokenPermissions;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

interface TokenValidationResult {
  valid: boolean;
  expired: boolean;
  reason?: string;
  tokenData?: SecureTokenData;
}

export class SecureA2ATokenManager implements IA2ATokenManager {
  private readonly SECRET_KEY: string;
  private readonly ALGORITHM = 'HS256';
  private readonly DEFAULT_EXPIRY_MINUTES = 60;
  private readonly activeTokens = new Map<string, SecureTokenData>();
  private readonly revokedTokens = new Set<string>();
  private readonly logger: winston.Logger;

  constructor(logger: winston.Logger, secretKey?: string) {
    this.logger = logger;
    
    // Use provided secret or generate a cryptographically secure one
    this.SECRET_KEY = secretKey || this.generateSecureSecret();
    
    if (!secretKey) {
      this.logger.warn('🔑 No secret key provided - using generated key (not recommended for production)');
    }

    // Start token cleanup task
    this.startTokenCleanup();
  }

  /**
   * Generate a new token pair with cryptographic security
   */
  public async generateTokenPair(
    portId: string,
    permissions: Omit<TokenPermissions, 'portId'>,
    expiresIn: number = this.DEFAULT_EXPIRY_MINUTES * 60 * 1000
  ): Promise<TokenPair> {
    const now = Date.now();
    const expiresAt = now + expiresIn;

    // Generate cyrealToken (internal identifier)
    const cyrealToken = this.generateSecureId();
    
    // Create token data
    const tokenData: SecureTokenData = {
      agentId: crypto.randomUUID(),
      permissions: { ...permissions, portId },
      issuedAt: now,
      expiresAt,
      signature: '' // Will be set after signing
    };

    // Generate a2aToken (signed JWT-like token)
    const a2aToken = this.signToken(tokenData);
    tokenData.signature = a2aToken;

    // Store active token
    this.activeTokens.set(a2aToken, tokenData);

    const tokenPair: TokenPair = {
      cyrealToken,
      a2aToken,
      createdAt: new Date(now),
      expiresAt: new Date(expiresAt),
      renewable: true,
      lastUsed: new Date(now)
    };

    this.logger.info('Secure token pair generated', {
      cyrealTokenId: cyrealToken.substring(0, 8) + '...',
      portId,
      expiresIn: expiresIn / 1000,
      permissions: Object.keys(permissions).filter(k => permissions[k as keyof typeof permissions])
    });

    return tokenPair;
  }

  /**
   * Authenticate with token pair using cryptographic validation
   */
  public async authenticate(a2aToken: string, cyrealToken: string): Promise<A2AAuthResult> {
    try {
      // Validate token format
      if (!a2aToken || !cyrealToken) {
        return {
          success: false,
          reason: 'Missing authentication tokens'
        };
      }

      // Check if token is revoked
      if (this.revokedTokens.has(a2aToken)) {
        this.logger.warn('Authentication attempt with revoked token', {
          tokenPrefix: a2aToken.substring(0, 8)
        });
        return {
          success: false,
          reason: 'Token has been revoked'
        };
      }

      // Validate token cryptographically
      const validation = this.validateToken(a2aToken);
      if (!validation.valid) {
        this.logger.warn('Token validation failed', {
          reason: validation.reason,
          expired: validation.expired
        });
        return {
          success: false,
          reason: validation.reason
        };
      }

      const tokenData = validation.tokenData!;
      
      // Update last used timestamp
      const tokenPair = await this.getTokenPair(a2aToken);
      if (tokenPair) {
        tokenPair.lastUsed = new Date();
      }

      this.logger.info('Authentication successful', {
        agentId: tokenData.agentId,
        portId: tokenData.permissions.portId
      });

      return {
        success: true,
        tokenPair: tokenPair || undefined,
        permissions: tokenData.permissions
      };

    } catch (error) {
      this.logger.error('Authentication error:', error);
      return {
        success: false,
        reason: 'Authentication system error'
      };
    }
  }

  /**
   * Authenticate with A2A Agent Card (enhanced security)
   */
  public async authenticateAgent(agentCard: A2AAgentCard): Promise<A2AAuthResult> {
    try {
      // Validate agent card structure
      if (!this.validateAgentCardStructure(agentCard)) {
        return {
          success: false,
          reason: 'Invalid agent card structure'
        };
      }

      // Validate agent card authenticity
      if (!await this.validateAgentCard(agentCard)) {
        return {
          success: false,
          reason: 'Agent card validation failed'
        };
      }

      // Generate temporary token for the agent
      const permissions: Omit<TokenPermissions, 'portId'> = {
        read: true,
        write: false, // Default to read-only for security
        configure: false,
        securityLevel: 'balanced' as any
      };

      const tokenPair = await this.generateTokenPair(
        `agent-${agentCard.agentId}`,
        permissions,
        30 * 60 * 1000 // 30 minutes for agent tokens
      );

      this.logger.info('Agent authenticated successfully', {
        agentId: agentCard.agentId,
        agentName: agentCard.name,
        capabilities: agentCard.capabilities.length
      });

      return {
        success: true,
        agentCard,
        tokenPair,
        permissions: { ...permissions, portId: `agent-${agentCard.agentId}` }
      };

    } catch (error) {
      this.logger.error('Agent authentication error:', error);
      return {
        success: false,
        reason: 'Agent authentication failed'
      };
    }
  }

  /**
   * Validate agent card authenticity
   */
  public async validateAgentCard(agentCard: A2AAgentCard): Promise<boolean> {
    try {
      // Check required fields
      if (!agentCard.agentId || !agentCard.name || !agentCard.version) {
        return false;
      }

      // Validate agent ID format (UUIDv4)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(agentCard.agentId)) {
        this.logger.warn('Invalid agent ID format', { agentId: agentCard.agentId });
        return false;
      }

      // Validate capabilities
      if (!Array.isArray(agentCard.capabilities)) {
        return false;
      }

      // Validate endpoints
      for (const endpoint of agentCard.endpoints) {
        if (!this.isSecureEndpoint(endpoint.url)) {
          this.logger.warn('Insecure endpoint detected', { url: endpoint.url });
          return false;
        }
      }

      // Check if agent was seen recently (prevent replay attacks)
      const timeSinceLastSeen = Date.now() - agentCard.lastSeen.getTime();
      if (timeSinceLastSeen > 5 * 60 * 1000) { // 5 minutes
        this.logger.warn('Agent card timestamp too old', {
          agentId: agentCard.agentId,
          timeSinceLastSeen
        });
        return false;
      }

      return true;

    } catch (error) {
      this.logger.error('Agent card validation error:', error);
      return false;
    }
  }

  /**
   * Get agent by token
   */
  public async getAgentByToken(a2aToken: string): Promise<A2AAgentCard | null> {
    const tokenData = this.activeTokens.get(a2aToken);
    if (!tokenData) {
      return null;
    }

    // For now, return null since we don't store agent cards with tokens
    // In a full implementation, we'd maintain an agent registry
    return null;
  }

  /**
   * Revoke a token immediately
   */
  public async revokeToken(a2aToken: string): Promise<void> {
    this.revokedTokens.add(a2aToken);
    this.activeTokens.delete(a2aToken);
    
    this.logger.info('Token revoked', {
      tokenPrefix: a2aToken.substring(0, 8)
    });
  }

  /**
   * List all active tokens (security-safe view)
   */
  public async listTokens(): Promise<TokenPair[]> {
    const tokens: TokenPair[] = [];
    
    for (const [a2aToken, tokenData] of this.activeTokens.entries()) {
      tokens.push({
        cyrealToken: `${tokenData.agentId.substring(0, 8)}...`,
        a2aToken: `${a2aToken.substring(0, 8)}...`,
        createdAt: new Date(tokenData.issuedAt),
        expiresAt: new Date(tokenData.expiresAt),
        renewable: true,
        lastUsed: new Date() // Would track in real implementation
      });
    }

    return tokens;
  }

  /**
   * Renew a token
   */
  public async renewToken(a2aToken: string): Promise<TokenPair> {
    const tokenData = this.activeTokens.get(a2aToken);
    if (!tokenData) {
      throw new Error('Token not found');
    }

    // Generate new token with same permissions
    return await this.generateTokenPair(
      tokenData.permissions.portId,
      {
        read: tokenData.permissions.read,
        write: tokenData.permissions.write,
        configure: tokenData.permissions.configure,
        securityLevel: tokenData.permissions.securityLevel
      }
    );
  }

  /**
   * Get token permissions
   */
  public async getPermissions(a2aToken: string): Promise<TokenPermissions | null> {
    const tokenData = this.activeTokens.get(a2aToken);
    return tokenData ? tokenData.permissions : null;
  }

  // Private helper methods

  private generateSecureSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private generateSecureId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private signToken(tokenData: SecureTokenData): string {
    const payload = {
      agi: tokenData.agentId,
      per: tokenData.permissions,
      iat: tokenData.issuedAt,
      exp: tokenData.expiresAt
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const header = Buffer.from('{"typ":"A2A","alg":"HS256"}').toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(`${header}.${payloadBase64}`)
      .digest('base64url');

    return `${header}.${payloadBase64}.${signature}`;
  }

  private validateToken(a2aToken: string): TokenValidationResult {
    try {
      const parts = a2aToken.split('.');
      if (parts.length !== 3) {
        return { valid: false, expired: false, reason: 'Invalid token format' };
      }

      const [header, payload, signature] = parts;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.SECRET_KEY)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return { valid: false, expired: false, reason: 'Invalid signature' };
      }

      // Parse payload
      const tokenData = JSON.parse(Buffer.from(payload, 'base64url').toString());

      // Check expiry
      if (Date.now() > tokenData.exp) {
        return { valid: false, expired: true, reason: 'Token expired' };
      }

      return {
        valid: true,
        expired: false,
        tokenData: {
          agentId: tokenData.agi,
          permissions: tokenData.per,
          issuedAt: tokenData.iat,
          expiresAt: tokenData.exp,
          signature: a2aToken
        }
      };

    } catch (error) {
      return { valid: false, expired: false, reason: 'Token parsing error' };
    }
  }

  private validateAgentCardStructure(agentCard: A2AAgentCard): boolean {
    const required = ['agentId', 'name', 'description', 'version', 'capabilities', 'endpoints', 'lastSeen'];
    return required.every(field => agentCard.hasOwnProperty(field));
  }

  private isSecureEndpoint(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  private async getTokenPair(a2aToken: string): Promise<TokenPair | null> {
    const tokenData = this.activeTokens.get(a2aToken);
    if (!tokenData) {
      return null;
    }

    return {
      cyrealToken: tokenData.agentId,
      a2aToken,
      createdAt: new Date(tokenData.issuedAt),
      expiresAt: new Date(tokenData.expiresAt),
      renewable: true,
      lastUsed: new Date()
    };
  }

  private startTokenCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [token, tokenData] of this.activeTokens.entries()) {
        if (now > tokenData.expiresAt) {
          this.activeTokens.delete(token);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug('Token cleanup completed', {
          cleanedTokens: cleanedCount,
          activeTokens: this.activeTokens.size
        });
      }
    }, 60000); // Clean up every minute
  }
}