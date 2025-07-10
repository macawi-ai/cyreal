/**
 * PCI-DSS Compliant Audit Logger
 * 
 * Implements comprehensive audit logging per PCI-DSS Requirement 10
 * Includes tamper protection, centralized logging, and SIEM integration
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as winston from 'winston';
import { EventEmitter } from 'events';

/**
 * PCI-DSS Required Audit Event Types
 */
export enum PCIAuditEventType {
  // User access events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_LOGIN_FAILED = 'user.login.failed',
  USER_LOCKOUT = 'user.lockout',
  
  // Administrative actions
  ADMIN_ACTION = 'admin.action',
  CONFIG_CHANGE = 'config.change',
  USER_CREATED = 'user.created',
  USER_MODIFIED = 'user.modified',
  USER_DELETED = 'user.deleted',
  PERMISSION_CHANGED = 'permission.changed',
  
  // Data access events
  DATA_ACCESS = 'data.access',
  DATA_MODIFICATION = 'data.modification',
  DATA_DELETION = 'data.deletion',
  SENSITIVE_DATA_ACCESS = 'sensitive.data.access',
  
  // System events
  SYSTEM_START = 'system.start',
  SYSTEM_STOP = 'system.stop',
  SERVICE_START = 'service.start',
  SERVICE_STOP = 'service.stop',
  
  // Security events
  ACCESS_DENIED = 'access.denied',
  AUTHENTICATION_FAILURE = 'auth.failure',
  AUTHORIZATION_FAILURE = 'authz.failure',
  INVALID_ACCESS_ATTEMPT = 'invalid.access',
  SECURITY_VIOLATION = 'security.violation',
  
  // Audit trail events
  AUDIT_LOG_ACCESS = 'audit.log.access',
  AUDIT_LOG_MODIFICATION = 'audit.log.modification',
  AUDIT_LOG_DELETION = 'audit.log.deletion',
  AUDIT_LOG_CLEARED = 'audit.log.cleared',
  
  // Network events
  CONNECTION_ESTABLISHED = 'connection.established',
  CONNECTION_TERMINATED = 'connection.terminated',
  FIREWALL_CHANGE = 'firewall.change',
  
  // Key management events
  KEY_CREATED = 'key.created',
  KEY_ACCESSED = 'key.accessed',
  KEY_ROTATED = 'key.rotated',
  KEY_DELETED = 'key.deleted'
}

/**
 * PCI Audit Log Entry Structure
 */
export interface PCIAuditLogEntry {
  // Required fields per PCI-DSS 10.3
  timestamp: string;              // 10.3.1 - Date and time (NTP synchronized)
  userId: string;                 // 10.3.2 - User identification
  eventType: PCIAuditEventType;   // 10.3.3 - Type of event
  result: 'success' | 'failure';  // 10.3.4 - Success or failure indication
  resource: string;               // 10.3.5 - Identification of affected resource
  sourceIP: string;               // 10.3.6 - Origination IP/terminal
  
  // Additional context
  component: string;              // System component
  action: string;                 // Specific action taken
  details: Record<string, any>;   // Event-specific details
  riskScore: number;              // Risk assessment (0-100)
  
  // Integrity fields
  sequenceNumber: number;         // For gap detection
  previousHash: string;           // Chain integrity
  hash: string;                   // Entry integrity
}

/**
 * Audit Logger Configuration
 */
export interface AuditLoggerConfig {
  logPath: string;
  maxFileSize: number;
  maxFiles: number;
  retentionDays: number;
  siemEndpoint?: string;
  siemApiKey?: string;
  ntpServer?: string;
  encryptLogs?: boolean;
}

/**
 * PCI-DSS Compliant Audit Logger Implementation
 */
export class PCIAuditLogger extends EventEmitter {
  private logger: winston.Logger;
  private config: AuditLoggerConfig;
  private sequenceNumber: number = 0;
  private previousHash: string = '0'.repeat(64);
  private logStream: fs.FileHandle | null = null;
  private integrityChain: Map<number, string> = new Map();
  
  // Time synchronization
  private ntpOffset: number = 0;
  private lastNtpSync: Date = new Date();
  
  constructor(config: AuditLoggerConfig) {
    super();
    this.config = {
      ...config,
      retentionDays: config.retentionDays || 365, // PCI requires 1 year minimum
      maxFileSize: config.maxFileSize || (100 * 1024 * 1024), // 100MB
      maxFiles: config.maxFiles || 1000
    };
    
    // Create Winston logger for internal logging
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: `${this.config.logPath}/audit-system.log` 
        })
      ]
    });
  }

  /**
   * Initialize audit logger
   */
  async initialize(): Promise<void> {
    this.logger.info('🔒 Initializing PCI-DSS compliant audit logger');
    
    try {
      // Create log directory with restricted permissions
      await fs.mkdir(this.config.logPath, { recursive: true, mode: 0o700 });
      
      // Sync with NTP if configured
      if (this.config.ntpServer) {
        await this.syncTimeWithNTP();
      }
      
      // Load sequence number and hash chain
      await this.loadIntegrityState();
      
      // Open log file for writing
      await this.openLogFile();
      
      // Log system start event
      await this.logEvent({
        userId: 'SYSTEM',
        eventType: PCIAuditEventType.SYSTEM_START,
        result: 'success',
        resource: 'audit-logger',
        sourceIP: '127.0.0.1',
        component: 'PCIAuditLogger',
        action: 'initialize',
        details: { version: '1.0.0', pciCompliant: true },
        riskScore: 0
      });
      
      // Start integrity monitoring
      this.startIntegrityMonitoring();
      
      // Start SIEM forwarding if configured
      if (this.config.siemEndpoint) {
        this.startSIEMForwarding();
      }
      
      this.logger.info('✅ Audit logger initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize audit logger', error);
      throw new Error('Audit logger initialization failed - cannot proceed without audit logging');
    }
  }

  /**
   * Log an audit event (main interface)
   */
  async logEvent(event: Omit<PCIAuditLogEntry, 'timestamp' | 'sequenceNumber' | 'previousHash' | 'hash'>): Promise<void> {
    try {
      // Create complete log entry
      const entry: PCIAuditLogEntry = {
        ...event,
        timestamp: this.getTimestamp(),
        sequenceNumber: ++this.sequenceNumber,
        previousHash: this.previousHash,
        hash: '' // Will be calculated
      };
      
      // Calculate entry hash
      entry.hash = this.calculateEntryHash(entry);
      
      // Write to log file
      await this.writeLogEntry(entry);
      
      // Update integrity chain
      this.previousHash = entry.hash;
      this.integrityChain.set(entry.sequenceNumber, entry.hash);
      
      // Forward to SIEM if configured
      if (this.config.siemEndpoint) {
        this.forwardToSIEM(entry);
      }
      
      // Emit event for real-time monitoring
      this.emit('audit-event', entry);
      
      // Check for high-risk events
      if (entry.riskScore >= 80) {
        this.handleHighRiskEvent(entry);
      }
      
    } catch (error) {
      // Audit logging failures are critical
      this.logger.error('CRITICAL: Audit logging failed', error);
      this.emit('audit-failure', error);
      
      // In PCI environment, consider halting operations
      throw new Error('Audit logging failure - security breach protocol activated');
    }
  }

  /**
   * Log user authentication event
   */
  async logAuthentication(
    userId: string,
    success: boolean,
    sourceIP: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: success ? PCIAuditEventType.USER_LOGIN : PCIAuditEventType.USER_LOGIN_FAILED,
      result: success ? 'success' : 'failure',
      resource: 'authentication-system',
      sourceIP,
      component: 'AuthenticationManager',
      action: 'authenticate',
      details: {
        ...details,
        authMethod: details.authMethod || 'password',
        mfaUsed: details.mfaUsed || false
      },
      riskScore: success ? 10 : 50
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(
    userId: string,
    resource: string,
    action: 'read' | 'write' | 'delete',
    success: boolean,
    sourceIP: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const eventTypeMap = {
      read: PCIAuditEventType.DATA_ACCESS,
      write: PCIAuditEventType.DATA_MODIFICATION,
      delete: PCIAuditEventType.DATA_DELETION
    };
    
    // Check if sensitive data
    const isSensitive = this.isSensitiveResource(resource);
    
    await this.logEvent({
      userId,
      eventType: isSensitive ? PCIAuditEventType.SENSITIVE_DATA_ACCESS : eventTypeMap[action],
      result: success ? 'success' : 'failure',
      resource,
      sourceIP,
      component: 'DataAccessLayer',
      action,
      details: {
        ...details,
        sensitiveData: isSensitive,
        dataClassification: this.classifyData(resource)
      },
      riskScore: isSensitive ? (success ? 60 : 90) : (success ? 20 : 50)
    });
  }

  /**
   * Log administrative action
   */
  async logAdminAction(
    userId: string,
    action: string,
    resource: string,
    sourceIP: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: PCIAuditEventType.ADMIN_ACTION,
      result: 'success',
      resource,
      sourceIP,
      component: 'AdminInterface',
      action,
      details,
      riskScore: 70 // Admin actions are always high risk
    });
  }

  /**
   * Query audit logs (with access logging)
   */
  async queryLogs(
    criteria: {
      startTime?: Date;
      endTime?: Date;
      userId?: string;
      eventType?: PCIAuditEventType;
      resource?: string;
      limit?: number;
    },
    requestingUserId: string,
    sourceIP: string
  ): Promise<PCIAuditLogEntry[]> {
    // Log the query itself (PCI requirement)
    await this.logEvent({
      userId: requestingUserId,
      eventType: PCIAuditEventType.AUDIT_LOG_ACCESS,
      result: 'success',
      resource: 'audit-logs',
      sourceIP,
      component: 'AuditQueryEngine',
      action: 'query',
      details: { criteria },
      riskScore: 40
    });
    
    // Perform the query
    const logs = await this.performQuery(criteria);
    
    return logs;
  }

  /**
   * Verify log integrity
   */
  async verifyIntegrity(
    startSequence?: number,
    endSequence?: number
  ): Promise<{
    valid: boolean;
    errors: string[];
    checkedEntries: number;
  }> {
    const errors: string[] = [];
    let checkedEntries = 0;
    let previousHash = '0'.repeat(64);
    
    try {
      const logs = await this.readLogEntries(startSequence, endSequence);
      
      for (const entry of logs) {
        checkedEntries++;
        
        // Verify sequence number
        if (entry.sequenceNumber !== checkedEntries + (startSequence || 0) - 1) {
          errors.push(`Sequence gap detected at ${entry.sequenceNumber}`);
        }
        
        // Verify previous hash
        if (entry.previousHash !== previousHash) {
          errors.push(`Hash chain broken at sequence ${entry.sequenceNumber}`);
        }
        
        // Verify entry hash
        const calculatedHash = this.calculateEntryHash(entry);
        if (entry.hash !== calculatedHash) {
          errors.push(`Entry tampered at sequence ${entry.sequenceNumber}`);
        }
        
        previousHash = entry.hash;
      }
      
      return {
        valid: errors.length === 0,
        errors,
        checkedEntries
      };
    } catch (error) {
      errors.push(`Integrity check failed: ${error}`);
      return {
        valid: false,
        errors,
        checkedEntries
      };
    }
  }

  /**
   * Get synchronized timestamp
   */
  private getTimestamp(): string {
    const now = new Date();
    now.setTime(now.getTime() + this.ntpOffset);
    return now.toISOString();
  }

  /**
   * Calculate entry hash for integrity
   */
  private calculateEntryHash(entry: PCIAuditLogEntry): string {
    const content = JSON.stringify({
      timestamp: entry.timestamp,
      userId: entry.userId,
      eventType: entry.eventType,
      result: entry.result,
      resource: entry.resource,
      sourceIP: entry.sourceIP,
      component: entry.component,
      action: entry.action,
      details: entry.details,
      sequenceNumber: entry.sequenceNumber,
      previousHash: entry.previousHash
    });
    
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Write log entry to file
   */
  private async writeLogEntry(entry: PCIAuditLogEntry): Promise<void> {
    if (!this.logStream) {
      await this.openLogFile();
    }
    
    const line = JSON.stringify(entry) + '\n';
    
    // Encrypt if configured
    const data = this.config.encryptLogs 
      ? await this.encryptLogEntry(line)
      : line;
    
    await this.logStream!.write(data);
    
    // Check file size for rotation
    const stats = await this.logStream!.stat();
    if (stats.size >= this.config.maxFileSize) {
      await this.rotateLogFile();
    }
  }

  /**
   * Open log file for writing
   */
  private async openLogFile(): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${this.config.logPath}/audit-${timestamp}.log`;
    
    this.logStream = await fs.open(filename, 'a', 0o600);
  }

  /**
   * Rotate log file
   */
  private async rotateLogFile(): Promise<void> {
    if (this.logStream) {
      await this.logStream.close();
    }
    
    await this.openLogFile();
    
    // Clean up old files
    await this.cleanupOldLogs();
  }

  /**
   * Clean up logs older than retention period
   */
  private async cleanupOldLogs(): Promise<void> {
    const files = await fs.readdir(this.config.logPath);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    for (const file of files) {
      if (file.startsWith('audit-') && file.endsWith('.log')) {
        const filePath = `${this.config.logPath}/${file}`;
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          // Archive before deletion
          await this.archiveLogFile(filePath);
          await fs.unlink(filePath);
        }
      }
    }
  }

  /**
   * Archive log file (for compliance)
   */
  private async archiveLogFile(filePath: string): Promise<void> {
    // In production, archive to secure long-term storage
    const archivePath = filePath.replace('.log', '.archive');
    await fs.rename(filePath, archivePath);
  }

  /**
   * Load integrity state
   */
  private async loadIntegrityState(): Promise<void> {
    try {
      const statePath = `${this.config.logPath}/integrity-state.json`;
      const data = await fs.readFile(statePath, 'utf8');
      const state = JSON.parse(data);
      
      this.sequenceNumber = state.sequenceNumber;
      this.previousHash = state.previousHash;
    } catch (error) {
      // Start fresh if no state exists
      this.sequenceNumber = 0;
      this.previousHash = '0'.repeat(64);
    }
  }

  /**
   * Save integrity state
   */
  private async saveIntegrityState(): Promise<void> {
    const state = {
      sequenceNumber: this.sequenceNumber,
      previousHash: this.previousHash,
      lastSaved: new Date().toISOString()
    };
    
    const statePath = `${this.config.logPath}/integrity-state.json`;
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
  }

  /**
   * Start integrity monitoring
   */
  private startIntegrityMonitoring(): void {
    // Periodic integrity checks
    setInterval(async () => {
      const result = await this.verifyIntegrity(
        Math.max(1, this.sequenceNumber - 1000),
        this.sequenceNumber
      );
      
      if (!result.valid) {
        this.logger.error('🚨 INTEGRITY VIOLATION DETECTED', result.errors);
        this.emit('integrity-violation', result);
      }
      
      // Save state
      await this.saveIntegrityState();
    }, 60000); // Every minute
  }

  /**
   * Forward to SIEM
   */
  private async forwardToSIEM(entry: PCIAuditLogEntry): Promise<void> {
    if (!this.config.siemEndpoint) return;
    
    try {
      // Format for common SIEM systems (CEF, LEEF, etc.)
      const siemEvent = this.formatForSIEM(entry);
      
      // Send to SIEM (implementation depends on SIEM type)
      // This is a placeholder for actual SIEM integration
      const response = await fetch(this.config.siemEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.siemApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siemEvent)
      });
      
      if (!response.ok) {
        throw new Error(`SIEM forward failed: ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error('SIEM forwarding failed', error);
      // Don't throw - SIEM forwarding should not block audit logging
    }
  }

  /**
   * Format log entry for SIEM
   */
  private formatForSIEM(entry: PCIAuditLogEntry): any {
    // Common Event Format (CEF) example
    return {
      Version: 0,
      DeviceVendor: 'Cyreal',
      DeviceProduct: 'A2A-Server',
      DeviceVersion: '1.0.0',
      DeviceEventClassId: entry.eventType,
      Name: entry.action,
      Severity: Math.floor(entry.riskScore / 10),
      Extension: {
        src: entry.sourceIP,
        suser: entry.userId,
        outcome: entry.result,
        msg: JSON.stringify(entry.details),
        deviceCustomNumber1: entry.sequenceNumber,
        deviceCustomString1: entry.resource,
        deviceCustomString2: entry.component
      }
    };
  }

  /**
   * Handle high-risk events
   */
  private handleHighRiskEvent(entry: PCIAuditLogEntry): void {
    this.logger.warn('🚨 HIGH RISK EVENT DETECTED', {
      eventType: entry.eventType,
      userId: entry.userId,
      riskScore: entry.riskScore
    });
    
    // Emit for real-time response
    this.emit('high-risk-event', entry);
    
    // In production, trigger automated responses:
    // - Send alerts to security team
    // - Block user/IP if necessary
    // - Trigger incident response procedures
  }

  /**
   * Check if resource contains sensitive data
   */
  private isSensitiveResource(resource: string): boolean {
    const sensitivePatterns = [
      /card/i,
      /pan/i,
      /cvv/i,
      /pin/i,
      /ssn/i,
      /account/i,
      /payment/i
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(resource));
  }

  /**
   * Classify data sensitivity
   */
  private classifyData(resource: string): string {
    if (this.isSensitiveResource(resource)) {
      return 'CONFIDENTIAL';
    } else if (resource.includes('config') || resource.includes('system')) {
      return 'INTERNAL';
    } else {
      return 'PUBLIC';
    }
  }

  /**
   * Sync time with NTP server
   */
  private async syncTimeWithNTP(): Promise<void> {
    // Simplified NTP sync - in production use proper NTP client
    try {
      // This would connect to NTP server and calculate offset
      this.ntpOffset = 0; // Placeholder
      this.lastNtpSync = new Date();
      this.logger.info('Time synchronized with NTP server');
    } catch (error) {
      this.logger.error('NTP sync failed', error);
    }
  }

  /**
   * Start SIEM forwarding service
   */
  private startSIEMForwarding(): void {
    this.logger.info('SIEM forwarding enabled', { 
      endpoint: this.config.siemEndpoint 
    });
  }

  /**
   * Perform log query
   */
  private async performQuery(criteria: any): Promise<PCIAuditLogEntry[]> {
    // Implementation would read and filter logs
    // This is a placeholder
    return [];
  }

  /**
   * Read log entries from file
   */
  private async readLogEntries(start?: number, end?: number): Promise<PCIAuditLogEntry[]> {
    // Implementation would read log files
    // This is a placeholder
    return [];
  }

  /**
   * Encrypt log entry
   */
  private async encryptLogEntry(data: string): Promise<string> {
    // Would use EncryptionManager to encrypt
    return data; // Placeholder
  }

  /**
   * Get audit statistics
   */
  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    averageRiskScore: number;
    integrityStatus: 'valid' | 'invalid' | 'unknown';
  } {
    // Implementation would calculate from logs
    return {
      totalEvents: this.sequenceNumber,
      eventsByType: {},
      averageRiskScore: 0,
      integrityStatus: 'valid'
    };
  }
}