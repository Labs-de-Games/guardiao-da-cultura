"use client";

import { keyframes } from "@emotion/react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { CostumeMechanicHandler } from "@/game/mechanics/handlers/CostumeMechanicHandler";
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

// Build carousel items from shuffled costume parts (computed once at module load)
function buildCarouselItems(
  partType: "head" | "torso" | "feet",
): Array<{ id: string; src: string; label: string }> {
  return CostumeMechanicHandler.getShuffledCostumeParts(partType).map((p) => ({
    id: p.id,
    src: `/assets/artworks/costumes/${p.textureKey}.png`,
    label: p.name.charAt(0).toUpperCase() + p.name.slice(1),
  }));
}

const HEAD_CAROUSEL_ITEMS = buildCarouselItems("head");
const TORSO_CAROUSEL_ITEMS = buildCarouselItems("torso");
const FEET_CAROUSEL_ITEMS = buildCarouselItems("feet");

const PART_SIZES = {
  head: { width: "35%", height: "auto", mt: 8, mb: 0 },
  torso: { width: "60%", height: "auto", mt: 0, mb: 0 },
  feet: { width: "42%", height: "auto", mt: 0, mb: 4 },
};

interface CarouselState {
  selectedIndex: number;
  isRejecting: boolean;
  isLocked: boolean;
}

// Fades non-centered slides; steeper factor since only 3 slides are visible at once
const TWEEN_FACTOR_BASE = 0.85;
const TWEEN_MIN_OPACITY = 0.15;

const numberWithinRange = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Continuously tweens slide opacity based on distance from the carousel center
function useSlideOpacityEffect(
  emblaApi: ReturnType<typeof useEmblaCarousel>[1],
) {
  const tweenFactor = useRef(0);

  const setTweenFactor = useCallback((api: NonNullable<typeof emblaApi>) => {
    tweenFactor.current = TWEEN_FACTOR_BASE * api.scrollSnapList().length;
  }, []);

  const setSlideOpacity = useCallback((api: NonNullable<typeof emblaApi>) => {
    const engine = api.internalEngine();
    const scrollProgress = api.scrollProgress();
    const slidesInView = api.slidesInView();

    api.scrollSnapList().forEach((scrollSnap, snapIndex) => {
      let diffToTarget = scrollSnap - scrollProgress;
      const slidesInSnap = engine.slideRegistry[snapIndex];

      slidesInSnap.forEach((slideIndex) => {
        if (!slidesInView.includes(slideIndex)) return;

        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((loopItem) => {
            const target = loopItem.target();
            if (slideIndex === loopItem.index && target !== 0) {
              const sign = Math.sign(target);
              if (sign === -1) diffToTarget = scrollSnap - (1 + scrollProgress);
              if (sign === 1) diffToTarget = scrollSnap + (1 - scrollProgress);
            }
          });
        }

        const tweenValue = 1 - Math.abs(diffToTarget * tweenFactor.current);
        const opacity = numberWithinRange(tweenValue, TWEEN_MIN_OPACITY, 1);
        const node = api.slideNodes()[slideIndex];
        if (node) node.style.opacity = opacity.toString();
      });
    });
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    setTweenFactor(emblaApi);
    setSlideOpacity(emblaApi);

    emblaApi
      .on("reInit", setTweenFactor)
      .on("reInit", setSlideOpacity)
      .on("scroll", setSlideOpacity)
      .on("slideFocus", setSlideOpacity)
      .on("slidesInView", setSlideOpacity);

    return () => {
      emblaApi
        .off("reInit", setTweenFactor)
        .off("reInit", setSlideOpacity)
        .off("scroll", setSlideOpacity)
        .off("slideFocus", setSlideOpacity)
        .off("slidesInView", setSlideOpacity);
    };
  }, [emblaApi, setTweenFactor, setSlideOpacity]);
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
      if (!partId) return 0; // Defaults to the dummy slide
      const parts = CostumeMechanicHandler.getShuffledCostumeParts(partType);
      const index = parts.findIndex((p) => p.id === partId);
      return index >= 0 ? index : 0;
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

  const [focusedPart, setFocusedPart] = useState<"head" | "torso" | "feet">(
    "head",
  );

  const [confirmFocused, setConfirmFocused] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Embla carousel refs - configured for 3 visible items
  const [headEmblaRef, headEmblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
  });
  const [torsoEmblaRef, torsoEmblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
  });
  const [feetEmblaRef, feetEmblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
  });

  useSlideOpacityEffect(headEmblaApi);
  useSlideOpacityEffect(torsoEmblaApi);
  useSlideOpacityEffect(feetEmblaApi);

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

  // Handle carousel selection change — just tracks scroll position while
  // unlocked; correctness is only evaluated on Confirmar (see handleConfirm)
  const handleSelect = useCallback(
    (partType: "head" | "torso" | "feet", index: number) => {
      if (carouselStates[partType].isLocked) return;

      setCarouselStates((prev) => ({
        ...prev,
        [partType]: { ...prev[partType], selectedIndex: index },
      }));
    },
    [carouselStates],
  );

  // Setup carousel event listeners
  useEffect(() => {
    if (!headEmblaApi) return;

    const onSelect = () => {
      const index = headEmblaApi.selectedScrollSnap();
      if (index !== carouselStates.head.selectedIndex) {
        handleSelect("head", index);
        setFocusedPart("head");
        setConfirmFocused(false);
        confirmButtonRef.current?.blur();
      }
    };

    const onPointerDown = () => {
      setFocusedPart("head");
      setConfirmFocused(false);
      confirmButtonRef.current?.blur();
    };

    headEmblaApi.on("select", onSelect);
    headEmblaApi.on("pointerDown", onPointerDown);
    return () => {
      headEmblaApi.off("select", onSelect);
      headEmblaApi.off("pointerDown", onPointerDown);
    };
  }, [
    headEmblaApi,
    carouselStates.head.selectedIndex,
    handleSelect,
    setFocusedPart,
    setConfirmFocused,
    confirmButtonRef,
  ]);

  useEffect(() => {
    if (!torsoEmblaApi) return;

    const onSelect = () => {
      const index = torsoEmblaApi.selectedScrollSnap();
      if (index !== carouselStates.torso.selectedIndex) {
        handleSelect("torso", index);
        setFocusedPart("torso");
        setConfirmFocused(false);
        confirmButtonRef.current?.blur();
      }
    };

    const onPointerDown = () => {
      setFocusedPart("torso");
      setConfirmFocused(false);
      confirmButtonRef.current?.blur();
    };

    torsoEmblaApi.on("select", onSelect);
    torsoEmblaApi.on("pointerDown", onPointerDown);
    return () => {
      torsoEmblaApi.off("select", onSelect);
      torsoEmblaApi.off("pointerDown", onPointerDown);
    };
  }, [
    torsoEmblaApi,
    carouselStates.torso.selectedIndex,
    handleSelect,
    setFocusedPart,
    setConfirmFocused,
    confirmButtonRef,
  ]);

  useEffect(() => {
    if (!feetEmblaApi) return;

    const onSelect = () => {
      const index = feetEmblaApi.selectedScrollSnap();
      if (index !== carouselStates.feet.selectedIndex) {
        handleSelect("feet", index);
        setFocusedPart("feet");
        setConfirmFocused(false);
        confirmButtonRef.current?.blur();
      }
    };

    const onPointerDown = () => {
      setFocusedPart("feet");
      setConfirmFocused(false);
      confirmButtonRef.current?.blur();
    };

    feetEmblaApi.on("select", onSelect);
    feetEmblaApi.on("pointerDown", onPointerDown);
    return () => {
      feetEmblaApi.off("select", onSelect);
      feetEmblaApi.off("pointerDown", onPointerDown);
    };
  }, [
    feetEmblaApi,
    carouselStates.feet.selectedIndex,
    handleSelect,
    setFocusedPart,
    setConfirmFocused,
    confirmButtonRef,
  ]);

  // Handle confirm button — evaluates each not-yet-locked carousel
  // independently; correct ones lock in place, wrong ones shake and stay
  // editable for another attempt. Closes/confirms once all 3 are locked.
  const handleConfirm = () => {
    const partTypes: ("head" | "torso" | "feet")[] = ["head", "torso", "feet"];
    const nextStates = { ...carouselStates };
    let allLocked = true;

    for (const partType of partTypes) {
      const current = carouselStates[partType];
      if (current.isLocked) continue;

      const shuffledParts =
        CostumeMechanicHandler.getShuffledCostumeParts(partType);
      const selectedPart = shuffledParts[current.selectedIndex] ?? null;
      const isCorrect = selectedPart
        ? CostumeMechanicHandler.isCorrectPart(selectedPart.id, correctCostume)
        : false;

      if (isCorrect && selectedPart) {
        nextStates[partType] = {
          ...current,
          isLocked: true,
          isRejecting: false,
        };

        EventBus.emit("ui:costume-part-selected", {
          instanceId,
          partType,
          partId: selectedPart.id,
          isCorrect: true,
          isLocked: true,
        });
      } else {
        allLocked = false;
        nextStates[partType] = { ...current, isRejecting: true };

        EventBus.emit("ui:costume-part-rejected", {
          instanceId,
          partType,
          partId: selectedPart?.id ?? null,
          reason: selectedPart ? "wrong_costume" : "empty",
        });
      }
    }

    setCarouselStates(nextStates);

    // Clear rejection shake only on carousels that were just rejected
    setTimeout(() => {
      setCarouselStates((prev) => {
        const cleared = { ...prev };
        for (const partType of partTypes) {
          if (!nextStates[partType].isLocked) {
            cleared[partType] = { ...cleared[partType], isRejecting: false };
          }
        }
        return cleared;
      });
    }, 400);

    if (allLocked) {
      const equippedParts = {
        head:
          CostumeMechanicHandler.getShuffledCostumeParts("head")[
            nextStates.head.selectedIndex
          ]?.id ?? null,
        torso:
          CostumeMechanicHandler.getShuffledCostumeParts("torso")[
            nextStates.torso.selectedIndex
          ]?.id ?? null,
        feet:
          CostumeMechanicHandler.getShuffledCostumeParts("feet")[
            nextStates.feet.selectedIndex
          ]?.id ?? null,
      };

      EventBus.emit("ui:costume-confirm", {
        instanceId,
        equippedParts,
      });

      handleClose();
    }
  };

  // Handle close
  const handleClose = useCallback(() => {
    closeCostumeSelector();
    EventBus.emit("ui:costume-selector-close", undefined);
  }, [closeCostumeSelector]);

  // Handle keyboard navigation (ESC, WASD, Arrows)
  useEffect(() => {
    if (!costumeSelectorOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === "escape") {
        handleClose();
        return;
      }

      const apiMap = {
        head: headEmblaApi,
        torso: torsoEmblaApi,
        feet: feetEmblaApi,
      };

      const partOrder: ("head" | "torso" | "feet")[] = [
        "head",
        "torso",
        "feet",
      ];
      const currentIndex = partOrder.indexOf(focusedPart);

      // Enter/Space to activate confirm button
      if (key === "enter" || key === " ") {
        if (confirmFocused) {
          handleConfirm();
          e.preventDefault();
        }
        return;
      }

      // Up/Down navigation
      if (key === "arrowup" || key === "w") {
        if (confirmFocused) {
          setConfirmFocused(false);
          confirmButtonRef.current?.blur();
          e.preventDefault();
        } else if (currentIndex > 0) {
          setFocusedPart(partOrder[currentIndex - 1]);
          e.preventDefault();
        }
      } else if (key === "arrowdown" || key === "s") {
        if (confirmFocused) {
          e.preventDefault();
        } else if (focusedPart === "feet") {
          setConfirmFocused(true);
          confirmButtonRef.current?.focus();
          e.preventDefault();
        } else {
          setFocusedPart(partOrder[currentIndex + 1]);
          e.preventDefault();
        }
      }
      // Left/Right carousel navigation
      else if (key === "arrowleft" || key === "a") {
        if (!confirmFocused && !carouselStates[focusedPart].isLocked) {
          apiMap[focusedPart]?.scrollPrev();
          e.preventDefault();
        }
      } else if (key === "arrowright" || key === "d") {
        if (!confirmFocused && !carouselStates[focusedPart].isLocked) {
          apiMap[focusedPart]?.scrollNext();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    costumeSelectorOpen,
    handleClose,
    focusedPart,
    confirmFocused,
    confirmButtonRef,
    headEmblaApi,
    torsoEmblaApi,
    feetEmblaApi,
    carouselStates,
  ]);

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
    isFocused: boolean,
    // label: string,
  ) => {
    const state = carouselStates[partType];

    const borderColor = state.isRejecting
      ? LayoutConfig.COLORS.UNAVAILABLE_RED
      : isFocused
        ? LayoutConfig.COLORS.INFO_TITLE
        : LayoutConfig.COLORS.CHUNK_STROKE_EMPTY;

    // Select items array based on part type
    const carouselItems =
      partType === "head"
        ? HEAD_CAROUSEL_ITEMS
        : partType === "torso"
          ? TORSO_CAROUSEL_ITEMS
          : partType === "feet"
            ? FEET_CAROUSEL_ITEMS
            : GENERIC_CAROUSEL_ITEMS;

    return (
      <Box sx={{ mb: 0.2 }}>
        <Typography
          variant="subtitle1"
          sx={{
            color: LayoutConfig.COLORS.INFO_BODY,
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        >
          {/* {label} */}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Prev Button */}
          <IconButton
            onClick={() => handlePrev(emblaApi)}
            disabled={!emblaApi || state.isLocked}
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
              borderRadius: 2,
              outline: `1.1px solid ${borderColor}`,
              outlineOffset: 0,
              animation: state.isRejecting ? `${shake} 0.4s ease` : "none",
              opacity: state.isLocked ? 0.8 : 1,
              position: "relative",
            }}
          >
            <Box
              ref={emblaRef}
              sx={{
                overflow: "hidden",
                pointerEvents: state.isLocked ? "none" : undefined,
              }}
            >
              <Box sx={{ display: "flex" }}>
                {/* Carousel items */}
                {carouselItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      flex: "0 0 33.333%",
                      minWidth: 0,
                      height: 120,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "background.paper",
                      position: "relative",
                      transition: "opacity 0.15s ease-out",
                    }}
                  >
                    <Box
                      component="img"
                      src={item.src}
                      alt={item.label}
                      sx={{
                        width: PART_SIZES[partType].width,
                        height: PART_SIZES[partType].height,
                        objectFit: "contain",
                        imageRendering: "pixelated",
                        mt: PART_SIZES[partType].mt,
                        mb: PART_SIZES[partType].mb,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>

          {/* Next Button */}
          <IconButton
            onClick={() => handleNext(emblaApi)}
            disabled={!emblaApi || state.isLocked}
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

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: costumeSelectorOpen ? "flex" : "none",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(0, 0, 0, 0.7)",
        zIndex: LayoutConfig.UI.DEPTHS.INVENTORY,
        pointerEvents: costumeSelectorOpen ? "auto" : "none",
        p: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: "100%",
          maxWidth: 700,
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
        {renderCarousel(
          "head",
          headEmblaRef,
          headEmblaApi,
          focusedPart === "head" && !confirmFocused,
        )}
        {renderCarousel(
          "torso",
          torsoEmblaRef,
          torsoEmblaApi,
          focusedPart === "torso" && !confirmFocused,
        )}
        {renderCarousel(
          "feet",
          feetEmblaRef,
          feetEmblaApi,
          focusedPart === "feet" && !confirmFocused,
        )}

        {/* Confirm button */}
        <Button
          ref={confirmButtonRef}
          variant="contained"
          size="large"
          onClick={handleConfirm}
          sx={{
            mt: 2,
            mx: "auto",
            display: "block",
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
