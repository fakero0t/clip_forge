<template>
  <div class="media-library">
    <div class="library-header">
      <h2>Media Library</h2>
      <div class="header-actions">
        <span v-if="isLoading" class="loading-indicator">
          <div class="mini-spinner"></div>
          Processing...
        </span>
        <button 
          class="btn-import" 
          @click="openFilePicker"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Importing...' : 'Import Media' }}
        </button>
      </div>
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
          :class="{ 
            'processing': file.isProcessing, 
            'error': file.error,
            'thumbnail-loaded': file.thumbnailGenerated
          }"
        >
          <div class="media-thumbnail" @click="selectVideo(file)">
            <img 
              v-if="file.thumbnail && file.thumbnailGenerated" 
              :src="getThumbnailSrc(file.thumbnail)" 
              :alt="file.name"
              @error="handleThumbnailError"
              @load="handleThumbnailLoad"
            />
            <div v-else-if="file.isProcessing" class="processing-indicator">
              <div class="spinner"></div>
              <span class="processing-text">Processing...</span>
            </div>
            <div v-else-if="file.error" class="error-indicator">
              <div class="error-icon">⚠️</div>
              <span class="error-text">Error</span>
            </div>
            <div v-else-if="file.thumbnailError" class="thumbnail-error">
              <div class="error-icon">🖼️</div>
              <span class="error-text">Thumbnail failed</span>
            </div>
            <div v-else class="placeholder-thumbnail">
              <div class="video-icon">🎬</div>
              <span class="placeholder-text">Loading...</span>
            </div>
          </div>
          
          <div class="media-info">
            <h4 class="media-name" :title="file.name">{{ truncateFileName(file.name) }}</h4>
            <div class="media-meta">
              <div class="meta-row">
                <span v-if="file.duration" class="duration">
                  <span class="meta-icon">⏱️</span>
                  {{ formatDuration(file.duration) }}
                </span>
                <span v-if="file.resolution" class="resolution">
                  <span class="meta-icon">📐</span>
                  {{ file.resolution }}
                </span>
              </div>
              <div class="meta-row">
                <span class="file-size">
                  <span class="meta-icon">💾</span>
                  {{ formatFileSize(file.size) }}
                </span>
                <span v-if="file.codec" class="codec">
                  <span class="meta-icon">🎥</span>
                  {{ file.codec }}
                </span>
              </div>
            </div>
            <div v-if="file.error" class="error-message">
              {{ file.error }}
            </div>
            <div v-if="file.thumbnailError" class="thumbnail-error-message">
              Thumbnail: {{ file.thumbnailError }}
            </div>
          </div>
          
          <div class="media-actions">
            <button 
              class="btn-remove" 
              @click="removeFile(file.id)"
              title="Remove file"
            >
              <span class="remove-icon">×</span>
            </button>
            <button 
              v-if="file.thumbnailError && !file.isProcessing"
              class="btn-retry-thumbnail" 
              @click="retryThumbnail(file.id)"
              title="Retry thumbnail generation"
            >
              <span class="retry-icon">🔄</span>
            </button>
          </div>
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
    
    getThumbnailSrc() {
      return (thumbnailPath) => {
        // Safety check
        if (!thumbnailPath) {
          return '';
        }
        
        // In Electron, use custom protocol to serve thumbnail files
        if (window.electronAPI && window.electronAPI.isElectron) {
          // Convert file path to custom protocol URL
          const relativePath = thumbnailPath.replace(/\\/g, '/'); // Normalize path separators
          return `thumbnail://${relativePath}`;
        }
        
        // Fallback for web environment
        return thumbnailPath;
      };
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

    handleThumbnailLoad(event) {
      console.log('✅ MediaLibrary: Thumbnail loaded successfully');
      // Thumbnail loaded successfully, no additional action needed
    },

    truncateFileName(fileName, maxLength = 20) {
      if (fileName.length <= maxLength) return fileName;
      const extension = fileName.split('.').pop();
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
      return `${truncatedName}...${extension}`;
    },

    async retryThumbnail(fileId) {
      try {
        console.log('🔄 MediaLibrary: Retrying thumbnail generation for:', fileId);
        await this.mediaStore.generateThumbnail(fileId);
      } catch (error) {
        console.error('❌ MediaLibrary: Thumbnail retry failed:', error);
        this.mediaStore.setError(`Failed to retry thumbnail: ${error.message}`);
      }
    },

    selectVideo(file) {
      console.log('🎬 MediaLibrary: Video selected:', file.name);
      this.$emit('video-selected', file);
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #4a9eff;
  font-weight: 500;
}

.mini-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #444;
  border-top: 2px solid #4a9eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
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
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  padding: 16px;
  max-height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #444 #2a2a2a;
}

.media-grid::-webkit-scrollbar {
  width: 6px;
}

.media-grid::-webkit-scrollbar-track {
  background: #2a2a2a;
  border-radius: 3px;
}

.media-grid::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.media-grid::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.media-item {
  position: relative;
  background-color: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.media-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  border-color: #4a9eff;
}

.media-item.processing {
  opacity: 0.8;
  border-color: #4a9eff;
}

.media-item.error {
  border-color: #ff6b6b;
  background-color: #3a2a2a;
}

.media-item.thumbnail-loaded {
  border-color: #4a9eff;
}

.media-item.thumbnail-loaded:hover {
  border-color: #5aaeff;
}

.media-thumbnail {
  width: 100%;
  height: 80px;
  background-color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.media-thumbnail:hover {
  background-color: #444;
  transform: scale(1.02);
}

.media-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.processing-indicator,
.error-indicator,
.thumbnail-error,
.placeholder-thumbnail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 4px;
}

.processing-indicator {
  color: #4a9eff;
}

.error-indicator,
.thumbnail-error {
  color: #ff6b6b;
}

.placeholder-thumbnail {
  color: #666;
}

.video-icon,
.error-icon {
  font-size: 24px;
  margin-bottom: 2px;
}

.processing-text,
.error-text,
.placeholder-text {
  font-size: 10px;
  font-weight: 500;
  text-align: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #444;
  border-top: 2px solid #4a9eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 4px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.media-info {
  padding: 10px;
  flex: 1;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.media-name {
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.media-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 10px;
  color: #aaa;
  flex: 1;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.meta-row span {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.meta-icon {
  font-size: 8px;
  opacity: 0.7;
  flex-shrink: 0;
}

.duration,
.resolution,
.file-size,
.codec {
  font-size: 9px;
  color: #bbb;
}

.error-message,
.thumbnail-error-message {
  font-size: 9px;
  color: #ff6b6b;
  margin-top: 4px;
  line-height: 1.2;
}

.thumbnail-error-message {
  color: #ffa500;
}

.media-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.media-item:hover .media-actions {
  opacity: 1;
}

.btn-remove,
.btn-retry-thumbnail {
  width: 20px;
  height: 20px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.btn-remove:hover {
  background-color: #ff6b6b;
  transform: scale(1.1);
}

.btn-retry-thumbnail:hover {
  background-color: #4a9eff;
  transform: scale(1.1);
}

.remove-icon,
.retry-icon {
  font-size: 10px;
  line-height: 1;
}

.retry-icon {
  animation: none;
}

.btn-retry-thumbnail:hover .retry-icon {
  animation: spin 0.5s linear infinite;
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
