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
- ✅ **Emitido** — `PhaserGame.tsx`'s `handleLoadingError` was a no-op until #741; it now
  captures `critical_error_occurred` to PostHog and mirrors an `event.logged` row with
  `severity: "critical"` on asset-load failures (Phaser `loaderror`). Closes the same
  pendency `docs/EPIC-analytics-dashboard.md` tracked ("emit `event.logged` for critical
  errors") — see `docs/specs/discovery-738-dashboard-edital.md` §3.6.

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
| `session.end` | ✅ | shutdown da cena `Game`; também via `AnalyticsSystem.setupAbandonmentTracking` (session-scoped, ver #741) |
| `event.logged` (interação) | ✅ | `InteractionComponent` |
| `event.logged` (`severity: "critical"`) | ✅ | `PhaserGame.tsx` (`handleLoadingError`, ajuste #741) |

---

# Eventos faltando (resumo)
| Evento | Motivo | Impacto no Dashboard |
|---|---|---|
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
| `minigame_started` | `minigame_number` (1=sculptures, 2=paintings, 3=photo), `level_id` | `Game.ts` |
| `minigame_completed` | `minigame_number`, `level_id`, `errors`, `quarters_earned` | `Game.ts` (`completeFloor`) |
| `step_sequence_interacted` | `level_id` | `Game.ts` |
| `step_sequence_failed_attempt` | `level_id`, `instance_id`, `attempt_number`, `wrong_count`, `correct_count`, `total_slots` | `Game.ts` |
| `intermediate_quiz_started` | `quiz_number` (1=sculptures, 2=paintings, 3=photo), `level_id`, `info_key` | `QuizManager.ts` |
| `intermediate_quiz_completed` | `quiz_number`, `level_id`, `info_key`, `score`, `total_questions`, `passed` | `QuizManager.ts` |
| `quiz_started` | `level_id`, `mission_id`, `total_questions`, `attempt_number` | `QuizManager.ts` |
| `quiz_answer_submitted` | `quiz_number` (null for regular end-of-level quizzes), `question_id`, `selected_answer`, `is_correct`, `attempt_number` | `game-ui-store.ts` (`selectOption`) |
| `game_load_success` | `level_id`, `loading_time_ms` | `PhaserGame.tsx` |
| `game_load_failed` | `error_message`, `error_type`, `loading_stage` (`player_id_resolution`/`module_import`/`phaser_init`) | `PhaserGame.tsx` (module import / Phaser init failures only — **not** asset `loaderror`; that is `critical_error_occurred` below. This row previously and incorrectly claimed asset-load coverage too — `handleLoadingError` was a no-op until #741, see docs/specs/discovery-738-dashboard-edital.md §3.6) |
| `critical_error_occurred` | `error_code` (e.g. `asset_load_failed`), `is_blocking`, `loading_stage`, `asset_key`, `level_id` | `PhaserGame.tsx` (`phaser-loading-error` — asset `loaderror`, dispatched from `Game.ts`'s `preload()`). Also mirrored into `game_event` with `severity: "critical"` via the `EVENT_LOGGED` type |
| `player_scored` | `level_id`, `total_quarters`, `total_stars`, `quarters_earned` | `Game.ts` (`SCORE_UPDATED` handler) |
| `star_collected` | `level_id`, `total_stars`, `previous_stars`, `total_quarters` | `Game.ts` (`SCORE_UPDATED` handler, star threshold crossed) |
| `clue_collected` | `level_id`, `collectible_id`, `collectible_type`, `total_collected`, `total_available` | `CollectibleSystem.ts` |
| `pistas_board_opened` | — | `HintCard.tsx` (PostHog) |
| `nudge_pulse_shown_{costume,spotlight,step_sequence}` | `level_id`, `mission_id` | `Game.ts` (branch de pulse do nudge) |
| `nudge_hint_shown_{sculpture,painting,poster,photo,costume,spotlight}` | `level_id`, `mission_id`, `hint_message` | `Game.ts` (branch de dica do nudge) |

---

# Funil canônico do Edital (epic #738)

7 passos definidos em `docs/specs/edital-onepager.md` (interino até o onepager real ser
commitado — ver §1.1 de `docs/specs/discovery-738-dashboard-edital.md`). Cada evento é
**dual-emit**: existe ao lado do evento legado equivalente, nunca o substitui — ver
`docs/specs/discovery-738-dashboard-edital.md` §5.3 para por que `before_send` não é usado
para renomear/fundir eventos.

| # | Evento canônico | Propriedades | Onde é emitido | Guarda de disparo único |
|---|---|---|---|---|
| 1 | `landing_page_viewed` | — | `PlayLanding.tsx` | nenhuma (uma vez por mount da landing) |
| 2 | `play_clicked` | — | `PlayLanding.tsx` (`handlePlay`) | nenhuma |
| 3 | `gameplay_started` | `level_id`, `level_number` | `Game.ts` (`create()`) | `captureOncePerSession` (sessionStorage) — o legado `game_started` continua disparando 1x por nível |
| 4 | `chapter_1_started` | `level_id` | `Game.ts` (junto ao `LEVEL_STARTED`, `levelNumber === 1`) | nenhuma além da condição de nível |
| 5 | `quiz_started` | `level_id`, `mission_id`, `total_questions`, `attempt_number` | `QuizManager.ts` | nenhuma (já existente, exclui quizzes intermediários) |
| 6 | `quiz_completed` | `level_id`, `mission_id`, `score`, `correct_answers`, `total_questions`, `accuracy_percent`, `passed` | `QuizManager.ts` | nenhuma (já existente) |
| 7 | `chapter_1_completed` | `level_id` | `QuizManager.ts` (junto ao `level_completed`, `levelNumber === 1`) | nenhuma além da condição de nível |

Eventos de suporte ao funil, fora da sequência de 7 passos mas necessários para
identidade/qualidade dos dados (epic #740/#741):

| Evento | Propriedades | Onde é emitido | Guarda de disparo único |
|---|---|---|---|
| `anonymous_player_created` | — | `PostHogProvider.tsx` | localStorage, condicionado ao marcador "recém-semeado" do middleware (#740) |
| `session_finished` | `reason` (`pagehide`/`visibilitychange`/`browser_close`), `duration_seconds`, `last_level_id` | `AnalyticsSystem.ts` (`setupAbandonmentTracking`) | sessionStorage — substitui a inflação por nível do `session.end` legado |
| `critical_error_occurred` | `error_code`, `is_blocking`, `loading_stage`, `asset_key`, `level_id` | `PhaserGame.tsx` (`handleLoadingError`) | nenhuma (cada asset falho é um erro distinto) |

**Ainda não definido** (ver §4/§7 da discovery): a taxonomia `CAMPAIGN_ORIGINS`, o enum
completo de `error_code`, e o que a tela mostra para jogadores sem `utm_institution` algum.

## Nudge — regras de disparo

Necessário para interpretar os eventos `nudge_*`:

- **Gatilho:** ~15s de inatividade do jogador, avaliado no máximo 1x/s, e nunca enquanto o
  jogador está ocupado ou com painel/diálogo aberto.
- **Tipo por proximidade, não por escalonamento:** o pulse dispara quando há um placeholder de
  figurino ou um refletor incompleto num raio de ~500px; caso contrário, exibe-se o
  `educational.hint` da obra mais próxima como toast. Por isso as duas famílias de evento são
  mutuamente exclusivas por disparo — o atraso é o mesmo para as duas.
- **Cooldown global de 5 minutos** após qualquer nudge, com reset a cada troca de missão. A
  contagem de eventos por sessão é baixa por design, não por falta de instrumentação.
- Os dois eventos de pulse podem disparar no mesmo tick quando há um placeholder de figurino
  **e** um refletor incompleto no raio.
- `mission_id` vem de `NudgeManager.getCurrentMissionId()` e é `""` até a primeira missão
  entrar em `COLLECTING` — considerar antes de agrupar por esse campo.
- `PHOTO` e `PHOTO_CHUNK` mapeiam para o mesmo `nudge_hint_shown_photo`: 7 tipos interativos,
  6 nomes distintos de evento de dica.

`browser`/`operating_system` are not sent as custom properties — PostHog
autocaptures `$browser`/`$os` on every event regardless of `autocapture: false`
(that flag only disables DOM click autocapture).

`capture_web_vitals` and `capture_dead_clicks` are enabled in
`PostHogProvider.tsx`'s `posthog.init(...)` config.

---

# Observações
- Após alterações no formato de metadata, **recomenda-se limpar eventos antigos** no banco de desenvolvimento (para evitar taxas > 100%).
- O backend aceita múltiplas chaves para identificar capítulo/sessão 1, mas `levelNumber` é o caminho mais seguro.
