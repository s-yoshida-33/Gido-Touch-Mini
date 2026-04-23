import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

const SOUND_RELATIVE_PATH = 'sounds/touch-sound-1.wav';

export function useTouchSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  // Load the WAV file once on mount via Rust (resolves medias/ from exe dir or cwd)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const ctx = new AudioContext();
        ctxRef.current = ctx;

        const bytes = await invoke<number[]>('read_media_binary', { relativePath: SOUND_RELATIVE_PATH });
        const arrayBuffer = new Uint8Array(bytes).buffer;
        const decoded = await ctx.decodeAudioData(arrayBuffer);

        if (!cancelled) {
          bufferRef.current = decoded;
        }
      } catch {
        // File missing or decode failed — touch sound disabled silently
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
