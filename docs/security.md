# Cyreal Security Guide

**Comprehensive security architecture for cybernetic serial port management with A2A protocol**

## Overview

Cyreal implements a multi-layered security model designed for production industrial environments. The security architecture centers around RFC-1918 network enforcement, Agent Card authentication, and cybernetic governance principles.

## Security Architecture

### 1. Network Security

#### RFC-1918 Enforcement

Cyreal enforces RFC-1918 private network addresses to prevent exposure to public internet:

```javascript
// Allowed addresses (RFC-1918)
✅ 192.168.0.0/16    // Class C private networks
✅ 10.0.0.0/8        // Class A private networks  
✅ 172.16.0.0/12     // Class B private networks
✅ 127.0.0.1         // Localhost loopback

// Blocked addresses
❌ 8.8.8.8           // Public internet addresses
❌ 203.0.113.1       // TEST-NET addresses
❌ 169.254.0.0/16    // Link-local (security risk)
❌ 224.0.0.0/4       // Multicast (security risk)
```

#### Implementation

```typescript
class RFC1918Validator implements IRFC1918Validator {
  private readonly PRIVATE_RANGES = [
    { start: '192.168.0.0', end: '192.168.255.255' },
    { start: '10.0.0.0', end: '10.255.255.255' },
    { start: '172.16.0.0', end: '172.31.255.255' },
    { start: '127.0.0.0', end: '127.255.255.255' }
  ];

  isRFC1918Address(address: string): boolean {
    return this.PRIVATE_RANGES.some(range => 
      this.isInRange(address, range.start, range.end)
    );
  }

  isBindingAllowed(address: string): boolean {
    if (!this.isRFC1918Address(address)) {
      throw new SecurityError(
        `Address ${address} violates RFC-1918 enforcement. ` +
        `Only private network addresses are allowed.`
      );
    }
    return true;
  }
}
```

### 2. Agent Card Authentication

#### Agent Card Structure

```json
{
  "id": "industrial-gateway-001",
  "name": "Industrial Temperature Gateway",
  "description": "Temperature monitoring and control agent",
  "version": "1.2.0",
  "issuer": "cyreal-authority",
  "issuedAt": "2025-07-10T12:00:00Z",
  "expiresAt": "2025-07-10T18:00:00Z",
  "capabilities": [
    "temperature-monitoring",
    "modbus-rtu",
    "gpio-control",
    "alert-generation"
  ],
  "endpoints": [
    {
      "protocol": "https",
      "host": "192.168.1.100",
      "port": 8443,
      "path": "/api/v1"
    }
  ],
  "security": {
    "tokenHash": "sha256:a1b2c3d4e5f6...",
    "algorithm": "HS256",
    "permissions": ["read", "write", "notify"],
    "rateLimits": {
      "requestsPerMinute": 100,
      "maxConcurrentConnections": 5
    }
  },
  "metadata": {
    "environment": "production",
    "location": "factory-floor-a",
    "owner": "industrial-ops@company.com"
  }
}
```

#### Token Management

```bash
# Generate new Agent Card
cyreal-a2a generate-card \
  --name "temperature-controller" \
  --capabilities "temp-read,modbus-rtu,alert" \
  --expires-in 480m \
  --max-connections 3

# List active Agent Cards
cyreal-a2a list-cards

# Revoke Agent Card
cyreal-a2a revoke-card --id "industrial-gateway-001"

# Validate Agent Card
cyreal-a2a validate-card --file agent-card.json
```

### 3. Input Validation Framework

#### Message Validation

```typescript
class A2AMessageValidator implements IMessageValidator {
  private readonly MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
  private readonly ALLOWED_TYPES = [
    'request', 'response', 'notification', 'heartbeat'
  ];

  validateMessage(message: any): ValidationResult {
    const errors: string[] = [];

    // Size validation
    if (JSON.stringify(message).length > this.MAX_MESSAGE_SIZE) {
      errors.push('Message exceeds maximum size limit');
    }

    // Type validation
    if (!this.ALLOWED_TYPES.includes(message.type)) {
      errors.push(`Invalid message type: ${message.type}`);
    }

    // Injection protection
    if (this.containsSQLInjection(message)) {
      errors.push('SQL injection attempt detected');
    }

    if (this.containsCommandInjection(message)) {
      errors.push('Command injection attempt detected');
    }

    // XSS protection
    if (this.containsXSS(message)) {
      errors.push('XSS attempt detected');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  private containsSQLInjection(obj: any): boolean {
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)/i,
      /('|(\\')|(;)|(--)|(\/*)|(\*\/))/,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i
    ];
    
    return this.searchPatterns(obj, sqlPatterns);
  }

  private containsCommandInjection(obj: any): boolean {
    const cmdPatterns = [
      /(\$\()|(`)|(\|)|(&)|(\;)/,
      /\b(eval|exec|system|shell_exec|passthru)\b/i,
      /(rm\s+-rf|wget|curl|nc\s+-l)/i
    ];
    
    return this.searchPatterns(obj, cmdPatterns);
  }
}
```

### 4. Rate Limiting and CORS

#### Rate Limiting Configuration

```json
{
  "rateLimiting": {
    "global": {
      "requestsPerMinute": 1000,
      "burstSize": 100,
      "windowSizeMinutes": 1
    },
    "perAgent": {
      "requestsPerMinute": 100,
      "burstSize": 20,
      "maxConcurrentConnections": 5
    },
    "byCapability": {
      "temperature-read": {
        "requestsPerMinute": 60,
        "description": "Sensor reading operations"
      },
      "gpio-control": {
        "requestsPerMinute": 10,
        "description": "Hardware control operations"
      },
      "firmware-upload": {
        "requestsPerMinute": 1,
        "description": "Firmware operations"
      }
    }
  }
}
```

#### CORS Policy

```typescript
const corsOptions = {
  origin: (origin: string, callback: Function) => {
    // Only allow RFC-1918 origins
    if (rfc1918Validator.isRFC1918Address(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origin not allowed by RFC-1918 policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Agent-ID',
    'X-Agent-Capabilities'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};
```

### 5. Audit Logging

#### Security Event Logging

```typescript
interface SecurityEvent {
  timestamp: string;
  level: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';
  category: 'authentication' | 'authorization' | 'network' | 'input_validation' | 'rate_limiting';
  agentId?: string;
  sourceIP: string;
  event: string;
  details: any;
  riskScore: number; // 0-100
}

class SecurityLogger {
  logSecurityEvent(event: SecurityEvent): void {
    // Always log to secure audit file
    this.writeToAuditLog(event);
    
    // High-risk events trigger immediate alerts
    if (event.riskScore >= 80) {
      this.triggerSecurityAlert(event);
    }
    
    // Forward to SIEM if configured
    if (this.siemConfig.enabled) {
      this.forwardToSIEM(event);
    }
  }

  private writeToAuditLog(event: SecurityEvent): void {
    const logEntry = {
      ...event,
      signature: this.generateSignature(event)
    };
    
    this.auditLogger.write(JSON.stringify(logEntry) + '\n');
  }
}
```

#### Example Security Events

```json
{
  "timestamp": "2025-07-10T15:30:00.123Z",
  "level": "warning",
  "category": "network",
  "sourceIP": "203.0.113.1",
  "event": "rfc1918_violation",
  "details": {
    "attempted_address": "203.0.113.1",
    "action": "connection_rejected",
    "reason": "Public IP address not allowed"
  },
  "riskScore": 75
}

{
  "timestamp": "2025-07-10T15:31:15.456Z",
  "level": "critical",
  "category": "input_validation",
  "agentId": "suspicious-agent-001",
  "sourceIP": "192.168.1.201",
  "event": "injection_attempt",
  "details": {
    "attack_type": "sql_injection",
    "payload": "'; DROP TABLE agents; --",
    "blocked": true
  },
  "riskScore": 95
}
```

## Security Configuration

### Production Security Setup

```bash
# Enable maximum security
cyreal-a2a config set security.level paranoid

# Configure RFC-1918 enforcement
cyreal-a2a config set security.enforceRFC1918 true

# Set token expiration
cyreal-a2a config set security.tokenExpiryMinutes 60

# Enable audit logging
cyreal-a2a config set security.auditLogging true
cyreal-a2a config set security.auditLogPath /var/log/cyreal/security.log

# Configure rate limiting
cyreal-a2a config set rateLimiting.global.requestsPerMinute 1000
cyreal-a2a config set rateLimiting.perAgent.requestsPerMinute 100

# Enable HTTPS only
cyreal-a2a config set server.httpsOnly true
cyreal-a2a config set server.certPath /etc/cyreal/ssl/cert.pem
cyreal-a2a config set server.keyPath /etc/cyreal/ssl/key.pem
```

### Environment Variables

```bash
# Security enforcement
export CYREAL_A2A_ENFORCE_RFC1918=true
export CYREAL_A2A_SECURITY_LEVEL=paranoid
export CYREAL_A2A_TOKEN_EXPIRY=60

# TLS configuration
export CYREAL_A2A_HTTPS_ONLY=true
export CYREAL_A2A_CERT_PATH=/etc/cyreal/ssl/cert.pem
export CYREAL_A2A_KEY_PATH=/etc/cyreal/ssl/key.pem

# Audit logging
export CYREAL_A2A_AUDIT_ENABLED=true
export CYREAL_A2A_AUDIT_LOG_PATH=/var/log/cyreal/security.log

# Rate limiting
export CYREAL_A2A_RATE_LIMIT_GLOBAL=1000
export CYREAL_A2A_RATE_LIMIT_PER_AGENT=100
```

## Threat Model

### 1. Network-Based Threats

#### Public Internet Exposure
- **Threat**: A2A server accidentally exposed to public internet
- **Mitigation**: RFC-1918 enforcement prevents binding to public addresses
- **Detection**: Network monitoring alerts on non-private address attempts

#### Man-in-the-Middle Attacks
- **Threat**: Interception of agent communications
- **Mitigation**: HTTPS/TLS 1.3 encryption with certificate validation
- **Detection**: Certificate pinning and anomaly detection

### 2. Authentication Threats

#### Agent Impersonation
- **Threat**: Malicious agent presenting forged credentials
- **Mitigation**: Agent Card cryptographic signatures with token validation
- **Detection**: Token verification and capability validation

#### Token Theft
- **Threat**: Stolen agent tokens used for unauthorized access
- **Mitigation**: Short token lifetimes and revocation capabilities
- **Detection**: Unusual access patterns and IP monitoring

### 3. Injection Attacks

#### SQL Injection
- **Threat**: Malicious SQL in agent messages
- **Mitigation**: Input validation and parameterized queries
- **Detection**: Pattern matching and anomaly detection

#### Command Injection
- **Threat**: System commands in agent payloads
- **Mitigation**: Command sanitization and whitelist validation
- **Detection**: Shell metacharacter detection

### 4. Denial of Service

#### Rate Limiting Bypass
- **Threat**: Overwhelming server with requests
- **Mitigation**: Multi-layer rate limiting with exponential backoff
- **Detection**: Request pattern analysis and adaptive thresholds

#### Resource Exhaustion
- **Threat**: Memory/CPU exhaustion through large payloads
- **Mitigation**: Message size limits and resource monitoring
- **Detection**: Performance metrics and threshold alerting

## Incident Response

### Security Alert Levels

1. **EMERGENCY** (95-100): System compromise imminent
   - Automatic agent disconnection
   - Security team notification
   - System lockdown procedures

2. **CRITICAL** (80-94): Active attack detected
   - Agent quarantine
   - Enhanced monitoring
   - Immediate investigation

3. **WARNING** (60-79): Suspicious activity
   - Increased logging
   - Rate limit enforcement
   - Monitoring escalation

### Response Procedures

```bash
# Emergency lockdown
cyreal-a2a emergency-lockdown --reason "security_incident"

# Quarantine specific agent
cyreal-a2a quarantine-agent --id "suspicious-agent-001"

# Generate security report
cyreal-a2a security-report --last 24h --format json

# Export audit logs
cyreal-a2a export-audit --since "2025-07-10T12:00:00Z" --format siem
```

## Compliance

### Industrial Standards

- **IEC 62443**: Industrial cybersecurity framework compliance
- **NIST Cybersecurity Framework**: Core security controls implementation
- **ISO 27001**: Information security management system
- **GDPR**: Data protection and privacy compliance

### Audit Requirements

```json
{
  "auditRequirements": {
    "dataRetention": {
      "securityLogs": "7 years",
      "accessLogs": "3 years",
      "agentCards": "5 years"
    },
    "encryption": {
      "inTransit": "TLS 1.3 minimum",
      "atRest": "AES-256",
      "keyManagement": "Hardware HSM preferred"
    },
    "accessControl": {
      "authentication": "Multi-factor required",
      "authorization": "Capability-based",
      "accountability": "Full audit trail"
    }
  }
}
```

## Best Practices

### 1. Agent Security

```javascript
// Secure agent implementation
const agent = new CyrealA2AAgent({
  agentCard: {
    id: generateSecureId(),
    capabilities: minimumRequiredCapabilities(), // Principle of least privilege
    security: {
      tokenRotationInterval: 3600, // 1 hour
      maxRetries: 3,
      timeoutSeconds: 30
    }
  },
  networking: {
    enforceRFC1918: true,
    validateCertificates: true,
    enablePinning: true
  }
});
```

### 2. Production Deployment

```bash
# Use dedicated security user
sudo useradd -r -s /bin/false cyreal-security

# Set proper file permissions
sudo chmod 600 /etc/cyreal/agent-cards/*
sudo chown cyreal-security:cyreal-security /etc/cyreal/

# Enable firewall rules
sudo ufw allow from 192.168.0.0/16 to any port 8443
sudo ufw allow from 10.0.0.0/8 to any port 8443
sudo ufw allow from 172.16.0.0/12 to any port 8443
sudo ufw deny 8443 # Block everything else

# Configure log rotation
echo '/var/log/cyreal/*.log {
  daily
  rotate 365
  compress
  missingok
  notifempty
  postrotate
    systemctl reload cyreal-a2a
  endscript
}' | sudo tee /etc/logrotate.d/cyreal
```

### 3. Monitoring and Alerting

```bash
# Set up security monitoring
cyreal-a2a monitor --security-events --alert-webhook https://security-team.company.com/webhook

# Configure threshold alerts
cyreal-a2a config set alerts.failedAuthThreshold 5
cyreal-a2a config set alerts.rateLimitThreshold 90
cyreal-a2a config set alerts.injectionAttemptAlert true
```

---

**This security guide ensures Cyreal A2A deployments meet industrial cybersecurity requirements while maintaining operational efficiency.**