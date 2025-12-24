import React from "react";

interface NavButtonProps {
  direction: "prev" | "next";
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

export const NavButton: React.FC<NavButtonProps> = ({
  direction,
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
    width: style?.width || "22px",
    height: style?.height || "49px",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...style,
  };

  const backgroundPath = direction === "prev" 
    ? "M22 39C22 44.5228 17.5228 49 12 49L0 49L4.28372e-06 0L12 1.04907e-06C17.5229 1.5319e-06 22 4.47715 22 10L22 39Z"
    : "M0 10C0 4.47715 4.47715 0 10 0H22V49H10C4.47715 49 0 44.5228 0 39V10Z";

  const arrowPath = direction === "prev"
    ? "M15.136 17.216L10.96 24.08L15.136 30.944L13.552 31.632L8.96 24.08L13.552 16.528L15.136 17.216Z"
    : "M6.864 31.784L11.04 24.92L6.864 18.056L8.448 17.368L13.04 24.92L8.448 32.472L6.864 31.784Z";

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
      <svg
        width="22"
        height="49"
        viewBox="0 0 22 49"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          zIndex: 1,
        }}
      >
        <path d={backgroundPath} fill="rgba(0, 0, 0, 0.5)" />
      </svg>
      <svg
        width="22"
        height="49"
        viewBox="0 0 22 49"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          opacity: isPressed ? 1 : 0,
          transition: "opacity 0.1s ease-in-out",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <path d={backgroundPath} fill="rgba(0, 0, 0, 0.3)" />
      </svg>
      <svg
        width="22"
        height="49"
        viewBox="0 0 22 49"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "relative",
          zIndex: 3,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <path d={arrowPath} fill="white" />
      </svg>
    </button>
  );
};

