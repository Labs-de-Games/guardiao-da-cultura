import { AUTO, Game, Scale, type Types } from "phaser";
import { LayoutConfig } from "./constants/LayoutConfig";
import { Game as MainGame } from "./scenes/Game";
import { InvestigationScene } from "./scenes/InvestigationScene";
import { LevelCinematic } from "./scenes/LevelCinematic";
import { MapIntroScene } from "./scenes/MapIntroScene";
import { UIScene } from "./scenes/UIScene";

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const baseConfig: Types.Core.GameConfig = {
  type: AUTO,
  width: LayoutConfig.GAME.WIDTH,
  height: LayoutConfig.GAME.HEIGHT,
  parent: "game-container",
  backgroundColor: "#000000",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      tileBias: 64, // Prevents "tunneling" (passing through tiles) at high speeds
    },
  },
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  // Phaser's LightsManager defaults to 10 and silently drops the
  // farthest-from-camera lights beyond that cap. Levels combine light
  // bars, chandeliers and spotlights that can exceed 10 at once (e.g.
  // inhotim: 8 light bars + 9 chandeliers), so raise the ceiling
  // with headroom above the highest current per-level light count.
  render: { maxLights: 32 },
};

// Phaser boots the first scene in the list: the game always enters through
// the world map.
const scenes = [
  MapIntroScene,
  LevelCinematic,
  MainGame,
  UIScene,
  InvestigationScene,
];

const StartGame = (parent: string, userId: string, isGuest = false) => {
  const game = new Game({ ...baseConfig, parent, scene: scenes });
  if (userId) {
    game.registry.set("userId", userId);
  }
  game.registry.set("isGuest", isGuest);
  return game;
};

export default StartGame;
