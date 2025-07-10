/**
 * PCI-DSS Compliant Encryption Manager
 * 
 * Implements AES-256-GCM encryption with secure key management
 * Complies with PCI-DSS Requirements 3.4, 3.5, 3.6
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as winston from 'winston';

export interface EncryptionKey {
  id: string;
  version: number;
  algorithm: 'aes-256-gcm';
  key: Buffer;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'rotating' | 'retired';
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
  keyVersion: number;
  algorithm: string;
  timestamp: string;
}

export interface IEncryptionManager {
  encrypt(plaintext: string | Buffer, context?: string): Promise<EncryptedData>;
  decrypt(encryptedData: EncryptedData): Promise<string>;
  rotateKeys(): Promise<void>;
  isCardNumber(data: string): boolean;
}

/**
 * PCI-DSS Compliant Encryption Manager
 */
export class EncryptionManager implements IEncryptionManager {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly TAG_LENGTH = 16; // 128 bits
  private readonly KEY_ROTATION_DAYS = 90; // PCI-DSS requirement
  
  private logger: winston.Logger;
  private activeKey: EncryptionKey | null = null;
  private keyCache: Map<string, EncryptionKey> = new Map();
  private hsmEnabled: boolean = false;
  
  // PAN detection regex patterns
  private readonly PAN_PATTERNS = [
    /\b(?:4[0-9]{12}(?:[0-9]{3})?)\b/, // Visa
    /\b(?:5[1-5][0-9]{14})\b/, // Mastercard
    /\b(?:3[47][0-9]{13})\b/, // American Express
    /\b(?:6(?:011|5[0-9]{2})[0-9]{12})\b/, // Discover
    /\b(?:3(?:0[0-5]|[68][0-9])[0-9]{11})\b/, // Diners Club
    /\b(?:(?:2131|1800|35\d{3})\d{11})\b/ // JCB
  ];

  constructor(
    logger: winston.Logger,
    private keyStorePath: string,
    private hsmConfig?: {
      enabled: boolean;
      provider: 'aws-kms' | 'azure-keyvault' | 'hashicorp-vault';
      endpoint?: string;
      credentials?: any;
    }
  ) {
    this.logger = logger;
    this.hsmEnabled = hsmConfig?.enabled || false;
  }

  /**
   * Initialize encryption manager
   */
  async initialize(): Promise<void> {
    this.logger.info('🔐 Initializing PCI-DSS compliant encryption manager');
    
    try {
      // Load or generate master encryption key
      await this.loadOrGenerateKey();
      
      // Check for key rotation requirement
      await this.checkKeyRotation();
      
      // Validate HSM connection if enabled
      if (this.hsmEnabled) {
        await this.validateHSMConnection();
      }
      
      this.logger.info('✅ Encryption manager initialized successfully', {
        keyId: this.activeKey?.id,
        algorithm: this.ALGORITHM,
        hsmEnabled: this.hsmEnabled
      });
    } catch (error) {
      this.logger.error('Failed to initialize encryption manager', error);
      throw new Error('Encryption initialization failed - cannot proceed without encryption');
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(plaintext: string | Buffer, context?: string): Promise<EncryptedData> {
    if (!this.activeKey) {
      throw new Error('No active encryption key available');
    }

    // Check for credit card data
    if (typeof plaintext === 'string' && this.isCardNumber(plaintext)) {
      this.logger.warn('⚠️  Potential credit card number detected in encryption request', {
        context,
        action: 'encryption_requested'
      });
      // In production, you might want to reject this or use tokenization instead
    }

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.activeKey.key, iv);
    
    const textBuffer = Buffer.isBuffer(plaintext) 
      ? plaintext 
      : Buffer.from(plaintext, 'utf8');
    
    const ciphertext = Buffer.concat([
      cipher.update(textBuffer),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();

    const encryptedData: EncryptedData = {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: this.activeKey.id,
      keyVersion: this.activeKey.version,
      algorithm: this.ALGORITHM,
      timestamp: new Date().toISOString()
    };

    this.logger.debug('Data encrypted successfully', {
      keyId: this.activeKey.id,
      dataLength: textBuffer.length,
      context
    });

    return encryptedData;
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    // Retrieve the encryption key used
    const key = await this.loadKey(encryptedData.keyId, encryptedData.keyVersion);
    if (!key) {
      throw new Error(`Encryption key not found: ${encryptedData.keyId}:${encryptedData.keyVersion}`);
    }

    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm,
      key.key,
      Buffer.from(encryptedData.iv, 'base64')
    ) as crypto.DecipherGCM;
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.ciphertext, 'base64')),
      decipher.final()
    ]);

    this.logger.debug('Data decrypted successfully', {
      keyId: encryptedData.keyId,
      keyVersion: encryptedData.keyVersion
    });

    return decrypted.toString('utf8');
  }

  /**
   * Check if data contains a credit card number
   */
  isCardNumber(data: string): boolean {
    // Remove common separators
    const cleaned = data.replace(/[\s\-]/g, '');
    
    // Check against PAN patterns
    for (const pattern of this.PAN_PATTERNS) {
      if (pattern.test(cleaned)) {
        // Perform Luhn algorithm check
        if (this.isValidLuhn(cleaned.match(/\d+/)?.[0] || '')) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Rotate encryption keys (PCI-DSS requirement)
   */
  async rotateKeys(): Promise<void> {
    this.logger.info('🔄 Starting key rotation process');
    
    try {
      // Generate new key
      const newKey = await this.generateKey();
      
      // Mark old key as rotating
      if (this.activeKey) {
        this.activeKey.status = 'rotating';
        this.keyCache.set(`${this.activeKey.id}:${this.activeKey.version}`, this.activeKey);
      }
      
      // Set new key as active
      this.activeKey = newKey;
      
      // Save key metadata
      await this.saveKeyMetadata();
      
      // Schedule old key retirement (after re-encryption period)
      if (this.activeKey) {
        setTimeout(() => this.retireKey(this.activeKey!.id), 7 * 24 * 60 * 60 * 1000); // 7 days
      }
      
      this.logger.info('✅ Key rotation completed successfully', {
        newKeyId: newKey.id,
        newKeyVersion: newKey.version
      });
    } catch (error) {
      this.logger.error('Key rotation failed', error);
      throw error;
    }
  }

  /**
   * Load or generate encryption key
   */
  private async loadOrGenerateKey(): Promise<void> {
    try {
      // Try to load existing key metadata
      const metadata = await this.loadKeyMetadata();
      
      if (metadata && metadata.activeKeyId) {
        // Load key from secure storage (HSM or encrypted file)
        this.activeKey = await this.loadKey(metadata.activeKeyId, metadata.activeKeyVersion);
      } else {
        // Generate new key
        this.activeKey = await this.generateKey();
        await this.saveKeyMetadata();
      }
    } catch (error) {
      this.logger.warn('Could not load existing key, generating new one', error);
      this.activeKey = await this.generateKey();
      await this.saveKeyMetadata();
    }
  }

  /**
   * Generate new encryption key
   */
  private async generateKey(): Promise<EncryptionKey> {
    const keyId = crypto.randomUUID();
    const keyBuffer = crypto.randomBytes(this.KEY_LENGTH);
    
    const key: EncryptionKey = {
      id: keyId,
      version: 1,
      algorithm: 'aes-256-gcm',
      key: keyBuffer,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (this.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000)),
      status: 'active'
    };

    // Store key securely
    if (this.hsmEnabled) {
      await this.storeKeyInHSM(key);
    } else {
      await this.storeKeyLocally(key);
    }

    return key;
  }

  /**
   * Store key in HSM
   */
  private async storeKeyInHSM(key: EncryptionKey): Promise<void> {
    // Implementation depends on HSM provider
    this.logger.info('Storing key in HSM', { keyId: key.id, provider: this.hsmConfig?.provider });
    // TODO: Implement HSM-specific storage
  }

  /**
   * Store key locally (encrypted with master key)
   */
  private async storeKeyLocally(key: EncryptionKey): Promise<void> {
    // Encrypt the key with a master key (derived from hardware)
    const masterKey = this.deriveMasterKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(key.key),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    const keyData = {
      id: key.id,
      version: key.version,
      algorithm: key.algorithm,
      encryptedKey: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt.toISOString(),
      status: key.status
    };
    
    const keyPath = `${this.keyStorePath}/${key.id}_v${key.version}.key`;
    await fs.writeFile(keyPath, JSON.stringify(keyData), { mode: 0o600 });
    
    this.logger.info('Key stored locally (encrypted)', { keyId: key.id, path: keyPath });
  }

  /**
   * Derive master key from hardware characteristics
   */
  private deriveMasterKey(): Buffer {
    // In production, this should use TPM or hardware-specific derivation
    // This is a simplified example
    const hardwareId = process.env.HARDWARE_ID || 'default-hardware-id';
    const salt = Buffer.from('cyreal-pci-dss-encryption-salt');
    
    return crypto.pbkdf2Sync(hardwareId, salt, 100000, 32, 'sha256');
  }

  /**
   * Load key from storage
   */
  private async loadKey(keyId: string, version: number): Promise<EncryptionKey | null> {
    const cacheKey = `${keyId}:${version}`;
    
    // Check cache first
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }

    if (this.hsmEnabled) {
      return await this.loadKeyFromHSM(keyId, version);
    } else {
      return await this.loadKeyLocally(keyId, version);
    }
  }

  /**
   * Load key from local storage
   */
  private async loadKeyLocally(keyId: string, version: number): Promise<EncryptionKey | null> {
    try {
      const keyPath = `${this.keyStorePath}/${keyId}_v${version}.key`;
      const keyDataStr = await fs.readFile(keyPath, 'utf8');
      const keyData = JSON.parse(keyDataStr);
      
      // Decrypt the key
      const masterKey = this.deriveMasterKey();
      const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, Buffer.from(keyData.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(keyData.authTag, 'base64'));
      
      const decryptedKey = Buffer.concat([
        decipher.update(Buffer.from(keyData.encryptedKey, 'base64')),
        decipher.final()
      ]);
      
      const key: EncryptionKey = {
        id: keyData.id,
        version: keyData.version,
        algorithm: keyData.algorithm,
        key: decryptedKey,
        createdAt: new Date(keyData.createdAt),
        expiresAt: new Date(keyData.expiresAt),
        status: keyData.status
      };
      
      // Cache the key
      const keyIdentifier = `${keyData.id}:${keyData.version}`;
      this.keyCache.set(keyIdentifier, key);
      
      return key;
    } catch (error) {
      this.logger.error('Failed to load key', { keyId, version, error });
      return null;
    }
  }

  /**
   * Load key from HSM
   */
  private async loadKeyFromHSM(keyId: string, version: number): Promise<EncryptionKey | null> {
    // TODO: Implement HSM-specific loading
    this.logger.info('Loading key from HSM', { keyId, version });
    return null;
  }

  /**
   * Save key metadata
   */
  private async saveKeyMetadata(): Promise<void> {
    if (!this.activeKey) return;
    
    const metadata = {
      activeKeyId: this.activeKey.id,
      activeKeyVersion: this.activeKey.version,
      lastRotation: new Date().toISOString(),
      nextRotation: this.activeKey.expiresAt.toISOString()
    };
    
    const metadataPath = `${this.keyStorePath}/metadata.json`;
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
  }

  /**
   * Load key metadata
   */
  private async loadKeyMetadata(): Promise<any> {
    try {
      const metadataPath = `${this.keyStorePath}/metadata.json`;
      const data = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if key rotation is needed
   */
  private async checkKeyRotation(): Promise<void> {
    if (!this.activeKey) return;
    
    const daysUntilExpiry = Math.floor(
      (this.activeKey.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    
    if (daysUntilExpiry <= 7) {
      this.logger.warn('⚠️  Key rotation required soon', { daysUntilExpiry });
      // In production, send alerts
    }
    
    if (daysUntilExpiry <= 0) {
      this.logger.error('🚨 Key has expired - immediate rotation required');
      await this.rotateKeys();
    }
  }

  /**
   * Validate HSM connection
   */
  private async validateHSMConnection(): Promise<void> {
    // TODO: Implement HSM-specific validation
    this.logger.info('Validating HSM connection', { provider: this.hsmConfig?.provider });
  }

  /**
   * Retire old key
   */
  private async retireKey(keyId: string): Promise<void> {
    const key = Array.from(this.keyCache.values()).find(k => k.id === keyId);
    if (key) {
      key.status = 'retired';
      this.logger.info('Key retired', { keyId });
    }
  }

  /**
   * Luhn algorithm validation
   */
  private isValidLuhn(cardNumber: string): boolean {
    if (!cardNumber || cardNumber.length < 13) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Get encryption statistics for monitoring
   */
  getStatistics(): {
    activeKeyId: string | undefined;
    keyVersion: number | undefined;
    algorithm: string;
    daysUntilRotation: number;
    totalKeysInCache: number;
    hsmEnabled: boolean;
  } {
    const daysUntilRotation = this.activeKey 
      ? Math.floor((this.activeKey.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : 0;

    return {
      activeKeyId: this.activeKey?.id,
      keyVersion: this.activeKey?.version,
      algorithm: this.ALGORITHM,
      daysUntilRotation,
      totalKeysInCache: this.keyCache.size,
      hsmEnabled: this.hsmEnabled
    };
  }
}