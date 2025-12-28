import React, { useRef, useLayoutEffect } from "react";

export const AutoScaleText: React.FC<{ children: React.ReactNode; width?: string | number; style?: React.CSSProperties }> = ({ children, width = "100%", style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;

      if (textWidth > containerWidth) {
        const scale = containerWidth / textWidth;
        textRef.current.style.transform = `scaleX(${Math.max(scale, 0.5)})`; // Limit min scale to 0.5
      } else {
        textRef.current.style.transform = "scaleX(1)";
      }
    }
  }, [children]);

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        width: width,
        whiteSpace: "nowrap",
        overflow: "hidden",
        transformOrigin: "left center",
      }}
    >
      <div
        ref={textRef}
        style={{
          display: "inline-block",
          transform: "scaleX(1)",
          whiteSpace: "nowrap",
          transformOrigin: "left center",
        }}
      >
        {children}
      </div>
    </div>
  );
};

