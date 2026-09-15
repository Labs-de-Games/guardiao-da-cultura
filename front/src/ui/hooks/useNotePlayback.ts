"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NotePlaybackService,
  type SongSlot,
} from "@/lib/audio/NotePlaybackService";

export function useNotePlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const playNote = useCallback((note: string) => {
    NotePlaybackService.playNote(note);
  }, []);

  const playSequence = useCallback(async (slots: SongSlot[]) => {
    setIsPlaying(true);
    try {
      await NotePlaybackService.playSequence(slots, setPlayingIndex);
    } finally {
      setIsPlaying(false);
      setPlayingIndex(null);
    }
  }, []);

  const cancel = useCallback(() => {
    NotePlaybackService.cancel();
    setIsPlaying(false);
    setPlayingIndex(null);
  }, []);

  useEffect(() => {
    return () => {
      NotePlaybackService.cancel();
    };
  }, []);

  return { playNote, playSequence, cancel, isPlaying, playingIndex };
}
