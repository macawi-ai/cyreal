import { PortStatus, BufferMode, SecurityLevel } from '../types/system';

/**
 * Serial port types
 */
export type SerialPortType = 'rs232' | 'rs485' | 'usb-serial' | 'ttl';

/**
 * Port capabilities detected at runtime
 */
export interface PortCapabilities {
  baudRates: number[];
  dataBits: number[];
  stopBits: number[];
  parity: string[];
  flowControl: string[];
  // RS-485 specific
  rs485?: {
    enabled: boolean;
    rtsPin?: number;
    dtrPin?: number;
    maxDevices: number;
    termination: boolean;
  };
  // Advanced features
  signalMonitoring: boolean;
  electricalMonitoring: boolean;
}

/**
 * Port configuration options
 */
export interface PortOptions {
  baudRate: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 1.5 | 2;
  parity?: 'none' | 'odd' | 'even' | 'mark' | 'space';
  flowControl?: 'none' | 'hardware' | 'software';
  bufferMode?: BufferMode;
  securityLevel?: SecurityLevel;
  // RS-485 specific
  rs485?: {
    enabled: boolean;
    rtsPin?: number;
    delayRtsBeforeSend?: number;
    delayRtsAfterSend?: number;
  };
}

/**
 * Device fingerprint for security tracking
 * REMOVED - Pending manufacturer consultation on privacy-preserving implementation
 */
// export interface DeviceFingerprint {
//   vendorId?: string;
//   productId?: string;
//   serialNumber?: string;
//   manufacturer?: string;
//   deviceType?: string;
//   lastSeen: Date;
// }

/**
 * Port metrics
 */
export interface PortMetrics {
  bytesReceived: number;
  bytesTransmitted: number;
  errorsCount: number;
  lastActivity: Date;
  uptime: number;
  // Advanced metrics
  signalQuality?: number;
  bufferUtilization?: number;
  latencyMs?: number;
}

/**
 * Cyreal port interface
 */
export interface ICyrealPort {
  readonly id: string;
  readonly physicalPath: string;
  readonly type: SerialPortType;
  readonly status: PortStatus;
  readonly capabilities: PortCapabilities;
  // readonly fingerprint?: DeviceFingerprint; // Removed - pending manufacturer consultation
  
  /**
   * Open the port with specified options
   */
  open(options: PortOptions): Promise<void>;
  
  /**
   * Close the port
   */
  close(): Promise<void>;
  
  /**
   * Write data to the port
   */
  write(data: Buffer): Promise<void>;
  
  /**
   * Read data from the port (async iterator)
   */
  read(): AsyncIterator<Buffer>;
  
  /**
   * Get current metrics
   */
  getMetrics(): PortMetrics;
  
  /**
   * Update port configuration while open
   */
  updateOptions(options: Partial<PortOptions>): Promise<void>;
  
  /**
   * Flush buffers
   */
  flush(): Promise<void>;
  
  /**
   * Drain output buffer
   */
  drain(): Promise<void>;
}

/**
 * Port manager interface for System 3
 */
export interface IPortManager {
  /**
   * List all available ports
   */
  listPorts(): Promise<ICyrealPort[]>;
  
  /**
   * Get a specific port
   */
  getPort(id: string): ICyrealPort | undefined;
  
  /**
   * Create a new port connection
   */
  createPort(physicalPath: string, id?: string): Promise<ICyrealPort>;
  
  /**
   * Remove a port
   */
  removePort(id: string): Promise<void>;
  
  /**
   * Get all active ports
   */
  getActivePorts(): ICyrealPort[];
}