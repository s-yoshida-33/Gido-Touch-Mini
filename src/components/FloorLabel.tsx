import React from "react";

interface FloorLabelProps {
  floor: "1F" | "2F" | "3F" | "4F";
  style?: React.CSSProperties;
  className?: string;
}

export const FloorLabel: React.FC<FloorLabelProps> = ({ floor, style, className }) => {
  const defaultStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: style?.width || "120px",
    height: style?.height || (style?.width ? undefined : "80px"),
    aspectRatio: style?.aspectRatio || (style?.width ? "3/2" : undefined),
    backgroundColor: "#E63B93",
    borderRadius: "10px",
    color: "white",
    fontSize: "48px",
    fontWeight: "bold",
    fontFamily: "'Rounded Mplus 1c', sans-serif",
    userSelect: "none",
    pointerEvents: "none",
    ...style,
  };

  return (
    <div className={className} style={defaultStyle}>
      {floor}
    </div>
  );
};

