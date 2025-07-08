/**
 * Type definitions for Cyreal testing framework
 */

export type OutputFormat = 'text' | 'json' | 'yaml';
export type TestSuite = 'platform' | 'network' | 'serial' | 'config' | 'benchmark' | 'all' | 'status' | 'health';
export type TestStatus = 'pass' | 'fail' | 'warn' | 'skip';

export interface TestResult {
  name: string;
  category: string;
  status: TestStatus;
  success: boolean;
  message: string;
  details?: any;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TestSuiteResult {
  suite: TestSuite;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    duration: number;
  };
  startTime: Date;
  endTime: Date;
  environment: {
    platform: string;
    node: string;
    cyreal: string;
  };
}

export interface TestRunnerOptions {
  verbose: boolean;
  timeout: number;
  quiet: boolean;
}

export interface OutputFormatterOptions {
  format: OutputFormat;
  colorize: boolean;
  verbose: boolean;
}

export interface NetworkTestOptions {
  host: string;
  port: number;
  udpPort?: number;
  wsPort?: number;
  tcp?: boolean;
  udp?: boolean;
  websocket?: boolean;
  all?: boolean;
}

export interface SerialTestOptions {
  list?: boolean;
  test?: string;
  baud?: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
  rs485?: boolean;
}

export interface ConfigTestOptions {
  config?: string;
  validate?: boolean;
  template?: 'minimal' | 'full' | 'production';
}

export interface BenchmarkTestOptions {
  duration: number;
  dataSize: number;
  concurrent: number;
}

export interface PlatformTestOptions {
  virtualization?: boolean;
  gpio?: boolean;
}

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  details?: any;
  recommendations?: string[];
}

export interface CyrealDaemonStatus {
  running: boolean;
  version?: string;
  uptime?: number;
  platform?: any;
  activePorts?: number;
  networkStatus?: {
    tcp: boolean;
    udp: boolean;
    websocket: boolean;
  };
  lastError?: string;
}

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  locationId?: string;
  vendorId?: string;
  productId?: string;
  accessible: boolean;
  testResult?: {
    canOpen: boolean;
    canWrite: boolean;
    canRead: boolean;
    error?: string;
  };
}

export interface NetworkConnectivityResult {
  protocol: 'tcp' | 'udp' | 'websocket';
  host: string;
  port: number;
  connected: boolean;
  latency?: number;
  error?: string;
  features?: string[];
}

export interface PlatformCapabilities {
  platform: string;
  architecture: string;
  serialPorts: string[];
  gpio: boolean;
  virtualized: boolean;
  virtualization?: {
    hypervisor: string;
    platform: string;
    limitations: string[];
    recommendations: string[];
  };
  specialFeatures: string[];
  timingPrecision: 'high' | 'medium' | 'low';
}

export interface BenchmarkResult {
  test: string;
  duration: number;
  throughput: number;
  latency: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  errors: number;
  errorRate: number;
}