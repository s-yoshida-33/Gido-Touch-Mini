import { invoke } from '@tauri-apps/api/core';
import type { LocationIconSettingsPerFloor } from '../types/locationIcon';
import type { ImageSettings } from '../types/imageSettings';
import type { ShopPositionSettings } from '../types/shopPosition';
import type { PictoSettings } from '../types/picto';
import type { MallId, MallSettings } from '../types/mall';
import { DEFAULT_IMAGE_SETTINGS } from '../types/imageSettings';
import { DEFAULT_PICTO_SETTINGS } from '../types/picto';
import { DEFAULT_MALL_SETTINGS } from '../types/mall';
import { DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR } from '../config';
import { logInfo, logError } from '../logs/logging';

/**
 * Per-mall data structure stored inside dataByMall.
 */
export interface MallData {
  shopPositions?: ShopPositionSettings;
  pictoSettings?: PictoSettings;
  locationIcons?: LocationIconSettingsPerFloor;
  imageSettings?: ImageSettings;
  genreMemoIgnoreKeywords?: string[];
  maxDisplayCount?: number;
  keywordsInitialized?: boolean;
}

/**
 * Full settings structure persisted to disk.
 */
export interface GidoTouchMiniSettings {
  mallId?: MallId;
  floor?: string;
  mallSettings?: MallSettings;
  locationIcons?: LocationIconSettingsPerFloor;
  shopPositions?: ShopPositionSettings;
  pictoSettings?: PictoSettings;
  imageSettings?: ImageSettings;
  dataByMall?: Record<string, MallData>;
}

const DEFAULT_SHOP_POSITIONS: ShopPositionSettings = { positions: {} };

/**
 * Deep merge utility for nested objects.
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) &&
      tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal)
    ) {
      (result as Record<string, unknown>)[key as string] = deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      );
    } else if (srcVal !== undefined) {
      (result as Record<string, unknown>)[key as string] = srcVal;
    }
  }
  return result;
}

/**
 * Load all settings from disk via Rust backend.
 */
export async function loadSettings(): Promise<GidoTouchMiniSettings> {
  try {
    const json = await invoke<string>('get_settings');
    const raw = JSON.parse(json) as GidoTouchMiniSettings;

    // Priority: top-level mallId (updated early by handleSaveMallId) > mallSettings.mallId
    const mallId = raw.mallId ?? raw.mallSettings?.mallId ?? 'suzaka';
    const dataByMall = raw.dataByMall ?? {};
    const currentMallData = dataByMall[mallId] ?? {};

    return {
      mallId,
      floor: raw.floor ?? '1F',
      mallSettings: {
        ...DEFAULT_MALL_SETTINGS,
        ...raw.mallSettings,
        mallId,
        genreMemoIgnoreKeywords: currentMallData.genreMemoIgnoreKeywords ?? raw.mallSettings?.genreMemoIgnoreKeywords ?? DEFAULT_MALL_SETTINGS.genreMemoIgnoreKeywords,
        maxDisplayCount: currentMallData.maxDisplayCount ?? raw.mallSettings?.maxDisplayCount ?? DEFAULT_MALL_SETTINGS.maxDisplayCount,
        keywordsInitialized: currentMallData.keywordsInitialized ?? raw.mallSettings?.keywordsInitialized ?? true,
      },
      locationIcons: currentMallData.locationIcons ?? raw.locationIcons ?? DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR,
      shopPositions: currentMallData.shopPositions ?? raw.shopPositions ?? DEFAULT_SHOP_POSITIONS,
      pictoSettings: currentMallData.pictoSettings ?? raw.pictoSettings ?? DEFAULT_PICTO_SETTINGS,
      imageSettings: currentMallData.imageSettings ?? raw.imageSettings ?? DEFAULT_IMAGE_SETTINGS,
      dataByMall,
    };
  } catch (error) {
    logError('CONFIG', 'Failed to load settings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      mallId: 'suzaka',
      floor: '1F',
      mallSettings: DEFAULT_MALL_SETTINGS,
      locationIcons: DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR,
      shopPositions: DEFAULT_SHOP_POSITIONS,
      pictoSettings: DEFAULT_PICTO_SETTINGS,
      imageSettings: DEFAULT_IMAGE_SETTINGS,
      dataByMall: {},
    };
  }
}

/**
 * Save all settings to disk via Rust backend.
 */
export async function saveAllSettings(settings: GidoTouchMiniSettings): Promise<void> {
  try {
    const json = JSON.stringify(settings, null, 2);
    await invoke('save_settings', { json });
    logInfo('CONFIG', 'Settings saved successfully');
  } catch (error) {
    logError('CONFIG', 'Failed to save settings', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Partially update settings: load current -> merge -> save.
 */
export async function updateSettings(
  partial: Partial<GidoTouchMiniSettings>,
): Promise<GidoTouchMiniSettings> {
  const current = await loadSettings();
  const merged: GidoTouchMiniSettings = deepMerge(
    current as Record<string, unknown>,
    partial as Record<string, unknown>,
  ) as GidoTouchMiniSettings;

  // Determine target mall for dataByMall update
  const targetMallId = partial.mallSettings?.mallId ?? partial.mallId ?? current.mallSettings?.mallId ?? 'suzaka';

  // Ensure dataByMall exists
  if (!merged.dataByMall) merged.dataByMall = {};
  if (!merged.dataByMall[targetMallId]) merged.dataByMall[targetMallId] = {};

  // Sync per-mall data
  if (partial.shopPositions) {
    merged.dataByMall[targetMallId].shopPositions = merged.shopPositions;
  }
  if (partial.pictoSettings) {
    // For pictoSettings, overwrite instances entirely (allow deletion)
    merged.pictoSettings = partial.pictoSettings;
    merged.dataByMall[targetMallId].pictoSettings = partial.pictoSettings;
  }
  if (partial.locationIcons) {
    merged.dataByMall[targetMallId].locationIcons = merged.locationIcons;
  }
  if (partial.imageSettings) {
    merged.dataByMall[targetMallId].imageSettings = merged.imageSettings;
  }
  if (partial.mallSettings) {
    if (partial.mallSettings.genreMemoIgnoreKeywords !== undefined) {
      merged.dataByMall[targetMallId].genreMemoIgnoreKeywords = partial.mallSettings.genreMemoIgnoreKeywords;
      merged.dataByMall[targetMallId].keywordsInitialized = true;
    }
    if (partial.mallSettings.maxDisplayCount !== undefined) {
      merged.dataByMall[targetMallId].maxDisplayCount = partial.mallSettings.maxDisplayCount;
    }
  }

  await saveAllSettings(merged);
  return merged;
}

/**
 * Save image file via Rust backend (receives raw bytes, no Base64).
 * Returns the absolute path to the saved file.
 */
export async function saveImageFile(
  filename: string,
  data: Uint8Array,
): Promise<string> {
  const response = await invoke<{ success: boolean; path: string }>(
    'save_image_file',
    { filename, data: Array.from(data) },
  );
  return response.path;
}

/**
 * Get absolute path of an image file in the images directory.
 * Returns empty string if file does not exist.
 */
export async function getImagePath(filename: string): Promise<string> {
  return invoke<string>('get_image_path', { filename });
}

/**
 * Delete an image file from the images directory.
 */
export async function deleteImageFile(filename: string): Promise<boolean> {
  return invoke<boolean>('delete_image_file', { filename });
}

/**
 * Read image file as bytes from an arbitrary path.
 */
export async function readImageFile(filePath: string): Promise<number[]> {
  return invoke<number[]>('read_image_file', { filePath });
}
