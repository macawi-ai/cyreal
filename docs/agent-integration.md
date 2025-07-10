# Cyreal A2A Agent Integration Guide

**Complete guide for integrating with the Cyreal Agent-to-Agent ecosystem**

## Overview

This guide covers everything needed to integrate your application with the Cyreal A2A agent ecosystem, from basic Agent Card creation to advanced multi-agent coordination patterns.

## Getting Started

### 1. Agent Card Creation

Every agent must have an Agent Card for authentication and capability declaration:

```bash
# Generate a new Agent Card
cyreal-a2a generate-card \
  --name "temperature-monitor" \
  --description "Industrial temperature monitoring agent" \
  --capabilities "temperature-read,modbus-rtu,alert-generation" \
  --expires-in 480m \
  --output-file ./temp-monitor-card.json

# Validate the Agent Card
cyreal-a2a validate-card --file ./temp-monitor-card.json
```

### 2. Basic Agent Implementation

```typescript
import { CyrealA2AAgent, AgentCard } from '@cyreal/a2a';

// Load your Agent Card
const agentCard: AgentCard = require('./temp-monitor-card.json');

// Create agent instance
const agent = new CyrealA2AAgent({
  endpoint: "https://192.168.1.100:8443",
  agentCard: agentCard,
  options: {
    autoReconnect: true,
    heartbeatInterval: 30000,
    requestTimeout: 10000
  }
});

// Connect to A2A server
await agent.connect();
console.log('Connected to A2A ecosystem');
```

### 3. Service Discovery

```typescript
// Discover available agents
const agents = await agent.discoverAgents();
console.log('Available agents:', agents);

// Find agents with specific capabilities
const tempAgents = await agent.findAgentsByCapability('temperature-read');
const motorAgents = await agent.findAgentsByCapability('motor-control');

// Subscribe to agent discovery events
agent.onAgentDiscovered((newAgent) => {
  console.log('New agent joined:', newAgent.name);
});

agent.onAgentLost((agentId) => {
  console.log('Agent disconnected:', agentId);
});
```

## Agent Communication Patterns

### 1. Request-Response Pattern

```typescript
// Send request to specific agent
const response = await agent.sendRequest('motor-controller-001', {
  type: 'control-request',
  action: 'set-speed',
  parameters: {
    motorId: 'motor-a1',
    speed: 75,
    direction: 'forward'
  }
});

console.log('Motor response:', response);
```

### 2. Publish-Subscribe Pattern

```typescript
// Subscribe to temperature alerts
agent.subscribe('temperature-alerts', (message) => {
  if (message.data.temperature > 80) {
    console.log('High temperature alert:', message.data);
    // Take corrective action
    handleHighTemperature(message.data);
  }
});

// Publish temperature reading
agent.publish('temperature-readings', {
  sensorId: 'temp-001',
  temperature: 23.5,
  unit: 'celsius',
  timestamp: Date.now(),
  location: 'reactor-core'
});
```

### 3. Broadcast Pattern

```typescript
// Broadcast emergency shutdown
await agent.broadcast({
  type: 'emergency',
  action: 'shutdown',
  reason: 'Temperature critical',
  priority: 'immediate'
});
```

## Advanced Integration Patterns

### 1. Multi-Agent Orchestration

```typescript
class IndustrialOrchestrator {
  private agents: Map<string, CyrealA2AAgent> = new Map();

  async initialize() {
    // Connect multiple specialized agents
    const tempAgent = await this.connectAgent('temp-monitor', ['temperature-read']);
    const motorAgent = await this.connectAgent('motor-ctrl', ['motor-control']);
    const alertAgent = await this.connectAgent('alert-mgr', ['alert-generation']);

    this.agents.set('temperature', tempAgent);
    this.agents.set('motor', motorAgent);
    this.agents.set('alerts', alertAgent);
  }

  async handleTemperatureAlert(reading: TemperatureReading) {
    if (reading.temperature > 85) {
      // Coordinate response across multiple agents
      await Promise.all([
        this.agents.get('motor')?.sendRequest('emergency-stop'),
        this.agents.get('alerts')?.sendRequest('send-sms', {
          recipients: ['ops-team@company.com'],
          message: `Critical temperature: ${reading.temperature}°C`
        })
      ]);
    }
  }

  private async connectAgent(type: string, capabilities: string[]): Promise<CyrealA2AAgent> {
    const agentCard = await this.loadAgentCard(type);
    const agent = new CyrealA2AAgent({
      endpoint: "https://192.168.1.100:8443",
      agentCard: agentCard
    });
    await agent.connect();
    return agent;
  }
}
```

### 2. Agent Capability Matching

```typescript
class CapabilityMatcher {
  async findOptimalAgent(requiredCapabilities: string[]): Promise<AgentCard | null> {
    const availableAgents = await this.agent.discoverAgents();
    
    // Score agents based on capability match
    const scoredAgents = availableAgents.map(agent => {
      const matchScore = this.calculateCapabilityScore(
        agent.capabilities, 
        requiredCapabilities
      );
      return { agent, score: matchScore };
    });

    // Sort by score and return best match
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0]?.score > 0 ? scoredAgents[0].agent : null;
  }

  private calculateCapabilityScore(agentCaps: string[], required: string[]): number {
    const matches = required.filter(cap => agentCaps.includes(cap));
    return matches.length / required.length;
  }
}
```

### 3. Load Balancing

```typescript
class AgentLoadBalancer {
  private agentPool: Map<string, CyrealA2AAgent[]> = new Map();
  private roundRobinIndex: Map<string, number> = new Map();

  async addAgentsToPool(capability: string, agents: CyrealA2AAgent[]) {
    this.agentPool.set(capability, agents);
    this.roundRobinIndex.set(capability, 0);
  }

  async sendBalancedRequest(capability: string, request: any): Promise<any> {
    const agents = this.agentPool.get(capability);
    if (!agents || agents.length === 0) {
      throw new Error(`No agents available for capability: ${capability}`);
    }

    // Round-robin selection
    const currentIndex = this.roundRobinIndex.get(capability) || 0;
    const selectedAgent = agents[currentIndex];
    
    // Update index for next request
    this.roundRobinIndex.set(capability, (currentIndex + 1) % agents.length);

    // Send request with fallback
    try {
      return await selectedAgent.sendRequest(request);
    } catch (error) {
      // Try next agent on failure
      if (agents.length > 1) {
        const fallbackAgent = agents[(currentIndex + 1) % agents.length];
        return await fallbackAgent.sendRequest(request);
      }
      throw error;
    }
  }
}
```

## Industrial Use Cases

### 1. Temperature Monitoring System

```typescript
class TemperatureMonitoringAgent {
  private agent: CyrealA2AAgent;
  private sensors: Map<string, TemperatureSensor> = new Map();

  async initialize() {
    this.agent = new CyrealA2AAgent({
      endpoint: "https://192.168.1.100:8443",
      agentCard: {
        id: "temp-monitor-001",
        capabilities: ["temperature-read", "modbus-rtu", "alert-generation"]
      }
    });

    await this.agent.connect();
    this.setupRequestHandlers();
    this.startMonitoring();
  }

  private setupRequestHandlers() {
    // Handle temperature read requests
    this.agent.onRequest('temperature-read', async (request) => {
      const sensorId = request.parameters.sensorId;
      const sensor = this.sensors.get(sensorId);
      
      if (!sensor) {
        throw new Error(`Sensor not found: ${sensorId}`);
      }

      const reading = await sensor.readTemperature();
      return {
        sensorId: sensorId,
        temperature: reading.value,
        unit: reading.unit,
        timestamp: Date.now(),
        status: reading.status
      };
    });

    // Handle sensor configuration
    this.agent.onRequest('configure-sensor', async (request) => {
      const { sensorId, threshold, alertEmail } = request.parameters;
      const sensor = this.sensors.get(sensorId);
      
      if (sensor) {
        sensor.setThreshold(threshold);
        sensor.setAlertEmail(alertEmail);
        return { success: true, sensorId: sensorId };
      }
      
      throw new Error(`Sensor not found: ${sensorId}`);
    });
  }

  private async startMonitoring() {
    setInterval(async () => {
      for (const [sensorId, sensor] of this.sensors) {
        const reading = await sensor.readTemperature();
        
        // Check thresholds
        if (reading.value > sensor.getThreshold()) {
          await this.agent.broadcast({
            type: 'temperature-alert',
            severity: 'warning',
            data: {
              sensorId: sensorId,
              temperature: reading.value,
              threshold: sensor.getThreshold(),
              location: sensor.getLocation()
            }
          });
        }

        // Publish regular readings
        await this.agent.publish('temperature-readings', {
          sensorId: sensorId,
          ...reading,
          timestamp: Date.now()
        });
      }
    }, 30000); // Check every 30 seconds
  }
}
```

### 2. Motor Control System

```typescript
class MotorControlAgent {
  private agent: CyrealA2AAgent;
  private motors: Map<string, MotorController> = new Map();

  async initialize() {
    this.agent = new CyrealA2AAgent({
      endpoint: "https://192.168.1.100:8443",
      agentCard: {
        id: "motor-ctrl-001",
        capabilities: ["motor-control", "safety-monitoring", "modbus-rtu"]
      }
    });

    await this.agent.connect();
    this.setupRequestHandlers();
    this.subscribeToSafetyAlerts();
  }

  private setupRequestHandlers() {
    // Handle motor control requests
    this.agent.onRequest('motor-control', async (request) => {
      const { motorId, action, parameters } = request.parameters;
      const motor = this.motors.get(motorId);
      
      if (!motor) {
        throw new Error(`Motor not found: ${motorId}`);
      }

      switch (action) {
        case 'start':
          await motor.start();
          break;
        case 'stop':
          await motor.stop();
          break;
        case 'set-speed':
          await motor.setSpeed(parameters.speed);
          break;
        case 'emergency-stop':
          await motor.emergencyStop();
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return {
        motorId: motorId,
        action: action,
        status: motor.getStatus(),
        timestamp: Date.now()
      };
    });
  }

  private subscribeToSafetyAlerts() {
    // Subscribe to temperature alerts
    this.agent.subscribe('temperature-alerts', async (message) => {
      if (message.data.severity === 'critical') {
        // Emergency stop all motors
        for (const [motorId, motor] of this.motors) {
          await motor.emergencyStop();
          console.log(`Emergency stop triggered for motor: ${motorId}`);
        }
      }
    });

    // Subscribe to emergency commands
    this.agent.subscribe('emergency-commands', async (message) => {
      if (message.data.action === 'shutdown') {
        await this.emergencyShutdownAll();
      }
    });
  }

  private async emergencyShutdownAll() {
    const shutdownPromises = Array.from(this.motors.entries()).map(
      async ([motorId, motor]) => {
        try {
          await motor.emergencyStop();
          return { motorId, success: true };
        } catch (error) {
          return { motorId, success: false, error: error.message };
        }
      }
    );

    const results = await Promise.all(shutdownPromises);
    
    // Report shutdown results
    await this.agent.publish('shutdown-results', {
      timestamp: Date.now(),
      results: results
    });
  }
}
```

## Security Best Practices

### 1. Agent Authentication

```typescript
// Always validate Agent Cards
const isValid = await agent.validateAgentCard(incomingCard);
if (!isValid) {
  throw new Error('Invalid Agent Card');
}

// Use capability-based access control
const hasCapability = agent.hasCapability('motor-control');
if (!hasCapability) {
  throw new Error('Agent lacks required capability');
}
```

### 2. Input Validation

```typescript
// Validate all incoming requests
function validateMotorRequest(request: any): boolean {
  const schema = {
    motorId: { type: 'string', required: true, pattern: /^motor-[a-z0-9]+$/ },
    action: { type: 'string', required: true, enum: ['start', 'stop', 'set-speed'] },
    parameters: { type: 'object', required: false }
  };

  return validateSchema(request, schema);
}

agent.onRequest('motor-control', async (request) => {
  if (!validateMotorRequest(request)) {
    throw new Error('Invalid request format');
  }
  // Process validated request
});
```

### 3. Rate Limiting

```typescript
// Implement agent-side rate limiting
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests = 100;
  private readonly windowMs = 60000; // 1 minute

  isAllowed(agentId: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(agentId) || [];
    
    // Remove old requests
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(agentId, validRequests);
    return true;
  }
}
```

## Testing and Debugging

### 1. Agent Testing

```typescript
describe('Temperature Monitor Agent', () => {
  let agent: TemperatureMonitoringAgent;
  let mockA2AAgent: jest.Mocked<CyrealA2AAgent>;

  beforeEach(() => {
    mockA2AAgent = createMockA2AAgent();
    agent = new TemperatureMonitoringAgent(mockA2AAgent);
  });

  test('should handle temperature read request', async () => {
    const request = {
      type: 'temperature-read',
      parameters: { sensorId: 'temp-001' }
    };

    const response = await agent.handleRequest(request);
    
    expect(response).toMatchObject({
      sensorId: 'temp-001',
      temperature: expect.any(Number),
      unit: 'celsius',
      timestamp: expect.any(Number)
    });
  });

  test('should generate alert on high temperature', async () => {
    const highTempReading = { value: 90, unit: 'celsius', status: 'ok' };
    mockSensor.readTemperature.mockResolvedValue(highTempReading);

    await agent.checkThresholds();

    expect(mockA2AAgent.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'temperature-alert',
        severity: 'warning'
      })
    );
  });
});
```

### 2. Debug Mode

```bash
# Enable debug logging
export CYREAL_A2A_DEBUG=true
export CYREAL_A2A_LOG_LEVEL=debug

# Start agent with verbose logging
node agent.js --debug --trace-requests
```

### 3. Agent Monitoring

```typescript
// Monitor agent health
agent.onHealthCheck((health) => {
  console.log('Agent health:', {
    connected: health.connected,
    lastHeartbeat: health.lastHeartbeat,
    requestsProcessed: health.requestsProcessed,
    errors: health.errors
  });
});

// Monitor performance metrics
agent.onMetrics((metrics) => {
  console.log('Performance metrics:', {
    averageResponseTime: metrics.avgResponseTime,
    requestsPerMinute: metrics.requestsPerMinute,
    errorRate: metrics.errorRate
  });
});
```

## Deployment

### 1. Production Configuration

```json
{
  "agent": {
    "id": "production-temp-monitor",
    "environment": "production",
    "logLevel": "info"
  },
  "a2a": {
    "endpoint": "https://192.168.1.100:8443",
    "heartbeatInterval": 30000,
    "requestTimeout": 10000,
    "maxRetries": 3
  },
  "security": {
    "validateCertificates": true,
    "enforceRFC1918": true,
    "auditLogging": true
  }
}
```

### 2. Container Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

USER 1000:1000

CMD ["npm", "start"]
```

### 3. Health Checks

```typescript
// Kubernetes health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: agent.isConnected() ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    agent: {
      id: agent.getId(),
      connected: agent.isConnected(),
      lastHeartbeat: agent.getLastHeartbeat()
    }
  };
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

---

**This integration guide provides everything needed to build robust, secure agents for the Cyreal A2A ecosystem.**