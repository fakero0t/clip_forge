import { defineStore } from 'pinia';

export const useMediaStore = defineStore('media', {
  state: () => ({
    mediaFiles: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    getMediaFileById: (state) => (id) => {
      return state.mediaFiles.find(file => file.id === id);
    },
    
    getMediaFilesCount: (state) => {
      return state.mediaFiles.length;
    },
    
    hasMediaFiles: (state) => {
      return state.mediaFiles.length > 0;
    },
  },

  actions: {
    async addMediaFiles(files) {
      this.isLoading = true;
      this.error = null;
      
      try {
        console.log('📁 mediaStore: Adding media files:', files);
        
        // Process each file
        const processedFiles = await Promise.all(
          files.map(async (file, index) => {
            const mediaFile = {
              id: `media_${Date.now()}_${index}`,
              name: file.name,
              path: file.path,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              // These will be populated by FFmpeg processing
              duration: null,
              resolution: null,
              codec: null,
              thumbnail: null,
              thumbnailGenerated: false,
              thumbnailError: null,
              isProcessing: true,
              error: null,
            };
            
            console.log('📁 mediaStore: Created media file object:', mediaFile);
            return mediaFile;
          })
        );
        
        // Add to store
        this.mediaFiles.push(...processedFiles);
        console.log('✅ mediaStore: Media files added to store');
        
        // Process metadata and thumbnails asynchronously
        this.processMediaFiles(processedFiles);
        
      } catch (error) {
        console.error('❌ mediaStore: Error adding media files:', error);
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },

    async processMediaFiles(files) {
      console.log('🔧 mediaStore: Processing media files for metadata...');
      
      for (const file of files) {
        try {
        // Get metadata using FFmpeg
        if (!window.electronAPI || !window.electronAPI.isElectron) {
          console.warn('⚠️ mediaStore: Electron API not available, skipping metadata extraction');
          return;
        }
        
        const metadata = await window.electronAPI.getVideoMetadata(file.path);
          
          // Update file with metadata
          const fileIndex = this.mediaFiles.findIndex(f => f.id === file.id);
          if (fileIndex !== -1) {
            this.mediaFiles[fileIndex] = {
              ...this.mediaFiles[fileIndex],
              duration: metadata.duration || 0,
              resolution: metadata.video.width && metadata.video.height ? 
                `${metadata.video.width}x${metadata.video.height}` : 'Unknown',
              codec: metadata.video.codec || 'Unknown',
              isProcessing: false,
              // Add flags for basic metadata
              isBasicMetadata: metadata.isBasicMetadata || false,
              metadataError: metadata.originalError || null,
            };
            
            if (metadata.isBasicMetadata) {
              console.warn('⚠️ mediaStore: Using basic metadata for file:', file.name, 'Reason:', metadata.originalError);
            } else {
              console.log('✅ mediaStore: Processed file:', file.name, metadata);
            }
          }
          
          // Generate thumbnail
          await this.generateThumbnail(file.id);
          
        } catch (error) {
          console.error('❌ mediaStore: Error processing file:', file.name, error);
          const fileIndex = this.mediaFiles.findIndex(f => f.id === file.id);
          if (fileIndex !== -1) {
            // Determine if this is a critical error or just metadata extraction failure
            const isCriticalError = error.message.includes('File does not exist') || 
                                   error.message.includes('Permission denied') ||
                                   error.message.includes('File is empty');
            
            this.mediaFiles[fileIndex] = {
              ...this.mediaFiles[fileIndex],
              isProcessing: false,
              error: isCriticalError ? error.message : null,
              // For non-critical errors, try to use basic metadata
              isBasicMetadata: !isCriticalError,
              metadataError: !isCriticalError ? error.message : null,
              duration: 0,
              resolution: 'Unknown',
              codec: 'Unknown',
            };
            
            if (!isCriticalError) {
              console.warn('⚠️ mediaStore: Using basic metadata due to processing error:', file.name);
            }
          }
        }
      }
    },

    async generateThumbnail(fileId) {
      try {
        const file = this.getMediaFileById(fileId);
        if (!file) return;
        
        if (!window.electronAPI || !window.electronAPI.isElectron) {
          console.warn('⚠️ mediaStore: Electron API not available, skipping thumbnail generation');
          return;
        }
        
        // Generate thumbnail path
        const thumbnailPath = `temp/thumbnails/${fileId}.jpg`;
        
        // Generate thumbnail using FFmpeg
        await window.electronAPI.generateThumbnail(
          file.path,
          thumbnailPath,
          1, // 1 second into the video
          { width: 200, height: 112 } // 16:9 aspect ratio
        );
        
        // Update file with thumbnail path
        const fileIndex = this.mediaFiles.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
          this.mediaFiles[fileIndex].thumbnail = thumbnailPath;
          this.mediaFiles[fileIndex].thumbnailGenerated = true;
        }
        
        console.log('✅ mediaStore: Generated thumbnail for:', file.name);
        
      } catch (error) {
        console.error('❌ mediaStore: Error generating thumbnail:', error);
        // Mark thumbnail generation as failed
        const fileIndex = this.mediaFiles.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
          this.mediaFiles[fileIndex].thumbnailError = error.message;
        }
      }
    },

    removeMediaFile(fileId) {
      const index = this.mediaFiles.findIndex(file => file.id === fileId);
      if (index !== -1) {
        this.mediaFiles.splice(index, 1);
        console.log('🗑️ mediaStore: Removed media file:', fileId);
      }
    },

    clearAllMediaFiles() {
      this.mediaFiles = [];
      this.error = null;
      console.log('🗑️ mediaStore: Cleared all media files');
    },

    setError(error) {
      this.error = error;
    },

    clearError() {
      this.error = null;
    },
  },
});
