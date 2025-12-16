// src/types/global.d.ts
export {};

import type { LocationIconSettings, LocationIconSettingsPerFloor } from "./locationIcon";
import type { ImageSettings } from "./imageSettings";
import type { ShopPositionSettings } from "./shopPosition";

interface ElectronAPI {
  getDebugSettingsStatus: () => Promise<any>;
  getBridgeBaseUrl: () => Promise<string>;
  getFloor: () => Promise<string>;
  setFloor: (floor: string) => void;
  onFloorChanged: (cb: (floor: string) => void) => void;

  getLocationIconSettings: () => Promise<LocationIconSettings | LocationIconSettingsPerFloor>;
  saveLocationIconSettings: (
    settings: LocationIconSettings | LocationIconSettingsPerFloor
  ) => Promise<LocationIconSettings | LocationIconSettingsPerFloor>;
  onLocationIconSettingsUpdated: (
    cb: (settings: LocationIconSettings | LocationIconSettingsPerFloor) => void
  ) => () => void;
  onOpenLocationIconSettings: (cb: () => void) => () => void;

  onOpenFloorSettings: (cb: () => void) => () => void;
  onOpenVersionInfo: (cb: () => void) => () => void;
  onOpenSettings: (cb: () => void) => () => void;
  getImageSettings: () => Promise<ImageSettings>;
  saveImageSettings: (settings: ImageSettings) => Promise<ImageSettings>;
  onImageSettingsUpdated: (cb: (settings: ImageSettings) => void) => () => void;
  getShopImage: (filePath: string) => Promise<string | null>;
  getShopPositions: () => Promise<ShopPositionSettings>;
  saveShopPositions: (settings: ShopPositionSettings) => Promise<ShopPositionSettings>;
  onShopPositionsUpdated: (cb: (settings: ShopPositionSettings) => void) => () => void;
  manualUpdateCheck: () => void;
  oneClickUpdate: () => void;
  quitApp: () => void;
}

export type StatusState = 'checking' | 'available' | 'none' | 'downloaded' | 'error';

export interface UpdaterAPI {
  onStatus: (cb: (data: { state: StatusState; message: string }) => void) => void;
  onProgress: (cb: (data: {
    percent: number;
    transferred: number;
    total: number;
    speed: number;
  }) => void) => void;
  checkForUpdatesReady: () => void;
  startupWaitCompleted?: () => void;
}

export interface AppInfoAPI {
  getVersion: () => Promise<string>;
  getLatestVersionInfo: () => Promise<{
    version: string;
    releaseDate?: string;
    releaseNotes?: string;
  } | null>;
}

interface LoggerApi {
  log: (
    level: string,
    message: string,
    context?: Record<string, unknown>
  ) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    __BWP_BASE_URL__?: string;

    electronAPI?: ElectronAPI;
    updater?: UpdaterAPI;
    appInfo?: AppInfoAPI;
    logger?: LoggerApi;
  }
}
