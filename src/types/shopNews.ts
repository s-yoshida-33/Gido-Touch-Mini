export interface ShopNews {
  id: string;
  shopId: string;
  title: string;
  body: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  time?: string;
  place?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface BridgeShopNews {
  shop_news_id?: string;
  event_id?: string; // Added for Event News API
  shop_id?: string; // Optional in event news
  title: string;
  body: string; // HTML content
  photo1_local_path?: string;
  photo1_remote_url?: string;
  start_date?: string; // Legacy/ShopNews
  date_start?: string; // EventNews API
  end_date?: string; // Legacy/ShopNews
  date_end?: string; // EventNews API
  time?: string; 
  place?: string;
  venues?: string; // Potential venue field based on null value in sample
  location?: string;
  update_date: string;
}
