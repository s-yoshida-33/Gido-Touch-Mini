// src/components/ShopLogoImage.tsx
import React, { useState, useEffect } from 'react';
import { buildImagePath, toFileUrl, getShopImageDataUrl } from '../utils/imageUtils';

interface ShopLogoImageProps {
  photo: string | undefined;
  shopId: string | undefined;
}

export const ShopLogoImage: React.FC<ShopLogoImageProps> = ({ photo, shopId }) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!photo) { setIsLoading(false); setHasError(true); return; }
    const loadImage = async () => {
      const imagePath = buildImagePath(photo, shopId);
      if (!imagePath) { setIsLoading(false); setHasError(true); return; }

      try {
        const normalizedPath = imagePath.replace(/\\/g, "/");
        const dataUrl = await getShopImageDataUrl(normalizedPath);
        if (dataUrl) { setImageUrl(dataUrl); setIsLoading(false); setHasError(false); return; }
      } catch (error) { console.error(error); setHasError(true); }

      const fileUrl = toFileUrl(imagePath);
      setImageUrl(fileUrl);
      setIsLoading(false);
    };
    loadImage();
  }, [photo, shopId]);

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
