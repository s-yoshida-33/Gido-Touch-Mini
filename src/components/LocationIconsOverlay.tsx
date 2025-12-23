// src/components/LocationIconsOverlay.tsx
import React, { useEffect, useState } from "react";
import type { LocationIconSettings, IconPositionConfig } from "../types/locationIcon";

import SpeechBubbleSvg from "../assets/user-locaition.svg";
import LocationSvg from "../assets/location.svg";
import "../styles/location-icons.css"; // Ensure CSS is imported

interface Props {
  settings: LocationIconSettings;
  mapMetrics?: { width: number; height: number };
}

function buildWrapperStyle(config: IconPositionConfig): React.CSSProperties {
  return {
    position: "absolute",
    left: `${config.xPercent}%`,
    top: `${config.yPercent}%`,
    pointerEvents: "none",
  };
}

function buildImageStyle(config: IconPositionConfig): React.CSSProperties {
  return {
    width: `${config.size}px`,
    height: "auto",
    display: "block",
    transform: `rotate(${config.rotation}deg)`,
    transformOrigin: "center center",
  };
}

function buildShadowStyle(shadow: IconPositionConfig['shadow']): React.CSSProperties {
  if (!shadow.enabled) {
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

export const LocationIconsOverlay: React.FC<Props> = ({ settings, mapMetrics }) => {
  const { speechBubble, location } = settings;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Delay animation start slightly to allow layout to settle and prevent initial freeze
    const timer = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  // Calculate fixed pixel offset for speech bubble relative to location if location is enabled
  // Default map size to 1460x1080 if not provided
  const mapWidth = mapMetrics?.width || 1460;
  const mapHeight = mapMetrics?.height || 1080;

  // Use location as base anchor if enabled, otherwise use speech bubble's own position
  const speechBubbleAnchor = location.enabled ? location : speechBubble;

  // Calculate offset in pixels (from percentage difference)
  // If anchored to location, offset is the difference. If self-anchored, offset is 0.
  const speechBubbleOffsetX = location.enabled 
    ? ((speechBubble.xPercent - location.xPercent) / 100) * mapWidth 
    : 0;
  const speechBubbleOffsetY = location.enabled 
    ? ((speechBubble.yPercent - location.yPercent) / 100) * mapHeight 
    : 0;

  // Use the anchor's position for the outer wrapper
  const speechBubbleWrapperStyle = {
    ...buildWrapperStyle(speechBubbleAnchor),
    ...buildShadowStyle(speechBubble.shadow),
    zIndex: 5,
  };

  const locationWrapperStyle = {
    ...buildWrapperStyle(location),
    ...buildShadowStyle(location.shadow),
    zIndex: 6,
  };

  // 波紋アニメーション用のスタイルとコンテンツを生成
  const renderRippleAnimation = (
    config: IconPositionConfig,
    uniqueId: string
  ) => {
    const animation = config.animation;
    if (!animation || !animation.enabled || animation.type !== "blink") {
      return null;
    }

    const rippleColor = animation.rippleColor || "#FFFFFF";
    const rippleSize = animation.rippleSize || 1.5;
    const rippleCenterSize = animation.rippleCenterSize ?? 0.95;
    const size = config.size;

    return (
      <>
        <style>{`
          @keyframes ripple-animation-${uniqueId} {
            0% {
              transform: translate(-50%, -50%) scale(${rippleCenterSize});
              opacity: 1;
            }
            90% {
              opacity: 0.1;
            }
            100% {
              transform: translate(-50%, -50%) scale(${rippleSize * 1.2});
              opacity: 0;
            }
          }
          .ripple-${uniqueId}-1 {
            animation: ripple-animation-${uniqueId} ${animation.duration}s ease-out infinite;
          }
          .ripple-${uniqueId}-2 {
            animation: ripple-animation-${uniqueId} ${animation.duration}s ease-out ${animation.duration / 2}s infinite;
          }
        `}</style>
        <div
          className={`ripple-${uniqueId}-1`}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            backgroundColor: rippleColor,
            pointerEvents: "none",
            zIndex: -1,
            opacity: 0,
            transform: `translate(-50%, -50%) scale(${rippleCenterSize})`,
            transformOrigin: "center center",
          }}
        />
        <div
          className={`ripple-${uniqueId}-2`}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            backgroundColor: rippleColor,
            pointerEvents: "none",
            zIndex: -1,
            opacity: 0,
            transform: `translate(-50%, -50%) scale(${rippleCenterSize})`,
            transformOrigin: "center center",
          }}
        />
      </>
    );
  };

  const renderIconContent = (config: IconPositionConfig, iconSrc: string, alt: string, uniqueId: string) => {
    const animation = config.animation;
    let animClass = "";
    let animStyle: React.CSSProperties = { 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
      position: "relative",
      width: "100%",
      height: "100%"
    };

    if (isReady && animation && animation.enabled && animation.type !== "none" && animation.type !== "blink") {
      animClass = getAnimationClass(animation.type);
      animStyle = {
        ...animStyle,
        "--anim-duration": `${animation.duration}s`,
        "--anim-amplitude": `-${animation.amplitude}px`,
      } as React.CSSProperties;
    }

    return (
      <div className={animClass} style={animStyle}>
        {renderRippleAnimation(config, uniqueId)}
        <img
          src={iconSrc}
          alt={alt}
          style={buildImageStyle(config)}
        />
      </div>
    );
  };

  return (
    <>
      {speechBubble.enabled && (
        <div style={speechBubbleWrapperStyle}>
          {/* Inverse Scale Wrapper - using CSS variable to keep size constant relative to screen */}
          {/* Apply fixed pixel offset here inside the scale-invariant context */}
          <div 
            style={{ 
              transform: `translate(-50%, -50%) translate(${speechBubbleOffsetX}px, ${speechBubbleOffsetY}px)`,
              transformOrigin: 'center center' 
            }}
          >
            {renderIconContent(speechBubble, SpeechBubbleSvg, "Current location speech bubble", "speech-bubble")}
          </div>
        </div>
      )}

      {location.enabled && (
        <div style={locationWrapperStyle}>
          {/* Inverse Scale Wrapper - using CSS variable to keep size constant relative to screen */}
          <div 
            style={{ 
              transform: 'translate(-50%, -50%)', 
              transformOrigin: 'center center' 
            }}
          >
            {renderIconContent(location, LocationSvg, "Current location pin", "location")}
          </div>
        </div>
      )}
    </>
  );
};
