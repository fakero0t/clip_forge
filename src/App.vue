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
        <MediaLibrary 
          :ffmpeg-available="ffmpegAvailable" 
          @video-selected="onVideoSelected"
        />
      </aside>

      <section class="editor-section">
        <VideoPlayer ref="videoPlayer" />

        <Timeline />

        <div class="transport-controls">
          <button 
            class="btn-transport" 
            :class="{ 'playing': timelineStore.isPlaying }"
            @click="togglePlayPause" 
            :title="timelineStore.isPlaying ? 'Pause' : 'Play'"
          >
            {{ timelineStore.isPlaying ? '⏸' : '▶' }}
          </button>
          <button class="btn-transport" @click="stop" title="Stop">■</button>
          <span class="timecode">{{ formatTime(timelineStore.currentTime) }}</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import { testFFmpegIntegration } from './utils/testFFmpeg.js';
import MediaLibrary from './components/MediaLibrary.vue';
import Timeline from './components/Timeline.vue';
import VideoPlayer from './components/VideoPlayer.vue';
import { useMediaStore } from './stores/mediaStore.js';
import { useTimelineStore } from './stores/timelineStore.js';

export default {
  name: 'App',
  components: {
    MediaLibrary,
    Timeline,
    VideoPlayer,
  },
  data() {
    return {
      ffmpegStatus: 'Checking...',
      ffmpegAvailable: false,
    };
  },
  
  computed: {
    mediaStore() {
      return useMediaStore();
    },
    timelineStore() {
      return useTimelineStore();
    },
  },
  
  watch: {
    // Watch for changes in media files and sync with timeline
    'mediaStore.mediaFiles': {
      handler(newMediaFiles) {
        console.log('🔄 App: Media files changed, syncing with timeline');
        this.timelineStore.syncWithMediaFiles(newMediaFiles);
      },
      deep: true,
    },
  },
  async mounted() {
    console.log('🎬 App.vue: Component mounted, starting initialization...');
    console.log('🔧 App.vue: Checking FFmpeg status...');
    await this.checkFFmpegStatus();
    console.log('✅ App.vue: Initialization complete!');
    console.log('🎬 App: VideoPlayer ref exists:', !!this.$refs.videoPlayer);
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
    
    onVideoSelected(videoFile) {
      console.log('🎬 App: Video selected:', videoFile.name);
      console.log('🎬 App: VideoPlayer ref exists:', !!this.$refs.videoPlayer);
      if (this.$refs.videoPlayer) {
        console.log('🎬 App: Calling loadVideo on VideoPlayer');
        this.$refs.videoPlayer.loadVideo(videoFile);
      } else {
        console.error('❌ App: VideoPlayer ref not found');
      }
    },
    
    // Transport control methods
    togglePlayPause() {
      if (this.timelineStore.isPlaying) {
        this.timelineStore.pause();
      } else {
        this.timelineStore.play();
      }
    },
    
    stop() {
      this.timelineStore.stop();
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


.timeline-placeholder {
  height: 250px;
  background-color: #252525;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.timeline-placeholder h3 {
  margin: 0 0 10px 0;
  color: #4a9eff;
  font-size: 16px;
}

.timeline-placeholder p {
  margin: 0;
  color: #aaa;
  font-size: 14px;
}

.video-player-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  margin: 20px;
  min-height: 300px;
}

.video-player-placeholder h3 {
  margin: 0 0 10px 0;
  color: #4a9eff;
  font-size: 18px;
}

.video-player-placeholder p {
  margin: 0;
  color: #aaa;
  font-size: 14px;
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

.btn-transport.playing {
  background-color: #4a9eff;
}

.btn-transport.playing:hover {
  background-color: #3a8eef;
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
