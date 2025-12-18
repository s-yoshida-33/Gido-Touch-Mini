// electron/main.cjs
// Electron main process entry point (with startup patch window)

const { app, BrowserWindow, Menu, ipcMain, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const {
  initAutoUpdater,
  checkForUpdates,
  oneClickUpdate,
  getLatestVersionInfo,
} = require('./updateChecker.cjs');
const logger = require('./logger.cjs');

const isDev = !app.isPackaged;

let patchWindow = null;
let mainWindow = null;

// DEBUG: Track internal state of loadSettings
let lastLoadSettingsDebug = {
  timestamp: null,
  rawPreview: null,
  parsedValue: null,
  parsedType: null,
  checkResult: null,
  finalValue: null,
  error: null
};

// Default location icon settings (for both speech bubble and location pin)
const DEFAULT_LOCATION_ICON_SETTINGS = {
  speechBubble: {
    enabled: true,
    xPercent: 50,
    yPercent: 40,
    size: 96,
    rotation: 0,
    shadow: {
      enabled: true,
      offsetX: 4,
      offsetY: 4,
      blur: 4,
      opacity: 0.5,
    },
    animation: {
      enabled: true,
      type: "floating",
      duration: 2.2,
      amplitude: 18,
    },
  },
  location: {
    enabled: true,
    xPercent: 50,
    yPercent: 50,
    size: 72,
    rotation: 0,
    shadow: {
      enabled: true,
      offsetX: 4,
      offsetY: 4,
      blur: 4,
      opacity: 0.5,
    },
  },
};

// Helper to create fresh copy of default per-floor settings
const createDefaultPerFloorSettings = () => ({
  "1F": JSON.parse(JSON.stringify(DEFAULT_LOCATION_ICON_SETTINGS)),
  "2F": JSON.parse(JSON.stringify(DEFAULT_LOCATION_ICON_SETTINGS)),
  "3F": JSON.parse(JSON.stringify(DEFAULT_LOCATION_ICON_SETTINGS)),
  "4F": JSON.parse(JSON.stringify(DEFAULT_LOCATION_ICON_SETTINGS)),
});

// Prevent multiple instances from starting with a single-instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  return;
}

// On the second launch, it only brings existing windows to the front
app.on('second-instance', () => {
  const win = mainWindow || patchWindow || BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

// Determine base renderer URL (Vite dev server or built production files)
const rendererBaseUrl = isDev
  ? 'http://localhost:5173/'
  : `file://${path.join(__dirname, '../dist/index.html')}`;

/**
 * Settings utilities (for persistent configuration: floor + location icons)
 */
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

// function getPictoSettingsPath() removed as we are merging into settings.json

function loadDefaultShopPositions() {
  // ビルド時にデフォルトとして使用する店舗位置設定を読み込む
  // electron/default-shop-positions.json が存在する場合は、それをデフォルト値として使用
  const defaultShopPositionsPath = path.join(__dirname, 'default-shop-positions.json');
  
  try {
    if (fs.existsSync(defaultShopPositionsPath)) {
      const raw = fs.readFileSync(defaultShopPositionsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      
      // 形式を確認
      if (parsed && typeof parsed === 'object' && parsed.positions) {
        logger.info('Loaded default shop positions from default-shop-positions.json');
        return parsed;
      }
    }
  } catch (error) {
    logger.warn('Failed to load default shop positions, using empty defaults', {
      error: error?.message,
    });
  }
  
  // デフォルトファイルが存在しない、または読み込みに失敗した場合は空のオブジェクトを返す
  return {
    positions: {},
  };
}

function loadDefaultPictoSettings() {
  // ビルド時にデフォルトとして使用するピクトグラム設定を読み込む
  const defaultPictoSettingsPath = path.join(__dirname, 'default-picto-settings.json');
  
  try {
    if (fs.existsSync(defaultPictoSettingsPath)) {
      const raw = fs.readFileSync(defaultPictoSettingsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      
      // 形式を確認
      if (parsed && typeof parsed === 'object' && parsed.instances) {
        logger.info('Loaded default picto settings from default-picto-settings.json');
        return parsed;
      }
    }
  } catch (error) {
    logger.warn('Failed to load default picto settings, using empty defaults', {
      error: error?.message,
    });
  }
  
  return {
    instances: {},
  };
}

// Deep merge function to ensure all nested properties are preserved
const deepMerge = (target, source) => {
  // If source is missing, return a clone of target (if object) to avoid reference pollution
  if (!source) {
    if (target && typeof target === 'object' && !Array.isArray(target)) {
      return JSON.parse(JSON.stringify(target));
    }
    return target;
  }
  
  // If target is primitive or null, just return a copy of source
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      return JSON.parse(JSON.stringify(source));
    }
    return source;
  }
  
  const result = { ...target };
  
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  });
  
  return result;
};

function loadSettings() {
  const defaultShopPositions = loadDefaultShopPositions();
  const defaultPictoSettings = loadDefaultPictoSettings();
  
  const base = {
    floor: '1F',
    locationIcons: createDefaultPerFloorSettings(),
    shopPositions: defaultShopPositions,
    pictoSettings: defaultPictoSettings,
    imageSettings: {
      floorMaps: { "1F": "", "2F": "", "3F": "", "4F": "" },
      openTimeImage: ""
    },
  };

  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      logger.debug('Settings file does not exist, using defaults');
      
      // DEBUG: Record internal state (defaults)
      lastLoadSettingsDebug = {
        timestamp: new Date().toISOString(),
        rawPreview: null,
        parsedValue: null,
        parsedType: null,
        checkResult: false,
        finalValue: base,
        error: "File not found, using defaults"
      };
      
      return base;
    }

    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw);

    // Check if locationIcons is per-floor (has "1F", "2F" etc) or single (has "speechBubble")
    let mergedLocationIcons = base.locationIcons;
    if (parsed.locationIcons) {
      if ('speechBubble' in parsed.locationIcons) {
        // Old single format - apply to all floors
        const oldSettings = {
          speechBubble: deepMerge(DEFAULT_LOCATION_ICON_SETTINGS.speechBubble, parsed.locationIcons.speechBubble || {}),
          location: deepMerge(DEFAULT_LOCATION_ICON_SETTINGS.location, parsed.locationIcons.location || {}),
        };
        
        mergedLocationIcons = {
          "1F": JSON.parse(JSON.stringify(oldSettings)),
          "2F": JSON.parse(JSON.stringify(oldSettings)),
          "3F": JSON.parse(JSON.stringify(oldSettings)),
          "4F": JSON.parse(JSON.stringify(oldSettings)),
        };
      } else {
        // New per-floor format
        mergedLocationIcons = {};
        const floors = ['1F', '2F', '3F', '4F'];
        floors.forEach(floorId => {
          const floorSettings = parsed.locationIcons[floorId] || {};
          // Use base (default) as target for merge
          const baseSettings = base.locationIcons[floorId];
          
          mergedLocationIcons[floorId] = {
            speechBubble: deepMerge(baseSettings.speechBubble, floorSettings.speechBubble || {}),
            location: deepMerge(baseSettings.location, floorSettings.location || {}),
          };
        });
      }
    }

    // Merge base with parsed using deepMerge to ensure no data loss
    const merged = deepMerge(base, parsed);
    
    // Explicitly set processed fields
    merged.locationIcons = mergedLocationIcons;
    
    // Ensure shopPositions has correct structure and merge explicitly to be safe
    if (parsed.shopPositions) {
      merged.shopPositions = deepMerge(base.shopPositions, parsed.shopPositions);
    } else {
      merged.shopPositions = base.shopPositions;
    }

    // Double check structure
    if (!merged.shopPositions || !merged.shopPositions.positions) {
       merged.shopPositions = { positions: {} };
    }

    // Ensure pictoSettings has correct structure
    if (!merged.pictoSettings) {
      merged.pictoSettings = { instances: {} };
    } else if (!merged.pictoSettings.instances) {
      // If it exists but lacks instances, ensure instances exists (preserve other props if any)
      merged.pictoSettings.instances = {};
    }

    // Ensure imageSettings has correct structure
    if (!merged.imageSettings) {
        merged.imageSettings = {
            floorMaps: { "1F": "", "2F": "", "3F": "", "4F": "" },
            openTimeImage: ""
        };
    }

    logger.debug('Settings loaded', {
      floor: merged.floor,
      hasAnimation: !!merged.locationIcons['1F']?.speechBubble?.animation,
      animationEnabled: merged.locationIcons['1F']?.speechBubble?.animation?.enabled,
      shopPositionsCount: Object.keys(merged.shopPositions?.positions || {}).length,
      pictoInstancesCount: Object.keys(merged.pictoSettings?.instances || {}).length,
    });

    // DEBUG: Record internal state
    lastLoadSettingsDebug = {
      timestamp: new Date().toISOString(),
      rawPreview: raw.substring(0, 100),
      parsedValue: parsed.currentFloorSetting, // Note: currentFloorSetting might not exist in parsed structure based on code, but following user request
      parsedType: typeof parsed.currentFloorSetting,
      checkResult: typeof parsed.currentFloorSetting === 'string',
      finalValue: merged,
      error: null
    };

    return merged;
  } catch (error) {
    logger.error('Failed to load settings, using defaults', {
      error: error?.message,
    });
    
    // DEBUG: Record error
    lastLoadSettingsDebug = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    };

    // Fallback to base defaults on any error
    return base;
  }
}

function saveSettings(partial) {
  const current = loadSettings();
  
  // Create next settings object
  let next = deepMerge(current, partial);
  
  // Special handling for pictoSettings to allow deletion (overwrite instead of deep merge for instances)
  // We can't just use deepMerge because it preserves keys in target that are missing in source.
  if (partial.pictoSettings && partial.pictoSettings.instances) {
     next.pictoSettings.instances = partial.pictoSettings.instances;
  }

  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2), 'utf-8');
    
    // Log saving of shop positions specifically if present
    if (partial.shopPositions) {
       logger.info('Shop positions saved to disk', {
         count: Object.keys(next.shopPositions?.positions || {}).length
       });
    }
    
    // Log saving of picto settings specifically if present
    if (partial.pictoSettings) {
       logger.info('Picto settings saved to disk', {
         count: Object.keys(next.pictoSettings?.instances || {}).length
       });
    }

    logger.info('Settings saved', {
      floor: next.floor,
    });
  } catch (error) {
    logger.error('Failed to save settings', {
      error: error?.message,
    });
  }

  return next;
}

/**
 * Broadcast floor changes to renderer processes
 */
function broadcastFloor(floor) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings:floor-changed', floor);
  }
}

/**
 * Broadcast location icon settings changes to renderer processes
 */
function broadcastLocationIconSettings(locationIcons) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('location-icon-settings-updated', locationIcons);
  }
}

/**
 * Update floor setting and notify renderer
 */
function updateFloorSetting(floor) {
  const next = saveSettings({ floor });
  logger.info('Floor updated', { floor: next.floor });
  broadcastFloor(next.floor);
}

/**
 * Convert a Windows file path to a file:// URL string.
 */
function toFileUrl(winPath) {
  try {
    return pathToFileURL(winPath).toString();
  } catch (error) {
    logger.warn('Failed to convert path to file URL, using fallback', {
      error: error?.message,
      winPath,
    });
    const normalized = winPath.replace(/\\/g, '/');
    return `file:///${normalized}`;
  }
}

/**
 * Create the small startup patch window.
 * This window appears first and shows update progress.
 */
function createPatchWindow() {
  if (patchWindow && !patchWindow.isDestroyed()) {
    logger.debug('Patch window already exists, focusing');
    patchWindow.focus();
    return;
  }

  logger.info('Creating patch window');

  patchWindow = new BrowserWindow({
    resizable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: true, // Keep patch window visible
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Ensure patch window is also on top with high priority
  patchWindow.setAlwaysOnTop(true, 'screen-saver');

  // Use #patch hash so renderer can show PatchScreen instead of app UI
  patchWindow.loadURL(`${rendererBaseUrl}#patch`);

  patchWindow.once('ready-to-show', () => {
    if (patchWindow) {
      logger.info('Patch window ready to show');
      patchWindow.show();
    }
  });

  patchWindow.on('closed', () => {
    logger.info('Patch window closed');
    patchWindow = null;
  });
}

/**
 * Create the main application window (fullscreen UI).
 */
function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    logger.debug('Main window already exists, focusing');
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: !isDev, // Fullscreen in production, windowed in dev
    autoHideMenuBar: true,
    alwaysOnTop: !isDev, // Always on top in production only
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true, // Enable dev tools even in production for debugging
      webSecurity: false, // Allow loading local file:// resources for shop images
    },
  });

  // Set to 'screen-saver' level to ensure it stays on top of other apps (production only)
  if (!isDev) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  // Re-apply always on top when window loses focus to ensure it stays visible (production only)
  if (!isDev) {
    mainWindow.on('blur', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Small delay to let the other window finish its focus event
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            // Optionally bring to front, but setAlwaysOnTop should be enough
            // mainWindow.moveTop(); 
          }
        }, 100);
      }
    });
  }

  // Enable F12 shortcut to toggle dev tools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
    // Enable F11 to toggle fullscreen
    if (input.key === 'F11') {
      const isFullScreen = mainWindow.isFullScreen();
      const nextState = !isFullScreen;
      
      // Toggle fullscreen mode (hides taskbar and window frame)
      mainWindow.setFullScreen(nextState);

      if (nextState) {
        // Entering fullscreen -> Force Always On Top to ensure taskbar is covered
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      } else {
        // Exiting fullscreen -> Follow isDev setting (windowed mode in dev shouldn't be always on top)
        mainWindow.setAlwaysOnTop(!isDev, 'screen-saver');
      }
    }
    // Enable Ctrl+R to reload window in development mode
    if (isDev && input.key === 'r' && input.control && !input.shift && !input.alt && !input.meta) {
      event.preventDefault();
      logger.info('Reloading window via Ctrl+R');
      mainWindow.reload();
    }
  });

  mainWindow.loadURL(rendererBaseUrl);

  // Send current floor setting after renderer has finished loading
  mainWindow.webContents.on('did-finish-load', () => {
    const settings = loadSettings();
    logger.info('Main window finished loading, broadcasting settings', {
      floor: settings.floor,
    });
    broadcastFloor(settings.floor);
    broadcastLocationIconSettings(settings.locationIcons);
    
    // Also broadcast shop positions to ensure renderer has the latest (especially in Dev mode)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('shop-positions-updated', settings.shopPositions);
    }
  });

  mainWindow.on('closed', () => {
    logger.info('Main window closed');
    mainWindow = null;
  });
}

/**
 * Build application menu including floor setting and manual update entries.
 */
function createAppMenu() {
  const settings = loadSettings();

  logger.info('Creating application menu', {
    initialFloor: settings.floor,
  });

  const template = [
    {
      label: 'ファイル',
      submenu: [
        {
          role: 'quit',
          label: '終了',
        },
      ],
    },
    {
      label: '設定',
      submenu: [
        {
          label: '設定画面を開く',
          click: () => {
            logger.info('Unified settings screen menu clicked');
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('open-settings');
            }
          },
        },
        { type: 'separator' },
        {
          label: '開発者ツール',
          accelerator: 'F12',
          click: () => {
            logger.info('Developer tools toggled');
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
        ...(isDev ? [
          {
            label: '再読み込み',
            accelerator: 'Ctrl+R',
            click: () => {
              logger.info('Reloading window via menu');
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.reload();
              }
            },
          },
        ] : []),
      ],
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'バージョン情報',
          click: () => {
            logger.info('Version info requested');
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('open-version-info');
            }
          },
        },
        { type: 'separator' },
        {
          label: '更新を確認（手動）',
          click: () => {
            logger.info('Manual update check requested');
            checkForUpdates(true); // manual check
          },
        },
        {
          label: '今すぐ更新（ワンクリック）',
          click: () => {
            logger.info('One-click update requested');
            oneClickUpdate(); // one-click automatic update
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * IPC handlers for settings and app info.
 */
ipcMain.handle('get-bridge-base-url', () => {
  logger.debug('IPC get-bridge-base-url');
  // For now, return default port 8090.
  // In the future, we might implement port scanning or reading from BWP config.
  return 'http://localhost:8090';
});

ipcMain.handle('debug:get-settings-status', () => {
  const settingsPath = getSettingsPath();
  const exists = fs.existsSync(settingsPath);
  let content = null;
  let parsed = null;
  let error = null;

  if (exists) {
    try {
      let raw = fs.readFileSync(settingsPath, 'utf-8');
      if (raw.charCodeAt(0) === 0xFEFF) { // BOM除去
        raw = raw.slice(1);
      }
      content = raw.substring(0, 200) + (raw.length > 200 ? '...' : '');
      parsed = JSON.parse(raw);
    } catch (e) {
      error = e.message;
    }
  }

  const loadedSettings = loadSettings();

  return {
    path: settingsPath,
    exists,
    contentPreview: content,
    jsonParseResult: parsed ? {
      currentFloorSetting: parsed.currentFloorSetting,
      typeOfFloor: typeof parsed.currentFloorSetting
    } : null,
    loadSettingsResult: {
      currentFloorSetting: loadedSettings.currentFloorSetting,
      typeOfFloor: typeof loadedSettings.currentFloorSetting
    },
    internalDebug: lastLoadSettingsDebug,
    error
  };
});

ipcMain.handle('settings:get-floor', () => {
  const settings = loadSettings();
  logger.debug('IPC settings:get-floor', { floor: settings.floor });
  return settings.floor;
});

ipcMain.handle('get-app-version', () => {
  const version = app.getVersion();
  logger.debug('IPC get-app-version', { version });
  return version;
});

ipcMain.handle('get-latest-version-info', async () => {
  logger.debug('IPC get-latest-version-info');
  const info = await getLatestVersionInfo();
  return info;
});

/**
 * IPC handlers for location icon settings.
 */
ipcMain.handle('get-location-icon-settings', () => {
  const settings = loadSettings();
  logger.debug('IPC get-location-icon-settings');
  return settings.locationIcons;
});

ipcMain.handle('save-location-icon-settings', (_event, locationIcons) => {
  logger.info('IPC save-location-icon-settings', {
    hasSpeechBubble: !!locationIcons?.speechBubble,
    hasLocation: !!locationIcons?.location,
  });
  const settings = saveSettings({ locationIcons });
  broadcastLocationIconSettings(settings.locationIcons);
  return settings.locationIcons;
});

/**
 * IPC handlers for Picto Settings (merged into settings.json)
 */
ipcMain.handle('get-picto-settings', () => {
  logger.info('IPC get-picto-settings');
  const settings = loadSettings();
  return settings.pictoSettings || { instances: {} };
});

ipcMain.handle('save-picto-settings', (_event, pictoSettings) => {
  logger.info('IPC save-picto-settings');
  const settings = saveSettings({ pictoSettings });
  
  // Broadcast to main window if needed
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('picto-settings-updated', settings.pictoSettings);
  }
  
  return settings.pictoSettings;
});

/**
 * IPC handlers for Image Settings
 */
ipcMain.handle('get-image-settings', () => {
  logger.info('IPC get-image-settings');
  const settings = loadSettings();
  return settings.imageSettings || {
    floorMaps: { "1F": "", "2F": "", "3F": "", "4F": "" },
    openTimeImage: ""
  };
});

ipcMain.handle('save-image-settings', (_event, imageSettings) => {
  logger.info('IPC save-image-settings');
  const settings = saveSettings({ imageSettings });
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('image-settings-updated', settings.imageSettings);
  }
  
  return settings.imageSettings;
});

/**
 * Get images directory path (userData/images)
 */

/**
 * Read image file and return as data URL
 * Supports PNG, JPEG, GIF, WebP, SVG
 */
function readImageFileAsDataUrl(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    
    // Determine MIME type from file extension
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/png'; // default
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      case '.svg':
        mimeType = 'image/svg+xml';
        break;
    }
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    logger.error('Failed to read image file', {
      error: error?.message,
      filePath,
    });
    return null;
  }
}

ipcMain.handle('get-shop-positions', () => {
  logger.info('IPC get-shop-positions');
  const settings = loadSettings();
  return settings.shopPositions || { positions: {} };
});

ipcMain.handle('save-shop-positions', (_event, shopPositions) => {
  logger.info('IPC save-shop-positions');
  
  const settings = saveSettings({ shopPositions });
  
  // Broadcast to main window if it exists
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('shop-positions-updated', settings.shopPositions);
  }
  
  return settings.shopPositions;
});

/**
 * IPC handler for reading shop image files as data URLs
 */
ipcMain.handle('get-shop-image', async (_event, filePath) => {
  try {
    // Remove file:// prefix if present
    let localPath = filePath;
    if (filePath.startsWith('file://')) {
      localPath = filePath.replace('file://', '');
      // Handle Windows paths: file:///C:/... -> C:/...
      if (localPath.startsWith('/') && localPath.match(/^\/[A-Za-z]:/)) {
        localPath = localPath.substring(1);
      }
    }
    
    // Normalize path separators for Windows
    localPath = localPath.replace(/\//g, path.sep);
    
    const dataUrl = readImageFileAsDataUrl(localPath);
    return dataUrl;
  } catch (error) {
    logger.error('Failed to get shop image', {
      error: error?.message,
      filePath,
    });
    return null;
  }
});

/**
 * IPC handler to receive logs from renderer process.
 * The preload exposes window.logger which sends log-message IPC.
 */
ipcMain.on('log-message', (_event, payload) => {
  try {
    logger.logFromRenderer(payload || {});
  } catch (error) {
    logger.error('Failed to handle log-message IPC', {
      error: error?.message,
    });
  }
});

// Floor change from renderer
ipcMain.on('menu:set-floor', (_event, floorId) => {
  updateFloorSetting(floorId);
});

// Renderer is ready for updates
ipcMain.on('check-for-updates-ready', () => {
  logger.info('Renderer is ready, starting update check');
  checkForUpdates(false);
});

// Manual update check
ipcMain.on('menu:check-updates', () => {
  checkForUpdates(true);
});

// One-click update
ipcMain.on('menu:one-click-update', () => {
  oneClickUpdate();
});

// Quit app
ipcMain.on('menu:quit', () => {
  app.quit();
});

// Startup wait completed signal from renderer
ipcMain.on('startup-wait-completed', () => {
  logger.info('Startup wait completed, switching to main window');
  
  // Close patch window
  if (patchWindow && !patchWindow.isDestroyed()) {
    patchWindow.close();
  }
  
  // Create and show main window
  createMainWindow();
});

/**
 * Global error handlers for main process.
 */
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception in main process', {
    error: error?.message,
    stack: error?.stack,
  });
});

process.on('unhandledRejection', (reason) => {
  logger.fatal('Unhandled promise rejection in main process', {
    reason: String(reason),
  });
});

/**
 * App ready event.
 */
app.whenReady().then(() => {
  logger.configureLogger();
  logger.info('Application starting', {
    env: process.env.NODE_ENV || 'production',
    isDev,
  });

  createAppMenu();

  // Initialize autoUpdater with patch + main window references
  initAutoUpdater({
    getPatchWindow: () => patchWindow,
    createMainWindow,
  });

  // Startup update check (silent, handled inside updateChecker)
  // Skip update check in development mode
  if (!isDev) {
    createPatchWindow();
    // checkForUpdates(false) is now triggered by renderer via 'check-for-updates-ready' IPC
    // to prevent race conditions where main process sends events before renderer is ready.
  } else {
    logger.info('Skipping update check in development mode');
    // In dev mode, open main window immediately without patch window
    createMainWindow();
  }

  app.on('activate', () => {
    if (process.platform !== 'darwin') return;

    // macOS: recreate main window if no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.info('App activated on macOS with no windows, creating main window');
      createMainWindow();
    }
  });
});

/**
 * Quit when all windows are closed.
 * Except macOS where apps usually stay active.
 */
app.on('window-all-closed', () => {
  logger.info('All windows closed', { platform: process.platform });
  if (process.platform !== 'darwin') app.quit();
});