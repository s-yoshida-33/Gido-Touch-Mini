// src/components/NewsImage.tsx
import React, { useState, useEffect } from 'react';
import { toFileUrl, getShopImageDataUrl } from '../utils/imageUtils';

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
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setResolvedUrl("");
      setHasError(false);
      return;
    }

    // http(s) and data: URLs can be used directly
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")) {
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
          setResolvedUrl(dataUrl);
          setHasError(false);
          return;
        }
      } catch {
        // Tauri IPC failed — fall through to file:// fallback
      }

      if (!cancelled) {
        const fileUrl = toFileUrl(imageUrl);
        setResolvedUrl(fileUrl);
        setHasError(false);
      }
    };
    load();

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
