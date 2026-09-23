# Referência rápida

## Respostas diretas

| Pergunta | Resposta |
|---|---|
| Como eu subo o projeto? | `make up` e depois `make db-migrate` |
| De onde eu tiro a branch nova? | De `develop`, sempre |
| Para onde vai a minha PR? | Para `develop`. Só a PR de release aponta para `master` |
| Como eu subo para staging? | Nada a fazer. Todo merge em `develop` sobe staging |
| Como eu levo para produção? | PR de release levando `develop` para `master`, depois Run workflow no CD Production |
| Onde fica o botão de deploy? | Aba Actions, workflow CD Production, botão Run workflow, contra `master` |
| Por que meu CI não rodou? | A PR está em rascunho |
| Por que meu CI quebrou logo no início? | É verificação de tipos. Rode `npm run typecheck` |
| Por que o card não se moveu? | Falta `Closes #N` no corpo da PR |
| Minha branch ficou velha, e agora? | `git fetch origin && git rebase origin/develop` |
| Por que minha variável de ambiente não pegou? | Se tem prefixo `NEXT_PUBLIC_`, precisa reconstruir a imagem |
| Como eu reverto um deploy? | Fixe `IMAGE_TAG` no Coolify na tag do build anterior |
| Onde ficam os segredos? | Segredos de CI no GitHub, segredos de execução no Coolify |
| Quando eu posso deployar? | Segunda 13h às 15h, terça e quinta 13h às 19h. Nunca sexta |
| Preciso de quantas aprovações? | Uma. Duas se a mudança for visual |
| Onde fica a documentação oficial? | Na pasta `docs/` do repositório |

## Comandos

```bash
make up                    # sobe tudo em Docker
make local-all             # sobe nativo pelo Turborepo
make down                  # derruba
make logs                  # acompanha logs
make check                 # lint e testes
make lint                  # só lint
make test                  # só testes
npm run lint:fix           # corrige lint
npm run typecheck          # verifica tipos
make db-migrate            # aplica migrations
make db-migrate-generate NAME=Nome
make clean                 # reinicia containers e volumes
make deep-clean            # reinicia tudo
make sync                  # reinstala node_modules
make help                  # lista tudo
```

```bash
git checkout develop && git pull
git checkout -b feat/123-descricao
git fetch origin && git rebase origin/develop

gh pr create --base develop
gh workflow run cd-production.yml --ref master
gh issue list --search "termo" --state all --repo Labs-de-Games/gameplate
```

## Links

| O quê | Onde |
|---|---|
| Repositório | https://github.com/Labs-de-Games/gameplate |
| Board | https://github.com/orgs/Labs-de-Games/projects/1 |
| Actions | https://github.com/Labs-de-Games/gameplate/actions |
| CD Production | https://github.com/Labs-de-Games/gameplate/actions/workflows/cd-production.yml |
| Coolify | http://coolify.guardiaodacultura.42.rio/ |

## Glossário

| Termo | Significa |
|---|---|
| Board | O GitHub Projects v2 chamado [Labs Rouanet] Kanban Squad |
| `develop` | Branch de integração. Todo trabalho passa por ela |
| `master` | Branch de produção. Recebe só a PR de release |
| PR de release | Pull Request que leva `develop` inteira para `master` |
| Coolify | Painel que faz o deploy nos servidores |
| GHCR | GitHub Container Registry, onde ficam as imagens Docker |
| EventBus | Canal tipado entre o React e o Phaser |
| Epic | Issue grande dividida em sub-issues |
| DoR | Definition of Ready, o que precisa estar pronto antes de codar |
| DoD | Definition of Done, o que precisa estar pronto para encerrar |
| Magic link | Login sem senha, por link enviado no e-mail |

## Skills de IA

O repositório versiona cinco skills em `.agents/skills/`, fixadas por hash em
`skills-lock.json`. Elas cobrem commits convencionais, boas práticas de NestJS,
de Next.js, de Phaser e de React.

A escolha por `.agents/skills/` segue o padrão AGENTS.md, que é agnóstico de
ferramenta e funciona com Claude Code, Codex, Cursor e outros.

Não edite arquivos dentro de `.agents/skills/`. São código de terceiros. Se
precisar de comportamento diferente, escreva a regra no `AGENTS.md`, que tem
precedência.

A hierarquia é esta: o `AGENTS.md` mais próximo do arquivo que você está
editando vence. Existem três, na raiz, em `front/` e em `back/`.

Há também um workflow agêntico que roda de segunda a sexta às 10h e abre uma
issue de status do time.
