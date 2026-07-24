"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioAccessibilityService } from "./AudioAccessibilityService";

export function useAudioAccessibility() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      await AudioAccessibilityService.speak(text);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    AudioAccessibilityService.stop();
    setIsSpeaking(false);
  }, []);

  const setVoice = useCallback((voice: string) => {
    AudioAccessibilityService.setVoice(voice);
  }, []);

  useEffect(() => {
    return () => {
      if (AudioAccessibilityService.isPlaying()) {
        AudioAccessibilityService.stop();
      }
    };
  }, []);

  return { speak, stop, isSpeaking, setVoice };
}
