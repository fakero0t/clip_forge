import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

// Ensure ffmpeg is properly loaded
console.log('FFmpeg module loaded:', typeof ffmpeg);
console.log('FFmpeg getAvailableFormats:', typeof ffmpeg?.getAvailableFormats);

class FFmpegService {
  constructor() {
    this.isAvailable = false;
    this.setupFFmpeg();
    // Don't call checkAvailability in constructor - it's async
  }

  /**
   * Setup FFmpeg paths for the system
   */
  setupFFmpeg() {
    // In Electron, we can't use fs.existsSync in the renderer process
    // Just let fluent-ffmpeg use the system PATH to find FFmpeg
    try {
      // Don't set a specific path, let fluent-ffmpeg find it via PATH
      console.log('Using system PATH to find FFmpeg');
    } catch (error) {
      console.log('FFmpeg setup error:', error.message);
    }
  }

  /**
   * Check if FFmpeg is available and working
   */
  async checkAvailability() {
    try {
      // Wait a moment for fluent-ffmpeg to fully load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Checking FFmpeg availability...');
      console.log('ffmpeg object:', ffmpeg);
      console.log('ffmpeg.getAvailableFormats:', ffmpeg?.getAvailableFormats);
      
      if (!ffmpeg) {
        console.error('fluent-ffmpeg module is undefined');
        this.isAvailable = false;
        return;
      }
      
      if (typeof ffmpeg.getAvailableFormats !== 'function') {
        console.error('fluent-ffmpeg.getAvailableFormats is not a function');
        this.isAvailable = false;
        return;
      }

      await new Promise((resolve, reject) => {
        ffmpeg.getAvailableFormats((err, formats) => {
          if (err) {
            console.error('FFmpeg availability check failed:', err.message);
            this.isAvailable = false;
            reject(err);
          } else {
            this.isAvailable = true;
            console.log('FFmpeg is available and working');
            resolve(formats);
          }
        });
      });
    } catch (error) {
      console.error('FFmpeg not available:', error.message);
      this.isAvailable = false;
    }
  }

  /**
   * Get video metadata (duration, resolution, codec, etc.)
   * @param {string} filePath - Path to video file
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoMetadata(filePath) {
    if (!this.isAvailable) {
      throw new Error('FFmpeg is not available. Please install FFmpeg to use video processing features.');
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

  /**
   * Generate thumbnail from video at specified time
   * @param {string} inputPath - Path to input video
   * @param {string} outputPath - Path for thumbnail output
   * @param {number} timeOffset - Time in seconds to capture frame
   * @param {Object} options - Thumbnail options
   * @returns {Promise<string>} Path to generated thumbnail
   */
  async generateThumbnail(inputPath, outputPath, timeOffset = 1, options = {}) {
    if (!this.isAvailable) {
      throw new Error('FFmpeg is not available. Please install FFmpeg to use video processing features.');
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
          '-f', 'image2'
        ])
        .output(outputPath)
        .on('end', () => {
          console.log(`Thumbnail generated: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Thumbnail generation failed:', err.message);
          reject(new Error(`Failed to generate thumbnail: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Concatenate multiple video files
   * @param {Array<string>} inputPaths - Array of video file paths
   * @param {string} outputPath - Output file path
   * @param {Object} options - Concatenation options
   * @returns {Promise<string>} Path to concatenated video
   */
  async concatenateVideos(inputPaths, outputPath, options = {}) {
    if (!this.isAvailable) {
      throw new Error('FFmpeg is not available. Please install FFmpeg to use video processing features.');
    }

    if (inputPaths.length === 0) {
      throw new Error('No input files provided');
    }

    if (inputPaths.length === 1) {
      // Just copy single file
      return this.copyFile(inputPaths[0], outputPath);
    }

    const {
      videoCodec = 'libx264',
      audioCodec = 'aac',
      quality = 'medium'
    } = options;

    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      // Add all input files
      inputPaths.forEach(inputPath => {
        command.input(inputPath);
      });

      command
        .outputOptions([
          '-c:v', videoCodec,
          '-c:a', audioCodec,
          '-preset', 'fast',
          '-crf', this.getCRFForQuality(quality)
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`Processing: ${progress.percent}% done`);
        })
        .on('end', () => {
          console.log(`Video concatenation completed: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Video concatenation failed:', err.message);
          reject(new Error(`Failed to concatenate videos: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Trim video to specified time range
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @param {Object} options - Trim options
   * @returns {Promise<string>} Path to trimmed video
   */
  async trimVideo(inputPath, outputPath, startTime, endTime, options = {}) {
    if (!this.isAvailable) {
      throw new Error('FFmpeg is not available. Please install FFmpeg to use video processing features.');
    }

    const duration = endTime - startTime;
    const {
      videoCodec = 'libx264',
      audioCodec = 'aac',
      quality = 'medium'
    } = options;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .outputOptions([
          '-c:v', videoCodec,
          '-c:a', audioCodec,
          '-preset', 'fast',
          '-crf', this.getCRFForQuality(quality)
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg trim command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`Trimming: ${progress.percent}% done`);
        })
        .on('end', () => {
          console.log(`Video trimmed: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Video trimming failed:', err.message);
          reject(new Error(`Failed to trim video: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Copy file from source to destination
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   * @returns {Promise<string>} Destination path
   */
  async copyFile(sourcePath, destPath) {
    return new Promise((resolve, reject) => {
      fs.copyFile(sourcePath, destPath, (err) => {
        if (err) {
          reject(new Error(`Failed to copy file: ${err.message}`));
        } else {
          resolve(destPath);
        }
      });
    });
  }

  /**
   * Parse frame rate from FFmpeg format (e.g., "30/1" -> 30)
   * @param {string} frameRate - Frame rate string from FFmpeg
   * @returns {number} Parsed frame rate
   */
  parseFPS(frameRate) {
    if (!frameRate) return 0;
    const [numerator, denominator] = frameRate.split('/').map(Number);
    return denominator ? numerator / denominator : numerator;
  }

  /**
   * Get CRF value for quality setting
   * @param {string} quality - Quality level (low, medium, high)
   * @returns {number} CRF value
   */
  getCRFForQuality(quality) {
    const qualityMap = {
      low: 28,
      medium: 23,
      high: 18,
      lossless: 0
    };
    return qualityMap[quality] || qualityMap.medium;
  }

  /**
   * Check if file is a supported video format
   * @param {string} filePath - File path to check
   * @returns {boolean} True if supported video format
   */
  isSupportedVideoFormat(filePath) {
    const supportedExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
    const ext = path.extname(filePath).toLowerCase();
    return supportedExtensions.includes(ext);
  }

  /**
   * Get file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration in MM:SS format
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Create singleton instance
const ffmpegService = new FFmpegService();

// Initialize availability check
ffmpegService.checkAvailability().catch(console.error);

export default ffmpegService;