import { AUTO, Game, Scale, type Types } from "phaser";
import { Game as MainGame } from "./scenes/Game";
import { LevelCinematic } from "./scenes/LevelCinematic";
import { MapIntro } from "./scenes/MapIntro";
import { UIScene } from "./scenes/UIScene";

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 1920,
  height: 1080,
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
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [MapIntro, LevelCinematic, MainGame, UIScene],
};

const StartGame = (parent: string, userId: string, isGuest = false) => {
  const game = new Game({ ...config, parent });
  if (userId) {
    game.registry.set("userId", userId);
  }
  game.registry.set("isGuest", isGuest);
  return game;
};

export default StartGame;
