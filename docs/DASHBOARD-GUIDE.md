# Cyreal Dashboard Guide

## 🖥️ Dashboard Overview

When you log into Cyreal (http://localhost:8443), you'll see:

```
┌─────────────────────────────────────────────────────────────┐
│ CYREAL DEVICE SECURITY          👤 admin@bank.com    [Logout]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟢 System Status: HEALTHY           Last Check: 2 min ago │
│                                                             │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │ Total       │ Authorized  │ Blocked     │ Alerts      │ │
│  │ Devices     │ Devices     │ Today       │ Pending     │ │
│  │    247      │    242      │     3       │     2       │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
│                                                             │
│  Recent Activity                                    [More>] │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 10:32 AM - USB Drive blocked at Teller-03      │   │
│  │ 🟡 10:15 AM - New printer detected at Branch-02   │   │
│  │ 🟢 09:45 AM - ATM maintenance completed           │   │
│  │ 🟢 09:00 AM - Daily backup successful             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Devices] [Policies] [Alerts] [Reports] [Settings]        │
└─────────────────────────────────────────────────────────────┘
```

## 📱 Main Sections

### 1. Devices Tab
Shows all connected devices:

```
Device List                                    [+ Add Device]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name              Type        Location      Status    Action
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATM-01           Card Reader  Branch-01    🟢 OK     [View]
Teller-Printer   Printer      Branch-01    🟢 OK     [View]
Unknown USB      Storage      Teller-03    🔴 Block  [Review]
IT-Backup        Storage      Server Rm    🟢 OK     [View]
```

### 2. Policies Tab
Manage security rules:

```
Security Policies                              [+ New Policy]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Policy Name         Type         Status    Devices    [Edit]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No USB Storage     Block All    Active    All        [⚙️]
ATM Protection     Monitor      Active    4          [⚙️]
Printer Isolation  Network      Active    12         [⚙️]
Weekend Lockdown   Time-based   Inactive  All        [⚙️]
```

### 3. Alerts Tab
Manage notifications:

```
Alert Configuration                           [Test Alerts]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 Critical Alerts → Email + SMS immediately
🟡 High Priority → Email within 5 minutes  
🟢 Normal → Email hourly summary
ℹ️ Info → Daily digest

Recent Alerts:
┌─────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL: Card reader hardware changed at ATM-03    │
│    Time: 10:32 AM | Action Required | [Investigate]    │
├─────────────────────────────────────────────────────────┤
│ 🟡 HIGH: Unauthorized USB at Teller-03                 │
│    Time: 10:15 AM | Blocked | [Review Device]          │
└─────────────────────────────────────────────────────────┘
```

### 4. Reports Tab
Compliance and analytics:

```
Reports                                    [Generate Report]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type              Last Run      Next Run      [Download]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PCI-DSS Monthly   Oct 1, 2024   Nov 1, 2024   [📥 PDF]
Device Inventory  Oct 15, 2024  On Demand     [📥 Excel]
Security Events   Daily         Tomorrow      [📥 CSV]
Audit Trail      Oct 20, 2024  On Demand     [📥 PDF]
```

### 5. Settings Tab
System configuration:

```
Settings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
General Settings                                    [Save]
┌─────────────────────────────────────────────────────────┐
│ Security Level:  [Strict ▼]                            │
│ Email Alerts:    admin@bank.com                        │
│ Time Zone:       [Eastern ▼]                           │
│ Language:        [English ▼]                           │
└─────────────────────────────────────────────────────────┘

User Management                              [+ Add User]
┌─────────────────────────────────────────────────────────┐
│ admin@bank.com     Administrator    [Edit] [Disable]   │
│ security@bank.com  Security Team    [Edit] [Disable]   │
│ compliance@bank.com Viewer Only     [Edit] [Disable]   │
└─────────────────────────────────────────────────────────┘
```

## 🚨 Handling Alerts

### When You See a Red Alert:

1. **Click the Alert** - Opens detail view
2. **Review Device Info** - See what triggered it
3. **Take Action:**
   - **Approve** - Add to whitelist
   - **Block** - Keep blocked
   - **Investigate** - Get more info

### Alert Detail Example:
```
┌─────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL ALERT                                       │
│                                                         │
│ Unauthorized USB Device Detected                        │
│ ────────────────────────────────────────────────       │
│ Time:     Oct 23, 2024 10:32:45 AM                    │
│ Location: Teller Station 03                            │
│ User:     BANK\tjohnson                                │
│ Device:   SanDisk Cruzer 16GB                          │
│ Serial:   4C530001234567890123                         │
│                                                         │
│ Risk:     Potential data theft or malware              │
│                                                         │
│ Actions:                                                │
│ [Block Permanently] [Allow Once] [Add to Whitelist]    │
│ [View User History] [Export Evidence]                  │
└─────────────────────────────────────────────────────────┘
```

## 📊 Understanding Device Status

### Status Indicators:
- 🟢 **Green** - Device is authorized and working normally
- 🟡 **Yellow** - Device needs review or has warnings
- 🔴 **Red** - Device is blocked or has critical issues
- ⚫ **Gray** - Device is disconnected

### Device Categories:
- **Critical** - ATMs, card readers (always monitor)
- **Restricted** - USB drives, external storage
- **Standard** - Keyboards, mice, printers
- **Trusted** - IT-approved devices

## 🎯 Daily Tasks (5 Minutes)

### Morning Check:
1. Look at dashboard summary
2. Review any overnight alerts
3. Check "Devices Needing Attention"
4. Clear resolved alerts

### End of Day:
1. Review today's blocked devices
2. Check tomorrow's scheduled tasks
3. Ensure backups completed
4. Log out

## 💡 Pro Tips

### Keyboard Shortcuts:
- `D` - Go to Devices
- `A` - Go to Alerts  
- `R` - Refresh data
- `?` - Show help
- `Esc` - Close dialogs

### Quick Actions:
- **Double-click** device = View details
- **Right-click** device = Action menu
- **Drag & Drop** = Move between policies

### Search Tips:
- `type:usb` - Find all USB devices
- `status:blocked` - Find blocked devices
- `location:branch01` - Find by location
- `user:john` - Find by user

## 🔒 Security Best Practices

1. **Change Password Monthly**
   - Settings → My Account → Change Password

2. **Review User Access**
   - Settings → User Management
   - Remove ex-employees immediately

3. **Check Audit Logs**
   - Reports → Audit Trail
   - Look for unusual patterns

4. **Update Policies**
   - Review after security incidents
   - Tighten during high-risk periods

## 📱 Mobile Access

Access from your phone:
1. Open browser
2. Go to: https://cyreal.yourbank.com
3. Use mobile-friendly interface
4. Get push notifications for alerts

## 🆘 Getting Help

### In Dashboard:
- Click `?` icon for context help
- Click `Support` for ticket system
- Click `Chat` for live help

### Emergency Contacts:
- **Critical Issues:** 1-800-CYREAL-0
- **Support Email:** support@cyreal.io
- **Your IT Admin:** admin@yourbank.com

---

Remember: When in doubt, block first and ask questions later. It's better to briefly inconvenience someone than to allow a security breach.