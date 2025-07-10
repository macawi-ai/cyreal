/**
 * PCI-DSS Compliant User Authentication System
 * 
 * Implements individual user authentication per PCI-DSS Requirement 8
 * Includes password policies, MFA, and account lockout
 */

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as winston from 'winston';
import { PCIAuditLogger, PCIAuditEventType } from './pci-audit-logger';

/**
 * User account structure
 */
export interface User {
  userId: string;                    // Unique user ID
  username: string;                  // Unique username
  email: string;                     // Email address
  passwordHash: string;              // Bcrypt hash
  passwordHistory: string[];         // Last 4 password hashes
  passwordLastChanged: Date;         // For 90-day expiration
  mfaEnabled: boolean;              // MFA requirement
  mfaSecret?: string;               // TOTP secret
  mfaBackupCodes?: string[];        // Backup codes
  role: UserRole;                   // User role
  permissions: Permission[];         // Specific permissions
  status: UserStatus;               // Account status
  failedLoginAttempts: number;      // For lockout
  lastFailedLogin?: Date;           // For lockout timing
  lastSuccessfulLogin?: Date;       // Audit trail
  createdAt: Date;                  // Account creation
  createdBy: string;                // Who created account
  modifiedAt: Date;                 // Last modification
  modifiedBy: string;               // Who modified
  mustChangePassword: boolean;      // Force password change
  sessions: UserSession[];          // Active sessions
}

/**
 * User roles (PCI-DSS Requirement 7)
 */
export enum UserRole {
  ADMIN = 'admin',                  // Full system access
  OPERATOR = 'operator',            // Day-to-day operations
  VIEWER = 'viewer',                // Read-only access
  AUDITOR = 'auditor',              // Audit log access
  API_USER = 'api_user'             // Programmatic access
}

/**
 * Granular permissions
 */
export enum Permission {
  // System permissions
  SYSTEM_CONFIG_READ = 'system.config.read',
  SYSTEM_CONFIG_WRITE = 'system.config.write',
  SYSTEM_RESTART = 'system.restart',
  
  // User management
  USER_CREATE = 'user.create',
  USER_READ = 'user.read',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_UNLOCK = 'user.unlock',
  
  // Data access
  DATA_READ = 'data.read',
  DATA_WRITE = 'data.write',
  DATA_DELETE = 'data.delete',
  SENSITIVE_DATA_ACCESS = 'sensitive.data.access',
  
  // Audit access
  AUDIT_READ = 'audit.read',
  AUDIT_EXPORT = 'audit.export',
  
  // Security operations
  SECURITY_CONFIG = 'security.config',
  KEY_MANAGEMENT = 'key.management',
  
  // Agent operations
  AGENT_REGISTER = 'agent.register',
  AGENT_MANAGE = 'agent.manage'
}

/**
 * User account status
 */
export enum UserStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',                // Too many failed logins
  SUSPENDED = 'suspended',          // Admin suspended
  EXPIRED = 'expired',              // Password expired
  PENDING_ACTIVATION = 'pending'    // Awaiting activation
}

/**
 * User session
 */
export interface UserSession {
  sessionId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  sourceIP: string;
  userAgent: string;
  lastActivity: Date;
}

/**
 * Password policy configuration (PCI-DSS 8.2.3)
 */
export interface PasswordPolicy {
  minLength: number;                // Minimum 7 per PCI
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number;                   // Days (90 for PCI)
  historyCount: number;             // Previous passwords (4 for PCI)
  maxLoginAttempts: number;         // Before lockout (6 for PCI)
  lockoutDuration: number;          // Minutes (30 for PCI)
  sessionTimeout: number;           // Minutes (15 for PCI)
  mfaRequired: boolean;             // For all users
}

/**
 * User authentication result
 */
export interface UserAuthResult {
  success: boolean;
  userId?: string;
  token?: string;
  mfaRequired?: boolean;
  mustChangePassword?: boolean;
  error?: string;
  remainingAttempts?: number;
}

/**
 * PCI-DSS Compliant User Authentication Manager
 */
export class UserAuthenticationManager {
  private users: Map<string, User> = new Map();
  private usersByUsername: Map<string, string> = new Map(); // username -> userId
  private activeSessions: Map<string, UserSession> = new Map();
  private logger: winston.Logger;
  private auditLogger: PCIAuditLogger;
  
  private readonly policy: PasswordPolicy = {
    minLength: 7,                   // PCI minimum
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90,                     // PCI: 90 days
    historyCount: 4,                // PCI: Last 4 passwords
    maxLoginAttempts: 6,            // PCI: Max 6 attempts
    lockoutDuration: 30,            // PCI: 30 minutes
    sessionTimeout: 15,             // PCI: 15 minutes idle
    mfaRequired: true               // Best practice
  };
  
  // Default role permissions
  private readonly rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: Object.values(Permission), // All permissions
    [UserRole.OPERATOR]: [
      Permission.SYSTEM_CONFIG_READ,
      Permission.DATA_READ,
      Permission.DATA_WRITE,
      Permission.AGENT_REGISTER,
      Permission.AGENT_MANAGE
    ],
    [UserRole.VIEWER]: [
      Permission.SYSTEM_CONFIG_READ,
      Permission.DATA_READ,
      Permission.USER_READ
    ],
    [UserRole.AUDITOR]: [
      Permission.AUDIT_READ,
      Permission.AUDIT_EXPORT,
      Permission.USER_READ
    ],
    [UserRole.API_USER]: [
      Permission.DATA_READ,
      Permission.AGENT_REGISTER
    ]
  };

  constructor(logger: winston.Logger, auditLogger: PCIAuditLogger) {
    this.logger = logger;
    this.auditLogger = auditLogger;
  }

  /**
   * Initialize authentication manager
   */
  async initialize(): Promise<void> {
    this.logger.info('🔐 Initializing PCI-DSS compliant authentication system');
    
    // Create default admin if none exists
    if (this.users.size === 0) {
      await this.createDefaultAdmin();
    }
    
    // Start session cleanup
    this.startSessionCleanup();
    
    // Start password expiration checks
    this.startPasswordExpirationChecks();
    
    this.logger.info('✅ Authentication system initialized');
  }

  /**
   * Create a new user
   */
  async createUser(
    creatingUserId: string,
    userData: {
      username: string;
      email: string;
      password: string;
      role: UserRole;
      permissions?: Permission[];
    },
    sourceIP: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Check if creating user has permission
      if (!await this.checkPermission(creatingUserId, Permission.USER_CREATE)) {
        await this.auditLogger.logEvent({
          userId: creatingUserId,
          eventType: PCIAuditEventType.AUTHORIZATION_FAILURE,
          result: 'failure',
          resource: 'user-management',
          sourceIP,
          component: 'UserAuthentication',
          action: 'create-user-denied',
          details: { reason: 'insufficient-permissions' },
          riskScore: 60
        });
        
        return { success: false, error: 'Insufficient permissions' };
      }
      
      // Validate username uniqueness
      if (this.usersByUsername.has(userData.username)) {
        return { success: false, error: 'Username already exists' };
      }
      
      // Validate password policy
      const passwordValidation = this.validatePassword(userData.password);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.errors.join(', ') };
      }
      
      // Generate user ID
      const userId = `usr_${uuidv4()}`;
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user: User = {
        userId,
        username: userData.username,
        email: userData.email,
        passwordHash,
        passwordHistory: [passwordHash],
        passwordLastChanged: new Date(),
        mfaEnabled: this.policy.mfaRequired,
        role: userData.role,
        permissions: userData.permissions || this.rolePermissions[userData.role] || [],
        status: UserStatus.PENDING_ACTIVATION,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        createdBy: creatingUserId,
        modifiedAt: new Date(),
        modifiedBy: creatingUserId,
        mustChangePassword: true, // Force password change on first login
        sessions: []
      };
      
      // If MFA required, generate secret
      if (this.policy.mfaRequired) {
        const secret = speakeasy.generateSecret({
          name: `Cyreal:${userData.username}`,
          issuer: 'Cyreal A2A'
        });
        user.mfaSecret = secret.base32;
        user.mfaBackupCodes = this.generateBackupCodes();
      }
      
      // Store user
      this.users.set(userId, user);
      this.usersByUsername.set(userData.username, userId);
      
      // Audit log
      await this.auditLogger.logEvent({
        userId: creatingUserId,
        eventType: PCIAuditEventType.USER_CREATED,
        result: 'success',
        resource: userId,
        sourceIP,
        component: 'UserAuthentication',
        action: 'create-user',
        details: {
          newUserId: userId,
          username: userData.username,
          role: userData.role
        },
        riskScore: 40
      });
      
      this.logger.info('User created successfully', { userId, username: userData.username });
      
      return { success: true, userId };
      
    } catch (error) {
      this.logger.error('User creation failed', error);
      return { success: false, error: 'User creation failed' };
    }
  }

  /**
   * Authenticate user with username and password
   */
  async authenticateUser(
    username: string,
    password: string,
    sourceIP: string,
    userAgent: string
  ): Promise<UserAuthResult> {
    try {
      // Get user by username
      const userId = this.usersByUsername.get(username);
      if (!userId) {
        await this.auditLogger.logAuthentication(
          username,
          false,
          sourceIP,
          { reason: 'user-not-found' }
        );
        return { success: false, error: 'Invalid credentials' };
      }
      
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }
      
      // Check account status
      if (user.status === UserStatus.LOCKED) {
        // Check if lockout period has passed
        if (user.lastFailedLogin) {
          const lockoutEnd = new Date(user.lastFailedLogin.getTime() + this.policy.lockoutDuration * 60000);
          if (new Date() < lockoutEnd) {
            await this.auditLogger.logAuthentication(
              userId,
              false,
              sourceIP,
              { reason: 'account-locked' }
            );
            return { success: false, error: 'Account locked' };
          } else {
            // Unlock account
            user.status = UserStatus.ACTIVE;
            user.failedLoginAttempts = 0;
          }
        }
      }
      
      if (user.status === UserStatus.SUSPENDED) {
        await this.auditLogger.logAuthentication(
          userId,
          false,
          sourceIP,
          { reason: 'account-suspended' }
        );
        return { success: false, error: 'Account suspended' };
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        // Increment failed attempts
        user.failedLoginAttempts++;
        user.lastFailedLogin = new Date();
        
        // Lock account if max attempts reached
        if (user.failedLoginAttempts >= this.policy.maxLoginAttempts) {
          user.status = UserStatus.LOCKED;
          
          await this.auditLogger.logEvent({
            userId,
            eventType: PCIAuditEventType.USER_LOCKOUT,
            result: 'success',
            resource: userId,
            sourceIP,
            component: 'UserAuthentication',
            action: 'account-lockout',
            details: { attempts: user.failedLoginAttempts },
            riskScore: 80
          });
        }
        
        await this.auditLogger.logAuthentication(
          userId,
          false,
          sourceIP,
          { 
            reason: 'invalid-password',
            attempts: user.failedLoginAttempts
          }
        );
        
        return { 
          success: false, 
          error: 'Invalid credentials',
          remainingAttempts: Math.max(0, this.policy.maxLoginAttempts - user.failedLoginAttempts)
        };
      }
      
      // Check password expiration
      const passwordAge = Math.floor((Date.now() - user.passwordLastChanged.getTime()) / (24 * 60 * 60 * 1000));
      if (passwordAge > this.policy.maxAge) {
        user.status = UserStatus.EXPIRED;
        user.mustChangePassword = true;
      }
      
      // Reset failed attempts on successful password
      user.failedLoginAttempts = 0;
      user.lastSuccessfulLogin = new Date();
      
      // Check if MFA is required
      if (user.mfaEnabled) {
        // Return success but indicate MFA required
        return {
          success: true,
          userId,
          mfaRequired: true,
          mustChangePassword: user.mustChangePassword
        };
      }
      
      // Create session
      const session = await this.createSession(user, sourceIP, userAgent);
      
      // Audit successful login
      await this.auditLogger.logAuthentication(
        userId,
        true,
        sourceIP,
        { 
          mfaUsed: false,
          sessionId: session.sessionId
        }
      );
      
      return {
        success: true,
        userId,
        token: session.token,
        mustChangePassword: user.mustChangePassword
      };
      
    } catch (error) {
      this.logger.error('Authentication error', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Verify MFA token
   */
  async verifyMFA(
    userId: string,
    token: string,
    sourceIP: string,
    userAgent: string
  ): Promise<UserAuthResult> {
    try {
      const user = this.users.get(userId);
      if (!user || !user.mfaSecret) {
        return { success: false, error: 'Invalid MFA setup' };
      }
      
      // Verify TOTP token
      let verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps for clock drift
      });
      
      if (!verified) {
        // Check backup codes
        const backupIndex = user.mfaBackupCodes?.indexOf(token) ?? -1;
        if (backupIndex >= 0) {
          // Remove used backup code
          user.mfaBackupCodes!.splice(backupIndex, 1);
          verified = true;
        }
      }
      
      if (!verified) {
        await this.auditLogger.logAuthentication(
          userId,
          false,
          sourceIP,
          { 
            reason: 'invalid-mfa-token',
            mfaUsed: true
          }
        );
        
        return { success: false, error: 'Invalid MFA token' };
      }
      
      // Create session
      const session = await this.createSession(user, sourceIP, userAgent);
      
      // Audit successful login with MFA
      await this.auditLogger.logAuthentication(
        userId,
        true,
        sourceIP,
        { 
          mfaUsed: true,
          sessionId: session.sessionId
        }
      );
      
      return {
        success: true,
        userId,
        token: session.token,
        mustChangePassword: user.mustChangePassword
      };
      
    } catch (error) {
      this.logger.error('MFA verification error', error);
      return { success: false, error: 'MFA verification failed' };
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    sourceIP: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        await this.auditLogger.logEvent({
          userId,
          eventType: PCIAuditEventType.AUTHENTICATION_FAILURE,
          result: 'failure',
          resource: userId,
          sourceIP,
          component: 'UserAuthentication',
          action: 'change-password',
          details: { reason: 'invalid-current-password' },
          riskScore: 50
        });
        
        return { success: false, error: 'Invalid current password' };
      }
      
      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }
      
      // Check password history
      for (const oldHash of user.passwordHistory) {
        if (await bcrypt.compare(newPassword, oldHash)) {
          return { 
            success: false, 
            error: `Cannot reuse last ${this.policy.historyCount} passwords` 
          };
        }
      }
      
      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 12);
      
      // Update user
      user.passwordHash = newHash;
      user.passwordHistory.push(newHash);
      if (user.passwordHistory.length > this.policy.historyCount) {
        user.passwordHistory.shift();
      }
      user.passwordLastChanged = new Date();
      user.mustChangePassword = false;
      user.status = UserStatus.ACTIVE;
      user.modifiedAt = new Date();
      user.modifiedBy = userId;
      
      // Invalidate all sessions
      this.invalidateUserSessions(userId);
      
      // Audit log
      await this.auditLogger.logEvent({
        userId,
        eventType: PCIAuditEventType.CONFIG_CHANGE,
        result: 'success',
        resource: userId,
        sourceIP,
        component: 'UserAuthentication',
        action: 'password-changed',
        details: { enforced: user.mustChangePassword },
        riskScore: 30
      });
      
      return { success: true };
      
    } catch (error) {
      this.logger.error('Password change error', error);
      return { success: false, error: 'Password change failed' };
    }
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<{
    valid: boolean;
    userId?: string;
    session?: UserSession;
  }> {
    const session = this.activeSessions.get(token);
    if (!session) {
      return { valid: false };
    }
    
    // Check expiration
    if (new Date() > session.expiresAt) {
      this.activeSessions.delete(token);
      return { valid: false };
    }
    
    // Check idle timeout
    const idleTime = Date.now() - session.lastActivity.getTime();
    if (idleTime > this.policy.sessionTimeout * 60000) {
      this.activeSessions.delete(token);
      return { valid: false };
    }
    
    // Update last activity
    session.lastActivity = new Date();
    
    // Get user
    const user = this.users.get(session.sessionId.split('_')[1]); // Extract userId
    if (!user || user.status !== UserStatus.ACTIVE) {
      this.activeSessions.delete(token);
      return { valid: false };
    }
    
    return {
      valid: true,
      userId: user.userId,
      session
    };
  }

  /**
   * Check user permission
   */
  async checkPermission(userId: string, permission: Permission): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      return false;
    }
    
    return user.permissions.includes(permission);
  }

  /**
   * Get MFA QR code for user
   */
  async getMFAQRCode(userId: string): Promise<string | null> {
    const user = this.users.get(userId);
    if (!user || !user.mfaSecret) {
      return null;
    }
    
    const otpauth = speakeasy.otpauthURL({
      secret: user.mfaSecret,
      label: user.username,
      issuer: 'Cyreal A2A',
      encoding: 'base32'
    });
    
    return await qrcode.toDataURL(otpauth);
  }

  /**
   * Validate password against policy
   */
  private validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters`);
    }
    
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }
    
    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }
    
    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain numbers');
    }
    
    if (this.policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special characters');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create user session
   */
  private async createSession(
    user: User,
    sourceIP: string,
    userAgent: string
  ): Promise<UserSession> {
    const sessionId = `ses_${user.userId}_${uuidv4()}`;
    const token = crypto.randomBytes(32).toString('hex');
    
    const session: UserSession = {
      sessionId,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      sourceIP,
      userAgent,
      lastActivity: new Date()
    };
    
    // Store session
    this.activeSessions.set(token, session);
    user.sessions.push(session);
    
    // Clean old sessions
    user.sessions = user.sessions.filter(s => s.expiresAt > new Date());
    
    return session;
  }

  /**
   * Invalidate all user sessions
   */
  private invalidateUserSessions(userId: string): void {
    const user = this.users.get(userId);
    if (!user) return;
    
    // Remove from active sessions
    for (const session of user.sessions) {
      this.activeSessions.delete(session.token);
    }
    
    // Clear user sessions
    user.sessions = [];
  }

  /**
   * Generate MFA backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Create default admin user
   */
  private async createDefaultAdmin(): Promise<void> {
    const adminPassword = process.env.CYREAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    
    const result = await this.createUser(
      'SYSTEM',
      {
        username: 'admin',
        email: 'admin@localhost',
        password: adminPassword,
        role: UserRole.ADMIN
      },
      '127.0.0.1'
    );
    
    if (result.success) {
      this.logger.warn('🔐 DEFAULT ADMIN CREATED', {
        username: 'admin',
        password: process.env.CYREAL_ADMIN_PASSWORD ? 'FROM_ENV' : adminPassword,
        message: 'CHANGE THIS PASSWORD IMMEDIATELY'
      });
    }
  }

  /**
   * Start session cleanup timer
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      // Clean expired sessions
      for (const [token, session] of this.activeSessions.entries()) {
        if (session.expiresAt < now) {
          this.activeSessions.delete(token);
        }
      }
      
      // Clean user session lists
      for (const user of this.users.values()) {
        user.sessions = user.sessions.filter(s => s.expiresAt > now);
      }
    }, 60000); // Every minute
  }

  /**
   * Start password expiration checks
   */
  private startPasswordExpirationChecks(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const user of this.users.values()) {
        const passwordAge = Math.floor((now - user.passwordLastChanged.getTime()) / (24 * 60 * 60 * 1000));
        
        // Warn at 80 days
        if (passwordAge === 80 && user.status === UserStatus.ACTIVE) {
          this.logger.warn('Password expiration warning', {
            userId: user.userId,
            username: user.username,
            daysUntilExpiration: 10
          });
        }
        
        // Expire at 90 days
        if (passwordAge >= this.policy.maxAge && user.status === UserStatus.ACTIVE) {
          user.status = UserStatus.EXPIRED;
          user.mustChangePassword = true;
          
          this.logger.warn('Password expired', {
            userId: user.userId,
            username: user.username
          });
        }
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  /**
   * Get user statistics
   */
  getStatistics(): {
    totalUsers: number;
    activeUsers: number;
    lockedUsers: number;
    activeSessions: number;
    mfaEnabledUsers: number;
  } {
    let activeUsers = 0;
    let lockedUsers = 0;
    let mfaEnabledUsers = 0;
    
    for (const user of this.users.values()) {
      if (user.status === UserStatus.ACTIVE) activeUsers++;
      if (user.status === UserStatus.LOCKED) lockedUsers++;
      if (user.mfaEnabled) mfaEnabledUsers++;
    }
    
    return {
      totalUsers: this.users.size,
      activeUsers,
      lockedUsers,
      activeSessions: this.activeSessions.size,
      mfaEnabledUsers
    };
  }
}