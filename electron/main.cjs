console.log('🚀 main.cjs: Starting Electron main process...');

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
console.log('✅ main.cjs: Electron modules imported');

const path = require('path');
console.log('✅ main.cjs: Path module imported');

const FFmpegHandler = require('./ffmpeg-handler.js');
console.log('✅ main.cjs: FFmpegHandler imported');

let mainWindow;
let ffmpegHandler;

const isDevelopment = process.env.NODE_ENV !== 'production';
console.log('📊 main.cjs: Development mode:', isDevelopment);

function createWindow() {
  console.log('🔧 main.cjs: Creating browser window...');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'ClipForge',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    backgroundColor: '#1a1a1a',
    show: false,
  });
  console.log('✅ main.cjs: Browser window created');

  // Load the app
  console.log('🔧 main.cjs: Loading app...');
  if (isDevelopment) {
    console.log('🌐 main.cjs: Loading from localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    console.log('📁 main.cjs: Loading from dist/index.html');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  console.log('✅ main.cjs: App loaded');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

// Initialize FFmpeg handler
console.log('🔧 main.cjs: Initializing FFmpeg handler...');
ffmpegHandler = new FFmpegHandler();
console.log('✅ main.cjs: FFmpeg handler initialized');

  // Create application menu
  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers for FFmpeg operations
ipcMain.handle('ffmpeg-check-availability', async () => {
  console.log('🔍 main.cjs: IPC ffmpeg-check-availability called');
  const result = ffmpegHandler ? ffmpegHandler.isAvailable : false;
  console.log('📊 main.cjs: FFmpeg availability result:', result);
  return result;
});

ipcMain.handle('ffmpeg-get-metadata', async (event, filePath) => {
  try {
    return await ffmpegHandler.getVideoMetadata(filePath);
  } catch (error) {
    throw new Error(`Failed to get metadata: ${error.message}`);
  }
});

ipcMain.handle('ffmpeg-generate-thumbnail', async (event, inputPath, outputPath, timeOffset, options) => {
  try {
    return await ffmpegHandler.generateThumbnail(inputPath, outputPath, timeOffset, options);
  } catch (error) {
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
});

ipcMain.handle('ffmpeg-is-supported-format', async (event, filePath) => {
  return ffmpegHandler.isSupportedVideoFormat(filePath);
});

ipcMain.handle('ffmpeg-format-file-size', async (event, bytes) => {
  return ffmpegHandler.formatFileSize(bytes);
});

ipcMain.handle('ffmpeg-format-duration', async (event, seconds) => {
  return ffmpegHandler.formatDuration(seconds);
});

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Media',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-import');
          },
        },
        { type: 'separator' },
        {
          label: 'Export',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export');
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow.webContents.send('menu-undo');
          },
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          click: () => {
            mainWindow.webContents.send('menu-redo');
          },
        },
        { type: 'separator' },
        {
          label: 'Delete',
          accelerator: 'Delete',
          click: () => {
            mainWindow.webContents.send('menu-delete');
          },
        },
        {
          label: 'Split Clip',
          accelerator: 'S',
          click: () => {
            mainWindow.webContents.send('menu-split');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.send('menu-zoom-in');
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.send('menu-zoom-out');
          },
        },
        {
          label: 'Zoom to Fit',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.send('menu-zoom-fit');
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play/Pause',
          accelerator: 'Space',
          click: () => {
            mainWindow.webContents.send('menu-play-pause');
          },
        },
        {
          label: 'Stop',
          accelerator: 'CmdOrCtrl+.',
          click: () => {
            mainWindow.webContents.send('menu-stop');
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ClipForge',
          click: () => {
            mainWindow.webContents.send('menu-about');
          },
        },
      ],
    },
  ];

  // Add macOS specific menu items
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
