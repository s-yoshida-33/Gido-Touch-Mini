import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import buttonClose from "../assets/button-close.svg";
import buttonCloseHighlight from "../assets/button-close-highlight.svg";
import iconDate from "../assets/icon_date.svg";
import iconTime from "../assets/icon-time.svg";
import iconLocation from "../assets/icon-location.svg";
import { fetchShopNewsListFromBridge } from "../api/bridgeClient"; // Remove if unused
import type { ShopNews } from "../types/shopNews";
import { logError } from "../logs/logging";
import type { Shop } from "../types/shop";
import { ShopLogoImage } from "./ShopLogoImage";

interface ShopEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  shops?: Shop[];
  news: ShopNews[];
}

export const ShopEventModal: React.FC<ShopEventModalProps> = ({
  isOpen,
  onClose,
  shops = [],
  news,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [selectedNews, setSelectedNews] = useState<ShopNews | null>(null);

  // Sort news when props change
  const sortedNews = React.useMemo(() => {
    return [...news].sort((a, b) => {
      const getTime = (item: ShopNews) => {
        // Use startDate first for "Newest" sort, fallback to endDate, then createdAt
        const dStr = item.startDate || item.endDate || item.createdAt;
        if (!dStr) return 0; // No date treats as old
        const t = new Date(dStr).getTime();
        return isNaN(t) ? 0 : t;
      };

      const tA = getTime(a);
      const tB = getTime(b);

      // Descending order (Newest first)
      return tB - tA;
    });
  }, [news]);

  useEffect(() => {
    if (isOpen) {
        if (sortedNews.length > 0) {
          setSelectedNews(sortedNews[0]);
        } else {
          setSelectedNews(null);
        }
    }
  }, [isOpen, sortedNews]);


  // Helper to format date string to YYYY/MM/DD(Weekday)
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Invalid date, return original

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];

    return `${year}/${month}/${day}(${weekday})`;
  };

  // Helper to find shop by ID
  const getShopInfo = (shopId: string) => {
    if (!shopId || !shops) return null;
    return shops.find(s => s.shopId === shopId || s.number === shopId);
  };

  const selectedShop = selectedNews ? getShopInfo(selectedNews.shopId) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(5px)",
            }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "relative",
              width: "1710px",
              height: "880px",
              zIndex: 1001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Content Wrapper (Rounded & Overflow Hidden) */}
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "30px",
                backgroundColor: "#fff",
                display: "flex",
                overflow: "hidden",
                boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.2)",
              }}
            >
              {/* Left Side */}
              <div
                style={{
                  width: "600px",
                  height: "880px",
                  padding: "20px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {/* Title */}
                <div
                  style={{
                    width: "560px",
                    height: "63px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "36px",
                    fontWeight: "bold",
                    color: "#ffffff",
                    fontFamily: "'Rounded Mplus 1c', sans-serif",
                    background: "linear-gradient(90deg, rgba(230, 59, 147, 0) 0%, #E63B93 40%, #E63B93 60%, rgba(230, 59, 147, 0) 100%)",
                    borderRadius: "4px",
                    marginBottom: "30px",
                    flexShrink: 0,
                  }}
                >
                  ショップニュース
                </div>

                {/* Shop News Content */}
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                      flex: 1,
                      minHeight: 0,
                    }}
                  >
                   {selectedNews ? (
                     <div style={{ fontFamily: "'Rounded Mplus 1c', sans-serif", width: "100%", paddingRight: "0px", display: "flex", flexDirection: "column", height: "100%" }}>
                        {/* News Title (Fixed) */}
                        <div style={{ 
                          fontSize: "24px", 
                          fontWeight: "bold", 
                          marginBottom: "20px",
                          color: "#333",
                          lineHeight: "1.4",
                          flexShrink: 0 
                        }}>
                          {selectedNews.title}
                        </div>

                        {/* Image and Info Section Container */}
                        <div style={{ 
                          display: "flex", 
                          flexDirection: "row", 
                          marginBottom: "20px", 
                          width: "100%",
                          flexShrink: 0 
                        }}>
                          {/* Image if available */}
                          {selectedNews.imageUrl && (
                            <div style={{ width: "200px", height: "200px", flexShrink: 0 }}>
                              <img 
                                src={selectedNews.imageUrl} 
                                alt={selectedNews.title} 
                                style={{ 
                                  width: "100%", 
                                  height: "100%", 
                                  borderRadius: "20px", 
                                  objectFit: "contain",
                                  border: "2px solid #D9D9D9",
                                  boxSizing: "border-box"
                                }} 
                              />
                            </div>
                          )}

                          {/* Info Section (Right of Image) */}
                          <div style={{ 
                            flex: 1, 
                            paddingLeft: selectedNews.imageUrl ? "20px" : "0px", 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "15px" 
                          }}>
                            {/* Logo and Shop Info Row */}
                            {selectedShop && (
                              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "15px" }}>
                                {/* Logo */}
                                <div style={{ 
                                  width: "60px", 
                                  height: "60px", 
                                  borderRadius: "10px", 
                                  border: "1px solid #D9D9D9",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "2px"
                                }}>
                                  <ShopLogoImage photo={selectedShop.shopLogo} shopId={selectedShop.shopId} />
                                </div>

                                {/* Shop Info */}
                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                  <div style={{ fontSize: "12px", color: "#333", marginBottom: "4px" }}>
                                    {selectedShop.floors && selectedShop.floors.length > 0 && selectedShop.floors[0]}
                                    {selectedShop.number && ` [${selectedShop.number}]`}
                                    {selectedShop.genre && ` ／ ${selectedShop.genre}`}
                                  </div>
                                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>
                                    {selectedShop.name}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Date */}
                            {(selectedNews.startDate || selectedNews.endDate) && (
                              <div style={{ display: "flex", alignItems: "flex-start", fontSize: "14px", color: "#333" }}>
                                <img src={iconDate} alt="Date" style={{ width: "16px", height: "16px", marginRight: "8px", marginTop: "3px" }} />
                                <span>
                                  {formatDate(selectedNews.startDate)} 
                                  {selectedNews.endDate ? ` 〜 ${formatDate(selectedNews.endDate)}` : ""}
                                </span>
                              </div>
                            )}
                            {/* Time */}
                            {selectedNews.time && (
                              <div style={{ display: "flex", alignItems: "flex-start", fontSize: "14px", color: "#333" }}>
                                <img src={iconTime} alt="Time" style={{ width: "16px", height: "16px", marginRight: "8px", marginTop: "3px" }} />
                                <span style={{ whiteSpace: "pre-wrap" }}>{selectedNews.time}</span>
                              </div>
                            )}
                            {/* Place */}
                            {selectedNews.place && (
                              <div style={{ display: "flex", alignItems: "flex-start", fontSize: "14px", color: "#333" }}>
                                <img src={iconLocation} alt="Location" style={{ width: "16px", height: "16px", marginRight: "8px", marginTop: "3px" }} />
                                <span>{selectedNews.place}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* HTML Body (Scrollable) */}
                        <div 
                          className="shop-news-body"
                          style={{
                            flex: 1, 
                            overflowY: "auto", 
                            paddingRight: "0px"
                          }}
                        >
                          <style>
                            {`
                              .shop-news-body::-webkit-scrollbar {
                                width: 8px;
                              }
                              .shop-news-body::-webkit-scrollbar-track {
                                background: #f1f1f1;
                                border-radius: 4px;
                              }
                              .shop-news-body::-webkit-scrollbar-thumb {
                                background: #c1c1c1;
                                border-radius: 4px;
                              }
                              .shop-news-body::-webkit-scrollbar-thumb:hover {
                                background: #a8a8a8;
                              }
                              /* Hide scrollbar buttons (arrows) */
                              .shop-news-body::-webkit-scrollbar-button {
                                display: none;
                              }
                              /* Disable link styles in description */
                              .shop-news-body a,
                              .shop-news-body u,
                              .shop-news-body span {
                                text-decoration: none !important;
                                color: inherit !important;
                                pointer-events: none !important;
                                border-bottom: none !important;
                              }
                              .shop-news-body * {
                                text-decoration: none !important;
                              }
                            `}
                          </style>
                          <div 
                            style={{ 
                              fontSize: "14px", 
                              lineHeight: "1.6", 
                              color: "#333",
                              wordWrap: "break-word"
                            }}
                            dangerouslySetInnerHTML={{ __html: selectedNews.body }}
                          />
                        </div>
                     </div>
                   ) : (
                     <div style={{ textAlign: "center", marginTop: "20px", fontFamily: "'Rounded Mplus 1c', sans-serif" }}>現在、新しいニュースはありません。</div>
                   )}
                </div>
              </div>

              {/* Right Side - News List */}
              <div
                className="event-news-list"
                style={{
                  width: "1110px",
                  height: "880px",
                  backgroundColor: "#EDEDED",
                  padding: "20px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexWrap: "wrap",
                  alignContent: "flex-start",
                  gap: "10px",
                  overflowY: "auto",
                }}
              >
                {/* Scrollbar Style for Right Side */}
                <style>
                  {`
                    .event-news-list::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>
                
                {sortedNews.map((news) => {
                  const isSelected = selectedNews?.id === news.id;
                  
                  return (
                    <motion.div
                      key={news.id}
                      onClick={() => setSelectedNews(news)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      animate={{ 
                        boxShadow: isSelected 
                          ? "0px 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 3px #E63B93" 
                          : "0px 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 0px transparent",
                      }}
                      transition={{ duration: 0.2 }}
                      style={{
                        width: "260px",
                        height: "374px", // 260px (Image) + 114px (Text)
                        borderRadius: "20px",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden", // Clip content to border radius
                        flexShrink: 0,
                        position: "relative",
                      }}
                    >
                      {/* Image Area */}
                      <div
                        style={{
                          width: "100%", // 260px
                          height: "260px", // Full height
                          backgroundColor: "#F8F8F8",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                         {news.imageUrl ? (
                           <img 
                             src={news.imageUrl} 
                             alt={news.title}
                             style={{
                               width: "100%",
                               height: "100%",
                               objectFit: "contain", // Changed to contain to show full image
                             }}
                           />
                         ) : (
                           // Placeholder or empty
                           <span style={{ color: "#ccc", fontSize: "12px" }}>No Image</span>
                         )}
                      </div>

                      {/* Text Area */}
                      <div
                        style={{
                          width: "100%",
                          height: "114px",
                          padding: "10px",
                          boxSizing: "border-box",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-start",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        {/* Shop Name with Floor/Number */}
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "bold",
                            color: "#333",
                            fontFamily: "'Rounded Mplus 1c', sans-serif",
                            lineHeight: "1.4",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginBottom: "4px",
                          }}
                        >
                          {(() => {
                            const shop = getShopInfo(news.shopId);
                            if (shop) {
                              const floor = shop.floors && shop.floors.length > 0 ? shop.floors[0] : "";
                              const number = shop.number ? `[${shop.number}]` : "";
                              return `${floor}  ${number} ${shop.name}`;
                            }
                            return news.title; // Fallback to title if shop not found (though title is news title)
                          })()}
                        </div>
                        
                        {/* Date */}
                        <div style={{ fontSize: "12px", color: "#333", marginBottom: "4px" }}>
                           {formatDate(news.startDate)}
                           {news.endDate ? ` 〜 ${formatDate(news.endDate)}` : ""}
                        </div>

                        {/* Body (truncated) - Using news title as "body" summary or actual body? Request says "Main text (omitted)" but in card typically it's title or body snippet. 
                           The user request says "Store Name", "Period", "Body (omitted)". 
                           Usually the card shows the News Title as the main bold text.
                           But the request says "Store Name: 2F [217] Muji".
                           Wait, usually News Title is different from Shop Name.
                           If the user wants Shop Name INSTEAD of News Title in the first line?
                           "Store Name: 2F [217] Muji"
                           "Period: ..."
                           "Body (omitted)" -> implies the 3rd line is the body/content.
                           
                           Let's look at current implementation:
                           Line 1: News Title (bold)
                           Line 2: Date
                           Line 3: Body snippet
                           
                           User request:
                           Line 1: Shop Name (with floor/number)
                           Line 2: Date
                           Line 3: Body snippet (or News Title?)
                           
                           "本文（省略）" usually means the description text.
                           However, what about the News Title? "Winter Sale" etc.
                           If we replace News Title with Shop Name, we lose the News Title in the card.
                           Maybe the "Body" part should be the News Title + Body? or just Body?
                           
                           Let's assume:
                           1. Shop Name Line (New)
                           2. Date Line
                           3. Body/Content Line (truncated) - effectively replacing the News Title slot with Shop Name?
                           
                           Actually, standard practice for "Shop News" lists often highlights the SHOP.
                           But the event itself has a title.
                           
                           Let's strictly follow:
                           ・店舗名：2F [217] 無印良品
                           ・期間：...
                           ・本文（省略）
                           
                           So Line 1 is Shop Info.
                           Line 2 is Date.
                           Line 3 is Body.
                           
                           What happens to News Title? It might be part of "Body" or ignored in card.
                           Let's use Body for the 3rd line as requested.
                        */}
                        <div
                          style={{
                            fontSize: "12px", 
                            color: "#666",
                            fontFamily: "'Rounded Mplus 1c', sans-serif",
                            lineHeight: "1.4",
                            height: "34px", // Fixed height for 2 lines? or 1 line?
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {/* Use Title + Body or just Body? Usually Title is important. 
                              If the user says "Body (omitted)", they might mean the description.
                              Let's show Title first then Body if space permits, or just Title?
                              Actually, usually "News Title" is the most important thing describing the event.
                              But the user explicitly asked for "Store Name" then "Period" then "Body".
                              I will output News Title followed by Body in the 3rd section to ensure context isn't lost, 
                              or just Body if they really mean "Body". 
                              Given "Shop News", the Title IS the headline.
                              I'll use the News Title as the "Body/Content" representation in the list if the top line is now Shop Name.
                          */}
                          <span style={{ fontWeight: "bold", color: "#333" }}>{news.title}</span>
                          <span style={{ marginLeft: "5px" }}>{news.body.replace(/<[^>]+>/g, '')}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Close Button (Outside Top-Right) */}
            <div
              style={{
                position: "absolute",
                top: "-85px",
                right: "0px",
                width: "70px",
                height: "70px",
                cursor: "pointer",
                zIndex: 1002,
              }}
              onClick={onClose}
              onMouseDown={() => setIsPressed(true)}
              onMouseUp={() => setIsPressed(false)}
              onMouseLeave={() => setIsPressed(false)}
              onTouchStart={() => setIsPressed(true)}
              onTouchEnd={() => setIsPressed(false)}
            >
              <img
                src={buttonClose}
                alt="Close"
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  opacity: isPressed ? 0 : 1,
                  transition: "opacity 0.1s ease-in-out",
                }}
              />
              <img
                src={buttonCloseHighlight}
                alt="Close Highlight"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  display: "block",
                  width: "100%",
                  height: "100%",
                  opacity: isPressed ? 1 : 0,
                  transition: "opacity 0.1s ease-in-out",
                  pointerEvents: "none",
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
