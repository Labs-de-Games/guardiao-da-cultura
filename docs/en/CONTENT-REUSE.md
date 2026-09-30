🌐 English | [Português (Brasil)](../pt-BR/CONTENT-REUSE.md)

# Adapting the content

The levels in Guardião da Cultura are **data, not code**. Quizzes, dialogue,
collectibles and the works on display are JSON files under
`front/public/assets/data/`. An educator can replace a level's works, rewrite a
quiz, or change every line an NPC says without opening the game engine.

Most of this guide covers levels 1 to 3, the three map-based levels: a museum
(Inhotim), a theater (Teatro Amazonas) and a festival (São João de Campina
Grande). Level 4, the final investigation, works differently and has
[its own section](#the-investigation-level-4).

This guide covers what each file does, how the pieces reference each other, and
what you must keep when you adapt them.

> **Before you start: credits are not optional.**
> The artworks reproduced in this game were cleared for publication on the
> condition that credit is always given, and the original assets are CC BY 4.0,
> which carries the same obligation. An adapted version must keep the credits
> for every asset it still ships — in `CREDITS.md`, in the in-game credits
> screen, or both. See [`../../ASSETS-LICENSE.md`](../../ASSETS-LICENSE.md). If you
> replace an asset entirely, remove its credit and add one for the replacement.
> If you rebrand the game, you must also remove the sponsor logos and the
> "Realização" credits section — those marks are not licensed. See
> [`../../NOTICE`](../../NOTICE).

## Where everything lives

```
front/src/game/data/LevelConfig.ts        which levels exist and what each one loads
front/public/assets/data/
├── global/messages.json                  shared system dialogue, reused by every level
├── investigation/
│   ├── suspects.json                     level 4: the suspects and their dossiers
│   └── clues.json                        level 4: the traits each collected clue proves
└── levels/level_0N/                      levels 1 to 3 (level_04 holds only art; see below)
    ├── works.json                        the works on display and what they teach
    ├── quizzes.json                       the main mission quiz
    ├── intermediate-quizzes.json          short quizzes fired at milestones
    ├── npcs.json                          characters and their dialogue
    ├── collectibles.json                  clues the player picks up
    └── intro/
        ├── intro_config.json              the opening comic: panels, captions, timing
        └── *.png                          the comic art and loading screen
front/public/assets/maps/<map-name>/
├── map.json                              a Tiled map
└── spritesheet.png                       its tileset
```

The maps in use are `inhotim` (level 1), `teatro-amazonas` (level 2) and
`sao-joao-de-campina-grande` (level 3).

## The level registry

`front/src/game/data/LevelConfig.ts` is the source of truth for the map-based
levels, 1 to 3. The investigation (level 4) is deliberately left out of it,
because it has no tilemap. `LEVEL_REGISTRY` maps a level id to its map and its
content files:

```ts
level_01: {
  id: "level_01",
  levelNumber: 1,
  title: MAP_MARKERS[0].title,
  maxStars: 2,
  initialGrayscale: 0.82,
  activeMissions: ["missao_curador"],
  map: {
    key: "map_level_01",
    json: "maps/inhotim/map.json",
    tileset: "tiles_level_01",
    tilesetImg: "maps/inhotim/spritesheet.png",
    tilesetName: "museum",     // must match the tileset name inside that map.json
  },
  data: {
    works: ["data/levels/level_01/works.json"],
    quizzes: ["data/levels/level_01/quizzes.json"],
    intermediateQuizzes: ["data/levels/level_01/intermediate-quizzes.json"],
    npcs: ["data/levels/level_01/npcs.json"],
    messages: ["data/global/messages.json"],
    collectibles: ["data/levels/level_01/collectibles.json"],
  },
},
```

Paths are relative to `front/public/assets/`.

Two fields are easy to get wrong:

- **`tilesetName`** must match the tileset's `name` **inside** the Tiled
  `map.json`, not the file name. A mismatch loads a map with no tiles.
- **`activeMissions`** must name a mission id that exists in `quizzes.json`, in
  `npcs.json`, in `MissionIds` (`front/src/game/constants/MissionConstants.ts`)
  and in `MissionRegistry` (`front/src/game/data/MissionRegistry.ts`). This is
  the thread that ties an NPC to the quiz they hand out and to the mission's
  steps.

`maxStars` and `initialGrayscale` are presentation: the score ceiling for the
level, and how desaturated the world starts before the player restores it.

## Rewriting a quiz

`quizzes.json` is keyed by mission id. Each entry is a question:

```json
{
  "missao_curador": [
    {
      "id": "q1",
      "category": "Escultura",
      "question": "Qual desses temas está mais presente nas obras de Edgard de Souza?",
      "options": ["Transformação", "Hiperrealismo", "Miniaturas", "Gigantismo"],
      "explanation": "As obras exploram a transformação do corpo.",
      "hints": [
        "Representa coisas incomuns no mundo real.",
        "Mostra algo que é conhecido de um jeito, mas se apresenta de outro."
      ],
      "tags": ["edgards", "escultura"],
      "difficulty": "medium"
    }
  ]
}
```

- **The first option is the correct answer.** The game shuffles them at runtime.
- `explanation` is shown after answering, right or wrong. It is where the
  teaching actually happens — write it even when the answer looks obvious.
- The game reads only `question`, `options` and `explanation`. `id`,
  `category`, `hints`, `tags` and `difficulty` are authoring metadata: the game
  ignores them, so they are optional. Keep `id` unique within its mission if you
  use it.
- Quiz `hints` are not shown to the player. The hints the player does see when
  they stall come from each work's `educational.hint` in `works.json` (see
  below).

`intermediate-quizzes.json` has the same shape, written with only `question`,
`options` and `explanation`, and is keyed by the milestone that triggers it.
These are the short check-ins between stages of a level. A key must be one of
the `MissionKeys` in `front/src/game/constants/MissionConstants.ts`:
`paintings_done`, `sculptures_done`, `photo_collected`, `photo_done`,
`costumes_done`, `posters_done`, `spotlights_done`, `stage_done`, `dance_done`,
`switches_done` or `genius_done`. Any other key never fires, and the loader logs
a console warning naming it.

## Changing the works on display

`works.json` groups works by type, and the groups depend on the level:
`SCULPTURES`, `PAINTINGS` and `PHOTOS` in level 1; `SCULPTURES`, `PAINTINGS`,
`POSTERS` and `COSTUMES` in level 2; `BAND`, `ACCORDION` and `DANCES` in
level 3. Each group is an object keyed by work id. Each entry carries the
metadata the player reads, the educational copy, and the sprite key:

```json
{
  "id": "edgards_sem_titulo_i_fundidos",
  "type": "Sculpture",
  "metadata": {
    "title": "Escultura sem título (Dor de cabeça 1)",
    "author": "Edgard de Souza",
    "year": "2000",
    "place": "São Paulo, SP"
  },
  "educational": {
    "description": "Esta escultura mostra dois corpos colados.",
    "medium": "Bronze fundido",
    "opinion": "Uma escultura de duas pessoas juntas.",
    "feedbackError": "Aqui deve ter algo mostrando dois corpos colados.",
    "hint": "Observe as esculturas próximas"
  },
  "assets": { "sprite": "edgards_sem_titulo_i_fundidos" }
}
```

- `assets.sprite` is a texture key registered in `LevelConfig.ts`, not a file
  path. Adding a new work means adding its image **and** registering the key.
- `educational.hint` is the hint the game offers when the player stalls on a
  work.
- `feedbackError` is what the player hears when they place the work in the wrong
  spot, so it should hint at the right one without naming it.
- `metadata.author` is the credit the player sees. If you swap in a different
  work, this is one of the places the new attribution has to land — the others
  are `CREDITS.md` and `ASSETS-LICENSE.md`.

## Rewriting dialogue

`npcs.json` holds characters keyed by id, each with a `missionId` and dialogue
grouped by moment (`intro`, and the others the level uses):

```json
{
  "npcs": {
    "professor_curador": {
      "name": "Inspetora Cremilda Jarbas",
      "missionId": "missao_curador",
      "dialogues": {
        "intro": [
          "Boas-vindas ao Inhotim, sô!",
          "Leia as placas e coloque as obras no lugar certo."
        ]
      }
    }
  }
}
```

Each string is one dialogue box. Keep them short — they are narrated aloud as
well as displayed, and a long paragraph reads badly in both.

`data/global/messages.json` holds the system dialogue shared by every level:
success and error lines per interaction type. Change it once and every level
changes, which is usually what you want for tone.

## Collectibles

`collectibles.json` defines the clues the player gathers. Everything sits under
a top-level `collectibles` key, grouped by category (`CLUE_VILLAIN` is the only
one in use), and each category is an object keyed by clue id. Beyond the usual `metadata` and `educational`
blocks, each has:

- `assets.scaleOnMap` / `scaleOnInspect` — how large the sprite is in the world
  versus in the inspection view.
- `board.position` and `board.connectedTo` — where the clue sits on the
  investigation board and which other clues it links to. `connectedTo` must
  reference ids that exist, or the board draws a line to nothing.

## The opening comic

`intro/intro_config.json` drives the comic that opens a level. Its `panels`
array has one entry per panel, naming an image in the same folder, the slice of it to reveal, the
timings, and the caption.

```json
{
  "src": "comic_L1P1.png",
  "sliceWidth": 350,
  "sliceStart": 50,
  "revealMs": 1000,
  "holdMs": 5000,
  "shrinkMs": 1200,
  "title": "VANDALISMO TOTAL",
  "caption": "Na madrugada de ontem, vândalos invadiram o Inhotim."
}
```

`sliceStart` and `sliceWidth` are in source-image pixels, so they must be
retuned for any replacement artwork. `holdMs` is how long the caption stays up —
long enough to read aloud, not so long that a replay drags.

## The investigation (level 4)

Level 4 is the final investigation: the player reviews the clues and accuses a
suspect. It is not a platform level. It has no map, is not in `LEVEL_REGISTRY`,
and its whole interface is React, in `front/src/ui/investigation/`.
`front/src/game/scenes/InvestigationScene.ts` draws nothing: it loads the data,
hands it to the React UI over the EventBus, and records the result. The content
lives in two files of its own:

- `front/public/assets/data/investigation/suspects.json` — the suspects, and
  for each one whether their dossier confirms, contradicts or says nothing
  about each trait.
- `front/public/assets/data/investigation/clues.json` — the traits, and which
  trait each clue proves. A clue is referenced by its level id and its id in
  that level's `collectibles.json`, so renaming a collectible means updating it
  here too.

`levels/level_04/` holds only its art: the opening comic in `intro/`, and the
closing comic in `suspect-arrested/`, driven by `outro_config.json`.

The game has these four levels and no others. `levels/level_05/intro/loading_L5.png`
is a leftover from a planned fifth level; no code loads it.

## Adding a whole level

1. Build the map in [Tiled](https://www.mapeditor.org/) and export `map.json`
   plus its `spritesheet.png` into `front/public/assets/maps/<your-map>/`.
2. Create `front/public/assets/data/levels/level_0N/` with the five content
   files. Copying level 1's and editing is faster than starting empty.
3. Add its mission id to `MissionIds`, and any new milestones to `MissionKeys`,
   in `front/src/game/constants/MissionConstants.ts`.
4. Add the mission and its steps to `front/src/game/data/MissionRegistry.ts`.
5. Add the level to `LEVEL_REGISTRY` in `front/src/game/data/LevelConfig.ts`,
   with its map keys and content paths.
6. Register any new sprite keys in `LEVEL_ASSETS` in the same file.
7. Add the map marker to `MAP_MARKERS` in
   `front/src/game/constants/MapMarkers.ts`, so the level is reachable from the
   world map.
8. Check the dashboards. `DASHBOARD_LEVELS` in
   `front/src/lib/edital/server/levels.ts` picks up every level in
   `LEVEL_REGISTRY` automatically; a level outside the registry, like the
   investigation, has to be added there by hand.
9. Credit every new asset in `front/src/ui/credits/creditsData.ts`,
   `CREDITS.md` and `ASSETS-LICENSE.md`, in the same pull request.

## Checking your work

```bash
make development-up
make db-migrate
```

Then play the level. The content files are fetched at runtime, so a JSON edit
needs only a page reload — no rebuild.

Malformed JSON fails at load with a console error naming the file. A valid file
with a wrong key usually fails quietly instead: an NPC with no dialogue, a quiz
that never appears, a work that cannot be placed. If something is missing rather
than broken, check the ids first.

## If you publish your adaptation

- Keep the credits for every asset you still ship.
- Remove the sponsor logos and the "Realização" credits section — those marks
  are licensed to this project only.
- Rename it. "Guardião da Cultura" is not licensed for use as the name of a
  derivative work.
- The code stays MIT, so keep `LICENSE` and its copyright notice.
