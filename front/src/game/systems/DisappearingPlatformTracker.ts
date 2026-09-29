export interface DisappearingPlatformConfig {
  /** Milliseconds the player must stand on the tile before it starts fading. */
  delay: number;
  /** Milliseconds for the tile's alpha to go from 1 to 0 once fading starts, and
   * symmetrically from 0 to 1 while respawning. */
  fadeDuration: number;
  /** Milliseconds after the tile is fully gone before it starts respawning. 0 disables respawn. */
  respawnDelay: number;
}

export interface TileAlphaUpdate {
  key: string;
  alpha: number;
  collidable: boolean;
}

type TileState =
  | { phase: "pending"; standAt: number }
  | { phase: "fading"; fadeStart: number }
  | { phase: "gone"; goneAt: number }
  | { phase: "respawning"; respawnStart: number };

/**
 * Framework-agnostic per-tile state machine for disappearing platforms.
 * Driven by explicit timestamps so it can be unit tested without a Phaser scene;
 * the caller is responsible for applying returned updates to actual tiles.
 */
export class DisappearingPlatformTracker {
  private readonly tiles = new Map<string, TileState>();

  constructor(private readonly config: DisappearingPlatformConfig) {}

  /** Record that the player is standing on tile `key` at time `now`. Ignored if already tracked. */
  onStand(key: string, now: number): void {
    if (this.tiles.has(key)) return;
    this.tiles.set(key, { phase: "pending", standAt: now });
  }

  /** Advance all tracked tiles to `now`, returning the tiles whose alpha/collision changed. */
  update(now: number): TileAlphaUpdate[] {
    const updates: TileAlphaUpdate[] = [];

    for (const [key, state] of this.tiles) {
      switch (state.phase) {
        case "pending":
          if (now - state.standAt >= this.config.delay) {
            this.tiles.set(key, { phase: "fading", fadeStart: now });
          }
          break;

        case "fading": {
          if (this.config.fadeDuration <= 0) {
            this.tiles.set(key, { phase: "gone", goneAt: now });
            updates.push({ key, alpha: 0, collidable: false });
            break;
          }

          const t = Math.min(
            1,
            (now - state.fadeStart) / this.config.fadeDuration,
          );

          if (t >= 1) {
            this.tiles.set(key, { phase: "gone", goneAt: now });
            updates.push({ key, alpha: 0, collidable: false });
          } else {
            updates.push({ key, alpha: 1 - t, collidable: true });
          }
          break;
        }

        case "gone":
          if (
            this.config.respawnDelay > 0 &&
            now - state.goneAt >= this.config.respawnDelay
          ) {
            if (this.config.fadeDuration <= 0) {
              this.tiles.delete(key);
              updates.push({ key, alpha: 1, collidable: true });
            } else {
              this.tiles.set(key, { phase: "respawning", respawnStart: now });
              updates.push({ key, alpha: 0, collidable: true });
            }
          }
          break;

        case "respawning": {
          const t = Math.min(
            1,
            (now - state.respawnStart) / this.config.fadeDuration,
          );

          if (t >= 1) {
            this.tiles.delete(key);
            updates.push({ key, alpha: 1, collidable: true });
          } else {
            updates.push({ key, alpha: t, collidable: true });
          }
          break;
        }
      }
    }

    return updates;
  }
}
