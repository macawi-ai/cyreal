# Cyreal Tester

Command-line testing utility for Cyreal cybernetic serial port infrastructure.

## Overview

Cyreal Tester is an independent testing tool that validates Cyreal daemon functionality and infrastructure health. It supports multiple output formats (text, JSON, YAML) and can be invoked by upper-level systems that cannot use MCP directly.

## Installation

### Standalone Installation
```bash
npm install -g @cyreal/tester
```

### As Part of Cyreal Suite
```bash
npm install @cyreal/tester
```

## Usage

### Basic Commands

```bash
# Test platform detection and capabilities
cyreal-test platform --virtualization --gpio

# Test network connectivity to cyreald
cyreal-test network --host localhost --port 3500 --all

# Discover and test serial ports
cyreal-test serial --list --rs485

# Validate configuration
cyreal-test config --validate --config /path/to/cyreal.yaml

# Run performance benchmarks
cyreal-test benchmark --duration 30 --concurrent 5

# Get daemon status
cyreal-test status --host localhost --port 3500

# Comprehensive health check
cyreal-test health

# Run all tests
cyreal-test all
```

### Output Formats

```bash
# Text output (default)
cyreal-test platform

# JSON output for programmatic consumption
cyreal-test platform --format json

# YAML output
cyreal-test platform --format yaml

# Quiet mode for scripts
cyreal-test platform --quiet --format json

# Verbose output with detailed information
cyreal-test platform --verbose
```

### Advanced Options

```bash
# Custom timeout
cyreal-test network --timeout 10000

# Disable colors
cyreal-test platform --no-color

# Test specific port
cyreal-test serial --test /dev/ttyUSB0 --baud 115200 --rs485

# Generate configuration templates
cyreal-test config --template production

# Health check showing only critical issues
cyreal-test health --critical-only
```

## Test Categories

### Platform Tests
- Hardware platform detection (BeagleBone AI-64, Raspberry Pi 5, etc.)
- Architecture validation
- GPIO capabilities assessment
- Virtualization detection (VMware, VirtualBox, Docker, WSL, etc.)
- Timing precision analysis

### Network Tests
- TCP connectivity to Cybersyn tribute port 3500
- UDP messaging capabilities
- WebSocket real-time communication
- Daemon command interface validation
- Latency and performance measurements

### Serial Port Tests
- Port discovery and enumeration
- Accessibility and permissions testing
- Configuration validation (baud rate, data bits, etc.)
- RS-485 capabilities assessment
- Cross-platform compatibility checks

### Configuration Tests
- YAML syntax validation
- Schema compliance verification
- Path accessibility checks
- Template generation
- Security settings validation

### Performance Benchmarks
- Network throughput measurement
- Serial port performance testing
- Configuration loading speed
- Latency distribution analysis

### Health Checks
- System resource monitoring
- Node.js version compatibility
- Dependency availability
- Permission validation
- Port availability assessment

## Output Examples

### Text Format
```
🔬 Cyreal Test Results
═══════════════════════════════════════════════════════

📊 Summary:
   Total Tests: 8
   ✅ Passed: 7
   ⚠️  Warnings: 1
   ⏱️  Duration: 2340ms

📋 Detailed Results:
┌─────────────────────────┬────────┬──────────┬─────────────────────────┐
│ Test                    │ Status │ Duration │ Message                 │
├─────────────────────────┼────────┼──────────┼─────────────────────────┤
│ Platform Detection      │ ✅ PASS │ 245ms    │ BeagleBone AI-64        │
│ Architecture Check      │ ✅ PASS │ 12ms     │ ARM64 supported         │
│ GPIO Capabilities       │ ⚠️  WARN │ 156ms    │ Restricted access       │
│ Virtualization Detection│ ✅ PASS │ 890ms    │ Bare metal detected     │
└─────────────────────────┴────────┴──────────┴─────────────────────────┘
```

### JSON Format
```json
{
  "summary": {
    "total": 8,
    "passed": 7,
    "failed": 0,
    "warnings": 1,
    "skipped": 0,
    "duration": 2340,
    "success": true
  },
  "results": [
    {
      "name": "Platform Detection",
      "category": "test",
      "status": "pass",
      "success": true,
      "message": "BeagleBone AI-64 detected",
      "duration": 245,
      "timestamp": "2025-01-08T15:30:00.000Z",
      "details": {
        "platform": "BeagleBone AI-64",
        "architecture": "arm64",
        "specialFeatures": ["PRU", "AI_accelerator", "MikroE_Click"]
      }
    }
  ],
  "environment": {
    "platform": "linux",
    "arch": "arm64",
    "node": "v20.9.0",
    "timestamp": "2025-01-08T15:30:02.340Z"
  }
}
```

## Integration with Upper-Level Systems

### Shell Scripts
```bash
#!/bin/bash
# Check if Cyreal is healthy before starting application

if cyreal-test health --quiet --format json | jq -e '.summary.success'; then
    echo "Cyreal is healthy, starting application..."
    ./start-app.sh
else
    echo "Cyreal health check failed!"
    exit 1
fi
```

### Python Integration
```python
import subprocess
import json

def check_cyreal_status():
    result = subprocess.run([
        'cyreal-test', 'status', 
        '--format', 'json', '--quiet'
    ], capture_output=True, text=True)
    
    if result.returncode == 0:
        data = json.loads(result.stdout)
        return data['results'][0]['details']
    else:
        return None

status = check_cyreal_status()
if status and status['running']:
    print(f"Cyreal is running with {status['activePorts']} active ports")
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Test Cyreal Infrastructure
  run: |
    cyreal-test all --format json --quiet > test-results.json
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: cyreal-test-results
    path: test-results.json
```

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed or error occurred

## Configuration

The tester respects the same configuration hierarchy as Cyreal:
1. Command-line arguments (highest priority)
2. User configuration file
3. System configuration file
4. Built-in defaults (lowest priority)

## Contributing

This tool is part of the Cyreal project. For contributions, please see the main [Cyreal repository](https://github.com/cyreal-project/cyreal).

## License

MIT License - See LICENSE file in the main Cyreal repository.