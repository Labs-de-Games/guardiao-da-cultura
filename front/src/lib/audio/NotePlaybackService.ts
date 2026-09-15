const NOTES_DIR = "/assets/sound/notes";
const STEP_INTERVAL_MS = 600;

const NOTE_NAMES = ["C3", "D3", "E3", "G3", "A3", "B3", "D4", "F4"] as const;
export type NoteName = (typeof NOTE_NAMES)[number];

export interface SongSlot {
  note: string | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class NotePlaybackServiceImpl {
  private static instance: NotePlaybackServiceImpl;
  private audioByNote = new Map<string, HTMLAudioElement>();
  private sequenceRequestId = 0;
  private playingSequence = false;

  private constructor() {}

  static getInstance(): NotePlaybackServiceImpl {
    if (!NotePlaybackServiceImpl.instance) {
      NotePlaybackServiceImpl.instance = new NotePlaybackServiceImpl();
    }
    return NotePlaybackServiceImpl.instance;
  }

  private getAudio(note: string): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    let audio = this.audioByNote.get(note);
    if (!audio) {
      if (!NOTE_NAMES.includes(note as NoteName)) return null;
      audio = new Audio(`${NOTES_DIR}/${note}.wav`);
      audio.preload = "auto";
      this.audioByNote.set(note, audio);
    }
    return audio;
  }

  playNote(note: string): void {
    const audio = this.getAudio(note);
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play();
  }

  async playSequence(
    slots: SongSlot[],
    onStep?: (index: number | null) => void,
  ): Promise<void> {
    this.cancel();
    const requestId = ++this.sequenceRequestId;
    this.playingSequence = true;

    for (let i = 0; i < slots.length; i++) {
      if (requestId !== this.sequenceRequestId) return;
      const slot = slots[i];
      onStep?.(i);
      if (slot.note) this.playNote(slot.note);
      await delay(STEP_INTERVAL_MS);
    }

    if (requestId === this.sequenceRequestId) {
      this.playingSequence = false;
    }
    onStep?.(null);
  }

  cancel(): void {
    this.sequenceRequestId++;
    this.playingSequence = false;
    for (const audio of this.audioByNote.values()) {
      audio.pause();
    }
  }

  isPlayingSequence(): boolean {
    return this.playingSequence;
  }
}

export const NotePlaybackService = NotePlaybackServiceImpl.getInstance();
