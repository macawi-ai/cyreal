# Cyreal Installation Guide

This guide provides detailed instructions for installing Cyreal on various platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Automated Installation](#automated-installation)
- [Manual Installation](#manual-installation)
- [Platform-Specific Instructions](#platform-specific-instructions)
- [Post-Installation Setup](#post-installation-setup)
- [Verifying Installation](#verifying-installation)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### All Platforms
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- Internet connection for downloading dependencies

### Platform-Specific Prerequisites

#### Linux
- C++ build tools (`build-essential` package)
- Python 3.x (for node-gyp)
- User access to serial ports (dialout group)

#### Windows
- Windows 10 version 1903 or higher, or Windows 11
- Visual Studio Build Tools 2019 or later
- PowerShell 5.0 or higher
- Administrator access (for build tools installation)

#### macOS
- macOS 10.15 (Catalina) or higher
- Xcode Command Line Tools
- Homebrew (recommended)

## Automated Installation

### Quick Installation (Recommended)

**Step 1:** Clone the repository
```bash
git clone https://github.com/macawi-ai/cyreal.git
cd cyreal
```

**Step 2:** Run the installer

#### Linux/macOS
```bash
# Install to default directory (~/ cyreal-deployment)
./install.sh

# Install to custom directory
./install.sh --install-dir /opt/cyreal

# Install to home directory
./install.sh -d ~/my-cyreal
```

#### Windows PowerShell
```powershell
# Install to default directory (~/cyreal-deployment)
.\install.ps1

# Install to custom directory
.\install.ps1 -InstallDir "C:\cyreal"

# Install to AppData
.\install.ps1 -InstallDir "$env:LOCALAPPDATA\cyreal"
```

### Installation Directory Options

The installation scripts support custom installation directories to keep your deployment separate from the source code:

- **Default**: `~/cyreal-deployment` (Linux/macOS) or `%USERPROFILE%\cyreal-deployment` (Windows)
- **Custom**: Specify any directory you prefer
- **Benefits**: Keeps source repo clean, allows multiple deployments, better organization

### What Gets Installed

The installer will:
1. Copy source files to the installation directory (excluding .git, node_modules)
2. Install Node.js dependencies
3. Build all packages with TypeScript
4. Create runtime directories for logs and data
5. Set up global commands (`cyreald`, `cyreal-test`)
6. Configure platform-specific permissions

### Help and Options

Both installers support help and options:

```bash
# Linux/macOS help
./install.sh --help

# Windows help
.\install.ps1 -Help
```

The installer will:
1. Check for Node.js and build tools
2. Install missing dependencies via winget
3. Build all packages
4. Create configuration directories in AppData
5. Set up global `cyreald` command

## Manual Installation

### Step 1: Install Node.js

#### Linux (Ubuntu/Debian)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Linux (Fedora/RHEL)
```bash
# Using NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo dnf install nodejs
```

#### macOS
```bash
# Using Homebrew
brew install node
```

#### Windows
Download and install from [nodejs.org](https://nodejs.org/)

### Step 2: Install Build Tools

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y build-essential python3

# Fedora/RHEL
sudo dnf groupinstall "Development Tools"
sudo dnf install python3
```

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

#### Windows
Option 1: Install Visual Studio Build Tools
- Download from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/)
- Select "Tools for Visual Studio" → "Build Tools for Visual Studio"
- Install with "Desktop development with C++" workload

Option 2: Use npm package (requires Administrator)
```powershell
npm install --global windows-build-tools
```

### Step 3: Clone and Build Cyreal

```bash
# Clone repository
git clone https://github.com/cyreal-project/cyreal.git
cd cyreal

# Install dependencies
npm install

# Build all packages
npm run build

# Install global command
cd packages/cyreald
npm link
```

## Platform-Specific Instructions

### Linux

#### Serial Port Access
Add your user to the dialout group for serial port access:
```bash
sudo usermod -a -G dialout $USER
# Log out and back in for changes to take effect
```

#### Create System Directories (Optional)
For system-wide installation:
```bash
sudo mkdir -p /var/log/cyreal
sudo mkdir -p /var/lib/cyreal
sudo mkdir -p /etc/cyreal
sudo chown $USER:$USER /var/log/cyreal /var/lib/cyreal /etc/cyreal
```

#### Systemd Service (Optional)
Create `/etc/systemd/system/cyreald.service`:
```ini
[Unit]
Description=Cyreal Serial Port Daemon
After=network.target

[Service]
Type=simple
User=cyreal
ExecStart=/usr/local/bin/cyreald start --config /etc/cyreal/config.json
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Windows

#### COM Port Access
No special configuration needed. COM ports are accessible by default.

#### Windows Service (Optional)
Use `node-windows` to install as a service:
```powershell
npm install -g node-windows
cyreald install-service
```

#### Firewall Configuration
If using network features, allow cyreald through Windows Firewall:
```powershell
New-NetFirewallRule -DisplayName "Cyreal Daemon" -Direction Inbound -Program "node.exe" -Action Allow
```

### macOS

#### Serial Port Access
macOS requires no special configuration for USB serial adapters.

#### Launch Agent (Optional)
Create `~/Library/LaunchAgents/com.cyreal.daemon.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cyreal.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/cyreald</string>
        <string>start</string>
        <string>--config</string>
        <string>/Users/username/.config/cyreal/config.json</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load with:
```bash
launchctl load ~/Library/LaunchAgents/com.cyreal.daemon.plist
```

### BeagleBone AI-64

#### Special Considerations
1. Enable UART overlays in `/boot/uEnv.txt`
2. Configure device tree for MikroBUS Click boards
3. Set up PRU for microsecond timing (optional)

```bash
# Enable UART4 for MikroBUS
echo "enable_uboot_overlays=1" | sudo tee -a /boot/uEnv.txt
echo "uboot_overlay_addr4=/lib/firmware/BB-UART4-00A0.dtbo" | sudo tee -a /boot/uEnv.txt
sudo reboot
```

### Raspberry Pi

#### Enable Serial Ports
Edit `/boot/config.txt`:
```ini
# Enable UART
enable_uart=1

# Disable Bluetooth on UART (Pi 3/4/5)
dtoverlay=disable-bt

# Enable additional UARTs (Pi 4/5)
dtoverlay=uart2
dtoverlay=uart3
```

## Post-Installation Setup

### 1. Verify Installation
```bash
# Check cyreald is available
cyreald --version

# List available serial ports
cyreald list

# Run diagnostics
cyreald diagnose
```

### 2. Create Configuration File

Create `~/.config/cyreal/config.json`:
```json
{
  "daemon": {
    "logLevel": "info",
    "tcpPort": 3001,
    "security": "balanced"
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

### 3. Test Basic Functionality
```bash
# Start daemon with a test port
cyreald start --port /dev/ttyUSB0 --baudrate 9600

# On Windows
cyreald start --port COM3 --baudrate 9600
```

## Verifying Installation

### Check Node Modules
```bash
# Verify core dependencies
npm list serialport
npm list @cyreal/core
```

### Run Self-Test
```bash
# Run built-in tests
cyreald test

# Verbose output
cyreald test --verbose
```

### Check Logs
```bash
# Linux/macOS
tail -f ~/.cyreal/logs/cyreald.log

# Windows
Get-Content "$env:LOCALAPPDATA\cyreal\logs\cyreald.log" -Tail 50 -Wait
```

## Troubleshooting

### Common Issues

#### Node.js Version Too Old
```bash
# Check version
node --version

# Update Node.js
# Linux: Use NodeSource repository
# macOS: brew upgrade node
# Windows: Download latest from nodejs.org
```

#### Build Errors on npm install

**Linux/macOS:**
```bash
# Clear npm cache
npm cache clean --force

# Rebuild native modules
npm rebuild

# Try with verbose logging
npm install --verbose
```

**Windows:**
```powershell
# Run as Administrator
npm install --global windows-build-tools

# Set Python path
npm config set python python3.exe

# Rebuild
npm rebuild
```

#### Serial Port Access Denied

**Linux:**
```bash
# Check groups
groups

# Add to dialout
sudo usermod -a -G dialout $USER

# Verify port permissions
ls -l /dev/ttyUSB*
```

**Windows:**
- Ensure no other application is using the COM port
- Check Device Manager for port conflicts

#### GPIO Not Available (Linux SBCs)

```bash
# Check GPIO access
ls -l /sys/class/gpio/

# Add user to gpio group (if exists)
sudo usermod -a -G gpio $USER
```

### Getting Help

1. Check logs: `cyreald logs`
2. Run diagnostics: `cyreald diagnose`
3. Visit [GitHub Issues](https://github.com/cyreal-project/cyreal/issues)
4. Review [troubleshooting guide](troubleshooting.md)

## Next Steps

- Read the [Configuration Guide](configuration.md) for detailed options
- See [Platform Guide](platforms.md) for hardware-specific setup
- Review [API Documentation](api.md) for integration
- Explore [Examples](../examples/) for common use cases