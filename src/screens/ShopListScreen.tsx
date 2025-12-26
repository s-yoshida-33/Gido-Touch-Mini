// src/screens/ShopListScreen.tsx
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { FloorSelectButton } from "../components/FloorSelectButton";
import { NavButton } from "../components/NavButton";
import { FloorLabel } from "../components/FloorLabel";
import { CurrentFloorIcon } from "../components/CurrentFloorIcon";
import { LanguageSelectButton } from "../components/LanguageSelectButton";
// import openTime removed - used via button/component
import { EventNewsButton } from "../components/EventNewsButton";
import { ShopNewsButton } from "../components/ShopNewsButton";
import { OpenTimeButton } from "../components/OpenTimeButton";
// Facility button imports removed - loaded dynamically via mall assets
import { CloseButton } from "../components/CloseButton";
import type { Shop } from "../types/shop";
import type { ShopNews } from "../types/shopNews";
import { LanguageSelectModal } from "../components/LanguageSelectModal";
import { ShopPin } from "../components/ShopPin";
import { LocationIconsOverlay } from "../components/LocationIconsOverlay";
import { KeyboardModal } from "../components/KeyboardModal";
import { EventNewsModal } from "../components/EventNewsModal";
import { ShopNewsModal } from "../components/ShopNewsModal";
import { ShopLogoImage } from "../components/ShopLogoImage";
import { buildImagePath, toFileUrl } from "../utils/imageUtils";
// Unused variables removed
import { getCommonAssetUrl } from "../utils/assets"; // Import common assets helper
// ImageSettings import removed - handled in parent
// MallConfig import removed - handled via props
import type { LocationIconSettingsPerFloor } from "../types/locationIcon";
import type { FloorId } from "../types/floorLayout";
import type { PictoSettings } from "../types/picto";
import type { Genre } from "../types/mall"; // Update import
import type { ShopPositionSettings } from "../types/shopPosition";
import { logInfo } from "../logs/logging";
import { getLocationIconSettingsForFloor, DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR } from "../config";
import { getMallConfig } from "../config/malls";
import { PictoPin } from "../components/PictoPin";
import type { MallId } from "../types/mall"; // Import
import { 
  findMallPictoUrl, 
  getMallAssetUrl, 
  loadMallGenreConfig, 
  loadGenreIcon, 
  loadMallPictoConfig, 
  loadPictoIcon 
} from "../utils/assets"; // Import

interface GenreItem {
  id: string;
  order: number;
  name: { ja: string; en?: string };
  iconFile: string;
}

interface PictoItem {
  id: string;
  order: number;
  name: { ja: string; en?: string };
  iconFile: string;
  buttonFile: string;
}

interface GenreConfig {
  genres: GenreItem[];
}

interface PictoConfig {
  pictos: PictoItem[];
}

// Load common assets
const iconSearch = getCommonAssetUrl("search.svg");
const iconTime = getCommonAssetUrl("time.svg");
const iconTel = getCommonAssetUrl("tel.svg");
const iconLocation = getCommonAssetUrl("location.svg");
const hint = getCommonAssetUrl("hint.svg");
const commingSoon = getCommonAssetUrl("comming-soon.svg");
const waonPointIcon = getCommonAssetUrl("waonpoint.svg");
// Unused openTime import removed
// Zoom icons - common but language/state specific (might need more logic if fully dynamic, 
// for now hardcoding path if they are in common/zoom/[lang]/...)
// Or using the getCommonAssetUrl with subpaths if supported by helper (it prepends 'common/')
const zoomInJa = getCommonAssetUrl("zoom/ja/zoom-in.svg");
const zoomInJaHighlight = getCommonAssetUrl("zoom/ja/zoom-in-highlight.svg");
const zoomInEn = getCommonAssetUrl("zoom/en/zoom-in.svg");
const zoomInEnHighlight = getCommonAssetUrl("zoom/en/zoom-in-highlight.svg");

const zoomOutJa = getCommonAssetUrl("zoom/ja/zoom-out.svg");
const zoomOutJaHighlight = getCommonAssetUrl("zoom/ja/zoom-out-highlight.svg");
const zoomOutEn = getCommonAssetUrl("zoom/en/zoom-out.svg");
const zoomOutEnHighlight = getCommonAssetUrl("zoom/en/zoom-out-highlight.svg");

// Unused DEFAULT_MAPS removed

// Idle timeout configuration (30 seconds)
const IDLE_TIMEOUT_MS = 30000;

// buildImagePath and toFileUrl moved to src/utils/imageUtils.ts
// ShopLogoImage moved to src/components/ShopLogoImage.tsx

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
      const electronAPI = (window as any).electronAPI; // Cast window to any
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
        fontSize: "16px",
        fontWeight: "bold",
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

// toFileUrl moved to src/utils/imageUtils.ts

/**
 * Normalize floor value to standard format (e.g., "1" -> "1F", "1F" -> "1F")
 */
function normalizeFloor(value: string): string {
  if (!value) return "";
  const m = value.match(/(\d+)/);
  return m ? `${m[1]}F` : value;
}

// Genre data definition removed (imported from types/mall)

  // No local definitions needed as we use config/malls.ts


// GENRE_LIST removed - passed via props

// Remove CURRENT_FLOOR constant as it is now passed via props
// const CURRENT_FLOOR: string = "1F";

// Map switch animation variants
const mapVariants: Variants = {
  enter: (direction: number) => ({
    y: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    y: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
};

// List switch animation variants
const listVariants: Variants = {
  enter: (direction: number) => {
    if (direction === 0) return { opacity: 0 };
    return {
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    if (direction === 0) return { opacity: 0 };
    return {
      zIndex: 0,
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    };
  },
};

// Reference width for scaling (Full HD)
const REFERENCE_MAP_WIDTH = 1920;
// Current map display width in ShopListScreen
const CURRENT_MAP_WIDTH = 1460;

interface ShopListScreenProps {
  isSettingsOpen?: boolean;
  locationIconSettings?: LocationIconSettingsPerFloor;
  currentFloor?: string;
  shops: Shop[];
  shopPositions?: ShopPositionSettings;
  shopNews?: ShopNews[];
  eventNews?: ShopNews[];
  pictoSettings?: PictoSettings;
  genres: Genre[]; // Added prop
  mallId?: MallId; // Added prop
  floorMaps?: Record<string, string>; // Added prop
  openTimeImage?: string; // Add prop
}

// 五十音行マッピング

// 五十音行マッピング
const KANA_MAP: Record<string, RegExp> = {
  'あ': /^[あいうえおぁぃぅぇぉアイウエオァィゥェォ]/,
  'か': /^[かきくけこがぎぐげごカキクケコガギグゲゴ]/,
  'さ': /^[さしすせそざじずぜぞサシスセソザジズゼゾ]/,
  'た': /^[たちつてとだぢづでどタチツテトダヂヅデド]/,
  'な': /^[なにぬねのナニヌネノ]/,
  'は': /^[はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ]/,
  'ま': /^[まみむめもマミムメモ]/,
  'や': /^[やゆよゃゅょヤユヨャュョ]/,
  'ら': /^[らりるれろラリルレロ]/,
  'わ': /^[わをんワヲン]/,
};

// アルファベットマッピング（大文字小文字無視）
function getAlphabetRegex(char: string): RegExp {
  const c = char.toLowerCase();
  // エスケープが必要な文字はないはずだが念のため単純に
  return new RegExp(`^[${c}${c.toUpperCase()}]`);
}

function getGenreBadgeColor(genre: string | undefined): string {
  if (!genre) return "#999999";
  switch (genre) {
    case "ファッション":
    case "ファッション雑貨":
    case "キッズ":
      return "#1AAE48";
    case "スポーツ・アウトドア":
    case "ライフスタイル":
      return "#176FC1";
    case "グルメ":
      return "#F68712";
    case "エンターテインメント":
      return "#EC008C";
    case "サービス":
      return "#633B9F";
    default:
      return "#999999";
  }
}

/**
 * Shop list screen
 * Screen size: 1920x1080
 * Background: White
 */
const ShopListScreen: React.FC<ShopListScreenProps> = ({ 
  isSettingsOpen = false,
  locationIconSettings = DEFAULT_LOCATION_ICON_SETTINGS_PER_FLOOR,
  currentFloor = "1F",
  shops,
  shopPositions,
  shopNews = [],
  eventNews = [],
  pictoSettings,
  genres = [],
  mallId = "suzaka",
  floorMaps = {},
  openTimeImage: propOpenTimeImage, // Add prop
}) => {

  // Map content ref for direct style manipulation (zoom scale)
  const mapContentRef = useRef<HTMLDivElement>(null);
  
  // Get facility list based on mallId
  const facilityList = useMemo(() => {
    // getMallConfig always returns a config object (falls back to suzaka if not found)
    const config = getMallConfig(mallId);
    return config.facilities;
  }, [mallId]);

  // Map transform ref
  const transformComponentRef = useRef<ReactZoomPanPinchContentRef>(null);
  
  // Ref to track drag start position for click vs drag detection
  const dragStartPosRef = useRef<{ x: number, y: number } | null>(null);

  // Determine current map based on settings or fallback (Unused but kept for reference if needed logic later)
  // const currentMap = floorMaps[currentFloor] || "";

  // Resolve open time image - use prop or fallback to mall default
  const openTimeImage = propOpenTimeImage || getMallAssetUrl(mallId, "open-time", "open-time.svg");

  // Genre scroll container ref
  const genreScrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Shop list scroll container ref
  const shopListScrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Selected genre state
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  
  // Genre switch direction (1: right to left (next), -1: left to right (prev))
  const [genreDirection, setGenreDirection] = useState(0);

  // Wrapper for setting selected genre with direction calculation
  const handleSetSelectedGenre = (newGenreId: string) => {
    if (newGenreId === selectedGenre) return;

    const currentIndex = genres.findIndex(g => g.id === selectedGenre);
    const newIndex = genres.findIndex(g => g.id === newGenreId);
    
    if (currentIndex !== -1 && newIndex !== -1) {
        if (newIndex > currentIndex) {
            setGenreDirection(1);
        } else {
            setGenreDirection(-1);
        }
    } else {
        setGenreDirection(0);
    }
    
    setSelectedGenre(newGenreId);
  };
  
  // Update searchQuery and reset direction
  const handleSetSearchQuery = (query: string) => {
      setGenreDirection(0);
      setSearchQuery(query);
  };

  // Floor filter state
  const [selectedFloor, setSelectedFloorState] = useState<string | null>(currentFloor);
  
  // Sync selectedFloor with currentFloor prop
  useEffect(() => {
    // Only update if currentFloor is a valid string
    if (currentFloor) {
      setSelectedFloorState(currentFloor);
    }
  }, [currentFloor]);

  // Selected facility state (for map overlay)
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

  // Previous floor ref to track direction changes
  // Use ref to avoid re-renders and ensure we always have the previous value
  const prevFloorRef = useRef<string | null>(selectedFloor);

  // Track floor change timing for rapid switching detection
  const floorChangeTimestampsRef = useRef<number[]>([]);
  const RAPID_SWITCH_THRESHOLD_MS = 300; // If floor changes within 300ms, consider it rapid
  const MAX_TRACKED_CHANGES = 5;

  // Map zoom scale state
  const [currentScale, setCurrentScale] = useState(1);

  // Pin animation delay state
  const [pinDelay, setPinDelay] = useState(0);

  // Removed useTransition to ensure synchronous state updates
  // This prevents floor display and map from getting out of sync during rapid switching

  // Detect rapid floor switching
  const isRapidSwitch = useMemo(() => {
    const timestamps = floorChangeTimestampsRef.current;
    if (timestamps.length < 2) return false;
    
    const recentChanges = timestamps.slice(-3); // Check last 3 changes
    const timeSpan = recentChanges[recentChanges.length - 1] - recentChanges[0];
    return timeSpan < RAPID_SWITCH_THRESHOLD_MS * 2; // If 3 changes within 600ms, it's rapid
  }, [selectedFloor]);

  // Calculate floor direction from selectedFloor and previous floor
  // This ensures direction is always correct even during rapid floor switching
  // Use useMemo to calculate synchronously during render
  // Update prevFloorRef inside useMemo to ensure we always use the correct previous value
  const floorDirection = useMemo(() => {
    const getFloorNum = (f: string | null) => parseInt(f?.replace("F", "") || "1");
    
    // Read the previous floor before calculation
    const prevFloor = prevFloorRef.current;
    const current = getFloorNum(prevFloor || "1F");
    const next = getFloorNum(selectedFloor || "1F");

    // Track floor change timestamp
    const now = Date.now();
    floorChangeTimestampsRef.current.push(now);
    if (floorChangeTimestampsRef.current.length > MAX_TRACKED_CHANGES) {
      floorChangeTimestampsRef.current.shift();
    }

    // Update prevFloorRef for next calculation (after reading current value)
    // This ensures the next render will use the correct previous floor
    prevFloorRef.current = selectedFloor;

    if (next === current) return 0;

    // Special handling for edge floors (1F and 4F)
    // 1F (lowest floor): Always comes from below (direction = -1, y: 200 from bottom)
    // 4F (highest floor): Always comes from above (direction = 1, y: -200 from top)
    // Note: In mapVariants, direction > 0 means enter from top (y: -200), direction < 0 means enter from bottom (y: 200)
    if (next === 1) {
      // Moving to 1F: always from below (direction = -1, y: 200)
      return -1;
    } else if (next === 4) {
      // Moving to 4F: always from above (direction = 1, y: -200)
      return 1;
    } else if (next > current) {
      // Moving up (e.g. 1F -> 2F, 2F -> 3F)
      return 1;
    } else {
      // Moving down (e.g. 3F -> 2F, 2F -> 1F)
      return -1;
    }
  }, [selectedFloor]);

  // Calculate animation duration based on rapid switching
  const animationDuration = isRapidSwitch ? 0.2 : 0.5;

  // Ref to track the latest floor request to ensure we always process the most recent one
  // This helps prevent race conditions during rapid floor switching
  const latestFloorRequestRef = useRef<string | null>(null);

  // Wrapper for setting selected floor
  // Use useCallback to make it stable for useEffect dependencies
  // Synchronous update to prevent floor display and map from getting out of sync
  // Always process the latest floor request to prevent race conditions during rapid switching
  const setSelectedFloor = useCallback((newFloor: string | null) => {
    // Store the latest request immediately
    latestFloorRequestRef.current = newFloor;
    
    // Update state synchronously to ensure immediate consistency
    // Always use the latest request from the ref to handle rapid switching
    setSelectedFloorState((prevFloor) => {
      const latestFloor = latestFloorRequestRef.current;
      
      if (latestFloor === prevFloor) return prevFloor;
      
      // Reset zoom on floor change
      if (transformComponentRef.current) {
        transformComponentRef.current.resetTransform();
      }

      return latestFloor;
    });
  }, []);

  // ピクトアイコン選択時の自動フロア切り替え
  // selectedFacilityが変更されたときのみ実行（依存配列からselectedFloorを外す）
  useEffect(() => {
    if (!selectedFacility || !pictoSettings) return;

    // 現在のstateではなく、最新の値を参照するために副作用内で取得するのが望ましいが、
    // ここでは「選択した瞬間」の判定として現在のselectedFloorを使用する。
    // ただし、依存配列にselectedFloorを含めると、ユーザーがフロアを切り替えたときに
    // 再度この効果が走り、強制的に戻されてしまう可能性がある。
    // したがって、selectedFacilityが変わったタイミングのみ実行する。

    // 選択されたタグを持つピクトインスタンスを全フロアから検索
    const instances = Object.values(pictoSettings.instances).filter(
      (inst) => inst.tag === selectedFacility
    );

    if (instances.length === 0) return;

    // 以下のロジックは「選択した瞬間」に現在のフロアに存在するかどうかをチェックする。
    // ただし、useEffect内でselectedFloorを参照すると、selectedFloorが古い可能性があるため、
    // セット関数内やRefを使う手もあるが、ここではシンプルに
    // 「選択された施設が存在するフロアリスト」を作成し、
    // 現在表示中のフロアが含まれていなければ移動する、というロジックにする。
    // ここで `selectedFloor` を依存配列に含めないことで、
    // ユーザーが手動でフロアを変えたときには反応しないようにする。

    const currentFloorNormalized = normalizeFloor(selectedFloor || "1F");
    
    // 現在のフロアに存在するか
    const existsOnCurrentFloor = instances.some(
      (inst) => normalizeFloor(inst.floor) === currentFloorNormalized
    );

    // 現在のフロアにない場合、他フロアへ移動
    if (!existsOnCurrentFloor) {
      // 優先順位:
      // 1. カレントフロア（現在地）から最も近いフロア（フロア差の絶対値が小さい順）
      // 2. 上階優先 (同じ距離なら上の階)

      // フロア番号を取得するヘルパー
      const getFloorNum = (f: string) => parseInt(f.replace("F", "") || "0");
      
      // 現在地のフロア番号
      const currentLocFloorNum = getFloorNum(currentFloor || "1F");
      
      const availableFloors = Array.from(new Set(instances.map(inst => normalizeFloor(inst.floor))));

      // 優先順位に従ってソート
      availableFloors.sort((a, b) => {
        const floorA = getFloorNum(a);
        const floorB = getFloorNum(b);
        
        const distA = Math.abs(floorA - currentLocFloorNum);
        const distB = Math.abs(floorB - currentLocFloorNum);

        // 距離が違う場合は近い順
        if (distA !== distB) {
            return distA - distB;
        }

        // 距離が同じ場合は上階優先 (数値が大きい方が優先 -> 昇順ソートだと後になるので b - a)
        return floorB - floorA;
      });

      if (availableFloors.length > 0) {
        setSelectedFloor(availableFloors[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacility, pictoSettings]); // selectedFloor, setSelectedFloor を除外して手動変更を許可する
  
  // Active news button state (null if none selected) -> Changed to track pressed state only
  const [pressedNewsButton, setPressedNewsButton] = useState<"event" | "shop" | "openTime" | null>(null);
  
  // Active zoom button state
  const [pressedZoomButton, setPressedZoomButton] = useState<"in" | "out" | null>(null);

  // Active genre navigation button state
  const [pressedGenreNavButton, setPressedGenreNavButton] = useState<"prev" | "next" | null>(null);

  // Active close button state for detail modal
  const [pressedCloseButton, setPressedCloseButton] = useState(false);

  // Genre scroll state for buttons
  const [canScrollGenreLeft, setCanScrollGenreLeft] = useState(false);
  const [canScrollGenreRight, setCanScrollGenreRight] = useState(true);

  const checkGenreScroll = useCallback(() => {
    const container = genreScrollContainerRef.current;
    if (!container) return;
    
    // Allow a small buffer for float calculation discrepancies
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollGenreLeft(scrollLeft > 1);
    setCanScrollGenreRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    const container = genreScrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkGenreScroll);
    // Initial check
    checkGenreScroll();
    
    // Check on resize
    window.addEventListener('resize', checkGenreScroll);

    return () => {
        container.removeEventListener('scroll', checkGenreScroll);
        window.removeEventListener('resize', checkGenreScroll);
    };
  }, [checkGenreScroll, selectedGenre]); // Re-check when genre changes or on mount

  // Also re-check when genre list layout might change
  useLayoutEffect(() => {
      checkGenreScroll();
  });

  // Show open time modal state
  const [showOpenTime, setShowOpenTime] = useState(false);

  // Show hint state
  const [showHint, setShowHint] = useState(true);

  // Show floor label state
  const [showFloorLabel, setShowFloorLabel] = useState(true);
  
  const shopsRef = useRef<Shop[]>([]); // Keep track of shops for error handling

  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);
  
  // Selected shop for side modal (Slide-in)
  const [selectedShopDetail, setSelectedShopDetail] = useState<Shop | null>(null);
  
  // Flag to ignore closing the modal when floor changes programmatically
  const ignoreFloorChangeRef = useRef(false);

  // Close shop detail modal when floor changes
  useEffect(() => {
    if (ignoreFloorChangeRef.current) {
      ignoreFloorChangeRef.current = false;
      return;
    }
    setSelectedShopDetail(null);
  }, [selectedFloor]);

  // Reset hint and floor label visibility when floor changes
  // This ensures they are displayed even during rapid floor switching
  useEffect(() => {
    // Check if we're in default state (no zoom, no pan)
    const isDefault = Math.abs(currentScale - 1) < 0.01;
    
    if (isDefault) {
      // Use a small delay to ensure the floor change animation has started
      // This prevents race conditions during rapid floor switching
      const timeoutId = setTimeout(() => {
        setShowHint(true);
        setShowFloorLabel(true);
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedFloor, currentScale]);

  const lastActivityTimeRef = useRef<number>(Date.now());

  // Language select modal state
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  
  // Search Keyboard Modal State
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Event News Modal State
  const [isEventNewsModalOpen, setIsEventNewsModalOpen] = useState(false);
  
  // Shop Event Modal State
  const [isShopNewsModalOpen, setIsShopNewsModalOpen] = useState(false);

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

  // モール設定の状態
  const [mallGenreConfig, setMallGenreConfig] = useState<GenreItem[] | null>(null);
  const [mallPictoConfig, setMallPictoConfig] = useState<PictoItem[] | null>(null);
  const [genreIcons, setGenreIcons] = useState<Record<string, { normal: string; highlight: string }>>({});
  const [pictoIcons, setPictoIcons] = useState<Record<string, { button: string; buttonHighlight: string }>>({});

  // モール設定を読み込む
  useEffect(() => {
    const loadMallConfig = async () => {
      try {
        // ジャンル設定を読み込む
        const genreConfig = await loadMallGenreConfig(mallId) as GenreConfig;
        if (genreConfig && genreConfig.genres) {
          setMallGenreConfig(genreConfig.genres);
          
          // ジャンルアイコンを読み込む
          const iconPromises = genreConfig.genres.map(async (genre) => {
            const normal = await loadGenreIcon(mallId, selectedLanguage, genre.iconFile, false);
            const highlight = await loadGenreIcon(mallId, selectedLanguage, genre.iconFile, true);
            return {
              id: genre.id,
              normal: normal || "",
              highlight: highlight || "",
            };
          });
          
          const loadedIcons = await Promise.all(iconPromises);
          const iconMap: Record<string, { normal: string; highlight: string }> = {};
          loadedIcons.forEach((icon) => {
            if (icon.normal && icon.highlight) {
              iconMap[icon.id] = { normal: icon.normal, highlight: icon.highlight };
            }
          });
          setGenreIcons(iconMap);
        }

        // ピクト設定を読み込む
        const pictoConfig = await loadMallPictoConfig(mallId) as PictoConfig;
        if (pictoConfig && pictoConfig.pictos) {
          setMallPictoConfig(pictoConfig.pictos);
          
          // ピクトボタンアイコンを読み込む
          const buttonIconPromises = pictoConfig.pictos.map(async (picto) => {
            const button = await loadPictoIcon(mallId, selectedLanguage, picto.buttonFile.replace("button-", "").replace(".svg", ""), false, true);
            const buttonHighlight = await loadPictoIcon(mallId, selectedLanguage, picto.buttonFile.replace("button-", "").replace(".svg", ""), true, true);
            return {
              id: picto.id,
              button: button || "",
              buttonHighlight: buttonHighlight || "",
            };
          });
          
          const loadedButtonIcons = await Promise.all(buttonIconPromises);
          const buttonIconMap: Record<string, { button: string; buttonHighlight: string }> = {};
          loadedButtonIcons.forEach((icon) => {
            if (icon.button && icon.buttonHighlight) {
              buttonIconMap[icon.id] = { button: icon.button, buttonHighlight: icon.buttonHighlight };
            }
          });
          setPictoIcons(buttonIconMap);
          
        }
      } catch (error) {
        console.error("Failed to load mall config", error);
      }
    };

    loadMallConfig();
  }, [mallId, selectedLanguage]);

  // 動的にGENRE_LISTとFACILITY_LISTを生成
  const GENRE_LIST = useMemo(() => {
    if (mallGenreConfig && Object.keys(genreIcons).length > 0) {
      // モール設定から動的に生成
      return mallGenreConfig
        .sort((a, b) => a.order - b.order)
        .map((genre) => {
          const icons = genreIcons[genre.id];
          const name = selectedLanguage === "ja" ? genre.name.ja : (genre.name.en || genre.name.ja);
          return {
            id: genre.id,
            name,
            icon: icons?.normal || "",
            highlightIcon: icons?.highlight || "",
          };
        });
    }
    // フォールバック: デフォルトリストを使用
    return genres;
  }, [mallGenreConfig, genreIcons, selectedLanguage, genres]);

  const FACILITY_LIST = useMemo(() => {
    if (mallPictoConfig && Object.keys(pictoIcons).length > 0) {
      // モール設定から動的に生成
      return mallPictoConfig
        .sort((a, b) => a.order - b.order)
        .map((picto) => {
          const icons = pictoIcons[picto.id];
          const name = selectedLanguage === "ja" ? picto.name.ja : (picto.name.en || picto.name.ja);
          return {
            id: picto.id,
            name,
            icon: icons?.button || "",
            highlightIcon: icons?.buttonHighlight || "",
          };
        });
    }
    // フォールバック: デフォルトリストを使用
    return facilityList;
  }, [mallPictoConfig, pictoIcons, selectedLanguage, facilityList]);

  // ピクトメニューの横幅を動的に計算（ボタン数に応じて）
  const pictoMenuWidth = useMemo(() => {
    const buttonCount = FACILITY_LIST.length;
    const buttonWidth = 80; // 各ボタンの幅
    const gap = 20; // ボタン間のギャップ
    const padding = 40; // 左右のパディング
    const minWidth = 400; // 最小幅
    // const maxWidth = 1000; // 最大幅 - ボタン数に合わせて動的にするため制限を解除（または十分大きく）
    const calculatedWidth = buttonCount * buttonWidth + (buttonCount - 1) * gap + padding;
    return Math.max(minWidth, calculatedWidth);
  }, [FACILITY_LIST.length]);

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


  // Refreshing state for white fade effect
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Idle timeout: Refresh to default shop list after 30 seconds of inactivity
  // Always active - any touch/activity resets the timer
  useEffect(() => {
    // Always reset activity time on mount
    lastActivityTimeRef.current = Date.now();

    // Throttle activity handler to avoid too frequent updates
    let throttleTimeout: number | null = null;
    const handleActivity = () => {
      // If currently refreshing, ignore activity
      if (isRefreshing) return;
      
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

    // Listen to scroll events on the genre scroll container
    const genreScrollContainer = genreScrollContainerRef.current;
    if (genreScrollContainer) {
        genreScrollContainer.addEventListener('scroll', handleActivity, { passive: true });
    }

    // Check idle timeout every second
    const checkInterval = setInterval(() => {
      // Don't check idle timeout if settings are open or already refreshing
      if (isSettingsOpen || isRefreshing) {
        lastActivityTimeRef.current = Date.now(); // Keep updating last activity
        return;
      }

      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTimeRef.current;

      if (timeSinceLastActivity >= IDLE_TIMEOUT_MS) {
        // Check if we are in default state (if so, no need to refresh)
        // Default state: 
        // - No search query
        // - "all" category
        // - "ja" language
        // - No event news modal
        // - No shop detail modal
        // - No keyboard
        // - No language modal
        const isDefaultState = 
          searchQuery === "" && 
          selectedGenre === "all" && 
          selectedLanguage === "ja" && 
          !isEventNewsModalOpen && 
          !isShopNewsModalOpen &&
          !selectedShopDetail && 
          !isKeyboardOpen &&
          !isLanguageModalOpen &&
          !selectedFacility && // ピクトメニューが選択されていない
          Math.abs(currentScale - 1) < 0.01 && // Scale check: if zoomed, not default state
          normalizeFloor(selectedFloor || "1F") === normalizeFloor(currentFloor || "1F"); // Floor check

        if (isDefaultState) {
          // Already in default state, just update timestamp to check again later
          lastActivityTimeRef.current = Date.now();
          return;
        }

        // 30 seconds of inactivity AND not in default state -> Refresh
        logInfo("idle", "Idle timeout reached. Resetting UI with fade.", { timeout: IDLE_TIMEOUT_MS });
        
        // Start refresh sequence
        setIsRefreshing(true);
        
        // After fade in (500ms), reset state
        setTimeout(() => {
          setIsEventNewsModalOpen(false);
          setIsShopNewsModalOpen(false);
          setSearchQuery("");
          setSelectedGenre("all"); // Assuming 'all' is the default genre ID
          setSelectedLanguage("ja");
          setSelectedShopDetail(null);
          setIsKeyboardOpen(false);
          setIsLanguageModalOpen(false);
          setSelectedFacility(null); // ピクトメニューリセット
          
          // Also reset floor to current floor
          if (currentFloor) {
            setSelectedFloor(currentFloor);
          }
          
          // Reset internal states like zoom/pan if possible
          if (transformComponentRef.current) {
             // Force reset to initial state (scale 1, position 0,0) without animation
             transformComponentRef.current.setTransform(0, 0, 1, 0);
          }
          setCurrentScale(1);
          if (mapContentRef.current) {
            mapContentRef.current.style.setProperty('--map-scale', '1');
          }
          
          // Reset genre scroll position
          if (genreScrollContainerRef.current) {
            genreScrollContainerRef.current.scrollTo({ left: 0, behavior: "auto" });
          }

          // After state reset, fade out (another 500ms delay for visibility)
          setTimeout(() => {
             setIsRefreshing(false);
             lastActivityTimeRef.current = Date.now(); // Reset timer
          }, 500);
          
        }, 500); // Wait for fade in
      }
    }, 1000); // Check every second

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (genreScrollContainer) {
        genreScrollContainer.removeEventListener('scroll', handleActivity);
      }
      if (throttleTimeout !== null) {
        clearTimeout(throttleTimeout);
      }
      clearInterval(checkInterval);
    };
  }, [
    isSettingsOpen, 
    isRefreshing,
    // Add all state dependencies to ensure "isDefaultState" check is accurate
    searchQuery, 
    selectedGenre, 
    selectedLanguage, 
    isEventNewsModalOpen, 
    isShopNewsModalOpen,
    selectedShopDetail, 
    isKeyboardOpen,
    isLanguageModalOpen,
    selectedFacility, // Add to dependency array
    currentScale, // Check zoom scale
    selectedFloor, // Check selected floor
    currentFloor // Check current floor
  ]);

  // Filter shops by selected floor AND selected genre
  const filteredShops = React.useMemo(() => {
    let result = shops;

    // 0. Filter by Search Query
    if (searchQuery) {
      // 1文字の入力と仮定（キーボードモーダルの仕様）
      const queryChar = searchQuery.charAt(0);
      
      // 正規表現の決定
      let targetRegex: RegExp | null = null;

      if (KANA_MAP[queryChar]) {
        // かな行検索
        targetRegex = KANA_MAP[queryChar];
      } else if (/[a-zA-Z]/.test(queryChar)) {
        // アルファベット頭文字検索
        targetRegex = getAlphabetRegex(queryChar);
      } else {
        // その他（数字など）の場合はそのまま前方一致
         targetRegex = new RegExp(`^${queryChar}`, 'i');
      }

      if (targetRegex) {
        result = result.filter((shop) => {
          // 1. nameKana (読み仮名) の先頭文字チェック
          if (shop.nameKana && targetRegex!.test(shop.nameKana)) {
            return true;
          }

          // 2. nameEn (英語名) の先頭文字チェック
          if (shop.nameEn && targetRegex!.test(shop.nameEn)) {
            return true;
          }
          
          // 3. name (店舗名) の先頭文字チェック（漢字の場合はヒットしにくいが念のため）
          if (shop.name && targetRegex!.test(shop.name)) {
            return true;
          }

          // 4. searches (検索キーワード) のチェック
          // カンマ区切りの各キーワードの先頭がマッチするか
          if (shop.searches) {
             const keywords = shop.searches.split(',');
             const match = keywords.some(k => targetRegex!.test(k.trim()));
             if (match) return true;
          }
          
          return false;
        });
      }
    }

    // 1. Filter by Floor -> REMOVED (Replaced by Sort)
    // Floor filtering is not applied - instead, shops on the selected floor are prioritized in sorting
    // This allows all shops to be visible while showing selected floor shops at the top
    /*
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
    */

    // 2. Filter by Genre
    if (selectedGenre && selectedGenre !== "all") {
      // Find Japanese name for the selected genre
      let targetGenreName = "";

      if (mallGenreConfig) {
        // Use loaded mall config (has name.ja)
        const genreItem = mallGenreConfig.find(g => g.id === selectedGenre);
        if (genreItem) {
          targetGenreName = genreItem.name.ja;
        }
      } else {
        // Fallback to default genres prop (name is string, typically Japanese)
        const genreItem = genres.find(g => g.id === selectedGenre);
        if (genreItem) {
          targetGenreName = genreItem.name;
        }
      }
      
      if (targetGenreName) {
        result = result.filter((shop) => {
          if (!shop.genre) return false;
          // Exact match with genre name
          return shop.genre === targetGenreName;
        });
      }
    }

    // 3. Filter out shops with empty number
    result = result.filter((shop) => shop.number && shop.number.trim() !== "");

    // 4. Sort
    result = [...result].sort((a, b) => {
      // Priority 1: Selected Floor Priority
      if (selectedFloor) {
        const normalizedSelected = normalizeFloor(selectedFloor);
        const aOnFloor = a.floors?.some(f => normalizeFloor(String(f)) === normalizedSelected);
        const bOnFloor = b.floors?.some(f => normalizeFloor(String(f)) === normalizedSelected);

        // If one is on the selected floor and the other isn't, prioritize the one on the selected floor
        if (aOnFloor && !bOnFloor) return -1;
        if (!aOnFloor && bOnFloor) return 1;
      }

      // Priority 2: Floor Order (Ascending) for everyone else (or if both are on selected floor)
      // Extract floor number for sorting
      const getFloorVal = (s: Shop) => {
        if (!s.floors || s.floors.length === 0) return 999;
        const str = String(s.floors[0]);
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 999;
      };

      const fA = getFloorVal(a);
      const fB = getFloorVal(b);
      
      if (fA !== fB) {
        return fA - fB;
      }

      // Priority 3: Shop Number (Ascending)
      return (a.number || "").localeCompare(b.number || "", "ja", { numeric: true });
    });

    return result;
  }, [shops, selectedFloor, selectedGenre, searchQuery, mallGenreConfig, genres]);


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

  // Calculate scale ratio for consistent pin sizing
  const scaleRatio = CURRENT_MAP_WIDTH / REFERENCE_MAP_WIDTH;

  // Map pointer down handler to capture start position
  const handleMapPointerDown = (e: React.PointerEvent) => {
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Map click handler
  const handleMapClick = (e: React.MouseEvent) => {
    // Check if it was a drag or a click based on distance
    if (dragStartPosRef.current) {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If moved more than 10px, treat as drag and ignore click
      if (distance > 10) return;
    }

    // If shop positions aren't available, we can't find nearest shop
    if (!shopPositions || !shopPositions.positions) return;

    // 1. Calculate click position in percentage relative to map content
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    // 2. Find nearest shop on current floor
    let nearestShop: Shop | null = null;
    let minDistance = Number.MAX_VALUE;
    const HIT_RADIUS = 5.0; // 5% radius hit area

    // Normalize current floor for comparison
    const normalizedCurrentFloor = normalizeFloor(selectedFloor || "1F");

    shops.forEach(shop => {
      const shopId = shop.shopId || shop.number;
      if (!shopId) return;

      const pos = shopPositions.positions[shopId];
      // Check if shop has position and is on current floor
      if (!pos || normalizeFloor(pos.floor) !== normalizedCurrentFloor) return;

      // Calculate distance
      const dx = pos.x - xPercent;
      const dy = pos.y - yPercent;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < HIT_RADIUS && distance < minDistance) {
        minDistance = distance;
        nearestShop = shop;
      }
    });

    // 3. Select nearest shop if found
    if (nearestShop) {
      setSelectedShopDetail(nearestShop);
      setPinDelay(0);
    }
  };

  // Focus on selected shop
  useEffect(() => {
    if (!selectedShopDetail || !selectedShopDetail.position) return;

    const shopFloor = normalizeFloor(String(selectedShopDetail.position.floor));
    const current = normalizeFloor(selectedFloor || "1F");

    // Only focus if shop is on the current floor
    if (shopFloor !== current) return;

    const performFocus = () => {
      if (transformComponentRef.current) {
        const { x, y } = selectedShopDetail.position!;
        const scale = 1.6; // Slight zoom
        const duration = 1000; // Animation duration in ms (1s)

        // Map container dimensions (fixed in CSS)
        const containerW = 1460;
        const containerH = 1080;

        // Target pixel coordinates at scale 1
        const targetX = (x / 100) * containerW;
        const targetY = (y / 100) * containerH;

        // Calculate center offsets: center - target * scale
        let newX = (containerW / 2) - targetX * scale;
        let newY = (containerH / 2) - targetY * scale;

        // Clamp values to keep map within bounds
        // Max x/y is 0 (cannot pan further right/down than the edge)
        // Min x/y is container dimension - scaled content dimension
        // Since containerW and H match the content size at scale 1, we can use simple logic
        const minX = containerW * (1 - scale);
        const minY = containerH * (1 - scale);
        const maxX = 0;
        const maxY = 0;

        newX = Math.min(maxX, Math.max(minX, newX));
        newY = Math.min(maxY, Math.max(minY, newY));

        transformComponentRef.current.setTransform(newX, newY, scale, duration, "easeOut");
      }
    };

    // Delay focus if there's a pin delay (e.g. floor switching)
    const delay = pinDelay > 0 ? pinDelay * 1000 : 0;
    
    const timer = setTimeout(performFocus, delay);
    return () => clearTimeout(timer);
  }, [selectedShopDetail, selectedFloor, pinDelay]);

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
            transition={{ duration: 1 }}
            style={{
              position: "absolute",
              bottom: "145px", // Just above the bottom container
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
                src={openTimeImage} // Use dynamic image
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
          onClick={() => {
            setShowOpenTime(false);
            setPressedNewsButton(null); // Unpress button when closing via overlay
          }}
        />
      )}

      {/* Map Container (W1460px H1080px) */}
      <div
        style={{
          width: "1460px",
          height: "100%",
          position: "relative",
          backgroundColor: "#fff", // Placeholder color to visualize the area
          overflow: "hidden", // Ensure zoomed content doesn't overflow
        }}
      >
        {/* Map Image - Bottom Layer */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
          }}
        >
          <TransformWrapper
            ref={transformComponentRef}
            initialScale={1}
            minScale={1}
            maxScale={4}
            centerOnInit={true}
            limitToBounds={true}
            doubleClick={{ disabled: true }}
            panning={{ disabled: false, velocityDisabled: true }}
            wheel={{ step: 0.1 }}
            alignmentAnimation={{ animationTime: 0, sizeX: 0, sizeY: 0 }}
            velocityAnimation={{ disabled: true }}
            zoomAnimation={{ disabled: true }}
            onPanningStart={() => {
              setShowHint(false);
              setShowFloorLabel(false);
            }}
            onPanningStop={() => {
              // No-op
            }}
            onZoomStart={() => {
              setShowHint(false);
              setShowFloorLabel(false);
            }}
            onInit={(ref) => {
              setCurrentScale(ref.state.scale);
              if (mapContentRef.current) {
                mapContentRef.current.style.setProperty('--map-scale', ref.state.scale.toString());
              }
            }}
            onTransformed={(_, state) => {
              const isDefault = Math.abs(state.scale - 1) < 0.01 && Math.abs(state.positionX) < 1 && Math.abs(state.positionY) < 1;
              setShowHint(isDefault);
              setShowFloorLabel(isDefault);
              setCurrentScale(state.scale);
              if (mapContentRef.current) {
                mapContentRef.current.style.setProperty('--map-scale', state.scale.toString());
              }
            }}
          >
            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
              }}
              contentStyle={{
                width: "100%",
                height: "100%",
              }}
            >
              <div 
                ref={mapContentRef}
                style={{ width: "100%", height: "100%", position: "relative" }}
                onPointerDown={handleMapPointerDown}
                onClick={handleMapClick}
              >
                {/* Map with all overlays (icons, pictos) as a single animated unit */}
                {/* Use "popLayout" mode to allow smooth animations while ensuring latest floor is always shown */}
                <AnimatePresence initial={false} custom={floorDirection} mode="popLayout">
                  <motion.div
                    key={selectedFloor || "1F"}
                    custom={floorDirection}
                    variants={mapVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      y: { type: "tween", duration: animationDuration, ease: "easeInOut" },
                      opacity: { duration: animationDuration }
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  >
                    {/* Map Image */}
                    <img
                      src={floorMaps[selectedFloor || "1F"] || ""}
                      alt={`${selectedFloor || "1F"} Map`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />

                    {/* Current Location Icons Overlay - part of the map */}
                    {normalizeFloor(selectedFloor || "1F") === normalizeFloor(currentFloor) && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none",
                          zIndex: 20,
                        }}
                      >
                        <LocationIconsOverlay
                          settings={(() => {
                            const baseSettings = getLocationIconSettingsForFloor(locationIconSettings, (selectedFloor || "1F") as FloorId);
                            // Apply scale ratio to location icon settings
                            return {
                              speechBubble: {
                                ...baseSettings.speechBubble,
                                size: baseSettings.speechBubble.size * scaleRatio
                              },
                              location: {
                                ...baseSettings.location,
                                size: baseSettings.location.size * scaleRatio
                              }
                            };
                          })()}
                          mapMetrics={{ width: CURRENT_MAP_WIDTH, height: 1080 }}
                        />
                      </div>
                    )}

                    {/* Picto Pins - part of the map */}
                    {pictoSettings && Object.values(pictoSettings.instances)
                      .filter(instance => instance.floor === normalizeFloor(selectedFloor || "1F"))
                      .map(instance => {
                        // Find URL from assets utility based on filename
                        const iconUrl = findMallPictoUrl(mallId, instance.iconName);
                        if (!iconUrl) return null;

                        const scaledInstance = {
                          ...instance,
                          size: (instance.size ?? 80) * scaleRatio
                        };

                        const isHighlighted = selectedFacility === instance.tag;

                        // Picto position is already in percentage, use it directly
                        // Since picto is inside the same motion.div as the map, it will move together
                        return (
                          <div key={`picto-${instance.id}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}>
                            <PictoPin
                              instance={scaledInstance}
                              iconUrl={iconUrl}
                              usePixelPosition={false}
                              isSelected={isHighlighted}
                              renderMode="default"
                            />
                          </div>
                        );
                      })
                    }
                  </motion.div>
                </AnimatePresence>

                {/* Selected Shop Pin */}
                <AnimatePresence>
                  {selectedShopDetail && 
                   selectedShopDetail.position && 
                   normalizeFloor(String(selectedShopDetail.position.floor)) === normalizeFloor(selectedFloor || "") && (
                    <ShopPin
                      key={selectedShopDetail.shopId || selectedShopDetail.number}
                      position={{
                        ...selectedShopDetail.position,
                        size: (selectedShopDetail.position.size ?? 80) * scaleRatio
                      }}
                      shopName={selectedShopDetail.name}
                      shopLogo={selectedShopDetail.shopLogo}
                      shopId={selectedShopDetail.shopId}
                      isSelected={true}
                      transformScale={currentScale}
                      delay={pinDelay}
                    />
                  )}
                </AnimatePresence>

              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>

        {/* Hint Image */}
        <AnimatePresence mode="sync">
          {showHint && (
            <motion.img
              key={`hint-${selectedFloor || "1F"}`}
              src={hint}
              alt="Hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              style={{
                position: "absolute",
                top: "37px",
                left: "37px",
                zIndex: 20,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          )}
        </AnimatePresence>

        {/* Floor Label */}
        <AnimatePresence mode="sync">
          {showFloorLabel && (
            <motion.div
              key={selectedFloor || "1F"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              style={{
                position: "absolute",
                top: "20px",
                right: "30px",
                zIndex: 20,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              <FloorLabel floor={(selectedFloor || "1F") as "1F" | "2F" | "3F" | "4F"} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pictogram Container (Bottom Center) */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "710px", // Adjusted to center between left (80px width) and right (120px width) buttons
            transform: "translateX(-50%)",
            width: `${pictoMenuWidth}px`,
            height: "100px",
            backgroundColor: "#FFFFFF",
            borderRadius: "26px",
            zIndex: 10,
            filter: "drop-shadow(0px 0px 6px rgba(0, 0, 0, 0.25))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px", // Add gap between icons
          }}
        >
          {FACILITY_LIST.map((facility) => {
            const isSelected = selectedFacility === facility.id;
            
            return (
              <div 
                key={facility.id}
                onClick={() => {
                  // ピクト選択時にショップ選択（フォーカス）を解除
                  if (selectedShopDetail) {
                    setSelectedShopDetail(null);
                    if (transformComponentRef.current) {
                      transformComponentRef.current.setTransform(0, 0, 1, 1000, "easeOut");
                    }
                  }
                  setSelectedFacility(prev => prev === facility.id ? null : facility.id)
                }}
                style={{ 
                  position: "relative", 
                  height: "80px", // Fit within 100px container
                  width: "80px", // Assume square icons
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Normal Icon */}
                <img 
                  src={facility.icon} 
                  alt={facility.name} 
                  style={{ 
                    height: "100%", 
                    width: "100%",
                    objectFit: "contain",
                    opacity: isSelected ? 0 : 1,
                    transition: "opacity 0.3s ease-in-out",
                    display: "block",
                  }} 
                />
                
                {/* Highlight Icon (Overlay) */}
                <img 
                  src={facility.highlightIcon} 
                  alt={`${facility.name} Highlight`} 
                  style={{ 
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%", 
                    width: "100%",
                    objectFit: "contain",
                    opacity: isSelected ? 1 : 0,
                    transition: "opacity 0.3s ease-in-out",
                    pointerEvents: "none",
                    display: "block",
                    filter: "drop-shadow(0px 0px 6px rgba(0, 0, 0, 0.25))",
                  }} 
                />
              </div>
            );
          })}
        </div>

        {/* Floor Buttons (1F to 4F) */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            right: "30px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column-reverse", // 1F at bottom, 4F at top
            gap: "20px", // Spacing between buttons
          }}
        >
          {/* 1F Button */}
          <div 
            style={{ position: "relative", filter: "drop-shadow(0px 0px 6px rgba(0, 0, 0, 0.25))" }}
          >
            <FloorSelectButton
              floor="1F"
              isSelected={selectedFloor === "1F"}
              onClick={() => setSelectedFloor("1F")}
            />
            <div
              style={{
                position: "absolute",
                top: "-15px",
                left: "50%",
                transform: "translateX(-50%)",
                opacity: normalizeFloor(currentFloor) === "1F" ? 1 : 0,
                transition: "opacity 0.3s ease-in-out",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <CurrentFloorIcon />
            </div>
          </div>

          {/* 2F Button */}
          <div 
            style={{ position: "relative", filter: "drop-shadow(0px 0px 6px rgba(0, 0, 0, 0.25))" }}
          >
            <FloorSelectButton
              floor="2F"
              isSelected={selectedFloor === "2F"}
              onClick={() => setSelectedFloor("2F")}
            />
            <div
              style={{
                position: "absolute",
                top: "-15px",
                left: "50%",
                transform: "translateX(-50%)",
                opacity: normalizeFloor(currentFloor) === "2F" ? 1 : 0,
                transition: "opacity 0.3s ease-in-out",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <CurrentFloorIcon />
            </div>
          </div>

          {/* 3F Button */}
          <div 
            style={{ position: "relative", filter: "drop-shadow(0px 0px 6px rgba(0, 0, 0, 0.25))" }}
          >
            <FloorSelectButton
              floor="3F"
              isSelected={selectedFloor === "3F"}
              onClick={() => setSelectedFloor("3F")}
            />
            <div
              style={{
                position: "absolute",
                top: "-15px",
                left: "50%",
                transform: "translateX(-50%)",
                opacity: normalizeFloor(currentFloor) === "3F" ? 1 : 0,
                transition: "opacity 0.3s ease-in-out",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <CurrentFloorIcon />
            </div>
          </div>

          {/* 4F Button */}
          <div 
            style={{ position: "relative", filter: "drop-shadow(0px 0px 6px rgba(0, 0, 0, 0.25))" }}
          >
            <FloorSelectButton
              floor="4F"
              isSelected={selectedFloor === "4F"}
              onClick={() => setSelectedFloor("4F")}
            />
            <div
              style={{
                position: "absolute",
                top: "-15px",
                left: "50%",
                transform: "translateX(-50%)",
                opacity: normalizeFloor(currentFloor) === "4F" ? 1 : 0,
                transition: "opacity 0.3s ease-in-out",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <CurrentFloorIcon />
            </div>
          </div>
        </div>

        {/* Zoom Buttons Container */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "30px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "0px",
            filter: "drop-shadow(0px 0px 6px rgba(0, 0, 0, 0.25))",
          }}
        >
          {/* Zoom In Button */}
          <div
            style={{
              position: "relative",
              cursor: "pointer",
            }}
            onClick={() => {
              if (transformComponentRef.current) {
                transformComponentRef.current.zoomIn();
              }
            }}
            onMouseDown={() => setPressedZoomButton("in")}
            onMouseUp={() => setPressedZoomButton(null)}
            onMouseLeave={() => setPressedZoomButton(null)}
            onTouchStart={() => setPressedZoomButton("in")}
            onTouchEnd={() => setPressedZoomButton(null)}
          >
            <img
              src={selectedLanguage === "en" ? zoomInEn : zoomInJa}
              alt="Zoom In"
              style={{
                display: "block",
                opacity: pressedZoomButton === "in" ? 0 : 1,
                transition: "opacity 0.1s ease-in-out",
              }}
            />
            <img
              src={selectedLanguage === "en" ? zoomInEnHighlight : zoomInJaHighlight}
              alt="Zoom In Highlight"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                display: "block",
                opacity: pressedZoomButton === "in" ? 1 : 0,
                transition: "opacity 0.1s ease-in-out",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Zoom Out Button */}
          <div
            style={{
              position: "relative",
              cursor: "pointer",
            }}
            onClick={() => {
              if (transformComponentRef.current) {
                transformComponentRef.current.zoomOut();
              }
            }}
            onMouseDown={() => setPressedZoomButton("out")}
            onMouseUp={() => setPressedZoomButton(null)}
            onMouseLeave={() => setPressedZoomButton(null)}
            onTouchStart={() => setPressedZoomButton("out")}
            onTouchEnd={() => setPressedZoomButton(null)}
          >
            <img
              src={selectedLanguage === "en" ? zoomOutEn : zoomOutJa}
              alt="Zoom Out"
              style={{
                display: "block",
                opacity: pressedZoomButton === "out" ? 0 : 1,
                transition: "opacity 0.1s ease-in-out",
              }}
            />
            <img
              src={selectedLanguage === "en" ? zoomOutEnHighlight : zoomOutJaHighlight}
              alt="Zoom Out Highlight"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                display: "block",
                opacity: pressedZoomButton === "out" ? 1 : 0,
                transition: "opacity 0.1s ease-in-out",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
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
              value=""
              readOnly
              onClick={() => setIsKeyboardOpen(true)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "16px",
                color: "#333",
                background: "transparent",
                padding: 0,
                margin: 0,
                cursor: "pointer",
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
            padding: "0",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            position: "relative", // Needed for absolute positioning of buttons
          }}
        >
          {/* Prev Button (Absolute Overlay) */}
          <AnimatePresence>
            {canScrollGenreLeft && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "22px",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                  backgroundColor: "rgba(255, 255, 255, 0.0)", // Transparent background
                }}
                onClick={() => {
                  if (genreScrollContainerRef.current) {
                    genreScrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
                  }
                }}
                onMouseDown={() => setPressedGenreNavButton("prev")}
                onMouseUp={() => setPressedGenreNavButton(null)}
                onMouseLeave={() => setPressedGenreNavButton(null)}
                onTouchStart={() => setPressedGenreNavButton("prev")}
                onTouchEnd={() => setPressedGenreNavButton(null)}
              >
                <NavButton
                  direction="prev"
                  isPressed={pressedGenreNavButton === "prev"}
                  style={{
                    width: "22px",
                    height: "49px",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

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
              width: "100%",
              overflowX: "auto", 
              alignItems: "center",
              cursor: "grab",
              userSelect: "none",
              paddingTop: "10px",
              paddingBottom: "10px",
              paddingLeft: "10px", 
              paddingRight: "10px",
            }}
          >

            {GENRE_LIST.map((genre) => {
              const isSelected = selectedGenre === genre.id;
              
              return (
                <div 
                  key={genre.id}
                  onClick={() => handleSetSelectedGenre(genre.id)}
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

          {/* Next Button (Absolute Overlay) */}
          <AnimatePresence>
            {canScrollGenreRight && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  width: "22px",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                  backgroundColor: "rgba(255, 255, 255, 0.0)", // Transparent background
                }}
                onClick={() => {
                  if (genreScrollContainerRef.current) {
                    const { scrollWidth, clientWidth } = genreScrollContainerRef.current;
                    genreScrollContainerRef.current.scrollTo({ left: scrollWidth - clientWidth, behavior: "smooth" });
                  }
                }}
                onMouseDown={() => setPressedGenreNavButton("next")}
                onMouseUp={() => setPressedGenreNavButton(null)}
                onMouseLeave={() => setPressedGenreNavButton(null)}
                onTouchStart={() => setPressedGenreNavButton("next")}
                onTouchEnd={() => setPressedGenreNavButton(null)}
              >
                <NavButton
                  direction="next"
                  isPressed={pressedGenreNavButton === "next"}
                  style={{
                    width: "22px",
                    height: "49px",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Shop List Container (W100% H743px) */}
        <div
          ref={shopListScrollContainerRef}
          style={{
            width: "100%",
            height: "743px",
            flexShrink: 0,
            overflowY: "hidden",
            overflowX: "hidden", // Prevent horizontal overflow during transition
            position: "relative",
            display: "grid",
            gridTemplateColumns: "100%",
            gridTemplateRows: "100%",
            gridTemplateAreas: "'content'",
            alignItems: "start",
            justifyItems: "center",
          }}
        >
          {/* Shop List Items */}
          <AnimatePresence initial={false} custom={genreDirection}>
            <motion.div
              key={`${selectedGenre}-${selectedFloor || 'none'}-${searchQuery}`} // Added searchQuery to key to re-render on search change
              custom={genreDirection}
              variants={listVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="shop-list-scroll-container"
              transition={{
                x: { type: "tween", duration: 0.5, ease: "easeInOut" },
                opacity: { duration: 0.5 }
              }}
              style={{
                width: "100%",
                height: "100%",
                overflowY: "auto",
                paddingTop: "15px",
                paddingBottom: "15px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "15px",
                gridArea: "content",
              }}
            >
              {/* Search Header */}
            {searchQuery && (
              <div
                style={{
                  width: "440px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 10px",
                  boxSizing: "border-box",
                  backgroundColor: "#F5F5F5",
                  borderRadius: "10px",
                  marginBottom: "0px",
                  border: "1px solid #D9D9D9",
                  boxShadow: "2px 2px 4px 1px rgba(0, 0, 0, 0.2)",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#333",
                    fontFamily: "'Rounded Mplus 1c', sans-serif",
                  }}
                >
                  頭文字：{KANA_MAP[searchQuery] ? `${searchQuery}行` : searchQuery}
                </span>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                  }}
                  style={{
                    cursor: "pointer",
                    padding: "5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#666",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </span>
                </div>
              </div>
            )}

              {filteredShops.map((shop, index) => (
                <div
                  key={shop.shopId || `${shop.name}-${index}`}
                  onClick={() => {
                    setSelectedShopDetail(shop);
                    // Switch to the shop's floor if different
                    if (shop.floors && shop.floors.length > 0) {
                      const shopFloor = normalizeFloor(String(shop.floors[0]));
                      const current = normalizeFloor(selectedFloor || "");
                      
                      if (shopFloor !== current) {
                        ignoreFloorChangeRef.current = true;
                        setPinDelay(0.6); // Wait for map transition (approx 0.5-0.6s)
                        setSelectedFloor(shopFloor);
                      } else {
                        setPinDelay(0);
                      }
                    } else {
                      setPinDelay(0);
                    }
                  }}
                  style={{
                    width: "440px",
                    height: "80px",
                    borderRadius: "10px",
                    backgroundColor: "#FFFFFF",
                    boxShadow: "2px 2px 4px 1px rgba(0, 0, 0, 0.4)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    padding: "0", // Removed padding to allow logo to touch edge
                    boxSizing: "border-box",
                    overflow: "hidden", // Ensure content stays within rounded corners
                  }}
                >
                  {/* Logo Container */}
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#FFFFFF", // Or transparent if preferred
                      // Border radius handled by parent overflow: hidden
                      padding: "5px",
                      boxSizing: "border-box",
                    }}
                  >
                    <ShopLogoImage photo={shop.shopLogo || (shop.shopId ? `files/shop/${shop.shopId}/shop_logo.png` : undefined)} shopId={shop.shopId} />
                  </div>

                  {/* Name and Floor Container */}
                  <div style={{ display: "flex", flexDirection: "column", marginLeft: "20px", justifyContent: "flex-start", height: "100%" }}>
                    <div style={{ display: "flex", flexDirection: "row", gap: "0px", marginBottom: "10px", marginTop: "0px" }}>
                      {/* Floor Badge */}
                      <div style={{
                        fontSize: "14px",
                        color: "#FFFFFF",
                        width: "37px",
                        height: "21px",
                        background: "#000000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                         {shop.floors && shop.floors.length > 0 ? normalizeFloor(String(shop.floors[0])) : ""}
                      </div>
                      {/* Number Badge */}
                      <div style={{
                        fontSize: "14px",
                        color: "#FFFFFF",
                        width: "60px",
                        height: "21px",
                        background: getGenreBadgeColor(shop.genre),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                         {shop.number}
                      </div>
                    </div>
                    {/* Shop Name */}
                    <span style={{ fontSize: "16px", fontWeight: "bold", fontFamily: "'Rounded Mplus 1c', sans-serif", color: "#333" }}>
                      {selectedLanguage === "en" && shop.nameEn ? shop.nameEn : shop.name}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Shop Detail Modal (Slide-in) */}
        <AnimatePresence>
          {selectedShopDetail && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              style={{
                position: "absolute",
                top: "0", 
                left: 0,
                width: "100%",
                height: "calc(100% - 167px)", 
                backgroundColor: "#FFFFFF",
                zIndex: 20,
                boxShadow: "-4px 0 10px rgba(0, 0, 0, 0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start", // Top align
                paddingTop: "0px", // Remove padding to move content up
                boxSizing: "border-box",
              }}
            >
              {/* Close Button */}
              <div
                style={{
                  position: "absolute",
                  top: "0", // Align to top
                  right: "0",
                  margin: "10px",
                  zIndex: 30, // Topmost
                }}
              >
                <CloseButton
                  onClick={() => {
                    setSelectedShopDetail(null);
                    setPressedCloseButton(false);
                    
                    // ショップへのフォーカス（ズーム）を解除
                    if (transformComponentRef.current) {
                      transformComponentRef.current.setTransform(0, 0, 1, 1000, "easeOut");
                    }
                  }}
                  onMouseDown={() => setPressedCloseButton(true)}
                  onMouseUp={() => setPressedCloseButton(false)}
                  onMouseLeave={() => setPressedCloseButton(false)}
                  onTouchStart={() => setPressedCloseButton(true)}
                  onTouchEnd={() => setPressedCloseButton(false)}
                  isPressed={pressedCloseButton}
                  style={{ width: "70px", height: "70px" }}
                />
              </div>

              {/* Image Container (W: 460px, H: 307px) */}
              <div
                style={{
                  width: "460px",
                  height: "307px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: "0px", // No margin bottom specified, but next element has top margin
                  flexShrink: 0,
                }}
              >
                 <ShopImage 
                   photo={selectedShopDetail.photo2 || selectedShopDetail.photo1 || selectedShopDetail.shopLogo} 
                   shopId={selectedShopDetail.shopId} 
                 />
              </div>

              {/* Logo and Name Container */}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  paddingLeft: "20px", // Align with logo margin
                  boxSizing: "border-box",
                  marginTop: "20px", // Logo container top margin effectively
                  flexShrink: 0, // Don't shrink
                }}
              >
                {/* Logo Container (W: 100px, H: 100px, round: 10px, border: 2px, borderColor: #D9D9D9) */}
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "10px",
                    border: "1px solid #D9D9D9",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                    marginRight: "20px", // Space between logo and name
                    padding: "5px", // Added padding
                  }}
                >
                  {selectedShopDetail.shopLogo ? (
                    <ShopLogoImage photo={selectedShopDetail.shopLogo} shopId={selectedShopDetail.shopId} />
                  ) : (
                    <img 
                      src={commingSoon} 
                      alt="Coming Soon" 
                      style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                    />
                  )}
                </div>

                {/* Shop Name (W: 300px fixed) */}
                <div
                  style={{
                    width: "300px",
                    height: "24px", // Fixed height for text
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                   <ShopNameDisplay name={
                     selectedLanguage === "en" && selectedShopDetail.nameEn 
                       ? selectedShopDetail.nameEn 
                       : selectedShopDetail.name
                   } />
                </div>
              </div>

              {/* Flex Container for Description and Info (Takes remaining height) */}
              <div
                style={{
                  flex: 1, // Take remaining height of the modal
                  minHeight: 0, // Allow shrinking below content size
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start", // Stack from top
                }}
              >
                {/* Description Container (Shrinkable & Scrollable) - Only render if description exists */}
                {selectedShopDetail.description && (
                  <div
                    style={{
                      width: "100%",
                      // flex: "0 1 auto" allows shrinking but uses content height as basis. 
                      // However, to make scrolling work correctly in nested flex, sometimes we need minHeight: 0.
                      flex: "0 1 auto", 
                      padding: "0 20px", // Padding moved to outer container
                      marginTop: "20px",
                      marginBottom: "0px",
                      boxSizing: "border-box",
                      minHeight: "0", 
                      display: "flex", // Ensure child fills height
                      flexDirection: "column",
                      overflow: "hidden", // Hide overflow on wrapper, let inner div scroll
                    }}
                  >
                  <style>
                    {`
                      .shop-detail-description::-webkit-scrollbar {
                        width: 8px;
                      }
                      .shop-detail-description::-webkit-scrollbar-track {
                        background: #f1f1f1;
                        border-radius: 4px;
                      }
                      .shop-detail-description::-webkit-scrollbar-thumb {
                        background: #c1c1c1;
                        border-radius: 4px;
                      }
                      .shop-detail-description::-webkit-scrollbar-thumb:hover {
                        background: #a8a8a8;
                      }
                      /* Disable link styles in description */
                      .shop-detail-description a,
                      .shop-detail-description u,
                      .shop-detail-description span {
                        text-decoration: none !important;
                        color: inherit !important;
                        pointer-events: none !important;
                        border-bottom: none !important;
                      }
                      .shop-detail-description * {
                        text-decoration: none !important;
                      }
                    `}
                  </style>
                  {/* Container for scroll bar style application */}
                  <div
                    className="shop-detail-description"
                    style={{
                      width: "100%",
                      height: "100%",
                      overflowY: "auto",
                      // Apply padding here to content
                      paddingRight: "5px", // Slight padding for scrollbar space if needed
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontFamily: "'Rounded Mplus 1c', sans-serif",
                        fontWeight: 400,
                        color: "#000000",
                        lineHeight: "1.6",
                        wordWrap: "break-word",
                        pointerEvents: "auto",
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedShopDetail.description }}
                    />
                  </div>
                  </div>
                )}

                {/* Border Line above Category Area */}
                {selectedShopDetail.genreMemo && selectedShopDetail.genreMemo.includes("WAONPOINT加盟店") && (
                  <div
                    style={{
                      width: "calc(100% - 40px)",
                      height: "1px",
                      backgroundColor: "#D9D9D9",
                      marginLeft: "20px",
                      marginRight: "20px",
                      marginTop: "20px",
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Category Area */}
                {selectedShopDetail.genreMemo && selectedShopDetail.genreMemo.includes("WAONPOINT加盟店") && (
                  <div
                    style={{
                      width: "100%",
                      padding: "0 20px",
                      marginTop: "20px",
                      marginBottom: "0px",
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      flexShrink: 0,
                    }}
                  >
                    <img src={waonPointIcon} alt="WAON POINT" style={{ width: "50px", height: "50px" }} />
                  </div>
                )}

                {/* Border Line (Non-shrinkable) */}
                <div
                  style={{
                    width: "calc(100% - 40px)", // Full width minus margins (20px * 2)
                    height: "1px",
                    backgroundColor: "#D9D9D9",
                    marginLeft: "20px",
                    marginRight: "20px",
                    marginBottom: "20px",
                    marginTop: "20px", 
                    flexShrink: 0,
                  }}
                />

                {/* Information Container (Non-shrinkable) */}
                <div
                  style={{
                    width: "calc(100% - 40px)", // Full width minus margins (20px * 2)
                    margin: "0 20px 20px 20px",
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                    paddingBottom: "0px", 
                  }}
                >
                  {/* Floor Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", fontFamily: "'Rounded Mplus 1c', sans-serif", fontWeight: 400, color: "#000000" }}>
                    <img src={iconLocation} alt="" draggable={false} onDragStart={(e) => e.preventDefault()} style={{ width: "12px", height: "12px", flexShrink: 0 }} />
                    {selectedShopDetail.floors && selectedShopDetail.floors.length > 0 && <span>{normalizeFloor(selectedShopDetail.floors[0])}</span>}
                    {selectedShopDetail.number && <span>[{selectedShopDetail.number}]</span>}
                    {selectedShopDetail.genre && (
                      <>
                        <span>/</span>
                        <span>{selectedShopDetail.genre}</span>
                      </>
                    )}
                    {/* Genre Memo (switches to English if available) */}
                    {(selectedLanguage === "en" && selectedShopDetail.genreMemoEn) || selectedShopDetail.genreMemo ? (
                      <>
                        <span>/</span>
                        <span>
                          {selectedLanguage === "en" && selectedShopDetail.genreMemoEn
                            ? selectedShopDetail.genreMemoEn.split(/[|]+/).map(s => s.trim()).filter(s => s.length > 0)[0]
                            : selectedShopDetail.genreMemo.split(/[|]+/).map(s => s.trim()).filter(s => s.length > 0)[0]
                          }
                        </span>
                      </>
                    ) : null}
                  </div>
                  
                  {/* Open Time */}
                  {selectedShopDetail.openTime && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", fontFamily: "'Rounded Mplus 1c', sans-serif", fontWeight: 400, color: "#000000" }}>
                        <img src={iconTime} alt="" draggable={false} onDragStart={(e) => e.preventDefault()} style={{ width: "12px", height: "12px", flexShrink: 0 }} />
                        <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.4" }} dangerouslySetInnerHTML={{ __html: selectedShopDetail.openTime }} />
                    </div>
                  )}
                  
                  {/* Tel */}
                  {selectedShopDetail.tel && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", fontFamily: "'Rounded Mplus 1c', sans-serif", fontWeight: 400, color: "#000000" }}>
                      <img src={iconTel} alt="" draggable={false} onDragStart={(e) => e.preventDefault()} style={{ width: "12px", height: "12px", flexShrink: 0 }} />
                      <span>{selectedShopDetail.tel}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            <EventNewsButton
              onClick={() => setIsEventNewsModalOpen(true)}
              isPressed={pressedNewsButton === "event"}
              onMouseDown={() => setPressedNewsButton("event")}
              onMouseUp={() => setPressedNewsButton(null)}
              onMouseLeave={() => setPressedNewsButton(null)}
              onTouchStart={() => setPressedNewsButton("event")}
              onTouchEnd={() => setPressedNewsButton(null)}
            />

            {/* Shop News Button */}
            <ShopNewsButton
              onClick={() => setIsShopNewsModalOpen(true)}
              isPressed={pressedNewsButton === "shop"}
              onMouseDown={() => setPressedNewsButton("shop")}
              onMouseUp={() => setPressedNewsButton(null)}
              onMouseLeave={() => setPressedNewsButton(null)}
              onTouchStart={() => setPressedNewsButton("shop")}
              onTouchEnd={() => setPressedNewsButton(null)}
            />

          {/* Open Time Button */}
          <OpenTimeButton
            onClick={() => {
              // Toggle: If currently open, close and unpress. If closed, open and press.
              if (showOpenTime) {
                setShowOpenTime(false);
                setPressedNewsButton(null); // Return to normal state
              } else {
                setShowOpenTime(true);
                setPressedNewsButton("openTime"); // Keep highlighted while modal is open
              }
            }}
            isPressed={pressedNewsButton === "openTime"}
          />
          </div>

          {/* Bottom Row: Language Selector */}
          <div ref={languageButtonRef}>
            <LanguageSelectButton
              language={selectedLanguage}
              onClick={() => setIsLanguageModalOpen((prev) => !prev)}
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

      {/* Keyboard Modal */}
      <KeyboardModal
        isOpen={isKeyboardOpen}
        onClose={() => setIsKeyboardOpen(false)}
        onChange={handleSetSearchQuery}
      />

      {/* Event News Modal */}
      <EventNewsModal
        isOpen={isEventNewsModalOpen}
        onClose={() => setIsEventNewsModalOpen(false)}
        news={eventNews}
      />

      {/* Shop Event Modal */}
      <ShopNewsModal
        isOpen={isShopNewsModalOpen}
        onClose={() => setIsShopNewsModalOpen(false)}
        shops={shops}
        news={shopNews}
        language={selectedLanguage}
      />

      {/* White Fade Overlay for Refresh */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#ffffff",
          opacity: isRefreshing ? 1 : 0,
          pointerEvents: isRefreshing ? "auto" : "none",
          transition: "opacity 0.5s ease-in-out",
          zIndex: 9999, // Highest z-index to cover everything
        }}
      />
    </div>
  );
};

export default ShopListScreen;
