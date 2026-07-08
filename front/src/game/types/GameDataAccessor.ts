import type { ContentJson } from "./GameDataTypes";

/**
 * Lightweight interface for accessing game content data.
 * Handlers depend on this instead of the full Game class,
 * keeping coupling minimal and enabling easy mocking in tests.
 */
export interface GameDataAccessor {
  getWorks(): ContentJson["works"];
  getMessages(): ContentJson["messages"];
  getCollectibles(): ContentJson["collectibles"];
}
