/**
 * Where the identification screen sits on top of the room artwork.
 *
 * `investigation-room.png` is a 1536x1024 detective's office with a corkboard on
 * the wall, and the suspects are pinned to that board. The rectangles below were
 * measured off the art (the dark line just inside the wooden frame, and the
 * brass nameplate above it) and are expressed as percentages, so every layer
 * scales with the room instead of being pinned to one resolution.
 *
 * Conveniently, the board's centre falls at exactly 50% of the art's width, so
 * centring the room horizontally also centres the board.
 */
export const ROOM_ART = "/assets/misc/investigation-room.png";

export const ROOM_ASPECT = "1536 / 1024";

/** The cork surface, inside the frame. */
export const CORK = {
  left: "20.90%",
  top: "17.68%",
  width: "58.20%",
  height: "51.37%",
} as const;

/** The board's centre, as a fraction of the room's height. */
export const CORK_CENTRE_Y = "43.36%";

/** The brass plate above the board, which carries the screen's title. */
export const NAMEPLATE = {
  left: "40.69%",
  top: "11.72%",
  width: "18.88%",
  height: "6.05%",
} as const;

/**
 * The room, sized to cover its stage without ever being cropped more than it has
 * to be.
 *
 * `max()` of the two cover candidates is what `background-size: cover` does, but
 * on a real element — so the board can still be placed on it by percentage.
 * Sizing from width alone (the earlier version) made the room far taller than
 * the screen on a wide window and cropped everything but the cork.
 */
export const ROOM_COVER_WIDTH = "max(100cqw, calc(100cqh * 1.5))";

/**
 * Lifts the room so the board's centre sits at the stage's, clamped to the room's
 * own overflow so an edge is never exposed. Pair with `top: 50%`.
 */
export const ROOM_LIFT = `translateY(calc(0px - clamp(50cqh, ${CORK_CENTRE_Y}, 100% - 50cqh)))`;

/** The evidence rail's width. It takes this from the stage, so the room fits what is left. */
export const RAIL_WIDTH = { xs: 220, md: 280, lg: 320 };
