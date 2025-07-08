/**
 * YAML Configuration Manager with Override Hierarchy
 * Priority: CLI args > user.yaml > system.yaml > defaults
 */

import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import Joi from 'joi';
import { getConfigPath, getDataPath, getLogPath } from '@cyreal/core';

export interface CyrealConfig {
  daemon: {
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    logFile?: string;
    pidFile?: string;
    workingDirectory: string;
    hotReload: boolean;
  };
  network: {
    tcp: {
      enabled: boolean;
      port: number;
      host: string;
      maxConnections: number;
      keepAlive: boolean;
      keepAliveDelay: number;
    };
    udp: {
      enabled: boolean;
      port: number;
      host: string;
      broadcast: boolean;
    };
    websocket: {
      enabled: boolean;
      port: number;
      path: string;
      compression: boolean;
    };
    ssl: {
      enabled: boolean;
      cert?: string;
      key?: string;
      ca?: string;
      rejectUnauthorized: boolean;
    };
  };
  security: {
    level: 'paranoid' | 'balanced' | 'permissive' | 'debug';
    authToken?: string;
    allowedIPs: string[];
    rateLimit: {
      enabled: boolean;
      requestsPerMinute: number;
      blacklistDuration: number;
    };
    audit: {
      enabled: boolean;
      logFile?: string;
      events: string[];
    };
  };
  ports: {
    default: {
      baudRate: number;
      dataBits: 5 | 6 | 7 | 8;
      stopBits: 1 | 2;
      parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
      flowControl: 'none' | 'hardware' | 'software';
      bufferSize: number;
      timeout: number;
    };
    specific: Record<string, Partial<CyrealConfig['ports']['default']> & {
      name?: string;
      rs485?: {
        enabled: boolean;
        rtsPin?: number;
        turnaroundDelay: number;
        terminationEnabled: boolean;
      };
    }>;
  };
  governors: {
    operational: {
      probeInterval: number;
      errorThreshold: number;
      retryAttempts: number;
      retryDelay: number;
    };
    coordination: {
      conflictResolution: 'priority' | 'round-robin' | 'load-balance';
      loadBalancing: boolean;
    };
    management: {
      autoRecover: boolean;
      healthCheckInterval: number;
      failureThreshold: number;
    };
    intelligence: {
      learning: boolean;
      predictionEnabled: boolean;
      modelPath?: string;
    };
    meta: {
      telemetry: boolean;
      cloudSync: boolean;
      reportingInterval: number;
    };
  };
  chaos: {
    enabled: boolean;
    scenarios: string[];
    interval: number;
    intensity: 'low' | 'medium' | 'high' | 'goat';
  };
}

// Joi validation schema
const configSchema = Joi.object({
  daemon: Joi.object({
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    logFile: Joi.string().optional(),
    pidFile: Joi.string().optional(),
    workingDirectory: Joi.string().default('.'),
    hotReload: Joi.boolean().default(true)
  }).default(),
  
  network: Joi.object({
    tcp: Joi.object({
      enabled: Joi.boolean().default(true),
      port: Joi.number().port().default(3500), // Burroughs 3500 tribute!
      host: Joi.string().default('0.0.0.0'),
      maxConnections: Joi.number().positive().default(10),
      keepAlive: Joi.boolean().default(true),
      keepAliveDelay: Joi.number().positive().default(60000)
    }).default(),
    
    udp: Joi.object({
      enabled: Joi.boolean().default(false),
      port: Joi.number().port().default(3501),
      host: Joi.string().default('0.0.0.0'),
      broadcast: Joi.boolean().default(false)
    }).default(),
    
    websocket: Joi.object({
      enabled: Joi.boolean().default(false),
      port: Joi.number().port().default(3502),
      path: Joi.string().default('/ws'),
      compression: Joi.boolean().default(true)
    }).default(),
    
    ssl: Joi.object({
      enabled: Joi.boolean().default(false),
      cert: Joi.string().optional(),
      key: Joi.string().optional(),
      ca: Joi.string().optional(),
      rejectUnauthorized: Joi.boolean().default(true)
    }).default()
  }).default(),
  
  security: Joi.object({
    level: Joi.string().valid('paranoid', 'balanced', 'permissive', 'debug').default('balanced'),
    authToken: Joi.string().optional(),
    allowedIPs: Joi.array().items(Joi.string()).default([]),
    rateLimit: Joi.object({
      enabled: Joi.boolean().default(true),
      requestsPerMinute: Joi.number().positive().default(60),
      blacklistDuration: Joi.number().positive().default(3600000)
    }).default(),
    audit: Joi.object({
      enabled: Joi.boolean().default(true),
      logFile: Joi.string().optional(),
      events: Joi.array().items(Joi.string()).default(['auth', 'error', 'config'])
    }).default()
  }).default(),
  
  ports: Joi.object({
    default: Joi.object({
      baudRate: Joi.number().positive().default(9600),
      dataBits: Joi.number().valid(5, 6, 7, 8).default(8),
      stopBits: Joi.number().valid(1, 2).default(1),
      parity: Joi.string().valid('none', 'even', 'odd', 'mark', 'space').default('none'),
      flowControl: Joi.string().valid('none', 'hardware', 'software').default('none'),
      bufferSize: Joi.number().positive().default(2048),
      timeout: Joi.number().positive().default(5000)
    }).default(),
    specific: Joi.object().pattern(Joi.string(), Joi.object({
      name: Joi.string().optional(),
      baudRate: Joi.number().positive().optional(),
      dataBits: Joi.number().valid(5, 6, 7, 8).optional(),
      stopBits: Joi.number().valid(1, 2).optional(),
      parity: Joi.string().valid('none', 'even', 'odd', 'mark', 'space').optional(),
      flowControl: Joi.string().valid('none', 'hardware', 'software').optional(),
      bufferSize: Joi.number().positive().optional(),
      timeout: Joi.number().positive().optional(),
      rs485: Joi.object({
        enabled: Joi.boolean().default(false),
        rtsPin: Joi.number().optional(),
        turnaroundDelay: Joi.number().positive().default(1),
        terminationEnabled: Joi.boolean().default(false)
      }).optional()
    })).default({})
  }).default(),
  
  governors: Joi.object({
    operational: Joi.object({
      probeInterval: Joi.number().positive().default(5000),
      errorThreshold: Joi.number().positive().default(10),
      retryAttempts: Joi.number().min(0).default(3),
      retryDelay: Joi.number().positive().default(1000)
    }).default(),
    
    coordination: Joi.object({
      conflictResolution: Joi.string().valid('priority', 'round-robin', 'load-balance').default('priority'),
      loadBalancing: Joi.boolean().default(false)
    }).default(),
    
    management: Joi.object({
      autoRecover: Joi.boolean().default(true),
      healthCheckInterval: Joi.number().positive().default(30000),
      failureThreshold: Joi.number().positive().default(3)
    }).default(),
    
    intelligence: Joi.object({
      learning: Joi.boolean().default(true),
      predictionEnabled: Joi.boolean().default(false),
      modelPath: Joi.string().optional()
    }).default(),
    
    meta: Joi.object({
      telemetry: Joi.boolean().default(false),
      cloudSync: Joi.boolean().default(false),
      reportingInterval: Joi.number().positive().default(300000)
    }).default()
  }).default(),
  
  chaos: Joi.object({
    enabled: Joi.boolean().default(false),
    scenarios: Joi.array().items(Joi.string()).default([]),
    interval: Joi.number().positive().default(60000),
    intensity: Joi.string().valid('low', 'medium', 'high', 'goat').default('low')
  }).default()
});

export class ConfigManager {
  private config: CyrealConfig;
  private configPaths: string[];
  private watchers: fs.FSWatcher[] = [];

  constructor(userConfigPath?: string) {
    this.configPaths = this.getConfigPaths(userConfigPath);
    this.config = this.loadConfig();
    
    if (this.config.daemon.hotReload) {
      this.setupWatchers();
    }
  }

  private getConfigPaths(userConfigPath?: string): string[] {
    const paths: string[] = [];
    
    // User-specified config (highest priority)
    if (userConfigPath) {
      paths.push(path.resolve(userConfigPath));
    }
    
    // User config directory
    const userConfig = getConfigPath('cyreal.yaml');
    if (fs.existsSync(userConfig)) {
      paths.push(userConfig);
    }
    
    // System config directory
    const systemConfig = process.platform === 'win32' 
      ? path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'cyreal', 'cyreal.yaml')
      : '/etc/cyreal/cyreal.yaml';
    
    if (fs.existsSync(systemConfig)) {
      paths.push(systemConfig);
    }
    
    return paths;
  }

  private loadConfig(): CyrealConfig {
    let mergedConfig: any = {};
    
    // Start with defaults (schema provides these)
    const { error: defaultError, value: defaults } = configSchema.validate({});
    if (defaultError) {
      throw new Error(`Default config validation failed: ${defaultError.message}`);
    }
    mergedConfig = defaults;
    
    // Load and merge configs in reverse priority order (system -> user -> specified)
    for (const configPath of this.configPaths.reverse()) {
      try {
        const yamlContent = fs.readFileSync(configPath, 'utf8');
        const parsed = YAML.parse(yamlContent);
        mergedConfig = this.deepMerge(mergedConfig, parsed);
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}:`, error);
      }
    }
    
    // Validate final merged config
    const { error, value } = configSchema.validate(mergedConfig);
    if (error) {
      throw new Error(`Config validation failed: ${error.message}`);
    }
    
    // Set default paths if not specified
    if (!value.daemon.logFile) {
      value.daemon.logFile = getLogPath('cyreald.log');
    }
    if (!value.daemon.pidFile) {
      value.daemon.pidFile = getDataPath('cyreald.pid');
    }
    if (!value.security.audit.logFile) {
      value.security.audit.logFile = getLogPath('audit.log');
    }
    
    return value;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private setupWatchers(): void {
    for (const configPath of this.configPaths) {
      if (fs.existsSync(configPath)) {
        const watcher = fs.watch(configPath, (eventType) => {
          if (eventType === 'change') {
            setTimeout(() => this.reloadConfig(), 100); // Debounce
          }
        });
        this.watchers.push(watcher);
      }
    }
  }

  private reloadConfig(): void {
    try {
      const newConfig = this.loadConfig();
      const oldConfig = this.config;
      this.config = newConfig;
      
      console.log('Configuration reloaded successfully');
      
      // Emit config change event (could be EventEmitter if needed)
      this.onConfigChanged?.(newConfig, oldConfig);
    } catch (error) {
      console.error('Failed to reload config:', error);
    }
  }

  public get(): CyrealConfig {
    return { ...this.config }; // Return copy to prevent mutation
  }

  public override(overrides: Partial<CyrealConfig>): CyrealConfig {
    const merged = this.deepMerge(this.config, overrides);
    const { error, value } = configSchema.validate(merged);
    
    if (error) {
      throw new Error(`Config override validation failed: ${error.message}`);
    }
    
    return value;
  }

  public save(configPath?: string): void {
    const targetPath = configPath || this.configPaths[0] || getConfigPath('cyreal.yaml');
    
    // Ensure directory exists
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const yamlContent = YAML.stringify(this.config, { 
      indent: 2,
      lineWidth: 0,
      minContentWidth: 0
    });
    
    fs.writeFileSync(targetPath, yamlContent, 'utf8');
  }

  public generateTemplate(templateType: 'minimal' | 'full' | 'production' = 'minimal'): string {
    let template: Partial<CyrealConfig>;
    
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
        break;
        
      case 'production':
        template = {
          daemon: {
            logLevel: 'warn' as const,
            hotReload: false
          },
          network: {
            tcp: { 
              port: 3500,
              host: '127.0.0.1' // Localhost only for security
            }
          },
          security: {
            level: 'balanced' as const,
            allowedIPs: ['127.0.0.1', '192.168.1.0/24'],
            rateLimit: { enabled: true }
          }
        };
        break;
        
      default: // full
        template = this.config;
    }
    
    return YAML.stringify(template, { 
      indent: 2,
      lineWidth: 0,
      minContentWidth: 0
    });
  }

  public validate(configObject: any): { valid: boolean; error?: string } {
    const { error } = configSchema.validate(configObject);
    return {
      valid: !error,
      error: error?.message
    };
  }

  public destroy(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
  }

  // Optional callback for config changes
  public onConfigChanged?: (newConfig: CyrealConfig, oldConfig: CyrealConfig) => void;
}

// Default instance
let defaultManager: ConfigManager | null = null;

export function getConfigManager(userConfigPath?: string): ConfigManager {
  if (!defaultManager || userConfigPath) {
    defaultManager = new ConfigManager(userConfigPath);
  }
  return defaultManager;
}

export function getConfig(): CyrealConfig {
  return getConfigManager().get();
}