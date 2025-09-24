const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// Check if in development mode (simple way without electron-is-dev)
const isDev = !app.isPackaged;

let mainWindow;

// Protocol registration disabled for development mode to avoid conflicts
// Will implement a polling-based solution instead

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    icon: path.join(__dirname, 'assets/icon.png') // You can add an icon later
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== startUrl) {
      event.preventDefault();
    }
  });
}

// Handle protocol for OAuth deep links
const handleDeepLink = (url) => {
  console.log('Deep link received:', url);

  if (mainWindow) {
    // Parse the deep link URL
    const urlObj = new URL(url);

    if (urlObj.pathname === '/auth/callback') {
      // Extract OAuth parameters
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');
      const error = urlObj.searchParams.get('error');

      console.log('OAuth callback received:', { code: !!code, state, error });

      // Send to renderer process
      mainWindow.webContents.send('oauth-callback', {
        code,
        state,
        error,
        success: !error && !!code
      });

      // Focus the main window
      mainWindow.focus();
    }
  }
};

// App event handlers
app.whenReady().then(createWindow);

// Handle protocol on app launch (when app is not running)
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Handle protocol on Windows/Linux (when app is already running)
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }

  // Handle deep link from command line
  const url = commandLine.find(arg => arg.startsWith('lyricsscraper://'));
  if (url) {
    handleDeepLink(url);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for communication with renderer process
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// Handle authentication redirects
ipcMain.handle('handle-auth-redirect', (event, url) => {
  // This will be used to handle Spotify OAuth redirects
  console.log('Auth redirect received:', url);
  return url;
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
});