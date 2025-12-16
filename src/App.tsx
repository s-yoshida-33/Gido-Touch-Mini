// src/App.tsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import "./styles/global-image.css"; // Global image styles
import ShopListScreen from "./screens/ShopListScreen";

import floor1FMap from "./assets/floor-1F-map.svg";
import floor2FMap from "./assets/floor-2F-map.svg";
import floor3FMap from "./assets/floor-3F-map.svg";
import floor4FMap from "./assets/floor-4F-map.svg";
import openTimeImage from "./assets/open-time.svg";

import VersionInfoScreen from "./screens/VersionInfoScreen";
import UnifiedSettingsScreen from "./screens/UnifiedSettingsScreen";
import {
  DEFAULT_LOCATION_ICON_SETTINGS,
  DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR,
} from "./config";
import type { LocationIconSettings, LocationIconSettingsPerFloor } from "./types/locationIcon";
import type { ImageSettings } from "./types/imageSettings";
import { DEFAULT_IMAGE_SETTINGS } from "./types/imageSettings";
import type { ShopPositionSettings } from "./types/shopPosition";
import type { Shop } from "./types/shop";
import { fetchShops, loadShopsFromCache, saveShopsToCache } from "./repositories/shopRepository";
import { sseService } from "./services/SSEService";
import type { SseConnectionStatus } from "./services/SSEService";
import { logInfo, logError } from "./logs/logging";

type FloorId = "1F" | "2F" | "3F" | "4F";

const mergeWithDefaultImages = (settings: ImageSettings): ImageSettings => {
  return {
    ...settings,
    floorMaps: {
      "1F": settings.floorMaps["1F"] || floor1FMap,
      "2F": settings.floorMaps["2F"] || floor2FMap,
      "3F": settings.floorMaps["3F"] || floor3FMap,
      "4F": settings.floorMaps["4F"] || floor4FMap,
    },
    openTimeImage: settings.openTimeImage || openTimeImage,
  };
};

const App: React.FC = () => {
  // DEBUG STATE
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const addDebug = (msg: string) => setDebugLog(prev => [...prev.slice(-49), msg]);

  // Debug Window UI State
  const [debugPos, setDebugPos] = useState({ x: 20, y: 20 });
  const [debugSize, setDebugSize] = useState({ w: 600, h: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");
  
  // API Status State
  const [sseStatus, setSseStatus] = useState<SseConnectionStatus>('disconnected');

  const [locationSettings, setLocationSettings] = useState<LocationIconSettingsPerFloor>(
    DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR
  );

  // Floor and floor layout state for unified settings
  const [floor, setFloor] = useState<FloorId>("1F");
  const [imageSettings, setImageSettings] = useState<ImageSettings>(
    mergeWithDefaultImages(DEFAULT_IMAGE_SETTINGS)
  );
  const [shopPositions, setShopPositions] = useState<ShopPositionSettings>({ positions: {} });
  const [shops, setShops] = useState<Shop[]>([]);
  
  // Settings screen open state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load shops function
  const loadShops = async (useCacheFirst = false) => {
    // 1. Try cache if requested (only on initial load)
    if (useCacheFirst) {
      const cached = loadShopsFromCache();
      if (cached && cached.length > 0) {
        const cleaned = cached.map((s) => ({
          ...s,
          name: s.name.replace(/【.*?】/g, "").trim(),
        }));
        setShops(cleaned);
        logInfo("app", "Shops loaded from cache", { count: cleaned.length });
      }
    }

    // 2. Fetch from API
    try {
      const shopData = await fetchShops();
      
      // Clean shop names
      const cleaned = shopData.map((s) => ({
        ...s,
        name: s.name.replace(/【.*?】/g, "").trim(),
      }));
      
      setShops(cleaned);
      
      // Update cache with raw data
      saveShopsToCache(shopData);
      
      logInfo("app", "Shops loaded from API and cached", { count: cleaned.length });
    } catch (e) {
      logError("app", "Failed to load shops from API", { error: e });
    }
  };

  // SSE Status Subscription
  useEffect(() => {
    try {
        setSseStatus(sseService.status);
    } catch (e) { console.error(e); }

    const unsubscribeStatus = sseService.on('status_change', (data: any) => {
      setSseStatus(data.status);
      addDebug(`SSE Status: ${data.status}`);
    });
    return () => unsubscribeStatus();
  }, []);

  // Drag, Resize, Shortcut Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setDebugPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      } else if (isResizing) {
        setDebugSize({ w: Math.max(300, e.clientX - debugPos.x), h: Math.max(200, e.clientY - debugPos.y) });
      }
    };
    const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        setIsDebugVisible(prev => !prev);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging, isResizing, dragOffset, debugPos]);

  // マウスダウンハンドラ
  const handleDebugMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - debugPos.x, y: e.clientY - debugPos.y });
  };
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  // Initial load and SSE subscription
  useEffect(() => {
    // Initial fetch with cache
    loadShops(true);

    // Subscribe to SSE updates
    const unsubscribe = sseService.on("update", (data) => {
      logInfo("app", "Received update event from SSE, reloading shops...", data as unknown as Record<string, unknown>);
      // Force refresh from API, ignore cache
      loadShops(false);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Load initial settings from Electron and subscribe to updates
  const initCalled = useRef(false);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (initCalled.current) return;
    initCalled.current = true;

    let unsubscribeUpdated: (() => void) | undefined;
    let unsubscribeFloorLayout: (() => void) | undefined;
    let unsubscribeOpenSettings: (() => void) | undefined;

    const init = async () => {
      addDebug("Initializing App...");
      
      // 1. App Version
      if (window.appInfo?.getVersion) {
          try {
            const v = await window.appInfo.getVersion();
            setAppVersion(v);
            addDebug(`App Version loaded: ${v}`);
          } catch (e) {
            addDebug(`Failed to load App Version: ${e}`);
          }
      } else {
        addDebug("window.appInfo not found");
      }

      const api = window.electronAPI;
      if (!api) {
        addDebug("window.electronAPI not found");
        return;
      }
      addDebug("window.electronAPI found");

      // Listen for settings open event
      if (api.onOpenSettings) {
        unsubscribeOpenSettings = api.onOpenSettings(() => {
          setIsSettingsOpen(true);
        });
      }

      // Load location icon settings
      if (api.getLocationIconSettings) {
        try {
          const saved = await api.getLocationIconSettings();
          if (saved) {
            // Check if saved is per-floor format or old single format
            if ('speechBubble' in saved && 'location' in saved && !('1F' in saved)) {
              // Old format: single LocationIconSettings - convert to per-floor format
              const oldSettings = saved as LocationIconSettings;
              const mergedSettings: LocationIconSettings = {
                speechBubble: {
                  ...DEFAULT_LOCATION_ICON_SETTINGS.speechBubble,
                  ...oldSettings.speechBubble,
                  enabled: oldSettings.speechBubble?.enabled ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.enabled,
                  shadow: oldSettings.speechBubble?.shadow ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.shadow,
                  animation: oldSettings.speechBubble?.animation ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.animation,
                },
                location: {
                  ...DEFAULT_LOCATION_ICON_SETTINGS.location,
                  ...oldSettings.location,
                  enabled: oldSettings.location?.enabled ?? DEFAULT_LOCATION_ICON_SETTINGS.location.enabled,
                  shadow: oldSettings.location?.shadow ?? DEFAULT_LOCATION_ICON_SETTINGS.location.shadow,
                },
              };
              // Convert to per-floor format
              const perFloorSettings: LocationIconSettingsPerFloor = {
                "1F": mergedSettings,
                "2F": mergedSettings,
                "3F": mergedSettings,
                "4F": mergedSettings,
              };
              setLocationSettings(perFloorSettings);
            } else {
              // New format: LocationIconSettingsPerFloor
              const perFloorSettings: LocationIconSettingsPerFloor = { ...DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR };
              const savedPerFloor = saved as LocationIconSettingsPerFloor;
              
              Object.keys(savedPerFloor).forEach((key) => {
                const floorId = key as FloorId;
                if (savedPerFloor[floorId]) {
                  const defaultSettings = DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR[floorId];
                  const savedSettings = savedPerFloor[floorId];
  
                  perFloorSettings[floorId] = {
                    speechBubble: {
                      ...defaultSettings.speechBubble,
                      ...savedSettings.speechBubble,
                      shadow: {
                        ...defaultSettings.speechBubble.shadow,
                        ...savedSettings.speechBubble?.shadow
                      },
                      animation: defaultSettings.speechBubble.animation && savedSettings.speechBubble?.animation ? {
                        ...defaultSettings.speechBubble.animation,
                        ...savedSettings.speechBubble.animation,
                        enabled: savedSettings.speechBubble.animation.enabled ?? defaultSettings.speechBubble.animation.enabled,
                        type: savedSettings.speechBubble.animation.type ?? defaultSettings.speechBubble.animation.type
                      } : defaultSettings.speechBubble.animation
                    },
                    location: {
                      ...defaultSettings.location,
                      ...savedSettings.location,
                      shadow: {
                        ...defaultSettings.location.shadow,
                        ...savedSettings.location?.shadow
                      },
                      animation: defaultSettings.location.animation && savedSettings.location?.animation ? {
                        ...defaultSettings.location.animation,
                        ...savedSettings.location.animation,
                        enabled: savedSettings.location.animation.enabled ?? defaultSettings.location.animation.enabled,
                        type: savedSettings.location.animation.type ?? defaultSettings.location.animation.type
                      } : defaultSettings.location.animation
                    }
                  };
                }
              });
              setLocationSettings(perFloorSettings);
            }
            addDebug("Location settings loaded");
          }
        } catch (e) {
          addDebug(`Failed to load location settings: ${e}`);
        }
      }

      // Load floor
      if (api.getFloor) {
        try {
          const currentFloor = await api.getFloor();
          if (currentFloor) {
            setFloor(currentFloor as FloorId);
            addDebug(`Floor loaded: ${currentFloor}`);
          }
        } catch (e) {
          addDebug(`Failed to load floor: ${e}`);
        }
      }

      // Load image settings
      if (api.getImageSettings) {
        try {
          const saved = await api.getImageSettings();
          if (saved) {
            setImageSettings(mergeWithDefaultImages(saved));
            addDebug(`Image settings loaded`);
          }
        } catch (e) {
          addDebug(`Failed to load image settings: ${e}`);
        }
      }

      // Load shop positions
      if (api.getShopPositions) {
        try {
          const saved = await api.getShopPositions();
          if (saved) {
            logInfo("app", "Loaded shop positions", { count: Object.keys(saved.positions).length });
            setShopPositions(saved);
            addDebug(`Shop positions loaded: ${Object.keys(saved.positions).length} items`);
          }
        } catch (e) {
          addDebug(`Failed to load shop positions: ${e}`);
        }
      }
      
      // Load API URLs
      if (api.getBridgeBaseUrl) {
         try {
             const url = await api.getBridgeBaseUrl();
             // Just logging for debug, not storing in state if not used elsewhere
             addDebug(`Bridge URL loaded: ${url}`);
         } catch (e) {
             addDebug(`Failed to load Bridge URL: ${e}`);
         }
      }
      
      // Detailed Debug Info
      if (api.getDebugSettingsStatus) {
         try {
             await api.getDebugSettingsStatus();
             addDebug(`DEBUG STATUS loaded`);
         } catch (e: any) {
             addDebug(`DEBUG ERROR: ${e.message}`);
         }
      }
    };

    init();

    const api = window.electronAPI;
    if (api) {
      // onOpenSettings moved to init/useEffect scope to capture unsubscribe

      if (api.onLocationIconSettingsUpdated) {
        unsubscribeUpdated = api.onLocationIconSettingsUpdated((updated) => {
          // Check if updated is per-floor format or old single format
          if ('speechBubble' in updated && 'location' in updated && !('1F' in updated)) {
            // Old format: single LocationIconSettings - convert to per-floor format
            const oldSettings = updated as LocationIconSettings;
            const mergedSettings: LocationIconSettings = {
              speechBubble: {
                ...DEFAULT_LOCATION_ICON_SETTINGS.speechBubble,
                ...oldSettings.speechBubble,
                enabled: oldSettings.speechBubble?.enabled ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.enabled,
                shadow: oldSettings.speechBubble?.shadow ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.shadow,
                animation: oldSettings.speechBubble?.animation ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.animation,
              },
              location: {
                ...DEFAULT_LOCATION_ICON_SETTINGS.location,
                ...oldSettings.location,
                enabled: oldSettings.location?.enabled ?? DEFAULT_LOCATION_ICON_SETTINGS.location.enabled,
                shadow: oldSettings.location?.shadow ?? DEFAULT_LOCATION_ICON_SETTINGS.location.shadow,
              },
            };
            // Convert to per-floor format
            const perFloorSettings: LocationIconSettingsPerFloor = {
              "1F": mergedSettings,
              "2F": mergedSettings,
              "3F": mergedSettings,
              "4F": mergedSettings,
            };
            setLocationSettings(perFloorSettings);
          } else {
            // New format: LocationIconSettingsPerFloor
            const perFloorSettings: LocationIconSettingsPerFloor = { ...DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR };
            Object.entries(updated as LocationIconSettingsPerFloor).forEach(([floorId, settings]) => {
              perFloorSettings[floorId] = {
                speechBubble: {
                  ...DEFAULT_LOCATION_ICON_SETTINGS.speechBubble,
                  ...settings.speechBubble,
                  enabled: settings.speechBubble?.enabled ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.enabled,
                  xPercent: settings.speechBubble?.xPercent ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.xPercent,
                  yPercent: settings.speechBubble?.yPercent ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.yPercent,
                  size: settings.speechBubble?.size ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.size,
                  rotation: settings.speechBubble?.rotation ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.rotation,
                  shadow: settings.speechBubble?.shadow ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.shadow,
                  animation: settings.speechBubble?.animation ?? DEFAULT_LOCATION_ICON_SETTINGS.speechBubble.animation,
                },
                location: {
                  ...DEFAULT_LOCATION_ICON_SETTINGS.location,
                  ...settings.location,
                  enabled: settings.location?.enabled ?? DEFAULT_LOCATION_ICON_SETTINGS.location.enabled,
                  xPercent: settings.location?.xPercent ?? DEFAULT_LOCATION_ICON_SETTINGS.location.xPercent,
                  yPercent: settings.location?.yPercent ?? DEFAULT_LOCATION_ICON_SETTINGS.location.yPercent,
                  size: settings.location?.size ?? DEFAULT_LOCATION_ICON_SETTINGS.location.size,
                  rotation: settings.location?.rotation ?? DEFAULT_LOCATION_ICON_SETTINGS.location.rotation,
                  shadow: settings.location?.shadow ?? DEFAULT_LOCATION_ICON_SETTINGS.location.shadow,
                  animation: settings.location?.animation ?? DEFAULT_LOCATION_ICON_SETTINGS.location.animation,
                },
              };
            });
            setLocationSettings(perFloorSettings);
          }
        });
      }

      if (api.onFloorChanged) {
        api.onFloorChanged((nextFloor) => {
          setFloor(nextFloor as FloorId);
        });
      }

      if (api.onImageSettingsUpdated) {
        api.onImageSettingsUpdated((updated) => {
          setImageSettings(updated);
        });
      }

      if (api.onShopPositionsUpdated) {
        api.onShopPositionsUpdated((updated) => {
          setShopPositions(updated);
        });
      }
    }

    return () => {
      if (unsubscribeUpdated) unsubscribeUpdated();
      if (unsubscribeFloorLayout) unsubscribeFloorLayout();
      if (unsubscribeOpenSettings) unsubscribeOpenSettings();
    };
  }, []);

  const handleSaveLocationSettings = async (settings: LocationIconSettingsPerFloor) => {
    // Persist to Electron settings.json
    if (window.electronAPI?.saveLocationIconSettings) {
      const saved =
        (await window.electronAPI.saveLocationIconSettings(settings)) ??
        settings;
      
      if ('speechBubble' in saved && 'location' in saved && !('1F' in saved)) {
        // Fallback for old format (should not happen with updated types but for safety)
        const mergedSettings: LocationIconSettings = saved as LocationIconSettings;
        const perFloorSettings: LocationIconSettingsPerFloor = {
          "1F": mergedSettings,
          "2F": mergedSettings,
          "3F": mergedSettings,
          "4F": mergedSettings,
        };
        setLocationSettings(perFloorSettings);
      } else {
        setLocationSettings(saved as LocationIconSettingsPerFloor);
      }
    } else {
      // Fallback: no Electron available (dev in browser)
      setLocationSettings(settings);
    }
  };


  const handleSaveFloor = async (nextFloor: FloorId) => {
    const api = window.electronAPI;
    if (!api) return;

    try {
      api.setFloor(nextFloor);
    } catch (e) {
      console.error("Failed to save floor", e);
    }
  };


  const handleSaveImageSettings = async (settings: ImageSettings) => {
    const api = window.electronAPI;
    if (!api) return;

    try {
      const saved = await api.saveImageSettings(settings);
      if (saved) {
        setImageSettings(saved);
      }
    } catch (e) {
      console.error("Failed to save image settings", e);
    }
  };

  const handleSaveShopPositions = async (settings: ShopPositionSettings) => {
    const api = window.electronAPI;
    if (!api) return;

    try {
      logInfo("app", "Saving shop positions", { count: Object.keys(settings.positions).length });
      const saved = await api.saveShopPositions(settings);
      if (saved) {
        setShopPositions(saved);
        logInfo("app", "Shop positions saved successfully");
      }
    } catch (e) {
      logError("app", "Failed to save shop positions", { error: e });
      console.error("Failed to save shop positions", e);
    }
  };

  // Merge shops with positions
  const mergedShops = useMemo(() => {
    return shops.map((shop) => {
      const shopId = shop.shopId || shop.number;
      if (shopId && shopPositions.positions[shopId]) {
        return {
          ...shop,
          position: shopPositions.positions[shopId],
        };
      }
      return shop;
    });
  }, [shops, shopPositions]);

  return (
    <>
      {isDebugVisible && (
      <div style={{
        position: 'fixed',
        top: debugPos.y,
        left: debugPos.x,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.9)',
        color: 'lime',
        border: '1px solid lime',
        borderRadius: '4px',
        width: `${debugSize.w}px`,
        height: `${debugSize.h}px`,
        display: 'flex',
        flexDirection: 'column',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        {/* Header (Draggable) */}
        <div onMouseDown={handleDebugMouseDown} style={{ 
          padding: '8px', 
          background: '#333', 
          cursor: 'move',
          display: 'flex',
          justifyContent: 'space-between',
          userSelect: 'none'
        }}>
          <span>Debug Log</span>
          <span>Ctrl+Shift+D to toggle</span>
        </div>
        
        {/* System Info */}
        <div style={{ padding: '8px', borderBottom: '1px solid #333' }}>
          <div>Version: {appVersion} | Window: {window.innerWidth}x{window.innerHeight}</div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          
          {/* API Status (Expandable) */}
          <details open>
            <summary style={{ cursor: 'pointer', marginBottom: '4px' }}>API Status</summary>
            <div style={{ paddingLeft: '16px', marginBottom: '8px' }}>
              <div>SSE: {sseStatus} (localhost:8090)</div>
            </div>
          </details>

          {/* Full Settings (Expandable) */}
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: '4px' }}>Full Settings</summary>
            <pre style={{ fontSize: '10px', overflowX: 'auto' }}>
              {JSON.stringify({ locationSettings, imageSettings, shopPositions }, null, 2)}
            </pre>
          </details>

          {/* Logs */}
          <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Logs</div>
            {debugLog.map((log, i) => (
              <div key={i} style={{ whiteSpace: 'pre-wrap', marginBottom: '2px', borderBottom: '1px solid #222' }}>
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Resizer Handle */}
        <div onMouseDown={handleResizeMouseDown} style={{ 
          cursor: 'se-resize', 
          height: '16px', 
          background: '#222',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingRight: '4px'
        }}>
          <span style={{ fontSize: '10px', color: '#666' }}>///</span>
        </div>
      </div>
      )}
    <ShopListScreen 
      isSettingsOpen={isSettingsOpen} 
      locationIconSettings={locationSettings}
      currentFloor={floor}
      shops={mergedShops}
      shopPositions={shopPositions}
    />
    <UnifiedSettingsScreen
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        floor={floor}
        onSaveFloor={handleSaveFloor}
        locationIconSettings={locationSettings}
        onSaveLocationIconSettings={handleSaveLocationSettings}
        imageSettings={imageSettings}
        onSaveImageSettings={handleSaveImageSettings}
        shopPositions={shopPositions}
        onSaveShopPositions={handleSaveShopPositions}
        shops={mergedShops}
      />
      <VersionInfoScreen onClose={() => {}} />
    </>
  );
};

export default App;
