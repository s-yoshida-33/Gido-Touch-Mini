import { useEffect, useRef } from "react";

/**
 * Preloads images into browser cache so they display instantly when needed.
 * Accepts a record of key->URL pairs and preloads all non-empty URLs.
 * Image objects are retained in a ref to prevent garbage collection
 * from evicting them from the browser's decoded image cache.
 */
export function usePreloadImages(images: Record<string, string>) {
  const loadedRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    for (const url of Object.values(images)) {
      if (url && !loadedRef.current.has(url)) {
        const img = new Image();
        img.src = url;
        loadedRef.current.set(url, img);
      }
    }
  }, [images]);
}
