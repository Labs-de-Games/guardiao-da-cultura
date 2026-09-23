import { act, fireEvent, render, screen } from "@testing-library/react";
import { AudioManager } from "@/game/audio/AudioManager";
import { INVESTIGATION_CLUE_HEARTS } from "@/game/constants/Investigation";
import type {
  InvestigationClue,
  InvestigationPayload,
  Suspect,
  TraitValue,
} from "@/game/types/InvestigationTypes";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { InvestigationScreen } from "./InvestigationScreen";
import {
  hasSeenInvestigationTutorial,
  markInvestigationTutorialSeen,
} from "./investigation-tutorial-storage";

// test-setup's global phaser mock stubs EventEmitter with no-op jest.fn()s, so
// the EventBus would never dispatch. Same override UIScene.test.ts uses.
jest.mock("phaser", () => ({
  Game: class {
    destroy() {}
  },
  AUTO: 0,
  Scale: { RESIZE: 0, CENTER_BOTH: 1 },
  Scenes: { Events: { SHUTDOWN: "shutdown" } },
  Events: { EventEmitter: jest.requireActual("eventemitter3") },
  Sound: { Events: { COMPLETE: "complete" } },
}));

jest.mock("@/game/audio/AudioManager", () => ({
  AudioManager: {
    playSfx: jest.fn(),
    getSettings: jest.fn(() => ({
      musicVolume: 0.4,
      sfxVolume: 0.7,
      muted: false,
    })),
    setMusicVolume: jest.fn(),
  },
}));

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

function clue(
  levelId: string,
  clueId: string,
  title: string,
  traitId: string,
  traitLabel: string,
): InvestigationClue {
  return {
    key: `${levelId}:${clueId}`,
    levelId,
    clueId,
    title,
    metadata: { title },
    educational: {
      description: `Descrição de ${title}.`,
      medium: "Papel",
      opinion: `Opinião sobre ${title}.`,
    },
    traitId,
    traitLabel,
    source: "player",
  };
}

const VARNISH = clue(
  "level_01",
  "varnish",
  "Verniz de conservação",
  "conservation_technique",
  "Domínio técnico de conservação",
);
const CACHIMBO = clue(
  "level_02",
  "cachimbo",
  "Cachimbo esquecido",
  "smokes",
  "Fuma cachimbo",
);

function suspect(
  id: string,
  name: string,
  traits: Record<string, TraitValue>,
  isCulprit = false,
): Suspect {
  return {
    id,
    name,
    role: `Função de ${name}`,
    summary: `Resumo de ${name}.`,
    alibi: `${name} jura que não foi.`,
    relationWithCulture: "rel",
    profile: "profile",
    isCulprit,
    traits,
  };
}

const CULPRIT_TRAITS: Record<string, TraitValue> = {
  conservation_technique: "sim",
  smokes: "sim",
};
const INNOCENT_TRAITS: Record<string, TraitValue> = {
  conservation_technique: "nao",
  smokes: "desconhecido",
};

const SUSPECTS = [
  suspect("augusto_vale", "Augusto Vale", CULPRIT_TRAITS, true),
  suspect("helena_marques", "Helena Marques", INNOCENT_TRAITS),
  suspect("bruno_tavares", "Bruno Tavares", INNOCENT_TRAITS),
  suspect("renata_vilas", "Renata Vilas", INNOCENT_TRAITS),
  suspect("anselmo_veiga", "Anselmo Veiga", INNOCENT_TRAITS),
];

function buildPayload(previousStars = 0): InvestigationPayload {
  return {
    clues: [VARNISH, CACHIMBO],
    suspects: SUSPECTS,
    traits: [
      { id: "conservation_technique", label: "Domínio técnico de conservação" },
      { id: "smokes", label: "Fuma cachimbo" },
    ],
    collectedCount: 2,
    previousStars,
  };
}

/** Placement is a drag in the real UI; dnd-kit pointer sensors do not run in jsdom. */
function place(suspectId: string, slot: number, clueKey: string) {
  act(() => {
    useGameUIStore.getState().placeClueInSlot(suspectId, slot, clueKey);
  });
}

/**
 * Spends every one of a clue's hearts on the same seat.
 *
 * A clue on the board will not move to another one, so each drop has to be
 * undone first — which is the rule under test everywhere else.
 */
function drain(suspectId: string, clueKey: string) {
  for (let i = 0; i < INVESTIGATION_CLUE_HEARTS; i++) {
    place(suspectId, 0, clueKey);
    if (i < INVESTIGATION_CLUE_HEARTS - 1) {
      act(() => {
        useGameUIStore.getState().clearSlot(suspectId, 0);
      });
    }
  }
}

function accuse(suspectId: string, name: string) {
  place(suspectId, 0, VARNISH.key);
  fireEvent.click(screen.getByRole("button", { name: `Acusar ${name}` }));
  fireEvent.click(screen.getByText("Sim, acusar"));
  // A wrong name is answered with that suspect's alibi, and reading it is what
  // hands the clues back — so the run only moves on once it is dismissed.
  const continuar = screen.queryByText("CONTINUAR");
  if (continuar) fireEvent.click(continuar);
}

const investigation = () => useGameUIStore.getState().investigation;

describe("InvestigationScreen", () => {
  beforeEach(() => {
    // The walkthrough auto-runs for a player who has never seen it and would
    // sit on top of every one of these assertions; it has its own block below.
    markInvestigationTutorialSeen();
    (AudioManager.playSfx as jest.Mock).mockClear();
    (AudioManager.setMusicVolume as jest.Mock).mockClear();
    (AudioManager.getSettings as jest.Mock).mockReturnValue({
      musicVolume: 0.4,
      sfxVolume: 0.7,
      muted: false,
    });
    useGameUIStore.getState().closeInvestigation();
    useGameUIStore.getState().openInvestigation(buildPayload());
  });

  describe("clue rail", () => {
    it("always shows every clue", () => {
      render(<InvestigationScreen />);

      const rail = screen.getByRole("complementary", {
        name: "Pistas coletadas",
      });
      expect(rail).toHaveTextContent("Verniz de conservação");
      expect(rail).toHaveTextContent("Cachimbo esquecido");
    });

    it("shows a clue's remaining hearts", () => {
      render(<InvestigationScreen />);

      expect(
        screen.getAllByLabelText(
          `${INVESTIGATION_CLUE_HEARTS} de ${INVESTIGATION_CLUE_HEARTS} usos restantes`,
        ).length,
      ).toBe(2);

      place("helena_marques", 0, VARNISH.key);

      expect(
        screen.getByLabelText(
          `${INVESTIGATION_CLUE_HEARTS - 1} de ${INVESTIGATION_CLUE_HEARTS} usos restantes`,
        ),
      ).toBeInTheDocument();
    });

    it("says which suspect is holding a clue", () => {
      render(<InvestigationScreen />);
      place("helena_marques", 0, VARNISH.key);

      const rail = screen.getByRole("complementary", {
        name: "Pistas coletadas",
      });
      expect(rail).toHaveTextContent("com Helena");
    });

    it("marks a clue as locked once it is out of hearts", () => {
      render(<InvestigationScreen />);
      drain("helena_marques", VARNISH.key);

      expect(
        screen.getByLabelText(
          /Verniz de conservação\. Sem usos restantes, fixada em Helena Marques\./,
        ),
      ).toBeInTheDocument();
    });

    it("puts a clue out of reach while it sits on a suspect", () => {
      render(<InvestigationScreen />);
      place("helena_marques", 0, VARNISH.key);

      expect(
        screen.getByLabelText(
          /Verniz de conservação\. Em uso com Helena Marques\./,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/Verniz de conservação\. 3 usos/),
      ).not.toBeInTheDocument();

      // Taking it off the seat hands it back to the rail.
      act(() => {
        useGameUIStore.getState().clearSlot("helena_marques", 0);
      });

      expect(
        screen.getByLabelText(/Verniz de conservação\. 2 usos/),
      ).toBeInTheDocument();
    });

    it("renders the hover detail outside the rail so it is never clipped", () => {
      render(<InvestigationScreen />);

      const chip = screen.getByLabelText(/Verniz de conservação\. 3 usos/);
      fireEvent.mouseEnter(chip.parentElement as HTMLElement);

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent("Descrição de Verniz de conservação.");
      expect(tooltip).toHaveTextContent("Domínio técnico de conservação");
      // The panel is portalled to the body, clear of the rail's overflow.
      expect(
        screen
          .getByRole("complementary", { name: "Pistas coletadas" })
          .contains(tooltip),
      ).toBe(false);

      fireEvent.mouseLeave(chip.parentElement as HTMLElement);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("suspect table", () => {
    it("seats all five suspects with their own slots", () => {
      render(<InvestigationScreen />);

      for (const s of SUSPECTS) {
        expect(
          screen.getByRole("button", { name: `Acusar ${s.name}` }),
        ).toBeInTheDocument();
      }
      expect(screen.getAllByLabelText("Espaço 1, vazio")).toHaveLength(5);
    });

    it("shows prose on hover instead of a list of answers", () => {
      render(<InvestigationScreen />);

      fireEvent.mouseEnter(
        screen.getByRole("button", { name: /Helena Marques.*Ver informações/ }),
      );

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent("Resumo de Helena Marques.");
      expect(tooltip).not.toHaveTextContent("Não se sabe");
      expect(screen.queryByText("Fuma cachimbo")).not.toBeInTheDocument();
    });
  });

  describe("dropping a clue", () => {
    it("grades it on the spot with no button to press", () => {
      render(<InvestigationScreen />);
      place("augusto_vale", 0, VARNISH.key);

      expect(
        screen.getByLabelText("Espaço 1: Verniz de conservação, Quente"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Checar informações")).not.toBeInTheDocument();
    });

    it("runs cold when the dossier contradicts the trait", () => {
      render(<InvestigationScreen />);
      place("helena_marques", 0, VARNISH.key);

      expect(
        screen.getByLabelText("Espaço 1: Verniz de conservação, Frio"),
      ).toBeInTheDocument();
    });

    it("sits lukewarm when the dossier says nothing", () => {
      render(<InvestigationScreen />);
      place("helena_marques", 1, CACHIMBO.key);

      expect(
        screen.getByLabelText("Espaço 2: Cachimbo esquecido, Morno"),
      ).toBeInTheDocument();
    });

    it("can be taken back while the clue still has hearts", () => {
      render(<InvestigationScreen />);
      place("helena_marques", 0, VARNISH.key);

      fireEvent.click(
        screen.getByLabelText("Remover Verniz de conservação do espaço 1"),
      );
      expect(screen.getAllByLabelText("Espaço 1, vazio")).toHaveLength(5);
    });

    it("cannot be taken back once the last heart is spent", () => {
      render(<InvestigationScreen />);
      drain("helena_marques", VARNISH.key);

      expect(
        screen.queryByLabelText("Remover Verniz de conservação do espaço 1"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByLabelText("Espaço 1: Verniz de conservação, Frio"),
      ).toBeInTheDocument();
    });
  });

  describe("accusing", () => {
    it("is unavailable until the seat is holding a clue", () => {
      render(<InvestigationScreen />);

      const button = screen.getByRole("button", {
        name: "Acusar Augusto Vale",
      });
      expect(button).toBeDisabled();

      place("augusto_vale", 0, VARNISH.key);
      expect(
        screen.getByRole("button", { name: "Acusar Augusto Vale" }),
      ).toBeEnabled();
    });

    it("asks for confirmation before resolving", () => {
      render(<InvestigationScreen />);
      place("augusto_vale", 0, VARNISH.key);

      fireEvent.click(
        screen.getByRole("button", { name: "Acusar Augusto Vale" }),
      );
      expect(
        screen.getByRole("dialog", {
          name: "Confirmar acusação de Augusto Vale",
        }),
      ).toBeInTheDocument();
      expect(investigation().result).toBeNull();
    });

    it("can be cancelled", () => {
      render(<InvestigationScreen />);
      place("augusto_vale", 0, VARNISH.key);

      fireEvent.click(
        screen.getByRole("button", { name: "Acusar Augusto Vale" }),
      );
      fireEvent.click(screen.getByText("Cancelar"));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(investigation().result).toBeNull();
    });

    it("awards five stars for a correct first accusation", () => {
      const completed = jest.fn();
      EventBus.on("investigation:completed", completed);
      render(<InvestigationScreen />);

      accuse("augusto_vale", "Augusto Vale");

      expect(completed).toHaveBeenCalledWith({ stars: 5, wrongAttempts: 0 });
      expect(screen.getByText("Mandado de prisão emitido")).toBeInTheDocument();
      EventBus.off("investigation:completed", completed);
    });

    it("hands off to the ending instead of straight to the map", () => {
      const outro = jest.fn();
      const exit = jest.fn();
      EventBus.on("investigation:outro", outro);
      EventBus.on("investigation:exit", exit);
      render(<InvestigationScreen />);

      accuse("augusto_vale", "Augusto Vale");
      fireEvent.click(screen.getByText("VER DESFECHO"));

      expect(outro).toHaveBeenCalled();
      expect(exit).not.toHaveBeenCalled();
      EventBus.off("investigation:outro", outro);
      EventBus.off("investigation:exit", exit);
    });

    it("offers the same ending after four misses", () => {
      const outro = jest.fn();
      EventBus.on("investigation:outro", outro);
      render(<InvestigationScreen />);

      accuse("helena_marques", "Helena Marques");
      accuse("bruno_tavares", "Bruno Tavares");
      accuse("renata_vilas", "Renata Vilas");
      accuse("anselmo_veiga", "Anselmo Veiga");
      fireEvent.click(screen.getByText("VER DESFECHO"));

      expect(outro).toHaveBeenCalled();
      EventBus.off("investigation:outro", outro);
    });

    it("shadows a wrongly accused suspect and returns their clues", () => {
      render(<InvestigationScreen />);
      accuse("helena_marques", "Helena Marques");

      expect(
        screen.getByRole("button", { name: /Helena Marques.*Já descartado/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Acusar Helena Marques" }),
      ).toBeDisabled();
      expect(screen.getAllByLabelText("Espaço 1, vazio")).toHaveLength(5);
      expect(
        screen.getAllByLabelText(
          `${INVESTIGATION_CLUE_HEARTS} de ${INVESTIGATION_CLUE_HEARTS} usos restantes`,
        ).length,
      ).toBe(2);
    });

    it("awards four stars when one wrong accusation precedes the right one", () => {
      const completed = jest.fn();
      EventBus.on("investigation:completed", completed);
      render(<InvestigationScreen />);

      accuse("helena_marques", "Helena Marques");
      accuse("augusto_vale", "Augusto Vale");

      expect(completed).toHaveBeenCalledWith({ stars: 4, wrongAttempts: 1 });
      EventBus.off("investigation:completed", completed);
    });

    it("reveals the culprit for one star after four wrong accusations", () => {
      const completed = jest.fn();
      EventBus.on("investigation:completed", completed);
      render(<InvestigationScreen />);

      accuse("helena_marques", "Helena Marques");
      accuse("bruno_tavares", "Bruno Tavares");
      accuse("renata_vilas", "Renata Vilas");
      accuse("anselmo_veiga", "Anselmo Veiga");

      expect(completed).toHaveBeenCalledWith({ stars: 1, wrongAttempts: 4 });
      expect(investigation().revealed).toBe(true);
      EventBus.off("investigation:completed", completed);
    });
  });

  describe("a wrong accusation", () => {
    /** Accuse without dismissing, so the alibi panel is left standing. */
    const accuseOnly = (suspectId: string, name: string) => {
      place(suspectId, 0, VARNISH.key);
      fireEvent.click(screen.getByRole("button", { name: `Acusar ${name}` }));
      fireEvent.click(screen.getByText("Sim, acusar"));
    };

    it("plays the game's error sound", () => {
      render(<InvestigationScreen />);
      accuseOnly("helena_marques", "Helena Marques");

      expect(AudioManager.playSfx).toHaveBeenCalledWith("sfx.puzzle.failure");
    });

    it("stays quiet when the accusation is right", () => {
      render(<InvestigationScreen />);
      accuse("augusto_vale", "Augusto Vale");

      expect(AudioManager.playSfx).not.toHaveBeenCalledWith(
        "sfx.puzzle.failure",
      );
    });

    it("lets the suspect answer back in their own words", () => {
      render(<InvestigationScreen />);
      accuseOnly("helena_marques", "Helena Marques");

      expect(
        screen.getByRole("dialog", {
          name: "Helena Marques responde à acusação",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Helena Marques jura que não foi\./),
      ).toBeInTheDocument();
    });

    it("names the cost and what is left", () => {
      render(<InvestigationScreen />);
      accuseOnly("helena_marques", "Helena Marques");

      expect(screen.getByText(/−1 estrela · 3 tentativas/)).toBeInTheDocument();
    });

    it("holds the board still until the alibi is dismissed", () => {
      render(<InvestigationScreen />);
      accuseOnly("helena_marques", "Helena Marques");

      expect(investigation().boards.helena_marques.slots[0]).toBe(VARNISH.key);

      fireEvent.click(screen.getByText("CONTINUAR"));

      expect(investigation().boards).toEqual({});
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getAllByLabelText("Espaço 1, vazio")).toHaveLength(5);
    });

    it("is dismissed by ESC before ESC would leave the phase", () => {
      const exit = jest.fn();
      EventBus.on("investigation:exit", exit);
      render(<InvestigationScreen />);
      accuseOnly("helena_marques", "Helena Marques");

      fireEvent.keyDown(window, { key: "Escape" });

      expect(exit).not.toHaveBeenCalled();
      expect(investigation().lastWrongSuspectId).toBeNull();
      EventBus.off("investigation:exit", exit);
    });

    it("says it is the last chance on the third miss", () => {
      render(<InvestigationScreen />);
      accuse("helena_marques", "Helena Marques");
      accuse("bruno_tavares", "Bruno Tavares");
      accuseOnly("renata_vilas", "Renata Vilas");

      expect(
        screen.getByText(/−1 estrela · última tentativa/),
      ).toBeInTheDocument();
    });

    it("answers the fourth miss before the result names the culprit", () => {
      render(<InvestigationScreen />);
      accuse("helena_marques", "Helena Marques");
      accuse("bruno_tavares", "Bruno Tavares");
      accuse("renata_vilas", "Renata Vilas");
      accuseOnly("anselmo_veiga", "Anselmo Veiga");

      expect(
        screen.getByText(/Anselmo Veiga jura que não foi\./),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/−1 estrela · sem tentativas/),
      ).toBeInTheDocument();
      // The reveal is still holding: naming the culprit over the top of the
      // suspect's own answer is the bug this ordering exists to prevent.
      expect(
        screen.queryByText("Investigação encerrada"),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("CONTINUAR"));

      expect(screen.getByText("Investigação encerrada")).toBeInTheDocument();
      expect(investigation().revealed).toBe(true);
    });
  });

  describe("closing the case", () => {
    it("sounds the siren once as the result lands", () => {
      render(<InvestigationScreen />);
      accuse("augusto_vale", "Augusto Vale");

      expect(
        (AudioManager.playSfx as jest.Mock).mock.calls.filter(
          ([key]) => key === "sfx.police.siren",
        ),
      ).toHaveLength(1);
    });

    it("waits for the last alibi before sounding it", () => {
      render(<InvestigationScreen />);
      accuse("helena_marques", "Helena Marques");
      accuse("bruno_tavares", "Bruno Tavares");
      accuse("renata_vilas", "Renata Vilas");

      // Fourth miss: the suspect answers first, and the panel — with its
      // siren — only arrives once that answer is dismissed.
      place("anselmo_veiga", 0, VARNISH.key);
      fireEvent.click(
        screen.getByRole("button", { name: "Acusar Anselmo Veiga" }),
      );
      fireEvent.click(screen.getByText("Sim, acusar"));

      expect(AudioManager.playSfx).not.toHaveBeenCalledWith(
        "sfx.police.siren",
        expect.anything(),
      );

      fireEvent.click(screen.getByText("CONTINUAR"));

      expect(AudioManager.playSfx).toHaveBeenCalledWith(
        "sfx.police.siren",
        expect.anything(),
      );
    });
  });

  describe("the music toggle", () => {
    it("silences the music and remembers the volume to bring back", () => {
      render(<InvestigationScreen />);

      fireEvent.click(screen.getByRole("button", { name: "Silenciar música" }));
      expect(AudioManager.setMusicVolume).toHaveBeenCalledWith(0);

      fireEvent.click(screen.getByRole("button", { name: "Ativar música" }));
      expect(AudioManager.setMusicVolume).toHaveBeenLastCalledWith(0.4);
    });

    it("opens already muted when the game is", () => {
      (AudioManager.getSettings as jest.Mock).mockReturnValue({
        musicVolume: 0,
        sfxVolume: 0.7,
        muted: false,
      });
      render(<InvestigationScreen />);

      expect(
        screen.getByRole("button", { name: "Ativar música" }),
      ).toBeInTheDocument();
    });

    it("leaves the error sound alone", () => {
      render(<InvestigationScreen />);
      fireEvent.click(screen.getByRole("button", { name: "Silenciar música" }));

      accuse("helena_marques", "Helena Marques");

      expect(AudioManager.playSfx).toHaveBeenCalledWith("sfx.puzzle.failure");
    });
  });

  describe("the star tracker", () => {
    it("starts with every star in play", () => {
      render(<InvestigationScreen />);
      expect(
        screen.getByLabelText("5 de 5 estrelas em jogo"),
      ).toBeInTheDocument();
    });

    it("loses one per wrong accusation", () => {
      render(<InvestigationScreen />);

      accuse("helena_marques", "Helena Marques");
      expect(
        screen.getByLabelText("4 de 5 estrelas em jogo"),
      ).toBeInTheDocument();

      accuse("bruno_tavares", "Bruno Tavares");
      expect(
        screen.getByLabelText("3 de 5 estrelas em jogo"),
      ).toBeInTheDocument();
    });
  });

  describe("leaving", () => {
    it("cancels a pending accusation on ESC before leaving the phase", () => {
      const exit = jest.fn();
      EventBus.on("investigation:exit", exit);
      render(<InvestigationScreen />);
      place("augusto_vale", 0, VARNISH.key);
      fireEvent.click(
        screen.getByRole("button", { name: "Acusar Augusto Vale" }),
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(exit).not.toHaveBeenCalled();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(exit).toHaveBeenCalled();
      EventBus.off("investigation:exit", exit);
    });

    it("leaves from the VOLTAR button", () => {
      const exit = jest.fn();
      EventBus.on("investigation:exit", exit);
      render(<InvestigationScreen />);

      fireEvent.click(screen.getByText("VOLTAR"));
      expect(exit).toHaveBeenCalled();
      EventBus.off("investigation:exit", exit);
    });

    it("ignores ESC once the result is on screen", () => {
      const exit = jest.fn();
      render(<InvestigationScreen />);
      accuse("augusto_vale", "Augusto Vale");

      EventBus.on("investigation:exit", exit);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(exit).not.toHaveBeenCalled();
      EventBus.off("investigation:exit", exit);
    });
  });

  describe("tutorial", () => {
    /** suspects[0] — the seat the walkthrough demonstrates on. */
    const DEMO_SEAT = "augusto_vale";
    const DROP_STEP = /Arraste uma pista/;
    const VERDICT_STEP = /contradiz/;
    const HEARTS_STEP = /usos por pista/;
    const ACCUSE_STEP = /S\u00f3 d\u00e1 para acusar/;

    beforeEach(() => {
      window.localStorage.clear();
      useGameUIStore.getState().closeInvestigation();
      useGameUIStore.getState().openInvestigation(buildPayload());
    });

    it("runs itself on a first visit", () => {
      render(<InvestigationScreen />);

      expect(screen.getByText(DROP_STEP)).toBeInTheDocument();
      expect(screen.getByText("1/4")).toBeInTheDocument();
    });

    it("stays out of the way once it has been seen", () => {
      markInvestigationTutorialSeen();
      render(<InvestigationScreen />);

      expect(screen.queryByText(DROP_STEP)).not.toBeInTheDocument();
    });

    it("opens on the drag, with no way past it but doing it", () => {
      render(<InvestigationScreen />);

      expect(screen.queryByText("PR\u00d3XIMO")).not.toBeInTheDocument();

      place(DEMO_SEAT, 0, VARNISH.key);

      expect(screen.getByText(VERDICT_STEP)).toBeInTheDocument();
    });

    it("walks the rest through on PR\u00d3XIMO", () => {
      render(<InvestigationScreen />);
      place(DEMO_SEAT, 0, VARNISH.key);

      fireEvent.click(screen.getByText("PR\u00d3XIMO"));
      expect(screen.getByText(HEARTS_STEP)).toBeInTheDocument();

      fireEvent.click(screen.getByText("PR\u00d3XIMO"));
      expect(screen.getByText(ACCUSE_STEP)).toBeInTheDocument();
    });

    it("takes one drop and then holds the board still", () => {
      render(<InvestigationScreen />);
      place(DEMO_SEAT, 0, VARNISH.key);

      // No second clue anywhere, on any seat — not even the demonstrated one.
      place("bruno_tavares", 0, CACHIMBO.key);
      place(DEMO_SEAT, 1, CACHIMBO.key);

      expect(investigation().boards.bruno_tavares).toBeUndefined();
      expect(investigation().boards[DEMO_SEAT].slots[1]).toBeNull();
      expect(investigation().clueHearts[CACHIMBO.key]).toBe(
        INVESTIGATION_CLUE_HEARTS,
      );

      // And the demonstration itself cannot be taken back.
      act(() => {
        useGameUIStore.getState().clearSlot(DEMO_SEAT, 0);
      });
      expect(investigation().boards[DEMO_SEAT].slots[0]).toBe(VARNISH.key);
    });

    it("offers no way to remove the demonstration clue", () => {
      render(<InvestigationScreen />);
      place(DEMO_SEAT, 0, VARNISH.key);

      expect(
        screen.queryByLabelText(`Remover ${VARNISH.title} do espaço 1`),
      ).not.toBeInTheDocument();
    });

    it("hands the board back the moment the lesson ends", () => {
      render(<InvestigationScreen />);
      place(DEMO_SEAT, 0, VARNISH.key);
      fireEvent.click(screen.getByText("PR\u00d3XIMO"));
      fireEvent.click(screen.getByText("PR\u00d3XIMO"));
      fireEvent.click(screen.getByText("COME\u00c7AR"));

      place("bruno_tavares", 0, CACHIMBO.key);

      expect(investigation().boards.bruno_tavares.slots[0]).toBe(CACHIMBO.key);
      expect(
        screen.getByLabelText(`Remover ${CACHIMBO.title} do espaço 1`),
      ).toBeInTheDocument();
    });

    it("will not let the walkthrough's ACUSAR button be used", () => {
      render(<InvestigationScreen />);
      place(DEMO_SEAT, 0, VARNISH.key);
      fireEvent.click(screen.getByText("PR\u00d3XIMO"));
      fireEvent.click(screen.getByText("PR\u00d3XIMO"));

      // The last step points at a lit button; pressing it must stay a no-op.
      expect(screen.getByText(ACCUSE_STEP)).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Acusar Augusto Vale" }),
      );

      expect(investigation().pendingAccusationId).toBeNull();
      expect(screen.queryByText("Sim, acusar")).not.toBeInTheDocument();

      // And works again the moment the lesson is over.
      fireEvent.click(screen.getByText("COME\u00c7AR"));
      place(DEMO_SEAT, 0, VARNISH.key);
      fireEvent.click(
        screen.getByRole("button", { name: "Acusar Augusto Vale" }),
      );

      expect(screen.getByText("Sim, acusar")).toBeInTheDocument();
    });

    it("keeps its one drop on the seat it is pointing at", () => {
      render(<InvestigationScreen />);

      // Any other seat refuses the clue, however it was aimed there.
      place("bruno_tavares", 0, CACHIMBO.key);

      expect(investigation().boards.bruno_tavares).toBeUndefined();
      expect(screen.getByText(DROP_STEP)).toBeInTheDocument();

      place(DEMO_SEAT, 0, CACHIMBO.key);

      expect(investigation().boards[DEMO_SEAT].slots[0]).toBe(CACHIMBO.key);
      // Which clue to rehearse with is still the player's own call, so the
      // steps that explain the drop point at the one they used.
      expect(investigation().tutorial.focusSuspectId).toBe(DEMO_SEAT);
      expect(investigation().tutorial.focusClueKey).toBe(CACHIMBO.key);
    });

    it("gives the demonstration back when it ends", () => {
      render(<InvestigationScreen />);
      place(DEMO_SEAT, 0, VARNISH.key);

      expect(investigation().clueHearts[VARNISH.key]).toBe(
        INVESTIGATION_CLUE_HEARTS - 1,
      );

      fireEvent.click(screen.getByText("PR\u00d3XIMO"));
      fireEvent.click(screen.getByText("PR\u00d3XIMO"));
      fireEvent.click(screen.getByText("COME\u00c7AR"));

      expect(investigation().tutorial.active).toBe(false);
      expect(investigation().boards).toEqual({});
      expect(investigation().clueHearts[VARNISH.key]).toBe(
        INVESTIGATION_CLUE_HEARTS,
      );
      expect(hasSeenInvestigationTutorial()).toBe(true);
    });

    it("can be skipped, and is not offered again", () => {
      render(<InvestigationScreen />);

      fireEvent.click(screen.getByText("PULAR"));

      expect(investigation().tutorial.active).toBe(false);
      expect(hasSeenInvestigationTutorial()).toBe(true);
    });

    it("takes ESC without leaving the phase", () => {
      const exit = jest.fn();
      EventBus.on("investigation:exit", exit);
      render(<InvestigationScreen />);

      fireEvent.keyDown(window, { key: "Escape" });

      expect(investigation().tutorial.active).toBe(false);
      expect(exit).not.toHaveBeenCalled();
      EventBus.off("investigation:exit", exit);
    });

    it("replays from COMO JOGAR", () => {
      markInvestigationTutorialSeen();
      render(<InvestigationScreen />);

      fireEvent.click(screen.getByText("COMO JOGAR"));

      expect(screen.getByText(DROP_STEP)).toBeInTheDocument();
    });

    it("does not refund hearts already spent when replayed mid-run", () => {
      markInvestigationTutorialSeen();
      render(<InvestigationScreen />);
      place("helena_marques", 0, VARNISH.key);

      fireEvent.click(screen.getByText("COMO JOGAR"));
      fireEvent.click(screen.getByText("PULAR"));

      expect(investigation().clueHearts[VARNISH.key]).toBe(
        INVESTIGATION_CLUE_HEARTS - 1,
      );
      expect(investigation().boards.helena_marques.slots[0]).toBe(VARNISH.key);
    });

    it("still asks for a drop when replayed on a board that has one", () => {
      markInvestigationTutorialSeen();
      render(<InvestigationScreen />);
      place("helena_marques", 0, VARNISH.key);

      fireEvent.click(screen.getByText("COMO JOGAR"));

      // Already-placed clues must not count as having done the exercise.
      expect(screen.getByText(DROP_STEP)).toBeInTheDocument();

      place(DEMO_SEAT, 0, CACHIMBO.key);

      expect(screen.getByText(VERDICT_STEP)).toBeInTheDocument();
    });

    describe("from the keyboard", () => {
      const press = (key: string) => fireEvent.keyDown(window, { key });

      /** The rehearsed move is rehearsed with whatever the player is using. */
      it("takes its one drop from the keyboard", () => {
        render(<InvestigationScreen />);

        press("ArrowDown");
        press("Enter");
        expect(investigation().heldClueKey).toBe(VARNISH.key);

        press("Enter");

        expect(investigation().boards.augusto_vale.slots[0]).toBe(VARNISH.key);
        expect(investigation().tutorial.demoPlaced).toBe(true);
        expect(screen.getByText(VERDICT_STEP)).toBeInTheDocument();
      });

      /** The lesson is one seat's worth of board, and so is the cursor. */
      it("confines the cursor to the demonstrated seat", () => {
        render(<InvestigationScreen />);

        press("ArrowDown");
        press("ArrowRight");

        // Straight onto the demonstrated seat, with no portraits or accuse
        // buttons above and below it to wander into.
        expect(investigation().cursor).toEqual({
          zone: "slot",
          suspectIndex: 0,
          slotIndex: 0,
        });
        press("ArrowUp");
        press("ArrowDown");
        expect(investigation().cursor).toEqual({
          zone: "slot",
          suspectIndex: 0,
          slotIndex: 0,
        });

        // Its three slots, and then the board runs out — the next suspect is
        // not somewhere this lesson goes.
        press("ArrowRight");
        press("ArrowRight");
        press("ArrowRight");
        expect(investigation().cursor).toEqual({
          zone: "slot",
          suspectIndex: 0,
          slotIndex: 2,
        });

        // The rail is still reachable: picking a clue up is half the move.
        press("ArrowLeft");
        press("ArrowLeft");
        press("ArrowLeft");
        press("ArrowLeft");
        expect(investigation().cursor).toEqual({ zone: "rail", clueIndex: 0 });
      });

      it("hands the keys back to the script once that drop lands", () => {
        render(<InvestigationScreen />);
        press("ArrowDown");
        press("Enter");
        press("Enter");

        press("Enter");
        expect(screen.getByText(HEARTS_STEP)).toBeInTheDocument();

        press(" ");
        expect(screen.getByText(ACCUSE_STEP)).toBeInTheDocument();
      });

      it("leaves the board alone while the script is talking", () => {
        render(<InvestigationScreen />);
        press("ArrowDown");
        press("Enter");
        press("Enter");

        // The cursor is frozen with the board: nothing moves, nothing lifts.
        const cursor = investigation().cursor;
        press("ArrowRight");
        expect(investigation().cursor).toEqual(cursor);
        expect(investigation().heldClueKey).toBeNull();
      });

      it("lets ESC skip the lesson rather than leave the phase", () => {
        const exited = jest.fn();
        const off = EventBus.on("investigation:exit", exited);
        render(<InvestigationScreen />);

        press("Escape");

        expect(investigation().tutorial.active).toBe(false);
        expect(exited).not.toHaveBeenCalled();
        off();
      });

      it("puts a carried clue down before it considers skipping", () => {
        render(<InvestigationScreen />);
        press("ArrowDown");
        press("Enter");

        press("Escape");

        expect(investigation().heldClueKey).toBeNull();
        expect(investigation().tutorial.active).toBe(true);
      });
    });

    it("steps aside once the run is decided", () => {
      markInvestigationTutorialSeen();
      render(<InvestigationScreen />);
      accuse("augusto_vale", "Augusto Vale");

      act(() => {
        useGameUIStore.getState().startTutorial();
      });

      expect(investigation().tutorial.active).toBe(false);
      expect(investigation().result).not.toBeNull();
    });
  });
  describe("keyboard play", () => {
    const press = (key: string) => fireEvent.keyDown(window, { key });
    const cursor = () => investigation().cursor;

    it("summons the cursor onto the rail without acting on the first press", () => {
      render(<InvestigationScreen />);

      press("ArrowDown");

      expect(cursor()).toEqual({ zone: "rail", clueIndex: 0 });
      expect(investigation().heldClueKey).toBeNull();
    });

    it("picks a clue up off the rail and lands it on a seat", () => {
      render(<InvestigationScreen />);

      press("ArrowDown");
      press("Enter");

      expect(investigation().heldClueKey).toBe(VARNISH.key);
      // Carrying it is free; the cursor drops to the first slot that will take it.
      expect(investigation().clueHearts[VARNISH.key]).toBe(
        INVESTIGATION_CLUE_HEARTS,
      );
      expect(cursor()).toEqual({
        zone: "slot",
        suspectIndex: 0,
        slotIndex: 0,
      });

      press(" ");

      expect(investigation().boards.augusto_vale.slots[0]).toBe(VARNISH.key);
      expect(investigation().heldClueKey).toBeNull();
      expect(investigation().clueHearts[VARNISH.key]).toBe(
        INVESTIGATION_CLUE_HEARTS - 1,
      );
      expect(screen.getByText("Quente")).toBeInTheDocument();
    });

    it("takes a clue back off a seat, at the same price the × button charges", () => {
      render(<InvestigationScreen />);
      press("ArrowDown");
      press("Enter");
      press("Enter");

      // The cursor is still on the slot it just filled.
      press("Enter");

      expect(investigation().boards.augusto_vale.slots[0]).toBeNull();
      // The heart it spent getting there stays spent.
      expect(investigation().clueHearts[VARNISH.key]).toBe(
        INVESTIGATION_CLUE_HEARTS - 1,
      );
      expect(investigation().heldClueKey).toBeNull();
    });

    /** A clue never displaces another one — the player takes the first one off. */
    it("skips past a slot that is already taken", () => {
      render(<InvestigationScreen />);
      place("augusto_vale", 0, VARNISH.key);

      press("ArrowDown");
      press("ArrowDown");
      press("Enter");

      expect(investigation().heldClueKey).toBe(CACHIMBO.key);
      expect(cursor()).toEqual({
        zone: "slot",
        suspectIndex: 0,
        slotIndex: 1,
      });

      press("Enter");

      expect(investigation().boards.augusto_vale.slots).toEqual([
        VARNISH.key,
        CACHIMBO.key,
        null,
      ]);
    });

    it("puts a carried clue back for nothing, without leaving the phase", () => {
      const exited = jest.fn();
      const off = EventBus.on("investigation:exit", exited);
      render(<InvestigationScreen />);

      press("ArrowDown");
      press("Enter");
      press("Escape");

      expect(investigation().heldClueKey).toBeNull();
      expect(investigation().clueHearts[VARNISH.key]).toBe(
        INVESTIGATION_CLUE_HEARTS,
      );
      expect(exited).not.toHaveBeenCalled();

      press("Escape");
      expect(exited).toHaveBeenCalled();
      off();
    });

    it("accuses from the board, starting on the safe half of the gate", () => {
      render(<InvestigationScreen />);
      place("augusto_vale", 0, VARNISH.key);

      // Rail → slots → the accuse button under the first seat.
      press("ArrowDown");
      press("ArrowRight");
      press("ArrowDown");
      press("Enter");

      expect(screen.getByText("Tem certeza?")).toBeInTheDocument();

      // ENTER on the gate as it opens cancels: the star-burning half has to be
      // reached on purpose.
      press("Enter");
      expect(investigation().pendingAccusationId).toBeNull();
      expect(investigation().result).toBeNull();

      press("Enter");
      press("ArrowRight");
      press("Enter");

      expect(investigation().result).toEqual({ stars: 5, correct: true });
    });
  });
});
