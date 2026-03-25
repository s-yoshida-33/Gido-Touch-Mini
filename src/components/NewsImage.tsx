// src/components/NewsImage.tsx
import React, { useState, useEffect } from 'react';
import { toFileUrl, getShopImageDataUrl } from '../utils/imageUtils';

// Module-level cache: resolved URLs persist across mount/unmount cycles.
// When a news modal re-opens, images appear instantly from cache.
const resolvedUrlCache = new Map<string, string>();

/**
 * Resolve a single image URL (Tauri IPC for local paths, passthrough for http/data).
 * Result is cached in the module-level cache for instant subsequent access.
 */
export async function resolveNewsImageUrl(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;

  const cached = resolvedUrlCache.get(imageUrl);
  if (cached) return cached;

  // http(s) and data: URLs can be used directly
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")) {
    resolvedUrlCache.set(imageUrl, imageUrl);
    return imageUrl;
  }

  // Local path — load via Tauri IPC
  try {
    const normalizedPath = imageUrl.replace(/\\/g, "/");
    const dataUrl = await getShopImageDataUrl(normalizedPath);
    if (dataUrl) {
      resolvedUrlCache.set(imageUrl, dataUrl);
      return dataUrl;
    }
  } catch {
    // Tauri IPC failed — fall through to file:// fallback
  }

  const fileUrl = toFileUrl(imageUrl);
  resolvedUrlCache.set(imageUrl, fileUrl);
  return fileUrl;
}

/**
 * Pre-resolve multiple image URLs in parallel so they are cached before
 * components mount. Call this when news data arrives (before modal opens).
 */
export function preloadNewsImages(imageUrls: (string | undefined)[]): void {
  for (const url of imageUrls) {
    if (url && !resolvedUrlCache.has(url)) {
      resolveNewsImageUrl(url);
    }
  }
}

interface NewsImageProps {
  imageUrl: string | undefined;
  alt?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a news image, resolving local file paths via Tauri IPC.
 * Handles Windows paths, relative paths, file:// URLs, http(s) URLs, and data: URLs.
 */
export const NewsImage: React.FC<NewsImageProps> = ({ imageUrl, alt = "", style }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() =>
    imageUrl ? resolvedUrlCache.get(imageUrl) ?? "" : ""
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setResolvedUrl("");
      setHasError(false);
      return;
    }

    // Check cache on every imageUrl change and update state immediately
    const cached = resolvedUrlCache.get(imageUrl);
    if (cached) {
      setResolvedUrl(cached);
      setHasError(false);
      return;
    }

    let cancelled = false;
    resolveNewsImageUrl(imageUrl).then((url) => {
      if (!cancelled && url) {
        setResolvedUrl(url);
        setHasError(false);
      }
    });

    return () => { cancelled = true; };
  }, [imageUrl]);

  if (!imageUrl || hasError || !resolvedUrl) return null;

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: "none", ...style }}
      onError={() => setHasError(true)}
    />
  );
};
