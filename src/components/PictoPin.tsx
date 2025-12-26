import React, { useState } from "react";
import type { PictoInstance } from "../types/picto";
import "../styles/location-icons.css"; // Ensure CSS is imported

interface PictoPinProps {
  instance: PictoInstance;
  iconUrl: string;
  isSelected?: boolean;
  usePixelPosition?: boolean;
  pixelX?: number;
  pixelY?: number;
  renderMode?: 'default' | 'ripple' | 'icon'; // Add renderMode
}

function buildShadowStyle(shadow: PictoInstance['shadow']): React.CSSProperties {
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

export const PictoPin: React.FC<PictoPinProps> = ({ 
  instance,
  iconUrl,
  isSelected = false,
  usePixelPosition = false,
  pixelX,
  pixelY,
  renderMode = 'default',
}) => {
  const size = instance.size || 80;
  const rotation = instance.rotation || 0;
  const animation = instance.animation;
  const fixedAmplitude = animation?.amplitude ? animation.amplitude : 0;
  const shadow = instance.shadow;

  // Determine coordinates
  const left = usePixelPosition && pixelX !== undefined ? `${pixelX}px` : `${instance.x}%`;
  const top = usePixelPosition && pixelY !== undefined ? `${pixelY}px` : `${instance.y}%`;

  const positionStyle: React.CSSProperties = {
    position: "absolute",
    left,
    top,
    zIndex: isSelected ? 1000 : 90, // ShopPinより少し下、選択時は上
    pointerEvents: "none",
    // Only apply shadow if we are rendering the icon (or default mode)
    ...(renderMode !== 'ripple' ? buildShadowStyle(shadow) : {}),
    // willChange removed to prevent blurriness on high DPI screens
  };

  const imageStyle: React.CSSProperties = {
    width: `${size}px`,
    height: "auto",
    display: "block",
    transform: `rotate(${rotation}deg)`,
  };

  const rippleColor = animation?.rippleColor || "#FFFFFF";
  const rippleSize = animation?.rippleSize || 1.6;
  const rippleCenterSize = animation?.rippleCenterSize ?? 0.8;
  const isBlinkAnimation = isSelected && animation?.enabled && animation.type === "blink";

  const renderContent = () => (
    <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, display: "flex", justifyContent: "center", alignItems: "center" }}>
      {/* Ripple Layer */}
      {(renderMode === 'default' || renderMode === 'ripple') && isBlinkAnimation && (
        <>
          <div
            className="ripple-effect"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: rippleColor,
              "--ripple-center-size": rippleCenterSize,
              "--ripple-size": rippleSize,
              "--ripple-duration": `${animation!.duration}s`,
            } as React.CSSProperties}
          />
          <div
            className="ripple-effect ripple-effect-delay"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: rippleColor,
              "--ripple-center-size": rippleCenterSize,
              "--ripple-size": rippleSize,
              "--ripple-duration": `${animation!.duration}s`,
            } as React.CSSProperties}
          />
        </>
      )}
      
      {/* Icon Layer */}
      {(renderMode === 'default' || renderMode === 'icon') && iconUrl && (
        <img
          src={iconUrl}
          alt={instance.tag}
          draggable={false}
          style={imageStyle}
          decoding="async"
        />
      )}
    </div>
  );

  const innerContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  };

  const [isReady, setIsReady] = useState(false);

  React.useEffect(() => {
    // Delay animation start slightly to allow layout to settle and prevent initial freeze
    const timer = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const renderInnerContent = () => {
    if (!isReady) return null;

    if (isSelected && animation?.enabled && animation.type !== "none") {
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
      <div style={{ transform: 'translate(-50%, -50%)', transformOrigin: 'center center' }}>
         {renderInnerContent()}
      </div>
    </div>
  );
};
