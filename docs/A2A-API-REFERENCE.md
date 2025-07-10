# A2A API Reference

**Complete API documentation for Cyreal's Agent-to-Agent protocol implementation**

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Core APIs](#core-apis)
- [Agent Registry API](#agent-registry-api)
- [Service Discovery API](#service-discovery-api)
- [Security Validation API](#security-validation-api)
- [Governor API](#governor-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## Overview

The Cyreal A2A API provides a comprehensive interface for agent-to-agent communication following RFC-1918 security standards. All endpoints enforce JSON-RPC 2.0 protocol over HTTPS.

### Base URL
```
https://<rfc1918-address>:3500/api/v1
```

### Supported Addresses
- `127.0.0.1` (localhost)
- `192.168.0.0/16` (Class C private)
- `10.0.0.0/8` (Class A private)
- `172.16.0.0/12` (Class B private)

### Protocol Specification
- **Transport**: HTTPS/TLS 1.3
- **Message Format**: JSON-RPC 2.0
- **Authentication**: Agent Card + HMAC-SHA256 tokens
- **Rate Limiting**: Per-agent and global limits

## Authentication

### Agent Card Structure

Every agent must present a valid Agent Card for authentication:

```typescript
interface A2AAgentCard {
  agentId: string;           // Unique identifier
  name: string;              // Human-readable name
  description: string;       // Agent purpose
  version: string;           // Semantic version
  capabilities: A2ACapability[];  // Available capabilities
  endpoints: A2AEndpoint[];  // Network endpoints
  metadata?: Record<string, any>;  // Optional metadata
  lastSeen: Date;           // Last heartbeat timestamp
}

interface A2ACapability {
  id: string;               // Capability identifier
  name: string;             // Display name
  description: string;      // Capability description
  category: string;         // Category (e.g., "serial", "modbus")
  version: string;          // Capability version
  parameters?: A2AParameter[];  // Required parameters
}

interface A2AEndpoint {
  protocol: string;         // "https", "wss"
  host: string;            // RFC-1918 address only
  port: number;            // Port number
  path: string;            // Endpoint path
}
```

### Authentication Headers

```http
POST /api/v1/agents/register
Content-Type: application/json
Authorization: Bearer <hmac-sha256-token>
X-Agent-ID: <agent-id>
X-Agent-Signature: <agent-card-signature>
```

### Token Generation

```typescript
import { A2ATokenManager } from '@cyreal/core';

const tokenManager = new A2ATokenManager(secretKey);

// Generate authentication token
const token = await tokenManager.generateToken({
  agentId: 'my-agent-001',
  capabilities: ['serial-read', 'modbus-rtu'],
  expiresIn: 3600 // 1 hour
});

// Validate token
const isValid = await tokenManager.validateToken(token, agentCard);
```

## Core APIs

### Server Information

#### `GET /api/v1/info`

Get server information and capabilities.

**Request:**
```http
GET /api/v1/info
Authorization: Bearer <token>
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "server": {
      "name": "Cyreal A2A Server",
      "version": "0.1.0",
      "protocolVersion": "1.0",
      "capabilities": [
        "agent-registry",
        "service-discovery",
        "serial-communication",
        "modbus-rtu"
      ]
    },
    "security": {
      "rfc1918Enforced": true,
      "httpsOnly": true,
      "tokenRequired": true
    },
    "limits": {
      "maxAgents": 100,
      "maxConnections": 50,
      "requestsPerMinute": 1000
    }
  }
}
```

#### `GET /api/v1/health`

Health check endpoint.

**Request:**
```http
GET /api/v1/health
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "status": "healthy",
    "timestamp": "2025-07-10T15:30:00.000Z",
    "uptime": 3600,
    "agents": {
      "total": 5,
      "active": 4,
      "healthy": 4
    },
    "performance": {
      "averageResponseTime": 15,
      "requestsPerSecond": 12.5,
      "errorRate": 0.001
    }
  }
}
```

## Agent Registry API

### Register Agent

#### `POST /api/v1/agents/register`

Register a new agent with the A2A server.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "agent.register",
  "id": 3,
  "params": {
    "agentCard": {
      "agentId": "temp-sensor-001",
      "name": "Temperature Sensor Agent",
      "description": "Industrial temperature monitoring agent",
      "version": "1.0.0",
      "capabilities": [
        {
          "id": "temperature-read",
          "name": "Temperature Reading",
          "description": "Read temperature from Modbus sensors",
          "category": "sensor",
          "version": "1.0.0",
          "parameters": [
            {
              "name": "address",
              "type": "number",
              "required": true,
              "description": "Modbus slave address"
            }
          ]
        }
      ],
      "endpoints": [
        {
          "protocol": "https",
          "host": "192.168.1.100",
          "port": 8443,
          "path": "/api/v1"
        }
      ]
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "registered": true,
    "agentId": "temp-sensor-001",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2025-07-10T16:30:00.000Z"
  }
}
```

### List Agents

#### `GET /api/v1/agents`

List all registered agents.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "agent.list",
  "id": 4,
  "params": {
    "capability": "temperature-read",  // Optional filter
    "active": true                     // Optional filter
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "agents": [
      {
        "agentId": "temp-sensor-001",
        "name": "Temperature Sensor Agent",
        "version": "1.0.0",
        "status": "active",
        "lastSeen": "2025-07-10T15:29:45.000Z",
        "capabilities": ["temperature-read"],
        "endpoints": [
          {
            "protocol": "https",
            "host": "192.168.1.100",
            "port": 8443,
            "path": "/api/v1"
          }
        ]
      }
    ],
    "total": 1
  }
}
```

### Unregister Agent

#### `DELETE /api/v1/agents/{agentId}`

Unregister an agent.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "agent.unregister",
  "id": 5,
  "params": {
    "agentId": "temp-sensor-001"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "unregistered": true,
    "agentId": "temp-sensor-001"
  }
}
```

### Agent Heartbeat

#### `POST /api/v1/agents/{agentId}/heartbeat`

Send agent heartbeat to maintain registration.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "agent.heartbeat",
  "id": 6,
  "params": {
    "agentId": "temp-sensor-001",
    "status": "active",
    "metrics": {
      "cpu": 45.2,
      "memory": 67.8,
      "connections": 3
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "acknowledged": true,
    "nextHeartbeat": "2025-07-10T15:32:00.000Z"
  }
}
```

## Service Discovery API

### Discover Services

#### `GET /api/v1/discovery/services`

Discover available services and capabilities.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "discovery.services",
  "id": 7,
  "params": {
    "capability": "modbus-rtu",  // Optional filter
    "location": "factory-floor-a"  // Optional filter
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "services": [
      {
        "serviceId": "modbus-gateway-001",
        "name": "Modbus RTU Gateway",
        "type": "protocol-gateway",
        "capabilities": ["modbus-rtu", "serial-bridge"],
        "endpoint": "https://192.168.1.101:8443",
        "metadata": {
          "location": "factory-floor-a",
          "serialPorts": ["/dev/ttyUSB0", "/dev/ttyUSB1"]
        }
      }
    ],
    "total": 1
  }
}
```

### Announce Service

#### `POST /api/v1/discovery/announce`

Announce a service for discovery.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "discovery.announce",
  "id": 8,
  "params": {
    "service": {
      "serviceId": "temp-logger-001",
      "name": "Temperature Logger",
      "type": "data-logger",
      "capabilities": ["data-logging", "csv-export"],
      "endpoint": "https://192.168.1.102:8443",
      "ttl": 300
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "announced": true,
    "serviceId": "temp-logger-001",
    "expiresAt": "2025-07-10T15:35:00.000Z"
  }
}
```

## Security Validation API

### Validate Address

#### `POST /api/v1/security/validate-address`

Validate an IP address against RFC-1918 requirements.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "security.validateAddress",
  "id": 9,
  "params": {
    "address": "192.168.1.100"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "valid": true,
    "address": "192.168.1.100",
    "range": "192.168.0.0/16",
    "type": "rfc1918-class-c",
    "message": "Address is RFC-1918 compliant"
  }
}
```

### Validate Agent Card

#### `POST /api/v1/security/validate-card`

Validate an Agent Card structure and signatures.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "security.validateCard",
  "id": 10,
  "params": {
    "agentCard": {
      "agentId": "test-agent-001",
      "name": "Test Agent",
      "description": "Testing agent",
      "version": "1.0.0",
      "capabilities": [],
      "endpoints": []
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "valid": true,
    "issues": [],
    "security": {
      "signatureValid": true,
      "endpointsSecure": true,
      "capabilitiesValid": true
    }
  }
}
```

## Governor API

### System Status

#### `GET /api/v1/governor/status`

Get cybernetic governance system status.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "governor.status",
  "id": 11
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "result": {
    "governors": {
      "operational": {
        "active": true,
        "health": 95,
        "lastProbe": "2025-07-10T15:29:50.000Z"
      },
      "coordination": {
        "active": true,
        "health": 88,
        "agentsManaged": 5
      },
      "management": {
        "active": true,
        "health": 92,
        "recoveryActions": 0
      },
      "intelligence": {
        "active": true,
        "health": 90,
        "learningActive": true
      },
      "meta": {
        "active": true,
        "health": 94,
        "systemOptimal": true
      }
    },
    "overall": {
      "health": 92,
      "status": "optimal"
    }
  }
}
```

### Trigger Analysis

#### `POST /api/v1/governor/analyze`

Trigger cybernetic analysis of system state.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "governor.analyze",
  "id": 12,
  "params": {
    "scope": "network",  // "network", "agents", "performance", "all"
    "priority": "normal"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "analysisId": "analysis-001",
    "started": true,
    "estimatedDuration": 30,
    "status": "running"
  }
}
```

## Error Handling

### Error Response Format

All API errors follow JSON-RPC 2.0 error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "agentId",
      "reason": "Agent ID must be a non-empty string",
      "provided": ""
    }
  }
}
```

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse Error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC |
| -32601 | Method Not Found | Method doesn't exist |
| -32602 | Invalid Params | Invalid method parameters |
| -32603 | Internal Error | Server internal error |
| -32001 | Authentication Error | Invalid or missing token |
| -32002 | Authorization Error | Insufficient permissions |
| -32003 | RFC1918 Violation | Non-private IP address |
| -32004 | Rate Limit Exceeded | Too many requests |
| -32005 | Agent Not Found | Agent doesn't exist |
| -32006 | Capability Not Found | Capability not available |
| -32007 | Service Unavailable | Service temporarily unavailable |

### Security Errors

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32003,
    "message": "RFC-1918 violation",
    "data": {
      "address": "8.8.8.8",
      "reason": "Public IP addresses are not allowed",
      "allowedRanges": [
        "192.168.0.0/16",
        "10.0.0.0/8", 
        "172.16.0.0/12",
        "127.0.0.0/8"
      ]
    }
  }
}
```

## Rate Limiting

### Rate Limit Headers

Every response includes rate limiting information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1720622400
X-RateLimit-Window: 60
```

### Rate Limit Configuration

```typescript
interface RateLimitConfig {
  global: {
    requestsPerMinute: number;    // Global limit
    burstSize: number;           // Burst allowance
  };
  perAgent: {
    requestsPerMinute: number;    // Per-agent limit
    maxConcurrentConnections: number;
  };
  byCapability: {
    [capability: string]: {
      requestsPerMinute: number;
    };
  };
}
```

### Rate Limit Exceeded Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32004,
    "message": "Rate limit exceeded",
    "data": {
      "limit": 100,
      "window": 60,
      "retryAfter": 45
    }
  }
}
```

## Examples

### Complete Agent Registration

```typescript
import { A2AClient } from '@cyreal/a2a-client';

// Initialize client
const client = new A2AClient({
  endpoint: 'https://192.168.1.100:3500',
  agentCard: {
    agentId: 'my-temp-sensor',
    name: 'Temperature Sensor',
    description: 'Modbus temperature sensor agent',
    version: '1.0.0',
    capabilities: [
      {
        id: 'temperature-read',
        name: 'Temperature Reading',
        description: 'Read temperature via Modbus RTU',
        category: 'sensor',
        version: '1.0.0',
        parameters: [
          {
            name: 'address',
            type: 'number',
            required: true,
            description: 'Modbus slave address (1-247)'
          }
        ]
      }
    ],
    endpoints: [
      {
        protocol: 'https',
        host: '192.168.1.101',
        port: 8443,
        path: '/api/v1'
      }
    ]
  }
});

// Register with server
try {
  const result = await client.register();
  console.log('Registered:', result.agentId);
  
  // Start heartbeat
  setInterval(async () => {
    await client.heartbeat({
      status: 'active',
      metrics: {
        temperature: await readTemperature(),
        connections: getActiveConnections()
      }
    });
  }, 30000);
  
} catch (error) {
  console.error('Registration failed:', error);
}
```

### Service Discovery Example

```typescript
// Discover temperature sensors
const sensors = await client.discoverServices({
  capability: 'temperature-read',
  location: 'factory-floor-a'
});

console.log(`Found ${sensors.total} temperature sensors:`);
sensors.services.forEach(sensor => {
  console.log(`- ${sensor.name} at ${sensor.endpoint}`);
});

// Use discovered service
const tempSensor = sensors.services[0];
const response = await fetch(`${tempSensor.endpoint}/temperature`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'temperature.read',
    id: 1,
    params: { address: 1 }
  })
});

const { result } = await response.json();
console.log(`Temperature: ${result.value}°C`);
```

### Security Validation Example

```typescript
// Validate deployment address
const validation = await client.validateAddress('192.168.1.100');
if (!validation.valid) {
  throw new Error(`Invalid address: ${validation.message}`);
}

// Validate agent card
const cardValidation = await client.validateAgentCard(agentCard);
if (!cardValidation.valid) {
  console.warn('Agent card issues:', cardValidation.issues);
}
```

---

**This API reference provides complete coverage of Cyreal's A2A protocol implementation with RFC-1918 security enforcement and cybernetic governance.**