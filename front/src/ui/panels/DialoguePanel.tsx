"use client";

import ArrowRight from "@mui/icons-material/ArrowRight";
import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDialogueStore } from "@/ui/state/dialogue-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

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

function TextToSpeechIcon() {
  return (
    <Box
      component="img"
      src="/images/etiqueta/icon-text-to-speech.svg"
      alt=""
      aria-hidden="true"
      sx={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        pointerEvents: "none",
        filter: "brightness(0) invert(1)",
      }}
    />
  );
}

export function DialoguePanel({ onComplete, onDismiss }: DialoguePanelProps) {
  const open = useDialogueStore((s) => s.dialogueOpen);
  const mode = useDialogueStore((s) => s.dialogueMode);
  const lines = useDialogueStore((s) => s.dialogueLines);
  const currentLine = useDialogueStore((s) => s.dialogueCurrentLine);
  const confirmMessage = useDialogueStore((s) => s.dialogueConfirmMessage);
  const confirmSpeaker = useDialogueStore((s) => s.dialogueConfirmSpeaker);
  const confirmSelected = useDialogueStore((s) => s.dialogueConfirmSelected);
  const callbackId = useDialogueStore((s) => s.dialogueCallbackId);
  const speakerPos = useDialogueStore((s) => s.dialoguePosition);

  const advanceDialogue = useDialogueStore((s) => s.advanceDialogue);
  const moveConfirmSelection = useDialogueStore((s) => s.moveConfirmSelection);
  const confirmDialogueSelection = useDialogueStore(
    (s) => s.confirmDialogueSelection,
  );
  const closeDialogue = useDialogueStore((s) => s.closeDialogue);

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // suppresses spurious input immediately after dialogue opens
  const ignoreNextInputRef = useRef(true);
  const charIndexRef = useRef(0);
  const { width: vw, height: vh } = useWindowSize();

  const rawCurrentText =
    mode === "dialogue" ? (lines[currentLine] ?? "") : confirmMessage;
  const parsedLine = parseLine(rawCurrentText);
  const currentText = truncateText(parsedLine.content, MAX_DIALOGUE_LENGTH);
  const speakerName = mode === "dialogue" ? parsedLine.speaker : null;
  const isLastLine = mode === "dialogue" && currentLine === lines.length - 1;

  const positioning = useMemo(() => {
    if (!speakerPos) {
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

    const minLeft = BUBBLE_HALF + VIEWPORT_MARGIN;
    const maxLeft = vw - BUBBLE_HALF - VIEWPORT_MARGIN;
    const clampedLeft = Math.max(minLeft, Math.min(speakerPos.x, maxLeft));

    const bottom = Math.min(
      vh - VIEWPORT_MARGIN,
      Math.max(
        VIEWPORT_MARGIN,
        vh - (speakerPos.y - TRIANGLE_HEIGHT - HEAD_OFFSET),
      ),
    );

    const bubbleLeftEdge = clampedLeft - BUBBLE_HALF;
    const ratio = (speakerPos.x - bubbleLeftEdge) / BUBBLE_MAX_WIDTH;
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
  }, [speakerPos, vw, vh]);

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

  const handleConfirm = useCallback(
    (confirmed: boolean) => {
      onComplete(callbackId, confirmed);
      confirmDialogueSelection();
    },
    [callbackId, confirmDialogueSelection, onComplete],
  );

  const handleDismiss = useCallback(() => {
    onDismiss(callbackId);
    closeDialogue();
  }, [closeDialogue, callbackId, onDismiss]);

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (mode === "dialogue") {
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
      } else {
        if (
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "a" ||
          e.key === "A" ||
          e.key === "d" ||
          e.key === "D"
        ) {
          e.preventDefault();
          e.stopPropagation();
          moveConfirmSelection(
            e.key === "ArrowRight" || e.key === "d" || e.key === "D" ? 1 : -1,
          );
        }
        if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          e.stopPropagation();
          const currentSelected =
            useDialogueStore.getState().dialogueConfirmSelected;
          handleConfirm(currentSelected === 0);
        }
        if (e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          handleDismiss();
        }
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [
    open,
    mode,
    handleAdvance,
    handleConfirm,
    handleDismiss,
    moveConfirmSelection,
  ]);

  if (!open) return null;

  return (
    <Box
      sx={{
        ...positioning.outerStyle,
        maxWidth: "min(900px, 90vw)",
        width: "min(900px, 90vw)",
        pointerEvents: "auto",
        zIndex: 30,
      }}
    >
      <Box
        role="dialog"
        aria-live="polite"
        sx={{
          position: "relative",
          bgcolor: GAME_UI_TOKENS.colors.dialogueBg,
          borderRadius: "12px",
          px: "41px",
          py: "28px",
          maxWidth: "min(862px, 90vw)",
          width: "100%",
          overflow: "visible",
        }}
      >
        <TextToSpeechIcon />
        {mode === "dialogue" ? (
          <DialogueContent
            speakerName={speakerName}
            text={displayedText}
            isLastLine={isLastLine}
            onAdvance={handleAdvance}
          />
        ) : (
          <ConfirmationContent
            message={displayedText}
            speakerName={confirmSpeaker}
            selectedIndex={confirmSelected}
            onHover={(targetIndex) => {
              const cur = useDialogueStore.getState().dialogueConfirmSelected;
              if (cur !== targetIndex)
                moveConfirmSelection(targetIndex === 0 ? -1 : 1);
            }}
            onConfirm={handleConfirm}
          />
        )}
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
            mb: "12px",
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

function ConfirmationContent({
  message,
  speakerName,
  selectedIndex,
  onHover,
  onConfirm,
}: {
  message: string;
  speakerName: string;
  selectedIndex: number;
  onHover: (index: number) => void;
  onConfirm: (confirmed: boolean) => void;
}) {
  return (
    <Box>
      {speakerName && (
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.display,
            fontSize: "24px",
            lineHeight: "1.21em",
            color: GAME_UI_TOKENS.colors.accentGoldMuted,
            mb: "12px",
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
          minHeight: "2.5em",
        }}
      >
        {message}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontSize: "18px",
            fontWeight: selectedIndex === 0 ? 700 : 500,
            color:
              selectedIndex === 0
                ? GAME_UI_TOKENS.colors.dialogueCta
                : GAME_UI_TOKENS.colors.textSecondary,
            cursor: "pointer",
            transition: "all 0.15s",
            transform: selectedIndex === 0 ? "scale(1.1)" : "scale(1)",
            "&:hover": { color: GAME_UI_TOKENS.colors.dialogueCta },
          }}
          onClick={() => onConfirm(true)}
          onMouseEnter={() => onHover(0)}
        >
          Sim
        </Typography>
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontSize: "18px",
            fontWeight: selectedIndex === 1 ? 700 : 500,
            color:
              selectedIndex === 1
                ? GAME_UI_TOKENS.colors.dialogueCta
                : GAME_UI_TOKENS.colors.textSecondary,
            cursor: "pointer",
            transition: "all 0.15s",
            transform: selectedIndex === 1 ? "scale(1.1)" : "scale(1)",
            "&:hover": { color: GAME_UI_TOKENS.colors.dialogueCta },
          }}
          onClick={() => onConfirm(false)}
          onMouseEnter={() => onHover(1)}
        >
          Não
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ArrowRight
          sx={{
            fontSize: 32,
            color: GAME_UI_TOKENS.colors.dialogueCta,
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
          CONFIRMAR
        </Typography>
      </Box>
    </Box>
  );
}
