import React from "react";

interface UserLocationIconProps {
  style?: React.CSSProperties;
  className?: string;
}

export const UserLocationIcon: React.FC<UserLocationIconProps> = ({
  style,
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: style?.width || "75px",
    height: style?.height || "57px",
    overflow: "visible",
    ...style,
  };

  const speechBubblePath = "M14 1.5H61C67.9036 1.5 73.5 7.09644 73.5 14V31.7734C73.5 38.677 67.9036 44.2734 61 44.2734H44.7119L44.2705 44.9678L37.5977 55.4531C37.585 55.4731 37.5737 55.481 37.5635 55.4863C37.5497 55.4935 37.5276 55.5 37.5 55.5C37.4724 55.5 37.4503 55.4935 37.4365 55.4863C37.4263 55.481 37.415 55.4731 37.4023 55.4531L30.7295 44.9678L30.2881 44.2734H14C7.09644 44.2734 1.5 38.677 1.5 31.7734V14C1.5 7.09644 7.09644 1.5 14 1.5Z";

  return (
    <div className={className} style={containerStyle}>
      <svg
        width="75"
        height="57"
        viewBox="-2 -2 79 61"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          overflow: "visible",
        }}
        preserveAspectRatio="xMidYMid meet"
        textRendering="geometricPrecision"
        shapeRendering="geometricPrecision"
      >
        <path
          d={speechBubblePath}
          fill="white"
          stroke="#E63B93"
          strokeWidth="3"
        />
        <g transform="translate(37.5, 23.9)">
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#E63B93"
            fontSize="20"
            fontWeight="bold"
            fontFamily="'Rounded Mplus 1c', sans-serif"
            style={{
              userSelect: "none",
            }}
          >
            現在地
          </text>
        </g>
      </svg>
    </div>
  );
};

