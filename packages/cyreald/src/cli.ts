#!/usr/bin/env node

/**
 * Cyreald CLI - Cybernetic Serial Port Daemon
 * Platform-aware serial port management for AI systems
 * 
 * Copyright (c) 2025 Macawi
 * Licensed under the MIT License - see LICENSE file for details
 */

import { Command } from 'commander';
import { Cyreald } from './index';
import { SerialPort } from 'serialport';
import { VERSION, COPYRIGHT_NOTICE, ECOSYSTEM_MESSAGE } from '@cyreal/core';
import { ConfigManager, getConfigManager, CyrealConfig } from './config/config-manager';
import { UniversalInstaller } from './services/universal-installer';
import { PlatformManager } from './services/platform-manager';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();
let daemon: Cyreald;

program
  .name('cyreal-core')
  .description('Cyreal Core - Universal Cybernetic Service for AI Systems')
  .version(VERSION);

program
  .command('start')
  .description('Start the cyreald daemon')
  .option('-p, --port <path>', 'Serial port path (e.g., /dev/ttyUSB0, COM3)')
  .option('-b, --baudrate <rate>', 'Baud rate', parseFloat)
  .option('-t, --type <type>', 'Port type (rs232|rs485|usb-serial|ttl)', 'usb-serial')
  .option('-i, --id <id>', 'Port identifier', 'default')
  .option('--rs485', 'Enable RS-485 mode')
  .option('--rts-pin <pin>', 'RS485 DE/RE GPIO pin number', parseFloat)
  .option('--tcp-port <port>', 'TCP server port', parseFloat)
  .option('--udp-port <port>', 'UDP server port', parseFloat)
  .option('--security <level>', 'Security level (paranoid|balanced|permissive|debug)')
  .option('--log-level <level>', 'Log level (error|warn|info|debug)')
  .option('-d, --daemon', 'Run as daemon (background)')
  .option('-c, --config <file>', 'Configuration file path')
  .option('--name <name>', 'Port name/description')
  .action(async (options) => {
    try {
      // Load configuration with CLI overrides
      const configManager = getConfigManager(options.config);
      let config = configManager.get();
      
      // Apply CLI overrides
      const overrides: any = {};
      if (options.tcpPort) overrides.network = { tcp: { port: options.tcpPort } };
      if (options.udpPort) overrides.network = { ...overrides.network, udp: { port: options.udpPort } };
      if (options.security) overrides.security = { level: options.security };
      if (options.logLevel) overrides.daemon = { logLevel: options.logLevel };
      
      if (Object.keys(overrides).length > 0) {
        config = configManager.override(overrides);
      }
      
      daemon = new Cyreald(config);
      
      console.log('🤖 Starting Cyreald - Cybernetic Serial Port Daemon');
      console.log(`🔍 TCP Port: ${config.network.tcp.port} (Burroughs 3500 tribute to Project Cybersyn)`);
      console.log(`🔒 Security Level: ${config.security.level}`);
      
      await daemon.start();
      
      if (options.port) {
        console.log(`📡 Creating port controller: ${options.id} -> ${options.port}`);
        
        // Build port-specific config
        const portConfig: any = {
          baudRate: options.baudrate || config.ports.default.baudRate,
          name: options.name
        };
        
        if (options.rs485) {
          portConfig.rs485 = {
            enabled: true,
            rtsPin: options.rtsPin,
            turnaroundDelay: 1
          };
        }
        
        const controller = await daemon.createPort(
          options.id,
          options.port,
          options.type
        );
        
        // Open the port with specified options
        const portOptions: any = {
          baudRate: parseInt(options.baudrate),
          dataBits: 8,
          stopBits: 1,
          parity: 'none'
        };
        
        // Add RS-485 configuration if specified
        if (options.type === 'rs485' && options.rs485Pin) {
          portOptions.rs485 = {
            enabled: true,
            rtsPin: parseInt(options.rs485Pin)
          };
        }
        
        await controller.open(portOptions);
        console.log(`✅ Port ${options.id} opened successfully`);
        
        // Start data monitoring
        startDataMonitoring(controller);
      }
      
      if (options.daemon) {
        console.log('🔄 Running in daemon mode (Ctrl+C to stop)');
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n🛑 Shutting down Cyreald daemon...');
          await daemon.stop();
          process.exit(0);
        });
        
        // Keep process alive
        setInterval(() => {
          const status = daemon.getStatus();
          console.log(`💓 Daemon heartbeat - Active ports: ${status.activePorts}`);
        }, 30000); // Every 30 seconds
        
      } else {
        console.log('✨ Cyreald started. Type "status" or "quit"');
        startInteractiveMode();
      }
      
    } catch (error) {
      console.error('❌ Failed to start cyreald:', error);
      process.exit(1);
    }
  });

// Configuration management commands
program
  .command('config')
  .description('Configuration management')
  .option('--init [type]', 'Initialize config file (minimal|full|production)', 'minimal')
  .option('--show', 'Show current configuration')
  .option('--validate [file]', 'Validate configuration file')
  .option('--edit', 'Open config in default editor')
  .option('-o, --output <file>', 'Output file for --init')
  .action(async (options) => {
    try {
      const configManager = getConfigManager();
      
      if (options.init) {
        const template = configManager.generateTemplate(options.init);
        const outputPath = options.output || 'cyreal.yaml';
        
        // Ensure directory exists
        const dir = path.dirname(path.resolve(outputPath));
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, template);
        console.log(`✅ ${options.init} configuration template created: ${outputPath}`);
        console.log('📝 Edit the file to customize for your setup');
        
      } else if (options.show) {
        const config = configManager.get();
        console.log('📋 Current Configuration:');
        console.log('========================');
        console.log(JSON.stringify(config, null, 2));
        
      } else if (options.validate !== undefined) {
        const configFile = options.validate || 'cyreal.yaml';
        if (!fs.existsSync(configFile)) {
          console.error(`❌ Config file not found: ${configFile}`);
          return;
        }
        
        const content = fs.readFileSync(configFile, 'utf8');
        let parsed;
        try {
          const YAML = require('yaml');
          parsed = YAML.parse(content);
        } catch (error) {
          console.error(`❌ YAML parsing failed: ${error instanceof Error ? error.message : String(error)}`);
          return;
        }
        
        const result = configManager.validate(parsed);
        if (result.valid) {
          console.log(`✅ Configuration file is valid: ${configFile}`);
        } else {
          console.error(`❌ Configuration validation failed: ${result.error}`);
        }
        
      } else if (options.edit) {
        const configPath = process.cwd() + '/cyreal.yaml'; // Default to current directory
        const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
        
        const { spawn } = require('child_process');
        const child = spawn(editor, [configPath], { stdio: 'inherit' });
        
        child.on('exit', (code: number | null) => {
          if (code === 0) {
            console.log('✅ Configuration file updated');
          } else {
            console.error('❌ Editor exited with error');
          }
        });
        
      } else {
        console.log('📖 Configuration Management Commands:');
        console.log('  --init [type]     Create config template (minimal|full|production)');
        console.log('  --show            Display current configuration');
        console.log('  --validate [file] Validate configuration file');
        console.log('  --edit            Open config in editor');
      }
      
    } catch (error) {
      console.error('❌ Configuration command failed:', error);
    }
  });

program
  .command('list')
  .description('List available serial ports')
  .action(async () => {
    try {
      console.log('🔍 Scanning for serial ports...\n');
      
      const ports = await SerialPort.list();
      
      if (ports.length === 0) {
        console.log('No serial ports found.');
        return;
      }
      
      console.log('Available Serial Ports:');
      console.log('======================');
      
      ports.forEach((port, index) => {
        console.log(`${index + 1}. ${port.path}`);
        console.log(`   Manufacturer: ${port.manufacturer || 'Unknown'}`);
        console.log(`   Vendor ID: ${port.vendorId || 'N/A'}`);
        console.log(`   Product ID: ${port.productId || 'N/A'}`);
        console.log(`   Serial Number: ${port.serialNumber || 'N/A'}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Failed to list serial ports:', error);
    }
  });

program
  .command('test')
  .description('Test platform capabilities and performance')
  .option('-p, --port <path>', 'Serial port to test')
  .option('-r, --rs485', 'Test RS-485 capabilities')
  .action(async (options) => {
    try {
      console.log('🧪 Running Cyreald platform tests...\n');
      
      daemon = new Cyreald();
      await daemon.start();
      
      const status = daemon.getStatus();
      console.log('Platform Information:');
      console.log('====================');
      console.log(`Name: ${status.platform.name}`);
      console.log(`Architecture: ${status.platform.arch}`);
      console.log(`Features: ${status.platform.specialFeatures?.join(', ') || 'None'}`);
      console.log(`RS-485 Capable: ${status.platform.rs485Capable ? '✅' : '❌'}`);
      console.log('');
      
      if (options.port) {
        console.log(`Testing port: ${options.port}`);
        
        const controller = await daemon.createPort(
          'test',
          options.port,
          options.rs485 ? 'rs485' : 'usb-serial'
        );
        
        // Test different baud rates
        const testRates = [9600, 115200, 230400];
        
        for (const rate of testRates) {
          try {
            console.log(`Testing baud rate: ${rate}...`);
            
            await controller.open({
              baudRate: rate,
              rs485: options.rs485 ? { enabled: true, rtsPin: 18 } : undefined
            });
            
            console.log(`✅ ${rate} baud - OK`);
            await controller.close();
            
          } catch (error) {
            console.log(`❌ ${rate} baud - Failed: ${error}`);
          }
        }
      }
      
      await daemon.stop();
      console.log('\n🏁 Platform test completed');
      console.log('\n' + ECOSYSTEM_MESSAGE);
      
    } catch (error) {
      console.error('❌ Platform test failed:', error);
    }
  });

program
  .command('generate-config')
  .description('Generate a configuration file for the current platform')
  .option('-o, --output <file>', 'Output file path', 'cyreald.json')
  .action(async (options) => {
    try {
      console.log('⚙️  Generating platform-specific configuration...');
      
      daemon = new Cyreald();
      await daemon.start();
      
      const status = daemon.getStatus();
      
      const config = {
        platform: status.platform,
        defaultBaudRates: [9600, 115200, 230400],
        security: {
          level: 'balanced',
          tokenExpiry: '24h'
        },
        logging: {
          level: 'info',
          file: '/var/log/cyreal/cyreald.log'
        },
        ports: {
          // Platform-specific defaults
          ...(status.platform.name === 'BeagleBone AI-64' && {
            mikroeClick: {
              type: 'rs485',
              rtsPin: 78
            }
          }),
          ...(status.platform.name === 'Banana Pi BPI-M7' && {
            highSpeed: {
              maxBaudRate: 6000000,
              npuAcceleration: true
            }
          }),
          ...(status.platform.name === 'Raspberry Pi 5' && {
            rp1Optimized: {
              useRP1Features: true,
              gpioChip: '/dev/gpiochip4'
            }
          })
        }
      };
      
      fs.writeFileSync(options.output, JSON.stringify(config, null, 2));
      console.log(`✅ Configuration written to ${options.output}`);
      
      await daemon.stop();
      
    } catch (error) {
      console.error('❌ Failed to generate config:', error);
    }
  });

/**
 * Start interactive mode
 */
function startInteractiveMode(): void {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'cyreald> '
  });
  
  rl.prompt();
  
  rl.on('line', async (line: string) => {
    const input = line.trim().toLowerCase();
    
    switch (input) {
      case 'status':
        console.log('📊 Daemon Status:');
        console.log(JSON.stringify(daemon.getStatus(), null, 2));
        break;
        
      case 'ports':
        const controllers = daemon.getPortControllers();
        console.log(`📡 Active Ports: ${controllers.length}`);
        controllers.forEach(c => {
          console.log(`  ${c.id}: ${c.physicalPath} (${c.status})`);
        });
        break;
        
      case 'help':
        console.log('Available commands:');
        console.log('  status  - Show daemon status');
        console.log('  ports   - List active ports');
        console.log('  help    - Show this help');
        console.log('  quit    - Exit daemon');
        break;
        
      case 'quit':
      case 'exit':
        console.log('👋 Shutting down...');
        await daemon.stop();
        process.exit(0);
        break;
        
      default:
        console.log(`Unknown command: ${input}. Type "help" for available commands.`);
    }
    
    rl.prompt();
  });
}

/**
 * Start monitoring data for a port
 */
async function startDataMonitoring(controller: any): Promise<void> {
  console.log(`📈 Starting data monitoring for ${controller.id}...`);
  
  // Monitor received data
  try {
    for await (const data of controller.read()) {
      const text = data.toString('utf8').trim();
      if (text) {
        console.log(`📥 [${controller.id}] Received: ${text}`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Data monitoring stopped: ${error}`);
  }
}

// Service Management Commands
program
  .command('service')
  .description('Service management (install, uninstall, start, stop, status)')
  .option('--install', 'Install as system service')
  .option('--uninstall', 'Uninstall system service')
  .option('--start', 'Start service')
  .option('--stop', 'Stop service')
  .option('--status', 'Show service status')
  .option('--restart', 'Restart service')
  .option('--name <name>', 'Service name', 'cyreal-core')
  .option('--user <user>', 'Service user')
  .option('--group <group>', 'Service group')
  .option('--auto-start', 'Enable auto-start', true)
  .option('--force', 'Force operation')
  .action(async (options) => {
    try {
      const installer = new UniversalInstaller({
        serviceName: options.name,
        user: options.user,
        group: options.group,
        autoStart: options.autoStart,
        force: options.force
      });
      
      const platformManager = new PlatformManager();
      
      if (options.install) {
        const result = await installer.install();
        if (!result.success) {
          process.exit(1);
        }
        
      } else if (options.uninstall) {
        const result = await installer.uninstall();
        if (!result.success) {
          process.exit(1);
        }
        
      } else if (options.start) {
        await platformManager.startService(options.name);
        console.log(`✅ Service '${options.name}' started`);
        
      } else if (options.stop) {
        await platformManager.stopService(options.name);
        console.log(`⏹️  Service '${options.name}' stopped`);
        
      } else if (options.restart) {
        await platformManager.stopService(options.name);
        await new Promise<void>(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await platformManager.startService(options.name);
        console.log(`🔄 Service '${options.name}' restarted`);
        
      } else if (options.status) {
        const platformInfo = platformManager.getPlatformInfo();
        const serviceStatus = await platformManager.getServiceStatus(options.name);
        const detailedStatus = await installer.status();
        
        console.log('🔍 Service Status Report');
        console.log('═'.repeat(40));
        console.log(`Platform: ${platformInfo.platform} (${platformInfo.architecture})`);
        console.log(`Service Manager: ${platformInfo.serviceManager}`);
        console.log(`Service Name: ${options.name}`);
        console.log(`Status: ${serviceStatus}`);
        console.log(`Installed: ${detailedStatus.installed ? '✅' : '❌'}`);
        console.log(`Running: ${detailedStatus.running ? '✅' : '❌'}`);
        console.log(`Config Exists: ${detailedStatus.configExists ? '✅' : '❌'}`);
        console.log(`Logs Exist: ${detailedStatus.logsExist ? '✅' : '❌'}`);
        
      } else {
        console.log('📖 Service Management Commands:');
        console.log('  --install     Install as system service');
        console.log('  --uninstall   Uninstall system service');
        console.log('  --start       Start service');
        console.log('  --stop        Stop service');
        console.log('  --restart     Restart service');
        console.log('  --status      Show service status');
        console.log('');
        console.log('Options:');
        console.log('  --name <name>    Service name (default: cyreal-core)');
        console.log('  --user <user>    Service user');
        console.log('  --group <group>  Service group');
        console.log('  --force          Force operation');
      }
      
    } catch (error) {
      console.error('❌ Service management failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Platform Information Command
program
  .command('platform')
  .description('Show platform and service management information')
  .action(async () => {
    try {
      const platformManager = new PlatformManager();
      const info = platformManager.getPlatformInfo();
      
      console.log('🖥️  Platform Information');
      console.log('═'.repeat(40));
      console.log(`Platform: ${info.platform}`);
      console.log(`Architecture: ${info.architecture}`);
      console.log(`OS Version: ${info.version}`);
      console.log(`Service Manager: ${info.serviceManager}`);
      console.log(`Can Install Services: ${info.canInstallService ? '✅' : '❌'}`);
      console.log(`Requires Elevation: ${info.requiresElevation ? '✅' : '❌'}`);
      
      if (info.serviceManager === 'systemd') {
        console.log('');
        console.log('📊 systemd Information:');
        try {
          const { execSync } = require('child_process');
          const version = execSync('systemctl --version | head -1', { encoding: 'utf8' });
          console.log(`Version: ${version.trim()}`);
        } catch (error) {
          console.log('Version: Unable to detect');
        }
      }
      
    } catch (error) {
      console.error('❌ Platform detection failed:', error);
    }
  });

program.parse();