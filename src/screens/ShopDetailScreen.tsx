// src/screens/ShopDetailScreen.tsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { CloseButton } from "../components/CloseButton";
import floor1FMap from "../assets/floor-1F-map.svg";
import floor2FMap from "../assets/floor-2F-map.svg";
import floor3FMap from "../assets/floor-3F-map.svg";
import floor4FMap from "../assets/floor-4F-map.svg";
import { FloorLabel } from "../components/FloorLabel";
import zoomIn from "../assets/zoom-in.svg";
import zoomOut from "../assets/zoom-out.svg";
import zoomInHighlight from "../assets/zoom-in-highlight.svg";
import zoomOutHighlight from "../assets/zoom-out-highlight.svg";
import reset from "../assets/reset.svg";
import resetHighlight from "../assets/reset-highlight.svg";
import iconLocation from "../assets/icon-location.svg";
import iconTime from "../assets/icon-time.svg";
import iconTel from "../assets/icon-tel.svg";
import type { Shop } from "../types/shop";
import { ShopPin } from "../components/ShopPin";

// Constants for consistent scaling (must match GidoApp)
const REFERENCE_MAP_WIDTH = 1920; // Keep reference width same as map source resolution
const DEFAULT_PIN_SIZE = 40; // Scaled down from 80

function buildImagePath(photo: string | undefined, shopId: string | undefined): string {
  if (!photo) return "";
  if (photo.match(/^[A-Za-z]:[\\/]/)) return photo.replace(/\\/g, "/");
  if (photo.startsWith("file://") || photo.startsWith("http://") || photo.startsWith("https://") || photo.startsWith("data:")) return photo;
  if (photo.startsWith("/") || photo.startsWith("\\")) {
    if (photo.startsWith("\\\\")) return photo;
    if (photo.startsWith("/")) return photo;
  }
  if (shopId) {
    if (photo.includes(`shop/${shopId}/`) || photo.includes(`shop\\${shopId}\\`)) return photo;
    const normalized = photo.replace(/\\/g, "/");
    const clean = normalized.startsWith("/") ? normalized.slice(1) : normalized;
    if (!clean.includes("/")) return `files/shop/${shopId}/${clean}`;
    if (clean.startsWith("files/shop/")) return clean;
    return `files/shop/${shopId}/${clean}`;
  }
  return photo;
}

function toFileUrl(filePath: string): string {
  if (!filePath) return "";
  if (filePath.startsWith("file://") || filePath.startsWith("http://") || filePath.startsWith("https://") || filePath.startsWith("data:")) return filePath;
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.match(/^[A-Za-z]:\//)) return `file:///${normalized}`;
  if (normalized.startsWith("/")) return `file://${normalized}`;
  return `file:///${normalized}`;
}

// Helper function to calculate actual image dimensions (Same as GidoApp)
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

  // Use Math.round to prevent sub-pixel rendering issues
  return { 
    displayWidth: Math.round(displayWidth), 
    displayHeight: Math.round(displayHeight), 
    offsetX: Math.round(offsetX), 
    offsetY: Math.round(offsetY) 
  };
}

const ShopLogoImage: React.FC<{ photo: string | undefined; shopId: string | undefined }> = ({ photo, shopId }) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!photo) { setIsLoading(false); setHasError(true); return; }
    const loadImage = async () => {
      const imagePath = buildImagePath(photo, shopId);
      if (!imagePath) { setIsLoading(false); setHasError(true); return; }
      const electronAPI = window.electronAPI;
      if (electronAPI && electronAPI.getShopImage) {
        try {
          const normalizedPath = imagePath.replace(/\\/g, "/");
          const dataUrl = await electronAPI.getShopImage(normalizedPath);
          if (dataUrl) { setImageUrl(dataUrl); setIsLoading(false); setHasError(false); return; }
        } catch (error) { console.error(error); setHasError(true); }
      }
      const fileUrl = toFileUrl(imagePath);
      setImageUrl(fileUrl);
      setIsLoading(false);
    };
    loadImage();
  }, [photo, shopId]);

  if (hasError || (!imageUrl && !isLoading) || imageUrl === "") return null;
  if (isLoading || !imageUrl) return null;

  return (
    <img src={imageUrl} alt="" draggable={false} onDragStart={(e) => e.preventDefault()} style={{ width: "100%", height: "100%", objectFit: "contain", userSelect: "none", pointerEvents: "auto", display: "block" }} onError={(e) => { setHasError(true); (e.target as HTMLImageElement).style.display = "none"; }} />
  );
};

const ShopImage: React.FC<{ photo: string | undefined; shopId: string | undefined }> = ({ photo, shopId }) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!photo) { setIsLoading(false); return; }
    const loadImage = async () => {
      const imagePath = buildImagePath(photo, shopId);
      if (!imagePath) { setIsLoading(false); return; }
      const electronAPI = window.electronAPI;
      if (electronAPI && electronAPI.getShopImage) {
        try {
          const normalizedPath = imagePath.replace(/\\/g, "/");
          const dataUrl = await electronAPI.getShopImage(normalizedPath);
          if (dataUrl) { setImageUrl(dataUrl); setIsLoading(false); return; }
        } catch (error) { console.error(error); }
      }
      const fileUrl = toFileUrl(imagePath);
      setImageUrl(fileUrl);
      setIsLoading(false);
    };
    loadImage();
  }, [photo, shopId]);

  if (!photo || (!imageUrl && !isLoading)) return <span style={{ color: "#FFFFFF", fontSize: "12px", fontWeight: 700 }}>Image</span>;

  return (
    <img src={imageUrl || undefined} alt="" draggable={false} onDragStart={(e) => e.preventDefault()} style={{ width: "100%", height: "100%", objectFit: "contain", userSelect: "none", pointerEvents: "auto", display: isLoading ? "none" : "block" }} onError={(e) => { const target = e.target as HTMLImageElement; target.style.display = "none"; if (target.parentElement) { target.parentElement.style.backgroundColor = "#333333"; target.parentElement.style.color = "#FFFFFF"; target.parentElement.style.fontSize = "12px"; target.parentElement.style.fontWeight = "700"; target.parentElement.textContent = "Image"; } }} />
  );
};

function normalizeFloor(value: string): string {
  if (!value) return "";
  const m = value.match(/(\d+)/);
  return m ? `${m[1]}F` : value;
}

const MapWithPinsComponent: React.FC<{
  mapImage: string;
  normalizedFloor: string;
  shopPosition?: Shop["position"];
  shopName: string;
  shopLogo?: string;
  shopId?: string;
  currentScale: number;
}> = ({ mapImage, normalizedFloor, shopPosition, shopName, shopLogo, shopId, currentScale }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageMetrics, setImageMetrics] = useState<{ 
    displayWidth: number; 
    displayHeight: number; 
    offsetX: number; 
    offsetY: number;
  } | null>(null);

  // Update metrics based on actual container and image size
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

  useEffect(() => {
    const img = imageRef.current;
    if (img) {
      if (img.complete) updateMetrics();
      else img.addEventListener('load', updateMetrics);
    }
    
    const resizeObserver = new ResizeObserver(updateMetrics);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      img?.removeEventListener('load', updateMetrics);
      resizeObserver.disconnect();
    };
  }, [mapImage, updateMetrics]);

  const shouldShowPin = shopPosition && shopPosition.floor === normalizedFloor && imageMetrics;

  // Calculate Render Props
  let renderPosition = shopPosition;
  let pixelX = 0;
  let pixelY = 0;

  if (shouldShowPin && imageMetrics && shopPosition) {
    // 1. Normalize position to 0-100 scale
    const normalizedX = shopPosition.x <= 1 ? shopPosition.x * 100 : shopPosition.x;
    const normalizedY = shopPosition.y <= 1 ? shopPosition.y * 100 : shopPosition.y;

    // 2. Scale pin size consistent with GidoApp
    const scaleRatio = imageMetrics.displayWidth / REFERENCE_MAP_WIDTH;
    const basePinSize = shopPosition.size ?? DEFAULT_PIN_SIZE;
    const scaledPinSize = basePinSize * scaleRatio;

    renderPosition = {
      ...shopPosition,
      x: normalizedX,
      y: normalizedY,
      size: scaledPinSize
    };

    // 3. Calculate exact pixel coordinates (0% = Image Left, 100% = Image Right)
    const xPercent = normalizedX / 100;
    const yPercent = normalizedY / 100;

    pixelX = Math.round(imageMetrics.offsetX + (xPercent * imageMetrics.displayWidth));
    pixelY = Math.round(imageMetrics.offsetY + (yPercent * imageMetrics.displayHeight));
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden"
      }}
    >
      <img
        ref={imageRef}
        src={mapImage}
        alt={`${normalizedFloor} map`}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
      />
      
      {shouldShowPin && renderPosition && (
        <ShopPin
          position={renderPosition}
          shopName={shopName}
          shopLogo={shopLogo}
          shopId={shopId}
          transformScale={currentScale}
          usePixelPosition={true}
          pixelX={pixelX}
          pixelY={pixelY}
        />
      )}
    </div>
  );
};

const ShopNameDisplay: React.FC<{ name: string; width: string; fontSize: string }> = ({ name, width, fontSize }) => {
  return (
    <div style={{ fontSize: fontSize, fontFamily: "'Rounded Mplus 1c', sans-serif", fontWeight: 700, lineHeight: "1.4", width: width, flexShrink: 0, wordWrap: "break-word" }}>
      {name}
    </div>
  );
};

interface ShopDetailScreenProps {
  shop: Shop;
  onClose: () => void;
  language?: "ja" | "en";
}

const ShopDetailScreen: React.FC<ShopDetailScreenProps> = ({ shop, onClose, language = "ja" }) => {
  const transformRef = useRef<any>(null);
  const [currentScale, setCurrentScale] = useState(1);
  const [zoomInHovered, setZoomInHovered] = useState(false);
  const [zoomOutHovered, setZoomOutHovered] = useState(false);
  const [zoomInClicked, setZoomInClicked] = useState(false);
  const [zoomOutClicked, setZoomOutClicked] = useState(false);
  const [resetHovered, setResetHovered] = useState(false);
  const [resetClicked, setResetClicked] = useState(false);
  const [closeButtonPressed, setCloseButtonPressed] = useState(false);
  const displayAreaRef = useRef<HTMLDivElement>(null);

  const floor = shop.floors && shop.floors.length > 0 ? shop.floors[0] : "";
  const normalizedFloor = normalizeFloor(String(floor));

  // Language display logic
  const displayShopName = (language === "en" && shop.nameEn) ? shop.nameEn : shop.name;
  
  const displayGenreMemo = React.useMemo(() => {
    if (language === "en" && shop.genreMemoEn) {
      return shop.genreMemoEn;
    }
    if (shop.genreMemo) {
      return shop.genreMemo.split(/[|]+/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 2).join(" / ");
    }
    return "";
  }, [shop, language]);

  const getMapImage = () => {
    switch (normalizedFloor) {
      case "1F": return floor1FMap;
      case "2F": return floor2FMap;
      case "3F": return floor3FMap;
      case "4F": return floor4FMap;
      default: return floor1FMap;
    }
  };
  const mapImage = getMapImage();

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ width: "1250px", height: "840px", backgroundColor: "#FFFFFF", borderRadius: "25px", position: "relative", display: "flex", flexDirection: "row", overflow: "hidden" }}>
        <div style={{ flex: 1, width: "900px", height: "100%", backgroundColor: "#D9D9D9", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div ref={displayAreaRef} style={{ width: "850px", height: "790px", backgroundColor: "#FFFFFF", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: "15px", left: "15px", zIndex: 10, pointerEvents: "none", width: "50%" }}>
              <FloorLabel floor={normalizedFloor as "1F" | "2F" | "3F" | "4F"} style={{ width: "100%", aspectRatio: "3/2" }} />
            </div>
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              limitToBounds={currentScale > 1}
              centerOnInit={true}
              wheel={{ step: 0.05 }}
              doubleClick={{ disabled: true }}
              panning={{ disabled: currentScale === 1 }}
              onInit={(ref) => { transformRef.current = ref; setCurrentScale(ref.state.scale); }}
              onTransformed={(ref) => { setCurrentScale(ref.state.scale); }}
            >
              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapWithPinsComponent
                  mapImage={mapImage}
                  normalizedFloor={normalizedFloor}
                  shopPosition={shop.position}
                  shopName={displayShopName}
                  shopLogo={shop.shopLogo}
                  shopId={shop.shopId || shop.number}
                  currentScale={currentScale}
                />
              </TransformComponent>
            </TransformWrapper>
            <div style={{ position: "absolute", bottom: "15px", left: "15px", zIndex: 10, display: "flex", flexDirection: "column", gap: "0px", borderRadius: "25px", overflow: "hidden", boxShadow: "0 0px 6px rgba(0, 0, 0, 0.3)" }}>
              {/* Zoom In Button */}
              <div
                style={{ position: "relative", cursor: "pointer", width: "40px", height: "40px" }}
                onMouseEnter={() => setZoomInHovered(true)}
                onMouseLeave={() => { setZoomInHovered(false); setZoomInClicked(false); }}
                onMouseDown={() => setZoomInClicked(true)}
                onMouseUp={() => setZoomInClicked(false)}
                onTouchStart={() => setZoomInClicked(true)}
                onTouchEnd={() => setZoomInClicked(false)}
                onTouchCancel={() => setZoomInClicked(false)}
                onClick={() => {
                  setZoomInHovered(false);
                  setZoomInClicked(false);
                  if (transformRef.current) transformRef.current.zoomIn();
                }}
              >
                <img src={zoomIn} alt="Zoom in" draggable={false} style={{ display: "block", width: "100%", height: "100%" }} />
                <img src={zoomInHighlight} alt="Highlight" draggable={false} style={{ position: "absolute", top: 0, left: 0, display: "block", width: "100%", height: "100%", opacity: zoomInHovered || zoomInClicked ? 1 : 0, transition: "opacity 0.3s ease-in-out", pointerEvents: "none" }} />
              </div>
              {/* Zoom Out Button */}
              <div
                style={{ position: "relative", cursor: "pointer", width: "40px", height: "40px" }}
                onMouseEnter={() => setZoomOutHovered(true)}
                onMouseLeave={() => { setZoomOutHovered(false); setZoomOutClicked(false); }}
                onMouseDown={() => setZoomOutClicked(true)}
                onMouseUp={() => setZoomOutClicked(false)}
                onTouchStart={() => setZoomOutClicked(true)}
                onTouchEnd={() => setZoomOutClicked(false)}
                onTouchCancel={() => setZoomOutClicked(false)}
                onClick={() => {
                  setZoomOutHovered(false);
                  setZoomOutClicked(false);
                  if (transformRef.current) transformRef.current.zoomOut();
                }}
              >
                <img src={zoomOut} alt="Zoom out" draggable={false} style={{ display: "block", width: "100%", height: "100%" }} />
                <img src={zoomOutHighlight} alt="Highlight" draggable={false} style={{ position: "absolute", top: 0, left: 0, display: "block", width: "100%", height: "100%", opacity: zoomOutHovered || zoomOutClicked ? 1 : 0, transition: "opacity 0.3s ease-in-out", pointerEvents: "none" }} />
              </div>
            </div>
            <div style={{ position: "absolute", bottom: "15px", right: "15px", zIndex: 10 }}>
              <div
                style={{ position: "relative", cursor: "pointer", boxShadow: "0 0px 6px rgba(0, 0, 0, 0.3)", borderRadius: "25px", overflow: "hidden", width: "40px", height: "40px" }}
                onMouseEnter={() => setResetHovered(true)}
                onMouseLeave={() => { setResetHovered(false); setResetClicked(false); }}
                onMouseDown={() => setResetClicked(true)}
                onMouseUp={() => setResetClicked(false)}
                onTouchStart={() => setResetClicked(true)}
                onTouchEnd={() => setResetClicked(false)}
                onTouchCancel={() => setResetClicked(false)}
                onClick={() => {
                  setResetHovered(false);
                  setResetClicked(false);
                  if (transformRef.current) transformRef.current.resetTransform();
                }}
              >
                <img src={reset} alt="Reset" draggable={false} style={{ display: "block", width: "100%", height: "100%" }} />
                <img src={resetHighlight} alt="Highlight" draggable={false} style={{ position: "absolute", top: 0, left: 0, display: "block", width: "100%", height: "100%", opacity: resetHovered || resetClicked ? 1 : 0, transition: "opacity 0.3s ease-in-out", pointerEvents: "none" }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ width: "350px", height: "100%", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ width: "100%", height: "197px", backgroundColor: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            <ShopImage photo={shop.photo2 || shop.photo1} shopId={shop.shopId} />
          </div>
          
          <div style={{ marginTop: "25px", marginLeft: "15px", marginRight: "15px", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {(shop.shopLogo || shop.shopId) && (
              <div style={{ width: "100px", height: "100px", borderRadius: "10px", border: "1px solid #D9D9D9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#FFFFFF", boxSizing: "border-box", padding: "5px", flexShrink: 0 }}>
                <ShopLogoImage photo={shop.shopLogo || (shop.shopId ? `files/shop/${shop.shopId}/shop_logo.png` : undefined)} shopId={shop.shopId} />
              </div>
            )}
            <ShopNameDisplay name={displayShopName} width="205px" fontSize="16px" />
          </div>

          <div style={{ 
            flexGrow: 0,
            flexShrink: 1,
            flexBasis: "auto",
            overflowY: "auto", 
            minHeight: 0,
            width: "320px", 
            marginLeft: "15px", 
            marginRight: "5px", // Scrollbar space
            paddingRight: "10px", // Content spacing from scrollbar
            marginBottom: "15px",
          }}>
            <style>
              {`
                div::-webkit-scrollbar {
                  width: 4px;
                }
                div::-webkit-scrollbar-track {
                  background: #f1f1f1;
                  border-radius: 2px;
                }
                div::-webkit-scrollbar-thumb {
                  background: #c1c1c1;
                  border-radius: 2px;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: #a8a8a8;
                }
                /* Disable link styles in description and all possible children */
                .shop-description a,
                .shop-description u,
                .shop-description span {
                  text-decoration: none !important;
                  color: inherit !important;
                  pointer-events: none !important;
                  border-bottom: none !important;
                }
                /* Catch-all for any underlined element */
                .shop-description * {
                  text-decoration: none !important;
                }
              `}
            </style>
            
            {shop.description && (
              <div 
                className="shop-description"
                style={{ fontSize: "12px", fontFamily: "'Rounded Mplus 1c', sans-serif", fontWeight: 400, color: "#000000", lineHeight: "1.6", wordWrap: "break-word", pointerEvents: "none" }}
                dangerouslySetInnerHTML={{ __html: shop.description }}
              />
            )}
            
            {/* Scrollable content continues here if description is long */}
          </div>

          {/* Fixed Footer Info */}
          <div style={{ flexShrink: 0, width: "100%" }}>
            <div style={{ width: "320px", height: "1px", backgroundColor: "#D9D9D9", marginLeft: "15px", marginRight: "15px", marginBottom: "15px" }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "15px", marginRight: "15px", marginBottom: "15px", fontSize: "12px", fontFamily: "'Rounded Mplus 1c', sans-serif", fontWeight: 400, color: "#000000" }}>
              <img src={iconLocation} alt="" draggable={false} onDragStart={(e) => e.preventDefault()} style={{ width: "12px", height: "12px", flexShrink: 0 }} />
              {shop.floors && shop.floors.length > 0 && <span>{normalizeFloor(shop.floors[0])}</span>}
              {shop.number && <span>[{shop.number}]</span>}
              {displayGenreMemo && (<><span>/</span><span>{displayGenreMemo}</span></>)}
            </div>
            
            {shop.openTime && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "15px", marginRight: "15px", marginBottom: "15px", fontSize: "12px", fontFamily: "'Rounded Mplus 1c', sans-serif", fontWeight: 400, color: "#000000" }}>
                  <img src={iconTime} alt="" draggable={false} onDragStart={(e) => e.preventDefault()} style={{ width: "12px", height: "12px", flexShrink: 0 }} />
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.4" }} dangerouslySetInnerHTML={{ __html: shop.openTime }} />
              </div>
            )}
            
            {shop.tel && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "15px", marginRight: "15px", marginBottom: "15px", fontSize: "12px", fontFamily: "'Rounded Mplus 1c', sans-serif", fontWeight: 400, color: "#000000" }}>
                <img src={iconTel} alt="" draggable={false} onDragStart={(e) => e.preventDefault()} style={{ width: "12px", height: "12px", flexShrink: 0 }} />
                <span>{shop.tel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        style={{ position: "absolute", top: "calc(50% - 420px)", right: "calc(50% - 625px)", transform: "translateY(-100%)", marginTop: "-15px", zIndex: 1001 }}
      >
        <CloseButton
          onClick={(e) => { e?.stopPropagation(); onClose(); }}
          onTouchStart={() => setCloseButtonPressed(true)}
          onTouchEnd={() => setCloseButtonPressed(false)}
          onTouchCancel={() => setCloseButtonPressed(false)}
          isPressed={closeButtonPressed}
          style={{ width: "70px", height: "70px" }}
        />
      </div>
    </div>
  );
};

export default ShopDetailScreen;