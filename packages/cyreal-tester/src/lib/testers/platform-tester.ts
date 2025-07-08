/**
 * Platform Tester - Tests platform detection and capabilities
 */

import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  TestRunnerOptions, 
  PlatformCapabilities 
} from '../../types/test-types';

const execAsync = promisify(exec);

export class PlatformTester {
  private options: TestRunnerOptions;

  constructor(options: TestRunnerOptions) {
    this.options = options;
  }

  async detectPlatform(): Promise<PlatformCapabilities> {
    const platform = process.platform;
    const arch = process.arch;
    
    // Detect specific platform variants
    const platformName = await this.getSpecificPlatformName();
    const serialPorts = await this.getAvailableSerialPorts();
    const gpioAvailable = await this.checkGpioAvailability();
    const virtualization = await this.detectVirtualizationBasic();
    const specialFeatures = await this.detectSpecialFeatures();
    const timingPrecision = await this.assessTimingPrecision();

    return {
      platform: platformName,
      architecture: arch,
      serialPorts,
      gpio: gpioAvailable,
      virtualized: virtualization.isVirtualized,
      virtualization: virtualization.isVirtualized ? {
        hypervisor: virtualization.hypervisor,
        platform: virtualization.platform,
        limitations: virtualization.limitations,
        recommendations: virtualization.recommendations
      } : undefined,
      specialFeatures,
      timingPrecision
    };
  }

  async checkArchitecture(): Promise<{
    arch: string;
    endianness: string;
    wordSize: number;
    supported: boolean;
    optimizations: string[];
  }> {
    const arch = process.arch;
    const endianness = os.endianness();
    const wordSize = process.arch.includes('64') ? 64 : 32;
    
    // Supported architectures for Cyreal
    const supportedArchs = ['x64', 'arm64', 'arm'];
    const supported = supportedArchs.includes(arch);
    
    const optimizations: string[] = [];
    if (arch === 'arm64') {
      optimizations.push('ARM64 NEON SIMD');
    }
    if (arch === 'x64') {
      optimizations.push('x86_64 SSE');
    }

    return {
      arch,
      endianness,
      wordSize,
      supported,
      optimizations
    };
  }

  async testGpioCapabilities(): Promise<{
    available: boolean;
    chips: string[];
    restrictedAccess: boolean;
    error?: string;
  }> {
    if (process.platform === 'win32') {
      return {
        available: false,
        chips: [],
        restrictedAccess: true,
        error: 'GPIO not supported on Windows'
      };
    }

    try {
      // Check for GPIO chip devices
      const gpioChips: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const chipPath = `/dev/gpiochip${i}`;
        if (fs.existsSync(chipPath)) {
          gpioChips.push(chipPath);
        }
      }

      // Check if we can access them
      let restrictedAccess = false;
      for (const chip of gpioChips) {
        try {
          fs.accessSync(chip, fs.constants.R_OK | fs.constants.W_OK);
        } catch (e) {
          restrictedAccess = true;
        }
      }

      return {
        available: gpioChips.length > 0,
        chips: gpioChips,
        restrictedAccess
      };

    } catch (error) {
      return {
        available: false,
        chips: [],
        restrictedAccess: true,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async detectVirtualization(): Promise<{
    isVirtualized: boolean;
    hypervisor: string;
    platform: string;
    confidence: number;
    details: any;
  }> {
    const detectionMethods = [
      this.checkDMI.bind(this),
      this.checkContainerEnvironment.bind(this),
      this.checkVirtualizationFiles.bind(this),
      this.checkSystemInfo.bind(this)
    ];

    const results = await Promise.allSettled(
      detectionMethods.map(method => method())
    );

    // Analyze results
    let maxConfidence = 0;
    let bestResult = { 
      isVirtualized: false, 
      hypervisor: 'bare-metal', 
      platform: os.platform(),
      confidence: 85 
    };

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.confidence > maxConfidence) {
        maxConfidence = result.value.confidence;
        bestResult = result.value;
      }
    }

    return {
      ...bestResult,
      details: results
    };
  }

  async testTimingPrecision(): Promise<{
    precision: 'high' | 'medium' | 'low';
    jitter: number;
    resolution: number;
    samples: number[];
  }> {
    const samples: number[] = [];
    const iterations = 100;
    
    // Measure timer resolution and jitter
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await new Promise(resolve => setTimeout(resolve, 1));
      const end = process.hrtime.bigint();
      const elapsed = Number(end - start) / 1000000; // Convert to milliseconds
      samples.push(elapsed);
    }

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / samples.length;
    const jitter = Math.sqrt(variance);
    const resolution = Math.min(...samples);

    let precision: 'high' | 'medium' | 'low';
    if (jitter < 0.5 && resolution < 2) {
      precision = 'high';
    } else if (jitter < 2 && resolution < 5) {
      precision = 'medium';
    } else {
      precision = 'low';
    }

    return {
      precision,
      jitter,
      resolution,
      samples: samples.slice(0, 10) // Return first 10 samples
    };
  }

  private async getSpecificPlatformName(): Promise<string> {
    if (process.platform === 'win32') {
      return 'Windows';
    }

    try {
      // Read CPU info to detect specific SBCs
      const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
      
      if (cpuInfo.includes('TI J721E') || cpuInfo.includes('BeagleBone')) {
        return 'BeagleBone AI-64';
      }
      if (cpuInfo.includes('RK3588') || cpuInfo.includes('Rockchip')) {
        return 'Banana Pi BPI-M7';
      }
      if (cpuInfo.includes('BCM2712') || cpuInfo.includes('Raspberry Pi 5')) {
        return 'Raspberry Pi 5';
      }
      if (cpuInfo.includes('BCM2711') || cpuInfo.includes('Raspberry Pi 4')) {
        return 'Raspberry Pi 4';
      }
      
      return `Generic ${process.platform}`;
    } catch (e) {
      return `Generic ${process.platform}`;
    }
  }

  private async getAvailableSerialPorts(): Promise<string[]> {
    try {
      const { SerialPort } = await import('serialport');
      const ports = await SerialPort.list();
      return ports.map(port => port.path);
    } catch (error) {
      return [];
    }
  }

  private async checkGpioAvailability(): Promise<boolean> {
    if (process.platform === 'win32') {
      return false;
    }

    // Check for common GPIO paths
    const gpioPaths = ['/dev/gpiochip0', '/dev/gpiochip1', '/sys/class/gpio'];
    return gpioPaths.some(path => fs.existsSync(path));
  }

  private async detectVirtualizationBasic(): Promise<{
    isVirtualized: boolean;
    hypervisor: string;
    platform: string;
    limitations: string[];
    recommendations: string[];
  }> {
    // Simple virtualization detection
    const checks = [
      this.checkForDockerEnv(),
      this.checkForWSL(),
      await this.checkDMI()
    ];

    const virtualized = checks.some(check => check.isVirtualized);
    
    if (virtualized) {
      const detectedCheck = checks.find(check => check.isVirtualized);
      return detectedCheck || {
        isVirtualized: true,
        hypervisor: 'unknown',
        platform: 'unknown',
        limitations: ['Limited hardware access'],
        recommendations: ['Use network-based solutions']
      };
    }

    return {
      isVirtualized: false,
      hypervisor: 'bare-metal',
      platform: 'physical',
      limitations: [],
      recommendations: ['Full hardware access available']
    };
  }

  private async detectSpecialFeatures(): Promise<string[]> {
    const features: string[] = [];

    // Check for specific SBC features
    try {
      const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
      
      if (cpuInfo.includes('TI J721E')) {
        features.push('PRU', 'AI_accelerator', 'MikroE_Click');
      }
      if (cpuInfo.includes('RK3588')) {
        features.push('NPU_6TOPS', 'PCIe', 'HDMI_in');
      }
      if (cpuInfo.includes('BCM2712')) {
        features.push('RP1_chip', 'PCIe', 'dual_4K');
      }
    } catch (e) {
      // Ignore errors
    }

    return features;
  }

  private async assessTimingPrecision(): Promise<'high' | 'medium' | 'low'> {
    // Quick timing assessment
    const start = process.hrtime.bigint();
    await new Promise(resolve => setTimeout(resolve, 10));
    const end = process.hrtime.bigint();
    const precision = Number(end - start) / 1000000;

    if (precision < 12) return 'high';
    if (precision < 20) return 'medium';
    return 'low';
  }

  private checkForDockerEnv(): any {
    if (fs.existsSync('/.dockerenv')) {
      return {
        isVirtualized: true,
        hypervisor: 'Docker',
        platform: 'Docker Container',
        confidence: 90,
        limitations: ['No GPIO access', 'Limited device access'],
        recommendations: ['Use --device for hardware access']
      };
    }
    return { isVirtualized: false, confidence: 0 };
  }

  private checkForWSL(): any {
    if (process.env.WSL_DISTRO_NAME) {
      return {
        isVirtualized: true,
        hypervisor: 'WSL',
        platform: 'Windows Subsystem for Linux',
        confidence: 95,
        limitations: ['No GPIO access', 'No direct serial access'],
        recommendations: ['Use usbipd-win for USB devices']
      };
    }
    return { isVirtualized: false, confidence: 0 };
  }

  private async checkDMI(): Promise<any> {
    try {
      const dmiSources = [
        '/sys/class/dmi/id/sys_vendor',
        '/sys/class/dmi/id/product_name'
      ];

      let dmiData = '';
      for (const source of dmiSources) {
        try {
          dmiData += fs.readFileSync(source, 'utf8').toLowerCase();
        } catch (e) {
          // Skip if file doesn't exist
        }
      }

      if (dmiData.includes('vmware')) {
        return {
          isVirtualized: true,
          hypervisor: 'VMware',
          platform: 'VMware',
          confidence: 85,
          limitations: ['Emulated hardware', 'Timing precision reduced'],
          recommendations: ['Use USB passthrough']
        };
      }

      if (dmiData.includes('virtualbox')) {
        return {
          isVirtualized: true,
          hypervisor: 'VirtualBox',
          platform: 'VirtualBox',
          confidence: 85,
          limitations: ['Lower timing precision'],
          recommendations: ['Enable USB 3.0 controller']
        };
      }

      return { isVirtualized: false, confidence: 0 };
    } catch (error) {
      return { isVirtualized: false, confidence: 0 };
    }
  }

  private async checkContainerEnvironment(): Promise<any> {
    try {
      const cgroups = fs.readFileSync('/proc/1/cgroup', 'utf8');
      if (cgroups.includes('docker')) {
        return {
          isVirtualized: true,
          hypervisor: 'Docker',
          platform: 'Container',
          confidence: 90
        };
      }
    } catch (e) {
      // Ignore
    }
    return { isVirtualized: false, confidence: 0 };
  }

  private async checkVirtualizationFiles(): Promise<any> {
    const virtualFiles = [
      '/proc/xen',
      '/sys/hypervisor/type'
    ];

    for (const file of virtualFiles) {
      if (fs.existsSync(file)) {
        return {
          isVirtualized: true,
          hypervisor: 'Xen',
          platform: 'Xen',
          confidence: 75
        };
      }
    }

    return { isVirtualized: false, confidence: 0 };
  }

  private async checkSystemInfo(): Promise<any> {
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('systeminfo');
        if (stdout.includes('Hyper-V')) {
          return {
            isVirtualized: true,
            hypervisor: 'Hyper-V',
            platform: 'Hyper-V',
            confidence: 80
          };
        }
      } catch (e) {
        // Ignore
      }
    }

    return { isVirtualized: false, confidence: 0 };
  }
}