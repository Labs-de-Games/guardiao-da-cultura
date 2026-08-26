/**
 * Credits Screen Constants
 *
 * Timing and layout values for the continuous credits crawl.
 */

// ────────────────────────────────────────────────────────────────────
// SCROLL TIMING
// ────────────────────────────────────────────────────────────────────
export const SCROLL_SPEED_PX_PER_SEC = 60; // how fast the crawl moves upward
export const SCROLL_LEAD_IN_MS = 600; // pause before the crawl starts moving

// ────────────────────────────────────────────────────────────────────
// LAYOUT
// ────────────────────────────────────────────────────────────────────
export const CREDITS_COLUMN_WIDTH = 640; // px, max width of the text column
export const SECTION_GAP = 56; // px, vertical gap between sections
export const ENTRY_GAP = 10; // px, vertical gap between entries within a section

// ────────────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ────────────────────────────────────────────────────────────────────
export const CREDITS_TITLE_FONT = '"Jockey One", sans-serif';
export const CREDITS_TITLE_SIZE = 44;
export const CREDITS_HEADING_SIZE = 22;
export const CREDITS_BODY_FONT = '"Inter", sans-serif';
export const CREDITS_BODY_SIZE = 16;
export const CREDITS_LICENSE_SIZE = 13;

// ────────────────────────────────────────────────────────────────────
// EASING
// ────────────────────────────────────────────────────────────────────
export const EASE_CRAWL = "linear";
