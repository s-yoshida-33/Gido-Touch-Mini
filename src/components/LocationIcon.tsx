import React from "react";

interface LocationIconProps {
  style?: React.CSSProperties;
  className?: string;
}

export const LocationIcon: React.FC<LocationIconProps> = ({
  style,
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: style?.width || "40px",
    height: style?.height || "40px",
    overflow: "visible",
    ...style,
  };

  const arrowPath1 = "M31.5568 18.6613C32.4495 19.0512 32.4495 20.2696 31.5568 20.6595L10.7477 29.7485C9.90026 30.1186 8.97264 29.4113 9.15521 28.5341L12.0571 19.8756C12.0867 19.7335 12.0867 19.5872 12.0571 19.4451L9.15521 10.7866C8.97264 9.9094 9.90026 9.20207 10.7477 9.57224L31.5568 18.6613Z";

  const arrowPath2 = "M10.6157 30.0919L31.4247 21.0029C31.8725 20.8074 32.0957 20.4033 32.0942 20L11.9472 20C11.9474 20.0734 11.94 20.1468 11.925 20.2191L9.02313 28.8776C8.84056 29.7548 9.76818 30.4621 10.6157 30.0919Z";

  return (
    <div className={className} style={containerStyle}>
      <svg
        width="40"
        height="40"
        viewBox="-2 -2 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x="1"
          y="39"
          width="38"
          height="38"
          rx="19"
          transform="rotate(-90 1 39)"
          fill="white"
        />
        <rect
          x="1"
          y="39"
          width="38"
          height="38"
          rx="19"
          transform="rotate(-90 1 39)"
          stroke="#E63B93"
          strokeWidth="2"
        />
        <path
          d={arrowPath1}
          fill="#E63B93"
        />
        <path
          d={arrowPath2}
          fill="#FD83C2"
        />
      </svg>
    </div>
  );
};

