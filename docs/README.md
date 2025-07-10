# Cyreal Documentation

Welcome to the comprehensive documentation for Cyreal - the universal cybernetic service for AI systems with cross-platform hardware integration.

## 📚 Documentation Index

### Getting Started
- **[Installation Guide](installation.md)** - Complete installation instructions for all platforms
- **[Quick Start Guide](../SETUP.md)** - Development setup and first steps
- **[Platform Guide](platforms.md)** - OS-specific setup and optimization

### Service Management
- **[Service Management Guide](service-management.md)** - Universal service installation and management
- **[Configuration Guide](configuration.md)** - Complete configuration reference
- **[Network Configuration](networking.md)** - Network setup and protocols

### Core Features
- **[Device Discovery](discovery.md)** - Hardware fingerprinting and device identification
- **[Serial Communication](serial.md)** - Serial port protocols and configuration
- **[AI Integration](ai-integration.md)** - Model Context Protocol (MCP) and AI features
- **[Security Guide](security.md)** - Threat detection, policies, and security features

### Advanced Topics
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
- **[API Reference](api.md)** - Complete API documentation
- **[Platform-Specific Features](platform-features.md)** - Hardware-specific optimizations

### Development
- **[Architecture Overview](../cyreal-vsm-architecture.md)** - Cybernetic architecture and design
- **[Design Journal](../cyreal-design-journal.md)** - Design decisions and evolution
- **[Contributing Guidelines](../CONTRIBUTING.md)** - How to contribute to Cyreal

## 🌟 Key Features Overview

### Universal Service Architecture
Cyreal provides cross-platform service management that works identically across:
- **Linux** (systemd, SysVinit)
- **macOS** (launchd)
- **Windows** (Service Control Manager)

```bash
# Same commands work everywhere
cyreal-core service --install
cyreal-core service --start
cyreal-core service --status
```

### Device Discovery & Fingerprinting
Comprehensive hardware identification system with 1000+ device profiles:
```bash
# Discover all connected devices
cyreal-test discover

# Security-focused enterprise output
cyreal-test discover --enable-security --industrial

# JSON output for automation
cyreal-test discover --format json
```

### AI-Native Integration
Built for Claude and other AI systems via Model Context Protocol:
```javascript
// Natural language hardware control
await cyreal.execute({
  command: "Read temperature from Modbus sensor",
  port: "/dev/ttyUSB0",
  address: 0x01
});
```

### Security & Compliance
Enterprise-grade security with threat detection:
- USB device policy enforcement
- Unauthorized device detection
- Complete audit trails
- SIEM integration ready

## 🔧 Quick Command Reference

### Service Management
```bash
# Install as system service
cyreal-core service --install

# Service control
cyreal-core service --start
cyreal-core service --stop
cyreal-core service --restart
cyreal-core service --status

# Platform information
cyreal-core platform
```

### Device Operations
```bash
# List serial ports
cyreal-core list

# Start with specific port
cyreal-core start --port /dev/ttyUSB0 --baudrate 115200

# RS-485 communication
cyreal-core start --port /dev/ttyUSB0 --rs485 --rts-pin 17

# Configuration management
cyreal-core config --show
cyreal-core config --init production
```

### Testing & Discovery
```bash
# System overview
cyreal-test

# Device discovery
cyreal-test discover

# Platform capabilities
cyreal-test platform

# Security assessment
cyreal-test discover --enable-security
```

## 🎯 Use Case Documentation

### For Developers & Makers
- [Arduino and ESP32 Development](examples/arduino-esp32.md)
- [IoT Application Building](examples/iot-applications.md)
- [Hardware Prototyping](examples/prototyping.md)

### For Industrial Engineers
- [Factory Automation](examples/industrial-automation.md)
- [Modbus and Industrial Protocols](examples/industrial-protocols.md)
- [Sensor Networks](examples/sensor-networks.md)

### For Security Professionals
- [USB Threat Detection](examples/usb-security.md)
- [Device Inventory Management](examples/device-inventory.md)
- [Compliance Monitoring](examples/compliance.md)

### For AI Researchers
- [Hardware-AI Integration](examples/ai-hardware.md)
- [Robotic Control Systems](examples/robotics.md)
- [Physical World Interaction](examples/physical-world.md)

## 🛠️ Technical Architecture

### Cybernetic Design
Cyreal implements Stafford Beer's Viable System Model (VSM) with 5 hierarchical levels:

1. **System 1** - Operational: Direct hardware control
2. **System 2** - Coordination: Resource management  
3. **System 3** - Optimization: Performance tuning
4. **System 4** - Intelligence: Learning and adaptation
5. **System 5** - Governance: Strategic evolution

### Cross-Platform Components
```
cyreal/
├── packages/
│   ├── cyreal-core/        # Types, interfaces, device database
│   ├── cyreald/           # Universal service with cross-platform support
│   ├── cyreal-tester/     # CLI testing and discovery tool
│   └── cyreal-mcp/        # AI integration server
├── database/              # Device fingerprints (1000+ profiles)
├── docs/                  # Comprehensive documentation
└── examples/              # Real-world usage examples
```

## 🚀 Getting Started Paths

### Quick Start (5 minutes)
1. [Install Cyreal](installation.md#quick-installation)
2. [Run device discovery](../SETUP.md#testing-your-setup)
3. [Start with your first device](../SETUP.md#interactive-testing)

### Development Setup (15 minutes)
1. [Clone and build from source](../SETUP.md#clone-and-install)
2. [Platform-specific configuration](../SETUP.md#platform-specific-setup)
3. [Test cybernetic features](../SETUP.md#cybernetic-features-in-action)

### Production Deployment (30 minutes)
1. [Install as system service](service-management.md#installation)
2. [Configure for your environment](configuration.md#configuration-file)
3. [Set up monitoring and logging](service-management.md#configuration)

### AI Integration (45 minutes)
1. [Set up MCP server](ai-integration.md#mcp-setup)
2. [Configure Claude integration](ai-integration.md#claude-integration)
3. [Build your first AI-hardware application](ai-integration.md#examples)

## 🤝 Community & Support

### Community Resources
- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Questions and community help
- **Discord** - Real-time chat and support

### Commercial Support
- **Enterprise Support** - Priority support and SLA
- **Custom Integration** - Tailored solutions for your needs
- **Training & Consulting** - Get your team up to speed

## 📈 What's New

### Latest Updates (Universal Service Architecture)
- ✅ **Cross-platform service management** - Linux, macOS, Windows support
- ✅ **Security hardening** - Command injection protection, input validation
- ✅ **Professional service installation** - systemd, launchd, Windows SCM
- ✅ **Unified CLI commands** - Same commands work on all platforms
- ✅ **Enterprise-ready naming** - Modern `cyreal-core` service architecture

### Coming Soon
- 🔄 **Enhanced MCP integration** - Improved AI-hardware communication
- 🔄 **Additional industrial protocols** - CAN bus, Profibus support
- 🔄 **Web dashboard** - Browser-based device management
- 🔄 **Plugin system** - Extensible device support

---

**Ready to get started?** Begin with our [Installation Guide](installation.md) or jump straight to [device discovery](../SETUP.md#testing-your-setup) to see Cyreal in action!