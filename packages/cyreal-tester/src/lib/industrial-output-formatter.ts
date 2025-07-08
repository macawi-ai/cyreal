/**
 * Industrial Output Formatter - Professional industrial control system output
 * 
 * Uses standard industrial control light indicators:
 * ● GREEN   - Operational/Normal
 * ● YELLOW  - Warning/Caution  
 * ● RED     - Error/Critical
 * ● BLUE    - Information/Standby
 * ● WHITE   - Maintenance/Test
 * ● OFF     - Inactive/Disabled
 */

import chalk from 'chalk';
import YAML from 'yaml';
import { TestResult, OutputFormatterOptions } from '../types/test-types';

export interface IndustrialStatusCode {
  symbol: string;
  color: string;
  description: string;
}

export class IndustrialOutputFormatter {
  private options: OutputFormatterOptions;
  
  // Standard industrial control light codes
  private readonly statusCodes: Record<string, IndustrialStatusCode> = {
    operational: { symbol: '●', color: 'green', description: 'Operational' },
    warning: { symbol: '●', color: 'yellow', description: 'Warning' },
    error: { symbol: '●', color: 'red', description: 'Error' },
    info: { symbol: '●', color: 'blue', description: 'Information' },
    maintenance: { symbol: '●', color: 'white', description: 'Maintenance' },
    inactive: { symbol: '○', color: 'gray', description: 'Inactive' }
  };

  constructor(options: OutputFormatterOptions) {
    this.options = options;
  }

  format(results: TestResult[]): string {
    switch (this.options.format) {
      case 'json':
        return this.formatJson(results);
      case 'yaml':
        return this.formatYaml(results);
      case 'text':
      default:
        return this.formatIndustrialText(results);
    }
  }

  formatDeviceDiscovery(results: TestResult[]): string {
    const lines: string[] = [];
    const deviceResults = results.filter(r => r.category === 'device-discovery');
    
    if (deviceResults.length === 0) {
      lines.push('DEVICE TECHNICAL STATUS REPORT');
      lines.push('═'.repeat(80));
      lines.push('STATUS: No devices detected');
      lines.push('');
      return lines.join('\n');
    }

    lines.push('DEVICE TECHNICAL STATUS REPORT');
    lines.push('═'.repeat(80));
    lines.push('');

    // Enhanced technical status table with timing and engineering details
    lines.push('STATUS   DEVICE NAME              PORT/PATH        CONFIG        TIME   TECHNICAL STATE');
    lines.push('─'.repeat(90));
    
    // Process each device
    for (const result of deviceResults) {
      if (result.name === 'Device Discovery Summary') continue;
      
      const device = result.details;
      if (!device) continue;

      // Determine technical status symbol
      const statusSymbol = this.getTechnicalStatus(device);
      
      // Format device name (truncate if too long)
      const deviceName = `${device.identity?.manufacturer || 'Unknown'} ${device.identity?.productFamily || 'Device'}`;
      const formattedName = this.padString(deviceName, 24);
      
      // Format port/path
      const portPath = result.metadata?.path || 'Unknown';
      const formattedPort = this.padString(portPath, 16);
      
      // Format configuration (baud rate and data format)
      let config = 'No Serial';
      if (device.settings?.default && device.settings.default.baudRate > 0) {
        const settings = device.settings.default;
        config = `${settings.baudRate}-${settings.dataBits}${settings.parity.charAt(0).toUpperCase()}${settings.stopBits}`;
      }
      const formattedConfig = this.padString(config, 13);
      
      // Format timing (critical for engineers)
      const timing = this.padString(`${result.duration}ms`, 6);
      
      // Determine technical state
      const technicalState = this.getTechnicalState(device);
      
      // Add device line with timing
      lines.push(`${statusSymbol} ${formattedName} ${formattedPort} ${formattedConfig} ${timing} ${technicalState}`);
    }
    
    // Add detailed engineering information if verbose mode
    if (this.options.verbose) {
      lines.push('');
      lines.push('ENGINEERING DETAILS');
      lines.push('─'.repeat(90));
      
      for (const result of deviceResults) {
        if (result.name === 'Device Discovery Summary') continue;
        const device = result.details;
        if (!device) continue;
        
        lines.push(`${device.identity?.manufacturer} ${device.identity?.productFamily} (${device.identity?.vid}:${device.identity?.pid})`);
        lines.push(`  Detection Time: ${result.duration}ms`);
        lines.push(`  Confidence: ${device.metadata?.confidence || 0}%`);
        
        if (device.capabilities && device.capabilities.length > 0) {
          lines.push(`  Capabilities: ${device.capabilities.join(', ')}`);
        }
        
        if (device.protocols && device.protocols.length > 0) {
          lines.push(`  Protocols: ${device.protocols.join(', ')}`);
        }
        
        if (device.security?.warnings && device.security.warnings.length > 0) {
          lines.push(`  Security Flags: ${device.security.warnings.join(', ')}`);
        }
        
        if (device.cyreal?.limitations && device.cyreal.limitations.length > 0) {
          lines.push(`  Limitations: ${device.cyreal.limitations.join(', ')}`);
        }
        
        lines.push('');
      }
    }

    lines.push('');
    
    // Technical summary
    const summaryDeviceResults = results.filter(r => r.category === 'device-discovery' && r.name !== 'Device Discovery Summary');
    const serialDevices = summaryDeviceResults.filter(r => r.details?.settings?.default?.baudRate > 0).length;
    const operationalDevices = summaryDeviceResults.filter(r => 
      r.details?.cyreal?.compatibility === 'excellent' || 
      r.details?.cyreal?.compatibility === 'good'
    ).length;
    const mobileDevices = summaryDeviceResults.filter(r => 
      r.details?.capabilities?.includes('mobile-device')
    ).length;
    const unknownDevices = summaryDeviceResults.filter(r => 
      r.details?.capabilities?.includes('unknown')
    ).length;
    const developmentDevices = summaryDeviceResults.filter(r => 
      r.details?.security?.level === 'development'
    ).length;
    const debugDevices = summaryDeviceResults.filter(r => 
      r.details?.security?.level === 'debug'
    ).length;
    const restrictedDevices = summaryDeviceResults.filter(r => 
      r.details?.security?.level === 'insecure'
    ).length;
    
    // Calculate timing statistics
    const deviceTimes = summaryDeviceResults.map(r => r.duration);
    const totalTime = deviceTimes.reduce((sum, time) => sum + time, 0);
    const avgTime = deviceTimes.length > 0 ? Math.round(totalTime / deviceTimes.length) : 0;
    const maxTime = deviceTimes.length > 0 ? Math.max(...deviceTimes) : 0;
    const minTime = deviceTimes.length > 0 ? Math.min(...deviceTimes) : 0;
    
    lines.push('TECHNICAL SUMMARY');
    lines.push('─'.repeat(80));
    lines.push(this.formatDeviceInfo('Total Devices', summaryDeviceResults.length.toString()));
    lines.push(this.formatDeviceInfo('Serial Interfaces', serialDevices.toString()));
    lines.push(this.formatDeviceInfo('Operational', operationalDevices.toString()));
    
    // Device categories
    if (mobileDevices > 0) {
      lines.push(this.formatDeviceInfo('Mobile Devices', mobileDevices.toString()));
    }
    if (developmentDevices > 0) {
      lines.push(this.formatDeviceInfo('Development Mode', developmentDevices.toString()));
    }
    if (debugDevices > 0) {
      lines.push(this.formatDeviceInfo('Debug Enabled', debugDevices.toString()));
    }
    if (restrictedDevices > 0) {
      lines.push(this.formatDeviceInfo('Access Restricted', restrictedDevices.toString()));
    }
    if (unknownDevices > 0) {
      lines.push(this.formatDeviceInfo('Unknown Type', unknownDevices.toString()));
    }
    
    // Timing analysis (critical for performance engineering)
    if (deviceTimes.length > 0) {
      lines.push('');
      lines.push('PERFORMANCE METRICS');
      lines.push('─'.repeat(80));
      lines.push(this.formatDeviceInfo('Total Scan Time', `${totalTime}ms`));
      lines.push(this.formatDeviceInfo('Average Per Device', `${avgTime}ms`));
      lines.push(this.formatDeviceInfo('Fastest Detection', `${minTime}ms`));
      lines.push(this.formatDeviceInfo('Slowest Detection', `${maxTime}ms`));
      lines.push(this.formatDeviceInfo('Scan Rate', `${Math.round(summaryDeviceResults.length / (totalTime/1000))} devices/sec`));
    }
    
    return lines.join('\n');
  }

  private formatIndustrialText(results: TestResult[]): string {
    // Check if this is device discovery
    if (results.some(r => r.category === 'device-discovery')) {
      return this.formatDeviceDiscovery(results);
    }
    
    // Standard test results
    return this.formatStandardTests(results);
  }

  private formatStandardTests(results: TestResult[]): string {
    const lines: string[] = [];
    const summary = this.generateSummary(results);

    // Header
    lines.push('CYREAL SYSTEM ANALYSIS');
    lines.push('═'.repeat(80));
    lines.push('');

    // Test results table
    lines.push('TEST RESULTS');
    lines.push('─'.repeat(80));
    lines.push(this.formatTableHeader(['STATUS', 'TEST NAME', 'DURATION', 'MESSAGE']));
    lines.push('─'.repeat(80));

    for (const result of results) {
      const status = this.getTestStatus(result);
      const name = this.padString(result.name, 40);
      const duration = this.padString(`${result.duration}ms`, 10);
      const message = this.truncateString(result.message, 20);
      
      lines.push(`${status.symbol} ${name} ${duration} ${message}`);
    }

    lines.push('─'.repeat(80));
    lines.push('');

    // Summary
    lines.push('SYSTEM STATUS SUMMARY');
    lines.push('─'.repeat(80));
    lines.push(this.formatDeviceInfo('Total Tests', summary.total.toString()));
    lines.push(this.formatDeviceInfo('Operational', summary.passed.toString()));
    lines.push(this.formatDeviceInfo('Errors', summary.failed.toString()));
    lines.push(this.formatDeviceInfo('Warnings', summary.warnings.toString()));
    lines.push(this.formatDeviceInfo('Duration', `${summary.duration}ms`));
    
    const overallStatus = summary.failed > 0 ? this.statusCodes.error : 
                         summary.warnings > 0 ? this.statusCodes.warning : 
                         this.statusCodes.operational;
    
    lines.push('');
    lines.push(`OVERALL SYSTEM STATUS: ${overallStatus.symbol} ${overallStatus.description.toUpperCase()}`);

    return lines.join('\n');
  }

  private formatDeviceInfo(label: string, value: string): string {
    const paddedLabel = this.padString(label + ':', 20);
    return `${paddedLabel} ${value}`;
  }

  private formatTableHeader(headers: string[]): string {
    return headers.map((header, index) => {
      const widths = [8, 40, 10, 20]; // STATUS, TEST NAME, DURATION, MESSAGE
      return this.padString(header, widths[index]);
    }).join(' ');
  }

  private getTestStatus(result: TestResult): IndustrialStatusCode {
    if (!result.success) return this.statusCodes.error;
    if (result.status === 'warn') return this.statusCodes.warning;
    if (result.status === 'skip') return this.statusCodes.inactive;
    return this.statusCodes.operational;
  }

  private getCompatibilityStatus(level?: string): IndustrialStatusCode {
    switch (level) {
      case 'excellent': return this.statusCodes.operational;
      case 'good': return this.statusCodes.operational;
      case 'limited': return this.statusCodes.warning;
      case 'incompatible': return this.statusCodes.error;
      default: return this.statusCodes.info;
    }
  }

  private getSecurityStatus(level?: string): IndustrialStatusCode {
    switch (level) {
      case 'production': return this.statusCodes.operational;
      case 'development': return this.statusCodes.warning;
      case 'debug': return this.statusCodes.warning;
      case 'insecure': return this.statusCodes.error;
      default: return this.statusCodes.info;
    }
  }

  private padString(str: string, length: number): string {
    return str.length >= length ? str.substring(0, length) : str + ' '.repeat(length - str.length);
  }

  private truncateString(str: string, maxLength: number): string {
    return str.length <= maxLength ? str : str.substring(0, maxLength - 3) + '...';
  }

  private colorize(colorName: string, text: string): string {
    if (!this.options.colorize) return text;
    
    switch (colorName) {
      case 'green': return chalk.green(text);
      case 'yellow': return chalk.yellow(text);
      case 'red': return chalk.red(text);
      case 'blue': return chalk.blue(text);
      case 'white': return chalk.white(text);
      case 'gray': return chalk.gray(text);
      default: return text;
    }
  }

  private formatJson(results: TestResult[]): string {
    const summary = this.generateSummary(results);
    
    const output = {
      summary,
      results: results.map(result => ({
        name: result.name,
        category: result.category,
        status: result.status,
        success: result.success,
        message: result.message,
        duration: result.duration,
        timestamp: result.timestamp.toISOString(),
        ...(this.options.verbose && result.details ? { details: result.details } : {}),
        ...(result.metadata ? { metadata: result.metadata } : {})
      })),
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        timestamp: new Date().toISOString()
      }
    };

    return JSON.stringify(output, null, 2);
  }

  private formatYaml(results: TestResult[]): string {
    const summary = this.generateSummary(results);
    
    const output = {
      summary,
      results: results.map(result => ({
        name: result.name,
        category: result.category,
        status: result.status,
        success: result.success,
        message: result.message,
        duration: result.duration,
        timestamp: result.timestamp.toISOString(),
        ...(this.options.verbose && result.details ? { details: result.details } : {}),
        ...(result.metadata ? { metadata: result.metadata } : {})
      })),
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        timestamp: new Date().toISOString()
      }
    };

    return YAML.stringify(output, { indent: 2 });
  }

  private getTechnicalStatus(device: any): string {
    // Determine technical operational status
    if (!device) return this.colorize('gray', '○');
    
    if (device.security?.level === 'insecure' || 
        device.cyreal?.compatibility === 'incompatible') {
      return this.colorize('red', '●');
    } else if (device.security?.level === 'development' || 
               device.security?.level === 'debug' ||
               device.cyreal?.compatibility === 'limited') {
      return this.colorize('yellow', '●');
    } else if (device.cyreal?.compatibility === 'excellent' || 
               device.cyreal?.compatibility === 'good') {
      return this.colorize('green', '●');
    } else {
      return this.colorize('blue', '●');
    }
  }

  private getTechnicalState(device: any): string {
    // Determine technical device state based on actual hardware status
    if (!device) return 'Unknown State';
    
    const states: string[] = [];
    
    // Security/Debug state
    if (device.security?.level === 'development') {
      states.push('Debug Enabled');
    } else if (device.security?.level === 'production') {
      states.push('Production Mode');
    } else if (device.security?.level === 'debug') {
      states.push('Debug Unlocked');
    } else if (device.security?.level === 'insecure') {
      states.push('Locked Device');
    }
    
    // Interface state
    if (device.capabilities?.includes('mobile-device')) {
      states.push('Mobile Device');
    } else if (device.capabilities?.includes('programming')) {
      states.push('Programmer Mode');
    } else if (device.capabilities?.includes('serial')) {
      states.push('Serial Active');
    } else if (device.settings?.default?.baudRate === 0) {
      states.push('No Serial Interface');
    }
    
    // Hardware features
    if (device.capabilities?.includes('wireless')) {
      states.push('WiFi/BT');
    }
    if (device.capabilities?.includes('bootloader')) {
      states.push('Bootloader Access');
    }
    
    return states.length > 0 ? states.join(', ') : 'Standard Device';
  }

  private generateSummary(results: TestResult[]) {
    const total = results.length;
    const passed = results.filter(r => r.success && r.status === 'pass').length;
    const failed = results.filter(r => !r.success).length;
    const warnings = results.filter(r => r.status === 'warn').length;
    const skipped = results.filter(r => r.status === 'skip').length;
    const duration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      total,
      passed,
      failed,
      warnings,
      skipped,
      duration,
      success: failed === 0
    };
  }
}