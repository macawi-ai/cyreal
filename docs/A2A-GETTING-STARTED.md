# Getting Started with Cyreal A2A Protocol

## Overview

This guide walks you through setting up and using Cyreal's A2A (Agent-to-Agent) protocol for secure industrial communication. You'll learn how to start the A2A server, create agent cards, and build your first agent integration.

## Prerequisites

- Node.js 18.0.0 or higher
- RFC-1918 private network (required for security)
- Basic understanding of JSON-RPC 2.0
- Serial devices for testing (optional)

## Installation

```bash
# Development installation (from source)
git clone https://github.com/macawi-ai/cyreal.git
cd cyreal
npm install
npm run build

# Make CLI available globally
cd packages/cyreal-a2a
npm link

# Verify installation
cyreal-a2a --version

# Or install published packages when available
npm install -g @cyreal/a2a @cyreal/core @cyreal/tester
```

## Starting the A2A Server

### Basic Server Setup
```bash
# Start A2A server on localhost (most secure)
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
    "id": "cyreal-bridge-001",
    "name": "Cyreal Industrial Bridge",
    "description": "Main cybernetic serial port bridge",
    "version": "1.0.0"
  },
  "security": {
    "enforceRFC1918": true,
    "requireMutualAuth": true,
    "tokenExpiryMinutes": 60,
    "maxAgentsConnected": 50
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

## Creating Your First Agent

### 1. Agent Card Definition
Create `my-agent-card.json`:
```json
{
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Temperature Monitor",
  "description": "Industrial temperature monitoring agent",
  "version": "1.0.0",
  "capabilities": [
    {
      "id": "temperature.read",
      "name": "Read Temperature",
      "description": "Read temperature from connected sensors",
      "category": "serial",
      "input": {
        "type": "object",
        "properties": {
          "sensorId": {
            "type": "string",
            "description": "Sensor identifier"
          },
          "unit": {
            "type": "string",
            "enum": ["celsius", "fahrenheit"],
            "default": "celsius"
          }
        },
        "required": ["sensorId"]
      },
      "output": {
        "type": "object",
        "properties": {
          "temperature": {
            "type": "number",
            "description": "Temperature reading"
          },
          "unit": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "status": {
            "type": "string",
            "enum": ["ok", "warning", "error"]
          }
        }
      }
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
    "location": "Building A, Floor 2, Sensor Room",
    "maintainer": "facilities@company.com",
    "criticality": "high",
    "tags": ["temperature", "hvac", "monitoring"]
  },
  "lastSeen": "2024-01-15T10:30:00.000Z"
}
```

### 2. Agent Implementation (Node.js)
Create `temperature-agent.js`:
```javascript
const https = require('https');
const crypto = require('crypto');

class TemperatureAgent {
  constructor(agentCard, serverEndpoint) {
    this.agentCard = agentCard;
    this.serverEndpoint = serverEndpoint;
    this.authToken = null;
    this.isRegistered = false;
  }

  // Register with A2A server
  async register() {
    try {
      const registrationRequest = {
        jsonrpc: "2.0",
        id: this.generateId(),
        method: "agent.register",
        params: {
          agentCard: this.agentCard
        }
      };

      const response = await this.sendRequest(registrationRequest);
      
      if (response.result.success) {
        this.authToken = response.result.token;
        this.isRegistered = true;
        console.log('✅ Agent registered successfully');
        console.log(`Token expires: ${response.result.expiresAt}`);
        return true;
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration failed:', error.message);
      return false;
    }
  }

  // Implement temperature reading capability
  async readTemperature(sensorId, unit = 'celsius') {
    // Simulate reading from serial sensor
    const rawTemp = Math.random() * 40 + 10; // 10-50°C
    const temperature = unit === 'fahrenheit' ? (rawTemp * 9/5) + 32 : rawTemp;
    
    return {
      temperature: Math.round(temperature * 100) / 100,
      unit,
      timestamp: new Date().toISOString(),
      status: temperature > 35 ? 'warning' : 'ok',
      sensorId
    };
  }

  // Handle incoming A2A requests
  async handleRequest(request) {
    try {
      switch (request.method) {
        case 'temperature.read':
          const { sensorId, unit } = request.params;
          const result = await this.readTemperature(sensorId, unit);
          return {
            jsonrpc: "2.0",
            id: request.id,
            result
          };

        case 'agent.health':
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              status: 'healthy',
              uptime: process.uptime(),
              capabilities: this.agentCard.capabilities.map(c => c.id),
              lastSeen: new Date().toISOString()
            }
          };

        default:
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
      }
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { error: error.message }
        }
      };
    }
  }

  // Send request to A2A server
  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(request);
      
      const options = {
        hostname: '192.168.1.100',
        port: 3500,
        path: '/a2a',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'X-Agent-ID': this.agentCard.agentId
        }
      };

      if (this.authToken) {
        options.headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Start HTTP server to receive A2A requests
  startServer(port = 3501) {
    const server = https.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/a2a') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const request = JSON.parse(body);
            const response = await this.handleRequest(request);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32700, message: 'Parse error' }
            }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(port, '192.168.1.101', () => {
      console.log(`🌐 Agent server listening on https://192.168.1.101:${port}/a2a`);
    });
  }
}

// Usage example
async function main() {
  // Load agent card
  const agentCard = require('./my-agent-card.json');
  
  // Create and start agent
  const agent = new TemperatureAgent(agentCard, 'https://192.168.1.100:3500/a2a');
  
  // Start agent server
  agent.startServer(3501);
  
  // Register with A2A server
  const registered = await agent.register();
  
  if (registered) {
    console.log('🚀 Temperature agent is ready!');
    
    // Test the capability
    setInterval(async () => {
      const reading = await agent.readTemperature('sensor-001');
      console.log('📊 Temperature reading:', reading);
    }, 10000);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down temperature agent...');
  process.exit(0);
});

main().catch(console.error);
```

### 3. Running Your Agent
```bash
# Make sure A2A server is running
cyreal-a2a start --host 192.168.1.100 --port 3500

# In another terminal, start your agent
node temperature-agent.js
```

## Testing Agent Communication

### Using curl
```bash
# Test agent registration
curl -X POST https://192.168.1.100:3500/a2a \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: test-client" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-001",
    "method": "agent.discover",
    "params": {
      "capabilities": ["temperature.read"]
    }
  }'

# Test temperature reading (after getting auth token)
curl -X POST https://192.168.1.101:3501/a2a \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Agent-ID: test-client" \
  -d '{
    "jsonrpc": "2.0",
    "id": "temp-001",
    "method": "temperature.read",
    "params": {
      "sensorId": "sensor-001",
      "unit": "celsius"
    }
  }'
```

### Using Cyreal CLI
```bash
# Validate RFC-1918 compliance
cyreal-a2a validate 192.168.1.100  # ✅ Valid
cyreal-a2a validate 8.8.8.8        # ❌ Invalid

# Check server status
cyreal-a2a info
```

## Building Multi-Agent Systems

### Agent Discovery
```javascript
// Discover available temperature agents
async function discoverTemperatureAgents() {
  const request = {
    jsonrpc: "2.0",
    id: "discover-001",
    method: "agent.discover",
    params: {
      capabilities: ["temperature.read"],
      metadata: {
        location: "Building A"
      }
    }
  };

  const response = await sendToA2AServer(request);
  return response.result.agents;
}
```

### Orchestrated Workflows
```javascript
// Multi-agent temperature monitoring
class TemperatureOrchestrator {
  async setupMonitoring() {
    // 1. Discover all temperature agents
    const agents = await this.discoverTemperatureAgents();
    
    // 2. Set up monitoring for each agent
    const monitoringTasks = agents.map(agent => 
      this.setupAgentMonitoring(agent)
    );
    
    await Promise.all(monitoringTasks);
    console.log(`✅ Monitoring setup for ${agents.length} agents`);
  }

  async setupAgentMonitoring(agent) {
    // Configure continuous monitoring
    const request = {
      jsonrpc: "2.0",
      id: `monitor-${agent.agentId}`,
      method: "temperature.monitor",
      params: {
        interval: 30000,     // 30 seconds
        threshold: 40.0,     // Alert at 40°C
        callback: {
          method: "temperature.alert",
          endpoint: "https://192.168.1.50:3500/a2a"
        }
      }
    };

    await sendToAgent(agent.agentId, request);
  }
}
```

## Security Best Practices

### Network Security
```bash
# ✅ GOOD: Private network binding
cyreal-a2a start --host 192.168.1.100

# ❌ BAD: This will be rejected by RFC-1918 enforcement
cyreal-a2a start --host 0.0.0.0  # Blocks public exposure
```

### Agent Authentication
```javascript
// Always validate agent cards
async function validateAgentCard(agentCard) {
  // Check required fields
  const required = ['agentId', 'name', 'version', 'capabilities'];
  for (const field of required) {
    if (!agentCard[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate UUIDv4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(agentCard.agentId)) {
    throw new Error('Invalid agent ID format');
  }

  // Check timestamp freshness (prevent replay attacks)
  const lastSeen = new Date(agentCard.lastSeen);
  const now = new Date();
  if (now - lastSeen > 5 * 60 * 1000) { // 5 minutes
    throw new Error('Agent card timestamp too old');
  }

  return true;
}
```

### Token Management
```javascript
class A2ATokenManager {
  constructor() {
    this.tokens = new Map();
  }

  async generateToken(agentId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    this.tokens.set(token, {
      agentId,
      expiresAt,
      createdAt: new Date()
    });

    return { token, expiresAt };
  }

  async validateToken(token) {
    const tokenData = this.tokens.get(token);
    if (!tokenData) return false;
    
    if (new Date() > tokenData.expiresAt) {
      this.tokens.delete(token);
      return false;
    }

    return true;
  }

  revokeToken(token) {
    this.tokens.delete(token);
  }
}
```

## Troubleshooting

### Common Issues

**RFC-1918 Violation Error**
```
🚨 SECURITY VIOLATION: Attempted A2A service binding to public IP
```
Solution: Use private IP addresses (10.x.x.x, 172.16-31.x.x, 192.168.x.x)

**Authentication Failed**
```json
{
  "error": {
    "code": -32401,
    "message": "Authentication failed"
  }
}
```
Solution: Check Agent Card format and ensure proper registration

**Agent Not Found**
```json
{
  "error": {
    "code": -32404,
    "message": "Agent not found"
  }
}
```
Solution: Verify agent is registered and responding to health checks

### Debug Mode
```bash
# Enable verbose logging
cyreal-a2a start --host 192.168.1.100 --verbose

# Check agent connectivity
curl -k https://192.168.1.101:3501/a2a \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"health","method":"agent.health"}'
```

## Next Steps

1. **Read the [A2A Protocol Guide](./A2A-PROTOCOL.md)** for advanced features
2. **Review [Security Documentation](./A2A-SECURITY.md)** for production deployment
3. **Explore [Industrial Use Cases](./A2A-INDUSTRIAL-EXAMPLES.md)** for inspiration
4. **Join the community** at [GitHub Discussions](https://github.com/cyreal-project/cyreal/discussions)

## Resources

- [A2A Protocol Specification](./A2A-PROTOCOL.md)
- [Security Architecture](./A2A-SECURITY.md)
- [API Reference](./A2A-API-REFERENCE.md)
- [Industrial Examples](./A2A-INDUSTRIAL-EXAMPLES.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**Need help?** Open an issue on [GitHub](https://github.com/cyreal-project/cyreal/issues) or check our [community discussions](https://github.com/cyreal-project/cyreal/discussions).