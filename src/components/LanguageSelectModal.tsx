// src/components/LanguageSelectModal.tsx
import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LanguageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLElement | null>;
  onLanguageChange?: (language: Language) => void;
}

type Language = "ja" | "en";

const LANGUAGE_STORAGE_KEY = "gido-selected-language";

// Get saved language or default to Japanese
const getSavedLanguage = (): Language => {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "en" || saved === "ja") {
      return saved;
    }
  }
  return "ja"; // Default to Japanese
};

// Save language preference
const saveLanguage = (language: Language) => {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
};

export const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
  isOpen,
  onClose,
  buttonRef,
  onLanguageChange,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => getSavedLanguage());
  const [hoveredLanguage, setHoveredLanguage] = useState<Language | null>(null);
  const [pressedLanguage, setPressedLanguage] = useState<Language | null>(null);

  // Load saved language when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLanguage(getSavedLanguage());
      // Reset interactive states when modal opens
      setHoveredLanguage(null);
      setPressedLanguage(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Calculate position relative to button
  const getModalPosition = () => {
    if (!buttonRef.current) {
      return { top: 0, left: 0 };
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const modalWidth = 400; // Original SVG width
    const modalHeight = 201; // Original SVG height

    // Position above the button, centered horizontally
    const top = buttonRect.top - modalHeight;
    const left = buttonRect.left + buttonRect.width / 2 - modalWidth / 2;

    return { top, left };
  };

  const position = getModalPosition();

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    saveLanguage(language);
    // Notify parent component of language change
    if (onLanguageChange) {
      onLanguageChange(language);
    }
    // TODO: Implement language change logic (e.g., update app language)
    console.log("Selected language:", language);
    onClose();
  };

  const handleMouseDown = (language: Language) => {
    setPressedLanguage(language);
  };

  const handleMouseUp = (language: Language) => {
    setPressedLanguage(null);
    handleLanguageSelect(language);
  };

  const handleMouseLeave = () => {
    setHoveredLanguage(null);
    setPressedLanguage(null);
  };

  // Determine if language option should be highlighted
  const isJapaneseHighlighted = (): boolean => {
    return pressedLanguage === "ja" || hoveredLanguage === "ja" || selectedLanguage === "ja";
  };

  const isEnglishHighlighted = (): boolean => {
    return pressedLanguage === "en" || hoveredLanguage === "en" || selectedLanguage === "en";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              pointerEvents: "auto",
            }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            key="language-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            ref={modalRef}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: "400px",
              height: "201px",
              zIndex: 1000,
              pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg
              width="400"
              height="201"
              viewBox="0 0 400 201"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              <rect
                x="0"
                y="0"
                width="400"
                height="183.01"
                rx="12"
                ry="12"
                fill="black"
                fillOpacity="0.7"
              />
              <path
                d="M203.48 199.434C201.948 201.522 198.052 201.522 196.52 199.434L183 183.01H217L203.48 199.434Z"
                fill="black"
                fillOpacity="0.7"
              />
            </svg>

            {/* Japanese option (top) */}
            <div
              onMouseEnter={() => setHoveredLanguage("ja")}
              onMouseLeave={handleMouseLeave}
              onMouseDown={() => handleMouseDown("ja")}
              onMouseUp={() => handleMouseUp("ja")}
              onTouchStart={() => handleMouseDown("ja")}
              onTouchEnd={() => handleMouseUp("ja")}
              style={{
                position: "absolute",
                top: "25px",
                left: "20px",
                width: "360px",
                height: "59px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isJapaneseHighlighted() ? "#E63B93" : "white",
                borderRadius: "10px",
                transition: "background-color 0.1s ease-in-out",
              }}
            >
              <span
                style={{
                  color: isJapaneseHighlighted() ? "white" : "black",
                  fontSize: "14px",
                  fontWeight: "bold",
                  fontFamily: "'Rounded Mplus 1c', sans-serif",
                  userSelect: "none",
                }}
              >
                日本語
              </span>
            </div>

            {/* English option (bottom) */}
            <div
              onMouseEnter={() => setHoveredLanguage("en")}
              onMouseLeave={handleMouseLeave}
              onMouseDown={() => handleMouseDown("en")}
              onMouseUp={() => handleMouseUp("en")}
              onTouchStart={() => handleMouseDown("en")}
              onTouchEnd={() => handleMouseUp("en")}
              style={{
                position: "absolute",
                top: "99px",
                left: "20px",
                width: "360px",
                height: "59px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isEnglishHighlighted() ? "#E63B93" : "white",
                borderRadius: "10px",
                transition: "background-color 0.1s ease-in-out",
              }}
            >
              <span
                style={{
                  color: isEnglishHighlighted() ? "white" : "black",
                  fontSize: "14px",
                  fontWeight: "bold",
                  fontFamily: "'Rounded Mplus 1c', sans-serif",
                  userSelect: "none",
                }}
              >
                English
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
