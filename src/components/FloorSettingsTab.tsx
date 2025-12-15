import React from "react";
import type { FloorId } from "../types/floorLayout";

interface FloorSettingsTabProps {
  floor: FloorId;
  onChangeFloor: (floor: FloorId) => void;
}

export const FloorSettingsTab: React.FC<FloorSettingsTabProps> = ({
  floor,
  onChangeFloor,
}) => {
  const floors: FloorId[] = ["1F", "2F", "3F", "4F"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", color: "#ffffff" }}>
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px" }}>カレントフロア設定</h3>
        <p style={{ fontSize: "14px", color: "#cccccc", marginBottom: "16px" }}>
          この端末が設置されているフロアを選択してください。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {floors.map((f) => (
            <label
              key={f}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                padding: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                border: floor === f ? "1px solid #007aff" : "1px solid transparent",
              }}
            >
              <input
                type="radio"
                name="floor"
                value={f}
                checked={floor === f}
                onChange={() => onChangeFloor(f)}
                style={{ accentColor: "#007aff", width: "18px", height: "18px" }}
              />
              <span style={{ fontSize: "16px", fontWeight: floor === f ? "bold" : "normal" }}>{f}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
