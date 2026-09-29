# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).
See [VERSIONING.md](./en/VERSIONING.md) for the release process and branching model.

## [1.14.0] - 2026-09-29

This is the release the repository is published from as open source.

### Added

- Open-source licensing: MIT `LICENSE` for the source code, separate per-asset terms in `ASSETS-LICENSE.md`, `LICENSES/` texts (MIT, CC BY 3.0, CC BY 4.0, CC0 1.0), `CREDITS.md` mirroring the in-game credits screen, and a `NOTICE` stating that the institutional logos are not licensed for reuse
- `SECURITY.md` pointing to GitHub private vulnerability reporting
- Content-reuse guide (`docs/en/CONTENT-REUSE.md`, `docs/pt-BR/CONTENT-REUSE.md`) for adapting levels and narrative
- Documentation split into `docs/en/` and `docs/pt-BR/` trees, with a docs index, language banners and a sync rule
- Level 3 (São João de Campina Grande): map and platform mechanics, forró band restoration minigame, step-sequence minigame, memory-sequence minigame, cinematic, caption image, labels, quizzes and narrative review
- Level 4 suspect identification phase in the investigation
- Edital dashboard with per-institution metrics from PostHog, including level 3 and level 4 data, error pages and fallback states
- Required consent to the usage-data collection and to the Terms of Use at institutional sign-up, disclosing that the repository is public
- Mobile block with a desktop-only warning
- Collapsible sidebar with auto-close at level start, a "VOLTAR AO MAPA" button and an ESC exit-stage confirmation
- Error fallback pages and maintenance mode
- Shared footer on the landing page, including the Bemobi sponsor logo
- Rat sprite credit on the credits screen
- Ladder in level 2 to improve level flow

### Changed

- ResponsiveVoice is now optional: without an API key, narration falls back to the browser's speech synthesis, so a fresh install works
- Root package renamed from `template-clone` to `guardiao-da-cultura`, with `"license": "MIT"` declared in every `package.json`
- Documentation rewritten for an external audience; the README now targets non-technical readers, and the narrative guidelines and core docs are translated
- Squad-internal documents, screenshots and the daily team status workflow removed from the tree; internal infrastructure hostnames redacted
- Museum MVP map renamed to Inhotim
- UI click, hover and magnifying sound effects unified into one sound
- Level 3 disappearing platform delay increased
- Level 2 work type and the ESC action label in control panels renamed
- `entry_flow_experiment` A/B flag removed

### Fixed

- `AUTH_URL` configuration hardening and public dashboard error handling
- Institution onboarding flow and welcome email for Google sign-ups
- Public dashboard: unset `campaign_source` treated as no link, queries scoped to the current environment, campaign links built from the environment's own domain, and each player counted once in the origin split
- `NEXT_PUBLIC_ENV` baked per environment into the front image
- PostHog events tagged with `APP_ENV` instead of `NODE_ENV`
- Popup notification text contrast
- Level-specific animations guarded and switch light activation hardened against soft locks
- `guest_play_enabled` left absent when unknown before consent

## [1.13.0] - 2026-09-10

### Added

- Light bar / spotlight lighting system: `LightBarSystem`, cone light WebGL pipeline, point lights for chandeliers, and level_02 spotlight wiring
- `level_03` mock definition, registry entry, mission constants, and Sao Joao de Campina Grande tilemap
- `useCanvasViewport` hook and canvas viewport tracking for letterboxed `Scale.FIT` canvas

### Changed

- Upgraded Phaser to 4.2.1, migrating cone lights to the native Phaser 4 Light API

### Fixed

- NPC dialogue progression
- Credits button hidden and map input blocked during level intro/transition
- Nudge idle timer behavior (idle reset while suppressed, held-key activity counted, back-off after failed attempts)
- Dialogue bubble and map pin tooltip positioned relative to the letterboxed canvas

## [1.12.0] - 2026-08-27

### Added

- Credits screen with data, scroll crawl, and clickable links
- Credits open/close events and `creditsOpen` state in game UI store
- Credits entry button on map screen
- Credits screen wired into game overlay with role sections

### Fixed

- `EventBus.off` wiping React listeners on scene shutdown

## [1.11.0] - 2026-08-25

### Added

- Sequential level flow via `quiz:next-level` event, with level ordering utilities
- Campina Grande map marker enabled
- Confetti burst effect (`EffectsManager`) triggered on placeholder/spotlight success
- Contextual nudge system (`NudgeManager`) for level 01 and level 02, wired into the Game scene and `GameOverlay`
- Evidence board: overlay with inspect panel and pin connections, global collectible loading across levels, Zustand state, clue-open event bridging
- Collectible sprite assets and data for level 01 and level 02, with extended board/educational metadata
- Player animation overhaul: climbing (4-frame), idle south, and carrying idle/jump spritesheets, with hitbox derived from the active animation frame
- Teatro Amazonas costume label markers and level 02 costume content data
- Camera click sound effect (asset, registry, `SfxKey`) and flash effect on `CLUE_VILLAIN` collection

### Fixed

- Level 02 NPC final position (`STAGE_DONE` added to floor completion keys)
- `MapInfoBox` title overflow constrained and vertically centered
- Confetti burst positioned on spotlight sprite
- Poster placeholder type conflict removed
- Signature label text and a grammar error corrected
- Missing `GROUND_VISUAL_OFFSET` constant added to `PlayerConfig`
- NPC now faces the player on spawn
- Map object positions adjusted for player alignment
- Dragging idle frame recentered to match hitbox alignment
- Player nudged 1px lower against platforms
- Pixelated rendering added for collectible images
- Physics body synced with climb animation scale
- Dynamic sprite scaling and clue-open event emission on dialog close
- Static title used in costume selector

### Changed

- `LEVEL_02_ENABLED` replaced with a scalable `LEVEL_ENABLED` map
- `NudgeManager` simplified to a boolean API; unused nudge UI wiring removed
- Player animation/preload boilerplate deduped; carry hitbox resync fixed
- Inline `CollectibleGrid` drawer replaced with the evidence board
- Interaction now targets the nearest nearby placeholder

### Docs

- Contextual nudge system architecture documented
- Nudge analytics events and firing rules documented
- `pistas_board_opened` PostHog event documented
- Evidence board added to architecture documentation

### Tests

- Unit tests added for `NudgeManager`
- Costume selector tests updated for static title

### Chore

- Player animation spritesheets updated
- Collectible data added for level 01 and empty level 02
- Label added to the lighting challenge
- Poster, NPC, and player spawn positions updated

## [1.10.0] - 2026-08-12

### Added

- Quiz randomization with shuffle utility
- Quiz answer explanations for level 1
- Quiz retries before revealing the correct answer
- `QUIZ_PASS_THRESHOLD` constant for consistent pass/fail logic
- Spotlight system for stage challenge with color-specific textures
- Tutorial system for zone-based tutorials with `TutorialBubble` UI
- Ladder cinematic system for intermediate quiz rewards
- PostHog events: `player_scored`, `clue_collected`, sidebar/badge/label/costume/NPC interactions
- Short location display for labels on map
- `Explanation` field added to `QuizQuestion` type

### Fixed

- Block player movement during confirmation panel to prevent input overlap
- Derive quiz star count from game store instead of hardcoded value
- Handle Esc dismissal in quiz confirmation to prevent softlock
- Remove hint key after turning the correct light on
- Suppress `dead_click` on TTS icon clicks
- Advance quiz on mouse click when explanation is revealed
- Prevent poster mismatch feedback on costume placeholders
- Reduce photo placeholder interaction distance to 120px
- Sync held item position before dialogue guard to prevent regression
- Prevent inactive missions from appearing in status bar

### Changed

- Migrated quiz data to first-option-is-correct convention
- Sculpture placeholders repositioned (yOffset decreased, moved downwards)
- Delayed audio and camera shake in ladder cinematic to sync with ladder hitting ground
- Updated Inhotim tilemap with ladder layers

### Chore

- Resized tutorial zone `T_2` for photo interaction
- Updated `EVENTS.md` with new PostHog event taxonomy

### Tests

- Added QuizManager threshold boundary tests
- Added Quiz performance phase tests
- Added tests for confirmation dismiss callback

## [1.9.0] - 2026-08-07

### Added

- Level music and menu music with preload in LevelCinematic and MapIntroScene
- Dialogue source params for contextual audio in Game scene
- UI sound events (`ui.sound.*`) and `useSound` hook
- `AudioSubpanel` for volume controls in sidebar
- `ControlsSubpanel` in sidebar
- Sound effects for Quiz, ConfirmationPanel, SculptureMechanicHandler, PaintingMechanicHandler
- Landing and drop sounds for CarryableItem
- `playInteractSound` option on InteractionComponent
- Costume Challenge minigame with hint keys on photo and costume placeholders
- Sound assets for game events

### Fixed

- Dialogue bubble flash at fallback position on open
- Dialogue bubble clipping at viewport edge — flip below speaker when near bottom
- Dialogue bubble offset alignment with speaker anchor
- Dialogue panel spawn delayed until camera zoom-in settles
- Intermittent gap between dialogue box and its background
- Intermediate quiz dialogue positioned over NPC with speaker awareness
- Quiz keyboard submission missing sound
- Costume challenge: duplicate `costumes_done` quiz key removed
- Costume challenge: correct `sfx.puzzle.failure` sound key
- Clue sound removed when entering a portal
- Intro `intro:complete` emitted on natural cutscene completion
- Audio: single-track music support in Game scene
- Audio: level_02 manifest registration
- Camera bounds updated on map load
- Favicon moved from root to `public/` folder

### Changed

- Player looping sounds refactored to use AudioManager
- Enemy refactored to use AudioManager
- AudioAccessibilityService simplified
- Intro music events reordered in IntroSequence
- Camera setup deduplicated in Game.create()

### Reverted

- Costume challenge success dialog temporarily removed

## [1.8.1] - 2026-07-31

### Fixed

- Chunk selector instructions moved to top of panel
- Progression persistence hydrated from storage on map load
- Cinematic intro config cache bleed between sessions
- Cached level data namespaced by levelId to prevent cross-level pollution
- Level 02 locked behind `LEVEL_02_ENABLED` feature flag (disabled in production)
- CurrentLevel cookie persisted on progression save
- Level UI state cleared on game end to prevent stale data

## [1.8.0] - 2026-07-28

### Added

- Poster mechanics, factories, and level-specific missions
- New player animations with posters on portals
- Level 02 mock data, NPCs, quiz, and configuration
- `finalPosition` property for NPC teleportation after mission completion
- Custom textures and scaling in `LabelSystem`
- Frame assets and label system

### Changed

- `QuizManager` refactored from hardcoded mission IDs to dynamic level-based resolution
- Player and poster spawn positions adjusted

### Fixed

- Dialogue audio button overlapping text
- Carried item depth above guardrail
- ScoreManager floors array expanded to 4 slots
- NPC Y position after final quiz
- Poster spawn depth set to 10

### Chore

- Guardrail end treatment improved
- Posters organized by release date
- "paintings" replaced with "posters" in work data

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
- Painting placeholder scales normalized in Inhotim map
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
