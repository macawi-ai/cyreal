/**
 * Security Device Collector - Monitor ALL USB devices for security threats
 * 
 * Detects and classifies all USB devices, not just serial ports, to identify:
 * - Unauthorized mobile devices
 * - Suspicious USB devices
 * - Potential attack vectors
 * - Policy violations
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SecurityDeviceProfile {
  // Basic identification
  vid: string;
  pid: string;
  busNumber: string;
  deviceNumber: string;
  devicePath: string;
  
  // Device information
  manufacturer: string;
  product: string;
  deviceClass: string;
  deviceSubclass: string;
  deviceProtocol: string;
  
  // Security classification
  securityRisk: 'low' | 'medium' | 'high' | 'critical';
  deviceCategory: 'authorized' | 'unauthorized' | 'suspicious' | 'unknown';
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  
  // Security flags
  flags: {
    isMobileDevice: boolean;
    isStorageDevice: boolean;
    isNetworkDevice: boolean;
    isHIDDevice: boolean;
    isSerialDevice: boolean;
    isProgrammer: boolean;
    isDebugger: boolean;
    hasDataCapability: boolean;
    isKnownThreat: boolean;
  };
  
  // Policy compliance
  policy: {
    isWhitelisted: boolean;
    isBlacklisted: boolean;
    requiresApproval: boolean;
    violatesPolicy: boolean;
  };
  
  // Recommendations
  recommendations: string[];
  warnings: string[];
  actions: string[];
  
  // Metadata
  detectedAt: Date;
  lastSeen: Date;
  detectionCount: number;
}

export interface SecurityPolicy {
  // Device categories
  allowMobileDevices: boolean;
  allowStorageDevices: boolean;
  allowUnknownDevices: boolean;
  
  // Whitelists/Blacklists
  whitelistedVendors: string[];
  blacklistedVendors: string[];
  whitelistedDevices: string[];
  blacklistedDevices: string[];
  
  // Actions
  alertOnUnauthorized: boolean;
  blockUnauthorized: boolean;
  logAllDevices: boolean;
  requireApprovalFor: string[];
}

export class SecurityDeviceCollector {
  private policy: SecurityPolicy;
  private knownThreats: Map<string, string> = new Map();
  
  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = {
      allowMobileDevices: false,        // Default: DENY mobile devices
      allowStorageDevices: false,       // Default: DENY storage devices  
      allowUnknownDevices: false,       // Default: DENY unknown devices
      whitelistedVendors: ['Espressif', 'Arduino', 'FTDI'],
      blacklistedVendors: ['Apple', 'Samsung', 'Google'], // Mobile vendors
      whitelistedDevices: [],
      blacklistedDevices: [],
      alertOnUnauthorized: true,
      blockUnauthorized: false,         // Don't actually block (monitoring only)
      logAllDevices: true,
      requireApprovalFor: ['mobile', 'storage', 'network'],
      ...policy
    };
    
    this.initializeKnownThreats();
  }
  
  /**
   * Scan all USB devices for security assessment
   */
  async scanAllDevices(): Promise<SecurityDeviceProfile[]> {
    const devices: SecurityDeviceProfile[] = [];
    
    try {
      // Get detailed USB device information
      const { stdout } = await execAsync('lsusb -v 2>/dev/null || lsusb');
      const deviceLines = stdout.split('\\n').filter(line => line.includes('ID '));
      
      for (const line of deviceLines) {
        try {
          const device = await this.parseUSBDevice(line);
          if (device) {
            const profile = await this.assessSecurityRisk(device);
            devices.push(profile);
          }
        } catch (error) {
          console.warn(`Failed to parse USB device: ${line}`, error);
        }
      }
      
      return devices;
      
    } catch (error) {
      console.error('Failed to scan USB devices:', error);
      return [];
    }
  }
  
  /**
   * Parse USB device from lsusb output
   */
  private async parseUSBDevice(line: string): Promise<Partial<SecurityDeviceProfile> | null> {
    // Parse line like: "Bus 001 Device 039: ID 05ac:12a8 Apple, Inc. iPhone 5/5C/5S/6/SE/7/8/X/XR"
    const match = line.match(/Bus (\\d+) Device (\\d+): ID ([0-9a-f]{4}):([0-9a-f]{4}) (.+)/i);
    
    if (!match) return null;
    
    const [, busNumber, deviceNumber, vid, pid, description] = match;
    
    // Split manufacturer and product from description
    const parts = description.split(' ');
    const manufacturer = parts[0]?.replace(',', '') || 'Unknown';
    const product = parts.slice(1).join(' ') || 'Unknown Device';
    
    return {
      vid: vid.toLowerCase(),
      pid: pid.toLowerCase(),
      busNumber,
      deviceNumber,
      devicePath: `/dev/bus/usb/${busNumber.padStart(3, '0')}/${deviceNumber.padStart(3, '0')}`,
      manufacturer,
      product,
      detectedAt: new Date(),
      lastSeen: new Date(),
      detectionCount: 1
    };
  }
  
  /**
   * Assess security risk of a device
   */
  private async assessSecurityRisk(device: Partial<SecurityDeviceProfile>): Promise<SecurityDeviceProfile> {
    const vidPid = `${device.vid}:${device.pid}`;
    
    // Initialize flags
    const flags = {
      isMobileDevice: this.isMobileDevice(device.manufacturer!, device.product!),
      isStorageDevice: this.isStorageDevice(device.product!),
      isNetworkDevice: this.isNetworkDevice(device.product!),
      isHIDDevice: this.isHIDDevice(device.product!),
      isSerialDevice: this.isSerialDevice(device.product!),
      isProgrammer: this.isProgrammer(device.product!),
      isDebugger: this.isDebugger(device.product!),
      hasDataCapability: true, // Assume all devices have data capability unless proven otherwise
      isKnownThreat: this.knownThreats.has(vidPid)
    };
    
    // Determine security risk level
    let securityRisk: SecurityDeviceProfile['securityRisk'] = 'low';
    let threatLevel: SecurityDeviceProfile['threatLevel'] = 'none';
    let deviceCategory: SecurityDeviceProfile['deviceCategory'] = 'unknown';
    
    // Assess based on device type
    if (flags.isKnownThreat) {
      securityRisk = 'critical';
      threatLevel = 'critical';
      deviceCategory = 'suspicious';
    } else if (flags.isMobileDevice) {
      securityRisk = 'high';
      threatLevel = 'high';
      deviceCategory = 'unauthorized';
    } else if (flags.isStorageDevice) {
      securityRisk = 'high';
      threatLevel = 'medium';
      deviceCategory = 'unauthorized';
    } else if (flags.isNetworkDevice) {
      securityRisk = 'medium';
      threatLevel = 'medium';
      deviceCategory = 'suspicious';
    } else if (flags.isSerialDevice || flags.isProgrammer) {
      securityRisk = 'low';
      threatLevel = 'low';
      deviceCategory = 'authorized';
    }
    
    // Check against policy
    const policy = {
      isWhitelisted: this.policy.whitelistedVendors.includes(device.manufacturer!) ||
                     this.policy.whitelistedDevices.includes(vidPid),
      isBlacklisted: this.policy.blacklistedVendors.includes(device.manufacturer!) ||
                     this.policy.blacklistedDevices.includes(vidPid),
      requiresApproval: this.requiresApproval(flags),
      violatesPolicy: this.violatesPolicy(flags)
    };
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(flags, policy);
    const warnings = this.generateWarnings(flags, policy);
    const actions = this.generateActions(flags, policy);
    
    return {
      vid: device.vid!,
      pid: device.pid!,
      busNumber: device.busNumber!,
      deviceNumber: device.deviceNumber!,
      devicePath: device.devicePath!,
      manufacturer: device.manufacturer!,
      product: device.product!,
      deviceClass: 'Unknown',
      deviceSubclass: 'Unknown',
      deviceProtocol: 'Unknown',
      securityRisk,
      deviceCategory,
      threatLevel,
      flags,
      policy,
      recommendations,
      warnings,
      actions,
      detectedAt: device.detectedAt!,
      lastSeen: device.lastSeen!,
      detectionCount: device.detectionCount!
    };
  }
  
  // Device classification methods
  private isMobileDevice(manufacturer: string, product: string): boolean {
    const mobileKeywords = ['iphone', 'ipad', 'android', 'samsung', 'pixel', 'oneplus'];
    const mobileManufacturers = ['apple', 'samsung', 'google', 'huawei', 'xiaomi'];
    
    const productLower = product.toLowerCase();
    const manufacturerLower = manufacturer.toLowerCase();
    
    return mobileKeywords.some(keyword => productLower.includes(keyword)) ||
           mobileManufacturers.some(vendor => manufacturerLower.includes(vendor));
  }
  
  private isStorageDevice(product: string): boolean {
    const storageKeywords = ['flash', 'storage', 'drive', 'disk', 'stick', 'card reader'];
    return storageKeywords.some(keyword => product.toLowerCase().includes(keyword));
  }
  
  private isNetworkDevice(product: string): boolean {
    const networkKeywords = ['ethernet', 'wifi', 'wireless', 'bluetooth', 'network'];
    return networkKeywords.some(keyword => product.toLowerCase().includes(keyword));
  }
  
  private isHIDDevice(product: string): boolean {
    const hidKeywords = ['keyboard', 'mouse', 'trackpad', 'touchpad', 'gamepad'];
    return hidKeywords.some(keyword => product.toLowerCase().includes(keyword));
  }
  
  private isSerialDevice(product: string): boolean {
    const serialKeywords = ['uart', 'serial', 'bridge', 'cp210', 'ftdi', 'ch340'];
    return serialKeywords.some(keyword => product.toLowerCase().includes(keyword));
  }
  
  private isProgrammer(product: string): boolean {
    const programmerKeywords = ['programmer', 'debugger', 'jtag', 'swd', 'isp'];
    return programmerKeywords.some(keyword => product.toLowerCase().includes(keyword));
  }
  
  private isDebugger(product: string): boolean {
    const debuggerKeywords = ['j-link', 'st-link', 'black magic', 'debug'];
    return debuggerKeywords.some(keyword => product.toLowerCase().includes(keyword));
  }
  
  // Policy methods
  private requiresApproval(flags: SecurityDeviceProfile['flags']): boolean {
    if (flags.isMobileDevice && this.policy.requireApprovalFor.includes('mobile')) return true;
    if (flags.isStorageDevice && this.policy.requireApprovalFor.includes('storage')) return true;
    if (flags.isNetworkDevice && this.policy.requireApprovalFor.includes('network')) return true;
    return false;
  }
  
  private violatesPolicy(flags: SecurityDeviceProfile['flags']): boolean {
    if (flags.isMobileDevice && !this.policy.allowMobileDevices) return true;
    if (flags.isStorageDevice && !this.policy.allowStorageDevices) return true;
    return false;
  }
  
  // Recommendation methods
  private generateRecommendations(flags: SecurityDeviceProfile['flags'], policy: SecurityDeviceProfile['policy']): string[] {
    const recommendations: string[] = [];
    
    if (flags.isMobileDevice) {
      recommendations.push('Mobile device detected - verify business justification');
      recommendations.push('Ensure device is corporate-managed if data access required');
      recommendations.push('Consider implementing Mobile Device Management (MDM)');
    }
    
    if (flags.isStorageDevice) {
      recommendations.push('Storage device detected - scan for malware');
      recommendations.push('Implement data loss prevention (DLP) controls');
      recommendations.push('Log all file transfers');
    }
    
    if (policy.violatesPolicy) {
      recommendations.push('Device violates security policy - consider removal');
    }
    
    return recommendations;
  }
  
  private generateWarnings(flags: SecurityDeviceProfile['flags'], policy: SecurityDeviceProfile['policy']): string[] {
    const warnings: string[] = [];
    
    if (flags.isMobileDevice) {
      warnings.push('Mobile device can exfiltrate sensitive data');
      warnings.push('Potential for malware introduction');
    }
    
    if (flags.isKnownThreat) {
      warnings.push('CRITICAL: Known malicious device detected');
    }
    
    if (policy.isBlacklisted) {
      warnings.push('Device is on security blacklist');
    }
    
    return warnings;
  }
  
  private generateActions(flags: SecurityDeviceProfile['flags'], policy: SecurityDeviceProfile['policy']): string[] {
    const actions: string[] = [];
    
    if (this.policy.alertOnUnauthorized && policy.violatesPolicy) {
      actions.push('ALERT: Unauthorized device connected');
    }
    
    if (flags.isKnownThreat) {
      actions.push('BLOCK: Disconnect device immediately');
      actions.push('INVESTIGATE: Security incident response required');
    }
    
    if (policy.requiresApproval) {
      actions.push('APPROVE: Device requires management approval');
    }
    
    return actions;
  }
  
  private initializeKnownThreats(): void {
    // Example known malicious devices (this would be populated from threat intelligence)
    this.knownThreats.set('1234:5678', 'Malicious USB device');
    this.knownThreats.set('abcd:efgh', 'Known attack tool');
  }
}