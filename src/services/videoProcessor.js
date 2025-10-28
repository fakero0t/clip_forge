import ffmpegService from './ffmpeg-ipc.js';

class VideoProcessor {
  constructor() {
    console.log('🎬 videoProcessor.js: VideoProcessor constructor called');
    // Don't create temp directory in renderer process
    // This will be handled by the main process when needed
    this.tempDir = 'temp'; // Just a reference, actual path handled by main process
    console.log('✅ videoProcessor.js: VideoProcessor initialized');
  }

  /**
   * Process video file and extract all necessary information
   * @param {string} filePath - Path to video file
   * @returns {Promise<Object>} Processed video data
   */
  async processVideoFile(filePath) {
    try {
      // Check if it's a supported video format
      const isSupported = await ffmpegService.isSupportedVideoFormat(filePath);
      if (!isSupported) {
        const ext = filePath.includes('.') ? '.' + filePath.split('.').pop() : '';
        throw new Error(`Unsupported video format: ${ext}`);
      }

      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
      const fileExt = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';

      // Get video metadata
      const metadata = await ffmpegService.getVideoMetadata(filePath);

      // Generate thumbnail (using a simple path for now)
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const thumbnailPath = `${this.tempDir}/${baseName}_thumb.jpg`;
      await ffmpegService.generateThumbnail(filePath, thumbnailPath, 1, {
        width: 160,
        height: 90,
        quality: 2
      });

      // Format file size and duration
      const fileSizeFormatted = await ffmpegService.formatFileSize(metadata.size);
      const durationFormatted = await ffmpegService.formatDuration(metadata.duration);

      // Create video data object
      const videoData = {
        id: this.generateId(),
        fileName,
        filePath,
        fileSize: metadata.size,
        fileSizeFormatted,
        duration: metadata.duration,
        durationFormatted,
        resolution: `${metadata.video.width}x${metadata.video.height}`,
        fps: metadata.video.fps,
        codec: metadata.video.codec,
        thumbnailPath,
        metadata: {
          video: metadata.video,
          audio: metadata.audio,
          bitrate: metadata.bitrate
        },
        createdAt: new Date().toISOString(),
        isProcessed: true
      };

      console.log('Video processed successfully:', videoData.fileName);
      return videoData;

    } catch (error) {
      console.error('Error processing video file:', error.message);
      throw new Error(`Failed to process video: ${error.message}`);
    }
  }

  /**
   * Process multiple video files
   * @param {Array<string>} filePaths - Array of video file paths
   * @returns {Promise<Array<Object>>} Array of processed video data
   */
  async processMultipleVideos(filePaths) {
    const results = [];
    const errors = [];

    for (const filePath of filePaths) {
      try {
        const videoData = await this.processVideoFile(filePath);
        results.push(videoData);
      } catch (error) {
        errors.push({
          filePath,
          error: error.message
        });
        console.error(`Failed to process ${filePath}:`, error.message);
      }
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} files failed to process:`, errors);
    }

    return {
      success: results,
      errors: errors
    };
  }

  /**
   * Create a trimmed version of a video
   * @param {Object} videoData - Original video data
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @returns {Promise<Object>} Trimmed video data
   */
  async createTrimmedVideo(videoData, startTime, endTime) {
    try {
      const trimmedFileName = `${path.parse(videoData.fileName).name}_trimmed.mp4`;
      const trimmedPath = path.join(this.tempDir, trimmedFileName);

      await ffmpegService.trimVideo(
        videoData.filePath,
        trimmedPath,
        startTime,
        endTime,
        { quality: 'medium' }
      );

      // Generate thumbnail for trimmed video
      const thumbnailPath = path.join(this.tempDir, `${path.parse(trimmedFileName).name}_thumb.jpg`);
      await ffmpegService.generateThumbnail(trimmedPath, thumbnailPath, 1);

      const trimmedData = {
        ...videoData,
        id: this.generateId(),
        fileName: trimmedFileName,
        filePath: trimmedPath,
        duration: endTime - startTime,
        durationFormatted: ffmpegService.formatDuration(endTime - startTime),
        thumbnailPath,
        isTrimmed: true,
        originalVideoId: videoData.id,
        trimStart: startTime,
        trimEnd: endTime
      };

      return trimmedData;

    } catch (error) {
      console.error('Error creating trimmed video:', error.message);
      throw new Error(`Failed to create trimmed video: ${error.message}`);
    }
  }

  /**
   * Concatenate multiple videos into one
   * @param {Array<Object>} videoDataArray - Array of video data objects
   * @param {string} outputFileName - Output file name
   * @returns {Promise<Object>} Concatenated video data
   */
  async concatenateVideos(videoDataArray, outputFileName = 'concatenated.mp4') {
    try {
      if (videoDataArray.length === 0) {
        throw new Error('No videos to concatenate');
      }

      const inputPaths = videoDataArray.map(video => video.filePath);
      const outputPath = path.join(this.tempDir, outputFileName);

      await ffmpegService.concatenateVideos(inputPaths, outputPath, {
        quality: 'medium'
      });

      // Generate thumbnail for concatenated video
      const thumbnailPath = path.join(this.tempDir, `${path.parse(outputFileName).name}_thumb.jpg`);
      await ffmpegService.generateThumbnail(outputPath, thumbnailPath, 1);

      // Get metadata for concatenated video
      const metadata = await ffmpegService.getVideoMetadata(outputPath);
      const stats = fs.statSync(outputPath);

      const concatenatedData = {
        id: this.generateId(),
        fileName: outputFileName,
        filePath: outputPath,
        fileSize: stats.size,
        fileSizeFormatted: ffmpegService.formatFileSize(stats.size),
        duration: metadata.duration,
        durationFormatted: ffmpegService.formatDuration(metadata.duration),
        resolution: `${metadata.video.width}x${metadata.video.height}`,
        fps: metadata.video.fps,
        codec: metadata.video.codec,
        thumbnailPath,
        metadata: {
          video: metadata.video,
          audio: metadata.audio,
          bitrate: metadata.bitrate
        },
        isConcatenated: true,
        sourceVideoIds: videoDataArray.map(video => video.id),
        createdAt: new Date().toISOString(),
        isProcessed: true
      };

      return concatenatedData;

    } catch (error) {
      console.error('Error concatenating videos:', error.message);
      throw new Error(`Failed to concatenate videos: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files (placeholder - will be implemented in main process)
   * @param {Array<string>} filePaths - Array of file paths to clean up
   */
  async cleanupTempFiles(filePaths = []) {
    console.log('Cleanup temp files requested:', filePaths);
    // TODO: Implement via IPC to main process
  }

  /**
   * Get all temporary files in temp directory (placeholder)
   * @returns {Array<string>} Array of temp file paths
   */
  getTempFiles() {
    console.log('Get temp files requested');
    // TODO: Implement via IPC to main process
    return [];
  }

  /**
   * Clean up all temporary files (placeholder)
   */
  async cleanupAllTempFiles() {
    console.log('Cleanup all temp files requested');
    // TODO: Implement via IPC to main process
  }

  /**
   * Generate unique ID for video data
   * @returns {string} Unique ID
   */
  generateId() {
    return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if FFmpeg is available
   * @returns {boolean} True if FFmpeg is available
   */
  isFFmpegAvailable() {
    console.log('🔍 videoProcessor.js: Checking FFmpeg availability...');
    console.log('📊 videoProcessor.js: ffmpegService.isAvailable:', ffmpegService.isAvailable);
    return ffmpegService.isAvailable;
  }

  /**
   * Get FFmpeg service instance
   * @returns {Object} FFmpeg service instance
   */
  getFFmpegService() {
    return ffmpegService;
  }
}

// Create singleton instance
const videoProcessor = new VideoProcessor();

export default videoProcessor;
