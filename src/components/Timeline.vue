<template>
  <div class="timeline-container">
    <div class="timeline-header">
      <h3>Timeline</h3>
      <div class="timeline-controls">
        <button class="btn-icon" @click="zoomIn" title="Zoom In">+</button>
        <button class="btn-icon" @click="zoomOut" title="Zoom Out">-</button>
        <button class="btn-icon" @click="zoomToFit" title="Zoom to Fit">⌂</button>
      </div>
    </div>
    
    <div class="timeline-content" ref="timelineContent" @scroll="handleScroll">
      <!-- Time Ruler -->
      <div class="time-ruler" :style="{ width: timelineWidth + 'px' }">
        <div 
          v-for="tick in timeTicks" 
          :key="tick.time"
          class="time-tick"
          :style="{ left: tick.position + 'px' }"
        >
          <div class="tick-line"></div>
          <div class="tick-label">{{ formatTime(tick.time) }}</div>
        </div>
      </div>
      
      <!-- Timeline Tracks -->
      <div class="timeline-tracks" :style="{ width: timelineWidth + 'px' }">
        <div 
          v-for="(track, index) in tracks" 
          :key="track.id"
          class="timeline-track"
          :class="{ 'track-active': track.id === activeTrackId }"
          @click="selectTrack(track.id)"
        >
          <div class="track-header">
            <span class="track-label">{{ track.name }}</span>
            <span class="track-number">{{ index + 1 }}</span>
          </div>
          
          <div 
            class="track-content" 
            :class="{ 'drop-zone-active': isDropZoneActive && hoveredTrackId === track.id }"
            @click="handleTrackClick"
            @dragover="handleTrackDragOver($event, track.id)"
            @dragenter="handleTrackDragEnter($event, track.id)"
            @dragleave="handleTrackDragLeave($event, track.id)"
            @drop="handleTrackDrop($event, track.id)"
          >
            <!-- Clip Blocks -->
            <div 
              v-for="clip in track.clips" 
              :key="clip.id"
              class="clip-block"
              :class="{ 
                'selected': selectedClips.includes(clip.id),
                'dragging': draggingClipId === clip.id
              }"
              :style="getClipStyle(clip)"
              @mousedown="startDragClip(clip, $event)"
              @click="selectClip(clip.id, $event.ctrlKey || $event.metaKey)"
            >
              <div class="clip-thumbnail" v-if="clip.thumbnail">
                <img :src="getThumbnailSrc(clip.thumbnail)" :alt="clip.name" />
              </div>
              <div class="clip-info">
                <span class="clip-name">{{ clip.name }}</span>
                <span class="clip-duration">{{ formatDuration(clip.duration) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Playhead -->
      <div 
        class="playhead"
        :style="{ left: playheadPosition + 'px' }"
        @mousedown="startDragPlayhead"
      ></div>
    </div>
    
    <!-- Timeline Footer -->
    <div class="timeline-footer">
      <div class="timeline-info">
        <span class="current-time">{{ formatTime(currentTime) }}</span>
        <span class="total-duration">{{ formatTime(totalDuration) }}</span>
      </div>
      <div class="timeline-zoom">
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
      </div>
    </div>
  </div>
</template>

<script>
import { useMediaStore } from '../stores/mediaStore.js';
import { useTimelineStore } from '../stores/timelineStore.js';

export default {
  name: 'Timeline',
  data() {
    return {
      // Timeline state
      zoomLevel: 1,
      currentTime: 0,
      totalDuration: 0,
      timelineWidth: 2000,
      pixelsPerSecond: 100,
      
      // Tracks
      tracks: [
        { id: 'track1', name: 'Video Track 1', clips: [] },
        { id: 'track2', name: 'Video Track 2', clips: [] },
      ],
      activeTrackId: 'track1',
      
      // Interaction state
      isDragging: false,
      dragType: null, // 'clip' or 'playhead'
      dragStartX: 0,
      dragStartTime: 0,
      
      // Drag-drop state
      isDropZoneActive: false,
      hoveredTrackId: null,
      draggingClipId: null,
      selectedClips: [],
    };
  },
  
  watch: {
    // Watch for changes in media files and sync with local tracks
    'mediaStore.mediaFiles': {
      handler(newMediaFiles) {
        console.log('🔄 Timeline: Media files changed, syncing with local tracks');
        this.syncTracksWithMediaFiles(newMediaFiles);
      },
      deep: true,
    },
    
    // Watch for changes in timeline store currentTime
    'timelineStore.currentTime': {
      handler(newTime) {
        if (Math.abs(newTime - this.currentTime) > 0.1) {
          this.currentTime = newTime;
        }
      },
      immediate: false,
    },
  },
  
  computed: {
    mediaStore() {
      return useMediaStore();
    },
    
    timelineStore() {
      return useTimelineStore();
    },
    playheadPosition() {
      return this.currentTime * this.pixelsPerSecond * this.zoomLevel;
    },
    
    timeTicks() {
      const ticks = [];
      const interval = this.getTimeInterval();
      const startTime = 0;
      const endTime = this.totalDuration || 60; // Default to 60 seconds
      
      for (let time = startTime; time <= endTime; time += interval) {
        ticks.push({
          time: time,
          position: time * this.pixelsPerSecond * this.zoomLevel,
        });
      }
      
      return ticks;
    },
  },
  mounted() {
    this.updateTimelineWidth();
    this.setupEventListeners();
  },
  beforeUnmount() {
    this.removeEventListeners();
  },
  methods: {
    // Timeline rendering
    
    getTimeInterval() {
      // Adjust interval based on zoom level
      if (this.zoomLevel >= 4) return 1; // 1 second
      if (this.zoomLevel >= 2) return 5; // 5 seconds
      if (this.zoomLevel >= 1) return 10; // 10 seconds
      return 30; // 30 seconds
    },
    
    updateTimelineWidth() {
      const duration = this.totalDuration || 60;
      this.timelineWidth = Math.max(duration * this.pixelsPerSecond * this.zoomLevel, 2000);
    },
    
    // Zoom controls
    zoomIn() {
      this.zoomLevel = Math.min(this.zoomLevel * 1.5, 10);
      this.updateTimelineWidth();
    },
    
    zoomOut() {
      this.zoomLevel = Math.max(this.zoomLevel / 1.5, 0.1);
      this.updateTimelineWidth();
    },
    
    zoomToFit() {
      this.zoomLevel = 1;
      this.updateTimelineWidth();
    },
    
    // Track management
    selectTrack(trackId) {
      this.activeTrackId = trackId;
    },
    
    // Sync local tracks with media files
    syncTracksWithMediaFiles(mediaFiles) {
      console.log('🔄 Timeline: Syncing tracks with media files');
      
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
      console.log('✅ Timeline: Sync complete, total clips:', this.tracks.reduce((sum, track) => sum + track.clips.length, 0));
    },
    
    // Add media file as clip to local tracks
    addMediaFileAsClip(mediaFile, trackId = 'track1') {
      console.log('🎬 Timeline: Adding media file as clip:', mediaFile.name);
      
      const track = this.tracks.find(t => t.id === trackId);
      if (!track) {
        console.error('❌ Timeline: Track not found:', trackId);
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
      
      console.log('✅ Timeline: Clip added to timeline:', newClip.name);
      return newClip;
    },
    
    updateTotalDuration() {
      let maxEndTime = 0;
      for (const track of this.tracks) {
        for (const clip of track.clips) {
          const endTime = clip.startTime + clip.duration;
          if (endTime > maxEndTime) {
            maxEndTime = endTime;
          }
        }
      }
      this.totalDuration = maxEndTime;
      this.updateTimelineWidth();
    },
    
    // Clip management
    getClipStyle(clip) {
      const left = clip.startTime * this.pixelsPerSecond * this.zoomLevel;
      const width = clip.duration * this.pixelsPerSecond * this.zoomLevel;
      
      return {
        left: left + 'px',
        width: Math.max(width, 20) + 'px', // Minimum width of 20px
      };
    },
    
    // Drag and drop
    startDragClip(clip, event) {
      this.isDragging = true;
      this.dragType = 'clip';
      this.dragStartX = event.clientX;
      this.dragStartTime = clip.startTime;
      
      event.preventDefault();
    },
    
    startDragPlayhead(event) {
      this.isDragging = true;
      this.dragType = 'playhead';
      this.dragStartX = event.clientX;
      
      event.preventDefault();
    },
    
    // Event handling
    handleScroll(event) {
      // Handle timeline scrolling
      const scrollLeft = event.target.scrollLeft;
      // Update any scroll-dependent UI elements
    },
    
    setupEventListeners() {
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      document.addEventListener('keydown', this.handleKeyDown);
    },
    
    removeEventListeners() {
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      document.removeEventListener('keydown', this.handleKeyDown);
    },
    
    handleMouseMove(event) {
      if (!this.isDragging) return;
      
      const deltaX = event.clientX - this.dragStartX;
      const deltaTime = deltaX / (this.pixelsPerSecond * this.zoomLevel);
      
      if (this.dragType === 'playhead') {
        this.currentTime = Math.max(0, this.currentTime + deltaTime);
        // Update timeline store to sync with video player
        this.timelineStore.setCurrentTime(this.currentTime);
      } else if (this.dragType === 'clip' && this.draggingClipId) {
        // Handle clip repositioning
        this.updateClipPosition(this.draggingClipId, this.dragStartTime + deltaTime);
      }
    },
    
    handleMouseUp() {
      this.isDragging = false;
      this.dragType = null;
      this.draggingClipId = null;
    },

    updateClipPosition(clipId, newStartTime) {
      // Find the clip
      let clip = null;
      let track = null;
      
      for (const t of this.tracks) {
        const foundClip = t.clips.find(c => c.id === clipId);
        if (foundClip) {
          clip = foundClip;
          track = t;
          break;
        }
      }
      
      if (!clip || !track) return;
      
      // Snap to grid
      const snappedTime = this.snapToGrid(Math.max(0, newStartTime));
      
      // Check for collisions with other clips in the same track
      const otherClips = track.clips.filter(c => c.id !== clipId);
      const hasCollision = otherClips.some(otherClip => {
        const otherEndTime = otherClip.startTime + otherClip.duration;
        const clipEndTime = snappedTime + clip.duration;
        return (snappedTime < otherEndTime && clipEndTime > otherClip.startTime);
      });
      
      if (!hasCollision) {
        clip.startTime = snappedTime;
      }
    },
    
    handleTrackClick(event) {
      // Only handle clicks if not dragging
      if (this.isDragging) return;
      
      // Calculate time based on click position
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const time = clickX / (this.pixelsPerSecond * this.zoomLevel);
      
      // Update current time and sync with timeline store
      this.currentTime = Math.max(0, time);
      this.timelineStore.setCurrentTime(this.currentTime);
      
      console.log('🎯 Timeline: Clicked to time:', this.currentTime);
    },
    
    // Utility functions
    formatTime(seconds) {
      if (!seconds) return '00:00';
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      }
    },
    
    formatDuration(seconds) {
      return this.formatTime(seconds);
    },
    
    getThumbnailSrc(thumbnailPath) {
      // Use the same thumbnail handling as MediaLibrary
      if (!thumbnailPath) return '';
      
      if (window.electronAPI && window.electronAPI.isElectron) {
        const relativePath = thumbnailPath.replace(/\\/g, '/');
        return `thumbnail://${relativePath}`;
      }
      
      return thumbnailPath;
    },

    // Drag-drop methods
    handleTrackDragOver(event, trackId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      this.hoveredTrackId = trackId;
      this.isDropZoneActive = true;
    },

    handleTrackDragEnter(event, trackId) {
      event.preventDefault();
      this.hoveredTrackId = trackId;
      this.isDropZoneActive = true;
    },

    handleTrackDragLeave(event, trackId) {
      event.preventDefault();
      // Only clear if we're leaving the track entirely
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.hoveredTrackId = null;
        this.isDropZoneActive = false;
      }
    },

    handleTrackDrop(event, trackId) {
      event.preventDefault();
      this.isDropZoneActive = false;
      this.hoveredTrackId = null;
      
      try {
        const dragData = JSON.parse(event.dataTransfer.getData('application/json'));
        
        if (dragData.type === 'media-file') {
          console.log('🎬 Timeline: Dropping media file on track:', trackId);
          this.addMediaFileToTrack(dragData.file, trackId, event);
        }
      } catch (error) {
        console.error('❌ Timeline: Error parsing drag data:', error);
      }
    },

    addMediaFileToTrack(mediaFile, trackId, event) {
      // Calculate drop position
      const rect = event.currentTarget.getBoundingClientRect();
      const dropX = event.clientX - rect.left;
      const dropTime = dropX / (this.pixelsPerSecond * this.zoomLevel);
      const snappedTime = this.snapToGrid(dropTime);
      
      // Check for collisions
      if (this.checkCollision(trackId, snappedTime, mediaFile.duration || 5)) {
        console.warn('⚠️ Timeline: Collision detected, placing at end of track');
        // Place at end of track if collision
        const track = this.tracks.find(t => t.id === trackId);
        const lastClip = track.clips[track.clips.length - 1];
        const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;
        this.addMediaFileAsClip(mediaFile, trackId, startTime);
      } else {
        this.addMediaFileAsClip(mediaFile, trackId, snappedTime);
      }
    },

    addMediaFileAsClip(mediaFile, trackId = 'track1', startTime = null) {
      console.log('🎬 Timeline: Adding media file as clip:', mediaFile.name);
      
      const track = this.tracks.find(t => t.id === trackId);
      if (!track) {
        console.error('❌ Timeline: Track not found:', trackId);
        return null;
      }
      
      // Use provided start time or calculate default
      const clipStartTime = startTime !== null ? startTime : 
        (track.clips.length > 0 ? 
          track.clips[track.clips.length - 1].startTime + track.clips[track.clips.length - 1].duration : 0);
      
      // Use actual duration if available, otherwise default to 5 seconds
      const duration = mediaFile.duration || 5;
      
      const newClip = {
        id: `clip_${mediaFile.id}_${Date.now()}`,
        startTime: clipStartTime,
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
      
      // Select the new clip
      this.selectClip(newClip.id, false);
      
      console.log('✅ Timeline: Clip added to timeline:', newClip.name);
      return newClip;
    },

    checkCollision(trackId, startTime, duration) {
      const track = this.tracks.find(t => t.id === trackId);
      if (!track) return false;
      
      const endTime = startTime + duration;
      
      return track.clips.some(clip => {
        const clipEndTime = clip.startTime + clip.duration;
        return (startTime < clipEndTime && endTime > clip.startTime);
      });
    },

    snapToGrid(time) {
      const gridSize = 1; // 1 second grid
      return Math.round(time / gridSize) * gridSize;
    },

    // Clip selection
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

    // Enhanced clip dragging
    startDragClip(clip, event) {
      this.isDragging = true;
      this.dragType = 'clip';
      this.draggingClipId = clip.id;
      this.dragStartX = event.clientX;
      this.dragStartTime = clip.startTime;
      
      // Select the clip if not already selected
      if (!this.selectedClips.includes(clip.id)) {
        this.selectClip(clip.id, false);
      }
      
      event.preventDefault();
    },

    // Keyboard shortcuts
    handleKeyDown(event) {
      // Delete selected clips with Delete or Backspace key
      if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedClips.length > 0) {
        event.preventDefault();
        this.deleteSelectedClips();
      }
      
      // Escape to clear selection
      if (event.key === 'Escape') {
        this.clearSelection();
      }
    },

    deleteSelectedClips() {
      console.log('🗑️ Timeline: Deleting selected clips:', this.selectedClips);
      
      this.selectedClips.forEach(clipId => {
        this.removeClip(clipId);
      });
      
      this.selectedClips = [];
    },

    removeClip(clipId) {
      for (const track of this.tracks) {
        const index = track.clips.findIndex(clip => clip.id === clipId);
        if (index !== -1) {
          track.clips.splice(index, 1);
          this.updateTotalDuration();
          console.log('✅ Timeline: Clip removed:', clipId);
          return true;
        }
      }
      return false;
    },

    clearSelection() {
      this.selectedClips = [];
    },
  },
};
</script>

<style scoped>
.timeline-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #252525;
  border-top: 1px solid #333;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  background-color: #2a2a2a;
}

.timeline-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
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
  transition: background-color 0.2s;
}

.btn-icon:hover {
  background-color: #444;
}

.timeline-content {
  flex: 1;
  position: relative;
  overflow: auto;
  background-color: #1a1a1a;
}

.time-ruler {
  position: sticky;
  top: 0;
  height: 40px;
  background-color: #2a2a2a;
  border-bottom: 1px solid #333;
  z-index: 10;
}

.time-tick {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tick-line {
  width: 1px;
  height: 20px;
  background-color: #666;
  margin-top: 5px;
}

.tick-label {
  font-size: 10px;
  color: #aaa;
  margin-top: 2px;
  white-space: nowrap;
}

.timeline-tracks {
  position: relative;
  min-height: 200px;
}

.timeline-track {
  height: 80px;
  border-bottom: 1px solid #333;
  display: flex;
  transition: background-color 0.2s;
  cursor: pointer;
}

.timeline-track:hover {
  background-color: #222;
}

.timeline-track.track-active {
  background-color: #2a3a4a;
}

.track-header {
  width: 120px;
  background-color: #333;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px;
  border-right: 1px solid #444;
  flex-shrink: 0;
}

.track-label {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 2px;
}

.track-number {
  font-size: 10px;
  color: #aaa;
}

.track-content {
  flex: 1;
  position: relative;
  background-color: #1a1a1a;
}

.clip-block {
  position: absolute;
  top: 8px;
  height: 64px;
  background-color: #4a9eff;
  border-radius: 4px;
  cursor: move;
  display: flex;
  align-items: center;
  padding: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
  min-width: 20px;
}

.clip-block:hover {
  background-color: #5aaeff;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.clip-thumbnail {
  width: 40px;
  height: 40px;
  background-color: #333;
  border-radius: 2px;
  overflow: hidden;
  margin-right: 8px;
  flex-shrink: 0;
}

.clip-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.clip-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.clip-name {
  font-size: 10px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.clip-duration {
  font-size: 9px;
  color: #ccc;
}

.playhead {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background-color: #ff6b6b;
  z-index: 20;
  cursor: ew-resize;
  pointer-events: all;
}

.playhead::before {
  content: '';
  position: absolute;
  top: 0;
  left: -4px;
  width: 10px;
  height: 10px;
  background-color: #ff6b6b;
  border-radius: 50%;
}

.timeline-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #2a2a2a;
  border-top: 1px solid #333;
  font-size: 11px;
  color: #aaa;
}

.timeline-info {
  display: flex;
  gap: 16px;
}

.current-time {
  color: #ff6b6b;
  font-weight: 500;
}

.zoom-level {
  color: #4a9eff;
  font-weight: 500;
}

/* Drag-drop styles */
.track-content.drop-zone-active {
  background-color: rgba(74, 158, 255, 0.1);
  border: 2px dashed #4a9eff;
  border-radius: 4px;
}

.clip-block.selected {
  border: 2px solid #ff6b6b;
  box-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
}

.clip-block.dragging {
  opacity: 0.7;
  transform: scale(1.05);
  z-index: 1000;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
}
</style>
