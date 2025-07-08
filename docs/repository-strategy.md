# Cyreal Repository Strategy

## Three-Stage Repository Evolution

### 🔒 **Stage 1: Private Master Playground (Current)**
**Location**: `/home/cy/git/macawi-ai/cyreal` (this repository)

**Purpose**: 
- Complete design and development workspace
- Experimental features and research
- Full documentation of cybernetic design process
- Notes, ideas, and architectural decisions
- Platform-specific testing and validation

**Contents**:
- Complete design journal and architecture documentation
- Full source code with experimental features
- Platform-specific testing configurations
- Research notes and cybernetic insights
- Raw development logs and decision history

**Team Access**: Core development team only

---

### 🧪 **Stage 2: Beta Release Repository (Future)**
**Target Location**: `github.com/cyreal-project/cyreal-beta`

**Purpose**:
- Clean, production-ready packages
- Independent installation for MCP and cyreald
- Beta testing with select users
- Community feedback and validation
- Documentation for end users

**Package Structure**:
```
cyreal-beta/
├── packages/
│   ├── @cyreal/mcp-server/     # Independent MCP package
│   ├── @cyreal/cyreald/        # Independent daemon package  
│   └── @cyreal/core/           # Shared core types
├── docs/
│   ├── installation.md        # Platform-specific install guides
│   ├── configuration.md       # User configuration guide
│   └── troubleshooting.md     # Common issues and solutions
├── examples/
│   ├── beaglebone-rs485/      # BeagleBone AI-64 setup
│   ├── banana-pi-highspeed/   # Banana Pi BPI-M7 setup
│   └── raspberry-pi-basic/    # Raspberry Pi 5 setup
└── tests/
    └── integration/           # Hardware validation tests
```

**Beta Release Criteria**:
- [ ] Stable core governor implementation
- [ ] Successful testing on all three target platforms
- [ ] Complete installation and configuration documentation
- [ ] MCP integration fully functional
- [ ] Security model implemented and tested

---

### 🚀 **Stage 3: Production Repository (Future)**
**Target Location**: `github.com/cyreal-project/cyreal`

**Purpose**:
- Stable, production-ready releases
- Public community development
- Issue tracking and feature requests
- Official documentation and support
- Integration with package managers (npm, apt, etc.)

**Production Features**:
- Semantic versioning with stable releases
- Automated CI/CD pipeline
- Security vulnerability scanning
- Performance benchmarking
- Community contribution guidelines
- Official support channels

**Release Criteria**:
- [ ] Production-grade stability (>99% uptime)
- [ ] Comprehensive test suite with >90% coverage
- [ ] Security audit completion
- [ ] Performance validation across all platforms
- [ ] Community adoption and positive feedback

---

## Development Workflow

### Current Stage (Private Master)
```bash
# All development happens here
cd /home/cy/git/macawi-ai/cyreal
git add .
git commit -m "feat: implement auto-configurator prototype"
git push origin main
```

### Beta Release Preparation
```bash
# Clean and package for beta
./scripts/prepare-beta-release.sh
# Creates clean packages without development artifacts
# Generates user-friendly documentation
# Validates on target platforms
```

### Production Release
```bash
# Automated release pipeline
./scripts/create-production-release.sh v1.0.0
# Creates tagged release
# Publishes to npm registry
# Updates documentation sites
# Notifies community
```

---

## Content Migration Strategy

### What Stays in Private Master
- Raw design decisions and architecture evolution
- Experimental features and research code
- Internal development notes and insights
- Failed approaches and lessons learned
- Sensitive testing configurations

### What Goes to Beta
- Clean, documented source code
- User-focused documentation
- Platform-specific setup guides
- Working examples and tutorials
- Basic troubleshooting guides

### What Goes to Production
- Stable, tested release packages
- Comprehensive documentation
- Official API references
- Community guidelines
- Security and performance documentation

---

## Repository Synchronization

### Private → Beta
```bash
# Selective sync of stable features
./scripts/sync-to-beta.sh
# Copies stable packages
# Generates clean documentation
# Removes development artifacts
```

### Beta → Production
```bash
# Promotion after successful beta testing
./scripts/promote-to-production.sh
# Creates production release
# Updates version numbers
# Publishes packages
```

---

## Documentation Strategy

### Private Master Documentation
- **cyreal-design-journal.md**: Complete design evolution
- **cyreal-roadmap.md**: Strategic planning and backlog
- **cyreal-vsm-architecture.md**: Cybernetic architecture deep-dive
- **platform-specific testing notes**: Raw validation results

### Beta Documentation
- **README.md**: Quick start and overview
- **INSTALL.md**: Platform-specific installation
- **CONFIG.md**: Configuration and customization
- **EXAMPLES.md**: Working code examples

### Production Documentation
- **Official website**: User-friendly documentation
- **API Reference**: Complete technical reference
- **Tutorials**: Step-by-step guides
- **Community Hub**: Support and contribution info

---

This strategy ensures we maintain our cybernetic development process while creating clean, accessible packages for the broader community.