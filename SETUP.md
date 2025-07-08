# Cyreal Development Setup Guide

This guide helps developers set up a Cyreal development environment and test the cybernetic serial port bridge with various hardware platforms.

## Quick Start for Development

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- Platform-specific build tools (see [Installation Guide](docs/installation.md))

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/cyreal-project/cyreal.git
cd cyreal

# Run automated installer (recommended)
./install.sh  # Linux/macOS
# or
powershell -ExecutionPolicy Bypass -File install.ps1  # Windows

# OR manual installation:
npm install
npm run build
```

## Platform-Specific Setup

### 1. BeagleBone AI-64 with MikroBUS Click Boards

```bash
# Enable UART for MikroBUS socket
sudo nano /boot/uEnv.txt
# Add these lines:
# enable_uboot_overlays=1
# uboot_overlay_addr1=/lib/firmware/BB-UART3-00A0.dtbo
# Save and reboot

# Test the setup
cyreald list  # Should show /dev/ttyS3

# Start with RS-485 Click board (MIKROE-1865)
cyreald start \
  --port /dev/ttyS3 \
  --baudrate 115200 \
  --rs485 \
  --rts-pin 64 \
  --log-level debug

# For multiple Click boards with MIKROE-2880 Shuttle:
cyreald start \
  --port /dev/ttyS3 --name "RS485_BUS" --rs485 --rts-pin 64 \
  --port /dev/ttyS4 --name "CAN_SERIAL" \
  --port /dev/ttyS5 --name "LORA_MODULE"
```

**Expected Output:**
```
🤖 Starting Cyreald - Cybernetic Serial Port Daemon
🔍 Platform detected: BeagleBone AI-64
⚡ Features: PRU, MikroE Click, AI Accelerator
📡 Configuring RS-485 with Mikroe Click pinout
✅ PRU subsystem available for microsecond-precision timing
📈 RS-485 governor learning bus topology...
```

### 2. Windows with USB Serial Adapters

```powershell
# List available COM ports
cyreald list

# Test with FTDI adapter
cyreald start --port COM3 --baudrate 115200

# Test RS-485 using RTS/DTR control (automatic on Windows)
cyreald start --port COM3 --baudrate 9600 --rs485

# Multiple adapters
cyreald start `
  --port COM3 --name "MAIN_BUS" --rs485 `
  --port COM4 --name "SENSOR_ARRAY" `
  --tcp-port 3001
```

### 3. Raspberry Pi with GPIO Control

```bash
# Enable UART
sudo raspi-config
# Interface Options -> Serial Port -> Enable

# Test with USB adapter
cyreald start --port /dev/ttyUSB0 --baudrate 115200

# Test with GPIO RS-485 control
cyreald start \
  --port /dev/ttyAMA0 \
  --baudrate 9600 \
  --rs485 \
  --rts-pin 17
```

**Expected Output:**
```
🤖 Starting Cyreald - Cybernetic Serial Port Daemon
🔍 Platform detected: Banana Pi BPI-M7
⚡ Features: 6 TOPS NPU, PCIe, HDMI Input
🧠 NPU available for AI-enhanced pattern recognition
🚀 Enabling high-speed serial capabilities (up to 6Mbps)
📊 Learning pattern governor leveraging NPU acceleration
```

### 3. Raspberry Pi 5

```bash
# Enable UART on Pi 5
sudo raspi-config
# Interface Options -> Serial Port -> Enable

# Install GPIO support
sudo apt update
sudo apt install -y gpiod

# Test RP1 chip features
cd packages/cyreald
npm run build
sudo node dist/cli.js test --port /dev/ttyAMA0

# Start with RP1 optimizations
sudo node dist/cli.js start \
  --port /dev/ttyAMA0 \
  --type rs232 \
  --baudrate 921600 \
  --daemon
```

**Expected Output:**
```
🤖 Starting Cyreald - Cybernetic Serial Port Daemon
🔍 Platform detected: Raspberry Pi 5
⚡ Features: RP1 Chip, PCIe, Dual 4K
🔧 RP1 I/O controller optimization enabled
📊 Enhanced electrical monitoring available
⚙️  Configuring for optimal RP1 performance
```

## Testing Your Setup

### 1. List Available Ports

```bash
cd packages/cyreald
node dist/cli.js list
```

### 2. Generate Platform Config

```bash
node dist/cli.js generate-config --output my-config.json
cat my-config.json
```

### 3. Interactive Testing

```bash
# Start in interactive mode
sudo node dist/cli.js start --port /dev/ttyUSB0

# Commands available:
# status  - Show system status
# ports   - List active ports  
# help    - Show commands
# quit    - Exit
```

### 4. Monitor Learning

```bash
# In another terminal, watch the logs
tail -f /var/log/cyreal/cyreald.log

# You'll see learning events like:
# [SerialPortController_default] Governor learning completed
# [BufferModeGovernor] Switching to raw mode for firmware upload
# [DeviceChangeDetector] New device fingerprint detected
```

## Cybernetic Features in Action

### Adaptive Baud Rate Selection

```bash
# Connect an ESP32 and watch Cyreal learn
sudo node dist/cli.js start --port /dev/ttyUSB0 --daemon

# Cyreal will:
# 1. Test different baud rates
# 2. Learn which works best with your ESP32
# 3. Remember the optimal setting
# 4. Auto-configure for similar devices
```

### RS-485 Multi-Drop Bus Learning

```bash
# Connect multiple RS-485 devices
sudo node dist/cli.js start --port /dev/ttyO4 --type rs485 --rs485-pin 78

# Watch the system:
# 1. Discover all devices on the bus
# 2. Learn communication patterns
# 3. Optimize timing for collision avoidance
# 4. Build device profiles
```

### Platform-Specific Optimizations

Each platform automatically optimizes based on hardware:

- **BeagleBone AI-64**: Uses PRU for microsecond timing precision
- **Banana Pi BPI-M7**: Leverages NPU for pattern recognition
- **Raspberry Pi 5**: Optimizes for RP1 chip capabilities

## Troubleshooting

### Permission Issues
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER
logout  # Re-login required

# Or run with sudo for testing
sudo node dist/cli.js start --port /dev/ttyUSB0
```

### GPIO Access Issues
```bash
# BeagleBone AI-64
sudo chmod 666 /dev/gpiochip*

# Raspberry Pi 5  
sudo chmod 666 /dev/gpiochip4

# Check GPIO availability
ls -la /dev/gpiochip*
```

### Serial Port Not Found
```bash
# List all ports
node dist/cli.js list

# Check USB serial devices
lsusb
dmesg | grep tty

# Check UART availability
ls -la /dev/tty*
```

## Next Steps

1. **MCP Integration**: Connect to Claude or other AI systems
2. **Industrial Protocols**: Add Modbus RTU support for DIN rail devices
3. **Network Features**: Enable TCP/UDP bridging
4. **Custom Governors**: Implement application-specific learning patterns

Your hardware-optimized Cyreal system is now ready to provide cybernetic serial port management!