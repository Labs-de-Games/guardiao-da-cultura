import type {
  AudioAssetDefinition,
  GlobalAudioManifest,
  LevelAudioManifest,
} from "./types";

/**
 * Global sound effects used across all levels.
 * These are preloaded at game start.
 *
 * Supports both single sounds (AudioAssetConfig) and sound pools (AudioPoolConfig).
 * Pools play a random variation each time, useful for avoiding repetition.
 */
export const GLOBAL_SFX: AudioAssetDefinition[] = [
  // Clue interaction
  {
    key: "sfx.clue.inspect",
    paths: [
      "sound/sfx/clue.inspect_1.mp3",
      "sound/sfx/clue.inspect_2.mp3",
      "sound/sfx/clue.inspect_3.mp3",
      "sound/sfx/clue.inspect_4.mp3",
      "sound/sfx/clue.inspect_5.mp3",
      "sound/sfx/clue.inspect_6.mp3",
      "sound/sfx/clue.inspect_7.mp3",
    ],
    avoidRepeat: true,
  },
  // Object manipulation
  {
    key: "sfx.object.drag_loop",
    path: "sound/sfx/object.drag_loop.mp3",
    loop: true,
  },
  {
    key: "sfx.object.drop",
    paths: [
      "sound/sfx/object.drop_1.mp3",
      "sound/sfx/object.drop_2.mp3",
      "sound/sfx/object.drop_3.mp3",
      "sound/sfx/object.drop_4.mp3",
      "sound/sfx/object.drop_5.mp3",
    ],
    avoidRepeat: true,
  },
  {
    key: "sfx.ladder.drop",
    path: "sound/sfx/object.drop_1.mp3",
  },
  // Player movement
  {
    key: "sfx.player.footstep",
    path: "sound/sfx/player.footstep.ogg",
    loop: true,
  },
  {
    key: "sfx.player.climb",
    path: "sound/sfx/player.climb.mp3",
    loop: true,
  },
  { key: "sfx.player.jump", path: "sound/sfx/player.jump.wav" },
  { key: "sfx.player.land", path: "sound/sfx/player.land.wav" },
  // Rat
  { key: "sfx.rat.squeak", path: "sound/sfx/rat.squeak.mp3" },
  { key: "sfx.rat.flee", path: "sound/sfx/rat.flee.mp3" },
  // Magnifying glass
  { key: "sfx.magnifying.up", path: "sound/sfx/magnifying.up.mp3" },
  { key: "sfx.magnifying.down", path: "sound/sfx/magnifying.down.mp3" },
  // UI feedback
  { key: "sfx.ui.click", path: "sound/sfx/placeholder.mp3" },
  { key: "sfx.ui.hover", path: "sound/sfx/placeholder.mp3" },
  { key: "sfx.ui.modal_open", path: "sound/sfx/placeholder.mp3" },
  { key: "sfx.ui.modal_close", path: "sound/sfx/placeholder.mp3" },
  // Puzzle/quiz
  { key: "sfx.puzzle.success", path: "sound/sfx/puzzle.succeed.ogg" },
  { key: "sfx.puzzle.failure", path: "sound/sfx/puzzle.error.mp3" },
  // Camera/flash
  { key: "sfx.camera.click", path: "sound/sfx/camera.click.wav" },
  // Closing the case
  { key: "sfx.police.siren", path: "sound/sfx/police-siren.mp3" },
  // Rewards
  { key: "sfx.badge.unlock", path: "sound/sfx/badge.unlock.mp3" },
  { key: "sfx.level.complete", path: "sound/sfx/puzzle.succeed.ogg" },
  { key: "sfx.star.earned", path: "sound/sfx/star_sound.mp3" },
  { key: "sfx.object.drop", path: "sound/sfx/object.drop_5.mp3" },
  // Switches
  { key: "sfx.switch", path: "sound/sfx/switch.ogg" },
  { key: "sfx.light_bar.fix", path: "sound/sfx/light_bar_fix.ogg" },
  // Genius sequence minigame notes
  { key: "sfx.genius.green", path: "sound/notes/C3.wav" },
  { key: "sfx.genius.red", path: "sound/notes/D3.wav" },
  { key: "sfx.genius.yellow", path: "sound/notes/E3.wav" },
  { key: "sfx.genius.blue", path: "sound/notes/F3.wav" },
];

/**
 * Global audio manifest.
 */
export const GLOBAL_AUDIO_MANIFEST: GlobalAudioManifest = {
  sfx: GLOBAL_SFX,
  menuMusic: { key: "music.menu", path: "sound/music/menu.mp3", loop: true },
};

/**
 * Level-specific audio manifests.
 * Each level can define its own background music.
 */
export const LEVEL_AUDIO_MANIFESTS: Record<string, LevelAudioManifest> = {
  level_01: {
    levelId: "level_01",
    musicIntroLoop: {
      intro: {
        key: "music.level_1.intro",
        path: "sound/music/level_1.mp3",
        loop: false,
      },
      loop: {
        key: "music.level_1.loop",
        path: "sound/music/level_1_loop.mp3",
        loop: true,
      },
    },
  },
  level_02: {
    levelId: "level_02",
    music: {
      key: "music.level_2.main",
      path: "sound/music/level_2.mp3",
      loop: true,
    },
  },
  level_03: {
    levelId: "level_03",
    music: {
      key: "music.level_3.main",
      path: "sound/music/level_3_cricket.ogg",
      loop: true,
    },
    // Instrument stems for the band mechanic. All start muted at level load
    // and are unlocked in place as each band member is confirmed, so they
    // stay phase-locked to the same shared timeline.
    musicLayers: [
      {
        key: "music.level_3.layer.zabumba",
        path: "sound/music/level_3_zabumba.ogg",
        loop: true,
      },
      {
        key: "music.level_3.layer.accordion",
        path: "sound/music/level_3_accordion.ogg",
        loop: true,
      },
      {
        key: "music.level_3.layer.triangle",
        path: "sound/music/level_3_triangle.ogg",
        loop: true,
      },
      {
        key: "music.level_3.layer.jam_block",
        path: "sound/music/level_3_jam_block.ogg",
        loop: true,
      },
    ],
  },
};

/**
 * Get the audio manifest for a specific level.
 */
export function getLevelAudioManifest(
  levelId: string,
): LevelAudioManifest | undefined {
  return LEVEL_AUDIO_MANIFESTS[levelId];
}

/**
 * Get all audio assets that should be preloaded globally.
 */
export function getGlobalAudioAssets(): AudioAssetDefinition[] {
  const assets = [...GLOBAL_AUDIO_MANIFEST.sfx];
  if (GLOBAL_AUDIO_MANIFEST.menuMusic) {
    assets.push(GLOBAL_AUDIO_MANIFEST.menuMusic);
  }
  return assets;
}

/**
 * Get all audio assets for a specific level.
 */
export function getLevelAudioAssets(levelId: string): AudioAssetDefinition[] {
  const manifest = getLevelAudioManifest(levelId);
  if (!manifest) return [];

  const assets: AudioAssetDefinition[] = [];
  if (manifest.music) {
    assets.push(manifest.music);
  }
  if (manifest.musicLayers) {
    assets.push(...manifest.musicLayers);
  }
  if (manifest.sfx) {
    assets.push(...manifest.sfx);
  }
  return assets;
}
