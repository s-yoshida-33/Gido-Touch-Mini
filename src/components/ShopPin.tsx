import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { ShopPosition } from "../types/shop";
import speechBubbleIcon from "../assets/shop-location.svg";
import "../styles/location-icons.css"; // Ensure CSS is imported

interface ShopPinProps {
  position: ShopPosition;
  shopName: string;
  isSelected?: boolean;
  shopLogo?: string;
  shopId?: string;
  // transformScale is deprecated in favor of CSS variable --map-scale
  transformScale?: number;
  style?: React.CSSProperties;
  // Props for absolute pixel positioning
  usePixelPosition?: boolean;
  pixelX?: number;
  pixelY?: number;
  delay?: number;
}

function buildShadowStyle(shadow?: ShopPosition['shadow']): React.CSSProperties {
  if (!shadow || !shadow.enabled) {
    return {};
  }
  return {
    filter: `drop-shadow(${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px rgba(0, 0, 0, ${shadow.opacity}))`,
  };
}

function getAnimationClass(type: string): string {
  switch (type) {
    case "floating": return "anim-floating";
    case "pulse": return "anim-pulse";
    case "bounce": return "anim-bounce";
    case "blink": return ""; // handled by ripple overlay
    default: return "";
  }
}

function buildImagePath(photo: string | undefined, shopId: string | undefined): string {
  if (!photo) return "";
  
  if (photo.match(/^[A-Za-z]:[\\/]/)) {
    return photo.replace(/\\/g, "/");
  }
  
  if (photo.startsWith("file://") || 
      photo.startsWith("http://") || 
      photo.startsWith("https://") ||
      photo.startsWith("data:")) {
    return photo;
  }
  
  if (photo.startsWith("/") || photo.startsWith("\\")) {
    if (photo.startsWith("\\\\")) return photo;
    if (photo.startsWith("/")) return photo;
  }
  
  if (shopId) {
    if (photo.includes(`shop/${shopId}/`) || photo.includes(`shop\\${shopId}\\`) ||
        photo.includes(`files/shop/${shopId}/`) || photo.includes(`files\\shop\\${shopId}\\`)) {
      return photo;
    }
    
    const normalizedPhoto = photo.replace(/\\/g, "/");
    const cleanPhoto = normalizedPhoto.startsWith("/") ? normalizedPhoto.slice(1) : normalizedPhoto;
    
    if (!cleanPhoto.includes("/")) {
      return `files/shop/${shopId}/${cleanPhoto}`;
    }
    
    if (cleanPhoto.startsWith("files/shop/")) {
      return cleanPhoto;
    }
    return `files/shop/${shopId}/${cleanPhoto}`;
  }
  
  return photo;
}

function toFileUrl(filePath: string): string {
  if (!filePath) return "";
  
  if (filePath.startsWith("file://") || 
      filePath.startsWith("http://") || 
      filePath.startsWith("https://") ||
      filePath.startsWith("data:")) {
    return filePath;
  }
  
  const normalized = filePath.replace(/\\/g, "/");
  
  if (normalized.match(/^[A-Za-z]:\//)) {
    return `file:///${normalized}`;
  }
  
  if (normalized.startsWith("/")) {
    return `file://${normalized}`;
  }
  
  return `file:///${normalized}`;
}

export const ShopPin: React.FC<ShopPinProps> = ({ 
  position, 
  shopName, 
  isSelected = false,
  shopLogo,
  shopId,
  // transformScale = 1, // unused
  style,
  usePixelPosition = false,
  pixelX,
  pixelY,
  delay = 0,
}) => {
  if (position.enabled === false) {
    return null;
  }

  const size = position.size ?? 80;
  const rotation = position.rotation ?? 0;
  const shadow = position.shadow;
  const animation = position.animation;
  const fixedAmplitude = animation?.amplitude ? animation.amplitude : 0;
  
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoLoading, setLogoLoading] = useState(true);
  
  useEffect(() => {
    const logoPath = shopLogo || (shopId ? `files/shop/${shopId}/shop_logo.png` : undefined);
    
    if (!logoPath) {
      setLogoLoading(false);
      return;
    }

    const loadLogo = async () => {
      const imagePath = buildImagePath(logoPath, shopId);
      if (!imagePath) {
        setLogoLoading(false);
        return;
      }

      const electronAPI = window.electronAPI;
      if (electronAPI && electronAPI.getShopImage) {
        try {
          const normalizedPath = imagePath.replace(/\\/g, "/");
          const dataUrl = await electronAPI.getShopImage(normalizedPath);
          if (dataUrl) {
            setLogoUrl(dataUrl);
            setLogoLoading(false);
            return;
          }
        } catch (error) {
          console.error("Failed to load logo via IPC:", error);
        }
      }

      const fileUrl = toFileUrl(imagePath);
      setLogoUrl(fileUrl);
      setLogoLoading(false);
    };

    loadLogo();
  }, [shopLogo, shopId]);

  // Determine coordinates: prioritize pixel props if enabled
  const left = usePixelPosition && pixelX !== undefined ? `${pixelX}px` : `${position.x}%`;
  const top = usePixelPosition && pixelY !== undefined ? `${pixelY}px` : `${position.y}%`;

  // Wrapper style: positions the pin on the map
  const positionStyle: React.CSSProperties = {
    position: "absolute",
    left,
    top,
    zIndex: isSelected ? 1000 : 100,
    pointerEvents: "none",
    ...buildShadowStyle(shadow),
    ...style,
    // willChange removed to prevent blurriness on high DPI screens
  };

  if (isSelected) {
    positionStyle.filter = positionStyle.filter
      ? `${positionStyle.filter}, drop-shadow(0 0 8px rgba(0, 122, 255, 0.8))`
      : "drop-shadow(0 0 8px rgba(0, 122, 255, 0.8))";
  }

  // Inner container style: centering only (scaling moved to wrapper)
  const innerContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const pinImageStyle: React.CSSProperties = {
    width: `${size}px`,
    height: "auto",
    display: "block",
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "center bottom",
    zIndex: 1,
  };
  
  const fixedLogoSize = size * 0.75;
  const logoStyle: React.CSSProperties = {
    position: "absolute",
    top: `calc(50% - ${fixedLogoSize / 2 - size * 0.3}px)`,
    left: "50%",
    width: `${fixedLogoSize}px`,
    height: `${fixedLogoSize}px`,
    objectFit: "contain",
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    zIndex: 2,
  };

  const rippleColor = animation?.rippleColor || "#E63B93";
  const rippleSize = animation?.rippleSize || 1.6;
  const rippleCenterSize = animation?.rippleCenterSize ?? 0.8;
  const isBlinkAnimation = animation?.enabled && animation.type === "blink";

  const renderContent = () => (
    <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, display: "flex", justifyContent: "center", alignItems: "center" }}>
      {isBlinkAnimation && (
        <>
          <div
            className="ripple-effect"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: "43%", // Override center position for ShopPin
              backgroundColor: rippleColor,
              "--ripple-center-size": rippleCenterSize,
              "--ripple-size": rippleSize,
              "--ripple-duration": `${animation.duration}s`,
            } as React.CSSProperties}
          />
          <div
            className="ripple-effect ripple-effect-delay"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: "43%", // Override center position for ShopPin
              backgroundColor: rippleColor,
              "--ripple-center-size": rippleCenterSize,
              "--ripple-size": rippleSize,
              "--ripple-duration": `${animation.duration}s`,
            } as React.CSSProperties}
          />
        </>
      )}
      
      <img
        src={speechBubbleIcon}
        alt={shopName}
        draggable={false}
        style={pinImageStyle}
        onError={(e) => console.error("Pin icon failed to load", e)}
        decoding="async"
      />
      
      {logoUrl && !logoLoading && (
        <img
          src={logoUrl}
          alt={`${shopName} logo`}
          draggable={false}
          style={logoStyle}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
          decoding="async"
        />
      )}
    </div>
  );

  // Drop-in animation variants
  const dropInVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        delay: delay,
        type: "spring" as const,
        stiffness: 300,
        damping: 20
      }
    }
  };

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Delay animation start slightly to allow layout to settle and prevent initial freeze
    const timer = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const renderInnerContent = () => {
    if (!isReady) return null;

    if (animation?.enabled && animation.type !== "none") {
      const animClass = getAnimationClass(animation.type);
      const style = {
        ...innerContainerStyle,
        "--anim-duration": `${animation.duration}s`,
        "--anim-amplitude": `-${fixedAmplitude}px`,
      } as React.CSSProperties;

      return (
        <div className={animClass} style={style}>
          {renderContent()}
        </div>
      );
    }
    return (
      <div style={innerContainerStyle}>
        {renderContent()}
      </div>
    );
  };

  return (
    <div style={positionStyle}>
      {/* Inverse Scale Wrapper - using CSS variable to keep size constant relative to screen */}
      <div 
        style={{ 
          transform: 'translate(-50%, -100%)', 
          transformOrigin: 'center bottom' 
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={dropInVariants}
        >
          {renderInnerContent()}
        </motion.div>
      </div>
    </div>
  );
};
