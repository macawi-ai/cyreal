# Platform-Specific Guide

This guide covers platform-specific setup, optimization, and considerations for running Cyreal on various operating systems and hardware platforms.

## Table of Contents

- [Operating Systems](#operating-systems)
  - [Windows](#windows)
  - [Linux](#linux)
  - [macOS](#macos)
- [Single Board Computers](#single-board-computers)
  - [BeagleBone AI-64](#beaglebone-ai-64)
  - [Raspberry Pi](#raspberry-pi)
  - [Banana Pi BPI-M7](#banana-pi-bpi-m7)
- [Industrial Platforms](#industrial-platforms)
- [Virtual Environments](#virtual-environments)

## Operating Systems

### Windows

#### Supported Versions
- Windows 10 (version 1903 or later)
- Windows 11
- Windows Server 2019/2022

#### Serial Port Naming
Windows uses COM port naming (COM1, COM2, etc.):
```bash
# List available COM ports
cyreal-core list
# Output: COM1, COM3, COM7, etc.

# Connect to a port
cyreal-core start --port COM3 --baudrate 115200
```

#### USB Serial Drivers
Common USB-to-serial adapters and their drivers:

| Chipset | Driver | Notes |
|---------|---------|-------|
| FTDI | Built-in (Win10+) | Most reliable |
| CH340/CH341 | [Download](http://www.wch-ic.com/downloads/CH341SER_EXE.html) | Common in Arduino clones |
| CP2102 | [Download](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) | Silicon Labs |
| PL2303 | [Download](http://www.prolific.com.tw/US/ShowProduct.aspx?p_id=225&pcid=41) | Legacy support |

#### RS-485 on Windows
Windows doesn't have GPIO, so RS-485 control uses RTS/DTR signals:
```bash
# RS-485 with automatic RTS control
cyreal-core start --port COM5 --baudrate 9600 --rs485

# Manual RTS control via serial port settings
# Handled automatically by Cyreal
```

#### Windows-Specific Features
1. **Event Log Integration**: Cyreal can write to Windows Event Log
2. **Performance Counters**: Monitor via Performance Monitor
3. **Windows Service**: Install as a service for automatic startup

#### Common Issues

**Issue**: "Access Denied" on COM port
```powershell
# Check what's using the port
Get-Process | Where-Object {$_.ProcessName -like "*serial*"}

# Or use built-in tool
mode COM3
```

**Issue**: High CPU usage with USB adapters
- Update USB drivers
- Disable USB selective suspend in Power Options
- Use FTDI adapters for best performance

### Linux

#### Supported Distributions
- Ubuntu 20.04 LTS and later
- Debian 10 and later
- Fedora 35 and later
- RHEL/CentOS 8 and later
- Arch Linux (rolling release)
- Raspberry Pi OS

#### Serial Port Naming
Linux uses device files in `/dev/`:
```bash
# Built-in serial ports
/dev/ttyS0, /dev/ttyS1, etc.

# USB serial adapters
/dev/ttyUSB0, /dev/ttyUSB1, etc.

# USB ACM devices
/dev/ttyACM0, /dev/ttyACM1, etc.

# Platform-specific
/dev/ttyAMA0  # Raspberry Pi UART
/dev/ttyO0    # BeagleBone UART
```

#### Permissions Setup
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER

# For GPIO access (if needed)
sudo usermod -a -G gpio $USER

# Logout and login for changes to take effect
```

#### udev Rules
Create custom udev rules for consistent device naming:

Create `/etc/udev/rules.d/99-cyreal.rules`:
```
# FTDI devices
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", SYMLINK+="cyreal_ftdi"

# CH340 devices
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", SYMLINK+="cyreal_ch340"

# Custom serial number
SUBSYSTEM=="tty", ATTRS{serial}=="A12345", SYMLINK+="cyreal_main"
```

Reload rules:
```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

#### Real-Time Priority
For low-latency operations:
```bash
# Add to /etc/security/limits.conf
@dialout    -    rtprio    99
@dialout    -    nice     -20
```

#### Linux-Specific Features
1. **GPIO Control**: Direct GPIO access for RS-485
2. **Device Tree Overlays**: Custom hardware configuration
3. **systemd Integration**: Advanced service management
4. **cgroups**: Resource limitation and monitoring

### macOS

#### Supported Versions
- macOS 10.15 (Catalina) and later
- macOS 11 (Big Sur)
- macOS 12 (Monterey)
- macOS 13 (Ventura)
- macOS 14 (Sonoma)

#### Serial Port Naming
macOS uses `/dev/` with specific prefixes:
```bash
# USB serial devices
/dev/tty.usbserial-*
/dev/cu.usbserial-*

# Bluetooth serial
/dev/tty.Bluetooth-*

# Built-in ports (rare)
/dev/ttys*
```

#### Driver Installation
Most USB-serial adapters require drivers on macOS:

1. **FTDI**: Native support in macOS 10.9+
2. **CH340**: Requires [driver](https://github.com/adrianmihalko/ch340g-ch34g-ch34x-mac-os-x-driver)
3. **CP2102**: Requires [Silicon Labs driver](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)

#### Security & Privacy
macOS may require approval for kernel extensions:
1. System Preferences → Security & Privacy
2. Allow driver software
3. Restart if required

#### macOS-Specific Considerations
- No GPIO support
- Limited to USB/Thunderbolt serial adapters
- Excellent stability with quality adapters
- Power management may affect USB devices

## Single Board Computers

### BeagleBone AI-64

#### Overview
- **CPU**: Dual-core ARM Cortex-A72 @ 2.0GHz
- **Special Features**: PRU subsystem, DSP cores, MikroBUS support
- **Serial Ports**: 6 UARTs available

#### Serial Port Mapping
```bash
# Main console
/dev/ttyS0

# MikroBUS Click
/dev/ttyS3  # UART3 on MikroBUS socket

# Additional UARTs
/dev/ttyS1, /dev/ttyS2, /dev/ttyS4, /dev/ttyS5
```

#### Enable UARTs
Edit `/boot/uEnv.txt`:
```bash
# Enable UART overlays
enable_uboot_overlays=1
uboot_overlay_addr0=/lib/firmware/BB-UART1-00A0.dtbo
uboot_overlay_addr1=/lib/firmware/BB-UART3-00A0.dtbo
uboot_overlay_addr2=/lib/firmware/BB-UART4-00A0.dtbo
```

#### MikroBUS Click Setup
For MIKROE-2880 Shuttle Click with multiple boards:
```bash
# Configure device tree for MikroBUS
echo "uboot_overlay_addr3=/lib/firmware/BB-MIKROBUS-CLICK.dtbo" >> /boot/uEnv.txt

# GPIO mapping for RS-485 control
# Click Socket 1: GPIO 2_0 (pin 64)
# Click Socket 2: GPIO 2_1 (pin 65)
# Click Socket 3: GPIO 2_2 (pin 66)
# Click Socket 4: GPIO 2_3 (pin 67)
```

#### PRU Configuration (Advanced)
For microsecond-precise timing:
```bash
# Install PRU support
sudo apt install ti-pru-cgt-installer

# Load PRU firmware for serial timing
echo "uboot_overlay_pru=/lib/firmware/AM335X-PRU-RPROC-4-19-TI-00A0.dtbo" >> /boot/uEnv.txt
```

#### Cyreal Configuration
```bash
# Start with MikroBUS RS-485 Click
cyreald start --port /dev/ttyS3 --baudrate 115200 --rs485 --rts-pin 64

# Multiple ports with Shuttle Click
cyreald start \
  --port /dev/ttyS3 --name "RS485_BUS" --rs485 --rts-pin 64 \
  --port /dev/ttyS4 --name "CAN_SERIAL" \
  --port /dev/ttyS5 --name "LORA_MODULE"
```

### Raspberry Pi

#### Supported Models
- Raspberry Pi 3B/3B+
- Raspberry Pi 4B (all RAM variants)
- Raspberry Pi 5
- Raspberry Pi Zero 2 W
- Raspberry Pi CM4

#### UART Configuration

**Raspberry Pi 3/4:**
Edit `/boot/config.txt`:
```ini
# Disable Bluetooth to free up UART
dtoverlay=disable-bt

# Enable main UART
enable_uart=1

# For Pi 4, enable additional UARTs
dtoverlay=uart2
dtoverlay=uart3
dtoverlay=uart4
dtoverlay=uart5
```

**Raspberry Pi 5:**
```ini
# Pi 5 has dedicated UART controller
enable_uart=1

# Enable additional UARTs via RP1
dtoverlay=uart2-pi5
dtoverlay=uart3-pi5
```

#### Serial Port Mapping
```bash
# Primary UART (GPIO 14/15)
/dev/ttyAMA0  # Pi 3/4 with BT disabled
/dev/ttyAMA10 # Pi 5

# Additional UARTs (Pi 4/5)
/dev/ttyAMA1  # UART2
/dev/ttyAMA2  # UART3
/dev/ttyAMA3  # UART4
/dev/ttyAMA4  # UART5

# USB devices
/dev/ttyUSB0, /dev/ttyUSB1, etc.
```

#### GPIO for RS-485
```python
# GPIO pin mapping for RS-485 RTS control
# Physical pin 11 = GPIO 17
# Physical pin 13 = GPIO 27
# Physical pin 15 = GPIO 22
```

Example usage:
```bash
cyreald start --port /dev/ttyAMA0 --baudrate 9600 --rs485 --rts-pin 17
```

### Banana Pi BPI-M7

#### Overview
- **CPU**: Rockchip RK3588 (4x A76 + 4x A55)
- **RAM**: Up to 32GB
- **Special**: NPU, multiple PCIe lanes

#### Serial Configuration
```bash
# Default console
/dev/ttyFIQ0

# Additional UARTs
/dev/ttyS0 through /dev/ttyS9

# High-speed capable (up to 4Mbps)
cyreald start --port /dev/ttyS2 --baudrate 3000000
```

#### Performance Optimization
```bash
# CPU affinity for serial processing
taskset -c 4-7 cyreald start --port /dev/ttyS2

# Increase buffer size for high speed
cyreald start --port /dev/ttyS2 --buffer-size 16384
```

## Industrial Platforms

### DIN Rail Mounting
For industrial deployments:

1. **Enclosure Requirements**
   - IP20 minimum for control cabinets
   - Passive cooling preferred
   - Consider vibration dampening

2. **Power Supply**
   - 24V DC industrial power
   - Use DC-DC converters for SBCs
   - Include surge protection

3. **Serial Isolation**
   - Use isolated RS-485 transceivers
   - Optical isolation for critical systems
   - Ground loop prevention

### Industrial Protocols

#### Modbus RTU
```bash
# Standard Modbus RTU settings
cyreald start --port /dev/ttyUSB0 \
  --baudrate 19200 \
  --databits 8 \
  --parity even \
  --stopbits 1 \
  --rs485
```

#### DNP3
```bash
# DNP3 typical settings
cyreald start --port /dev/ttyS1 \
  --baudrate 9600 \
  --databits 8 \
  --parity none \
  --stopbits 1
```

## Virtual Environments

### Docker
```dockerfile
FROM node:18-slim

# Install build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    udev \
    && rm -rf /var/lib/apt/lists/*

# Install Cyreal
COPY . /app
WORKDIR /app
RUN npm install && npm run build

# Expose ports
EXPOSE 3001

# Note: Requires --privileged for serial access
CMD ["cyreald", "start", "--config", "/app/config.json"]
```

Run with:
```bash
docker run --privileged \
  --device=/dev/ttyUSB0 \
  -v /dev:/dev \
  cyreal:latest
```

### Virtual Machines

#### Serial Port Passthrough

**VMware:**
- Add serial port as physical connection
- Select host device (e.g., /dev/ttyUSB0 or COM3)

**VirtualBox:**
- Settings → Serial Ports
- Enable Port 1
- Port Mode: Host Device
- Path: /dev/ttyUSB0 or COM3

**QEMU/KVM:**
```bash
-chardev serial,path=/dev/ttyUSB0,id=serial0 \
-device isa-serial,chardev=serial0
```

#### Performance Considerations
- Use USB passthrough for better performance
- Avoid nested virtualization
- Consider latency requirements

### WSL2 (Windows Subsystem for Linux)

WSL2 doesn't support direct serial port access. Options:

1. **Use Windows host**:
   Run cyreald on Windows, connect from WSL2 via network

2. **USBIPD-WIN**:
   ```powershell
   # Windows side
   usbipd wsl attach --busid 1-1

   # WSL2 side
   ls /dev/ttyUSB*
   ```

3. **Network bridge**:
   Use ser2net on Windows, connect via TCP from WSL2

## Performance Tuning

### Buffer Sizes
```bash
# Default: 2KB buffers
cyreald start --port /dev/ttyUSB0

# High-speed: 16KB buffers
cyreald start --port /dev/ttyUSB0 --buffer-size 16384

# Low-latency: 256B buffers
cyreald start --port /dev/ttyUSB0 --buffer-size 256 --low-latency
```

### CPU Affinity
```bash
# Pin to specific CPU cores
taskset -c 2,3 cyreald start --port /dev/ttyUSB0

# Isolate CPUs in kernel boot parameters
# Add to /etc/default/grub:
# GRUB_CMDLINE_LINUX="isolcpus=2,3"
```

### Real-time Priority
```bash
# Run with real-time scheduling
chrt -f 50 cyreald start --port /dev/ttyUSB0

# Or use nice for better priority
nice -n -10 cyreald start --port /dev/ttyUSB0
```