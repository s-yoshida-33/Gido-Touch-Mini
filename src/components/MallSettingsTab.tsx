import React, { useMemo, useState } from "react";
import type { MallSettings } from "../types/mall";
import type { Shop } from "../types/shop";

interface MallSettingsTabProps {
  mallSettings: MallSettings;
  onChangeMallSettings: (settings: MallSettings) => void;
  shops?: Shop[];
}

export const MallSettingsTab: React.FC<MallSettingsTabProps> = ({
  mallSettings,
  onChangeMallSettings,
  shops = [],
}) => {
  const [keywordInput, setKeywordInput] = useState("");
  const [hiddenShopIdInput, setHiddenShopIdInput] = useState("");
  const [showHiddenShopDropdown, setShowHiddenShopDropdown] = useState(false);

  // 非表示ショップの追加
  const handleAddHiddenShopId = () => {
    const trimmed = hiddenShopIdInput.trim();
    if (!trimmed) return;
    const currentIds = mallSettings.hiddenShopIds || [];
    if (!currentIds.includes(trimmed)) {
      onChangeMallSettings({
        ...mallSettings,
        hiddenShopIds: [...currentIds, trimmed],
      });
    }
    setHiddenShopIdInput("");
  };

  // 非表示ショップの削除
  const handleRemoveHiddenShopId = (idToRemove: string) => {
    onChangeMallSettings({
      ...mallSettings,
      hiddenShopIds: (mallSettings.hiddenShopIds || []).filter((id) => id !== idToRemove),
    });
  };

  // ショップIDから表示用ラベルを生成（例: "[408] 店名 (ID: 135)"）
  const getShopLabel = (shopId: string): string => {
    const shop = shops.find((s) => s.shopId === shopId);
    if (!shop) return `ID: ${shopId}（現在のショップデータに無し）`;
    return `${shop.number ? `[${shop.number}] ` : ""}${shop.name} (ID: ${shopId})`;
  };

  // 非表示ショップ用 候補リスト（ショップID・区画番号・店名で絞り込み、区画番号順）
  const filteredHiddenShopOptions = useMemo(() => {
    const hiddenIds = mallSettings.hiddenShopIds || [];
    const query = hiddenShopIdInput.trim().toLowerCase();
    return shops
      .filter((shop) => shop.shopId && !hiddenIds.includes(shop.shopId))
      .filter((shop) => {
        if (!query) return true;
        return (
          (shop.shopId || "").toLowerCase().includes(query) ||
          (shop.number || "").toLowerCase().includes(query) ||
          (shop.name || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (a.number || "").localeCompare(b.number || "", undefined, { numeric: true }));
  }, [shops, mallSettings.hiddenShopIds, hiddenShopIdInput]);

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

        {/* Hidden Shops */}
        <div style={{ marginTop: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
            非表示ショップ
          </label>

          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                value={hiddenShopIdInput}
                onChange={(e) => {
                  setHiddenShopIdInput(e.target.value);
                  setShowHiddenShopDropdown(true);
                }}
                onFocus={() => setShowHiddenShopDropdown(true)}
                onBlur={() => setShowHiddenShopDropdown(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHiddenShopId();
                    setShowHiddenShopDropdown(false);
                  }
                }}
                placeholder="リストから選択またはショップIDを入力"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 12px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  color: "#ffffff",
                  fontSize: "14px",
                }}
              />
              {showHiddenShopDropdown && filteredHiddenShopOptions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    width: "100%",
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: "#2a2a2a",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "0 0 6px 6px",
                    zIndex: 100,
                  }}
                >
                  {filteredHiddenShopOptions.map((shop) => (
                    <div
                      key={shop.shopId}
                      // onBlurより先に選択を確定させるためonMouseDownを使用
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setHiddenShopIdInput(shop.shopId || "");
                        setShowHiddenShopDropdown(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "13px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {getShopLabel(shop.shopId || "")}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleAddHiddenShopId}
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
            {(mallSettings.hiddenShopIds || []).map((shopId) => (
              <div
                key={shopId}
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
                <span>{getShopLabel(shopId)}</span>
                <button
                  onClick={() => handleRemoveHiddenShopId(shopId)}
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
            {(mallSettings.hiddenShopIds || []).length === 0 && (
                <span style={{ color: "#888", fontSize: "13px", fontStyle: "italic" }}>
                    非表示ショップは設定されていません
                </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
             これらのショップIDの店舗は、ショップデータ（API）に存在していても表示されなくなります。屋号変更などで旧店舗のページがHPに残る場合に使用します。
           </p>
        </div>
      </div>
    </div>
  );
};
