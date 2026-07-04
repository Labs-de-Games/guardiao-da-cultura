"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioAccessibilityService } from "./AudioAccessibilityService";

export function useAudioAccessibility() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      await AudioAccessibilityService.speak(text);
      const check = setInterval(() => {
        if (!AudioAccessibilityService.isPlaying()) {
          setIsSpeaking(false);
          clearInterval(check);
        }
      }, 200);
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    AudioAccessibilityService.stop();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (AudioAccessibilityService.isPlaying()) {
        AudioAccessibilityService.stop();
      }
    };
  }, []);

  return { speak, stop, isSpeaking };
}
