import React from "react";

interface ShopNewsButtonProps {
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

/**
 * ショップニュースボタンコンポーネント
 * 画像ファイルの代わりにHTML/CSSで実装
 */
export const ShopNewsButton: React.FC<ShopNewsButtonProps> = ({
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
    width: style?.width || "135px",
    height: style?.height || "60px",
    borderRadius: "12px",
    backgroundColor: isPressed ? "#E63B93" : "white",
    border: "2px solid #E63B93",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "0 12px 0 8px",
    transition: "background-color 0.1s ease-in-out",
    ...style,
  };

  const textColor = isPressed ? "white" : "#E63B93";

  const iconPath = "M15.3685 28.0618L19.3196 27.0083C19.2679 27.1977 19.266 27.4003 19.3161 27.5923L21.369 35.2197C21.4225 35.4207 21.5271 35.5939 21.6635 35.73L17.7061 36.7864C16.5025 37.1073 15.2746 36.909 14.2685 36.3303L14.2363 36.3099C13.2453 35.7294 12.472 34.779 12.1541 33.5937L12.1497 33.5787C11.8328 32.3846 12.0338 31.1682 12.6122 30.1699L12.6317 30.1379C13.2157 29.1508 14.1702 28.3821 15.3596 28.0647L15.3685 28.0618ZM40.5679 32.3943C40.2554 32.3498 40.0384 32.0618 40.0831 31.7513C40.1278 31.4402 40.417 31.2241 40.7286 31.2686L45.5094 31.947C45.8209 31.9916 46.0389 32.2795 45.9942 32.59C45.9494 32.9012 45.6603 33.1173 45.3487 33.0727L40.5679 32.3943ZM38.0696 21.3829C37.8214 21.5768 37.4623 21.5341 37.267 21.2869C37.0723 21.0398 37.1151 20.6822 37.3634 20.4878L41.1626 17.5209C41.4099 17.3271 41.77 17.3697 41.9646 17.616C42.1593 17.8631 42.1165 18.2213 41.8682 18.4151L38.0696 21.3829ZM39.3784 26.9201C39.0738 27.0011 38.7604 26.8207 38.6791 26.5174C38.5979 26.2135 38.7784 25.902 39.0836 25.8205L44.0358 24.4994C44.341 24.4184 44.6545 24.5988 44.7357 24.9021C44.817 25.2054 44.6359 25.5175 44.3313 25.5984L39.3784 26.9201ZM21.713 36.3056L23.9567 40.1748C24.0604 40.3536 24.1354 40.5323 24.1817 40.7074C24.2897 41.1076 24.2648 41.5031 24.1246 41.8544C23.9826 42.2072 23.7236 42.5077 23.3649 42.7141C23.214 42.8022 23.0461 42.8725 22.8649 42.9205C22.2951 43.0726 21.6623 42.9995 21.1031 42.7605C20.5503 42.524 20.0557 42.1169 19.7549 41.5975L17.3467 37.4444C17.5165 37.4168 17.685 37.3814 17.8548 37.3359L21.713 36.3056ZM20.0671 26.858L32.3781 17.1527C32.4452 17.0912 32.5265 17.0442 32.621 17.0194C32.9256 16.9385 33.239 17.1182 33.3203 17.4221L38.6029 37.0505C38.6253 37.1261 38.6316 37.2089 38.6199 37.2923C38.5742 37.6034 38.2832 37.8186 37.9716 37.7734L22.3899 35.4894C22.1704 35.4574 21.981 35.3 21.9202 35.0732L19.8683 27.4502C19.8138 27.2376 19.8831 27.0029 20.0671 26.858Z";

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "34px",
          height: "34px",
          flexShrink: 0,
        }}
      >
        <svg
          width="34"
          height="34"
          viewBox="12 14 34 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <path fillRule="evenodd" clipRule="evenodd" d={iconPath} fill={textColor} />
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          flex: 1,
          paddingLeft: "12px",
        }}
      >
        <span
          style={{
            color: textColor,
            fontSize: "16px",
            fontWeight: "bold",
            fontFamily: "'Rounded Mplus 1c', sans-serif",
            userSelect: "none",
            lineHeight: "1.2",
          }}
        >
          ショップ
        </span>
        <span
          style={{
            color: textColor,
            fontSize: "16px",
            fontWeight: "bold",
            fontFamily: "'Rounded Mplus 1c', sans-serif",
            userSelect: "none",
            lineHeight: "1.2",
          }}
        >
          ニュース
        </span>
      </div>
    </button>
  );
};

