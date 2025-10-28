// FFmpeg handler for Electron main process
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

class FFmpegHandler {
  constructor() {
    console.log('🎬 ffmpeg-handler.js: FFmpegHandler constructor called');
    this.isAvailable = false;
    console.log('🔧 ffmpeg-handler.js: Setting up FFmpeg path...');
    this.setupFFmpeg();
    console.log('🔧 ffmpeg-handler.js: Checking availability...');
    
    // Do synchronous check first for immediate availability
    this.checkAvailabilitySync().then(available => {
      console.log(`✅ ffmpeg-handler.js: Initial availability check: ${available}`);
    }).catch(err => {
      console.error('❌ ffmpeg-handler.js: Initial availability check failed:', err);
    });
    
    // Also do the full check in background
    this.checkAvailability().catch(err => {
      console.error('❌ ffmpeg-handler.js: Background availability check failed:', err);
    });
    
    console.log('✅ ffmpeg-handler.js: FFmpegHandler initialized');
  }

  setupFFmpeg() {
    try {
      // Set explicit FFmpeg path
      ffmpeg.setFfmpegPath('/usr/local/bin/ffmpeg');
      console.log('✅ ffmpeg-handler.js: FFmpeg path set to /usr/local/bin/ffmpeg');
    } catch (error) {
      console.error('❌ ffmpeg-handler.js: Failed to set FFmpeg path:', error.message);
    }
  }

  async checkAvailability() {
    console.log('🔍 ffmpeg-handler.js: Starting availability check...');
    try {
      console.log('🔧 ffmpeg-handler.js: Calling ffmpeg.getAvailableFormats...');
      await new Promise((resolve, reject) => {
        ffmpeg.getAvailableFormats((err, formats) => {
          if (err) {
            console.error('❌ ffmpeg-handler.js: FFmpeg not available:', err.message);
            this.isAvailable = false;
            reject(err);
          } else {
            this.isAvailable = true;
            console.log('✅ ffmpeg-handler.js: FFmpeg is available in main process');
            resolve(formats);
          }
        });
      });
      console.log('✅ ffmpeg-handler.js: Availability check completed successfully');
    } catch (error) {
      console.error('❌ ffmpeg-handler.js: FFmpeg availability check failed:', error.message);
      this.isAvailable = false;
    }
  }

  // Synchronous availability check for immediate use
  checkAvailabilitySync() {
    try {
      // Try to run a simple ffprobe command to check if FFmpeg is working
      const { spawn } = require('child_process');
      const ffprobe = spawn('/usr/local/bin/ffprobe', ['-version'], { stdio: 'pipe' });
      
      return new Promise((resolve) => {
        ffprobe.on('close', (code) => {
          this.isAvailable = code === 0;
          console.log(`🔍 ffmpeg-handler.js: Sync availability check result: ${this.isAvailable}`);
          resolve(this.isAvailable);
        });
        
        ffprobe.on('error', (err) => {
          console.error('❌ ffmpeg-handler.js: Sync availability check failed:', err.message);
          this.isAvailable = false;
          resolve(false);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          ffprobe.kill();
          this.isAvailable = false;
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      console.error('❌ ffmpeg-handler.js: Sync availability check error:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  // Method to wait for availability check to complete
  async waitForAvailability() {
    // Wait up to 5 seconds for availability check to complete
    const startTime = Date.now();
    while (this.isAvailable === false && (Date.now() - startTime) < 5000) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.isAvailable;
  }

  async getVideoMetadata(filePath) {
    if (!this.isAvailable) {
      throw new Error('FFmpeg is not available');
    }

    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('File is empty');
    }

    console.log(`🔍 ffmpeg-handler.js: Getting metadata for: ${filePath}`);
    console.log(`📊 ffmpeg-handler.js: File size: ${this.formatFileSize(stats.size)}`);

    return new Promise((resolve, reject) => {
      // Add timeout and better error handling
      const timeout = setTimeout(() => {
        reject(new Error('Metadata extraction timed out after 30 seconds'));
      }, 30000);

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        clearTimeout(timeout);
        
        if (err) {
          console.error(`❌ ffmpeg-handler.js: ffprobe error:`, err.message);
          console.error(`❌ ffmpeg-handler.js: Full error:`, err);
          
          // Try to provide more helpful error messages
          if (err.message.includes('Invalid data found')) {
            reject(new Error('File appears to be corrupted or in an unsupported format'));
          } else if (err.message.includes('No such file')) {
            reject(new Error('File not found or path is incorrect'));
          } else if (err.message.includes('Permission denied')) {
            reject(new Error('Permission denied accessing the file'));
          } else {
            reject(new Error(`Failed to get video metadata: ${err.message}`));
          }
          return;
        }

        console.log(`✅ ffmpeg-handler.js: Metadata extracted successfully`);

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

        if (!videoStream) {
          reject(new Error('No video stream found in file'));
          return;
        }

        const result = {
          duration: parseFloat(metadata.format.duration) || 0,
          size: parseInt(metadata.format.size) || stats.size,
          bitrate: parseInt(metadata.format.bit_rate) || 0,
          video: {
            codec: videoStream.codec_name || 'unknown',
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            fps: this.parseFPS(videoStream.r_frame_rate),
            bitrate: parseInt(videoStream.bit_rate) || 0,
          },
          audio: audioStream ? {
            codec: audioStream.codec_name || 'unknown',
            sampleRate: parseInt(audioStream.sample_rate) || 0,
            channels: audioStream.channels || 0,
            bitrate: parseInt(audioStream.bit_rate) || 0,
          } : null,
        };

        console.log(`📊 ffmpeg-handler.js: Extracted metadata:`, {
          duration: result.duration,
          resolution: `${result.video.width}x${result.video.height}`,
          codec: result.video.codec,
          fps: result.video.fps
        });

        resolve(result);
      });
    });
  }

  async generateThumbnail(inputPath, outputPath, timeOffset = 1, options = {}) {
    if (!this.isAvailable) {
      throw new Error('FFmpeg is not available');
    }

    console.log(`🎬 ffmpeg-handler.js: Generating thumbnail for ${inputPath}`);

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const {
      width = 160,
      height = 90,
      quality = 2
    } = options;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timeOffset)
        .frames(1)
        .size(`${width}x${height}`)
        .outputOptions([
          '-q:v', quality.toString(),
          '-f', 'image2',
          '-y'
        ])
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ ffmpeg-handler.js: Thumbnail generated: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`❌ ffmpeg-handler.js: Thumbnail generation failed:`, err.message);
          reject(new Error(`Failed to generate thumbnail: ${err.message}`));
        })
        .run();
    });
  }

  // Fallback thumbnail generation with multiple time offsets
  async generateThumbnailWithFallback(inputPath, outputPath, options = {}) {
    console.log(`🎬 ffmpeg-handler.js: Starting fallback thumbnail generation for ${inputPath}`);
    
    // Try simple thumbnail generation first
    try {
      console.log(`🔄 ffmpeg-handler.js: Trying simple thumbnail generation`);
      const result = await this.generateThumbnail(inputPath, outputPath, 1, options);
      console.log(`✅ ffmpeg-handler.js: Thumbnail generated successfully`);
      return result;
    } catch (error) {
      console.warn(`⚠️ ffmpeg-handler.js: Simple generation failed: ${error.message}`);
      
      // If simple generation fails, try different time offsets
      const timeOffsets = [0.5, 2, 5, 10];
      
      for (const timeOffset of timeOffsets) {
        try {
          console.log(`🔄 ffmpeg-handler.js: Trying thumbnail generation at ${timeOffset}s`);
          const result = await this.generateThumbnail(inputPath, outputPath, timeOffset, options);
          console.log(`✅ ffmpeg-handler.js: Thumbnail generated successfully at ${timeOffset}s`);
          return result;
        } catch (error) {
          console.warn(`⚠️ ffmpeg-handler.js: Failed at ${timeOffset}s: ${error.message}`);
          if (timeOffset === timeOffsets[timeOffsets.length - 1]) {
            // Last attempt failed, throw the error
            throw error;
          }
        }
      }
    }
  }

  parseFPS(frameRate) {
    if (!frameRate) return 0;
    const [numerator, denominator] = frameRate.split('/').map(Number);
    return denominator ? numerator / denominator : numerator;
  }

  isSupportedVideoFormat(filePath) {
    const supportedExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
    const ext = path.extname(filePath).toLowerCase();
    return supportedExtensions.includes(ext);
  }

  // Fallback method for problematic files
  async getVideoMetadataWithFallback(filePath) {
    console.log(`🔄 ffmpeg-handler.js: Trying fallback metadata extraction for: ${filePath}`);
    
    try {
      // Try the standard method first
      return await this.getVideoMetadata(filePath);
    } catch (error) {
      console.warn(`⚠️ ffmpeg-handler.js: Standard metadata extraction failed: ${error.message}`);
      
      // Try with different ffprobe options
      try {
        console.log(`🔄 ffmpeg-handler.js: Trying with different ffprobe options`);
        return await this.getVideoMetadataWithOptions(filePath);
      } catch (fallbackError) {
        console.warn(`⚠️ ffmpeg-handler.js: Fallback metadata extraction failed: ${fallbackError.message}`);
        
        // Return basic metadata based on file stats
        console.log(`🔄 ffmpeg-handler.js: Using basic file metadata as fallback`);
        return this.getBasicFileMetadata(filePath);
      }
    }
  }

  async getVideoMetadataWithOptions(filePath) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Fallback metadata extraction timed out'));
      }, 15000);

      // Try with different ffprobe options
      ffmpeg.ffprobe(filePath, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams'], (err, metadata) => {
        clearTimeout(timeout);
        
        if (err) {
          reject(new Error(`Fallback metadata extraction failed: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

        if (!videoStream) {
          reject(new Error('No video stream found in file'));
          return;
        }

        const result = {
          duration: parseFloat(metadata.format.duration) || 0,
          size: parseInt(metadata.format.size) || 0,
          bitrate: parseInt(metadata.format.bit_rate) || 0,
          video: {
            codec: videoStream.codec_name || 'unknown',
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            fps: this.parseFPS(videoStream.r_frame_rate),
            bitrate: parseInt(videoStream.bit_rate) || 0,
          },
          audio: audioStream ? {
            codec: audioStream.codec_name || 'unknown',
            sampleRate: parseInt(audioStream.sample_rate) || 0,
            channels: audioStream.channels || 0,
            bitrate: parseInt(audioStream.bit_rate) || 0,
          } : null,
        };

        resolve(result);
      });
    });
  }

  getBasicFileMetadata(filePath) {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    return {
      duration: 0, // Unknown duration
      size: stats.size,
      bitrate: 0,
      video: {
        codec: 'unknown',
        width: 0,
        height: 0,
        fps: 0,
        bitrate: 0,
      },
      audio: null,
      // Add a flag to indicate this is basic metadata
      isBasicMetadata: true,
      originalError: 'Could not extract detailed metadata from file'
    };
  }


  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

module.exports = FFmpegHandler;
