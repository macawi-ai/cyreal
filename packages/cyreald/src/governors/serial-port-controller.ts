/**
 * Serial Port Controller Governor - System 1
 * Direct control of physical serial ports with platform optimization
 */

import { SerialPort } from 'serialport';
import {
  SystemLevel,
  GovernorDomain,
  ProbeResult,
  SensorData,
  Analysis,
  Action,
  Outcome,
  ValidationResult,
  ICyrealPort,
  PortOptions,
  PortStatus,
  PortCapabilities,
  DeviceFingerprint,
  PortMetrics,
  IGpioController
} from '@cyreal/core';
import { BaseGovernor } from './base-governor';

export class SerialPortController extends BaseGovernor implements ICyrealPort {
  private serialPort?: SerialPort;
  private rs485Controller?: IGpioController;
  private buffer: Buffer = Buffer.alloc(0);
  private portMetrics: PortMetrics;
  private deviceFingerprint?: DeviceFingerprint;
  private lastBaudRateTest: Date = new Date();
  
  constructor(
    public readonly id: string,
    public readonly physicalPath: string,
    public readonly type: 'rs232' | 'rs485' | 'usb-serial' | 'ttl',
    public readonly capabilities: PortCapabilities
  ) {
    super(
      `SerialPortController_${id}`,
      SystemLevel.OPERATIONAL,
      GovernorDomain.SERIAL_PORT
    );
    
    this.portMetrics = {
      bytesReceived: 0,
      bytesTransmitted: 0,
      errorsCount: 0,
      lastActivity: new Date(),
      uptime: 0
    };
    
    this.logger.info('Serial port controller initialized', {
      id,
      physicalPath,
      type,
      platform: this.platform.info.name
    });
  }
  
  get status(): PortStatus {
    if (!this.serialPort || !this.serialPort.isOpen) {
      return PortStatus.STANDBY;
    }
    
    const timeSinceActivity = Date.now() - this.portMetrics.lastActivity.getTime();
    
    if (this.portMetrics.errorsCount > 10) {
      return PortStatus.ERROR;
    }
    
    if (timeSinceActivity > 300000) { // 5 minutes
      return PortStatus.WARNING;
    }
    
    return PortStatus.OPERATIONAL;
  }
  
  get fingerprint(): DeviceFingerprint | undefined {
    return this.deviceFingerprint;
  }
  
  /**
   * Open the serial port with platform-optimized settings
   */
  async open(options: PortOptions): Promise<void> {
    try {
      const platformOptions = {
        ...options,
        ...this.platform.getPlatformSerialOptions()
      };
      
      // Platform-specific optimizations
      if (this.platform.info.name === 'Banana Pi BPI-M7') {
        // RK3588 can handle higher buffer sizes
        platformOptions.highWaterMark = this.platform.getOptimalBufferSize();
      }
      
      this.serialPort = new SerialPort({
        path: this.physicalPath,
        baudRate: platformOptions.baudRate,
        dataBits: platformOptions.dataBits || 8,
        stopBits: platformOptions.stopBits || 1,
        parity: platformOptions.parity || 'none',
        autoOpen: false,
        ...platformOptions
      });
      
      // Set up RS-485 if enabled
      if (options.rs485?.enabled && this.capabilities.rs485?.enabled) {
        await this.setupRS485(options.rs485, platformOptions);
      }
      
      await new Promise<void>((resolve, reject) => {
        this.serialPort!.open((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      
      this.setupEventHandlers();
      this.detectDevice();
      
      this.logger.info('Serial port opened successfully', {
        path: this.physicalPath,
        options: platformOptions
      });
      
      this.emit('port:opened', { id: this.id, options });
      
    } catch (error) {
      this.logger.error('Failed to open serial port:', error);
      throw error;
    }
  }
  
  /**
   * Close the serial port
   */
  async close(): Promise<void> {
    if (this.rs485Controller) {
      try {
        await this.rs485Controller.unexport();
      } catch (error) {
        this.logger.warn('GPIO unexport failed:', error);
      }
      this.rs485Controller = undefined;
    }
    
    if (this.serialPort && this.serialPort.isOpen) {
      await new Promise<void>((resolve) => {
        this.serialPort!.close(() => resolve());
      });
    }
    
    this.emit('port:closed', { id: this.id });
  }
  
  /**
   * Write data to the port with RS-485 control
   */
  async write(data: Buffer): Promise<void> {
    if (!this.serialPort || !this.serialPort.isOpen) {
      throw new Error('Port not open');
    }
    
    try {
      // RS-485 transmit enable
      if (this.rs485Controller) {
        await this.rs485Controller.write(1);
        // Platform-specific delay
        if (this.platform.info.name === 'BeagleBone AI-64') {
          // BeagleBone PRU can provide precise timing
          await this.sleep(0.1); // 100μs
        } else {
          await this.sleep(1); // 1ms fallback
        }
      } else if (this.platform.info.name === 'Windows' && this.type === 'rs485') {
        // Windows uses RTS/DTR for RS-485 control
        this.serialPort!.set({ rts: true });
      }
      
      await new Promise<void>((resolve, reject) => {
        this.serialPort!.write(data, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      
      // Wait for transmission to complete
      await this.serialPort.drain();
      
      // RS-485 receive enable
      if (this.rs485Controller) {
        await this.sleep(1); // Brief delay
        await this.rs485Controller.write(0);
      } else if (this.platform.info.name === 'Windows' && this.type === 'rs485') {
        // Windows uses RTS/DTR for RS-485 control
        this.serialPort!.set({ rts: false });
      }
      
      this.portMetrics.bytesTransmitted += data.length;
      this.portMetrics.lastActivity = new Date();
      
      this.emit('data:transmitted', { 
        id: this.id, 
        bytes: data.length,
        platform: this.platform.info.name
      });
      
    } catch (error) {
      this.portMetrics.errorsCount++;
      this.logger.error('Write failed:', error);
      throw error;
    }
  }
  
  /**
   * Read data from the port (async iterator)
   */
  async *read(): AsyncIterator<Buffer> {
    if (!this.serialPort || !this.serialPort.isOpen) {
      throw new Error('Port not open');
    }
    
    const dataQueue: Buffer[] = [];
    let resolveNext: ((value: Buffer) => void) | null = null;
    
    const dataHandler = (data: Buffer) => {
      this.portMetrics.bytesReceived += data.length;
      this.portMetrics.lastActivity = new Date();
      
      if (resolveNext) {
        resolveNext(data);
        resolveNext = null;
      } else {
        dataQueue.push(data);
      }
    };
    
    this.serialPort.on('data', dataHandler);
    
    try {
      while (this.serialPort.isOpen) {
        if (dataQueue.length > 0) {
          yield dataQueue.shift()!;
        } else {
          yield await new Promise<Buffer>((resolve) => {
            resolveNext = resolve;
          });
        }
      }
    } finally {
      this.serialPort.off('data', dataHandler);
    }
  }
  
  getMetrics(): PortMetrics {
    return {
      ...this.portMetrics,
      uptime: Date.now() - this.portMetrics.lastActivity.getTime()
    };
  }
  
  async updateOptions(options: Partial<PortOptions>): Promise<void> {
    if (!this.serialPort || !this.serialPort.isOpen) {
      throw new Error('Port not open');
    }
    
    // Update baud rate if specified
    if (options.baudRate) {
      await this.serialPort.update({ baudRate: options.baudRate });
      this.logger.info('Baud rate updated', { 
        newRate: options.baudRate,
        platform: this.platform.info.name
      });
    }
  }
  
  async flush(): Promise<void> {
    if (this.serialPort) {
      return this.serialPort.flush();
    }
  }
  
  async drain(): Promise<void> {
    if (this.serialPort) {
      return this.serialPort.drain();
    }
  }
  
  /**
   * Governor-specific probe implementation
   */
  protected async specificProbe(): Promise<Partial<ProbeResult>> {
    const state: any = {
      physicalPath: this.physicalPath,
      type: this.type,
      isOpen: this.serialPort?.isOpen || false,
      rs485Enabled: !!this.rs485Controller
    };
    
    // Platform-specific probing
    if (this.platform.info.name === 'BeagleBone AI-64') {
      state.mikroeClickSupport = true;
      state.pruAvailable = this.platform.info.specialFeatures?.includes('pru');
    }
    
    if (this.platform.info.name === 'Banana Pi BPI-M7') {
      state.npuAvailable = this.platform.info.specialFeatures?.includes('npu_6tops');
      state.highSpeedCapable = true;
    }
    
    return {
      state,
      capabilities: [
        'serial_communication',
        this.type === 'rs485' ? 'multidrop_bus' : 'point_to_point',
        `platform_${this.platform.info.name.toLowerCase().replace(/\s+/g, '_')}`
      ]
    };
  }
  
  protected specificSense(data: SensorData): Partial<Analysis> {
    const patterns: string[] = [];
    const recommendations: string[] = [];
    
    // Detect baud rate issues
    if (data.metrics.errorRate > 0.05) {
      patterns.push('high_error_rate');
      recommendations.push('test_lower_baud_rate');
    }
    
    // Platform-specific sensing
    if (this.platform.info.name === 'Raspberry Pi 5' && 
        data.metrics.latencyMs > 10) {
      patterns.push('rp1_optimization_needed');
      recommendations.push('adjust_rp1_settings');
    }
    
    return { patterns, recommendations };
  }
  
  protected async specificRespond(analysis: Analysis): Promise<Action> {
    // Test baud rate if high error rate detected
    if (analysis.patterns.includes('high_error_rate')) {
      return {
        type: 'test_baud_rates',
        target: this.id,
        parameters: { 
          currentRate: this.serialPort?.baudRate,
          testRates: [9600, 38400, 115200]
        },
        priority: 'immediate'
      };
    }
    
    // Platform-specific responses
    if (analysis.patterns.includes('rp1_optimization_needed')) {
      return {
        type: 'optimize_rp1',
        target: this.id,
        parameters: { platform: 'raspberry_pi_5' },
        priority: 'normal'
      };
    }
    
    return {
      type: 'monitor',
      target: this.id,
      parameters: {},
      priority: 'deferred'
    };
  }
  
  protected specificLearn(outcome: Outcome): void {
    // Learn optimal baud rates for different platforms
    if (outcome.action.type === 'test_baud_rates' && outcome.success) {
      const platform = this.platform.info.name;
      const optimalRates = this.learningData.get(`optimal_rates_${platform}`) || [];
      optimalRates.push(outcome.action.parameters.currentRate);
      this.learningData.set(`optimal_rates_${platform}`, optimalRates);
    }
  }
  
  protected specificValidate(): Partial<ValidationResult> {
    const issues: string[] = [];
    let health = 100;
    
    if (this.portMetrics.errorsCount > 5) {
      issues.push('high_error_count');
      health -= 20;
    }
    
    if (!this.serialPort?.isOpen) {
      issues.push('port_not_open');
      health -= 50;
    }
    
    return { issues, health };
  }
  
  /**
   * Set up RS-485 control with platform-specific GPIO
   */
  private async setupRS485(options: NonNullable<PortOptions['rs485']>, portOptions: any): Promise<void> {
    // Windows uses hardware flow control instead of GPIO
    if (this.platform.info.name === 'Windows') {
      this.logger.info('RS-485 control via RTS/DTR on Windows', {
        platform: this.platform.info.name
      });
      // Enable hardware flow control for RS-485
      portOptions.rtscts = true;
      return;
    }
    
    if (!options.rtsPin) {
      throw new Error('RS-485 RTS pin not specified');
    }
    
    try {
      this.rs485Controller = await this.platform.createGpioController(options.rtsPin);
      if (!this.rs485Controller) {
        this.logger.warn('GPIO controller not available, falling back to software control');
        return;
      }
      
      // Start in receive mode
      await this.rs485Controller.write(0);
      
      this.logger.info('RS-485 control initialized', {
        pin: options.rtsPin,
        platform: this.platform.info.name
      });
      
    } catch (error) {
      this.logger.error('RS-485 setup failed:', error);
      // Don't throw - fall back to software control
      this.logger.warn('Falling back to software RS-485 control');
    }
  }
  
  private setupEventHandlers(): void {
    if (!this.serialPort) return;
    
    this.serialPort.on('error', (error) => {
      this.portMetrics.errorsCount++;
      this.logger.error('Serial port error:', error);
      this.emit('port:error', { id: this.id, error });
    });
    
    this.serialPort.on('close', () => {
      this.logger.info('Serial port closed');
      this.emit('port:closed', { id: this.id });
    });
  }
  
  private async detectDevice(): Promise<void> {
    // Try to detect device characteristics
    try {
      const info = await SerialPort.list();
      const thisPort = info.find(p => p.path === this.physicalPath);
      
      if (thisPort) {
        this.deviceFingerprint = {
          vendorId: thisPort.vendorId,
          productId: thisPort.productId,
          serialNumber: thisPort.serialNumber,
          manufacturer: thisPort.manufacturer,
          deviceType: `${thisPort.manufacturer || 'Unknown'}_${thisPort.productId || 'Device'}`,
          lastSeen: new Date()
        };
        
        this.emit('device:detected', {
          id: this.id,
          fingerprint: this.deviceFingerprint
        });
      }
    } catch (error) {
      this.logger.warn('Device detection failed:', error);
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}