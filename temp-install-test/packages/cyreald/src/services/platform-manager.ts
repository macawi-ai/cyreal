/**
 * Platform Manager - Universal Service Management
 * Detects operating system and provides appropriate service management
 * 
 * Supports: systemd (Linux), launchd (macOS), SCM (Windows)
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { SecureCommandExecutor } from './secure-command-executor';

const execAsync = promisify(exec);

export interface ServiceConfig {
  name: string;
  displayName: string;
  description: string;
  execPath: string;
  args?: string[];
  user?: string;
  group?: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  autoStart?: boolean;
  restartPolicy?: 'always' | 'on-failure' | 'never';
  dependencies?: string[];
}

export interface PlatformInfo {
  platform: 'linux' | 'darwin' | 'win32' | 'unknown';
  serviceManager: 'systemd' | 'launchd' | 'scm' | 'sysvinit' | 'unknown';
  architecture: string;
  version: string;
  canInstallService: boolean;
  requiresElevation: boolean;
}

export class PlatformManager {
  private platformInfo: PlatformInfo;

  constructor() {
    this.platformInfo = this.detectPlatform();
  }

  /**
   * Detect the current platform and service management system
   */
  private detectPlatform(): PlatformInfo {
    const platform = os.platform() as any;
    const arch = os.arch();
    const version = os.release();

    let serviceManager: PlatformInfo['serviceManager'] = 'unknown';
    let canInstallService = false;
    let requiresElevation = true;

    switch (platform) {
      case 'linux':
        // Check for systemd (most common)
        if (fs.existsSync('/run/systemd/system')) {
          serviceManager = 'systemd';
          canInstallService = true;
        } else if (fs.existsSync('/etc/init.d')) {
          serviceManager = 'sysvinit';
          canInstallService = true;
        }
        break;

      case 'darwin':
        serviceManager = 'launchd';
        canInstallService = true;
        break;

      case 'win32':
        serviceManager = 'scm';
        canInstallService = true;
        break;

      default:
        serviceManager = 'unknown';
        canInstallService = false;
        requiresElevation = false;
    }

    return {
      platform,
      serviceManager,
      architecture: arch,
      version,
      canInstallService,
      requiresElevation
    };
  }

  /**
   * Get platform information
   */
  getPlatformInfo(): PlatformInfo {
    return { ...this.platformInfo };
  }

  /**
   * Check if we can install services on this platform
   */
  canInstallService(): boolean {
    return this.platformInfo.canInstallService;
  }

  /**
   * Install service for the current platform
   */
  async installService(config: ServiceConfig): Promise<void> {
    if (!this.canInstallService()) {
      throw new Error(`Service installation not supported on ${this.platformInfo.platform} with ${this.platformInfo.serviceManager}`);
    }

    switch (this.platformInfo.serviceManager) {
      case 'systemd':
        return this.installSystemdService(config);
      case 'launchd':
        return this.installLaunchdService(config);
      case 'scm':
        return this.installWindowsService(config);
      case 'sysvinit':
        return this.installSysVinitService(config);
      default:
        throw new Error(`Unsupported service manager: ${this.platformInfo.serviceManager}`);
    }
  }

  /**
   * Uninstall service for the current platform
   */
  async uninstallService(serviceName: string): Promise<void> {
    if (!this.canInstallService()) {
      throw new Error(`Service uninstallation not supported on ${this.platformInfo.platform}`);
    }

    switch (this.platformInfo.serviceManager) {
      case 'systemd':
        return this.uninstallSystemdService(serviceName);
      case 'launchd':
        return this.uninstallLaunchdService(serviceName);
      case 'scm':
        return this.uninstallWindowsService(serviceName);
      case 'sysvinit':
        return this.uninstallSysVinitService(serviceName);
      default:
        throw new Error(`Unsupported service manager: ${this.platformInfo.serviceManager}`);
    }
  }

  /**
   * Start service
   */
  async startService(serviceName: string): Promise<void> {
    switch (this.platformInfo.serviceManager) {
      case 'systemd':
        await SecureCommandExecutor.executeSudoCommand('systemctl', ['start', serviceName]);
        break;
      case 'launchd':
        await SecureCommandExecutor.executeLaunchdCommand('load', `/Library/LaunchDaemons/com.cyreal.${serviceName}.plist`, { global: true });
        break;
      case 'scm':
        await SecureCommandExecutor.executeWindowsServiceCommand('start', serviceName);
        break;
      case 'sysvinit':
        await SecureCommandExecutor.executeSudoCommand('service', [serviceName, 'start']);
        break;
      default:
        throw new Error(`Service start not supported for ${this.platformInfo.serviceManager}`);
    }
  }

  /**
   * Stop service
   */
  async stopService(serviceName: string): Promise<void> {
    switch (this.platformInfo.serviceManager) {
      case 'systemd':
        await SecureCommandExecutor.executeSudoCommand('systemctl', ['stop', serviceName]);
        break;
      case 'launchd':
        await SecureCommandExecutor.executeLaunchdCommand('unload', `/Library/LaunchDaemons/com.cyreal.${serviceName}.plist`);
        break;
      case 'scm':
        await SecureCommandExecutor.executeWindowsServiceCommand('stop', serviceName);
        break;
      case 'sysvinit':
        await SecureCommandExecutor.executeSudoCommand('service', [serviceName, 'stop']);
        break;
      default:
        throw new Error(`Service stop not supported for ${this.platformInfo.serviceManager}`);
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(serviceName: string): Promise<'running' | 'stopped' | 'error' | 'unknown'> {
    try {
      switch (this.platformInfo.serviceManager) {
        case 'systemd':
          const result = await SecureCommandExecutor.executeSystemdCommand('is-active', serviceName);
          return result.stdout.trim() === 'active' ? 'running' : 'stopped';

        case 'launchd':
          try {
            await SecureCommandExecutor.executeLaunchdCommand('list');
            // TODO: Parse output to check for specific service
            return 'running';
          } catch {
            return 'stopped';
          }

        case 'scm':
          const scmResult = await SecureCommandExecutor.executeWindowsServiceCommand('query', serviceName);
          return scmResult.stdout.includes('RUNNING') ? 'running' : 'stopped';

        case 'sysvinit':
          const initResult = await SecureCommandExecutor.executeSudoCommand('service', [serviceName, 'status']);
          return initResult.stdout.includes('running') ? 'running' : 'stopped';

        default:
          return 'unknown';
      }
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Install systemd service (Linux)
   */
  private async installSystemdService(config: ServiceConfig): Promise<void> {
    const serviceContent = this.generateSystemdService(config);
    const servicePath = `/etc/systemd/system/${config.name}.service`;

    // Write service file
    fs.writeFileSync(servicePath, serviceContent);

    // Reload systemd and enable service
    await SecureCommandExecutor.executeSystemdCommand('daemon-reload');
    if (config.autoStart !== false) {
      await SecureCommandExecutor.executeSystemdCommand('enable', config.name);
    }

    console.log(`✅ systemd service installed: ${servicePath}`);
  }

  /**
   * Install launchd service (macOS)
   */
  private async installLaunchdService(config: ServiceConfig): Promise<void> {
    const plistContent = this.generateLaunchdPlist(config);
    const plistPath = `/Library/LaunchDaemons/com.cyreal.${config.name}.plist`;

    // Write plist file
    fs.writeFileSync(plistPath, plistContent);

    // Set proper permissions
    await SecureCommandExecutor.executeSudoCommand('chown', ['root:wheel', plistPath]);
    await SecureCommandExecutor.executeSudoCommand('chmod', ['644', plistPath]);

    if (config.autoStart !== false) {
      await SecureCommandExecutor.executeLaunchdCommand('load', plistPath, { global: true });
    }

    console.log(`✅ launchd service installed: ${plistPath}`);
  }

  /**
   * Install Windows service (Windows)
   */
  private async installWindowsService(config: ServiceConfig): Promise<void> {
    // Use secure command executor to create service
    const createOptions = {
      binPath: config.execPath,
      displayName: config.displayName,
      start: config.autoStart !== false ? 'auto' : 'demand'
    };

    await SecureCommandExecutor.executeWindowsServiceCommand('create', config.name, createOptions);

    if (config.description) {
      await SecureCommandExecutor.executeWindowsServiceCommand('description', config.name, { description: config.description });
    }

    console.log(`✅ Windows service installed: ${config.name}`);
  }

  /**
   * Install SysVinit service (Legacy Linux)
   */
  private async installSysVinitService(config: ServiceConfig): Promise<void> {
    const initScript = this.generateSysVinitScript(config);
    const scriptPath = `/etc/init.d/${config.name}`;

    fs.writeFileSync(scriptPath, initScript);
    await SecureCommandExecutor.executeSudoCommand('chmod', ['+x', scriptPath]);

    if (config.autoStart !== false) {
      await SecureCommandExecutor.executeSudoCommand('update-rc.d', [config.name, 'defaults']);
    }

    console.log(`✅ SysVinit service installed: ${scriptPath}`);
  }

  /**
   * Generate systemd service file
   */
  private generateSystemdService(config: ServiceConfig): string {
    const args = config.args ? ` ${config.args.join(' ')}` : '';
    const environment = config.environment 
      ? Object.entries(config.environment).map(([k, v]) => `Environment="${k}=${v}"`).join('\n')
      : '';

    return `[Unit]
Description=${config.description}
After=network.target
${config.dependencies ? config.dependencies.map(d => `Requires=${d}`).join('\n') : ''}

[Service]
Type=notify
ExecStart=${config.execPath}${args}
Restart=${config.restartPolicy || 'always'}
RestartSec=5
${config.user ? `User=${config.user}` : ''}
${config.group ? `Group=${config.group}` : ''}
${config.workingDirectory ? `WorkingDirectory=${config.workingDirectory}` : ''}
${environment}

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/cyreal /var/log/cyreal

[Install]
WantedBy=multi-user.target
`;
  }

  /**
   * Generate launchd plist file
   */
  private generateLaunchdPlist(config: ServiceConfig): string {
    const args = config.args || [];
    const programArguments = [config.execPath, ...args]
      .map(arg => `        <string>${arg}</string>`)
      .join('\n');

    const environment = config.environment
      ? `    <key>EnvironmentVariables</key>
    <dict>
${Object.entries(config.environment).map(([k, v]) => `        <key>${k}</key>
        <string>${v}</string>`).join('\n')}
    </dict>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cyreal.${config.name}</string>
    
    <key>ProgramArguments</key>
    <array>
${programArguments}
    </array>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>RunAtLoad</key>
    <${config.autoStart !== false ? 'true' : 'false'}/>
    
    ${config.workingDirectory ? `<key>WorkingDirectory</key>
    <string>${config.workingDirectory}</string>` : ''}
    
    ${environment}
    
    <key>StandardOutPath</key>
    <string>/var/log/cyreal/${config.name}.log</string>
    
    <key>StandardErrorPath</key>
    <string>/var/log/cyreal/${config.name}.error.log</string>
</dict>
</plist>
`;
  }

  /**
   * Generate SysVinit script
   */
  private generateSysVinitScript(config: ServiceConfig): string {
    const args = config.args ? ` ${config.args.join(' ')}` : '';

    return `#!/bin/bash
### BEGIN INIT INFO
# Provides:          ${config.name}
# Required-Start:    $network $local_fs
# Required-Stop:     $network $local_fs
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: ${config.description}
### END INIT INFO

NAME="${config.name}"
DAEMON="${config.execPath}"
DAEMON_ARGS="${args.trim()}"
PIDFILE="/var/run/\$NAME.pid"
${config.user ? `USER="${config.user}"` : ''}

. /lib/lsb/init-functions

case "\$1" in
    start)
        log_daemon_msg "Starting \$NAME"
        ${config.user ? 'start-stop-daemon --start --quiet --pidfile $PIDFILE --chuid $USER --exec $DAEMON -- $DAEMON_ARGS' : 'start-stop-daemon --start --quiet --pidfile $PIDFILE --exec $DAEMON -- $DAEMON_ARGS'}
        log_end_msg \$?
        ;;
    stop)
        log_daemon_msg "Stopping \$NAME"
        start-stop-daemon --stop --quiet --pidfile \$PIDFILE
        log_end_msg \$?
        ;;
    restart)
        \$0 stop
        \$0 start
        ;;
    status)
        status_of_proc -p \$PIDFILE \$DAEMON \$NAME
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0
`;
  }

  /**
   * Uninstall services (implementations for each platform)
   */
  private async uninstallSystemdService(serviceName: string): Promise<void> {
    try {
      await SecureCommandExecutor.executeSudoCommand('systemctl', ['stop', serviceName]);
      await SecureCommandExecutor.executeSudoCommand('systemctl', ['disable', serviceName]);
    } catch (error) {
      // Service might not be running
    }

    const servicePath = `/etc/systemd/system/${serviceName}.service`;
    if (fs.existsSync(servicePath)) {
      fs.unlinkSync(servicePath);
    }

    await SecureCommandExecutor.executeSystemdCommand('daemon-reload');
    console.log(`✅ systemd service uninstalled: ${serviceName}`);
  }

  private async uninstallLaunchdService(serviceName: string): Promise<void> {
    const plistPath = `/Library/LaunchDaemons/com.cyreal.${serviceName}.plist`;

    try {
      await SecureCommandExecutor.executeLaunchdCommand('unload', plistPath);
    } catch (error) {
      // Service might not be loaded
    }

    if (fs.existsSync(plistPath)) {
      fs.unlinkSync(plistPath);
    }

    console.log(`✅ launchd service uninstalled: ${serviceName}`);
  }

  private async uninstallWindowsService(serviceName: string): Promise<void> {
    try {
      await SecureCommandExecutor.executeWindowsServiceCommand('stop', serviceName);
    } catch (error) {
      // Service might not be running
    }

    await SecureCommandExecutor.executeWindowsServiceCommand('delete', serviceName);
    console.log(`✅ Windows service uninstalled: ${serviceName}`);
  }

  private async uninstallSysVinitService(serviceName: string): Promise<void> {
    try {
      await SecureCommandExecutor.executeSudoCommand('service', [serviceName, 'stop']);
      await SecureCommandExecutor.executeSudoCommand('update-rc.d', [serviceName, 'remove']);
    } catch (error) {
      // Service might not be running
    }

    const scriptPath = `/etc/init.d/${serviceName}`;
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }

    console.log(`✅ SysVinit service uninstalled: ${serviceName}`);
  }
}