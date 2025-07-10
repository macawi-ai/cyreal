# Cyreal - Device Security for Your Business

## What Does Cyreal Do?

Cyreal keeps track of every USB device, serial port, and piece of equipment connected to your computers. It's like having a security guard that checks every device that tries to connect to your network.

## Why Your Business Needs This

Every day, employees plug in USB drives, connect devices, and use equipment. Any of these could be:
- Infected with malware
- Stealing company data  
- Violating compliance rules
- Causing system crashes

Cyreal prevents these problems by monitoring and controlling all device connections.

## How to Install (15 Minutes)

### Windows
1. Download: [CyrealSetup.exe](https://cyreal.io/download/setup.exe)
2. Right-click → "Run as Administrator"
3. Follow the installation wizard
4. Cyreal icon appears in system tray when running

### Mac
1. Download: [Cyreal.pkg](https://cyreal.io/download/mac)
2. Double-click to install
3. Enter your Mac password when prompted
4. Find Cyreal in Applications folder

### Linux (Ubuntu/Debian)
```bash
# Copy and paste these commands:
wget https://cyreal.io/download/cyreal.deb
sudo dpkg -i cyreal.deb
sudo systemctl start cyreal
```

## First Time Setup

1. **Open Cyreal Dashboard**
   - Windows: Right-click tray icon → "Open Dashboard"
   - Mac: Click Cyreal in menu bar → "Open Dashboard"
   - Linux: Open browser to http://localhost:8443

2. **Create Admin Account**
   - Username: (your email)
   - Password: (must be 8+ characters)
   - Security Question: (for password recovery)

3. **Run Device Scan**
   - Click "Scan for Devices"
   - Wait 30 seconds
   - See all connected devices

4. **Set Security Policy**
   - Click "Security Settings"
   - Choose: Strict (recommended) or Moderate
   - Click "Apply"

## Daily Use

### Check Device Status
Look at the dashboard daily to see:
- ✅ Green = Authorized devices
- ⚠️ Yellow = Unknown devices (need review)
- ❌ Red = Blocked devices

### When Someone Needs a USB Device Approved
1. They plug in the device
2. Cyreal blocks it (notification appears)
3. You get an email alert
4. Review the device in dashboard
5. Click "Approve" or "Deny"
6. Device works immediately if approved

### Monthly Compliance Report
1. Click "Reports" → "Compliance"
2. Select your regulation (PCI-DSS, HIPAA, etc.)
3. Click "Generate Report"
4. PDF downloads automatically
5. Send to compliance officer

## Common Problems & Solutions

### "Cyreal Service Not Running"
**Windows:**
1. Press Windows+R
2. Type: services.msc
3. Find "Cyreal Device Monitor"
4. Right-click → Start

**Mac:**
```bash
sudo launchctl load /Library/LaunchDaemons/com.cyreal.daemon.plist
```

**Linux:**
```bash
sudo systemctl restart cyreal
```

### "Cannot Access Dashboard"
1. Check if service is running (see above)
2. Try: http://localhost:8443 (not https)
3. Clear browser cache
4. Restart computer

### "Device Not Detected"
1. Unplug device
2. Wait 10 seconds
3. Plug back in
4. Click "Rescan" in dashboard

### "Forgot Admin Password"
1. Click "Forgot Password" on login screen
2. Answer security question
3. Check email for reset link
4. Create new password

## Security Settings Explained

### Strict Mode (Banks, Healthcare)
- Only pre-approved devices work
- All others blocked instantly
- Detailed logging of everything
- Email alerts for all events

### Moderate Mode (Most Businesses)  
- Known safe devices work automatically
- Unknown devices require approval
- Dangerous devices blocked
- Email alerts for suspicious activity

### Learning Mode (First Week)
- All devices allowed but logged
- Builds list of normal devices
- Suggests security policy
- Switch to Strict/Moderate after learning

## Getting Help

### Built-in Help
- Click "?" icon in dashboard
- Searchable help database
- Video tutorials included

### Email Support
- support@cyreal.io
- Response within 24 hours
- Include your license number

### Phone Support
- 1-800-CYREAL-1 (US)
- Monday-Friday 9AM-6PM EST
- Emergency: Use email with "URGENT" in subject

### Remote Support
1. Click "Get Help" in dashboard
2. Give support agent the 6-digit code
3. They can see your screen (you control this)
4. They fix the problem while you watch

## What Managers Need to Know

### Compliance Benefits
- **PCI-DSS**: Automatic device inventory (Requirement 2.4)
- **HIPAA**: Access logs for all devices (164.312)
- **SOX**: Change tracking and audit trails
- **ISO 27001**: Asset management compliance

### Cost Savings
- Prevent one breach = Save $50,000+
- Reduce audit prep from weeks to hours
- Stop employees using infected USB drives
- Avoid compliance fines

### Easy Reporting
- Daily email summary
- Monthly compliance reports
- Instant alerts for problems
- Export to Excel anytime

## License & Pricing

### Small Business (1-50 computers)
- $49/month or $490/year
- Includes all features
- Email support
- 3 admin accounts

### Enterprise (50+ computers)
- Contact sales@cyreal.io
- Volume discounts available
- Phone support included
- Unlimited admin accounts

### Free Trial
- 30 days full features
- No credit card required
- Converts to free version after trial
- Free version monitors 5 devices

---

**Remember:** Cyreal runs quietly in the background. You only need to check it when:
- The tray icon shows a red dot (problem detected)
- You get an email alert
- Someone needs device approval
- Monthly report time

That's it! Cyreal keeps your devices secure without getting in your way.