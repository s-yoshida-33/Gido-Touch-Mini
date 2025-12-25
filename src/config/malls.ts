import type { MallConfig, MallId, Genre } from "../types/mall";
import { getMallAssetUrl } from "../utils/assets";

// Helper to create genre object
const createGenre = (mallId: MallId, id: string, name: string, filenameBase: string): Genre => ({
  id,
  name,
  icon: getMallAssetUrl(mallId, "genres/ja", `${filenameBase}.svg`),
  highlightIcon: getMallAssetUrl(mallId, "genres/ja", `${filenameBase}-highlight.svg`),
});

// Helper to create facility object (pictos/ja or similar)
// Note: Facilities (bottom buttons) usually use pictos or specific UI assets.
// Based on current ShopListScreen, they use imports from assets/ (e.g. icon-search.svg).
// If these are mall-specific, they should be in mall assets.
// For now, let's assume common assets for some, but if mall specific, use getMallAssetUrl.
// The current list_dir shows pictos in mall folders.

// SUZAKA CONFIG
const suzakaGenres: Genre[] = [
  createGenre("suzaka", "all", "All", "all"),
  createGenre("suzaka", "fashion", "Fashion", "fashion"),
  createGenre("suzaka", "fashion_goods", "Fashion Goods", "fashion-goods"),
  createGenre("suzaka", "sport", "Sport", "sport"),
  createGenre("suzaka", "kids", "Kids", "kids"),
  createGenre("suzaka", "lifestyle", "Lifestyle", "lifestyle"),
  createGenre("suzaka", "gourmet", "Gourmet", "gourmet"),
  createGenre("suzaka", "entertainment", "Entertainment", "entertainment"),
  createGenre("suzaka", "service", "Service", "survice"), // File name is survice
];

// SENDAI CONFIG
const sendaiGenres: Genre[] = [
  createGenre("sendai-kamisugi", "all", "All", "all"),
  createGenre("sendai-kamisugi", "clinic", "Clinic", "clinic"),
  createGenre("sendai-kamisugi", "entertainment", "Entertainment", "entertainment"),
  createGenre("sendai-kamisugi", "fashion", "Fashion", "fashion"),
  createGenre("sendai-kamisugi", "fashion_goods", "Fashion Goods", "fashion-goods"),
  createGenre("sendai-kamisugi", "gourmet", "Gourmet", "gourmet"),
  createGenre("sendai-kamisugi", "lifestyle", "Lifestyle Goods", "ifestyle-goods"), // Typo in filename: ifestyle-goods
  createGenre("sendai-kamisugi", "kids", "Kids", "kids"),
  createGenre("sendai-kamisugi", "service", "Service", "survice"), // Typo in filename: survice
];

// Facilities definitions if needed per mall, or use common one.
// For now, keeping facility definitions simple or empty if not strictly required to change yet.

export const MALL_CONFIGS: Record<MallId, MallConfig> = {
  suzaka: {
    id: "suzaka",
    name: "須坂",
    genres: suzakaGenres,
    facilities: [], // To be populated if needed
    floorMaps: {
      "1F": getMallAssetUrl("suzaka", "maps", "1F.svg"),
      "2F": getMallAssetUrl("suzaka", "maps", "2F.svg"),
      "3F": getMallAssetUrl("suzaka", "maps", "3F.svg"),
      "4F": getMallAssetUrl("suzaka", "maps", "4F.svg"),
    },
  },
  "sendai-kamisugi": {
    id: "sendai-kamisugi",
    name: "仙台上杉",
    genres: sendaiGenres,
    facilities: [],
    floorMaps: {
      "1F": getMallAssetUrl("sendai-kamisugi", "maps", "1F.svg"),
      "2F": getMallAssetUrl("sendai-kamisugi", "maps", "2F.svg"),
      "3F": getMallAssetUrl("sendai-kamisugi", "maps", "3F.svg"),
      "4F": getMallAssetUrl("sendai-kamisugi", "maps", "4F.svg"),
    },
  },
};

export const getMallConfig = (mallId: MallId): MallConfig => {
  return MALL_CONFIGS[mallId] || MALL_CONFIGS.suzaka;
};

