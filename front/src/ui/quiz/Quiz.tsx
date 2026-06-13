"use client";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Button, Card, Grid, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventBus } from "@/shared/events/event-bus";
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
  label: string;
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
    variant === "gold"
      ? selected
        ? "#D9AD56"
        : "#B88932"
      : selected
        ? "#666666"
        : "#999999";

  return (
    <Button
      disableElevation
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      sx={{
        height: 65,
        px: 8,
        borderRadius: 1,
        bgcolor: bgColor,
        fontFamily: "'Inter', sans-serif",
        color: "#000000",
        fontSize: "1.5rem",
        fontWeight: 700,
        textTransform: "none",
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
  const retryQuiz = useGameUIStore((s) => s.retryQuiz);

  const [selectedNavIndex, setSelectedNavIndex] = useState(1);

  const currentQuestion = quiz.questions[quiz.currentQuestionIndex];
  const isPerformance = quiz.phase === "performance";

  const scorePercentage = useMemo(() => {
    if (isPerformance) {
      const total = quiz.questions.length;
      return total > 0 ? Math.round((quiz.score / total) * 100) : 0;
    }
    return quiz.questions.length > 0
      ? Math.round((quiz.score / quiz.questions.length) * 100)
      : 0;
  }, [isPerformance, quiz.score, quiz.questions.length]);

  const isRetryMode = scorePercentage < 70;

  const starTexture = useMemo(() => {
    if (scorePercentage === 100) return "star_full";
    if (scorePercentage >= 75) return "star_three_quarter";
    if (scorePercentage >= 50) return "star_two_quarter";
    if (scorePercentage >= 25) return "star_one_quarter";
    return "star_full";
  }, [scorePercentage]);

  const performanceBorderColor = isRetryMode ? "#FFFFFF" : "#D9AD56";
  const performanceHintColor = isRetryMode ? "#FFFFFF" : "#D9AD56";

  const performanceTitle = useMemo(() => {
    if (scorePercentage < 25) return "Essa não";
    if (scorePercentage < 70) return "Por pouco!";
    return "Parabéns!";
  }, [scorePercentage]);

  const performanceSubTitle = useMemo(() => {
    if (scorePercentage < 25) return "Pontuação baixa";
    if (scorePercentage < 70) return "Pontuação baixa";
    if (scorePercentage < 100) return "Boa pontuação";
    return "Pontuação perfeita!";
  }, [scorePercentage]);

  const performanceMessage = useMemo(() => {
    if (scorePercentage < 25) return "Tente novamente";
    if (scorePercentage < 70) return "Com mais atenção, você consegue!";
    if (scorePercentage < 100) return "Muito bom!";
    return "Gabaritou!";
  }, [scorePercentage]);

  const performanceHint = useMemo(() => {
    if (scorePercentage >= 70 && scorePercentage <= 100) {
      return "Você já pode encarar o próximo nível!";
    }
    return "Sua pontuação não foi o suficiente. Mas não desista!";
  }, [scorePercentage]);

  const activateSelectedNav = useCallback(() => {
    if (selectedNavIndex === 0) {
      EventBus.emit("quiz:close", undefined);
    } else if (isRetryMode) {
      retryQuiz();
    } else {
      window.open(
        "https://docs.google.com/forms/d/1ryU02vG6R_J8AHz7xysroiGOmP7fUsXkSLVolSCOBy0/edit",
        "_blank",
      );
    }
  }, [selectedNavIndex, isRetryMode, retryQuiz]);

  useEffect(() => {
    if (isPerformance) {
      setSelectedNavIndex(1);
    }
  }, [isPerformance]);

  useEffect(() => {
    if (!quiz.isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!quiz.isVisible) return;

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
          selectOption();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    quiz.isVisible,
    quiz.isProcessingAnswer,
    isPerformance,
    moveSelection,
    selectOption,
    activateSelectedNav,
  ]);

  useEffect(() => {
    if (quiz.isVisible && cardRef.current) {
      cardRef.current.focus();
    }
  }, [quiz.isVisible]);

  if (!quiz.isVisible || (!currentQuestion && !isPerformance)) return null;

  const progressStates: ProgressState[] = quiz.questions.map((_, i) => {
    if (i < quiz.currentQuestionIndex) {
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

  const currentAnswer = quiz.isProcessingAnswer
    ? (quiz.answers[quiz.currentQuestionIndex] ?? undefined)
    : undefined;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        bgcolor: "rgba(0,0,0,0.6)",
        pointerEvents: "auto",
      }}
    >
      <Card
        ref={cardRef}
        tabIndex={-1}
        elevation={0}
        sx={{
          width: 939,
          height: 715,
          mx: "auto",
          p: 4,
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
            px: 4,
            py: 1.5,
            mb: 6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 4,
            boxShadow: "inset 0 4px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          {/* QuizPanel - scoreText + questionCounterText */}
          <Stack spacing={-1.5} sx={{ alignItems: "start", width: 220 }}>
            <Typography
              sx={{
                fontFamily: "'Jockey One', sans-serif",
                color: "#D9AD56",
                fontSize: "2.5rem",
                fontWeight: 700,
              }}
            >
              {isPerformance ? performanceTitle : `Pontos: ${scorePercentage}%`}
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Jockey One', sans-serif",
                color: "#ffffff",
                fontSize: "1.8rem",
                fontWeight: 500,
              }}
            >
              {isPerformance
                ? performanceSubTitle
                : `Pergunta ${quiz.currentQuestionIndex + 1}/${quiz.questions.length}`}
            </Typography>
          </Stack>

          {/* QuizPanel - progressTracker */}
          <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              {progressStates.map((state, index) => (
                <ProgressStep key={index} state={state} />
              ))}
            </Stack>
          </Box>
        </Box>

        <Box sx={{ px: 4, flex: 1 }}>
          {isPerformance ? (
            /* PERFORMANCE CONTENT */
            <Stack
              sx={{
                alignItems: "center",
                height: "100%",
              }}
            >
              <Box
                sx={{
                  border: `4px solid ${performanceBorderColor}`,
                  borderRadius: 1.5,
                  p: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  width: "85%",
                  height: 370,
                }}
              >
                <Box
                  sx={{ position: "relative", width: 170, height: 170, mt: 3 }}
                >
                  {scorePercentage < 100 && (
                    <Box
                      component="img"
                      src="/assets/ui/stars/star_full.png"
                      sx={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        filter: "grayscale(1) brightness(0.12)",
                      }}
                    />
                  )}
                  {scorePercentage >= 25 && (
                    <Box
                      component="img"
                      src={`/assets/ui/stars/${starTexture}.png`}
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  )}
                </Box>
                <Typography
                  sx={{
                    fontFamily: "'Jockey One', sans-serif",
                    color: "#D9AD56",
                    fontSize: "3rem",
                    fontWeight: 700,
                    mt: 1,
                    mb: 4,
                  }}
                >
                  {performanceMessage}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    color: performanceHintColor,
                    fontSize: "1.125rem",
                    fontStyle: "italic",
                    mt: "auto",
                  }}
                >
                  {performanceHint}
                </Typography>
              </Box>
            </Stack>
          ) : (
            /* QUESTIONING CONTENT */
            <>
              {/* QUESTION */}
              <Stack spacing={3} sx={{ mb: 4, alignItems: "start" }}>
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
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    color: "#ffffff",
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
                {options.map((option, index) => (
                  <Grid key={index} size={{ xs: 12, md: 6 }}>
                    <AnswerButton
                      label={option}
                      selected={selectedOptionIndex === index}
                      feedback={
                        selectedOptionIndex === index
                          ? currentAnswer
                          : undefined
                      }
                      onClick={() => {
                        if (!quiz.isProcessingAnswer) {
                          const store = useGameUIStore.getState();
                          store.moveSelection(
                            (index >= 2 ? 1 : 0) -
                              (store.quiz.selectedOptionIndex >= 2 ? 1 : 0),
                            0,
                          );
                          store.moveSelection(
                            0,
                            (index % 2) - (store.quiz.selectedOptionIndex % 2),
                          );
                          store.selectOption();
                        }
                      }}
                      onMouseEnter={() => {
                        if (!quiz.isProcessingAnswer) {
                          const store = useGameUIStore.getState();
                          store.moveSelection(
                            (index >= 2 ? 1 : 0) -
                              (store.quiz.selectedOptionIndex >= 2 ? 1 : 0),
                            0,
                          );
                          store.moveSelection(
                            0,
                            (index % 2) - (store.quiz.selectedOptionIndex % 2),
                          );
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>

        {/* FOOTER */}
        {isPerformance ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 3,
              px: 4,
              mb: 0.5,
            }}
          >
            <PerformanceNavButton
              label="Voltar ao mapa"
              selected={selectedNavIndex === 0}
              variant="dark"
              onClick={() => EventBus.emit("quiz:close", undefined)}
              onMouseEnter={() => setSelectedNavIndex(0)}
            />
            <PerformanceNavButton
              label={isRetryMode ? "Tentar novamente" : "Dê sua opinião"}
              selected={selectedNavIndex === 1}
              variant="gold"
              onClick={activateSelectedNav}
              onMouseEnter={() => setSelectedNavIndex(1)}
            />
          </Box>
        ) : (
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
              Utilize as teclas WASD ou as setas do teclado para selecionar.
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
}
