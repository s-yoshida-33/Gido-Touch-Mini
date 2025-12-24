import React from "react";

interface CurrentFloorIconProps {
  style?: React.CSSProperties;
  className?: string;
}

export const CurrentFloorIcon: React.FC<CurrentFloorIconProps> = ({
  style,
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: style?.width || "94px",
    height: style?.height || "36px",
    ...style,
  };

  const speechBubblePath = "M78.6338 1C86.5679 1.00022 92.9998 7.43207 93 15.3662C93 23.3005 86.5681 29.7332 78.6338 29.7334H51.0811L48.6582 33.3291C47.8654 34.5048 46.1346 34.5048 45.3418 33.3291L42.9189 29.7334H15.3662C7.43194 29.7332 1 23.3005 1 15.3662C1.00022 7.43207 7.43207 1.00022 15.3662 1H78.6338Z";

  return (
    <div className={className} style={containerStyle}>
      <svg
        width="94"
        height="36"
        viewBox="0 0 94 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={speechBubblePath}
          fill="#E63B93"
          stroke="white"
          strokeWidth="2"
        />
        <g transform="translate(47, 16)">
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="14px"
            fontWeight="bold"
            fontFamily="'Rounded Mplus 1c', sans-serif"
          >
            現在地
          </text>
        </g>
      </svg>
    </div>
  );
};

