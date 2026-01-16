import React, { useState } from "react";
import type { MallSettings } from "../types/mall";

interface MallSettingsTabProps {
  mallSettings: MallSettings;
  onChangeMallSettings: (settings: MallSettings) => void;
}

export const MallSettingsTab: React.FC<MallSettingsTabProps> = ({
  mallSettings,
  onChangeMallSettings,
}) => {
  const [keywordInput, setKeywordInput] = useState("");

  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    const currentKeywords = mallSettings.genreMemoIgnoreKeywords || [];
    if (!currentKeywords.includes(keywordInput.trim())) {
      onChangeMallSettings({
        ...mallSettings,
        genreMemoIgnoreKeywords: [...currentKeywords, keywordInput.trim()],
      });
    }
    setKeywordInput("");
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const currentKeywords = mallSettings.genreMemoIgnoreKeywords || [];
    onChangeMallSettings({
      ...mallSettings,
      genreMemoIgnoreKeywords: currentKeywords.filter((k) => k !== keywordToRemove),
    });
  };

  const handleResetKeywords = () => {
    // デフォルトのキーワードリスト（ハードコード）
    const defaultKeywords = [
        "waonpoint加盟店",
        "aeonpayの使えるお店",
        "グルメ",
        "フード",
        "フードコート",
        "レストラン",
        "グルメアリーナ",
        "suzaka蔵",
        "suzuka蔵",
        "レストラン・カフェ",
        "レストラン・グルメ"
    ];
    onChangeMallSettings({
        ...mallSettings,
        genreMemoIgnoreKeywords: defaultKeywords,
    });
  };

  const handleMaxCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChangeMallSettings({
      ...mallSettings,
      maxDisplayCount: isNaN(value) ? 20 : value, // Default to 20 if invalid
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", color: "#ffffff" }}>
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px" }}>ジャンル設定</h3>
        <p style={{ fontSize: "14px", color: "#cccccc", marginBottom: "16px" }}>
          店舗リストやメモ表示の設定を行います。
        </p>

        {/* Max Display Count */}
        <div style={{ marginBottom: "24px" }}>
           <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
            ジャンルメモ最大表示件数
           </label>
           <input
             type="number"
             value={mallSettings.maxDisplayCount ?? 3}
             onChange={handleMaxCountChange}
             min={1}
             max={100}
             style={{
               width: "100%",
               padding: "8px 12px",
               backgroundColor: "rgba(255, 255, 255, 0.05)",
               border: "1px solid rgba(255, 255, 255, 0.1)",
               borderRadius: "6px",
               color: "#ffffff",
               fontSize: "14px",
             }}
           />
           <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
             一度に表示するジャンルメモの最大数を設定します。
           </p>
        </div>

        {/* Ignore Keywords */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ display: "block", fontSize: "14px" }}>
                ジャンルメモ除外キーワード
            </label>
            <button
                onClick={handleResetKeywords}
                style={{
                    fontSize: "12px",
                    color: "#007aff",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline"
                }}
            >
                デフォルトに戻す
            </button>
          </div>
          
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddKeyword();
                  }
              }}
              placeholder="除外するキーワードを入力"
              style={{
                flex: 1,
                padding: "8px 12px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                color: "#ffffff",
                fontSize: "14px",
              }}
            />
            <button
              onClick={handleAddKeyword}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007aff",
                border: "none",
                borderRadius: "6px",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              追加
            </button>
          </div>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {(mallSettings.genreMemoIgnoreKeywords || []).map((keyword) => (
              <div
                key={keyword}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  fontSize: "13px",
                }}
              >
                <span>{keyword}</span>
                <button
                  onClick={() => handleRemoveKeyword(keyword)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ff4444",
                    cursor: "pointer",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "16px",
                    height: "16px",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {(mallSettings.genreMemoIgnoreKeywords || []).length === 0 && (
                <span style={{ color: "#888", fontSize: "13px", fontStyle: "italic" }}>
                    除外キーワードは設定されていません
                </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
             これらのキーワードを含むジャンルメモは表示されなくなります。
           </p>
        </div>
      </div>
    </div>
  );
};
