# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).
See [VERSIONING.md](./VERSIONING.md) for the release process and branching model.

## [1.7.0] - 2026-07-24

### Added

- Audio system: `AudioManager` with movement sounds, jump, land, climb, and drop SFX
- Voice selection to `AudioAccessibilityService` with language code mapping
- PostHog gameplay analytics: landing page, game home, map pin, spacebar start, minigame started/completed, quiz answer submitted, intermediate quiz started, quiz started, game load success/failed
- PostHog web vitals and dead clicks capture
- `UI_LAYERS` design token constant for z-index hierarchy
- Star display on `MapInfoBox`
- Standard painting and sculpture placeholder textures
- Collectibles persistence: `saveCollectibles` API, `POST /scores/:userId/collectibles` backend endpoint
- Player movement sound effects
- Gameplay analytics events documentation

### Changed

- Migrated all UI panels to `UI_LAYERS` tokens (ScorePanel, Sidebar, DialoguePanel, LabelPanel, ControlsPanel, ConfirmationPanel, BadgeGalleryPanel, ChunkSelectorPanel, Quiz, InterestDialog, ToastNotification)
- Removed deprecated `UI_DEPTHS` and unused `UI_Z_INDEX` entries
- Removed redundant double-mount in `GameOverlay`

### Fixed

- Misleading cursor and tint on sculpture/painting hover
- Misleading `game_load_failed` events on normal startup
- Duplicate `StartGame` call causing intro to replay mid-game
- `EventBus.off` killing `useEventBridge` listener
- Floor/quiz numbering order corrected to sculptures, paintings, photo
- `minigame_started` triggered on first item interaction instead of drop/pickup
- Phaser `destroy` DOM removal conflict by passing `false`
- Collected clues destroyed and Pistas panel synced on reload
- Collectibles saved on collection via `PersistenceBridge`
- Voice names mapped to language codes in TTS route
- Painting placeholder scales normalized in museum-mvp map
- `secret_clues_collected` reset on scene create
- Badge `changedata` listener registered after initialize completes
- Badge toast removed from intro and map screens
- Player sounds guarded against missing audio assets

### Removed

- Old per-artwork placeholder textures
- Obsolete `UI_DEPTHS` and unused `UI_Z_INDEX` entries

### Tests

- AudioManager, Player sound, AudioAccessibilityService, useAudioAccessibility, MapInfoBox star display, QuizManager, TTS synthesize route, ToastNotification, ScorePanel

### Chore

- Added `RESPONSIVEVOICE_API_KEY` to Docker and compose files

## [1.6.1] - 2026-07-24

### Fixed

- Chunk selector inventory visibility and scrollability (#571) — re-applied as a hotfix after a merge-base collision between `master` and `develop` silently dropped it during the v1.5.0 release

## [1.6.0] - 2026-07-20

### Added

- Google Ads conversion measurement tag (gtag.js) on the root layout

## [1.5.0] - 2026-07-16

### Added

- Moving platforms with inertia effect on jump (level 2)
- Portal teleportation mechanic with rotation and fade-out animations
- Per-level loading screens with custom backgrounds
- Map pin tooltip for selected location
- Coyote time to improve jump responsiveness
- Level 2 assets, map, and configuration
- ScoreManager unit tests

### Changed

- Scoring refactor: collectible scoring removed, quarter-based system adopted
- Loading screen redesigned as level-agnostic with per-level backgrounds
- Map phase entered on second click of selected pin

### Fixed

- Chunk selector inventory visibility and scrollability
- Quiz answer appearing pre-selected
- Blue flash before loading screen
- Collectible sprite hidden after collection
- Sidebar objectives reordered to match stage progression
- Quiz selection persistence

### Removed

- `collectibleScore` column dropped from `user_score` table (migration)
- Collectible scoring types and aggregate from frontend and backend
- Unused quiz metadata types from backend events

### Database

- `DropCollectibleScoreColumn` — removes `collectibleScore` jsonb column from `user_score`

## [1.4.1] - 2026-07-13

### Fixed

- Dead `shakePhotoFailure` call removed from `PhotoMechanicHandler`
- Error sound added on photo chunk rejection
- Art placement rejected on already-filled placeholders

## [1.4.0] - 2026-07-09

### Added

- Intermediate quiz flow: full question set, nine new questions added (#438, #499)
- Proximity-based hint key prompts (#488)
- Photo placeholder redesigned as a 2x2 chunk grid with confirm-then-feedback flow (#487, #524)
- Decoupled cinematic intro scene; panels can be skipped without skipping the cinematic (#494, #512)
- `DialoguePanel` redesigned with speech-bubble shape and dynamic positioning (#474)
- `MapInfoBox` card redesign (#517)
- Camera shake feedback on player errors (#523)
- Spotlight beam and succeed sound on minigame success (#535)
- Star progress bar in `ScorePanel`, scoring engine fixes (#538)
- Close ("x") button added to labels, label font size adjusted (#526)

### Fixed

- Score/progression PostHog events moved to frontend (#491)
- Early platforms on phase 1 made easier for onboarding (#497)
- Audio (TTS) buttons disabled until the accessibility module lands (#500)
- `PhaseInfoCard` no longer hidden by marker reset in sidebar (#510)
- Player freeze on ESC during intermediate quiz dialog (#521)
- `analyticsSystem` initialization order corrected in Game scene (#533)
- Intermediate quiz text adapted so the player has a basis for the answer (#529)
- Intermediate quiz quarter reward doubled from +1 to +2

### Changed

- Level asset loading made modular (#513)
- `Game` scene modularized for multi-level readiness (#520)

### Chore

- Level 2 assets and configuration added (#530)

## [1.3.0] - 2026-07-02

### Added

- `DialoguePanel` redesigned with speech-bubble shape and dynamic positioning relative to the speaking NPC (#474)
- `ConfirmationPanel` extracted as an independent component with keyboard navigation, dimming backdrop, and Figma-aligned styling (#474)
- Nine new intermediate questions added to level 01 content (#499)

### Fixed

- Audio (text-to-speech) buttons temporarily disabled on quiz and label panels until the accessibility module lands (#500)

## [1.2.0] - 2026-07-02

### Added

- Intermediate quizzes: full scoring, migrations, and progression flow (#438)
- Cinematic intro decoupled from game loading (#494)
- Photo placeholder redesigned as a 2x2 chunk grid (#487)
- Hint key with proximity-based prompts (#488)
- Client-driven progression: `user_progress` computation moved to the frontend (#484)
- Quiz result screen redesign (#477)
- `LabelPanel` redesign with MUI Pagination and Figma spec, including TTS icon (#462)
- `ScorePanel` — new score HUD component (#481)
- Text accessibility: 144-character page limit (#464)
- Easier early platforms on phase 1 + player spawn position fix (#497)

### Fixed

- Score/progression PostHog events moved to the frontend (#491)

### Changed

- Removed `COLLECT` and `CLUE_NEXT` collectible types, keeping only `CLUE_VILLAIN` (#472)

### Database

- `RemoveNonVillainCollectibleTypes`
- `AddIntermediateQuizResultsToUserProgress`
- `AddIntermediateQuizScoreToUserScore`

## [1.1.0] - 2026-06-24

### Added

- Migrated the Chunk Selector UI from Phaser to React (`ChunkSelectorPanel.tsx`), improving styling, extensibility, and maintainability
- Integrated `@dnd-kit/core` to support native, accessible drag-and-drop mechanics in the React chunk inventory grid
- Modularized the chunk selection interface into clean React subcomponents (`DraggableInventoryItem`, `DroppableGridSlot`, `InventoryDropZone`)

### Removed

- Obsolete Phaser UI files (`BasePanel.ts` and `ChunkSelector.ts`)

### Changed

- Cleaned up remaining static hardcoded colors with layout configuration constants
