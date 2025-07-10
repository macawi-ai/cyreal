#!/usr/bin/env node

/**
 * Test Script for Universal Service Architecture
 * Demonstrates cross-platform service management capabilities
 */

const { PlatformManager } = require('./dist/services/platform-manager');
const { UniversalInstaller } = require('./dist/services/universal-installer');

async function testServiceArchitecture() {
  console.log('🚀 Testing Cyreal Universal Service Architecture\n');

  try {
    // Test Platform Detection
    console.log('📊 Platform Detection:');
    console.log('═'.repeat(40));
    
    const platformManager = new PlatformManager();
    const platformInfo = platformManager.getPlatformInfo();
    
    console.log(`Platform: ${platformInfo.platform} (${platformInfo.architecture})`);
    console.log(`OS Version: ${platformInfo.version}`);
    console.log(`Service Manager: ${platformInfo.serviceManager}`);
    console.log(`Can Install Services: ${platformInfo.canInstallService ? '✅' : '❌'}`);
    console.log(`Requires Elevation: ${platformInfo.requiresElevation ? '✅' : '❌'}`);
    console.log('');

    // Test Service Configuration Generation
    console.log('⚙️  Service Configuration Generation:');
    console.log('═'.repeat(40));

    const testConfig = {
      name: 'cyreal-test',
      displayName: 'Cyreal Test Service',
      description: 'Test service for Cyreal universal architecture',
      execPath: '/usr/local/bin/cyreal-core',
      args: ['start', '--daemon'],
      user: 'cyreal',
      group: 'cyreal',
      autoStart: true,
      restartPolicy: 'always'
    };

    console.log('Test service configuration:');
    console.log(JSON.stringify(testConfig, null, 2));
    console.log('');

    // Test Universal Installer
    console.log('🔧 Universal Installer:');
    console.log('═'.repeat(40));

    const installer = new UniversalInstaller({
      serviceName: 'cyreal-test',
      displayName: 'Cyreal Test Service',
      description: 'Test service for universal architecture',
      autoStart: false  // Don't actually auto-start in test
    });

    const status = await installer.status();
    console.log('Current installation status:');
    console.log(`Installed: ${status.installed ? '✅' : '❌'}`);
    console.log(`Running: ${status.running ? '✅' : '❌'}`);
    console.log(`Status: ${status.status}`);
    console.log(`Config Exists: ${status.configExists ? '✅' : '❌'}`);
    console.log(`Logs Exist: ${status.logsExist ? '✅' : '❌'}`);
    console.log('');

    // Test Service Management Capabilities
    console.log('🛠️  Service Management Capabilities:');
    console.log('═'.repeat(40));

    switch (platformInfo.serviceManager) {
      case 'systemd':
        console.log('✅ systemd support available');
        console.log('  - Service files: /etc/systemd/system/');
        console.log('  - Commands: systemctl start/stop/status');
        console.log('  - Features: dependency management, resource limits, security');
        break;

      case 'launchd':
        console.log('✅ launchd support available');
        console.log('  - Plist files: /Library/LaunchDaemons/');
        console.log('  - Commands: launchctl load/unload');
        console.log('  - Features: on-demand loading, resource monitoring');
        break;

      case 'scm':
        console.log('✅ Windows Service Control Manager support available');
        console.log('  - Service registry: Windows Services');
        console.log('  - Commands: sc start/stop/query');
        console.log('  - Features: automatic startup, recovery actions');
        break;

      case 'sysvinit':
        console.log('✅ SysVinit support available');
        console.log('  - Init scripts: /etc/init.d/');
        console.log('  - Commands: service start/stop/status');
        console.log('  - Features: runlevel management');
        break;

      default:
        console.log('❌ No supported service manager detected');
        console.log('  - Manual process management required');
        break;
    }
    console.log('');

    // Test Installation Requirements
    console.log('📋 Installation Requirements:');
    console.log('═'.repeat(40));

    const requirements = [];
    
    if (platformInfo.requiresElevation) {
      requirements.push('Elevated privileges (sudo/admin)');
    }
    
    requirements.push('Node.js runtime');
    requirements.push('npm package manager');
    
    if (platformInfo.platform === 'linux') {
      requirements.push('Build tools (gcc, make)');
    }
    
    requirements.forEach((req, index) => {
      console.log(`  ${index + 1}. ${req}`);
    });
    console.log('');

    // Show next steps
    console.log('🎯 Next Steps for Full Installation:');
    console.log('═'.repeat(40));
    console.log('1. Run universal installer: ./universal-service-installer.sh install');
    console.log('2. Configure service: edit /etc/cyreal/cyreal.yaml');
    console.log('3. Start service: cyreal-core service --start');
    console.log('4. Monitor logs: tail -f /var/log/cyreal/cyreal-core.log');
    console.log('');

    console.log('✅ Universal Service Architecture Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testServiceArchitecture().catch(console.error);