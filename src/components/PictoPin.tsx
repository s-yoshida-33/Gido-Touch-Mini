import React from "react";
import { motion } from "framer-motion";
import type { PictoInstance } from "../types/picto";
import type { AnimationConfig } from "../types/locationIcon";

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

// Helper function to build animation props
function buildAnimationProps(fixedAmplitude: number, animation?: AnimationConfig) {
  if (!animation || !animation.enabled || animation.type === "none") {
    return {
      initial: { scale: 1, y: 0 },
      animate: { scale: 1, y: 0 },
    };
  }

  const duration = animation.duration;

  switch (animation.type) {
    case "floating":
      return {
        initial: { y: 0 },
        animate: {
          y: [0, -fixedAmplitude, 0],
        },
        transition: {
          duration,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };
    case "pulse":
      return {
        initial: { scale: 1, y: 0 },
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
        initial: { y: 0 },
        animate: {
          y: [0, -fixedAmplitude, 0],
        },
        transition: {
          duration,
          repeat: Infinity,
          ease: "easeOut" as const,
        },
      };
    case "blink":
      return {
        initial: { scale: 1, y: 0 },
        animate: { scale: 1, y: 0 },
        transition: {
          duration,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };
    default:
      return {
        initial: { scale: 1, y: 0 },
        animate: { scale: 1, y: 0 },
      };
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
  };

  // ... existing code ...

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
          <style>{`
            @keyframes ripple-animation-${instance.id} {
              0% { transform: translate(-50%, -50%) scale(${rippleCenterSize}); opacity: 1; }
              90% { opacity: 0.1; }
              100% { transform: translate(-50%, -50%) scale(${rippleSize * 1.2}); opacity: 0; }
            }
            .ripple-${instance.id} {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              border-radius: 50%;
              background-color: ${rippleColor};
              pointer-events: none;
              z-index: 0;
              opacity: 0;
            }
          `}</style>
          <div
            className={`ripple-${instance.id}`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              animation: `ripple-animation-${instance.id} ${animation!.duration}s ease-out infinite`,
            }}
          />
          <div
            className={`ripple-${instance.id}`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              animation: `ripple-animation-${instance.id} ${animation!.duration}s ease-out ${animation!.duration / 2}s infinite`,
            }}
          />
        </>
      )}
      
      {/* Icon Layer */}
      {(renderMode === 'default' || renderMode === 'icon') && (
        <img
          src={iconUrl}
          alt={instance.tag}
          draggable={false}
          style={imageStyle}
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

  const renderInnerContent = () => {
    if (isSelected && animation?.enabled && animation.type !== "none") {
       const animProps = buildAnimationProps(fixedAmplitude, animation);
      return (
        <motion.div
          key={animation.type}
          style={innerContainerStyle}
          initial={animProps.initial}
          animate={animProps.animate}
          transition={animProps.transition}
        >
          {renderContent()}
        </motion.div>
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




