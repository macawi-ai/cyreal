/**
 * Config Tester - Tests configuration validation and management
 */

import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import { TestRunnerOptions } from '../../types/test-types';

export class ConfigTester {
  private options: TestRunnerOptions;

  constructor(options: TestRunnerOptions) {
    this.options = options;
  }

  async validateConfig(configPath?: string): Promise<{
    valid: boolean;
    configPath: string;
    errors: string[];
    warnings: string[];
    config?: any;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let config: any = null;
    let actualPath = configPath || this.getDefaultConfigPath();

    try {
      if (!fs.existsSync(actualPath)) {
        if (configPath) {
          errors.push(`Config file not found: ${actualPath}`);
          return { valid: false, configPath: actualPath, errors, warnings };
        } else {
          warnings.push('No config file found, using defaults');
          return { valid: true, configPath: actualPath, errors, warnings };
        }
      }

      const content = fs.readFileSync(actualPath, 'utf8');
      
      try {
        config = YAML.parse(content);
      } catch (parseError) {
        errors.push(`YAML parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        return { valid: false, configPath: actualPath, errors, warnings };
      }

      // Basic validation
      this.validateConfigStructure(config, errors, warnings);

      return {
        valid: errors.length === 0,
        configPath: actualPath,
        errors,
        warnings,
        config
      };

    } catch (error) {
      errors.push(`Config validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, configPath: actualPath, errors, warnings };
    }
  }

  async generateTemplate(templateType: 'minimal' | 'full' | 'production'): Promise<{
    template: string;
    description: string;
  }> {
    let template: any;
    let description: string;

    switch (templateType) {
      case 'minimal':
        template = {
          network: {
            tcp: { port: 3500 }
          },
          ports: {
            default: { baudRate: 9600 }
          }
        };
        description = 'Minimal Cyreal configuration with Cybersyn tribute port 3500';
        break;

      case 'production':
        template = {
          daemon: {
            logLevel: 'warn',
            hotReload: false
          },
          network: {
            tcp: { 
              port: 3500,
              host: '127.0.0.1'
            }
          },
          security: {
            level: 'balanced',
            allowedIPs: ['127.0.0.1', '192.168.1.0/24'],
            rateLimit: { enabled: true }
          },
          ports: {
            default: { 
              baudRate: 9600,
              timeout: 5000
            }
          }
        };
        description = 'Production-ready Cyreal configuration with security settings';
        break;

      default: // full
        template = {
          daemon: {
            logLevel: 'info',
            hotReload: true
          },
          network: {
            tcp: {
              enabled: true,
              port: 3500,
              host: '0.0.0.0',
              maxConnections: 10,
              keepAlive: true
            },
            udp: {
              enabled: false,
              port: 3501
            },
            websocket: {
              enabled: false,
              port: 3502,
              path: '/ws'
            }
          },
          security: {
            level: 'balanced',
            allowedIPs: [],
            rateLimit: {
              enabled: true,
              requestsPerMinute: 60
            }
          },
          ports: {
            default: {
              baudRate: 9600,
              dataBits: 8,
              stopBits: 1,
              parity: 'none',
              timeout: 5000
            }
          },
          governors: {
            operational: {
              probeInterval: 5000,
              errorThreshold: 10
            }
          }
        };
        description = 'Complete Cyreal configuration with all options';
    }

    return {
      template: YAML.stringify(template, { indent: 2 }),
      description
    };
  }

  async checkConfigPaths(): Promise<{
    userConfig: { path: string; exists: boolean; readable: boolean };
    systemConfig: { path: string; exists: boolean; readable: boolean };
    defaultConfig: { path: string; exists: boolean; readable: boolean };
  }> {
    const userConfigPath = this.getUserConfigPath();
    const systemConfigPath = this.getSystemConfigPath();
    const defaultConfigPath = this.getDefaultConfigPath();

    return {
      userConfig: this.checkPath(userConfigPath),
      systemConfig: this.checkPath(systemConfigPath),
      defaultConfig: this.checkPath(defaultConfigPath)
    };
  }

  private validateConfigStructure(config: any, errors: string[], warnings: string[]): void {
    // Network validation
    if (config.network?.tcp?.port && (config.network.tcp.port < 1024 || config.network.tcp.port > 65535)) {
      warnings.push('TCP port should be between 1024-65535 for non-privileged operation');
    }

    // Security validation
    if (config.security?.level && !['paranoid', 'balanced', 'permissive', 'debug'].includes(config.security.level)) {
      errors.push('Invalid security level. Must be one of: paranoid, balanced, permissive, debug');
    }

    // Ports validation
    if (config.ports?.default?.baudRate && ![300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].includes(config.ports.default.baudRate)) {
      warnings.push('Non-standard baud rate detected');
    }

    // Governor validation
    if (config.governors?.operational?.probeInterval && config.governors.operational.probeInterval < 1000) {
      warnings.push('Very short probe interval may impact performance');
    }
  }

  private checkPath(filePath: string): { path: string; exists: boolean; readable: boolean } {
    const exists = fs.existsSync(filePath);
    let readable = false;

    if (exists) {
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
        readable = true;
      } catch (e) {
        readable = false;
      }
    }

    return { path: filePath, exists, readable };
  }

  private getDefaultConfigPath(): string {
    return process.cwd() + '/cyreal.yaml';
  }

  private getUserConfigPath(): string {
    if (process.platform === 'win32') {
      return path.join(process.env.APPDATA || process.env.USERPROFILE || '', 'cyreal', 'cyreal.yaml');
    } else {
      return path.join(process.env.HOME || '', '.config', 'cyreal', 'cyreal.yaml');
    }
  }

  private getSystemConfigPath(): string {
    if (process.platform === 'win32') {
      return path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'cyreal', 'cyreal.yaml');
    } else {
      return '/etc/cyreal/cyreal.yaml';
    }
  }
}