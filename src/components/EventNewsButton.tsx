import React from "react";

interface EventNewsButtonProps {
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

export const EventNewsButton: React.FC<EventNewsButtonProps> = ({
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

  const iconPath1 = "M18.7172 30.9923C18.0219 30.6545 17.2193 30.478 16.4014 30.478C13.9707 30.478 12 32.0184 12 33.9193C12 35.8202 13.9707 37.3606 16.4014 37.3606C18.8322 37.3606 20.8028 35.8202 20.8028 33.9193V21.112C20.8028 20.9381 20.923 20.7893 21.0968 20.754L30.6025 18.7724C30.8044 18.7295 30.991 18.8808 30.991 19.0825V28.4333C30.2958 28.0955 29.4932 27.919 28.6753 27.919C26.2446 27.919 24.2739 29.4594 24.2739 31.3604C24.2739 33.2613 26.2446 34.8017 28.6753 34.8017C31.1061 34.8017 33.0767 33.2613 33.0767 31.3604V16.279C33.0767 14.7613 31.7348 13.7529 30.2932 14.0529L20.8846 16.0143C19.6066 16.2815 18.7146 17.3656 18.7146 18.6539L18.7172 30.9923Z";
  const iconPath2 = "M42.0478 32.4083L38.9137 43.8617C38.4583 45.5246 36.4133 46.4033 34.3469 45.8193C32.2805 45.2353 30.973 43.4156 31.4284 41.7501C31.8837 40.0872 33.9288 39.2085 35.9952 39.7925C36.6902 39.9899 37.3293 40.336 37.8405 40.7983C39.0921 36.2207 40.3436 31.6404 41.5978 27.0629C41.7336 26.5654 42.2422 26.2733 42.7322 26.4112C43.1742 26.5356 43.4512 26.9655 43.4006 27.4144C43.3633 29.1691 44.1329 30.5156 44.8066 31.6972C45.6054 33.1005 46.3004 34.3145 45.8664 35.8909C45.5095 37.1968 44.6281 38.0215 43.4538 38.6001C42.6869 38.9786 42.1677 37.9593 42.8494 37.4456C43.302 37.1049 43.792 36.4749 43.9491 35.899C44.3086 34.5957 42.5911 33.5629 42.0478 32.4083Z";

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
          <path fillRule="evenodd" clipRule="evenodd" d={iconPath1} fill={textColor} />
          <path fillRule="evenodd" clipRule="evenodd" d={iconPath2} fill={textColor} />
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
          イベント
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

