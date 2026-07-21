"use client";

import { keyframes } from "@emotion/react";
import CheckIcon from "@mui/icons-material/Check";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import {
  COSTUME_PARTS,
  CostumeMechanicHandler,
} from "@/game/mechanics/handlers/CostumeMechanicHandler";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`;

// Generic carousel items for testing
const GENERIC_CAROUSEL_ITEMS = Array.from({ length: 5 }, (_, i) => ({
  id: `generic_${i + 1}`,
  src: "/assets/misc/rec.png",
  label: `Item ${i + 1}`,
}));

interface CarouselState {
  selectedIndex: number;
  isRejecting: boolean;
  isLocked: boolean;
}

export function CostumeSelectorPanel() {
  const { costumeSelectorOpen, costumeSelectorData, closeCostumeSelector } =
    useGameUIStore();

  const instanceId = costumeSelectorData?.instanceId ?? "";
  const correctCostume = costumeSelectorData?.correctCostume ?? "malandro";

  // Initialize carousel states from data
  const initialStates = useMemo(() => {
    const equipped = costumeSelectorData?.equippedParts ?? {
      head: null,
      torso: null,
      feet: null,
    };
    const locked = costumeSelectorData?.lockedParts ?? {
      head: false,
      torso: false,
      feet: false,
    };

    const getIndexForPart = (
      partType: "head" | "torso" | "feet",
      partId: string | null,
    ) => {
      if (!partId) return 0; // Empty slot
      const parts = COSTUME_PARTS[partType];
      const index = parts.findIndex((p) => p.id === partId);
      return index >= 0 ? index + 1 : 0;
    };

    return {
      head: {
        selectedIndex: getIndexForPart("head", equipped.head),
        isRejecting: false,
        isLocked: locked.head,
      },
      torso: {
        selectedIndex: getIndexForPart("torso", equipped.torso),
        isRejecting: false,
        isLocked: locked.torso,
      },
      feet: {
        selectedIndex: getIndexForPart("feet", equipped.feet),
        isRejecting: false,
        isLocked: locked.feet,
      },
    };
  }, [costumeSelectorData]);

  const [carouselStates, setCarouselStates] = useState<{
    head: CarouselState;
    torso: CarouselState;
    feet: CarouselState;
  }>(initialStates);

  // Embla carousel refs
  const [headEmblaRef, headEmblaApi] = useEmblaCarousel({ loop: true });
  const [torsoEmblaRef, torsoEmblaApi] = useEmblaCarousel({ loop: true });
  const [feetEmblaRef, feetEmblaApi] = useEmblaCarousel({ loop: true });

  // Pause game when panel opens
  useEffect(() => {
    if (!costumeSelectorOpen) return;

    EventBus.emit("game:pause-requested", { reason: "costume-selector" });

    return () => {
      EventBus.emit("game:resume-requested", { reason: "costume-selector" });
    };
  }, [costumeSelectorOpen]);

  // Sync carousel APIs with state
  useEffect(() => {
    if (headEmblaApi) {
      headEmblaApi.scrollTo(carouselStates.head.selectedIndex);
    }
  }, [headEmblaApi, carouselStates.head.selectedIndex]);

  useEffect(() => {
    if (torsoEmblaApi) {
      torsoEmblaApi.scrollTo(carouselStates.torso.selectedIndex);
    }
  }, [torsoEmblaApi, carouselStates.torso.selectedIndex]);

  useEffect(() => {
    if (feetEmblaApi) {
      feetEmblaApi.scrollTo(carouselStates.feet.selectedIndex);
    }
  }, [feetEmblaApi, carouselStates.feet.selectedIndex]);

  // Handle carousel selection change
  const handleSelect = useCallback(
    (partType: "head" | "torso" | "feet", index: number) => {
      const currentState = carouselStates[partType];

      // If already locked, don't allow changes
      if (currentState.isLocked) return;

      // Get selected part
      const parts = COSTUME_PARTS[partType];
      const selectedPart = index === 0 ? null : parts[index - 1];

      // Validate selection
      const isEmpty = selectedPart === null;
      const isCorrect = selectedPart
        ? CostumeMechanicHandler.isCorrectPart(selectedPart.id, partType)
        : false;

      if (isEmpty || !isCorrect) {
        // Error: empty slot or wrong costume part
        setCarouselStates((prev) => ({
          ...prev,
          [partType]: {
            ...prev[partType],
            isRejecting: true,
          },
        }));

        // Emit rejection event
        EventBus.emit("ui:costume-part-rejected", {
          instanceId,
          partType,
          partId: selectedPart?.id ?? null,
          reason: isEmpty ? "empty" : "wrong_costume",
        });

        // Clear rejection state after animation
        setTimeout(() => {
          setCarouselStates((prev) => ({
            ...prev,
            [partType]: {
              ...prev[partType],
              isRejecting: false,
            },
          }));
        }, 400);

        return;
      }

      // Correct selection: update state and lock
      setCarouselStates((prev) => ({
        ...prev,
        [partType]: {
          selectedIndex: index,
          isRejecting: false,
          isLocked: true,
        },
      }));

      // Emit selection event
      EventBus.emit("ui:costume-part-selected", {
        instanceId,
        partType,
        partId: selectedPart.id,
        isCorrect: true,
        isLocked: true,
      });
    },
    [carouselStates, instanceId],
  );

  // Setup carousel event listeners
  useEffect(() => {
    if (!headEmblaApi) return;

    const onSelect = () => {
      const index = headEmblaApi.selectedScrollSnap();
      if (index !== carouselStates.head.selectedIndex) {
        handleSelect("head", index);
      }
    };

    headEmblaApi.on("select", onSelect);
    return () => {
      headEmblaApi.off("select", onSelect);
    };
  }, [headEmblaApi, carouselStates.head.selectedIndex, handleSelect]);

  useEffect(() => {
    if (!torsoEmblaApi) return;

    const onSelect = () => {
      const index = torsoEmblaApi.selectedScrollSnap();
      if (index !== carouselStates.torso.selectedIndex) {
        handleSelect("torso", index);
      }
    };

    torsoEmblaApi.on("select", onSelect);
    return () => {
      torsoEmblaApi.off("select", onSelect);
    };
  }, [torsoEmblaApi, carouselStates.torso.selectedIndex, handleSelect]);

  useEffect(() => {
    if (!feetEmblaApi) return;

    const onSelect = () => {
      const index = feetEmblaApi.selectedScrollSnap();
      if (index !== carouselStates.feet.selectedIndex) {
        handleSelect("feet", index);
      }
    };

    feetEmblaApi.on("select", onSelect);
    return () => {
      feetEmblaApi.off("select", onSelect);
    };
  }, [feetEmblaApi, carouselStates.feet.selectedIndex, handleSelect]);

  // Handle confirm button
  const handleConfirm = () => {
    const equippedParts = {
      head:
        carouselStates.head.selectedIndex === 0
          ? null
          : (COSTUME_PARTS.head[carouselStates.head.selectedIndex - 1]?.id ??
            null),
      torso:
        carouselStates.torso.selectedIndex === 0
          ? null
          : (COSTUME_PARTS.torso[carouselStates.torso.selectedIndex - 1]?.id ??
            null),
      feet:
        carouselStates.feet.selectedIndex === 0
          ? null
          : (COSTUME_PARTS.feet[carouselStates.feet.selectedIndex - 1]?.id ??
            null),
    };

    // Check if all parts are correct
    const isAllCorrect =
      equippedParts.head?.startsWith(`${correctCostume}_`) &&
      equippedParts.torso?.startsWith(`${correctCostume}_`) &&
      equippedParts.feet?.startsWith(`${correctCostume}_`);

    if (isAllCorrect) {
      // Emit confirm event
      EventBus.emit("ui:costume-confirm", {
        instanceId,
        equippedParts,
      });

      // Close panel
      closeCostumeSelector();
    } else {
      // Error feedback on all carousels
      setCarouselStates((prev) => ({
        head: { ...prev.head, isRejecting: true },
        torso: { ...prev.torso, isRejecting: true },
        feet: { ...prev.feet, isRejecting: true },
      }));

      // Clear rejection state after animation
      setTimeout(() => {
        setCarouselStates((prev) => ({
          head: { ...prev.head, isRejecting: false },
          torso: { ...prev.torso, isRejecting: false },
          feet: { ...prev.feet, isRejecting: false },
        }));
      }, 400);
    }
  };

  // Handle close
  const handleClose = useCallback(() => {
    closeCostumeSelector();
    EventBus.emit("ui:costume-selector-close", undefined);
  }, [closeCostumeSelector]);

  // Handle ESC key
  useEffect(() => {
    if (!costumeSelectorOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [costumeSelectorOpen, handleClose]);

  // Navigation handlers
  const handlePrev = useCallback(
    (emblaApi: ReturnType<typeof useEmblaCarousel>[1]) => {
      if (emblaApi) emblaApi.scrollPrev();
    },
    [],
  );

  const handleNext = useCallback(
    (emblaApi: ReturnType<typeof useEmblaCarousel>[1]) => {
      if (emblaApi) emblaApi.scrollNext();
    },
    [],
  );

  // Render carousel for a part type
  const renderCarousel = (
    partType: "head" | "torso" | "feet",
    emblaRef: (instance: HTMLElement | null) => void,
    emblaApi: ReturnType<typeof useEmblaCarousel>[1],
    label: string,
  ) => {
    const state = carouselStates[partType];

    const borderColor = state.isRejecting
      ? LayoutConfig.COLORS.UNAVAILABLE_RED
      : state.isLocked
        ? LayoutConfig.COLORS.AVAILABLE_GREEN
        : LayoutConfig.COLORS.CHUNK_STROKE_EMPTY;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="subtitle1"
          sx={{
            mb: 1,
            color: LayoutConfig.COLORS.INFO_BODY,
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        >
          {label}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Prev Button */}
          <IconButton
            onClick={() => handlePrev(emblaApi)}
            disabled={!emblaApi}
            sx={{
              flexShrink: 0,
              color: LayoutConfig.COLORS.INFO_BODY,
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <Paper
            elevation={2}
            sx={{
              flex: 1,
              overflow: "hidden",
              border: `3px solid ${borderColor}`,
              borderRadius: 2,
              animation: state.isRejecting ? `${shake} 0.4s ease` : "none",
              opacity: state.isLocked ? 0.8 : 1,
              position: "relative",
            }}
          >
            <Box ref={emblaRef} sx={{ overflow: "hidden" }}>
              <Box sx={{ display: "flex" }}>
                {/* Generic items */}
                {GENERIC_CAROUSEL_ITEMS.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      flex: "0 0 100%",
                      minWidth: 0,
                      height: 120,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "background.paper",
                      position: "relative",
                    }}
                  >
                    <Box
                      component="img"
                      src={item.src}
                      alt={item.label}
                      sx={{
                        width: 60,
                        height: 60,
                        objectFit: "contain",
                        mb: 1,
                      }}
                    />
                    <Typography variant="caption" align="center">
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Lock indicator */}
            {state.isLocked && (
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  bgcolor: LayoutConfig.COLORS.AVAILABLE_GREEN,
                  borderRadius: "50%",
                  p: 0.5,
                }}
              >
                <CheckIcon sx={{ fontSize: 16, color: "white" }} />
              </Box>
            )}
          </Paper>

          {/* Next Button */}
          <IconButton
            onClick={() => handleNext(emblaApi)}
            disabled={!emblaApi}
            sx={{
              flexShrink: 0,
              color: LayoutConfig.COLORS.INFO_BODY,
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>
    );
  };

  if (!costumeSelectorOpen) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(0, 0, 0, 0.7)",
        zIndex: LayoutConfig.UI.DEPTHS.INVENTORY,
        p: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: "100%",
          maxWidth: 400,
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
          p: 3,
        }}
      >
        {/* Close button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Title */}
        <Typography
          variant="h5"
          sx={{
            mb: 3,
            textAlign: "center",
            fontWeight: 600,
            color: LayoutConfig.COLORS.INFO_TITLE,
          }}
        >
          Vista o Manequim
        </Typography>

        {/* Instructions */}
        <Typography
          variant="body2"
          sx={{
            mb: 3,
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          Escolha as peças corretas para vestir o manequim. Combine todas as
          partes do mesmo traje!
        </Typography>

        {/* Carousels */}
        {renderCarousel("head", headEmblaRef, headEmblaApi, "Cabeça")}
        {renderCarousel("torso", torsoEmblaRef, torsoEmblaApi, "Tronco")}
        {renderCarousel("feet", feetEmblaRef, feetEmblaApi, "Pés")}

        {/* Confirm button */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleConfirm}
          sx={{
            mt: 2,
            bgcolor: LayoutConfig.COLORS.INFO_TITLE,
            "&:hover": {
              bgcolor: LayoutConfig.COLORS.INFO_TITLE,
              opacity: 0.9,
            },
          }}
        >
          Confirmar
        </Button>
      </Paper>
    </Box>
  );
}
