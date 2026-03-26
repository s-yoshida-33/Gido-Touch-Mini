// src/App.tsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import "./styles/global-image.css"; // Global image styles
import ShopListScreen from "./screens/ShopListScreen";
import { useHeartbeat } from "./hooks/useHeartbeat";
import { useWebViewPing } from "./hooks/useWebViewPing";
import { ContextMenu } from "./components/ContextMenu";

// floor maps imports removed - managed by mall config and assets
// openTimeImage import removed - managed by mall config

import VersionInfoScreen from "./screens/VersionInfoScreen";
import UnifiedSettingsScreen from "./screens/UnifiedSettingsScreen";
import MallSelectScreen from "./screens/MallSelectScreen";
import BlackScreenOverlay from "./components/BlackScreenOverlay";
import {
  DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR,
} from "./config";
import type { LocationIconSettingsPerFloor } from "./types/locationIcon";
import type { ImageSettings } from "./types/imageSettings";
import { DEFAULT_IMAGE_SETTINGS } from "./types/imageSettings";
import type { ShopPositionSettings } from "./types/shopPosition";
import type { PictoSettings } from "./types/picto";
import { DEFAULT_PICTO_SETTINGS } from "./types/picto";
import type { MallSettings, MallId } from "./types/mall";
import { DEFAULT_MALL_SETTINGS } from "./types/mall";
import type { BlackScreenSettings } from "./types/blackScreenSettings";
import { DEFAULT_BLACK_SCREEN_SETTINGS } from "./types/blackScreenSettings";
import { getMallConfig } from "./config/malls";
import { isCustomImagePath } from "./utils/assets";
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
import {
  loadGlobalSettings,
  loadMallSettings,
  saveGlobalSettings,
  saveMallSettings as saveMallSettingsToFile,
  ensureMallSettingsFile,
  migrateFromLegacyIfNeeded,
  migrateFloorToMallSettings,
  saveImageFile,
} from "./utils/settings";
import type { MallSettingsFile } from "./utils/settings";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";

type FloorId = "1F" | "2F" | "3F" | "4F";

// Error boundary for React render failures
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError("RENDERER_ERROR", "React ErrorBoundary caught an error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 40,
            color: "white",
            background: "#333",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h1 style={{ fontSize: "2em", marginBottom: "1em" }}>
            System Error
          </h1>
          <p>
            予期せぬエラーが発生しました。自動的に復旧しない場合は再起動してください。
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}


const mergeWithDefaultImages = (settings: ImageSettings, mallId: string): ImageSettings => {
  const config = getMallConfig(mallId as any);

  let openTimeImage = settings.openTimeImage;

  // Only use saved openTimeImage if it's a custom path (not a stale Vite URL)
  if (openTimeImage && !isCustomImagePath(openTimeImage)) {
    openTimeImage = "";
  }

  // Check if the current openTimeImage belongs to a different mall's default asset
  // This prevents showing Suzaka's open time when switched to Sendai, and vice versa.
  if (openTimeImage) {
    const isSuzakaAsset = openTimeImage.includes("malls/suzaka") || openTimeImage.includes("malls\\suzaka");
    const isSendaiAsset = openTimeImage.includes("malls/sendaikamisugi") || openTimeImage.includes("malls\\sendaikamisugi");

    if (mallId === "suzaka" && isSendaiAsset) {
      openTimeImage = "";
    } else if (mallId === "sendaikamisugi" && isSuzakaAsset) {
      openTimeImage = "";
    } else if (mallId === "suzaka" && !isSuzakaAsset && (openTimeImage.includes("malls/") || openTimeImage.includes("malls\\"))) {
      openTimeImage = "";
    } else if (mallId === "sendaikamisugi" && !isSendaiAsset && (openTimeImage.includes("malls/") || openTimeImage.includes("malls\\"))) {
      openTimeImage = "";
    }
  }

  return {
    ...settings,
    floorMaps: {
      "1F": (isCustomImagePath(settings.floorMaps["1F"]) ? settings.floorMaps["1F"] : "") || config.floorMaps["1F"],
      "2F": (isCustomImagePath(settings.floorMaps["2F"]) ? settings.floorMaps["2F"] : "") || config.floorMaps["2F"],
      "3F": (isCustomImagePath(settings.floorMaps["3F"]) ? settings.floorMaps["3F"] : "") || config.floorMaps["3F"],
      "4F": (isCustomImagePath(settings.floorMaps["4F"]) ? settings.floorMaps["4F"] : "") || config.floorMaps["4F"],
    },
    openTimeImage: openTimeImage || "",
  };
};

const App: React.FC = () => {
  // Heartbeat (system info + hourly logging)
  useHeartbeat();

  // WebView watchdog ping
  useWebViewPing();

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

  // Disk-based floor maps: S3-downloaded maps loaded from AppLocalData/medias/maps/
  // Priority: imageSettings.floorMaps (custom upload) > diskFloorMaps (S3 sync) > bundled default
  const [diskFloorMaps, setDiskFloorMaps] = useState<Partial<Record<FloorId, string>>>({});

  // App startup phase
  // "loading" → reading settings | "mall_select" → first launch | "settings" → initial config | "running" → main screen
  type AppPhase = "loading" | "mall_select" | "settings" | "running";
  const [appPhase, setAppPhase] = useState<AppPhase>("loading");

  // Black screen settings state
  const [blackScreenSettings, setBlackScreenSettings] = useState<BlackScreenSettings>(
    DEFAULT_BLACK_SCREEN_SETTINGS
  );

  // Settings screen open state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVersionInfoOpen, setIsVersionInfoOpen] = useState(false);

  // Load S3-downloaded floor maps from disk. Returns the maps (does not set state).
  // Call site is responsible for calling setDiskFloorMaps with the result.
  const loadDiskFloorMaps = async (currentMallId: string, currentHostname: string): Promise<Partial<Record<FloorId, string>>> => {
    if (!currentMallId || !currentHostname || currentHostname === 'unknown') return {};
    try {
      const assetMap = await invoke<Record<string, string>>('list_mall_maps', {
        mallId: currentMallId,
        hostname: currentHostname,
      });
      const maps: Partial<Record<FloorId, string>> = {};
      for (const floorId of ['1F', '2F', '3F', '4F'] as FloorId[]) {
        const key = `maps/${floorId}-map.svg`;
        if (assetMap[key]) maps[floorId] = assetMap[key];
      }
      return maps;
    } catch {
      // non-critical: disk maps unavailable, bundled defaults will be used
      return {};
    }
  };

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
        logInfo("APP", "Shops loaded from cache", { count: cleaned.length });
      }

      // Load Shop News Cache
      const cachedShopNews = loadShopNewsFromCache();
      if (cachedShopNews && cachedShopNews.length > 0) {
        setShopNews(cachedShopNews);
        logInfo("APP", "Shop News loaded from cache", { count: cachedShopNews.length });
      }

      // Load Event News Cache
      const cachedEventNews = loadEventNewsFromCache();
      if (cachedEventNews && cachedEventNews.length > 0) {
        setEventNews(cachedEventNews);
        logInfo("APP", "Event News loaded from cache", { count: cachedEventNews.length });
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

      logInfo("APP", "Data loaded from API", {
        shops: cleanedShops.length,
        shopNews: sNews.length,
        eventNews: eNews.length
      });
    } catch (e) {
      logError("APP", "Failed to load data from API", { error: e });
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
      logInfo("APP", "Received update event from SSE", { type: payload.type });

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
             logInfo("APP", "Updated shops from SSE", { count: cleaned.length });
          }
          break;

        case "shop_news":
          if (payload.data) {
             const news = parseShopNewsData(payload.data);
             setShopNews(news);
             saveShopNewsToCache(news);
             logInfo("NEWS", "Updated shop news from SSE", { count: news.length, endpoint: "/api/shop-news" });
          }
          break;

        case "event_news":
           if (payload.data) {
             const news = parseEventNewsData(payload.data);
             setEventNews(news);
             saveEventNewsToCache(news);
             logInfo("NEWS", "Updated event news from SSE", { count: news.length, endpoint: "/api/event-news" });
          }
          break;

        default:
          logInfo("APP", "Unknown or unhandled SSE event type", { type: payload.type });
          // If unsure, reload all data (fallback behavior, optional)
          // loadData(false);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Load initial settings from Tauri (per-mall file architecture)
  const initCalled = useRef(false);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (initCalled.current) return;
    initCalled.current = true;

    const init = async () => {
      addDebug("Initializing App...");

      // 1. App Version (Tauri)
      try {
        const v = await getVersion();
        setAppVersion(v);
        addDebug(`App Version loaded: ${v}`);

        logInfo("SYS_INIT", "Application Mini Started", {
          appVersion: v,
          mallId: mallId || "unknown",
          windowSize: `${window.innerWidth}x${window.innerHeight}`,
          userAgent: navigator.userAgent,
          isDev: import.meta.env.DEV
        });
      } catch (e) {
        addDebug(`Failed to load App Version: ${e}`);
        logError("SYS_INIT", "Failed to load App Version", { error: e });
      }

      // 2. Migrate legacy settings if needed (single-file → per-mall files)
      try {
        const migrated = await migrateFromLegacyIfNeeded();
        if (migrated) {
          addDebug("Migrated legacy settings to per-mall format");
        }
      } catch (e) {
        addDebug(`Migration check failed: ${e}`);
      }

      // 2b. Migrate floor from global settings to per-mall settings
      try {
        const floorMigrated = await migrateFloorToMallSettings();
        if (floorMigrated) {
          addDebug("Migrated floor from global to per-mall settings");
        }
      } catch (e) {
        addDebug(`Floor migration check failed: ${e}`);
      }

      // 3. Load global settings (mallId, setupCompleted)
      try {
        const global = await loadGlobalSettings();

        // If first launch (setup not completed), show mall selection
        if (!global.setupCompleted) {
          addDebug("First launch detected — showing mall selection");
          setAppPhase("mall_select");
          return;
        }

        const currentMallId = global.mallId ?? "suzaka";
        setMallId(currentMallId);

        // 4. Ensure per-mall settings file exists, then load it
        await ensureMallSettingsFile(currentMallId);
        const mallData = await loadMallSettings(currentMallId);

        setFloor((mallData.floor ?? "1F") as FloorId);
        addDebug(`Global settings loaded: mallId=${currentMallId}, floor=${mallData.floor}`);

        setMallSettings(mallData.mallSettings);
        setLocationSettings(mallData.locationIcons);
        setImageSettings(mergeWithDefaultImages(mallData.imageSettings, currentMallId));
        setShopPositions(mallData.shopPositions);
        setPictoSettings(mallData.pictoSettings);
        setBlackScreenSettings(mallData.blackScreenSettings);

        addDebug(`Mall settings loaded for ${currentMallId}`);
        logInfo("APP", "Settings loaded", {
          mallId: currentMallId,
          shopPositions: Object.keys(mallData.shopPositions.positions).length,
        });

        // Load S3-downloaded maps from disk before first render to avoid white flash
        const diskMaps = await loadDiskFloorMaps(currentMallId, global.hostname ?? '');
        setDiskFloorMaps(diskMaps);

        // Preload the initial floor map into browser cache before showing the main screen.
        // This ensures the SVG is decoded/rasterized and displays on the first paint,
        // instead of appearing blank for 1-3 seconds after the screen is shown.
        // Priority: custom upload > S3 download > bundled default (same as effectiveFloorMaps).
        const initialFloor = (mallData.floor ?? "1F") as FloorId;
        const mergedImages = mergeWithDefaultImages(mallData.imageSettings, currentMallId);
        const rawCustom = mallData.imageSettings.floorMaps[initialFloor] ?? '';
        const initialMapUrl = (rawCustom && isCustomImagePath(rawCustom) ? rawCustom : null)
          || diskMaps[initialFloor]
          || diskMaps["1F"]
          || mergedImages.floorMaps[initialFloor]
          || mergedImages.floorMaps["1F"];
        if (initialMapUrl) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            // Timeout: 3 秒以上かかる場合はスキップして先に進む
            const timer = setTimeout(resolve, 3000);
            img.onload = img.onerror = () => { clearTimeout(timer); resolve(); };
            img.src = initialMapUrl;
          });
        }

        setAppPhase("running");
        logInfo("SYSTEM", "Application initialized successfully");
      } catch (e) {
        addDebug(`Failed to load settings: ${e}`);
        logError("APP", "Failed to load settings from Tauri", { error: e });
        setAppPhase("mall_select");
      }
    };

    init();
  }, []);

  // Global error handlers for uncaught errors (SYSTEM scope)
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      logError("SYSTEM", "Uncaught global error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError("SYSTEM", "Unhandled promise rejection", {
        reason: event.reason instanceof Error
          ? { message: event.reason.message, stack: event.reason.stack }
          : String(event.reason),
      });
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Unified save handler: writes global settings + per-mall settings in one operation.
  // Called by UnifiedSettingsScreen when user clicks "Save".
  const handleSaveAllSettings = async (
    global: { mallId: string; floor: string; hostname?: string },
    mallData: MallSettingsFile,
  ) => {
    try {
      // 1. Process image data: URLs → saved file paths
      const processedImageSettings = { ...mallData.imageSettings };
      const floorKeys: FloorId[] = ["1F", "2F", "3F", "4F"];

      for (const floorKey of floorKeys) {
        const mapValue = processedImageSettings.floorMaps[floorKey];
        if (mapValue && mapValue.startsWith("data:")) {
          const response = await fetch(mapValue);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const ext = blob.type.includes("png") ? "png" : blob.type.includes("svg") ? "svg" : "jpg";
          const filename = `floormap-${floorKey}.${ext}`;
          const savedPath = await saveImageFile(filename, uint8Array);
          processedImageSettings.floorMaps[floorKey] = savedPath;
        } else if (!isCustomImagePath(mapValue)) {
          // Don't persist Vite-bundled asset URLs — they become stale after reinstall/update.
          // Only custom paths (absolute file paths, data URLs) should be saved.
          processedImageSettings.floorMaps[floorKey] = "";
        }
      }

      if (processedImageSettings.openTimeImage && processedImageSettings.openTimeImage.startsWith("data:")) {
        const response = await fetch(processedImageSettings.openTimeImage);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const ext = blob.type.includes("png") ? "png" : blob.type.includes("svg") ? "svg" : "jpg";
        const filename = `open-time.${ext}`;
        const savedPath = await saveImageFile(filename, uint8Array);
        processedImageSettings.openTimeImage = savedPath;
      } else if (!isCustomImagePath(processedImageSettings.openTimeImage)) {
        processedImageSettings.openTimeImage = "";
      }

      const processedMallData: MallSettingsFile = {
        ...mallData,
        floor: global.floor,
        imageSettings: processedImageSettings,
      };

      // 2. Save global settings (settings.json) — floor is no longer stored here
      // Preserve existing hostname unless explicitly provided by the caller
      const existingGlobal = await loadGlobalSettings();
      await saveGlobalSettings({
        mallId: global.mallId as MallId,
        setupCompleted: true,
        hostname: global.hostname ?? existingGlobal.hostname,
      });

      // 3. Save per-mall settings ([mallId]-settings.json)
      await saveMallSettingsToFile(global.mallId, processedMallData);

      // 4. Update App state
      setMallId(global.mallId);
      setFloor(global.floor as FloorId);
      setMallSettings(processedMallData.mallSettings);
      setLocationSettings(processedMallData.locationIcons);
      setImageSettings(mergeWithDefaultImages(processedMallData.imageSettings, global.mallId));
      setShopPositions(processedMallData.shopPositions);
      setPictoSettings(processedMallData.pictoSettings);
      setBlackScreenSettings(processedMallData.blackScreenSettings);

      logInfo("APP", "All settings saved", { mallId: global.mallId });
    } catch (e) {
      logError("APP", "Failed to save settings", { error: e });
      throw e;
    }
  };

  // Handle initial mall selection (first launch phase 1 → phase 2)
  const handleMallSelect = async (selectedMallId: MallId) => {
    try {
      setMallId(selectedMallId);

      // Ensure per-mall settings file and load it
      await ensureMallSettingsFile(selectedMallId);
      const mallData = await loadMallSettings(selectedMallId);

      setMallSettings({ ...mallData.mallSettings, mallId: selectedMallId });
      setLocationSettings(mallData.locationIcons);
      setImageSettings(mergeWithDefaultImages(mallData.imageSettings, selectedMallId));
      setShopPositions(mallData.shopPositions);
      setPictoSettings(mallData.pictoSettings);
      setBlackScreenSettings(mallData.blackScreenSettings);
      setFloor((mallData.floor ?? "1F") as FloorId);

      // Mark setup as completed and go directly to running phase
      await saveGlobalSettings({
        mallId: selectedMallId,
        setupCompleted: true,
      });

      addDebug(`Mall selected: ${selectedMallId}, skipping settings, going to main screen`);
      setAppPhase("running");
      logInfo("APP", "Initial setup completed (settings skipped)", { mallId: selectedMallId });
    } catch (e) {
      logError("APP", "Failed during mall selection", { error: e });
    }
  };

  // Track whether initial setup completed (ref to avoid stale closure in handleSettingsClose)
  const setupJustCompleted = useRef(false);

  // Handle save during initial setup (phase 2 → phase 3)
  const handleInitialSetupSave = async (
    global: { mallId: string; floor: string; hostname?: string },
    mallData: MallSettingsFile,
  ) => {
    // Delegate to normal save handler first
    await handleSaveAllSettings(global, mallData);

    // Mark setup as completed
    await saveGlobalSettings({
      mallId: global.mallId as MallId,
      setupCompleted: true,
    });

    // Set ref BEFORE state update so handleSettingsClose (called by UnifiedSettingsScreen
    // after onSave resolves) knows not to revert to mall_select
    setupJustCompleted.current = true;
    setAppPhase("running");
    logInfo("APP", "Initial setup completed", { mallId: global.mallId });
  };

  // Handle settings close (cancel or after save)
  const handleSettingsClose = () => {
    if (appPhase === "settings" && !setupJustCompleted.current) {
      // During initial setup, cancel returns to mall selection
      setIsSettingsOpen(false);
      setAppPhase("mall_select");
    } else {
      setIsSettingsOpen(false);
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

  // Compute effective floor maps with the correct priority:
  //   1. Custom uploaded path (absolute file path / data URL saved by user)
  //   2. S3-downloaded map (diskFloorMaps, synced by useMapSync on startup)
  //   3. Bundled default SVG (from Vite build)
  //
  // Previously `imageSettings.floorMaps` merged custom + bundled BEFORE passing to
  // ShopListScreen, so the bundled URL was always truthy and S3 maps were never shown.
  const effectiveFloorMaps = useMemo((): Record<FloorId, string> => {
    return (['1F', '2F', '3F', '4F'] as FloorId[]).reduce((acc, floorId) => {
      const custom = imageSettings.floorMaps[floorId];
      if (custom && isCustomImagePath(custom)) {
        acc[floorId] = custom;
      } else if (diskFloorMaps[floorId]) {
        acc[floorId] = diskFloorMaps[floorId]!;
      } else {
        acc[floorId] = currentMallConfig.floorMaps[floorId] || '';
      }
      return acc;
    }, {} as Record<FloorId, string>);
  }, [imageSettings.floorMaps, diskFloorMaps, currentMallConfig]);

  // --- Phase: Loading ---
  if (appPhase === "loading") {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "#1C1C1C",
      }} />
    );
  }

  // --- Phase: Mall Selection (first launch) ---
  if (appPhase === "mall_select") {
    return (
      <ErrorBoundary>
        <MallSelectScreen onSelect={handleMallSelect} />
      </ErrorBoundary>
    );
  }

  // --- Phase: Initial Settings (first launch, after mall selection) ---
  if (appPhase === "settings") {
    return (
      <ErrorBoundary>
        <UnifiedSettingsScreen
          isOpen={true}
          onClose={handleSettingsClose}
          mallId={mallId}
          floor={floor}
          locationIconSettings={locationSettings}
          imageSettings={imageSettings}
          shopPositions={shopPositions}
          shops={mergedShops}
          pictoSettings={pictoSettings}
          mallSettings={mallSettings}
          onSave={handleInitialSetupSave}
        />
      </ErrorBoundary>
    );
  }

  // --- Phase: Running (normal operation) ---
  return (
    <ErrorBoundary>
    <ContextMenu
      onOpenSettings={() => setIsSettingsOpen(true)}
      onOpenVersionInfo={() => setIsVersionInfoOpen(true)}
    >
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
      floorMaps={effectiveFloorMaps}
      diskFloorMaps={diskFloorMaps}
      openTimeImage={imageSettings.openTimeImage}
      mallSettings={mallSettings}
    />
    <BlackScreenOverlay
      settings={blackScreenSettings}
      onOpenSettings={() => setIsSettingsOpen(true)}
      isSettingsOpen={isSettingsOpen}
    />
    <UnifiedSettingsScreen
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
        mallId={mallId}
        floor={floor}
        locationIconSettings={locationSettings}
        imageSettings={imageSettings}
        diskFloorMaps={diskFloorMaps}
        onDiskMapsUpdated={setDiskFloorMaps}
        shopPositions={shopPositions}
        shops={mergedShops}
        pictoSettings={pictoSettings}
        mallSettings={mallSettings}
        blackScreenSettings={blackScreenSettings}
        onSave={handleSaveAllSettings}
      />
      <VersionInfoScreen isOpen={isVersionInfoOpen} onClose={() => setIsVersionInfoOpen(false)} />
    </ContextMenu>
    </ErrorBoundary>
  );
};

export default App;
