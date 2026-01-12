import React, { useRef, useLayoutEffect } from "react";

interface TwoLineAutoScaleTextProps {
  children: string;
  style?: React.CSSProperties;
  align?: "left" | "right" | "center";
}

export const TwoLineAutoScaleText: React.FC<TwoLineAutoScaleTextProps> = ({ children, style, align = "left" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current && textRef.current && measureRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textFullWidth = measureRef.current.scrollWidth;

      // 2行に収めるための理想幅。
      // 単純な1/2だと、文字幅の偏りで2行目からはみ出る可能性があるため、
      // 安全マージンとして幅を広めに見積もる (1.1倍)。
      const idealWidth = Math.ceil(textFullWidth / 2 * 1.1);

      if (idealWidth > containerWidth) {
        const scale = containerWidth / idealWidth;
        textRef.current.style.width = `${idealWidth}px`;
        textRef.current.style.transform = `scaleX(${scale})`;
      } else {
        textRef.current.style.width = "100%";
        textRef.current.style.transform = "none";
      }
    }
  }, [children]);

  const justifyContent = align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start";
  const transformOrigin = align === "right" ? "right center" : align === "center" ? "center center" : "left center";
  const textAlign = align;

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        width: "100%",
        height: "2.8em", // line-height 1.4 * 2行分
        overflow: "hidden",
        display: "flex",
        alignItems: "center", // 上下中央揃え
        justifyContent: justifyContent,
      }}
    >
      {/* 幅計測用の不可視要素 (1行での幅を測る) */}
      <div
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "nowrap",
          width: "auto",
          height: "auto",
          fontFamily: style?.fontFamily, // フォントスタイルも継承させる
          fontSize: style?.fontSize,
          fontWeight: style?.fontWeight,
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* 実際に表示する要素 */}
      <div
        ref={textRef}
        style={{
          display: "block",
          wordBreak: "break-all",
          whiteSpace: "normal",
          lineHeight: "1.4",
          transformOrigin: transformOrigin,
          textAlign: textAlign,
        }}
      >
        {children}
      </div>
    </div>
  );
};
