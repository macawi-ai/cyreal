# Configuration Guide

This guide covers all configuration options for Cyreal, including command-line arguments, configuration files, and environment variables.

## Table of Contents

- [Configuration Methods](#configuration-methods)
- [Command Line Options](#command-line-options)
- [Configuration File](#configuration-file)
- [Environment Variables](#environment-variables)
- [Serial Port Options](#serial-port-options)
- [Network Options](#network-options)
- [Security Configuration](#security-configuration)
- [Logging Configuration](#logging-configuration)
- [Advanced Options](#advanced-options)
- [Configuration Examples](#configuration-examples)

## Configuration Methods

Cyreal supports three configuration methods, in order of precedence:

1. **Command-line arguments** (highest priority)
2. **Configuration file** (JSON format)
3. **Environment variables** (lowest priority)

### Configuration Priority Example
```bash
# Config file sets baudrate=9600
# Environment sets CYREAL_BAUDRATE=19200
# Command line sets --baudrate 115200

# Result: baudrate=115200 (command line wins)
```

## Command Line Options

### Basic Usage
```bash
cyreal-core [command] [options]
```

### Commands

#### `start` - Start the service
```bash
cyreal-core start [options]
```

#### `list` - List available serial ports
```bash
cyreald list [--verbose]
```

#### `test` - Run diagnostics
```bash
cyreald test [--port <port>] [--verbose]
```

#### `config` - Manage configuration
```bash
cyreald config [--init|--show|--validate]
```

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `-h, --help` | Show help | - |
| `-v, --version` | Show version | - |
| `-c, --config <file>` | Config file path | `~/.config/cyreal/config.json` |
| `--log-level <level>` | Log level: error, warn, info, debug | info |
| `--no-color` | Disable colored output | false |

### Start Command Options

#### Required Options
| Option | Description | Example |
|--------|-------------|---------|
| `-p, --port <path>` | Serial port path | `/dev/ttyUSB0`, `COM3` |

#### Serial Port Options
| Option | Description | Default |
|--------|-------------|---------|
| `-b, --baudrate <rate>` | Baud rate | 9600 |
| `--databits <bits>` | Data bits (5,6,7,8) | 8 |
| `--stopbits <bits>` | Stop bits (1,2) | 1 |
| `--parity <type>` | Parity: none,even,odd,mark,space | none |
| `--flow-control <type>` | Flow control: none,hardware,software | none |
| `--rs485` | Enable RS-485 mode | false |
| `--rts-pin <pin>` | GPIO pin for RS-485 RTS | - |
| `--rs485-delay <ms>` | RS-485 turnaround delay | 1 |

#### Network Options
| Option | Description | Default |
|--------|-------------|---------|
| `--tcp-port <port>` | TCP server port | 3001 |
| `--tcp-host <host>` | TCP bind address | 0.0.0.0 |
| `--udp-port <port>` | UDP server port | 3002 |
| `--udp` | Enable UDP server | false |
| `--max-connections <n>` | Max TCP connections | 10 |

#### Security Options
| Option | Description | Default |
|--------|-------------|---------|
| `--security <level>` | Security level (see below) | balanced |
| `--auth-token <token>` | Authentication token | - |
| `--ssl` | Enable SSL/TLS | false |
| `--ssl-cert <file>` | SSL certificate file | - |
| `--ssl-key <file>` | SSL key file | - |

#### Performance Options
| Option | Description | Default |
|--------|-------------|---------|
| `--buffer-size <bytes>` | I/O buffer size | 2048 |
| `--low-latency` | Optimize for latency | false |
| `--high-throughput` | Optimize for throughput | false |
| `--polling-interval <ms>` | Status polling interval | 1000 |

## Configuration File

### File Locations

**Linux/macOS:**
- User: `~/.config/cyreal/config.json`
- System: `/etc/cyreal/config.json`

**Windows:**
- User: `%APPDATA%\cyreal\config.json`
- System: `%PROGRAMDATA%\cyreal\config.json`

### File Structure

```json
{
  "daemon": {
    "logLevel": "info",
    "logFile": "auto",
    "pidFile": "auto",
    "workingDirectory": "."
  },
  "network": {
    "tcp": {
      "enabled": true,
      "port": 3001,
      "host": "0.0.0.0",
      "maxConnections": 10
    },
    "udp": {
      "enabled": false,
      "port": 3002,
      "host": "0.0.0.0"
    },
    "ssl": {
      "enabled": false,
      "cert": "/path/to/cert.pem",
      "key": "/path/to/key.pem",
      "ca": "/path/to/ca.pem"
    }
  },
  "security": {
    "level": "balanced",
    "authToken": null,
    "allowedIPs": [],
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 60
    }
  },
  "ports": {
    "default": {
      "baudRate": 9600,
      "dataBits": 8,
      "stopBits": 1,
      "parity": "none",
      "flowControl": "none",
      "bufferSize": 2048
    },
    "specific": {
      "/dev/ttyUSB0": {
        "baudRate": 115200,
        "rs485": {
          "enabled": true,
          "rtsPin": 17,
          "turnaroundDelay": 1
        }
      },
      "COM3": {
        "baudRate": 19200,
        "parity": "even"
      }
    }
  },
  "governors": {
    "operational": {
      "probeInterval": 5000,
      "errorThreshold": 10
    },
    "coordination": {
      "conflictResolution": "priority",
      "loadBalancing": true
    },
    "management": {
      "autoRecover": true,
      "healthCheckInterval": 30000
    },
    "intelligence": {
      "learning": true,
      "predictionEnabled": false
    },
    "meta": {
      "telemetry": false,
      "cloudSync": false
    }
  }
}
```

### Creating Default Configuration

```bash
# Create default config
cyreald config --init

# Show current config
cyreald config --show

# Validate config file
cyreald config --validate
```

## Environment Variables

All environment variables are prefixed with `CYREAL_`:

### Core Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `CYREAL_CONFIG` | Config file path | `/etc/cyreal/custom.json` |
| `CYREAL_LOG_LEVEL` | Log level | `debug` |
| `CYREAL_LOG_FILE` | Log file path | `/var/log/cyreal.log` |
| `CYREAL_PID_FILE` | PID file path | `/var/run/cyreal.pid` |

### Serial Port Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `CYREAL_PORT` | Default serial port | `/dev/ttyUSB0` |
| `CYREAL_BAUDRATE` | Default baud rate | `115200` |
| `CYREAL_DATABITS` | Default data bits | `8` |
| `CYREAL_STOPBITS` | Default stop bits | `1` |
| `CYREAL_PARITY` | Default parity | `none` |

### Network Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `CYREAL_TCP_PORT` | TCP port | `3001` |
| `CYREAL_TCP_HOST` | TCP bind address | `127.0.0.1` |
| `CYREAL_UDP_ENABLED` | Enable UDP | `true` |
| `CYREAL_UDP_PORT` | UDP port | `3002` |

### Security Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `CYREAL_SECURITY_LEVEL` | Security level | `paranoid` |
| `CYREAL_AUTH_TOKEN` | Auth token | `secret123` |
| `CYREAL_SSL_ENABLED` | Enable SSL | `true` |
| `CYREAL_SSL_CERT` | SSL cert path | `/etc/ssl/cert.pem` |

## Serial Port Options

### Baud Rates
Standard rates: 300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200

Extended rates (platform-dependent): 230400, 460800, 921600, 1500000, 3000000

### Data Bits
- 5: Baudot code (legacy)
- 6: Six-bit characters
- 7: ASCII without parity
- 8: Standard (recommended)

### Stop Bits
- 1: Standard (recommended)
- 2: Slower devices, noisy lines

### Parity
- `none`: No parity (recommended)
- `even`: Even parity
- `odd`: Odd parity
- `mark`: Parity bit always 1
- `space`: Parity bit always 0

### Flow Control
- `none`: No flow control (recommended for modern systems)
- `hardware`: RTS/CTS flow control
- `software`: XON/XOFF flow control

### RS-485 Configuration

```json
{
  "rs485": {
    "enabled": true,
    "rtsPin": 17,              // GPIO pin for RTS control
    "turnaroundDelay": 1,      // Milliseconds delay
    "terminationEnabled": true, // Enable termination resistor
    "halfDuplex": true,        // Half-duplex mode
    "multiDrop": {
      "enabled": true,
      "address": 1,            // Device address (1-247)
      "broadcast": 0           // Broadcast address
    }
  }
}
```

## Network Options

### TCP Server Configuration
```json
{
  "tcp": {
    "enabled": true,
    "port": 3001,
    "host": "0.0.0.0",         // Bind to all interfaces
    "maxConnections": 10,
    "keepAlive": true,
    "keepAliveDelay": 60000,   // 60 seconds
    "noDelay": true            // Disable Nagle algorithm
  }
}
```

### UDP Server Configuration
```json
{
  "udp": {
    "enabled": true,
    "port": 3002,
    "host": "0.0.0.0",
    "broadcast": true,         // Enable broadcast
    "multicast": {
      "enabled": false,
      "group": "239.255.0.1",
      "ttl": 1
    }
  }
}
```

### WebSocket Configuration
```json
{
  "websocket": {
    "enabled": true,
    "port": 3003,
    "path": "/ws",
    "compression": true,
    "maxPayload": 1048576      // 1MB
  }
}
```

## Security Configuration

### Security Levels

#### `paranoid`
- Read-only by default
- Strict authentication required
- All commands logged
- Rate limiting enforced
- IP whitelist only

#### `balanced` (default)
- Read/write with authentication
- Moderate rate limiting
- Command logging
- IP whitelist optional

#### `permissive`
- Minimal authentication
- High rate limits
- Basic logging
- Open access

#### `debug`
- No authentication
- No rate limiting
- Verbose logging
- Development only

### Access Control
```json
{
  "security": {
    "level": "balanced",
    "authentication": {
      "type": "token",         // token, basic, certificate
      "token": "your-secret-token",
      "users": [
        {
          "username": "admin",
          "password": "hashed-password",
          "permissions": ["read", "write", "admin"]
        }
      ]
    },
    "ipWhitelist": [
      "127.0.0.1",
      "192.168.1.0/24",
      "10.0.0.0/8"
    ],
    "rateLimit": {
      "enabled": true,
      "window": 60000,         // 1 minute
      "maxRequests": 100,
      "blacklistDuration": 3600000  // 1 hour
    }
  }
}
```

## Logging Configuration

### Log Levels
- `error`: Errors only
- `warn`: Warnings and errors
- `info`: General information (default)
- `debug`: Detailed debugging

### Log Outputs
```json
{
  "logging": {
    "level": "info",
    "outputs": [
      {
        "type": "console",
        "format": "simple",    // simple, json, pretty
        "colorize": true
      },
      {
        "type": "file",
        "path": "/var/log/cyreal/daemon.log",
        "maxSize": "10MB",
        "maxFiles": 5,
        "compress": true
      },
      {
        "type": "syslog",
        "facility": "local0",
        "tag": "cyreald"
      }
    ],
    "filters": {
      "excludeModules": ["serialport"],
      "includeOnly": ["governor", "security"]
    }
  }
}
```

## Advanced Options

### Performance Tuning
```json
{
  "performance": {
    "bufferSize": 4096,        // I/O buffer size
    "readTimeout": 100,        // Read timeout in ms
    "writeTimeout": 100,       // Write timeout in ms
    "maxQueueSize": 1000,      // Max queued messages
    "threadPool": {
      "enabled": true,
      "minThreads": 2,
      "maxThreads": 8
    },
    "cache": {
      "enabled": true,
      "ttl": 300000,           // 5 minutes
      "maxEntries": 1000
    }
  }
}
```

### Governor Configuration
```json
{
  "governors": {
    "operational": {
      "serialPortController": {
        "probeInterval": 5000,
        "errorThreshold": 10,
        "retryAttempts": 3,
        "retryDelay": 1000
      },
      "protocolAnalyzer": {
        "enabled": true,
        "patterns": ["modbus", "nmea", "custom"]
      }
    },
    "coordination": {
      "conflictResolution": "priority",
      "priorityRules": [
        {"port": "/dev/ttyUSB0", "priority": 10},
        {"protocol": "modbus", "priority": 8}
      ]
    },
    "management": {
      "healthCheck": {
        "interval": 30000,
        "timeout": 5000,
        "failureThreshold": 3
      },
      "autoRecovery": {
        "enabled": true,
        "strategies": ["reconnect", "reset", "failover"]
      }
    }
  }
}
```

### Plugin System
```json
{
  "plugins": {
    "enabled": true,
    "directory": "/etc/cyreal/plugins",
    "autoLoad": true,
    "modules": [
      {
        "name": "modbus-decoder",
        "enabled": true,
        "config": {
          "slaveId": 1
        }
      },
      {
        "name": "data-logger",
        "enabled": true,
        "config": {
          "output": "/var/log/cyreal/data.csv"
        }
      }
    ]
  }
}
```

## Configuration Examples

### Basic Serial Terminal
```json
{
  "daemon": {
    "logLevel": "info"
  },
  "ports": {
    "default": {
      "baudRate": 9600,
      "dataBits": 8,
      "stopBits": 1,
      "parity": "none"
    }
  }
}
```

### Industrial Modbus Gateway
```json
{
  "daemon": {
    "logLevel": "warn"
  },
  "network": {
    "tcp": {
      "port": 502,
      "maxConnections": 32
    }
  },
  "security": {
    "level": "balanced",
    "ipWhitelist": ["192.168.1.0/24"]
  },
  "ports": {
    "default": {
      "baudRate": 19200,
      "dataBits": 8,
      "stopBits": 1,
      "parity": "even",
      "rs485": {
        "enabled": true,
        "rtsPin": 17
      }
    }
  }
}
```

### Multi-Port Router
```json
{
  "daemon": {
    "logLevel": "info"
  },
  "network": {
    "tcp": {
      "enabled": true,
      "port": 3001
    },
    "websocket": {
      "enabled": true,
      "port": 3003
    }
  },
  "ports": {
    "specific": {
      "/dev/ttyUSB0": {
        "baudRate": 115200,
        "name": "GPS_RECEIVER"
      },
      "/dev/ttyUSB1": {
        "baudRate": 9600,
        "rs485": {
          "enabled": true,
          "rtsPin": 17
        },
        "name": "MODBUS_NETWORK"
      },
      "/dev/ttyUSB2": {
        "baudRate": 57600,
        "name": "SENSOR_ARRAY"
      }
    }
  },
  "governors": {
    "coordination": {
      "loadBalancing": true,
      "conflictResolution": "round-robin"
    }
  }
}
```

### High-Security Configuration
```json
{
  "daemon": {
    "logLevel": "info",
    "logFile": "/var/log/cyreal/secure.log"
  },
  "network": {
    "tcp": {
      "port": 3001,
      "host": "127.0.0.1"
    },
    "ssl": {
      "enabled": true,
      "cert": "/etc/cyreal/ssl/cert.pem",
      "key": "/etc/cyreal/ssl/key.pem",
      "ca": "/etc/cyreal/ssl/ca.pem",
      "rejectUnauthorized": true
    }
  },
  "security": {
    "level": "paranoid",
    "authentication": {
      "type": "certificate"
    },
    "ipWhitelist": ["127.0.0.1"],
    "audit": {
      "enabled": true,
      "logFile": "/var/log/cyreal/audit.log",
      "events": ["auth", "command", "error", "config"]
    }
  }
}
```