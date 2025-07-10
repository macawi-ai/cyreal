/**
 * Secure Message Validator
 * 
 * Implements comprehensive input validation and sanitization for A2A messages
 * Prevents injection attacks and ensures message integrity
 */

import * as winston from 'winston';
import { Message, A2AAgentCard, A2ACapability } from '../interfaces/protocol';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MessageValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitizedMessage?: Message;
}

export class SecureMessageValidator {
  private readonly logger: winston.Logger;
  private readonly MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
  private readonly MAX_STRING_LENGTH = 10000;
  private readonly MAX_ARRAY_LENGTH = 1000;
  private readonly ALLOWED_METHODS = new Set([
    'agent.register',
    'agent.discover',
    'agent.unregister',
    'serial.list',
    'serial.read',
    'serial.write',
    'serial.configure',
    'governance.status',
    'ping',
    'heartbeat'
  ]);

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  /**
   * Validate and sanitize A2A JSON-RPC message
   */
  public validateMessage(data: any, maxSize?: number): MessageValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Check message size
      const messageSize = JSON.stringify(data).length;
      if (messageSize > (maxSize || this.MAX_MESSAGE_SIZE)) {
        errors.push({
          field: 'message',
          message: `Message size ${messageSize} exceeds maximum ${maxSize || this.MAX_MESSAGE_SIZE}`,
          severity: 'high'
        });
        return { valid: false, errors };
      }

      // Check basic structure
      if (!data || typeof data !== 'object') {
        errors.push({
          field: 'message',
          message: 'Message must be a valid object',
          severity: 'critical'
        });
        return { valid: false, errors };
      }

      // Validate required fields
      this.validateRequiredFields(data, errors);
      
      // Validate field types and values
      this.validateMessageFields(data, errors);
      
      // Validate method-specific requirements
      if (data.method) {
        this.validateMethodSpecific(data, errors);
      }

      // Sanitize the message
      const sanitizedMessage = errors.length === 0 ? this.sanitizeMessage(data) : undefined;

      const valid = errors.length === 0 || !errors.some(e => e.severity === 'critical' || e.severity === 'high');

      if (!valid) {
        this.logger.warn('Message validation failed', {
          errorCount: errors.length,
          criticalErrors: errors.filter(e => e.severity === 'critical').length,
          method: data.method
        });
      }

      return {
        valid,
        errors,
        sanitizedMessage
      };

    } catch (error) {
      this.logger.error('Message validation error:', error);
      return {
        valid: false,
        errors: [{
          field: 'message',
          message: 'Message validation system error',
          severity: 'critical'
        }]
      };
    }
  }

  /**
   * Validate A2A Agent Card
   */
  public validateAgentCard(agentCard: any): MessageValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Check basic structure
      if (!agentCard || typeof agentCard !== 'object') {
        errors.push({
          field: 'agentCard',
          message: 'Agent card must be a valid object',
          severity: 'critical'
        });
        return { valid: false, errors };
      }

      // Validate required fields
      const requiredFields = ['agentId', 'name', 'description', 'version', 'capabilities', 'endpoints', 'lastSeen'];
      for (const field of requiredFields) {
        if (!agentCard.hasOwnProperty(field)) {
          errors.push({
            field,
            message: `Required field '${field}' is missing`,
            severity: 'critical'
          });
        }
      }

      // Validate agent ID (must be UUIDv4)
      if (agentCard.agentId && !this.isValidUUID(agentCard.agentId)) {
        errors.push({
          field: 'agentId',
          message: 'Agent ID must be a valid UUIDv4',
          severity: 'high'
        });
      }

      // Validate name (alphanumeric + spaces, hyphens, underscores)
      if (agentCard.name && !this.isValidName(agentCard.name)) {
        errors.push({
          field: 'name',
          message: 'Agent name contains invalid characters',
          severity: 'medium'
        });
      }

      // Validate version (semantic versioning)
      if (agentCard.version && !this.isValidVersion(agentCard.version)) {
        errors.push({
          field: 'version',
          message: 'Version must follow semantic versioning (x.y.z)',
          severity: 'medium'
        });
      }

      // Validate capabilities array
      if (agentCard.capabilities) {
        this.validateCapabilities(agentCard.capabilities, errors);
      }

      // Validate endpoints array
      if (agentCard.endpoints) {
        this.validateEndpoints(agentCard.endpoints, errors);
      }

      // Validate timestamp
      if (agentCard.lastSeen) {
        const lastSeen = new Date(agentCard.lastSeen);
        const now = new Date();
        const timeDiff = now.getTime() - lastSeen.getTime();
        
        if (timeDiff > 10 * 60 * 1000) { // 10 minutes
          errors.push({
            field: 'lastSeen',
            message: 'Agent card timestamp is too old (potential replay attack)',
            severity: 'high'
          });
        }
        
        if (timeDiff < -60 * 1000) { // 1 minute in future
          errors.push({
            field: 'lastSeen',
            message: 'Agent card timestamp is in the future',
            severity: 'medium'
          });
        }
      }

      const valid = !errors.some(e => e.severity === 'critical' || e.severity === 'high');

      return { valid, errors };

    } catch (error) {
      this.logger.error('Agent card validation error:', error);
      return {
        valid: false,
        errors: [{
          field: 'agentCard',
          message: 'Agent card validation system error',
          severity: 'critical'
        }]
      };
    }
  }

  // Private validation methods

  private validateRequiredFields(data: any, errors: ValidationError[]): void {
    // JSON-RPC 2.0 requires id and method for requests
    if (!data.id) {
      errors.push({
        field: 'id',
        message: 'Message ID is required',
        severity: 'critical'
      });
    }

    if (!data.type) {
      errors.push({
        field: 'type',
        message: 'Message type is required',
        severity: 'critical'
      });
    }
  }

  private validateMessageFields(data: any, errors: ValidationError[]): void {
    // Validate ID
    if (data.id !== undefined) {
      if (typeof data.id !== 'string' && typeof data.id !== 'number') {
        errors.push({
          field: 'id',
          message: 'Message ID must be string or number',
          severity: 'high'
        });
      } else if (typeof data.id === 'string' && data.id.length > 100) {
        errors.push({
          field: 'id',
          message: 'Message ID too long',
          severity: 'medium'
        });
      }
    }

    // Validate type
    if (data.type !== undefined) {
      const validTypes = ['request', 'response', 'notification', 'error'];
      if (!validTypes.includes(data.type)) {
        errors.push({
          field: 'type',
          message: 'Invalid message type',
          severity: 'high'
        });
      }
    }

    // Validate method
    if (data.method !== undefined) {
      if (typeof data.method !== 'string') {
        errors.push({
          field: 'method',
          message: 'Method must be a string',
          severity: 'high'
        });
      } else if (!this.isValidMethodName(data.method)) {
        errors.push({
          field: 'method',
          message: 'Invalid method name format',
          severity: 'high'
        });
      } else if (!this.ALLOWED_METHODS.has(data.method)) {
        errors.push({
          field: 'method',
          message: `Method '${data.method}' is not allowed`,
          severity: 'high'
        });
      }
    }

    // Validate params
    if (data.params !== undefined) {
      this.validateParams(data.params, errors);
    }

    // Validate error object
    if (data.error !== undefined) {
      this.validateErrorObject(data.error, errors);
    }
  }

  private validateMethodSpecific(data: any, errors: ValidationError[]): void {
    switch (data.method) {
      case 'agent.register':
        if (!data.params || !data.params.agentCard) {
          errors.push({
            field: 'params.agentCard',
            message: 'Agent registration requires agentCard parameter',
            severity: 'critical'
          });
        }
        break;

      case 'serial.read':
      case 'serial.write':
        if (!data.params || !data.params.portId) {
          errors.push({
            field: 'params.portId',
            message: 'Serial operations require portId parameter',
            severity: 'critical'
          });
        }
        break;

      case 'serial.write':
        if (!data.params || !data.params.data) {
          errors.push({
            field: 'params.data',
            message: 'Serial write requires data parameter',
            severity: 'critical'
          });
        }
        break;
    }
  }

  private validateParams(params: any, errors: ValidationError[]): void {
    if (params !== null && typeof params !== 'object') {
      errors.push({
        field: 'params',
        message: 'Params must be object or null',
        severity: 'high'
      });
      return;
    }

    if (typeof params === 'object') {
      // Check for prototype pollution
      if (params.hasOwnProperty('__proto__') || params.hasOwnProperty('constructor') || params.hasOwnProperty('prototype')) {
        errors.push({
          field: 'params',
          message: 'Potential prototype pollution detected',
          severity: 'critical'
        });
      }

      // Check for credit card numbers (PCI-DSS compliance)
      if (this.containsCreditCardNumber(params)) {
        errors.push({
          field: 'params',
          message: 'Credit card number detected - use tokenization instead',
          severity: 'critical'
        });
      }

      // Validate string lengths
      this.validateObjectStringLengths(params, 'params', errors);
    }
  }

  private validateErrorObject(error: any, errors: ValidationError[]): void {
    if (!error || typeof error !== 'object') {
      errors.push({
        field: 'error',
        message: 'Error must be an object',
        severity: 'high'
      });
      return;
    }

    if (typeof error.code !== 'number') {
      errors.push({
        field: 'error.code',
        message: 'Error code must be a number',
        severity: 'medium'
      });
    }

    if (typeof error.message !== 'string') {
      errors.push({
        field: 'error.message',
        message: 'Error message must be a string',
        severity: 'medium'
      });
    }
  }

  private validateCapabilities(capabilities: any, errors: ValidationError[]): void {
    if (!Array.isArray(capabilities)) {
      errors.push({
        field: 'capabilities',
        message: 'Capabilities must be an array',
        severity: 'high'
      });
      return;
    }

    if (capabilities.length > this.MAX_ARRAY_LENGTH) {
      errors.push({
        field: 'capabilities',
        message: `Too many capabilities (max ${this.MAX_ARRAY_LENGTH})`,
        severity: 'medium'
      });
    }

    capabilities.forEach((cap, index) => {
      if (!cap || typeof cap !== 'object') {
        errors.push({
          field: `capabilities[${index}]`,
          message: 'Capability must be an object',
          severity: 'medium'
        });
        return;
      }

      const required = ['id', 'name', 'category'];
      required.forEach(field => {
        if (!cap[field]) {
          errors.push({
            field: `capabilities[${index}].${field}`,
            message: `Capability ${field} is required`,
            severity: 'medium'
          });
        }
      });

      // Validate category
      const validCategories = ['serial', 'network', 'governance', 'monitoring', 'custom'];
      if (cap.category && !validCategories.includes(cap.category)) {
        errors.push({
          field: `capabilities[${index}].category`,
          message: 'Invalid capability category',
          severity: 'low'
        });
      }
    });
  }

  private validateEndpoints(endpoints: any, errors: ValidationError[]): void {
    if (!Array.isArray(endpoints)) {
      errors.push({
        field: 'endpoints',
        message: 'Endpoints must be an array',
        severity: 'high'
      });
      return;
    }

    endpoints.forEach((endpoint, index) => {
      if (!endpoint || typeof endpoint !== 'object') {
        errors.push({
          field: `endpoints[${index}]`,
          message: 'Endpoint must be an object',
          severity: 'medium'
        });
        return;
      }

      // Validate URL
      if (endpoint.url) {
        try {
          const url = new URL(endpoint.url);
          if (url.protocol !== 'https:' && url.protocol !== 'wss:') {
            errors.push({
              field: `endpoints[${index}].url`,
              message: 'Endpoint must use HTTPS or WSS protocol',
              severity: 'high'
            });
          }
        } catch {
          errors.push({
            field: `endpoints[${index}].url`,
            message: 'Invalid endpoint URL format',
            severity: 'medium'
          });
        }
      }
    });
  }

  private validateObjectStringLengths(obj: any, path: string, errors: ValidationError[]): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = `${path}.${key}`;
      
      if (typeof value === 'string' && value.length > this.MAX_STRING_LENGTH) {
        errors.push({
          field: currentPath,
          message: `String too long (max ${this.MAX_STRING_LENGTH})`,
          severity: 'medium'
        });
      } else if (typeof value === 'object' && value !== null) {
        // Prevent deep recursion
        if (path.split('.').length < 5) {
          this.validateObjectStringLengths(value, currentPath, errors);
        }
      }
    }
  }

  private sanitizeMessage(data: any): Message {
    return {
      id: this.sanitizeString(data.id),
      type: data.type,
      method: data.method ? this.sanitizeString(data.method) : undefined,
      params: data.params ? this.sanitizeObject(data.params) : undefined,
      result: data.result ? this.sanitizeObject(data.result) : undefined,
      error: data.error
    };
  }

  private sanitizeString(str: any): string {
    if (typeof str !== 'string') return String(str);
    
    // Remove potential XSS characters
    return str
      .replace(/[<>\"'&]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .substring(0, this.MAX_STRING_LENGTH);
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, this.MAX_ARRAY_LENGTH).map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip dangerous properties
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        continue;
      }

      const sanitizedKey = this.sanitizeString(key);
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private isValidName(name: string): boolean {
    // Allow alphanumeric, spaces, hyphens, underscores
    const nameRegex = /^[a-zA-Z0-9\s\-_]{1,100}$/;
    return nameRegex.test(name);
  }

  private isValidVersion(version: string): boolean {
    // Semantic versioning
    const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    return versionRegex.test(version);
  }

  private isValidMethodName(method: string): boolean {
    // Method names: alphanumeric + dots + hyphens
    const methodRegex = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
    return methodRegex.test(method) && method.length <= 100;
  }

  /**
   * Check for credit card numbers (PCI-DSS compliance)
   */
  private containsCreditCardNumber(obj: any): boolean {
    const panPatterns = [
      /\b(?:4[0-9]{12}(?:[0-9]{3})?)\b/, // Visa
      /\b(?:5[1-5][0-9]{14})\b/, // Mastercard
      /\b(?:3[47][0-9]{13})\b/, // American Express
      /\b(?:6(?:011|5[0-9]{2})[0-9]{12})\b/, // Discover
      /\b(?:3(?:0[0-5]|[68][0-9])[0-9]{11})\b/, // Diners Club
      /\b(?:(?:2131|1800|35\d{3})\d{11})\b/ // JCB
    ];
    
    const jsonStr = JSON.stringify(obj);
    
    // First check with regex patterns
    for (const pattern of panPatterns) {
      if (pattern.test(jsonStr)) {
        // Extract potential card numbers
        const matches = jsonStr.match(/\b\d{13,19}\b/g) || [];
        for (const match of matches) {
          if (this.isValidLuhn(match)) {
            this.logger.warn('🚨 PCI WARNING: Credit card number detected in message', {
              action: 'BLOCKED',
              recommendation: 'Use tokenization for card data'
            });
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Luhn algorithm validation
   */
  private isValidLuhn(cardNumber: string): boolean {
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);
      
      if (isNaN(digit)) return false;
      
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
}