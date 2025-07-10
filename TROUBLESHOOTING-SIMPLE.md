# Cyreal Troubleshooting Guide

## 🚨 Quick Fixes (Try These First!)

### Problem: Can't Access Dashboard
```bash
# Windows (Run as Administrator)
cyreal repair

# Mac/Linux
sudo cyreal repair
```
This fixes 90% of problems automatically!

### Problem: Cyreal Not Running
**Windows:**
1. Click Start → Type "Services"
2. Find "Cyreal Device Monitor"
3. Right-click → Start

**Mac:**
1. Open Terminal
2. Type: `sudo cyreal start`
3. Enter your password

**Linux:**
1. Open Terminal
2. Type: `sudo systemctl start cyreal`

## 📋 Common Problems & Solutions

### "Access Denied" Errors

**Symptom:** Can't see devices or get permission errors

**Fix for Windows:**
1. Right-click Cyreal icon → "Run as Administrator"
2. If that doesn't work:
   ```powershell
   # In PowerShell (as Admin):
   cyreal repair --fix-permissions
   ```

**Fix for Mac/Linux:**
1. Add yourself to device group:
   ```bash
   # Linux only:
   sudo usermod -a -G dialout $USER
   # Then logout and login again
   ```

### Dashboard Shows "Connection Refused"

**Symptom:** Browser can't connect to http://localhost:8443

**Quick Fix:**
1. Check if Cyreal is running (see above)
2. Try different URL: http://127.0.0.1:8443
3. Clear browser cache (Ctrl+Shift+Delete)

**If Still Not Working:**
```bash
# Check what's blocking the port
cyreal diagnose --network
```

### Devices Not Detected

**Symptom:** USB devices or serial ports don't appear

**Windows Fix:**
1. Open Device Manager
2. Look for yellow warning signs
3. Right-click problem device → "Update driver"
4. Restart Cyreal:
   ```powershell
   cyreal restart
   ```

**Mac Fix:**
1. System Preferences → Security & Privacy
2. Click lock to make changes
3. Allow Cyreal in "Developer Tools"
4. Restart Cyreal

**Linux Fix:**
```bash
# Check device permissions
ls -l /dev/ttyUSB*
# If you see "permission denied":
sudo cyreal fix-devices
```

### High CPU or Memory Usage

**Symptom:** Computer runs slow when Cyreal is running

**Fix:**
1. Check how many devices are connected:
   ```bash
   cyreal status --devices
   ```
2. If more than 100 devices:
   ```bash
   # Optimize for many devices
   cyreal optimize --high-device-count
   ```
3. Reduce logging:
   ```bash
   cyreal config set log_level warn
   ```

### Can't Install Updates

**Symptom:** Update fails or hangs

**Fix:**
1. Stop Cyreal first:
   ```bash
   cyreal stop
   ```
2. Download manual update from https://cyreal.io/download
3. Install manually
4. Start Cyreal:
   ```bash
   cyreal start
   ```

## 🔧 Advanced Troubleshooting

### Generate Diagnostic Report
When contacting support, run this first:
```bash
cyreal diagnose --full > diagnostic_report.txt
```
Email the file to support@cyreal.io

### Reset to Factory Settings
⚠️ **Warning:** This erases all settings!
```bash
# Backup first
cyreal backup --all

# Then reset
cyreal reset --factory
```

### View Real-Time Logs
To see what Cyreal is doing:
```bash
# Windows
cyreal logs --follow

# Mac/Linux
tail -f /var/log/cyreal/cyreal.log
```

### Check Specific Device Issues
```bash
# List all devices with problems
cyreal check devices --problems-only

# Test specific device
cyreal test COM3  # Windows
cyreal test /dev/ttyUSB0  # Linux/Mac
```

## 💡 Prevention Tips

### Weekly Maintenance (5 minutes)
1. Check dashboard for yellow/red alerts
2. Review unknown devices
3. Apply any pending updates
4. Run quick health check:
   ```bash
   cyreal health
   ```

### Monthly Maintenance (15 minutes)
1. Review device whitelist
2. Check compliance reports
3. Clean old logs:
   ```bash
   cyreal cleanup --logs --older-than 30d
   ```
4. Update device policies

### Before Calling Support

1. **Run Self-Repair:**
   ```bash
   cyreal repair --verbose
   ```

2. **Collect Information:**
   ```bash
   cyreal info --system > system_info.txt
   ```

3. **Note Error Messages:**
   - Take screenshots
   - Copy exact error text
   - Note when it happens

4. **Try Safe Mode:**
   ```bash
   cyreal start --safe-mode
   ```

## 📞 Getting Help

### Self-Help Resources
- **Built-in Help:** `cyreal help [command]`
- **Web Docs:** https://docs.cyreal.io
- **Video Tutorials:** https://cyreal.io/tutorials
- **Community Forum:** https://community.cyreal.io

### Contact Support
- **Email:** support@cyreal.io
- **Phone:** 1-800-CYREAL-1 (Mon-Fri 9-6 EST)
- **Chat:** Click "Help" in dashboard

### Information to Provide
When contacting support, have ready:
1. Your license key (found in dashboard → About)
2. Operating system and version
3. Cyreal version (`cyreal --version`)
4. Diagnostic report (see above)
5. Description of what you were doing when problem occurred

## 🚀 Quick Recovery

If nothing else works, try the "Nuclear Option":

```bash
# 1. Complete uninstall
cyreal uninstall --complete

# 2. Reboot computer

# 3. Fresh install
# Download latest from https://cyreal.io/download

# 4. Restore backup (if you have one)
cyreal restore --from backup_file.cyb
```

---

**Remember:** Most problems are fixed by running `cyreal repair` as Administrator/root!