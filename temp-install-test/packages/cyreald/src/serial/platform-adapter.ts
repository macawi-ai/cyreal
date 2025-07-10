/**
 * Platform-specific serial port adapter
 * Handles differences between SBC platforms
 */

import { SerialPort } from 'serialport';
import { ICyrealPort, PortCapabilities, SerialPortType, IGpioController } from '@cyreal/core';
import { VirtualizationDetector, VirtualizationInfo } from '../platform/virtualization-detector';
import * as os from 'os';
import * as fs from 'fs';
import * as winston from 'winston';

export interface PlatformInfo {
  name: string;
  arch: string;
  gpioChip?: string;
  serialPrefix: string[];
  rs485Capable: boolean;
  specialFeatures?: string[];
  virtualization?: VirtualizationInfo;
  timingPrecision: 'high' | 'medium' | 'low';
  recommendedBufferSize: number;
  gpioRestrictions?: string[];
}

export class PlatformAdapter {
  private static instance: PlatformAdapter;
  private platformInfo: PlatformInfo;
  private virtualizationDetector: VirtualizationDetector;
  private logger: winston.Logger;
  
  private constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [new winston.transports.Console()]
    });
    this.virtualizationDetector = new VirtualizationDetector(this.logger);
    this.platformInfo = this.detectPlatform();
  }
  
  static getInstance(): PlatformAdapter {
    if (!this.instance) {
      this.instance = new PlatformAdapter();
    }
    return this.instance;
  }
  
  /**
   * Initialize with virtualization detection
   */
  async initialize(): Promise<void> {
    if (this.platformInfo.virtualization) {
      return; // Already initialized
    }
    
    try {
      this.logger.info('Detecting virtualization environment...');
      const virtInfo = await this.virtualizationDetector.detect();
      
      // Update platform info with virtualization details
      this.platformInfo = {
        ...this.platformInfo,
        virtualization: virtInfo
      };
      
      // Adjust capabilities based on virtualization
      this.adjustForVirtualization(virtInfo);
      
      this.logger.info('Platform detection complete', {
        platform: this.platformInfo.name,
        virtualized: virtInfo.isVirtualized,
        hypervisor: virtInfo.hypervisor,
        timingPrecision: this.platformInfo.timingPrecision,
        recommendedBufferSize: this.platformInfo.recommendedBufferSize
      });
      
    } catch (error) {
      this.logger.error('Virtualization detection failed:', error);
      // Continue with basic platform info
    }
  }
  
  /**
   * Adjust platform capabilities based on virtualization
   */
  private adjustForVirtualization(virtInfo: VirtualizationInfo): void {
    if (!virtInfo.isVirtualized) {
      return;
    }
    
    // Adjust timing precision
    this.platformInfo.timingPrecision = virtInfo.timingPrecision;
    
    // Adjust buffer size for virtualized environments
    switch (virtInfo.timingPrecision) {
      case 'high':
        this.platformInfo.recommendedBufferSize = 2048;
        break;
      case 'medium':
        this.platformInfo.recommendedBufferSize = 4096;
        break;
      case 'low':
        this.platformInfo.recommendedBufferSize = 8192;
        break;
    }
    
    // Add GPIO restrictions if virtualized
    if (!virtInfo.gpioAvailable) {
      this.platformInfo.gpioRestrictions = [
        ...(this.platformInfo.gpioRestrictions || []),
        `GPIO not available in ${virtInfo.hypervisor}`
      ];
    }
    
    // Adjust RS-485 capability based on virtualization
    if (virtInfo.serialPortStrategy === 'limited') {
      this.platformInfo.rs485Capable = false;
      this.platformInfo.gpioRestrictions = [
        ...(this.platformInfo.gpioRestrictions || []),
        'RS-485 control limited in virtualized environment'
      ];
    }
    
    // Add virtualization-specific features
    const virtFeatures = [];
    if (virtInfo.serialPortStrategy === 'usb-passthrough') {
      virtFeatures.push('usb_passthrough');
    }
    if (virtInfo.serialPortStrategy === 'network-bridge') {
      virtFeatures.push('network_bridge_preferred');
    }
    
    this.platformInfo.specialFeatures = [
      ...(this.platformInfo.specialFeatures || []),
      ...virtFeatures,
      `virtualized_${virtInfo.hypervisor.toLowerCase().replace(/\s+/g, '_')}`
    ];
  }
  
  private detectPlatform(): PlatformInfo {
    // Windows detection
    if (process.platform === 'win32') {
      return {
        name: 'Windows',
        arch: process.arch,
        serialPrefix: ['COM'],
        rs485Capable: true,
        specialFeatures: ['usb_serial', 'virtual_com_ports'],
        timingPrecision: 'medium',
        recommendedBufferSize: 4096,
        gpioRestrictions: ['GPIO not available on Windows']
      };
    }
    
    const cpuInfo = this.readCpuInfo();
    
    // BeagleBone AI-64 detection
    if (cpuInfo.includes('TI J721E') || cpuInfo.includes('BeagleBone')) {
      return {
        name: 'BeagleBone AI-64',
        arch: 'arm64',
        gpioChip: '/dev/gpiochip0',
        serialPrefix: ['/dev/ttyS', '/dev/ttyO', '/dev/ttyUSB'],
        rs485Capable: true,
        specialFeatures: ['pru', 'mikrobus', 'ai_accelerator'],
        timingPrecision: 'high',
        recommendedBufferSize: 4096,
        gpioRestrictions: []
      };
    }
    
    // Banana Pi BPI-M7 with RK3588
    if (cpuInfo.includes('RK3588') || cpuInfo.includes('Rockchip')) {
      return {
        name: 'Banana Pi BPI-M7',
        arch: 'arm64',
        gpioChip: '/dev/gpiochip0',
        serialPrefix: ['/dev/ttyS', '/dev/ttyUSB', '/dev/ttyFIQ'],
        rs485Capable: true,
        specialFeatures: ['npu_6tops', 'pcie', 'hdmi_in'],
        timingPrecision: 'high',
        recommendedBufferSize: 8192,
        gpioRestrictions: []
      };
    }
    
    // Raspberry Pi 5
    if (cpuInfo.includes('BCM2712') || cpuInfo.includes('Raspberry Pi 5')) {
      return {
        name: 'Raspberry Pi 5',
        arch: 'arm64',
        gpioChip: '/dev/gpiochip4',  // Pi 5 uses gpiochip4
        serialPrefix: ['/dev/ttyAMA', '/dev/ttyUSB', '/dev/ttyACM'],
        rs485Capable: true,
        specialFeatures: ['rp1_chip', 'pcie', 'dual_4k'],
        timingPrecision: 'high',
        recommendedBufferSize: 4096,
        gpioRestrictions: []
      };
    }
    
    // Generic Linux fallback
    return {
      name: 'Generic Linux',
      arch: process.arch,
      serialPrefix: ['/dev/ttyS', '/dev/ttyUSB', '/dev/ttyACM'],
      rs485Capable: false,
      timingPrecision: 'medium',
      recommendedBufferSize: 2048,
      gpioRestrictions: ['GPIO support varies by distribution']
    };
  }
  
  private readCpuInfo(): string {
    try {
      const fs = require('fs');
      return fs.readFileSync('/proc/cpuinfo', 'utf8');
    } catch {
      return '';
    }
  }
  
  /**
   * Get platform-specific serial port capabilities
   */
  async getPortCapabilities(path: string): Promise<PortCapabilities> {
    const baseCapabilities: PortCapabilities = {
      baudRates: [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200],
      dataBits: [5, 6, 7, 8],
      stopBits: [1, 2],
      parity: ['none', 'odd', 'even', 'mark', 'space'],
      flowControl: ['none', 'hardware', 'software'],
      signalMonitoring: true,
      electricalMonitoring: false
    };
    
    // Platform-specific enhancements
    switch (this.platformInfo.name) {
      case 'BeagleBone AI-64':
        // BeagleBone supports higher baud rates
        baseCapabilities.baudRates.push(230400, 460800, 921600);
        // PRU can provide precise timing
        baseCapabilities.electricalMonitoring = true;
        break;
        
      case 'Banana Pi BPI-M7':
        // RK3588 has excellent serial support
        baseCapabilities.baudRates.push(230400, 460800, 921600, 1500000, 3000000);
        // NPU could be used for pattern recognition
        break;
        
      case 'Raspberry Pi 5':
        // Pi 5 with RP1 chip has improved serial
        baseCapabilities.baudRates.push(230400, 460800, 921600, 1500000);
        break;
    }
    
    // Check if this is an RS-485 capable port
    if (this.platformInfo.rs485Capable && path.includes('ttyS')) {
      baseCapabilities.rs485 = {
        enabled: true,
        maxDevices: 32,
        termination: true
      };
    }
    
    return baseCapabilities;
  }
  
  /**
   * Create GPIO controller for RS-485 DE/RE pin
   */
  async createGpioController(pin: number): Promise<IGpioController | null> {
    if (!this.platformInfo.rs485Capable) {
      return null;
    }
    
    try {
      // Windows uses DTR/RTS control instead of GPIO
      if (this.platformInfo.name === 'Windows') {
        // Return null - Windows RS-485 control is handled via serial port signals
        return null;
      }
      
      // Check for virtualization limitations
      if (this.platformInfo.virtualization?.isVirtualized && !this.platformInfo.virtualization.gpioAvailable) {
        this.logger.warn('GPIO not available in virtualized environment', {
          hypervisor: this.platformInfo.virtualization.hypervisor,
          limitations: this.platformInfo.virtualization.limitations
        });
        return null;
      }
      
      // Dynamically import onoff for Linux platforms only
      const { Gpio } = await import('onoff');
      
      // Platform-specific GPIO setup
      if (this.platformInfo.name === 'BeagleBone AI-64') {
        // BeagleBone uses different GPIO numbering
        // Mikroe Click boards have standardized pins
        const clickPin = this.mapMikroeClickPin(pin);
        const gpio = new Gpio(clickPin, 'out');
        
        // Return adapter that implements IGpioController
        return {
          write: async (value: 0 | 1) => gpio.writeSync(value),
          read: async () => gpio.readSync() as 0 | 1,
          setDirection: async (direction: 'in' | 'out') => gpio.setDirection(direction),
          unexport: async () => gpio.unexport()
        };
      }
      
      const gpio = new Gpio(pin, 'out');
      return {
        write: async (value: 0 | 1) => gpio.writeSync(value),
        read: async () => gpio.readSync() as 0 | 1,
        setDirection: async (direction: 'in' | 'out') => gpio.setDirection(direction),
        unexport: async () => gpio.unexport()
      };
    } catch (error) {
      console.error('GPIO initialization failed:', error);
      return null;
    }
  }
  
  /**
   * Map Mikroe Click socket pins for BeagleBone
   */
  private mapMikroeClickPin(logicalPin: number): number {
    // Mikroe Click standard pinout mapping
    const clickMap: Record<number, number> = {
      1: 78,   // AN
      2: 79,   // RST
      3: 80,   // CS
      4: 81,   // SCK
      5: 82,   // MISO
      6: 83,   // MOSI
      // ... add more mappings
    };
    return clickMap[logicalPin] || logicalPin;
  }
  
  /**
   * Get optimal buffer size for platform
   */
  getOptimalBufferSize(): number {
    // Use virtualization-aware buffer size if available
    if (this.platformInfo.recommendedBufferSize) {
      return this.platformInfo.recommendedBufferSize;
    }
    
    // Fallback to platform-specific defaults
    switch (this.platformInfo.name) {
      case 'BeagleBone AI-64':
        return 4096;  // Good balance for PRU interaction
      case 'Banana Pi BPI-M7':
        return 8192;  // Leverage 16GB RAM
      case 'Raspberry Pi 5':
        return 4096;  // RP1 optimized
      default:
        return 2048;
    }
  }
  
  /**
   * Platform-specific serial port options
   */
  getPlatformSerialOptions(): any {
    const options: any = {};
    
    if (this.platformInfo.name === 'Raspberry Pi 5') {
      // Pi 5 specific options
      options.lock = false;  // RP1 doesn't need exclusive locks
    }
    
    return options;
  }
  
  get info(): PlatformInfo {
    return this.platformInfo;
  }
  
  /**
   * List available serial ports for the current platform
   */
  async listSerialPorts(): Promise<string[]> {
    const ports = await SerialPort.list();
    
    if (this.platformInfo.name === 'Windows') {
      // Filter Windows COM ports
      return ports
        .filter(p => p.path.match(/^COM\d+$/))
        .map(p => p.path)
        .sort((a, b) => {
          const numA = parseInt(a.replace('COM', ''));
          const numB = parseInt(b.replace('COM', ''));
          return numA - numB;
        });
    }
    
    // Unix-like systems - filter by known prefixes
    return ports
      .filter(p => this.platformInfo.serialPrefix.some(prefix => p.path.startsWith(prefix)))
      .map(p => p.path)
      .sort();
  }
}