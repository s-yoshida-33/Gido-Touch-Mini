// src/components/MallSelectTab.tsx
import React from "react";
import { AVAILABLE_MALLS } from "../types/mallConfig";

export interface MallSelectTabProps {
  selectedMallId: string;
  onSelectMall: (mallId: string) => void;
}

export const MallSelectTab: React.FC<MallSelectTabProps> = ({
  selectedMallId,
  onSelectMall,
}) => {
  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>
        店舗選択
      </h2>
      
      <div style={{ marginBottom: "20px" }}>
        <label
          htmlFor="mall-select"
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "8px",
          }}
        >
          表示する店舗を選択してください
        </label>
        <select
          id="mall-select"
          value={selectedMallId}
          onChange={(e) => onSelectMall(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          {AVAILABLE_MALLS.map((mall) => (
            <option key={mall.id} value={mall.id}>
              {mall.name.ja} {mall.name.en && `(${mall.name.en})`}
            </option>
          ))}
        </select>
      </div>
      
      <div
        style={{
          padding: "12px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>注意:</strong> 店舗を変更すると、その店舗専用のジャンルアイコン、ピクトグラム、フロアマップが読み込まれます。
        </p>
        <p style={{ margin: 0 }}>
          店舗位置やピクトグラムの設定は、選択した店舗に関連付けられて保存されます。
        </p>
      </div>
    </div>
  );
};

