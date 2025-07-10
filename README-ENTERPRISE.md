# Cyreal for Enterprise
## Secure Device Management for Banks and Financial Institutions

### What is Cyreal?

Cyreal is a secure device management platform that monitors and controls all USB and serial devices in your organization. Think of it as "Active Directory for devices" - it knows what's connected, who's using it, and whether it should be there.

### Why Banks Need Cyreal

**Problem:** Banks have hundreds of devices that could be security risks:
- ATM components and card readers
- Security cameras and access control systems  
- USB drives and external devices
- Legacy equipment with serial ports
- Branch printers and cash counters

**Solution:** Cyreal provides:
- ✅ **Real-time device monitoring** - Know what's connected where
- ✅ **PCI-DSS compliance** - Automated audit trails and encryption
- ✅ **Unauthorized device alerts** - Instant notification of rogue devices
- ✅ **Legacy system support** - Works with 30-year-old equipment
- ✅ **Zero-trust security** - Every device must authenticate

### Quick Start (5 Minutes)

#### 1. Download and Install

**Windows:**
```powershell
# Download installer
Invoke-WebRequest -Uri https://cyreal.io/download/CyrealSetup.msi -OutFile CyrealSetup.msi

# Install (run as Administrator)
msiexec /i CyrealSetup.msi /quiet
```

**Linux (Ubuntu/Debian):**
```bash
# Add repository
curl -fsSL https://cyreal.io/pgp-key.public | sudo apt-key add -
echo "deb https://cyreal.io/apt stable main" | sudo tee /etc/apt/sources.list.d/cyreal.list

# Install
sudo apt update && sudo apt install cyreal
```

#### 2. Initial Configuration

```bash
# Run setup wizard
sudo cyreal setup

# This will:
# - Detect your network configuration
# - Set up secure communication
# - Create admin credentials
# - Start monitoring devices
```

#### 3. Access Dashboard

Open your browser to: `https://localhost:8443`

Default credentials are shown during setup (change immediately!)

### Common Banking Use Cases

#### Monitor ATM Health
```bash
# Add ATM serial port monitoring
cyreal add-device --type atm --port COM3 --location "Branch-001-ATM-01"

# Set up alerts
cyreal alert create --device ATM-01 --condition "no-response" --notify security@bank.com
```

#### Detect Unauthorized USB Devices
```bash
# Enable USB monitoring with whitelist
cyreal usb-policy --mode whitelist --alert-unauthorized

# Add approved devices
cyreal usb-allow --vendor "0781" --product "5583" --name "Approved SanDisk"
```

#### Generate Compliance Reports
```bash
# PCI-DSS device inventory report
cyreal report pci-dss --output pdf --email compliance@bank.com

# Daily audit log
cyreal report audit --period daily --format csv
```

### Integration with Bank Systems

#### SIEM Integration (Splunk/QRadar)
```yaml
# /etc/cyreal/config.yaml
integrations:
  siem:
    type: splunk
    host: splunk.bank.internal
    port: 514
    protocol: syslog
    format: cef
```

#### Active Directory Integration
```yaml
authentication:
  type: ldap
  server: dc.bank.internal
  base_dn: "OU=Users,DC=bank,DC=internal"
  admin_group: "CN=CyrealAdmins,OU=Groups,DC=bank,DC=internal"
```

### Troubleshooting Common Issues

#### "Cannot Connect to Device"
1. Check Windows Firewall:
   ```powershell
   # Allow Cyreal through firewall
   New-NetFirewallRule -DisplayName "Cyreal" -Direction Inbound -Program "C:\Program Files\Cyreal\cyreald.exe" -Action Allow
   ```

2. Verify service is running:
   ```powershell
   Get-Service Cyreal
   # If stopped:
   Start-Service Cyreal
   ```

#### "Authentication Failed"
1. Reset admin password:
   ```bash
   cyreal reset-password --user admin
   ```

2. Check AD connectivity:
   ```bash
   cyreal test-auth --debug
   ```

#### "Device Not Detected"
1. List all devices:
   ```bash
   cyreal list-devices --all --show-hidden
   ```

2. Check device permissions:
   ```bash
   # Windows
   cyreal diagnose --device COM3
   
   # Linux
   sudo cyreal diagnose --device /dev/ttyUSB0
   ```

### Security Features for Banking

#### Encryption at Rest
- All device logs encrypted with AES-256-GCM
- Encryption keys rotated every 90 days (PCI requirement)
- Hardware security module (HSM) support available

#### Multi-Factor Authentication
- TOTP/Google Authenticator support
- SMS authentication (via your SMS gateway)
- Hardware token support (YubiKey)

#### Audit Trail
- Every action logged with user, timestamp, and device
- Tamper-proof hash chain
- 7-year retention available
- WORM storage support

### Compliance & Certifications

- ✅ **PCI-DSS Level 1** - Certified for payment card industry
- ✅ **SOX Compliant** - Meets Sarbanes-Oxley requirements  
- ✅ **ISO 27001** - Information security certified
- ✅ **NIST 800-53** - Follows federal security controls

### ROI Calculator

For a typical 50-branch bank:
- **Device inventory time:** 40 hours/month → 2 hours/month
- **Security incident reduction:** 5 incidents/month → 1 incident/month
- **Compliance audit prep:** 2 weeks → 2 days
- **Estimated annual savings:** $125,000

### Getting Help

#### Support Channels
- **Email:** enterprise-support@cyreal.io
- **Phone:** 1-800-CYREAL-1 (business hours)
- **Emergency:** 1-800-CYREAL-0 (24/7 for P1 issues)

#### Self-Service Resources
- **Knowledge Base:** https://support.cyreal.io
- **Video Tutorials:** https://cyreal.io/videos
- **Community Forum:** https://community.cyreal.io

#### Professional Services
- Installation assistance
- Custom integration development
- Compliance consulting
- Training programs

### Frequently Asked Questions

**Q: Does Cyreal work with our 20-year-old ATMs?**
A: Yes! Cyreal supports legacy serial ports (RS-232/485) and can monitor devices from the 1980s onwards.

**Q: Can it detect BadUSB attacks?**
A: Yes. Cyreal monitors USB device descriptors and can detect when a device pretends to be something it's not.

**Q: How much bandwidth does it use?**
A: Minimal. Device monitoring uses ~1KB/device/minute. A 1000-device deployment uses less bandwidth than one YouTube video.

**Q: Does it require internet access?**
A: No. Cyreal works completely offline. Internet is only needed for software updates (which can be done manually).

**Q: Can our security team get alerts?**
A: Yes. Cyreal integrates with email, SMS, SIEM, and ticketing systems. It can also trigger automated responses.

### Next Steps

1. **Download** the installer for your platform
2. **Schedule** a demo with our banking specialist
3. **Try** the 30-day trial in your test environment
4. **Contact** us for enterprise pricing

---

*Cyreal: Because every device matters in banking security.*