# Asset licence — Guardião da Cultura

`LICENSE` (MIT) covers the **source code** of this repository. It does **not**
cover the game's media. This document governs every file under:

```
front/public/assets/**
```

Read it before you redistribute, extract, fork or reuse any of those files.

Human-readable credits for every third-party work are in [`CREDITS.md`](./CREDITS.md),
which mirrors the in-game credits screen. Institutional names and logos are
covered separately by [`NOTICE`](./NOTICE) and are **not** licensed here. The
evidence behind every row below — file paths, sources, and the open questions
still being confirmed — is in [`docs/en/notes/oss/asset-matrix.md`](./docs/en/notes/oss/asset-matrix.md).

---

## The short version

1. **Most assets require attribution.** Shipping `LICENSE` alone is not enough.
   If your build includes files from `front/public/assets/`, carry the matching
   credits from `CREDITS.md` somewhere your users can reach.
2. **A few assets are not free for commercial use.** They are listed in
   [§5](#5-assets-that-are-not-free-for-commercial-use). Replace them before any
   commercial reuse.
3. **The sponsor logos are not licensed at all.** A fork must remove them. See
   `NOTICE`.

---

## 1. Artwork reproductions — `front/public/assets/artworks/`

Reproductions of works by Abdias Nascimento, Claudia Andujar, Edgard de Souza,
and of posters for works by Chico Buarque, Márcio Souza and Richard Wagner.

**Terms: redistribution is permitted, and attribution is mandatory.**

The rights holders cleared these reproductions on the binding condition that
**credit is always given**. The obligation travels with the files. If you extract
a painting, photograph, sculpture or poster from this repository — in a fork, a
derivative game, a screenshot gallery, a teaching deck — you must name the author
and the work as they appear in `CREDITS.md`.

Credit lines required, exactly as credited:

| Work | Credit line |
|---|---|
| `artworks/paintings/abdiasn_oxum_em_extase.png` | Abdias Nascimento — Oxum em êxtase |
| `artworks/paintings/abdiasn_oke_oxossi.png` | Abdias Nascimento — Okê Oxóssi |
| `artworks/paintings/abdiasn_invocacao_noturna_oxossi.png` | Abdias Nascimento — Invocação noturna ao poeta Gerardo Mello Mourão: Oxóssi |
| `artworks/paintings/abdiasn_xango_rodrigues_alves.png` | Abdias Nascimento — Xangô Rodrigues Alves |
| `artworks/photos/candujar_sem_titulo_yanomami*.png`, `artworks/photos/chunk-*.png` | Claudia Andujar — Sem título (Yanomami) |
| `artworks/sculptures/edgards_*.png` | Edgard de Souza — Sem título (Dor de cabeça) |
| `artworks/posters/cartazes/opera-do-malandro*.png` | Chico Buarque — Ópera do malandro |
| `artworks/posters/cartazes/zona-franca*.png` | Márcio Souza — Zona Franca, meu amor; ou Tem piranha no pirarucu |
| `artworks/posters/cartazes/ajuricaba*.png` | Márcio Souza — A paixão de Ajuricaba |
| `artworks/posters/cartazes/anel-do-nibelungo*.png` | Richard Wagner — O anel do nibelungo |

The `artworks/costumes/`, `artworks/dance/` and placeholder files in the same
tree are original project work and fall under [§2](#2-original-project-assets--cc-by-40).

---

## 2. Original project assets — CC BY 4.0

Everything produced by the project team — player and NPC sprites, band
instruments, collectibles, badges, maps and spritesheets, UI, spotlights and
other `misc/` graphics, the level narrative and quiz content under
`data/levels/`, the intro comics, the level 3 instrument stems, and the costume
and dance-step assets — is released under
[Creative Commons Attribution 4.0 International](./LICENSES/CC-BY-4.0.txt)
(CC BY 4.0).

This section does not cover files whose source is not recorded. The asset
matrix marks those rows "Source unrecorded — PO to confirm before reuse" (for
example `sound/ui.ogg`, `sound/sfx/police-siren.mp3`, `ui/suspects/` and some
`misc/` graphics). Until a source is confirmed, do not assume CC BY 4.0 for them.

You may share and adapt these for any purpose, including commercially, provided
you give credit:

> Guardião da Cultura — Labs de Games / 42 Rio — CC BY 4.0

This applies to adapted level content too. An educator who rewrites the quizzes
in `data/levels/` and republishes them is making an adaptation, and the credit
must stay.

---

## 3. Third-party assets requiring attribution

| Asset | Source | Licence | Credit line |
|---|---|---|---|
| `sound/music/menu.mp3` | Meta Sound Collection | Royalty-free, platform terms | Agent M por Jumbo |
| `sound/music/level_1.mp3`, `level_1_loop.mp3` | [Free Music Archive](https://freemusicarchive.org/music/Guifrog/Suco_de_Abacaxi/Guifrog_-_Suco_de_Abacaxi/) | [CC BY 3.0](./LICENSES/CC-BY-3.0.txt) | Suco de Abacaxi por Guifrog — loop editado com [Audjust](https://www.audjust.com/) |
| `sound/music/level_2.mp3` | [incompetech.com](https://incompetech.com/music/royalty-free/music.html) | [CC BY 4.0](./LICENSES/CC-BY-4.0.txt) | Chee Zee Jungle por Kevin MacLeod (incompetech.com) |
| `sound/music/level_3_cricket.ogg` | [Freesound](https://freesound.org/people/Moulaythami/sounds/536930/) | [CC BY 4.0](./LICENSES/CC-BY-4.0.txt) | Cricket Ambience, Remix, A por Moulaythami |
| `sound/sfx/object.drop_*.mp3` | [Freesound](https://freesound.org/s/810170/) | [CC BY 4.0](./LICENSES/CC-BY-4.0.txt) | Heavy object drop por mokasza |
| `sound/sfx/object.drag_loop.mp3` | [TunePocket Loop Maker](https://tunepocket.com/audio-loop-maker/) | Platform terms | Loop de arrasto criado com TunePocket Loop Maker |
| `sound/sfx/player.jump.wav`, `player.jump_2.mp3`, `player.land.wav` | [itch.io](https://leohpaz.itch.io/90-retro-player-movement-sfx) | Asset-pack terms | Pulo por Leohpaz |
| `sound/sfx/rat.squeak.mp3`, `rat.flee.mp3` | [ElevenLabs](https://elevenlabs.io/sound-effects/rat) | Platform terms | High pitched rat squeaks por ElevenLabs |
| transition whoosh cue | [Editors Keys](https://www.editorskeys.com/) | Platform terms | Whoosh por Editors Keys |
| `animals/rat-walk.png` | [itch.io](https://carysaurus.itch.io/rat-sprites) | Asset-pack terms | Rat Sprites por Carysaurus |
| `misc/switch_light.png` | [itch.io](https://jan-schneider.itch.io/color-switches) | [CC BY 4.0](./LICENSES/CC-BY-4.0.txt) | Color Switches por Jan Schneider |
| arrow-key hint icon | [Noun Project](https://thenounproject.com/icon/arrow-keys-1100214/) | [CC BY 3.0](./LICENSES/CC-BY-3.0.txt) | arrow keys por b farias do Noun Project |
| keyhole icon | [Noun Project](https://thenounproject.com/icon/keyhole-41032/) | [CC BY 3.0](./LICENSES/CC-BY-3.0.txt) | Keyhole por Mani Amini do Noun Project |
| rat icon | [Flaticon](https://www.flaticon.com/free-icon/rat_12634989) | Flaticon free licence — attribution required | Rat icons por G-CAT do Flaticon |

---

## 4. Third-party assets with no obligation — CC0

Public domain dedication. No credit required, though it remains welcome.

| Asset | Source | Licence |
|---|---|---|
| `sound/sfx/switch.ogg` | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | [CC0 1.0](./LICENSES/CC0-1.0.txt) |
| `sound/sfx/light_bar_fix.ogg` | [Kenney — UI Audio](https://kenney.nl/assets/ui-audio) | [CC0 1.0](./LICENSES/CC0-1.0.txt) |
| heavy stone door cue | [Freesound](https://freesound.org/s/578491/) | CC0 — Heavy stone door opens 2 por PostProdDog |
| heavy book cue | [Freesound](https://freesound.org/s/648959/) | CC0 — Heavy Book por IENBA |
| `sound/succeed.ogg`, `sound/sfx/puzzle.succeed.ogg` | [Kenney](https://kenney.nl/assets) — pack not recorded | [CC0 1.0](./LICENSES/CC0-1.0.txt) |

---

## 5. Assets that are NOT free for commercial use

These ship with the game but are **not** MIT-compatible and are **not** cleared
for commercial reuse. If you intend to use this project commercially, replace
them.

| Asset | Source | Licence | Restriction |
|---|---|---|---|
| `sound/sfx/camera.click.wav` | [iPhone câmera click.wav por Nathan_Lomeli](https://freesound.org/s/79190/) | Freesound **Sampling+** | Commercial use of the sample as-is is not permitted; attribution required. See the [Sampling+ deed](https://creativecommons.org/licenses/sampling+/1.0/). |
| "hmmm" inspection cue | [hmmm.wav por agent vivid](https://freesound.org/s/22090/) | Freesound **Sampling+** | idem |
| "Máscaras" graphic | [HiClipart](https://www.hiclipart.com/free-transparent-background-png-clipart-ouqbg) | Platform terms — **personal use only** | Not licensed for commercial redistribution. |
| "Fogueira" graphic | [CityPNG](https://www.citypng.com/photo/15015/hd-black-bonfire-campfire-firewood-icon-png) | Platform terms — **personal use only** | idem |

The **ResponsiveVoice** text-to-speech service (CC BY-NC-ND 4.0, NonCommercial,
paid key) is an *optional* runtime integration, not a bundled asset. With no key
configured the game falls back to the browser's built-in speech synthesis.

---

## 6. What is not licensed here

Institutional names, logos and wordmarks — Governo Federal, Lei Rouanet,
Ministério da Cultura, Galp, Bemobi, 42 Rio — are trademarks of their holders,
authorized for this project only. They are **not** covered by this document. A
fork must remove them. See [`NOTICE`](./NOTICE).

---

## 7. Keeping the credits in sync

`CREDITS.md` and the in-game credits screen
(`front/src/ui/credits/creditsData.ts`) are the same obligation rendered twice.
A change to one must be mirrored in the other, and in this file, in the same
pull request.
