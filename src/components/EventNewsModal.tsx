import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import buttonClose from "../assets/button-close.svg";
import buttonCloseHighlight from "../assets/button-close-highlight.svg";
import { fetchShopNewsFromBridge } from "../api/bridgeClient";
import type { ShopNews } from "../types/shopNews";
import { logError } from "../logs/logging";

interface EventNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EventNewsModal: React.FC<EventNewsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [shopNews, setShopNews] = useState<ShopNews[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadNews = async () => {
        setLoading(true);
        try {
          const news = await fetchShopNewsFromBridge();
          // Sort by date descending (newest first)
          const sortedNews = news.sort((a, b) => 
            new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
          );
          setShopNews(sortedNews);
        } catch (error) {
          logError("EventNewsModal", "Failed to load shop news", { error });
          // Fallback or empty state
          setShopNews([]);
        } finally {
          setLoading(false);
        }
      };

      loadNews();
    }
  }, [isOpen]);

  // Get the latest news item
  const latestNews = shopNews.length > 0 ? shopNews[0] : null;

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
                  padding: "40px",
                  paddingLeft: "60px", // Original 40px + added 20px = 60px
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center", // Center content horizontally
                  // 左側の背景色は指定がないため白のまま
                }}
              >
                {/* Title */}
                <div
                  style={{
                    width: "560px", // Changed from 520px
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
                    marginBottom: "30px", // User requested margin-bottom: 30px
                    flexShrink: 0,
                  }}
                >
                  イベントニュース
                </div>

                {/* Shop News Content */}
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    // overflowY: "auto", // Remove scroll from here
                    flex: 1,
                    minHeight: 0, // Critical for flex column scrolling
                  }}
                >
                   {loading ? (
                    <div style={{ textAlign: "center", marginTop: "20px", fontFamily: "'Rounded Mplus 1c', sans-serif" }}>読み込み中...</div>
                   ) : latestNews ? (
                     <div style={{ fontFamily: "'Rounded Mplus 1c', sans-serif", width: "100%", paddingRight: "10px", display: "flex", flexDirection: "column", height: "100%" }}>
                        {/* News Title (Fixed) */}
                        <div style={{ 
                          fontSize: "24px", 
                          fontWeight: "bold", 
                          marginBottom: "10px",
                          color: "#333",
                          lineHeight: "1.4",
                          flexShrink: 0 // Don't shrink
                        }}>
                          {latestNews.title}
                        </div>
                        {/* Date (Fixed) */}
                        <div style={{ fontSize: "14px", color: "#666", marginBottom: "20px", flexShrink: 0 }}>
                          {latestNews.startDate && `${latestNews.startDate} ~`} {latestNews.endDate}
                        </div>

                        {/* Image if available (Fixed) */}
                        {latestNews.imageUrl && (
                          <div style={{ marginBottom: "20px", width: "100%", display: "flex", justifyContent: "flex-start", flexShrink: 0 }}>
                            <img 
                              src={latestNews.imageUrl} 
                              alt={latestNews.title} 
                              style={{ 
                                width: "200px", 
                                height: "200px", 
                                borderRadius: "20px", 
                                objectFit: "cover",
                                border: "2px solid #D9D9D9"
                              }} 
                            />
                          </div>
                        )}

                        {/* HTML Body (Scrollable) */}
                        <div 
                          className="shop-news-body"
                          style={{
                            flex: 1, // Fill remaining space
                            overflowY: "auto", // Scroll this area
                            paddingRight: "10px"
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
                              fontSize: "14px", // Changed from 16px
                              lineHeight: "1.6", 
                              color: "#333",
                              wordWrap: "break-word"
                            }}
                            dangerouslySetInnerHTML={{ __html: latestNews.body }}
                          />
                        </div>
                     </div>
                   ) : (
                     <div style={{ textAlign: "center", marginTop: "20px", fontFamily: "'Rounded Mplus 1c', sans-serif" }}>現在、新しいニュースはありません。</div>
                   )}
                </div>
              </div>

              {/* Right Side */}
              <div
                style={{
                  width: "1110px",
                  height: "880px",
                  backgroundColor: "#D9D9D9",
                }}
              >
                {/* Right Content Placeholder */}
              </div>
            </div>

            {/* Close Button (Outside Top-Right) */}
            <div
              style={{
                position: "absolute",
                top: "-85px", // モーダルの上外側
                right: "0px", // モーダルの右端揃え
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
