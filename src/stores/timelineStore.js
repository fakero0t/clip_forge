import { defineStore } from 'pinia';

export const useTimelineStore = defineStore('timeline', {
  state: () => ({
    // Timeline state
    currentTime: 0,
    totalDuration: 0,
    isPlaying: false,
    playbackRate: 1,
    
    // Tracks
    tracks: [
      { 
        id: 'track1', 
        name: 'Video Track 1', 
        clips: [],
        muted: false,
        locked: false,
      },
      { 
        id: 'track2', 
        name: 'Video Track 2', 
        clips: [],
        muted: false,
        locked: false,
      },
    ],
    activeTrackId: 'track1',
    
    // Timeline settings
    zoomLevel: 1,
    pixelsPerSecond: 100,
    snapToGrid: true,
    gridSize: 1, // seconds
    
    // Selection state
    selectedClips: [],
    selectedTrackId: null,
  }),

  getters: {
    getTrackById: (state) => (trackId) => {
      return state.tracks.find(track => track.id === trackId);
    },
    
    getClipById: (state) => (clipId) => {
      for (const track of state.tracks) {
        const clip = track.clips.find(clip => clip.id === clipId);
        if (clip) return { clip, track };
      }
      return null;
    },
    
    getClipsAtTime: (state) => (time) => {
      const clipsAtTime = [];
      for (const track of state.tracks) {
        for (const clip of track.clips) {
          if (time >= clip.startTime && time <= clip.startTime + clip.duration) {
            clipsAtTime.push({ clip, track });
          }
        }
      }
      return clipsAtTime;
    },
    
    getTotalDuration: (state) => {
      let maxEndTime = 0;
      for (const track of state.tracks) {
        for (const clip of track.clips) {
          const endTime = clip.startTime + clip.duration;
          if (endTime > maxEndTime) {
            maxEndTime = endTime;
          }
        }
      }
      return maxEndTime;
    },
    
    getTimelineWidth: (state) => {
      const duration = state.totalDuration || 60;
      return Math.max(duration * state.pixelsPerSecond * state.zoomLevel, 2000);
    },
    
    hasClips: (state) => {
      return state.tracks.some(track => track.clips.length > 0);
    },
  },

  actions: {
    // Timeline control
    setCurrentTime(time) {
      this.currentTime = Math.max(0, time);
    },
    
    play() {
      this.isPlaying = true;
    },
    
    pause() {
      this.isPlaying = false;
    },
    
    stop() {
      this.isPlaying = false;
      this.currentTime = 0;
    },
    
    setPlaybackRate(rate) {
      this.playbackRate = Math.max(0.1, Math.min(rate, 4));
    },
    
    // Track management
    addTrack(track) {
      const newTrack = {
        id: `track_${Date.now()}`,
        name: track.name || `Track ${this.tracks.length + 1}`,
        clips: [],
        muted: false,
        locked: false,
        ...track,
      };
      this.tracks.push(newTrack);
      return newTrack;
    },
    
    removeTrack(trackId) {
      const index = this.tracks.findIndex(track => track.id === trackId);
      if (index !== -1 && this.tracks.length > 1) {
        this.tracks.splice(index, 1);
        if (this.activeTrackId === trackId) {
          this.activeTrackId = this.tracks[0].id;
        }
      }
    },
    
    updateTrack(trackId, updates) {
      const track = this.getTrackById(trackId);
      if (track) {
        Object.assign(track, updates);
      }
    },
    
    setActiveTrack(trackId) {
      this.activeTrackId = trackId;
    },
    
    // Clip management
    addClip(trackId, clip) {
      const track = this.getTrackById(trackId);
      if (!track) return null;
      
      const newClip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startTime: 0,
        duration: 5, // Default 5 seconds
        name: 'New Clip',
        ...clip,
      };
      
      track.clips.push(newClip);
      this.updateTotalDuration();
      return newClip;
    },
    
    removeClip(clipId) {
      for (const track of this.tracks) {
        const index = track.clips.findIndex(clip => clip.id === clipId);
        if (index !== -1) {
          track.clips.splice(index, 1);
          this.updateTotalDuration();
          return true;
        }
      }
      return false;
    },
    
    // Add media file as clip to timeline
    addMediaFileAsClip(mediaFile, trackId = 'track1') {
      console.log('🎬 timelineStore: Adding media file as clip:', mediaFile.name);
      
      const track = this.getTrackById(trackId);
      if (!track) {
        console.error('❌ timelineStore: Track not found:', trackId);
        return null;
      }
      
      // Calculate start time (place after existing clips)
      const lastClip = track.clips[track.clips.length - 1];
      const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;
      
      // Use actual duration if available, otherwise default to 5 seconds
      const duration = mediaFile.duration || 5;
      
      const newClip = {
        id: `clip_${mediaFile.id}`,
        startTime: startTime,
        duration: duration,
        name: mediaFile.name,
        mediaFileId: mediaFile.id,
        thumbnail: mediaFile.thumbnail,
        resolution: mediaFile.resolution,
        codec: mediaFile.codec,
        filePath: mediaFile.path,
        fileSize: mediaFile.size,
      };
      
      track.clips.push(newClip);
      this.updateTotalDuration();
      
      console.log('✅ timelineStore: Clip added to timeline:', newClip.name);
      return newClip;
    },
    
    // Sync media files with timeline clips
    syncWithMediaFiles(mediaFiles) {
      console.log('🔄 timelineStore: Syncing with media files');
      
      // Clear existing clips
      this.tracks.forEach(track => {
        track.clips = [];
      });
      
      // Add each media file as a clip
      mediaFiles.forEach((mediaFile, index) => {
        const trackId = index % 2 === 0 ? 'track1' : 'track2';
        this.addMediaFileAsClip(mediaFile, trackId);
      });
      
      this.updateTotalDuration();
      console.log('✅ timelineStore: Sync complete, total clips:', this.tracks.reduce((sum, track) => sum + track.clips.length, 0));
    },
    
    updateClip(clipId, updates) {
      const result = this.getClipById(clipId);
      if (result) {
        Object.assign(result.clip, updates);
        this.updateTotalDuration();
      }
    },
    
    moveClip(clipId, newTrackId, newStartTime) {
      const result = this.getClipById(clipId);
      if (!result) return false;
      
      const { clip, track: oldTrack } = result;
      const newTrack = this.getTrackById(newTrackId);
      
      if (!newTrack) return false;
      
      // Remove from old track
      const oldIndex = oldTrack.clips.findIndex(c => c.id === clipId);
      if (oldIndex !== -1) {
        oldTrack.clips.splice(oldIndex, 1);
      }
      
      // Add to new track
      clip.startTime = newStartTime;
      newTrack.clips.push(clip);
      
      this.updateTotalDuration();
      return true;
    },
    
    // Selection management
    selectClip(clipId, multiSelect = false) {
      if (multiSelect) {
        if (this.selectedClips.includes(clipId)) {
          this.selectedClips = this.selectedClips.filter(id => id !== clipId);
        } else {
          this.selectedClips.push(clipId);
        }
      } else {
        this.selectedClips = [clipId];
      }
    },
    
    selectTrack(trackId) {
      this.selectedTrackId = trackId;
      this.selectedClips = [];
    },
    
    clearSelection() {
      this.selectedClips = [];
      this.selectedTrackId = null;
    },
    
    // Zoom and view
    setZoomLevel(level) {
      this.zoomLevel = Math.max(0.1, Math.min(level, 10));
    },
    
    zoomIn() {
      this.setZoomLevel(this.zoomLevel * 1.5);
    },
    
    zoomOut() {
      this.setZoomLevel(this.zoomLevel / 1.5);
    },
    
    zoomToFit() {
      this.setZoomLevel(1);
    },
    
    // Utility functions
    updateTotalDuration() {
      this.totalDuration = this.getTotalDuration;
    },
    
    snapToGrid(time) {
      if (!this.snapToGrid) return time;
      return Math.round(time / this.gridSize) * this.gridSize;
    },
    
    // Import from media store
    importFromMediaStore(mediaStore) {
      // This will be called when clips are dragged from media library
      console.log('📝 timelineStore: Importing from media store');
    },
    
    // Clear all data
    clearAll() {
      this.tracks.forEach(track => {
        track.clips = [];
      });
      this.currentTime = 0;
      this.totalDuration = 0;
      this.selectedClips = [];
      this.selectedTrackId = null;
    },
  },
});
