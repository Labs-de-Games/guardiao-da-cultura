"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StarIcon from "@mui/icons-material/Star";
import { Box, Button, Card, Grid, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QUIZ_PASS_THRESHOLD } from "@/game/constants/QuizConstants";
import { useAudioAccessibility } from "@/lib/audio";
import { EventBus } from "@/shared/events/event-bus";
import { useSound } from "@/ui/hooks/useSound";
import { UI_LAYERS } from "@/ui/theme/tokens";
import { useGameUIStore } from "../state/game-ui-store";

type ProgressState = "success" | "error" | "current" | "future";

interface ProgressStepProps {
  state: ProgressState;
}

function ProgressStep({ state }: ProgressStepProps) {
  const bgColor = {
    success: "#4CAF50",
    error: "#D97858",
    current: "#E0C16A",
    future: "#777777",
  }[state];

  return (
    <Box
      sx={{
        width: 38,
        height: 64,
        bgcolor: bgColor,
        clipPath:
          "polygon(25% 0%,75% 0%,75% 10%,100% 10%,100% 90%,75% 90%,75% 100%,25% 100%,25% 90%,0% 90%,0% 10%,25% 10%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {state === "success" && (
        <CheckIcon sx={{ color: "white", fontSize: 18 }} />
      )}
      {state === "error" && <CloseIcon sx={{ color: "white", fontSize: 18 }} />}
    </Box>
  );
}

interface AnswerButtonProps {
  label: string;
  selected?: boolean;
  feedback?: "correct" | "wrong";
  onClick: () => void;
  onMouseEnter: () => void;
}

interface PerformanceNavButtonProps {
  label: React.ReactNode;
  selected?: boolean;
  variant?: "dark" | "gold";
  onClick: () => void;
  onMouseEnter: () => void;
}

function PerformanceNavButton({
  label,
  selected = false,
  variant = "gold",
  onClick,
  onMouseEnter,
}: PerformanceNavButtonProps) {
  const bgColor =
    variant === "gold" ? (selected ? "#D9AD56" : "#B88932") : "#ffffff";

  return (
    <Button
      disableElevation
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      sx={{
        height: { xs: 50, md: 65 },
        px: { xs: 4, md: 8 },
        borderRadius: 1,
        bgcolor: bgColor,
        fontFamily: "'Inter', sans-serif",
        color: "#000000",
        fontSize: { xs: "1rem", md: "1.5rem" },
        fontWeight: 700,
        textTransform: "none",
        display: "flex",
        alignItems: "center",
        transform: selected ? "scale(1.05)" : "scale(1)",
        transition: "transform 0.15s ease",
      }}
    >
      {label}
    </Button>
  );
}

function AnswerButton({
  label,
  selected = false,
  feedback,
  onClick,
  onMouseEnter,
}: AnswerButtonProps) {
  const bgColor =
    feedback === "correct"
      ? "#4CAF50"
      : feedback === "wrong"
        ? "#D97858"
        : selected
          ? "#B88932"
          : "#D6AF58";

  const textColor = feedback ? "#FFFFFF" : selected ? "#111111" : "#FFFFFF";

  return (
    <Button
      fullWidth
      disableElevation
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      sx={{
        height: 82,
        borderRadius: 0,
        bgcolor: bgColor,
        color: textColor,
        fontSize: "1.2rem",
        fontWeight: 700,
        textTransform: "none",
        clipPath: `
          polygon(
            5% 0%,
            95% 0%,
            95% 20%,
            100% 20%,
            100% 80%,
            95% 80%,
            95% 100%,
            5% 100%,
            5% 80%,
            0% 80%,
            0% 20%,
            5% 20%
          )
        `,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          transform: "translateX(-30px)",
        }}
      >
        {feedback === "correct" && (
          <CheckIcon sx={{ color: "#81C784", fontSize: 48, mr: 1 }} />
        )}
        {feedback === "wrong" && (
          <CloseIcon sx={{ color: "#FF6659", fontSize: 48, mr: 1 }} />
        )}
        {!feedback && (
          <CheckIcon sx={{ visibility: "hidden", fontSize: 48, mr: 1 }} />
        )}
        {label}
      </Box>
    </Button>
  );
}

export default function QuizPanel() {
  const cardRef = useRef<HTMLDivElement>(null);

  const quiz = useGameUIStore((s) => s.quiz);
  const selectedOptionIndex = quiz.selectedOptionIndex;
  const moveSelection = useGameUIStore((s) => s.moveSelection);
  const selectOption = useGameUIStore((s) => s.selectOption);
  const continueAfterReveal = useGameUIStore((s) => s.continueAfterReveal);
  const { speak } = useAudioAccessibility();
  const { playClick } = useSound();

  const [selectedNavIndex, setSelectedNavIndex] = useState(1);

  const currentQuestion = quiz.questions[quiz.currentQuestionIndex];
  const isPerformance = quiz.phase === "performance";
  const isIntermediate = quiz.isIntermediate;
  const starCount = useGameUIStore((s) => Math.floor(s.stars));

  const scorePercentage = useMemo(() => {
    const total = quiz.questions.length;
    return total > 0 ? Math.round((quiz.score / total) * 100) : 0;
  }, [quiz.score, quiz.questions.length]);

  const passPercentage = QUIZ_PASS_THRESHOLD * 100;
  const isRetryMode = scorePercentage < passPercentage;
  const isPerfectScore = scorePercentage === 100;

  const starAsset = isRetryMode ? "star_gray" : "gold_star";

  const performanceColor = isRetryMode ? "#FFFFFF" : "#D9AD56";

  const { headerTitle, headerSubTitle, performanceTitle, performanceMessage } =
    useMemo(() => {
      if (isIntermediate) {
        return {
          headerTitle: `Pontos: ${scorePercentage}%`,
          headerSubTitle:
            scorePercentage >= passPercentage
              ? "Boa pontuação"
              : "Pontuação baixa",
          performanceTitle:
            scorePercentage >= passPercentage
              ? "Parabéns!"
              : scorePercentage < 25
                ? "Essa não"
                : "Por pouco!",
          performanceSubTitle:
            scorePercentage >= passPercentage
              ? scorePercentage === 100
                ? "Pontuação perfeita!"
                : "Boa pontuação"
              : "Pontuação baixa",
          performanceMessage:
            scorePercentage >= passPercentage
              ? scorePercentage === 100
                ? "Gabaritou!"
                : "Muito bom!"
              : "Revise as placas das obras",
          performanceHint:
            scorePercentage >= passPercentage
              ? ""
              : "Leia com atenção as informações antes de continuar.",
        };
      }
      return {
        headerTitle:
          scorePercentage >= passPercentage
            ? "Parabéns!"
            : `Pontos: ${scorePercentage}%`,
        headerSubTitle:
          scorePercentage >= passPercentage
            ? scorePercentage === 100
              ? "Pontuação perfeita"
              : "Pontuação boa"
            : "Pontuação baixa",
        performanceTitle:
          scorePercentage < 25
            ? "Essa não"
            : scorePercentage < passPercentage
              ? "Por pouco!"
              : "Parabéns!",
        performanceSubTitle:
          scorePercentage < 25 || scorePercentage < passPercentage
            ? "Pontuação baixa"
            : scorePercentage < 100
              ? "Boa pontuação"
              : "Pontuação perfeita!",
        performanceMessage:
          scorePercentage < 25
            ? "Tente novamente"
            : scorePercentage < passPercentage
              ? "Com mais atenção, você consegue!"
              : scorePercentage < 100
                ? "Muito bom!"
                : "Gabaritou!",
        performanceHint:
          scorePercentage >= passPercentage
            ? "Você já pode encarar o próximo nível!"
            : "Sua pontuação não foi o suficiente. Mas não desista!",
      };
    }, [scorePercentage, isIntermediate]);

  const activateSelectedNav = useCallback(() => {
    if (selectedNavIndex === 0) {
      EventBus.emit("quiz:close", undefined);
    } else if (isRetryMode) {
      EventBus.emit("quiz:retry", undefined);
    } else {
      // UIScene decides: load the next level, or fall back to the
      // interest dialog when there is no next enabled level.
      EventBus.emit("quiz:next-level", undefined);
    }
  }, [selectedNavIndex, isRetryMode]);

  const handleSelectAnswer = useCallback(() => {
    playClick();
  }, [playClick]);

  useEffect(() => {
    if (isPerformance) {
      setSelectedNavIndex(1);
    }
  }, [isPerformance]);

  useEffect(() => {
    if (!quiz.isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!quiz.isVisible) return;
      if (document.querySelector('[data-interest-dialog="true"]')) return;

      if (isPerformance) {
        switch (e.key) {
          case "ArrowLeft":
          case "a":
          case "A":
            e.preventDefault();
            setSelectedNavIndex(0);
            break;
          case "ArrowRight":
          case "d":
          case "D":
            e.preventDefault();
            setSelectedNavIndex(1);
            break;
          case " ":
          case "Enter":
            e.preventDefault();
            activateSelectedNav();
            break;
        }
        return;
      }

      if (quiz.revealedAnswer) {
        switch (e.key) {
          case " ":
          case "Enter":
            e.preventDefault();
            playClick();
            continueAfterReveal();
            break;
        }
        return;
      }

      if (quiz.isProcessingAnswer) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          moveSelection(-1, 0);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          moveSelection(1, 0);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          moveSelection(0, -1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          moveSelection(0, 1);
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          playClick();
          selectOption();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    quiz.isVisible,
    quiz.isProcessingAnswer,
    quiz.revealedAnswer,
    isPerformance,
    moveSelection,
    selectOption,
    continueAfterReveal,
    playClick,
    activateSelectedNav,
  ]);

  useEffect(() => {
    if (quiz.isVisible && cardRef.current) {
      cardRef.current.focus();
    }
  }, [quiz.isVisible]);

  if (!quiz.isVisible || (!currentQuestion && !isPerformance)) return null;

  const progressStates: ProgressState[] = quiz.questions.map((_, i) => {
    if (i <= quiz.currentQuestionIndex) {
      const answer = quiz.answers[i];
      if (answer === "correct") return "success";
      if (answer === "wrong") return "error";
    }
    if (i === quiz.currentQuestionIndex && !isPerformance) return "current";
    if (isPerformance) {
      const answer = quiz.answers[i];
      if (answer === "correct") return "success";
      if (answer === "wrong") return "error";
      return "future";
    }
    return "future";
  });

  const options = currentQuestion?.options.slice(0, 4) ?? [];

  const currentAnswer = quiz.attemptFeedback ?? undefined;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: UI_LAYERS.FULLSCREEN,
        bgcolor: "rgba(0,0,0,0.6)",
        pointerEvents: "auto",
      }}
    >
      <Card
        ref={cardRef}
        tabIndex={-1}
        elevation={0}
        onClick={() => {
          if (quiz.revealedAnswer && !isPerformance) {
            playClick();
            continueAfterReveal();
          }
        }}
        sx={{
          width: 939,
          height: 715,
          mx: "auto",
          p: { xs: 2, md: 4 },
          borderRadius: 1.8,
          bgcolor: "#222624",
          outline: "none",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            bgcolor: "#1B1B1B",
            borderRadius: 1.8,
            px: { xs: 2, md: 4 },
            py: { xs: 1, md: 1.5 },
            mb: { xs: 3, md: 6 },
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 4,
            boxShadow: "inset 0 4px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          <Stack spacing={-1.5} sx={{ alignItems: "start", minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: "'Jockey One', sans-serif",
                color: "#D9AD56",
                fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                fontWeight: 700,
              }}
            >
              {isPerformance ? headerTitle : `Pontos: ${scorePercentage}%`}
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Jockey One', sans-serif",
                color: "#ffffff",
                fontSize: "clamp(1rem, 2vw, 1.8rem)",
                fontWeight: 500,
              }}
            >
              {isPerformance
                ? headerSubTitle
                : `Pergunta ${quiz.currentQuestionIndex + 1}/${quiz.questions.length}`}
            </Typography>
          </Stack>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "flex-end",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              {progressStates.map((state, index) => (
                <ProgressStep key={index} state={state} />
              ))}
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            px: { xs: 2, md: 4 },
            flex: 1,
            minHeight: 0,
          }}
        >
          {isPerformance ? (
            /* PERFORMANCE CONTENT */
            <Stack
              sx={{
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Box
                sx={{
                  border: `4px solid ${performanceColor}`,
                  borderRadius: 1.5,
                  p: { xs: 1.5, md: 2 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: { xs: 0.5, md: 0.5 },
                  width: "85%",
                }}
              >
                {/* STARS */}
                <Stack
                  direction="row"
                  spacing={
                    isRetryMode || isPerfectScore ? { xs: 0.5, md: 1 } : 0
                  }
                  sx={{
                    mt: 0,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {Array.from({ length: starCount }).map((_, i) => {
                    return (
                      <Box
                        key={i}
                        component="img"
                        src={`/assets/ui/stars/${starAsset}.png`}
                        sx={{
                          width: { xs: 56, md: 93 },
                          height: { xs: 53, md: 89 },
                          objectFit: "contain",
                        }}
                      />
                    );
                  })}
                </Stack>

                {/* TITLE */}
                <Typography
                  sx={{
                    fontFamily: "'Jockey One', sans-serif",
                    color: "#D9AD56",
                    fontSize: "clamp(1.5rem, 4vw, 3rem)",
                    fontWeight: 700,
                    mt: 0,
                    mb: { xs: 0.25, md: 0.5 },
                    textAlign: "center",
                  }}
                >
                  {performanceTitle}
                </Typography>

                {/* MESSAGE / SUBTITLE */}
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    color: performanceColor,
                    fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)",
                    fontStyle: isRetryMode ? "italic" : "normal",
                    textAlign: "center",
                    lineHeight: 1.4,
                    px: { xs: 1, md: 2 },
                  }}
                >
                  {performanceMessage}
                </Typography>
              </Box>

              {/* BUTTONS - outside the golden border */}
              <Stack
                direction="row"
                sx={{
                  mt: { xs: 2, md: 3 },
                  gap: { xs: 2, md: 3 },
                }}
              >
                <PerformanceNavButton
                  label={
                    <>
                      <ArrowBackIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Voltar ao mapa
                    </>
                  }
                  selected={selectedNavIndex === 0}
                  variant="dark"
                  onClick={() => EventBus.emit("quiz:close", undefined)}
                  onMouseEnter={() => setSelectedNavIndex(0)}
                />
                <PerformanceNavButton
                  label={
                    <>
                      <StarIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      {isRetryMode ? "Tentar novamente" : "Próxima fase"}
                    </>
                  }
                  selected={selectedNavIndex === 1}
                  variant="gold"
                  onClick={activateSelectedNav}
                  onMouseEnter={() => setSelectedNavIndex(1)}
                />
              </Stack>
            </Stack>
          ) : (
            /* QUESTIONING CONTENT */
            <>
              {/* QUESTION */}
              <Stack spacing={3} sx={{ mb: 4, alignItems: "start" }}>
                <Stack
                  direction="row"
                  spacing={4}
                  sx={{ alignItems: "center" }}
                >
                  <Button
                    disableElevation
                    className="ph-no-deadclick"
                    onClick={() =>
                      currentQuestion?.question &&
                      speak(currentQuestion.question)
                    }
                    sx={{
                      minWidth: 0,
                      p: 0.5,
                      borderRadius: 1,
                      "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                    }}
                  >
                    <Box
                      component="img"
                      src="/assets/ui/tts-icon.png"
                      sx={{ width: 32, height: 32, objectFit: "contain" }}
                    />
                  </Button>
                  <Typography
                    sx={{
                      fontFamily: "'Jockey One', sans-serif",
                      color: "#D9AD56",
                      fontSize: "2rem",
                      fontWeight: 700,
                    }}
                  >
                    Pergunta {quiz.currentQuestionIndex + 1}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    color: "#D9AD56",
                    fontSize: "1.25rem",
                    lineHeight: 1.3,
                    textAlign: "start",
                  }}
                >
                  {currentQuestion?.question}
                </Typography>
              </Stack>

              {/* ANSWERS */}
              <Grid container rowSpacing={4} columnSpacing={2} sx={{ mb: 4.5 }}>
                {options.map((option, index) => {
                  const isCorrectOption =
                    index === currentQuestion?.correctOptionIndex;

                  const selectAnswer = () => {
                    if (!quiz.isProcessingAnswer) {
                      handleSelectAnswer();
                      const store = useGameUIStore.getState();
                      const currentIndex = store.quiz.selectedOptionIndex ?? 0;
                      const currentRow = currentIndex >= 2 ? 1 : 0;
                      const targetRow = index >= 2 ? 1 : 0;
                      const currentCol = currentIndex % 2;
                      const targetCol = index % 2;
                      store.moveSelection(targetRow - currentRow, 0);
                      store.moveSelection(0, targetCol - currentCol);
                      store.selectOption();
                    }
                  };

                  const hoverHighlight = () => {
                    if (!quiz.isProcessingAnswer) {
                      const store = useGameUIStore.getState();
                      const currentIndex = store.quiz.selectedOptionIndex ?? 0;
                      const currentRow = currentIndex >= 2 ? 1 : 0;
                      const targetRow = index >= 2 ? 1 : 0;
                      const currentCol = currentIndex % 2;
                      const targetCol = index % 2;
                      store.moveSelection(targetRow - currentRow, 0);
                      store.moveSelection(0, targetCol - currentCol);
                    }
                  };
                  return (
                    <Grid key={index} size={{ xs: 12, md: 6 }}>
                      <AnswerButton
                        label={option}
                        selected={
                          selectedOptionIndex !== null &&
                          selectedOptionIndex === index
                        }
                        feedback={
                          quiz.revealedAnswer
                            ? isCorrectOption
                              ? "correct"
                              : selectedOptionIndex === index
                                ? "wrong"
                                : undefined
                            : selectedOptionIndex !== null &&
                                selectedOptionIndex === index
                              ? currentAnswer
                              : undefined
                        }
                        onClick={selectAnswer}
                        onMouseEnter={hoverHighlight}
                      />
                    </Grid>
                  );
                })}
              </Grid>

              {/* RETRY FEEDBACK */}
              {quiz.feedbackMessage && !quiz.revealedAnswer && (
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    color: "#E0C16A",
                    fontStyle: "italic",
                    fontSize: "1.25rem",
                    mt: 3,
                  }}
                >
                  {quiz.feedbackMessage}
                </Typography>
              )}

              {/* REVEAL: explanation for the correct answer */}
              {quiz.revealedAnswer && currentQuestion?.explanation && (
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    color: "#E0C16A",
                    fontStyle: "italic",
                    fontSize: "1.25rem",
                    mt: 3,
                  }}
                >
                  {currentQuestion.explanation}
                </Typography>
              )}
            </>
          )}
        </Box>

        {/* FOOTER - WASD hint (questioning only) */}
        {!isPerformance && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 4,
            }}
          >
            <PlayArrowRoundedIcon
              sx={{
                color: "#F2EEE4",
                fontSize: 48,
              }}
            />
            <Typography
              sx={{
                fontFamily: "'Inter', sans-serif",
                color: "#888888",
                fontSize: "1.125rem",
              }}
            >
              {quiz.revealedAnswer
                ? "Pressione ESPAÇO ou ENTER para continuar."
                : "Utilize as teclas WASD ou as setas do teclado para selecionar."}
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
}
