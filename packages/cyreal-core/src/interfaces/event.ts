/**
 * Event streaming output configuration
 */
export interface EventOutput {
  type: 'kafka' | 'mqtt' | 'syslog' | 'webhook' | 'file' | 'influxdb' | 'opentelemetry';
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Kafka output configuration
 */
export interface KafkaOutput extends EventOutput {
  type: 'kafka';
  config: {
    brokers: string[];
    topics: {
      alerts: string;
      metrics: string;
      logs: string;
      learning: string;
    };
    clientId?: string;
    ssl?: boolean;
  };
}

/**
 * MQTT output configuration
 */
export interface MqttOutput extends EventOutput {
  type: 'mqtt';
  config: {
    broker: string;
    topicPrefix: string;
    qos?: 0 | 1 | 2;
    clientId?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Base event structure
 */
export interface CyrealEvent {
  id: string;
  timestamp: Date;
  source: string;
  level: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';
  category: 'security' | 'health' | 'performance' | 'operational' | 'learning';
  portId?: string;
  data: Record<string, any>;
}

/**
 * Reliability mode change event
 */
export interface ReliabilityModeChangeEvent extends CyrealEvent {
  category: 'performance';
  data: {
    previousMode: string;
    newMode: string;
    reason: string;
    metrics: {
      effectiveBitRate: number;
      packetLossRatio: number;
      retransmissionOverhead: number;
      jitterMs: number;
    };
    recommendation?: string;
  };
}

/**
 * Device change event
 */
export interface DeviceChangeEvent extends CyrealEvent {
  category: 'security';
  data: {
    oldDevice?: {
      vendorId: string;
      productId: string;
      serialNumber?: string;
      deviceType: string;
    };
    newDevice?: {
      vendorId: string;
      productId: string;
      serialNumber?: string;
      deviceType: string;
    };
    threatAssessment: string;
    recommendedAction: string;
  };
}

/**
 * Event router interface
 */
export interface IEventRouter {
  /**
   * Configure an output
   */
  configureOutput(output: EventOutput): void;
  
  /**
   * Remove an output
   */
  removeOutput(type: string): void;
  
  /**
   * Send event to all configured outputs
   */
  routeEvent(event: CyrealEvent): Promise<void>;
  
  /**
   * Get output status
   */
  getOutputStatus(): Array<{
    type: string;
    enabled: boolean;
    healthy: boolean;
    lastError?: string;
    eventsSent: number;
  }>;
  
  /**
   * Batch send events
   */
  routeEventBatch(events: CyrealEvent[]): Promise<void>;
}