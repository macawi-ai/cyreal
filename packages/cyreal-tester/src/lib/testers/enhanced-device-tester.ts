/**
 * Enhanced Device Tester - IoT Device Discovery and Inventory
 * 
 * Uses the new device fingerprinting system to provide comprehensive
 * device information including capabilities, protocols, and security assessment.
 */

import { 
  DeviceCollector, 
  DeviceDatabase, 
  DeviceProfile, 
  DeviceDiscoveryResult,
  PrivacySettings 
} from '@cyreal/core';
import { TestResult, TestRunnerOptions } from '../../types/test-types';

export interface EnhancedDeviceTestOptions {
  enableProtocolDetection?: boolean;
  enableCapabilityTesting?: boolean;
  enableSecurityAssessment?: boolean;
  enableCommunitySharing?: boolean;
  safeMode?: boolean;
  timeout?: number;
}

export class EnhancedDeviceTester {
  private collector: DeviceCollector;
  private database: DeviceDatabase;
  private options: TestRunnerOptions;
  
  constructor(options: TestRunnerOptions) {
    this.options = options;
    
    // Initialize device collector
    this.collector = new DeviceCollector({
      timeout: options.timeout || 5000,
      enableProtocolDetection: true,
      enableCapabilityTesting: true,
      enableSecurityAssessment: true,
      safeMode: true // Default to safe mode
    });
    
    // Initialize device database
    this.database = new DeviceDatabase();
    
    // Set default privacy settings (privacy-first)
    this.database.setPrivacySettings({
      enableCommunitySharing: false, // Default: disabled
      shareCapabilities: false,
      shareProtocols: false,
      shareDefaultSettings: false,
      shareSecurityProfile: false,
      sharePhysicalSpecs: false,
      retentionDays: 30,
      anonymizeAfterDays: 7,
      consentGiven: false,
      consentVersion: '1.0.0'
    });
  }
  
  /**
   * Run enhanced device discovery
   */
  async runEnhancedDiscovery(testOptions: EnhancedDeviceTestOptions = {}): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();
    
    try {
      // Discover serial devices
      const serialDevices = await this.collector.discoverDevices();
      
      // Also discover USB devices (including non-serial devices like iPhone)
      const usbDevices = await this.discoverUSBDevicesSimple();
      
      // Combine all devices
      const devices = [...serialDevices, ...usbDevices];
      
      // Process each device
      for (const device of devices) {
        // Store device profile
        await this.database.storeDevice(device);
        
        // Create test result
        const testResult: TestResult = {
          name: `${device.shareable.manufacturer} ${device.shareable.productFamily}`,
          category: 'device-discovery',
          status: 'pass',
          success: true,
          message: this.formatDeviceMessage(device),
          details: this.formatDeviceDetails(device),
          duration: Date.now() - startTime,
          timestamp: new Date(),
          metadata: {
            deviceId: device.id,
            capabilities: device.shareable.capabilities,
            protocols: device.shareable.protocols,
            security: device.security.level,
            compatibility: device.cyreal.compatibility
          }
        };
        
        results.push(testResult);
      }
      
      // Add summary result
      const summaryResult: TestResult = {
        name: 'Device Discovery Summary',
        category: 'device-discovery',
        status: 'pass',
        success: true,
        message: `Discovered ${devices.length} devices`,
        details: {
          totalDevices: devices.length,
          knownDevices: devices.filter(d => d.metadata.source !== 'detected').length,
          industrialDevices: devices.filter(d => d.shareable.industrialGrade).length,
          securityIssues: devices.filter(d => d.security.level === 'insecure').length,
          devices: devices.map(d => ({
            id: d.id,
            name: `${d.shareable.manufacturer} ${d.shareable.productFamily}`,
            path: d.private.path,
            capabilities: d.shareable.capabilities,
            protocols: d.shareable.protocols,
            security: d.security.level,
            compatibility: d.cyreal.compatibility
          }))
        },
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
      
      results.push(summaryResult);
      
      return results;
      
    } catch (error) {
      const errorResult: TestResult = {
        name: 'Device Discovery',
        category: 'device-discovery',
        status: 'fail',
        success: false,
        message: `Discovery failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
      
      return [errorResult];
    }
  }
  
  /**
   * Test a specific device by path
   */
  async testSpecificDevice(devicePath: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Get device info from system
      const { SerialPort } = await import('serialport');
      const ports = await SerialPort.list();
      const portInfo = ports.find(p => p.path === devicePath);
      
      if (!portInfo) {
        return {
          name: 'Specific Device Test',
          category: 'device-discovery',
          status: 'fail',
          success: false,
          message: `Device not found: ${devicePath}`,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
      
      // Analyze the device
      const device = await this.collector.analyzeDevice(portInfo);
      
      if (!device) {
        return {
          name: 'Specific Device Test',
          category: 'device-discovery',
          status: 'fail',
          success: false,
          message: `Failed to analyze device: ${devicePath}`,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
      
      // Store device profile
      await this.database.storeDevice(device);
      
      return {
        name: `${device.shareable.manufacturer} ${device.shareable.productFamily}`,
        category: 'device-discovery',
        status: 'pass',
        success: true,
        message: this.formatDeviceMessage(device),
        details: this.formatDeviceDetails(device),
        duration: Date.now() - startTime,
        timestamp: new Date(),
        metadata: {
          deviceId: device.id,
          path: devicePath,
          capabilities: device.shareable.capabilities,
          protocols: device.shareable.protocols,
          security: device.security.level,
          compatibility: device.cyreal.compatibility
        }
      };
      
    } catch (error) {
      return {
        name: 'Specific Device Test',
        category: 'device-discovery',
        status: 'fail',
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Get device inventory
   */
  async getDeviceInventory(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const devices = await this.database.getAllDevices();
      const stats = await this.database.getStats();
      
      return {
        name: 'Device Inventory',
        category: 'device-discovery',
        status: 'pass',
        success: true,
        message: `${devices.length} devices in inventory`,
        details: {
          inventory: devices.map((d: DeviceProfile) => ({
            id: d.id,
            name: `${d.shareable.manufacturer} ${d.shareable.productFamily}`,
            path: d.private.path,
            lastSeen: d.private.lastSeen,
            capabilities: d.shareable.capabilities,
            protocols: d.shareable.protocols,
            security: d.security.level,
            compatibility: d.cyreal.compatibility,
            confidence: d.metadata.confidence
          })),
          statistics: stats
        },
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        name: 'Device Inventory',
        category: 'device-discovery',
        status: 'fail',
        success: false,
        message: `Inventory failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Format device message for display
   */
  private formatDeviceMessage(device: DeviceProfile): string {
    const manufacturer = device.shareable.manufacturer;
    const family = device.shareable.productFamily;
    const model = device.shareable.model ? ` ${device.shareable.model}` : '';
    
    return `${manufacturer} ${family}${model} detected and profiled`;
  }
  
  /**
   * Format device details for display
   */
  private formatDeviceDetails(device: DeviceProfile): any {
    return {
      identity: {
        vid: device.shareable.vid,
        pid: device.shareable.pid,
        manufacturer: device.shareable.manufacturer,
        productFamily: device.shareable.productFamily,
        model: device.shareable.model
      },
      capabilities: device.shareable.capabilities,
      protocols: device.shareable.protocols,
      settings: {
        default: device.shareable.defaultSettings,
        recommended: device.shareable.recommendedSettings
      },
      security: {
        level: device.security.level,
        warnings: device.security.warnings,
        recommendations: device.security.recommendations
      },
      cyreal: {
        compatibility: device.cyreal.compatibility,
        suggestedGovernors: device.cyreal.suggestedGovernors,
        supportedFeatures: device.cyreal.supportedFeatures,
        limitations: device.cyreal.limitations
      },
      physical: device.shareable.physicalSpecs,
      power: device.shareable.powerRequirements,
      software: device.shareable.softwareInfo,
      metadata: {
        source: device.metadata.source,
        confidence: device.metadata.confidence,
        lastSeen: device.private.lastSeen
      }
    };
  }
  
  /**
   * Enable community sharing (opt-in)
   */
  enableCommunitySharing(): void {
    this.database.setPrivacySettings({
      enableCommunitySharing: true,
      shareCapabilities: true,
      shareProtocols: true,
      shareDefaultSettings: true,
      consentGiven: true,
      consentVersion: '1.0.0'
    });
  }
  
  /**
   * Disable community sharing
   */
  disableCommunitySharing(): void {
    this.database.setPrivacySettings({
      enableCommunitySharing: false,
      shareCapabilities: false,
      shareProtocols: false,
      shareDefaultSettings: false,
      consentGiven: false
    });
  }
  
  /**
   * Get privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    return this.database.getPrivacySettings();
  }
  
  /**
   * Discover USB devices (including non-serial devices like iPhone) - Simplified version
   */
  private async discoverUSBDevicesSimple(): Promise<any[]> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync('lsusb 2>/dev/null || echo "lsusb not available"');
      
      if (stdout.includes('lsusb not available')) {
        return [];
      }
      
      const deviceLines = stdout.split('\n').filter(line => line.includes('ID '));
      const usbDevices: any[] = [];
      
      for (const line of deviceLines) {
        const device = this.parseUSBDeviceSimple(line);
        if (device) {
          usbDevices.push(device);
        }
      }
      
      return usbDevices;
      
    } catch (error) {
      console.warn('Failed to discover USB devices:', error);
      return [];
    }
  }
  
  /**
   * Parse USB device line to simple object
   */
  private parseUSBDeviceSimple(line: string): any | null {
    // Parse line like: "Bus 001 Device 042: ID 05ac:12a8 Apple, Inc. iPhone 5/5C/5S/6/SE/7/8/X/XR"
    const match = line.match(/Bus (\d+) Device (\d+): ID ([0-9a-f]{4}):([0-9a-f]{4}) (.+)/i);
    
    if (!match) return null;
    
    const [, busNumber, deviceNumber, vid, pid, description] = match;
    
    // Split manufacturer and product from description
    const parts = description.split(' ');
    const manufacturer = parts[0]?.replace(',', '') || 'Unknown';
    const product = parts.slice(1).join(' ') || 'Unknown Device';
    
    // Simple device classification
    const isMobileDevice = this.isMobileDeviceSimple(manufacturer, product);
    const isSerialDevice = this.isSerialDeviceSimple(product);
    
    return {
      id: `usb-${vid}-${pid}-${deviceNumber}`,
      shareable: {
        vid: vid.toLowerCase(),
        pid: pid.toLowerCase(),
        manufacturer,
        productFamily: product.split(' ')[0],
        model: product,
        capabilities: isMobileDevice ? ['mobile-device'] : isSerialDevice ? ['serial'] : ['unknown'],
        protocols: isMobileDevice ? ['usb-mtp'] : isSerialDevice ? ['uart'] : ['usb'],
        defaultSettings: {
          baudRate: isSerialDevice ? 115200 : 0,
          dataBits: 8,
          stopBits: 1,
          parity: 'none'
        }
      },
      private: {
        path: `/dev/bus/usb/${busNumber.padStart(3, '0')}/${deviceNumber.padStart(3, '0')}`
      },
      cyreal: {
        compatibility: isSerialDevice ? 'excellent' : isMobileDevice ? 'incompatible' : 'limited',
        suggestedGovernors: isMobileDevice ? ['mobile-device-governor'] : ['default-governor'],
        supportedFeatures: isSerialDevice ? ['serial-communication'] : [],
        limitations: isMobileDevice ? ['No serial interface', 'Security restrictions apply'] : 
                    isSerialDevice ? [] : ['Limited functionality']
      },
      security: {
        level: isMobileDevice ? 'insecure' : isSerialDevice ? 'development' : 'debug',
        warnings: isMobileDevice ? ['Mobile device detected', 'Data transfer possible'] : [],
        recommendations: isMobileDevice ? ['Verify device authorization', 'Monitor data access'] : []
      },
      metadata: {
        source: 'detected',
        confidence: isMobileDevice ? 98 : isSerialDevice ? 90 : 75
      }
    };
  }
  
  // Simple helper methods
  private isMobileDeviceSimple(manufacturer: string, product: string): boolean {
    const mobileKeywords = ['iphone', 'ipad', 'android', 'samsung', 'pixel'];
    const mobileManufacturers = ['apple', 'samsung', 'google'];
    
    const productLower = product.toLowerCase();
    const manufacturerLower = manufacturer.toLowerCase();
    
    return mobileKeywords.some(keyword => productLower.includes(keyword)) ||
           mobileManufacturers.some(vendor => manufacturerLower.includes(vendor));
  }
  
  private isSerialDeviceSimple(product: string): boolean {
    const serialKeywords = ['uart', 'serial', 'bridge', 'cp210', 'ftdi', 'ch340'];
    return serialKeywords.some(keyword => product.toLowerCase().includes(keyword));
  }
}