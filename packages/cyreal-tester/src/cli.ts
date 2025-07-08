#!/usr/bin/env node

/**
 * Cyreal Testing Utility - Command Line Interface
 * 
 * Independent testing tool for Cyreal daemon functionality
 * Supports text, JSON, and YAML output formats
 * Can be invoked by upper-level systems that cannot use MCP
 * 
 * Service-ready with proper binary behavior across platforms
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { TestRunner } from './lib/test-runner';
import { OutputFormatter } from './lib/output-formatter';
import { IndustrialOutputFormatter } from './lib/industrial-output-formatter';
import { TestSuite, TestResult, OutputFormat } from './types/test-types';

const program = new Command();

program
  .name('cyreal-test')
  .description('Testing utility for Cyreal cybernetic serial port infrastructure')
  .version('0.1.0')
  .option('-f, --format <format>', 'Output format (text|json|yaml)', 'text')
  .option('-v, --verbose', 'Verbose output with technical details', false)
  .option('-q, --quiet', 'Quiet mode (minimal output)', false)
  .option('--detailed', 'Show detailed power-user output (timings, debug info)', false)
  .option('--industrial', 'Use industrial-grade formatting (no emojis, aligned columns)', false)
  .option('--no-color', 'Disable colored output')
  .option('--timeout <ms>', 'Test timeout in milliseconds', '30000')
  .action(async (options) => {
    // Default action: comprehensive system overview
    await runDefaultSystemOverview(options);
  });

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

// Device Discovery Command
program
  .command('discover')
  .description('Enhanced IoT device discovery and fingerprinting')
  .option('--enable-protocols', 'Enable protocol detection')
  .option('--enable-capabilities', 'Enable capability testing')
  .option('--enable-security', 'Enable security assessment')
  .option('--safe-mode', 'Run in safe mode (no device commands)')
  .option('--inventory', 'Show device inventory')
  .option('--detailed', 'Show detailed power-user output (timings, debug info)')
  .option('--industrial', 'Use industrial-grade formatting (no emojis, aligned columns)')
  .action(async (options) => {
    await runTest('discover', options);
  });

async function runDefaultSystemOverview(options: any) {
  // Default comprehensive system overview
  const testOptions = {
    host: 'localhost',
    port: 3500,
    format: options.format,
    verbose: options.verbose,
    quiet: options.quiet,
    noColor: options.noColor,
    timeout: options.timeout
  };
  
  if (!options.quiet) {
    console.log(chalk.cyan('\n🔬 Cyreal System Overview'));
    console.log(chalk.gray('═'.repeat(50)));
    console.log('');
  }
  
  try {
    const testRunner = new TestRunner({
      verbose: options.verbose,
      timeout: parseInt(options.timeout),
      quiet: options.quiet
    });

    // Run comprehensive system check
    const results: TestResult[] = [];
    
    // 1. Platform & Environment
    results.push(...await testRunner.runTestSuite('platform', { 
      virtualization: true, 
      gpio: true 
    }));
    
    // 2. Network connectivity (check daemon)
    results.push(...await testRunner.runTestSuite('network', { 
      host: 'localhost', 
      port: 3500, 
      tcp: true 
    }));
    
    // 3. Serial port discovery
    results.push(...await testRunner.runTestSuite('serial', { 
      list: true 
    }));
    
    // 4. System health
    results.push(...await testRunner.runTestSuite('health', {}));
    
    // Format and display results
    const formatter = new OutputFormatter({
      format: options.format as OutputFormat,
      colorize: !options.noColor,
      verbose: options.verbose
    });

    const output = formatter.format(results);
    console.log(output);

    // Show quick summary if in text mode
    if (options.format === 'text' && !options.quiet) {
      await showQuickSystemSummary(results);
    }

    // Exit with appropriate code
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

async function showQuickSystemSummary(results: TestResult[]) {
  console.log(chalk.cyan('\n🎯 Quick System Summary'));
  console.log(chalk.gray('═'.repeat(30)));
  
  // Extract key information from test results
  const platformResult = results.find(r => r.name === 'Platform Detection');
  const networkResult = results.find(r => r.name === 'TCP Connectivity');
  const daemonResult = results.find(r => r.name === 'Daemon Commands');
  const serialResult = results.find(r => r.name === 'Serial Port Discovery');
  const healthResult = results.find(r => r.name === 'System Health');
  
  // Platform info
  if (platformResult?.details) {
    console.log(chalk.green('📱 Platform:'), `${platformResult.details.platform} (${platformResult.details.architecture})`);
    if (platformResult.details.virtualized) {
      console.log(chalk.yellow('🖥️  Virtualized:'), `${platformResult.details.virtualization?.hypervisor || 'Yes'}`);
    }
    if (platformResult.details.specialFeatures?.length > 0) {
      console.log(chalk.blue('⚡ Features:'), platformResult.details.specialFeatures.join(', '));
    }
  }
  
  // Network status
  if (networkResult?.success) {
    console.log(chalk.green('🌐 Network:'), `Port 3500 accessible`);
  } else {
    console.log(chalk.yellow('🌐 Network:'), `Port 3500 not accessible`);
  }
  
  // Daemon status
  if (daemonResult?.success) {
    console.log(chalk.green('🚀 Daemon:'), `Running and responsive`);
  } else {
    console.log(chalk.yellow('🚀 Daemon:'), `Not running on port 3500`);
  }
  
  // Serial ports
  if (serialResult?.details?.length > 0) {
    console.log(chalk.green('🔌 Serial Ports:'), `${serialResult?.details?.length} detected`);
  } else {
    console.log(chalk.gray('🔌 Serial Ports:'), `None detected`);
  }
  
  // Health status
  if (healthResult?.success) {
    console.log(chalk.green('💚 System Health:'), `Good`);
  } else {
    console.log(chalk.yellow('💚 System Health:'), `Issues detected`);
  }
  
  console.log('');
  console.log(chalk.gray('💡 Use specific commands for detailed information:'));
  console.log(chalk.gray('   cyreal-test platform --verbose'));
  console.log(chalk.gray('   cyreal-test network --all'));
  console.log(chalk.gray('   cyreal-test health --format json'));
  console.log('');
}

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
    
    // Determine formatter based on user preferences
    const useIndustrialFormat = options.industrial;
    const useDetailedOutput = options.detailed || options.verbose;
    
    if (useIndustrialFormat) {
      const industrialFormatter = new IndustrialOutputFormatter({
        format: options.format as OutputFormat,
        colorize: !options.noColor,
        verbose: useDetailedOutput
      });
      const output = industrialFormatter.format(results);
      console.log(output);
    } else {
      const formatter = new OutputFormatter({
        format: options.format as OutputFormat,
        colorize: !options.noColor,
        verbose: useDetailedOutput
      });
      const output = formatter.format(results);
      console.log(output);
    }

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