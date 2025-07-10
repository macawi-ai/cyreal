/**
 * Cyreald main entry point
 * Cybernetic serial port daemon with platform awareness
 */

import { SerialPortController } from './governors/serial-port-controller';
import { PlatformAdapter } from './serial/platform-adapter';
import { NetworkServer } from './network/network-server';
import { PortCapabilities, getLogPath } from '@cyreal/core';
import { CyrealConfig } from './config/config-manager';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

export class Cyreald {
  private logger: winston.Logger;
  private platform: PlatformAdapter;
  private networkServer?: NetworkServer;
  private portControllers: Map<string, SerialPortController> = new Map();
  private config: CyrealConfig;
  private isStarted: boolean = false;
  
  constructor(config?: CyrealConfig) {
    this.platform = PlatformAdapter.getInstance();
    
    // Use provided config or create default
    if (config) {
      this.config = config;
    } else {
      // Default config for backwards compatibility
      this.config = {
        daemon: { logLevel: 'info', workingDirectory: '.', hotReload: true },
        network: { tcp: { enabled: true, port: 3500, host: '0.0.0.0', maxConnections: 10, keepAlive: true, keepAliveDelay: 60000 }, udp: { enabled: false, port: 3501, host: '0.0.0.0', broadcast: false }, websocket: { enabled: false, port: 3502, path: '/ws', compression: true }, ssl: { enabled: false, rejectUnauthorized: true } },
        security: { level: 'balanced', allowedIPs: [], rateLimit: { enabled: true, requestsPerMinute: 60, blacklistDuration: 3600000 }, audit: { enabled: true, events: ['auth', 'error', 'config'] } },
        ports: { default: { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none', bufferSize: 2048, timeout: 5000 }, specific: {} },
        governors: { operational: { probeInterval: 5000, errorThreshold: 10, retryAttempts: 3, retryDelay: 1000 }, coordination: { conflictResolution: 'priority', loadBalancing: false }, management: { autoRecover: true, healthCheckInterval: 30000, failureThreshold: 3 }, intelligence: { learning: true, predictionEnabled: false }, meta: { telemetry: false, cloudSync: false, reportingInterval: 300000 } },
        chaos: { enabled: false, scenarios: [], interval: 60000, intensity: 'low' }
      } as CyrealConfig;
    }
    
    this.logger = this.createLogger();
    
    this.logger.info('Cyreald initializing', {
      platform: this.platform.info.name,
      arch: this.platform.info.arch,
      features: this.platform.info.specialFeatures
    });
  }
  
  private createLogger(): winston.Logger {
    const logLevel = this.config.daemon.logLevel;
    const logFile = this.config.daemon.logFile || getLogPath('cyreald.log');
    
    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [CYREALD] ${level}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: logFile
        })
      ]
    });
  }
  
  /**
   * Create a new serial port controller
   */
  async createPort(
    portId: string, 
    physicalPath: string, 
    type: 'rs232' | 'rs485' | 'usb-serial' | 'ttl' = 'usb-serial'
  ): Promise<SerialPortController> {
    
    // Get platform-specific capabilities
    const capabilities = await this.platform.getPortCapabilities(physicalPath);
    
    // Platform-specific enhancements
    if (this.platform.info.name === 'BeagleBone AI-64' && type === 'rs485') {
      this.logger.info('Configuring BeagleBone AI-64 for RS-485 with Mikroe Click');
      // Mikroe Click boards have standardized pinout
      if (capabilities.rs485) {
        capabilities.rs485.rtsPin = 78; // Standard Mikroe Click RTS pin
      }
    }
    
    if (this.platform.info.name === 'Banana Pi BPI-M7') {
      this.logger.info('Optimizing for RK3588 high-speed capabilities');
      // RK3588 can handle very high baud rates
      capabilities.baudRates.push(6000000);
    }
    
    if (this.platform.info.name === 'Raspberry Pi 5') {
      this.logger.info('Configuring for RP1 chip optimizations');
      // Pi 5's RP1 chip improvements
      capabilities.electricalMonitoring = true;
    }
    
    const controller = new SerialPortController(
      portId,
      physicalPath,
      type,
      capabilities
    );
    
    // Set up event handlers for cybernetic monitoring
    this.setupControllerEvents(controller);
    
    this.portControllers.set(portId, controller);
    
    this.logger.info('Serial port controller created', {
      portId,
      physicalPath,
      type,
      platform: this.platform.info.name,
      capabilities: Object.keys(capabilities)
    });
    
    return controller;
  }
  
  /**
   * Remove a port controller
   */
  async removePort(portId: string): Promise<void> {
    const controller = this.portControllers.get(portId);
    if (controller) {
      await controller.close();
      this.portControllers.delete(portId);
      this.logger.info('Port controller removed', { portId });
    }
  }
  
  /**
   * Get all active port controllers
   */
  getPortControllers(): SerialPortController[] {
    return Array.from(this.portControllers.values());
  }
  
  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('Daemon already started');
      return;
    }
    
    this.logger.info('Starting Cyreald daemon', {
      platform: this.platform.info,
      cybersyn: 'Port 3500 honors Project Cybersyn (1973)'
    });
    
    // Initialize platform detection with virtualization
    await this.platform.initialize();
    
    // Start network server (Cybersyn tribute)
    this.networkServer = new NetworkServer(this.config, this.logger);
    await this.networkServer.start();
    
    // Set up network event handlers
    this.setupNetworkEvents();
    
    // Platform-specific startup procedures
    await this.startPlatformOptimizations();
    
    // Virtualization-specific adjustments
    if (this.platform.info.virtualization?.isVirtualized) {
      await this.startVirtualizationOptimizations();
    }
    
    this.isStarted = true;
    this.logger.info('Cyreald daemon started successfully', {
      tcp: this.config.network.tcp.enabled ? this.config.network.tcp.port : 'disabled',
      udp: this.config.network.udp.enabled ? this.config.network.udp.port : 'disabled',
      websocket: this.config.network.websocket.enabled ? this.config.network.websocket.port : 'disabled'
    });
  }
  
  /**
   * Stop the daemon
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }
    
    this.logger.info('Stopping Cyreald daemon');
    
    // Stop network server
    if (this.networkServer) {
      await this.networkServer.stop();
      this.networkServer = undefined;
    }
    
    // Close all port controllers
    for (const [portId, controller] of this.portControllers) {
      await controller.close();
    }
    
    this.portControllers.clear();
    this.isStarted = false;
    this.logger.info('Cyreald daemon stopped');
  }
  
  /**
   * Get daemon status with platform info
   */
  getStatus() {
    return {
      platform: this.platform.info,
      activePorts: this.portControllers.size,
      isStarted: this.isStarted,
      config: {
        tcpPort: this.config.network.tcp.port,
        securityLevel: this.config.security.level,
        logLevel: this.config.daemon.logLevel
      },
      network: this.networkServer ? {
        metrics: this.networkServer.getMetrics(),
        clients: this.networkServer.getClients().length,
        protocols: {
          tcp: this.config.network.tcp.enabled,
          udp: this.config.network.udp.enabled,
          websocket: this.config.network.websocket.enabled
        }
      } : null,
      portControllers: Array.from(this.portControllers.entries()).map(([id, controller]) => ({
        id,
        status: controller.status,
        metrics: controller.getMetrics(),
        type: controller.type,
        physicalPath: controller.physicalPath
      }))
    };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): CyrealConfig {
    return { ...this.config };
  }
  
  
  /**
   * Set up network event handlers
   */
  private setupNetworkEvents(): void {
    if (!this.networkServer) return;
    
    // Client connection events
    this.networkServer.on('client:connected', (event) => {
      this.logger.info('Network client connected', {
        clientId: event.clientId,
        protocol: event.protocol,
        address: event.clientInfo.address,
        port: event.clientInfo.port,
        cybersyn: 'Connected to Project Cybersyn tribute port 3500'
      });
    });
    
    this.networkServer.on('client:disconnected', (event) => {
      this.logger.info('Network client disconnected', {
        clientId: event.clientId,
        protocol: event.client.protocol,
        duration: Date.now() - event.client.connectedAt.getTime()
      });
    });
    
    // Data received from network clients
    this.networkServer.on('data:received', (event) => {
      this.handleNetworkCommand(event.clientId, event.data, event.protocol);
    });
    
    // Metrics updates
    this.networkServer.on('metrics:updated', (metrics) => {
      this.logger.debug('Network metrics updated', {
        tcpConnections: metrics.tcpConnections,
        udpPackets: metrics.udpPackets,
        websocketConnections: metrics.websocketConnections,
        bytesTransmitted: metrics.bytesTransmitted,
        bytesReceived: metrics.bytesReceived,
        uptime: metrics.uptime
      });
    });
  }
  
  /**
   * Handle commands received from network clients
   */
  private handleNetworkCommand(clientId: string, data: any, protocol: string): void {
    try {
      const { command, portId, params } = data;
      
      switch (command) {
        case 'list_ports':
          this.sendPortList(clientId);
          break;
          
        case 'port_status':
          this.sendPortStatus(clientId, portId);
          break;
          
        case 'send_data':
          this.sendDataToPort(clientId, portId, params.data);
          break;
          
        case 'daemon_status':
          this.sendDaemonStatus(clientId);
          break;
          
        default:
          this.sendError(clientId, `Unknown command: ${command}`);
      }
    } catch (error) {
      this.logger.error('Error handling network command', { clientId, error });
      this.sendError(clientId, 'Invalid command format');
    }
  }
  
  private sendPortList(clientId: string): void {
    const ports = Array.from(this.portControllers.entries()).map(([id, controller]) => ({
      id,
      physicalPath: controller.physicalPath,
      type: controller.type,
      status: controller.status,
      metrics: controller.getMetrics()
    }));
    
    this.networkServer?.sendToClient(clientId, {
      type: 'port_list',
      ports,
      timestamp: new Date().toISOString()
    });
  }
  
  private sendPortStatus(clientId: string, portId: string): void {
    const controller = this.portControllers.get(portId);
    
    if (!controller) {
      this.sendError(clientId, `Port not found: ${portId}`);
      return;
    }
    
    this.networkServer?.sendToClient(clientId, {
      type: 'port_status',
      portId,
      status: controller.status,
      metrics: controller.getMetrics(),
      // fingerprint removed - pending manufacturer consultation
      timestamp: new Date().toISOString()
    });
  }
  
  private async sendDataToPort(clientId: string, portId: string, data: string): Promise<void> {
    const controller = this.portControllers.get(portId);
    
    if (!controller) {
      this.sendError(clientId, `Port not found: ${portId}`);
      return;
    }
    
    try {
      await controller.write(Buffer.from(data));
      this.networkServer?.sendToClient(clientId, {
        type: 'data_sent',
        portId,
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.sendError(clientId, `Failed to send data: ${error}`);
    }
  }
  
  private sendDaemonStatus(clientId: string): void {
    this.networkServer?.sendToClient(clientId, {
      type: 'daemon_status',
      ...this.getStatus(),
      timestamp: new Date().toISOString()
    });
  }
  
  private sendError(clientId: string, message: string): void {
    this.networkServer?.sendToClient(clientId, {
      type: 'error',
      message,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Set up cybernetic event monitoring for controllers
   */
  private setupControllerEvents(controller: SerialPortController): void {
    // Learning events
    controller.on('learning:complete', (data) => {
      this.logger.debug('Governor learning completed', {
        governor: controller.name,
        learningCycles: data.metrics.learningCycles,
        platform: this.platform.info.name
      });
    });
    
    // Error events
    controller.on('port:error', (data) => {
      this.logger.error('Port error detected', {
        portId: data.id,
        error: data.error,
        platform: this.platform.info.name
      });
    });
    
    // Device detection events
    controller.on('device:detected', (data) => {
      this.logger.info('Device detected on port', {
        portId: data.id,
        // fingerprint removed - pending manufacturer consultation
        platform: this.platform.info.name
      });
    });
    
    // Performance monitoring
    controller.on('data:transmitted', (data) => {
      if (data.bytes > 1000) { // Log large transfers
        this.logger.info('Large data transmission', {
          portId: data.id,
          bytes: data.bytes,
          platform: data.platform
        });
      }
    });
  }
  
  /**
   * BeagleBone AI-64 specific optimizations
   */
  private async startBeagleBoneOptimizations(): Promise<void> {
    this.logger.info('Applying BeagleBone AI-64 optimizations');
    
    // Configure PRU for precise timing if available
    if (this.platform.info.specialFeatures?.includes('pru')) {
      this.logger.info('PRU subsystem available for precision timing');
      // Could load PRU firmware for microsecond-precision RS-485 control
    }
    
    // Mikroe Click board detection
    if (this.platform.info.specialFeatures?.includes('mikrobus')) {
      this.logger.info('MikroE Click socket available for expansion boards');
    }
  }
  
  /**
   * Banana Pi BPI-M7 specific optimizations
   */
  private async startBananaPiOptimizations(): Promise<void> {
    this.logger.info('Applying Banana Pi BPI-M7 optimizations');
    
    // NPU could be used for pattern recognition in serial data
    if (this.platform.info.specialFeatures?.includes('npu_6tops')) {
      this.logger.info('6 TOPS NPU available for AI-enhanced pattern recognition');
      // Could implement intelligent protocol detection
    }
    
    // High-speed serial optimizations for RK3588
    this.logger.info('Configuring high-speed serial capabilities');
  }
  
  /**
   * Raspberry Pi 5 specific optimizations
   */
  private async startRaspberryPiOptimizations(): Promise<void> {
    this.logger.info('Applying Raspberry Pi 5 optimizations');
    
    // RP1 chip provides improved I/O capabilities
    if (this.platform.info.specialFeatures?.includes('rp1_chip')) {
      this.logger.info('RP1 I/O controller available for enhanced serial performance');
    }
    
    // PCIe available for high-speed expansion
    if (this.platform.info.specialFeatures?.includes('pcie')) {
      this.logger.info('PCIe available for high-speed serial expansion cards');
    }
  }
  
  /**
   * Unified platform optimization dispatcher
   */
  private async startPlatformOptimizations(): Promise<void> {
    switch (this.platform.info.name) {
      case 'BeagleBone AI-64':
        await this.startBeagleBoneOptimizations();
        break;
      case 'Banana Pi BPI-M7':
        await this.startBananaPiOptimizations();
        break;
      case 'Raspberry Pi 5':
        await this.startRaspberryPiOptimizations();
        break;
      default:
        this.logger.info('Using generic platform configuration');
    }
  }
  
  /**
   * Virtualization-specific optimizations
   */
  private async startVirtualizationOptimizations(): Promise<void> {
    const virtInfo = this.platform.info.virtualization!;
    
    this.logger.info('Applying virtualization optimizations', {
      hypervisor: virtInfo.hypervisor,
      platform: virtInfo.platform,
      confidence: virtInfo.confidence
    });
    
    // Log limitations and recommendations
    if (virtInfo.limitations.length > 0) {
      this.logger.warn('Virtualization limitations detected:', {
        limitations: virtInfo.limitations
      });
    }
    
    if (virtInfo.recommendations.length > 0) {
      this.logger.info('Virtualization recommendations:', {
        recommendations: virtInfo.recommendations
      });
    }
    
    // Adjust governor settings for virtualized environment
    switch (virtInfo.hypervisor) {
      case 'VMware':
        await this.optimizeForVMware(virtInfo);
        break;
      case 'Hyper-V':
        await this.optimizeForHyperV(virtInfo);
        break;
      case 'VirtualBox':
        await this.optimizeForVirtualBox(virtInfo);
        break;
      case 'QEMU/KVM':
        await this.optimizeForQEMU(virtInfo);
        break;
      case 'Docker':
        await this.optimizeForDocker(virtInfo);
        break;
      case 'WSL':
        await this.optimizeForWSL(virtInfo);
        break;
      default:
        this.logger.info('Using generic virtualization optimizations');
    }
  }
  
  private async optimizeForVMware(virtInfo: any): Promise<void> {
    this.logger.info('Optimizing for VMware environment');
    
    // Increase buffer sizes for VMware's emulated serial ports
    // Adjust timing tolerances
    // Disable features that require precise timing
  }
  
  private async optimizeForHyperV(virtInfo: any): Promise<void> {
    this.logger.info('Optimizing for Hyper-V environment');
    
    // Configure for COM port redirection
    // Adjust for Windows host integration
  }
  
  private async optimizeForVirtualBox(virtInfo: any): Promise<void> {
    this.logger.info('Optimizing for VirtualBox environment');
    
    // Configure for USB passthrough
    // Adjust for lower timing precision
  }
  
  private async optimizeForQEMU(virtInfo: any): Promise<void> {
    this.logger.info('Optimizing for QEMU/KVM environment');
    
    // Configure for virtio-serial if available
    // Adjust for variable timing
  }
  
  private async optimizeForDocker(virtInfo: any): Promise<void> {
    this.logger.info('Optimizing for Docker container environment');
    
    // Configure for device mapping
    // Maintain good timing precision (containers are lightweight)
  }
  
  private async optimizeForWSL(virtInfo: any): Promise<void> {
    this.logger.info('Optimizing for WSL environment');
    
    // Recommend network-based serial bridge
    // Disable GPIO-dependent features
    this.logger.warn('WSL detected: Direct serial port access not available');
    this.logger.info('Consider using usbipd-win for USB device access');
  }
}

// Export for use as a library
export * from './governors/serial-port-controller';
export * from './serial/platform-adapter';
export { PlatformAdapter };