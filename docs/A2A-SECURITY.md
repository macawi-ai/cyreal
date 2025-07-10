# A2A Security Architecture

## Executive Summary

Cyreal implements enterprise-grade security for Agent-to-Agent (A2A) communication, designed specifically for industrial control systems. Our security model enforces RFC-1918 private network restrictions, implements cryptographic agent authentication, and provides comprehensive input validation to protect critical infrastructure.

## Security Principles

### 1. Defense in Depth
- **Network Layer**: RFC-1918 enforcement prevents public internet exposure
- **Transport Layer**: HTTPS-only with secure CORS policies
- **Application Layer**: Token-based authentication with Agent Cards
- **Message Layer**: Input validation and sanitization

### 2. Fail-Secure Design
- Default to most restrictive settings
- Explicit allowlisting rather than blocklisting
- Automatic security event logging
- Graceful degradation under attack

### 3. Industrial Compliance
- **IEC 62443**: Industrial cybersecurity framework compliance
- **NIST Cybersecurity Framework**: Core security controls implementation
- **ISO 27001**: Information security management standards
- **GDPR**: Data protection and privacy compliance

## RFC-1918 Enforcement

### Overview
Cyreal enforces **HARD restrictions** preventing A2A service binding to public IP addresses, implementing the Macawi AI Ethical Security Standard.

### Protected Address Ranges
```
✅ ALLOWED:
- localhost (127.0.0.1, ::1)
- 10.0.0.0/8     (10.0.0.0 - 10.255.255.255)
- 172.16.0.0/12  (172.16.0.0 - 172.31.255.255)
- 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)

❌ BLOCKED:
- All public IP addresses
- Cloud provider ranges
- Internet-routable addresses
```

### Implementation
```typescript
// RFC-1918 validation example
const validator = new RFC1918Validator();
const result = validator.isBindingAllowed('192.168.1.100');

if (!result) {
  throw new Error('Public IP binding violates Ethical Security Standard');
}
```

### Security Rationale
1. **Prevents Shodan Discovery**: Public services are automatically indexed
2. **Reduces Attack Surface**: Private networks have natural isolation
3. **Compliance Evidence**: Demonstrates deliberate security implementation
4. **Industrial Protection**: ICS devices require network segmentation

## Agent Card Authentication

### Overview
Agent Cards provide cryptographic authentication and capability declaration for A2A agents.

### Agent Card Structure
```typescript
interface A2AAgentCard {
  agentId: string;        // UUIDv4 identifier
  name: string;           // Human-readable name
  description: string;    // Agent purpose
  version: string;        // Semantic version
  capabilities: A2ACapability[];
  endpoints: A2AEndpoint[];
  metadata?: Record<string, any>;
  lastSeen: Date;         // Timestamp for replay attack prevention
}
```

### Cryptographic Validation
- **UUIDv4 Agent IDs**: Cryptographically random identifiers
- **HTTPS Endpoints**: Only secure transport protocols allowed
- **Timestamp Validation**: 5-minute window to prevent replay attacks
- **Capability Verification**: Structured capability declarations

### Token Lifecycle
```typescript
// Token generation with HMAC-SHA256
const tokenManager = new SecureA2ATokenManager(logger, secretKey);
const tokenPair = await tokenManager.generateTokenPair(
  portId,
  permissions,
  3600000 // 1 hour expiry
);

// Token validation
const authResult = await tokenManager.authenticate(
  a2aToken,
  cyrealToken
);
```

## Input Validation Framework

### Message Validation
```typescript
// Comprehensive message validation
const validator = new SecureMessageValidator(logger);
const result = validator.validateMessage(incomingMessage);

if (!result.valid) {
  // Reject with specific error codes
  return createErrorResponse(-32700, 'Invalid message format');
}
```

### Protection Against
- **JSON Injection**: Strict parsing with size limits
- **Prototype Pollution**: Property validation and sanitization
- **XSS Attacks**: HTML entity encoding and script removal
- **Command Injection**: Parameter whitelisting and validation
- **Buffer Overflow**: Message size limits and bounds checking

### Validation Rules
```typescript
const validationRules = {
  maxMessageSize: 1024 * 1024,    // 1MB limit
  maxStringLength: 10000,         // String length limit
  maxArrayLength: 1000,           // Array size limit
  allowedMethods: [               // Method whitelisting
    'agent.register',
    'agent.discover',
    'serial.read',
    'serial.write'
  ]
};
```

## Network Security

### CORS Policy
```typescript
// Secure CORS implementation
private setSecureCORSHeaders(res: http.ServerResponse, origin?: string): void {
  if (origin && this.isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'null'); // No wildcard
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-ID');
}
```

### Rate Limiting
```typescript
// Per-IP rate limiting
private checkRateLimit(clientIP: string, maxRequests: number = 100): boolean {
  const windowMs = 60000; // 1 minute window
  // Implementation tracks requests per IP
  // Exponential backoff for repeat offenders
}
```

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Threat Model

### Identified Threats
1. **Public Internet Exposure**: Mitigated by RFC-1918 enforcement
2. **Unauthorized Agent Access**: Mitigated by Agent Card authentication
3. **Message Injection Attacks**: Mitigated by input validation
4. **Denial of Service**: Mitigated by rate limiting
5. **Man-in-the-Middle**: Mitigated by HTTPS-only transport

### Attack Scenarios
- **Scenario 1**: Attacker attempts to bind A2A service to public IP
  - **Mitigation**: RFC-1918 validation fails at startup
  - **Response**: Service refuses to start with detailed error message

- **Scenario 2**: Malicious agent attempts registration
  - **Mitigation**: Agent Card validation and cryptographic verification
  - **Response**: Registration rejected with audit log entry

- **Scenario 3**: Message injection attack
  - **Mitigation**: Comprehensive input validation and sanitization
  - **Response**: Invalid messages rejected with rate limiting

## Incident Response

### Security Event Logging
```typescript
// Comprehensive security logging
this.logger.warn('Security event detected', {
  type: 'authentication_failure',
  agentId: 'unknown',
  clientIP: request.ip,
  timestamp: new Date().toISOString(),
  details: 'Invalid agent card signature'
});
```

### Automated Response
1. **Rate Limiting**: Automatic IP blocking for repeated violations
2. **Token Revocation**: Immediate revocation of compromised tokens
3. **Agent Isolation**: Quarantine of suspicious agents
4. **Alert Generation**: Integration with SIEM systems

### Manual Response Procedures
1. **Immediate Assessment**: Determine scope and impact
2. **Containment**: Isolate affected systems
3. **Investigation**: Analyze logs and forensic evidence
4. **Recovery**: Restore normal operations
5. **Lessons Learned**: Update security controls

## Compliance Requirements

### IEC 62443 Industrial Cybersecurity
- **SL1**: Protection against casual or coincidental violation
- **SL2**: Protection against intentional violation using simple means
- **SL3**: Protection against intentional violation using sophisticated means
- **SL4**: Protection against state-sponsored attacks

### NIST Cybersecurity Framework
- **Identify**: Asset inventory and risk assessment
- **Protect**: Access controls and data security
- **Detect**: Continuous monitoring and detection
- **Respond**: Incident response procedures
- **Recover**: Business continuity and disaster recovery

### Data Protection
- **Encryption in Transit**: TLS 1.3 for all communications
- **Encryption at Rest**: Token storage with secure key management
- **Data Minimization**: Only collect necessary information
- **Audit Trails**: Comprehensive logging with retention policies

## Security Testing

### Penetration Testing
```bash
# Network security testing
nmap -sS -O target_ip
nikto -h https://target_ip:3500

# Application security testing
sqlmap -u "https://target_ip:3500/a2a" --data="..."
owasp-zap-cli quick-scan https://target_ip:3500
```

### Vulnerability Assessment
- **Automated Scanning**: Integration with security tools
- **Code Review**: Static analysis and peer review
- **Dependency Scanning**: Third-party library vulnerabilities
- **Configuration Review**: Security settings validation

### Security Metrics
```typescript
interface SecurityMetrics {
  authenticationFailures: number;
  rfc1918Violations: number;
  rateLimitExceeded: number;
  messageValidationErrors: number;
  tokenRevocations: number;
  securityIncidents: number;
}
```

## Implementation Checklist

### Deployment Security
- [ ] RFC-1918 enforcement enabled
- [ ] HTTPS certificates properly configured
- [ ] Agent Card validation implemented
- [ ] Rate limiting configured
- [ ] Security logging enabled
- [ ] Incident response procedures documented

### Ongoing Maintenance
- [ ] Regular security updates
- [ ] Token rotation procedures
- [ ] Log monitoring and analysis
- [ ] Vulnerability assessments
- [ ] Compliance audits
- [ ] Staff security training

## References

- [IEC 62443 Industrial Cybersecurity](https://www.iec.ch/cyber-security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Security Guidelines](https://owasp.org/)
- [RFC 1918 - Address Allocation for Private Internets](https://tools.ietf.org/html/rfc1918)
- [RFC 7519 - JSON Web Tokens](https://tools.ietf.org/html/rfc7519)

---

**For questions or security concerns, contact the Cyreal security team.**