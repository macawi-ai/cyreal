/**
 * Network Server - Cybernetic Communication Layer
 * 
 * Port 3500 honors the Burroughs 3500 mainframe that Chile's Project Cybersyn
 * was upgraded to in 1973. This system implemented Stafford Beer's Viable System
 * Model for real-time economic cybernetics across an entire nation.
 * 
 * Like Cybersyn's telex network connecting factories to central coordination,
 * this server bridges serial ports to network clients, enabling distributed
 * cybernetic control of industrial systems.
 */

import * as net from 'net';
import * as dgram from 'dgram';
import * as http from 'http';
import * as https from 'https';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as winston from 'winston';
import { CyrealConfig } from '../config/config-manager';

export interface NetworkMetrics {
  tcpConnections: number;
  udpPackets: number;
  websocketConnections: number;
  bytesTransmitted: number;
  bytesReceived: number;
  uptime: number;
  startTime: Date;
}

export interface ClientInfo {
  id: string;
  address: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
  connectedAt: Date;
  authenticated: boolean;
  permissions: string[];
}

export class NetworkServer extends EventEmitter {
  private config: CyrealConfig;
  private logger: winston.Logger;
  private metrics: NetworkMetrics;
  
  // Server instances
  private tcpServer?: net.Server;
  private udpServer?: dgram.Socket;
  private httpServer?: http.Server | https.Server;
  private wsServer?: WebSocketServer;
  
  // Client tracking
  private clients: Map<string, ClientInfo> = new Map();
  private tcpSockets: Map<string, net.Socket> = new Map();
  private wsConnections: Map<string, any> = new Map();
  
  // Rate limiting
  private rateLimiter: Map<string, { requests: number; resetTime: number }> = new Map();
  private blacklist: Set<string> = new Set();

  constructor(config: CyrealConfig, logger: winston.Logger) {
    super();
    this.config = config;
    this.logger = logger;
    
    this.metrics = {
      tcpConnections: 0,
      udpPackets: 0,
      websocketConnections: 0,
      bytesTransmitted: 0,
      bytesReceived: 0,
      uptime: 0,
      startTime: new Date()
    };
    
    this.logger.info('Network server initialized', {
      tcpPort: this.config.network.tcp.port,
      cybersyn: 'Port 3500 honors Burroughs 3500 from Chile\'s Project Cybersyn (1973)',
      securityLevel: this.config.security.level
    });
  }

  async start(): Promise<void> {
    this.logger.info('Starting network services - Cybernetic communication layer');
    
    try {
      // Start TCP server (primary Cybersyn tribute)
      if (this.config.network.tcp.enabled) {
        await this.startTcpServer();
      }
      
      // Start UDP server
      if (this.config.network.udp.enabled) {
        await this.startUdpServer();
      }
      
      // Start WebSocket server
      if (this.config.network.websocket.enabled) {
        await this.startWebSocketServer();
      }
      
      // Start metrics collection
      this.startMetricsCollection();
      
      this.logger.info('Network services started successfully', {
        tcp: this.config.network.tcp.enabled ? this.config.network.tcp.port : 'disabled',
        udp: this.config.network.udp.enabled ? this.config.network.udp.port : 'disabled',
        websocket: this.config.network.websocket.enabled ? this.config.network.websocket.port : 'disabled'
      });
      
    } catch (error) {
      this.logger.error('Failed to start network services:', error);
      throw error;
    }
  }

  private async startTcpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tcpServer = net.createServer((socket) => {
        this.handleTcpConnection(socket);
      });
      
      this.tcpServer.listen(this.config.network.tcp.port, this.config.network.tcp.host, () => {
        this.logger.info('🇨🇱 TCP server listening on Cybersyn tribute port', {
          port: this.config.network.tcp.port,
          host: this.config.network.tcp.host,
          historical: 'Honoring Burroughs 3500 mainframe from Chile\'s Project Cybersyn',
          year: '1973',
          architect: 'Stafford Beer'
        });
        resolve();
      });
      
      this.tcpServer.on('error', (error) => {
        this.logger.error('TCP server error:', error);
        reject(error);
      });
      
      // Configure keep-alive
      if (this.config.network.tcp.keepAlive) {
        this.tcpServer.on('connection', (socket) => {
          socket.setKeepAlive(true, this.config.network.tcp.keepAliveDelay);
        });
      }
    });
  }

  private async startUdpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.udpServer = dgram.createSocket('udp4');
      
      this.udpServer.on('message', (msg, rinfo) => {
        this.handleUdpMessage(msg, rinfo);
      });
      
      this.udpServer.on('listening', () => {
        const address = this.udpServer!.address();
        this.logger.info('UDP server listening', {
          port: address?.port,
          address: address?.address
        });
        resolve();
      });
      
      this.udpServer.on('error', (error) => {
        this.logger.error('UDP server error:', error);
        reject(error);
      });
      
      this.udpServer.bind(this.config.network.udp.port, this.config.network.udp.host);
    });
  }

  private async startWebSocketServer(): Promise<void> {
    // Create HTTP/HTTPS server first
    if (this.config.network.ssl.enabled) {
      const options = {
        cert: fs.readFileSync(this.config.network.ssl.cert!),
        key: fs.readFileSync(this.config.network.ssl.key!),
        ca: this.config.network.ssl.ca ? fs.readFileSync(this.config.network.ssl.ca) : undefined
      };
      this.httpServer = https.createServer(options);
    } else {
      this.httpServer = http.createServer();
    }
    
    this.wsServer = new WebSocketServer({ 
      server: this.httpServer,
      path: this.config.network.websocket.path
    });
    
    this.wsServer.on('connection', (ws, request) => {
      this.handleWebSocketConnection(ws, request);
    });
    
    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.network.websocket.port, () => {
        this.logger.info('WebSocket server listening', {
          port: this.config.network.websocket.port,
          path: this.config.network.websocket.path,
          ssl: this.config.network.ssl.enabled
        });
        resolve();
      });
      
      this.httpServer!.on('error', reject);
    });
  }

  private handleTcpConnection(socket: net.Socket): void {
    const clientId = `tcp_${socket.remoteAddress}_${socket.remotePort}_${Date.now()}`;
    const clientInfo: ClientInfo = {
      id: clientId,
      address: socket.remoteAddress || 'unknown',
      port: socket.remotePort || 0,
      protocol: 'tcp',
      connectedAt: new Date(),
      authenticated: false,
      permissions: []
    };
    
    // Security checks
    if (!this.isConnectionAllowed(clientInfo.address)) {
      this.logger.warn('Connection rejected from blacklisted IP', { address: clientInfo.address });
      socket.destroy();
      return;
    }
    
    if (!this.checkRateLimit(clientInfo.address)) {
      this.logger.warn('Connection rejected due to rate limit', { address: clientInfo.address });
      socket.destroy();
      return;
    }
    
    this.clients.set(clientId, clientInfo);
    this.tcpSockets.set(clientId, socket);
    this.metrics.tcpConnections++;
    
    this.logger.info('New TCP connection established', {
      clientId,
      address: clientInfo.address,
      port: clientInfo.port,
      totalConnections: this.metrics.tcpConnections
    });
    
    // Send welcome message with Cybersyn context
    const welcomeMessage = JSON.stringify({
      type: 'welcome',
      message: 'Welcome to Cyreal - Cybernetic Serial Port Bridge',
      port: this.config.network.tcp.port,
      tribute: 'Port 3500 honors the Burroughs 3500 mainframe from Chile\'s Project Cybersyn (1973)',
      architect: 'Stafford Beer',
      capabilities: ['serial-bridge', 'vsm-governance', 'real-time-adaptation'],
      securityLevel: this.config.security.level,
      timestamp: new Date().toISOString()
    }) + '\n';
    
    socket.write(welcomeMessage);
    
    // Set up data handlers
    socket.on('data', (data) => {
      this.handleTcpData(clientId, data);
    });
    
    socket.on('close', () => {
      this.handleClientDisconnect(clientId);
    });
    
    socket.on('error', (error) => {
      this.logger.error('TCP socket error', { clientId, error });
      this.handleClientDisconnect(clientId);
    });
    
    // Emit connection event
    this.emit('client:connected', { clientId, clientInfo, protocol: 'tcp' });
  }

  private handleUdpMessage(message: Buffer, rinfo: dgram.RemoteInfo): void {
    const clientId = `udp_${rinfo.address}_${rinfo.port}`;
    
    // Security checks
    if (!this.isConnectionAllowed(rinfo.address)) {
      this.logger.warn('UDP message rejected from blacklisted IP', { address: rinfo.address });
      return;
    }
    
    if (!this.checkRateLimit(rinfo.address)) {
      this.logger.warn('UDP message rejected due to rate limit', { address: rinfo.address });
      return;
    }
    
    this.metrics.udpPackets++;
    this.metrics.bytesReceived += message.length;
    
    try {
      const data = JSON.parse(message.toString());
      this.emit('data:received', { 
        clientId, 
        data, 
        protocol: 'udp',
        address: rinfo.address,
        port: rinfo.port
      });
    } catch (error) {
      this.logger.warn('Invalid UDP message format', { 
        clientId, 
        error,
        messageLength: message.length
      });
    }
  }

  private handleWebSocketConnection(ws: any, request: http.IncomingMessage): void {
    const clientId = `ws_${request.socket.remoteAddress}_${Date.now()}`;
    const clientInfo: ClientInfo = {
      id: clientId,
      address: request.socket.remoteAddress || 'unknown',
      port: request.socket.remotePort || 0,
      protocol: 'websocket',
      connectedAt: new Date(),
      authenticated: false,
      permissions: []
    };
    
    // Security checks
    if (!this.isConnectionAllowed(clientInfo.address)) {
      ws.close(1008, 'Connection not allowed');
      return;
    }
    
    this.clients.set(clientId, clientInfo);
    this.wsConnections.set(clientId, ws);
    this.metrics.websocketConnections++;
    
    this.logger.info('New WebSocket connection established', {
      clientId,
      address: clientInfo.address,
      url: request.url
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'WebSocket connection to Cyreal established',
      clientId,
      timestamp: new Date().toISOString()
    }));
    
    ws.on('message', (data: Buffer) => {
      this.handleWebSocketData(clientId, data);
    });
    
    ws.on('close', () => {
      this.handleClientDisconnect(clientId);
    });
    
    ws.on('error', (error: Error) => {
      this.logger.error('WebSocket error', { clientId, error });
      this.handleClientDisconnect(clientId);
    });
    
    this.emit('client:connected', { clientId, clientInfo, protocol: 'websocket' });
  }

  private handleTcpData(clientId: string, data: Buffer): void {
    this.metrics.bytesReceived += data.length;
    
    try {
      const message = data.toString().trim();
      if (message) {
        const parsed = JSON.parse(message);
        this.emit('data:received', { clientId, data: parsed, protocol: 'tcp' });
      }
    } catch (error) {
      this.logger.warn('Invalid TCP message format', { clientId, error });
    }
  }

  private handleWebSocketData(clientId: string, data: Buffer): void {
    this.metrics.bytesReceived += data.length;
    
    try {
      const parsed = JSON.parse(data.toString());
      this.emit('data:received', { clientId, data: parsed, protocol: 'websocket' });
    } catch (error) {
      this.logger.warn('Invalid WebSocket message format', { clientId, error });
    }
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.logger.info('Client disconnected', {
        clientId,
        protocol: client.protocol,
        duration: Date.now() - client.connectedAt.getTime()
      });
      
      this.clients.delete(clientId);
      this.tcpSockets.delete(clientId);
      this.wsConnections.delete(clientId);
      
      this.emit('client:disconnected', { clientId, client });
    }
  }

  private isConnectionAllowed(address: string): boolean {
    // Check blacklist
    if (this.blacklist.has(address)) {
      return false;
    }
    
    // Check whitelist if configured
    if (this.config.security.allowedIPs.length > 0) {
      return this.config.security.allowedIPs.some(allowedIP => {
        if (allowedIP.includes('/')) {
          // CIDR notation support would go here
          return false; // Simplified for now
        }
        return allowedIP === address;
      });
    }
    
    return true;
  }

  private checkRateLimit(address: string): boolean {
    if (!this.config.security.rateLimit.enabled) {
      return true;
    }
    
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const limit = this.config.security.rateLimit.requestsPerMinute;
    
    const clientLimit = this.rateLimiter.get(address);
    
    if (!clientLimit || now > clientLimit.resetTime) {
      this.rateLimiter.set(address, { requests: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (clientLimit.requests >= limit) {
      // Add to blacklist for configured duration
      this.blacklist.add(address);
      setTimeout(() => {
        this.blacklist.delete(address);
      }, this.config.security.rateLimit.blacklistDuration);
      
      return false;
    }
    
    clientLimit.requests++;
    return true;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.metrics.uptime = Date.now() - this.metrics.startTime.getTime();
      this.emit('metrics:updated', this.metrics);
    }, 10000); // Update every 10 seconds
  }

  // Public methods for sending data to clients
  public sendToClient(clientId: string, data: any): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }
    
    const message = JSON.stringify(data);
    const messageBytes = Buffer.byteLength(message);
    
    try {
      switch (client.protocol) {
        case 'tcp':
          const socket = this.tcpSockets.get(clientId);
          if (socket && !socket.destroyed) {
            socket.write(message + '\n');
            this.metrics.bytesTransmitted += messageBytes;
            return true;
          }
          break;
          
        case 'websocket':
          const ws = this.wsConnections.get(clientId);
          if (ws && ws.readyState === 1) { // WebSocket.OPEN
            ws.send(message);
            this.metrics.bytesTransmitted += messageBytes;
            return true;
          }
          break;
      }
    } catch (error) {
      this.logger.error('Failed to send data to client', { clientId, error });
    }
    
    return false;
  }

  public broadcast(data: any, excludeClient?: string): number {
    let sentCount = 0;
    
    for (const [clientId] of this.clients) {
      if (clientId !== excludeClient) {
        if (this.sendToClient(clientId, data)) {
          sentCount++;
        }
      }
    }
    
    return sentCount;
  }

  public getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  public getClients(): ClientInfo[] {
    return Array.from(this.clients.values());
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping network services');
    
    // Close all client connections
    for (const [clientId] of this.clients) {
      this.handleClientDisconnect(clientId);
    }
    
    // Close servers
    const closePromises: Promise<void>[] = [];
    
    if (this.tcpServer) {
      closePromises.push(new Promise(resolve => {
        this.tcpServer!.close(() => resolve());
      }));
    }
    
    if (this.udpServer) {
      closePromises.push(new Promise(resolve => {
        this.udpServer!.close(() => resolve());
      }));
    }
    
    if (this.httpServer) {
      closePromises.push(new Promise(resolve => {
        this.httpServer!.close(() => resolve());
      }));
    }
    
    await Promise.all(closePromises);
    this.logger.info('Network services stopped');
  }
}