<template>
  <div class="media-library">
    <div class="library-header">
      <h2>Media Library</h2>
      <button 
        class="btn-import" 
        @click="openFilePicker"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Importing...' : 'Import Media' }}
      </button>
    </div>

    <!-- Drag and Drop Zone -->
    <div 
      class="drag-drop-zone"
      :class="{ 'drag-over': isDragOver, 'has-files': hasMediaFiles }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
    >
      <div v-if="!hasMediaFiles" class="drop-zone-content">
        <div class="drop-icon">📁</div>
        <p class="drop-text">Drag & drop video files here</p>
        <p class="drop-subtext">or click "Import Media" above</p>
        <div class="supported-formats">
          <small>Supports: MP4, MOV, WebM, AVI, MKV</small>
        </div>
      </div>
      
      <div v-else class="media-grid">
        <div 
          v-for="file in mediaFiles" 
          :key="file.id"
          class="media-item"
          :class="{ 'processing': file.isProcessing, 'error': file.error }"
        >
          <div class="media-thumbnail">
            <img 
              v-if="file.thumbnail" 
              :src="`file://${file.thumbnail}`" 
              :alt="file.name"
              @error="handleThumbnailError"
            />
            <div v-else-if="file.isProcessing" class="processing-indicator">
              <div class="spinner"></div>
            </div>
            <div v-else-if="file.error" class="error-indicator">
              ⚠️
            </div>
            <div v-else class="placeholder-thumbnail">
              🎬
            </div>
          </div>
          
          <div class="media-info">
            <h4 class="media-name" :title="file.name">{{ file.name }}</h4>
            <div class="media-meta">
              <span v-if="file.duration" class="duration">{{ formatDuration(file.duration) }}</span>
              <span v-if="file.resolution" class="resolution">{{ file.resolution }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>
            <div v-if="file.error" class="error-message">
              {{ file.error }}
            </div>
          </div>
          
          <button 
            class="btn-remove" 
            @click="removeFile(file.id)"
            title="Remove file"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ error }}</span>
      <button class="btn-close-error" @click="clearError">×</button>
    </div>

    <!-- FFmpeg Status -->
    <div v-if="!ffmpegAvailable" class="ffmpeg-warning">
      <p class="warning-text">⚠️ FFmpeg not installed</p>
      <p class="info-text">Install FFmpeg to enable video processing</p>
      <p class="info-text">macOS: brew install ffmpeg</p>
    </div>
  </div>
</template>

<script>
import { useMediaStore } from '../stores/mediaStore.js';
import electronAPI from '../services/electronAPI.js';

export default {
  name: 'MediaLibrary',
  props: {
    ffmpegAvailable: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isDragOver: false,
    };
  },
  computed: {
    mediaStore() {
      return useMediaStore();
    },
    mediaFiles() {
      return this.mediaStore.mediaFiles;
    },
    hasMediaFiles() {
      return this.mediaStore.hasMediaFiles;
    },
    isLoading() {
      return this.mediaStore.isLoading;
    },
    error() {
      return this.mediaStore.error;
    },
  },
  mounted() {
    // Set up menu event listeners
    electronAPI.onMenuImport(() => {
      this.openFilePicker();
    });
  },
  beforeUnmount() {
    // Clean up event listeners
    electronAPI.removeAllListeners();
  },
  methods: {
    async openFilePicker() {
      try {
        console.log('📁 MediaLibrary: Opening file picker...');
        const result = await electronAPI.openFilePicker();
        
        if (!result.canceled && result.files.length > 0) {
          console.log('📁 MediaLibrary: Files selected:', result.files);
          await this.mediaStore.addMediaFiles(result.files);
        }
      } catch (error) {
        console.error('❌ MediaLibrary: File picker error:', error);
        this.mediaStore.setError(`Failed to import files: ${error.message}`);
      }
    },

    async handleDrop(event) {
      event.preventDefault();
      this.isDragOver = false;
      
      console.log('📁 MediaLibrary: Files dropped');
      
      // In Electron, we can get file paths from the dataTransfer
      const filePaths = event.dataTransfer.files ? 
        Array.from(event.dataTransfer.files).map(file => file.path).filter(Boolean) :
        [];
      
      if (filePaths.length === 0) {
        this.mediaStore.setError('No files detected. Please try using the "Import Media" button instead.');
        return;
      }
      
      // Filter for video files by extension
      const videoPaths = filePaths.filter(filePath => this.isVideoFileByPath(filePath));
      
      if (videoPaths.length === 0) {
        this.mediaStore.setError('No valid video files found. Please select MP4, MOV, WebM, AVI, or MKV files.');
        return;
      }
      
      if (videoPaths.length !== filePaths.length) {
        this.mediaStore.setError(`Only ${videoPaths.length} of ${filePaths.length} files are valid video files.`);
      }
      
      try {
        console.log('📁 MediaLibrary: Processing dropped files:', videoPaths);
        const result = await electronAPI.processDroppedFiles(videoPaths);
        
        if (result.success) {
          await this.mediaStore.addMediaFiles(result.files);
        } else {
          this.mediaStore.setError(`Failed to process dropped files: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ MediaLibrary: Drop error:', error);
        this.mediaStore.setError(`Failed to import files: ${error.message}`);
      }
    },

    handleDragOver(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },

    handleDragEnter(event) {
      event.preventDefault();
      this.isDragOver = true;
    },

    handleDragLeave(event) {
      event.preventDefault();
      // Only set isDragOver to false if we're leaving the drop zone entirely
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.isDragOver = false;
      }
    },

    isVideoFile(file) {
      const videoTypes = [
        'video/mp4',
        'video/quicktime',
        'video/webm',
        'video/x-msvideo',
        'video/x-matroska',
        'video/x-m4v',
        'video/3gpp',
        'video/x-flv',
        'video/x-ms-wmv',
      ];
      
      const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp', '.flv', '.wmv'];
      
      return videoTypes.includes(file.type) || 
             videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    },

    isVideoFileByPath(filePath) {
      const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp', '.flv', '.wmv'];
      return videoExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
    },

    removeFile(fileId) {
      this.mediaStore.removeMediaFile(fileId);
    },

    clearError() {
      this.mediaStore.clearError();
    },

    formatDuration(seconds) {
      if (!seconds) return '--:--';
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      }
    },

    formatFileSize(bytes) {
      if (!bytes) return '0 B';
      
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },

    handleThumbnailError(event) {
      console.warn('⚠️ MediaLibrary: Thumbnail load error:', event.target.src);
      event.target.style.display = 'none';
    },
  },
};
</script>

<style scoped>
.media-library {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #202020;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #333;
}

.library-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.btn-import {
  padding: 8px 16px;
  background-color: #4a9eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-import:hover:not(:disabled) {
  background-color: #3a8eef;
}

.btn-import:disabled {
  background-color: #666;
  cursor: not-allowed;
}

.drag-drop-zone {
  flex: 1;
  margin: 16px;
  border: 2px dashed #444;
  border-radius: 8px;
  transition: all 0.2s ease;
  overflow: hidden;
}

.drag-drop-zone.drag-over {
  border-color: #4a9eff;
  background-color: rgba(74, 158, 255, 0.1);
}

.drag-drop-zone.has-files {
  border-style: solid;
  border-color: #333;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  text-align: center;
}

.drop-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.drop-text {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px 0;
  color: #fff;
}

.drop-subtext {
  font-size: 14px;
  margin: 0 0 16px 0;
  color: #aaa;
}

.supported-formats {
  color: #666;
  font-size: 12px;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  padding: 16px;
  max-height: 100%;
  overflow-y: auto;
}

.media-item {
  position: relative;
  background-color: #2a2a2a;
  border-radius: 6px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.media-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.media-item.processing {
  opacity: 0.7;
}

.media-item.error {
  border: 1px solid #ff6b6b;
}

.media-thumbnail {
  width: 100%;
  height: 68px;
  background-color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.media-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.processing-indicator,
.error-indicator,
.placeholder-thumbnail {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 24px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #444;
  border-top: 2px solid #4a9eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.media-info {
  padding: 8px;
}

.media-name {
  font-size: 11px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 10px;
  color: #aaa;
}

.duration,
.resolution,
.file-size {
  white-space: nowrap;
}

.error-message {
  font-size: 10px;
  color: #ff6b6b;
  margin-top: 4px;
}

.btn-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.media-item:hover .btn-remove {
  opacity: 1;
}

.btn-remove:hover {
  background-color: #ff6b6b;
}

.error-banner {
  margin: 16px;
  padding: 12px;
  background-color: #2a2a2a;
  border-radius: 4px;
  border-left: 3px solid #ff6b6b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-icon {
  font-size: 16px;
}

.error-text {
  flex: 1;
  font-size: 12px;
  color: #ff6b6b;
}

.btn-close-error {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-error:hover {
  color: #fff;
}

.ffmpeg-warning {
  margin: 16px;
  padding: 12px;
  background-color: #2a2a2a;
  border-radius: 4px;
  border-left: 3px solid #ff6b6b;
}

.warning-text {
  color: #ff6b6b;
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.info-text {
  color: #aaa;
  font-size: 11px;
  margin: 0;
}
</style>
