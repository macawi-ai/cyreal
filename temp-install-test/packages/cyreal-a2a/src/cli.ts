#!/usr/bin/env node
/**
 * A2A CLI - Agent-to-Agent Protocol Server
 * 
 * Cybernetic serial port bridge with A2A protocol support
 * Enforces RFC-1918 security standards per Macawi AI Ethical Security Standard
 */

import yargs from 'yargs';
import * as winston from 'winston';
import { RFC1918Validator } from '@cyreal/core';
import type { A2AConfig } from '@cyreal/core';
import { A2AServer } from '@cyreal/core';
import { AgentRegistry } from './agent-registry';
import { ServiceDiscovery } from './service-discovery';

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'cyreal-a2a.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

/**
 * Default A2A configuration with high security defaults
 */
const DEFAULT_CONFIG: A2AConfig = {
  server: {
    host: '127.0.0.1', // RFC-1918 compliant default
    port: 3500, // Cybersyn tribute port
    httpsOnly: true,
    certPath: './certs/server.crt',
    keyPath: './certs/server.key'
  },
  agent: {
    id: `cyreal-${Date.now()}`,
    name: 'Cyreal Cybernetic Serial Bridge',
    description: 'Cybernetic serial port bridge with VSM governance',
    version: '0.1.0'
  },
  security: {
    enforceRFC1918: true, // HARD restriction
    requireMutualAuth: true,
    tokenExpiryMinutes: 60,
    maxAgentsConnected: 10
  },
  discovery: {
    enabled: true,
    broadcastInterval: 30000,
    agentTimeout: 120000
  }
};

async function startServer(options: any): Promise<void> {
  try {
    // Validate RFC-1918 compliance BEFORE any server initialization
    const validation = RFC1918Validator.validateAddress(options.host);
    if (!validation.valid) {
      logger.error('🚨 RFC-1918 Security Violation Detected');
      logger.error(validation.message);
      process.exit(1);
    }

    logger.info('🤖 Starting Cyreal A2A Server', {
      cybernetic: 'PSRLV governance enabled',
      security: 'RFC-1918 enforced',
      host: options.host,
      port: options.port
    });

    // Create configuration
    const config: A2AConfig = {
      ...DEFAULT_CONFIG,
      server: {
        ...DEFAULT_CONFIG.server,
        host: options.host,
        port: options.port,
        httpsOnly: !options.allowHttp,
        certPath: options.cert,
        keyPath: options.key
      },
      agent: {
        ...DEFAULT_CONFIG.agent,
        id: options.agentId || DEFAULT_CONFIG.agent.id,
        name: options.agentName || DEFAULT_CONFIG.agent.name
      },
      security: {
        ...DEFAULT_CONFIG.security,
        enforceRFC1918: !options.disableRfc1918 // Allow override for testing
      }
    };

    // Initialize components
    const registry = new AgentRegistry(logger);
    const discovery = new ServiceDiscovery(logger, registry);
    const server = new A2AServer(logger, registry, discovery);

    // Start server
    await server.start(config);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    logger.info('🚀 Cyreal A2A Server started successfully');
    logger.info('💡 Press Ctrl+C to stop the server');

  } catch (error) {
    logger.error('Failed to start A2A server:', error);
    process.exit(1);
  }
}

// CLI definition
const cli = yargs
  .scriptName('cyreal-a2a')
  .usage('$0 <command> [options]')
  .command(
    'start',
    'Start the A2A server',
    (yargs) => {
      return yargs
        .option('host', {
          type: 'string',
          default: '127.0.0.1',
          description: 'Host to bind to (must be RFC-1918 or localhost)',
          coerce: (value) => {
            const validation = RFC1918Validator.validateAddress(value);
            if (!validation.valid) {
              throw new Error(`Host validation failed: ${validation.message}`);
            }
            return value;
          }
        })
        .option('port', {
          type: 'number',
          default: 3500,
          description: 'Port to listen on (3500 honors Project Cybersyn)'
        })
        .option('agent-id', {
          type: 'string',
          description: 'Unique agent identifier'
        })
        .option('agent-name', {
          type: 'string',
          description: 'Human-readable agent name'
        })
        .option('cert', {
          type: 'string',
          description: 'Path to SSL certificate file'
        })
        .option('key', {
          type: 'string', 
          description: 'Path to SSL private key file'
        })
        .option('allow-http', {
          type: 'boolean',
          default: false,
          description: '⚠️  Allow HTTP instead of HTTPS (not recommended)'
        })
        .option('disable-rfc1918', {
          type: 'boolean',
          default: false,
          description: '🚨 Disable RFC-1918 enforcement (DANGEROUS - testing only)'
        })
        .option('verbose', {
          type: 'boolean',
          default: false,
          description: 'Enable verbose logging'
        });
    },
    startServer
  )
  .command(
    'validate <address>',
    'Validate an IP address against RFC-1918 requirements',
    (yargs) => {
      return yargs.positional('address', {
        type: 'string',
        description: 'IP address to validate'
      });
    },
    (argv) => {
      const validation = RFC1918Validator.validateAddress(argv.address!);
      
      if (validation.valid) {
        console.log(`✅ Address '${argv.address}' is RFC-1918 compliant`);
        console.log('🔒 Safe for A2A service binding');
      } else {
        console.log(`❌ Address '${argv.address}' violates RFC-1918 requirements`);
        console.log(validation.message);
      }
      
      // Show RFC-1918 ranges for reference
      console.log('\\n📋 RFC-1918 Private Address Ranges:');
      RFC1918Validator.getRFC1918Ranges().forEach(range => {
        console.log(`   ${range.network}/${range.cidr} - ${range.description}`);
      });
    }
  )
  .command(
    'info',
    'Show A2A server information and capabilities',
    {},
    () => {
      console.log(`
🤖 Cyreal A2A Server v0.1.0

🔬 CYBERNETIC FEATURES:
   • PSRLV Governance Pattern (Probe, Sense, Respond, Learn, Validate)
   • Self-adapting serial port intelligence
   • Viable System Model architecture
   • Cross-platform learning algorithms

🔒 SECURITY FEATURES:
   • RFC-1918 address enforcement (HARD restriction)
   • HTTPS-only communication (JSON-RPC 2.0)
   • Mutual authentication with Agent Cards
   • Token-based authorization

🌐 A2A PROTOCOL FEATURES:
   • Standards-compliant A2A implementation
   • Agent capability discovery
   • Service announcement and registration
   • Multi-agent coordination

📡 SERIAL CAPABILITIES:
   • RS-485 multi-drop bus support
   • Adaptive buffering modes
   • Real-time protocol detection
   • Industrial-grade reliability

🏭 PLATFORM SUPPORT:
   • BeagleBone AI-64 (PRU optimization)
   • Banana Pi BPI-M7 (NPU acceleration)
   • Raspberry Pi 5 (RP1 chip support)
   • Ubuntu/Manjaro/Alpine Linux

Port 3500 honors the Burroughs 3500 mainframe from Chile's Project Cybersyn (1973)
Implementing Stafford Beer's Viable System Model for cybernetic governance.

For more information: https://github.com/macawi-ai/cyreal
Ethical Security Standard: https://macawi.ai/ethical-security-standard
      `);
    }
  )
  .demandCommand(1, 'Please specify a command')
  .help()
  .alias('h', 'help')
  .version('0.1.0');

// Parse and execute
cli.parse();