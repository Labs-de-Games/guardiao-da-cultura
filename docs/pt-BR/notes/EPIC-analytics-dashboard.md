# EPIC — Analytics Dashboard (Instituição)

## Objetivo
Disponibilizar o dashboard institucional de métricas de engajamento com dados confiáveis e coerentes, evitando taxas inválidas (ex: >100%) e zerados por falta de eventos.

---

## Diagnóstico (root cause)
O frontend estava enviando eventos incompletos e o backend dependia de metadados específicos para calcular as métricas.

Principais causas:
- `level.started` sem `levelNumber` → entrada na Sessão 1 não era contabilizada.
- ausência de `session.end` → tempo médio de sessão sempre 0.
- ausência de `event.logged` de interação → interação com objetos sempre 0.
- ausência de `event.logged` crítico → sessões sem erro sempre 0.

---

## O que foi entregue
### Frontend
1) **Emissão de `level.started` com `levelNumber`**
   - Permite identificar a Sessão 1 corretamente.

2) **Emissão de `session.end` no shutdown da cena**
   - Permite calcular tempo médio de sessão.

3) **Emissão de `event.logged` em interações**
   - Permite calcular interação com pistas/objetos.

### Documentação
- `EVENTS.md` com o mapeamento completo dos cards e eventos necessários.

---

## Status atual do Dashboard
Com dados consistentes:
- Funil com valores coerentes (<100%).
- Tempo médio de sessão > 0.
- Interações > 0.
- Badges > 0.
- Sessões sem erro > 0 (quando houver `event.logged` crítico).

---

## O que **não** foi feito
- Não foi implementado `event.logged` para erros críticos (ainda necessário para "Sessões sem erro").
  - **Atualização (2026-09-30):** resolvido depois, em #741. `PhaserGame.tsx` agora emite `event.logged` com `severity: "critical"` em falhas de carregamento de assets. Ver `EVENTS.md`, seção "5) Saúde Técnica".
- Não foram adicionados eventos para interações avançadas (drag/drop, puzzle etc.).

---

## Validação local (manual)
1) Subir stack local
2) Jogar uma sessão completa
3) Verificar chamadas `POST /api/v1/events` com:
   - `level.started` + `levelNumber`
   - `session.end`
   - `event.logged`
4) Verificar `/api/v1/metrics`

---

## Decisão de Ambiente (staging em develop)
Foi decidido que o ambiente `develop` terá um banco persistente para métricas, evitando dumps locais.

Implicações:
- O dashboard em develop terá dados reais de testes.
- Não será necessário seeding manual.

---

## Pendências (próximos passos)
1) ~~Emitir `event.logged` para erros críticos~~ (feito em #741, ver `EVENTS.md`)
2) Instrumentar interações avançadas (puzzles, drag/drop, etc.)
3) (Opcional) criar painel de validação rápida dos eventos no back

---

## Arquivos alterados
- `front/src/game/scenes/Game.ts`
- `front/src/game/objects/InteractionComponent.ts`
- `EVENTS.md`
- `docs/pt-BR/notes/EPIC-analytics-dashboard.md`
