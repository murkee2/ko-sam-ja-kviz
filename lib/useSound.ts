"use client";

import { useCallback, useRef } from "react";

export function useSound(muted: boolean) {
  const contextRef = useRef<AudioContext | null>(null);

  const start = useCallback(() => {
    if (muted) return null;
    if (!contextRef.current) {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) contextRef.current = new AudioContextCtor();
    }
    if (contextRef.current?.state === "suspended") contextRef.current.resume();
    return contextRef.current;
  }, [muted]);

  const tone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = "sine", delay = 0) => {
      const context = start();
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startTime = context.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.02);
    },
    [start]
  );

  const success = useCallback(() => {
    [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.25, "triangle", index * 0.07));
  }, [tone]);

  const wrong = useCallback(() => {
    tone(180, 0.25, "sawtooth");
  }, [tone]);

  const unlock = useCallback(() => {
    tone(420, 0.14, "square");
    tone(720, 0.2, "square", 0.08);
  }, [tone]);

  return { start, success, wrong, unlock };
}
