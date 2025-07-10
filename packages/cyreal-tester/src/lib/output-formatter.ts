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

    // Device discovery formatting removed - functionality disabled

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

  // formatDeviceDiscoveryText method removed - device discovery functionality disabled
}