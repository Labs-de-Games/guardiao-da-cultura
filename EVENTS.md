# Eventos de Analytics — Dashboard

Este documento descreve:
- **Métricas do dashboard** e quais eventos alimentam cada card/visão.
- **Eventos já emitidos** no front e consumidos pelo back.
- **Eventos que faltam** ou precisam de metadados adicionais.
- **Metadados esperados** para evitar taxas incorretas.

> Fonte: `front/src/game/**` + `back/src/modules/analytics/analytics.service.ts` + `back/src/shared/events/game-events.ts`.

---

## 1) Funil de Engajamento
**Cards:** Login concluído, Entrada na Sessão 1, Conclusão da Sessão 1

### Backend calcula com:
- `loginCompletionRate` = `GAME_STARTED` / totalPlayers
- `chapter1StartRate` = `LEVEL_STARTED` (cap. 1) / `GAME_STARTED`
- `chapter1CompletionRate` = `LEVEL_COMPLETED` (cap. 1) / `LEVEL_STARTED` (cap. 1)

### Eventos necessários
- `game.started`
- `level.started`
- `level.completed`

### Metadados obrigatórios para capítulo 1
O backend identifica “Sessão 1” via:
- `metadata.levelNumber` **ou**
- `metadata.levelId` contendo “level-1/level_01/…”

> Sem `levelNumber` no `level.started`, o backend **não conta a entrada** e a taxa de conclusão explode (>100%).

### Status atual
- `game.started` ✅ emitido
- `level.completed` ✅ emitido com `levelNumber`
- `level.started` ✅ emitido com `levelNumber` (ajuste recente)

---

## 2) Engajamento
**Cards:** Tempo médio de sessão, Total de jogadores

### Backend calcula com:
- `averageSessionTime` via pares `GAME_STARTED` → `SESSION_END`
- `totalPlayers` = usuários únicos com eventos

### Eventos necessários
- `game.started`
- `session.end`

### Status atual
- `game.started` ✅ emitido
- `session.end` ✅ emitido no shutdown da cena (ajuste recente)

---

## 3) Métricas de Engajamento no Jogo
**Cards:** Acerto nos desafios, Média de estrelas, Interação com pistas e objetos

### Backend calcula com:
- `quizSuccessRate` = `QUIZ_COMPLETED` (passed) / (`QUIZ_COMPLETED` + `QUIZ_FAILED`)
- `averageStarScore` = média de `metadata.stars` em `LEVEL_COMPLETED`
- `objectInteractionRate` = `EVENT_LOGGED` com interação / totalPlayers

### Eventos necessários
- `quiz.completed` / `quiz.failed`
- `level.completed` com `metadata.stars`
- `event.logged` com metadados de interação

### Status atual
- `quiz.completed` / `quiz.failed` ✅ emitidos (`sendQuizOutcomeEvent`)
- `level.completed` ✅ emitido com `stars`
- `event.logged` ✅ emitido via `InteractionComponent` (ajuste recente)

### Metadados de interação recomendados
```json
{
  "eventName": "object.inspected",
  "inspectable": true,
  "levelId": "level_01",
  "levelNumber": 1,
  "objectId": "npc_abc",
  "objectType": "texture_key"
}
```

---

## 4) Aquisição de Badges
**Cards:** Explorer, Restaurador, Curador, Detetive, Persistente

### Backend calcula com:
- `badge.earned` + `metadata.badgeId`/`badgeName`

### Eventos necessários
- `badge.earned`

### Status atual
- `badge.earned` ✅ emitido no `BadgeSystem`

---

## 5) Saúde Técnica
**Cards:** Sessões sem erro

### Backend calcula com:
- Marca sessão como “com erro” se existir `EVENT_LOGGED` **crítico** entre `GAME_STARTED` e `SESSION_END`.

### Eventos necessários
- `event.logged` **com metadados de erro crítico**

### Status atual
- ❌ **Faltando** emissão de erro crítico

### Metadados de erro críticos aceitos pelo backend
Qualquer um dos campos abaixo:
```json
{
  "level": "error",
  "severity": "critical",
  "statusCode": 500,
  "message": "fatal crash"
}
```

---

# Eventos já emitidos (resumo)
| Evento | Status | Onde é emitido |
|---|---|---|
| `game.started` | ✅ | `Game.ts` |
| `level.started` | ✅ | `Game.ts` (agora com `levelNumber`) |
| `level.completed` | ✅ | `Game.ts` |
| `quiz.completed` / `quiz.failed` | ✅ | `sendQuizOutcomeEvent` |
| `badge.earned` | ✅ | `BadgeSystem` |
| `session.end` | ✅ | shutdown da cena `Game` |
| `event.logged` (interação) | ✅ | `InteractionComponent` |

---

# Eventos faltando (resumo)
| Evento | Motivo | Impacto no Dashboard |
|---|---|---|
| `event.logged` de erro crítico | Não emitido atualmente | `Sessões sem erro` fica 0 |
| Interações adicionais (drag/drop, puzzle, etc.) | Não emitido | `Interação com pistas e objetos` subestimada |

---

# Eventos PostHog — Gameplay (issue #599)

Eventos PostHog puros (sem consumo pelo backend), cobrindo landing page, home,
minigames, quizzes e carregamento do jogo.

| Evento | Propriedades | Onde é emitido |
|---|---|---|
| `landing_page_viewed` | — | `PlayLanding.tsx` |
| `landing_page_play_clicked` | — | `PlayLanding.tsx` |
| `landing_page_dwell_time` | `dwell_ms` | `PlayLanding.tsx` |
| `game_home_viewed` | — | `MapIntroScene.ts` |
| `game_home_dwell_time` | `dwell_ms` | `MapIntroScene.ts` |
| `map_pin_clicked` | `marker_id`, `level_id`, `is_available` | `MapIntroScene.ts` |
| `game_started_with_spacebar` | `marker_id`, `level_id` | `MapIntroScene.ts` |
| `minigame_started` | `minigame_number` (1=sculptures, 2=paintings, 3=photo), `level_id` | `PaintingMechanicHandler.ts`, `SculptureMechanicHandler.ts`, `Game.ts` (photo) |
| `minigame_completed` | `minigame_number`, `level_id`, `errors`, `quarters_earned` | `Game.ts` (`completeFloor`) |
| `intermediate_quiz_started` | `quiz_number` (1=sculptures, 2=paintings, 3=photo), `level_id`, `info_key` | `QuizManager.ts` |
| `intermediate_quiz_completed` | `quiz_number`, `level_id`, `info_key`, `score`, `total_questions`, `passed` | `QuizManager.ts` |
| `quiz_started` | `level_id`, `mission_id`, `total_questions`, `attempt_number` | `QuizManager.ts` |
| `quiz_answer_submitted` | `quiz_number` (null for regular end-of-level quizzes), `question_id`, `selected_answer`, `is_correct`, `attempt_number` | `game-ui-store.ts` (`selectOption`) |
| `game_load_success` | `level_id`, `loading_time_ms` | `PhaserGame.tsx` |
| `game_load_failed` | `error_message`, `error_type`, `loading_stage` (`player_id_resolution`/`module_import`/`phaser_init`/`asset_load`) | `PhaserGame.tsx`, `Game.ts` (asset `loaderror`) |
| `player_scored` | `level_id`, `total_quarters`, `total_stars`, `quarters_earned` | `Game.ts` (`SCORE_UPDATED` handler) |
| `star_collected` | `level_id`, `total_stars`, `previous_stars`, `total_quarters` | `Game.ts` (`SCORE_UPDATED` handler, star threshold crossed) |
| `clue_collected` | `level_id`, `collectible_id`, `collectible_type`, `total_collected`, `total_available` | `CollectibleSystem.ts` |
| `pistas_board_opened` | — | `HintCard.tsx` (PostHog) |

`browser`/`operating_system` are not sent as custom properties — PostHog
autocaptures `$browser`/`$os` on every event regardless of `autocapture: false`
(that flag only disables DOM click autocapture).

`capture_web_vitals` and `capture_dead_clicks` are enabled in
`PostHogProvider.tsx`'s `posthog.init(...)` config.

---

# Observações
- Após alterações no formato de metadata, **recomenda-se limpar eventos antigos** no banco de desenvolvimento (para evitar taxas > 100%).
- O backend aceita múltiplas chaves para identificar capítulo/sessão 1, mas `levelNumber` é o caminho mais seguro.
