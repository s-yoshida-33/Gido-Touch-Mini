import React from "react";

interface OpenTimeButtonProps {
  onClick?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  isPressed?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const OpenTimeButton: React.FC<OpenTimeButtonProps> = ({
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  isPressed = false,
  style,
  className,
}) => {
  const buttonStyle: React.CSSProperties = {
    position: "relative",
    width: style?.width || "106px",
    height: style?.height || "60px",
    borderRadius: "12px",
    backgroundColor: isPressed ? "#E63B93" : "white",
    border: "2px solid #E63B93",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.1s ease-in-out",
    ...style,
  };

  const textColor = isPressed ? "white" : "#E63B93";

  return (
    <button
      className={className}
      style={buttonStyle}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      type="button"
    >
      <span
        style={{
          color: textColor,
          fontSize: "16px",
          fontWeight: "bold",
          fontFamily: "'Rounded Mplus 1c', sans-serif",
          userSelect: "none",
        }}
      >
        営業時間
      </span>
    </button>
  );
};

