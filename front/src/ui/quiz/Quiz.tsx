"use client";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Button, Card, Grid, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
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
  onClick: () => void;
}

function AnswerButton({ label, selected = false, onClick }: AnswerButtonProps) {
  return (
    <Button
      fullWidth
      disableElevation
      onClick={onClick}
      sx={{
        height: 72,
        borderRadius: 0,
        bgcolor: selected ? "#B88932" : "#D6AF58",
        color: selected ? "#111111" : "#FFFFFF",
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
        "&:hover": {
          bgcolor: selected ? "#B88932" : "#C89E4B",
        },
      }}
    >
      {label}
    </Button>
  );
}

export default function QuizPanel() {
  const cardRef = useRef<HTMLDivElement>(null);

  const quiz = useGameUIStore((s) => s.quiz);
  const selectedOptionIndex = quiz.selectedOptionIndex;
  const moveSelection = useGameUIStore((s) => s.moveSelection);
  const selectOption = useGameUIStore((s) => s.selectOption);

  const currentQuestion = quiz.questions[quiz.currentQuestionIndex];

  useEffect(() => {
    if (!quiz.isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!quiz.isVisible) return;
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
  }, [quiz.isVisible, quiz.isProcessingAnswer, moveSelection, selectOption]);

  useEffect(() => {
    if (quiz.isVisible && cardRef.current) {
      cardRef.current.focus();
    }
  }, [quiz.isVisible]);

  if (!quiz.isVisible || !currentQuestion) return null;

  const scorePercentage =
    quiz.questions.length > 0
      ? Math.round((quiz.score / quiz.questions.length) * 100)
      : 0;

  const progressStates: ProgressState[] = quiz.questions.map((_, i) => {
    if (i < quiz.currentQuestionIndex) {
      const answer = quiz.answers[i];
      if (answer === "correct") return "success";
      if (answer === "wrong") return "error";
    }
    if (i === quiz.currentQuestionIndex) return "current";
    return "future";
  });

  const options = currentQuestion.options.slice(0, 4);

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
          maxWidth: 839,
          maxHeight: 643,
          mx: "auto",
          p: 4,
          borderRadius: 4,
          bgcolor: "#222624",
          outline: "none",
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            bgcolor: "#1B1B1B",
            borderRadius: 3,
            px: 4,
            py: 3,
            mb: 6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 4,
          }}
        >
          {/* QuizPanel - scoreText + questionCounterText */}
          <Stack spacing={0.5} sx={{ alignItems: "start" }}>
            <Typography
              sx={{
                color: "#D9AD56",
                fontSize: "2rem",
                fontWeight: 700,
              }}
            >
              Pontos: {scorePercentage}%
            </Typography>
            <Typography
              sx={{
                color: "#F2EEE4",
                fontSize: "1.3rem",
                fontWeight: 600,
              }}
            >
              Pergunta {quiz.currentQuestionIndex + 1}/{quiz.questions.length}
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

        <Box sx={{ px: 3 }}>
          {/* QUESTION */}
          {/* QuizPanel - questionTitle */}
          <Stack spacing={3} sx={{ mb: 4, alignItems: "start" }}>
            <Typography
              sx={{
                color: "#D9AD56",
                fontSize: "2rem",
                fontWeight: 700,
              }}
            >
              Pergunta {quiz.currentQuestionIndex + 1}
            </Typography>

            {/* QuizPanel - questionText */}
            <Typography
              sx={{
                color: "#D9AD56",
                fontSize: "1.3rem",
                lineHeight: 1.3,
                textAlign: "start",
              }}
            >
              {currentQuestion.question}
            </Typography>
          </Stack>

          {/* ANSWERS */}
          {/* QuizPanel - optionButtons */}
          <Grid container rowSpacing={4} columnSpacing={2} sx={{ mb: 4.5 }}>
            {options.map((option, index) => (
              <Grid key={index} size={{ xs: 12, md: 6 }}>
                <AnswerButton
                  label={option}
                  selected={selectedOptionIndex === index}
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
                />
              </Grid>
            ))}
          </Grid>

          {/* FOOTER */}
          {/* QuizPanel - footerHintText */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
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
                color: "#F2EEE4",
                fontSize: "1.25rem",
              }}
            >
              Utilize as teclas WASD ou as setas do teclado para selecionar.
            </Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
