import { useEffect, useRef } from "react";

/**
 * Preloads images into browser cache so they display instantly when needed.
 * Accepts a record of key->URL pairs and preloads all non-empty URLs.
 */
export function usePreloadImages(images: Record<string, string>) {
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const url of Object.values(images)) {
      if (url && !loadedRef.current.has(url)) {
        const img = new Image();
        img.src = url;
        loadedRef.current.add(url);
      }
    }
  }, [images]);
}
