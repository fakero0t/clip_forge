<template>
  <div id="app" class="app-container">
    <header class="app-header">
      <div class="logo">
        <h1>ClipForge</h1>
      </div>
      <div class="header-actions">
        <span class="ffmpeg-status">{{ ffmpegStatus }}</span>
        <button class="btn-export">Export</button>
      </div>
    </header>

    <main class="app-main">
      <aside class="media-library-container">
        <MediaLibrary :ffmpeg-available="ffmpegAvailable" />
      </aside>

      <section class="editor-section">
        <div class="preview-container">
          <div class="preview-window">
            <div class="preview-placeholder">
              <p>Preview Window</p>
            </div>
          </div>
        </div>

        <div class="timeline-container">
          <div class="timeline-header">
            <h3>Timeline</h3>
            <div class="timeline-controls">
              <button class="btn-icon" title="Zoom In">+</button>
              <button class="btn-icon" title="Zoom Out">-</button>
            </div>
          </div>
          <div class="timeline-content">
            <p class="placeholder-text">Drag clips here to begin editing</p>
          </div>
        </div>

        <div class="transport-controls">
          <button class="btn-transport" title="Play/Pause">▶</button>
          <button class="btn-transport" title="Stop">■</button>
          <span class="timecode">00:00:00</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import { testFFmpegIntegration } from './utils/testFFmpeg.js';
import MediaLibrary from './components/MediaLibrary.vue';

export default {
  name: 'App',
  components: {
    MediaLibrary,
  },
  data() {
    return {
      ffmpegStatus: 'Checking...',
      ffmpegAvailable: false,
    };
  },
  async mounted() {
    console.log('🎬 App.vue: Component mounted, starting initialization...');
    console.log('🔧 App.vue: Checking FFmpeg status...');
    await this.checkFFmpegStatus();
    console.log('✅ App.vue: Initialization complete!');
  },
  methods: {
    async checkFFmpegStatus() {
      console.log('🔍 App.vue: Starting FFmpeg status check...');
      try {
        this.ffmpegStatus = 'Testing FFmpeg...';
        console.log('🔧 App.vue: Calling testFFmpegIntegration...');
        const isAvailable = await testFFmpegIntegration();
        console.log('📊 App.vue: FFmpeg integration result:', isAvailable);
        
        this.ffmpegAvailable = isAvailable;
        this.ffmpegStatus = isAvailable ? 'FFmpeg Ready ✅' : 'FFmpeg Not Installed ❌';
        console.log('✅ App.vue: FFmpeg status updated:', this.ffmpegStatus);
      } catch (error) {
        console.error('❌ App.vue: FFmpeg check failed:', error);
        this.ffmpegStatus = 'FFmpeg Error ❌';
        this.ffmpegAvailable = false;
      }
    },
  },
};
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1a1a1a;
  color: #ffffff;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #252525;
  border-bottom: 1px solid #333;
}

.logo h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #4a9eff;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-export {
  padding: 8px 20px;
  background-color: #4a9eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-export:hover {
  background-color: #3a8eef;
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.media-library-container {
  width: 280px;
  background-color: #202020;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
}



.editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #1a1a1a;
}

.preview-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 300px;
}

.preview-window {
  width: 100%;
  max-width: 800px;
  aspect-ratio: 16 / 9;
  background-color: #000;
  border: 1px solid #333;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-placeholder {
  color: #666;
  font-size: 18px;
}

.timeline-container {
  height: 250px;
  background-color: #252525;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.timeline-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.timeline-controls {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  background-color: #333;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background-color: #444;
}

.timeline-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.transport-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background-color: #202020;
  border-top: 1px solid #333;
}

.btn-transport {
  width: 40px;
  height: 40px;
  background-color: #333;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-transport:hover {
  background-color: #444;
}

.timecode {
  margin-left: 12px;
  font-family: monospace;
  font-size: 16px;
  color: #aaa;
}

.placeholder-text {
  color: #666;
  font-size: 14px;
  text-align: center;
  margin: 0;
}

.ffmpeg-status {
  color: #4a9eff;
  font-size: 12px;
  margin-right: 12px;
  font-weight: 500;
}

</style>
