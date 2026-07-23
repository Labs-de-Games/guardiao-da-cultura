/**
 * Intro Cinematic Constants
 *
 * Timing and layout values for the comic-style cinematic introduction.
 * These are the single source of truth for the cinematic behavior.
 */

// ────────────────────────────────────────────────────────────────────
// STAGE GEOMETRY (unscaled "design" pixels — the whole stage is then
// scaled to fit the viewport by `computeScale` below).
// ────────────────────────────────────────────────────────────────────
export const PANEL_FULL_WIDTH = 1024; // width of a panel while it is being revealed
export const PANEL_HEIGHT = 1024; // height of every panel
export const PANEL_GAP = 30; // horizontal space between shrunk panels in the final strip
export const CAPTION_HEIGHT = 280; // px reserved BELOW the panels for the caption box

// ────────────────────────────────────────────────────────────────────
// PIXEL EFFECT
// ────────────────────────────────────────────────────────────────────
export const BLOCK_SIZE = 8; // Size of each "pixel" block in the reveal/dissolve grid

// ────────────────────────────────────────────────────────────────────
// SEQUENCE TIMING
// ────────────────────────────────────────────────────────────────────
export const ROLL_DELAY_MS = 2000; // pause after the last panel finishes before the credits roll-up starts
export const ROLL_OUT_MS = 1400; // duration of each panel's upward roll + dissolve
export const ROLL_STAGGER_MS = 600; // delay between successive panels starting to roll up

// ────────────────────────────────────────────────────────────────────
// CAPTION TIMING
// ────────────────────────────────────────────────────────────────────
export const CAPTION_SHOW_DELAY_FRAC = 0.6; // fraction of the panel's revealMs to wait before showing caption
export const CAPTION_FADE_MS = 400; // duration of caption fade in/out

// ────────────────────────────────────────────────────────────────────
// CAPTION BOX STYLING
// ────────────────────────────────────────────────────────────────────
export const CAPTION_BG = "#000000";
export const CAPTION_BORDER = "2px solid #AF7E2F";
export const CAPTION_BORDER_RADIUS = "0 0 16px 16px";
export const CAPTION_PADDING = "26px 36px";

// Title styling
export const CAPTION_TITLE_FONT = '"Jockey One", system-ui, sans-serif';
export const CAPTION_TITLE_SIZE = 48;
export const CAPTION_TITLE_COLOR = "#D9AD56";
export const CAPTION_TITLE_LETTER_SPACING = "0.02em";
export const CAPTION_TITLE_MARGIN_BOTTOM = 12;

// Body styling
export const CAPTION_BODY_FONT = '"Inter", system-ui, sans-serif';
export const CAPTION_BODY_SIZE = 36;
export const CAPTION_BODY_COLOR = "#ffffff";
export const CAPTION_BODY_LINE_HEIGHT = 1.45;

// Image styling
export const CAPTION_IMAGE_WIDTH = "45%";
export const CAPTION_TEXT_COL_WIDTH = "60%";
export const CAPTION_IMAGE_MASK =
  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 40%, #000 70%)";

// ────────────────────────────────────────────────────────────────────
// EASING CURVES
// ────────────────────────────────────────────────────────────────────
export const EASE_SHRINK = "cubic-bezier(0.7, 0, 0.3, 1)";
export const EASE_ROLL = "cubic-bezier(0.4, 0, 0.2, 1)";
