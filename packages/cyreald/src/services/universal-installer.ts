/**
 * Universal Installer - Cross-Platform Service Installation
 * Handles installation, configuration, and management across all supported platforms
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import { PlatformManager, ServiceConfig } from './platform-manager';
import { SecureCommandExecutor } from './secure-command-executor';

const execAsync = promisify(exec);

export interface InstallationOptions {
  serviceName?: string;
  displayName?: string;
  description?: string;
  user?: string;
  group?: string;
  autoStart?: boolean;
  createUser?: boolean;
  logDirectory?: string;
  dataDirectory?: string;
  configPath?: string;
  force?: boolean;
}

export interface InstallationResult {
  success: boolean;
  platform: string;
  serviceManager: string;
  serviceName: string;
  configFiles: string[];
  logFiles: string[];
  message: string;
  nextSteps: string[];
}

export class UniversalInstaller {
  private platformManager: PlatformManager;
  private options: Required<InstallationOptions>;

  constructor(options: InstallationOptions = {}) {
    this.platformManager = new PlatformManager();
    
    // Set defaults based on platform
    const platform = this.platformManager.getPlatformInfo();
    
    this.options = {
      serviceName: options.serviceName || 'cyreal-core',
      displayName: options.displayName || 'Cyreal Core Service',
      description: options.description || 'Cybernetic Serial Port Bridge for AI Systems',
      user: options.user || this.getDefaultUser(platform.platform),
      group: options.group || this.getDefaultGroup(platform.platform),
      autoStart: options.autoStart !== false,
      createUser: options.createUser !== false,
      logDirectory: options.logDirectory || this.getDefaultLogDirectory(platform.platform),
      dataDirectory: options.dataDirectory || this.getDefaultDataDirectory(platform.platform),
      configPath: options.configPath || this.getDefaultConfigPath(platform.platform),
      force: options.force || false
    };
  }

  /**
   * Install Cyreal as a system service
   */
  async install(): Promise<InstallationResult> {
    const platform = this.platformManager.getPlatformInfo();
    
    try {
      console.log('🚀 Installing Cyreal Universal Service...');
      console.log(`📊 Platform: ${platform.platform} (${platform.architecture})`);
      console.log(`⚙️  Service Manager: ${platform.serviceManager}`);
      console.log('');

      // Pre-installation checks
      await this.preInstallationChecks();

      // Create directories and users
      await this.createSystemResources();

      // Install the service
      const serviceConfig = await this.buildServiceConfig();
      await this.platformManager.installService(serviceConfig);

      // Post-installation setup
      await this.postInstallationSetup();

      const result: InstallationResult = {
        success: true,
        platform: platform.platform,
        serviceManager: platform.serviceManager,
        serviceName: this.options.serviceName,
        configFiles: [this.options.configPath],
        logFiles: [
          path.join(this.options.logDirectory, `${this.options.serviceName}.log`),
          path.join(this.options.logDirectory, `${this.options.serviceName}.error.log`)
        ],
        message: `✅ Cyreal service installed successfully as '${this.options.serviceName}'`,
        nextSteps: this.generateNextSteps()
      };

      this.displayInstallationResult(result);
      return result;

    } catch (error) {
      const result: InstallationResult = {
        success: false,
        platform: platform.platform,
        serviceManager: platform.serviceManager,
        serviceName: this.options.serviceName,
        configFiles: [],
        logFiles: [],
        message: `❌ Installation failed: ${error instanceof Error ? error.message : String(error)}`,
        nextSteps: ['Check system permissions', 'Review error messages', 'Run with elevated privileges']
      };

      console.error(result.message);
      return result;
    }
  }

  /**
   * Uninstall Cyreal service
   */
  async uninstall(): Promise<InstallationResult> {
    const platform = this.platformManager.getPlatformInfo();
    
    try {
      console.log('🗑️  Uninstalling Cyreal service...');

      // Stop service if running
      try {
        await this.platformManager.stopService(this.options.serviceName);
        console.log('⏹️  Service stopped');
      } catch (error) {
        console.log('⚠️  Service was not running');
      }

      // Uninstall service
      await this.platformManager.uninstallService(this.options.serviceName);

      // Clean up files (optional)
      if (this.options.force) {
        await this.cleanupSystemResources();
      }

      const result: InstallationResult = {
        success: true,
        platform: platform.platform,
        serviceManager: platform.serviceManager,
        serviceName: this.options.serviceName,
        configFiles: [],
        logFiles: [],
        message: `✅ Cyreal service '${this.options.serviceName}' uninstalled successfully`,
        nextSteps: this.options.force 
          ? ['Service and all data removed']
          : ['Configuration and data files preserved', 'Use --force to remove all files']
      };

      console.log(result.message);
      return result;

    } catch (error) {
      const result: InstallationResult = {
        success: false,
        platform: platform.platform,
        serviceManager: platform.serviceManager,
        serviceName: this.options.serviceName,
        configFiles: [],
        logFiles: [],
        message: `❌ Uninstallation failed: ${error instanceof Error ? error.message : String(error)}`,
        nextSteps: ['Check system permissions', 'Try manual cleanup']
      };

      console.error(result.message);
      return result;
    }
  }

  /**
   * Check service status
   */
  async status(): Promise<{
    installed: boolean;
    running: boolean;
    status: string;
    configExists: boolean;
    logsExist: boolean;
  }> {
    const status = await this.platformManager.getServiceStatus(this.options.serviceName);
    const configExists = fs.existsSync(this.options.configPath);
    const logsExist = fs.existsSync(this.options.logDirectory);

    return {
      installed: status !== 'unknown',
      running: status === 'running',
      status: status,
      configExists,
      logsExist
    };
  }

  /**
   * Pre-installation checks
   */
  private async preInstallationChecks(): Promise<void> {
    const platform = this.platformManager.getPlatformInfo();

    // Check if we can install services
    if (!platform.canInstallService) {
      throw new Error(`Service installation not supported on ${platform.platform} with ${platform.serviceManager}`);
    }

    // Check if service already exists (unless force)
    if (!this.options.force) {
      const status = await this.platformManager.getServiceStatus(this.options.serviceName);
      if (status !== 'unknown') {
        throw new Error(`Service '${this.options.serviceName}' already exists. Use --force to overwrite.`);
      }
    }

    // Check permissions
    if (platform.requiresElevation && process.getuid && process.getuid() !== 0) {
      throw new Error('Installation requires elevated privileges. Run with sudo.');
    }

    // Check if binary exists
    const binaryPath = this.getBinaryPath();
    if (!fs.existsSync(binaryPath)) {
      throw new Error(`Cyreal binary not found at ${binaryPath}`);
    }

    console.log('✅ Pre-installation checks passed');
  }

  /**
   * Create system resources (directories, users, etc.)
   */
  private async createSystemResources(): Promise<void> {
    const platform = this.platformManager.getPlatformInfo().platform;

    // Create directories
    await this.ensureDirectory(this.options.logDirectory);
    await this.ensureDirectory(this.options.dataDirectory);
    await this.ensureDirectory(path.dirname(this.options.configPath));

    // Create user (if specified and doesn't exist)
    if (this.options.createUser && this.options.user !== 'root' && this.options.user !== 'SYSTEM') {
      await this.createServiceUser();
    }

    // Set permissions
    await this.setDirectoryPermissions();

    console.log('✅ System resources created');
  }

  /**
   * Build service configuration
   */
  private async buildServiceConfig(): Promise<ServiceConfig> {
    const binaryPath = this.getBinaryPath();
    
    return {
      name: this.options.serviceName,
      displayName: this.options.displayName,
      description: this.options.description,
      execPath: binaryPath,
      args: ['start', '--daemon', '--config', this.options.configPath],
      user: this.options.user === 'root' ? undefined : this.options.user,
      group: this.options.group === 'root' ? undefined : this.options.group,
      workingDirectory: this.options.dataDirectory,
      environment: {
        'CYREAL_CONFIG': this.options.configPath,
        'CYREAL_DATA_DIR': this.options.dataDirectory,
        'CYREAL_LOG_DIR': this.options.logDirectory
      },
      autoStart: this.options.autoStart,
      restartPolicy: 'always',
      dependencies: ['network.target']
    };
  }

  /**
   * Post-installation setup
   */
  private async postInstallationSetup(): Promise<void> {
    // Create default config if it doesn't exist
    if (!fs.existsSync(this.options.configPath)) {
      await this.createDefaultConfig();
    }

    // Create log rotation configuration
    await this.setupLogRotation();

    console.log('✅ Post-installation setup completed');
  }

  /**
   * Get default values based on platform
   */
  private getDefaultUser(platform: string): string {
    switch (platform) {
      case 'win32': return 'SYSTEM';
      case 'darwin': return '_cyreal';
      default: return 'cyreal';
    }
  }

  private getDefaultGroup(platform: string): string {
    switch (platform) {
      case 'win32': return 'SYSTEM';
      case 'darwin': return '_cyreal';
      default: return 'cyreal';
    }
  }

  private getDefaultLogDirectory(platform: string): string {
    switch (platform) {
      case 'win32': return 'C:\\ProgramData\\Cyreal\\logs';
      case 'darwin': return '/var/log/cyreal';
      default: return '/var/log/cyreal';
    }
  }

  private getDefaultDataDirectory(platform: string): string {
    switch (platform) {
      case 'win32': return 'C:\\ProgramData\\Cyreal';
      case 'darwin': return '/var/lib/cyreal';
      default: return '/var/lib/cyreal';
    }
  }

  private getDefaultConfigPath(platform: string): string {
    switch (platform) {
      case 'win32': return 'C:\\ProgramData\\Cyreal\\cyreal.yaml';
      case 'darwin': return '/etc/cyreal/cyreal.yaml';
      default: return '/etc/cyreal/cyreal.yaml';
    }
  }

  /**
   * Get binary path
   */
  private getBinaryPath(): string {
    // Try to find the binary in common locations
    const possiblePaths = [
      '/usr/local/bin/cyreal-core',
      '/usr/bin/cyreal-core',
      path.join(process.cwd(), 'dist/cli.js'),
      path.join(__dirname, '../dist/cli.js')
    ];

    for (const binPath of possiblePaths) {
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    }

    // Default to system path
    return 'cyreal-core';
  }

  /**
   * Utility methods
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private async createServiceUser(): Promise<void> {
    const platform = this.platformManager.getPlatformInfo().platform;

    try {
      switch (platform) {
        case 'linux':
          await SecureCommandExecutor.executeSudoCommand('useradd', ['-r', '-s', '/bin/false', '-d', this.options.dataDirectory, this.options.user]);
          break;
        case 'darwin':
          // macOS user creation is complex, skip for now
          console.log('⚠️  Manual user creation required on macOS');
          break;
        case 'win32':
          // Windows uses SYSTEM account
          break;
      }
    } catch (error) {
      // User might already exist
      console.log(`ℹ️  User ${this.options.user} already exists`);
    }
  }

  private async setDirectoryPermissions(): Promise<void> {
    const platform = this.platformManager.getPlatformInfo().platform;

    if (platform !== 'win32') {
      try {
        await SecureCommandExecutor.executeSudoCommand('chown', ['-R', `${this.options.user}:${this.options.group}`, this.options.dataDirectory]);
        await SecureCommandExecutor.executeSudoCommand('chown', ['-R', `${this.options.user}:${this.options.group}`, this.options.logDirectory]);
        await SecureCommandExecutor.executeSudoCommand('chmod', ['755', this.options.dataDirectory]);
        await SecureCommandExecutor.executeSudoCommand('chmod', ['755', this.options.logDirectory]);
      } catch (error) {
        console.log('⚠️  Could not set permissions');
      }
    }
  }

  private async createDefaultConfig(): Promise<void> {
    const defaultConfig = `# Cyreal Configuration File
# Generated automatically during installation

daemon:
  logLevel: info
  logFile: ${path.join(this.options.logDirectory, this.options.serviceName + '.log')}

network:
  tcp:
    port: 3500  # Tribute to Project Cybersyn
    enabled: true
  udp:
    port: 3501
    enabled: false

security:
  level: balanced
  tokenExpiry: "24h"

ports:
  default:
    baudRate: 115200
    dataBits: 8
    stopBits: 1
    parity: none
`;

    await this.ensureDirectory(path.dirname(this.options.configPath));
    fs.writeFileSync(this.options.configPath, defaultConfig);
    console.log(`📝 Default configuration created: ${this.options.configPath}`);
  }

  private async setupLogRotation(): Promise<void> {
    const platform = this.platformManager.getPlatformInfo().platform;

    if (platform === 'linux') {
      const logrotateConfig = `${this.options.logDirectory}/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ${this.options.user} ${this.options.group}
    postrotate
        systemctl reload ${this.options.serviceName} >/dev/null 2>&1 || true
    endscript
}`;

      try {
        fs.writeFileSync(`/etc/logrotate.d/${this.options.serviceName}`, logrotateConfig);
        console.log('📋 Log rotation configured');
      } catch (error) {
        console.log('⚠️  Could not setup log rotation');
      }
    }
  }

  private async cleanupSystemResources(): Promise<void> {
    try {
      // Remove directories
      if (fs.existsSync(this.options.dataDirectory)) {
        fs.rmSync(this.options.dataDirectory, { recursive: true, force: true });
      }
      if (fs.existsSync(this.options.logDirectory)) {
        fs.rmSync(this.options.logDirectory, { recursive: true, force: true });
      }
      if (fs.existsSync(this.options.configPath)) {
        fs.unlinkSync(this.options.configPath);
      }

      console.log('🧹 System resources cleaned up');
    } catch (error) {
      console.log('⚠️  Could not clean up all resources');
    }
  }

  private generateNextSteps(): string[] {
    const steps = [
      `Edit configuration: ${this.options.configPath}`,
      `Start service: cyreal-core service start`,
      `Check status: cyreal-core service status`,
      `View logs: tail -f ${path.join(this.options.logDirectory, this.options.serviceName + '.log')}`
    ];

    const platform = this.platformManager.getPlatformInfo();
    
    if (platform.serviceManager === 'systemd') {
      steps.push(`Systemd commands: systemctl {start|stop|status} ${this.options.serviceName}`);
    } else if (platform.serviceManager === 'launchd') {
      steps.push(`launchctl commands: sudo launchctl {load|unload} /Library/LaunchDaemons/com.cyreal.${this.options.serviceName}.plist`);
    }

    return steps;
  }

  private displayInstallationResult(result: InstallationResult): void {
    console.log('');
    console.log('═'.repeat(60));
    console.log(result.message);
    console.log('═'.repeat(60));
    console.log(`📊 Platform: ${result.platform}`);
    console.log(`⚙️  Service Manager: ${result.serviceManager}`);
    console.log(`🎯 Service Name: ${result.serviceName}`);
    
    if (result.configFiles.length > 0) {
      console.log(`📝 Config Files: ${result.configFiles.join(', ')}`);
    }
    
    if (result.logFiles.length > 0) {
      console.log(`📋 Log Files: ${result.logFiles.join(', ')}`);
    }
    
    console.log('');
    console.log('Next Steps:');
    result.nextSteps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });
    console.log('');
  }
}