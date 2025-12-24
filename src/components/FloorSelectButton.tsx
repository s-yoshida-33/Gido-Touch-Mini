import React from "react";

interface FloorSelectButtonProps {
  floor: "1F" | "2F" | "3F" | "4F";
  isSelected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const FloorSelectButton: React.FC<FloorSelectButtonProps> = ({
  floor,
  isSelected = false,
  onClick,
  style,
  className,
}) => {
  const buttonStyle: React.CSSProperties = {
    position: "relative",
    width: style?.width || "120px",
    height: style?.height || "60px",
    borderRadius: "10px",
    backgroundColor: isSelected ? "#E63B93" : "white",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.3s ease-in-out",
    ...style,
  };

  const textColor = isSelected ? "white" : "#E63B93";

  return (
    <button
      className={className}
      style={buttonStyle}
      onClick={onClick}
      type="button"
    >
      <span
        style={{
          color: textColor,
          fontSize: "24px",
          fontWeight: "bold",
          fontFamily: "'Rounded Mplus 1c', sans-serif",
          userSelect: "none",
        }}
      >
        {floor}
      </span>
    </button>
  );
};

