/**
 * Benchmark Tester - Performance testing for Cyreal components
 */

import { TestRunnerOptions, BenchmarkTestOptions, BenchmarkResult } from '../../types/test-types';

export class BenchmarkTester {
  private options: TestRunnerOptions;

  constructor(options: TestRunnerOptions) {
    this.options = options;
  }

  async benchmarkNetworkThroughput(options: BenchmarkTestOptions): Promise<BenchmarkResult> {
    const { duration, dataSize, concurrent } = options;
    const latencies: number[] = [];
    let totalBytes = 0;
    let errors = 0;
    const startTime = Date.now();

    // Simulate network throughput testing
    const testDuration = duration * 1000; // Convert to milliseconds
    const endTime = startTime + testDuration;

    while (Date.now() < endTime) {
      try {
        const testStart = Date.now();
        
        // Simulate network operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        
        const latency = Date.now() - testStart;
        latencies.push(latency);
        totalBytes += dataSize;
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    const throughput = (totalBytes / 1024) / (actualDuration / 1000); // KB/s

    return this.calculateBenchmarkResult('Network Throughput', actualDuration, throughput, latencies, errors);
  }

  async benchmarkSerialPerformance(options: BenchmarkTestOptions): Promise<BenchmarkResult> {
    const { duration, dataSize } = options;
    const latencies: number[] = [];
    let totalBytes = 0;
    let errors = 0;
    const startTime = Date.now();

    // Simulate serial port performance testing
    const testDuration = duration * 1000;
    const endTime = startTime + testDuration;

    while (Date.now() < endTime) {
      try {
        const testStart = Date.now();
        
        // Simulate serial operation with more realistic timing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 1));
        
        const latency = Date.now() - testStart;
        latencies.push(latency);
        totalBytes += dataSize;
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    const throughput = (totalBytes / 1024) / (actualDuration / 1000); // KB/s

    return this.calculateBenchmarkResult('Serial Performance', actualDuration, throughput, latencies, errors);
  }

  async benchmarkConfigLoading(options: BenchmarkTestOptions): Promise<BenchmarkResult> {
    const latencies: number[] = [];
    let errors = 0;
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      try {
        const testStart = Date.now();
        
        // Simulate config loading
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
        
        const latency = Date.now() - testStart;
        latencies.push(latency);
      } catch (error) {
        errors++;
      }
    }

    const totalDuration = latencies.reduce((sum, lat) => sum + lat, 0);
    const throughput = iterations / (totalDuration / 1000); // ops/second

    return this.calculateBenchmarkResult('Config Loading', totalDuration, throughput, latencies, errors);
  }

  private calculateBenchmarkResult(
    testName: string,
    duration: number,
    throughput: number,
    latencies: number[],
    errors: number
  ): BenchmarkResult {
    const sortedLatencies = latencies.sort((a, b) => a - b);
    const totalOperations = latencies.length + errors;
    
    return {
      test: testName,
      duration,
      throughput,
      latency: {
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        avg: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
        p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0,
        p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0
      },
      errors,
      errorRate: totalOperations > 0 ? (errors / totalOperations) * 100 : 0
    };
  }
}