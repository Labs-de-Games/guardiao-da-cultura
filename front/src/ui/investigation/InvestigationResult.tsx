"use client";

import { Box, Typography } from "@mui/material";
import { INVESTIGATION_STARS_BY_WRONG_ATTEMPTS } from "@/game/constants/Investigation";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { SuspectPortrait } from "./SuspectPortrait";

const { colors, fonts, radius } = GAME_UI_TOKENS;

const GOLD_STAR = "/assets/ui/stars/gold_star.png";
const GRAY_STAR = "/assets/ui/stars/star_gray.png";
const MAX_STARS = INVESTIGATION_STARS_BY_WRONG_ATTEMPTS[0];

export function InvestigationResult() {
  const payload = useGameUIStore((s) => s.investigation.payload);
  const result = useGameUIStore((s) => s.investigation.result);
  const revealed = useGameUIStore((s) => s.investigation.revealed);
  const wrongAttempts = useGameUIStore((s) => s.investigation.wrongAttempts);
  const lastWrongSuspectId = useGameUIStore(
    (s) => s.investigation.lastWrongSuspectId,
  );

  // A run that ended on a wrong name owes the player that suspect's answer
  // first; this panel would otherwise name the real culprit over the top of it.
  if (!result || lastWrongSuspectId) return null;

  const culprit = payload?.suspects.find((s) => s.isCulprit);
  const previousStars = payload?.previousStars ?? 0;
  const improved = result.stars > previousStars;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        zIndex: 2,
      }}
    >
      <Box
        sx={{
          width: "min(560px, 100%)",
          maxHeight: "100%",
          overflowY: "auto",
          bgcolor: colors.bgSecondary,
          border: `2px solid ${colors.accentGoldMuted}`,
          borderRadius: `${radius.panel}px`,
          p: { xs: 2.5, md: 4 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: "2rem",
            color: colors.accentGold,
            lineHeight: 1.1,
          }}
        >
          {result.correct
            ? "Mandado de prisão emitido"
            : "Investigação encerrada"}
        </Typography>

        <Box sx={{ display: "flex", gap: 0.75 }}>
          {Array.from({ length: MAX_STARS }, (_, i) => (
            <Box
              key={i}
              component="img"
              src={i < result.stars ? GOLD_STAR : GRAY_STAR}
              alt=""
              aria-hidden="true"
              sx={{ width: 32, height: 30, objectFit: "contain" }}
            />
          ))}
        </Box>
        <Typography
          role="img"
          aria-label={`${result.stars} de ${MAX_STARS} estrelas`}
          sx={{ fontSize: "0.8rem", color: colors.textSecondary, mt: -1.5 }}
        >
          {result.stars} de {MAX_STARS} estrelas
          {wrongAttempts > 0 &&
            ` · ${wrongAttempts} ${wrongAttempts === 1 ? "acusação errada" : "acusações erradas"}`}
        </Typography>

        {culprit && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              textAlign: "left",
              width: "100%",
              bgcolor: colors.bgPrimary,
              borderRadius: `${radius.small}px`,
              p: 2,
            }}
          >
            <SuspectPortrait suspect={culprit} size={72} />
            <Box>
              <Typography
                sx={{
                  fontFamily: fonts.display,
                  fontSize: "1.2rem",
                  color: colors.accentGold,
                  lineHeight: 1.2,
                }}
              >
                {culprit.name}
              </Typography>
              <Typography
                sx={{ fontSize: "0.8rem", color: colors.textSecondary }}
              >
                {culprit.role}
              </Typography>
            </Box>
          </Box>
        )}

        <Typography
          sx={{
            fontSize: "0.9rem",
            color: colors.textPrimary,
            lineHeight: 1.6,
          }}
        >
          {revealed
            ? "As tentativas acabaram. O responsável é Augusto Vale — as pistas apontavam para alguém com domínio técnico de conservação, e só ele reunia todas as marcas que encontramos."
            : "Era ele. Augusto Vale não queria destruir o acervo: queria reorganizá-lo para provar um ponto. Você leu as pistas e chegou lá."}
        </Typography>

        {improved ? (
          <Typography sx={{ fontSize: "0.8rem", color: colors.accentGold }}>
            {previousStars > 0
              ? `Você melhorou seu resultado anterior de ${previousStars} para ${result.stars} estrelas.`
              : "Resultado registrado no mapa."}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: "0.8rem", color: colors.textSecondary }}>
            Seu melhor resultado continua sendo {previousStars} estrelas. Volte
            quando quiser para tentar de novo.
          </Typography>
        )}

        <Box
          component="button"
          type="button"
          onClick={() => EventBus.emit("investigation:outro", undefined)}
          sx={{
            mt: 1,
            px: 3,
            py: 1.25,
            cursor: "pointer",
            border: "none",
            borderRadius: `${radius.small}px`,
            bgcolor: colors.accentGold,
            color: colors.bgPrimary,
            fontFamily: fonts.display,
            fontSize: "1rem",
            "&:hover": { bgcolor: colors.accentGoldHover },
          }}
        >
          VER DESFECHO
        </Box>
      </Box>
    </Box>
  );
}
