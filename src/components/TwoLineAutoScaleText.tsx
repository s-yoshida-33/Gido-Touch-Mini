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
      const containerHeight = containerRef.current.clientHeight;
      const textFullWidth = measureRef.current.scrollWidth;

      // 1. 初期推定: 全体幅の半分 * マージン
      // 少し余裕(1.05倍)を持たせてスタート
      let currentWidth = Math.ceil((textFullWidth / 2) * 1.05);

      // いったん幅を設定してレイアウトさせる
      textRef.current.style.width = `${currentWidth}px`;

      // 2. 高さが収まるまで幅を広げるループ
      // 中身の高さ(scrollHeight)が表示領域の高さ(containerHeight)を超えている間は幅を足す
      const MAX_RETRIES = 20;
      let retries = 0;

      // 多少の誤差(1px程度)は許容する
      while (textRef.current.scrollHeight > containerHeight + 1 && retries < MAX_RETRIES) {
        // 幅を少しずつ広げる (全体の5%ずつ追加)
        currentWidth += Math.ceil(textFullWidth * 0.05);
        textRef.current.style.width = `${currentWidth}px`;
        retries++;
      }

      // 3. 最終的な幅でスケーリング判定
      if (currentWidth > containerWidth) {
        const scale = containerWidth / currentWidth;
        textRef.current.style.width = `${currentWidth}px`;
        textRef.current.style.transform = `scaleX(${scale})`;
      } else {
        textRef.current.style.width = "100%";
        textRef.current.style.transform = "none";
      }
    }
  }, [children]);

  // アライメント設定
  const justifyContent = align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start";
  // scaleXの基点（右寄せなら右端から縮小）
  const transformOrigin = align === "right" ? "right center" : align === "center" ? "center center" : "left center";

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        width: "100%",
        height: "2.8em",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: justifyContent,
      }}
    >
      {/* 計測用（不可視・改行なし） */}
      <div
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "nowrap",
          width: "auto",
          fontFamily: style?.fontFamily,
          fontSize: style?.fontSize,
          fontWeight: style?.fontWeight,
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* 表示用 */}
      <div
        ref={textRef}
        style={{
          display: "block",
          wordBreak: "break-all", // 任意の位置で改行可能にする
          lineHeight: "1.4",
          transformOrigin: transformOrigin,
          textAlign: align,
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};
