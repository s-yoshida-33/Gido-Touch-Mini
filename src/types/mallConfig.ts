// src/types/mallConfig.ts
import type { PictoTag } from "./picto";

// ジャンル設定
export interface GenreConfig {
  id: string;
  name: { ja: string; en?: string };
  iconFile: string; // ファイル名（例: "icon_all.svg"）
  genreMatch?: string; // 店舗データのgenreとマッチングする文字列
  order: number; // 表示順序
}

// ピクト設定
export interface PictoConfig {
  id: string;
  tag: PictoTag;
  name: { ja: string; en?: string };
  buttonFile: string; // ボタン用ファイル名（例: "button-info.svg"）
  iconFile: string; // アイコン用ファイル名（例: "info.svg"）
  order: number; // 表示順序
}

// モール設定
export interface MallGenreConfig {
  genres: GenreConfig[];
}

export interface MallPictoConfig {
  pictos: PictoConfig[];
}

// モール情報
export interface MallInfo {
  id: string;
  name: { ja: string; en?: string };
}

// 利用可能なモール一覧
export const AVAILABLE_MALLS: MallInfo[] = [
  { id: "suzaka", name: { ja: "須坂", en: "Suzaka" } },
  { id: "sendai-kamisugi", name: { ja: "仙台上杉", en: "Sendai Kamisugi" } },
];

