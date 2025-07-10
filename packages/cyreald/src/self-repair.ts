/**
 * Self-Repair Module for Cyreal
 * Automatically fixes common issues that confuse administrators
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as winston from 'winston';
import { getConfigPath, getDataPath, getLogPath } from '@cyreal/core';

const execAsync = promisify(exec);

export interface RepairIssue {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFix: boolean;
  userAction?: string;
}

export interface RepairReport {
  timestamp: Date;
  issues: RepairIssue[];
  fixed: string[];
  needsAttention: RepairIssue[];
  healthy: boolean;
}

export class SelfRepairService {
  private logger: winston.Logger;
  private isWindows = process.platform === 'win32';
  private isMac = process.platform === 'darwin';
  private isLinux = process.platform === 'linux';

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  /**
   * Run comprehensive health check and auto-repair
   */
  async runDiagnostics(): Promise<RepairReport> {
    this.logger.info('🔧 Running self-diagnostics and repair...');
    
    const issues: RepairIssue[] = [];
    const fixed: string[] = [];
    const startTime = Date.now();

    // Check 1: Service/Process Status
    const serviceIssue = await this.checkServiceStatus();
    if (serviceIssue) {
      issues.push(serviceIssue);
      if (serviceIssue.autoFix) {
        const fixResult = await this.fixService();
        if (fixResult) fixed.push('service_status');
      }
    }

    // Check 2: Directory Permissions
    const permIssues = await this.checkPermissions();
    for (const issue of permIssues) {
      issues.push(issue);
      if (issue.autoFix) {
        const fixResult = await this.fixPermissions(issue.id);
        if (fixResult) fixed.push(issue.id);
      }
    }

    // Check 3: Configuration Validity
    const configIssue = await this.checkConfiguration();
    if (configIssue) {
      issues.push(configIssue);
      if (configIssue.autoFix) {
        const fixResult = await this.fixConfiguration();
        if (fixResult) fixed.push('configuration');
      }
    }

    // Check 4: Network/Firewall
    const networkIssue = await this.checkNetwork();
    if (networkIssue) {
      issues.push(networkIssue);
      if (networkIssue.autoFix && this.isWindows) {
        const fixResult = await this.fixWindowsFirewall();
        if (fixResult) fixed.push('firewall');
      }
    }

    // Check 5: USB/Serial Port Access
    const deviceIssue = await this.checkDeviceAccess();
    if (deviceIssue) {
      issues.push(deviceIssue);
      if (deviceIssue.autoFix) {
        const fixResult = await this.fixDeviceAccess();
        if (fixResult) fixed.push('device_access');
      }
    }

    // Check 6: Database Integrity
    const dbIssue = await this.checkDatabase();
    if (dbIssue) {
      issues.push(dbIssue);
      if (dbIssue.autoFix) {
        const fixResult = await this.fixDatabase();
        if (fixResult) fixed.push('database');
      }
    }

    // Check 7: Log Rotation
    const logIssue = await this.checkLogSize();
    if (logIssue) {
      issues.push(logIssue);
      if (logIssue.autoFix) {
        const fixResult = await this.rotateLogs();
        if (fixResult) fixed.push('log_rotation');
      }
    }

    // Generate report
    const needsAttention = issues.filter(i => !fixed.includes(i.id));
    const report: RepairReport = {
      timestamp: new Date(),
      issues,
      fixed,
      needsAttention,
      healthy: needsAttention.length === 0
    };

    const duration = Date.now() - startTime;
    this.logger.info(`✅ Self-repair completed in ${duration}ms`, {
      issuesFound: issues.length,
      issuesFixed: fixed.length,
      needsAttention: needsAttention.length
    });

    // Save report
    await this.saveReport(report);

    return report;
  }

  /**
   * Check if service is running properly
   */
  private async checkServiceStatus(): Promise<RepairIssue | null> {
    try {
      if (this.isWindows) {
        const { stdout } = await execAsync('sc query Cyreal');
        if (!stdout.includes('RUNNING')) {
          return {
            id: 'service_stopped',
            description: 'Cyreal service is not running',
            severity: 'critical',
            autoFix: true
          };
        }
      } else if (this.isLinux) {
        const { stdout } = await execAsync('systemctl is-active cyreal');
        if (stdout.trim() !== 'active') {
          return {
            id: 'service_stopped',
            description: 'Cyreal service is not running',
            severity: 'critical',
            autoFix: true
          };
        }
      } else if (this.isMac) {
        const { stdout } = await execAsync('launchctl list | grep com.cyreal.daemon');
        if (!stdout) {
          return {
            id: 'service_stopped',
            description: 'Cyreal daemon is not running',
            severity: 'critical',
            autoFix: true
          };
        }
      }
    } catch (error) {
      return {
        id: 'service_check_failed',
        description: 'Unable to check service status',
        severity: 'high',
        autoFix: false,
        userAction: 'Check if Cyreal service is installed correctly'
      };
    }
    return null;
  }

  /**
   * Fix service issues
   */
  private async fixService(): Promise<boolean> {
    try {
      this.logger.info('Attempting to start Cyreal service...');
      
      if (this.isWindows) {
        await execAsync('net start Cyreal');
      } else if (this.isLinux) {
        await execAsync('sudo systemctl start cyreal');
      } else if (this.isMac) {
        await execAsync('sudo launchctl load /Library/LaunchDaemons/com.cyreal.daemon.plist');
      }
      
      this.logger.info('✅ Service started successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to start service:', error);
      return false;
    }
  }

  /**
   * Check directory permissions
   */
  private async checkPermissions(): Promise<RepairIssue[]> {
    const issues: RepairIssue[] = [];
    const dirs = [
      { path: getConfigPath(), type: 'config' },
      { path: getDataPath(), type: 'data' },
      { path: getLogPath(), type: 'log' }
    ];

    for (const dir of dirs) {
      try {
        // Check if directory exists
        if (!fs.existsSync(dir.path)) {
          issues.push({
            id: `missing_${dir.type}_dir`,
            description: `${dir.type} directory missing: ${dir.path}`,
            severity: 'high',
            autoFix: true
          });
          continue;
        }

        // Check if writable
        fs.accessSync(dir.path, fs.constants.W_OK);
      } catch (error) {
        issues.push({
          id: `${dir.type}_not_writable`,
          description: `Cannot write to ${dir.type} directory: ${dir.path}`,
          severity: 'high',
          autoFix: true
        });
      }
    }

    return issues;
  }

  /**
   * Fix permission issues
   */
  private async fixPermissions(issueId: string): Promise<boolean> {
    try {
      if (issueId.includes('missing')) {
        // Create missing directory
        const dirType = issueId.replace('missing_', '').replace('_dir', '');
        let dirPath = '';
        
        switch (dirType) {
          case 'config':
            dirPath = getConfigPath();
            break;
          case 'data':
            dirPath = getDataPath();
            break;
          case 'log':
            dirPath = getLogPath();
            break;
        }
        
        if (dirPath) {
          fs.mkdirSync(dirPath, { recursive: true });
          this.logger.info(`✅ Created directory: ${dirPath}`);
          
          // Set proper permissions on Linux/Mac
          if (!this.isWindows) {
            await execAsync(`chmod 755 "${dirPath}"`);
          }
          return true;
        }
      } else if (issueId.includes('not_writable')) {
        // Fix permissions
        const dirType = issueId.replace('_not_writable', '');
        let dirPath = '';
        
        switch (dirType) {
          case 'config':
            dirPath = getConfigPath();
            break;
          case 'data':
            dirPath = getDataPath();
            break;
          case 'log':
            dirPath = getLogPath();
            break;
        }
        
        if (dirPath && !this.isWindows) {
          await execAsync(`chmod 755 "${dirPath}"`);
          this.logger.info(`✅ Fixed permissions for: ${dirPath}`);
          return true;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to fix permissions for ${issueId}:`, error);
    }
    return false;
  }

  /**
   * Check configuration file
   */
  private async checkConfiguration(): Promise<RepairIssue | null> {
    const configFile = path.join(getConfigPath(), 'cyreal.yaml');
    
    try {
      if (!fs.existsSync(configFile)) {
        return {
          id: 'missing_config',
          description: 'Configuration file missing',
          severity: 'medium',
          autoFix: true
        };
      }
      
      // Try to parse the config
      const content = fs.readFileSync(configFile, 'utf8');
      if (!content || content.trim().length === 0) {
        return {
          id: 'empty_config',
          description: 'Configuration file is empty',
          severity: 'medium',
          autoFix: true
        };
      }
    } catch (error) {
      return {
        id: 'corrupt_config',
        description: 'Configuration file is corrupted',
        severity: 'high',
        autoFix: true
      };
    }
    
    return null;
  }

  /**
   * Fix configuration issues
   */
  private async fixConfiguration(): Promise<boolean> {
    try {
      const configFile = path.join(getConfigPath(), 'cyreal.yaml');
      
      // Create default configuration
      const defaultConfig = `# Cyreal Configuration
# Generated by self-repair module

daemon:
  logLevel: info
  hotReload: true

network:
  tcp:
    enabled: true
    port: 3500
    host: 127.0.0.1

security:
  level: balanced
  allowedIPs:
    - 127.0.0.1
    - 192.168.0.0/16
    - 10.0.0.0/8
    - 172.16.0.0/12

ports:
  default:
    baudRate: 9600
    dataBits: 8
    stopBits: 1
    parity: none
`;

      // Backup existing config if it exists
      if (fs.existsSync(configFile)) {
        const backupFile = `${configFile}.backup.${Date.now()}`;
        fs.copyFileSync(configFile, backupFile);
        this.logger.info(`Backed up existing config to: ${backupFile}`);
      }

      // Write default config
      fs.writeFileSync(configFile, defaultConfig, 'utf8');
      this.logger.info('✅ Created default configuration file');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to fix configuration:', error);
      return false;
    }
  }

  /**
   * Check network/firewall access
   */
  private async checkNetwork(): Promise<RepairIssue | null> {
    try {
      // Check if port 8443 is accessible
      if (this.isWindows) {
        const { stdout } = await execAsync('netsh advfirewall firewall show rule name="Cyreal"');
        if (!stdout.includes('Enabled:') || stdout.includes('No rules match')) {
          return {
            id: 'firewall_blocked',
            description: 'Windows Firewall may be blocking Cyreal',
            severity: 'high',
            autoFix: true
          };
        }
      }
      
      // TODO: Add checks for Linux iptables and Mac firewall
    } catch (error) {
      // Command failed, likely means rule doesn't exist
      if (this.isWindows) {
        return {
          id: 'firewall_blocked',
          description: 'Windows Firewall may be blocking Cyreal',
          severity: 'high',
          autoFix: true
        };
      }
    }
    
    return null;
  }

  /**
   * Fix Windows firewall issues
   */
  private async fixWindowsFirewall(): Promise<boolean> {
    try {
      this.logger.info('Adding Windows Firewall exception for Cyreal...');
      
      // Add firewall rule for the service
      await execAsync(`netsh advfirewall firewall add rule name="Cyreal" dir=in action=allow program="${process.execPath}" enable=yes`);
      
      // Add rule for the dashboard port
      await execAsync('netsh advfirewall firewall add rule name="Cyreal Dashboard" dir=in action=allow protocol=TCP localport=8443');
      
      this.logger.info('✅ Windows Firewall rules added');
      return true;
    } catch (error) {
      this.logger.error('Failed to add firewall rules:', error);
      return false;
    }
  }

  /**
   * Check device access permissions
   */
  private async checkDeviceAccess(): Promise<RepairIssue | null> {
    if (this.isLinux) {
      try {
        // Check if user is in dialout group (needed for serial port access)
        const { stdout } = await execAsync('groups');
        if (!stdout.includes('dialout')) {
          return {
            id: 'missing_dialout_group',
            description: 'User not in dialout group (needed for serial port access)',
            severity: 'high',
            autoFix: false,
            userAction: `Run: sudo usermod -a -G dialout ${os.userInfo().username} && logout`
          };
        }
      } catch (error) {
        // Ignore errors in group check
      }
    }
    
    return null;
  }

  /**
   * Fix device access issues
   */
  private async fixDeviceAccess(): Promise<boolean> {
    // Most device access issues require user intervention
    // or system restart, so we can't auto-fix them
    return false;
  }

  /**
   * Check database integrity
   */
  private async checkDatabase(): Promise<RepairIssue | null> {
    const dbFile = path.join(getDataPath(), 'cyreal.db');
    
    try {
      if (fs.existsSync(dbFile)) {
        const stats = fs.statSync(dbFile);
        
        // Check if database is corrupted (0 bytes)
        if (stats.size === 0) {
          return {
            id: 'empty_database',
            description: 'Database file is empty',
            severity: 'high',
            autoFix: true
          };
        }
        
        // Check if database is too large (>1GB)
        if (stats.size > 1024 * 1024 * 1024) {
          return {
            id: 'large_database',
            description: 'Database file is very large (>1GB)',
            severity: 'medium',
            autoFix: false,
            userAction: 'Consider archiving old data'
          };
        }
      }
    } catch (error) {
      return {
        id: 'database_error',
        description: 'Cannot access database file',
        severity: 'high',
        autoFix: false,
        userAction: 'Check database file permissions'
      };
    }
    
    return null;
  }

  /**
   * Fix database issues
   */
  private async fixDatabase(): Promise<boolean> {
    try {
      const dbFile = path.join(getDataPath(), 'cyreal.db');
      
      // Backup existing database
      if (fs.existsSync(dbFile)) {
        const backupFile = `${dbFile}.backup.${Date.now()}`;
        fs.copyFileSync(dbFile, backupFile);
        this.logger.info(`Backed up database to: ${backupFile}`);
        
        // Remove corrupted database
        fs.unlinkSync(dbFile);
      }
      
      this.logger.info('✅ Database will be recreated on next startup');
      return true;
    } catch (error) {
      this.logger.error('Failed to fix database:', error);
      return false;
    }
  }

  /**
   * Check log file size
   */
  private async checkLogSize(): Promise<RepairIssue | null> {
    const logDir = getLogPath();
    
    try {
      const files = fs.readdirSync(logDir);
      let totalSize = 0;
      
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logDir, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          
          // Check individual file size
          if (stats.size > 100 * 1024 * 1024) { // 100MB
            return {
              id: 'large_logs',
              description: `Log file ${file} is very large (${Math.round(stats.size / 1024 / 1024)}MB)`,
              severity: 'low',
              autoFix: true
            };
          }
        }
      }
      
      // Check total size
      if (totalSize > 500 * 1024 * 1024) { // 500MB
        return {
          id: 'large_logs',
          description: `Total log size is very large (${Math.round(totalSize / 1024 / 1024)}MB)`,
          severity: 'low',
          autoFix: true
        };
      }
    } catch (error) {
      // Ignore errors in log check
    }
    
    return null;
  }

  /**
   * Rotate large log files
   */
  private async rotateLogs(): Promise<boolean> {
    try {
      const logDir = getLogPath();
      const files = fs.readdirSync(logDir);
      
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.size > 100 * 1024 * 1024) { // 100MB
            const archivePath = path.join(logDir, `archive/${file}.${Date.now()}.gz`);
            
            // Ensure archive directory exists
            fs.mkdirSync(path.dirname(archivePath), { recursive: true });
            
            // Move and compress (simplified - in production use proper compression)
            fs.renameSync(filePath, archivePath);
            
            // Create new empty log file
            fs.writeFileSync(filePath, '');
            
            this.logger.info(`✅ Rotated log file: ${file}`);
          }
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Failed to rotate logs:', error);
      return false;
    }
  }

  /**
   * Save repair report
   */
  private async saveReport(report: RepairReport): Promise<void> {
    try {
      const reportPath = path.join(getDataPath(), 'repair-reports');
      fs.mkdirSync(reportPath, { recursive: true });
      
      const filename = `repair-${report.timestamp.toISOString().split('T')[0]}.json`;
      const filePath = path.join(reportPath, filename);
      
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      
      // Also save a human-readable summary if there are issues
      if (report.needsAttention.length > 0) {
        const summaryPath = path.join(getDataPath(), 'REPAIR_NEEDED.txt');
        const summary = this.generateHumanReadableSummary(report);
        fs.writeFileSync(summaryPath, summary);
      }
    } catch (error) {
      this.logger.error('Failed to save repair report:', error);
    }
  }

  /**
   * Generate human-readable summary for admins
   */
  private generateHumanReadableSummary(report: RepairReport): string {
    let summary = `CYREAL HEALTH CHECK REPORT
Generated: ${report.timestamp.toLocaleString()}

`;

    if (report.healthy) {
      summary += '✅ ALL SYSTEMS HEALTHY - No issues found!\n';
    } else {
      summary += `⚠️  ISSUES FOUND - ${report.needsAttention.length} need your attention\n\n`;
      
      summary += 'FIXED AUTOMATICALLY:\n';
      if (report.fixed.length > 0) {
        report.fixed.forEach(fix => {
          summary += `  ✅ ${fix}\n`;
        });
      } else {
        summary += '  None\n';
      }
      
      summary += '\nNEEDS YOUR ATTENTION:\n';
      report.needsAttention.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🚨' : 
                    issue.severity === 'high' ? '❌' :
                    issue.severity === 'medium' ? '⚠️' : 'ℹ️';
        
        summary += `\n${icon} ${issue.description}\n`;
        if (issue.userAction) {
          summary += `   ACTION: ${issue.userAction}\n`;
        }
      });
    }
    
    summary += `\n
HOW TO FIX REMAINING ISSUES:

1. Run Cyreal as Administrator/root for automatic fixes
2. Check the dashboard at http://localhost:8443
3. Contact support@cyreal.io if problems persist

To run repair again: cyreal repair
`;

    return summary;
  }

  /**
   * Generate a simple status message for the dashboard
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    message: string;
    lastCheck: Date;
    issues: number;
  }> {
    // Check if we have a recent report
    const reportPath = path.join(getDataPath(), 'repair-reports');
    
    try {
      const files = fs.readdirSync(reportPath)
        .filter(f => f.startsWith('repair-'))
        .sort()
        .reverse();
      
      if (files.length > 0) {
        const latestReport = JSON.parse(
          fs.readFileSync(path.join(reportPath, files[0]), 'utf8')
        ) as RepairReport;
        
        return {
          healthy: latestReport.healthy,
          message: latestReport.healthy ? 
            'All systems operational' : 
            `${latestReport.needsAttention.length} issues need attention`,
          lastCheck: new Date(latestReport.timestamp),
          issues: latestReport.needsAttention.length
        };
      }
    } catch (error) {
      // No reports yet
    }
    
    return {
      healthy: true,
      message: 'No health check performed yet',
      lastCheck: new Date(),
      issues: 0
    };
  }
}