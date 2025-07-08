import { SystemLevel, GovernorDomain } from '../types/system';

/**
 * Probe phase result
 */
export interface ProbeResult {
  timestamp: Date;
  state: Record<string, any>;
  capabilities: string[];
}

/**
 * Sensor data for sense phase
 */
export interface SensorData {
  source: string;
  timestamp: Date;
  metrics: Record<string, number>;
  events: Array<{
    type: string;
    data: any;
  }>;
}

/**
 * Analysis result from sense phase
 */
export interface Analysis {
  patterns: string[];
  anomalies: string[];
  recommendations: string[];
  confidence: number;
}

/**
 * Action to be taken in response phase
 */
export interface Action {
  type: string;
  target: string;
  parameters: Record<string, any>;
  priority: 'immediate' | 'normal' | 'deferred';
}

/**
 * Outcome from executed action
 */
export interface Outcome {
  action: Action;
  success: boolean;
  metrics: Record<string, number>;
  sideEffects: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  health: number; // 0-100
  issues: string[];
}

/**
 * Base governor interface implementing PSRLV pattern
 */
export interface IGovernor {
  readonly name: string;
  readonly level: SystemLevel;
  readonly domain?: GovernorDomain;
  
  /**
   * Probe - Discover current state
   */
  probe(): Promise<ProbeResult>;
  
  /**
   * Sense - Measure and assess
   */
  sense(data: SensorData): Analysis;
  
  /**
   * Respond - Take appropriate action
   */
  respond(analysis: Analysis): Promise<Action>;
  
  /**
   * Learn - Build patterns from outcomes
   */
  learn(outcome: Outcome): void;
  
  /**
   * Validate - Ensure effectiveness
   */
  validate(): ValidationResult;
}

/**
 * Governor with event emission capability
 */
export interface IEventEmittingGovernor extends IGovernor {
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
  emit(event: string, data: any): void;
}