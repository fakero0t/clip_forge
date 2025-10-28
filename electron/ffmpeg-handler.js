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
    this.checkAvailability();
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

  async getVideoMetadata(filePath) {
    if (!this.isAvailable) {
      throw new Error('FFmpeg is not available');
    }

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
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
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps: this.parseFPS(videoStream.r_frame_rate),
            bitrate: parseInt(videoStream.bit_rate) || 0,
          },
          audio: audioStream ? {
            codec: audioStream.codec_name,
            sampleRate: parseInt(audioStream.sample_rate) || 0,
            channels: audioStream.channels || 0,
            bitrate: parseInt(audioStream.bit_rate) || 0,
          } : null,
        };

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
