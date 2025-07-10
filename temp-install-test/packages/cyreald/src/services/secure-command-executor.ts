/**
 * Secure Command Executor - Prevents Command Injection
 * Essential for Windows service management security
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export class SecureCommandExecutor {
  
  /**
   * Execute Windows SC command safely
   */
  static async executeWindowsServiceCommand(
    command: 'create' | 'start' | 'stop' | 'query' | 'delete' | 'description',
    serviceName: string,
    options?: Record<string, string>
  ): Promise<CommandResult> {
    
    // Validate service name - only alphanumeric, hyphens, underscores
    if (!this.isValidServiceName(serviceName)) {
      throw new Error(`Invalid service name: ${serviceName}`);
    }

    const args: string[] = [command, serviceName];

    // Add validated options based on command
    if (command === 'create' && options) {
      this.addCreateOptions(args, options);
    } else if (command === 'description' && options?.description) {
      // Validate and escape description
      const description = this.sanitizeDescription(options.description);
      args.push(description);
    }

    return this.executeCommand('sc', args);
  }

  /**
   * Execute systemctl command safely
   */
  static async executeSystemdCommand(
    command: 'start' | 'stop' | 'enable' | 'disable' | 'is-active' | 'daemon-reload',
    serviceName?: string
  ): Promise<CommandResult> {
    
    const args: string[] = [command];
    
    if (serviceName) {
      if (!this.isValidServiceName(serviceName)) {
        throw new Error(`Invalid service name: ${serviceName}`);
      }
      args.push(serviceName);
    }

    return this.executeCommand('systemctl', args);
  }

  /**
   * Execute launchctl command safely
   */
  static async executeLaunchdCommand(
    command: 'load' | 'unload' | 'list',
    plistPath?: string,
    options?: { global?: boolean; force?: boolean }
  ): Promise<CommandResult> {
    
    const args: string[] = [command];
    
    if (options?.global) {
      args.push('-w');
    }

    if (plistPath) {
      // Validate plist path
      if (!this.isValidPath(plistPath)) {
        throw new Error(`Invalid plist path: ${plistPath}`);
      }
      args.push(plistPath);
    }

    return this.executeCommand('launchctl', args);
  }

  /**
   * Validate service name - prevents injection
   */
  private static isValidServiceName(name: string): boolean {
    // Only allow alphanumeric, hyphens, underscores, dots
    // No spaces, quotes, semicolons, pipes, etc.
    const validPattern = /^[a-zA-Z0-9\-_.]+$/;
    return validPattern.test(name) && name.length <= 64;
  }

  /**
   * Validate file paths - prevents directory traversal
   */
  private static isValidPath(path: string): boolean {
    // Basic path validation - no ../.. traversal
    if (path.includes('..') || path.includes('//')) {
      return false;
    }
    
    // Must be absolute path (Unix/Linux starts with /, Windows with C:\ etc)
    if (!path.startsWith('/') && !path.match(/^[A-Za-z]:\\/)) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize description field
   */
  private static sanitizeDescription(description: string): string {
    // Remove dangerous characters
    let clean = description
      .replace(/[&|;$`\\]/g, '')  // Remove shell metacharacters
      .replace(/"/g, '\\"')       // Escape quotes
      .trim();

    // Limit length
    if (clean.length > 255) {
      clean = clean.substring(0, 255);
    }

    return clean;
  }

  /**
   * Add validated create options for Windows service
   */
  private static addCreateOptions(args: string[], options: Record<string, string>): void {
    
    // Validate and add binPath
    if (options.binPath) {
      if (!this.isValidPath(options.binPath)) {
        throw new Error(`Invalid binary path: ${options.binPath}`);
      }
      args.push(`binPath= "${options.binPath}"`);
    }

    // Validate and add DisplayName
    if (options.displayName) {
      const displayName = this.sanitizeDescription(options.displayName);
      args.push(`DisplayName= "${displayName}"`);
    }

    // Validate start type
    if (options.start) {
      if (!['auto', 'demand', 'disabled'].includes(options.start)) {
        throw new Error(`Invalid start type: ${options.start}`);
      }
      args.push(`start= ${options.start}`);
    }

    // Add other validated options as needed
  }

  /**
   * Execute command safely using spawn (not shell)
   */
  private static async executeCommand(command: string, args: string[]): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,  // CRITICAL: Never use shell=true
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code: code || 0
        });
      });

      child.on('error', (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('Command execution timeout'));
      }, 30000);
    });
  }

  /**
   * Execute sudo command safely (Linux/macOS)
   */
  static async executeSudoCommand(command: string, args: string[]): Promise<CommandResult> {
    
    // Validate command is in whitelist
    const allowedCommands = [
      'systemctl', 'launchctl', 'useradd', 'chown', 'chmod', 
      'mkdir', 'update-rc.d', 'service'
    ];
    
    if (!allowedCommands.includes(command)) {
      throw new Error(`Command not allowed with sudo: ${command}`);
    }

    const sudoArgs = [command, ...args];
    return this.executeCommand('sudo', sudoArgs);
  }
}