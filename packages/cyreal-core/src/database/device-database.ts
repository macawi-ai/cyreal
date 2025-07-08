/**
 * Device Database - Privacy-First IoT Device Discovery
 * 
 * Architecture:
 * - Local-first: Works completely offline
 * - Privacy by design: Nothing shared by default
 * - Opt-in community: User controls what gets shared
 * - Anonymous only: No private data ever leaves the system
 */

import { 
  DeviceProfile, 
  DeviceDBEntry, 
  AnonymousDeviceProfile, 
  PrivacySettings, 
  DeviceDiscoveryResult,
  ShareableDeviceData,
  PrivateDeviceData
} from './device-profile';

/**
 * Local Device Database
 * Stores all device profiles locally with full privacy
 */
export class LocalDeviceDatabase {
  private devices: Map<string, DeviceDBEntry> = new Map();
  private detectionHistory: Map<string, Date[]> = new Map();
  
  /**
   * Get device profile by VID:PID
   */
  async getDevice(vid: string, pid: string): Promise<DeviceProfile | null> {
    const key = `${vid}:${pid}`;
    const entry = this.devices.get(key);
    return entry ? entry.profile : null;
  }
  
  /**
   * Store device profile locally
   */
  async storeDevice(profile: DeviceProfile): Promise<void> {
    const key = profile.id;
    const entry: DeviceDBEntry = {
      vidPid: key,
      profile,
      indexed: {
        manufacturer: profile.shareable.manufacturer,
        productFamily: profile.shareable.productFamily,
        capabilities: profile.shareable.capabilities,
        protocols: profile.shareable.protocols
      },
      flags: {
        userContributed: false,
        communityValidated: false,
        vendorOfficial: false,
        needsUpdate: false
      }
    };
    
    this.devices.set(key, entry);
    this.recordDetection(key);
  }
  
  /**
   * Search devices by manufacturer
   */
  async searchByManufacturer(manufacturer: string): Promise<DeviceProfile[]> {
    const results: DeviceProfile[] = [];
    
    for (const entry of this.devices.values()) {
      if (entry.indexed.manufacturer.toLowerCase().includes(manufacturer.toLowerCase())) {
        results.push(entry.profile);
      }
    }
    
    return results;
  }
  
  /**
   * Search devices by capability
   */
  async searchByCapability(capability: string): Promise<DeviceProfile[]> {
    const results: DeviceProfile[] = [];
    
    for (const entry of this.devices.values()) {
      if (entry.indexed.capabilities.includes(capability as any)) {
        results.push(entry.profile);
      }
    }
    
    return results;
  }
  
  /**
   * Get all devices
   */
  async getAllDevices(): Promise<DeviceProfile[]> {
    return Array.from(this.devices.values()).map(entry => entry.profile);
  }
  
  /**
   * Record device detection for history tracking
   */
  private recordDetection(deviceId: string): void {
    const history = this.detectionHistory.get(deviceId) || [];
    history.push(new Date());
    this.detectionHistory.set(deviceId, history);
  }
  
  /**
   * Get detection history for a device
   */
  async getDetectionHistory(deviceId: string): Promise<Date[]> {
    return this.detectionHistory.get(deviceId) || [];
  }
  
  /**
   * Clean up old detection history based on retention policy
   */
  async cleanupHistory(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    for (const [deviceId, history] of this.detectionHistory.entries()) {
      const filteredHistory = history.filter(date => date > cutoffDate);
      if (filteredHistory.length > 0) {
        this.detectionHistory.set(deviceId, filteredHistory);
      } else {
        this.detectionHistory.delete(deviceId);
      }
    }
  }
  
  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalDevices: number;
    knownDevices: number;
    industrialDevices: number;
    recentDetections: number;
  }> {
    const totalDevices = this.devices.size;
    let knownDevices = 0;
    let industrialDevices = 0;
    let recentDetections = 0;
    
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    
    for (const entry of this.devices.values()) {
      if (entry.profile.metadata.source !== 'detected') {
        knownDevices++;
      }
      
      if (entry.profile.shareable.industrialGrade) {
        industrialDevices++;
      }
      
      if (entry.profile.private.lastSeen > dayAgo) {
        recentDetections++;
      }
    }
    
    return {
      totalDevices,
      knownDevices,
      industrialDevices,
      recentDetections
    };
  }
}

/**
 * Community Device Database
 * Handles opt-in community sharing with privacy protection
 */
export class CommunityDeviceDatabase {
  private communityEndpoint: string;
  private enabled: boolean = false;
  
  constructor(endpoint: string = 'https://api.cyreal.io/devices') {
    this.communityEndpoint = endpoint;
  }
  
  /**
   * Enable community sharing (opt-in)
   */
  enable(): void {
    this.enabled = true;
  }
  
  /**
   * Disable community sharing
   */
  disable(): void {
    this.enabled = false;
  }
  
  /**
   * Check if community sharing is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Contribute device profile to community (anonymous only)
   */
  async contributeDevice(profile: DeviceProfile, privacySettings: PrivacySettings): Promise<void> {
    if (!this.enabled || !privacySettings.enableCommunitySharing) {
      return;
    }
    
    // Create anonymous profile with only shareable data
    const anonymousProfile: AnonymousDeviceProfile = {
      id: profile.id,
      data: this.filterShareableData(profile.shareable, privacySettings),
      community: profile.community || {
        confidence: 50,
        contributorCount: 1,
        lastUpdated: new Date(),
        validationScore: 0,
        reportCount: 0,
        flagged: false
      },
      metadata: {
        version: '1.0.0',
        submittedAt: new Date(),
        source: 'community',
        confidence: profile.metadata.confidence
      }
    };
    
    // Submit to community API
    await this.submitToAPI(anonymousProfile);
  }
  
  /**
   * Fetch device profile from community
   */
  async fetchDevice(vid: string, pid: string): Promise<DeviceProfile | null> {
    if (!this.enabled) {
      return null;
    }
    
    try {
      const response = await fetch(`${this.communityEndpoint}/${vid}/${pid}`);
      if (!response.ok) {
        return null;
      }
      
      const communityData = await response.json() as AnonymousDeviceProfile;
      
      // Convert community data to local profile format
      return this.convertCommunityToLocal(communityData);
    } catch (error) {
      console.warn('Failed to fetch from community database:', error);
      return null;
    }
  }
  
  /**
   * Search community database
   */
  async searchCommunity(query: {
    manufacturer?: string;
    capability?: string;
    protocol?: string;
  }): Promise<DeviceProfile[]> {
    if (!this.enabled) {
      return [];
    }
    
    try {
      const params = new URLSearchParams();
      if (query.manufacturer) params.append('manufacturer', query.manufacturer);
      if (query.capability) params.append('capability', query.capability);
      if (query.protocol) params.append('protocol', query.protocol);
      
      const response = await fetch(`${this.communityEndpoint}/search?${params}`);
      if (!response.ok) {
        return [];
      }
      
      const results = await response.json() as AnonymousDeviceProfile[];
      return results.map(data => this.convertCommunityToLocal(data));
    } catch (error) {
      console.warn('Failed to search community database:', error);
      return [];
    }
  }
  
  /**
   * Filter shareable data based on privacy settings
   */
  private filterShareableData(data: ShareableDeviceData, settings: PrivacySettings): ShareableDeviceData {
    const filtered: Partial<ShareableDeviceData> = {
      vid: data.vid,
      pid: data.pid,
      manufacturer: data.manufacturer,
      productFamily: data.productFamily,
      model: data.model
    };
    
    if (settings.shareCapabilities) {
      filtered.capabilities = data.capabilities;
    }
    
    if (settings.shareProtocols) {
      filtered.protocols = data.protocols;
    }
    
    if (settings.shareDefaultSettings) {
      filtered.defaultSettings = data.defaultSettings;
      filtered.recommendedSettings = data.recommendedSettings;
    }
    
    if (settings.sharePhysicalSpecs) {
      filtered.physicalSpecs = data.physicalSpecs;
      filtered.operatingTemp = data.operatingTemp;
      filtered.powerRequirements = data.powerRequirements;
    }
    
    return filtered as ShareableDeviceData;
  }
  
  /**
   * Submit anonymous profile to community API
   */
  private async submitToAPI(profile: AnonymousDeviceProfile): Promise<void> {
    try {
      const response = await fetch(`${this.communityEndpoint}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile)
      });
      
      if (!response.ok) {
        throw new Error(`Community submission failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to submit to community database:', error);
      throw error;
    }
  }
  
  /**
   * Convert community data to local profile format
   */
  private convertCommunityToLocal(communityData: AnonymousDeviceProfile): DeviceProfile {
    // Create minimal private data (since this is from community)
    const privateData: PrivateDeviceData = {
      path: '', // Unknown from community
      detectedAt: new Date(),
      lastSeen: new Date(),
      systemInfo: {
        hostname: '',
        platform: '',
        architecture: ''
      }
    };
    
    return {
      id: communityData.id,
      shareable: communityData.data,
      private: privateData,
      cyreal: {
        compatibility: 'good', // Default for community devices
        suggestedGovernors: [],
        supportedFeatures: [],
        limitations: [],
        testResults: {
          connectionTest: false,
          protocolTest: false
        }
      },
      security: {
        level: 'development',
        warnings: [],
        recommendations: [],
        vulnerabilities: [],
        certifications: []
      },
      community: communityData.community,
      metadata: {
        version: communityData.metadata.version,
        createdAt: communityData.metadata.submittedAt,
        updatedAt: communityData.metadata.submittedAt,
        source: 'community',
        confidence: communityData.metadata.confidence
      }
    };
  }
}

/**
 * Main Device Database
 * Combines local and community databases with privacy controls
 */
export class DeviceDatabase {
  private localDb: LocalDeviceDatabase;
  private communityDb: CommunityDeviceDatabase;
  private privacySettings: PrivacySettings;
  
  constructor(communityEndpoint?: string) {
    this.localDb = new LocalDeviceDatabase();
    this.communityDb = new CommunityDeviceDatabase(communityEndpoint);
    this.privacySettings = {
      enableCommunitySharing: false,
      shareCapabilities: false,
      shareProtocols: false,
      shareDefaultSettings: false,
      shareSecurityProfile: false,
      sharePhysicalSpecs: false,
      retentionDays: 30,
      anonymizeAfterDays: 7,
      consentGiven: false,
      consentVersion: '1.0.0'
    };
  }
  
  /**
   * Get device profile (local first, then community if enabled)
   */
  async getDevice(vid: string, pid: string): Promise<DeviceProfile | null> {
    // Always check local first
    let profile = await this.localDb.getDevice(vid, pid);
    
    // If not found locally and community is enabled, check community
    if (!profile && this.communityDb.isEnabled()) {
      profile = await this.communityDb.fetchDevice(vid, pid);
      
      // Store community result locally for future use
      if (profile) {
        await this.localDb.storeDevice(profile);
      }
    }
    
    return profile;
  }
  
  /**
   * Store device profile locally and contribute to community if enabled
   */
  async storeDevice(profile: DeviceProfile): Promise<void> {
    // Always store locally
    await this.localDb.storeDevice(profile);
    
    // Contribute to community if enabled
    if (this.communityDb.isEnabled()) {
      await this.communityDb.contributeDevice(profile, this.privacySettings);
    }
  }
  
  /**
   * Update privacy settings
   */
  setPrivacySettings(settings: Partial<PrivacySettings>): void {
    this.privacySettings = { ...this.privacySettings, ...settings };
    
    if (settings.enableCommunitySharing) {
      this.communityDb.enable();
    } else {
      this.communityDb.disable();
    }
  }
  
  /**
   * Get current privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    return { ...this.privacySettings };
  }
  
  /**
   * Search devices (local and community)
   */
  async searchDevices(query: {
    manufacturer?: string;
    capability?: string;
    protocol?: string;
  }): Promise<DeviceProfile[]> {
    const localResults = await this.localDb.searchByManufacturer(query.manufacturer || '');
    
    let communityResults: DeviceProfile[] = [];
    if (this.communityDb.isEnabled()) {
      communityResults = await this.communityDb.searchCommunity(query);
    }
    
    // Combine and deduplicate results
    const combined = [...localResults, ...communityResults];
    const unique = new Map<string, DeviceProfile>();
    
    for (const profile of combined) {
      unique.set(profile.id, profile);
    }
    
    return Array.from(unique.values());
  }
  
  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    local: any;
    community: { enabled: boolean; lastSync?: Date };
    privacy: PrivacySettings;
  }> {
    const localStats = await this.localDb.getStats();
    
    return {
      local: localStats,
      community: {
        enabled: this.communityDb.isEnabled(),
        lastSync: undefined // TODO: Track sync timestamp
      },
      privacy: this.privacySettings
    };
  }
  
  /**
   * Clean up old data based on retention policy
   */
  async cleanup(): Promise<void> {
    await this.localDb.cleanupHistory(this.privacySettings.retentionDays);
  }

  /**
   * Get all devices from local database
   */
  async getAllDevices(): Promise<DeviceProfile[]> {
    return await this.localDb.getAllDevices();
  }
}