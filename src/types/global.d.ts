// src/types/global.d.ts
// Tauri version - Electron APIs removed. All IPC via @tauri-apps/api/core invoke().
export {};

declare global {
  interface Window {
    __BWP_BASE_URL__?: string;
  }
}
