import React from "react";

interface LanguageSelectButtonProps {
  language: "ja" | "en";
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const LanguageSelectButton: React.FC<LanguageSelectButtonProps> = ({
  language,
  onClick,
  style,
  className,
}) => {
  const baseWidth = style?.width || "400px";
  const expandedWidth = typeof baseWidth === "string" && baseWidth.includes("px")
    ? `calc(${baseWidth} + 4px)`
    : baseWidth;
  
  const { width, ...restStyle } = style || {};
  const buttonStyle: React.CSSProperties = {
    position: "relative",
    width: expandedWidth,
    height: style?.height || "47px",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    borderRadius: "50px",
    backgroundColor: "#E63B93",
    boxSizing: "border-box",
    ...restStyle,
  };

  const globeIconPath = "M211 34C209.633 34 208.342 33.7375 207.125 33.2125C205.908 32.6875 204.846 31.9708 203.938 31.0625C203.029 30.1542 202.313 29.0917 201.788 27.875C201.262 26.6583 201 25.3667 201 24C201 22.6167 201.262 21.3208 201.788 20.1125C202.313 18.9042 203.029 17.8458 203.938 16.9375C204.846 16.0292 205.908 15.3125 207.125 14.7875C208.342 14.2625 209.633 14 211 14C212.383 14 213.679 14.2625 214.887 14.7875C216.096 15.3125 217.154 16.0292 218.062 16.9375C218.971 17.8458 219.687 18.9042 220.212 20.1125C220.737 21.3208 221 22.6167 221 24C221 25.3667 220.737 26.6583 220.212 27.875C219.687 29.0917 218.971 30.1542 218.062 31.0625C217.154 31.9708 216.096 32.6875 214.887 33.2125C213.679 33.7375 212.383 34 211 34ZM211 31.95C211.433 31.35 211.808 30.725 212.125 30.075C212.442 29.425 212.7 28.7333 212.9 28H209.1C209.3 28.7333 209.558 29.425 209.875 30.075C210.192 30.725 210.567 31.35 211 31.95ZM208.4 31.55C208.1 31 207.838 30.4292 207.613 29.8375C207.388 29.2458 207.2 28.6333 207.05 28H204.1C204.583 28.8333 205.187 29.5583 205.912 30.175C206.637 30.7917 207.467 31.25 208.4 31.55ZM213.6 31.55C214.533 31.25 215.363 30.7917 216.088 30.175C216.813 29.5583 217.417 28.8333 217.9 28H214.95C214.8 28.6333 214.612 29.2458 214.387 29.8375C214.162 30.4292 213.9 31 213.6 31.55ZM203.25 26H206.65C206.6 25.6667 206.562 25.3375 206.537 25.0125C206.512 24.6875 206.5 24.35 206.5 24C206.5 23.65 206.512 23.3125 206.537 22.9875C206.562 22.6625 206.6 22.3333 206.65 22H203.25C203.167 22.3333 203.104 22.6625 203.062 22.9875C203.021 23.3125 203 23.65 203 24C203 24.35 203.021 24.6875 203.062 25.0125C203.104 25.3375 203.167 25.6667 203.25 26ZM208.65 26H213.35C213.4 25.6667 213.438 25.3375 213.463 25.0125C213.488 24.6875 213.5 24.35 213.5 24C213.5 23.65 213.488 23.3125 213.463 22.9875C213.438 22.6625 213.4 22.3333 213.35 22H208.65C208.6 22.3333 208.562 22.6625 208.537 22.9875C208.512 23.3125 208.5 23.65 208.5 24C208.5 24.35 208.512 24.6875 208.537 25.0125C208.562 25.3375 208.6 25.6667 208.65 26ZM215.35 26H218.75C218.833 25.6667 218.896 25.3375 218.938 25.0125C218.979 24.6875 219 24.35 219 24C219 23.65 218.979 23.3125 218.938 22.9875C218.896 22.6625 218.833 22.3333 218.75 22H215.35C215.4 22.3333 215.438 22.6625 215.463 22.9875C215.488 23.3125 215.5 23.65 215.5 24C215.5 24.35 215.488 24.6875 215.463 25.0125C215.438 25.3375 215.4 25.6667 215.35 26ZM214.95 20H217.9C217.417 19.1667 216.813 18.4417 216.088 17.825C215.363 17.2083 214.533 16.75 213.6 16.45C213.9 17 214.162 17.5708 214.387 18.1625C214.612 18.7542 214.8 19.3667 214.95 20ZM209.1 20H212.9C212.7 19.2667 212.442 18.575 212.125 17.925C211.808 17.275 211.433 16.65 211 16.05C210.567 16.65 210.192 17.275 209.875 17.925C209.558 18.575 209.3 19.2667 209.1 20ZM204.1 20H207.05C207.2 19.3667 207.388 18.7542 207.613 18.1625C207.838 17.5708 208.1 17 208.4 16.45C207.467 16.75 206.637 17.2083 205.912 17.825C205.187 18.4417 204.583 19.1667 204.1 20Z";

  const selectedLanguageText = language === "ja" ? "日本語" : "English";

  return (
    <button
      className={className}
      style={buttonStyle}
      onClick={onClick}
      type="button"
    >
      {/* 左側: ピンク背景（ボーダーなし、ボーダー分だけ大きく） */}
      <div
        style={{
          position: "absolute",
          left: "-2px",
          top: "-2px",
          width: "calc(142px + 2px)",
          height: "calc(100% + 4px)",
          backgroundColor: "#E63B93",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            fontFamily: "'Rounded Mplus 1c', sans-serif",
            userSelect: "none",
          }}
        >
          {selectedLanguageText}
        </span>
      </div>
      {/* 右側: 白背景（親要素のボーダー内側に配置） */}
      <div
        style={{
          position: "absolute",
          left: "142px",
          top: "2px",
          right: "2px",
          height: "calc(100% - 4px)",
          backgroundColor: "white",
          borderRadius: "0 20.5px 20.5px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          border: "none",
          boxSizing: "border-box",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="201 14 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            flexShrink: 0,
          }}
        >
          <path
            d={globeIconPath}
            fill="#E63B93"
          />
        </svg>
        <span
          style={{
            color: "#E63B93",
            fontSize: "16px",
            fontWeight: "bold",
            fontFamily: "'Rounded Mplus 1c', sans-serif",
            userSelect: "none",
          }}
        >
          Select Language
        </span>
      </div>
    </button>
  );
};

