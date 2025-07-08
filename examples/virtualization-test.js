#!/usr/bin/env node

/**
 * Virtualization Detection Test
 * Demonstrates Cyreal's ability to detect and adapt to virtualized environments
 */

const { Cyreald } = require('../packages/cyreald/dist/index.js');
const { VirtualizationDetector } = require('../packages/cyreald/dist/platform/virtualization-detector.js');
const winston = require('winston');

async function testVirtualizationDetection() {
  console.log('🖥️  Cyreal Virtualization Detection Test');
  console.log('=====================================');
  console.log('');
  
  // Create a logger for the detector
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    transports: [new winston.transports.Console()]
  });

  // Test direct virtualization detection
  console.log('🔍 Testing direct virtualization detection...');
  const detector = new VirtualizationDetector(logger);
  
  try {
    const virtInfo = await detector.detect();
    
    console.log('📋 Virtualization Detection Results:');
    console.log('====================================');
    console.log(`Environment: ${virtInfo.isVirtualized ? 'Virtualized' : 'Bare Metal'}`);
    console.log(`Hypervisor: ${virtInfo.hypervisor}`);
    console.log(`Platform: ${virtInfo.platform}`);
    console.log(`Confidence: ${virtInfo.confidence}%`);
    console.log(`Serial Strategy: ${virtInfo.serialPortStrategy}`);
    console.log(`Timing Precision: ${virtInfo.timingPrecision}`);
    console.log(`GPIO Available: ${virtInfo.gpioAvailable ? 'Yes' : 'No'}`);
    console.log('');
    
    if (virtInfo.limitations.length > 0) {
      console.log('⚠️  Limitations:');
      virtInfo.limitations.forEach(limitation => {
        console.log(`   - ${limitation}`);
      });
      console.log('');
    }
    
    if (virtInfo.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      virtInfo.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
      console.log('');
    }
    
    // Test capabilities
    const capabilities = detector.getCapabilities(virtInfo);
    console.log('⚙️  Capabilities Assessment:');
    console.log('===========================');
    console.log(`Serial Port Access: ${capabilities.serialPortAccess ? '✅' : '❌'}`);
    console.log(`GPIO Access: ${capabilities.gpioAccess ? '✅' : '❌'}`);
    console.log(`Real-time Capable: ${capabilities.realTimeCapable ? '✅' : '❌'}`);
    console.log(`USB Passthrough: ${capabilities.usbPassthrough ? '✅' : '❌'}`);
    console.log(`Network Bridge: ${capabilities.networkBridge ? '✅' : '❌'}`);
    console.log(`Timing Guarantees: ${capabilities.timingGuarantees ? '✅' : '❌'}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Virtualization detection failed:', error.message);
  }
  
  // Test full Cyreal daemon with virtualization awareness
  console.log('🚀 Testing full Cyreal daemon initialization...');
  console.log('');
  
  try {
    const daemon = new Cyreald();
    await daemon.start();
    
    const status = daemon.getStatus();
    console.log('🔍 Daemon Status with Virtualization Info:');
    console.log('==========================================');
    console.log(`Platform: ${status.platform.name}`);
    console.log(`Architecture: ${status.platform.arch}`);
    console.log(`Timing Precision: ${status.platform.timingPrecision}`);
    console.log(`Recommended Buffer: ${status.platform.recommendedBufferSize} bytes`);
    
    if (status.platform.virtualization) {
      console.log('');
      console.log('🖥️  Virtualization Details:');
      console.log(`   Environment: ${status.platform.virtualization.hypervisor}`);
      console.log(`   Platform: ${status.platform.virtualization.platform}`);
      console.log(`   Confidence: ${status.platform.virtualization.confidence}%`);
      console.log(`   Serial Strategy: ${status.platform.virtualization.serialPortStrategy}`);
    }
    
    if (status.platform.specialFeatures) {
      console.log('');
      console.log('⚡ Special Features:');
      status.platform.specialFeatures.forEach(feature => {
        console.log(`   - ${feature}`);
      });
    }
    
    if (status.platform.gpioRestrictions && status.platform.gpioRestrictions.length > 0) {
      console.log('');
      console.log('🚫 GPIO Restrictions:');
      status.platform.gpioRestrictions.forEach(restriction => {
        console.log(`   - ${restriction}`);
      });
    }
    
    console.log('');
    console.log('✅ Daemon initialized successfully with virtualization awareness');
    
    await daemon.stop();
    
  } catch (error) {
    console.error('❌ Daemon initialization failed:', error.message);
  }
  
  console.log('');
  console.log('🎯 Virtualization detection test completed');
}

// Run the test
testVirtualizationDetection().catch(console.error);