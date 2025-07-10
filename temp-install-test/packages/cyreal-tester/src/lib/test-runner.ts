/**
 * Test Runner - Coordinates all Cyreal testing operations
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';
import ora from 'ora';
import {
  TestResult,
  TestSuite,
  TestRunnerOptions,
  NetworkTestOptions,
  SerialTestOptions,
  ConfigTestOptions,
  BenchmarkTestOptions,
  PlatformTestOptions
} from '../types/test-types';

import { PlatformTester } from './testers/platform-tester';
import { NetworkTester } from './testers/network-tester';
import { SerialTester } from './testers/serial-tester';
import { ConfigTester } from './testers/config-tester';
import { BenchmarkTester } from './testers/benchmark-tester';
import { HealthTester } from './testers/health-tester';
// EnhancedDeviceTester removed - fingerprinting functionality will be reimplemented after manufacturer consultation

export class TestRunner extends EventEmitter {
  private options: TestRunnerOptions;
  private spinner?: any;

  constructor(options: TestRunnerOptions) {
    super();
    this.options = options;
  }

  async runTestSuite(suite: TestSuite, testOptions: any): Promise<TestResult[]> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    if (!this.options.quiet) {
      console.log(chalk.cyan(`\n🔬 Running Cyreal ${suite} tests...\n`));
    }

    try {
      switch (suite) {
        case 'platform':
          results.push(...await this.runPlatformTests(testOptions));
          break;
        case 'network':
          results.push(...await this.runNetworkTests(testOptions));
          break;
        case 'serial':
          results.push(...await this.runSerialTests(testOptions));
          break;
        case 'config':
          results.push(...await this.runConfigTests(testOptions));
          break;
        case 'benchmark':
          results.push(...await this.runBenchmarkTests(testOptions));
          break;
        case 'status':
          results.push(...await this.runStatusCheck(testOptions));
          break;
        case 'health':
          results.push(...await this.runHealthCheck(testOptions));
          break;
        // Discovery functionality removed - reimplemented as A2A agent discovery
        case 'all':
          results.push(...await this.runAllTests(testOptions));
          break;
        default:
          throw new Error(`Unknown test suite: ${suite}`);
      }

      const duration = Date.now() - startTime;
      const passed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (!this.options.quiet) {
        console.log(chalk.cyan(`\n📊 Test Summary:`));
        console.log(chalk.green(`  ✅ Passed: ${passed}`));
        if (failed > 0) {
          console.log(chalk.red(`  ❌ Failed: ${failed}`));
        }
        console.log(chalk.gray(`  ⏱️  Duration: ${duration}ms\n`));
      }

      return results;

    } catch (error) {
      this.stopSpinner();
      throw error;
    }
  }

  private async runPlatformTests(options: PlatformTestOptions): Promise<TestResult[]> {
    const tester = new PlatformTester(this.options);
    const results: TestResult[] = [];

    // Basic platform detection
    results.push(await this.runSingleTest('Platform Detection', 
      () => tester.detectPlatform()));

    // Architecture check
    results.push(await this.runSingleTest('Architecture Check', 
      () => tester.checkArchitecture()));

    // GPIO capabilities (if requested)
    if (options.gpio) {
      results.push(await this.runSingleTest('GPIO Capabilities', 
        () => tester.testGpioCapabilities()));
    }

    // Virtualization detection (if requested)
    if (options.virtualization) {
      results.push(await this.runSingleTest('Virtualization Detection', 
        () => tester.detectVirtualization()));
    }

    // Timing precision
    results.push(await this.runSingleTest('Timing Precision', 
      () => tester.testTimingPrecision()));

    return results;
  }

  private async runNetworkTests(options: NetworkTestOptions): Promise<TestResult[]> {
    const tester = new NetworkTester(this.options);
    const results: TestResult[] = [];

    // Test TCP if requested or if 'all' is specified
    if (options.tcp || options.all || (!options.udp && !options.websocket)) {
      results.push(await this.runSingleTest('TCP Connectivity', 
        () => tester.testTcpConnection(options.host, options.port)));
    }

    // Test UDP if requested
    if (options.udp || options.all) {
      results.push(await this.runSingleTest('UDP Connectivity', 
        () => tester.testUdpConnection(options.host, options.udpPort || 3501)));
    }

    // Test WebSocket if requested
    if (options.websocket || options.all) {
      results.push(await this.runSingleTest('WebSocket Connectivity', 
        () => tester.testWebSocketConnection(options.host, options.wsPort || 3502)));
    }

    // Test daemon commands
    results.push(await this.runSingleTest('Daemon Commands', 
      () => tester.testDaemonCommands(options.host, options.port)));

    return results;
  }

  private async runSerialTests(options: SerialTestOptions): Promise<TestResult[]> {
    const tester = new SerialTester(this.options);
    const results: TestResult[] = [];

    // List available ports
    if (options.list || !options.test) {
      results.push(await this.runSingleTest('Serial Port Discovery', 
        () => tester.discoverPorts()));
    }

    // Test specific port
    if (options.test) {
      results.push(await this.runSingleTest(`Port Test: ${options.test}`, 
        () => tester.testPort(options.test!, {
          baudRate: options.baud || 9600,
          dataBits: options.dataBits || 8,
          stopBits: options.stopBits || 1,
          parity: options.parity || 'none'
        })));

      // RS-485 specific tests
      if (options.rs485) {
        results.push(await this.runSingleTest(`RS-485 Test: ${options.test}`, 
          () => tester.testRs485Capabilities(options.test!)));
      }
    }

    return results;
  }

  private async runConfigTests(options: ConfigTestOptions): Promise<TestResult[]> {
    const tester = new ConfigTester(this.options);
    const results: TestResult[] = [];

    // Configuration validation
    if (options.validate || options.config) {
      results.push(await this.runSingleTest('Configuration Validation', 
        () => tester.validateConfig(options.config)));
    }

    // Template generation
    if (options.template) {
      results.push(await this.runSingleTest(`Template Generation: ${options.template}`, 
        () => tester.generateTemplate(options.template!)));
    }

    // Default paths check
    results.push(await this.runSingleTest('Configuration Paths', 
      () => tester.checkConfigPaths()));

    return results;
  }

  private async runBenchmarkTests(options: BenchmarkTestOptions): Promise<TestResult[]> {
    const tester = new BenchmarkTester(this.options);
    const results: TestResult[] = [];

    // Network throughput
    results.push(await this.runSingleTest('Network Throughput', 
      () => tester.benchmarkNetworkThroughput(options)));

    // Serial port performance
    results.push(await this.runSingleTest('Serial Port Performance', 
      () => tester.benchmarkSerialPerformance(options)));

    // Configuration loading
    results.push(await this.runSingleTest('Configuration Loading', 
      () => tester.benchmarkConfigLoading(options)));

    return results;
  }

  private async runStatusCheck(options: any): Promise<TestResult[]> {
    const tester = new NetworkTester(this.options);
    const results: TestResult[] = [];

    results.push(await this.runSingleTest('Daemon Status', 
      () => tester.getDaemonStatus(options.host, options.port)));

    return results;
  }

  private async runHealthCheck(options: any): Promise<TestResult[]> {
    const tester = new HealthTester(this.options);
    const results: TestResult[] = [];

    results.push(await this.runSingleTest('System Health', 
      () => tester.performHealthCheck(options)));

    return results;
  }

  // runDeviceDiscovery method removed - fingerprinting functionality will be reimplemented after manufacturer consultation

  private async runAllTests(options: any): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Platform tests
    results.push(...await this.runPlatformTests({ 
      virtualization: true, 
      gpio: true 
    }));

    // Network tests
    results.push(...await this.runNetworkTests({ 
      host: 'localhost', 
      port: 3500, 
      all: true 
    }));

    // Serial port discovery
    results.push(...await this.runSerialTests({ list: true }));

    // Configuration validation
    results.push(...await this.runConfigTests({ validate: true }));

    // Health check
    results.push(...await this.runHealthCheck({}));

    return results;
  }

  private async runSingleTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    let spinner: any;

    if (!this.options.quiet && !this.options.verbose) {
      spinner = ora(name).start();
    } else if (this.options.verbose) {
      console.log(chalk.gray(`  🔍 ${name}...`));
    }

    try {
      const result = await Promise.race([
        testFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), this.options.timeout)
        )
      ]);

      const duration = Date.now() - startTime;

      if (spinner) {
        spinner.succeed(chalk.green(`${name} - ${duration}ms`));
      } else if (this.options.verbose) {
        console.log(chalk.green(`    ✅ ${name} - ${duration}ms`));
      }

      return {
        name,
        category: 'test',
        status: 'pass',
        success: true,
        message: 'Test passed',
        details: result,
        duration,
        timestamp: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      if (spinner) {
        spinner.fail(chalk.red(`${name} - ${message}`));
      } else if (this.options.verbose) {
        console.log(chalk.red(`    ❌ ${name} - ${message}`));
      }

      return {
        name,
        category: 'test',
        status: 'fail',
        success: false,
        message,
        duration,
        timestamp: new Date()
      };
    }
  }

  private startSpinner(text: string) {
    if (!this.options.quiet && !this.options.verbose) {
      this.spinner = ora(text).start();
    }
  }

  private stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
  }
}