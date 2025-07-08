# Troubleshooting Guide

This guide helps diagnose and resolve common issues with Cyreal.

## Table of Contents

- [Diagnostic Tools](#diagnostic-tools)
- [Common Issues](#common-issues)
- [Platform-Specific Issues](#platform-specific-issues)
- [Serial Port Problems](#serial-port-problems)
- [Network Issues](#network-issues)
- [Performance Problems](#performance-problems)
- [Error Messages](#error-messages)
- [Getting Help](#getting-help)

## Diagnostic Tools

### Built-in Diagnostics

```bash
# Run comprehensive diagnostics
cyreald diagnose

# Test specific port
cyreald test --port /dev/ttyUSB0

# Check configuration
cyreald config --validate

# View logs
cyreald logs --tail 50 --follow
```

### System Information

```bash
# Show Cyreal version and environment
cyreald info

# Output includes:
# - Cyreal version
# - Node.js version
# - Platform details
# - Available serial ports
# - Network interfaces
```

### Debug Mode

```bash
# Start with debug logging
cyreald start --port /dev/ttyUSB0 --log-level debug

# Enable verbose output
export CYREAL_DEBUG=*
cyreald start --port /dev/ttyUSB0
```

## Common Issues

### Installation Problems

#### npm install fails

**Symptoms:**
- Build errors during `npm install`
- Missing native dependencies
- Python or node-gyp errors

**Solutions:**

Linux:
```bash
# Install build dependencies
sudo apt-get update
sudo apt-get install -y build-essential python3

# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

Windows:
```powershell
# Run as Administrator
npm install --global windows-build-tools

# Or install Visual Studio Build Tools manually
# Then reinstall
npm install
```

macOS:
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Reinstall
npm install
```

#### Global command not found

**Symptoms:**
- `cyreald: command not found`
- Command works in project directory but not globally

**Solutions:**
```bash
# Check npm global directory
npm config get prefix

# Add to PATH (Linux/macOS)
export PATH=$PATH:$(npm config get prefix)/bin

# Make permanent by adding to ~/.bashrc or ~/.zshrc

# Reinstall globally
cd packages/cyreald
npm link
```

### Serial Port Access Issues

#### Permission Denied

**Symptoms:**
- `Error: Access denied to /dev/ttyUSB0`
- `Error opening COM3: Access is denied`

**Solutions:**

Linux:
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER

# Logout and login again, then verify
groups

# Check port permissions
ls -l /dev/ttyUSB*

# Temporary fix (not recommended)
sudo chmod 666 /dev/ttyUSB0
```

Windows:
- Close any programs using the COM port
- Check Device Manager for conflicts
- Run as Administrator if needed

#### Port Not Found

**Symptoms:**
- `Error: Port /dev/ttyUSB0 not found`
- Serial port not listed in `cyreald list`

**Solutions:**
```bash
# Check if device is connected
lsusb  # Linux
system_profiler SPUSBDataType  # macOS

# Check kernel messages
dmesg | grep -i usb  # Linux

# Load USB serial driver
sudo modprobe usbserial  # Linux
sudo modprobe ftdi_sio   # For FTDI devices
sudo modprobe ch341      # For CH340 devices
```

#### Port Busy

**Symptoms:**
- `Error: Port /dev/ttyUSB0 is busy`
- `Error: COM3 is already in use`

**Solutions:**
```bash
# Find process using port (Linux)
sudo lsof /dev/ttyUSB0
# or
sudo fuser -v /dev/ttyUSB0

# Kill process if needed
sudo kill -9 <PID>

# Windows: Use Process Explorer or
# PowerShell to find process
Get-Process | Where-Object {$_.Name -like "*serial*"}
```

### Connection Problems

#### No Data Received

**Symptoms:**
- Connection established but no data
- Timeout errors

**Solutions:**
1. Verify baud rate and settings match device:
   ```bash
   cyreald start --port /dev/ttyUSB0 --baudrate 9600 --databits 8 --parity none --stopbits 1
   ```

2. Check cable and connections:
   - Use a null modem cable for RS-232
   - Verify TX/RX are correctly connected
   - Check ground connection

3. Test with known-good terminal:
   ```bash
   # Linux/macOS
   screen /dev/ttyUSB0 9600
   
   # Or use minicom
   minicom -D /dev/ttyUSB0 -b 9600
   ```

#### Garbled Data

**Symptoms:**
- Receiving random characters
- Data corruption

**Solutions:**
1. Verify baud rate:
   ```bash
   # Try common rates
   for rate in 9600 19200 38400 57600 115200; do
     echo "Testing $rate baud..."
     cyreald test --port /dev/ttyUSB0 --baudrate $rate
   done
   ```

2. Check parity settings:
   ```bash
   # Try different parity
   cyreald start --port /dev/ttyUSB0 --parity even
   cyreald start --port /dev/ttyUSB0 --parity odd
   ```

3. Verify data bits and stop bits match

## Platform-Specific Issues

### Windows

#### USB Serial Driver Issues

**Problem:** Device appears as "Unknown Device"

**Solution:**
1. Download correct driver:
   - FTDI: Auto-installed on Windows 10+
   - CH340: Download from manufacturer
   - CP2102: Silicon Labs website

2. Update driver:
   ```powershell
   # Device Manager → Update Driver
   # Or use pnputil
   pnputil /add-driver driver.inf /install
   ```

#### Windows Defender Blocking

**Problem:** Windows Defender blocks cyreald

**Solution:**
```powershell
# Add exclusion
Add-MpPreference -ExclusionPath "C:\Program Files\nodejs\node.exe"
Add-MpPreference -ExclusionPath "$env:APPDATA\npm\node_modules\@cyreal"
```

### Linux

#### udev Rules Not Working

**Problem:** Custom udev rules not applied

**Solution:**
```bash
# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Debug udev
sudo udevadm monitor --environment --udev

# Test rules
udevadm test /sys/class/tty/ttyUSB0
```

#### systemd Service Fails

**Problem:** systemd service won't start

**Solution:**
```bash
# Check service status
sudo systemctl status cyreald

# View logs
sudo journalctl -u cyreald -f

# Common fixes:
# 1. Check paths in service file
# 2. Ensure user has permissions
# 3. Add After=network.target
```

### macOS

#### System Integrity Protection

**Problem:** Cannot access serial ports

**Solution:**
- Grant Terminal/IDE full disk access:
  System Preferences → Security & Privacy → Privacy → Full Disk Access

#### Kernel Extension Blocked

**Problem:** Driver installation blocked

**Solution:**
1. System Preferences → Security & Privacy
2. Click "Allow" for blocked software
3. Restart if required

## Network Issues

### TCP Connection Refused

**Problem:** Cannot connect to cyreald TCP port

**Solutions:**
```bash
# Check if cyreald is listening
netstat -tlnp | grep 3001  # Linux
lsof -i :3001              # macOS
netstat -an | findstr 3001 # Windows

# Check firewall
sudo ufw status            # Ubuntu
sudo firewall-cmd --list-all  # Fedora

# Test connectivity
telnet localhost 3001
nc -zv localhost 3001
```

### High Latency

**Problem:** Slow response times

**Solutions:**
1. Enable low-latency mode:
   ```bash
   cyreald start --port /dev/ttyUSB0 --low-latency
   ```

2. Reduce buffer size:
   ```bash
   cyreald start --port /dev/ttyUSB0 --buffer-size 256
   ```

3. Check network conditions:
   ```bash
   ping -c 10 cyreal-host
   traceroute cyreal-host
   ```

## Performance Problems

### High CPU Usage

**Problem:** cyreald using excessive CPU

**Solutions:**
1. Reduce polling frequency:
   ```bash
   cyreald start --port /dev/ttyUSB0 --polling-interval 5000
   ```

2. Enable flow control:
   ```bash
   cyreald start --port /dev/ttyUSB0 --flow-control hardware
   ```

3. Profile the application:
   ```bash
   # Start with profiling
   node --prof packages/cyreald/dist/cli.js start --port /dev/ttyUSB0
   
   # Analyze profile
   node --prof-process isolate-*.log
   ```

### Memory Leaks

**Problem:** Memory usage grows over time

**Solutions:**
1. Monitor memory:
   ```bash
   # Watch memory usage
   watch -n 1 'ps aux | grep cyreald'
   ```

2. Enable memory limits:
   ```bash
   # Limit to 512MB
   node --max-old-space-size=512 cyreald start --port /dev/ttyUSB0
   ```

3. Check for updates:
   ```bash
   npm update
   npm audit fix
   ```

## Error Messages

### Common Error Codes

| Error | Meaning | Solution |
|-------|---------|----------|
| `EACCES` | Permission denied | Check user permissions, add to dialout group |
| `ENOENT` | Port not found | Verify device is connected and path is correct |
| `EBUSY` | Port in use | Close other applications using the port |
| `ETIMEDOUT` | Operation timeout | Check cable, baud rate, and device power |
| `EPIPE` | Broken pipe | Reconnect, check for device disconnection |
| `ECONNREFUSED` | Connection refused | Ensure cyreald is running and port is correct |

### Debugging Specific Errors

#### "Cannot find module"
```bash
# Reinstall dependencies
npm install

# Rebuild native modules
npm rebuild

# Check NODE_PATH
echo $NODE_PATH
```

#### "Serialport not installed"
```bash
# Reinstall serialport
cd packages/cyreald
npm uninstall serialport
npm install serialport

# Force rebuild
npm rebuild serialport --force
```

## Getting Help

### Collect Diagnostic Information

Before reporting issues, collect:

```bash
# Create diagnostic report
cyreald diagnose --output diagnostic-report.txt

# Include:
# - OS and version
# - Node.js version
# - Error messages
# - Configuration file
# - Recent logs
```

### Log Files

Default log locations:

**Linux/macOS:**
- User mode: `~/.cyreal/logs/cyreald.log`
- System mode: `/var/log/cyreal/cyreald.log`

**Windows:**
- `%LOCALAPPDATA%\cyreal\logs\cyreald.log`

### Debug Output

Enable maximum debugging:
```bash
# Linux/macOS
export DEBUG=*
export CYREAL_LOG_LEVEL=debug
cyreald start --port /dev/ttyUSB0 2>&1 | tee debug.log

# Windows PowerShell
$env:DEBUG="*"
$env:CYREAL_LOG_LEVEL="debug"
cyreald start --port COM3 2>&1 | Tee-Object -FilePath debug.log
```

### Community Support

1. **GitHub Issues**: Report bugs and request features
   - Include diagnostic report
   - Provide minimal reproduction steps
   - Check existing issues first

2. **Documentation**: Check the docs
   - [Installation Guide](installation.md)
   - [Configuration Guide](configuration.md)
   - [Platform Guide](platforms.md)

3. **Examples**: Review working examples
   - Basic examples in `/examples`
   - Integration tests in `/tests`

### Professional Support

For enterprise support:
- Email: support@cyreal-project.org
- Include license information
- Provide detailed system specifications