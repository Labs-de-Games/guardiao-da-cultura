import posthog from "posthog-js";
import {
  INVESTIGATION_CLUE_HEARTS,
  INVESTIGATION_LEVEL_ID,
  INVESTIGATION_SLOTS,
} from "@/game/constants/Investigation";
import type {
  InvestigationClue,
  InvestigationPayload,
  Suspect,
  TraitValue,
} from "@/game/types/InvestigationTypes";
import { useGameUIStore } from "./game-ui-store";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

function clue(clueId: string, traitId: string): InvestigationClue {
  return {
    key: `level_01:${clueId}`,
    levelId: "level_01",
    clueId,
    title: `Pista ${clueId}`,
    metadata: { title: `Pista ${clueId}` },
    educational: { description: "desc" },
    traitId,
    traitLabel: `Traço ${traitId}`,
    source: "player",
  };
}

const VARNISH = clue("varnish", "conservation_technique");
const CACHIMBO = clue("cachimbo", "smokes");
const SIGNATURE = clue("signature", "initials_av");
const PAPER = clue("paper", "knows_collection_layout");

function suspect(
  id: string,
  traits: Record<string, TraitValue>,
  isCulprit = false,
): Suspect {
  return {
    id,
    name: id,
    role: "role",
    summary: "summary",
    relationWithCulture: "rel",
    profile: "profile",
    isCulprit,
    traits,
  };
}

const ALL_YES: Record<string, TraitValue> = {
  conservation_technique: "sim",
  smokes: "sim",
  initials_av: "sim",
  knows_collection_layout: "sim",
};

function buildPayload(previousStars = 0): InvestigationPayload {
  return {
    clues: [VARNISH, CACHIMBO, SIGNATURE, PAPER],
    suspects: [
      suspect("augusto_vale", ALL_YES, true),
      suspect("helena_marques", {
        conservation_technique: "nao",
        smokes: "nao",
        initials_av: "nao",
        knows_collection_layout: "desconhecido",
      }),
      suspect("bruno_tavares", ALL_YES),
      suspect("renata_vilas", ALL_YES),
      suspect("anselmo_veiga", ALL_YES),
    ],
    traits: [
      { id: "conservation_technique", label: "Domínio técnico" },
      { id: "smokes", label: "Fuma cachimbo" },
      { id: "initials_av", label: "Iniciais A.V." },
      { id: "knows_collection_layout", label: "Conhece o acervo" },
    ],
    collectedCount: 4,
    previousStars,
  };
}

const WRONG_IDS = [
  "helena_marques",
  "bruno_tavares",
  "renata_vilas",
  "anselmo_veiga",
];

const investigation = () => useGameUIStore.getState().investigation;
const board = (id: string) => investigation().boards[id];
const hearts = (clueKey: string) => investigation().clueHearts[clueKey];
const place = (suspectId: string, slot: number, clueKey: string) =>
  useGameUIStore.getState().placeClueInSlot(suspectId, slot, clueKey);

describe("investigation store", () => {
  beforeEach(() => {
    useGameUIStore.getState().closeInvestigation();
    useGameUIStore.getState().openInvestigation(buildPayload());
  });

  it("opens a fresh run with every clue at full hearts", () => {
    expect(investigation().open).toBe(true);
    expect(investigation().boards).toEqual({});
    expect(investigation().wrongAttempts).toBe(0);
    expect(investigation().result).toBeNull();
    expect(investigation().clueHearts).toEqual({
      [VARNISH.key]: INVESTIGATION_CLUE_HEARTS,
      [CACHIMBO.key]: INVESTIGATION_CLUE_HEARTS,
      [SIGNATURE.key]: INVESTIGATION_CLUE_HEARTS,
      [PAPER.key]: INVESTIGATION_CLUE_HEARTS,
    });
  });

  describe("placing a clue", () => {
    it("fills the slot and grades it immediately", () => {
      place("helena_marques", 1, VARNISH.key);

      expect(board("helena_marques").slots).toEqual([
        null,
        VARNISH.key,
        ...Array.from({ length: INVESTIGATION_SLOTS - 2 }, () => null),
      ]);
      expect(board("helena_marques").verdicts[VARNISH.key]).toBe("frio");
    });

    it("burns hot when the dossier confirms the trait", () => {
      place("augusto_vale", 0, VARNISH.key);
      expect(board("augusto_vale").verdicts[VARNISH.key]).toBe("quente");
    });

    it("sits lukewarm when the dossier says nothing", () => {
      place("helena_marques", 0, PAPER.key);
      expect(board("helena_marques").verdicts[PAPER.key]).toBe("morno");
    });

    it("costs one heart per drop", () => {
      place("helena_marques", 0, VARNISH.key);
      expect(hearts(VARNISH.key)).toBe(INVESTIGATION_CLUE_HEARTS - 1);
    });

    it("charges again when the same clue is re-dropped on the same suspect", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().clearSlot("helena_marques", 0);
      place("helena_marques", 1, VARNISH.key);

      expect(hearts(VARNISH.key)).toBe(INVESTIGATION_CLUE_HEARTS - 2);
    });

    it("refuses a clue that is already sitting on a suspect", () => {
      place("helena_marques", 0, VARNISH.key);
      place("augusto_vale", 2, VARNISH.key);

      // It has to be taken off Helena first; no heart is spent on the attempt.
      expect(board("helena_marques").slots[0]).toBe(VARNISH.key);
      expect(board("augusto_vale")).toBeUndefined();
      expect(hearts(VARNISH.key)).toBe(INVESTIGATION_CLUE_HEARTS - 1);
    });

    it("lets the clue move once it is taken off the first seat", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().clearSlot("helena_marques", 0);
      place("augusto_vale", 2, VARNISH.key);

      expect(board("helena_marques").verdicts[VARNISH.key]).toBeUndefined();
      expect(board("augusto_vale").slots[2]).toBe(VARNISH.key);
      expect(hearts(VARNISH.key)).toBe(INVESTIGATION_CLUE_HEARTS - 2);
    });

    it("returns the clue a slot already held, free of charge", () => {
      place("helena_marques", 0, VARNISH.key);
      place("helena_marques", 0, CACHIMBO.key);

      expect(board("helena_marques").slots[0]).toBe(CACHIMBO.key);
      expect(board("helena_marques").verdicts[VARNISH.key]).toBeUndefined();
      expect(hearts(VARNISH.key)).toBe(INVESTIGATION_CLUE_HEARTS - 1);
    });

    it("refuses a clue that has spent its last heart", () => {
      for (let i = 0; i < INVESTIGATION_CLUE_HEARTS; i++) {
        place("helena_marques", 0, VARNISH.key);
        if (i < INVESTIGATION_CLUE_HEARTS - 1) {
          useGameUIStore.getState().clearSlot("helena_marques", 0);
        }
      }
      expect(hearts(VARNISH.key)).toBe(0);

      place("augusto_vale", 0, VARNISH.key);
      expect(board("augusto_vale")).toBeUndefined();
    });

    it("refuses to displace a clue that is nailed in place", () => {
      for (let i = 0; i < INVESTIGATION_CLUE_HEARTS; i++) {
        place("helena_marques", 0, VARNISH.key);
        if (i < INVESTIGATION_CLUE_HEARTS - 1) {
          useGameUIStore.getState().clearSlot("helena_marques", 0);
        }
      }

      place("helena_marques", 0, CACHIMBO.key);
      expect(board("helena_marques").slots[0]).toBe(VARNISH.key);
      expect(hearts(CACHIMBO.key)).toBe(INVESTIGATION_CLUE_HEARTS);
    });

    it("refuses a suspect who has already been cleared", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().accuseSuspect("helena_marques");

      place("helena_marques", 0, CACHIMBO.key);
      expect(board("helena_marques")).toBeUndefined();
    });
  });

  describe("removing a clue", () => {
    it("empties the slot and forgets the verdict", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().clearSlot("helena_marques", 0);

      expect(board("helena_marques").slots[0]).toBeNull();
      expect(board("helena_marques").verdicts).toEqual({});
    });

    it("costs nothing", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().clearSlot("helena_marques", 0);

      expect(hearts(VARNISH.key)).toBe(INVESTIGATION_CLUE_HEARTS - 1);
    });

    it("is refused once the clue is out of hearts", () => {
      for (let i = 0; i < INVESTIGATION_CLUE_HEARTS; i++) {
        place("helena_marques", 0, VARNISH.key);
        if (i < INVESTIGATION_CLUE_HEARTS - 1) {
          useGameUIStore.getState().clearSlot("helena_marques", 0);
        }
      }

      useGameUIStore.getState().clearSlot("helena_marques", 0);
      expect(board("helena_marques").slots[0]).toBe(VARNISH.key);
    });
  });

  describe("accusations", () => {
    it("needs at least one clue on the suspect", () => {
      expect(
        useGameUIStore.getState().accuseSuspect("augusto_vale"),
      ).toBeNull();
      expect(investigation().result).toBeNull();
      expect(investigation().wrongAttempts).toBe(0);
    });

    it("requires confirmation before resolving", () => {
      place("augusto_vale", 0, VARNISH.key);
      useGameUIStore.getState().requestAccusation("augusto_vale");
      expect(investigation().pendingAccusationId).toBe("augusto_vale");
      expect(investigation().result).toBeNull();

      useGameUIStore.getState().requestAccusation(null);
      expect(investigation().pendingAccusationId).toBeNull();
    });

    it("awards five stars for a correct first accusation", () => {
      place("augusto_vale", 0, VARNISH.key);
      const outcome = useGameUIStore.getState().accuseSuspect("augusto_vale");

      expect(outcome).toEqual({ stars: 5, correct: true, wrongAttempts: 0 });
      expect(investigation().result).toEqual({ stars: 5, correct: true });
    });

    it("shadows the wrong suspect and wipes the board back to full hearts", () => {
      place("helena_marques", 0, VARNISH.key);
      place("bruno_tavares", 0, CACHIMBO.key);

      expect(
        useGameUIStore.getState().accuseSuspect("helena_marques"),
      ).toBeNull();

      expect(investigation().wrongAttempts).toBe(1);
      expect(investigation().wrongSuspectIds).toEqual(["helena_marques"]);
      expect(investigation().lastWrongSuspectId).toBe("helena_marques");
      expect(investigation().boards).toEqual({});
      expect(hearts(VARNISH.key)).toBe(INVESTIGATION_CLUE_HEARTS);
      expect(hearts(CACHIMBO.key)).toBe(INVESTIGATION_CLUE_HEARTS);
    });

    it("refuses to accuse the same suspect twice", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().accuseSuspect("helena_marques");

      place("helena_marques", 0, CACHIMBO.key);
      expect(
        useGameUIStore.getState().accuseSuspect("helena_marques"),
      ).toBeNull();
      expect(investigation().wrongAttempts).toBe(1);
    });

    it("drops the shake feedback once it has played", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().accuseSuspect("helena_marques");
      useGameUIStore.getState().dismissWrongFeedback();

      expect(investigation().lastWrongSuspectId).toBeNull();
      expect(investigation().wrongSuspectIds).toEqual(["helena_marques"]);
    });

    it("costs a star per wrong attempt", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().accuseSuspect("helena_marques");
      place("bruno_tavares", 0, VARNISH.key);
      useGameUIStore.getState().accuseSuspect("bruno_tavares");
      place("augusto_vale", 0, VARNISH.key);

      expect(useGameUIStore.getState().accuseSuspect("augusto_vale")).toEqual({
        stars: 3,
        correct: true,
        wrongAttempts: 2,
      });
    });

    it("reveals the culprit and awards 1 star after four wrong attempts", () => {
      for (const id of WRONG_IDS) {
        place(id, 0, VARNISH.key);
        useGameUIStore.getState().accuseSuspect(id);
      }

      expect(investigation().revealed).toBe(true);
      expect(investigation().result).toEqual({ stars: 1, correct: false });
    });

    it("ignores further accusations once the run is resolved", () => {
      place("augusto_vale", 0, VARNISH.key);
      useGameUIStore.getState().accuseSuspect("augusto_vale");

      expect(
        useGameUIStore.getState().accuseSuspect("helena_marques"),
      ).toBeNull();
      expect(investigation().result).toEqual({ stars: 5, correct: true });
    });
  });

  describe("analytics", () => {
    const captured = (event: string) =>
      (posthog.capture as jest.Mock).mock.calls
        .filter(([name]) => name === event)
        .map(([, props]) => props);

    beforeEach(() => {
      (posthog.capture as jest.Mock).mockClear();
    });

    it("reports each drop with its verdict and what it cost", () => {
      place("augusto_vale", 1, VARNISH.key);

      expect(captured("investigation_clue_placed")).toEqual([
        {
          level_id: INVESTIGATION_LEVEL_ID,
          clue_key: VARNISH.key,
          clue_source: "player",
          trait_id: "conservation_technique",
          suspect_id: "augusto_vale",
          slot_index: 1,
          verdict: "quente",
          hearts_left: INVESTIGATION_CLUE_HEARTS - 1,
          replaced_clue_key: null,
          attempt_number: 1,
          is_tutorial: false,
        },
      ]);
    });

    it("names the clue a drop pushed out of the slot", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().clearSlot("helena_marques", 0);
      place("helena_marques", 0, CACHIMBO.key);

      expect(captured("investigation_clue_placed")[1]).toMatchObject({
        clue_key: CACHIMBO.key,
        verdict: "frio",
        replaced_clue_key: null,
      });

      place("helena_marques", 1, PAPER.key);
      useGameUIStore.getState().clearSlot("helena_marques", 1);
      place("helena_marques", 0, PAPER.key);

      expect(captured("investigation_clue_placed")[3]).toMatchObject({
        clue_key: PAPER.key,
        verdict: "morno",
        replaced_clue_key: CACHIMBO.key,
      });
    });

    it("says nothing on a refused drop", () => {
      place("augusto_vale", 0, "level_01:nao_existe");
      expect(captured("investigation_clue_placed")).toEqual([]);
    });

    it("marks the walkthrough's demonstration drop as a tutorial drop", () => {
      useGameUIStore.getState().startTutorial();
      place("augusto_vale", 0, VARNISH.key);

      expect(captured("investigation_clue_placed")[0]).toMatchObject({
        is_tutorial: true,
      });
    });

    it("counts the run a drop belongs to", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().accuseSuspect("helena_marques");
      place("bruno_tavares", 0, VARNISH.key);

      expect(captured("investigation_clue_placed")[1]).toMatchObject({
        attempt_number: 2,
      });
    });

    it("reports a wrong accusation with no stars yet", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().accuseSuspect("helena_marques");

      expect(captured("investigation_suspect_accused")).toEqual([
        {
          level_id: INVESTIGATION_LEVEL_ID,
          suspect_id: "helena_marques",
          attempt_number: 1,
          clues_on_suspect: 1,
          hot_clues: 0,
          cold_clues: 1,
          is_correct: false,
          wrong_attempts: 1,
          stars: null,
          revealed: false,
        },
      ]);
      expect(captured("investigation_suspect_identified")).toEqual([]);
    });

    it("reports the accusation that reveals the culprit as resolved", () => {
      for (const id of WRONG_IDS) {
        place(id, 0, VARNISH.key);
        useGameUIStore.getState().accuseSuspect(id);
      }

      const accusations = captured("investigation_suspect_accused");
      expect(accusations).toHaveLength(4);
      expect(accusations[3]).toMatchObject({
        attempt_number: 4,
        is_correct: false,
        wrong_attempts: 4,
        stars: 1,
        revealed: true,
      });
      expect(captured("investigation_suspect_identified")).toEqual([]);
    });

    it("reports the winning accusation twice: as an accusation and as a win", () => {
      place("helena_marques", 0, VARNISH.key);
      useGameUIStore.getState().accuseSuspect("helena_marques");

      place("augusto_vale", 0, VARNISH.key);
      place("augusto_vale", 1, PAPER.key);
      useGameUIStore.getState().accuseSuspect("augusto_vale");

      expect(captured("investigation_suspect_accused")[1]).toMatchObject({
        suspect_id: "augusto_vale",
        attempt_number: 2,
        is_correct: true,
        wrong_attempts: 1,
        stars: 4,
        revealed: false,
      });

      expect(captured("investigation_suspect_identified")).toEqual([
        {
          level_id: INVESTIGATION_LEVEL_ID,
          suspect_id: "augusto_vale",
          stars: 4,
          wrong_attempts: 1,
          attempt_number: 2,
          clues_on_suspect: 2,
          hot_clues: 2,
          cold_clues: 0,
          clues_collected: 4,
          clues_available: 4,
        },
      ]);
    });

    it("says nothing when an accusation is refused", () => {
      useGameUIStore.getState().accuseSuspect("augusto_vale");
      expect(captured("investigation_suspect_accused")).toEqual([]);
    });
  });

  it("resets boards, hearts and attempts on every entry", () => {
    place("helena_marques", 0, VARNISH.key);
    useGameUIStore.getState().accuseSuspect("helena_marques");

    useGameUIStore.getState().openInvestigation(buildPayload(4));

    expect(investigation().boards).toEqual({});
    expect(investigation().wrongAttempts).toBe(0);
    expect(investigation().wrongSuspectIds).toEqual([]);
    expect(hearts(VARNISH.key)).toBe(INVESTIGATION_CLUE_HEARTS);
    expect(investigation().payload?.previousStars).toBe(4);
  });
});
