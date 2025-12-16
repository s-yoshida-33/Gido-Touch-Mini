import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface KeyboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChange: (value: string) => void;
}

const JAPANESE_ROW = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];
const ALPHABET_ROW_1 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const ALPHABET_ROW_2 = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export const KeyboardModal: React.FC<KeyboardModalProps> = ({
  isOpen,
  onClose,
  onChange,
}) => {
  const [pressedKey, setPressedKey] = React.useState<string | null>(null);
  const [isClosePressed, setIsClosePressed] = React.useState(false);

  const handleKeyPress = (key: string) => {
    // 頭文字検索のため、入力値を置き換える（追加ではない）
    onChange(key);
    // キー選択時にモーダルを閉じる
    onClose();
  };

  const handleClose = () => {
    onClose();
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

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
            style={{
              width: "1360px",
              height: "654px",
              backgroundColor: "#FFFFFF",
              borderRadius: "20px",
              boxShadow: "0px 10px 40px rgba(0, 0, 0, 0.3)",
              position: "relative",
              zIndex: 1001,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden", // 角丸を適用するため
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header (H: 64px) */}
            <div
              style={{
                width: "100%",
                height: "64px",
                display: "flex",
                alignItems: "center",
                paddingLeft: "50px",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#333",
                  fontFamily: "'Rounded Mplus 1c', sans-serif",
                }}
              >
                店舗名でさがす（頭文字）
              </span>
            </div>

            {/* 2. Keyboard (H: 480px) */}
            <div
              style={{
                width: "100%",
                height: "480px",
                backgroundColor: "#DDDFEB",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
                padding: "20px",
                boxSizing: "border-box",
              }}
            >
              {/* Row 1: Alphabet 1 (13 keys) */}
              <div style={{ display: "flex", gap: "20px" }}>
                {ALPHABET_ROW_1.map((key) => (
                  <KeyButton
                    key={key}
                    label={key}
                    isPressed={pressedKey === key}
                    onPressStart={() => setPressedKey(key)}
                    onPressEnd={() => setPressedKey(null)}
                    onClick={() => handleKeyPress(key)}
                  />
                ))}
              </div>

              {/* Row 2: Alphabet 2 (13 keys) */}
              <div style={{ display: "flex", gap: "20px" }}>
                {ALPHABET_ROW_2.map((key) => (
                  <KeyButton
                    key={key}
                    label={key}
                    isPressed={pressedKey === key}
                    onPressStart={() => setPressedKey(key)}
                    onPressEnd={() => setPressedKey(null)}
                    onClick={() => handleKeyPress(key)}
                  />
                ))}
              </div>

              {/* Row 3: Japanese (10 keys) */}
              <div style={{ display: "flex", gap: "20px" }}>
                {JAPANESE_ROW.map((key) => (
                  <KeyButton
                    key={key}
                    label={key}
                    isPressed={pressedKey === key}
                    onPressStart={() => setPressedKey(key)}
                    onPressEnd={() => setPressedKey(null)}
                    onClick={() => handleKeyPress(key)}
                  />
                ))}
              </div>
            </div>

            {/* 3. Footer (H: 110px) */}
            <div
              style={{
                width: "100%",
                height: "110px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "220px",
                  height: "50px",
                  borderRadius: "10px",
                  backgroundColor: "#EFEFEF",
                  boxShadow: "4px 4px 8px rgba(0, 0, 0, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  opacity: isClosePressed ? 0.7 : 1,
                  transform: isClosePressed ? "translateY(2px)" : "none",
                  transition: "all 0.1s",
                }}
                onClick={handleClose}
                onMouseDown={() => setIsClosePressed(true)}
                onMouseUp={() => setIsClosePressed(false)}
                onMouseLeave={() => setIsClosePressed(false)}
                onTouchStart={() => setIsClosePressed(true)}
                onTouchEnd={() => setIsClosePressed(false)}
              >
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#333",
                    fontFamily: "'Rounded Mplus 1c', sans-serif",
                  }}
                >
                  × 閉じる
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface KeyButtonProps {
  label: string;
  isPressed: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  onClick: () => void;
}

const KeyButton: React.FC<KeyButtonProps> = ({
  label,
  isPressed,
  onPressStart,
  onPressEnd,
  onClick,
}) => {
  return (
    <div
      style={{
        width: "80px",
        height: "80px",
        borderRadius: "20px",
        backgroundColor: "#FFE3F1",
        border: "2px solid #E63B93",
        // boxShadow: "4px 4px 8px rgba(0, 0, 0, 0.25)", // Remove duplicate
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxSizing: "border-box",
        transform: isPressed ? "translate(2px, 2px)" : "none",
        // When pressed, reduce shadow to simulate physical button press
        boxShadow: isPressed 
          ? "2px 2px 4px rgba(0, 0, 0, 0.25)" 
          : "4px 4px 8px rgba(0, 0, 0, 0.25)",
        transition: "all 0.1s",
      }}
      onMouseDown={onPressStart}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
      onTouchStart={onPressStart}
      onTouchEnd={onPressEnd}
      onClick={onClick}
    >
      <span
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          // color: "#E63B93", // Match border color for text? Or black? Using brand pink for now or standard black.
          // Let's use black or dark gray for better readability, or maybe the pink if intended.
          // Given the border color is pink, pink text might look nice.
          // But usually keys are black. Let's try Dark Gray #333.
          color: "#333",
          fontFamily: "'Rounded Mplus 1c', sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
};
