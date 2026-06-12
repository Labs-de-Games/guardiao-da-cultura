"use client";

import { Box, CardContent, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDialogueStore } from "@/ui/state/dialogue-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const TYPING_SPEED = 30;

interface DialoguePanelProps {
  onComplete: (callbackId: string, confirmed?: boolean) => void;
  onDismiss: (callbackId: string) => void;
}

export function DialoguePanel({ onComplete, onDismiss }: DialoguePanelProps) {
  const open = useDialogueStore((s) => s.dialogueOpen);
  const mode = useDialogueStore((s) => s.dialogueMode);
  const lines = useDialogueStore((s) => s.dialogueLines);
  const currentLine = useDialogueStore((s) => s.dialogueCurrentLine);
  const confirmMessage = useDialogueStore((s) => s.dialogueConfirmMessage);
  const confirmSelected = useDialogueStore((s) => s.dialogueConfirmSelected);
  const callbackId = useDialogueStore((s) => s.dialogueCallbackId);

  const advanceDialogue = useDialogueStore((s) => s.advanceDialogue);
  const moveConfirmSelection = useDialogueStore((s) => s.moveConfirmSelection);
  const confirmDialogueSelection = useDialogueStore(
    (s) => s.confirmDialogueSelection,
  );
  const closeDialogue = useDialogueStore((s) => s.closeDialogue);

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreNextInputRef = useRef(true);
  const charIndexRef = useRef(0);

  const currentText =
    mode === "dialogue" ? (lines[currentLine] ?? "") : confirmMessage;
  const isLastLine = mode === "dialogue" && currentLine === lines.length - 1;

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
        position: "absolute",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "min(900px, 90vw)",
        width: "100%",
        pointerEvents: "auto",
        zIndex: 30,
      }}
    >
      <Paper
        square
        role="dialog"
        aria-live="polite"
        sx={{
          bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
          borderRadius: `${GAME_UI_TOKENS.radius.panel}px`,
          border: "none",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          {mode === "dialogue" && (
            <DialogueContent
              text={displayedText}
              isLastLine={isLastLine}
              onAdvance={handleAdvance}
            />
          )}
          {mode === "confirmation" && (
            <ConfirmationContent
              message={displayedText}
              selectedIndex={confirmSelected}
              onSelect={moveConfirmSelection}
              onConfirm={handleConfirm}
            />
          )}
        </CardContent>
      </Paper>
    </Box>
  );
}

function DialogueContent({
  text,
  isLastLine,
  onAdvance,
}: {
  text: string;
  isLastLine: boolean;
  onAdvance: () => void;
}) {
  return (
    <Box sx={{ cursor: "pointer" }} onClick={onAdvance}>
      <Typography
        variant="body2"
        sx={{
          color: GAME_UI_TOKENS.colors.textPrimary,
          fontSize: "14px",
          lineHeight: 1.6,
          mb: 2,
          minHeight: "2.5em",
        }}
      >
        {text}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: GAME_UI_TOKENS.colors.accentGold,
            fontSize: "12px",
            fontWeight: 600,
            opacity: 0.8,
            animation: "pulse 1.5s ease-in-out infinite",
            "@keyframes pulse": {
              "0%, 100%": { opacity: 0.8 },
              "50%": { opacity: 0.4 },
            },
          }}
        >
          ▼
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{
            color: GAME_UI_TOKENS.colors.textSecondary,
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {isLastLine ? "Aperte E para fechar" : "Aperte E para continuar"}
        </Typography>
      </Box>
    </Box>
  );
}

function ConfirmationContent({
  message,
  selectedIndex,
  onSelect,
  onConfirm,
}: {
  message: string;
  selectedIndex: number;
  onSelect: (dir: number) => void;
  onConfirm: (confirmed: boolean) => void;
}) {
  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{
          color: GAME_UI_TOKENS.colors.textPrimary,
          fontSize: "14px",
          lineHeight: 1.6,
          mb: 3,
        }}
      >
        {message}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 4,
          mb: 2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color:
              selectedIndex === 0
                ? GAME_UI_TOKENS.colors.accentGold
                : GAME_UI_TOKENS.colors.textSecondary,
            fontSize: "14px",
            fontWeight: selectedIndex === 0 ? 700 : 600,
            cursor: "pointer",
            transition: "all 0.15s",
            transform: selectedIndex === 0 ? "scale(1.1)" : "scale(1)",
            "&:hover": { color: GAME_UI_TOKENS.colors.accentGold },
          }}
          onClick={() => onConfirm(true)}
          onMouseEnter={() => onSelect(0)}
        >
          Sim
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{
            color:
              selectedIndex === 1
                ? GAME_UI_TOKENS.colors.accentGold
                : GAME_UI_TOKENS.colors.textSecondary,
            fontSize: "14px",
            fontWeight: selectedIndex === 1 ? 700 : 600,
            cursor: "pointer",
            transition: "all 0.15s",
            transform: selectedIndex === 1 ? "scale(1.1)" : "scale(1)",
            "&:hover": { color: GAME_UI_TOKENS.colors.accentGold },
          }}
          onClick={() => onConfirm(false)}
          onMouseEnter={() => onSelect(1)}
        >
          Não
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: GAME_UI_TOKENS.colors.textSecondary,
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          Aperte ESC para cancelar
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{
            color: GAME_UI_TOKENS.colors.textSecondary,
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          Aperte E para confirmar
        </Typography>
      </Box>
    </Box>
  );
}
