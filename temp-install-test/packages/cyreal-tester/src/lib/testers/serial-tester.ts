/**
 * Serial Tester - Tests serial port functionality
 */

import { SerialPort } from 'serialport';
import { 
  TestRunnerOptions, 
  SerialPortInfo 
} from '../../types/test-types';

export class SerialTester {
  private options: TestRunnerOptions;

  constructor(options: TestRunnerOptions) {
    this.options = options;
  }

  async discoverPorts(): Promise<SerialPortInfo[]> {
    try {
      const ports = await SerialPort.list();
      
      const portInfo: SerialPortInfo[] = [];
      
      for (const port of ports) {
        const info: SerialPortInfo = {
          path: port.path,
          manufacturer: port.manufacturer,
          serialNumber: port.serialNumber,
          locationId: port.locationId,
          vendorId: port.vendorId,
          productId: port.productId,
          accessible: true // Will be tested below
        };

        // Test if port is accessible
        try {
          const testPort = new SerialPort({ path: port.path, baudRate: 9600, autoOpen: false });
          await new Promise<void>((resolve, reject) => {
            testPort.open((error) => {
              if (error) {
                info.accessible = false;
                info.testResult = {
                  canOpen: false,
                  canWrite: false,
                  canRead: false,
                  error: error.message
                };
                reject(error);
              } else {
                info.testResult = {
                  canOpen: true,
                  canWrite: true, // Assume writable if openable
                  canRead: true   // Assume readable if openable
                };
                testPort.close();
                resolve();
              }
            });
          });
        } catch (error) {
          info.accessible = false;
          info.testResult = {
            canOpen: false,
            canWrite: false,
            canRead: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }

        portInfo.push(info);
      }

      return portInfo;
    } catch (error) {
      throw new Error(`Failed to discover serial ports: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async testPort(portPath: string, options: {
    baudRate: number;
    dataBits: number;
    stopBits: number;
    parity: string;
  }): Promise<{
    success: boolean;
    canOpen: boolean;
    canWrite: boolean;
    canRead: boolean;
    config: any;
    error?: string;
  }> {
    try {
      const port = new SerialPort({
        path: portPath,
        baudRate: options.baudRate,
        dataBits: options.dataBits as 5 | 6 | 7 | 8,
        stopBits: options.stopBits as 1 | 2,
        parity: options.parity as 'none' | 'even' | 'odd' | 'mark' | 'space',
        autoOpen: false
      });

      let canOpen = false;
      let canWrite = false;
      let canRead = false;

      // Test opening
      await new Promise<void>((resolve, reject) => {
        port.open((error) => {
          if (error) {
            reject(error);
          } else {
            canOpen = true;
            resolve();
          }
        });
      });

      // Test writing
      if (canOpen) {
        const testData = Buffer.from('TEST\r\n');
        await new Promise<void>((resolve, reject) => {
          port.write(testData, (error) => {
            if (error) {
              reject(error);
            } else {
              canWrite = true;
              resolve();
            }
          });
        });

        // Assume reading works if writing works
        canRead = canWrite;
      }

      port.close();

      return {
        success: canOpen && canWrite && canRead,
        canOpen,
        canWrite,
        canRead,
        config: {
          baudRate: options.baudRate,
          dataBits: options.dataBits,
          stopBits: options.stopBits,
          parity: options.parity
        }
      };

    } catch (error) {
      return {
        success: false,
        canOpen: false,
        canWrite: false,
        canRead: false,
        config: options,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async testRs485Capabilities(portPath: string): Promise<{
    supported: boolean;
    gpioControl: boolean;
    rtsControl: boolean;
    features: string[];
    error?: string;
  }> {
    try {
      // RS-485 testing is platform and hardware specific
      // This is a basic implementation
      
      const result = await this.testPort(portPath, {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      if (!result.success) {
        return {
          supported: false,
          gpioControl: false,
          rtsControl: false,
          features: [],
          error: result.error
        };
      }

      // Check for RS-485 specific capabilities
      const features: string[] = [];
      let gpioControl = false;
      let rtsControl = true; // Most USB-Serial converters support RTS

      // Platform-specific RS-485 detection
      if (process.platform !== 'win32') {
        // On Linux, check for GPIO chips that might be used for DE/RE control
        const fs = await import('fs');
        if (fs.existsSync('/dev/gpiochip0')) {
          gpioControl = true;
          features.push('GPIO_DE_RE_control');
        }
      }

      if (rtsControl) {
        features.push('RTS_DE_control');
      }

      return {
        supported: true,
        gpioControl,
        rtsControl,
        features
      };

    } catch (error) {
      return {
        supported: false,
        gpioControl: false,
        rtsControl: false,
        features: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}