// src/App.tsx
import React, { useEffect, useState, useMemo } from "react";
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
import { logInfo, logError } from "./logs/logging";

type FloorId = "1F" | "2F" | "3F" | "4F";

type ColumnPadding = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

type FloorLayoutPerFloor = {
  columns: number;
  rowsPerCol: number;
  perColumnRows?: number[];
  perColumnPadding?: ColumnPadding[];
};

type FloorLayout = Record<string, FloorLayoutPerFloor>;

const DEFAULT_FLOOR_LAYOUT: FloorLayout = {
  "1F": { columns: 3, rowsPerCol: 20 },
  "2F": { columns: 2, rowsPerCol: 19 },
  "3F": { columns: 3, rowsPerCol: 20 },
  "4F": { columns: 2, rowsPerCol: 18 },
};

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
  const [locationSettings, setLocationSettings] = useState<LocationIconSettingsPerFloor>(
    DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR
  );

  // Floor and floor layout state for unified settings
  const [floor, setFloor] = useState<FloorId>("1F");
  const [floorLayout, setFloorLayout] = useState<FloorLayout>(DEFAULT_FLOOR_LAYOUT);
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
  useEffect(() => {
    let unsubscribeUpdated: (() => void) | undefined;
    let unsubscribeFloorLayout: (() => void) | undefined;
    let unsubscribeOpenSettings: (() => void) | undefined;

    const init = async () => {
      const api = window.electronAPI;
      if (!api) return;

      // Listen for settings open event
      if (api.onOpenSettings) {
        unsubscribeOpenSettings = api.onOpenSettings(() => {
          setIsSettingsOpen(true);
        });
      }

      // Load location icon settings
      if (api.getLocationIconSettings) {
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
        }
      }

      // Load floor
      if (api.getFloor) {
        const currentFloor = await api.getFloor();
        if (currentFloor) {
          setFloor(currentFloor as FloorId);
        }
      }

      // Load floor layout
      if (api.getFloorLayout) {
        const layout = await api.getFloorLayout();
        if (layout) {
          setFloorLayout(layout);
        }
      }

      // Load image settings
      if (api.getImageSettings) {
        const saved = await api.getImageSettings();
        if (saved) {
          setImageSettings(mergeWithDefaultImages(saved));
        }
      }

      // Load shop positions
      if (api.getShopPositions) {
        const saved = await api.getShopPositions();
        if (saved) {
          logInfo("app", "Loaded shop positions", { count: Object.keys(saved.positions).length });
          setShopPositions(saved);
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

      if (api.onFloorLayoutChanged) {
        unsubscribeFloorLayout = api.onFloorLayoutChanged((layout) => {
          setFloorLayout(layout);
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
        floorLayout={floorLayout}
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
