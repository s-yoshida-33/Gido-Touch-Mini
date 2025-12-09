// src/screens/ShopListScreen.tsx
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import button1F from "../assets/button-1F.svg";
import button2F from "../assets/button-2F.svg";
import button3F from "../assets/button-3F.svg";
import button1FHighlight from "../assets/button-1F-highlight.svg";
import button2FHighlight from "../assets/button-2F-highlight.svg";
import button3FHighlight from "../assets/button-3F-highlight.svg";
import buttonPrevHighlight from "../assets/button-prev-highlight.svg";
import buttonNextHighlight from "../assets/button-next-highlight.svg";
import selectLanguageSelectedEn from "../assets/select-language-selected-en.svg";
import selectLanguageSelectedJp from "../assets/select-language-selected-jp.svg";
import openTime from "../assets/open-time.svg";
import prev from "../assets/button-prev.svg";
import next from "../assets/button-next.svg";
import iconSearch from "../assets/icon_search.svg";
import iconAll from "../assets/icon_all.svg";
import iconAllHighlight from "../assets/icon_all_highlight.svg";
import iconFashion from "../assets/icon_fashion.svg";
import iconFashionHighlight from "../assets/icon_fashion_highlight.svg";
import iconFashionGoods from "../assets/icon_fashion_goods.svg";
import iconFashionGoodsHighlight from "../assets/icon_fashion_goods_highlight.svg";
import iconSport from "../assets/icon_sport.svg";
import iconSportHighlight from "../assets/icon_sport_highlight.svg";
import iconKids from "../assets/icon_kids.svg";
import iconKidsHighlight from "../assets/icon_kids_highlight.svg";
import iconLifestyle from "../assets/icon_lifestyle.svg";
import iconLifestyleHighlight from "../assets/icon_lifestyle_highlight.svg";
import iconGourmet from "../assets/icon_gourmet.svg";
import iconGourmetHighlight from "../assets/icon_gourmet_highlight.svg";
import iconEntertainment from "../assets/icon_entertainment.svg";
import iconEntertainmentHighlight from "../assets/icon_entertainment_highlight.svg";
import iconService from "../assets/icon_survice.svg";
import iconServiceHighlight from "../assets/icon_survice_highlight.svg";
import buttonEventNews from "../assets/button_event_news.svg";
import buttonEventNewsHighlight from "../assets/button_event_news_highlight.svg";
import buttonShopNews from "../assets/button_shop_news.svg";
import buttonShopNewsHighlight from "../assets/button_shop_news_highlight.svg";
import buttonOpenTime from "../assets/button-open-time.svg";
import buttonOpenTimeHighlight from "../assets/button-open-time-highlight.svg";
import { fetchShops } from "../repositories/shopRepository";
import type { Shop } from "../types/shop";
import ShopDetailScreen from "./ShopDetailScreen";
import { LanguageSelectModal } from "../components/LanguageSelectModal";

/**
 * Build image path using shop_id if photo is relative or filename only
 * Expected full path format: C:\Users\...\AppData\Roaming\TTI\BridgeWebPopper\files\shop\{shop_id}\photo2.png
 */
function buildImagePath(photo: string | undefined, shopId: string | undefined): string {
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
 * Shop image component that loads images via Electron IPC or falls back to file:// URL
 */
const ShopImage: React.FC<{ photo: string | undefined; shopId: string | undefined }> = ({ photo, shopId }) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!photo) {
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      const imagePath = buildImagePath(photo, shopId);
      if (!imagePath) {
        setIsLoading(false);
        return;
      }

      // Check if we're in Electron environment
      const electronAPI = window.electronAPI;
      if (electronAPI && electronAPI.getShopImage) {
        try {
          // Use Electron IPC to load image as data URL
          const dataUrl = await electronAPI.getShopImage(imagePath);
          if (dataUrl) {
            setImageUrl(dataUrl);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Failed to load image via IPC:", error);
        }
      }

      // Fallback to file:// URL (works in Electron, not in browser)
      const fileUrl = toFileUrl(imagePath);
      setImageUrl(fileUrl);
      setIsLoading(false);
    };

    loadImage();
  }, [photo, shopId]);

  if (!photo || (!imageUrl && !isLoading)) {
    return (
      <span style={{ color: "#000000", fontSize: "12px", fontWeight: 700 }}>
        Image
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        userSelect: "none",
        pointerEvents: "auto",
        display: isLoading ? "none" : "block",
      }}
      onError={(e) => {
        // Fallback to placeholder if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
        if (target.parentElement) {
          target.parentElement.style.backgroundColor = "#FFFFFF";
          target.parentElement.style.color = "#000000";
          target.parentElement.style.fontSize = "12px";
          target.parentElement.style.fontWeight = "700";
          target.parentElement.textContent = "Image";
        }
      }}
    />
  );
};

/**
 * Shop name display component that scales text to fit width
 */
const ShopNameDisplay: React.FC<{ name: string }> = ({ name }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      
      if (textWidth > containerWidth) {
        const scale = containerWidth / textWidth;
        textRef.current.style.transform = `scaleX(${Math.max(scale, 0.5)})`;
      } else {
        textRef.current.style.transform = "scaleX(1)";
      }
    }
  }, [name]);

  return (
    <div
      ref={containerRef}
      style={{
        fontSize: "12px",
        fontWeight: 700,
        lineHeight: "1.4",
        width: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        transformOrigin: "left center",
      }}
    >
      <div
        ref={textRef}
        style={{
          display: "inline-block",
          transform: "scaleX(1)",
          whiteSpace: "nowrap",
          transformOrigin: "left center",
        }}
      >
        {name}
      </div>
    </div>
  );
};

/**
 * Convert a local file path to a file:// URL for Electron
 */
function toFileUrl(filePath: string): string {
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

/**
 * Normalize floor value to standard format (e.g., "1" -> "1F", "1F" -> "1F")
 */
function normalizeFloor(value: string): string {
  if (!value) return "";
  const m = value.match(/(\d+)/);
  return m ? `${m[1]}F` : value;
}

// Genre data definition
type Genre = {
  id: string;
  name: string;
  icon: string;
  highlightIcon: string;
};

const GENRE_LIST: Genre[] = [
  { id: "all", name: "All", icon: iconAll, highlightIcon: iconAllHighlight },
  { id: "fashion", name: "Fashion", icon: iconFashion, highlightIcon: iconFashionHighlight },
  { id: "fashion_goods", name: "Fashion Goods", icon: iconFashionGoods, highlightIcon: iconFashionGoodsHighlight },
  { id: "sport", name: "Sport", icon: iconSport, highlightIcon: iconSportHighlight },
  { id: "kids", name: "Kids", icon: iconKids, highlightIcon: iconKidsHighlight },
  { id: "lifestyle", name: "Lifestyle", icon: iconLifestyle, highlightIcon: iconLifestyleHighlight },
  { id: "gourmet", name: "Gourmet", icon: iconGourmet, highlightIcon: iconGourmetHighlight },
  { id: "entertainment", name: "Entertainment", icon: iconEntertainment, highlightIcon: iconEntertainmentHighlight },
  { id: "service", name: "Service", icon: iconService, highlightIcon: iconServiceHighlight },
];

/**
 * Shop list screen
 * Screen size: 1920x1080
 * Background: White
 */
const ShopListScreen: React.FC = () => {
  // Scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Drag scroll state
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartXRef = useRef(0);

  // Genre scroll container ref
  const genreScrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Genre drag scroll state
  const isGenreDraggingRef = useRef(false);
  const genreDragStartXRef = useRef(0);
  const genreScrollStartXRef = useRef(0);

  // Genre Mouse drag scroll
  const handleGenreMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = genreScrollContainerRef.current;
    if (!container) return;

    isGenreDraggingRef.current = true;
    genreDragStartXRef.current = e.clientX;
    genreScrollStartXRef.current = container.scrollLeft;
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
  };

  const handleGenreMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isGenreDraggingRef.current) return;

    const container = genreScrollContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const deltaX = genreDragStartXRef.current - e.clientX;
    container.scrollLeft = genreScrollStartXRef.current + deltaX;
  };

  const handleGenreMouseUp = () => {
    const container = genreScrollContainerRef.current;
    if (!container) return;

    isGenreDraggingRef.current = false;
    container.style.cursor = "grab";
    container.style.userSelect = "";
  };

  const handleGenreMouseLeave = () => {
    const container = genreScrollContainerRef.current;
    if (!container) return;

    isGenreDraggingRef.current = false;
    container.style.cursor = "grab";
    container.style.userSelect = "";
  };

  // Shop data state
  const [shops, setShops] = useState<Shop[]>([]);
  
  // Selected genre state
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  
  // Active news button state (null if none selected) -> Changed to track pressed state only
  const [pressedNewsButton, setPressedNewsButton] = useState<"event" | "shop" | "openTime" | null>(null);
  
  // Show open time modal state
  const [showOpenTime, setShowOpenTime] = useState(false);
  
  const shopsRef = useRef<Shop[]>([]); // Keep track of shops for error handling

  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

  const [error, setError] = useState<string | null>(null);
  
  // Floor filter state
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  
  // Selected shop for detail modal
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  // Scroll position state for navigation buttons
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [canScroll, setCanScroll] = useState(false);

  // Idle timeout state (30 seconds for testing)
  const IDLE_TIMEOUT_MS = 30 * 1000; // 30 seconds
  const lastActivityTimeRef = useRef<number>(Date.now());

  // Language select modal state
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const languageButtonRef = useRef<HTMLDivElement>(null);
  
  // Get selected language from localStorage (default to Japanese)
  const getSelectedLanguage = (): "ja" | "en" => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem("gido-selected-language");
      if (saved === "en" || saved === "ja") {
        return saved;
      }
    }
    // Default to Japanese and save to localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("gido-selected-language", "ja");
    }
    return "ja"; // Default to Japanese
  };
  
  const [selectedLanguage, setSelectedLanguageState] = useState<"ja" | "en">(() => getSelectedLanguage());
  
  // Wrapper to save to localStorage when language changes
  const setSelectedLanguage = (lang: "ja" | "en") => {
    setSelectedLanguageState(lang);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("gido-selected-language", lang);
    }
  };

  // Initialize language to Japanese on mount (force reset to Japanese)
  useEffect(() => {
    // Always set to Japanese on mount to ensure default is Japanese
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem("gido-selected-language");
      // If language is not Japanese, reset to Japanese
      if (saved !== "ja") {
        setSelectedLanguage("ja");
      } else if (selectedLanguage !== "ja") {
        // Sync state if localStorage is Japanese but state is not
        setSelectedLanguageState("ja");
      }
    }
  }, []); // Run only on mount

  // Fetch shops from API
  useEffect(() => {
    let cancelled = false;
    let timerId: number | null = null;

    const loadShops = async () => {
      let hasError = false;
      try {
        const data = await fetchShops();
        if (cancelled) return;

        // Check for empty data (likely due to API update in progress)
        if (data.length === 0 && shopsRef.current.length > 0) {
          throw new Error("API returned 0 shops");
        }

        // Clean shop names (remove furigana in brackets)
        // Removed hardcoded filters: only "飲食店・食品" or "グルメ" and "イオン堺北花田店" exclusion
        // Now showing all shops by default
        const cleaned = data.map((s) => ({
          ...s,
          name: s.name.replace(/【.*?】/g, "").trim(),
        }));

        // Load shop positions and merge with shop data
        const api = window.electronAPI;
        if (api && api.getShopPositions) {
          try {
            const shopPositions = await api.getShopPositions();
            const shopsWithPositions = cleaned.map((shop) => {
              if (shop.shopId && shopPositions.positions[shop.shopId]) {
                return {
                  ...shop,
                  position: shopPositions.positions[shop.shopId],
                };
              }
              return shop;
            });
            setShops(shopsWithPositions);
          } catch (e) {
            console.error("Failed to load shop positions:", e);
            setShops(cleaned);
          }
        } else {
          setShops(cleaned);
        }

        setError(null);
      } catch (e: any) {
        hasError = true;
        console.error(e);
        if (cancelled) return;

        // If we already have shops, don't show error screen, just keep retrying
        if (shopsRef.current.length === 0) {
          const message = e?.message ?? "failed to load";
          setError(message);
        } else {
          console.warn("[ShopListScreen] API Error but keeping existing data:", e);
        }
      } finally {
        if (cancelled) return;
        
        // ポーリング間隔の設定
        // エラー（API未接続など）の場合は、リトライ間隔を短くする（例: 10秒）
        // 成功時は3分（開発環境は10秒）
        const SHOP_LIST_MS = import.meta.env.DEV ? 10 * 1000 : 3 * 60 * 1000;
        const nextInterval = hasError 
          ? 10 * 1000 // エラー時は10秒後にリトライ
          : SHOP_LIST_MS; // 成功時は設定通りの間隔

        console.log(`[ShopListScreen] Next poll in ${nextInterval}ms (Error: ${hasError})`);
        timerId = window.setTimeout(loadShops, nextInterval);
      }
    };

    loadShops();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, []);

  // ショップ位置情報の更新を監視
  useEffect(() => {
    const api = window.electronAPI;
    if (!api || !api.onShopPositionsUpdated) return;

    const unsubscribe = api.onShopPositionsUpdated(async (updatedPositions) => {
      // 位置情報が更新されたら、ショップデータを再読み込み
      try {
        const shopPositions = updatedPositions;
        setShops((prevShops) => {
          return prevShops.map((shop) => {
            const shopId = shop.shopId || shop.number;
            if (shopId && shopPositions.positions[shopId]) {
              return {
                ...shop,
                position: shopPositions.positions[shopId],
              };
            }
            return shop;
          });
        });
      } catch (e) {
        console.error("Failed to update shop positions:", e);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Idle timeout: Refresh to default shop list after 30 seconds of inactivity
  // Always active - any touch/activity resets the timer
  useEffect(() => {
    // Always reset activity time on mount
    lastActivityTimeRef.current = Date.now();

    // Throttle activity handler to avoid too frequent updates
    let throttleTimeout: number | null = null;
    const handleActivity = () => {
      if (throttleTimeout === null) {
        lastActivityTimeRef.current = Date.now();
        throttleTimeout = window.setTimeout(() => {
          throttleTimeout = null;
        }, 1000); // Throttle to once per second
      }
    };

    // Listen to various user activities (including scroll)
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown', 'wheel'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Also listen to scroll events on the scroll container
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleActivity, { passive: true });
    }

    // Check idle timeout every second
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTimeRef.current;

      if (timeSinceLastActivity >= IDLE_TIMEOUT_MS) {
        // 30 seconds of inactivity - refresh to default state
        setSelectedShop(null);
        setSelectedFloor(null);
        setSelectedLanguage("ja"); // Reset to default Japanese (also saves to localStorage)
        setIsLanguageModalOpen(false);
        
        // Reset scroll position to top with smooth animation (same as scrollToStart)
        if (scrollContainerRef.current) {
          smoothScrollTo(0, 800);
        }
        
        // Reset activity time after refresh
        lastActivityTimeRef.current = Date.now();
      }
    }, 1000); // Check every second

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleActivity);
      }
      if (throttleTimeout !== null) {
        clearTimeout(throttleTimeout);
      }
      clearInterval(checkInterval);
    };
  }, []); // Always active, no dependencies

  // Filter shops by selected floor AND selected genre
  const filteredShops = React.useMemo(() => {
    let result = shops;

    // 1. Filter by Floor
    if (selectedFloor) {
      const normalizedSelectedFloor = normalizeFloor(selectedFloor);
      result = result.filter((shop) => {
        if (!shop.floors || shop.floors.length === 0) return false;
        return shop.floors.some((floor) => {
          const normalizedShopFloor = normalizeFloor(String(floor));
          return normalizedShopFloor === normalizedSelectedFloor;
        });
      });
    }

    // 2. Filter by Genre
    if (selectedGenre && selectedGenre !== "all") {
      // Mapping based on genrelist.xml provided by user:
      // fashion -> "ファッション"
      // fashion_goods -> "ファッション雑貨"
      // sport -> "スポーツ・アウトドア"
      // kids -> "キッズ"
      // lifestyle -> "ライフスタイル"
      // gourmet -> "グルメ"
      // entertainment -> "エンターテインメント"
      // service -> "サービス"
      const genreMapping: Record<string, string> = {
        fashion: "ファッション",
        fashion_goods: "ファッション雑貨",
        sport: "スポーツ・アウトドア",
        kids: "キッズ",
        lifestyle: "ライフスタイル",
        gourmet: "グルメ",
        entertainment: "エンターテインメント",
        service: "サービス",
      };

      const targetGenreName = genreMapping[selectedGenre];
      
      if (targetGenreName) {
        result = result.filter((shop) => {
          if (!shop.genre) return false;
          // Exact match with genre name from XML/API
          return shop.genre === targetGenreName;
        });
      }
    }

    // 3. Filter out shops with empty number
    result = result.filter((shop) => shop.number && shop.number.trim() !== "");

    // 4. Sort by Number (Always sort by number ascending)
    // Filtered or not, the result should be sorted by shop number
    result = [...result].sort((a, b) => {
      // Use numeric sort for numbers like "101", "102", "110"
      // If numbers contain non-numeric chars, use localeCompare with numeric option
      return (a.number || "").localeCompare(b.number || "", "ja", { numeric: true });
    });

    return result;
  }, [shops, selectedFloor, selectedGenre]);

  // Layout: 6 rows per column
  // Card count is dynamically calculated based on the number of shops from API
  const rowsPerColumn = 6;
  const totalColumns = filteredShops.length > 0 ? Math.ceil(filteredShops.length / rowsPerColumn) : 0;

  // Card size calculation (Full HD 1920x1080 based)
  // Content area: width: 1290px (1320 - 15*2), height: 1020px (1050 - 15*2)
  // Card grid container height: 1016px (1020 - 2*2 approx) with padding 6px top/bottom
  // Actual content area: 1004px (1016 - 6 - 6)
  const cardHeight = (1004 - 10 * (rowsPerColumn - 1)) / rowsPerColumn; // Row gap: 10px
  const cardWidth = 188; // Card width (half of 376)
  const columnGap = 10; // Column gap (half of 20)
  const imageHeight = 125; // Image height (half of 251 approx)

  // Group shops by column
  const columns: Shop[][] = [];
  for (let i = 0; i < totalColumns; i++) {
    const startIndex = i * rowsPerColumn;
    const endIndex = Math.min(startIndex + rowsPerColumn, filteredShops.length);
    columns.push(filteredShops.slice(startIndex, endIndex));
  }

  // Mouse drag scroll
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    scrollStartXRef.current = container.scrollLeft;
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const deltaX = dragStartXRef.current - e.clientX;
    container.scrollLeft = scrollStartXRef.current + deltaX;
  };

  const handleMouseUp = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = false;
    container.style.cursor = "grab";
    container.style.userSelect = "";
  };

  const handleMouseLeave = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = false;
    container.style.cursor = "grab";
    container.style.userSelect = "";
  };

  // Calculate scroll percentage
  const calculateScrollPercentage = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return { percentage: 0, canScroll: false };
    
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    
    if (maxScroll <= 0) return { percentage: 0, canScroll: false };
    return { percentage: (scrollLeft / maxScroll) * 100, canScroll: true };
  }, []);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    const result = calculateScrollPercentage();
    setScrollPercentage(result.percentage);
    setCanScroll(result.canScroll);
  }, [calculateScrollPercentage]);

  // Update scroll percentage on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Recalculate scroll state when content changes
  useLayoutEffect(() => {
    // Immediately check scroll state (synchronous check)
    handleScroll();
    
    // Also check after a short delay to ensure layout is complete
    const timer = setTimeout(() => {
      handleScroll();
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [filteredShops, selectedFloor, handleScroll]);

  // Also recalculate when shops data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      handleScroll();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [shops.length, handleScroll]);

  // Smooth scroll animation helper
  const smoothScrollTo = (targetScrollLeft: number, duration: number = 800) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const startScrollLeft = container.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    const startTime = performance.now();

    // Easing function: easeInOutCubic
    const easeInOutCubic = (t: number): number => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);
      
      container.scrollLeft = startScrollLeft + distance * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  // Scroll to start
  const scrollToStart = () => {
    const container = scrollContainerRef.current;
    if (container) {
      smoothScrollTo(0, 800);
    }
  };

  // Scroll to end
  const scrollToEnd = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      smoothScrollTo(maxScroll, 800);
    }
  };

  // Add style to hide scrollbar
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .shop-list-scroll-container::-webkit-scrollbar {
        display: none;
      }
      .genre-scroll-container::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div
      style={{
        width: "1920px",
        height: "1080px",
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        position: "relative", // Add relative positioning for absolute children
      }}
    >
      {/* Open Time Modal */}
      <AnimatePresence>
        {showOpenTime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "absolute",
              bottom: "180px", // Just above the bottom container
              left: "auto", // Explicitly unset left
              right: 0, // Align to right side relative to the 1920px container
              width: "460px", // Fixed width of the right container
              display: "flex",
              justifyContent: "center", // Center horizontally within the 460px
              alignItems: "flex-end",
              pointerEvents: "none", // Allow clicks to pass through to the overlay below
              zIndex: 101, // Higher than overlay
            }}
          >
            <div
              style={{
                width: "100%", // Ensure full width
                display: "flex", // Enable flex context for centering image
                justifyContent: "center", // Center image horizontally
                pointerEvents: "auto", // Re-enable clicks for the image itself
                filter: "drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.2))",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={openTime}
                alt="Open Time Info"
                style={{
                  maxWidth: "90%", // Add some padding
                  maxHeight: "60vh",
                  objectFit: "contain",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close modal (invisible) */}
      {showOpenTime && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 100,
          }}
          onClick={() => setShowOpenTime(false)}
        />
      )}

      {/* Main Content Area (Left) - Flexible width */}
      <div style={{ flex: 1, height: "100%", position: "relative" }}>
        {/* Main content will go here */}
      </div>

      {/* Right Container - Fixed width 460px with left shadow */}
      <div
        style={{
          width: "460px",
          height: "100%",
          backgroundColor: "#FFFFFF",
          boxShadow: "-4px 0 16px rgba(0, 0, 0, 0.25)", // Left side drop shadow
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Container (W100% H70px) */}
        <div
          style={{
            width: "100%",
            height: "70px",
            flexShrink: 0,
            borderBottom: "2px solid #D9D9D9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Search Box */}
          <div
            style={{
              width: "440px",
              height: "50px",
              borderRadius: "50px",
              border: "2px solid #D9D9D9",
              padding: "0 20px",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fff",
            }}
          >
            <input
              type="text"
              placeholder="店舗名でさがす"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "16px",
                color: "#333",
                background: "transparent",
                padding: 0,
                margin: 0,
              }}
              className="shoplist-search-input"
            />
            <img
              src={iconSearch}
              alt="Search"
              style={{
                width: "24px",
                height: "24px",
                marginLeft: "8px",
              }}
            />
          </div>
        </div>

        {/* Second Container (W100% H100px) */}
        <div
          style={{
            width: "100%",
            height: "100px",
            flexShrink: 0,
            borderBottom: "2px solid #D9D9D9",
            padding: "0", // 左右パディングを削除（内部コンテナで確保するため）
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Genre Icons */}
          <div 
            ref={genreScrollContainerRef}
            className="genre-scroll-container"
            onMouseDown={handleGenreMouseDown}
            onMouseMove={handleGenreMouseMove}
            onMouseUp={handleGenreMouseUp}
            onMouseLeave={handleGenreMouseLeave}
            style={{ 
              display: "flex", 
              gap: "10px", 
              height: "100%", 
              overflowX: "auto", 
              alignItems: "center",
              cursor: "grab",
              userSelect: "none",
              paddingTop: "10px",
              paddingBottom: "10px",
              paddingLeft: "10px", // 左側のシャドウ用パディング
              paddingRight: "10px", // 右側のシャドウ用パディング
            }}
          >
            {GENRE_LIST.map((genre) => {
              const isSelected = selectedGenre === genre.id;
              
              return (
                <div 
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  style={{ 
                    position: "relative", 
                    height: "100%", 
                    flexShrink: 0,
                    cursor: "pointer",
                    // Use flex basis auto to let img define width
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {/* Normal Icon (Always rendered for layout, opacity controls visibility) */}
                  <img 
                    src={genre.icon} 
                    alt={genre.name} 
                    style={{ 
                      height: "100%", 
                      width: "auto",
                      opacity: isSelected ? 0 : 1,
                      transition: "opacity 0.3s ease-in-out",
                      display: "block",
                    }} 
                  />
                  
                  {/* Highlight Icon (Overlay) */}
                  <img 
                    src={genre.highlightIcon} 
                    alt={`${genre.name} Highlight`} 
                    style={{ 
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%", 
                      width: "100%", // Match parent/normal icon width
                      opacity: isSelected ? 1 : 0,
                      transition: "opacity 0.3s ease-in-out",
                      filter: "drop-shadow(0px 0px 6px rgba(0, 0, 0, 0.25))",
                      pointerEvents: "none", // Click goes to parent div
                      display: "block",
                    }} 
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Shop List Container (W100% H743px) */}
        <div
          className="shop-list-scroll-container"
          style={{
            width: "100%",
            height: "743px",
            flexShrink: 0,
            overflowY: "auto",
            paddingTop: "15px", // Top padding for visual balance
            paddingBottom: "15px", // Bottom padding
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // Center items horizontally (440px inside 460px)
            gap: "15px", // Spacing between items
          }}
        >
          {/* Shop List Items */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedGenre} // Use selectedGenre as key to trigger full list re-render
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "15px",
              }}
            >
              {filteredShops.map((shop, index) => (
                <div
                  key={shop.shopId || `${shop.name}-${index}`}
                  style={{
                    width: "440px",
                    height: "80px",
                    borderRadius: "10px",
                    backgroundColor: "#FFFFFF",
                    boxShadow: "2px 2px 4px 1px rgba(0, 0, 0, 0.4)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 20px",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Temporary Content */}
                  <span style={{ fontSize: "16px", fontWeight: "bold", fontFamily: "'Rounded Mplus 1c', sans-serif", color: "#333" }}>
                    {shop.name}
                  </span>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Container (W100% H167px) */}
        <div
          style={{
            width: "100%",
            height: "167px",
            flexShrink: 0,
            borderTop: "2px solid #D9D9D9",
            padding: "20px 30px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column", // Changed to column to stack buttons and language selector
            alignItems: "flex-start",
            justifyContent: "space-between", // Space out vertically
          }}
        >
          {/* Top Row: News Buttons */}
          <div style={{ display: "flex", flexDirection: "row", gap: "12px" }}>
            {/* Event News Button */}
            <div 
              style={{ position: "relative", cursor: "pointer" }}
              onMouseDown={() => setPressedNewsButton("event")}
              onMouseUp={() => setPressedNewsButton(null)}
              onMouseLeave={() => setPressedNewsButton(null)}
              onTouchStart={() => setPressedNewsButton("event")}
              onTouchEnd={() => setPressedNewsButton(null)}
            >
              <img 
                src={buttonEventNews} 
                alt="Event News" 
                style={{ 
                  display: "block",
                  opacity: pressedNewsButton === "event" ? 0 : 1,
                  transition: "opacity 0.1s ease-in-out",
                }} 
              />
              <img 
                src={buttonEventNewsHighlight} 
                alt="Event News Highlight" 
                style={{ 
                  position: "absolute",
                  top: 0,
                  left: 0,
                  display: "block",
                  opacity: pressedNewsButton === "event" ? 1 : 0,
                  transition: "opacity 0.1s ease-in-out",
                  pointerEvents: "none",
                }} 
              />
            </div>

            {/* Shop News Button */}
            <div 
              style={{ position: "relative", cursor: "pointer" }}
              onMouseDown={() => setPressedNewsButton("shop")}
              onMouseUp={() => setPressedNewsButton(null)}
              onMouseLeave={() => setPressedNewsButton(null)}
              onTouchStart={() => setPressedNewsButton("shop")}
              onTouchEnd={() => setPressedNewsButton(null)}
            >
              <img 
                src={buttonShopNews} 
                alt="Shop News" 
                style={{ 
                  display: "block",
                  opacity: pressedNewsButton === "shop" ? 0 : 1,
                  transition: "opacity 0.1s ease-in-out",
                }} 
              />
              <img 
                src={buttonShopNewsHighlight} 
                alt="Shop News Highlight" 
                style={{ 
                  position: "absolute",
                  top: 0,
                  left: 0,
                  display: "block",
                  opacity: pressedNewsButton === "shop" ? 1 : 0,
                  transition: "opacity 0.1s ease-in-out",
                  pointerEvents: "none",
                }} 
              />
            </div>

          {/* Open Time Button */}
          <div 
            style={{ position: "relative", cursor: "pointer" }}
            onMouseDown={() => setPressedNewsButton("openTime")}
            onMouseUp={() => {
              setPressedNewsButton(null);
              setShowOpenTime(true);
            }}
            onMouseLeave={() => setPressedNewsButton(null)}
            onTouchStart={() => setPressedNewsButton("openTime")}
            onTouchEnd={() => {
              setPressedNewsButton(null);
              setShowOpenTime(true);
            }}
          >
            <img 
              src={buttonOpenTime} 
              alt="Open Time" 
              style={{ 
                display: "block",
                opacity: pressedNewsButton === "openTime" ? 0 : 1,
                transition: "opacity 0.1s ease-in-out",
              }} 
            />
            <img 
              src={buttonOpenTimeHighlight} 
              alt="Open Time Highlight" 
              style={{ 
                position: "absolute",
                top: 0,
                left: 0,
                display: "block",
                opacity: pressedNewsButton === "openTime" ? 1 : 0,
                transition: "opacity 0.1s ease-in-out",
                pointerEvents: "none",
              }} 
            />
          </div>
          </div>

          {/* Bottom Row: Language Selector */}
          <div 
            ref={languageButtonRef}
            style={{ position: "relative", cursor: "pointer" }}
            onClick={() => setIsLanguageModalOpen(true)}
          >
            {/* JP Image */}
            <img 
              src={selectLanguageSelectedJp}
              alt="Language JP"
              style={{
                display: "block",
                opacity: selectedLanguage === "ja" ? 1 : 0,
                transition: "opacity 0.3s ease-in-out",
              }}
            />
            {/* EN Image (Overlay) */}
            <img 
              src={selectLanguageSelectedEn}
              alt="Language EN"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                display: "block",
                opacity: selectedLanguage === "en" ? 1 : 0,
                transition: "opacity 0.3s ease-in-out",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Language Select Modal */}
      <LanguageSelectModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        buttonRef={languageButtonRef}
        onLanguageChange={(lang) => setSelectedLanguage(lang)}
      />
    </div>
  );
};

export default ShopListScreen;
