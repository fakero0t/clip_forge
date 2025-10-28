<template>
  <div class="video-player-container">
    <div class="preview-window" :class="{ 'loading': isLoading }">
      <!-- Video Element -->
      <video 
        ref="videoElement"
        class="preview-video"
        :src="currentVideoSrc"
        :poster="currentPoster"
        @loadeddata="onVideoLoaded"
        @error="onVideoError"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onMetadataLoaded"
        @canplay="onCanPlay"
        @waiting="onWaiting"
        @playing="onPlaying"
        @pause="onPause"
        @ended="onEnded"
        preload="metadata"
        playsinline
      >
        Your browser does not support the video tag.
      </video>
      
      <!-- Loading Overlay -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p class="loading-text">{{ loadingMessage }}</p>
      </div>
      
      <!-- Error Overlay -->
      <div v-if="hasError" class="error-overlay">
        <div class="error-icon">⚠️</div>
        <p class="error-text">{{ errorMessage }}</p>
        <button class="retry-button" @click="retryLoad">Retry</button>
      </div>
      
      <!-- No Video Overlay -->
      <div v-if="!currentVideoSrc && !isLoading && !hasError" class="no-video-overlay">
        <div class="no-video-icon">🎬</div>
        <h3 class="no-video-title">No Video Selected</h3>
        <p class="no-video-text">Import a video file to see the preview</p>
      </div>
      
      <!-- Video Info Overlay -->
      <div v-if="currentVideoSrc && !isLoading && !hasError" class="video-info-overlay">
        <div class="video-info">
          <span class="video-name">{{ currentVideoName }}</span>
          <span class="video-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
        </div>
        <div class="video-resolution" v-if="videoResolution">
          {{ videoResolution }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useTimelineStore } from '../stores/timelineStore.js';
import { useMediaStore } from '../stores/mediaStore.js';

export default {
  name: 'VideoPlayer',
  data() {
    return {
      // Video state
      currentVideoSrc: null,
      currentVideoName: '',
      currentPoster: null,
      currentTime: 0,
      duration: 0,
      videoResolution: '',
      
      // Loading state
      isLoading: false,
      loadingMessage: 'Loading video...',
      
      // Error state
      hasError: false,
      errorMessage: '',
      
      // Playback state
      isPlaying: false,
      isPaused: false,
      isWaiting: false,
      
      // Timeline sync
      timelineSyncEnabled: true,
      lastTimelineTime: 0,
      
      // Resize handling
      resizeObserver: null,
      resizeTimeout: null,
    };
  },
  
  computed: {
    // Computed properties for reactive data
    isVideoReady() {
      return !!this.currentVideoSrc && !this.hasError && !this.isLoading;
    },
    
    // Store instances
    timelineStore() {
      return useTimelineStore();
    },
    
    mediaStore() {
      return useMediaStore();
    },
    
    // Timeline store values
    timelineCurrentTime() {
      return this.timelineStore.currentTime;
    },
    
    timelineIsPlaying() {
      return this.timelineStore.isPlaying;
    },
  },
  
  watch: {
    // Watch for timeline changes using a more reliable approach
    timelineCurrentTime: {
      handler(newTime) {
        if (this.timelineSyncEnabled && this.$refs.videoElement) {
          this.syncWithTimeline(newTime);
        }
      },
      immediate: false,
    },
    
    timelineIsPlaying: {
      handler(isPlaying) {
        if (this.$refs.videoElement) {
          if (isPlaying && this.isPaused) {
            this.play();
          } else if (!isPlaying && this.isPlaying) {
            this.pause();
          }
        }
      },
      immediate: false,
    },
  },
  
  mounted() {
    console.log('🎬 VideoPlayer: Component mounted');
    this.setupVideoElement();
    this.setupResizeObserver();
  },
  
  beforeUnmount() {
    this.cleanup();
  },
  
  methods: {
    // Video element setup
    setupVideoElement() {
      if (this.$refs.videoElement) {
        console.log('🎬 VideoPlayer: Setting up video element event listeners');
        this.$refs.videoElement.addEventListener('loadstart', this.onLoadStart);
        this.$refs.videoElement.addEventListener('progress', this.onProgress);
        this.$refs.videoElement.addEventListener('seeking', this.onSeeking);
        this.$refs.videoElement.addEventListener('seeked', this.onSeeked);
        
        // Add additional debugging
        this.$refs.videoElement.addEventListener('loadstart', () => {
          console.log('🎬 VideoPlayer: Load start event fired');
        });
        
        this.$refs.videoElement.addEventListener('canplay', () => {
          console.log('🎬 VideoPlayer: Can play event fired');
        });
        
        this.$refs.videoElement.addEventListener('error', (event) => {
          console.log('🎬 VideoPlayer: Error event fired with details:', {
            error: event.target.error,
            networkState: event.target.networkState,
            readyState: event.target.readyState
          });
        });
      } else {
        console.error('❌ VideoPlayer: Video element not found during setup');
      }
    },
    
    // Video loading methods
    async loadVideo(videoFile) {
      console.log('🎬 VideoPlayer: loadVideo called with:', videoFile);
      
      // Clear previous state
      this.clearState();
      
      if (videoFile) {
        this.isLoading = true;
        this.loadingMessage = 'Loading video...';
        this.currentVideoSrc = videoFile.path;
        this.currentVideoName = videoFile.name;
        this.currentPoster = videoFile.thumbnail || null;
        
        // Validate file path
        if (!videoFile.path) {
          console.error('❌ VideoPlayer: No file path provided');
          this.hasError = true;
          this.errorMessage = 'No file path provided for video.';
          this.isLoading = false;
          return;
        }
        
        // Log file path details for debugging
        console.log('🎬 VideoPlayer: File path details:', {
          originalPath: videoFile.path,
          isElectron: window.electronAPI && window.electronAPI.isElectron,
          pathType: videoFile.path.startsWith('file://') ? 'file:// URL' : 
                   videoFile.path.startsWith('http') ? 'HTTP URL' : 'Local path'
        });
        
        // Check if file is accessible (in Electron environment)
        if (window.electronAPI && window.electronAPI.isElectron) {
          try {
            const isSupported = await window.electronAPI.isSupportedVideoFormat(videoFile.path);
            if (!isSupported) {
              console.error('❌ VideoPlayer: Unsupported video format');
              this.hasError = true;
              this.errorMessage = 'Unsupported video format. Please use MP4, MOV, WebM, AVI, or MKV files.';
              this.isLoading = false;
              return;
            }
          } catch (error) {
            console.warn('⚠️ VideoPlayer: Could not verify video format:', error);
            // Continue loading even if format check fails
          }
        }
        
        // Set video source
        if (this.$refs.videoElement) {
          // In Electron, use custom video:// protocol for better compatibility
          let videoSrc = videoFile.path;
          
          if (window.electronAPI && window.electronAPI.isElectron) {
            // Check if it's already a protocol URL
            if (!videoSrc.startsWith('video://') && !videoSrc.startsWith('file://') && !videoSrc.startsWith('http://') && !videoSrc.startsWith('https://')) {
              // Use custom video:// protocol for better Electron compatibility
              videoSrc = `video://${encodeURIComponent(videoSrc)}`;
            }
          }
          
          console.log('🎬 VideoPlayer: Setting video source to:', videoSrc);
          this.$refs.videoElement.src = videoSrc;
          this.$refs.videoElement.load();
        } else {
          console.error('❌ VideoPlayer: Video element not found');
          this.hasError = true;
          this.errorMessage = 'Video element not available.';
          this.isLoading = false;
        }
      } else {
        this.clearVideo();
      }
    },
    
    // Video source switching
    async switchVideoSource(videoFile) {
      console.log('🎬 VideoPlayer: Switching video source to:', videoFile?.name);
      await this.loadVideo(videoFile);
    },
    
    // Preview rendering logic for timeline composition
    async renderTimelinePreview(time) {
      if (!this.$refs.videoElement) return;
      
      // Find which clip should be playing at this time
      const clipsAtTime = this.timelineStore.getClipsAtTime(time);
      
      if (clipsAtTime.length > 0) {
        // Get the topmost clip (highest track)
        const topClip = clipsAtTime[clipsAtTime.length - 1];
        const clip = topClip.clip;
        
        // Calculate the time within the clip
        const clipTime = time - clip.startTime;
        
        // Switch to this clip's video source if different
        const mediaFile = this.mediaStore.getMediaFileById(clip.mediaFileId);
        if (mediaFile && mediaFile.path !== this.currentVideoSrc) {
          await this.switchVideoSource(mediaFile);
        }
        
        // Seek to the correct time within the clip
        if (this.$refs.videoElement && clipTime >= 0 && clipTime <= clip.duration) {
          this.$refs.videoElement.currentTime = clipTime;
        }
      }
    },
    
    // Timeline synchronization
    async syncWithTimeline(timelineTime) {
      if (!this.timelineSyncEnabled) return;
      
      // Only sync if the timeline time has changed significantly
      if (Math.abs(timelineTime - this.lastTimelineTime) > 0.1) {
        this.lastTimelineTime = timelineTime;
        await this.renderTimelinePreview(timelineTime);
      }
    },
    
    // Aspect ratio handling
    handleAspectRatio() {
      if (!this.$refs.videoElement) return;
      
      const video = this.$refs.videoElement;
      const container = this.$el.querySelector('.preview-window');
      
      if (!container) return;
      
      // Wait for video dimensions to be available
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('🎬 VideoPlayer: Video dimensions not ready, retrying...');
        setTimeout(() => this.handleAspectRatio(), 100);
        return;
      }
      
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      const containerAspectRatio = container.clientWidth / container.clientHeight;
      
      console.log('🎬 VideoPlayer: Aspect ratios - Video:', videoAspectRatio, 'Container:', containerAspectRatio);
      
      // Always use contain to fit within container
      video.style.objectFit = 'contain';
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      video.style.width = 'auto';
      video.style.height = 'auto';
      
      // Force the video to fit within the container bounds
      if (videoAspectRatio > containerAspectRatio) {
        // Video is wider - constrain by width
        video.style.width = '100%';
        video.style.height = 'auto';
      } else {
        // Video is taller - constrain by height
        video.style.width = 'auto';
        video.style.height = '100%';
      }
    },
    
    // Playback control methods
    play() {
      if (this.$refs.videoElement && !this.isPlaying) {
        this.$refs.videoElement.play();
        this.isPlaying = true;
        this.isPaused = false;
        console.log('▶️ VideoPlayer: Playing video');
      }
    },
    
    pause() {
      if (this.$refs.videoElement && this.isPlaying) {
        this.$refs.videoElement.pause();
        this.isPlaying = false;
        this.isPaused = true;
        console.log('⏸️ VideoPlayer: Paused video');
      }
    },
    
    stop() {
      if (this.$refs.videoElement) {
        this.$refs.videoElement.pause();
        this.$refs.videoElement.currentTime = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        console.log('⏹️ VideoPlayer: Stopped video');
      }
    },
    
    seekTo(time) {
      if (this.$refs.videoElement) {
        this.$refs.videoElement.currentTime = time;
        this.currentTime = time;
        console.log('⏭️ VideoPlayer: Seeking to', time);
      }
    },
    
    // Event handlers
    onLoadStart() {
      this.isLoading = true;
      this.loadingMessage = 'Loading video...';
    },
    
    onProgress() {
      this.isLoading = true;
      this.loadingMessage = 'Buffering...';
    },
    
    onVideoLoaded() {
      console.log('✅ VideoPlayer: Video loaded successfully');
      this.isLoading = false;
      this.hasError = false;
      // Delay aspect ratio handling to ensure video dimensions are available
      setTimeout(() => this.handleAspectRatio(), 50);
    },
    
    onMetadataLoaded() {
      console.log('📊 VideoPlayer: Metadata loaded');
      this.duration = this.$refs.videoElement.duration;
      this.videoResolution = `${this.$refs.videoElement.videoWidth}x${this.$refs.videoElement.videoHeight}`;
      // Delay aspect ratio handling to ensure video dimensions are available
      setTimeout(() => this.handleAspectRatio(), 50);
    },
    
    onCanPlay() {
      console.log('🎬 VideoPlayer: Video can play');
      this.isLoading = false;
      this.isWaiting = false;
    },
    
    onWaiting() {
      console.log('⏳ VideoPlayer: Video waiting');
      this.isWaiting = true;
      this.isLoading = true;
      this.loadingMessage = 'Buffering...';
    },
    
    onPlaying() {
      console.log('▶️ VideoPlayer: Video playing');
      this.isPlaying = true;
      this.isPaused = false;
      this.isLoading = false;
      this.isWaiting = false;
    },
    
    onPause() {
      console.log('⏸️ VideoPlayer: Video paused');
      this.isPlaying = false;
      this.isPaused = true;
    },
    
    onEnded() {
      console.log('🏁 VideoPlayer: Video ended');
      this.isPlaying = false;
      this.isPaused = false;
      this.currentTime = this.duration;
    },
    
    onTimeUpdate() {
      this.currentTime = this.$refs.videoElement.currentTime;
      
      // Update timeline if we're not syncing from timeline
      if (!this.timelineSyncEnabled) {
        this.timelineStore.setCurrentTime(this.currentTime);
      }
    },
    
    onSeeking() {
      this.isLoading = true;
      this.loadingMessage = 'Seeking...';
    },
    
    onSeeked() {
      this.isLoading = false;
      this.currentTime = this.$refs.videoElement.currentTime;
    },
    
    onVideoError(event) {
      console.error('❌ VideoPlayer: Video error:', event);
      
      // Extract detailed error information
      const video = event.target;
      const error = video.error;
      let errorMessage = 'Failed to load video.';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading was aborted.';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading video.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video format is not supported or file is corrupted.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            if (error.message && error.message.includes('DEMUXER_ERROR_COULD_NOT_OPEN')) {
              errorMessage = 'Video file could not be opened. The file may be corrupted or in an unsupported format.';
            } else {
              errorMessage = 'Video format is not supported by your browser.';
            }
            break;
          default:
            errorMessage = `Video error: ${error.message || 'Unknown error'}`;
        }
        
        console.error('❌ VideoPlayer: Detailed error info:', {
          code: error.code,
          message: error.message,
          networkState: video.networkState,
          readyState: video.readyState,
          src: video.src
        });
      }
      
      this.hasError = true;
      this.isLoading = false;
      this.errorMessage = errorMessage;
    },
    
    // Utility methods
    clearState() {
      this.hasError = false;
      this.errorMessage = '';
      this.isLoading = false;
      this.isPlaying = false;
      this.isPaused = false;
      this.isWaiting = false;
    },
    
    clearVideo() {
      this.currentVideoSrc = null;
      this.currentVideoName = '';
      this.currentPoster = null;
      this.currentTime = 0;
      this.duration = 0;
      this.videoResolution = '';
      this.clearState();
      
      if (this.$refs.videoElement) {
        this.$refs.videoElement.src = '';
        this.$refs.videoElement.load();
      }
    },
    
    retryLoad() {
      console.log('🔄 VideoPlayer: Retrying video load');
      this.hasError = false;
      this.errorMessage = '';
      this.isLoading = true;
      this.loadingMessage = 'Retrying...';
      
      if (this.$refs.videoElement && this.currentVideoSrc) {
        this.$refs.videoElement.load();
      }
    },
    
    formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '00:00';
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      }
    },
    
    // Public API methods
    getCurrentTime() {
      return this.currentTime;
    },
    
    getDuration() {
      return this.duration;
    },
    
    isVideoLoaded() {
      return !!this.currentVideoSrc && !this.hasError && !this.isLoading;
    },
    
    setTimelineSync(enabled) {
      this.timelineSyncEnabled = enabled;
    },
    
    setupResizeObserver() {
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          // Debounce resize handling
          clearTimeout(this.resizeTimeout);
          this.resizeTimeout = setTimeout(() => {
            this.handleAspectRatio();
          }, 100);
        });
        
        const previewWindow = this.$el.querySelector('.preview-window');
        if (previewWindow) {
          this.resizeObserver.observe(previewWindow);
        }
      }
    },

    cleanup() {
      if (this.$refs.videoElement) {
        this.$refs.videoElement.removeEventListener('loadstart', this.onLoadStart);
        this.$refs.videoElement.removeEventListener('progress', this.onProgress);
        this.$refs.videoElement.removeEventListener('seeking', this.onSeeking);
        this.$refs.videoElement.removeEventListener('seeked', this.onSeeked);
      }
      
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
    },
  },
};
</script>

<style scoped>
.video-player-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #1a1a1a;
  position: relative;
}

.preview-window {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
  border: 1px solid #333;
  border-radius: 4px;
  margin: 20px;
  min-height: 300px;
  max-height: 60vh;
  position: relative;
  overflow: hidden;
}

.preview-window.loading {
  background-color: #111;
}

.preview-video {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  background-color: #000;
  display: block;
  margin: 0 auto;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  z-index: 20;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top: 3px solid #4a9eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #aaa;
  margin: 0;
}

/* Error Overlay */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.9);
  color: #fff;
  z-index: 20;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-text {
  font-size: 16px;
  margin: 0 0 16px 0;
  color: #ff6b6b;
  text-align: center;
  max-width: 300px;
}

.retry-button {
  background-color: #4a9eff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.retry-button:hover {
  background-color: #3a8eef;
}

/* No Video Overlay */
.no-video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #111;
  color: #666;
  z-index: 10;
}

.no-video-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-video-title {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 8px 0;
  color: #4a9eff;
}

.no-video-text {
  font-size: 14px;
  margin: 0;
  color: #888;
}

/* Video Info Overlay */
.video-info-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.7) 0%,
    transparent 20%,
    transparent 80%,
    rgba(0, 0, 0, 0.7) 100%
  );
  color: #fff;
  z-index: 15;
  pointer-events: none;
}

.video-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-name {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.video-time {
  font-size: 12px;
  color: #ccc;
  font-family: monospace;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.video-resolution {
  font-size: 11px;
  color: #aaa;
  text-align: right;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

/* Responsive Design */
@media (max-width: 768px) {
  .preview-window {
    margin: 10px;
    min-height: 200px;
  }
  
  .video-info-overlay {
    padding: 8px;
  }
  
  .video-name {
    font-size: 12px;
    max-width: 150px;
  }
  
  .video-time {
    font-size: 11px;
  }
  
  .video-resolution {
    font-size: 10px;
  }
}

/* Aspect Ratio Handling */
.preview-window[data-aspect-ratio="wide"] .preview-video {
  width: 100%;
  height: auto;
}

.preview-window[data-aspect-ratio="tall"] .preview-video {
  width: auto;
  height: 100%;
}

/* Loading States */
.preview-window.loading .preview-video {
  opacity: 0.3;
}

.preview-window.waiting .preview-video {
  opacity: 0.7;
}

/* Error States */
.preview-window.error {
  background-color: #2a1a1a;
}

.preview-window.error .preview-video {
  opacity: 0.1;
}
</style>