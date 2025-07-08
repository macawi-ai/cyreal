#!/usr/bin/env node

/**
 * Cyreal Testing Utility - Command Line Interface
 * 
 * Independent testing tool for Cyreal daemon functionality
 * Supports text, JSON, and YAML output formats
 * Can be invoked by upper-level systems that cannot use MCP
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { TestRunner } from './lib/test-runner';
import { OutputFormatter } from './lib/output-formatter';
import { TestSuite, TestResult, OutputFormat } from './types/test-types';

const program = new Command();

program
  .name('cyreal-test')
  .description('Testing utility for Cyreal cybernetic serial port infrastructure')
  .version('0.1.0')
  .option('-f, --format <format>', 'Output format (text|json|yaml)', 'text')
  .option('-v, --verbose', 'Verbose output', false)
  .option('-q, --quiet', 'Quiet mode (minimal output)', false)
  .option('--no-color', 'Disable colored output')
  .option('--timeout <ms>', 'Test timeout in milliseconds', '30000');

// Platform Detection Command
program
  .command('platform')
  .description('Test platform detection and capabilities')
  .option('--virtualization', 'Include virtualization detection')
  .option('--gpio', 'Test GPIO capabilities')
  .action(async (options) => {
    await runTest('platform', options);
  });

// Network Connectivity Command
program
  .command('network')
  .description('Test network connectivity to cyreald')
  .option('-h, --host <host>', 'Cyreald host', 'localhost')
  .option('-p, --port <port>', 'TCP port', '3500')
  .option('--udp-port <port>', 'UDP port', '3501')
  .option('--ws-port <port>', 'WebSocket port', '3502')
  .option('--tcp', 'Test TCP connection')
  .option('--udp', 'Test UDP connection')
  .option('--websocket', 'Test WebSocket connection')
  .option('--all', 'Test all protocols')
  .action(async (options) => {
    await runTest('network', options);
  });

// Serial Port Discovery Command
program
  .command('serial')
  .description('Discover and test serial ports')
  .option('--list', 'List available ports')
  .option('--test <port>', 'Test specific port')
  .option('--baud <rate>', 'Baud rate for testing', '9600')
  .option('--data-bits <bits>', 'Data bits', '8')
  .option('--stop-bits <bits>', 'Stop bits', '1')
  .option('--parity <parity>', 'Parity (none|even|odd)', 'none')
  .option('--rs485', 'Test RS-485 capabilities')
  .action(async (options) => {
    await runTest('serial', options);
  });

// Configuration Validation Command
program
  .command('config')
  .description('Validate Cyreal configuration')
  .option('-c, --config <path>', 'Config file path')
  .option('--validate', 'Validate configuration syntax')
  .option('--template <type>', 'Generate config template (minimal|full|production)')
  .action(async (options) => {
    await runTest('config', options);
  });

// Performance Benchmark Command
program
  .command('benchmark')
  .description('Run performance benchmarks')
  .option('--duration <seconds>', 'Benchmark duration', '10')
  .option('--data-size <bytes>', 'Test data size', '1024')
  .option('--concurrent <connections>', 'Concurrent connections', '1')
  .action(async (options) => {
    await runTest('benchmark', options);
  });

// Comprehensive Test Suite Command
program
  .command('all')
  .description('Run comprehensive test suite')
  .option('--skip <tests>', 'Skip specific tests (comma-separated)')
  .option('--only <tests>', 'Run only specific tests (comma-separated)')
  .action(async (options) => {
    await runTest('all', options);
  });

// Daemon Status Command
program
  .command('status')
  .description('Get cyreald daemon status')
  .option('-h, --host <host>', 'Cyreald host', 'localhost')
  .option('-p, --port <port>', 'TCP port', '3500')
  .action(async (options) => {
    await runTest('status', options);
  });

// Health Check Command
program
  .command('health')
  .description('Perform health check of Cyreal infrastructure')
  .option('--critical-only', 'Show only critical issues')
  .action(async (options) => {
    await runTest('health', options);
  });

async function runTest(testType: string, commandOptions: any) {
  const globalOptions = program.opts();
  const options = { ...globalOptions, ...commandOptions };
  
  // Validate format
  const validFormats: OutputFormat[] = ['text', 'json', 'yaml'];
  if (!validFormats.includes(options.format)) {
    console.error(chalk.red(`Invalid format: ${options.format}. Use one of: ${validFormats.join(', ')}`));
    process.exit(1);
  }

  try {
    const testRunner = new TestRunner({
      verbose: options.verbose,
      timeout: parseInt(options.timeout),
      quiet: options.quiet
    });

    const results = await testRunner.runTestSuite(testType as TestSuite, options);
    
    const formatter = new OutputFormatter({
      format: options.format as OutputFormat,
      colorize: !options.noColor,
      verbose: options.verbose
    });

    const output = formatter.format(results);
    console.log(output);

    // Exit with error code if any tests failed
    const hasFailures = results.some(result => !result.success);
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    if (options.format === 'json') {
      console.log(JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false,
        timestamp: new Date().toISOString()
      }, null, 2));
    } else {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    process.exit(1);
  }
}

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

program.parse();