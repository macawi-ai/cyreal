# Service Management Guide

Cyreal provides a universal service management system that works across Linux, macOS, and Windows platforms. The service architecture automatically detects your platform and uses the appropriate service manager (systemd, launchd, or Windows Service Control Manager).

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Service Commands](#service-commands)
- [Platform-Specific Details](#platform-specific-details)
- [Configuration](#configuration)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Overview

### Universal Service Architecture

Cyreal's service management provides:
- **Cross-platform compatibility**: Linux (systemd/SysVinit), macOS (launchd), Windows (SCM)
- **Automatic platform detection**: Smart detection of the best service manager
- **Secure installation**: Input validation and command injection protection
- **Professional-grade service files**: Industry-standard service configurations
- **Centralized management**: Unified CLI commands across all platforms

### Service Managers Supported

| Platform | Service Manager | Service Files | Commands |
|----------|----------------|---------------|----------|
| Linux | systemd | `/etc/systemd/system/` | `systemctl` |
| Linux (legacy) | SysVinit | `/etc/init.d/` | `service` |
| macOS | launchd | `/Library/LaunchDaemons/` | `launchctl` |
| Windows | SCM | Windows Registry | `sc` |

## Installation

### Install as System Service

Install Cyreal as a system service that starts automatically on boot:

```bash
# Install with default settings
cyreal-core service --install

# Install with custom service name
cyreal-core service --install --name my-cyreal-service

# Install with specific user (Linux/macOS)
cyreal-core service --install --user cyreal --group cyreal

# Install without auto-start
cyreal-core service --install --no-auto-start

# Force reinstall over existing service
cyreal-core service --install --force
```

### Installation Options

| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | Service name | `cyreal-core` |
| `--user <user>` | Service user (Linux/macOS) | Platform-specific |
| `--group <group>` | Service group (Linux/macOS) | Platform-specific |
| `--auto-start` | Enable auto-start on boot | `true` |
| `--force` | Overwrite existing service | `false` |

### Default Service Users

| Platform | Default User | Default Group |
|----------|--------------|---------------|
| Linux | `cyreal` | `cyreal` |
| macOS | `_cyreal` | `_cyreal` |
| Windows | `SYSTEM` | `SYSTEM` |

## Service Commands

### Basic Service Management

```bash
# Install service
cyreal-core service --install

# Start service
cyreal-core service --start

# Stop service
cyreal-core service --stop

# Restart service
cyreal-core service --restart

# Check service status
cyreal-core service --status

# Uninstall service
cyreal-core service --uninstall
```

### Advanced Commands

```bash
# Install with custom configuration
cyreal-core service --install \
  --name production-cyreal \
  --user cyreal-prod \
  --group cyreal-prod \
  --auto-start

# Check detailed status
cyreal-core service --status --name production-cyreal

# Force uninstall with cleanup
cyreal-core service --uninstall --force
```

### Platform Information

```bash
# Show platform and service manager info
cyreal-core platform

# Example output:
# 🖥️  Platform Information
# ════════════════════════════════════════
# Platform: linux
# Architecture: x64
# OS Version: 5.15.0-56-generic
# Service Manager: systemd
# Can Install Services: ✅
# Requires Elevation: ✅
```

## Platform-Specific Details

### Linux (systemd)

**Service File Location**: `/etc/systemd/system/cyreal-core.service`

**Key Features**:
- Automatic restart on failure
- Security hardening (NoNewPrivileges, ProtectSystem)
- Resource limits and monitoring
- Journal integration for logging

**Example Service File**:
```ini
[Unit]
Description=Cyreal Core - Universal Cybernetic Service
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/cyreal-core start --daemon
Restart=always
RestartSec=5
User=cyreal
Group=cyreal
WorkingDirectory=/var/lib/cyreal

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/cyreal /var/log/cyreal

[Install]
WantedBy=multi-user.target
```

**Manual systemd Commands**:
```bash
# Direct systemd management
sudo systemctl start cyreal-core
sudo systemctl stop cyreal-core
sudo systemctl status cyreal-core
sudo systemctl enable cyreal-core
sudo systemctl disable cyreal-core

# View logs
sudo journalctl -u cyreal-core -f
```

### macOS (launchd)

**Service File Location**: `/Library/LaunchDaemons/com.cyreal.cyreal-core.plist`

**Key Features**:
- Automatic restart and crash recovery
- On-demand loading capabilities
- Resource monitoring
- System-level daemon privileges

**Example Plist File**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cyreal.cyreal-core</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/cyreal-core</string>
        <string>start</string>
        <string>--daemon</string>
    </array>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/var/log/cyreal/cyreal-core.log</string>
    
    <key>StandardErrorPath</key>
    <string>/var/log/cyreal/cyreal-core.error.log</string>
</dict>
</plist>
```

**Manual launchctl Commands**:
```bash
# Direct launchctl management
sudo launchctl load -w /Library/LaunchDaemons/com.cyreal.cyreal-core.plist
sudo launchctl unload /Library/LaunchDaemons/com.cyreal.cyreal-core.plist
sudo launchctl list | grep cyreal

# View logs
tail -f /var/log/cyreal/cyreal-core.log
```

### Windows (Service Control Manager)

**Service Registration**: Windows Registry and Services Console

**Key Features**:
- Automatic recovery actions
- Windows Event Log integration
- Service dependencies
- Performance monitoring via Windows tools

**Manual sc Commands**:
```cmd
# Direct sc management
sc start cyreal-core
sc stop cyreal-core
sc query cyreal-core
sc config cyreal-core start= auto

# View service details
sc qc cyreal-core
```

## Configuration

### Service Configuration Files

| Platform | Config Location | Format |
|----------|----------------|---------|
| Linux | `/etc/cyreal/cyreal.yaml` | YAML |
| macOS | `/etc/cyreal/cyreal.yaml` | YAML |
| Windows | `C:\ProgramData\Cyreal\cyreal.yaml` | YAML |

### Default Configuration

The service installer creates a default configuration file:

```yaml
# Cyreal Service Configuration
daemon:
  logLevel: info
  logFile: /var/log/cyreal/cyreal-core.log

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
```

### Log Files

| Platform | Log Directory | Main Log File |
|----------|---------------|---------------|
| Linux | `/var/log/cyreal/` | `cyreal-core.log` |
| macOS | `/var/log/cyreal/` | `cyreal-core.log` |
| Windows | `C:\ProgramData\Cyreal\logs\` | `cyreal-core.log` |

## Security

### Security Features

1. **Input Validation**: All service names, paths, and descriptions are validated
2. **Command Injection Protection**: Secure command execution prevents shell injection
3. **Privilege Separation**: Services run under dedicated user accounts
4. **File System Protection**: Restricted file system access and permissions
5. **Resource Limits**: systemd integration provides resource control

### Security Hardening

The service installation applies security best practices:

**Linux (systemd)**:
```ini
# Security hardening automatically applied
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/cyreal /var/log/cyreal
```

**macOS**:
- Restricted to essential system directories
- Runs under dedicated user account
- Limited process capabilities

**Windows**:
- Runs under SYSTEM account with controlled permissions
- Windows Defender integration
- Event Log auditing

### Secure Uninstall

```bash
# Standard uninstall (preserves data)
cyreal-core service --uninstall

# Complete removal with data cleanup
cyreal-core service --uninstall --force
```

## Troubleshooting

### Common Issues

**Service won't start**:
```bash
# Check service status for errors
cyreal-core service --status

# View platform-specific logs
# Linux: sudo journalctl -u cyreal-core
# macOS: tail -f /var/log/cyreal/cyreal-core.log
# Windows: Event Viewer → Application logs
```

**Permission denied during installation**:
```bash
# Ensure you have administrator/sudo privileges
sudo cyreal-core service --install  # Linux/macOS
# Run PowerShell as Administrator on Windows
```

**Service exists but can't manage**:
```bash
# Force reinstall
cyreal-core service --install --force

# Or uninstall and reinstall
cyreal-core service --uninstall --force
cyreal-core service --install
```

**Binary not found**:
```bash
# Check if cyreal-core is in PATH
which cyreal-core

# Or specify full path in service configuration
# This is handled automatically by the installer
```

### Debug Mode

For troubleshooting service issues:

```bash
# Install service with debug logging
cyreal-core service --install
# Then edit config file to set logLevel: debug

# Restart service to apply changes
cyreal-core service --restart

# Monitor logs in real-time
# Linux: sudo journalctl -u cyreal-core -f
# macOS: tail -f /var/log/cyreal/cyreal-core.log
# Windows: Use Event Viewer or PowerShell Get-EventLog
```

### Platform-Specific Troubleshooting

**Linux systemd**:
```bash
# Check service file syntax
sudo systemd-analyze verify /etc/systemd/system/cyreal-core.service

# Reload if you made manual changes
sudo systemctl daemon-reload

# Check service dependencies
systemctl list-dependencies cyreal-core
```

**macOS launchd**:
```bash
# Validate plist file
plutil -lint /Library/LaunchDaemons/com.cyreal.cyreal-core.plist

# Check launchd logs
sudo log show --predicate 'process == "launchd"' --last 1h
```

**Windows SCM**:
```cmd
# Check service dependencies
sc enumdepend cyreal-core

# View service recovery settings
sc qfailure cyreal-core
```

This universal service management system ensures Cyreal runs reliably across all platforms while maintaining security and following platform-specific best practices.