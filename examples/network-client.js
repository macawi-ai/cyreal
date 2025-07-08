#!/usr/bin/env node

/**
 * Example Network Client for Cyreal
 * Demonstrates connecting to the Cybersyn tribute port 3500
 */

const net = require('net');
const readline = require('readline');

// Connect to Cyreal daemon on Project Cybersyn tribute port
const client = new net.Socket();
const PORT = 3500;
const HOST = 'localhost';

console.log('🇨🇱 Connecting to Cyreal on Project Cybersyn tribute port 3500...');
console.log('   (Honoring the Burroughs 3500 mainframe from Chile\'s cybernetic experiment)');

client.connect(PORT, HOST, () => {
  console.log('✅ Connected to Cyreal daemon');
  console.log('📖 Available commands:');
  console.log('   list_ports    - List all serial ports');
  console.log('   daemon_status - Get daemon status');
  console.log('   port_status <portId> - Get port status');
  console.log('   send_data <portId> <data> - Send data to port');
  console.log('   quit - Disconnect');
  console.log('');
  
  startInteractiveMode();
});

client.on('data', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    switch (message.type) {
      case 'welcome':
        console.log('🎉 Welcome Message:');
        console.log(`   Message: ${message.message}`);
        console.log(`   Port: ${message.port}`);
        console.log(`   Tribute: ${message.tribute}`);
        console.log(`   Architect: ${message.architect}`);
        console.log(`   Security: ${message.securityLevel}`);
        console.log('');
        break;
        
      case 'port_list':
        console.log('📡 Serial Ports:');
        message.ports.forEach((port, index) => {
          console.log(`   ${index + 1}. ${port.id} (${port.physicalPath})`);
          console.log(`      Type: ${port.type}`);
          console.log(`      Status: ${port.status}`);
          console.log(`      Metrics: ${JSON.stringify(port.metrics)}`);
        });
        console.log('');
        break;
        
      case 'daemon_status':
        console.log('🔍 Daemon Status:');
        console.log(`   Platform: ${message.platform.name}`);
        console.log(`   Active Ports: ${message.activePorts}`);
        console.log(`   TCP Port: ${message.config.tcpPort}`);
        console.log(`   Security: ${message.config.securityLevel}`);
        if (message.network) {
          console.log(`   Network Clients: ${message.network.clients}`);
          console.log(`   TCP Connections: ${message.network.metrics.tcpConnections}`);
        }
        console.log('');
        break;
        
      case 'port_status':
        console.log(`📊 Port Status (${message.portId}):`);
        console.log(`   Status: ${message.status}`);
        console.log(`   Metrics: ${JSON.stringify(message.metrics, null, 2)}`);
        if (message.fingerprint) {
          console.log(`   Device: ${message.fingerprint.deviceType}`);
        }
        console.log('');
        break;
        
      case 'data_sent':
        console.log(`✅ Data sent to port ${message.portId}`);
        break;
        
      case 'error':
        console.log(`❌ Error: ${message.message}`);
        break;
        
      default:
        console.log('📨 Received:', message);
    }
  } catch (error) {
    console.log('📨 Raw data:', data.toString());
  }
});

client.on('close', () => {
  console.log('🔌 Connection closed');
  process.exit(0);
});

client.on('error', (error) => {
  console.error('❌ Connection error:', error);
  process.exit(1);
});

function startInteractiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'cyreal> '
  });
  
  rl.prompt();
  
  rl.on('line', (line) => {
    const input = line.trim();
    
    if (input === 'quit') {
      client.destroy();
      return;
    }
    
    const parts = input.split(' ');
    const command = parts[0];
    
    let message;
    
    switch (command) {
      case 'list_ports':
        message = { command: 'list_ports' };
        break;
        
      case 'daemon_status':
        message = { command: 'daemon_status' };
        break;
        
      case 'port_status':
        if (parts.length < 2) {
          console.log('❌ Usage: port_status <portId>');
          rl.prompt();
          return;
        }
        message = { command: 'port_status', portId: parts[1] };
        break;
        
      case 'send_data':
        if (parts.length < 3) {
          console.log('❌ Usage: send_data <portId> <data>');
          rl.prompt();
          return;
        }
        message = { 
          command: 'send_data', 
          portId: parts[1], 
          params: { data: parts.slice(2).join(' ') }
        };
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        rl.prompt();
        return;
    }
    
    client.write(JSON.stringify(message) + '\n');
    rl.prompt();
  });
}