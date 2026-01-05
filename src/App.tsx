// src/App.tsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import "./styles/global-image.css"; // Global image styles
import ShopListScreen from "./screens/ShopListScreen";

// floor maps imports removed - managed by mall config and assets
// openTimeImage import removed - managed by mall config

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
import type { PictoSettings } from "./types/picto";
import { DEFAULT_PICTO_SETTINGS } from "./types/picto";
import type { MallSettings, MallId } from "./types/mall";
import { DEFAULT_MALL_SETTINGS } from "./types/mall";
import { getMallConfig } from "./config/malls";
import { getMallAssetUrl } from "./utils/assets";
import type { Shop } from "./types/shop";
import { fetchShops, loadShopsFromCache, saveShopsToCache } from "./repositories/shopRepository";
import { 
  loadShopNewsFromCache, 
  saveShopNewsToCache, 
  loadEventNewsFromCache, 
  saveEventNewsToCache 
} from "./repositories/newsRepository";
import { 
  fetchShopNewsFromBridge, 
  fetchShopNewsListFromBridge, 
  parseShopsData, 
  parseShopNewsData, 
  parseEventNewsData 
} from "./api/bridgeClient";
import type { ShopNews } from "./types/shopNews";
import { sseService } from "./services/SSEService";
import type { SseConnectionStatus } from "./services/SSEService";
import { logInfo, logError } from "./logs/logging";

type FloorId = "1F" | "2F" | "3F" | "4F";

const mergeWithDefaultImages = (settings: ImageSettings, mallId: string): ImageSettings => {
  const config = getMallConfig(mallId as any);
  // Default open time image path based on mallId
  const defaultOpenTime = getMallAssetUrl(mallId, "open-time/ja", "open-time.svg");
  
  let openTimeImage = settings.openTimeImage;

  // Check if the current openTimeImage belongs to a different mall's default asset
  // This prevents showing Suzaka's open time when switched to Sendai, and vice versa.
  if (openTimeImage) {
    // Check known mall IDs in the path
    const isSuzakaAsset = openTimeImage.includes("malls/suzaka");
    const isSendaiAsset = openTimeImage.includes("malls/sendai-kamisugi");
    
    // If current mall is Suzaka but image is from Sendai -> Reset to default
    if (mallId === "suzaka" && isSendaiAsset) {
      openTimeImage = defaultOpenTime;
    } 
    // If current mall is Sendai but image is from Suzaka -> Reset to default
    else if (mallId === "sendai-kamisugi" && isSuzakaAsset) {
      openTimeImage = defaultOpenTime;
    }
    // Fallback: If current mall ID is not in path but another mall ID is -> Reset
    else if (mallId === "suzaka" && !isSuzakaAsset && openTimeImage.includes("malls/")) {
        // e.g. some other mall
        openTimeImage = defaultOpenTime;
    }
    else if (mallId === "sendai-kamisugi" && !isSendaiAsset && openTimeImage.includes("malls/")) {
        openTimeImage = defaultOpenTime;
    }
  }

  return {
    ...settings,
    floorMaps: {
      "1F": settings.floorMaps["1F"] || config.floorMaps["1F"],
      "2F": settings.floorMaps["2F"] || config.floorMaps["2F"],
      "3F": settings.floorMaps["3F"] || config.floorMaps["3F"],
      "4F": settings.floorMaps["4F"] || config.floorMaps["4F"],
    },
    // Use validated settings value or default
    openTimeImage: openTimeImage || defaultOpenTime,
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

  // Mall ID state
  const [mallId, setMallId] = useState<string>("suzaka");
  
  // Floor and floor layout state for unified settings
  const [floor, setFloor] = useState<FloorId>("1F");
  const [mallSettings, setMallSettings] = useState<MallSettings>(DEFAULT_MALL_SETTINGS);
  const [imageSettings, setImageSettings] = useState<ImageSettings>(
    mergeWithDefaultImages(DEFAULT_IMAGE_SETTINGS, mallSettings.mallId)
  );
  const [shopPositions, setShopPositions] = useState<ShopPositionSettings>({ positions: {} });
  const [pictoSettings, setPictoSettings] = useState<PictoSettings>(DEFAULT_PICTO_SETTINGS);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopNews, setShopNews] = useState<ShopNews[]>([]);
  const [eventNews, setEventNews] = useState<ShopNews[]>([]);
  
  // Settings screen open state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load data function
  const loadData = async (useCacheFirst = false) => {
    // 1. Try cache if requested (only on initial load)
    if (useCacheFirst) {
      // Load Shops Cache
      const cachedShops = loadShopsFromCache();
      if (cachedShops && cachedShops.length > 0) {
        const cleaned = cachedShops.map((s) => ({
          ...s,
          name: s.name.replace(/【.*?】/g, "").trim(),
        }));
        setShops(cleaned);
        logInfo("app", "Shops loaded from cache", { count: cleaned.length });
      }

      // Load Shop News Cache
      const cachedShopNews = loadShopNewsFromCache();
      if (cachedShopNews && cachedShopNews.length > 0) {
        setShopNews(cachedShopNews);
        logInfo("app", "Shop News loaded from cache", { count: cachedShopNews.length });
      }

      // Load Event News Cache
      const cachedEventNews = loadEventNewsFromCache();
      if (cachedEventNews && cachedEventNews.length > 0) {
        setEventNews(cachedEventNews);
        logInfo("app", "Event News loaded from cache", { count: cachedEventNews.length });
      }
    }

    // 2. Fetch from API
    try {
      // Load Shops
      const shopData = await fetchShops();
      const cleanedShops = shopData.map((s) => ({
        ...s,
        name: s.name.replace(/【.*?】/g, "").trim(),
      }));
      setShops(cleanedShops);
      saveShopsToCache(shopData);
      
      // Load News
      const sNews = await fetchShopNewsListFromBridge();
      setShopNews(sNews);
      saveShopNewsToCache(sNews);
      
      const eNews = await fetchShopNewsFromBridge();
      setEventNews(eNews);
      saveEventNewsToCache(eNews);
      
      logInfo("app", "Data loaded from API", { 
        shops: cleanedShops.length, 
        shopNews: sNews.length, 
        eventNews: eNews.length 
      });
    } catch (e) {
      logError("app", "Failed to load data from API", { error: e });
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
    loadData(true);

    // Subscribe to SSE updates
    const unsubscribe = sseService.on("update", (payload: any) => {
      logInfo("app", "Received update event from SSE", { type: payload.type });

      switch (payload.type) {
        case "shops":
          if (payload.data) {
             const newShops = parseShopsData(payload.data, "1F"); // Default floor fallback
             // Clean shop names logic
             const cleaned = newShops.map((s) => ({
                ...s,
                name: s.name.replace(/【.*?】/g, "").trim(),
             }));
             setShops(cleaned);
             saveShopsToCache(newShops);
             logInfo("app", "Updated shops from SSE", { count: cleaned.length });
          }
          break;
          
        case "shop_news":
          if (payload.data) {
             const news = parseShopNewsData(payload.data);
             setShopNews(news);
             saveShopNewsToCache(news);
             logInfo("app", "Updated shop news from SSE", { count: news.length });
          }
          break;
            
        case "event_news":
           if (payload.data) {
             const news = parseEventNewsData(payload.data);
             setEventNews(news);
             saveEventNewsToCache(news);
             logInfo("app", "Updated event news from SSE", { count: news.length });
          }
          break;
          
        default:
          logInfo("app", "Unknown or unhandled SSE event type", { type: payload.type });
          // If unsure, reload all data (fallback behavior, optional)
          // loadData(false);
      }
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

      // Load mall settings first (needed for image settings merge)
      let currentMallId = "suzaka";
      if (api.getMallSettings) {
        try {
          const saved = await api.getMallSettings();
          if (saved) {
            setMallSettings(saved);
            currentMallId = saved.mallId;
            setMallId(saved.mallId);
            addDebug(`Mall settings loaded: ${saved.mallId}`);
          }
        } catch (e) {
          addDebug(`Failed to load mall settings: ${e}`);
        }
      }

      // Load image settings
      if (api.getImageSettings) {
        try {
          const saved = await api.getImageSettings();
          if (saved) {
            setImageSettings(mergeWithDefaultImages(saved, currentMallId));
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

      // Load picto settings
      if (api.getPictoSettings) {
        try {
          const saved = await api.getPictoSettings();
          if (saved) {
            setPictoSettings(saved);
            addDebug(`Picto settings loaded: ${Object.keys(saved.instances).length} items`);
          }
        } catch (e) {
          addDebug(`Failed to load picto settings: ${e}`);
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
          setImageSettings(mergeWithDefaultImages(updated, mallId));
        });
      }

      if (api.onShopPositionsUpdated) {
        api.onShopPositionsUpdated((updated) => {
          setShopPositions(updated);
        });
      }

      if (api.onPictoSettingsUpdated) {
        api.onPictoSettingsUpdated((updated) => {
          setPictoSettings(updated);
        });
      }

      if (api.onMallSettingsUpdated) {
        api.onMallSettingsUpdated((updated) => {
          setMallSettings(updated);
          setMallId(updated.mallId);
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


  const handleSaveMallId = async (nextMallId: string) => {
    const api = window.electronAPI;
    if (!api) return;

    try {
      await api.setMallId(nextMallId);
      // setMallIdはvoidを返すので、成功した場合はnextMallIdを使用
      setMallId(nextMallId);
      
      // モールIDが変更されたら、画像設定をリセットして新しいモールのデフォルトを適用
      // openTimeImage を空にすることで mergeWithDefaultImages が新しいモールのデフォルト値を設定する
      const resetSettings = {
        ...imageSettings,
        openTimeImage: "", 
      };
      const newImageSettings = mergeWithDefaultImages(resetSettings, nextMallId);
      
      setImageSettings(newImageSettings);
      
      // 画像設定も保存しておく（次回起動時のため）
      if (api.saveImageSettings) {
        await api.saveImageSettings(newImageSettings);
      }

      logInfo("app", "Mall ID saved successfully", { mallId: nextMallId });
    } catch (e) {
      logError("app", "Failed to save mall ID", { error: e });
      console.error("Failed to save mall ID", e);
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
        setImageSettings(mergeWithDefaultImages(saved, mallId));
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

  const handleSavePictoSettings = async (settings: PictoSettings) => {
    const api = window.electronAPI;
    // Electron環境でない場合のフォールバック（開発用）
    if (!api) {
        setPictoSettings(settings);
        return;
    }

    try {
      const saved = await api.savePictoSettings(settings);
      if (saved) {
        setPictoSettings(saved);
        logInfo("app", "Picto settings saved successfully");
      }
    } catch (e) {
      logError("app", "Failed to save picto settings", { error: e });
      console.error("Failed to save picto settings", e);
    }
  };

  const handleSaveMallSettings = async (settings: MallSettings) => {
    const api = window.electronAPI;
    if (!api) {
      const oldMallId = mallSettings.mallId;
      setMallSettings(settings);

      // ブラウザ環境でのモック動作：モールが変わったらデータをリセット
      if (settings.mallId !== oldMallId) {
          setPictoSettings({ instances: {} });
          setShopPositions({ positions: {} });
          setImageSettings(mergeWithDefaultImages(DEFAULT_IMAGE_SETTINGS, settings.mallId));
      }
      return;
    }

    try {
      const saved = await api.saveMallSettings(settings);
      if (saved) {
        setMallSettings(saved);
        setMallId(saved.mallId);
        logInfo("app", "Mall settings saved successfully", { mallId: saved.mallId });
        
        // Reload mall-specific settings when mall changes
        if (saved.mallId !== mallSettings.mallId) {
          // Reload shop positions for the new mall
          if (api.getShopPositions) {
            try {
              const newShopPositions = await api.getShopPositions();
              if (newShopPositions) {
                setShopPositions(newShopPositions);
                logInfo("app", "Shop positions reloaded for new mall", { 
                  mallId: saved.mallId,
                  count: Object.keys(newShopPositions.positions).length 
                });
              }
            } catch (e) {
              logError("app", "Failed to reload shop positions", { error: e });
            }
          }

          // Reload location settings for the new mall
          if (api.getLocationIconSettings) {
            try {
              const newLocationSettings = await api.getLocationIconSettings();
              if (newLocationSettings) {
                // Check if saved is per-floor format or old single format
                const isPerFloor = '1F' in newLocationSettings || '2F' in newLocationSettings;
                
                if (!isPerFloor && 'speechBubble' in newLocationSettings) {
                   // Convert old format to per-floor
                   const oldSettings = newLocationSettings as LocationIconSettings;
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
                   const perFloorSettings: LocationIconSettingsPerFloor = {
                     "1F": mergedSettings,
                     "2F": mergedSettings,
                     "3F": mergedSettings,
                     "4F": mergedSettings,
                   };
                   setLocationSettings(perFloorSettings);
                } else {
                   // Per floor format
                   setLocationSettings(newLocationSettings as LocationIconSettingsPerFloor);
                }
                logInfo("app", "Location settings reloaded for new mall", { mallId: saved.mallId });
              }
            } catch (e) {
              logError("app", "Failed to reload location settings", { error: e });
            }
          }
          
          // Reload picto settings for the new mall
          if (api.getPictoSettings) {
            try {
              const newPictoSettings = await api.getPictoSettings();
              if (newPictoSettings) {
                setPictoSettings(newPictoSettings);
                logInfo("app", "Picto settings reloaded for new mall", { 
                  mallId: saved.mallId,
                  count: Object.keys(newPictoSettings.instances).length 
                });
              }
            } catch (e) {
              logError("app", "Failed to reload picto settings", { error: e });
            }
          }
          
          // Reload image settings for the new mall
          if (api.getImageSettings) {
            try {
              const savedImageSettings = await api.getImageSettings();
              if (savedImageSettings) {
                setImageSettings(mergeWithDefaultImages(savedImageSettings, saved.mallId));
                logInfo("app", "Image settings reloaded for new mall", { mallId: saved.mallId });
              }
            } catch (e) {
              logError("app", "Failed to reload image settings", { error: e });
            }
          }
        }
      }
    } catch (e) {
      logError("app", "Failed to save mall settings", { error: e });
      console.error("Failed to save mall settings", e);
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

  const currentMallConfig = getMallConfig(mallSettings.mallId);

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
              <div>Main Map: {currentMallConfig.floorMaps[floor] || "N/A"}</div>
              <div>Settings Map: {isSettingsOpen ? (imageSettings.floorMaps[floor] || currentMallConfig.floorMaps[floor] || "N/A") : "Settings Closed"}</div>
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
      mallId={mallId as MallId}
      shops={mergedShops}
      shopPositions={shopPositions}
      shopNews={shopNews}
      eventNews={eventNews}
      pictoSettings={pictoSettings}
      genres={currentMallConfig.genres}
      floorMaps={currentMallConfig.floorMaps}
      openTimeImage={imageSettings.openTimeImage} // Pass openTimeImage
    />
    <UnifiedSettingsScreen
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        mallId={mallId}
        onSaveMallId={handleSaveMallId}
        floor={floor}
        onSaveFloor={handleSaveFloor}
        locationIconSettings={locationSettings}
        onSaveLocationIconSettings={handleSaveLocationSettings}
        imageSettings={imageSettings}
        onSaveImageSettings={handleSaveImageSettings}
        shopPositions={shopPositions}
        onSaveShopPositions={handleSaveShopPositions}
        shops={mergedShops}
        // Picto settings
        pictoSettings={pictoSettings}
        onSavePictoSettings={handleSavePictoSettings}
        // Mall settings
        mallSettings={mallSettings}
        onSaveMallSettings={handleSaveMallSettings}
      />
      <VersionInfoScreen onClose={() => {}} />
    </>
  );
};

export default App;
