# Eventos de Analytics — Dashboard

> **Existem três stacks de analytics neste repositório** (registrado
> aqui por #748 para que nenhuma delas seja confundida com "o" analytics
> do produto):
> 1. **PostHog** (`front/src/components/PostHogProvider.tsx`,
>    `back/src/modules/posthog/*`) — **fonte de verdade do dashboard do
>    edital** (épico #738). Todo número reportado à instituição vem daqui.
> 2. **Pipeline Postgres** (`game_event` + `analytics.service.ts` +
>    `dashboard.service.ts`, `GET /metrics`) — dashboard interno legado,
>    mantido como fallback até as telas do edital (#745) rodarem um ciclo
>    completo de apuração em produção (#748). Não é a fonte de verdade do
>    edital.
> 3. **Google Ads gtag** (`front/src/app/layout.tsx`, `AW-18191558713`) —
>    conversão de anúncios, fora do escopo deste documento.
>
> Um print de qualquer uma das stacks 2–3 **não** representa o número do
> edital — só a stack 1 (PostHog) faz isso.
>
> Existia uma quarta stack, **Contentsquare** (script
> `t.contentsquare.net/uxa/`, sessão/heatmap de terceiros), removida em
> 2026-09-29. Ela nunca alimentou número nenhum deste documento. Vale saber
> ao garimpar o histórico: o commit que a adicionou se chama "add hotjar
> tracking script" — Hotjar é produto da Contentsquare, então buscar
> "hotjar" na árvore não acha nada e buscar no log acha isto.

> ## ⚠️ As stacks 1 e 2 dependem de consentimento (#864)
>
> Desde a issue #864, **nenhum evento de analytics é coletado antes de o
> jogador aceitar** — nem no PostHog, nem no pipeline Postgres. O diálogo é
> bloqueante: ninguém chega ao jogo sem responder. Consequências para todo
> número deste documento:
>
> - **As stacks 1 e 2 passam a contar apenas quem consentiu.** Não existe mais
>   "fonte sem viés de consentimento" neste repositório: quem recusa não gera
>   evento em lugar nenhum.
> - **`landing_page_viewed` é o mais afetado**: é o passo 1 do funil e o
>   denominador da "Taxa de entrada na gameplay". Espere uma queda de patamar
>   em relação ao pré-#864 — mas leia o item seguinte antes de atribuir
>   qualquer número a consentimento.
> - **Nem toda queda é viés de consentimento (#899).** Entre 2026-09-28 e a
>   correção da #899, `landing_page_viewed` e `$pageview` não chegavam ao
>   PostHog para **ninguém**, nem para quem já tinha aceitado: eram disparados
>   na montagem do componente, antes de o `init()` acontecer, e o posthog-js
>   descarta captura pré-`init()`. Como o `windowFunnel` é estritamente
>   ordenado, o funil inteiro ficava zerado. Esse período não tem reposição —
>   os eventos nunca foram enviados.
> - **Esses dois eventos agora disparam quando o PostHog inicializa**, não na
>   montagem — ou seja, no instante em que o jogador aceita, se for a primeira
>   visita (`usePostHogReady`, `lib/posthog/PostHogReadyContext.tsx`). Isso
>   **não** é coleta retroativa: nada é guardado nem reenviado, e a página
>   descrita pelo evento continua aberta na frente do jogador no momento da
>   captura. Quem recusa continua não gerando evento nenhum.
> - **Não há coleta retroativa em nenhuma das duas.** O posthog-js descarta
>   capturas feitas antes do `init()`; a fila em `gameplate:eventQueue:v1`
>   (nome legado, mantido por compatibilidade) é **descartada** sem consentimento, em vez de guardada — aceitar autoriza
>   dali para frente, nunca para trás.
> - **O progresso do jogador continua sendo gravado** (`/scores`,
>   `/progression`): é o jogo salvo dele, não medição sobre ele. Só `/events`
>   é bloqueado.
> - O gate vale nos dois lados. O front não envia, e o backend descarta o que
>   chegar sem o cookie `gp_analytics_consent` — inclusive o `session.end`
>   entregue por `sendBeacon`. Eventos do backend (`match_ended`, exceções)
>   seguem a mesma regra.

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
  pendency `docs/pt-BR/notes/EPIC-analytics-dashboard.md` tracked ("emit `event.logged` for critical
  errors").

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
| `landing_page_viewed` | `referrer` | `PlayLanding.tsx` (ao PostHog inicializar, não na montagem — #899) |
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
| `genius_sequence_interacted` | `level_id` | `Game.ts` (abertura do painel da sequência genius) |
| `genius_sequence_failed_attempt` | `level_id`, `instance_id`, `attempt_number`, `wrong_count`, `correct_count`, `total_rounds` | `Game.ts` (`ui:genius-sequence-rejected`) |
| `costume_interacted` | `level_id` | `Game.ts` (abertura do seletor de figurino) |
| `band_interacted` | `level_id` | `Game.ts` (abertura do painel da banda) |
| `label_interacted` | `label_title`, `label_author` | `Game.ts` (abertura da etiqueta de uma obra) |
| `rat_interacted` | `level_id` | `Game.ts` (interação com o rato) |
| `npc_interacted` | `npc_id` (nome do NPC), `mission_id`, `quest_status` | `Npc.ts` (`handleInteraction`) |
| `level_next_started` | `from_level_id`, `to_level_id` | `UIScene.ts` — ao avançar para a próxima fase depois do quiz, inclusive para a investigação (fase 4); não dispara quando não há próxima fase jogável |
| `settings_opened` | `from_screen` (hoje sempre `"game"`) | `UIScene.ts` (`toggleControls`, só ao abrir) |
| `intermediate_quiz_started` | `quiz_number` (1=sculptures, 2=paintings, 3=photo), `level_id`, `info_key` | `QuizManager.ts` |
| `intermediate_quiz_completed` | `quiz_number`, `level_id`, `info_key`, `score`, `total_questions`, `passed` | `QuizManager.ts` |
| `quiz_started` | `level_id`, `mission_id`, `total_questions`, `attempt_number` | `QuizManager.ts` |
| `quiz_answer_submitted` | `quiz_number` (null for regular end-of-level quizzes), `question_id`, `selected_answer`, `is_correct`, `attempt_number` | `game-ui-store.ts` (`selectOption`) |
| `game_load_success` | `level_id`, `loading_time_ms` | `PhaserGame.tsx` |
| `game_load_failed` | `error_message`, `error_type`, `loading_stage` (`player_id_resolution`/`module_import`/`phaser_init`) | `PhaserGame.tsx` (module import / Phaser init failures only — **not** asset `loaderror`; that is `critical_error_occurred` below. This row previously and incorrectly claimed asset-load coverage too — `handleLoadingError` was a no-op until #741) |
| `critical_error_occurred` | `error_code` (e.g. `asset_load_failed`), `is_blocking`, `loading_stage`, `asset_key`, `level_id` | `PhaserGame.tsx` (`phaser-loading-error` — asset `loaderror`, dispatched from `Game.ts`'s `preload()`). Also mirrored into `game_event` with `severity: "critical"` via the `EVENT_LOGGED` type |
| `error_page_viewed` | `error_page_type` (`not_found`/`server_error`/`maintenance`/`asset_load`/`connection`/`session_expired`), `path`, e conforme a página `digest`, `stage`, `asset_key`, `level_id`, `reason` | `lib/errors/reportError.ts` (`reportErrorPage`), chamado pelas páginas de erro e fallback. Quando há um `Error`, o mesmo payload vai por `posthog.captureException` em vez deste evento. `reportErrorPageOncePerSession` limita a 1x por sessão por motivo |
| `player_scored` | `level_id`, `total_quarters`, `total_stars`, `quarters_earned` | `Game.ts` (`SCORE_UPDATED` handler) |
| `star_collected` | `level_id`, `total_stars`, `previous_stars`, `total_quarters` | `Game.ts` (`SCORE_UPDATED` handler, star threshold crossed) |
| `clue_collected` | `level_id`, `collectible_id`, `collectible_type`, `total_collected`, `total_available` | `CollectibleSystem.ts` |
| `clue_used` | `level_id`, `clue_index` | `InteractionComponent.ts` (`showHint`) — distinct from `clue_collected` above. Fires when the game shows a hint on its own after the player lingers near an object, **not** when the player does anything with a clue; the edital dashboards don't use it since #834 (see "Métricas por fase dos dashboards") |
| `level_completed` | `level_id`, `level_number`, `score`, `stars`, `rating`, `mission_id`, `time_spent_ms`, `attempts` | `QuizManager.ts` — general-purpose, levels 1–3 (unlike `chapter_1_completed` below, which only fires for level 1). `stars` can be fractional (quarters / 4); every level is out of 5 |
| `level_failed` | `level_id`, `level_number`, `mission_id`, `score`, `total_questions` | `QuizManager.ts` |
| `progress_updated` | `level_id`, `level_number`, `current_level`, `total_stars`, `completed_levels_count`, `mission_id`, `passed`, `score`, `total_questions` | `QuizManager.ts`; also `InvestigationScene.ts` (`recordResult`) for level 4 since #834, with only `level_id`, `level_number`, `current_level`, `total_stars`, `completed_levels_count` |
| `pistas_board_opened` | — | `HintCard.tsx` (PostHog) |
| `investigation_opened` | `level_id`, `level_number`, `collected_clues`, `shown_clues`, `previous_stars` | `InvestigationScene.ts` (`buildAndEmitPayload`) |
| `investigation_clue_placed` | `level_id`, `level_number`, `clue_key`, `clue_source` (`player`/`curator`), `trait_id`, `suspect_id`, `slot_index`, `verdict` (`quente`/`morno`/`frio`), `hearts_left`, `replaced_clue_key`, `attempt_number`, `is_tutorial` | `game-ui-store.ts` (`placeClueInSlot`) |
| `investigation_suspect_accused` | `level_id`, `suspect_id`, `attempt_number`, `clues_on_suspect`, `hot_clues`, `cold_clues`, `is_correct`, `wrong_attempts`, `stars`, `revealed` | `game-ui-store.ts` (`accuseSuspect`) |
| `investigation_suspect_identified` | `level_id`, `suspect_id`, `stars`, `wrong_attempts`, `attempt_number`, `clues_on_suspect`, `hot_clues`, `cold_clues`, `clues_collected`, `clues_available` | `game-ui-store.ts` (`accuseSuspect`, acerto) |
| `investigation_completed` | `level_id`, `level_number`, `stars`, `wrong_attempts`, `is_correct`, `revealed` | `InvestigationScene.ts` (`recordResult`). `level_id`/`level_number`/`is_correct`/`revealed` added in #834; `total_stars` moved to `progress_updated` |
| `nudge_pulse_shown_{costume,spotlight,step_sequence,genius_sequence}` | `level_id`, `mission_id` | `Game.ts` (branch de pulse do nudge) |
| `nudge_hint_shown_{sculpture,painting,poster,photo,costume,spotlight,step_sequence,band,genius_sequence}` | `level_id`, `mission_id`, `hint_message` | `Game.ts` (branch de dica do nudge) |

---

## Nudge — regras de disparo

Necessário para interpretar os eventos `nudge_*`:

- **Gatilho:** ~15s de inatividade do jogador, avaliado no máximo 1x/s, e nunca enquanto o
  jogador está ocupado ou com painel/diálogo aberto.
- **Tipo por proximidade, não por escalonamento:** o pulse dispara quando há um placeholder de
  figurino, de sequência de passos ou de sequência genius, ou um refletor incompleto, num raio
  de ~500px; caso contrário, exibe-se o
  `educational.hint` da obra mais próxima como toast. Por isso as duas famílias de evento são
  mutuamente exclusivas por disparo — o atraso é o mesmo para as duas.
- **Cooldown global de 5 minutos** após qualquer nudge, com reset a cada troca de missão. A
  contagem de eventos por sessão é baixa por design, não por falta de instrumentação.
- Mais de um evento de pulse pode disparar no mesmo tick quando há vários desses alvos no
  raio (por exemplo, um placeholder de figurino **e** um refletor incompleto).
- `mission_id` vem de `NudgeManager.getCurrentMissionId()` e é `""` até a primeira missão
  entrar em `COLLECTING` — considerar antes de agrupar por esse campo.
- `PHOTO` e `PHOTO_CHUNK` mapeiam para o mesmo `nudge_hint_shown_photo`: 10 tipos interativos,
  9 nomes distintos de evento de dica (`NUDGE_HINT_EVENT_BY_TYPE` em `Game.ts`).

## Investigação (fase 4) — regras de disparo

A fase de identificação do suspeito (`level_04`) não é um nível jogável: o jogador arrasta
pistas da barra lateral para os espaços de cada suspeito e acusa um deles. Necessário para
interpretar os eventos `investigation_*`:

- **`investigation_clue_placed` conta solturas, não pistas distintas.** Cada pista tem 3 usos
  (`INVESTIGATION_CLUE_HEARTS`) e cada soltura gasta um — `hearts_left` é o saldo **depois** do
  gasto, e `hearts_left: 0` significa que a pista ficou presa naquele suspeito até o fim da
  partida. A mesma pista pode aparecer em até 3 eventos por partida.
- **`is_tutorial: true` marca a soltura roteirizada do tutorial**, que roda sozinho na primeira
  visita e pode ser repetido pelo botão COMO JOGAR. Não é jogo de verdade: **filtre
  `is_tutorial: false`** em qualquer métrica de uso de pistas, ou a primeira soltura de todo
  jogador entra na conta.
- **`verdict` é a avaliação do dossiê, não um julgamento do jogador**: `quente` quando o traço
  provado pela pista bate com o suspeito, `frio` quando contradiz, `morno` quando o dossiê nada
  diz. O jogo não valida as escolhas — a leitura do tabuleiro é do jogador.
- **`attempt_number` é 1-based e reinicia a cada entrada na fase.** Uma acusação errada limpa o
  tabuleiro e devolve todas as pistas com os usos cheios, então é a rodada dentro da mesma
  partida, não o número de partidas.
- **`investigation_suspect_accused` dispara em toda acusação confirmada** (o diálogo "Tem
  certeza?" já foi aceito). `stars` é `null` enquanto a partida continua e só é preenchido
  quando ela se resolve — no acerto, ou em `revealed: true`.
- **`revealed: true`** é a 4ª acusação errada (`INVESTIGATION_MAX_WRONG_ATTEMPTS`): a curadora
  revela o culpado e a partida fecha com 1 estrela de consolação.
- **`investigation_suspect_identified` é redundante por desenho.** Todo acerto emite os dois
  eventos; o dedicado existe para o funil não precisar filtrar o fluxo de acusações. Para
  contar vitórias use ele; para taxa de acerto use `investigation_suspect_accused`.
- **`clues_collected` vs `clues_available`:** o primeiro é quanto o jogador realmente coletou
  nas fases 1–3; o segundo inclui o complemento da curadora, que entra automaticamente abaixo
  de `INVESTIGATION_MIN_CLUES` para a dedução continuar possível. `clues_collected <
  clues_available` identifica quem chegou com pouca evidência.
- **Estrelas são por partida, mas o mapa guarda o melhor resultado.** `stars` é o resultado
  daquela partida; `ProgressionManager.recordLevelCompleted` mantém o `max`, então a média
  desses eventos não bate com o que o mapa exibe.
- **`investigation_opened` conta entradas na fase, não jogadores.** Dispara a cada entrada,
  depois de montar o dossiê e antes da tela aparecer. `previous_stars > 0` identifica uma
  rejogada — a fase é replayável para melhorar a nota.
- **`shown_clues - collected_clues` é o complemento da curadora**, adicionado automaticamente
  quando o jogador chega com menos de `INVESTIGATION_MIN_CLUES`. É a mesma distinção que
  `clues_collected` vs `clues_available` em `investigation_suspect_identified`, medida na
  entrada em vez de na vitória.
- **`investigation_completed` fecha a partida — e o jogo.** Disparado por
  `investigation:completed` como primeira coisa de `recordResult`, antes de qualquer `await`,
  para uma aba fechada durante o carregamento do progresso não perder o evento. Sai nos
  **dois** desfechos — acerto e revelação na 4ª errada —, e os dois contam como "concluiu o
  jogo" nos dashboards (#834). `is_correct`/`revealed` no próprio evento separam vitória de
  revelação.
- **`total_stars` (total do jogo inteiro) saiu deste evento em #834** e agora vem em
  `progress_updated`, emitido logo depois de `ProgressionManager.recordLevelCompleted` com o
  resultado desta partida já somado. Aqui, só `stars` (de 1 a 5) se refere à investigação.
- **O evento não garante que o progresso foi salvo.** É emitido antes do `saveProgress`, que
  está num `try/catch` — uma falha de rede registra o `investigation_completed` mesmo assim.
  Divergências com o progresso do backend são esperadas nessa margem.
- **A fase grava placar em `/scores` como as fases 1–3** (#834), depois do progresso:
  `totalStars` é a nota da partida e os campos que a investigação não tem (quarters, andares,
  quiz, quizzes intermediários, colecionáveis, `rating`) vão vazios ou zerados. Isso gera uma
  linha em `user_score` e o `match_ended` do backend para `level_04`.
- **Uma rejogada pior também emite `investigation_completed`.** O mapa guarda o `max`, o evento
  guarda a partida: contar esses eventos não dá número de jogadores que concluíram a fase, e a
  média de `stars` fica abaixo do que o mapa exibe.

`browser`/`operating_system` are not sent as custom properties — PostHog
autocaptures `$browser`/`$os` on every event regardless of `autocapture: false`
(that flag only disables DOM click autocapture).

`capture_web_vitals` and `capture_dead_clicks` are enabled in
`PostHogProvider.tsx`'s `posthog.init(...)` config.

---

# Observações
- Após alterações no formato de metadata, **recomenda-se limpar eventos antigos** no banco de desenvolvimento (para evitar taxas > 100%).
- O backend aceita múltiplas chaves para identificar capítulo/sessão 1, mas `levelNumber` é o caminho mais seguro.

---

# Funil canônico do edital (épico #738)

Sete passos hoje (3 de aquisição + 1 por fase em `DASHBOARD_LEVELS`, hoje 4
fases — as 3 de `LEVEL_REGISTRY` mais a investigação), é o que
`getFunnelSteps()` em `front/src/lib/edital/server/queries.ts` usa nas
queries HogQL Q1 e Q4 (summary e funnel). Este funil é **dinâmico**: uma
fase adicionada a `DASHBOARD_LEVELS` (`front/src/lib/edital/server/levels.ts`)
ganha um passo automaticamente, sem precisar de código novo.

> **Correção (issue #807):** este funil já foi hardcoded em torno de
> `chapter_1_started`/`chapter_1_completed`, mas esse par só cobre a fase 1
> — a issue #807 substituiu isso por um passo `level_completed` genérico
> por fase, com aviso explícito no código: "não utilizar
> chapter_1_started/chapter_1_completed como base geral". `chapter_1_started`
> e `chapter_1_completed` continuam sendo emitidos de verdade (ver tabela de
> dual-emit abaixo), só não alimentam mais a query do funil.

| # | Passo | Condição usada por `queries.ts` | Onde é emitido |
|---|---|---|---|
| 1 | `landing_page_viewed` | `event = 'landing_page_viewed'` | `PlayLanding.tsx`, ao PostHog inicializar (#899) |
| 2 | `play_clicked` | `event = 'play_clicked'` | `PlayLanding.tsx` (`handlePlay`) |
| 3 | `gameplay_started` | `event = 'gameplay_started'` | `Game.ts` (`create()`, via `captureOncePerSession`) |
| 4 | "Concluiu Fase 1" | `event = 'level_completed' AND level_number = 1` | `QuizManager.ts`, quiz de fim de fase 1 aprovado |
| 5 | "Concluiu Fase 2" | `event = 'level_completed' AND level_number = 2` | `QuizManager.ts`, quiz de fim de fase 2 aprovado |
| 6 | "Concluiu Fase 3" | `event = 'level_completed' AND level_number = 3` | `QuizManager.ts`, quiz de fim de fase 3 aprovado |
| 7 | "Concluiu Fase 4" | `event = 'investigation_completed'` | `InvestigationScene.ts`, culpado identificado ou revelado (#834) |

O passo 7 é também o que a "taxa de conclusão" conta como "concluiu o
jogo" (`FINAL_LEVEL` em `levels.ts`), nos dois dashboards.

`quiz_started`/`quiz_completed` são eventos reais (ver `QuizManager.ts`),
mas **não são passos do funil** — o funil usa apenas `level_completed`
(que já carrega o resultado do quiz) para marcar a conclusão de cada fase.
Um quiz reprovado emite `level_failed` em vez de `level_completed` e não
avança o funil.

Todo passo carrega `properties.anonymous_player_id` (identidade durável,
issue #740) e `properties.campaign_source` (attribution, issue #740) —
`COMMON_PREDICATE` em `queries.ts` filtra por ambos; sem eles a linha não
entra em nenhuma métrica do edital. Desde a issue #807, eventos também
carregam `properties.turma_source` — mesmo mecanismo de first-touch de
`campaign_source` (`campaign.ts`'s `applyFirstTouchTurmaSource`), a partir
do `utm_source` do link de turma (`origins.ts`'s `buildTrackingUrl`), e é
o que as queries de turma em `queries.ts` (`TURMA_PREDICATE`) usam — nunca
o `utm_source` bruto autocapturado pelo posthog-js, que é last-touch e
sobrescrito a cada visita. Todo evento após a entrada na fase 1
carrega também `chapter_id` (`before_send`, a partir do singleton em
`lib/posthog/eventContext.ts`, setado por `setChapterId` em
`chapter_1_started` e limpo no `SHUTDOWN` da cena).

Eventos adicionais, fora dos passos do funil mas dual-emitidos pelo mesmo
mecanismo (issue #741):

| Evento canônico | Legado (mantido, outro consumidor) | Onde é emitido |
|---|---|---|
| `quiz_answered` | `quiz_answer_submitted` | `game-ui-store.ts` — `+ quiz_result` ("correct"/"incorrect") |
| `score_calculated` | `score_updated` | `PersistenceBridge.ts` — alto volume, não é denominador de card |
| `badge_earned` | *(já canônico)* | `BadgeSystem.ts` — `+ chapter_id` |

## Métricas por fase dos dashboards (#834)

Cada fase responde as mesmas perguntas com eventos diferentes — a
investigação (fase 4) não é um nível jogável e não está em
`LEVEL_REGISTRY`. `DASHBOARD_LEVELS` em `front/src/lib/edital/server/levels.ts`
guarda, por fase, qual evento responde cada uma; as queries de
`queries.ts`/`globalQueries.ts` só leem essa lista.

| Métrica | Fases 1–3 | Fase 4 (investigação) |
|---|---|---|
| Chegou à fase | `game_started` | `investigation_opened` |
| Concluiu a fase | `level_completed` | `investigation_completed` (os dois desfechos) |
| Pistas | `clue_collected` (pistas coletadas) | `investigation_clue_placed` com `is_tutorial = false` (pistas posicionadas no quadro — cada soltura conta, inclusive mover a mesma pista) |
| Estrelas (de 5) | `stars` de `level_completed` | `stars` de `investigation_completed` |
| Aprovação no quiz | `quiz_completed` | — (a fase não tem quiz; fica fora dos gráficos de quiz e vazia no CSV) |

- **`clue_used` não entra mais.** Ele marca uma dica exibida automaticamente
  pelo jogo, não uma pista usada pelo jogador. A coluna do CSV
  `phase_N_clue_uses` virou `phase_N_clues`.
- **Estrelas:** para cada jogador, a melhor partida da fase (rejogadas
  guardam o melhor resultado, como o mapa); depois a média entre jogadores.
  Toda fase vale no máximo 5 estrelas (o mesmo teto do card do mapa e da
  investigação), então o painel mostra "3,4 / 5 ★" e o CSV traz
  `phase_N_avg_stars`. Eventos anteriores a #834 também entram.
- **Eventos antigos da investigação:** antes de #834,
  `investigation_opened`/`investigation_completed` não tinham `level_id`.
  As queries mapeiam os eventos exclusivos da fase 4 para `level_04` pelo
  nome (`levelIdExpression()` em `levels.ts`), então o histórico também
  conta.
- **Progresso médio** divide pelo número de fases em `DASHBOARD_LEVELS`
  (4, não mais 3), então o valor muda com o deploy.

## Mapa de dual-emit

Cada passo canônico é emitido **ao lado**, não **no lugar**, de um evento
legado já consumido por outra coisa (dashboard Postgres, `game_event`).
Um site de código pode disparar os dois na mesma chamada:

| Evento PostHog | Legado (mantido, outro consumidor) | Diferença de disparo |
|---|---|---|
| `gameplay_started` | `game_started` | Legado dispara 1x por nível (a cena `Game` reinicia a cada nível); canônico dispara **1x por sessão**, via `captureOncePerSession` (gameplay_started fires exactly once under StrictMode) |
| `chapter_1_started` | `level.started` (→ `game_event`, dashboard Postgres) | Só dispara para fase 1; legado dispara para toda fase. **Não é passo do funil do edital** (ver correção acima) — usado apenas para o dashboard Postgres legado e para setar `chapter_id` |
| `chapter_1_completed` | `level.completed` (→ `game_event`) | Mesma restrição a fase 1; mesma nota — não é passo do funil do edital |
| `play_clicked` | `landing_page_play_clicked` | Nomes distintos, mesmo disparo — mantido por compatibilidade com dashboards PostHog já existentes que consultam `landing_page_play_clicked` |
| `quiz_started` | — | Sem par legado; já era PostHog-nativo antes do épico #738; não é passo do funil (ver acima) |

## `critical_error_occurred` — hooks (issue #741)

Quatro hooks, todos carregando `error_code` + `is_blocking`; o dashboard
conta apenas `is_blocking = true`. Bloqueantes são espelhados em
`game_event` com `severity: "critical"` (exceto os hooks de error
boundary React, que não têm um `userId` de sessão de jogo disponível):

| Hook | Local | `error_code` | `is_blocking` |
|---|---|---|---|
| Falha no boot do Phaser | `PhaserGame.tsx` (catch do `initGame`) | `game_boot_failed:${stage}` | `true` |
| Falha em asset obrigatório | `PhaserGame.tsx` (`handleLoadingError`, via `Game.ts`'s `loaderror`) | `asset_load_failed` | `true` |
| Dados de quiz ausentes | `QuizManager.ts` (`startQuiz`) | `quiz_data_missing` | `true` |
| Error boundary do React | `app/error.tsx`, `app/global-error.tsx` | `react_error_boundary` | `true` / `true` |

## Decisão: quizzes intermediários fora do denominador

`intermediate_quiz_started`/`intermediate_quiz_completed` (quizzes no meio
de uma fase, ver seção anterior) **não entram** em `getFunnelSteps()` nem
em nenhuma query do edital. Só o quiz de fim de fase — que dispara
`level_completed` (o evento que o funil de fato usa, não `quiz_started`/
`quiz_completed` diretamente) — conta para o funil. Motivo: o edital
audita conclusão de capítulo, não engajamento por sub-etapa — incluir os
intermediários infla
o numerador de "iniciou quiz" sem representar um marco que o edital
reconhece, e um jogador pode completar vários quizzes intermediários sem
nunca chegar ao quiz de fim de nível. Decisão tomada implicitamente no
código desde a issue #742; registrada aqui explicitamente por #748.

## Correção: `game_load_failed` não cobre falha de asset

`game_load_failed` só cobre as três etapas do try/catch de `initGame`
(`player_id_resolution`/`module_import`/`phaser_init`) — nunca cobriu
falha de asset via `loaderror`, apesar do texto antigo deste documento
afirmar o contrário. `critical_error_occurred` é o evento correto para
isso (ver a tabela de eventos PostHog acima); `handleLoadingError` foi
implementado para emiti-lo na issue #741.
