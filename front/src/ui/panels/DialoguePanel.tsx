"use client";

import ArrowRight from "@mui/icons-material/ArrowRight";
import { Box, Typography } from "@mui/material";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAudioAccessibility } from "@/lib/audio";
import { EventBus } from "@/shared/events/event-bus";
import { useDialogueStore } from "@/ui/state/dialogue-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });
  useEffect(() => {
    const handler = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return size;
}

const TYPING_SPEED = 30;
const BUBBLE_MAX_WIDTH = 900;
const BUBBLE_HALF = BUBBLE_MAX_WIDTH / 2;
const VIEWPORT_MARGIN = 24;
const TRIANGLE_HEIGHT = 32;
const HEAD_OFFSET = 100;
const HORIZONTAL_OFFSET = 60;
const MAX_DIALOGUE_LENGTH = 144;

interface DialoguePanelProps {
  onComplete: (callbackId: string, confirmed?: boolean) => void;
  onDismiss: (callbackId: string) => void;
}

interface ParsedLine {
  speaker: string | null;
  content: string;
}

function parseLine(text: string): ParsedLine {
  const match = text.match(/^([^:]+):\s*(.+)$/);
  if (match) {
    return { speaker: match[1], content: match[2] };
  }
  return { speaker: null, content: text };
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

function TextToSpeechIcon({ onClick }: { onClick?: () => void }) {
  return (
    <Box
      component="img"
      src="/images/etiqueta/icon-text-to-speech.svg"
      alt=""
      aria-hidden="true"
      onClick={onClick}
      sx={{
        position: "absolute",
        top: 32,
        right: 40,
        width: 36,
        height: 36,
        pointerEvents: onClick ? "auto" : "none",
        cursor: onClick ? "pointer" : "default",
        filter: "brightness(0) invert(1)",
        "&:hover": {
          opacity: 0.7,
        },
      }}
    />
  );
}

export function DialoguePanel({ onComplete, onDismiss }: DialoguePanelProps) {
  const open = useDialogueStore((s) => s.dialogueOpen);
  const mode = useDialogueStore((s) => s.dialogueMode);
  const lines = useDialogueStore((s) => s.dialogueLines);
  const currentLine = useDialogueStore((s) => s.dialogueCurrentLine);
  const callbackId = useDialogueStore((s) => s.dialogueCallbackId);
  const speakerPos = useDialogueStore((s) => s.dialoguePosition);

  const advanceDialogue = useDialogueStore((s) => s.advanceDialogue);
  const closeDialogue = useDialogueStore((s) => s.closeDialogue);
  const { speak } = useAudioAccessibility();

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // suppresses spurious input immediately after dialogue opens
  const ignoreNextInputRef = useRef(true);
  const charIndexRef = useRef(0);
  const { width: vw, height: vh } = useWindowSize();
  const [cameraTransform, setCameraTransform] = useState<{
    worldViewX: number;
    worldViewY: number;
    zoom: number;
  } | null>(null);

  const rawCurrentText = lines[currentLine] ?? "";
  const parsedLine = parseLine(rawCurrentText);
  const currentText = truncateText(parsedLine.content, MAX_DIALOGUE_LENGTH);
  const speakerName = parsedLine.speaker;
  const isLastLine = currentLine === lines.length - 1;

  const positioning = useMemo(() => {
    if (!speakerPos || !cameraTransform) {
      return {
        outerStyle: {
          position: "absolute" as const,
          top: 24,
          left: "50%" as const,
          transform: "translateX(-50%)",
        },
        triangleLeft: null,
      };
    }

    const { worldViewX, worldViewY, zoom } = cameraTransform;
    const screenX = (speakerPos.x - worldViewX) * zoom;
    const screenY = (speakerPos.y - worldViewY) * zoom;

    const minLeft = BUBBLE_HALF + VIEWPORT_MARGIN;
    const maxLeft = vw - BUBBLE_HALF - VIEWPORT_MARGIN;
    const clampedLeft = Math.max(
      minLeft,
      Math.min(screenX + HORIZONTAL_OFFSET, maxLeft),
    );

    const bottom = Math.min(
      vh - VIEWPORT_MARGIN,
      Math.max(
        VIEWPORT_MARGIN,
        vh - (screenY - TRIANGLE_HEIGHT - HEAD_OFFSET * zoom),
      ),
    );

    const bubbleLeftEdge = clampedLeft - BUBBLE_HALF;
    const ratio = (screenX - bubbleLeftEdge) / BUBBLE_MAX_WIDTH;
    const triangleLeft = Math.max(15, Math.min(ratio * 100, 85));

    return {
      outerStyle: {
        position: "absolute" as const,
        left: clampedLeft,
        bottom,
        transform: "translateX(-50%)",
      },
      triangleLeft,
    };
  }, [speakerPos, cameraTransform, vw, vh]);

  useLayoutEffect(() => {
    if (!open) {
      setCameraTransform(null);
      return;
    }
    // EventBus replays the last camera-sync payload synchronously here,
    // so the bubble's first paint already has the settled camera state
    // instead of flashing at the fallback position for a frame.
    return EventBus.on("dialogue:camera-sync", (data) => {
      setCameraTransform(data);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDisplayedText("");
    setIsTyping(true);
    charIndexRef.current = 0;

    const typeNext = () => {
      if (charIndexRef.current < currentText.length) {
        setDisplayedText(currentText.slice(0, charIndexRef.current + 1));
        charIndexRef.current++;
        typingTimerRef.current = setTimeout(typeNext, TYPING_SPEED);
      } else {
        setIsTyping(false);
      }
    };

    typingTimerRef.current = setTimeout(typeNext, TYPING_SPEED);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [open, currentText]);

  useEffect(() => {
    if (!open) {
      ignoreNextInputRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      ignoreNextInputRef.current = false;
    }, 60);

    return () => clearTimeout(timer);
  }, [open]);

  const skipTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setDisplayedText(currentText);
    setIsTyping(false);
  }, [currentText]);

  const handleAdvance = useCallback(() => {
    if (ignoreNextInputRef.current) return;
    if (isTyping) {
      skipTyping();
      return;
    }
    if (isLastLine) {
      onComplete(callbackId);
      advanceDialogue();
      return;
    }
    advanceDialogue();
  }, [
    isTyping,
    skipTyping,
    advanceDialogue,
    isLastLine,
    callbackId,
    onComplete,
  ]);

  const handleDismiss = useCallback(() => {
    onDismiss(callbackId);
    closeDialogue();
  }, [closeDialogue, callbackId, onDismiss]);

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "e" || e.key === "E") {
        e.preventDefault();
        e.stopPropagation();
        handleAdvance();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, handleAdvance, handleDismiss]);

  if (!open || mode !== "dialogue") return null;

  return (
    <Box
      sx={{
        ...positioning.outerStyle,
        maxWidth: "min(900px, 90vw)",
        width: "min(900px, 90vw)",
        pointerEvents: "auto",
        zIndex: UI_LAYERS.IN_WORLD,
      }}
    >
      <Box
        role="dialog"
        aria-live="polite"
        sx={{
          position: "relative",
          bgcolor: GAME_UI_TOKENS.colors.dialogueBg,
          borderRadius: "12px",
          px: "40px",
          py: "32px",
          maxWidth: "min(862px, 90vw)",
          width: "100%",
          overflow: "visible",
        }}
      >
        <TextToSpeechIcon onClick={() => currentText && speak(currentText)} />
        <DialogueContent
          speakerName={speakerName}
          text={displayedText}
          isLastLine={isLastLine}
          onAdvance={handleAdvance}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -TRIANGLE_HEIGHT,
            ...(positioning.triangleLeft !== null
              ? {
                  left: `${positioning.triangleLeft}%`,
                  transform: "translateX(-50%)",
                }
              : { right: 40 }),
            width: 0,
            height: 0,
            borderLeft: "24px solid transparent",
            borderRight: "24px solid transparent",
            borderTop: `${TRIANGLE_HEIGHT}px solid ${GAME_UI_TOKENS.colors.dialogueBg}`,
          }}
        />
      </Box>
    </Box>
  );
}

function DialogueContent({
  speakerName,
  text,
  isLastLine,
  onAdvance,
}: {
  speakerName: string | null;
  text: string;
  isLastLine: boolean;
  onAdvance: () => void;
}) {
  return (
    <Box sx={{ cursor: "pointer" }} onClick={onAdvance}>
      {speakerName && (
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.display,
            fontSize: "24px",
            lineHeight: "1.21em",
            color: GAME_UI_TOKENS.colors.accentGoldMuted,
            mb: "16px",
          }}
        >
          {speakerName}
        </Typography>
      )}
      <Typography
        sx={{
          fontFamily: GAME_UI_TOKENS.fonts.body,
          fontSize: "20px",
          color: GAME_UI_TOKENS.colors.accentGoldMuted,
          lineHeight: 1.2,
          mb: "16px",
          minHeight: "2.5em",
          pr: "56px",
        }}
      >
        {text}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <ArrowRight
          sx={{
            fontSize: 32,
            color: GAME_UI_TOKENS.colors.dialogueCta,
            mx: -1.5,
            my: -1.5,
          }}
        />
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontWeight: 500,
            fontSize: "14px",
            color: GAME_UI_TOKENS.colors.dialogueCta,
          }}
        >
          {isLastLine ? "FECHAR" : "CONTINUAR"}
        </Typography>
      </Box>
    </Box>
  );
}
