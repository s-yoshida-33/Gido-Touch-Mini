// src/utils/imageUtils.ts
import { invoke } from "@tauri-apps/api/core";

/**
 * Load a shop image via Tauri IPC (returns data URL or null).
 */
export async function getShopImageDataUrl(filePath: string): Promise<string | null> {
  try {
    return await invoke<string | null>('get_shop_image', { filePath });
  } catch {
    return null;
  }
}

/**
 * Build image path using shop_id if photo is relative or filename only
 * Expected full path format: C:\Users\...\AppData\Roaming\TTI\BridgeWebPopper\files\shop\{shop_id}\photo2.png
 */
export function buildImagePath(photo: string | undefined, shopId: string | undefined): string {
  if (!photo) {
    // If no photo but shop_id is available, try to build path from shop_id
    if (shopId) {
      // This is a fallback - API should provide photo, but if not, we can try to construct it
      // However, we don't know the base path, so return empty
      return "";
    }
    return "";
  }
  
  // If already a full path (contains drive letter like C:\), return as is
  if (photo.match(/^[A-Za-z]:[\\/]/)) {
    return photo;
  }
  
  // If already a URL (file://, http://, https://, or data:), return as is
  if (photo.startsWith("file://") || 
      photo.startsWith("http://") || 
      photo.startsWith("https://") ||
      photo.startsWith("data:")) {
    return photo;
  }
  
  // If starts with absolute path markers (/, \), might be absolute path
  // But without drive letter, it's likely a Unix-style path or network path
  if (photo.startsWith("/") || photo.startsWith("\\")) {
    // Check if it looks like a Windows network path (\\server\share)
    if (photo.startsWith("\\\\")) {
      return photo;
    }
    // For Unix-style absolute paths, return as is
    if (photo.startsWith("/")) {
      return photo;
    }
  }
  
  // If shop_id is available and photo is relative or filename only, build path
  if (shopId) {
    // Check if photo already contains shop_id in path (e.g., "shop/31/photo2.png" or "files/shop/31/photo2.png")
    if (photo.includes(`shop/${shopId}/`) || photo.includes(`shop\\${shopId}\\`) ||
        photo.includes(`files/shop/${shopId}/`) || photo.includes(`files\\shop\\${shopId}\\`)) {
      return photo;
    }
    
    // Normalize path separators
    const normalizedPhoto = photo.replace(/\\/g, "/");
    // Remove leading slash if present
    const cleanPhoto = normalizedPhoto.startsWith("/") ? normalizedPhoto.slice(1) : normalizedPhoto;
    
    // If it's just a filename (no path separators), build full path
    if (!cleanPhoto.includes("/")) {
      return `files/shop/${shopId}/${cleanPhoto}`;
    }
    
    // If it's a relative path, prepend shop_id folder
    // But check if it already starts with files/shop
    if (cleanPhoto.startsWith("files/shop/")) {
      return cleanPhoto;
    }
    return `files/shop/${shopId}/${cleanPhoto}`;
  }
  
  return photo;
}

/**
 * Convert a local file path to a file:// URL
 */
export function toFileUrl(filePath: string): string {
  if (!filePath) return "";
  
  // If already a URL (file://, http://, https://, or data:), return as is
  if (filePath.startsWith("file://") || 
      filePath.startsWith("http://") || 
      filePath.startsWith("https://") ||
      filePath.startsWith("data:")) {
    return filePath;
  }
  
  // Convert Windows backslashes to forward slashes
  const normalized = filePath.replace(/\\/g, "/");
  
  // Add file:// protocol
  // For Windows absolute paths (C:/...), use file:///C:/...
  if (normalized.match(/^[A-Za-z]:\//)) {
    return `file:///${normalized}`;
  }
  
  // For paths starting with /, use file://
  if (normalized.startsWith("/")) {
    return `file://${normalized}`;
  }
  
  // For relative paths, use file:///
  return `file:///${normalized}`;
}

