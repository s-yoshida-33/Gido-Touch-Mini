// src/api/bridgeClient.ts
import { getApiBaseUrl, APP_CONFIG } from "../config";
import type { BridgeShop, Shop, FloorId } from "../types/shop";
import type { ShopNews } from "../types/shopNews";

import { logInfo, logWarn, logError } from "../logs/logging";

// Normalize floor id string (you can extend this if needed)
function normalizeFloorId(value: string): FloorId {
  if (!value) return "";
  const trimmed = value.trim().toUpperCase();
  // If it's just a number like "1", convert to "1F"
  if (trimmed.match(/^[0-9]+$/)) {
    return `${trimmed}F`;
  }
  return trimmed;
}

// Parse floors from BridgeShop into FloorId[]
function parseFloorsFromBridge(
  rawFloors: unknown,
  fallbackFloor: string
): FloorId[] {
  let floors: string[] = [];

  // Handle case where floors is array of objects from new API format
  if (Array.isArray(rawFloors)) {
    // Check if it's an array of objects
    if (rawFloors.length > 0 && typeof rawFloors[0] === 'object' && rawFloors[0] !== null) {
       floors = rawFloors.map((f: any) => f.floor_name || f.name || "").filter(Boolean);
    } else {
      // Already an array of strings/numbers: ["1F", "2F", "3F"]
      floors = rawFloors.map((f) => String(f));
    }
  } else if (typeof rawFloors === "string") {
    // Comma-separated string: "1F,2F,3F"
    floors = rawFloors
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }

  // If floors is still empty, fallback to provided default floor
  if (floors.length === 0 && fallbackFloor) {
    floors = [fallbackFloor];
  }

  // Normalize and remove empty values
  const normalized = floors
    .map((f) => normalizeFloorId(f))
    .filter((f) => f !== "");

  return normalized;
}

// Fetches shop list from BridgeWebPopper and normalizes it to Shop[]
export async function fetchShopsFromBridge(): Promise<Shop[]> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/shops`;

  logInfo("shopList", "Requesting shops from Bridge API", { url });

  try {
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      logWarn("shopList", "Bridge API returned non-200 response", {
        status: res.status,
        statusText: res.statusText,
      });
      throw new Error(`Bridge API error: HTTP ${res.status}`);
    }

    const json = await res.json();
    return parseShopsData(json, APP_CONFIG.floor);

  } catch (error: any) {
    logError("shopList", "Failed to fetch shops from Bridge API", {
      error: error?.message,
      url,
    });
    throw error;
  }
}

export function parseShopsData(json: any, defaultFloor: string = "1F"): Shop[] {
    // Detect structure
    let rawList: BridgeShop[] = [];
    if (Array.isArray(json)) {
      rawList = json;
    } else if (Array.isArray((json as any).data)) {
      rawList = (json as any).data;
      logInfo(
        "shopList",
        "Bridge API returned data under json.data (legacy format)"
      );
    } else if (Array.isArray((json as any).items)) {
      rawList = (json as any).items;
      logInfo(
        "shopList",
        "Bridge API returned data under json.items (legacy format)"
      );
    } else {
      logInfo("shopList", "Bridge API response did not contain an array", {
        receivedKeys: Object.keys(json),
      });
    }

    const shops: Shop[] = rawList.map((item) => {
      // Use floors array if available, otherwise fallback to single floor property
      // Note: new format only has floors, no floor
      const sourceFloors = item.floors;
        
      const floors = parseFloorsFromBridge(sourceFloors, defaultFloor);

      if (floors.length === 0) {
        logWarn("shopList", "Shop has no floors after normalization", {
          shopId: item.shopId,
          name: item.shopName,
          rawFloors: item.floors,
          defaultFloor,
        });
      }

      // Prioritize local paths if available
      const shopLogoValue = item.shopLogoLocalPath || item.shopLogo;
      const photo1Value = item.photo1LocalPath || item.photo1;
      const photo2Value = item.photo2LocalPath || item.photo2;

      return {
        shopId: String(item.shopId),
        name: item.shopName,
        nameKana: item.shopNameKana, // マッピング追加
        nameEn: item.shopNameEnglish,
        genre: item.genre,
        genreSub: item.genreSub,
        genreMemo: item.genreMemo,
        genreMemoEn: item.genreMemoEnglish,
        number: item.number,
        floors,
        photo1: photo1Value,
        photo2: photo2Value,
        shopLogo: shopLogoValue,
        description: item.description,
        openTime: item.openTime,
        tel: item.tel,
        searches: item.searches, // 検索用キーワード（カンマ区切り）
      };
    });

    logInfo("shopList", "Shops normalized", {
      count: shops.length,
      defaultFloor,
    });

    return shops;
}

// Fetches shop news from BridgeWebPopper and normalizes it to ShopNews[]
export async function fetchShopNewsFromBridge(): Promise<ShopNews[]> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/event-news`; // Changed from /api/shop-news

  logInfo("shopNews", "Requesting shop news from Bridge API", { url });

  try {
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      logWarn("shopNews", "Bridge API returned non-200 response", {
        status: res.status,
        statusText: res.statusText,
      });
      // 失敗しても空配列を返してアプリが落ちないようにする
      return [];
    }

    const json = await res.json();
    return parseEventNewsData(json);

  } catch (error: any) {
    logError("shopNews", "Failed to fetch shop news from Bridge API", {
      error: error?.message,
      url,
    });
    return [];
  }
}

export function parseEventNewsData(json: any): ShopNews[] {
    // Detect structure
    let rawList: any[] = []; // Use any for raw processing before casting
    if (Array.isArray(json)) {
      rawList = json;
    } else if (Array.isArray((json as any).data)) {
      rawList = (json as any).data;
    } else if (Array.isArray((json as any).items)) {
      rawList = (json as any).items;
    } else if (json && typeof json === "object" && ("shop_news_id" in json || "id" in json || "event_id" in json)) {
      // Single object response
      rawList = [json];
      logInfo("shopNews", "Bridge API response is a single object, treating as array of 1");
    } else {
      logInfo("shopNews", "Bridge API response did not contain an array", {
        receivedKeys: Object.keys(json),
      });
    }

    if (rawList.length > 0) {
      logInfo("shopNews", "Raw shop news item sample (first item)", {
        keys: Object.keys(rawList[0]),
        sample: rawList[0]
      });
    }

    const news: ShopNews[] = rawList.map((item) => {
      // Prioritize local paths if available
      const imageUrl = item.photo1LocalPath || item.photo1_local_path || item.photo1_remote_url || item.image_url || item.imageUrl;

      // Handle ID: Try shop_news_id, then id, then event_id, then fallback to index or unique property
      const id = String(item.shop_news_id || item.id || item.event_id || item.news_id || Math.random().toString(36).substr(2, 9));

      return {
        id,
        shopId: String(item.shop_id || item.shopId || ""),
        title: item.title,
        body: item.body || item.content || "",
        imageUrl,
        startDate: item.start_date || item.startDate || item.date_start,
        endDate: item.end_date || item.endDate || item.date_end,
        time: item.time || "", // Map potential time field
        place: item.place || item.location || item.venues || "", // Map potential place/location field
        updatedAt: item.update_date || item.updatedAt || "",
      };
    });

    logInfo("shopNews", "Shop news (Event News) normalized", {
      count: news.length,
    });

    return news;
}

// Fetches shop events/news list from BridgeWebPopper (/api/shop-news)
export async function fetchShopNewsListFromBridge(): Promise<ShopNews[]> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/shop-news`;

  logInfo("shopNewsList", "Requesting shop news list from Bridge API", { url });

  try {
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      logWarn("shopNewsList", "Bridge API returned non-200 response", {
        status: res.status,
        statusText: res.statusText,
      });
      return [];
    }

    const json = await res.json();
    return parseShopNewsData(json);

  } catch (error: any) {
    logError("shopNewsList", "Failed to fetch shop news list from Bridge API", {
      error: error?.message,
      url,
    });
    return [];
  }
}

export function parseShopNewsData(json: any): ShopNews[] {
    // Detect structure
    let rawList: any[] = [];
    if (Array.isArray(json)) {
      rawList = json;
    } else if (Array.isArray((json as any).data)) {
      rawList = (json as any).data;
    } else if (Array.isArray((json as any).items)) {
      rawList = (json as any).items;
    } else if (json && typeof json === "object" && ("shop_news_id" in json || "id" in json)) {
      rawList = [json];
      logInfo("shopNewsList", "Bridge API response is a single object, treating as array of 1");
    } else {
      logInfo("shopNewsList", "Bridge API response did not contain an array", {
        receivedKeys: Object.keys(json),
      });
    }

    const news: ShopNews[] = rawList.map((item) => {
      // Prioritize local paths if available
      const imageUrl = item.photo1LocalPath || item.photo1_local_path || item.photo1_remote_url || item.image_url || item.imageUrl;

      // Handle ID
      const id = String(item.shop_news_id || item.id || item.news_id || Math.random().toString(36).substr(2, 9));

      return {
        id,
        shopId: String(item.shop_id || item.shopId || ""),
        title: item.title,
        body: item.body || item.content || "",
        imageUrl,
        startDate: item.date_start || item.start_date || item.startDate,
        endDate: item.date_end || item.end_date || item.endDate,
        time: item.time || "",
        place: item.place || item.location || "",
        updatedAt: item.update_date || item.updatedAt || "",
      };
    });

    logInfo("shopNewsList", "Shop news list normalized", {
      count: news.length,
    });

    return news;
}
