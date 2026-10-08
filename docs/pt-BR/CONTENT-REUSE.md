🌐 [English](../en/CONTENT-REUSE.md) | Português (Brasil)

# Adaptando o conteúdo

As fases de Guardião da Cultura são **dados, não código**. Quizzes, diálogos,
colecionáveis e as obras expostas são arquivos JSON em
`front/public/assets/data/`. Um educador pode trocar as obras de uma fase,
reescrever um quiz ou mudar cada fala de um NPC sem abrir a game engine.

A maior parte deste guia trata das fases 1 a 3, as três fases com mapa: um
museu (Inhotim), um teatro (Teatro Amazonas) e uma festa (São João de Campina
Grande). A fase 4, a investigação final, funciona de outro jeito e tem
[uma seção própria](#a-investigação-fase-4).

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
front/src/game/data/LevelConfig.ts        quais fases existem e o que cada uma carrega
front/public/assets/data/
├── global/messages.json                  diálogos de sistema compartilhados por todas as fases
├── investigation/
│   ├── suspects.json                     fase 4: os suspeitos e seus dossiês
│   └── clues.json                        fase 4: os traços que cada pista coletada prova
└── levels/level_0N/                      fases 1 a 3 (level_04 guarda só arte; veja abaixo)
    ├── works.json                        as obras expostas e o que elas ensinam
    ├── quizzes.json                       o quiz principal da missão
    ├── intermediate-quizzes.json          quizzes curtos disparados nos marcos
    ├── npcs.json                          os personagens e seus diálogos
    ├── collectibles.json                  as pistas que o jogador recolhe
    └── intro/
        ├── intro_config.json              a HQ de abertura: quadros, legendas, tempos
        └── *.png                          a arte da HQ e a tela de carregamento
front/public/assets/maps/<map-name>/
├── map.json                              um mapa do Tiled
└── spritesheet.png                       o tileset dele
```

Os mapas em uso são `inhotim` (fase 1), `teatro-amazonas` (fase 2) e
`sao-joao-de-campina-grande` (fase 3).

## O registro de fases

`front/src/game/data/LevelConfig.ts` é a fonte de verdade das fases com mapa,
de 1 a 3. A investigação (fase 4) fica de fora de propósito, porque não tem
tilemap. O `LEVEL_REGISTRY` associa o id de uma fase ao seu mapa e aos
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
    json: "maps/inhotim/map.json",
    tileset: "tiles_level_01",
    tilesetImg: "maps/inhotim/spritesheet.png",
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
- **`activeMissions`** precisa indicar um id de missão que exista no
  `quizzes.json`, no `npcs.json`, em `MissionIds`
  (`front/src/game/constants/MissionConstants.ts`) e no `MissionRegistry`
  (`front/src/game/data/MissionRegistry.ts`). É esse o fio que liga um NPC ao
  quiz que ele entrega e às etapas da missão.

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
- O jogo lê apenas `question`, `options` e `explanation`. `id`, `category`,
  `hints`, `tags` e `difficulty` são metadados de autoria: o jogo os ignora,
  então são opcionais. Se usar `id`, mantenha-o único dentro da sua missão.
- As `hints` do quiz não aparecem para o jogador. As dicas que o jogador vê
  quando empaca vêm do `educational.hint` de cada obra no `works.json` (veja
  abaixo).

O `intermediate-quizzes.json` tem o mesmo formato, escrito só com `question`,
`options` e `explanation`, e é indexado pelo marco que o dispara. São os
check-ins curtos entre as etapas de uma fase. A chave precisa ser uma das
`MissionKeys` de `front/src/game/constants/MissionConstants.ts`:
`paintings_done`, `sculptures_done`, `photo_collected`, `photo_done`,
`costumes_done`, `posters_done`, `spotlights_done`, `stage_done`, `dance_done`,
`switches_done` ou `genius_done`. Qualquer outra chave nunca é disparada, e o
carregador registra um aviso no console com o nome dela.

## Trocando as obras expostas

O `works.json` agrupa as obras por tipo, e os grupos variam conforme a fase:
`SCULPTURES`, `PAINTINGS` e `PHOTOS` na fase 1; `SCULPTURES`, `PAINTINGS`,
`POSTERS` e `COSTUMES` na fase 2; `BAND`, `ACCORDION` e `DANCES` na fase 3.
Cada grupo é um objeto indexado pelo id da obra. Cada entrada traz os metadados que o jogador lê, o texto educativo
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
- `educational.hint` é a dica que o jogo oferece quando o jogador empaca em uma
  obra.
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

O `collectibles.json` define as pistas que o jogador reúne. Tudo fica sob uma
chave `collectibles` no topo do arquivo, agrupado por categoria (`CLUE_VILLAIN`
é a única em uso), e cada categoria é um objeto indexado pelo id da pista. Além dos blocos usuais
`metadata` e `educational`, cada uma tem:

- `assets.scaleOnMap` / `scaleOnInspect` — o tamanho do sprite no mundo em
  comparação com a tela de inspeção.
- `board.position` e `board.connectedTo` — onde a pista fica no quadro de
  investigação e a quais outras pistas ela se liga. `connectedTo` precisa
  referenciar ids que existam, senão o quadro desenha uma linha para o nada.

## A HQ de abertura

O `intro/intro_config.json` controla a HQ que abre uma fase. O array `panels`
tem uma entrada por quadro, indicando uma imagem na mesma pasta, o recorte dela a ser revelado, os
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

## A investigação (fase 4)

A fase 4 é a investigação final: o jogador revê as pistas e acusa um suspeito.
Ela não é uma fase de plataforma. Não tem mapa, não está no `LEVEL_REGISTRY`, e
toda a interface dela é React, em `front/src/ui/investigation/`. A
`front/src/game/scenes/InvestigationScene.ts` não desenha nada: carrega os
dados, entrega-os à UI React pelo EventBus e registra o resultado. O conteúdo
fica em dois arquivos próprios:

- `front/public/assets/data/investigation/suspects.json` — os suspeitos e, para
  cada um, se o dossiê confirma, contradiz ou não diz nada sobre cada traço.
- `front/public/assets/data/investigation/clues.json` — os traços e qual traço
  cada pista prova. Uma pista é referenciada pelo id da fase e pelo id dela no
  `collectibles.json` daquela fase, então renomear um colecionável exige
  atualizá-lo aqui também.

O `levels/level_04/` guarda só a arte dela: a HQ de abertura em `intro/` e a HQ
de encerramento em `suspect-arrested/`, controlada pelo `outro_config.json`.

O jogo tem estas quatro fases e nenhuma outra. O
`levels/level_05/intro/loading_L5.png` é uma sobra de uma quinta fase planejada;
nenhum código o carrega.

## Adicionando uma fase inteira

1. Monte o mapa no [Tiled](https://www.mapeditor.org/) e exporte o `map.json`
   junto com o `spritesheet.png` para `front/public/assets/maps/<your-map>/`.
2. Crie `front/public/assets/data/levels/level_0N/` com os cinco arquivos de
   conteúdo. Copiar os da fase 1 e editar é mais rápido do que começar do zero.
3. Adicione o id da missão em `MissionIds`, e os marcos novos em `MissionKeys`,
   no `front/src/game/constants/MissionConstants.ts`.
4. Adicione a missão e as etapas dela no `front/src/game/data/MissionRegistry.ts`.
5. Adicione a fase ao `LEVEL_REGISTRY` em `front/src/game/data/LevelConfig.ts`,
   com as chaves do mapa e os caminhos do conteúdo.
6. Registre as novas chaves de sprite no `LEVEL_ASSETS`, no mesmo arquivo.
7. Adicione o marcador em `MAP_MARKERS`, no
   `front/src/game/constants/MapMarkers.ts`, para que a fase possa ser acessada
   a partir do mapa-múndi.
8. Confira os dashboards. O `DASHBOARD_LEVELS`, em
   `front/src/lib/edital/server/levels.ts`, inclui automaticamente toda fase do
   `LEVEL_REGISTRY`; uma fase fora do registro, como a investigação, precisa ser
   adicionada lá à mão.
9. Dê crédito a cada asset novo no `front/src/ui/credits/creditsData.ts`, no
   `CREDITS.md` e no `ASSETS-LICENSE.md`, no mesmo pull request.

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
