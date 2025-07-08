/**
 * Output Formatter - Handles text, JSON, and YAML output formats
 */

import chalk from 'chalk';
import YAML from 'yaml';
import { table } from 'table';
import { 
  TestResult, 
  OutputFormatterOptions, 
  OutputFormat 
} from '../types/test-types';

export class OutputFormatter {
  private options: OutputFormatterOptions;

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
        return this.formatText(results);
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

  private formatText(results: TestResult[]): string {
    const lines: string[] = [];
    const summary = this.generateSummary(results);

    // Check if this is device discovery
    const isDeviceDiscovery = results.some(r => r.category === 'device-discovery');
    
    if (isDeviceDiscovery) {
      return this.formatDeviceDiscoveryText(results);
    }

    // Header for non-device tests
    lines.push('');
    lines.push(this.colorize(chalk.cyan.bold, '🔬 Cyreal Test Results'));
    lines.push(this.colorize(chalk.gray, '═'.repeat(50)));
    lines.push('');

    // Summary
    lines.push(this.colorize(chalk.bold, '📊 Summary:'));
    lines.push(`   Total Tests: ${summary.total}`);
    lines.push(this.colorize(chalk.green, `   ✅ Passed: ${summary.passed}`));
    if (summary.failed > 0) {
      lines.push(this.colorize(chalk.red, `   ❌ Failed: ${summary.failed}`));
    }
    if (summary.warnings > 0) {
      lines.push(this.colorize(chalk.yellow, `   ⚠️  Warnings: ${summary.warnings}`));
    }
    if (summary.skipped > 0) {
      lines.push(this.colorize(chalk.gray, `   ⏭️  Skipped: ${summary.skipped}`));
    }
    lines.push(`   ⏱️  Duration: ${summary.duration}ms`);
    lines.push('');

    // Results table (if verbose or if there are failures)
    if (this.options.verbose || summary.failed > 0) {
      lines.push(this.colorize(chalk.bold, '📋 Detailed Results:'));
      lines.push('');
      
      const tableData = [
        ['Test', 'Status', 'Duration', 'Message']
      ];

      for (const result of results) {
        const status = this.formatStatus(result.status, result.success);
        const duration = `${result.duration}ms`;
        const message = this.truncateMessage(result.message, 60);
        
        tableData.push([result.name, status, duration, message]);
      }

      const tableConfig = {
        border: {
          topBody: '─',
          topJoin: '┬',
          topLeft: '┌',
          topRight: '┐',
          bottomBody: '─',
          bottomJoin: '┴',
          bottomLeft: '└',
          bottomRight: '┘',
          bodyLeft: '│',
          bodyRight: '│',
          bodyJoin: '│',
          joinBody: '─',
          joinLeft: '├',
          joinRight: '┤',
          joinJoin: '┼'
        }
      };

      lines.push(table(tableData, tableConfig));
    }

    // Failed tests details (if any)
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      lines.push('');
      lines.push(this.colorize(chalk.red.bold, '❌ Failed Tests:'));
      lines.push('');

      for (const test of failedTests) {
        lines.push(this.colorize(chalk.red, `   • ${test.name}`));
        lines.push(`     ${test.message}`);
        if (this.options.verbose && test.details) {
          lines.push(this.colorize(chalk.gray, `     Details: ${JSON.stringify(test.details, null, 2)}`));
        }
        lines.push('');
      }
    }

    // Environment info (if verbose)
    if (this.options.verbose) {
      lines.push('');
      lines.push(this.colorize(chalk.bold, '🌍 Environment:'));
      lines.push(`   Platform: ${process.platform} (${process.arch})`);
      lines.push(`   Node.js: ${process.version}`);
      lines.push(`   Timestamp: ${new Date().toISOString()}`);
      lines.push('');
    }

    return lines.join('\n');
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

  private formatStatus(status: string, success: boolean): string {
    if (!this.options.colorize) {
      return status.toUpperCase();
    }

    switch (status) {
      case 'pass':
        return chalk.green('✅ PASS');
      case 'fail':
        return chalk.red('❌ FAIL');
      case 'warn':
        return chalk.yellow('⚠️  WARN');
      case 'skip':
        return chalk.gray('⏭️  SKIP');
      default:
        return status.toUpperCase();
    }
  }

  private colorize(colorFn: any, text: string): string {
    return this.options.colorize ? colorFn(text) : text;
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  private formatDeviceDiscoveryText(results: TestResult[]): string {
    const lines: string[] = [];
    const deviceResults = results.filter(r => r.category === 'device-discovery' && r.name !== 'Device Discovery Summary');
    
    // Header
    lines.push('');
    lines.push(this.colorize(chalk.cyan.bold, '🔍 Device Discovery'));
    lines.push(this.colorize(chalk.gray, '═'.repeat(50)));
    lines.push('');

    if (deviceResults.length === 0) {
      lines.push(this.colorize(chalk.yellow, '📱 No devices detected'));
      lines.push('');
      lines.push(this.colorize(chalk.gray, '💡 Try:'));
      lines.push(this.colorize(chalk.gray, '   • Connect a USB device'));
      lines.push(this.colorize(chalk.gray, '   • Run with --industrial for technical details'));
      return lines.join('\n');
    }

    // Quick overview
    const serialDevices = deviceResults.filter(r => r.details?.settings?.default?.baudRate > 0).length;
    const mobileDevices = deviceResults.filter(r => r.details?.capabilities?.includes('mobile-device')).length;
    const restrictedDevices = deviceResults.filter(r => r.details?.security?.level === 'insecure').length;

    lines.push(this.colorize(chalk.bold, '📊 Quick Summary:'));
    lines.push(`   💻 Total Devices: ${deviceResults.length}`);
    if (serialDevices > 0) {
      lines.push(this.colorize(chalk.green, `   🔌 Serial Interfaces: ${serialDevices}`));
    }
    if (mobileDevices > 0) {
      lines.push(this.colorize(chalk.blue, `   📱 Mobile Devices: ${mobileDevices}`));
    }
    if (restrictedDevices > 0) {
      lines.push(this.colorize(chalk.yellow, `   🔒 Access Restricted: ${restrictedDevices}`));
    }
    lines.push('');

    // Device list
    lines.push(this.colorize(chalk.bold, '🔗 Connected Devices:'));
    lines.push('');

    for (const result of deviceResults) {
      const device = result.details;
      if (!device) continue;

      const deviceName = `${device.identity?.manufacturer || 'Unknown'} ${device.identity?.productFamily || 'Device'}`;
      const isSerial = device.settings?.default?.baudRate > 0;
      const isMobile = device.capabilities?.includes('mobile-device');
      const isRestricted = device.security?.level === 'insecure';

      // Device icon based on type
      let icon = '🔧'; // Default
      if (isMobile) icon = '📱';
      else if (isSerial) icon = '🔌';

      // Status indicator
      let status = this.colorize(chalk.green, '✅');
      if (isRestricted) status = this.colorize(chalk.yellow, '⚠️');

      lines.push(`   ${icon} ${status} ${deviceName}`);
      
      // Show key info
      if (isSerial) {
        const settings = device.settings.default;
        lines.push(this.colorize(chalk.gray, `      📡 Serial: ${settings.baudRate} baud, ${settings.dataBits}${settings.parity.charAt(0).toUpperCase()}${settings.stopBits}`));
      } else if (isMobile) {
        lines.push(this.colorize(chalk.gray, `      🔒 Mobile Device (${device.identity?.vid}:${device.identity?.pid})`));
      } else {
        lines.push(this.colorize(chalk.gray, `      🔧 USB Device (${device.identity?.vid}:${device.identity?.pid})`));
      }

      if (device.cyreal?.limitations && device.cyreal.limitations.length > 0) {
        const limitation = device.cyreal.limitations[0];
        lines.push(this.colorize(chalk.gray, `      ℹ️  ${limitation}`));
      }
      lines.push('');
    }

    // Quick tips
    lines.push(this.colorize(chalk.bold, '💡 Pro Tips:'));
    lines.push(this.colorize(chalk.gray, '   • Use --industrial for engineering details'));
    lines.push(this.colorize(chalk.gray, '   • Use --detailed for complete analysis'));
    lines.push(this.colorize(chalk.gray, '   • Use --format json for automation'));
    lines.push('');

    return lines.join('\n');
  }
}