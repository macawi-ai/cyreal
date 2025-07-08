/**
 * Base governor implementation with platform awareness
 */

import { EventEmitter } from 'events';
import {
  IEventEmittingGovernor,
  SystemLevel,
  GovernorDomain,
  ProbeResult,
  SensorData,
  Analysis,
  Action,
  Outcome,
  ValidationResult,
  getLogPath
} from '@cyreal/core';
import { PlatformAdapter } from '../serial/platform-adapter';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

export abstract class BaseGovernor extends EventEmitter implements IEventEmittingGovernor {
  protected logger: winston.Logger;
  protected platform: PlatformAdapter;
  protected learningData: Map<string, any> = new Map();
  protected metrics: {
    probeCount: number;
    successfulActions: number;
    failedActions: number;
    learningCycles: number;
  } = {
    probeCount: 0,
    successfulActions: 0,
    failedActions: 0,
    learningCycles: 0
  };
  
  constructor(
    public readonly name: string,
    public readonly level: SystemLevel,
    public readonly domain?: GovernorDomain
  ) {
    super();
    this.platform = PlatformAdapter.getInstance();
    this.logger = this.createLogger();
    
    // Log platform-specific initialization
    this.logger.info(`${name} governor initialized on ${this.platform.info.name}`, {
      platform: this.platform.info,
      level,
      domain
    });
  }
  
  private createLogger(): winston.Logger {
    // Ensure log directory exists
    const logPath = getLogPath(`${this.name.toLowerCase()}.log`);
    const logDir = path.dirname(logPath);
    
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      console.warn(`Failed to create log directory ${logDir}:`, error);
    }
    
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${this.name}] ${level}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ''
          }`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: logPath
        })
      ]
    });
  }
  
  /**
   * Base probe implementation with platform awareness
   */
  async probe(): Promise<ProbeResult> {
    this.metrics.probeCount++;
    const startTime = Date.now();
    
    try {
      // Platform-specific probe data
      const platformData = {
        platform: this.platform.info.name,
        arch: this.platform.info.arch,
        specialFeatures: this.platform.info.specialFeatures || []
      };
      
      // Governor-specific probe (implemented by subclasses)
      const specificProbe = await this.specificProbe();
      
      const result: ProbeResult = {
        timestamp: new Date(),
        state: {
          ...platformData,
          ...specificProbe.state,
          probeTimeMs: Date.now() - startTime
        },
        capabilities: [
          ...this.getBaseCapabilities(),
          ...specificProbe.capabilities
        ]
      };
      
      this.emit('probe:complete', result);
      return result;
    } catch (error) {
      this.logger.error('Probe failed:', error);
      throw error;
    }
  }
  
  /**
   * Base sense implementation with cybernetic pattern detection
   */
  sense(data: SensorData): Analysis {
    const patterns: string[] = [];
    const anomalies: string[] = [];
    const recommendations: string[] = [];
    
    // Platform-specific sensing
    if (this.platform.info.name === 'Banana Pi BPI-M7' && 
        this.platform.info.specialFeatures?.includes('npu_6tops')) {
      // Could leverage NPU for pattern recognition
      patterns.push('npu_acceleration_available');
    }
    
    // Time-based pattern detection
    const hour = new Date(data.timestamp).getHours();
    if (hour >= 2 && hour <= 4) {
      patterns.push('maintenance_window');
    }
    
    // Anomaly detection based on learned data
    for (const [metric, value] of Object.entries(data.metrics)) {
      const history = this.learningData.get(`metric_${metric}`);
      if (history) {
        const avg = history.avg || 0;
        const stdDev = history.stdDev || 1;
        
        if (Math.abs(value - avg) > 2 * stdDev) {
          anomalies.push(`${metric}_deviation`);
          recommendations.push(`investigate_${metric}`);
        }
      }
    }
    
    // Governor-specific sensing
    const specificAnalysis = this.specificSense(data);
    
    return {
      patterns: [...patterns, ...specificAnalysis.patterns],
      anomalies: [...anomalies, ...specificAnalysis.anomalies],
      recommendations: [...recommendations, ...specificAnalysis.recommendations],
      confidence: this.calculateConfidence(patterns.length, anomalies.length)
    };
  }
  
  /**
   * Base respond implementation with action tracking
   */
  async respond(analysis: Analysis): Promise<Action> {
    // Let subclass determine the action
    const action = await this.specificRespond(analysis);
    
    // Track action for learning
    this.emit('action:initiated', { action, analysis });
    
    return action;
  }
  
  /**
   * Base learning implementation with statistical tracking
   */
  learn(outcome: Outcome): void {
    this.metrics.learningCycles++;
    
    if (outcome.success) {
      this.metrics.successfulActions++;
    } else {
      this.metrics.failedActions++;
    }
    
    // Update metric statistics
    for (const [metric, value] of Object.entries(outcome.metrics)) {
      const key = `metric_${metric}`;
      const history = this.learningData.get(key) || {
        values: [],
        avg: 0,
        stdDev: 0
      };
      
      history.values.push(value);
      if (history.values.length > 1000) {
        history.values.shift(); // Keep last 1000 values
      }
      
      // Recalculate statistics
      history.avg = history.values.reduce((a, b) => a + b, 0) / history.values.length;
      const variance = history.values.reduce((sum, val) => 
        sum + Math.pow(val - history.avg, 2), 0) / history.values.length;
      history.stdDev = Math.sqrt(variance);
      
      this.learningData.set(key, history);
    }
    
    // Platform-specific learning
    if (this.platform.info.name === 'BeagleBone AI-64' && 
        outcome.metrics.latencyMs !== undefined) {
      // BeagleBone PRU can help with precise timing
      this.learningData.set('pru_assist_threshold', outcome.metrics.latencyMs < 1);
    }
    
    // Governor-specific learning
    this.specificLearn(outcome);
    
    this.emit('learning:complete', {
      outcome,
      metrics: this.metrics,
      learningDataSize: this.learningData.size
    });
  }
  
  /**
   * Base validation with health calculation
   */
  validate(): ValidationResult {
    const issues: string[] = [];
    
    // Check success rate
    const totalActions = this.metrics.successfulActions + this.metrics.failedActions;
    const successRate = totalActions > 0 
      ? this.metrics.successfulActions / totalActions 
      : 1;
    
    if (successRate < 0.8) {
      issues.push('success_rate_below_80_percent');
    }
    
    // Check if we're learning
    if (this.metrics.learningCycles === 0 && totalActions > 10) {
      issues.push('no_learning_cycles_detected');
    }
    
    // Governor-specific validation
    const specificValidation = this.specificValidate();
    issues.push(...specificValidation.issues);
    
    // Calculate health score
    const health = Math.round(
      (successRate * 0.5 + 
       (specificValidation.health / 100) * 0.3 +
       (this.metrics.learningCycles > 0 ? 0.2 : 0)) * 100
    );
    
    return {
      valid: issues.length === 0,
      health,
      issues
    };
  }
  
  /**
   * Get base capabilities common to all governors
   */
  protected getBaseCapabilities(): string[] {
    return [
      'event_emission',
      'statistical_learning',
      'platform_awareness',
      `level_${this.level}_governance`
    ];
  }
  
  /**
   * Calculate confidence based on pattern/anomaly ratio
   */
  protected calculateConfidence(patterns: number, anomalies: number): number {
    if (patterns + anomalies === 0) return 0.5;
    return Math.min(0.95, patterns / (patterns + anomalies * 2));
  }
  
  /**
   * Abstract methods to be implemented by specific governors
   */
  protected abstract specificProbe(): Promise<Partial<ProbeResult>>;
  protected abstract specificSense(data: SensorData): Partial<Analysis>;
  protected abstract specificRespond(analysis: Analysis): Promise<Action>;
  protected abstract specificLearn(outcome: Outcome): void;
  protected abstract specificValidate(): Partial<ValidationResult>;
}