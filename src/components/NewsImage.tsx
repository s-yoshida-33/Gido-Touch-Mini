// src/components/NewsImage.tsx
import React, { useState, useEffect } from 'react';
import { toFileUrl, getShopImageDataUrl } from '../utils/imageUtils';

// Module-level cache: resolved URLs persist across mount/unmount cycles.
// When a news modal re-opens, images appear instantly from cache.
const resolvedUrlCache = new Map<string, string>();

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
  const cached = imageUrl ? resolvedUrlCache.get(imageUrl) : undefined;
  const [resolvedUrl, setResolvedUrl] = useState<string>(cached ?? "");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setResolvedUrl("");
      setHasError(false);
      return;
    }

    // Already resolved from cache
    if (cached) return;

    // http(s) and data: URLs can be used directly
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")) {
      resolvedUrlCache.set(imageUrl, imageUrl);
      setResolvedUrl(imageUrl);
      setHasError(false);
      return;
    }

    // Local path — load via Tauri IPC
    let cancelled = false;
    const load = async () => {
      try {
        const normalizedPath = imageUrl.replace(/\\/g, "/");
        const dataUrl = await getShopImageDataUrl(normalizedPath);
        if (!cancelled && dataUrl) {
          resolvedUrlCache.set(imageUrl, dataUrl);
          setResolvedUrl(dataUrl);
          setHasError(false);
          return;
        }
      } catch {
        // Tauri IPC failed — fall through to file:// fallback
      }

      if (!cancelled) {
        const fileUrl = toFileUrl(imageUrl);
        resolvedUrlCache.set(imageUrl, fileUrl);
        setResolvedUrl(fileUrl);
        setHasError(false);
      }
    };
    load();

    return () => { cancelled = true; };
  }, [imageUrl, cached]);

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
