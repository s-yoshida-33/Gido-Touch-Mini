import type { ShopNews } from "../types/shopNews";
import { logInfo, logError, logDebug } from "../logs/logging";

const SHOP_NEWS_CACHE_KEY = "gido_shop_news_cache";
const EVENT_NEWS_CACHE_KEY = "gido_event_news_cache";

// --- Shop News Cache ---

export function saveShopNewsToCache(news: ShopNews[]) {
  try {
    const json = JSON.stringify(news);
    localStorage.setItem(SHOP_NEWS_CACHE_KEY, json);
    logDebug("repository", "Saved shop news to cache", { count: news.length });
  } catch (e) {
    logError("repository", "Failed to save shop news to cache", { error: e });
  }
}

export function loadShopNewsFromCache(): ShopNews[] | null {
  try {
    const json = localStorage.getItem(SHOP_NEWS_CACHE_KEY);
    if (!json) return null;
    const news = JSON.parse(json) as ShopNews[];
    logDebug("repository", "Loaded shop news from cache", { count: news.length });
    return news;
  } catch (e) {
    logError("repository", "Failed to load shop news from cache", { error: e });
    return null;
  }
}

// --- Event News Cache ---

export function saveEventNewsToCache(news: ShopNews[]) {
  try {
    const json = JSON.stringify(news);
    localStorage.setItem(EVENT_NEWS_CACHE_KEY, json);
    logDebug("repository", "Saved event news to cache", { count: news.length });
  } catch (e) {
    logError("repository", "Failed to save event news to cache", { error: e });
  }
}

export function loadEventNewsFromCache(): ShopNews[] | null {
  try {
    const json = localStorage.getItem(EVENT_NEWS_CACHE_KEY);
    if (!json) return null;
    const news = JSON.parse(json) as ShopNews[];
    logDebug("repository", "Loaded event news from cache", { count: news.length });
    return news;
  } catch (e) {
    logError("repository", "Failed to load event news from cache", { error: e });
    return null;
  }
}















