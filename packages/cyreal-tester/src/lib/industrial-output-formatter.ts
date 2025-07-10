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

  // formatDeviceDiscovery method removed - device discovery functionality disabled

  private formatIndustrialText(results: TestResult[]): string {
    // Device discovery functionality removed - returning standard test results
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