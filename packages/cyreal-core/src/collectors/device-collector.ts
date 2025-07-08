/**
 * Device Collector - Enhanced IoT Device Discovery
 * 
 * Collects comprehensive device information through multiple detection methods:
 * - Hardware detection (USB, serial ports, etc.)
 * - Protocol fingerprinting (Modbus, NMEA, AT commands, etc.)
 * - Capability testing (programming, debug, protocols)
 * - Settings optimization (baud rates, flow control, etc.)
 */

import { SerialPort } from 'serialport';
import { 
  DeviceProfile, 
  ShareableDeviceData, 
  PrivateDeviceData, 
  DeviceCapability, 
  Protocol, 
  SerialSettings,
  SecurityProfile,
  CompatibilityLevel
} from '../database/device-profile';

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  locationId?: string;
  vendorId?: string;
  productId?: string;
  pnpId?: string;
}

export interface DetectionOptions {
  timeout: number;
  enableProtocolDetection: boolean;
  enableCapabilityTesting: boolean;
  enableSecurityAssessment: boolean;
  safeMode: boolean; // Don't send commands that might affect device
}

/**
 * Enhanced Device Collector
 * Main class for comprehensive device discovery
 */
export class DeviceCollector {
  private options: DetectionOptions;
  
  constructor(options: Partial<DetectionOptions> = {}) {
    this.options = {
      timeout: 5000,
      enableProtocolDetection: true,
      enableCapabilityTesting: true,
      enableSecurityAssessment: true,
      safeMode: true,
      ...options
    };
  }
  
  /**
   * Discover all connected devices
   */
  async discoverDevices(): Promise<DeviceProfile[]> {
    const ports = await SerialPort.list();
    const profiles: DeviceProfile[] = [];
    
    for (const port of ports) {
      // Skip virtual/system ports
      if (this.isVirtualPort(port.path)) {
        continue;
      }
      
      try {
        const profile = await this.analyzeDevice(port);
        if (profile) {
          profiles.push(profile);
        }
      } catch (error) {
        console.warn(`Failed to analyze device ${port.path}:`, error);
      }
    }
    
    return profiles;
  }
  
  /**
   * Analyze a single device comprehensively
   */
  async analyzeDevice(portInfo: SerialPortInfo): Promise<DeviceProfile | null> {
    const startTime = Date.now();
    
    try {
      // 1. Basic hardware detection
      const hardwareData = this.extractHardwareData(portInfo);
      
      // 2. Protocol detection
      const protocols = this.options.enableProtocolDetection
        ? await this.detectProtocols(portInfo.path)
        : [];
      
      // 3. Capability testing
      const capabilities = this.options.enableCapabilityTesting
        ? await this.testCapabilities(portInfo, protocols)
        : [];
      
      // 4. Settings optimization
      const settings = await this.optimizeSettings(portInfo, protocols);
      
      // 5. Security assessment
      const security = this.options.enableSecurityAssessment
        ? await this.assessSecurity(portInfo, protocols, capabilities)
        : this.getDefaultSecurity();
      
      // 6. Build complete profile
      const profile = this.buildDeviceProfile(
        portInfo,
        hardwareData,
        protocols,
        capabilities,
        settings,
        security
      );
      
      const duration = Date.now() - startTime;
      console.log(`Device analysis completed in ${duration}ms: ${profile.id}`);
      
      return profile;
      
    } catch (error) {
      console.error(`Device analysis failed for ${portInfo.path}:`, error);
      return null;
    }
  }
  
  /**
   * Extract hardware data from port info
   */
  private extractHardwareData(portInfo: SerialPortInfo): Partial<ShareableDeviceData> {
    const vid = portInfo.vendorId || '0000';
    const pid = portInfo.productId || '0000';
    
    return {
      vid,
      pid,
      manufacturer: portInfo.manufacturer || 'Unknown',
      productFamily: this.inferProductFamily(portInfo),
      model: this.inferModel(portInfo),
      industrialGrade: this.inferIndustrialGrade(portInfo),
      certifications: this.inferCertifications(portInfo),
      physicalSpecs: {
        formFactor: this.inferFormFactor(portInfo),
        connectorType: this.inferConnectorType(portInfo)
      }
    };
  }
  
  /**
   * Detect protocols supported by the device
   */
  private async detectProtocols(portPath: string): Promise<Protocol[]> {
    const protocols: Protocol[] = [];
    
    // Always add basic UART
    protocols.push('uart');
    
    // Test for USB CDC
    if (portPath.includes('ttyACM')) {
      protocols.push('usb-cdc');
    }
    
    if (!this.options.safeMode) {
      // Test various protocols (only if not in safe mode)
      try {
        if (await this.testModbusRTU(portPath)) {
          protocols.push('modbus-rtu');
        }
        
        if (await this.testNMEA(portPath)) {
          protocols.push('nmea');
        }
        
        if (await this.testATCommands(portPath)) {
          protocols.push('at-commands');
        }
        
        if (await this.testArduinoBootloader(portPath)) {
          protocols.push('arduino-bootloader');
        }
      } catch (error) {
        console.warn(`Protocol detection failed for ${portPath}:`, error);
      }
    }
    
    return protocols;
  }
  
  /**
   * Test device capabilities
   */
  private async testCapabilities(portInfo: SerialPortInfo, protocols: Protocol[]): Promise<DeviceCapability[]> {
    const capabilities: DeviceCapability[] = [];
    
    // Infer capabilities from protocols
    if (protocols.includes('arduino-bootloader')) {
      capabilities.push('programming', 'bootloader');
    }
    
    if (protocols.includes('modbus-rtu')) {
      capabilities.push('industrial', 'sensor');
    }
    
    if (protocols.includes('nmea')) {
      capabilities.push('sensor'); // GPS/navigation
    }
    
    if (protocols.includes('at-commands')) {
      capabilities.push('wireless'); // Modem/cellular
    }
    
    // Infer from hardware
    if (portInfo.manufacturer === 'Espressif') {
      capabilities.push('programming', 'wireless', 'debug');
    }
    
    if (portInfo.manufacturer === 'Arduino') {
      capabilities.push('programming', 'sensor', 'actuator');
    }
    
    if (portInfo.manufacturer === 'FTDI') {
      capabilities.push('programming'); // Common USB-serial chip
    }
    
    // Check for debug capabilities
    if (portInfo.path.includes('JTAG') || portInfo.productId === '1001') {
      capabilities.push('debug');
    }
    
    return capabilities;
  }
  
  /**
   * Optimize serial settings for the device
   */
  private async optimizeSettings(portInfo: SerialPortInfo, protocols: Protocol[]): Promise<SerialSettings> {
    // Default settings
    let settings: SerialSettings = {
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none',
      bufferSize: 4096,
      timeout: 1000
    };
    
    // Optimize based on manufacturer
    if (portInfo.manufacturer === 'Espressif') {
      settings.baudRate = 115200; // ESP32 default
    } else if (portInfo.manufacturer === 'Arduino') {
      settings.baudRate = 9600; // Arduino default
    } else if (protocols.includes('modbus-rtu')) {
      settings.baudRate = 9600; // Modbus common
      settings.parity = 'even';
    } else if (protocols.includes('nmea')) {
      settings.baudRate = 4800; // GPS common
    }
    
    // Optimize based on protocols
    if (protocols.includes('usb-cdc')) {
      settings.flowControl = 'none'; // USB CDC doesn't need flow control
      settings.bufferSize = 8192; // Larger buffer for USB
    }
    
    return settings;
  }
  
  /**
   * Assess device security
   */
  private async assessSecurity(
    portInfo: SerialPortInfo, 
    protocols: Protocol[], 
    capabilities: DeviceCapability[]
  ): Promise<SecurityProfile> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const vulnerabilities: string[] = [];
    
    // Check for debug capabilities
    if (capabilities.includes('debug')) {
      warnings.push('Debug interface enabled');
      recommendations.push('Disable debug interface in production');
    }
    
    // Check for development boards
    if (portInfo.manufacturer === 'Espressif' && portInfo.productId === '1001') {
      warnings.push('Development board detected');
      recommendations.push('Use production hardware for deployment');
    }
    
    // Check for insecure protocols
    if (protocols.includes('at-commands')) {
      warnings.push('AT commands may expose device control');
      recommendations.push('Secure AT command interface');
    }
    
    // Determine security level
    let level: SecurityProfile['level'] = 'production';
    
    if (capabilities.includes('debug') || warnings.length > 0) {
      level = 'development';
    }
    
    if (vulnerabilities.length > 0) {
      level = 'insecure';
    }
    
    return {
      level,
      warnings,
      recommendations,
      vulnerabilities,
      certifications: []
    };
  }
  
  /**
   * Build complete device profile
   */
  private buildDeviceProfile(
    portInfo: SerialPortInfo,
    hardwareData: Partial<ShareableDeviceData>,
    protocols: Protocol[],
    capabilities: DeviceCapability[],
    settings: SerialSettings,
    security: SecurityProfile
  ): DeviceProfile {
    const now = new Date();
    const deviceId = `${hardwareData.vid}:${hardwareData.pid}`;
    
    // Build shareable data
    const shareable: ShareableDeviceData = {
      vid: hardwareData.vid || '0000',
      pid: hardwareData.pid || '0000',
      manufacturer: hardwareData.manufacturer || 'Unknown',
      productFamily: hardwareData.productFamily || 'Unknown',
      model: hardwareData.model,
      capabilities,
      protocols,
      defaultSettings: settings,
      recommendedSettings: [settings],
      industrialGrade: hardwareData.industrialGrade || false,
      certifications: hardwareData.certifications || [],
      physicalSpecs: hardwareData.physicalSpecs
    };
    
    // Build private data
    const privateData: PrivateDeviceData = {
      serialNumber: portInfo.serialNumber,
      path: portInfo.path,
      detectedAt: now,
      lastSeen: now,
      systemInfo: {
        hostname: require('os').hostname(),
        platform: process.platform,
        architecture: process.arch
      }
    };
    
    // Build complete profile
    return {
      id: deviceId,
      shareable,
      private: privateData,
      cyreal: {
        compatibility: this.assessCompatibility(protocols, capabilities),
        suggestedGovernors: this.suggestGovernors(protocols, capabilities),
        supportedFeatures: this.getSupportedFeatures(protocols, capabilities),
        limitations: this.getLimitations(security, capabilities),
        testResults: {
          connectionTest: true,
          protocolTest: protocols.length > 1 // More than just UART
        }
      },
      security,
      metadata: {
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        source: 'detected',
        confidence: this.calculateConfidence(hardwareData, protocols, capabilities)
      }
    };
  }
  
  // Helper methods for inference and testing
  
  private isVirtualPort(path: string): boolean {
    return path.startsWith('/dev/ttyS') || path.includes('virtual');
  }
  
  private inferProductFamily(portInfo: SerialPortInfo): string {
    const manufacturer = portInfo.manufacturer?.toLowerCase() || '';
    
    if (manufacturer.includes('espressif')) {
      return portInfo.productId === '1001' ? 'ESP32-S3' : 'ESP32';
    } else if (manufacturer.includes('arduino')) {
      return 'Arduino';
    } else if (manufacturer.includes('ftdi')) {
      return 'FTDI USB-Serial';
    } else {
      return 'Unknown';
    }
  }
  
  private inferModel(portInfo: SerialPortInfo): string | undefined {
    if (portInfo.manufacturer === 'Espressif' && portInfo.productId === '1001') {
      return 'DevKitC-1';
    }
    return undefined;
  }
  
  private inferIndustrialGrade(portInfo: SerialPortInfo): boolean {
    // Development boards are typically not industrial grade
    const devBoards = ['espressif', 'arduino', 'adafruit', 'sparkfun'];
    const manufacturer = portInfo.manufacturer?.toLowerCase() || '';
    
    return !devBoards.some(dev => manufacturer.includes(dev));
  }
  
  private inferCertifications(portInfo: SerialPortInfo): string[] {
    // TODO: Implement certification inference based on device database
    return [];
  }
  
  private inferFormFactor(portInfo: SerialPortInfo): string {
    if (portInfo.manufacturer === 'Espressif') {
      return 'Development Board';
    }
    return 'Unknown';
  }
  
  private inferConnectorType(portInfo: SerialPortInfo): string {
    if (portInfo.path.includes('ttyACM')) {
      return 'USB-C';
    } else if (portInfo.path.includes('ttyUSB')) {
      return 'USB-A';
    }
    return 'Unknown';
  }
  
  private assessCompatibility(protocols: Protocol[], capabilities: DeviceCapability[]): CompatibilityLevel {
    if (protocols.includes('modbus-rtu') || capabilities.includes('industrial')) {
      return 'excellent';
    } else if (protocols.includes('uart') && capabilities.includes('programming')) {
      return 'good';
    } else if (protocols.includes('uart')) {
      return 'limited';
    }
    return 'incompatible';
  }
  
  private suggestGovernors(protocols: Protocol[], capabilities: DeviceCapability[]): string[] {
    const governors: string[] = [];
    
    if (protocols.includes('modbus-rtu')) {
      governors.push('ModbusRTUGovernor');
    }
    
    if (capabilities.includes('programming')) {
      governors.push('ProgrammingGovernor');
    }
    
    if (protocols.includes('uart')) {
      governors.push('SerialGovernor');
    }
    
    return governors;
  }
  
  private getSupportedFeatures(protocols: Protocol[], capabilities: DeviceCapability[]): string[] {
    const features: string[] = [];
    
    if (capabilities.includes('programming')) {
      features.push('Device Programming');
    }
    
    if (capabilities.includes('debug')) {
      features.push('Debug Interface');
    }
    
    if (protocols.includes('modbus-rtu')) {
      features.push('Industrial Protocols');
    }
    
    return features;
  }
  
  private getLimitations(security: SecurityProfile, capabilities: DeviceCapability[]): string[] {
    const limitations: string[] = [];
    
    if (security.level === 'development') {
      limitations.push('Not suitable for production use');
    }
    
    if (capabilities.includes('debug')) {
      limitations.push('Debug interface may pose security risk');
    }
    
    return limitations;
  }
  
  private calculateConfidence(
    hardwareData: Partial<ShareableDeviceData>, 
    protocols: Protocol[], 
    capabilities: DeviceCapability[]
  ): number {
    let confidence = 50; // Base confidence
    
    // Increase confidence for known manufacturers
    if (hardwareData.manufacturer && hardwareData.manufacturer !== 'Unknown') {
      confidence += 20;
    }
    
    // Increase confidence for detected protocols
    confidence += Math.min(protocols.length * 10, 20);
    
    // Increase confidence for detected capabilities
    confidence += Math.min(capabilities.length * 5, 10);
    
    return Math.min(confidence, 95); // Cap at 95%
  }
  
  private getDefaultSecurity(): SecurityProfile {
    return {
      level: 'production',
      warnings: [],
      recommendations: [],
      vulnerabilities: [],
      certifications: []
    };
  }
  
  // Protocol testing methods (simplified for now)
  
  private async testModbusRTU(portPath: string): Promise<boolean> {
    // TODO: Implement Modbus RTU detection
    return false;
  }
  
  private async testNMEA(portPath: string): Promise<boolean> {
    // TODO: Implement NMEA detection
    return false;
  }
  
  private async testATCommands(portPath: string): Promise<boolean> {
    // TODO: Implement AT command detection
    return false;
  }
  
  private async testArduinoBootloader(portPath: string): Promise<boolean> {
    // TODO: Implement Arduino bootloader detection
    return false;
  }
}