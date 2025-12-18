// src/screens/UnifiedSettingsScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import GidoApp from "./GidoApp";
import type { LocationIconSettingsPerFloor } from "../types/locationIcon";
import { getLocationIconSettingsForFloor, DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR } from "../config";
import type { FloorId } from "../types/floorLayout";
import { ImageSettingsTab } from "../components/ImageSettingsTab";
import { ShopPositionSettingsTab } from "../components/ShopPositionSettingsTab";
import { FloorSettingsTab } from "../components/FloorSettingsTab";
import iconSvg from "../assets/icon.svg";
import type { ImageSettings } from "../types/imageSettings";
import type { ShopPositionSettings } from "../types/shopPosition";
import type { Shop } from "../types/shop";
import { PictoSettingsTab } from "../components/PictoSettingsTab";
import type { PictoSettings } from "../types/picto";
import { DEFAULT_PICTO_SETTINGS } from "../types/picto";

type TabType = "image" | "shopPosition" | "floor" | "picto";

// Export props interface to ensure visibility
export interface UnifiedSettingsScreenProps {
  isOpen: boolean;
  onClose: () => void;
  floor: FloorId;
  onSaveFloor: (floor: FloorId) => Promise<void> | void;
  locationIconSettings: LocationIconSettingsPerFloor;
  onSaveLocationIconSettings: (settings: LocationIconSettingsPerFloor) => Promise<void> | void;
  imageSettings: ImageSettings;
  onSaveImageSettings: (settings: ImageSettings) => Promise<void> | void;
  shopPositions: ShopPositionSettings;
  onSaveShopPositions: (settings: ShopPositionSettings) => Promise<void> | void;
  shops: Shop[];
  pictoSettings: PictoSettings;
  onSavePictoSettings: (settings: PictoSettings) => Promise<void> | void;
}

const UnifiedSettingsScreen: React.FC<UnifiedSettingsScreenProps> = ({
  isOpen,
  onClose,
  floor: initialFloor,
  onSaveFloor,
  locationIconSettings: initialLocationIconSettings,
  onSaveLocationIconSettings,
  imageSettings: initialImageSettings,
  onSaveImageSettings,
  shopPositions: initialShopPositions,
  onSaveShopPositions,
  shops,
  pictoSettings: initialPictoSettings,
  onSavePictoSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("image");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Local state for editing (preserved when switching tabs)
  const [floor, setFloor] = useState<FloorId>(initialFloor);
  const [locationIconSettings, setLocationIconSettings] =
    useState<LocationIconSettingsPerFloor>(initialLocationIconSettings || DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR);
  const [imageSettings, setImageSettings] = useState<ImageSettings>(initialImageSettings);
  const [shopPositions, setShopPositions] = useState<ShopPositionSettings>(initialShopPositions);
  const [pictoSettings, setPictoSettings] = useState<PictoSettings>(initialPictoSettings || DEFAULT_PICTO_SETTINGS);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedPictoId, setSelectedPictoId] = useState<string | null>(null);

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

  // Initialize / Reset values when opened
  useEffect(() => {
    // Only run initialization when isOpen changes from false to true
    if (isOpen && !prevIsOpen.current) {
      setActiveTab("floor");
      setFloor(initialFloor);
      setLocationIconSettings(initialLocationIconSettings);
      setImageSettings(initialImageSettings);
      setShopPositions(initialShopPositions);
      setPictoSettings(initialPictoSettings || DEFAULT_PICTO_SETTINGS);
      setErrors({});
      
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
  }, [isOpen, initialFloor, initialLocationIconSettings, initialImageSettings, initialShopPositions, calculateOtherTabCenterPosition]);

  const handleClose = () => {
    onClose();
    setErrors({});
  };

  const handleCancel = () => {
    // Revert to initial values
    setFloor(initialFloor);
    setLocationIconSettings(initialLocationIconSettings);
    setImageSettings(initialImageSettings);
    setShopPositions(initialShopPositions);
    setPictoSettings(initialPictoSettings || DEFAULT_PICTO_SETTINGS);
    setErrors({});
    // Reset transform - 現在のactiveTabに応じて適切な中央位置を計算
    if (transformRef.current && previewContainerRef.current) {
      requestAnimationFrame(() => {
        if (transformRef.current && previewContainerRef.current) {
          const { x, y, scale } = calculateCenterPositionForActiveTab();
          transformRef.current.setTransform(x, y, scale);
        }
      });
    }
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
      console.log("Saving settings...");
      
      // Save sequentially to avoid race conditions in main process file writing
      console.log("Saving floor...");
      await onSaveFloor(floor);
      
      console.log("Saving location icons...");
      await onSaveLocationIconSettings(locationIconSettings);
      
      console.log("Saving image settings...");
      await onSaveImageSettings(imageSettings);
      
      console.log("Saving shop positions...", shopPositions);
      await onSaveShopPositions(shopPositions);

      console.log("Saving picto settings...", pictoSettings);
      await onSavePictoSettings(pictoSettings);
      
      console.log("Settings saved successfully");
      handleClose();
    } catch (e) {
      console.error("Failed to save settings", e);
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
            src={iconSvg}
            alt="Gido Touch Mini"
            style={{
              width: 24,
              height: 24,
            }}
          />
          <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 600 }}>
            Gido Touch Mini - Settings
          </span>
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
          {/* Tabs */}
          <div style={{ flex: 1, padding: "16px 0" }}>
            {[
              { id: "floor" as TabType, label: "フロア設定" },
              { id: "image" as TabType, label: "画像" },
              { id: "shopPosition" as TabType, label: "座標設定" },
              { id: "picto" as TabType, label: "ピクトグラム設定" },
            ].map((tab) => (
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
                }}
              >
                {tab.label}
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
              {(activeTab === "shopPosition" || activeTab === "picto") && (
                <GidoApp
                  locationIconSettings={getLocationIconSettingsForFloor(locationIconSettings, floor)}
                  previewFloor={floor}
                  imageSettings={imageSettings}
                  shopPositions={activeTab === "shopPosition" || activeTab === "picto" ? shopPositions : undefined}
                  shops={activeTab === "shopPosition" || activeTab === "picto" ? shops : undefined}
                  selectedShopId={activeTab === "shopPosition" ? selectedShopId : undefined}
                  showOnlyMap={activeTab === "shopPosition" || activeTab === "picto"}
                  pictoSettings={activeTab === "picto" ? pictoSettings : undefined}
                  selectedPictoId={activeTab === "picto" ? selectedPictoId : undefined}
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
              floor={floor}
              onChangeFloor={setFloor}
            />
          )}
          {activeTab === "image" && (
            <ImageSettingsTab
              floor={floor}
              onChangeFloor={setFloor}
              imageSettings={imageSettings}
              onChangeImageSettings={setImageSettings}
            />
          )}
          {activeTab === "shopPosition" && (
            <ShopPositionSettingsTab
              floor={floor}
              onChangeFloor={setFloor}
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
              floor={floor}
              onChangeFloor={setFloor}
              pictoSettings={pictoSettings}
              onSavePictoSettings={setPictoSettings}
              selectedInstanceId={selectedPictoId}
              onSelectedInstanceIdChange={setSelectedPictoId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedSettingsScreen;