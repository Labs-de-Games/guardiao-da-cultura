# Asset matrix — T1 #797

> **State:** first written 2026-09-22 for T1. Recounted on 2026-09-30 against
> `develop` after about 35 files landed in the asset tree (the investigation
> phase, the genius-sequence minigame and the level 4 outro). Rows added in that
> pass are marked *(added 2026-09-30)*.

Redistribution decision matrix for every file under `front/public/assets/`.
Built from `front/src/ui/credits/creditsData.ts` (71 entries across 16 sections,
counting the unnamed closing section) and a full sweep of the asset tree.

This file is the **evidence** behind `ASSETS-LICENSE.md`. `ASSETS-LICENSE.md` is
what a reuser reads; this is what a maintainer reads when the question is "why
does that row say that".

- Tree swept: 294 files, 72 MB, under `front/public/assets/` (2026-09-30).
- `artworks/`: 65 files, 6.8 MB. The PO cleared the credited reproductions in
  this group; the costume, dance, accordion and placeholder files alongside
  them are not covered by that clearance (see the rows below).
- Parent epic: #796.

## Verdict vocabulary

| Verdict | Meaning |
|---|---|
| **Ship — attribution mandatory** | May be redistributed publicly. Credit must travel with the file. |
| **Ship — no obligation** | Public domain or CC0. No condition attached. |
| **Ship — restricted reuse** | Ships in this repository, but the licence is not MIT-compatible and blocks commercial reuse. Flagged per file so a reuser is warned. |
| **Not licensed** | Present in the tree but no reuse right is granted. Forks must remove it. |
| **Source unrecorded — PO to confirm before reuse** | Present and in use, but neither `creditsData.ts` nor the commit that added it names where it came from. No licence is asserted. A reuser should not redistribute it until the PO records a source. |

## Confidence column

The credits screen names the *works and authors*; it does not name file paths.
Mapping an entry to a path is therefore an inference in several cases.

| Confidence | Meaning |
|---|---|
| **Confirmed** | Path ↔ source is unambiguous (filename, or a source recorded in the plan). |
| **Inferred** | Mapping is a strong reading of the filename or usage, not a recorded fact. |
| **Unrecorded** | No credits entry exists and no source is recorded anywhere. Images and data are treated as original project work (see §9); audio is not. |

Every **Inferred** and **Unrecorded** row is repeated in §10 as an open item for
the PO to confirm before the visibility flip.

---

## 1. Artwork reproductions — `artworks/`

Cleared by the PO for public redistribution. The binding condition is that
**credits must always be given**. These are reproductions of works by living
artists and estates; the clearance covers this project's use and any downstream
use that carries the credit.

| Path | Author / work | Rights route | Licence | Verdict | Attribution text | Confidence |
|---|---|---|---|---|---|---|
| `artworks/paintings/abdiasn_oxum_em_extase.png` | Abdias Nascimento — *Oxum em êxtase* | Ipeafro | Cleared for this project, attribution mandatory | Ship — attribution mandatory | "Abdias Nascimento — Oxum em êxtase" | Confirmed |
| `artworks/paintings/abdiasn_oke_oxossi.png` | Abdias Nascimento — *Okê Oxóssi* | Ipeafro | idem | Ship — attribution mandatory | "Abdias Nascimento — Okê Oxóssi" | Confirmed |
| `artworks/paintings/abdiasn_invocacao_noturna_oxossi.png` | Abdias Nascimento — *Invocação noturna ao poeta Gerardo Mello Mourão: Oxóssi* | Ipeafro | idem | Ship — attribution mandatory | full title as credited | Confirmed |
| `artworks/paintings/abdiasn_xango_rodrigues_alves.png` | Abdias Nascimento — *Xangô Rodrigues Alves* | Ipeafro | idem | Ship — attribution mandatory | "Abdias Nascimento — Xangô Rodrigues Alves" | Confirmed |
| `artworks/photos/candujar_sem_titulo_yanomami.png`, `..._ph.png` | Claudia Andujar — *Sem título (Yanomami)* | Galeria Vermelho | idem | Ship — attribution mandatory | "Claudia Andujar — Sem título (Yanomami)" | Confirmed |
| `artworks/photos/chunk-0.png` … `chunk-3.png` | Derived tiles of the Andujar photograph, used by the restoration minigame | Galeria Vermelho | idem — derivative of a credited work | Ship — attribution mandatory | same credit as the source photograph | Inferred |
| `artworks/sculptures/edgards_sem_titulo_i_fundidos.png`, `..._ii_flexao.png`, `..._iii_em_pe.png` | Edgard de Souza — *Sem título (Dor de cabeça)* series | Galeria Vermelho | idem | Ship — attribution mandatory | "Edgard de Souza — Sem título (Dor de cabeça)" | Confirmed |
| `artworks/posters/cartazes/opera-do-malandro*.png`, `frame-date-malandro.png` | Chico Buarque — *Ópera do malandro* | poster reproduction | idem | Ship — attribution mandatory | "Chico Buarque — Ópera do malandro" | Confirmed |
| `artworks/posters/cartazes/zona-franca*.png`, `frame-date-zona-franca.png` | Márcio Souza — *Zona Franca, meu amor; ou Tem piranha no pirarucu* | poster reproduction | idem | Ship — attribution mandatory | full title as credited | Confirmed |
| `artworks/posters/cartazes/ajuricaba*.png`, `frame-date-ajuricaba.png` | Márcio Souza — *A paixão de Ajuricaba* | poster reproduction | idem | Ship — attribution mandatory | "Márcio Souza — A paixão de Ajuricaba" | Confirmed |
| `artworks/posters/cartazes/anel-do-nibelungo*.png`, `frame-date-nibelungo.png` | Richard Wagner — *O anel do nibelungo* | poster reproduction; the opera itself is public domain | idem | Ship — attribution mandatory | "Richard Wagner — O anel do nibelungo" | Confirmed |
| `artworks/costumes/**` (21 files) | Costume pieces for the dress-up puzzle (dummy, indian, malandro, soldier, warrior, pedestal) | Project team | CC BY 4.0 | Ship — attribution mandatory | "Guardião da Cultura — Labs de Games / 42 Rio" | Unrecorded |
| `artworks/dance/dance_steps.mp4`, `artworks/dance/steps/*.gif`, `sequence_step_placeholder.png` | São João dance-step reference footage and loops (6 files, 6.2 MB) | Project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `artworks/paintings/standard_painting_placeholder.png`, `artworks/sculptures/standard_sculpture_placeholder.png`, `sam.png`, `soldado-caixa.png` | Placeholder and original in-game objects | Project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `artworks/accordion_animation/accordion_frame001.png` … `009.png` (9 files) *(added 2026-09-30)* | Accordion loop for the genius-sequence minigame. Added in `95255c2d` ("loop accordion animation…"); no source named | unrecorded | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |

**Note on the two "Espaços Culturais" and cultural-institution entries**
(Inhotim, Teatro Amazonas, São João de Campina Grande): these are credited as
places depicted, not as licensors of a file. No asset row depends on them.

---

## 2. Music — `sound/music/`

| Path | Source | Licence | Verdict | Attribution text | Confidence |
|---|---|---|---|---|---|
| `sound/music/menu.mp3` | [Agent M por Jumbo](https://www.facebook.com/sound/collection/?sound_collection_tab=sound_tracks&asset_id=132224994119105&reference=artist_attr) — Meta Sound Collection | Royalty-free, platform terms | Ship — attribution mandatory | "Agent M por Jumbo" | Inferred |
| `sound/music/level_1.mp3`, `sound/music/level_1_loop.mp3` | [Suco de Abacaxi por Guifrog](https://freemusicarchive.org/music/Guifrog/Suco_de_Abacaxi/Guifrog_-_Suco_de_Abacaxi/); loop cut with [Audjust](https://www.audjust.com/) | CC BY 3.0 | Ship — attribution mandatory | "Suco de Abacaxi por Guifrog (CC BY 3.0) — loop editado com Audjust" | Inferred |
| `sound/music/level_2.mp3` | [Chee Zee Jungle por Kevin MacLeod](https://incompetech.com/music/royalty-free/music.html) | CC BY 4.0 | Ship — attribution mandatory | "Chee Zee Jungle por Kevin MacLeod (incompetech.com) — CC BY 4.0" | Inferred |
| `sound/music/level_3_cricket.ogg` | [Moulaythami — Cricket Ambience, Remix, A](https://freesound.org/people/Moulaythami/sounds/536930/) | CC BY 4.0 | Ship — attribution mandatory | "Cricket Ambience, Remix, A por Moulaythami — CC BY 4.0" | Confirmed |
| `sound/music/level_3_accordion.ogg`, `level_3_triangle.ogg`, `level_3_zabumba.ogg` | Band-mechanic instrument stems | Project team | CC BY 4.0 | Ship — attribution mandatory | "Guardião da Cultura — Labs de Games / 42 Rio" | Unrecorded |
| `sound/notes/C3.wav`, `D3.wav`, `E3.wav`, `F3.wav` *(added 2026-09-30)* | Genius-sequence colour cues, loaded as `sfx.genius.*` in `registry.ts`. Added in `b151eedb` / `a64d2a51`; neither commit names a source | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |

**Defect found during the sweep:** `front/src/game/audio/registry.ts:152-155`
loads `sound/music/level_3_jam_block.ogg`, which does not exist in the tree. The
other three stems do. Not a licensing issue — filed here because the sweep is
what surfaced it.

---

## 3. Sound effects — `sound/sfx/`, loose `sound/*.mp3`

| Path | Source | Licence | Verdict | Attribution text | Confidence |
|---|---|---|---|---|---|
| `sound/sfx/camera.click.wav` | [iPhone câmera click.wav por Nathan_Lomeli](https://freesound.org/s/79190/) | Freesound **Sampling+** | **Ship — restricted reuse** | "iPhone câmera click.wav por Nathan_Lomeli (Freesound, Sampling+)" | Confirmed |
| unmapped — one of the inspect/UI cues | [hmmm.wav por agent vivid](https://freesound.org/s/22090/) | Freesound **Sampling+** | **Ship — restricted reuse** | "hmmm.wav por agent vivid (Freesound, Sampling+)" | Inferred |
| `sound/sfx/object.drop_1.mp3` … `drop_5.mp3` | [Heavy object drop por mokasza](https://freesound.org/s/810170/) | CC BY 4.0 | Ship — attribution mandatory | "Heavy object drop por mokasza — CC BY 4.0" | Inferred |
| `sound/sfx/object.drag_loop.mp3` | [TunePocket Loop Maker](https://tunepocket.com/audio-loop-maker/) | Platform terms | Ship — attribution mandatory | "Loop de arrasto criado com TunePocket Loop Maker" | Inferred |
| `sound/sfx/player.jump.wav`, `player.jump_2.mp3`, `player.land.wav` | [90 Retro Player Movement SFX por Leohpaz](https://leohpaz.itch.io/90-retro-player-movement-sfx) | itch.io asset-pack terms | Ship — attribution mandatory | "Pulo por Leohpaz" | Inferred |
| `sound/sfx/rat.squeak.mp3`, `rat.flee.mp3`, `sound/rat_squeak.mp3`, `sound/rat_flee.mp3` | [High pitched rat squeaks por ElevenLabs](https://elevenlabs.io/sound-effects/rat) | ElevenLabs platform terms | Ship — attribution mandatory | "High pitched rat squeaks por ElevenLabs" | Inferred |
| unmapped — a door or heavy-object cue | [Heavy stone door opens 2 por PostProdDog](https://freesound.org/s/578491/) | CC0 | Ship — no obligation | none required | Inferred |
| unmapped — a book or page cue | [Heavy Book por IENBA](https://freesound.org/s/648959/) | CC0 | Ship — no obligation | none required | Inferred |
| unmapped — a transition whoosh | [Whoosh por Editors Keys](https://www.editorskeys.com/) | Platform terms | Ship — attribution mandatory | "Whoosh por Editors Keys" | Inferred |
| `sound/sfx/switch.ogg` | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | CC0 | Ship — no obligation | none required | Confirmed |
| `sound/sfx/light_bar_fix.ogg` | [Kenney — UI Audio](https://kenney.nl/assets/ui-audio) | CC0 | Ship — no obligation | none required | Confirmed |
| `sound/succeed.ogg`, `sound/sfx/puzzle.succeed.ogg` | [Kenney](https://kenney.nl/assets) — pack not recorded (added in `fa661cc4`) | CC0 | Ship — no obligation | none required | Inferred |
| `sound/ui.ogg` *(added 2026-09-30)* | Single UI click/hover/magnifying cue (`sfx.ui.click`). Added in `f104eb82`, which replaced the old magnifying and placeholder sounds; no source named | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |
| `sound/sfx/police-siren.mp3` *(added 2026-09-30)* | Siren when the investigation case closes (`sfx.police.siren`). Added in `ee68af39`; no source named | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |
| `sound/sfx/clue.inspect_1..7.mp3`, `puzzle.error.mp3`, `quiz.right.mp3`, `quiz.wrong.mp3`, `badge.unlock.mp3`, `star_sound.mp3`, `player.footstep.ogg`, `player.climb.mp3`, `sound/error.mp3`, `sound/magnifying_up.mp3`, `sound/magnifying_down.mp3` | Project team, or an unrecorded source (several arrived in the bulk `1a65b4f6` "add sound assets" commit) | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |

The loose files directly under `sound/` (`error.mp3`, `magnifying_up.mp3`,
`magnifying_down.mp3`, `rat_squeak.mp3`, `rat_flee.mp3`, `succeed.ogg`) are
superseded by the `sound/sfx/` equivalents in
`front/src/game/audio/registry.ts` and appear to be dead files. Removing them is
a cleanup item, not a licensing one.

---

## 4. Icons and UI — `misc/`, `ui/`

| Path | Source | Licence | Verdict | Attribution text | Confidence |
|---|---|---|---|---|---|
| `misc/switch_light.png` | [Jan Schneider — Color Switches](https://jan-schneider.itch.io/color-switches) | CC BY 4.0 (personal and commercial use with credit) | Ship — attribution mandatory | "Color Switches por Jan Schneider — CC BY 4.0" | Confirmed |
| `misc/interactive_hint_key.png` | [arrow keys por b farias, Noun Project](https://thenounproject.com/icon/arrow-keys-1100214/) | CC BY 3.0 | Ship — attribution mandatory | "arrow keys por b farias do Noun Project — CC BY 3.0" | Inferred |
| unmapped — a keyhole/lock icon | [Keyhole por Mani Amini, Noun Project](https://thenounproject.com/icon/keyhole-41032/) | CC BY 3.0 | Ship — attribution mandatory | "Keyhole por Mani Amini do Noun Project — CC BY 3.0" | Inferred |
| unmapped — mask imagery in the São João level | [Máscaras por HiClipart](https://www.hiclipart.com/free-transparent-background-png-clipart-ouqbg) | HiClipart terms — **personal use only** | **Ship — restricted reuse** | "Máscaras por HiClipart" | Inferred |
| unmapped — a bonfire/campfire graphic | [Fogueira por CityPNG](https://www.citypng.com/photo/15015/hd-black-bonfire-campfire-firewood-icon-png) | CityPNG terms — **personal use only** | **Ship — restricted reuse** | "Fogueira por CityPNG" | Inferred |
| `ui/` rat icon usage | [Rat icons por G-CAT do Flaticon](https://www.flaticon.com/free-icon/rat_12634989) | Flaticon free licence — attribution mandatory | Ship — attribution mandatory | "Rat icons por G-CAT do Flaticon" | Inferred |
| `misc/investigation-room.png` *(added 2026-09-30)* | Investigation-room backdrop for the suspect identification screen. Added in `ccf993a3`; no source named | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |
| `misc/note01.png`, `misc/note02.png` *(added 2026-09-30)* | Note artwork for the genius-sequence minigame. Added in `51d6ee1a`; no source named | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |
| `misc/wood_label.png` *(added 2026-09-30)* | Wood label sprite. Added in `2526ff07`; no source named | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |
| `ui/suspects/*.png` (5 files) *(added 2026-09-30)* | Suspect portraits for the investigation board. Added in `640070b3`; no source named | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |
| `misc/**` remaining (exclamation, label, ladder, map, marker, placeholder-spritesheet, poster-label, questionmark-spritesheet, rec, spotlights/*, stage placeholders, star, trampoline) | Project team | CC BY 4.0 | Ship — attribution mandatory | "Guardião da Cultura — Labs de Games / 42 Rio" | Unrecorded |
| `ui/**` remaining (backpack, map-cards/*, stars/*, tts-icon, vandal) | Project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |

> The HiClipart and CityPNG entries are the two rows that most need the PO's
> attention. Both platforms publish "free for personal use" terms, which is
> narrower than the Freesound `Sampling+` problem and narrower than anything the
> artwork clearance covers. If they are confirmed as in use, they should either
> be replaced before the flip or carried in `ASSETS-LICENSE.md` with the same
> explicit commercial-use warning as the Sampling+ files.

---

## 5. Character and creature sprites

| Path | Source | Licence | Verdict | Attribution text | Confidence |
|---|---|---|---|---|---|
| `animals/rat-walk.png` | [Rat Sprites por Carysaurus](https://carysaurus.itch.io/rat-sprites) | itch.io asset-pack terms — credit given per the #786 pattern | Ship — attribution mandatory | "Rat Sprites por Carysaurus" | Confirmed |
| `player/animations/**` (22 files) | Project team | CC BY 4.0 | Ship — attribution mandatory | "Guardião da Cultura — Labs de Games / 42 Rio" | Unrecorded |
| `npcs/04_npc_female/**` (18 files) | Project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `band/**` (16 files) | Project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `collectibles/**` (8 files) | Project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `moving-platforms/p1.png` | Project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |

---

## 6. Maps and level content

| Path | Source | Licence | Verdict | Attribution text | Confidence |
|---|---|---|---|---|---|
| `maps/inhotim/**` (including `INSTRUCTIONS.txt`), `maps/teatro-amazonas/**`, `maps/sao-joao-de-campina-grande/**` (9 files) | Tilemaps and spritesheets, project team. `maps/inhotim/` was `maps/museum-mvp/` until `373d6eaa`; its `INSTRUCTIONS.txt` is the stock export readme from the Sprite Fusion map editor, not project content | CC BY 4.0 | Ship — attribution mandatory | "Guardião da Cultura — Labs de Games / 42 Rio" | Unrecorded |
| `data/levels/level_01/**` (13 files), `level_02/**` (12), `level_03/**` (12) — `quizzes.json`, `npcs.json`, `works.json`, `collectibles.json`, `intermediate-quizzes.json`, `intro/*` | Narrative, quiz and intro-comic content, project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `data/levels/level_04/intro/*` (7 files), `level_05/intro/loading_L5.png` (1 file) | Intro comic for level 4, project team, and `loading_L5.png`, a loading screen left from a planned fifth level that no code loads. Level 4 has no quiz, NPC or works JSON; there is no level 5 | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `data/levels/level_04/suspect-arrested/outro_config.json` *(added 2026-09-30)* | Arrest-cinematic panel config, written by the team in `aa96ea5f` | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `data/levels/level_04/suspect-arrested/arrested.png`, `handshake.png`, `on-jail.png` *(added 2026-09-30)* | Arrest-cinematic panels. Added in `aa96ea5f`; no source named | none asserted | **Source unrecorded — PO to confirm before reuse** | n/a | Unrecorded |
| `data/investigation/clues.json`, `data/investigation/suspects.json` *(added 2026-09-30)* | Suspect dossiers and clue traits for the investigation phase, written by the team (`4504bfc4`, `941cff9b`, `640070b3`) | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `data/global/messages.json` | Project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |
| `data/badges/*.png` (5 files) | Project team | CC BY 4.0 | Ship — attribution mandatory | idem | Unrecorded |

All of `data/levels/` together is 49 files, 34 MB.

The level content is the part educators are most likely to adapt. T4's content-
reuse guide points at exactly these paths, and is the natural place to restate
that an adapted version must keep the credits.

---

## 7. Trademarks and institutional logos — NOT LICENSED

| Mark | Where it appears | Verdict |
|---|---|---|
| Governo Federal, Lei Rouanet, Ministério da Cultura, Galp, Bemobi, 42 Rio | Credits screen "Realização" section; sponsor imagery | **Not licensed.** Authorized for this project only. Forks must remove them. |

Recorded in `NOTICE`. Not covered by the artwork clearance and not covered by
`ASSETS-LICENSE.md`.

---

## 8. Runtime integrations that are not files in this tree

| Integration | Licence | Verdict |
|---|---|---|
| ResponsiveVoice (`front/src/app/api/tts/synthesize`) | CC BY-NC-ND 4.0, NonCommercial, paid key | Not bundled. Must be **optional** — see T3 #799. An MIT project must not hard-depend on it. |
| Phaser 4 | MIT | Standard dependency, no action. |
| PostHog | Optional, already stubbed | No action. |

---

## 9. Original project assets — the default

Every image, map or data path not claimed by a row above is treated as work
produced by the project team and is released under **CC BY 4.0**, per the
decision recorded for this task.

The default does **not** apply to audio, or to any file whose row says
**Source unrecorded**. Sound effects and music are the files most often pulled
from third-party libraries, and the credits screen already names several such
libraries without naming paths. Treating an unlabelled sound as team work would
relicense it silently. Audio with no recorded source stays **Source unrecorded —
PO to confirm before reuse** until someone records where it came from.

The CC BY 4.0 choice for the team's own work is deliberate:

- It is consistent with the epic's core obligation — attribution travels with
  the assets — instead of inventing a second, weaker rule for the team's own work.
- It keeps the assets reusable by educators, which is the point of the epic,
  while a NonCommercial variant would have blocked a large share of that reuse
  and contradicted the MIT code licence.
- It is machine-checkable under the REUSE convention alongside the third-party
  CC BY rows, so a tool can verify the tree rather than a human re-reading prose.

The attribution string for this group is:

> Guardião da Cultura — Labs de Games / 42 Rio — CC BY 4.0

---

## 10. Open items before the visibility flip

Ordered by how much a wrong answer costs.

1. **HiClipart (`Máscaras`) and CityPNG (`Fogueira`)** — both are credited in
   `creditsData.ts` and both platforms publish personal-use-only terms. Confirm
   whether the files are actually in the shipped tree, and either replace them or
   carry an explicit commercial-use warning. §4.
2. **Freesound `Sampling+` file mapping** — `camera.click.wav` is confirmed;
   the `hmmm.wav` cue is not mapped to a path. A reuser cannot avoid a file they
   cannot identify, so the row must name a path before the flip. §3.
3. **Original-asset copyright holder string** — `LICENSE` and this document use
   "Labs de Games / 42 Rio and the Guardião da Cultura contributors". Confirm the
   exact legal entity the PO wants named.
4. **Every `Inferred` row** — the credits screen names works, not paths. The
   mappings above are strong readings, not records. Confirming them is a
   half-hour pass with the designer.
5. **Every `Unrecorded` row** — the image and data rows carry CC BY 4.0 on the
   assumption of team authorship. Any asset in these groups that actually came
   from a third party would be mislicensed. The costume, dance-step and NPC
   groups are the ones worth a second look.
6. **Every `Source unrecorded` row** — no licence is asserted for these. Most
   are audio (`sound/ui.ogg`, `sound/sfx/police-siren.mp3`, `sound/notes/*.wav`
   and the older unlabelled `sound/sfx/*` cues) or art added for the
   investigation phase and the genius-sequence minigame. Each needs a recorded
   source, or a statement from the PO that the team made it, before reuse.
   `ASSETS-LICENSE.md` should not list them under CC BY 4.0 until then.
7. **`sound/music/level_3_jam_block.ogg` is missing** from the tree while
   `registry.ts` loads it. §2.
8. **Dead loose files under `sound/`** — six files superseded by `sound/sfx/`.
   Cleanup, not licensing. §3.

## Verification

- §1–§6 cover every top-level directory in the tree (`animals/`, `artworks/`,
  `band/`, `collectibles/`, `data/`, `maps/`, `misc/`, `moving-platforms/`,
  `npcs/`, `player/`, `sound/`, `ui/`). On 2026-09-30 each of the 294 files was
  checked against the rows by hand and matched one of them, either by name or
  through a "remaining" catch-all. Nothing enforces this: a file added later
  will not show up here until someone repeats the sweep.
- Every entry in `creditsData.ts` appears in `CREDITS.md` and vice versa.
- `LICENSE` and `ASSETS-LICENSE.md` do not contradict each other on what MIT
  covers.
