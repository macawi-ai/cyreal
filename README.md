# 🚀 **CYREAL - The Swiss Army Knife of IoT Platforms**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)

**🇨🇭 One platform. Every IoT tool you need.**

**Universal IoT platform for device discovery, serial communication, hardware fingerprinting, and AI integration**

---

## 🎯 **What is Cyreal?**

Cyreal is a comprehensive IoT platform that bridges the gap between hardware devices and modern software systems. Whether you're building industrial automation, developing IoT applications, securing infrastructure, or integrating AI with hardware, Cyreal provides the complete toolkit.

### **🔍 Device Discovery & Fingerprinting**
- **Automatic hardware detection** - Plug in any device, get instant identification
- **1000+ device profiles** - ESP32, Arduino, LilyGo, industrial sensors, and more
- **Community database** - Crowdsourced device fingerprints (privacy-first, opt-in)
- **Real-time inventory** - Know every connected device instantly

### **🔌 Universal Serial Communication**
- **Cross-platform support** - Windows, Linux, macOS
- **All protocols** - RS-232, RS-485, USB Serial, TTL, Modbus, CAN
- **Industrial ready** - Multi-drop bus, GPIO control, precise timing
- **Developer friendly** - Simple API, extensive documentation

### **🤖 AI-Native Integration**
- **Model Context Protocol (MCP)** - Built for Claude and other AI systems
- **Cybernetic governance** - Self-monitoring, self-healing, adaptive behavior
- **AI-ready APIs** - Let AI systems interact with physical hardware
- **Natural language control** - "Read temperature from sensor on port COM3"

### **🛡️ Security & Compliance**
- **USB threat detection** - Identify unauthorized devices instantly
- **Policy enforcement** - Automated compliance checking
- **Audit trails** - Complete device connection history
- **Enterprise ready** - SIEM integration, MDM support

---

## 🌟 **Key Features**

| **Device Discovery** | **Serial Communication** | **AI Integration** | **Security** |
|---------------------|-------------------------|-------------------|--------------|
| ✅ Plug & identify | ✅ Cross-platform | ✅ MCP protocol | ✅ Threat detection |
| ✅ Hardware fingerprinting | ✅ All serial protocols | ✅ Claude ready | ✅ Policy enforcement |
| ✅ Vendor detection | ✅ Industrial protocols | ✅ Natural language | ✅ Audit logging |
| ✅ Capability assessment | ✅ GPIO control | ✅ Adaptive behavior | ✅ Compliance |

---

## 🚀 **Quick Start**

### **Installation**

```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/cyreal-project/cyreal/main/install.sh | bash

# Windows (PowerShell as Administrator)
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/cyreal-project/cyreal/main/install.ps1'))

# Or clone and install manually
git clone https://github.com/cyreal-project/cyreal.git
cd cyreal
./install.sh --install-dir ~/cyreal-deployment
```

### **Basic Usage**

```bash
# Quick system overview
cyreal-test

# Discover connected devices (clean business format)
cyreal-test discover

# Detailed power-user output with timings
cyreal-test discover --detailed

# Industrial-grade formatting (enterprise/compliance)
cyreal-test discover --industrial

# Comprehensive device discovery with security assessment
cyreal-test discover --enable-security --industrial

# List serial ports
cyreald list

# Start serial daemon
cyreald start --port /dev/ttyUSB0 --baudrate 115200
```

---

## 📊 **Real-World Examples**

### **Example 1: IoT Device Discovery**
```bash
$ cyreal-test discover

🔍 Device Discovery Results:
┌─────────────────────────────────────────────────────┐
│ 📱 LilyGo TTGO LoRaWAN 868/915MHz                   │
│ 🔗 VID:10c4 PID:ea60 • /dev/ttyUSB0                │
│ ⚙️  Protocols: UART, LoRaWAN, AT Commands           │
│ 🔧 Settings: 115200 baud, 8N1                       │
│ 📊 Confidence: 95% (verified profile)               │
└─────────────────────────────────────────────────────┘

💡 This device is perfect for:
   - Long-range IoT sensor networks
   - Industrial monitoring (up to 15km range)
   - Low-power asset tracking
```

### **Example 2: AI Hardware Control**
```javascript
// MCP integration example
const cyreal = new CyrealMCP();

// Natural language hardware control
await cyreal.execute({
  command: "Read temperature from Modbus sensor",
  port: "/dev/ttyUSB0",
  address: 0x01
});

// Response: "Temperature: 23.5°C"
```

### **Example 3: Security Monitoring**
```bash
$ cyreal-test security-scan

🛡️ Security Scan Results:
✅ Arduino Uno (VID:2341) - Authorized development board
✅ ESP32-S3 (VID:303a) - Authorized IoT device
🚨 iPhone (VID:05ac) - Unauthorized mobile device!
   ⚠️  Policy violation - requires approval
   🔴 Risk: Data exfiltration possible
```

### **Example 4: Industrial Automation**
```bash
# Modbus RTU communication
cyreald modbus --port /dev/ttyUSB0 --baudrate 9600 --address 1

# RS-485 multi-drop bus
cyreald start --port /dev/ttyUSB0 --rs485 --rts-pin 17

# CAN bus monitoring
cyreald can --port /dev/ttyUSB0 --bitrate 250000
```

---

## 🏗️ **Architecture**

### **Cybernetic Design**
Cyreal implements Stafford Beer's Viable System Model (VSM) with 5 hierarchical levels:

1. **System 1** - Operational: Direct hardware control
2. **System 2** - Coordination: Resource management  
3. **System 3** - Optimization: Performance tuning
4. **System 4** - Intelligence: Learning and adaptation
5. **System 5** - Governance: Strategic evolution

### **Core Components**
```
cyreal/
├── packages/
│   ├── cyreal-core/        # Types, interfaces, device database
│   ├── cyreald/           # Serial daemon with governors
│   ├── cyreal-tester/     # CLI testing and discovery tool
│   └── cyreal-mcp/        # AI integration server
├── database/              # Device fingerprints (1000+ profiles)
├── docs/                  # Comprehensive documentation
└── examples/              # Real-world usage examples
```

---

## 👥 **Who Uses Cyreal?**

### **🔧 Developers & Makers**
- Arduino and ESP32 development
- IoT application building
- Hardware prototyping
- Serial communication debugging

### **🏭 Industrial Engineers**
- Factory automation
- Sensor networks
- Industrial protocols (Modbus, CAN)
- Asset tracking and monitoring

### **🛡️ Security Professionals**
- USB threat detection
- Device inventory auditing
- Compliance monitoring
- Incident response

### **🤖 AI Researchers**
- Hardware-AI integration
- Robotic control systems
- Sensor data collection
- Physical world interaction

### **🏢 Enterprise IT**
- Asset management
- Policy enforcement
- Shadow IT detection
- Zero-trust validation

---

## 🌍 **Community & Ecosystem**

### **📊 Device Database**
- **1000+ verified profiles** - Growing daily
- **Community contributions** - Add your devices
- **Vendor partnerships** - Official profiles from manufacturers
- **Privacy-first** - Opt-in sharing, anonymous data only

### **🤝 Open Source**
- **MIT Licensed** - Use freely in any project
- **Transparent development** - All code public
- **Community driven** - Your input shapes the platform
- **Well documented** - Extensive guides and examples

### **🏢 Enterprise Support**
- **Commercial licenses** - For advanced features
- **Priority support** - Direct access to team
- **Custom integration** - Tailored solutions
- **Training available** - Get your team up to speed

---

## 📚 **Documentation**

- **[Installation Guide](docs/installation.md)** - Detailed setup instructions
- **[Platform Guide](docs/platforms.md)** - OS-specific configuration
- **[Device Discovery](docs/discovery.md)** - Hardware fingerprinting system
- **[Serial Communication](docs/serial.md)** - Protocol reference
- **[AI Integration](docs/ai-integration.md)** - MCP and AI features
- **[Security Guide](docs/security.md)** - Threat detection and policies
- **[API Reference](docs/api.md)** - Complete API documentation
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

---

## 🚀 **Getting Started**

### **For Developers**
```bash
# Quick device discovery
cyreal-test discover

# Detailed output with timings and debug info
cyreal-test discover --detailed --verbose

# JSON output for automation
cyreal-test discover --format json

# Start serial communication
cyreald start --port /dev/ttyUSB0 --baudrate 115200
```

### **For Security Teams**
```bash
# Enterprise security assessment (clean, professional)
cyreal-test discover --enable-security --industrial

# Compliance reporting
cyreal-test discover --enable-security --format json --industrial

# Monitor device connections with technical details
cyreal-test discover --enable-security --detailed
```

### **For Industrial Users**
```bash
# Industrial control system format (no emojis, aligned)
cyreal-test discover --industrial

# Technical device status for operations
cyreal-test platform --industrial --detailed

# System health monitoring
cyreal-test health --industrial --format yaml
```

### **Output Format Options**
```bash
# Standard business format (default)
cyreal-test discover

# Power-user format with all timing data
cyreal-test discover --detailed

# Industrial/enterprise format (professional, no emojis)
cyreal-test discover --industrial

# Combine options for maximum detail
cyreal-test discover --industrial --detailed --verbose
```

---

## 🎯 **Why Choose Cyreal?**

### **🌟 Unique Advantages**
- **Only platform** combining discovery + communication + AI + security
- **Largest device database** with community contributions
- **Cross-platform** true support (not just Linux)
- **AI-native** design from the ground up
- **Industrial grade** with consumer friendly interface

### **🔮 Future Proof**
- **Active development** - New features weekly
- **Growing ecosystem** - Plugins and integrations
- **Vendor support** - Partnerships with hardware manufacturers
- **Standards based** - Open protocols and formats

---

## 🤝 **Contributing**

We welcome contributions from all communities!

### **Ways to Contribute**
- **🔍 Device Profiles** - Add new hardware fingerprints
- **🔧 Code** - Features, bug fixes, optimizations
- **📚 Documentation** - Guides, tutorials, translations
- **🧪 Testing** - Try new features, report issues
- **💡 Ideas** - Suggest features, use cases

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📞 **Support & Contact**

### **Community**
- **GitHub Issues** - Bug reports and features
- **Discussions** - Questions and answers
- **Discord** - Real-time chat
- **Forum** - Long-form discussions

### **Commercial**
- **Email** - enterprise@cyreal.io
- **Support** - Priority ticketing system
- **Consulting** - Custom solutions

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) for details.

```
Powered by Cyreal - Cross-Platform IoT Platform
https://github.com/cyreal-project/cyreal
```

---

<div align="center">

**Join thousands of developers, engineers, and security professionals using Cyreal**

[🌐 Website](https://cyreal.io) • [📚 Docs](https://docs.cyreal.io) • [💬 Discord](https://discord.gg/cyreal) • [📧 Contact](mailto:hello@cyreal.io)

**Built with ❤️ by the Cyreal Community**

</div>