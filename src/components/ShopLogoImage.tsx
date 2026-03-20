// src/components/ShopLogoImage.tsx
import React, { useState, useEffect } from 'react';
import { buildImagePath, toFileUrl, getShopImageDataUrl } from '../utils/imageUtils';

// Module-level cache: once an image is resolved via Tauri IPC, it's instantly
// available on subsequent mounts (genre/floor switch re-mount, re-render, etc.).
// This eliminates the async "pop-in" that occurs when AnimatePresence re-creates
// the component on every key change.
const resolvedUrlCache = new Map<string, string>();

interface ShopLogoImageProps {
  photo: string | undefined;
  shopId: string | undefined;
}

export const ShopLogoImage: React.FC<ShopLogoImageProps> = ({ photo, shopId }) => {
  const cacheKey = `${photo ?? ""}::${shopId ?? ""}`;
  const cached = resolvedUrlCache.get(cacheKey);

  const [imageUrl, setImageUrl] = useState<string>(cached ?? "");
  const [isLoading, setIsLoading] = useState(!cached);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Already resolved from cache
    if (cached) return;

    if (!photo) { setIsLoading(false); setHasError(true); return; }
    let cancelled = false;

    const loadImage = async () => {
      const imagePath = buildImagePath(photo, shopId);
      if (!imagePath) { setIsLoading(false); setHasError(true); return; }

      try {
        const normalizedPath = imagePath.replace(/\\/g, "/");
        const dataUrl = await getShopImageDataUrl(normalizedPath);
        if (!cancelled && dataUrl) {
          resolvedUrlCache.set(cacheKey, dataUrl);
          setImageUrl(dataUrl);
          setIsLoading(false);
          setHasError(false);
          return;
        }
      } catch (error) { console.error(error); }

      if (!cancelled) {
        const fileUrl = toFileUrl(imagePath);
        resolvedUrlCache.set(cacheKey, fileUrl);
        setImageUrl(fileUrl);
        setIsLoading(false);
      }
    };
    loadImage();

    return () => { cancelled = true; };
  }, [photo, shopId, cacheKey, cached]);

  if (hasError || (!imageUrl && !isLoading) || imageUrl === "") return null;
  if (isLoading || !imageUrl) return null;

  return (
    <img
      src={imageUrl}
      alt=""
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      style={{ width: "100%", height: "100%", objectFit: "contain", userSelect: "none", pointerEvents: "auto", display: "block" }}
      onError={(e) => { setHasError(true); (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
};
