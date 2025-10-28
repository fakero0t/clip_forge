<template>
  <div class="video-player-container">
    <div class="preview-window">
      <h3>Video Player</h3>
      <p>Video Player component (working version)</p>
      <p>Video source: {{ currentVideoSrc || 'None' }}</p>
      
      <!-- Simple video element for testing -->
      <video 
        id="test-video"
        width="400" 
        height="300" 
        controls
        style="margin-top: 20px;"
      >
        <source src="" type="video/mp4">
        Your browser does not support the video tag.
      </video>
      
      <!-- Error Overlay -->
      <div v-if="hasError" class="error-overlay">
        <div class="error-icon">⚠️</div>
        <p class="error-text">{{ errorMessage }}</p>
        <button class="retry-button" @click="retryLoad">Retry</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoPlayer',
  data() {
    return {
      currentVideoSrc: null,
      hasError: false,
      errorMessage: '',
    };
  },
  methods: {
    loadVideo(videoFile) {
      console.log('🎬 VideoPlayer: loadVideo called with:', videoFile);
      
      // Clear any previous errors
      this.hasError = false;
      this.errorMessage = '';
      
      if (videoFile) {
        this.currentVideoSrc = videoFile.path;
        
        // Set video source using vanilla JavaScript
        const videoElement = document.getElementById('test-video');
        if (videoElement) {
          videoElement.src = videoFile.path;
          console.log('🎬 VideoPlayer: Video source set to:', videoFile.path);
          
          // Add error event listener
          videoElement.onerror = () => {
            console.error('❌ VideoPlayer: Video failed to load');
            this.hasError = true;
            this.errorMessage = 'Failed to load video';
          };
          
          // Add loaded event listener
          videoElement.onloadeddata = () => {
            console.log('✅ VideoPlayer: Video loaded successfully');
            this.hasError = false;
          };
        }
      } else {
        this.currentVideoSrc = null;
        
        // Clear video source
        const videoElement = document.getElementById('test-video');
        if (videoElement) {
          videoElement.src = '';
        }
      }
    },
    
    retryLoad() {
      console.log('🔄 VideoPlayer: Retrying video load');
      this.hasError = false;
      this.errorMessage = '';
      
      const videoElement = document.getElementById('test-video');
      if (videoElement && this.currentVideoSrc) {
        videoElement.load();
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
}

.preview-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #000;
  border: 1px solid #333;
  border-radius: 4px;
  margin: 20px;
  min-height: 300px;
}

.preview-window h3 {
  margin: 0 0 10px 0;
  color: #4a9eff;
  font-size: 18px;
}

.preview-window p {
  margin: 0;
  color: #aaa;
  font-size: 14px;
}

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
  z-index: 10;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-text {
  font-size: 16px;
  margin: 0 0 16px 0;
  color: #ff6b6b;
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
</style>