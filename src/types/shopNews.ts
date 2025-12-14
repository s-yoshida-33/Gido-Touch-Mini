export interface ShopNews {
  id: string;
  shopId: string;
  title: string;
  body: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface BridgeShopNews {
  shop_news_id: string;
  shop_id: string;
  title: string;
  body: string; // HTML content
  photo1_local_path: string;
  photo1_remote_url: string;
  start_date?: string; 
  end_date?: string;
  update_date: string;
}
