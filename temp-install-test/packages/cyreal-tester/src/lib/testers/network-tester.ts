/**
 * Network Tester - Tests connectivity to Cyreal daemon
 */

import * as net from 'net';
import * as dgram from 'dgram';
import WebSocket from 'ws';
import { 
  TestRunnerOptions, 
  NetworkConnectivityResult,
  CyrealDaemonStatus 
} from '../../types/test-types';

export class NetworkTester {
  private options: TestRunnerOptions;

  constructor(options: TestRunnerOptions) {
    this.options = options;
  }

  async testTcpConnection(host: string, port: number): Promise<NetworkConnectivityResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          protocol: 'tcp',
          host,
          port,
          connected: false,
          error: 'Connection timeout'
        });
      }, 5000);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;
        socket.destroy();
        
        resolve({
          protocol: 'tcp',
          host,
          port,
          connected: true,
          latency,
          features: ['cybersyn-tribute-port-3500']
        });
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          protocol: 'tcp',
          host,
          port,
          connected: false,
          error: error.message
        });
      });
    });
  }

  async testUdpConnection(host: string, port: number): Promise<NetworkConnectivityResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const client = dgram.createSocket('udp4');
      const testMessage = Buffer.from(JSON.stringify({ 
        command: 'ping', 
        timestamp: Date.now() 
      }));

      const timeout = setTimeout(() => {
        client.close();
        resolve({
          protocol: 'udp',
          host,
          port,
          connected: false,
          error: 'UDP response timeout'
        });
      }, 5000);

      client.on('message', (msg, rinfo) => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;
        client.close();
        
        resolve({
          protocol: 'udp',
          host,
          port,
          connected: true,
          latency,
          features: ['udp-messaging']
        });
      });

      client.on('error', (error) => {
        clearTimeout(timeout);
        client.close();
        resolve({
          protocol: 'udp',
          host,
          port,
          connected: false,
          error: error.message
        });
      });

      client.send(testMessage, port, host);
    });
  }

  async testWebSocketConnection(host: string, port: number): Promise<NetworkConnectivityResult> {
    const startTime = Date.now();
    const wsUrl = `ws://${host}:${port}/ws`;
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          protocol: 'websocket',
          host,
          port,
          connected: false,
          error: 'WebSocket connection timeout'
        });
      }, 5000);

      try {
        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          ws.close();
          
          resolve({
            protocol: 'websocket',
            host,
            port,
            connected: true,
            latency,
            features: ['real-time-bidirectional', 'compression-support']
          });
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          resolve({
            protocol: 'websocket',
            host,
            port,
            connected: false,
            error: error.message
          });
        });

      } catch (error) {
        clearTimeout(timeout);
        resolve({
          protocol: 'websocket',
          host,
          port,
          connected: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  async testDaemonCommands(host: string, port: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let responseData = '';

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Command test timeout'));
      }, 10000);

      socket.connect(port, host, () => {
        // Test basic daemon status command
        const command = JSON.stringify({ command: 'daemon_status' }) + '\n';
        socket.write(command);
      });

      socket.on('data', (data) => {
        responseData += data.toString();
        
        try {
          const response = JSON.parse(responseData);
          clearTimeout(timeout);
          socket.destroy();
          
          resolve({
            commandSupported: true,
            response,
            features: Object.keys(response)
          });
        } catch (e) {
          // Incomplete JSON, wait for more data
        }
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async getDaemonStatus(host: string, port: number): Promise<CyrealDaemonStatus> {
    try {
      const result = await this.testDaemonCommands(host, port);
      
      return {
        running: true,
        version: result.response?.version || 'unknown',
        uptime: result.response?.uptime || 0,
        platform: result.response?.platform,
        activePorts: result.response?.activePorts || 0,
        networkStatus: {
          tcp: result.response?.network?.protocols?.tcp || false,
          udp: result.response?.network?.protocols?.udp || false,
          websocket: result.response?.network?.protocols?.websocket || false
        }
      };
    } catch (error) {
      return {
        running: false,
        lastError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async pingDaemon(host: string, port: number, count: number = 3): Promise<{
    packetsTransmitted: number;
    packetsReceived: number;
    packetLoss: number;
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
  }> {
    const results: number[] = [];
    let received = 0;

    for (let i = 0; i < count; i++) {
      try {
        const result = await this.testTcpConnection(host, port);
        if (result.connected && result.latency !== undefined) {
          results.push(result.latency);
          received++;
        }
      } catch (error) {
        // Packet lost
      }
    }

    const packetLoss = ((count - received) / count) * 100;
    const avgLatency = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0;
    const minLatency = results.length > 0 ? Math.min(...results) : 0;
    const maxLatency = results.length > 0 ? Math.max(...results) : 0;

    return {
      packetsTransmitted: count,
      packetsReceived: received,
      packetLoss,
      avgLatency,
      minLatency,
      maxLatency
    };
  }
}