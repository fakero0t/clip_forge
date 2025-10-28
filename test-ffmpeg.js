#!/usr/bin/env node

/**
 * Standalone FFmpeg test script
 * Run with: node test-ffmpeg.js
 */

import { testFFmpegIntegration, testVideoProcessing } from './src/utils/testFFmpeg.js';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('🚀 ClipForge FFmpeg Test Script\n');
  console.log('================================\n');

  // Test basic FFmpeg integration
  const ffmpegTest = await testFFmpegIntegration();

  if (!ffmpegTest) {
    console.log('\n❌ FFmpeg integration failed. Exiting.');
    process.exit(1);
  }

  // Test with a real video file if provided
  const testVideoPath = process.argv[2];
  if (testVideoPath && fs.existsSync(testVideoPath)) {
    console.log(`\n📹 Testing with video file: ${testVideoPath}`);
    try {
      await testVideoProcessing(testVideoPath);
      console.log('\n✅ Video processing test completed successfully!');
    } catch (error) {
      console.error('\n❌ Video processing test failed:', error.message);
    }
  } else if (testVideoPath) {
    console.log(`\n⚠️  Test video file not found: ${testVideoPath}`);
  } else {
    console.log('\n💡 To test with a real video file, run:');
    console.log('   node test-ffmpeg.js path/to/your/video.mp4');
  }

  console.log('\n🎉 All tests completed!');
}

main().catch(console.error);
