# Guia do Labs de Games

Guia de transferência do **Labs de Games**, jogo educativo 2D sobre arte e
cultura brasileira, incentivado pela Lei Rouanet. O código fica neste
repositório, `gameplate`.

Este guia registra como o projeto funciona hoje. Ele não substitui os
documentos de referência da pasta `docs/`. Quando os dois divergirem, os
documentos de referência vencem.

---

## Comece aqui

**[Sessão de 30 minutos](00-sessao-30-minutos.md)** leva você de não conhecer
nada até abrir a primeira Pull Request. Se você tem meia hora e nada mais, é
esta a página.

## O guia completo

| Página | Responde |
|---|---|
| [Sessão de 30 minutos](00-sessao-30-minutos.md) | Como começar do zero hoje |
| [O projeto](01-o-projeto.md) | O que é, como está montado, qual o stack |
| [Rodar local](02-rodar-local.md) | Como subir, quais comandos, o que fazer quando quebra |
| [Fazer uma mudança](03-fazer-uma-mudanca.md) | Branch, commit, PR, CI e revisão |
| [Tarefas e board](04-tarefas-e-board.md) | Como criar task, como o board funciona, exemplos reais |
| [Deploy](05-deploy.md) | Ambientes, janelas, rollback, incidente, segredos |
| [Comunicação](06-comunicacao.md) | Canais do Discord e os bots de notificação |
| [Regras](07-regras.md) | O que é critério de merge e não sugestão |
| [Referência rápida](08-referencia-rapida.md) | Comandos, links e glossário |

## Fatos do projeto

| | |
|---|---|
| Repositório | `Labs-de-Games/gameplate`, privado |
| Branch de integração | `develop` |
| Branch de produção | `master` |
| Board | GitHub Projects v2, [Labs Rouanet] Kanban Squad |
| Front | Next.js, React, Phaser 3 |
| Back | NestJS, TypeORM, PostgreSQL |
| Runtime | Node 24.15.0 |
| Deploy | GHCR e Coolify |

## Versão em inglês

A pasta [`en/`](en/README.md) tem o mesmo conteúdo escrito como instrução
direta, feita para ser lida por agentes de IA. Esta versão em português é a de
leitura humana.

## Como corrigir

Este guia é versionado junto do código. Se algo aqui estiver errado ou
desatualizado, abra uma Pull Request para `develop` como faria com qualquer
outra mudança.
