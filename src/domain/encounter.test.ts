import { describe, expect, it } from "vitest";
import {
  addAnnotation,
  addGlobalAnnotation,
  addParticipant,
  advanceTurn,
  completesRound,
  createDefaultEncounter,
  expiringAnnotationIds,
  getCurrent,
  hideParticipant,
  removeAnnotation,
  removeParticipant,
  restoreParticipant,
  setCurrent,
  sortActive,
  turnOrder,
  updateParticipant,
} from "./encounter.ts";
import type { Encounter } from "./types.ts";

const names = (encounter: Encounter) => sortActive(encounter.participants).map((participant) => participant.name);
const currentName = (encounter: Encounter) => getCurrent(encounter)?.name ?? null;

function emptyEncounter(): Encounter {
  return { round: 1, participants: [], currentId: null, globalAnnotations: [] };
}

function withParticipants(...entries: Array<[name: string, initiative: number]>): Encounter {
  return entries.reduce(
    (encounter, [name, initiative]) => addParticipant(encounter, name, { name, initiative, hidden: false }),
    emptyEncounter(),
  );
}

describe("encuentro por defecto", () => {
  it("crea los seis participantes predeterminados activos, con iniciativa 0 y ronda 1", () => {
    const encounter = createDefaultEncounter();
    expect(names(encounter)).toEqual(["Gorr", "Lyra", "Caedren", "Kumiko", "Adriana", "Shary"]);
    expect(encounter.participants.every((p) => p.initiative === 0 && !p.hidden && p.annotations.length === 0)).toBe(true);
    expect(encounter.round).toBe(1);
    expect(currentName(encounter)).toBe("Gorr");
  });

  it("no permite eliminar a los predeterminados", () => {
    const encounter = createDefaultEncounter();
    expect(removeParticipant(encounter, encounter.participants[0]!.id)).toBe(encounter);
  });
});

describe("orden de iniciativa", () => {
  it("ordena de mayor a menor y conserva el orden de inserción en empates", () => {
    expect(names(withParticipants(["A", 10], ["B", 20], ["C", 10], ["D", 15]))).toEqual(["B", "D", "A", "C"]);
  });

  it("no repite el orden de inserción tras eliminar a alguien", () => {
    let encounter = withParticipants(["A", 5], ["B", 5]);
    encounter = removeParticipant(encounter, "A");
    encounter = addParticipant(encounter, "C", { name: "C", initiative: 5, hidden: false });
    expect(names(encounter)).toEqual(["B", "C"]);
  });

  it("el primer participante añadido visible pasa a ser el actual", () => {
    let encounter = addParticipant(emptyEncounter(), "H", { name: "H", initiative: 1, hidden: true });
    expect(encounter.currentId).toBeNull();
    encounter = addParticipant(encounter, "V", { name: "V", initiative: 1, hidden: false });
    expect(encounter.currentId).toBe("V");
  });

  it("mantiene el turno al cambiar la iniciativa del actual", () => {
    const encounter = updateParticipant(withParticipants(["A", 10], ["B", 5]), "A", { initiative: 1 });
    expect(names(encounter)).toEqual(["B", "A"]);
    expect(encounter.currentId).toBe("A");
  });
});

describe("avance de turno y rondas", () => {
  it("avanza al siguiente y, tras el último, vuelve al primero e incrementa la ronda", () => {
    let encounter = withParticipants(["A", 3], ["B", 2], ["C", 1]);
    expect(currentName(encounter)).toBe("A");
    encounter = advanceTurn(encounter);
    expect(currentName(encounter)).toBe("B");
    encounter = advanceTurn(encounter);
    expect(completesRound(encounter)).toBe(true);
    encounter = advanceTurn(encounter);
    expect(currentName(encounter)).toBe("A");
    expect(encounter.round).toBe(2);
  });

  it("rota el orden visible para que el actual vaya primero y marca dónde empieza la siguiente ronda", () => {
    let encounter = withParticipants(["A", 3], ["B", 2], ["C", 1]);
    expect(turnOrder(encounter)).toMatchObject({ nextRoundIndex: null });
    encounter = advanceTurn(encounter);
    const order = turnOrder(encounter);
    expect(order.participants.map((participant) => participant.name)).toEqual(["B", "C", "A"]);
    expect(order.nextRoundIndex).toBe(2);
  });

  it("no hace nada sin participantes activos", () => {
    const encounter = emptyEncounter();
    expect(advanceTurn(encounter)).toBe(encounter);
  });

  it("solo permite marcar como actual a participantes visibles", () => {
    const encounter = hideParticipant(withParticipants(["A", 3], ["B", 2]), "B");
    expect(setCurrent(encounter, "B")).toBe(encounter);
  });
});

describe("anotaciones", () => {
  it("descuenta las finitas al completar la ronda, elimina las que llegan a 0 y mantiene las infinitas", () => {
    let encounter = withParticipants(["A", 2], ["B", 1]);
    encounter = addAnnotation(encounter, "A", { id: "x", text: "aturdido", remainingRounds: 1 });
    encounter = addAnnotation(encounter, "A", { id: "y", text: "bendecido", remainingRounds: 2 });
    encounter = addAnnotation(encounter, "A", { id: "z", text: "maldito", remainingRounds: null });
    encounter = addGlobalAnnotation(encounter, { id: "g", text: "niebla", remainingRounds: 1 });

    encounter = advanceTurn(encounter);
    expect(expiringAnnotationIds(encounter)).toEqual(new Set(["x", "g"]));
    encounter = advanceTurn(encounter);

    expect(encounter.participants[0]!.annotations).toEqual([
      { id: "y", text: "bendecido", remainingRounds: 1 },
      { id: "z", text: "maldito", remainingRounds: null },
    ]);
    expect(encounter.globalAnnotations).toEqual([]);
  });

  it("no descuenta las anotaciones de participantes ocultos", () => {
    let encounter = withParticipants(["A", 2], ["B", 1]);
    encounter = addAnnotation(encounter, "B", { id: "x", text: "veneno", remainingRounds: 1 });
    encounter = hideParticipant(encounter, "B");
    encounter = advanceTurn(encounter);
    expect(encounter.round).toBe(2);
    expect(encounter.participants[1]!.annotations).toHaveLength(1);
  });

  it("permite quitar manualmente una anotación infinita", () => {
    let encounter = addAnnotation(withParticipants(["A", 1]), "A", { id: "z", text: "x", remainingRounds: null });
    encounter = removeAnnotation(encounter, "A", "z");
    expect(encounter.participants[0]!.annotations).toEqual([]);
  });
});

describe("ocultar, restaurar y eliminar", () => {
  it("al ocultar al actual, el turno pasa al siguiente sin cambiar la ronda", () => {
    const encounter = hideParticipant(withParticipants(["A", 3], ["B", 2], ["C", 1]), "A");
    expect(currentName(encounter)).toBe("B");
    expect(encounter.round).toBe(1);
  });

  it("al ocultar al último actual, el turno vuelve al primero", () => {
    let encounter = setCurrent(withParticipants(["A", 3], ["B", 2], ["C", 1]), "C");
    encounter = hideParticipant(encounter, "C");
    expect(currentName(encounter)).toBe("A");
  });

  it("si no quedan activos no hay turno actual, y al restaurar se recupera", () => {
    let encounter = hideParticipant(withParticipants(["A", 1]), "A");
    expect(encounter.currentId).toBeNull();
    encounter = restoreParticipant(encounter, "A");
    expect(encounter.currentId).toBe("A");
  });

  it("conserva las anotaciones al ocultar y restaurar", () => {
    let encounter = addAnnotation(withParticipants(["A", 1]), "A", { id: "x", text: "x", remainingRounds: 3 });
    encounter = restoreParticipant(hideParticipant(encounter, "A"), "A");
    expect(encounter.participants[0]!.annotations).toHaveLength(1);
  });

  it("al eliminar al actual, el turno pasa al siguiente (igual que al ocultar)", () => {
    const encounter = removeParticipant(setCurrent(withParticipants(["A", 3], ["B", 2], ["C", 1]), "B"), "B");
    expect(currentName(encounter)).toBe("C");
  });
});
