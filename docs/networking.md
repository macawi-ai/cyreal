# Cyreal Network Architecture

## Project Cybersyn Tribute - Port 3500

Cyreal's default TCP port **3500** honors the **Burroughs 3500 mainframe** that Chile's Project Cybersyn was upgraded to in 1973. This revolutionary cybernetic system, architected by **Stafford Beer**, implemented the Viable System Model (VSM) for real-time economic coordination across an entire nation.

Like Cybersyn's telex network connecting factories to central coordination, Cyreal's network layer bridges serial ports to distributed clients, enabling cybernetic control of industrial systems.

## Network Protocols

### TCP Server (Port 3500)
- **Primary protocol** for reliable communication
- JSON-based message format
- Keep-alive support for persistent connections
- Built-in authentication and rate limiting

### UDP Server (Port 3501)
- **Optional protocol** for low-latency messaging
- Broadcast capability for multi-client scenarios
- Stateless communication

### WebSocket Server (Port 3502)
- **Web-friendly protocol** for browser clients
- Real-time bidirectional communication
- Compression support
- SSL/TLS encryption available

## Message Format

All network communication uses JSON messages:

```json
{
  "command": "list_ports",
  "portId": "optional_port_id",
  "params": {
    "data": "optional_parameters"
  }
}
```

## Available Commands

### `list_ports`
Lists all available serial ports and their status.

**Request:**
```json
{ "command": "list_ports" }
```

**Response:**
```json
{
  "type": "port_list",
  "ports": [
    {
      "id": "main",
      "physicalPath": "/dev/ttyUSB0",
      "type": "rs485",
      "status": "operational",
      "metrics": {
        "bytesReceived": 1024,
        "bytesTransmitted": 512,
        "errorsCount": 0,
        "uptime": 30000
      }
    }
  ],
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

### `daemon_status`
Gets comprehensive daemon status including platform info and network metrics.

**Request:**
```json
{ "command": "daemon_status" }
```

**Response:**
```json
{
  "type": "daemon_status",
  "platform": {
    "name": "BeagleBone AI-64",
    "arch": "arm64",
    "specialFeatures": ["pru", "mikrobus", "ai_accelerator"]
  },
  "activePorts": 2,
  "config": {
    "tcpPort": 3500,
    "securityLevel": "balanced"
  },
  "network": {
    "clients": 3,
    "metrics": {
      "tcpConnections": 2,
      "websocketConnections": 1,
      "bytesTransmitted": 4096,
      "bytesReceived": 2048,
      "uptime": 120000
    }
  }
}
```

### `port_status`
Gets detailed status for a specific port.

**Request:**
```json
{
  "command": "port_status",
  "portId": "main"
}
```

**Response:**
```json
{
  "type": "port_status",
  "portId": "main",
  "status": "operational",
  "metrics": {
    "bytesReceived": 1024,
    "bytesTransmitted": 512,
    "errorsCount": 0,
    "lastActivity": "2025-01-08T10:29:45.000Z"
  },
  "fingerprint": {
    "deviceType": "FTDI_USB_Serial",
    "vendorId": "0403",
    "productId": "6001"
  }
}
```

### `send_data`
Sends data to a specific serial port.

**Request:**
```json
{
  "command": "send_data",
  "portId": "main",
  "params": {
    "data": "Hello, industrial device!"
  }
}
```

**Response:**
```json
{
  "type": "data_sent",
  "portId": "main",
  "success": true,
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

## Security Features

### Authentication Levels
- **Paranoid**: Strict token-based authentication
- **Balanced**: Moderate security (default)
- **Permissive**: Minimal authentication for development
- **Debug**: No authentication (development only)

### Rate Limiting
- Configurable requests per minute
- Automatic IP blacklisting
- Whitelist support for trusted networks

### IP Filtering
```yaml
security:
  allowedIPs:
    - "127.0.0.1"
    - "192.168.1.0/24"
    - "10.0.0.0/8"
```

### SSL/TLS Support
```yaml
network:
  ssl:
    enabled: true
    cert: /path/to/certificate.pem
    key: /path/to/private-key.pem
    ca: /path/to/ca.pem
```

## Client Examples

### Node.js TCP Client
```javascript
const net = require('net');
const client = new net.Socket();

client.connect(3500, 'localhost', () => {
  console.log('Connected to Cyreal Cybersyn port 3500');
  
  // List all ports
  client.write(JSON.stringify({ command: 'list_ports' }) + '\n');
});

client.on('data', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message);
});
```

### Python TCP Client
```python
import socket
import json

client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect(('localhost', 3500))

# Send command
command = {'command': 'daemon_status'}
client.send((json.dumps(command) + '\n').encode())

# Receive response
response = client.recv(4096).decode()
data = json.loads(response)
print(f"Daemon status: {data}")
```

### WebSocket Client (Browser)
```javascript
const ws = new WebSocket('ws://localhost:3502/ws');

ws.onopen = () => {
  console.log('Connected to Cyreal WebSocket');
  ws.send(JSON.stringify({ command: 'list_ports' }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## Configuration

### Basic Network Setup
```yaml
network:
  tcp:
    enabled: true
    port: 3500              # Project Cybersyn tribute
    host: 0.0.0.0
    maxConnections: 10
    
  udp:
    enabled: false
    port: 3501
    
  websocket:
    enabled: false
    port: 3502
    path: /ws
```

### Production Security
```yaml
network:
  tcp:
    port: 3500
    host: 127.0.0.1         # Localhost only
    
security:
  level: balanced
  allowedIPs:
    - "192.168.1.0/24"
  authToken: "your-secret-token"
  
  rateLimit:
    enabled: true
    requestsPerMinute: 30
    blacklistDuration: 3600000  # 1 hour
```

## Historical Context

The choice of port 3500 reflects Cyreal's philosophical foundation in cybernetic systems theory:

- **1973**: Chile's Project Cybersyn upgraded to Burroughs 3500 mainframe
- **Architect**: Stafford Beer, pioneer of management cybernetics
- **Purpose**: Real-time economic coordination using VSM principles
- **Legacy**: First attempt at cybernetic governance of an entire nation

By using port 3500, Cyreal honors this revolutionary experiment in applying cybernetic principles to real-world systems, continuing the vision of adaptive, self-regulating technological infrastructure.

## Troubleshooting

### Connection Issues
```bash
# Test TCP connection
telnet localhost 3500

# Test with netcat
nc -v localhost 3500

# Check if port is listening
netstat -tlnp | grep 3500
```

### WebSocket Issues
```bash
# Test WebSocket connection
websocat ws://localhost:3502/ws
```

### Firewall Configuration
```bash
# Linux (ufw)
sudo ufw allow 3500/tcp

# Linux (iptables)
sudo iptables -A INPUT -p tcp --dport 3500 -j ACCEPT

# Windows
netsh advfirewall firewall add rule name="Cyreal TCP" dir=in action=allow protocol=TCP localport=3500
```