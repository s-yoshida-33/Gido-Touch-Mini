// src/screens/MallSelectScreen.tsx
import React, { useState } from "react";
import { MALL_CONFIGS } from "../config/malls";
import type { MallId } from "../types/mall";
import { getAssetUrl } from "../utils/assets";

const iconSvg = getAssetUrl("icon.svg");

interface MallSelectScreenProps {
  onSelect: (mallId: MallId) => void;
}

const mallEntries = Object.entries(MALL_CONFIGS) as [MallId, (typeof MALL_CONFIGS)[MallId]][];

const MallSelectScreen: React.FC<MallSelectScreenProps> = ({ onSelect }) => {
  const [selected, setSelected] = useState<MallId>(mallEntries[0][0]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#1C1C1C",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Rounded Mplus 1c', sans-serif",
        zIndex: 20000,
      }}
    >
      {/* Logo */}
      <img
        src={iconSvg || undefined}
        alt="Gido Touch Mini"
        style={{ width: 64, height: 64, marginBottom: 16 }}
      />

      {/* Title */}
      <h1
        style={{
          color: "#ffffff",
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Gido Touch Mini
      </h1>

      <p
        style={{
          color: "rgba(255, 255, 255, 0.6)",
          fontSize: 16,
          marginBottom: 40,
        }}
      >
        デフォルトのモールを選択してください
      </p>

      {/* Mall list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 360 }}>
        {mallEntries.map(([id, config]) => {
          const isSelected = selected === id;
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "18px 24px",
                borderRadius: 12,
                border: isSelected
                  ? "2px solid #007aff"
                  : "2px solid rgba(255, 255, 255, 0.15)",
                backgroundColor: isSelected
                  ? "rgba(0, 122, 255, 0.15)"
                  : "rgba(255, 255, 255, 0.05)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {/* Radio indicator */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: isSelected
                    ? "2px solid #007aff"
                    : "2px solid rgba(255, 255, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: "#007aff",
                    }}
                  />
                )}
              </div>

              {/* Labels */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: 18,
                    fontWeight: isSelected ? 700 : 500,
                  }}
                >
                  {config.name}
                </span>
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.4)",
                    fontSize: 13,
                  }}
                >
                  {id}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        onClick={() => onSelect(selected)}
        style={{
          marginTop: 40,
          padding: "14px 64px",
          backgroundColor: "#007aff",
          border: "none",
          borderRadius: 10,
          color: "#ffffff",
          fontSize: 18,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        決定
      </button>
    </div>
  );
};

export default MallSelectScreen;
