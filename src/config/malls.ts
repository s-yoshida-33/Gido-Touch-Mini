import type { MallConfig, MallId, Genre, Facility } from "../types/mall";
import { getMallAssetUrl } from "../utils/assets";

// Helper to create genre object
const createGenre = (mallId: MallId, id: string, name: string, filenameBase: string): Genre => ({
  id,
  name,
  icon: getMallAssetUrl(mallId, "genres/ja", `${filenameBase}.svg`),
  highlightIcon: getMallAssetUrl(mallId, "genres/ja", `${filenameBase}-highlight.svg`),
});

// Helper to create facility object
const createFacility = (mallId: MallId, id: string, name: string, filename: string, mapIconFilename?: string): Facility => {
  const buttonFile = filename;
  const mapFile = mapIconFilename || filename;
  
  return {
    id,
    name,
    icon: getMallAssetUrl(mallId, "pictos/ja", buttonFile),
    highlightIcon: getMallAssetUrl(mallId, "pictos/ja", buttonFile.replace(".svg", "-highlight.svg")),
    iconFile: mapFile,
  };
};

// SUZAKA CONFIG
const suzakaGenres: Genre[] = [
  createGenre("suzaka", "all", "すべて", "all"),
  createGenre("suzaka", "fashion", "ファッション", "fashion"),
  createGenre("suzaka", "fashion_goods", "ファッション雑貨", "fashion-goods"),
  createGenre("suzaka", "sport", "スポーツ＆アウトドア", "sport"),
  createGenre("suzaka", "kids", "キッズ", "kids"),
  createGenre("suzaka", "lifestyle", "ライフスタイル", "lifestyle"),
  createGenre("suzaka", "gourmet", "グルメ", "gourmet"),
  createGenre("suzaka", "entertainment", "エンターテインメント", "entertainment"),
  createGenre("suzaka", "service", "サービス", "survice"),
];

const suzakaFacilities: Facility[] = [
  createFacility("suzaka", "info", "インフォメーション", "info.svg"),
  createFacility("suzaka", "restroom", "トイレ", "restroom.svg"),
  createFacility("suzaka", "priority_restroom", "優先トイレ", "priority-restroom.svg"),
  createFacility("suzaka", "baby_room", "ベビールーム", "baby-room.svg"),
  createFacility("suzaka", "smoking_room", "喫煙所", "smoking-room.svg"),
  createFacility("suzaka", "free_coin_lockers", "無料コインロッカー", "free-coin-lockers.svg"),
  createFacility("suzaka", "atm", "ATM", "atm.svg"),
  createFacility("suzaka", "elevator", "エレベーター", "elevator.svg"),
  createFacility("suzaka", "bus_stop", "バス乗り場", "bus-stop.svg"),
  createFacility("suzaka", "taxi_stand", "タクシーのりば", "taxi-stand.svg"),
];

// SENDAI CONFIG
const sendaiGenres: Genre[] = [
  createGenre("sendai-kamisugi", "all", "すべて", "all"),
  createGenre("sendai-kamisugi", "fashion", "ファッション", "fashion"),
  createGenre("sendai-kamisugi", "fashion_goods", "ファッション雑貨", "fashion-goods"),
  createGenre("sendai-kamisugi", "lifestyle_goods", "ライフスタイル雑貨", "lifestyle-goods"),
  createGenre("sendai-kamisugi", "kids", "キッズ", "kids"),
  createGenre("sendai-kamisugi", "gourmet", "グルメ", "gourmet"),
  createGenre("sendai-kamisugi", "entertainment", "エンターテインメント", "entertainment"),
  createGenre("sendai-kamisugi", "clinic", "クリニック", "clinic"),
  createGenre("sendai-kamisugi", "service", "サービス", "survice"),
];

const sendaiFacilities: Facility[] = [
  createFacility("sendai-kamisugi", "info", "インフォメーション", "info.svg"),
  createFacility("sendai-kamisugi", "restroom", "トイレ", "restroom.svg"),
  createFacility("sendai-kamisugi", "priority_restroom", "多機能トイレ", "priority-restroom.svg"),
  createFacility("sendai-kamisugi", "baby_room", "赤ちゃんルーム", "baby-room.svg"),
  createFacility("sendai-kamisugi", "smoking_room", "喫煙所", "smoking-room.svg"),
  createFacility("sendai-kamisugi", "atm", "ATM", "atm.svg"),
  createFacility("sendai-kamisugi", "elevator", "エレベーター", "elevator.svg"),
  createFacility("sendai-kamisugi", "bus_stop", "バスのりば", "bus-stop.svg"),
];

export const MALL_CONFIGS: Record<MallId, MallConfig> = {
  suzaka: {
    id: "suzaka",
    name: "須坂",
    genres: suzakaGenres,
    facilities: suzakaFacilities,
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
    facilities: sendaiFacilities,
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

