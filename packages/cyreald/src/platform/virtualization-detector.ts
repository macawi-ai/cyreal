/**
 * Virtualization Detection and Environment Adaptation
 * 
 * Virtual environments present unique challenges for serial port management:
 * - Timing precision is reduced
 * - GPIO access may be limited or unavailable
 * - USB passthrough has different characteristics
 * - Network serial ports may be the preferred option
 * 
 * This module detects virtualization and adjusts Cyreal's behavior accordingly.
 */

import * as fs from 'fs';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as winston from 'winston';

const execAsync = promisify(exec);

export interface VirtualizationInfo {
  isVirtualized: boolean;
  hypervisor: string;
  platform: string;
  confidence: number; // 0-100, how confident we are in detection
  limitations: string[];
  recommendations: string[];
  serialPortStrategy: 'native' | 'usb-passthrough' | 'network-bridge' | 'limited';
  timingPrecision: 'high' | 'medium' | 'low';
  gpioAvailable: boolean;
}

export interface VirtualizationCapabilities {
  serialPortAccess: boolean;
  gpioAccess: boolean;
  realTimeCapable: boolean;
  usbPassthrough: boolean;
  networkBridge: boolean;
  timingGuarantees: boolean;
}

export class VirtualizationDetector {
  private logger: winston.Logger;
  private detectionCache?: VirtualizationInfo;
  private cacheExpiry: number = 300000; // 5 minutes
  private lastDetection: number = 0;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  async detect(): Promise<VirtualizationInfo> {
    const now = Date.now();
    
    // Use cached result if still valid
    if (this.detectionCache && (now - this.lastDetection) < this.cacheExpiry) {
      return this.detectionCache;
    }

    this.logger.debug('Detecting virtualization environment');
    
    const detectors = [
      this.detectVMware.bind(this),
      this.detectHyperV.bind(this),
      this.detectVirtualBox.bind(this),
      this.detectQEMU.bind(this),
      this.detectXen.bind(this),
      this.detectDocker.bind(this),
      this.detectWSL.bind(this),
      this.detectKVM.bind(this),
      this.detectParallels.bind(this),
      this.detectCloudPlatform.bind(this)
    ];

    const results = await Promise.allSettled(
      detectors.map(detector => detector())
    );

    // Combine results to determine best match
    const virtualInfo = this.analyzeResults(results);
    
    this.detectionCache = virtualInfo;
    this.lastDetection = now;
    
    this.logger.info('Virtualization detection complete', {
      isVirtualized: virtualInfo.isVirtualized,
      hypervisor: virtualInfo.hypervisor,
      confidence: virtualInfo.confidence,
      serialStrategy: virtualInfo.serialPortStrategy,
      timingPrecision: virtualInfo.timingPrecision
    });

    return virtualInfo;
  }

  private async detectVMware(): Promise<Partial<VirtualizationInfo>> {
    const indicators = [];
    let confidence = 0;

    try {
      // Check DMI/SMBIOS
      const dmiData = await this.readDMI();
      if (dmiData.includes('VMware')) {
        indicators.push('dmi_vmware');
        confidence += 40;
      }

      // Check for VMware-specific files
      const vmwareFiles = [
        '/proc/scsi/vmware-scsi',
        '/sys/class/dmi/id/product_name'
      ];

      for (const file of vmwareFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          if (content.toLowerCase().includes('vmware')) {
            indicators.push(`file_${file.split('/').pop()}`);
            confidence += 20;
          }
        } catch (e) {
          // File doesn't exist or can't be read
        }
      }

      // Check for VMware tools
      try {
        await execAsync('which vmware-toolbox-cmd');
        indicators.push('vmware_tools');
        confidence += 30;
      } catch (e) {
        // VMware tools not installed
      }

      // Check network interfaces
      const networkInterfaces = os.networkInterfaces();
      for (const [name, interfaces] of Object.entries(networkInterfaces)) {
        if (interfaces?.some(iface => iface.mac?.startsWith('00:50:56'))) {
          indicators.push('vmware_mac');
          confidence += 25;
        }
      }

      if (confidence > 50) {
        return {
          isVirtualized: true,
          hypervisor: 'VMware',
          platform: await this.detectVMwarePlatform(),
          confidence: Math.min(confidence, 95),
          limitations: [
            'Reduced timing precision',
            'GPIO access requires passthrough',
            'Serial ports may be emulated'
          ],
          recommendations: [
            'Use USB passthrough for serial devices',
            'Consider network-based serial bridges',
            'Increase buffer sizes for timing tolerance'
          ],
          serialPortStrategy: 'usb-passthrough',
          timingPrecision: 'medium',
          gpioAvailable: false
        };
      }
    } catch (error) {
      this.logger.debug('VMware detection error:', error);
    }

    return { isVirtualized: false, hypervisor: 'unknown', confidence: 0 };
  }

  private async detectHyperV(): Promise<Partial<VirtualizationInfo>> {
    const indicators = [];
    let confidence = 0;

    try {
      // Check for Hyper-V specific identifiers
      const dmiData = await this.readDMI();
      if (dmiData.includes('Microsoft Corporation')) {
        indicators.push('dmi_microsoft');
        confidence += 30;
      }

      // Windows-specific detection
      if (process.platform === 'win32') {
        try {
          const { stdout } = await execAsync('systeminfo');
          if (stdout.includes('Hyper-V')) {
            indicators.push('systeminfo_hyperv');
            confidence += 40;
          }
        } catch (e) {
          // systeminfo not available or failed
        }

        try {
          const { stdout } = await execAsync('wmic computersystem get manufacturer,model');
          if (stdout.includes('Microsoft Corporation')) {
            indicators.push('wmic_microsoft');
            confidence += 30;
          }
        } catch (e) {
          // wmic not available
        }
      }

      // Check for Hyper-V network adapters
      const networkInterfaces = os.networkInterfaces();
      for (const [name, interfaces] of Object.entries(networkInterfaces)) {
        if (name.toLowerCase().includes('hyper-v')) {
          indicators.push('hyperv_network');
          confidence += 25;
        }
      }

      if (confidence > 50) {
        return {
          isVirtualized: true,
          hypervisor: 'Hyper-V',
          platform: 'Microsoft Hyper-V',
          confidence: Math.min(confidence, 90),
          limitations: [
            'GPIO access not available',
            'Serial ports require COM port mapping',
            'Limited real-time capabilities'
          ],
          recommendations: [
            'Use COM port assignments for serial devices',
            'Configure enhanced session mode for USB',
            'Consider RemoteFX for better performance'
          ],
          serialPortStrategy: 'native',
          timingPrecision: 'medium',
          gpioAvailable: false
        };
      }
    } catch (error) {
      this.logger.debug('Hyper-V detection error:', error);
    }

    return { isVirtualized: false, hypervisor: 'unknown', confidence: 0 };
  }

  private async detectVirtualBox(): Promise<Partial<VirtualizationInfo>> {
    const indicators = [];
    let confidence = 0;

    try {
      // Check DMI for VirtualBox
      const dmiData = await this.readDMI();
      if (dmiData.includes('VirtualBox') || dmiData.includes('innotek')) {
        indicators.push('dmi_virtualbox');
        confidence += 40;
      }

      // Check for VirtualBox Guest Additions
      const vboxFiles = [
        '/usr/bin/VBoxClient',
        '/usr/bin/VBoxControl',
        '/proc/modules' // Check for vboxguest module
      ];

      for (const file of vboxFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('vbox') || content.includes('VBox')) {
            indicators.push(`file_${file.split('/').pop()}`);
            confidence += 20;
          }
        } catch (e) {
          // File doesn't exist
        }
      }

      // Check for VirtualBox MAC addresses
      const networkInterfaces = os.networkInterfaces();
      for (const [name, interfaces] of Object.entries(networkInterfaces)) {
        if (interfaces?.some(iface => iface.mac?.startsWith('08:00:27'))) {
          indicators.push('vbox_mac');
          confidence += 30;
        }
      }

      if (confidence > 50) {
        return {
          isVirtualized: true,
          hypervisor: 'VirtualBox',
          platform: 'Oracle VirtualBox',
          confidence: Math.min(confidence, 85),
          limitations: [
            'GPIO access not available',
            'USB passthrough requires configuration',
            'Serial ports may have latency issues'
          ],
          recommendations: [
            'Enable USB 3.0 controller for better performance',
            'Use host-only networking for serial bridges',
            'Configure USB filters for serial devices'
          ],
          serialPortStrategy: 'usb-passthrough',
          timingPrecision: 'low',
          gpioAvailable: false
        };
      }
    } catch (error) {
      this.logger.debug('VirtualBox detection error:', error);
    }

    return { isVirtualized: false, hypervisor: 'unknown', confidence: 0 };
  }

  private async detectQEMU(): Promise<Partial<VirtualizationInfo>> {
    const indicators = [];
    let confidence = 0;

    try {
      // Check for QEMU in DMI
      const dmiData = await this.readDMI();
      if (dmiData.includes('QEMU')) {
        indicators.push('dmi_qemu');
        confidence += 40;
      }

      // Check for QEMU-specific devices
      try {
        const { stdout } = await execAsync('lspci 2>/dev/null | grep -i qemu || true');
        if (stdout.includes('QEMU')) {
          indicators.push('lspci_qemu');
          confidence += 35;
        }
      } catch (e) {
        // lspci not available
      }

      // Check for virtio devices (common in QEMU)
      try {
        const modules = fs.readFileSync('/proc/modules', 'utf8');
        if (modules.includes('virtio')) {
          indicators.push('virtio_modules');
          confidence += 25;
        }
      } catch (e) {
        // /proc/modules not available
      }

      if (confidence > 50) {
        return {
          isVirtualized: true,
          hypervisor: 'QEMU/KVM',
          platform: 'QEMU Virtual Machine',
          confidence: Math.min(confidence, 80),
          limitations: [
            'GPIO access not available',
            'Serial ports are emulated',
            'Timing precision depends on host'
          ],
          recommendations: [
            'Use virtio-serial for better performance',
            'Configure CPU pinning for better timing',
            'Consider PCI passthrough for critical devices'
          ],
          serialPortStrategy: 'network-bridge',
          timingPrecision: 'medium',
          gpioAvailable: false
        };
      }
    } catch (error) {
      this.logger.debug('QEMU detection error:', error);
    }

    return { isVirtualized: false, hypervisor: 'unknown', confidence: 0 };
  }

  private async detectXen(): Promise<Partial<VirtualizationInfo>> {
    const indicators = [];
    let confidence = 0;

    try {
      // Check for Xen in DMI
      const dmiData = await this.readDMI();
      if (dmiData.includes('Xen')) {
        indicators.push('dmi_xen');
        confidence += 40;
      }

      // Check for Xen-specific files
      const xenFiles = [
        '/proc/xen',
        '/sys/hypervisor/type'
      ];

      for (const file of xenFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('xen')) {
            indicators.push(`file_${file.split('/').pop()}`);
            confidence += 30;
          }
        } catch (e) {
          // File doesn't exist
        }
      }

      if (confidence > 50) {
        return {
          isVirtualized: true,
          hypervisor: 'Xen',
          platform: 'Citrix Xen',
          confidence: Math.min(confidence, 85),
          limitations: [
            'GPIO access not available',
            'Serial ports require PV drivers',
            'Limited real-time capabilities'
          ],
          recommendations: [
            'Use Xen PV drivers for serial devices',
            'Configure dom0 for device passthrough',
            'Consider SR-IOV for network serial'
          ],
          serialPortStrategy: 'limited',
          timingPrecision: 'medium',
          gpioAvailable: false
        };
      }
    } catch (error) {
      this.logger.debug('Xen detection error:', error);
    }

    return { isVirtualized: false, hypervisor: 'unknown', confidence: 0 };
  }

  private async detectDocker(): Promise<Partial<VirtualizationInfo>> {
    const indicators = [];
    let confidence = 0;

    try {
      // Check for Docker-specific files
      if (fs.existsSync('/.dockerenv')) {
        indicators.push('dockerenv_file');
        confidence += 50;
      }

      // Check cgroups
      try {
        const cgroups = fs.readFileSync('/proc/1/cgroup', 'utf8');
        if (cgroups.includes('docker')) {
          indicators.push('cgroups_docker');
          confidence += 40;
        }
      } catch (e) {
        // /proc/1/cgroup not available
      }

      // Check for container runtime
      try {
        const { stdout } = await execAsync('cat /proc/1/sched 2>/dev/null || true');
        if (stdout.includes('docker')) {
          indicators.push('sched_docker');
          confidence += 30;
        }
      } catch (e) {
        // /proc/1/sched not available
      }

      if (confidence > 50) {
        return {
          isVirtualized: true,
          hypervisor: 'Docker',
          platform: 'Docker Container',
          confidence: Math.min(confidence, 90),
          limitations: [
            'GPIO access not available',
            'Serial ports require device mapping',
            'Limited to host devices'
          ],
          recommendations: [
            'Use --device flag to map serial ports',
            'Consider privileged mode for hardware access',
            'Use host networking for serial bridges'
          ],
          serialPortStrategy: 'limited',
          timingPrecision: 'high', // Containers have good timing
          gpioAvailable: false
        };
      }
    } catch (error) {
      this.logger.debug('Docker detection error:', error);
    }

    return { isVirtualized: false, hypervisor: 'unknown', confidence: 0 };
  }

  private async detectWSL(): Promise<Partial<VirtualizationInfo>> {
    const indicators = [];
    let confidence = 0;

    try {
      // Check for WSL-specific environment
      if (process.env.WSL_DISTRO_NAME) {
        indicators.push('wsl_env_var');
        confidence += 60;
      }

      // Check for WSL in kernel version
      try {
        const { stdout } = await execAsync('uname -r');
        if (stdout.includes('WSL') || stdout.includes('Microsoft')) {
          indicators.push('uname_wsl');
          confidence += 50;
        }
      } catch (e) {
        // uname not available
      }

      // Check for WSL interop
      if (fs.existsSync('/proc/sys/fs/binfmt_misc/WSLInterop')) {
        indicators.push('wsl_interop');
        confidence += 40;
      }

      if (confidence > 50) {
        return {
          isVirtualized: true,
          hypervisor: 'WSL',
          platform: 'Windows Subsystem for Linux',
          confidence: Math.min(confidence, 95),
          limitations: [
            'No GPIO access',
            'Serial ports not directly accessible',
            'Limited hardware access'
          ],
          recommendations: [
            'Use WSL2 for better performance',
            'Use usbipd-win for USB device access',
            'Consider Windows host for serial access'
          ],
          serialPortStrategy: 'network-bridge',
          timingPrecision: 'medium',
          gpioAvailable: false
        };
      }
    } catch (error) {
      this.logger.debug('WSL detection error:', error);
    }

    return { isVirtualized: false, hypervisor: 'unknown', confidence: 0 };
  }

  private async detectKVM(): Promise<Partial<VirtualizationInfo>> {
    // KVM detection is often combined with QEMU
    return this.detectQEMU();
  }

  private async detectParallels(): Promise<Partial<VirtualizationInfo>> {
    const indicators = [];
    let confidence = 0;

    try {
      // Check for Parallels in DMI
      const dmiData = await this.readDMI();
      if (dmiData.includes('Parallels')) {
        indicators.push('dmi_parallels');
        confidence += 40;
      }

      // Check for Parallels Tools
      const parallelsFiles = [
        '/usr/bin/prltools',
        '/Applications/Parallels Desktop.app' // macOS
      ];

      for (const file of parallelsFiles) {
        if (fs.existsSync(file)) {
          indicators.push(`file_${file.split('/').pop()}`);
          confidence += 30;
        }
      }

      if (confidence > 50) {
        return {
          isVirtualized: true,
          hypervisor: 'Parallels',
          platform: 'Parallels Desktop',
          confidence: Math.min(confidence, 85),
          limitations: [
            'GPIO access not available',
            'Serial ports may be emulated',
            'macOS-specific limitations'
          ],
          recommendations: [
            'Use Parallels Tools for better integration',
            'Configure USB passthrough',
            'Consider coherence mode for seamless operation'
          ],
          serialPortStrategy: 'usb-passthrough',
          timingPrecision: 'medium',
          gpioAvailable: false
        };
      }
    } catch (error) {
      this.logger.debug('Parallels detection error:', error);
    }

    return { isVirtualized: false, hypervisor: 'unknown', confidence: 0 };
  }

  private async detectCloudPlatform(): Promise<Partial<VirtualizationInfo>> {
    const indicators = [];
    let confidence = 0;

    try {
      // Check for cloud metadata services
      const cloudChecks = [
        { url: 'http://169.254.169.254/latest/meta-data/', platform: 'AWS EC2' },
        { url: 'http://169.254.169.254/metadata/instance/', platform: 'Azure' },
        { url: 'http://metadata.google.internal/computeMetadata/v1/', platform: 'Google Cloud' }
      ];

      // Note: In a real implementation, you'd want to make HTTP requests
      // For now, we'll check for cloud-specific files/indicators
      
      // Check for AWS
      if (fs.existsSync('/sys/hypervisor/uuid')) {
        const uuid = fs.readFileSync('/sys/hypervisor/uuid', 'utf8');
        if (uuid.startsWith('ec2')) {
          indicators.push('aws_uuid');
          confidence += 50;
        }
      }

      // Check for Azure
      const dmiData = await this.readDMI();
      if (dmiData.includes('Microsoft Corporation') && dmiData.includes('7783-7084-3265-9085-8269-3286-77')) {
        indicators.push('azure_dmi');
        confidence += 50;
      }

      // Check for Google Cloud
      if (dmiData.includes('Google') || dmiData.includes('Google Compute Engine')) {
        indicators.push('gcp_dmi');
        confidence += 50;
      }

      if (confidence > 40) {
        const platform = confidence > 40 ? 'Cloud Platform' : 'Unknown Cloud';
        return {
          isVirtualized: true,
          hypervisor: 'Cloud',
          platform,
          confidence: Math.min(confidence, 80),
          limitations: [
            'GPIO access not available',
            'Serial ports not typically available',
            'Network-based solutions preferred'
          ],
          recommendations: [
            'Use cloud-native IoT services',
            'Consider edge computing for hardware access',
            'Use network-based serial bridges'
          ],
          serialPortStrategy: 'network-bridge',
          timingPrecision: 'low',
          gpioAvailable: false
        };
      }
    } catch (error) {
      this.logger.debug('Cloud platform detection error:', error);
    }

    return { isVirtualized: false, hypervisor: 'unknown', confidence: 0 };
  }

  private analyzeResults(results: PromiseSettledResult<Partial<VirtualizationInfo>>[]): VirtualizationInfo {
    const validResults = results
      .filter((result): result is PromiseFulfilledResult<Partial<VirtualizationInfo>> => 
        result.status === 'fulfilled' && result.value.confidence && result.value.confidence > 0
      )
      .map(result => result.value)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    if (validResults.length === 0) {
      // No virtualization detected
      return {
        isVirtualized: false,
        hypervisor: 'bare-metal',
        platform: os.platform(),
        confidence: 90,
        limitations: [],
        recommendations: [
          'Full hardware access available',
          'Optimal timing precision',
          'Direct GPIO access possible'
        ],
        serialPortStrategy: 'native',
        timingPrecision: 'high',
        gpioAvailable: true
      };
    }

    // Use highest confidence result
    const best = validResults[0];
    
    return {
      isVirtualized: true,
      hypervisor: best.hypervisor || 'unknown',
      platform: best.platform || 'unknown',
      confidence: best.confidence || 0,
      limitations: best.limitations || [],
      recommendations: best.recommendations || [],
      serialPortStrategy: best.serialPortStrategy || 'limited',
      timingPrecision: best.timingPrecision || 'low',
      gpioAvailable: best.gpioAvailable || false
    };
  }

  private async readDMI(): Promise<string> {
    try {
      // Try multiple DMI sources
      const dmiSources = [
        '/sys/class/dmi/id/sys_vendor',
        '/sys/class/dmi/id/product_name',
        '/sys/class/dmi/id/product_version',
        '/sys/class/dmi/id/bios_vendor',
        '/sys/class/dmi/id/bios_version'
      ];

      let dmiData = '';
      for (const source of dmiSources) {
        try {
          dmiData += fs.readFileSync(source, 'utf8') + ' ';
        } catch (e) {
          // Skip if file doesn't exist
        }
      }

      return dmiData.toLowerCase();
    } catch (error) {
      return '';
    }
  }

  private async detectVMwarePlatform(): Promise<string> {
    try {
      // Try to determine specific VMware platform
      const { stdout } = await execAsync('vmware-toolbox-cmd stat hosttime 2>/dev/null || echo "VMware"');
      if (stdout.includes('ESX')) return 'VMware ESXi';
      if (stdout.includes('Workstation')) return 'VMware Workstation';
      if (stdout.includes('Fusion')) return 'VMware Fusion';
      return 'VMware';
    } catch (error) {
      return 'VMware';
    }
  }

  getCapabilities(virtInfo: VirtualizationInfo): VirtualizationCapabilities {
    if (!virtInfo.isVirtualized) {
      return {
        serialPortAccess: true,
        gpioAccess: true,
        realTimeCapable: true,
        usbPassthrough: true,
        networkBridge: true,
        timingGuarantees: true
      };
    }

    return {
      serialPortAccess: virtInfo.serialPortStrategy !== 'limited',
      gpioAccess: virtInfo.gpioAvailable,
      realTimeCapable: virtInfo.timingPrecision === 'high',
      usbPassthrough: virtInfo.serialPortStrategy === 'usb-passthrough',
      networkBridge: virtInfo.serialPortStrategy === 'network-bridge',
      timingGuarantees: virtInfo.timingPrecision === 'high'
    };
  }
}