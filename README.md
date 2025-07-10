# 🚀 **CYREAL - The Swiss Army Knife of IoT Platforms**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)

**🇨🇭 One platform. Every IoT tool you need.**

**Universal IoT platform for device discovery, serial communication, hardware fingerprinting, and AI integration**

---

## 🎯 **What is Cyreal?**

Cyreal is a comprehensive IoT platform that bridges the gap between hardware devices and modern software systems. Whether you're building industrial automation, developing IoT applications, securing infrastructure, or integrating AI with hardware, Cyreal provides the complete toolkit.

### **🔍 Serial Port Management**
- **Automatic port detection** - Discover available serial ports instantly
- **Universal protocol support** - RS-232, RS-485, USB Serial, TTL
- **Cross-platform compatibility** - Works on Windows, Linux, macOS
- **Real-time monitoring** - Track port status and connectivity

### **🔌 Universal Serial Communication**
- **Cross-platform support** - Windows, Linux, macOS
- **All protocols** - RS-232, RS-485, USB Serial, TTL, Modbus, CAN
- **Industrial ready** - Multi-drop bus, GPIO control, precise timing
- **Developer friendly** - Simple API, extensive documentation

### **🤖 AI-Native Integration**
- **Agent-to-Agent (A2A) Protocol** - Secure agent communication with RFC-1918 enforcement
- **Cybernetic governance** - Self-monitoring, self-healing, adaptive behavior
- **Agent Card authentication** - Token-based security for production environments
- **Natural language control** - "Read temperature from sensor on port COM3"

### **🛡️ Security & Compliance**
- **USB threat detection** - Identify unauthorized devices instantly
- **Policy enforcement** - Automated compliance checking
- **Audit trails** - Complete device connection history
- **Enterprise ready** - SIEM integration, MDM support

---

## 🌟 **Key Features**

| **Serial Management** | **Communication** | **AI Integration** | **Security** |
|---------------------|-------------------------|-------------------|--------------|
| ✅ Port discovery | ✅ Cross-platform | ✅ A2A protocol | ✅ RFC-1918 security |
| ✅ Multi-protocol support | ✅ All serial protocols | ✅ Agent Cards | ✅ Token authentication |
| ✅ Real-time monitoring | ✅ Industrial protocols | ✅ Natural language | ✅ Audit logging |
| ✅ Platform optimization | ✅ GPIO control | ✅ Adaptive behavior | ✅ Input validation |

---

## 🚀 **Quick Start**

### **Installation**

```bash
# Development installation (from source)
git clone https://github.com/macawi-ai/cyreal.git
cd cyreal
npm install
npm run build

# Install individual packages
npm install -g @cyreal/core @cyreal/a2a @cyreal/tester

# Or install all packages from the monorepo
npm run bootstrap
npm run build
```

### **Basic Usage**

```bash
# Quick system overview
cyreal-test

# Test platform capabilities
cyreal-test platform

# Test network connectivity
cyreal-test network

# Test serial port functionality
cyreal-test serial

# Start A2A server
cyreal-a2a start --host 192.168.1.100 --port 3500
```

---

## 📊 **Real-World Examples**

### **Example 1: Serial Port Discovery**
```bash
$ cyreal-test serial --list

🔍 Available Serial Ports:
┌─────────────────────────────────────────────────────┐
│ 🔌 /dev/ttyUSB0                                     │
│ 🔗 FTDI USB Serial Device                          │
│ ⚙️  Ready for communication                        │
│ 🔧 Supports: 9600-921600 baud                      │
└─────────────────────────────────────────────────────┘

💡 Perfect for:
   - Arduino and ESP32 development
   - Industrial sensor communication
   - Protocol debugging and testing
```

### **Example 2: AI Hardware Control**
```javascript
// A2A agent integration example
const cyreal = new CyrealA2A();

// Secure agent communication with RFC-1918 enforcement
await cyreal.connect({
  endpoint: "https://192.168.1.100:8443",
  agentCard: {
    id: "temp-sensor-agent",
    capabilities: ["modbus-read", "temperature-monitoring"]
  }
});

// Natural language hardware control
await cyreal.execute({
  command: "Read temperature from Modbus sensor",
  port: "/dev/ttyUSB0",
  address: 0x01
});

// Response: "Temperature: 23.5°C"
```

### **Example 3: Platform Testing**
```bash
$ cyreal-test platform

🛡️ Platform Test Results:
✅ Linux x64 - Optimal configuration
✅ systemd service manager - Ready for deployment
✅ Serial ports accessible - Permissions configured
✅ GPIO capabilities - Available for RS-485 control
```

### **Example 4: Industrial Automation**
```bash
# Start A2A server with industrial settings
cyreal-a2a start --host 192.168.1.100 --port 3500 --verbose

# Test industrial platform capabilities
cyreal-test platform --industrial --verbose

# Test serial port with RS-485 support
cyreal-test serial --test /dev/ttyUSB0 --baud 9600 --rs485
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
│   ├── cyreal-core/        # Types, interfaces, core utilities
│   ├── cyreald/           # Universal service with cross-platform support
│   ├── cyreal-tester/     # CLI testing and platform validation
│   └── cyreal-a2a/        # A2A protocol server with RFC-1918 security
├── docs/                  # Comprehensive documentation
├── examples/              # Real-world usage examples
└── service/               # Cross-platform service management
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
- Secure service deployment
- Access control management
- Audit trail monitoring
- Compliance verification

### **🤖 AI Researchers**
- Secure agent-to-agent communication
- Hardware-AI integration with RFC-1918 security
- Robotic control systems
- Physical world interaction with token authentication

### **🏢 Enterprise IT**
- Service management
- Cross-platform deployment
- Security compliance
- Infrastructure monitoring

---

## 🌍 **Community & Ecosystem**

### **📊 Open Standards**
- **Universal protocols** - RS-232, RS-485, Modbus, CAN support
- **Cross-platform compatibility** - Linux, macOS, Windows
- **Industry standards** - IEEE, MODBUS, CAN specifications
- **Open source** - Transparent implementation

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
- **[AI Integration](docs/ai-integration.md)** - A2A protocol and agent features
- **[Security Guide](docs/security.md)** - Threat detection and policies
- **[API Reference](docs/api.md)** - Complete API documentation
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

---

## 🚀 **Getting Started**

### **For Developers**
```bash
# Platform capabilities test
cyreal-test platform

# Serial port testing
cyreal-test serial --list

# Network connectivity test
cyreal-test network

# Start A2A server
cyreal-a2a start --host 192.168.1.100 --port 3500
```

### **For Security Teams**
```bash
# Platform security assessment
cyreal-test platform --verbose

# A2A server information
cyreal-a2a info

# Network security validation
cyreal-test network --host 127.0.0.1 --port 3500
```

### **For Industrial Users**
```bash
# Industrial system monitoring
cyreal-test platform --industrial --detailed

# Health assessment  
cyreal-test health --format json

# Comprehensive system testing
cyreal-test all --industrial --verbose
```

### **Output Format Options**
```bash
# Standard format (default)
cyreal-test platform

# Detailed technical output
cyreal-test platform --detailed

# Industrial/enterprise format (professional, no emojis)
cyreal-test platform --industrial

# Combine options for maximum detail
cyreal-test platform --industrial --detailed --verbose
```

---

## 🎯 **Why Choose Cyreal?**

### **🌟 Unique Advantages**
- **Universal service architecture** - works identically across all platforms
- **Enterprise-grade security** - secure by design with professional deployment
- **Cross-platform** true support (Linux, macOS, Windows)
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
- **🔧 Code** - Features, bug fixes, optimizations
- **📚 Documentation** - Guides, tutorials, translations
- **🧪 Testing** - Try new features, report issues
- **💡 Ideas** - Suggest features, use cases
- **🌐 Platform Support** - Help with additional OS support

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