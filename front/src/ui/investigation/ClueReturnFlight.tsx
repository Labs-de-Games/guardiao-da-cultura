"use client";

import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** How long a clue takes to travel from its slot back to the rail. */
export const RETURN_FLIGHT_MS = 420;

/** A rectangle in viewport coordinates — the shape `getBoundingClientRect` gives. */
export interface FlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ClueFlight {
  clueKey: string;
  src: string;
  from: FlightRect;
  to: FlightRect;
}

const rectStyle = (r: FlightRect) => ({
  left: r.left,
  top: r.top,
  width: r.width,
  height: r.height,
});

/**
 * Clues flying from the board back to the rail after a wrong accusation.
 *
 * A wrong name costs the whole board, and a board that simply blanked would
 * read as a bug. Watching each clue travel home — and land on a row whose
 * hearts are full again — is what turns the reset into a rule the player can
 * see, so this runs in the gap between dismissing the alibi and playing on.
 *
 * Portalled to the body: the rail and the room both clip their overflow, and a
 * flight crosses between them.
 */
export function ClueReturnFlight({
  flights,
  onDone,
}: {
  flights: ClueFlight[];
  onDone: () => void;
}) {
  // Two renders on purpose: the first pins each clue to the slot it left, the
  // second hands it its destination and lets the transition do the travelling.
  const [airborne, setAirborne] = useState(false);

  useEffect(() => {
    if (flights.length === 0) {
      setAirborne(false);
      return;
    }
    const frame = requestAnimationFrame(() => setAirborne(true));
    const timer = window.setTimeout(onDone, RETURN_FLIGHT_MS);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [flights, onDone]);

  if (flights.length === 0 || typeof document === "undefined") return null;

  return createPortal(
    <Box
      aria-hidden="true"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2400,
        pointerEvents: "none",
      }}
    >
      {flights.map((flight) => (
        <Box
          key={flight.clueKey}
          component="img"
          src={flight.src}
          alt=""
          sx={{
            position: "fixed",
            objectFit: "contain",
            imageRendering: "pixelated",
            transition: `all ${RETURN_FLIGHT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            ...rectStyle(airborne ? flight.to : flight.from),
            // Fades only at the very end, so the clue is legible for most of
            // the trip and the rail row it lands on takes over cleanly.
            opacity: airborne ? 0.25 : 1,
          }}
        />
      ))}
    </Box>,
    document.body,
  );
}

const toRect = (el: Element): FlightRect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/**
 * Where every clue currently on the board would have to travel to get home.
 *
 * Read straight off the DOM rather than from the store, because what matters is
 * the pixels the player is looking at — and it has to be measured before the
 * board clears. Returns nothing when the player asked for less motion.
 */
export function measureClueReturn(
  srcForKey: (clueKey: string) => string | null,
): ClueFlight[] {
  if (typeof document === "undefined") return [];
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
    return [];

  const thumbs = new Map<string, Element>();
  for (const el of document.querySelectorAll("[data-clue-thumb]")) {
    const key = (el as HTMLElement).dataset.clueThumb;
    if (key) thumbs.set(key, el);
  }

  const flights: ClueFlight[] = [];
  for (const el of document.querySelectorAll(
    "[data-clue-slot][data-clue-key]",
  )) {
    const clueKey = (el as HTMLElement).dataset.clueKey;
    const target = clueKey ? thumbs.get(clueKey) : undefined;
    const src = clueKey ? srcForKey(clueKey) : null;
    if (!clueKey || !target || !src) continue;
    const from = toRect(el);
    const to = toRect(target);
    // Nothing to animate between two points with no size — an element that is
    // hidden, or a layout that was never measured.
    if (from.width === 0 || to.width === 0) continue;
    flights.push({ clueKey, src, from, to });
  }
  return flights;
}
