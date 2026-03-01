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

// ============================================================================
// Type definitions
// ============================================================================

/**
 * Global app settings stored in settings.json.
 * Contains only the active mall selection and current floor.
 */
export interface GlobalSettings {
  mallId: MallId;
  floor: string;
}

/**
 * Per-mall settings stored in [mallId]-settings.json.
 * Each mall has its own independent settings file.
 */
export interface MallSettingsFile {
  mallSettings: MallSettings;
  locationIcons: LocationIconSettingsPerFloor;
  shopPositions: ShopPositionSettings;
  pictoSettings: PictoSettings;
  imageSettings: ImageSettings;
}

/** Legacy settings structure for migration */
interface LegacySettings {
  mallId?: string;
  floor?: string;
  mallSettings?: MallSettings;
  locationIcons?: LocationIconSettingsPerFloor;
  shopPositions?: ShopPositionSettings;
  pictoSettings?: PictoSettings;
  imageSettings?: ImageSettings;
  dataByMall?: Record<string, {
    shopPositions?: ShopPositionSettings;
    pictoSettings?: PictoSettings;
    locationIcons?: LocationIconSettingsPerFloor;
    imageSettings?: ImageSettings;
    genreMemoIgnoreKeywords?: string[];
    maxDisplayCount?: number;
    keywordsInitialized?: boolean;
  }>;
}

const DEFAULT_SHOP_POSITIONS: ShopPositionSettings = { positions: {} };

/**
 * Map legacy mall IDs to their current equivalents.
 * Used during migration to avoid creating stale settings files.
 */
const LEGACY_MALL_ID_MAP: Record<string, string> = {
  'sendai-kamisugi': 'sendaikamisugi',
};

// ============================================================================
// Defaults
// ============================================================================

export function getDefaultMallSettingsFile(mallId: string): MallSettingsFile {
  return {
    mallSettings: { ...DEFAULT_MALL_SETTINGS, mallId: mallId as MallId },
    locationIcons: DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR,
    shopPositions: DEFAULT_SHOP_POSITIONS,
    pictoSettings: DEFAULT_PICTO_SETTINGS,
    imageSettings: DEFAULT_IMAGE_SETTINGS,
  };
}

// ============================================================================
// Global settings (settings.json)
// ============================================================================

export async function loadGlobalSettings(): Promise<GlobalSettings> {
  try {
    const json = await invoke<string>('get_settings');
    const raw = JSON.parse(json);
    return {
      mallId: (raw.mallId ?? 'suzaka') as MallId,
      floor: raw.floor ?? '1F',
    };
  } catch (error) {
    logError('CONFIG', 'Failed to load global settings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { mallId: 'suzaka', floor: '1F' };
  }
}

export async function saveGlobalSettings(settings: GlobalSettings): Promise<void> {
  const json = JSON.stringify(settings, null, 2);
  await invoke('save_settings', { json });
  logInfo('CONFIG', 'Global settings saved', { mallId: settings.mallId });
}

// ============================================================================
// Per-mall settings ([mallId]-settings.json)
// ============================================================================

function mallSettingsFilename(mallId: string): string {
  return `${mallId}-settings.json`;
}

export async function loadMallSettings(mallId: string): Promise<MallSettingsFile> {
  try {
    const filename = mallSettingsFilename(mallId);
    const json = await invoke<string>('get_named_settings', { filename });
    const raw = JSON.parse(json);

    // If empty object, return defaults
    if (!raw || Object.keys(raw).length === 0) {
      return getDefaultMallSettingsFile(mallId);
    }

    return {
      mallSettings: {
        ...DEFAULT_MALL_SETTINGS,
        ...raw.mallSettings,
        mallId: mallId as MallId,
      },
      locationIcons: raw.locationIcons ?? DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR,
      shopPositions: raw.shopPositions ?? DEFAULT_SHOP_POSITIONS,
      pictoSettings: raw.pictoSettings ?? DEFAULT_PICTO_SETTINGS,
      imageSettings: raw.imageSettings ?? DEFAULT_IMAGE_SETTINGS,
    };
  } catch (error) {
    logError('CONFIG', 'Failed to load mall settings', {
      mallId,
      error: error instanceof Error ? error.message : String(error),
    });
    return getDefaultMallSettingsFile(mallId);
  }
}

export async function saveMallSettings(
  mallId: string,
  settings: MallSettingsFile,
): Promise<void> {
  const filename = mallSettingsFilename(mallId);
  const json = JSON.stringify(settings, null, 2);
  await invoke('save_named_settings', { filename, json });
  logInfo('CONFIG', 'Mall settings saved', { mallId, filename });
}

export async function mallSettingsFileExists(mallId: string): Promise<boolean> {
  const filename = mallSettingsFilename(mallId);
  return invoke<boolean>('settings_file_exists', { filename });
}

export async function ensureMallSettingsFile(mallId: string): Promise<void> {
  const exists = await mallSettingsFileExists(mallId);
  if (!exists) {
    const defaults = getDefaultMallSettingsFile(mallId);
    await saveMallSettings(mallId, defaults);
    logInfo('CONFIG', 'Created default mall settings file', { mallId });
  }
}

// ============================================================================
// Migration from legacy single-file format
// ============================================================================

export async function migrateFromLegacyIfNeeded(): Promise<boolean> {
  try {
    const json = await invoke<string>('get_settings');
    const raw = JSON.parse(json) as LegacySettings;

    // If there's no legacy data indicators, skip migration
    if (!raw.mallSettings && !raw.dataByMall && !raw.shopPositions) {
      return false;
    }

    // Check if per-mall files already exist (migration already done)
    const globalMallId = raw.mallId ?? raw.mallSettings?.mallId ?? 'suzaka';
    const exists = await mallSettingsFileExists(globalMallId);
    if (exists) {
      return false;
    }

    logInfo('CONFIG', 'Starting legacy settings migration');

    // Normalize global mall ID (map legacy IDs to current ones)
    const normalizedGlobalMallId = LEGACY_MALL_ID_MAP[globalMallId] ?? globalMallId;

    const dataByMall = raw.dataByMall ?? {};

    // Collect all legacy mall IDs and normalize them.
    // If both "sendai-kamisugi" and "sendaikamisugi" exist in dataByMall,
    // the new ID's data takes priority (it's more recent).
    const mergedMallData = new Map<string, typeof dataByMall[string]>();

    // First, add the global mall entry
    mergedMallData.set(normalizedGlobalMallId, {});

    // Then process dataByMall entries, normalizing IDs
    for (const [legacyId, data] of Object.entries(dataByMall)) {
      const normalizedId = LEGACY_MALL_ID_MAP[legacyId] ?? legacyId;
      // Only set if not already present (new ID data takes priority)
      if (!mergedMallData.has(normalizedId)) {
        mergedMallData.set(normalizedId, data);
      } else if (legacyId === normalizedId) {
        // This IS the new ID — overwrite any legacy data
        mergedMallData.set(normalizedId, data);
      }
      // else: legacy ID entry, but new ID already present — skip
    }

    for (const [mallId, mallData] of mergedMallData) {
      const data = mallData ?? {};
      const isGlobal = mallId === normalizedGlobalMallId;

      const settings: MallSettingsFile = {
        mallSettings: {
          ...DEFAULT_MALL_SETTINGS,
          mallId: mallId as MallId,
          genreMemoIgnoreKeywords:
            data.genreMemoIgnoreKeywords ??
            (isGlobal ? raw.mallSettings?.genreMemoIgnoreKeywords : undefined) ??
            DEFAULT_MALL_SETTINGS.genreMemoIgnoreKeywords,
          maxDisplayCount:
            data.maxDisplayCount ??
            (isGlobal ? raw.mallSettings?.maxDisplayCount : undefined) ??
            DEFAULT_MALL_SETTINGS.maxDisplayCount,
          keywordsInitialized:
            data.keywordsInitialized ??
            (isGlobal ? raw.mallSettings?.keywordsInitialized : undefined) ??
            true,
        },
        locationIcons:
          data.locationIcons ??
          (isGlobal ? raw.locationIcons : undefined) ??
          DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR,
        shopPositions:
          data.shopPositions ??
          (isGlobal ? raw.shopPositions : undefined) ??
          DEFAULT_SHOP_POSITIONS,
        pictoSettings:
          data.pictoSettings ??
          (isGlobal ? raw.pictoSettings : undefined) ??
          DEFAULT_PICTO_SETTINGS,
        imageSettings:
          data.imageSettings ??
          (isGlobal ? raw.imageSettings : undefined) ??
          DEFAULT_IMAGE_SETTINGS,
      };

      await saveMallSettings(mallId, settings);
    }

    // Overwrite settings.json with clean global-only format (using normalized ID)
    await saveGlobalSettings({
      mallId: normalizedGlobalMallId as MallId,
      floor: raw.floor ?? '1F',
    });

    logInfo('CONFIG', 'Legacy settings migration completed', {
      malls: Array.from(mergedMallData.keys()),
    });

    return true;
  } catch (error) {
    logError('CONFIG', 'Failed to migrate legacy settings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ============================================================================
// Image file utilities (unchanged)
// ============================================================================

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
