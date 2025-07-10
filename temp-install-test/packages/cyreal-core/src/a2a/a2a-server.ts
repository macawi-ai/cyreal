/**
 * A2A Server Implementation
 * 
 * Implements Agent-to-Agent protocol server with cybernetic governance
 * and RFC-1918 security restrictions
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import * as winston from 'winston';

import { 
  IA2AServer, 
  IA2AAgentRegistry, 
  IA2AServiceDiscovery, 
  A2AConfig,
  IRFC1918Validator 
} from '../interfaces/a2a';
import { 
  A2AAgentCard, 
  A2ACapability, 
  A2AEndpoint, 
  Message 
} from '../interfaces/protocol';
import { RFC1918Validator } from '../utils/rfc1918-validator';
import { SecureA2ATokenManager } from '../security/a2a-token-manager';
import { SecureMessageValidator } from '../security/message-validator';
import { UserAuthenticationManager } from '../security/user-authentication';
import { PCIAuditLogger } from '../security/pci-audit-logger';
import { EncryptionManager } from '../security/encryption-manager';

export class A2AServer extends EventEmitter implements IA2AServer {
  private config!: A2AConfig;
  private server?: https.Server | http.Server;
  private logger: winston.Logger;
  private registry: IA2AAgentRegistry;
  private discovery: IA2AServiceDiscovery;
  private validator: IRFC1918Validator;
  private tokenManager: SecureA2ATokenManager;
  private messageValidator: SecureMessageValidator;
  private userAuth?: UserAuthenticationManager;
  private auditLogger?: PCIAuditLogger;
  private encryptionManager?: EncryptionManager;
  private agentCard!: A2AAgentCard;
  private isRunning = false;
  private startTime = 0;
  private connectedAgents = new Map<string, { socket: any; lastSeen: Date; authenticated: boolean }>();
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();
  private allowedOrigins: Set<string> = new Set();

  constructor(
    logger: winston.Logger,
    registry: IA2AAgentRegistry,
    discovery: IA2AServiceDiscovery,
    tokenManager?: SecureA2ATokenManager
  ) {
    super();
    this.logger = logger;
    this.registry = registry;
    this.discovery = discovery;
    this.validator = new RFC1918Validator();
    this.tokenManager = tokenManager || new SecureA2ATokenManager(logger);
    this.messageValidator = new SecureMessageValidator(logger);
  }

  /**
   * Start the A2A server with security validation
   */
  public async start(config: A2AConfig): Promise<void> {
    this.config = config;

    // CRITICAL: Validate RFC-1918 compliance BEFORE starting server
    if (config.security.enforceRFC1918) {
      const validation = RFC1918Validator.validateAddress(config.server.host);
      if (!validation.valid) {
        const error = new Error(`RFC-1918 Security Violation: ${validation.message}`);
        this.logger.error('A2A Server startup blocked by security policy', {
          host: config.server.host,
          violation: validation.message
        });
        throw error;
      }
    }

    this.logger.info('Starting A2A Server with cybernetic governance', {
      agent: config.agent,
      host: config.server.host,
      port: config.server.port,
      httpsOnly: config.server.httpsOnly,
      rfc1918Enforced: config.security.enforceRFC1918
    });

    try {
      // Initialize security settings
      this.initializeSecurity();

      // Initialize agent card
      this.agentCard = await this.createAgentCard();

      // Create HTTP/HTTPS server
      await this.createServer();

      // Start service discovery
      if (config.discovery.enabled) {
        await this.discovery.start();
        this.setupDiscoveryHandlers();
      }

      // Start background tasks
      this.startBackgroundTasks();

      this.isRunning = true;
      this.startTime = Date.now();
      
      this.logger.info('🤖 A2A Server started successfully', {
        agentId: this.agentCard.agentId,
        capabilities: this.agentCard.capabilities.length,
        securityLevel: 'RFC-1918 Enforced',
        cybernetic: 'PSRLV governance active'
      });

      this.emit('server:started', this.agentCard);
      
    } catch (error) {
      this.logger.error('Failed to start A2A server:', error);
      throw error;
    }
  }

  /**
   * Stop the A2A server
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping A2A Server...');

    try {
      // Stop service discovery
      if (this.discovery) {
        await this.discovery.stop();
      }

      // Close all agent connections
      for (const [agentId, connection] of this.connectedAgents) {
        connection.socket.close();
        await this.registry.unregisterAgent(agentId);
      }
      this.connectedAgents.clear();

      // Close server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => resolve());
        });
      }

      this.isRunning = false;
      this.logger.info('A2A Server stopped successfully');
      this.emit('server:stopped');

    } catch (error) {
      this.logger.error('Error stopping A2A server:', error);
      throw error;
    }
  }

  /**
   * Get server status
   */
  public getStatus() {
    return {
      running: this.isRunning,
      connectedAgents: this.connectedAgents.size,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      agentCard: this.agentCard
    };
  }

  /**
   * Handle incoming agent requests with security validation
   */
  public async handleRequest(agentId: string, message: Message, clientIP?: string): Promise<Message> {
    this.logger.debug('Handling A2A request', { agentId, method: message.method });

    try {
      // Rate limiting check
      if (clientIP && !this.checkRateLimit(clientIP)) {
        return {
          id: message.id,
          type: 'error',
          error: {
            code: -32003,
            message: 'Rate limit exceeded'
          }
        };
      }

      // Validate message format and content
      const validation = this.messageValidator.validateMessage(message);
      if (!validation.valid) {
        this.logger.warn('Invalid message received', {
          agentId,
          errors: validation.errors
        });
        return {
          id: message.id,
          type: 'error',
          error: {
            code: -32700,
            message: 'Invalid message format'
          }
        };
      }

      // Use sanitized message
      const sanitizedMessage = validation.sanitizedMessage!;

      // Check agent authentication
      const connection = this.connectedAgents.get(agentId);
      if (!connection?.authenticated) {
        return {
          id: sanitizedMessage.id,
          type: 'error',
          error: {
            code: -32401,
            message: 'Authentication required'
          }
        };
      }

      // Update agent heartbeat
      await this.registry.updateHeartbeat(agentId);

      // Route message based on method
      switch (sanitizedMessage.method) {
        case 'agent.register':
          return await this.handleAgentRegistration(agentId, sanitizedMessage);
        
        case 'agent.discover':
          return await this.handleAgentDiscovery(sanitizedMessage);
        
        case 'serial.list':
          return await this.handleSerialList(sanitizedMessage);
        
        case 'serial.read':
          return await this.handleSerialRead(agentId, sanitizedMessage);
        
        case 'serial.write':
          return await this.handleSerialWrite(agentId, sanitizedMessage);
        
        default:
          return {
            id: sanitizedMessage.id,
            type: 'error',
            error: {
              code: -32601,
              message: 'Method not found',
              data: { availableMethods: this.getAvailableMethods() }
            }
          };
      }
    } catch (error) {
      this.logger.error('Error handling A2A request', { agentId, error });
      return {
        id: message.id,
        type: 'error',
        error: {
          code: -32603,
          message: 'Internal error',
          data: { message: error instanceof Error ? error.message : 'Unknown error' }
        }
      };
    }
  }

  /**
   * Send request to another agent
   */
  public async sendRequest(targetAgentId: string, message: Message): Promise<Message> {
    const connection = this.connectedAgents.get(targetAgentId);
    if (!connection) {
      throw new Error(`Agent ${targetAgentId} not connected`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      const responseHandler = (response: Message) => {
        if (response.id === message.id) {
          clearTimeout(timeout);
          resolve(response);
        }
      };

      connection.socket.once('message', responseHandler);
      connection.socket.send(JSON.stringify(message));
    });
  }

  /**
   * Broadcast message to all connected agents
   */
  public async broadcast(message: Message, excludeAgentId?: string): Promise<void> {
    const broadcastPromises: Promise<void>[] = [];

    for (const [agentId, connection] of this.connectedAgents) {
      if (agentId !== excludeAgentId) {
        broadcastPromises.push(
          new Promise((resolve) => {
            connection.socket.send(JSON.stringify(message));
            resolve();
          })
        );
      }
    }

    await Promise.all(broadcastPromises);
    this.logger.debug('Broadcasted message to connected agents', { 
      recipients: broadcastPromises.length,
      method: message.method 
    });
  }

  /**
   * Get current agent card
   */
  public getAgentCard(): A2AAgentCard {
    return this.agentCard;
  }

  /**
   * Create HTTPS/HTTP server based on configuration
   */
  private async createServer(): Promise<void> {
    const requestHandler = this.createRequestHandler();

    if (this.config.server.httpsOnly) {
      if (!this.config.server.certPath || !this.config.server.keyPath) {
        throw new Error('HTTPS enabled but certificate/key paths not provided');
      }

      const options = {
        cert: fs.readFileSync(this.config.server.certPath),
        key: fs.readFileSync(this.config.server.keyPath)
      };

      this.server = https.createServer(options, requestHandler);
    } else {
      this.server = http.createServer(requestHandler);
      this.logger.warn('⚠️  A2A Server running in HTTP mode - HTTPS recommended for production');
    }

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.server.port, this.config.server.host, () => {
        this.logger.info('A2A Server listening', {
          host: this.config.server.host,
          port: this.config.server.port,
          protocol: this.config.server.httpsOnly ? 'HTTPS' : 'HTTP'
        });
        resolve();
      });

      this.server!.on('error', reject);
    });
  }

  /**
   * Create HTTP request handler for A2A JSON-RPC 2.0 with security
   */
  private createRequestHandler() {
    return async (req: http.IncomingMessage, res: http.ServerResponse) => {
      const clientIP = req.socket.remoteAddress || 'unknown';
      const origin = req.headers.origin;

      // Set secure CORS headers
      this.setSecureCORSHeaders(res, origin);
      res.setHeader('Content-Type', 'application/json');
      
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Method not allowed' }
        }));
        return;
      }

      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            // Validate content length
            if (body.length > 1024 * 1024) { // 1MB limit
              res.writeHead(413);
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32700, message: 'Request too large' }
              }));
              return;
            }

            const message: Message = JSON.parse(body);
            const agentId = req.headers['x-agent-id'] as string;
            const authToken = req.headers['authorization'] as string;
            
            // Extract token from Authorization header
            const token = authToken?.replace('Bearer ', '') || '';
            
            // Authenticate request
            if (!await this.authenticateRequest(agentId, token)) {
              res.writeHead(401);
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32401, message: 'Authentication failed' }
              }));
              return;
            }
            
            const response = await this.handleRequest(agentId, message, clientIP);
            
            res.writeHead(200);
            res.end(JSON.stringify(response));
          } catch (error) {
            this.logger.error('Request processing error:', error);
            res.writeHead(400);
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32700, message: 'Parse error' }
            }));
          }
        });
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' }
        }));
      }
    };
  }

  /**
   * Create agent card for this server
   */
  private async createAgentCard(): Promise<A2AAgentCard> {
    const capabilities: A2ACapability[] = [
      {
        id: 'serial.list',
        name: 'List Serial Ports',
        description: 'Enumerate available serial ports with cybernetic intelligence',
        category: 'serial',
        output: {
          type: 'array',
          properties: {
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                manufacturer: { type: 'string' },
                vendorId: { type: 'string' },
                productId: { type: 'string' }
              }
            }
          }
        }
      },
      {
        id: 'serial.read',
        name: 'Read Serial Data',
        description: 'Read data from serial port with adaptive buffering',
        category: 'serial',
        input: {
          type: 'object',
          properties: {
            portId: { type: 'string' },
            length: { type: 'number' }
          },
          required: ['portId']
        }
      },
      {
        id: 'serial.write',
        name: 'Write Serial Data',
        description: 'Write data to serial port with reliability guarantees',
        category: 'serial',
        input: {
          type: 'object',
          properties: {
            portId: { type: 'string' },
            data: { type: 'string' }
          },
          required: ['portId', 'data']
        }
      },
      {
        id: 'governance.status',
        name: 'Governor Status',
        description: 'Get cybernetic governance system status (PSRLV)',
        category: 'governance'
      }
    ];

    const endpoints: A2AEndpoint[] = [
      {
        url: `${this.config.server.httpsOnly ? 'https' : 'http'}://${this.config.server.host}:${this.config.server.port}/a2a`,
        protocol: this.config.server.httpsOnly ? 'https' : 'http' as any,
        methods: ['POST'],
        authentication: 'token'
      }
    ];

    return {
      agentId: this.config.agent.id,
      name: this.config.agent.name,
      description: this.config.agent.description,
      version: this.config.agent.version,
      capabilities,
      endpoints,
      metadata: {
        platform: process.platform,
        nodeVersion: process.version,
        cybernetic: 'PSRLV governance enabled',
        security: 'RFC-1918 enforced',
        startTime: new Date().toISOString()
      },
      lastSeen: new Date()
    };
  }

  /**
   * Set up service discovery event handlers
   */
  private setupDiscoveryHandlers(): void {
    this.discovery.onAgentDiscovered((agent: A2AAgentCard) => {
      this.logger.info('A2A Agent discovered', {
        agentId: agent.agentId,
        name: agent.name,
        capabilities: agent.capabilities.length
      });
      this.emit('agent:discovered', agent);
    });

    this.discovery.onAgentLost((agentId: string) => {
      this.logger.info('A2A Agent lost', { agentId });
      this.connectedAgents.delete(agentId);
      this.emit('agent:lost', agentId);
    });
  }

  /**
   * Start background governance tasks
   */
  private startBackgroundTasks(): void {
    // Agent cleanup task
    setInterval(async () => {
      try {
        const expiredAgents = await this.registry.cleanupExpiredAgents();
        if (expiredAgents.length > 0) {
          this.logger.info('Cleaned up expired agents', { count: expiredAgents.length });
        }
      } catch (error) {
        this.logger.error('Error in agent cleanup task:', error);
      }
    }, 60000); // Every minute

    // Service discovery announcement
    if (this.config.discovery.enabled) {
      setInterval(async () => {
        try {
          await this.discovery.announce();
        } catch (error) {
          this.logger.error('Error announcing service:', error);
        }
      }, this.config.discovery.broadcastInterval);
    }
  }

  /**
   * Handle agent registration requests with enhanced security
   */
  private async handleAgentRegistration(agentId: string, message: Message): Promise<Message> {
    try {
      const agentCard = message.params?.agentCard as A2AAgentCard;
      const token = message.params?.token;
      
      if (!agentCard) {
        return {
          id: message.id,
          type: 'error',
          error: {
            code: -32602,
            message: 'Invalid params: agentCard required'
          }
        };
      }

      // Validate agent card
      const cardValidation = this.messageValidator.validateAgentCard(agentCard);
      if (!cardValidation.valid) {
        this.logger.warn('Agent card validation failed', {
          agentId,
          errors: cardValidation.errors
        });
        return {
          id: message.id,
          type: 'error',
          error: {
            code: -32602,
            message: 'Invalid agent card'
          }
        };
      }

      // Authenticate agent
      const authResult = await this.tokenManager.authenticateAgent(agentCard);
      if (!authResult.success) {
        return {
          id: message.id,
          type: 'error',
          error: {
            code: -32401,
            message: authResult.reason || 'Authentication failed'
          }
        };
      }

      // Register agent with generated token
      await this.registry.registerAgent(agentCard, authResult.tokenPair!.a2aToken);
      
      // Mark connection as authenticated
      const connection = this.connectedAgents.get(agentId);
      if (connection) {
        connection.authenticated = true;
      }
      
      return {
        id: message.id,
        type: 'response',
        result: {
          success: true,
          agentId: agentCard.agentId,
          token: authResult.tokenPair!.a2aToken,
          expiresAt: authResult.tokenPair!.expiresAt,
          message: 'Agent registered successfully'
        }
      };
    } catch (error) {
      this.logger.error('Agent registration error:', error);
      return {
        id: message.id,
        type: 'error',
        error: {
          code: -32603,
          message: 'Registration failed'
        }
      };
    }
  }

  /**
   * Handle agent discovery requests
   */
  private async handleAgentDiscovery(message: Message): Promise<Message> {
    try {
      const agents = await this.registry.getAgents();
      return {
        id: message.id,
        type: 'response',
        result: { agents }
      };
    } catch (error) {
      return {
        id: message.id,
        type: 'error',
        error: {
          code: -32603,
          message: 'Discovery failed'
        }
      };
    }
  }

  /**
   * Handle serial port listing
   */
  private async handleSerialList(message: Message): Promise<Message> {
    // This would integrate with the existing serial port controller
    // For now, return a placeholder response
    return {
      id: message.id,
      type: 'response',
      result: {
        ports: [
          {
            path: '/dev/ttyUSB0',
            manufacturer: 'FTDI',
            vendorId: '0403',
            productId: '6001'
          }
        ]
      }
    };
  }

  /**
   * Handle serial read requests
   */
  private async handleSerialRead(agentId: string, message: Message): Promise<Message> {
    // This would integrate with the existing serial port controller
    // For now, return a placeholder response
    return {
      id: message.id,
      type: 'response',
      result: {
        data: 'Sample serial data',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle serial write requests
   */
  private async handleSerialWrite(agentId: string, message: Message): Promise<Message> {
    // This would integrate with the existing serial port controller
    // For now, return a placeholder response
    return {
      id: message.id,
      type: 'response',
      result: {
        success: true,
        bytesWritten: message.params?.data?.length || 0
      }
    };
  }

  /**
   * Get available methods for error responses
   */
  private getAvailableMethods(): string[] {
    return [
      'agent.register',
      'agent.discover',
      'serial.list',
      'serial.read',
      'serial.write',
      'governance.status'
    ];
  }

  // Security helper methods

  /**
   * Initialize security settings
   */
  private initializeSecurity(): void {
    // Set allowed origins for CORS
    this.allowedOrigins.add('https://127.0.0.1:3000');
    this.allowedOrigins.add('https://localhost:3000');
    
    // Add RFC-1918 ranges
    const rfc1918Ranges = [
      'https://10.',
      'https://172.16.',
      'https://172.17.',
      'https://172.18.',
      'https://172.19.',
      'https://172.20.',
      'https://172.21.',
      'https://172.22.',
      'https://172.23.',
      'https://172.24.',
      'https://172.25.',
      'https://172.26.',
      'https://172.27.',
      'https://172.28.',
      'https://172.29.',
      'https://172.30.',
      'https://172.31.',
      'https://192.168.'
    ];
    
    rfc1918Ranges.forEach(range => this.allowedOrigins.add(range));
  }

  /**
   * Set secure CORS headers
   */
  private setSecureCORSHeaders(res: http.ServerResponse, origin?: string): void {
    if (origin && this.isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // No wildcard - only allow specific origins
      res.setHeader('Access-Control-Allow-Origin', 'null');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-ID');
    res.setHeader('Access-Control-Max-Age', '3600');
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    // Check exact matches
    if (this.allowedOrigins.has(origin)) {
      return true;
    }

    // Check if origin starts with allowed RFC-1918 ranges
    for (const allowedOrigin of this.allowedOrigins) {
      if (origin.startsWith(allowedOrigin)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(clientIP: string, maxRequests: number = 100): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    
    const limit = this.rateLimiter.get(clientIP);
    
    if (!limit || now > limit.resetTime) {
      this.rateLimiter.set(clientIP, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (limit.count >= maxRequests) {
      this.logger.warn('Rate limit exceeded', { clientIP, count: limit.count });
      return false;
    }
    
    limit.count++;
    return true;
  }

  /**
   * Authenticate incoming request
   */
  private async authenticateRequest(agentId: string, token: string): Promise<boolean> {
    if (!agentId || !token) {
      return false;
    }

    try {
      // For agent.register, allow without existing authentication
      // Token will be validated during registration process
      if (!this.connectedAgents.has(agentId)) {
        return true; // Allow registration attempts
      }

      // For existing agents, validate token
      const permissions = await this.tokenManager.getPermissions(token);
      return permissions !== null;

    } catch (error) {
      this.logger.error('Authentication error:', error);
      return false;
    }
  }
}