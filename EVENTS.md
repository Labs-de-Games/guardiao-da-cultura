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
| `minigame_started` | `minigame_number` (1=sculptures, 2=paintings, 3=photo), `level_id` | `Game.ts` |
| `minigame_completed` | `minigame_number`, `level_id`, `errors`, `quarters_earned` | `Game.ts` (`completeFloor`) |
| `step_sequence_interacted` | `level_id` | `Game.ts` |
| `step_sequence_failed_attempt` | `level_id`, `instance_id`, `attempt_number`, `wrong_count`, `correct_count`, `total_slots` | `Game.ts` |
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
| `investigation_opened` | `collected_clues`, `shown_clues`, `previous_stars` | `InvestigationScene.ts` (`buildAndEmitPayload`) |
| `investigation_clue_placed` | `level_id`, `clue_key`, `clue_source` (`player`/`curator`), `trait_id`, `suspect_id`, `slot_index`, `verdict` (`quente`/`morno`/`frio`), `hearts_left`, `replaced_clue_key`, `attempt_number`, `is_tutorial` | `game-ui-store.ts` (`placeClueInSlot`) |
| `investigation_suspect_accused` | `level_id`, `suspect_id`, `attempt_number`, `clues_on_suspect`, `hot_clues`, `cold_clues`, `is_correct`, `wrong_attempts`, `stars`, `revealed` | `game-ui-store.ts` (`accuseSuspect`) |
| `investigation_suspect_identified` | `level_id`, `suspect_id`, `stars`, `wrong_attempts`, `attempt_number`, `clues_on_suspect`, `hot_clues`, `cold_clues`, `clues_collected`, `clues_available` | `game-ui-store.ts` (`accuseSuspect`, acerto) |
| `investigation_completed` | `stars`, `wrong_attempts`, `total_stars` | `InvestigationScene.ts` (`recordResult`) |
| `nudge_pulse_shown_{costume,spotlight,step_sequence}` | `level_id`, `mission_id` | `Game.ts` (branch de pulse do nudge) |
| `nudge_hint_shown_{sculpture,painting,poster,photo,costume,spotlight}` | `level_id`, `mission_id`, `hint_message` | `Game.ts` (branch de dica do nudge) |

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
- **`investigation_completed` fecha a partida pelo lado da cena**, disparado por
  `investigation:completed` logo depois de `ProgressionManager.recordLevelCompleted`. Sai nos
  **dois** desfechos — acerto e revelação na 4ª errada —, então serve para contar partidas
  concluídas; para separar vitória de derrota use `is_correct`/`revealed` em
  `investigation_suspect_accused`.
- **`total_stars` é o total do jogo inteiro, não da fase**, lido de
  `ProgressionManager.getState()` já com o resultado desta partida somado. Só `stars` se
  refere à investigação.
- **O evento não garante que o progresso foi salvo.** É emitido antes do `saveProgress`, que
  está num `try/catch` — uma falha de rede registra o `investigation_completed` mesmo assim.
  Divergências com o progresso do backend são esperadas nessa margem.
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
