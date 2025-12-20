import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import buttonClose from "../assets/button-close.svg";
import buttonCloseHighlight from "../assets/button-close-highlight.svg";
import iconDate from "../assets/icon_date.svg";
import iconTime from "../assets/icon-time.svg";
import iconLocation from "../assets/icon-location.svg";
import type { ShopNews } from "../types/shopNews";
interface EventNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  news: ShopNews[];
}

export const EventNewsModal: React.FC<EventNewsModalProps> = ({
  isOpen,
  onClose,
  news,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [selectedNews, setSelectedNews] = useState<ShopNews | null>(null);

  // Sort news when props change
  const sortedNews = React.useMemo(() => {
    return [...news].sort((a, b) => {
      // Helper to determine sort date (EndDate is priority, fallback to StartDate)
      // null means no date
      const getSortDate = (item: ShopNews) => {
        const dStr = item.endDate || item.startDate;
        if (!dStr) return null;
        const t = new Date(dStr).getTime();
        return isNaN(t) ? null : t;
      };

      const tA = getSortDate(a);
      const tB = getSortDate(b);

      // 1. If both have no date, keep original order (or sort by ID/Title if needed)
      if (tA === null && tB === null) return 0;
      // 2. If A has no date, put it last
      if (tA === null) return 1;
      // 3. If B has no date, put it last
      if (tB === null) return -1;

      // Both have dates
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const today = now.getTime();

      const isFutureA = tA >= today;
      const isFutureB = tB >= today;

      // 4. Future/Present (Priority) vs Past
      if (isFutureA && !isFutureB) return -1; // A is Future, B is Past -> A first
      if (!isFutureA && isFutureB) return 1;  // B is Future, A is Past -> B first

      if (isFutureA && isFutureB) {
        // Both Future/Present: Sort by date ASC (Ending soonest first)
        return tA - tB;
      } else {
        // Both Past: Sort by date DESC (Ended most recently first) - Optional preference
        return tB - tA;
      }
    });
  }, [news]);

  useEffect(() => {
    if (isOpen) {
        if (sortedNews.length > 0) {
           // If we have news, default to first one if none selected or just always reset?
           // Original logic reset on open.
           setSelectedNews(sortedNews[0]);
        } else {
           setSelectedNews(null);
        }
    }
  }, [isOpen, sortedNews]); // Also trigger when sortedNews updates while open


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
                  イベントニュース
                </div>

                {/* Info Section removed from here to move inside Shop News Content */}

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
                                  border: "1px solid #D9D9D9",
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
                            gap: "10px" 
                          }}>
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
                        {/* Title */}
                        <div
                          style={{
                            fontSize: "16px",
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
                          {news.title}
                        </div>
                        
                        {/* Date */}
                        <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>
                           {formatDate(news.startDate)}
                           {news.endDate ? ` 〜 ${formatDate(news.endDate)}` : ""}
                        </div>

                        {/* Body (truncated) */}
                        <div
                          style={{
                            fontSize: "16px", // Same as title
                            color: "#666",
                            fontFamily: "'Rounded Mplus 1c', sans-serif",
                            lineHeight: "1.4",
                            height: "44px", // Fixed height for 2 lines
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {/* Remove HTML tags */}
                          {news.body.replace(/<[^>]+>/g, '')}
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
