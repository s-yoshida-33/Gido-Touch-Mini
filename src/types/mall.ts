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
  icon: string;
  highlightIcon: string;
}

export interface Facility {
  id: string;
  name: string;
  icon: string;
  highlightIcon: string;
}

export interface MallConfig {
  id: MallId;
  name: string;
  genres: Genre[];
  facilities: Facility[];
  floorMaps: Record<string, string>;
}
