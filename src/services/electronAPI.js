// Electron API service for renderer process
// This provides a clean interface to Electron's main process APIs

class ElectronAPI {
  constructor() {
    this.isElectron = false;
    this.ipcRenderer = null;
    
    // Check if we're in Electron environment
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        this.ipcRenderer = ipcRenderer;
        this.isElectron = true;
      } catch (error) {
        console.warn('⚠️ electronAPI: Failed to access Electron APIs:', error);
        this.isElectron = false;
      }
    }
  }

  // File picker functionality
  async openFilePicker() {
    if (!this.isElectron) {
      throw new Error('File picker only available in Electron environment');
    }
    
    try {
      const result = await this.ipcRenderer.invoke('file-picker-open');
      return result;
    } catch (error) {
      console.error('❌ electronAPI: File picker error:', error);
      throw error;
    }
  }

  async processDroppedFiles(filePaths) {
    if (!this.isElectron) {
      throw new Error('File processing only available in Electron environment');
    }
    
    try {
      const result = await this.ipcRenderer.invoke('process-dropped-files', filePaths);
      return result;
    } catch (error) {
      console.error('❌ electronAPI: Process dropped files error:', error);
      throw error;
    }
  }

  // FFmpeg operations
  async checkFFmpegAvailability() {
    if (!this.isElectron) {
      return false;
    }
    
    try {
      return await this.ipcRenderer.invoke('ffmpeg-check-availability');
    } catch (error) {
      console.error('❌ electronAPI: FFmpeg check error:', error);
      return false;
    }
  }

  async getVideoMetadata(filePath) {
    if (!this.isElectron) {
      throw new Error('FFmpeg operations only available in Electron environment');
    }
    
    try {
      return await this.ipcRenderer.invoke('ffmpeg-get-metadata', filePath);
    } catch (error) {
      console.error('❌ electronAPI: Get metadata error:', error);
      throw error;
    }
  }

  async generateThumbnail(inputPath, outputPath, timeOffset, options) {
    if (!this.isElectron) {
      throw new Error('FFmpeg operations only available in Electron environment');
    }
    
    try {
      return await this.ipcRenderer.invoke('ffmpeg-generate-thumbnail', inputPath, outputPath, timeOffset, options);
    } catch (error) {
      console.error('❌ electronAPI: Generate thumbnail error:', error);
      throw error;
    }
  }

  async isSupportedVideoFormat(filePath) {
    if (!this.isElectron) {
      return false;
    }
    
    try {
      return await this.ipcRenderer.invoke('ffmpeg-is-supported-format', filePath);
    } catch (error) {
      console.error('❌ electronAPI: Check format error:', error);
      return false;
    }
  }

  async formatFileSize(bytes) {
    if (!this.isElectron) {
      return '0 B';
    }
    
    try {
      return await this.ipcRenderer.invoke('ffmpeg-format-file-size', bytes);
    } catch (error) {
      console.error('❌ electronAPI: Format file size error:', error);
      return '0 B';
    }
  }

  async formatDuration(seconds) {
    if (!this.isElectron) {
      return '00:00:00';
    }
    
    try {
      return await this.ipcRenderer.invoke('ffmpeg-format-duration', seconds);
    } catch (error) {
      console.error('❌ electronAPI: Format duration error:', error);
      return '00:00:00';
    }
  }

  // Menu event listeners
  onMenuImport(callback) {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on('menu-import', callback);
  }

  onMenuExport(callback) {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on('menu-export', callback);
  }

  onMenuPlayPause(callback) {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on('menu-play-pause', callback);
  }

  onMenuStop(callback) {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on('menu-stop', callback);
  }

  onMenuSplit(callback) {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on('menu-split', callback);
  }

  onMenuDelete(callback) {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on('menu-delete', callback);
  }

  onMenuZoomIn(callback) {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on('menu-zoom-in', callback);
  }

  onMenuZoomOut(callback) {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on('menu-zoom-out', callback);
  }

  onMenuZoomFit(callback) {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on('menu-zoom-fit', callback);
  }

  // Remove all listeners
  removeAllListeners() {
    if (!this.isElectron) return;
    
    this.ipcRenderer.removeAllListeners('menu-import');
    this.ipcRenderer.removeAllListeners('menu-export');
    this.ipcRenderer.removeAllListeners('menu-play-pause');
    this.ipcRenderer.removeAllListeners('menu-stop');
    this.ipcRenderer.removeAllListeners('menu-split');
    this.ipcRenderer.removeAllListeners('menu-delete');
    this.ipcRenderer.removeAllListeners('menu-zoom-in');
    this.ipcRenderer.removeAllListeners('menu-zoom-out');
    this.ipcRenderer.removeAllListeners('menu-zoom-fit');
  }
}

// Create and export singleton instance
const electronAPI = new ElectronAPI();

// Make it available globally for the media store
if (typeof window !== 'undefined') {
  window.electronAPI = electronAPI;
}

export default electronAPI;
