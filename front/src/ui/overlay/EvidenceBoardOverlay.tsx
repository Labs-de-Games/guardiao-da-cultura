"use client";

import { Box, Typography } from "@mui/material";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import type { CollectibleEntry } from "@/ui/state/game-ui-store";
import {
  selectHintCollectibles,
  useGameUIStore,
} from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

const PIN_SIZE = 16;
const WIRE_COLOR = "#b91c1c";

interface Connection {
  fromId: string;
  toId: string;
}

function getUniqueConnections(clues: CollectibleEntry[]): Connection[] {
  const seen = new Set<string>();
  const result: Connection[] = [];

  for (const clue of clues) {
    if (!clue.board?.connectedTo) continue;
    for (const targetId of clue.board.connectedTo) {
      const key = [clue.id, targetId].sort().join("->");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ fromId: clue.id, toId: targetId });
    }
  }

  return result;
}

interface PinPositions {
  [id: string]: { x: number; y: number };
}

export function EvidenceBoardOverlay() {
  const isOpen = useGameUIStore((s) => s.evidenceBoardOpen);
  const closeBoard = useGameUIStore((s) => s.setEvidenceBoardOpen);
  const selectedClueId = useGameUIStore((s) => s.evidenceBoardSelectedClueId);
  const setSelectedClueId = useGameUIStore(
    (s) => s.setEvidenceBoardSelectedClueId,
  );
  const allClues = useGameUIStore(useShallow(selectHintCollectibles));

  const boardRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [pinPositions, setPinPositions] = useState<PinPositions>({});

  const clues = useMemo(() => allClues.filter((c) => c.collected), [allClues]);
  const collectedClueIds = new Set(clues.map((c) => c.id));
  const connections = getUniqueConnections(clues).filter(
    (conn) =>
      collectedClueIds.has(conn.fromId) && collectedClueIds.has(conn.toId),
  );

  const selectedClue = useMemo(
    () =>
      selectedClueId
        ? (clues.find((c) => c.id === selectedClueId) ?? null)
        : null,
    [clues, selectedClueId],
  );

  const recalcPositions = useCallback(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const boardRect = boardEl.getBoundingClientRect();
    const newPositions: PinPositions = {};

    for (const clue of clues) {
      const pinEl = pinRefs.current.get(clue.id);
      if (!pinEl) continue;
      const pinRect = pinEl.getBoundingClientRect();
      newPositions[clue.id] = {
        x:
          pinRect.left -
          boardRect.left -
          boardEl.clientLeft +
          pinRect.width / 2,
        y: pinRect.top - boardRect.top - boardEl.clientTop + pinRect.height / 2,
      };
    }

    setPinPositions(newPositions);
  }, [clues]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    recalcPositions();
  }, [isOpen, recalcPositions]);

  useEffect(() => {
    if (!isOpen) return;
    const boardEl = boardRef.current;
    if (!boardEl) return;

    const observer = new ResizeObserver(() => recalcPositions());
    observer.observe(boardEl);
    return () => observer.disconnect();
  }, [isOpen, recalcPositions]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (selectedClueId) {
          setSelectedClueId(null);
        } else {
          setSelectedClueId(null);
          closeBoard(false);
        }
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, closeBoard, selectedClueId, setSelectedClueId]);

  if (!isOpen) return null;

  return (
    <Box
      data-evidence-board="true"
      onClick={() => {
        setSelectedClueId(null);
        closeBoard(false);
      }}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: UI_LAYERS.FULLSCREEN,
        bgcolor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
        imageRendering: "pixelated",
      }}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        ref={boardRef}
        sx={{
          position: "relative",
          width: "min(880px, 94vw)",
          aspectRatio: "8 / 5.2",
          bgcolor: "#1a1a1a",
          borderRadius: `${GAME_UI_TOKENS.radius.panel}px`,
          boxShadow:
            "inset 0 0 60px rgba(0,0,0,0.8), 0 20px 60px rgba(0,0,0,0.9)",
          border: "8px solid #111111",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <Typography
          sx={{
            textAlign: "center",
            fontFamily: "'Jockey One', sans-serif",
            fontSize: { xs: "1.5rem", sm: "2rem" },
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: GAME_UI_TOKENS.colors.accentGold,
            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            pt: { xs: 1.5, sm: 2.5 },
            pb: 1,
          }}
        >
          PISTAS
        </Typography>

        <Box
          onClick={(e) => {
            e.stopPropagation();
            setSelectedClueId(null);
            closeBoard(false);
          }}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: "50%",
            bgcolor: "#3a352e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 20,
            "&:hover": { bgcolor: "#555" },
          }}
        >
          <Typography
            sx={{
              color: "#e5d5b7",
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            x
          </Typography>
        </Box>

        {clues.map((clue) => {
          const pos = clue.board?.position;
          if (!pos) return null;

          return (
            <Box
              key={clue.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedClueId(clue.id);
              }}
              sx={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `rotate(${pos.rotation}deg)`,
                zIndex: 2,
                width: { xs: 72, sm: 88 },
                p: { xs: "6px", sm: "8px" },
                bgcolor: "#e8dfc8",
                borderRadius: "4px",
                boxShadow: "5px 10px 20px rgba(0,0,0,0.6)",
                border: "1px solid #c4b595",
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
                "&:hover": {
                  transform: `rotate(${pos.rotation}deg) scale(1.08)`,
                  zIndex: 5,
                  boxShadow: "6px 14px 28px rgba(0,0,0,0.7)",
                },
              }}
            >
              <Box
                ref={(el: HTMLDivElement | null) => {
                  if (el) {
                    pinRefs.current.set(clue.id, el);
                  } else {
                    pinRefs.current.delete(clue.id);
                  }
                }}
                sx={{
                  position: "absolute",
                  top: -(PIN_SIZE / 2),
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: PIN_SIZE,
                  height: PIN_SIZE,
                  pointerEvents: "none",
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: { xs: 56, sm: 72 },
                  bgcolor: "#dfd3b6",
                  borderRadius: "4px",
                  border: "1px solid #c8b998",
                  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.12)",
                  p: 1.5,
                  mb: 1.5,
                }}
              >
                <Box
                  component="img"
                  src={`/assets/collectibles/${clue.id}.png`}
                  alt={clue.name}
                  sx={{
                    width: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 },
                    objectFit: "contain",
                    filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.3))",
                  }}
                />
              </Box>

              <Box
                sx={{
                  textAlign: "center",
                  bgcolor: "#3a352e",
                  borderRadius: "4px",
                  px: "3px",
                  py: "2px",
                  border: "1px solid #26221d",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: "#e5d5b7",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {clue.name}
                </Typography>
              </Box>
            </Box>
          );
        })}

        {connections.length > 0 && (
          <Box
            component="svg"
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {connections.map((conn, index) => {
              const start = pinPositions[conn.fromId];
              const end = pinPositions[conn.toId];
              if (!start || !end) return null;
              return (
                <Box
                  component="line"
                  key={index}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={WIRE_COLOR}
                  strokeWidth={3}
                  sx={{
                    opacity: 0.85,
                    filter: "drop-shadow(2px 3px 4px rgba(0,0,0,0.9))",
                  }}
                />
              );
            })}
          </Box>
        )}

        {/* Visible pins layer — rendered after SVG so they sit on top */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 15,
          }}
        >
          {clues.map((clue) => {
            const pos = pinPositions[clue.id];
            if (!pos) return null;
            return (
              <Box
                key={clue.id}
                sx={{
                  position: "absolute",
                  left: pos.x - PIN_SIZE / 2,
                  top: pos.y - PIN_SIZE / 2,
                  width: PIN_SIZE,
                  height: PIN_SIZE,
                  borderRadius: "50%",
                  bgcolor: "#dc2626",
                  backgroundImage:
                    "linear-gradient(135deg, #ef4444 0%, #dc2626 40%, #7f1d1d 100%)",
                  border: "1px solid #450a0a",
                  boxShadow: "2px 3px 5px rgba(0,0,0,0.8)",
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Inspect panel */}
      {selectedClue && (
        <Box
          data-inspect-panel="true"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedClueId(null);
          }}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: UI_LAYERS.FULLSCREEN + 1,
            bgcolor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: "relative",
              width: "min(420px, 92vw)",
              bgcolor: "#e8dfc8",
              borderRadius: `${GAME_UI_TOKENS.radius.panel}px`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
              border: "8px solid #c4b595",
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {/* Close button */}
            <Box
              onClick={(e) => {
                e.stopPropagation();
                setSelectedClueId(null);
              }}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: "#3a352e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                "&:hover": { bgcolor: "#555" },
                zIndex: 3,
              }}
            >
              <Typography
                sx={{
                  color: "#e5d5b7",
                  fontSize: "14px",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                x
              </Typography>
            </Box>

            {/* Image */}
            <Box
              sx={{
                width: 180,
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#dfd3b6",
                borderRadius: "4px",
                border: "2px solid #c8b998",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.15)",
                p: 2,
              }}
            >
              <Box
                component="img"
                src={`/assets/collectibles/${selectedClue.id}.png`}
                alt={selectedClue.name}
                sx={{
                  width: 140,
                  height: 140,
                  objectFit: "contain",
                  filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.3))",
                }}
              />
            </Box>

            {/* Title */}
            <Typography
              sx={{
                fontFamily: "'Jockey One', sans-serif",
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "#3a352e",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {selectedClue.metadata?.title || selectedClue.name}
            </Typography>

            {/* Medium */}
            {selectedClue.educational?.medium && (
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  color: "#5a4e3a",
                  textAlign: "center",
                  fontStyle: "italic",
                }}
              >
                Material: {selectedClue.educational.medium}
              </Typography>
            )}

            {/* Description */}
            {selectedClue.educational?.description && (
              <Box
                sx={{
                  bgcolor: "#3a352e",
                  borderRadius: "8px",
                  px: 2,
                  py: 1.5,
                  width: "100%",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    color: "#e5d5b7",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {selectedClue.educational.description}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
