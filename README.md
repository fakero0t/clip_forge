# ClipForge

A streamlined desktop video editing application focused on the essentials: trim, splice, and export.

## Tech Stack

- **Electron** - Native desktop application framework
- **Vue 3** - Frontend framework
- **Vite** - Build tool and dev server
- **Pinia** - State management
- **JavaScript** - Primary language

## Development Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

This will:

- Start Vite dev server on port 5173
- Launch Electron app with hot reload enabled

### Available Scripts

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build Vue app for production
- `npm run build:electron` - Build app and create distributable packages
- `npm run build:mac` - Build for macOS
- `npm run build:win` - Build for Windows
- `npm run build:linux` - Build for Linux
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier

## Project Structure

```
clip_forge/
├── electron/          # Electron main process
│   └── main.js       # Main entry point
├── src/              # Vue application source
│   ├── main.js       # Vue app entry
│   ├── App.vue       # Root component
│   └── styles/       # Global styles
├── dist/             # Build output (Vue)
├── dist-electron/    # Electron build output
├── index.html        # HTML entry point
├── vite.config.js    # Vite configuration
└── package.json      # Dependencies and scripts
```

## Features (V1)

- [ ] Import video clips (MP4, MOV, WebM)
- [ ] Media library with thumbnails
- [ ] Timeline editor with multiple tracks
- [ ] Trim and split clips
- [ ] Real-time preview with playback controls
- [ ] Export to MP4 with resolution options

## Current Status

✅ **PR #1 Complete**: Project setup with Electron/Vue boilerplate  
✅ **PR #2 Complete**: FFmpeg integration & basic video processing

### FFmpeg Integration Features

- Video metadata extraction (duration, resolution, codec, bitrate)
- Thumbnail generation from video frames
- Video concatenation and trimming
- Support for MP4, MOV, WebM, AVI, MKV formats
- File format validation and utility functions
- Comprehensive error handling and logging

### Testing FFmpeg

Test FFmpeg integration:
```bash
npm run test:ffmpeg
```

Test with a real video file:
```bash
npm run test:ffmpeg path/to/your/video.mp4
```

**Note**: FFmpeg is required for video processing. The app will show an error if FFmpeg is not installed.

### Installing FFmpeg (Required)

**macOS (using Homebrew):**
```bash
brew install ffmpeg
```

**Windows:**
1. Download from https://ffmpeg.org/download.html
2. Add to PATH environment variable

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Verify Installation:**
```bash
ffmpeg -version
```

## License

MIT
