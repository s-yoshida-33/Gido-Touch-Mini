import { useEffect, useRef } from 'react';
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';

const SOUND_PATH = 'medias/sounds/touch-sound-1.wav';

export function useTouchSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  // Load the WAV file once on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const ctx = new AudioContext();
        ctxRef.current = ctx;

        const bytes = await readFile(SOUND_PATH, { baseDir: BaseDirectory.AppLocalData });
        const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const decoded = await ctx.decodeAudioData(arrayBuffer as ArrayBuffer);

        if (!cancelled) {
          bufferRef.current = decoded;
        }
      } catch {
        // Sound file not found or decode failed — touch sound disabled silently
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const play = () => {
      const ctx = ctxRef.current;
      const buffer = bufferRef.current;
      if (!ctx || !buffer) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start();
    };

    document.addEventListener('touchstart', play, { passive: true });
    return () => {
      document.removeEventListener('touchstart', play);
    };
  }, [enabled]);
}
