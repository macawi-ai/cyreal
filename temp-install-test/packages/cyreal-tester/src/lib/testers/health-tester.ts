/**
 * Health Tester - Overall system health checks
 */

import { TestRunnerOptions, HealthCheckResult } from '../../types/test-types';

export class HealthTester {
  private options: TestRunnerOptions;

  constructor(options: TestRunnerOptions) {
    this.options = options;
  }

  async performHealthCheck(options: any): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // System health checks
    results.push(await this.checkSystemResources());
    results.push(await this.checkNodejsVersion());
    results.push(await this.checkDependencies());
    results.push(await this.checkPermissions());
    results.push(await this.checkNetworkPorts());

    // Filter critical only if requested
    if (options.criticalOnly) {
      return results.filter(result => result.status === 'critical');
    }

    return results;
  }

  private async checkSystemResources(): Promise<HealthCheckResult> {
    const os = await import('os');
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    const cpuUsage = await this.getCpuUsage();

    if (memoryUsage > 90 || cpuUsage > 90) {
      return {
        component: 'System Resources',
        status: 'critical',
        message: `High resource usage: Memory ${memoryUsage.toFixed(1)}%, CPU ${cpuUsage.toFixed(1)}%`,
        details: { memoryUsage, cpuUsage, freeMemory, totalMemory },
        recommendations: ['Consider reducing system load', 'Close unnecessary applications']
      };
    } else if (memoryUsage > 70 || cpuUsage > 70) {
      return {
        component: 'System Resources',
        status: 'warning',
        message: `Moderate resource usage: Memory ${memoryUsage.toFixed(1)}%, CPU ${cpuUsage.toFixed(1)}%`,
        details: { memoryUsage, cpuUsage }
      };
    }

    return {
      component: 'System Resources',
      status: 'healthy',
      message: `Resources healthy: Memory ${memoryUsage.toFixed(1)}%, CPU ${cpuUsage.toFixed(1)}%`,
      details: { memoryUsage, cpuUsage }
    };
  }

  private async checkNodejsVersion(): Promise<HealthCheckResult> {
    const version = process.version;
    const major = parseInt(version.split('.')[0].substring(1));

    if (major < 18) {
      return {
        component: 'Node.js Version',
        status: 'critical',
        message: `Node.js ${version} is too old, requires >= 18.0.0`,
        details: { currentVersion: version, requiredVersion: '>=18.0.0' },
        recommendations: ['Update Node.js to version 18 or higher']
      };
    } else if (major < 20) {
      return {
        component: 'Node.js Version',
        status: 'warning',
        message: `Node.js ${version} is supported but consider upgrading`,
        details: { currentVersion: version },
        recommendations: ['Consider upgrading to Node.js 20+ for better performance']
      };
    }

    return {
      component: 'Node.js Version',
      status: 'healthy',
      message: `Node.js ${version} is supported`,
      details: { currentVersion: version }
    };
  }

  private async checkDependencies(): Promise<HealthCheckResult> {
    const criticalDependencies = ['serialport'];
    const missing: string[] = [];

    for (const dep of criticalDependencies) {
      try {
        require(dep);
      } catch (error) {
        missing.push(dep);
      }
    }

    if (missing.length > 0) {
      return {
        component: 'Dependencies',
        status: 'critical',
        message: `Missing critical dependencies: ${missing.join(', ')}`,
        details: { missing },
        recommendations: ['Run npm install to install missing dependencies']
      };
    }

    return {
      component: 'Dependencies',
      status: 'healthy',
      message: 'All critical dependencies available',
      details: { checked: criticalDependencies }
    };
  }

  private async checkPermissions(): Promise<HealthCheckResult> {
    const fs = await import('fs');
    const issues: string[] = [];

    // Check serial port access on Unix systems
    if (process.platform !== 'win32') {
      try {
        // Check if user is in dialout group (common requirement for serial access)
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        try {
          const { stdout } = await execAsync('groups');
          if (!stdout.includes('dialout') && !stdout.includes('uucp')) {
            issues.push('User not in dialout/uucp group for serial port access');
          }
        } catch (e) {
          // Can't check groups, not critical
        }
      } catch (e) {
        // Ignore if can't check
      }

      // Check GPIO access
      if (fs.existsSync('/dev/gpiochip0')) {
        try {
          fs.accessSync('/dev/gpiochip0', fs.constants.R_OK | fs.constants.W_OK);
        } catch (e) {
          issues.push('No GPIO access permissions');
        }
      }
    }

    if (issues.length > 0) {
      return {
        component: 'Permissions',
        status: 'warning',
        message: `Permission issues detected: ${issues.join(', ')}`,
        details: { issues },
        recommendations: [
          'Add user to dialout group: sudo usermod -a -G dialout $USER',
          'Add user to gpio group: sudo usermod -a -G gpio $USER',
          'Log out and back in for group changes to take effect'
        ]
      };
    }

    return {
      component: 'Permissions',
      status: 'healthy',
      message: 'Permissions appear adequate',
      details: {}
    };
  }

  private async checkNetworkPorts(): Promise<HealthCheckResult> {
    const net = await import('net');
    const testPorts = [3500, 3501, 3502]; // Cyreal default ports
    const inUse: number[] = [];

    for (const port of testPorts) {
      const inUseByOther = await this.isPortInUse(port);
      if (inUseByOther) {
        inUse.push(port);
      }
    }

    if (inUse.includes(3500)) {
      return {
        component: 'Network Ports',
        status: 'critical',
        message: `Critical port 3500 (Cybersyn tribute) is in use`,
        details: { portsInUse: inUse },
        recommendations: [
          'Stop service using port 3500',
          'Configure Cyreal to use different port',
          'Check with: netstat -tlnp | grep 3500'
        ]
      };
    } else if (inUse.length > 0) {
      return {
        component: 'Network Ports',
        status: 'warning',
        message: `Some Cyreal ports in use: ${inUse.join(', ')}`,
        details: { portsInUse: inUse },
        recommendations: ['Check port usage and configure accordingly']
      };
    }

    return {
      component: 'Network Ports',
      status: 'healthy',
      message: 'Cyreal ports available',
      details: { checkedPorts: testPorts }
    };
  }

  private async getCpuUsage(): Promise<number> {
    const os = await import('os');
    
    return new Promise((resolve) => {
      const cpus = os.cpus();
      const startMeasure = cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
        const idle = cpu.times.idle;
        return { total, idle };
      });

      setTimeout(() => {
        const endMeasure = os.cpus().map(cpu => {
          const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
          const idle = cpu.times.idle;
          return { total, idle };
        });

        const totalUsage = startMeasure.map((start, i) => {
          const end = endMeasure[i];
          const totalDiff = end.total - start.total;
          const idleDiff = end.idle - start.idle;
          return 100 - (idleDiff / totalDiff) * 100;
        });

        const avgUsage = totalUsage.reduce((acc, usage) => acc + usage, 0) / totalUsage.length;
        resolve(avgUsage);
      }, 100);
    });
  }

  private async isPortInUse(port: number): Promise<boolean> {
    const net = await import('net');
    
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', () => {
        resolve(true); // Port in use
      });
      
      server.once('listening', () => {
        server.close();
        resolve(false); // Port available
      });
      
      server.listen(port);
    });
  }
}