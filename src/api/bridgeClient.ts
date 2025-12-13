// src/api/bridgeClient.ts
import { getApiBaseUrl, APP_CONFIG } from "../config";
import type { BridgeShop, Shop, FloorId } from "../types/shop";

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

    const defaultFloor = APP_CONFIG.floor;

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

    logInfo("shopList", "Shops fetched & normalized", {
      count: shops.length,
      defaultFloor,
    });

    return shops;
  } catch (error: any) {
    logError("shopList", "Failed to fetch shops from Bridge API", {
      error: error?.message,
      url,
    });
    throw error;
  }
}
