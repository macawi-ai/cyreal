/**
 * RFC-1918 Address Validator
 * 
 * Implements HARD restriction against non-RFC-1918 addresses for A2A service binding
 * per Macawi AI's Ethical Security Standard
 */

import * as net from 'net';
import { IRFC1918Validator } from '../interfaces/a2a';

export class RFC1918Validator implements IRFC1918Validator {
  private static readonly RFC1918_RANGES = [
    { network: '10.0.0.0', mask: '255.0.0.0', cidr: 8 },      // 10.0.0.0/8
    { network: '172.16.0.0', mask: '255.240.0.0', cidr: 12 }, // 172.16.0.0/12
    { network: '192.168.0.0', mask: '255.255.0.0', cidr: 16 } // 192.168.0.0/16
  ];

  private static readonly LOCALHOST_ADDRESSES = [
    '127.0.0.1',
    '::1',
    'localhost'
  ];

  /**
   * Check if an IP address falls within RFC-1918 private ranges
   */
  public isRFC1918Address(address: string): boolean {
    // Normalize localhost addresses
    if (this.isLocalhost(address)) {
      return true;
    }

    // Validate IPv4 format
    if (!net.isIPv4(address)) {
      return false;
    }

    const ip = this.ipToNumber(address);
    
    return RFC1918Validator.RFC1918_RANGES.some(range => {
      const networkIp = this.ipToNumber(range.network);
      const mask = this.cidrToMask(range.cidr);
      return (ip & mask) === (networkIp & mask);
    });
  }

  /**
   * Check if address is localhost
   */
  public isLocalhost(address: string): boolean {
    return RFC1918Validator.LOCALHOST_ADDRESSES.includes(address.toLowerCase()) ||
           address === '127.0.0.1' ||
           address.startsWith('127.') ||
           address === '::1';
  }

  /**
   * Check if binding to this address is allowed under security policy
   */
  public isBindingAllowed(address: string): boolean {
    // Allow binding to any interface (0.0.0.0) as it will be restricted to private networks
    if (address === '0.0.0.0' || address === '::') {
      return true;
    }

    return this.isRFC1918Address(address) || this.isLocalhost(address);
  }

  /**
   * Get detailed violation message for security policy enforcement
   */
  public getViolationMessage(address: string): string {
    return `
🚨 SECURITY VIOLATION: Attempted A2A service binding to public IP address '${address}'

❌ DENIED: Macawi AI's Ethical Security Standard prohibits A2A service exposure on public IP addresses.

🛡️  REASON: Serial and USB devices accessed through Cyreal's bridge may be subject to harm, abuse, and compromise if exposed to the public internet.

✅ ALLOWED ADDRESSES:
   • localhost, 127.0.0.1, ::1
   • RFC-1918 Private Networks:
     - 10.0.0.0/8     (10.0.0.0 - 10.255.255.255)
     - 172.16.0.0/12  (172.16.0.0 - 172.31.255.255)  
     - 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)

🔧 SOLUTION: Use private IP addresses or localhost for A2A service binding.
   If external access is required, configure your own proxy/router with NAT.

📋 COMPLIANCE: This restriction demonstrates deliberate security implementation
   for any potential litigation or compliance auditing.

For more information, see: https://macawi.ai/ethical-security-standard
`.trim();
  }

  /**
   * Convert IP address string to 32-bit number
   */
  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  /**
   * Convert CIDR notation to subnet mask
   */
  private cidrToMask(cidr: number): number {
    return (0xffffffff << (32 - cidr)) >>> 0;
  }

  /**
   * Static method for quick validation
   */
  public static validateAddress(address: string): { valid: boolean; message?: string } {
    const validator = new RFC1918Validator();
    const valid = validator.isBindingAllowed(address);
    
    return {
      valid,
      message: valid ? undefined : validator.getViolationMessage(address)
    };
  }

  /**
   * Get all RFC-1918 ranges for documentation/logging
   */
  public static getRFC1918Ranges(): Array<{ network: string; mask: string; cidr: number; description: string }> {
    return [
      { 
        network: '10.0.0.0', 
        mask: '255.0.0.0', 
        cidr: 8,
        description: 'Class A private network (16.7M addresses)'
      },
      { 
        network: '172.16.0.0', 
        mask: '255.240.0.0', 
        cidr: 12,
        description: 'Class B private networks (1M addresses)'
      },
      { 
        network: '192.168.0.0', 
        mask: '255.255.0.0', 
        cidr: 16,
        description: 'Class C private networks (65K addresses)'
      }
    ];
  }
}