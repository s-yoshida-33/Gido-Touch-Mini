// src/screens/GidoApp.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";

import ShopList from "../components/ShopList";
import type { Shop } from "../types/shop";
import { APP_CONFIG, getLocationIconSettingsForFloor } from "../config";
import type { LocationIconSettings, LocationIconSettingsPerFloor } from "../types/locationIcon";
import type { ImageSettings } from "../types/imageSettings";
import type { ShopPositionSettings } from "../types/shopPosition";
import type { PictoSettings } from "../types/picto";
import type { MallId } from "../types/mall";
import type { FloorId } from "../types/floorLayout";
import { getMallAssetUrl, loadPictoIcon } from "../utils/assets";
import { logInfo, logError } from "../logs/logging";
import { LocationIconsOverlay } from "../components/LocationIconsOverlay";
import { ShopPin } from "../components/ShopPin";
import { PictoPin } from "../components/PictoPin";


// Placeholder for openTimeImage if not in settings (optional fallback)
// const openTimeImageDefault = getMallAssetUrl("suzaka", "open-time/ja", "open-time.svg");

const LIST_HEIGHT_VH = APP_CONFIG.listHeightVh;
const TOP_HEIGHT_VH = 100 - LIST_HEIGHT_VH;

// Constants for consistent scaling across the app.
// We use 1920px as the standard reference width (Full HD).
const REFERENCE_MAP_WIDTH = 1920;
const DEFAULT_PIN_SIZE = 80;

interface GidoAppProps {
  locationIconSettings: LocationIconSettings | LocationIconSettingsPerFloor;
  previewFloor?: string;
  imageSettings?: ImageSettings;
  shopPositions?: ShopPositionSettings;
  shops?: Shop[];
  selectedShopId?: string | null;
  showOnlyMap?: boolean;
  pictoSettings?: PictoSettings;
  selectedPictoId?: string | null;
  mallId?: MallId; // Add
  defaultFloorMaps?: Record<string, string>; // Add
}

const GidoApp: React.FC<GidoAppProps> = ({
  locationIconSettings,
  previewFloor,
  imageSettings,
  shopPositions,
  shops: previewShops,
  selectedShopId,
  showOnlyMap = false,
  pictoSettings,
  selectedPictoId,
  mallId = "suzaka", // Default
  defaultFloorMaps,
}) => {
  const shops = useMemo(() => previewShops || [], [previewShops]);

  const [floor, setFloor] = useState<string>(
    previewFloor ?? APP_CONFIG.floor
  );

  // Floor is managed by parent (App.tsx) and passed via previewFloor prop.
  useEffect(() => {
    if (previewFloor !== undefined) {
      setFloor(previewFloor);
    }
  }, [previewFloor]);

  const floorId = floor as FloorId;
  // Get floor map from imageSettings or use default path
  const customFloorMap = floorId ? imageSettings?.floorMaps?.[floorId] : undefined;
  const floorMap = customFloorMap || (defaultFloorMaps ? defaultFloorMaps[floor] : undefined) || "";

  // Memoize locationIconSettings resolution
  const resolvedLocationIconSettings = useMemo(() => {
    return '1F' in locationIconSettings || '2F' in locationIconSettings
      ? getLocationIconSettingsForFloor(locationIconSettings as LocationIconSettingsPerFloor, floor as FloorId)
      : locationIconSettings as LocationIconSettings;
  }, [locationIconSettings, floor]);

  // Calculate default open time image based on current mallId
  const defaultOpenTimeImage = useMemo(() => {
    return getMallAssetUrl(mallId || "suzaka", "open-time/ja", "open-time.svg");
  }, [mallId]);

  if (showOnlyMap) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
          fontFamily: "'Rounded Mplus 1c', sans-serif",
          fontWeight: 700,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ShopPinsOverlay
          floor={floor}
          floorMap={floorMap}
          locationIconSettings={resolvedLocationIconSettings}
          shopPositions={shopPositions}
          shops={shops}
          selectedShopId={selectedShopId}
          pictoSettings={pictoSettings}
          selectedPictoId={selectedPictoId}
          mallId={mallId}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden", // Prevent scrolling
        fontFamily: "'Rounded Mplus 1c', sans-serif",
        fontWeight: 700,
      }}
    >
      <div
        style={{
          display: "flex",
          height: `${TOP_HEIGHT_VH}vh`,
        }}
      >
        <ShopPinsOverlay
          floor={floor}
          floorMap={floorMap}
          locationIconSettings={resolvedLocationIconSettings}
          shopPositions={shopPositions}
          shops={shops}
          selectedShopId={selectedShopId}
          pictoSettings={pictoSettings}
          selectedPictoId={selectedPictoId}
          mallId={mallId}
        />
      </div>

      <div
        style={{
          height: `${LIST_HEIGHT_VH}vh`,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden", // Ensure inner content doesn't overflow
        }}
      >
        <div
          style={{
            flex: 1, // Fill available space
            minWidth: 0, // Allow flex item to shrink below content size
            height: "100%",
          }}
        >
          <ShopList
            shops={shops}
            floor={floor}
          />
        </div>

        <div
          style={{
            // Keep the aspect ratio of the original video slot for the bottom-right image area
            // or just use auto width based on height.
            // Using a fixed aspect ratio similar to 9:16 relative to screen height might be too wide?
            // Let's use a fixed percentage width or auto based on image.
            // For now, let's give it a fixed proportion roughly equal to the previous design
            // but ensuring it fits nicely.
            width: "20vw", 
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#fff",
            flexShrink: 0, // Don't shrink below this width
            borderLeft: "1px solid #eee", // Optional separator
          }}
        >
          <img
            src={imageSettings?.openTimeImage || defaultOpenTimeImage}
            alt="Open Time"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              padding: "1em",
            }}
            onLoad={() => {
              logInfo("ASSET_RESOLVE", "Open-time image loaded", {
                src: imageSettings?.openTimeImage || defaultOpenTimeImage,
              });
            }}
            onError={(event) => {
              logError("ASSET_RESOLVE", "Failed to load open-time image", {
                src: imageSettings?.openTimeImage || defaultOpenTimeImage,
              });
              (event.target as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        </div>
      </div>

    </div>
  );
};

// Helper function to calculate actual image dimensions and offsets within a container
// considering 'object-fit: contain' behavior.
function calculateImageRect(
  containerWidth: number,
  containerHeight: number,
  imageNaturalWidth: number,
  imageNaturalHeight: number
) {
  const containerAspect = containerWidth / containerHeight;
  const imageAspect = imageNaturalWidth / imageNaturalHeight;

  let displayWidth, displayHeight, offsetX, offsetY;

  if (containerAspect > imageAspect) {
    // Container is wider than image -> Image fits by height
    displayHeight = containerHeight;
    displayWidth = displayHeight * imageAspect;
    offsetY = 0;
    offsetX = (containerWidth - displayWidth) / 2;
  } else {
    // Container is taller than image -> Image fits by width
    displayWidth = containerWidth;
    displayHeight = displayWidth / imageAspect;
    offsetX = 0;
    offsetY = (containerHeight - displayHeight) / 2;
  }

  // Use Math.round to prevent sub-pixel rendering issues which might cause slight visual offsets
  return { 
    displayWidth: Math.round(displayWidth), 
    displayHeight: Math.round(displayHeight), 
    offsetX: Math.round(offsetX), 
    offsetY: Math.round(offsetY) 
  };
}

// Animation variants for PictoPins (same logic as map)
const pictoVariants: Variants = {
  enter: (direction: number) => {
      // If direction is 0 (initial load), don't slide
      if (direction === 0) {
        return {
          y: 0,
          opacity: 0,
        };
      }
      return {
        y: direction > 0 ? -200 : 200,
        opacity: 0,
      };
    },
  center: {
    zIndex: 1,
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
       // If direction is 0, just fade out
       if (direction === 0) {
        return {
          zIndex: 0,
          opacity: 0,
        };
      }
      return {
        zIndex: 0,
        y: direction > 0 ? 200 : -200,
        opacity: 0,
      };
    },
};

/**
 * ShopPinsOverlay Component
 * Displays the floor map and overlays shop pins.
 * Uses exact math to determine image boundaries for consistent pin positioning.
 */
const ShopPinsOverlay: React.FC<{
  floor: string;
  floorMap: string;
  locationIconSettings: LocationIconSettings;
  shopPositions?: ShopPositionSettings;
  shops?: Shop[];
  selectedShopId?: string | null;
  pictoSettings?: PictoSettings;
  selectedPictoId?: string | null;
  mallId?: string;
}> = ({ floor, floorMap, locationIconSettings, shopPositions, shops, selectedShopId, pictoSettings, selectedPictoId, mallId = "suzaka" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageMetrics, setImageMetrics] = useState<{ 
    displayWidth: number; 
    displayHeight: number; 
    offsetX: number; 
    offsetY: number;
  } | null>(null);

  const normalizeFloor = (value: string): string => {
    const normalized = value.toUpperCase().trim();
    if (normalized.match(/^[0-9]+F$/)) {
      return normalized;
    }
    // Handle "1", "2" etc.
    if (normalized.match(/^[0-9]+$/)) {
      return `${normalized}F`;
    }
    return "1F";
  };

  const normalizedFloor = useMemo(() => normalizeFloor(floor), [floor]);

  // Update image metrics on resize or load
  const updateMetrics = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;
    const img = imageRef.current;
    
    if (!img.complete || img.naturalWidth === 0) return;

    const metrics = calculateImageRect(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
      img.naturalWidth,
      img.naturalHeight
    );
    setImageMetrics(metrics);
  }, []);

  // Request Animation Frame ref for resize optimization
  const rafId = useRef<number | null>(null);

  const handleResize = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      updateMetrics();
      rafId.current = null;
    });
  }, [updateMetrics]);

  useEffect(() => {
    const img = imageRef.current;
    if (img) {
      if (img.complete) updateMetrics();
      else img.addEventListener('load', updateMetrics);
    }
    
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      img?.removeEventListener('load', updateMetrics);
      resizeObserver.disconnect();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [floorMap, updateMetrics, handleResize]);

  const safeShopPositions = shopPositions || { positions: {} };
  const safeShops = shops || [];
  const positions = safeShopPositions.positions || {};

  // Memoize rendered shop pins
  const shopPins = useMemo(() => {
    if (!shopPositions || !imageMetrics) return null;

    return Object.entries(positions)
      .filter(([shopId]) => {
        if (selectedShopId) return shopId === selectedShopId;
        return false;
      })
      .map(([shopId, position]) => {
        if (!position || !position.floor || position.floor !== normalizedFloor) return null;
        const shop = safeShops.find((s) => (s.shopId || s.number) === shopId);
        if (!shop || !shop.name) return null;
        
        const normalizedPosition = {
          ...position,
          x: position.x <= 1 ? position.x * 100 : position.x,
          y: position.y <= 1 ? position.y * 100 : position.y,
        };

        // --- Consistent Scaling Logic ---
        // Scale pin size based on the map width ratio (Current / 1920)
        const scaleRatio = imageMetrics.displayWidth / REFERENCE_MAP_WIDTH;
        const basePinSize = normalizedPosition.size ?? DEFAULT_PIN_SIZE;
        const scaledPinSize = basePinSize * scaleRatio;
        
        // Apply scaled size to the render position
        const renderPosition = {
          ...normalizedPosition,
          size: scaledPinSize
        };

        // Calculate Pixel Coordinates directly mapped to image dimensions.
        const xPercent = renderPosition.x / 100;
        const yPercent = renderPosition.y / 100;

        const pixelX = Math.round(imageMetrics.offsetX + (xPercent * imageMetrics.displayWidth));
        const pixelY = Math.round(imageMetrics.offsetY + (yPercent * imageMetrics.displayHeight));

        return (
          <ShopPin
            key={shopId}
            position={renderPosition}
            usePixelPosition={true}
            pixelX={pixelX}
            pixelY={pixelY}
            shopName={shop.name}
            isSelected={selectedShopId === shopId}
            shopLogo={shop.shopLogo}
            shopId={shop.shopId || shop.number}
          />
        );
      });
  }, [shopPositions, imageMetrics, positions, selectedShopId, normalizedFloor, safeShops]);

  // Common logic for processing picto instances
  const processPictoInstances = useCallback(async (instances: PictoSettings['instances']) => {
    if (!imageMetrics) return [];
    
    const results = await Promise.all(
      Object.values(instances)
        .filter(instance => instance.floor === normalizedFloor)
        .map(async (instance) => {
          // Load icon dynamically from mall-specific directory
          // Extract base name from iconName (e.g., "info.svg" -> "info", "priorityRestroom.svg" -> "priorityRestroom")
          // iconName may be like "info.svg", "priorityRestroom.svg", etc.
          const baseName = instance.iconName.replace('.svg', '').replace('button-', '');
          // Load icon (not button, not highlight)
          const iconUrl = await loadPictoIcon(mallId, "ja", baseName, false, false);
          
          // Debug log if icon not found
          if (!iconUrl) {
            console.warn(`Picto icon not found: ${instance.iconName} (baseName: ${baseName}) for mallId: ${mallId}`);
          }
          
          if (!iconUrl) return null;

         // Calculate pixel position
         const xPercent = instance.x / 100;
         const yPercent = instance.y / 100;
         
         // Round pixel coordinates to prevent sub-pixel rendering artifacts (jitter/blur)
         const pixelX = Math.round(imageMetrics.offsetX + (xPercent * imageMetrics.displayWidth));
         const pixelY = Math.round(imageMetrics.offsetY + (yPercent * imageMetrics.displayHeight));

         // Apply scale ratio for consistency with map zoom
         const scaleRatio = imageMetrics.displayWidth / REFERENCE_MAP_WIDTH;
         
         // Create a modified instance with scaled size for rendering
         const scaledInstance = {
           ...instance,
           size: (instance.size || 80) * scaleRatio
         };

         return {
            instance,
            scaledInstance,
            iconUrl,
            pixelX,
            pixelY
         };
      })
    );
    
    return results.filter((item): item is NonNullable<typeof item> => item !== null);
  }, [imageMetrics, normalizedFloor, mallId]);

  // Load picto data asynchronously
  const [pictoData, setPictoData] = useState<Array<{
    instance: any;
    scaledInstance: any;
    iconUrl: string;
    pixelX: number;
    pixelY: number;
  }>>([]);

  useEffect(() => {
    if (!pictoSettings || !imageMetrics) {
      setPictoData([]);
      return;
    }
    processPictoInstances(pictoSettings.instances).then(setPictoData);
  }, [pictoSettings, imageMetrics, processPictoInstances]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 2,
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden", // Ensure no overflow
      }}
    >
      <img
        ref={imageRef}
        src={floorMap}
        alt={`Floor map ${floor}`}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block"
        }}
        onLoad={() => {
          logInfo("map", "Floor map image loaded", { floor, src: floorMap });
          updateMetrics();
        }}
        onError={(event) => {
          logError("map", "Failed to load floor map image", { floor, src: floorMap });
          (event.target as HTMLImageElement).style.visibility = "hidden";
        }}
      />

      {imageMetrics && (
        <LocationIconsOverlay
          settings={{
            speechBubble: {
              ...locationIconSettings.speechBubble,
              size: locationIconSettings.speechBubble.size * (imageMetrics.displayWidth / REFERENCE_MAP_WIDTH),
            },
            location: {
              ...locationIconSettings.location,
              size: locationIconSettings.location.size * (imageMetrics.displayWidth / REFERENCE_MAP_WIDTH),
            },
          }}
          mapMetrics={{
            width: imageMetrics.displayWidth,
            height: imageMetrics.displayHeight
          }}
        />
      )}

      {shopPins}

      {/* Picto Pins */}
      <AnimatePresence initial={false} custom={floor === "2F" ? 1 : -1} mode="popLayout"> 
      {/* Ripple Layer */}
      {pictoData.map(({ instance, scaledInstance, iconUrl, pixelX, pixelY }) => (
             <motion.div
               key={`${instance.id}-ripple`}
               variants={pictoVariants}
               initial="enter"
               animate="center"
               exit="exit"
               custom={floor === "2F" ? 1 : -1}
               style={{
                 position: "absolute",
                 top: 0,
                 left: 0,
                 width: "100%",
                 height: "100%",
                 pointerEvents: "none",
                 zIndex: 1 // Ripple layer - low z-index
               }}
             >
               <PictoPin
                 instance={scaledInstance}
                 iconUrl={iconUrl}
                 usePixelPosition={true}
                 pixelX={pixelX}
                 pixelY={pixelY}
                 // Add highlight logic if needed (e.g. matching selectedShopId equivalent for pictos)
                 isSelected={instance.id === selectedPictoId} 
                 renderMode="ripple"
               />
             </motion.div>
           ))
      }
      </AnimatePresence>

      <AnimatePresence initial={false} custom={floor === "2F" ? 1 : -1} mode="popLayout">
      {/* Icon Layer */}
      {pictoData.map(({ instance, scaledInstance, iconUrl, pixelX, pixelY }) => (
             <motion.div
               key={`${instance.id}-icon`}
               variants={pictoVariants}
               initial="enter"
               animate="center"
               exit="exit"
               custom={floor === "2F" ? 1 : -1}
               style={{
                 position: "absolute",
                 top: 0,
                 left: 0,
                 width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: instance.id === selectedPictoId ? 200 : 5 // Icon layer - higher z-index if selected
              }}
            >
               <PictoPin
                 instance={scaledInstance}
                 iconUrl={iconUrl}
                 usePixelPosition={true}
                 pixelX={pixelX}
                 pixelY={pixelY}
                 isSelected={instance.id === selectedPictoId} 
                 renderMode="icon"
               />
             </motion.div>
           ))
      }
      </AnimatePresence>
    </div>
  );
};

export default GidoApp;
