/**
 * Device Profile Interface for Cyreal IoT Device Discovery
 * 
 * Privacy-First Architecture:
 * - All private data is isolated and never shared
 * - Community sharing is opt-in only
 * - Anonymous fingerprints only (no serial numbers, paths, etc.)
 */

export type DeviceCapability = 
  | 'programming'          // Can be programmed (Arduino, ESP32, etc.)
  | 'debug'               // Debug interface (JTAG, SWD, etc.)
  | 'industrial'          // Industrial protocols (Modbus, CAN, etc.)
  | 'wireless'            // Wireless communication (WiFi, Bluetooth, LoRa)
  | 'sensor'              // Sensor data collection
  | 'actuator'            // Control/actuation capability
  | 'gateway'             // Protocol gateway/bridge
  | 'display'             // Has display capability
  | 'audio'               // Audio input/output
  | 'storage'             // Data storage capability
  | 'crypto'              // Cryptographic operations
  | 'realtime'            // Real-time processing
  | 'bootloader'          // Bootloader present
  | 'filesystem'          // File system access
  | 'network'             // Network connectivity
  | 'power-management';   // Power management features

export type Protocol = 
  | 'uart'                // Basic UART serial
  | 'usb-cdc'             // USB CDC (Communication Device Class)
  | 'modbus-rtu'          // Modbus RTU over serial
  | 'modbus-ascii'        // Modbus ASCII over serial
  | 'nmea'                // NMEA 0183 (GPS/navigation)
  | 'at-commands'         // AT command set (modems, etc.)
  | 'arduino-bootloader'  // Arduino bootloader protocol
  | 'stk500'              // STK500 programming protocol
  | 'avr-isp'             // AVR ISP programming
  | 'can'                 // CAN bus
  | 'can-open'            // CANopen
  | 'j1939'               // J1939 (automotive CAN)
  | 'lorawan'             // LoRaWAN
  | 'zigbee'              // ZigBee
  | 'mqtt'                // MQTT over serial
  | 'json-rpc'            // JSON-RPC
  | 'slip'                // Serial Line Internet Protocol
  | 'ppp'                 // Point-to-Point Protocol
  | 'xmodem'              // XMODEM file transfer
  | 'ymodem'              // YMODEM file transfer
  | 'zmodem'              // ZMODEM file transfer
  | 'dmx512'              // DMX512 lighting control
  | 'rs485'               // RS-485 multi-drop
  | 'custom';             // Custom/proprietary protocol

export type CompatibilityLevel = 'excellent' | 'good' | 'limited' | 'incompatible';

export interface SerialSettings {
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
  flowControl: 'none' | 'hardware' | 'software';
  bufferSize: number;
  timeout: number;
}

export interface TemperatureRange {
  min: number;
  max: number;
  unit: 'celsius' | 'fahrenheit';
}

export interface SecurityProfile {
  level: 'production' | 'development' | 'debug' | 'insecure';
  warnings: string[];
  recommendations: string[];
  vulnerabilities: string[];
  certifications: string[];
}

export interface CommunityData {
  confidence: number;          // 0-100, based on community validation
  contributorCount: number;    // Number of people who contributed data
  lastUpdated: Date;          // When community data was last updated
  validationScore: number;     // Community validation score
  reportCount: number;         // Number of accuracy reports
  flagged: boolean;           // Community flagged for review
}

export interface PrivateDeviceData {
  // This data is NEVER shared with community
  serialNumber?: string;       // Device serial number
  path: string;               // System path (/dev/ttyACM0, etc.)
  detectedAt: Date;           // When device was detected
  lastSeen: Date;             // Last time device was seen
  systemInfo: {
    hostname: string;
    platform: string;
    architecture: string;
    userId?: string;
  };
  networkInfo?: {
    macAddress?: string;
    ipAddress?: string;
    networkName?: string;
  };
  locationInfo?: {
    timezone?: string;
    locale?: string;
  };
  userNotes?: string;         // User's private notes about device
  customSettings?: SerialSettings; // User's custom settings
}

export interface ShareableDeviceData {
  // This data CAN be shared with community (with explicit consent)
  vid: string;                // Vendor ID
  pid: string;                // Product ID
  manufacturer: string;       // Manufacturer name
  productFamily: string;      // Product family/series
  model?: string;             // Specific model
  capabilities: DeviceCapability[];
  protocols: Protocol[];
  defaultSettings: SerialSettings;
  recommendedSettings: SerialSettings[];
  industrialGrade: boolean;
  certifications: string[];
  operatingTemp?: TemperatureRange;
  powerRequirements?: {
    voltage: number;
    current: number;
    powerConsumption: number;
  };
  physicalSpecs?: {
    formFactor: string;
    connectorType: string;
    dimensions?: string;
  };
  softwareInfo?: {
    firmwareVersion?: string;
    driverRequired?: boolean;
    sdkAvailable?: boolean;
  };
}

/**
 * Complete Device Profile
 * Combines shareable data with private data
 */
export interface DeviceProfile {
  // Core identification
  id: string;                 // Generated unique ID (vid:pid or custom)
  
  // Shareable data (opt-in community sharing)
  shareable: ShareableDeviceData;
  
  // Private data (never shared)
  private: PrivateDeviceData;
  
  // Cyreal-specific data
  cyreal: {
    compatibility: CompatibilityLevel;
    suggestedGovernors: string[];
    supportedFeatures: string[];
    limitations: string[];
    testResults: {
      connectionTest: boolean;
      protocolTest: boolean;
      performanceTest?: {
        latency: number;
        throughput: number;
        errorRate: number;
      };
    };
  };
  
  // Security assessment
  security: SecurityProfile;
  
  // Community data (if sharing enabled)
  community?: CommunityData;
  
  // Metadata
  metadata: {
    version: string;           // Profile schema version
    createdAt: Date;
    updatedAt: Date;
    source: 'detected' | 'community' | 'vendor' | 'user';
    confidence: number;        // Overall confidence in profile accuracy
  };
}

/**
 * Anonymous Device Profile for Community Sharing
 * Contains ONLY shareable data, no private information
 */
export interface AnonymousDeviceProfile {
  id: string;                 // vid:pid only
  data: ShareableDeviceData;
  community: CommunityData;
  metadata: {
    version: string;
    submittedAt: Date;
    source: 'community';
    confidence: number;
  };
}

/**
 * Device Database Entry
 * Used for local storage and community database
 */
export interface DeviceDBEntry {
  vidPid: string;             // Primary key: "vid:pid"
  profile: DeviceProfile;
  indexed: {
    manufacturer: string;
    productFamily: string;
    capabilities: DeviceCapability[];
    protocols: Protocol[];
  };
  flags: {
    userContributed: boolean;
    communityValidated: boolean;
    vendorOfficial: boolean;
    needsUpdate: boolean;
  };
}

/**
 * Privacy Settings for Device Database
 */
export interface PrivacySettings {
  // Community sharing (default: false)
  enableCommunitySharing: boolean;
  
  // What to share (all default: false)
  shareCapabilities: boolean;
  shareProtocols: boolean;
  shareDefaultSettings: boolean;
  shareSecurityProfile: boolean;
  sharePhysicalSpecs: boolean;
  
  // Data retention
  retentionDays: number;      // How long to keep detection history
  anonymizeAfterDays: number; // When to remove identifying info
  
  // Consent tracking
  consentGiven: boolean;
  consentDate?: Date;
  consentVersion: string;
}

/**
 * Device Discovery Result
 * What gets returned from device detection
 */
export interface DeviceDiscoveryResult {
  devices: DeviceProfile[];
  summary: {
    totalDevices: number;
    knownDevices: number;
    unknownDevices: number;
    industrialDevices: number;
    securityIssues: number;
  };
  recommendations: string[];
  warnings: string[];
  privacy: {
    sharingEnabled: boolean;
    devicesShared: number;
    lastSync?: Date;
  };
}