/**
 * Feature Flags
 *
 * Toggle these constants to enable/disable in-development features.
 * Flip to `true` locally or in staging to test flows end-to-end before
 * the feature ships to production.
 */

/**
 * When `true`, completing level 01 sends the player back to the map where
 * level 02 is now selectable, skipping the "interest / notify-me" dialog.
 *
 * Set to `false` in production until level 02 is ready to launch.
 */
export const LEVEL_02_ENABLED = false;
