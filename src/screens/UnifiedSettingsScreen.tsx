// src/screens/UnifiedSettingsScreen.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import GidoApp from "./GidoApp";
import type { LocationIconSettingsPerFloor } from "../types/locationIcon";
import { getLocationIconSettingsForFloor, DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR } from "../config";
import type { FloorId } from "../types/floorLayout";
import { ImageSettingsTab } from "../components/ImageSettingsTab";
import { ShopPositionSettingsTab } from "../components/ShopPositionSettingsTab";
import { FloorSettingsTab } from "../components/FloorSettingsTab";
import { BlackScreenSettingsTab } from "../components/BlackScreenSettingsTab";
// iconSvg import removed - loading from common assets
import type { ImageSettings } from "../types/imageSettings";
import type { ShopPositionSettings } from "../types/shopPosition";
import type { Shop } from "../types/shop";
import { PictoSettingsTab } from "../components/PictoSettingsTab";
import { MallSettingsTab } from "../components/MallSettingsTab";
import type { PictoSettings } from "../types/picto";
import { DEFAULT_PICTO_SETTINGS } from "../types/picto";
import type { MallSettings, MallId } from "../types/mall";
import { DEFAULT_MALL_SETTINGS } from "../types/mall";
import { getMallConfig } from "../config/malls";
import { getAssetUrl } from "../utils/assets"; // Import
import { loadGlobalSettings, saveGlobalSettings, cleanupOldHostnameMaps } from "../utils/settings";
import type { MallSettingsFile } from "../utils/settings";
import type { BlackScreenSettings } from '../types/blackScreenSettings';
import { DEFAULT_BLACK_SCREEN_SETTINGS } from '../types/blackScreenSettings';

const iconSvg = getAssetUrl("icon.svg"); // Assuming icon.svg moved to common or use getAssetUrl('icon.svg') if root // Import

// Remove unused import if any
// Helper function removed

type TabType = "image" | "shopPosition" | "floor" | "picto" | "mall" | "blackScreen";

// Export props interface to ensure visibility
export interface UnifiedSettingsScreenProps {
  isOpen: boolean;
  onClose: () => void;
  mallId: string;
  floor: FloorId;
  locationIconSettings: LocationIconSettingsPerFloor;
  imageSettings: ImageSettings;
  diskFloorMaps?: Partial<Record<FloorId, string>>;
  onDiskMapsUpdated?: (maps: Partial<Record<FloorId, string>>) => void;
  shopPositions: ShopPositionSettings;
  shops: Shop[];
  pictoSettings: PictoSettings;
  mallSettings: MallSettings;
  blackScreenSettings?: BlackScreenSettings;
  onSave: (
    global: { mallId: string; floor: string; hostname?: string },
    mallData: MallSettingsFile,
  ) => Promise<void>;
}

const UnifiedSettingsScreen: React.FC<UnifiedSettingsScreenProps> = ({
  isOpen,
  onClose,
  mallId: initialMallId,
  floor: initialFloor,
  locationIconSettings: initialLocationIconSettings,
  imageSettings: initialImageSettings,
  diskFloorMaps,
  onDiskMapsUpdated,
  shopPositions: initialShopPositions,
  shops,
  pictoSettings: initialPictoSettings,
  mallSettings: initialMallSettings,
  blackScreenSettings: initialBlackScreenSettings = DEFAULT_BLACK_SCREEN_SETTINGS,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("floor");
  const [mallId, setMallId] = useState<string>(initialMallId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Current floor: only changed by FloorSettingsTab, persisted on save
  const [currentFloor, setCurrentFloor] = useState<FloorId>(initialFloor);
  // Editing floor: used by image/shopPosition/picto tabs for floor navigation, NOT persisted
  const [editingFloor, setEditingFloor] = useState<FloorId>(initialFloor);
  const [locationIconSettings, setLocationIconSettings] =
    useState<LocationIconSettingsPerFloor>(initialLocationIconSettings || DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR);
  const [imageSettings, setImageSettings] = useState<ImageSettings>(initialImageSettings);
  const [shopPositions, setShopPositions] = useState<ShopPositionSettings>(initialShopPositions);
  const [pictoSettings, setPictoSettings] = useState<PictoSettings>(initialPictoSettings || DEFAULT_PICTO_SETTINGS);
  const [mallSettings, setMallSettings] = useState<MallSettings>(initialMallSettings || DEFAULT_MALL_SETTINGS);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedPictoId, setSelectedPictoId] = useState<string | null>(null);
  // Black screen settings
  const [blackScreenSettings, setBlackScreenSettings] = useState<BlackScreenSettings>(initialBlackScreenSettings);

  const unsetShopCount = useMemo(() => {
    if (!shops) return 0;
    return shops.filter(shop => {
      const id = shop.shopId || shop.number;
      return id && !shopPositions.positions[id];
    }).length;
  }, [shops, shopPositions]);

  // Hostname for S3 maps path
  const [hostname, setHostname] = useState<string>('');
  const [initialHostname, setInitialHostname] = useState<string>('');


  // Transform wrapper ref for programmatic control
  const transformRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    resetTransform: () => void;
    setTransform: (x: number, y: number, scale: number) => void;
    centerView: (scale?: number) => void;
    state: {
      scale: number;
      positionX: number;
      positionY: number;
    };
  } | null>(null);
  
  // Container ref for calculating center position
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  // Map content ref for CSS variable scale
  const mapContentRef = useRef<HTMLDivElement>(null);
  
  // Current scale state to control panning (詳細モーダルと同じ仕様)
  const [currentScale, setCurrentScale] = useState(1);
  
  // Re-calculate config when mallId changes
  const currentMallConfig = getMallConfig(mallSettings.mallId);

  // NOTE: The useEffect on mallSettings.mallId for resetting imageSettings has been removed.
  // In the per-mall file architecture, the dropdown handler loads complete settings
  // from the per-mall file directly, so automatic resets are no longer needed.

  // NOTE: Prop-sync useEffects have been removed. With per-mall file architecture,
  // local state is initialized when the screen opens (see prevIsOpen useEffect below)
  // and is fully ephemeral until the user clicks Save.

  // 中央位置を計算する関数（すべてのタブで同じロジックを使用）
  const calculateOtherTabCenterPosition = useCallback(() => {
    if (!previewContainerRef.current) return { x: 0, y: 0, scale: 0.6 };
    
    const containerRect = previewContainerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Main screen map area size (1460x1080)
    const contentWidth = 1460;
    const contentHeight = 1080;
    const scale = 0.6;
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;
    
    const centerX = (containerWidth - scaledWidth) / 2;
    const centerY = (containerHeight - scaledHeight) / 2;
    
    return { x: centerX, y: centerY, scale };
  }, []);

  // アクティブなタブに応じて中央位置を計算する関数
  const calculateCenterPositionForActiveTab = useCallback(() => {
    return calculateOtherTabCenterPosition();
  }, [calculateOtherTabCenterPosition]);


  // Previous isOpen state to detect opening
  const prevIsOpen = useRef(isOpen);

  // Initialize / Reset local state from App props when screen opens
  useEffect(() => {
    // Only run initialization when isOpen changes from false to true
    if (isOpen && !prevIsOpen.current) {
      setActiveTab("floor");
      setMallId(initialMallId);
      setCurrentFloor(initialFloor);
      setEditingFloor(initialFloor);
      setLocationIconSettings(initialLocationIconSettings);
      setImageSettings(initialImageSettings);
      setShopPositions(initialShopPositions);
      setPictoSettings(initialPictoSettings || DEFAULT_PICTO_SETTINGS);
      setMallSettings(initialMallSettings || DEFAULT_MALL_SETTINGS);
      setErrors({});

      // Load hostname from global settings
      loadGlobalSettings().then((gs) => {
        const saved = gs.hostname ?? '';
        setHostname(saved);
        setInitialHostname(saved);
      }).catch(() => {});

      // Reset transform when opening settings
      if (transformRef.current && previewContainerRef.current) {
        requestAnimationFrame(() => {
          if (transformRef.current && previewContainerRef.current) {
            const { x, y, scale } = calculateOtherTabCenterPosition();
            transformRef.current.setTransform(x, y, scale);
          }
        });
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialMallId, initialFloor, initialLocationIconSettings, initialImageSettings, initialShopPositions, calculateOtherTabCenterPosition]);

  const handleClose = () => {
    onClose();
    setErrors({});
  };

  const handleCancel = () => {
    // Simply close — no saves needed since all edits are ephemeral.
    // On next open, local state will be re-initialized from App props.
    handleClose();
  };

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings()) {
      return;
    }

    try {
      setSaving(true);

      // Save hostname to global settings (and cleanup stale map dirs if changed)
      try {
        const currentGlobal = await loadGlobalSettings();
        await saveGlobalSettings({ ...currentGlobal, hostname });
        if (mallId && hostname && hostname !== initialHostname) {
          await cleanupOldHostnameMaps(mallId, hostname).catch((e) =>
            console.warn('cleanup_old_hostname_maps failed:', e)
          );
        }
        setInitialHostname(hostname);
      } catch (e) {
        console.warn('Failed to save hostname:', e);
      }

      // Single save: global settings + per-mall settings
      // currentFloor is the persisted floor (only changed by FloorSettingsTab)
      await onSave(
        { mallId, floor: currentFloor, hostname },
        {
          mallSettings,
          floor: currentFloor,
          locationIcons: locationIconSettings,
          shopPositions,
          pictoSettings,
          imageSettings: imageSettings,
          blackScreenSettings,
        },
      );

      handleClose();
    } catch (e) {
      console.error("Failed to save settings", e);
      setErrors({ save: "設定の保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  };


  // Zoom buttons using library methods
  const handleZoomIn = () => {
    if (transformRef.current) {
      transformRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (transformRef.current) {
      transformRef.current.zoomOut();
    }
  };

  const handleReset = () => {
    if (transformRef.current && previewContainerRef.current) {
      // Reset to initial scale (1.0) and center position
      const { x, y, scale } = calculateCenterPositionForActiveTab();
      transformRef.current.setTransform(x, y, scale);
    }
  };


  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#1C1C1C",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Rounded Mplus 1c', sans-serif",
      }}
    >
      {/* Header (4%) */}
      <div
        style={{
          height: "4%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          gap: 12,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Logo and App Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <img
            src={iconSvg || undefined}
            alt="Gido Touch Mini"
            style={{
              width: 24,
              height: 24,
            }}
          />
          <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 600 }}>
            Gido Touch Mini - Settings
          </span>

          <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#aaa', fontSize: 13 }}>ホスト名:</span>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="例: KIOSK-01"
              style={{
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 13,
                width: 140,
              }}
            />
          </div>
        </div>

        {/* Error Message */}
        {errors.save && (
          <span style={{ color: "#ff4444", fontSize: 14 }}>
            {errors.save}
          </span>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
          onClick={handleCancel}
          disabled={saving}
          style={{
            padding: "8px 24px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 6,
            color: "#ffffff",
            fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.5 : 1,
          }}
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 24px",
            backgroundColor: "#007aff",
            border: "none",
            borderRadius: 6,
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
        </div>
      </div>

      {/* Main Area (96%) */}
      <div
        style={{
          height: "96%",
          display: "flex",
          flexDirection: "row",
        }}
      >
        {/* Left Sidebar (13%) */}
        <div
          style={{
            width: "13%",
            backgroundColor: "#2C2C2C",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Mall Settings */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
             <label style={{ display: "block", color: "rgba(255, 255, 255, 0.8)", fontSize: 13, marginBottom: 8, fontWeight: 500 }}>モール設定</label>
             <select
                value={mallSettings.mallId}
                onChange={async (e) => {
                  const newMallId = e.target.value;
                  const oldMallId = mallSettings.mallId;
                  if (newMallId === oldMallId) return;

                  // Update local mallId immediately
                  setMallId(newMallId);

                  // Load per-mall settings from file (or defaults if file doesn't exist)
                  try {
                    const { loadMallSettings, ensureMallSettingsFile } = await import('../utils/settings');
                    await ensureMallSettingsFile(newMallId);
                    const mallData = await loadMallSettings(newMallId);

                    // Apply all loaded settings to local state
                    setMallSettings({ ...mallData.mallSettings, mallId: newMallId as MallId });
                    setPictoSettings(mallData.pictoSettings);
                    setShopPositions(mallData.shopPositions);
                    setLocationIconSettings(mallData.locationIcons);

                    // Merge image settings with config defaults
                    const config = getMallConfig(newMallId as any);
                    const loaded = mallData.imageSettings;
                    setImageSettings({
                      floorMaps: {
                        "1F": loaded.floorMaps["1F"] || config.floorMaps["1F"],
                        "2F": loaded.floorMaps["2F"] || config.floorMaps["2F"],
                        "3F": loaded.floorMaps["3F"] || config.floorMaps["3F"],
                        "4F": loaded.floorMaps["4F"] || config.floorMaps["4F"],
                      } as Record<FloorId, string>,
                      openTimeImage: loaded.openTimeImage || "",
                    });
                  } catch (err) {
                    console.error('Failed to load settings for new mall:', err);
                    // Fallback: reset to defaults
                    const config = getMallConfig(newMallId as any);
                    setMallSettings({ ...DEFAULT_MALL_SETTINGS, mallId: newMallId as MallId });
                    setImageSettings({
                      floorMaps: { ...config.floorMaps } as Record<FloorId, string>,
                      openTimeImage: "",
                    });
                  }
                }}
                style={{ width: "100%", padding: "8px 12px", backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 6, color: "#ffffff", fontSize: 14 }}
             >
                <option value="suzaka" style={{ backgroundColor: "#2C2C2C", color: "#ffffff" }}>須坂</option>
                <option value="sendaikamisugi" style={{ backgroundColor: "#2C2C2C", color: "#ffffff" }}>仙台上杉</option>
             </select>
          </div>

          {/* Tabs */}
          <div style={{ flex: 1, padding: "16px 0" }}>
            {([
              { id: "floor" as TabType, label: "フロア設定", badge: 0 },
              { id: "image" as TabType, label: "画像", badge: 0 },
              { id: "shopPosition" as TabType, label: "座標設定", badge: unsetShopCount },
              { id: "picto" as TabType, label: "ピクトグラム設定", badge: 0 },
              { id: "mall" as TabType, label: "ジャンル設定", badge: 0 },
              { id: "blackScreen" as TabType, label: "ブラックスクリーン", badge: 0 },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  backgroundColor:
                    activeTab === tab.id ? "#007aff" : "transparent",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 15,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span style={{ backgroundColor: "#ff3b30", color: "#ffffff", borderRadius: 10, minWidth: 20, height: 20, padding: "0 5px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Center Preview (72%) */}
        <div
          ref={previewContainerRef}
          style={{
            width: "72%",
            backgroundColor: "#1C1C1C",
            position: "relative",
            overflow: "visible",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              overflow: "visible",
            }}
          >
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              limitToBounds={currentScale > 1}
              centerOnInit={false}
              wheel={{
                step: 0.05,
              }}
              doubleClick={{
                disabled: true,
              }}
              panning={{
                disabled: false,
              }}
              onInit={(ref) => {
                transformRef.current = ref;
                setCurrentScale(ref.state.scale);
                if (mapContentRef.current) {
                  mapContentRef.current.style.setProperty('--map-scale', ref.state.scale.toString());
                }
              }}
              onTransformed={(ref) => {
                setCurrentScale(ref.state.scale);
                if (mapContentRef.current) {
                  mapContentRef.current.style.setProperty('--map-scale', ref.state.scale.toString());
                }
              }}
            >
            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
              }}
              contentStyle={{
                width: "1460px",
                height: "1080px",
              }}
            >
              <div 
                ref={mapContentRef}
                style={{ width: "100%", height: "100%", position: "relative" }}
              >
              {(activeTab === "shopPosition" || activeTab === "picto" || activeTab === "image") && (
                <GidoApp
                  mallId={mallSettings.mallId}
                  locationIconSettings={getLocationIconSettingsForFloor(locationIconSettings, editingFloor)}
                  previewFloor={editingFloor}
                  imageSettings={imageSettings}
                  shopPositions={activeTab === "shopPosition" || activeTab === "picto" ? shopPositions : undefined}
                  shops={activeTab === "shopPosition" || activeTab === "picto" ? shops : undefined}
                  selectedShopId={activeTab === "shopPosition" ? selectedShopId : undefined}
                  showOnlyMap={activeTab === "shopPosition" || activeTab === "picto" || activeTab === "image"}
                  pictoSettings={activeTab === "picto" ? pictoSettings : undefined}
                  selectedPictoId={activeTab === "picto" ? selectedPictoId : undefined}
                  defaultFloorMaps={currentMallConfig.floorMaps}
                  diskFloorMaps={diskFloorMaps}
                />
              )}
              </div>
            </TransformComponent>
            </TransformWrapper>
          </div>

          {/* Zoom Controls */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 24,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <button
              onClick={handleZoomIn}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
            <button
              onClick={handleZoomOut}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              −
            </button>
            <button
              onClick={handleReset}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↻
            </button>
          </div>
        </div>

        {/* Right Edit Panel (15%) */}
        <div
          style={{
            width: "15%",
            backgroundColor: "#2C2C2C",
            borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
            overflowY: "auto",
            padding: "24px",
          }}
        >
          {activeTab === "floor" && (
            <FloorSettingsTab
              floor={currentFloor}
              onChangeFloor={setCurrentFloor}
            />
          )}
          {activeTab === "image" && (
            <ImageSettingsTab
              floor={editingFloor}
              onChangeFloor={setEditingFloor}
              imageSettings={imageSettings}
              onChangeImageSettings={setImageSettings}
              diskFloorMaps={diskFloorMaps}
              onDiskMapsUpdated={onDiskMapsUpdated}
              hostname={hostname}
            />
          )}
          {activeTab === "shopPosition" && (
            <ShopPositionSettingsTab
              floor={editingFloor}
              onChangeFloor={setEditingFloor}
              shopPositions={shopPositions}
              onChangeShopPositions={setShopPositions}
              shops={shops}
              onSelectedShopIdChange={setSelectedShopId}
              locationIconSettings={locationIconSettings}
              onChangeLocationIconSettings={setLocationIconSettings}
            />
          )}
          {activeTab === "picto" && (
            <PictoSettingsTab
              floor={editingFloor}
              onChangeFloor={setEditingFloor}
              pictoSettings={pictoSettings}
              onSavePictoSettings={setPictoSettings}
              selectedInstanceId={selectedPictoId}
              onSelectedInstanceIdChange={setSelectedPictoId}
              mallId={mallSettings.mallId}
            />
          )}
          {activeTab === "mall" && (
            <MallSettingsTab
              mallSettings={mallSettings}
              onChangeMallSettings={setMallSettings}
            />
          )}
          {activeTab === "blackScreen" && (
            <BlackScreenSettingsTab
              settings={blackScreenSettings}
              onChangeSettings={setBlackScreenSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedSettingsScreen;