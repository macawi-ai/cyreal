# Cyreal - Cybernetic Serial Port Bridge for AI

Cyreal provides remote serial port access to AI systems via Model Context Protocol (MCP), implementing cybernetic governance principles for self-monitoring, self-healing, and adaptive behavior.

## Features

- 🔌 **Multi-Protocol Serial Support**: RS-232, RS-485, USB Serial, TTL
- 🤖 **AI-Native**: Built for MCP integration with Claude and other AI systems
- 🔄 **Cybernetic Governance**: Self-monitoring and adaptive behavior
- 🔒 **Enterprise Security**: Token-based auth, rate limiting, audit logging
- 📊 **Industrial Monitoring**: Comprehensive health metrics and event streaming
- 🌐 **Network Flexible**: TCP/UDP with automatic reliability management
- 🏭 **Industrial Ready**: RS-485 multi-drop bus support for DIN rail systems
- 🖥️ **Cross-Platform**: Windows, Linux, macOS support

## Quick Start

### Automated Installation

**Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/cyreal-project/cyreal/main/install.sh | bash
```

**Windows (PowerShell as Administrator):**
```powershell
irm https://raw.githubusercontent.com/cyreal-project/cyreal/main/install.ps1 | iex
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/macawi-ai/cyreal.git
cd cyreal

# Run the installer with options
./install.sh                           # Install to ~/cyreal-deployment
./install.sh --install-dir /opt/cyreal  # Install to custom directory
./install.sh --help                    # Show all options

# Windows (PowerShell)
.\install.ps1                          # Install to ~/cyreal-deployment
.\install.ps1 -InstallDir "C:\cyreal"  # Install to custom directory
.\install.ps1 -Help                    # Show all options
```

> 💡 **Pro Tip**: The installer creates a separate deployment directory, keeping your source repo clean and allowing multiple installations.

## System Requirements

### Minimum Requirements
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- 512MB RAM
- 100MB disk space

### Platform-Specific Requirements

**Linux:**
- Build tools: `build-essential` package
- Serial port access: User must be in `dialout` group
- Python 3 (for node-gyp)

**Windows:**
- Windows 10/11
- Visual Studio Build Tools or `windows-build-tools` npm package
- PowerShell 5.0 or higher

**macOS:**
- macOS 10.15 or higher
- Xcode Command Line Tools

### Hardware Support

**Recommended Platforms:**
- BeagleBone AI-64 (with PRU for precise timing)
- Banana Pi BPI-M7 (RK3588, high-speed serial)
- Raspberry Pi 5 (RP1 chip improvements)
- Standard x86/x64 PCs with USB serial adapters

**Serial Adapters:**
- FTDI USB-to-Serial converters
- CH340/CH341 USB adapters
- CP2102/CP2104 Silicon Labs adapters
- Native RS-232 ports (COM1-COM4 on Windows)

## Basic Usage

### List Available Serial Ports
```bash
cyreald list
```

### Start the Daemon
```bash
# Linux/macOS
cyreald start --port /dev/ttyUSB0 --baudrate 115200

# Windows
cyreald start --port COM3 --baudrate 115200

# With RS-485
cyreald start --port /dev/ttyUSB0 --baudrate 9600 --rs485 --rts-pin 17
```

### Configuration Options

```bash
cyreald start [options]

Options:
  -p, --port <path>      Serial port path (required)
  -b, --baudrate <rate>  Baud rate (default: 9600)
  --databits <bits>      Data bits: 5, 6, 7, 8 (default: 8)
  --stopbits <bits>      Stop bits: 1, 2 (default: 1)
  --parity <type>        Parity: none, even, odd (default: none)
  --rs485                Enable RS-485 mode
  --rts-pin <pin>        GPIO pin for RS-485 RTS control
  --tcp-port <port>      TCP port for network access (default: 3001)
  --security <level>     Security level: paranoid, balanced, permissive, debug
  --log-level <level>    Log level: error, warn, info, debug
```

## Architecture

Cyreal implements Stafford Beer's Viable System Model (VSM) with 5 hierarchical levels:

1. **Operational**: Direct serial port control with specialized governors
2. **Coordination**: Conflict resolution and resource balancing
3. **Management**: Multi-port coordination and optimization
4. **Intelligence**: Predictive analytics and learning
5. **Meta-System**: Strategic evolution and external integration

## Project Structure

```
cyreal/
├── packages/
│   ├── cyreal-core/     # Shared types and interfaces
│   ├── cyreald/         # Serial port daemon
│   └── cyreal-mcp/      # MCP server
├── docs/                # Documentation
│   ├── installation.md  # Detailed installation guide
│   ├── configuration.md # Configuration reference
│   └── api.md          # API documentation
├── examples/            # Usage examples
└── tests/              # Integration tests
```

## Security Levels

- **Paranoid**: Maximum security, read-only by default
- **Balanced**: Default mode with adaptive security
- **Permissive**: Relaxed for troubleshooting
- **Debug**: Minimal security for development

## Industrial Status Indicators

- 🟢 **Green**: Operational - port connected, data flowing
- 🟡 **Yellow**: Warning - minor issues detected
- 🔴 **Red**: Error - connection lost or critical issues
- 🔵 **Blue**: Standby - configured but inactive
- ⚪ **White**: Maintenance - diagnostic mode

## Documentation

- [Installation Guide](docs/installation.md) - Detailed installation instructions
- [Configuration Guide](docs/configuration.md) - All configuration options
- [Platform Guide](docs/platforms.md) - Platform-specific setup
- [API Reference](docs/api.md) - Complete API documentation
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## Contributing

Cyreal is developed using cybernetic collaboration principles. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - See [LICENSE](LICENSE) file for full details.

When using Cyreal, please include attribution:
```
Powered by Cyreal - Cybernetic Serial Port Bridge
https://github.com/cyreal-project/cyreal
```

## Acknowledgments

Built on cybernetic principles from Stafford Beer's Viable System Model and implementing second-order cybernetics for self-aware serial communication.