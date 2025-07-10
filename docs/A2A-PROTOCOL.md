# A2A Protocol Implementation Guide

## Overview

Cyreal implements the Agent-to-Agent (A2A) protocol for secure, standards-compliant communication between AI agents and industrial control systems. This guide covers the complete A2A implementation, from basic concepts to advanced multi-agent orchestration.

## A2A Protocol Fundamentals

### Protocol Stack
```
┌─────────────────────────────────────┐
│         Agent Applications          │
├─────────────────────────────────────┤
│           A2A Protocol              │
├─────────────────────────────────────┤
│         JSON-RPC 2.0                │
├─────────────────────────────────────┤
│           HTTPS/WSS                 │
├─────────────────────────────────────┤
│            TCP/IP                   │
└─────────────────────────────────────┘
```

### Core Components
- **Agent Cards**: Identity and capability declaration
- **JSON-RPC 2.0**: Message format and transport
- **HTTPS Transport**: Secure communication channel
- **Capability Discovery**: Dynamic agent ecosystem mapping
- **Token Authentication**: Cryptographic security

## Agent Cards

### Structure
```typescript
interface A2AAgentCard {
  agentId: string;           // UUIDv4 unique identifier
  name: string;              // Human-readable name
  description: string;       // Agent purpose description
  version: string;           // Semantic version (x.y.z)
  capabilities: A2ACapability[];
  endpoints: A2AEndpoint[];
  metadata?: Record<string, any>;
  lastSeen: Date;           // Timestamp for freshness
}
```

### Agent Card Example
```json
{
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Temperature Monitor Agent",
  "description": "Industrial temperature monitoring with alert coordination",
  "version": "1.2.3",
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
          "timestamp": { "type": "string" }
        }
      }
    }
  ],
  "endpoints": [
    {
      "url": "https://192.168.1.100:3500/a2a",
      "protocol": "https",
      "methods": ["POST"],
      "authentication": "token"
    }
  ],
  "metadata": {
    "location": "Building A, Floor 2",
    "maintainer": "ops-team@company.com",
    "criticality": "high"
  },
  "lastSeen": "2024-01-15T10:30:00Z"
}
```

## Capabilities System

### Capability Categories
```typescript
type CapabilityCategory = 
  | 'serial'      // Serial port operations
  | 'network'     // Network communications
  | 'governance'  // System monitoring and control
  | 'monitoring'  // Data collection and analysis
  | 'custom';     // Domain-specific capabilities
```

### Standard Capabilities

#### Serial Operations
```typescript
// Read from serial port
{
  "id": "serial.read",
  "name": "Read Serial Data",
  "category": "serial",
  "input": {
    "type": "object",
    "properties": {
      "portId": { "type": "string" },
      "length": { "type": "number", "minimum": 1 }
    },
    "required": ["portId"]
  }
}

// Write to serial port
{
  "id": "serial.write",
  "name": "Write Serial Data",
  "category": "serial",
  "input": {
    "type": "object",
    "properties": {
      "portId": { "type": "string" },
      "data": { "type": "string" }
    },
    "required": ["portId", "data"]
  }
}
```

#### Governance Operations
```typescript
// System health check
{
  "id": "governance.health",
  "name": "System Health Check",
  "category": "governance",
  "output": {
    "type": "object",
    "properties": {
      "status": { "type": "string", "enum": ["healthy", "warning", "error"] },
      "metrics": { "type": "object" },
      "recommendations": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

## JSON-RPC 2.0 Messages

### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "method": "serial.read",
  "params": {
    "portId": "/dev/ttyUSB0",
    "length": 100
  }
}
```

### Response Format
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "result": {
    "data": "temperature:23.5C",
    "timestamp": "2024-01-15T10:30:15Z",
    "bytesRead": 15
  }
}
```

### Error Format
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "portId",
      "reason": "Port not found"
    }
  }
}
```

### Standard Error Codes
```typescript
const A2A_ERROR_CODES = {
  // JSON-RPC 2.0 standard codes
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // A2A specific codes
  AUTHENTICATION_FAILED: -32401,
  AUTHORIZATION_FAILED: -32403,
  RATE_LIMIT_EXCEEDED: -32429,
  AGENT_NOT_FOUND: -32404,
  CAPABILITY_UNAVAILABLE: -32405
} as const;
```

## Authentication Flow

### Agent Registration
```typescript
// 1. Agent generates Agent Card
const agentCard: A2AAgentCard = {
  agentId: crypto.randomUUID(),
  name: "My Industrial Agent",
  // ... other fields
};

// 2. Register with A2A server
const registrationRequest = {
  jsonrpc: "2.0",
  id: "reg-001",
  method: "agent.register",
  params: {
    agentCard: agentCard
  }
};

// 3. Receive authentication token
const registrationResponse = {
  jsonrpc: "2.0",
  id: "reg-001",
  result: {
    success: true,
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkEyQSJ9...",
    expiresAt: "2024-01-15T11:30:00Z"
  }
};
```

### Authenticated Requests
```http
POST /a2a HTTP/1.1
Host: 192.168.1.100:3500
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkEyQSJ9...
X-Agent-ID: 550e8400-e29b-41d4-a716-446655440000

{
  "jsonrpc": "2.0",
  "id": "req-456",
  "method": "serial.read",
  "params": {
    "portId": "/dev/ttyUSB0"
  }
}
```

## Service Discovery

### Agent Discovery
```typescript
// Discover available agents
const discoveryRequest = {
  jsonrpc: "2.0",
  id: "disc-001",
  method: "agent.discover",
  params: {
    capabilities: ["serial.read", "temperature.monitor"],
    location: "Building A"
  }
};

const discoveryResponse = {
  jsonrpc: "2.0",
  id: "disc-001",
  result: {
    agents: [
      {
        agentId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Temperature Monitor Agent",
        capabilities: ["serial.read", "temperature.monitor"],
        endpoints: ["https://192.168.1.100:3500/a2a"],
        metadata: { location: "Building A, Floor 2" }
      }
    ]
  }
};
```

### Capability Matching
```typescript
// Find agents with specific capabilities
async function findAgentsWithCapability(capability: string): Promise<A2AAgentCard[]> {
  const request = {
    jsonrpc: "2.0",
    id: generateId(),
    method: "agent.discover",
    params: {
      capabilities: [capability]
    }
  };
  
  const response = await sendA2ARequest(request);
  return response.result.agents;
}
```

## Multi-Agent Communication Patterns

### Request-Response Pattern
```typescript
// Direct agent-to-agent communication
async function readTemperature(targetAgentId: string, sensorId: string): Promise<number> {
  const request = {
    jsonrpc: "2.0",
    id: generateId(),
    method: "temperature.read",
    params: { sensorId }
  };
  
  const response = await sendToAgent(targetAgentId, request);
  return response.result.temperature;
}
```

### Publish-Subscribe Pattern
```typescript
// Temperature monitoring with alerts
class TemperatureMonitor {
  private subscribers: Set<string> = new Set();
  
  async subscribeToAlerts(agentId: string) {
    this.subscribers.add(agentId);
  }
  
  async publishAlert(temperature: number, threshold: number) {
    const alert = {
      jsonrpc: "2.0",
      method: "temperature.alert",
      params: {
        temperature,
        threshold,
        timestamp: new Date().toISOString(),
        severity: temperature > threshold * 1.2 ? "critical" : "warning"
      }
    };
    
    // Broadcast to all subscribers
    for (const agentId of this.subscribers) {
      await sendNotification(agentId, alert);
    }
  }
}
```

### Orchestration Pattern
```typescript
// Multi-agent workflow orchestration
class IndustrialOrchestrator {
  async executeMaintenanceWorkflow(equipmentId: string) {
    // 1. Stop equipment safely
    await this.sendCommand("motor.agent", "motor.stop", { equipmentId });
    
    // 2. Read final sensor values
    const sensors = await this.sendCommand("sensor.agent", "sensor.readAll", { equipmentId });
    
    // 3. Log maintenance event
    await this.sendCommand("logging.agent", "log.maintenance", {
      equipmentId,
      timestamp: new Date().toISOString(),
      sensorReadings: sensors
    });
    
    // 4. Notify maintenance team
    await this.sendCommand("notification.agent", "notify.maintenance", {
      equipmentId,
      status: "ready_for_maintenance"
    });
  }
}
```

## Advanced Features

### Load Balancing
```typescript
class A2ALoadBalancer {
  private agentPool: Map<string, A2AAgentCard[]> = new Map();
  
  async getAgent(capability: string): Promise<A2AAgentCard> {
    const agents = this.agentPool.get(capability) || [];
    
    if (agents.length === 0) {
      throw new Error(`No agents available for capability: ${capability}`);
    }
    
    // Round-robin selection with health checking
    const agent = this.selectHealthyAgent(agents);
    return agent;
  }
  
  private selectHealthyAgent(agents: A2AAgentCard[]): A2AAgentCard {
    // Implement health-based selection logic
    return agents.find(agent => this.isAgentHealthy(agent)) || agents[0];
  }
}
```

### Circuit Breaker Pattern
```typescript
class A2ACircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  
  async callAgent(agentId: string, request: any): Promise<any> {
    if (this.isCircuitOpen(agentId)) {
      throw new Error(`Circuit breaker open for agent: ${agentId}`);
    }
    
    try {
      const response = await sendToAgent(agentId, request);
      this.recordSuccess(agentId);
      return response;
    } catch (error) {
      this.recordFailure(agentId);
      throw error;
    }
  }
}
```

### Agent Health Monitoring
```typescript
class A2AHealthMonitor {
  async checkAgentHealth(agentId: string): Promise<HealthStatus> {
    try {
      const healthRequest = {
        jsonrpc: "2.0",
        id: generateId(),
        method: "agent.health",
        params: {}
      };
      
      const startTime = Date.now();
      const response = await sendToAgent(agentId, healthRequest);
      const responseTime = Date.now() - startTime;
      
      return {
        agentId,
        status: response.result.status,
        responseTime,
        lastChecked: new Date(),
        metrics: response.result.metrics
      };
    } catch (error) {
      return {
        agentId,
        status: "error",
        error: error.message,
        lastChecked: new Date()
      };
    }
  }
}
```

## Security Considerations

### Message Encryption
```typescript
// End-to-end message encryption for sensitive data
class SecureA2AMessaging {
  async sendSecureMessage(targetAgent: string, data: any, encryptionKey: string) {
    const encrypted = await encrypt(JSON.stringify(data), encryptionKey);
    
    const request = {
      jsonrpc: "2.0",
      id: generateId(),
      method: "secure.message",
      params: {
        encryptedData: encrypted,
        algorithm: "AES-256-GCM"
      }
    };
    
    return await sendToAgent(targetAgent, request);
  }
}
```

### Agent Capability Validation
```typescript
// Validate agent capabilities before trust
async function validateAgentCapabilities(agentCard: A2AAgentCard): Promise<boolean> {
  for (const capability of agentCard.capabilities) {
    // Test each claimed capability
    const testRequest = {
      jsonrpc: "2.0",
      id: generateId(),
      method: `${capability.id}.test`,
      params: {}
    };
    
    try {
      await sendToAgent(agentCard.agentId, testRequest);
    } catch (error) {
      return false; // Capability test failed
    }
  }
  
  return true; // All capabilities validated
}
```

## Industrial Use Cases

### Temperature Monitoring System
```typescript
class IndustrialTemperatureSystem {
  async setupMonitoring() {
    // Discover temperature sensors
    const sensors = await this.discoverAgents("temperature.read");
    
    // Set up monitoring for each sensor
    for (const sensor of sensors) {
      await this.setupSensorMonitoring(sensor);
    }
  }
  
  async setupSensorMonitoring(sensorAgent: A2AAgentCard) {
    // Configure continuous monitoring
    const request = {
      jsonrpc: "2.0",
      id: generateId(),
      method: "temperature.monitor",
      params: {
        interval: 5000,        // 5 second intervals
        threshold: 85.0,       // Alert threshold
        callback: {
          method: "temperature.alert",
          endpoint: "https://192.168.1.50:3500/a2a"
        }
      }
    };
    
    await sendToAgent(sensorAgent.agentId, request);
  }
}
```

### Motor Control System
```typescript
class MotorControlSystem {
  async emergencyStop(equipmentZone: string) {
    // Find all motor controllers in zone
    const motors = await this.discoverAgents("motor.control", { zone: equipmentZone });
    
    // Send emergency stop to all motors simultaneously
    const stopPromises = motors.map(motor => 
      sendToAgent(motor.agentId, {
        jsonrpc: "2.0",
        id: generateId(),
        method: "motor.emergency_stop",
        params: { reason: "safety_override" }
      })
    );
    
    const results = await Promise.allSettled(stopPromises);
    
    // Log any failures
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Failed to stop motor ${motors[index].agentId}:`, result.reason);
      }
    });
  }
}
```

## Testing and Debugging

### Agent Testing Framework
```typescript
class A2ATestFramework {
  async testAgentCapability(agentId: string, capability: string) {
    const testCases = this.getTestCases(capability);
    const results = [];
    
    for (const testCase of testCases) {
      try {
        const response = await sendToAgent(agentId, testCase.request);
        results.push({
          test: testCase.name,
          status: "passed",
          response
        });
      } catch (error) {
        results.push({
          test: testCase.name,
          status: "failed",
          error: error.message
        });
      }
    }
    
    return results;
  }
}
```

### Message Tracing
```typescript
class A2AMessageTracer {
  private traces = new Map<string, MessageTrace>();
  
  traceMessage(messageId: string, agentId: string, method: string) {
    this.traces.set(messageId, {
      id: messageId,
      agentId,
      method,
      timestamp: new Date(),
      hops: []
    });
  }
  
  addHop(messageId: string, fromAgent: string, toAgent: string) {
    const trace = this.traces.get(messageId);
    if (trace) {
      trace.hops.push({
        from: fromAgent,
        to: toAgent,
        timestamp: new Date()
      });
    }
  }
}
```

## Best Practices

### Agent Development
1. **Implement health checks**: Always provide `agent.health` capability
2. **Graceful degradation**: Handle partial service availability
3. **Resource cleanup**: Properly close connections and free resources
4. **Error handling**: Provide meaningful error messages and codes
5. **Documentation**: Maintain up-to-date capability descriptions

### Security
1. **Validate inputs**: Always validate incoming parameters
2. **Rate limiting**: Implement appropriate rate limits
3. **Audit logging**: Log all security-relevant events
4. **Token rotation**: Regularly rotate authentication tokens
5. **Capability principle**: Only declare necessary capabilities

### Performance
1. **Connection pooling**: Reuse HTTPS connections when possible
2. **Async processing**: Use asynchronous operations for I/O
3. **Caching**: Cache agent discovery results appropriately
4. **Monitoring**: Implement comprehensive performance monitoring
5. **Load balancing**: Distribute load across available agents

---

For complete API documentation and examples, see the [Cyreal A2A Reference Guide](./A2A-API-REFERENCE.md).