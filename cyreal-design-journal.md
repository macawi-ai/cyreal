# Cyreal Design Journal
*Universal Cybernetic Service for AI Systems*

## Project Overview
Cyreal provides cross-platform hardware integration for AI systems via Agent-to-Agent (A2A) protocol with enterprise-grade security. The system consists of:
- **cyreal-core**: Universal service with cross-platform support (Linux, macOS, Windows)
- **A2A Server**: Secure agent communication with RFC-1918 enforcement and Agent Card authentication
- **Cybernetic Governors**: Self-monitoring and adaptive control systems
- **Universal Service Management**: Automated installation and management across platforms

## Design Decisions Log

### 1. Authentication Model ✅
**Decision**: Mutual token-based authentication with revocation
- Token pairs: `cyreal_token` + `a2a_token` with HMAC-SHA256 cryptographic security
- Agent Card authentication with UUIDv4 identifiers and capability declarations
- RFC-1918 enforcement preventing public internet exposure
- Local revocation via CLI: `cyreal-a2a revoke --token <a2a_token>`
- Optional time-based expiration (default: non-expiring)
- Bilateral trust control without certificate complexity

### 2. Connection Architecture ✅
**Decision**: One A2A server handles multiple agent connections with cybernetic coordination
- Single A2A instance manages 1-to-many agent connections
- Multi-agent orchestration with PSRLV governance patterns
- Service discovery and capability-based routing
- User-friendly port aliases (e.g., `cyreal_port_1`)
- Unified tool interface for AI with clear port separation
- Central Port Manager Governor for connection tracking

### 3. Buffering Strategy ✅
**Decision**: Adaptive three-mode buffering system
- **Line-Oriented**: Buffer until newline (interactive devices)
- **Stream Mode**: Small ring buffer with flow control (binary transfers)
- **Raw Mode**: Zero-copy passthrough (firmware programming)
- Buffer Mode Governor automatically switches based on data patterns

### 4. Protocol Framing ✅
**Decision**: MessagePack-RPC with Protocol Engine abstraction
- Start with MessagePack-RPC for efficiency and UDP compatibility
- Protocol Engine abstraction allows switching to Custom Binary if needed
- Protocol Performance Governor monitors and recommends optimizations
- Future-compatible with DNS tunneling requirements

### 5. Discovery Mechanism ✅
**Decision**: Manual configuration with optional secure discovery
- Default: Manual endpoint configuration (security-first)
- Optional: mDNS with cryptographic validation for trusted networks
- Discovery Security Governor monitors for reconnaissance attempts
- Prevents Shodan visibility while enabling convenience where appropriate

### 6. Health Monitoring ✅
**Decision**: Comprehensive industrial-grade monitoring stack
- **Physical Layer**: Signal quality, electrical parameters, timing
- **Protocol Layer**: Frame integrity, flow control, collision detection
- **System Layer**: Resource utilization, network health, security events
- **VSM Integration**: Meta-system reporting for higher-level decision making
- Recursive monitoring architecture following VSM levels

### 7. Capability Advertisement ✅
**Decision**: Dynamic capability discovery system
- Each port advertises available metrics (Universal/Standard/Advanced/Protocol-Specific)
- Capability Governor probes hardware features at startup
- Graceful degradation when advanced metrics unavailable
- Prevents environmental variety explosion while maintaining broad monitoring

### 8. Self-Healing Design ✅
**Decision**: Automatic recovery with second-order transparency
- **Recovery Actions**: Port reset, permission fixes, buffer flush, protocol renegotiation
- **Second-Order Reporting**: System reports on its own healing process
- **Recovery Journaling**: All healing attempts logged with outcomes
- **Meta-Recovery**: System learns which recovery methods work for which failures

## Key Architectural Principles

### Second-Order Cybernetics
We've naturally evolved into second-order cybernetics - cyreal not only provides serial connectivity but **knows about its own serial connectivity**. This creates:
- Self-awareness of capabilities and limitations
- Meta-monitoring of governor effectiveness
- Adaptive learning about learning patterns
- Recursive observation through VSM levels

### Industrial Status Indicators
5-color industrial status scheme for cyreal port connections:
- 🟢 **GREEN**: Operational - data flowing normally
- 🟡 **YELLOW**: Warning - performance degradation detected
- 🔴 **RED**: Error - connection lost, critical issues
- 🔵 **BLUE**: Standby - configured but not actively transmitting
- ⚪ **WHITE**: Maintenance - diagnostic/configuration mode

### Cybernetic Governors Pattern
All major subsystems implement Probe-Sense-Respond-Learn-Validate cycles:
- **Token Health Monitor**: Authentication and security
- **Buffer Mode Governor**: Adaptive buffering strategy
- **Protocol Performance Governor**: Communication optimization
- **Discovery Security Governor**: Network exposure control
- **Health Monitoring Governor**: System wellness tracking
- **Capability Governor**: Feature discovery and management
- **Recovery Actions Governor**: Self-healing operations

### 9. Learning Patterns Design ✅
**Decision**: Intelligent metadata collection for VSM integration
- **Pattern Recognition**: Track device behavior patterns as optional feature
- **Kafka Integration**: Stream useful metadata to upper VSM levels via Apache Kafka
- **Intelligent Sampling**: Avoid data torrenting through smart aggregation
- **Fault Prediction**: Focus on actionable insights for predictive maintenance

**Best Practices for VSM Metadata**:
- **Event-Driven**: Only send data when significant changes occur
- **Aggregated Metrics**: Send summaries, not raw telemetry streams
- **Threshold-Based**: Trigger alerts when patterns deviate from baseline
- **Contextual**: Include device type, environment, and usage patterns
- **Actionable**: Focus on data that enables upper systems to make decisions

**Multi-Protocol Event Streaming**:
- **Apache Kafka**: High-throughput streaming for cloud-native architectures
- **MQTT v5**: Lightweight pub/sub for IoT/edge environments
- **Syslog (RFC 5424)**: Traditional IT operations integration
- **InfluxDB Line Protocol**: Time-series database direct ingestion
- **OpenTelemetry**: Modern observability ecosystem compatibility
- **Webhook/HTTP**: REST API integration for custom endpoints
- **File-based**: JSON/CSV/Parquet for Databricks Delta Lake ingestion

### 10. Port Access Control Security Model ✅
**Decision**: Tiered security with device change detection and second-order visibility
- **Security Levels**: Paranoid/Balanced/Permissive/Debug with user choice
- **Device Fingerprinting**: Track vendor ID, product ID, serial number characteristics
- **Change Detection**: Alert on device swaps with threat assessment
- **Second-Order Security**: System reports on its own security state changes
- **Dashboard Integration**: Real-time security indicators and approval workflows
- **Threat Scenarios**: Protects against cable swapping attacks and operational mistakes

### 11. Rate Limiting and Abuse Prevention ✅
**Decision**: Tiered adaptive rate limiting with cybernetic threat protection
- **Security Levels**: Paranoid/Balanced/Permissive/Debug matching port security model
- **Balanced Default**: Adaptive rate limiting that learns device capabilities
- **Threat Protection**: DoS/DDoS protection for both target devices and cyreald service
- **Device-Aware**: Different limits for bootloaders, configuration interfaces, data streams
- **Override Capabilities**: Legitimate high-throughput operations (firmware uploads) supported
- **Rate Limiting Governor**: Probe-Sense-Respond-Learn-Validate cycle for optimal thresholds

### 12. UDP Session Management Strategy ✅
**Decision**: Adaptive session awareness with cybernetic mode switching
- **Default**: Hybrid Adaptive Mode - automatically chooses optimal session strategy
- **Session Options**: Stateless/Heartbeat/Sequence Number/Hybrid modes
- **Session State Governor**: Monitors network conditions and operation criticality
- **Automatic Upgrade**: Switches from stateless to reliable modes when needed
- **Network Profiling**: Learns reliability characteristics of different network paths
- **Just-Enough Complexity**: Cybernetic principle of minimal complexity for current situation

### 13. Audit Logging and Compliance Requirements ✅
**Decision**: Cisco-style logging levels with VSM-delegated threat detection
- **Compliance Focus**: Detailed logging for device configuration and security assessment
- **Cisco-Style Levels**: Emergency/Alert/Critical/Error/Warning/Notice/Info/Debug
- **VSM Integration**: Provide transparency data to upper layers for threat detection
- **SIEM Optional**: Available but not default - enterprise choice
- **Privacy Protection**: TLS 1.3 encryption for all network communications
- **Format Support**: Multiple transparency formats for different supervision systems

**Encryption Options**:
- **TLS 1.3**: Default for TCP mode - firewall-friendly, standard, high performance
- **DTLS 1.3**: UDP mode encryption - maintains session flexibility
- **WireGuard**: Optional VPN-style encryption for high-security environments
- **Standard Implementation**: OpenSSL/LibreSSL for broad Unix compatibility

### 14. UDP Packet Loss Handling ✅
**Decision**: Selective reliability layer - "TCP over UDP" when needed
- **Default**: Error correction enabled with automatic detection
- **Adaptive Reliability**: System detects when error correction can be disabled
- **Frame Relay Philosophy**: Let upper layers handle reliability when appropriate
- **Selective ARQ**: Only retransmit critical packets (commands, not all data)
- **Cybernetic Approach**: Learn which serial protocols need reliability vs raw speed

**Reliability Modes**:
- **Full Reliability**: TCP-like guarantees for critical operations
- **Selective Reliability**: Commands reliable, data best-effort
- **Best Effort**: Raw UDP for applications with own error handling
- **Auto-Detect**: Governor determines optimal mode per connection

**Event Visibility for Reliability Issues**:
- **Connection Quality Events**: Real-time reporting of mode changes
- **Performance Degradation Alerts**: When reliability drops below thresholds
- **Mode Switch Notifications**: Transparency when governor changes strategies
- **ATM-Style Metrics**: Effective bit rate, cell loss ratio, jitter tracking
- **VSM Feedback Loop**: Upper systems can request mode changes via control channel

### 15. RS-485 Support Addition ✅
**Decision**: Include RS-485 support in v1.0 for industrial ecosystems
- **Multi-drop Bus**: Support up to 32 devices per bus (256 with repeaters)
- **Half-duplex Operation**: GPIO-based TX/RX switching control
- **Bus Arbitration**: Cybernetic governor for collision avoidance
- **Address Management**: Dynamic device discovery and addressing
- **DIN Rail Ready**: Perfect for industrial automation scenarios
- **Bus Monitor Governor**: Track all devices, detect collisions, learn timing patterns

**RS-485 Specific Features**:
- GPIO pin control for DE/RE (Data Enable/Receive Enable)
- Configurable bus termination and biasing
- Automatic topology discovery
- Multi-master collision detection and recovery
- Industrial protocol support ready (Modbus RTU future expansion)

### 16. Language Selection ✅
**Decision**: TypeScript/Node.js for v1.0 implementation
- **Primary Choice**: TypeScript for both MCP server and cyreald
- **Rationale**: MCP ecosystem compatibility, rapid iteration, proven serial libraries
- **Future Evolution Path**: 
  - Learn from v1.0 stress patterns via VSM monitoring
  - Consider Rust for cyreald if real-time performance needed
  - Consider Go for MCP server if high concurrency stress observed
  - Let Rust/Go MCP ecosystems mature while we learn

**Implementation Benefits**:
- Leverage existing `serialport` library excellence
- Native MCP ecosystem integration
- Event-driven architecture perfect for governors
- GPIO control via native bindings for RS-485
- Single language reduces context switching

**Migration Strategy**:
- TypeScript interfaces allow future language swaps
- Protocol Engine abstraction enables gradual migration
- VSM learning data guides optimization priorities

### 17. High-Level VSM Architecture ✅
**Decision**: Recursive 5-level VSM with cybernetic governors
- **System 1**: Operational governors for direct serial control
- **System 2**: Coordination layer preventing conflicts
- **System 3**: Management layer for resource optimization
- **System 4**: Intelligence layer for prediction and learning
- **System 5**: Meta-system for evolution and external VSM integration
- **Governor Domains**: Security, Communication, Health, Serial Port

### 18. Governor Interactions and Cognitive Walkthroughs ✅
**Validated Scenarios**:
1. **Log Message Flow**: Smooth routine operation through all VSM levels
2. **Firmware Upload**: Complex coordination with heightened security
- Each level maintains appropriate "awareness" and autonomy
- Feedback loops enable learning and adaptation
- System exhibits emergent intelligence through governor coordination

### 19. Initial Implementation ✅
**Completed**: Core foundation with platform-aware cybernetic governance
- **Project Structure**: Lerna monorepo with three packages (core, cyreald, mcp)
- **Platform Adapter**: Auto-detects BeagleBone AI-64, Banana Pi BPI-M7, Raspberry Pi 5
- **Base Governor**: Implements full PSRLV cycle with platform awareness
- **Serial Port Controller**: System 1 governor with hardware-specific optimizations
- **CLI Interface**: Complete daemon with testing, configuration, and monitoring

**Platform-Specific Features**:
- **BeagleBone AI-64**: PRU timing, Mikroe Click support, precision RS-485
- **Banana Pi BPI-M7**: 6 TOPS NPU integration, high-speed serial (6Mbps)
- **Raspberry Pi 5**: RP1 chip optimization, improved GPIO (gpiochip4)

### 20. Universal Service Architecture ✅
**Decision**: Cross-platform service management with security hardening
- **Objective**: Move from Linux-only daemon to universal service supporting Windows, macOS, and Linux
- **Security Priority**: Address command injection vulnerabilities discovered in Windows implementation
- **Architecture**: Platform abstraction layer with service manager detection

**Implementation**:
- **PlatformManager**: Detects and abstracts systemd, launchd, SCM, and SysVinit
- **UniversalInstaller**: Smart OS detection with platform-specific configurations
- **SecureCommandExecutor**: Eliminates command injection via input validation and parameterized execution
- **Service Management CLI**: Unified commands across all platforms (`cyreal-core service --install`)

**Security Hardening**:
- **Input Validation**: Service names, paths, descriptions validated against injection patterns
- **Command Parameterization**: Arguments passed as arrays, never string concatenation
- **Process Isolation**: Uses `spawn()` with `shell: false` instead of vulnerable `exec()`
- **Privilege Control**: Command whitelisting for elevated operations
- **Platform-Specific Security**: systemd hardening, launchd permissions, Windows SYSTEM account

**Service Manager Support**:
- **Linux systemd**: `/etc/systemd/system/` with security restrictions (NoNewPrivileges, ProtectSystem)
- **Linux SysVinit**: `/etc/init.d/` scripts for legacy systems
- **macOS launchd**: `/Library/LaunchDaemons/` with proper ownership and permissions
- **Windows SCM**: Service registry with automatic recovery and event log integration

**Naming Convention Evolution**:
- **Old**: `cyreald` (daemon-specific, Linux-centric)
- **New**: `cyreal-core` (universal service, platform-agnostic)
- **Rationale**: Modern service terminology, cross-platform consistency, enterprise-ready naming

### 21. A2A Protocol Implementation ✅
**Decision**: Implement Google's Agent-to-Agent protocol with enhanced security for production environments
- **Objective**: Enable secure agent communication with RFC-1918 enforcement and Agent Card authentication
- **Security Priority**: Restrict agent communication to private networks to prevent internet exposure
- **Authentication Framework**: Comprehensive Agent Cards with capability-based access control

**Implementation**:
- **RFC-1918 Validator**: Hard enforcement of private network addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- **Agent Card System**: Structured authentication with ID, capabilities, endpoints, and security metadata
- **Service Discovery**: Secure agent discovery within private networks with timeout management
- **Input Validation Framework**: Comprehensive protection against injection attacks and malformed requests

**Security Architecture**:
- **Network Isolation**: Prevents exposure to public internet and eliminates Shodan visibility
- **Capability-Based Access**: Agents declare specific capabilities (modbus-rtu, gpio-control, etc.)
- **Token Management**: Configurable token lifecycle with automatic expiration and revocation
- **CORS and Rate Limiting**: Enterprise-grade traffic control and abuse prevention

**Cybernetic Integration**:
- **A2A Governor**: Implements PSRLV pattern for agent health monitoring and optimization
- **Agent Registry**: Dynamic management of connected agents with heartbeat monitoring
- **Load Balancing**: Intelligent distribution of requests across agent instances
- **VSM Integration**: Agent ecosystem coordination within 5-level cybernetic architecture

## Implementation Plan

### Phase 1: Core Foundation ✅
- [x] Create TypeScript project structure
- [x] Implement basic governor interfaces
- [x] Build Protocol Engine abstraction
- [x] Create cyreald daemon skeleton
- [x] Platform detection and adaptation

### Phase 2: A2A Integration ✅
- [x] Implement A2A server with RFC-1918 enforcement
- [x] Create Agent Card authentication system
- [x] Build secure port management system
- [x] Establish cyreald-A2A communication with input validation

### Phase 3: Governor Implementation
- [ ] Implement System 1 operational governors
- [ ] Build System 2 coordination layer
- [ ] Create System 3 management governors
- [ ] Add System 4 learning capabilities

### Phase 4: Advanced Features
- [ ] RS-485 support with GPIO control
- [ ] Multi-protocol event streaming
- [ ] VSM integration APIs
- [ ] System 5 meta-governance

## Future Enhancements Backlog ✨

### **P0: Auto-Configuration System (Next Major Feature)**
**Vision**: Zero-config serial port setup for any hardware
- **Components**: OS detector, hardware profiler, device classifier, config generator
- **Cybernetic Angle**: Self-configuring system that learns optimal setups autonomously
- **Value**: Eliminates manual configuration complexity for users
- **Effort**: ~3-4 weeks development
- **Dependencies**: Stable platform adapter, robust governor framework
- **Structure**: 
  ```
  cyreal-configurator/
  ├── detectors/     # OS/hardware/serial detection
  ├── classifiers/   # Device identification and protocol guessing  
  └── configurators/ # Automatic governor instantiation
  ```

### **P1: Network Bridge Layer**
**Vision**: Transparent network-to-serial bridging with enterprise security
- **Components**: TCP/UDP bridge, TLS/DTLS security, DNS tunneling
- **Dependencies**: Protocol engine maturity, security framework completion

### **P2: Industrial Protocol Suite**
**Vision**: Native support for Modbus RTU, CAN Bus, LoRaWAN
- **Components**: Protocol parsers, industrial governors, edge computing integration
- **Target**: Full DIN rail ecosystem compatibility

### **Repository Evolution Strategy**
- **🔒 Current (Private Master)**: Development playground, full design process, notes
- **🧪 Future Beta Repo**: Clean packages for independent MCP/cyreal installation
- **🚀 Future Production Repo**: Stable releases for general use

*See `cyreal-roadmap.md` for complete backlog and strategic planning*

---
*Generated during cybernetic collaboration session 2025-07-07*