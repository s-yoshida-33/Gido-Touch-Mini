import type { AnimationConfig } from "./locationIcon";

// ピクトグラムのタグ（FACILITY_LISTのIDと対応させることを想定）
// ユーザーが任意に追加できる余地を残すため、基本はstring型
export type PictoTag = 
  | "info" 
  | "restroom" 
  | "priority_restroom" 
  | "baby_room" 
  | "smoking_room" 
  | "free_coin_lockers" 
  | "atm" 
  | "elevator" 
  | "bus_stop" 
  | "taxi_stand" 
  | string;

export interface PictoInstance {
  id: string;          // UUID
  tag: PictoTag;       // 紐づくタグ
  iconName: string;    // ファイル名 (例: "restroom.svg")
  floor: string;       // "1F", "2F", etc.
  x: number;           // %座標
  y: number;           // %座標
  size: number;        // サイズ (px)
  rotation: number;    // 回転角度
  
  shadow?: {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    opacity: number;
  };
  
  // 個別のアニメーション設定
  // 未定義の場合はデフォルト設定（あるいはタグごとの設定）に従う運用も可能だが、
  // 今回はインスタンスごとに持てるようにしておく
  animation?: AnimationConfig;
}

export interface PictoSettings {
  instances: Record<string, PictoInstance>;
}

export const DEFAULT_PICTO_SETTINGS: PictoSettings = {
  instances: {},
};

