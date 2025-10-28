// FFmpeg service that communicates with Electron main process via IPC
class FFmpegService {
  constructor() {
    console.log('🎬 ffmpeg-ipc.js: FFmpegService constructor called');
    this.isAvailable = false;
    console.log('🔧 ffmpeg-ipc.js: Calling checkAvailability...');
    this.checkAvailability();
    console.log('✅ ffmpeg-ipc.js: FFmpegService initialized');
  }

  /**
   * Check if FFmpeg is available and working
   */
  async checkAvailability() {
    console.log('🔍 ffmpeg-ipc.js: Starting availability check...');
    try {
      console.log('🔧 ffmpeg-ipc.js: Getting ipcRenderer...');
      const { ipcRenderer } = window.require('electron');
      console.log('✅ ffmpeg-ipc.js: ipcRenderer obtained');
      
      console.log('🔧 ffmpeg-ipc.js: Calling IPC...');
      this.isAvailable = await ipcRenderer.invoke('ffmpeg-check-availability');
      console.log('📊 ffmpeg-ipc.js: FFmpeg available:', this.isAvailable);
    } catch (error) {
      console.error('❌ ffmpeg-ipc.js: Availability check failed:', error.message);
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

    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('ffmpeg-get-metadata', filePath);
    } catch (error) {
      throw new Error(`Failed to get video metadata: ${error.message}`);
    }
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

    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('ffmpeg-generate-thumbnail', inputPath, outputPath, timeOffset, options);
    } catch (error) {
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  /**
   * Check if file is a supported video format
   * @param {string} filePath - File path to check
   * @returns {boolean} True if supported video format
   */
  async isSupportedVideoFormat(filePath) {
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('ffmpeg-is-supported-format', filePath);
    } catch (error) {
      console.error('Error checking video format:', error.message);
      return false;
    }
  }

  /**
   * Get file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  async formatFileSize(bytes) {
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('ffmpeg-format-file-size', bytes);
    } catch (error) {
      console.error('Error formatting file size:', error.message);
      return '0 Bytes';
    }
  }

  /**
   * Format duration in MM:SS format
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  async formatDuration(seconds) {
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('ffmpeg-format-duration', seconds);
    } catch (error) {
      console.error('Error formatting duration:', error.message);
      return '0:00';
    }
  }

  // Placeholder methods for compatibility (not implemented yet)
  async concatenateVideos(inputPaths, outputPath, options = {}) {
    throw new Error('Video concatenation not implemented yet');
  }

  async trimVideo(inputPath, outputPath, startTime, endTime, options = {}) {
    throw new Error('Video trimming not implemented yet');
  }

  async copyFile(sourcePath, destPath) {
    throw new Error('File copying not implemented yet');
  }

  parseFPS(frameRate) {
    if (!frameRate) return 0;
    const [numerator, denominator] = frameRate.split('/').map(Number);
    return denominator ? numerator / denominator : numerator;
  }

  getCRFForQuality(quality) {
    const qualityMap = {
      low: 28,
      medium: 23,
      high: 18,
      lossless: 0
    };
    return qualityMap[quality] || qualityMap.medium;
  }
}

// Create singleton instance
const ffmpegService = new FFmpegService();

export default ffmpegService;
