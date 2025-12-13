// src/components/LocationIconsOverlay.tsx
import React from "react";
import { motion } from "framer-motion";
import type { LocationIconSettings, IconPositionConfig, AnimationConfig } from "../types/locationIcon";

import SpeechBubbleSvg from "../assets/user-locaition.svg";
import LocationSvg from "../assets/location.svg";

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

function buildAnimationProps(animation?: AnimationConfig): {
  initial: any;
  animate: any;
  transition?: any;
} {
  if (!animation || !animation.enabled || animation.type === "none") {
    return {
      initial: { x: 0, y: 0, scale: 1 },
      animate: { x: 0, y: 0, scale: 1 },
    };
  }

  const duration = animation.duration;
  const amplitude = animation.amplitude;

  switch (animation.type) {
    case "floating":
      return {
        initial: { x: 0, y: 0 },
        animate: {
          y: [0, -amplitude, 0],
        },
        transition: {
          duration,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };
    case "pulse":
      return {
        initial: { scale: 1 },
        animate: {
          scale: [1, 1.1, 1],
        },
        transition: {
          duration,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };
    case "bounce":
      return {
        initial: { x: 0, y: 0 },
        animate: {
          y: [0, -amplitude, 0],
        },
        transition: {
          duration,
          repeat: Infinity,
          ease: "easeOut" as const,
        },
      };
    case "blink":
      // blink は波紋アニメーションとして実装されるため、ここでは何もしない
      return {
        initial: { x: 0, y: 0, scale: 1 },
        animate: { x: 0, y: 0, scale: 1 },
      };
    default:
      return {
        initial: { x: 0, y: 0, scale: 1 },
        animate: { x: 0, y: 0, scale: 1 },
      };
  }
}

export const LocationIconsOverlay: React.FC<Props> = ({ settings, mapMetrics }) => {
  const { speechBubble, location } = settings;

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

  // Create keys based on animation settings to force re-mount when settings change
  const speechBubbleAnimationKey = speechBubble.animation
    ? `${speechBubble.animation.enabled}-${speechBubble.animation.type}-${speechBubble.animation.duration}-${speechBubble.animation.amplitude}-${speechBubble.animation.rippleColor || ""}-${speechBubble.animation.rippleSize || ""}`
    : "no-animation";

  const locationAnimationKey = location.animation
    ? `${location.animation.enabled}-${location.animation.type}-${location.animation.duration}-${location.animation.amplitude}-${location.animation.rippleColor || ""}-${location.animation.rippleSize || ""}`
    : "no-animation";

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
            transform: `translate(-50%, -50%) scale(${rippleCenterSize})`,
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            backgroundColor: rippleColor,
            pointerEvents: "none",
            zIndex: -1,
            opacity: 0,
          }}
        />
        <div
          className={`ripple-${uniqueId}-2`}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${rippleCenterSize})`,
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            backgroundColor: rippleColor,
            pointerEvents: "none",
            zIndex: -1,
            opacity: 0,
          }}
        />
      </>
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
            <motion.div
              key={speechBubbleAnimationKey}
              style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
              {...buildAnimationProps(speechBubble.animation)}
            >
              {renderRippleAnimation(speechBubble, "speech-bubble")}
              <img
                src={SpeechBubbleSvg}
                alt="Current location speech bubble"
                style={buildImageStyle(speechBubble)}
              />
            </motion.div>
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
            <motion.div
              key={locationAnimationKey}
              style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
              {...buildAnimationProps(location.animation)}
            >
              {renderRippleAnimation(location, "location")}
              <img
                src={LocationSvg}
                alt="Current location pin"
                style={buildImageStyle(location)}
              />
            </motion.div>
          </div>
        </div>
      )}
    </>
  );
};
