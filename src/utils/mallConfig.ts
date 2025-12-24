// src/utils/mallConfig.ts
import type { MallGenreConfig, MallPictoConfig } from '../types/mallConfig';

/**
 * Get mall assets path (development or production)
 */
export function getMallAssetsPath(mallId: string, relativePath: string = ''): string {
  if (import.meta.env.DEV) {
    // Development: Vite static assets
    return relativePath 
      ? `/src/assets/malls/${mallId}/${relativePath}`
      : `/src/assets/malls/${mallId}`;
  } else {
    // Production: resources/assets/malls
    return relativePath
      ? `assets/malls/${mallId}/${relativePath}`
      : `assets/malls/${mallId}`;
  }
}

/**
 * Load mall genre config
 */
export async function loadMallGenreConfig(mallId: string): Promise<MallGenreConfig | null> {
  if (import.meta.env.DEV) {
    // Development: Try to load from Vite static assets
    try {
      // @ts-ignore - Dynamic import path
      const module = await import(/* @vite-ignore */ `../assets/malls/${mallId}/genres.json`);
      return module.default as MallGenreConfig;
    } catch {
      // Fallback to Electron IPC
      return await window.electronAPI?.readMallConfig(mallId, 'genres') || null;
    }
  } else {
    // Production: Electron IPC
    return await window.electronAPI?.readMallConfig(mallId, 'genres') || null;
  }
}

/**
 * Load mall picto config
 */
export async function loadMallPictoConfig(mallId: string): Promise<MallPictoConfig | null> {
  if (import.meta.env.DEV) {
    // Development: Try to load from Vite static assets
    try {
      // @ts-ignore - Dynamic import path
      const module = await import(/* @vite-ignore */ `../assets/malls/${mallId}/pictos.json`);
      return module.default as MallPictoConfig;
    } catch {
      // Fallback to Electron IPC
      return await window.electronAPI?.readMallConfig(mallId, 'pictos') || null;
    }
  } else {
    // Production: Electron IPC
    return await window.electronAPI?.readMallConfig(mallId, 'pictos') || null;
  }
}

/**
 * Get genre icon path
 */
export function getGenreIconPath(
  mallId: string,
  language: "ja" | "en",
  iconFile: string,
  isHighlight: boolean = false
): string {
  const langCode = language === "ja" ? "jp" : "en";
  const baseName = iconFile.replace('.svg', '');
  const highlightSuffix = isHighlight ? '-highlight' : '';
  const fileName = `${baseName}${highlightSuffix}.svg`;
  
  if (import.meta.env.DEV) {
    // Development: Vite static assets
    return `/src/assets/malls/${mallId}/genres/${langCode}/${fileName}`;
  } else {
    // Production: Electron IPC経由で読み込む
    return `assets/malls/${mallId}/genres/${langCode}/${fileName}`;
  }
}

/**
 * Load genre icon as data URL
 */
export async function loadGenreIcon(
  mallId: string,
  language: "ja" | "en",
  iconFile: string,
  isHighlight: boolean = false
): Promise<string | null> {
  const langCode = language === "ja" ? "jp" : "en";
  const baseName = iconFile.replace('.svg', '');
  const highlightSuffix = isHighlight ? '-highlight' : '';
  const fileName = `${baseName}${highlightSuffix}.svg`;
  const relativePath = `${mallId}/genres/${langCode}/${fileName}`;
  
  const tryLoad = async (path: string): Promise<string | null> => {
    if (import.meta.env.DEV) {
      // Development: Try Vite import first
      try {
        // @ts-ignore - Dynamic import path
        const module = await import(/* @vite-ignore */ `../assets/malls/${path}?url`);
        return module.default;
      } catch {
        // Fallback to Electron IPC
        return await window.electronAPI?.readMallAsset(path) || null;
      }
    } else {
      // Production: Electron IPC
      return await window.electronAPI?.readMallAsset(path) || null;
    }
  };
  
  // まず指定された言語で読み込みを試みる（ハイフン形式）
  let result = await tryLoad(relativePath);
  
  // 英語版でハイフン形式が見つからない場合、アンダースコア形式を試す
  if (!result && language === "en") {
    const underscoreBaseName = baseName.replace(/-/g, '_');
    const underscoreFileName = `${underscoreBaseName}${highlightSuffix.replace(/-/g, '_')}.svg`;
    const underscorePath = `${mallId}/genres/${langCode}/${underscoreFileName}`;
    result = await tryLoad(underscorePath);
  }
  
  // それでも見つからない場合、日本語版をフォールバックとして使用
  if (!result && language === "en") {
    const fallbackPath = `${mallId}/genres/jp/${fileName}`;
    result = await tryLoad(fallbackPath);
  }
  
  return result;
}

/**
 * Get picto icon path
 * Note: ピクトアイコン（マップ表示用、isButton=false）はテキストを含まないため、常に日本語版を使用
 * ピクトボタン（isButton=true）はテキストを含むため、言語に応じて切り替え
 */
export function getPictoIconPath(
  mallId: string,
  language: "ja" | "en",
  iconFile: string,
  isHighlight: boolean = false,
  isButton: boolean = false
): string {
  // ピクトアイコン（マップ表示用）は常に日本語版を使用
  const actualLangCode = isButton ? (language === "ja" ? "jp" : "en") : "jp";
  const baseName = iconFile.replace('.svg', '');
  const highlightSuffix = isHighlight ? '-highlight' : '';
  const prefix = isButton ? 'button-' : '';
  const fileName = `${prefix}${baseName}${highlightSuffix}.svg`;
  
  if (import.meta.env.DEV) {
    // Development: Vite static assets
    return `/src/assets/malls/${mallId}/pictos/${actualLangCode}/${fileName}`;
  } else {
    // Production: Electron IPC経由で読み込む
    return `assets/malls/${mallId}/pictos/${actualLangCode}/${fileName}`;
  }
}

/**
 * Load picto icon as data URL
 * Note: ピクトアイコン（マップ表示用、isButton=false）はテキストを含まないため、常に日本語版を使用
 * ピクトボタン（isButton=true）はテキストを含むため、言語に応じて切り替え
 */
export async function loadPictoIcon(
  mallId: string,
  language: "ja" | "en",
  iconFile: string,
  isHighlight: boolean = false,
  isButton: boolean = false
): Promise<string | null> {
  // ピクトアイコン（マップ表示用）は常に日本語版を使用
  const actualLangCode = isButton ? (language === "ja" ? "jp" : "en") : "jp";
  const baseName = iconFile.replace('.svg', '');
  // ハイライトサフィックス: すべてハイフンに統一
  const highlightSuffix = isHighlight ? '-highlight' : '';
  const prefix = isButton ? 'button-' : '';
  const fileName = `${prefix}${baseName}${highlightSuffix}.svg`;
  const relativePath = `${mallId}/pictos/${actualLangCode}/${fileName}`;
  
  const tryLoad = async (path: string): Promise<string | null> => {
    if (import.meta.env.DEV) {
      // Development: Try Vite import first
      try {
        // @ts-ignore - Dynamic import path
        const module = await import(/* @vite-ignore */ `../assets/malls/${path}?url`);
        return module.default;
      } catch {
        // Fallback to Electron IPC
        return await window.electronAPI?.readMallAsset(path) || null;
      }
    } else {
      // Production: Electron IPC
      return await window.electronAPI?.readMallAsset(path) || null;
    }
  };
  
  return await tryLoad(relativePath);
}

