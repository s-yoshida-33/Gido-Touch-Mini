export type MallId = "suzaka" | "sendaikamisugi";

export interface MallSettings {
  mallId: MallId;
  genreMemoIgnoreKeywords?: string[];
  maxDisplayCount?: number;
  keywordsInitialized?: boolean;
}

export const DEFAULT_MALL_SETTINGS: MallSettings = {
  mallId: "suzaka",
  genreMemoIgnoreKeywords: [
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
  ],
  maxDisplayCount: 3,
  keywordsInitialized: true
};

export interface Genre {
  id: string;
  name: string;
  name_en?: string; // 英語名を追加
  icon: string;
  highlightIcon: string;
  iconFile?: string; // ファイル名解決用に追加
}

export interface Facility {
  id: string;
  name: string;
  name_en?: string; // 英語名を追加
  icon: string;
  highlightIcon: string;
  iconFile: string; // Added for reference in settings
}

export interface MallConfig {
  id: MallId;
  name: string;
  genres: Genre[];
  facilities: Facility[];
  floorMaps: Record<string, string>;
}
