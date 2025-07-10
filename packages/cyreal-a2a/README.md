# @cyreal/a2a - Agent-to-Agent Protocol Server

Enterprise-grade A2A protocol implementation for secure industrial agent communication with RFC-1918 enforcement and cybernetic governance.

## Overview

The Cyreal A2A package provides a complete Agent-to-Agent protocol server implementation designed for industrial control systems and secure multi-agent environments. It features cryptographic authentication, RFC-1918 network restrictions, and cybernetic governance integration.

## Key Features

- 🛡️ **RFC-1918 Security**: Hard restriction to private networks only
- 🔑 **Agent Card Authentication**: Cryptographic agent validation with UUIDv4 identifiers
- 🧠 **Cybernetic Governance**: PSRLV pattern implementation for agent coordination
- ⚡ **High Performance**: Sub-millisecond response times with rate limiting
- 🌐 **Standards Compliant**: JSON-RPC 2.0 over HTTPS transport
- 🔍 **Service Discovery**: Automatic agent capability discovery and routing

## Installation

### Development Installation (from source)
```bash
# Clone the repository
git clone https://github.com/macawi-ai/cyreal.git
cd cyreal
npm install
npm run build

# Make CLI available globally
cd packages/cyreal-a2a
npm link

# Verify installation
cyreal-a2a --version
```

### Published Package Installation (when available)
```bash
# Install globally for CLI usage
npm install -g @cyreal/a2a

# Install locally for programmatic usage
npm install @cyreal/a2a @cyreal/core
```

## Quick Start

### Starting the A2A Server

```bash
# Start on localhost (most secure)
cyreal-a2a start --host 127.0.0.1 --port 3500

# Start on private network
cyreal-a2a start --host 192.168.1.100 --port 3500

# With HTTPS (recommended for production)
cyreal-a2a start \
  --host 192.168.1.100 \
  --port 3500 \
  --cert ./certs/server.crt \
  --key ./certs/server.key
```

### RFC-1918 Validation

```bash
# Validate IP addresses
cyreal-a2a validate 192.168.1.100  # ✅ Valid private IP
cyreal-a2a validate 10.0.0.50      # ✅ Valid private IP
cyreal-a2a validate 8.8.8.8        # ❌ Public IP blocked

# Server information
cyreal-a2a info
```

## Configuration

### Configuration File
Create `cyreal-a2a-config.json`:

```json
{
  "server": {
    "host": "192.168.1.100",
    "port": 3500,
    "httpsOnly": true,
    "certPath": "./certs/server.crt",
    "keyPath": "./certs/server.key"
  },
  "agent": {
    "id": "cyreal-industrial-bridge",
    "name": "Cyreal Industrial A2A Bridge",
    "description": "Enterprise cybernetic serial port bridge",
    "version": "1.0.0"
  },
  "security": {
    "enforceRFC1918": true,
    "requireMutualAuth": true,
    "tokenExpiryMinutes": 60,
    "maxAgentsConnected": 100
  },
  "discovery": {
    "enabled": true,
    "broadcastInterval": 30000,
    "agentTimeout": 120000
  }
}
```

Start with configuration:
```bash
cyreal-a2a start --config ./cyreal-a2a-config.json
```

### Environment Variables
```bash
export CYREAL_A2A_HOST=192.168.1.100
export CYREAL_A2A_PORT=3500
export CYREAL_A2A_HTTPS_ONLY=true
export CYREAL_A2A_ENFORCE_RFC1918=true
```

## Agent Card System

### Agent Card Structure
```typescript
interface A2AAgentCard {
  agentId: string;           // UUIDv4 unique identifier
  name: string;              // Human-readable name
  description: string;       // Agent purpose
  version: string;           // Semantic version
  capabilities: A2ACapability[];
  endpoints: A2AEndpoint[];
  metadata?: Record<string, any>;
  lastSeen: Date;           // Timestamp for freshness validation
}
```

### Example Agent Card
```json
{
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Industrial Temperature Monitor",
  "description": "Multi-sensor temperature monitoring with alert coordination",
  "version": "2.1.0",
  "capabilities": [
    {
      "id": "temperature.read",
      "name": "Read Temperature",
      "description": "Read temperature from connected sensors",
      "category": "serial",
      "input": {
        "type": "object",
        "properties": {
          "sensorId": { "type": "string" },
          "unit": { "type": "string", "enum": ["celsius", "fahrenheit"] }
        },
        "required": ["sensorId"]
      },
      "output": {
        "type": "object",
        "properties": {
          "temperature": { "type": "number" },
          "unit": { "type": "string" },
          "timestamp": { "type": "string", "format": "date-time" },
          "status": { "type": "string", "enum": ["ok", "warning", "critical"] }
        }
      }
    },
    {
      "id": "temperature.monitor",
      "name": "Continuous Monitoring",
      "description": "Set up continuous temperature monitoring with alerts",
      "category": "monitoring"
    }
  ],
  "endpoints": [
    {
      "url": "https://192.168.1.101:3501/a2a",
      "protocol": "https",
      "methods": ["POST"],
      "authentication": "token"
    }
  ],
  "metadata": {
    "location": "Building A, Floor 2, HVAC Room",
    "maintainer": "facilities@company.com",
    "criticality": "high",
    "certifications": ["IEC61508", "ISO9001"]
  },
  "lastSeen": "2024-01-15T10:30:00.000Z"
}
```

## API Reference

### Agent Registration

```typescript
// Register agent with A2A server
const registrationRequest = {
  jsonrpc: "2.0",
  id: "reg-001",
  method: "agent.register",
  params: {
    agentCard: myAgentCard
  }
};

// Response includes authentication token
{
  "jsonrpc": "2.0",
  "id": "reg-001",
  "result": {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkEyQSJ9...",
    "expiresAt": "2024-01-15T11:30:00Z",
    "agentId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Agent Discovery

```typescript
// Discover agents by capability
const discoveryRequest = {
  jsonrpc: "2.0",
  id: "disc-001",
  method: "agent.discover",
  params: {
    capabilities: ["temperature.read"],
    metadata: {
      location: "Building A",
      criticality: "high"
    }
  }
};

// Response with matching agents
{
  "jsonrpc": "2.0",
  "id": "disc-001",
  "result": {
    "agents": [
      {
        "agentId": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Industrial Temperature Monitor",
        "capabilities": ["temperature.read", "temperature.monitor"],
        "endpoints": ["https://192.168.1.101:3501/a2a"],
        "metadata": { "location": "Building A, Floor 2" }
      }
    ],
    "totalFound": 1
  }
}
```

### Capability Invocation

```typescript
// Call agent capability
const capabilityRequest = {
  jsonrpc: "2.0",
  id: "temp-001",
  method: "temperature.read",
  params: {
    sensorId: "hvac-temp-01",
    unit: "celsius"
  }
};

// Capability response
{
  "jsonrpc": "2.0",
  "id": "temp-001",
  "result": {
    "temperature": 23.5,
    "unit": "celsius",
    "timestamp": "2024-01-15T10:30:15.000Z",
    "status": "ok",
    "sensorId": "hvac-temp-01",
    "metadata": {
      "accuracy": "±0.1°C",
      "responseTime": "150ms"
    }
  }
}
```

## Security Features

### RFC-1918 Enforcement

The A2A server enforces **HARD restrictions** preventing binding to public IP addresses:

```typescript
// This will succeed
cyreal-a2a start --host 192.168.1.100

// This will fail with security violation
cyreal-a2a start --host 8.8.8.8
// 🚨 SECURITY VIOLATION: Public IP binding blocked
```

**Protected Ranges:**
- `10.0.0.0/8` - Class A private networks
- `172.16.0.0/12` - Class B private networks  
- `192.168.0.0/16` - Class C private networks
- `127.0.0.0/8` - Localhost

### Authentication & Authorization

```typescript
// All requests require authentication
const authenticatedRequest = {
  // Standard HTTP headers
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkEyQSJ9...',
    'X-Agent-ID': '550e8400-e29b-41d4-a716-446655440000'
  }
};
```

### Input Validation

The server implements comprehensive input validation:

- **Message size limits**: 1MB maximum
- **String length limits**: 10,000 characters
- **Array size limits**: 1,000 elements
- **Method name validation**: Alphanumeric with dots and hyphens only
- **Parameter sanitization**: XSS and injection protection

### Rate Limiting

Default rate limits per IP address:
- **100 requests per minute**
- **Exponential backoff** for repeated violations
- **Automatic IP blocking** for abuse

## Cybernetic Governance

### A2A Governor

The A2A Governor implements the PSRLV (Probe, Sense, Respond, Learn, Validate) pattern:

```typescript
class A2AGovernor implements IGovernor {
  // Probe: Discover agent ecosystem state
  async probe(): Promise<ProbeResult> {
    const agents = await this.registry.getAgents();
    const capabilities = this.extractCapabilities(agents);
    return { state: { agents, capabilities }, timestamp: new Date() };
  }

  // Sense: Analyze performance patterns  
  sense(data: SensorData): Analysis {
    const patterns = this.identifyPatterns(data);
    const anomalies = this.detectAnomalies(data);
    return { patterns, anomalies, recommendations: [] };
  }

  // Respond: Take corrective actions
  async respond(analysis: Analysis): Promise<Action> {
    if (analysis.anomalies.length > 0) {
      return this.createAnomalyResponse(analysis.anomalies);
    }
    return this.createOptimizationAction(analysis);
  }

  // Learn: Adapt from outcomes
  learn(outcome: Outcome): void {
    this.updateLearningData(outcome);
    this.adaptStrategy(outcome);
  }

  // Validate: Ensure system health
  validate(): ValidationResult {
    const health = this.calculateSystemHealth();
    return { valid: health > 70, health, issues: [] };
  }
}
```

### Multi-Agent Coordination

```typescript
// Load balancing across agents
class A2ALoadBalancer {
  async getAgent(capability: string): Promise<A2AAgentCard> {
    const agents = await this.findAgentsWithCapability(capability);
    return this.selectOptimalAgent(agents);
  }

  private selectOptimalAgent(agents: A2AAgentCard[]): A2AAgentCard {
    // Consider health, load, response time, and reliability
    return agents.reduce((best, current) => 
      this.calculateScore(current) > this.calculateScore(best) ? current : best
    );
  }
}

// Circuit breaker for fault tolerance
class A2ACircuitBreaker {
  async callAgent(agentId: string, request: any): Promise<any> {
    if (this.isCircuitOpen(agentId)) {
      throw new Error(`Circuit breaker open for agent: ${agentId}`);
    }

    try {
      const response = await this.sendToAgent(agentId, request);
      this.recordSuccess(agentId);
      return response;
    } catch (error) {
      this.recordFailure(agentId);
      throw error;
    }
  }
}
```

## Industrial Use Cases

### Temperature Monitoring System

```typescript
class IndustrialTemperatureSystem {
  async setupMonitoring() {
    // Discover all temperature sensors
    const sensors = await this.discoverAgents('temperature.read');
    
    // Configure each sensor for continuous monitoring
    for (const sensor of sensors) {
      await this.setupSensorMonitoring(sensor);
    }
    
    console.log(`✅ Monitoring setup for ${sensors.length} temperature sensors`);
  }

  async setupSensorMonitoring(sensor: A2AAgentCard) {
    const request = {
      jsonrpc: "2.0",
      id: `monitor-${sensor.agentId}`,
      method: "temperature.monitor",
      params: {
        interval: 30000,      // 30 second intervals
        threshold: 40.0,      // Alert above 40°C
        callback: {
          method: "temperature.alert",
          endpoint: "https://192.168.1.50:3500/a2a"
        }
      }
    };

    await this.sendToAgent(sensor.agentId, request);
  }
}
```

### Motor Control Coordination

```typescript
class MotorControlSystem {
  async emergencyStop(zone: string) {
    // Find all motor controllers in the specified zone
    const motors = await this.discoverAgents('motor.control', { zone });
    
    // Send emergency stop commands simultaneously
    const stopCommands = motors.map(motor =>
      this.sendToAgent(motor.agentId, {
        jsonrpc: "2.0",
        id: `emergency-${motor.agentId}`,
        method: "motor.emergency_stop",
        params: { 
          reason: "safety_override",
          timestamp: new Date().toISOString()
        }
      })
    );

    const results = await Promise.allSettled(stopCommands);
    
    // Log any failures for safety audit
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`🚨 Failed to stop motor ${motors[index].agentId}:`, result.reason);
      }
    });

    return results;
  }
}
```

## Error Handling

### Standard Error Codes

```typescript
const A2A_ERROR_CODES = {
  // JSON-RPC 2.0 standard
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // A2A specific
  AUTHENTICATION_FAILED: -32401,
  AUTHORIZATION_FAILED: -32403,
  RATE_LIMIT_EXCEEDED: -32429,
  AGENT_NOT_FOUND: -32404,
  CAPABILITY_UNAVAILABLE: -32405,
  RFC1918_VIOLATION: -32406
} as const;
```

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "error": {
    "code": -32401,
    "message": "Authentication failed",
    "data": {
      "reason": "Invalid agent card signature",
      "agentId": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Performance & Monitoring

### Metrics Collection

```typescript
interface A2AMetrics {
  connectedAgents: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  authenticationFailures: number;
  rfc1918Violations: number;
}

// Access metrics
const metrics = await a2aServer.getMetrics();
console.log(`Connected agents: ${metrics.connectedAgents}`);
```

### Health Monitoring

```typescript
// Agent health check
const healthRequest = {
  jsonrpc: "2.0",
  id: "health-001",
  method: "agent.health",
  params: {}
};

// Health response
{
  "jsonrpc": "2.0",
  "id": "health-001",
  "result": {
    "status": "healthy",
    "uptime": 86400,
    "responseTime": 45,
    "capabilities": ["temperature.read", "temperature.monitor"],
    "load": 0.2,
    "lastError": null
  }
}
```

## Testing

### Unit Testing

```typescript
import { A2AServer, AgentRegistry, ServiceDiscovery } from '@cyreal/a2a';

describe('A2A Server', () => {
  let server: A2AServer;
  
  beforeEach(() => {
    const logger = createTestLogger();
    const registry = new AgentRegistry(logger);
    const discovery = new ServiceDiscovery(logger, registry);
    server = new A2AServer(logger, registry, discovery);
  });

  test('should reject public IP binding', async () => {
    const config = {
      server: { host: '8.8.8.8', port: 3500 },
      security: { enforceRFC1918: true }
    };

    await expect(server.start(config)).rejects.toThrow('RFC-1918 Security Violation');
  });

  test('should accept private IP binding', async () => {
    const config = {
      server: { host: '192.168.1.100', port: 3500 },
      security: { enforceRFC1918: true }
    };

    await expect(server.start(config)).resolves.not.toThrow();
  });
});
```

### Integration Testing

```bash
# Start test A2A server
cyreal-a2a start --host 127.0.0.1 --port 3500 &

# Run integration tests
npm test -- --grep "A2A Integration"

# Stop test server
pkill -f "cyreal-a2a"
```

## Troubleshooting

### Common Issues

**RFC-1918 Violation Error**
```
🚨 SECURITY VIOLATION: Attempted A2A service binding to public IP address
```
**Solution**: Use RFC-1918 private IP addresses only.

**Authentication Failed**
```json
{"error": {"code": -32401, "message": "Authentication failed"}}
```
**Solution**: Verify Agent Card format and token validity.

**Rate Limit Exceeded**
```json
{"error": {"code": -32429, "message": "Rate limit exceeded"}}
```
**Solution**: Reduce request frequency or implement backoff.

### Debug Mode

```bash
# Enable verbose logging
cyreal-a2a start --host 192.168.1.100 --verbose

# Check specific agent connectivity
curl -k https://192.168.1.101:3501/a2a \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"jsonrpc":"2.0","id":"test","method":"agent.health"}'
```

## Compliance

### Industrial Standards
- **IEC 62443**: Industrial cybersecurity compliance
- **NIST Cybersecurity Framework**: Core controls implementation
- **ISO 27001**: Information security management
- **IEC 61508**: Functional safety for industrial systems

### Security Certifications
- **Common Criteria**: Security evaluation criteria
- **FIPS 140-2**: Cryptographic module standards
- **SOC 2 Type II**: Security controls audit

## Support

- **Documentation**: [A2A Protocol Guide](../docs/A2A-PROTOCOL.md)
- **Security**: [Security Architecture](../docs/A2A-SECURITY.md)
- **Examples**: [Industrial Use Cases](../docs/A2A-INDUSTRIAL-EXAMPLES.md)
- **Issues**: [GitHub Issues](https://github.com/cyreal-project/cyreal/issues)
- **Discussions**: [Community Forum](https://github.com/cyreal-project/cyreal/discussions)

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

**Enterprise Support**: Contact enterprise@cyreal.io for commercial support, training, and consulting services.