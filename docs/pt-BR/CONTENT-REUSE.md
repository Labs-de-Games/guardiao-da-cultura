# Adaptando o conteúdo

As fases de Guardião da Cultura são **dados, não código**. Quizzes, diálogos,
colecionáveis e as obras expostas são arquivos JSON em
`front/public/assets/data/`. Um educador pode trocar as obras de um museu,
reescrever um quiz ou mudar cada fala de um NPC sem abrir a game engine.

Este guia cobre o que cada arquivo faz, como as partes se referenciam e o que
você precisa manter ao adaptá-las.

> **Antes de começar: os créditos não são opcionais.**
> As obras de arte reproduzidas neste jogo foram liberadas para publicação com a
> condição de que o crédito seja sempre dado, e os assets originais são CC BY
> 4.0, que traz a mesma obrigação. Uma versão adaptada precisa manter os
> créditos de todos os assets que ainda distribui — no `CREDITS.md`, na tela de
> créditos do jogo, ou nos dois. Veja [`../../ASSETS-LICENSE.md`](../../ASSETS-LICENSE.md).
> Se você substituir um asset por completo, remova o crédito dele e adicione um
> para o substituto. Se você mudar a marca do jogo, também precisa remover os
> logos dos patrocinadores e a seção de créditos "Realização" — essas marcas não
> são licenciadas. Veja [`../../NOTICE`](../../NOTICE).

## Onde tudo fica

```
front/src/game/data/LevelConfig.ts        which levels exist and what each one loads
front/public/assets/data/
├── global/messages.json                  shared system dialogue, reused by every level
└── levels/level_0N/
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

## O registro de fases

`front/src/game/data/LevelConfig.ts` é a fonte única de verdade sobre quais
fases existem. O `LEVEL_REGISTRY` associa o id de uma fase ao seu mapa e aos
seus arquivos de conteúdo:

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
    json: "maps/museum-mvp/map.json",
    tileset: "tiles_level_01",
    tilesetImg: "maps/museum-mvp/spritesheet.png",
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

Os caminhos são relativos a `front/public/assets/`.

Dois campos são fáceis de errar:

- **`tilesetName`** precisa bater com o `name` do tileset **dentro** do
  `map.json` do Tiled, e não com o nome do arquivo. Uma divergência carrega um
  mapa sem nenhum tile.
- **`activeMissions`** precisa indicar uma chave de missão que exista tanto no
  `quizzes.json` quanto no `npcs.json`. É esse o fio que liga um NPC ao quiz que
  ele entrega.

`maxStars` e `initialGrayscale` são de apresentação: o teto de pontuação da
fase e o quão dessaturado o mundo começa antes de o jogador restaurá-lo.

## Reescrevendo um quiz

O `quizzes.json` é indexado pelo id da missão. Cada entrada é uma pergunta:

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

- **A primeira opção é a resposta correta.** O jogo embaralha as opções em tempo
  de execução.
- `explanation` é exibido depois da resposta, certa ou errada. É ali que o
  ensino de fato acontece — escreva mesmo quando a resposta parecer óbvia.
- `hints` são oferecidas aos poucos quando o jogador empaca.
- `id` precisa ser único dentro da sua missão. `tags` e `difficulty` são metadados.

O `intermediate-quizzes.json` tem o mesmo formato, mas sem `id` nem `hints`, e é
indexado pelo marco que o dispara (`sculptures_done`, `paintings_done`). São os
check-ins curtos entre as etapas de uma fase.

## Trocando as obras expostas

O `works.json` agrupa as obras por tipo (`SCULPTURES`, `PAINTINGS`, `PHOTOS`,
`POSTERS`). Cada entrada traz os metadados que o jogador lê, o texto educativo
e a chave do sprite:

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

- `assets.sprite` é uma chave de textura registrada no `LevelConfig.ts`, e não
  um caminho de arquivo. Adicionar uma obra nova significa adicionar a imagem
  dela **e** registrar a chave.
- `feedbackError` é o que o jogador ouve quando coloca a obra no lugar errado,
  então deve dar uma pista do lugar certo sem dizer qual é.
- `metadata.author` é o crédito que o jogador vê. Se você trocar por uma obra
  diferente, este é um dos lugares onde a nova atribuição precisa aparecer — os
  outros são o `CREDITS.md` e o `ASSETS-LICENSE.md`.

## Reescrevendo diálogos

O `npcs.json` guarda os personagens indexados por id, cada um com um `missionId`
e diálogos agrupados por momento (`intro` e os demais que a fase usar):

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

Cada string é uma caixa de diálogo. Mantenha-as curtas — elas são narradas em
voz alta além de exibidas, e um parágrafo longo fica ruim nos dois casos.

O `data/global/messages.json` guarda os diálogos de sistema compartilhados por
todas as fases: falas de sucesso e de erro para cada tipo de interação. Mude uma
vez e todas as fases mudam, que em geral é o que você quer para o tom.

## Colecionáveis

O `collectibles.json` define as pistas que o jogador reúne, agrupadas por
categoria (`CLUE_VILLAIN` e assim por diante). Além dos blocos usuais
`metadata` e `educational`, cada uma tem:

- `assets.scaleOnMap` / `scaleOnInspect` — o tamanho do sprite no mundo em
  comparação com a tela de inspeção.
- `board.position` e `board.connectedTo` — onde a pista fica no quadro de
  investigação e a quais outras pistas ela se liga. `connectedTo` precisa
  referenciar ids que existam, senão o quadro desenha uma linha para o nada.

## A HQ de abertura

O `intro/intro_config.json` controla a HQ que abre uma fase: uma entrada por
quadro, indicando uma imagem na mesma pasta, o recorte dela a ser revelado, os
tempos e a legenda.

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

`sliceStart` e `sliceWidth` são em pixels da imagem de origem, então precisam
ser reajustados para qualquer arte substituta. `holdMs` é quanto tempo a legenda
fica na tela — o bastante para ser lida em voz alta, mas não tanto que um
replay se arraste.

## Adicionando uma fase inteira

1. Monte o mapa no [Tiled](https://www.mapeditor.org/) e exporte o `map.json`
   junto com o `spritesheet.png` para `front/public/assets/maps/<your-map>/`.
2. Crie `front/public/assets/data/levels/level_0N/` com os cinco arquivos de
   conteúdo. Copiar os da fase 1 e editar é mais rápido do que começar do zero.
3. Adicione a fase ao `LEVEL_REGISTRY` em `front/src/game/data/LevelConfig.ts`,
   com as chaves do mapa e os caminhos do conteúdo.
4. Registre as novas chaves de sprite no `LEVEL_ASSETS`, no mesmo arquivo.
5. Adicione o marcador no mapa para que a fase possa ser acessada a partir do
   mapa-múndi.
6. Dê crédito a cada asset novo no `creditsData.ts`, no `CREDITS.md` e no
   `ASSETS-LICENSE.md`, no mesmo pull request.

## Conferindo seu trabalho

```bash
make development-up
make db-migrate
```

Depois, jogue a fase. Os arquivos de conteúdo são buscados em tempo de execução,
então uma edição no JSON só exige recarregar a página — sem rebuild.

Um JSON mal formado falha no carregamento com um erro no console indicando o
arquivo. Já um arquivo válido com uma chave errada costuma falhar em silêncio:
um NPC sem diálogo, um quiz que nunca aparece, uma obra que não pode ser
colocada. Se algo está faltando em vez de quebrado, confira os ids primeiro.

## Se você publicar sua adaptação

- Mantenha os créditos de todos os assets que você ainda distribui.
- Remova os logos dos patrocinadores e a seção de créditos "Realização" — essas
  marcas são licenciadas apenas para este projeto.
- Mude o nome. "Guardião da Cultura" não é licenciado para uso como nome de uma
  obra derivada.
- O código continua MIT, então mantenha o `LICENSE` e o aviso de copyright dele.
