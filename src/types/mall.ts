export type MallId = "suzaka" | "sendai-kamisugi";

export interface MallSettings {
  mallId: MallId;
}

export const DEFAULT_MALL_SETTINGS: MallSettings = {
  mallId: "suzaka",
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
