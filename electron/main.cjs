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

// Optimize for low-end hardware (Atom processor)
// Enable GPU rasterization to reduce CPU load
app.commandLine.appendSwitch('enable-gpu-rasterization');
// Enable zero-copy to reduce memory usage during composition
app.commandLine.appendSwitch('enable-zero-copy');
// Ensure GPU is used even if recognized as old/unsupported
app.commandLine.appendSwitch('ignore-gpu-blacklist');

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

function loadAllDefaultMallData() {
  const loadedData = {};
  
  try {
    // __dirname (electronフォルダ) 内のファイルを検索
    const files = fs.readdirSync(__dirname);
    
    // default-[mallId]-data.json パターンに一致するファイルを探す
    files.forEach(file => {
      const match = file.match(/^default-(.+)-data\.json$/);
      if (match) {
        const mallId = match[1];
        // "mall" という単語が誤ってキャプチャされるのを防ぐため、"mall-data" は除外
        if (mallId === 'mall') return;

        const filePath = path.join(__dirname, file);
        
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          
          if (parsed && typeof parsed === 'object') {
            logger.info(`Loaded default mall data for ${mallId} from ${file}`);
            loadedData[mallId] = parsed;
          }
        } catch (e) {
          logger.warn(`Failed to parse default mall data from ${file}`, { error: e.message });
        }
      }
    });
  } catch (error) {
    logger.warn('Failed to scan for default mall data files', {
      error: error?.message,
    });
  }
  
  return loadedData;
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
  // 古い個別読み込み関数は削除済み
  const defaultMallData = loadAllDefaultMallData();
  
  // デフォルトデータの構築
  // 1. 基本的なデータ構造 (空で初期化)
  const baseDataByMall = {
      suzaka: { shopPositions: { positions: {} }, pictoSettings: { instances: {} } },
      "sendai-kamisugi": { shopPositions: { positions: {} }, pictoSettings: { instances: {} } }
  };

  // 2. defaultMallData をマージ (分割ファイルから読み込んだデータを反映)
  Object.keys(defaultMallData).forEach(mallId => {
      // 既存のオブジェクトがあればマージ、なければ新規作成
      baseDataByMall[mallId] = deepMerge(baseDataByMall[mallId] || {}, defaultMallData[mallId]);
  });

  // デフォルトのショップ位置などを決定 (suzakaのデータがあればそれを使う)
  const defaultShopPositions = baseDataByMall.suzaka?.shopPositions || { positions: {} };
  const defaultPictoSettings = baseDataByMall.suzaka?.pictoSettings || { instances: {} };
  const defaultLocationIcons = baseDataByMall.suzaka?.locationIcons || createDefaultPerFloorSettings();

  const base = {
    mallId: 'suzaka', // デフォルトは須坂
    floor: '1F',
    locationIcons: defaultLocationIcons,
    shopPositions: defaultShopPositions,
    pictoSettings: defaultPictoSettings,
    imageSettings: {
      floorMaps: { "1F": "", "2F": "", "3F": "", "4F": "" },
      openTimeImage: ""
    },
    mallSettings: {
      mallId: "suzaka"
    },
    dataByMall: baseDataByMall
  };

  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      logger.debug('Settings file does not exist, using defaults');
      return base;
    }

    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw);

    // Migration: Move root shopPositions/pictoSettings/locationIcons to dataByMall if not present
    if (!parsed.dataByMall) {
      logger.info('Migrating settings to dataByMall structure');
      parsed.dataByMall = {
        suzaka: {
          shopPositions: parsed.shopPositions || defaultShopPositions,
          pictoSettings: parsed.pictoSettings || defaultPictoSettings,
          locationIcons: parsed.locationIcons || defaultLocationIcons
        },
        "sendai-kamisugi": {
          shopPositions: { positions: {} },
          pictoSettings: { instances: {} },
          locationIcons: createDefaultPerFloorSettings()
        }
      };
    }

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
    
    // Ensure mallSettings has correct structure
    if (!merged.mallSettings) {
      merged.mallSettings = {
        mallId: "suzaka"
      };
    }

    // Populate root shopPositions, pictoSettings and locationIcons based on current mallId
    const currentMallId = merged.mallSettings.mallId;
    const currentMallData = merged.dataByMall[currentMallId] || merged.dataByMall.suzaka;
    
    merged.shopPositions = currentMallData.shopPositions || { positions: {} };
    merged.pictoSettings = currentMallData.pictoSettings || { instances: {} };
    
    // locationIcons merge handling
    let locationIconsSource = currentMallData.locationIcons;
    
    // Fallback logic if mall-specific locationIcons are missing/empty but root ones exist (during migration)
    if (!locationIconsSource && mergedLocationIcons) {
        locationIconsSource = mergedLocationIcons;
    } else if (!locationIconsSource) {
        locationIconsSource = createDefaultPerFloorSettings();
    }
    
    // Ensure we have the correct structure (per-floor)
    if (locationIconsSource && 'speechBubble' in locationIconsSource) {
         // Convert old single format to per-floor if needed
         const oldSettings = {
          speechBubble: deepMerge(DEFAULT_LOCATION_ICON_SETTINGS.speechBubble, locationIconsSource.speechBubble || {}),
          location: deepMerge(DEFAULT_LOCATION_ICON_SETTINGS.location, locationIconsSource.location || {}),
        };
        merged.locationIcons = {
          "1F": JSON.parse(JSON.stringify(oldSettings)),
          "2F": JSON.parse(JSON.stringify(oldSettings)),
          "3F": JSON.parse(JSON.stringify(oldSettings)),
          "4F": JSON.parse(JSON.stringify(oldSettings)),
        };
    } else {
        // Deep merge with defaults to ensure all fields exist
        merged.locationIcons = {};
        const floors = ['1F', '2F', '3F', '4F'];
        floors.forEach(floorId => {
          const floorSettings = (locationIconsSource && locationIconsSource[floorId]) || {};
          // Use base default as target
          const baseSettings = createDefaultPerFloorSettings()[floorId];
          
          merged.locationIcons[floorId] = {
            speechBubble: deepMerge(baseSettings.speechBubble, floorSettings.speechBubble || {}),
            location: deepMerge(baseSettings.location, floorSettings.location || {}),
          };
        });
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
  const next = deepMerge(current, partial);
  
  // Special handling for pictoSettings to allow deletion (overwrite instead of deep merge for instances)
  if (partial.pictoSettings && partial.pictoSettings.instances) {
     next.pictoSettings.instances = partial.pictoSettings.instances;
  }

  // Update dataByMall based on what was changed.
  // Note: 'next' has updated root props (shopPositions, etc.) from 'partial'.
  // We need to sync these back to the appropriate mall in dataByMall.
  
  // Determine target mall ID. 
  // If partial updated mallSettings.mallId, we are switching malls.
  // In that case, we usually don't update data simultaneously.
  // If we are just saving data, we save to the *current* mall (before switch, or consistent with switch).
  // The 'current' object has shopPositions populated from the mall that was active when loaded.
  
  // Use the new mall ID if it's being changed, otherwise use current
  const targetMallId = (partial.mallSettings && partial.mallSettings.mallId) 
    ? partial.mallSettings.mallId 
    : current.mallSettings.mallId;
  
  // Ensure dataByMall exists
  if (!next.dataByMall) next.dataByMall = {};
  if (!next.dataByMall[targetMallId]) next.dataByMall[targetMallId] = {};

  // If partial contained data updates, apply them to the target mall in dataByMall
  if (partial.shopPositions) {
      // Sanitize: Ensure only valid properties are saved to prevent nesting recursion or pollution
      // dataByMall 内に suzaka などのキーで自己参照が紛れ込むのを防ぐため、positions のみを抽出して再構築する
      const cleanShopPositions = {
        positions: next.shopPositions?.positions || {}
      };
      // next オブジェクト内の参照も更新
      next.shopPositions = cleanShopPositions;
      next.dataByMall[targetMallId].shopPositions = cleanShopPositions;
  }
  if (partial.pictoSettings) {
      // Sanitize for pictoSettings as well
      const cleanPictoSettings = {
        instances: next.pictoSettings?.instances || {}
      };
      next.pictoSettings = cleanPictoSettings;
      next.dataByMall[targetMallId].pictoSettings = cleanPictoSettings;
  }
  if (partial.locationIcons) {
      // locationIcons update
      next.dataByMall[targetMallId].locationIcons = next.locationIcons;
  }

  try {
    const settingsPath = getSettingsPath();
    
    // Create object to save (remove root data props to avoid duplication on disk)
    // JSON.stringify will ignore undefined properties
    const toSave = {
        ...next,
        shopPositions: undefined,
        pictoSettings: undefined,
        locationIcons: undefined
    };

    fs.writeFileSync(settingsPath, JSON.stringify(toSave, null, 2), 'utf-8');
    
    // Log saving of shop positions specifically if present
    if (partial.shopPositions) {
       logger.info('Shop positions saved to disk', {
         count: Object.keys(next.shopPositions?.positions || {}).length,
         mallId: targetMallId
       });
    }
    
    // Log saving of picto settings specifically if present
    if (partial.pictoSettings) {
       logger.info('Picto settings saved to disk', {
         count: Object.keys(next.pictoSettings?.instances || {}).length,
         mallId: targetMallId
       });
    }

    logger.info('Settings saved', {
      floor: next.floor,
      mallId: next.mallSettings.mallId
    });

    // If mall ID changed, we need to broadcast new data to renderer
    if (partial.mallSettings && partial.mallSettings.mallId !== current.mallSettings.mallId) {
        const newMallId = partial.mallSettings.mallId;
        // Re-load settings to get fresh data for the new mall
        const newSettings = loadSettings(); // This will populate root props from new mall
        
        if (mainWindow && !mainWindow.isDestroyed()) {
            logger.info('Broadcasting new mall data', { newMallId });
            mainWindow.webContents.send('shop-positions-updated', newSettings.shopPositions);
            mainWindow.webContents.send('picto-settings-updated', newSettings.pictoSettings);
            mainWindow.webContents.send('location-icon-settings-updated', newSettings.locationIcons);
        }
        
        return newSettings;
    }

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

ipcMain.handle('get-mall-id', () => {
  const settings = loadSettings();
  const mallId = settings.mallId || 'suzaka';
  logger.debug('IPC get-mall-id', { mallId });
  return mallId;
});

ipcMain.handle('set-mall-id', async (_event, mallId) => {
  const current = loadSettings();
  const updated = { ...current, mallId };
  saveSettings({ mallId });
  logger.info('Mall ID updated', { mallId });
  return mallId;
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

/**
 * Helper to save Data URL to file in userData/images
 */
function saveImageFromDataUrl(dataUrl, fileName) {
  try {
    // Check if it's a data URL
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return null;
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      logger.warn('Invalid data URL format', { fileName });
      return null;
    }
    
    const buffer = Buffer.from(matches[2], 'base64');
    const imagesDir = path.join(app.getPath('userData'), 'images');
    
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, buffer);
    
    logger.info('Image saved to file', { filePath });
    return filePath;
  } catch (error) {
    logger.error('Failed to save image file', { error: error.message, fileName });
    return null;
  }
}

ipcMain.handle('save-image-settings', (_event, imageSettings) => {
  logger.info('IPC save-image-settings');
  
  // Process floor maps
  const processedFloorMaps = { ...imageSettings.floorMaps };
  Object.keys(processedFloorMaps).forEach(floorId => {
    const dataUrl = processedFloorMaps[floorId];
    if (dataUrl && dataUrl.startsWith('data:')) {
      const fileName = `floor-${floorId}.svg`; // Assume SVG for now based on UI constraint
      const filePath = saveImageFromDataUrl(dataUrl, fileName);
      if (filePath) {
        processedFloorMaps[floorId] = toFileUrl(filePath);
      }
    }
  });
  
  // Process open time image
  let processedOpenTimeImage = imageSettings.openTimeImage;
  if (processedOpenTimeImage && processedOpenTimeImage.startsWith('data:')) {
    const fileName = 'opentime.svg';
    const filePath = saveImageFromDataUrl(processedOpenTimeImage, fileName);
    if (filePath) {
      processedOpenTimeImage = toFileUrl(filePath);
    }
  }
  
  const nextSettings = {
    ...imageSettings,
    floorMaps: processedFloorMaps,
    openTimeImage: processedOpenTimeImage
  };

  const settings = saveSettings({ imageSettings: nextSettings });
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('image-settings-updated', settings.imageSettings);
  }
  
  return settings.imageSettings;
});

/**
 * IPC handlers for Mall Settings
 */
ipcMain.handle('get-mall-settings', () => {
  logger.info('IPC get-mall-settings');
  const settings = loadSettings();
  return settings.mallSettings || { mallId: "suzaka" };
});

ipcMain.handle('save-mall-settings', (_event, mallSettings) => {
  logger.info('IPC save-mall-settings', { mallId: mallSettings?.mallId });
  const settings = saveSettings({ mallSettings });
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('mall-settings-updated', settings.mallSettings);
  }
  return settings.mallSettings;
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
 * Get mall assets base path (development or production)
 */
function getMallAssetsBasePath() {
  if (isDev) {
    // Development: project root/src/assets/malls
    // Use process.cwd() to get the project root directory
    return path.join(process.cwd(), 'src', 'assets', 'malls');
  } else {
    // Production: resources/assets/malls
    return path.join(process.resourcesPath, 'assets', 'malls');
  }
}

/**
 * IPC handler for reading mall config files (genres.json, pictos.json)
 */
ipcMain.handle('read-mall-config', async (_event, mallId, configType) => {
  try {
    const basePath = getMallAssetsBasePath();
    const configPath = path.join(basePath, mallId, `${configType}.json`);
    
    if (!fs.existsSync(configPath)) {
      logger.warn('Mall config not found', { mallId, configType, configPath });
      return null;
    }
    
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.error('Failed to read mall config', { error: error?.message, mallId, configType });
    return null;
  }
});

/**
 * IPC handler for reading mall asset files (SVG images)
 */
ipcMain.handle('read-mall-asset', async (_event, relativePath) => {
  try {
    const basePath = getMallAssetsBasePath();
    const fullPath = path.join(basePath, relativePath);
    
    if (!fs.existsSync(fullPath)) {
      logger.warn('Mall asset not found', { relativePath, fullPath });
      return null;
    }
    
    // Return as data URL for images
    return readImageFileAsDataUrl(fullPath);
  } catch (error) {
    logger.error('Failed to read mall asset', { error: error?.message, relativePath });
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