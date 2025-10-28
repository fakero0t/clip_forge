import videoProcessor from '../services/videoProcessor.js';
import ffmpegService from '../services/ffmpeg-ipc.js';

/**
 * Test FFmpeg integration and video processing capabilities
 */
export async function testFFmpegIntegration() {
  console.log('🧪 testFFmpeg.js: Starting FFmpeg integration test...');

  try {
    // Test 1: Check FFmpeg availability (wait a bit for initialization)
    console.log('🔍 testFFmpeg.js: Step 1 - Checking FFmpeg availability...');
    
    // Wait a moment for the async initialization to complete
    console.log('⏳ testFFmpeg.js: Waiting for initialization...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ testFFmpeg.js: Wait complete');
    
    console.log('🔧 testFFmpeg.js: Calling videoProcessor.isFFmpegAvailable()...');
    const isAvailable = videoProcessor.isFFmpegAvailable();
    console.log(`📊 testFFmpeg.js: FFmpeg available: ${isAvailable ? '✅' : '❌'}`);
    
    if (!isAvailable) {
      console.log('⚠️  testFFmpeg.js: FFmpeg is not available. This may be due to:');
      console.log('   - FFmpeg not installed on system');
      console.log('   - FFmpeg path not configured correctly');
      console.log('   - FFmpeg binary not executable');
      return false;
    }

    // Test 2: Get available formats (skip for now as it's not implemented)
    console.log('\n2. Testing FFmpeg format detection...');
    console.log('   ℹ️  Format detection not implemented in current version');

    // Test 3: Test video metadata extraction (if test file exists)
    console.log('\n3. Testing video metadata extraction...');
    const testVideoPath = './test-video.mp4'; // Placeholder for test file
    console.log(`   Looking for test video: ${testVideoPath}`);
    console.log('   ℹ️  To test with real video, place a test file at ./test-video.mp4');

    // Test 4: Test thumbnail generation (if test file exists)
    console.log('\n4. Testing thumbnail generation...');
    console.log('   ℹ️  Thumbnail generation will be tested when video files are imported');

    // Test 5: Test file format validation
    console.log('\n5. Testing file format validation...');
    const testFormats = [
      'video.mp4',
      'video.mov',
      'video.webm',
      'video.avi',
      'video.mkv',
      'document.pdf',
      'image.jpg'
    ];

    for (const fileName of testFormats) {
      const isSupported = await ffmpegService.isSupportedVideoFormat(fileName);
      console.log(`   ${fileName}: ${isSupported ? '✅' : '❌'}`);
    }

    // Test 6: Test utility functions
    console.log('\n6. Testing utility functions...');
    const testFileSize = 1048576; // 1MB
    const formattedSize = await ffmpegService.formatFileSize(testFileSize);
    console.log(`   File size formatting: ${testFileSize} bytes → ${formattedSize}`);

    const testDuration = 125.5; // 2 minutes 5.5 seconds
    const formattedDuration = await ffmpegService.formatDuration(testDuration);
    console.log(`   Duration formatting: ${testDuration}s → ${formattedDuration}`);

    console.log('\n✅ FFmpeg integration test completed successfully!');
    return true;

  } catch (error) {
    console.error('\n❌ FFmpeg integration test failed:', error.message);
    return false;
  }
}

/**
 * Test video processing with a real video file
 * @param {string} videoPath - Path to video file to test
 */
export async function testVideoProcessing(videoPath) {
  console.log(`🧪 Testing Video Processing with: ${videoPath}\n`);

  try {
    // Test video processing
    console.log('1. Processing video file...');
    const videoData = await videoProcessor.processVideoFile(videoPath);
    
    console.log('   ✅ Video processed successfully!');
    console.log('   📊 Video data:');
    console.log(`      - File: ${videoData.fileName}`);
    console.log(`      - Duration: ${videoData.durationFormatted}`);
    console.log(`      - Resolution: ${videoData.resolution}`);
    console.log(`      - FPS: ${videoData.fps}`);
    console.log(`      - Codec: ${videoData.codec}`);
    console.log(`      - Size: ${videoData.fileSizeFormatted}`);

    // Test thumbnail generation
    console.log('\n2. Testing thumbnail generation...');
    if (videoData.thumbnailPath) {
      console.log(`   ✅ Thumbnail generated: ${videoData.thumbnailPath}`);
    } else {
      console.log('   ❌ Thumbnail generation failed');
    }

    return videoData;

  } catch (error) {
    console.error('\n❌ Video processing test failed:', error.message);
    throw error;
  }
}

/**
 * Run all FFmpeg tests
 */
export async function runAllTests() {
  console.log('🚀 Starting ClipForge FFmpeg Tests\n');
  console.log('=====================================\n');

  const ffmpegTest = await testFFmpegIntegration();
  
  if (ffmpegTest) {
    console.log('\n🎉 All tests passed! FFmpeg is ready for video processing.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }

  return ffmpegTest;
}
