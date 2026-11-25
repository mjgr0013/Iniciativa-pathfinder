import { describe, expect, it } from "vitest";
import {
  addAnnotation,
  addGlobalAnnotation,
  addParticipant,
  advanceTurn,
  createDefaultEncounter,
  expiredAnnotationIds,
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

/** Rondas restantes de cada anotación de un participante (o de las globales), por texto. */
const remaining = (encounter: Encounter, participantId?: string) =>
  Object.fromEntries(
    (participantId
      ? encounter.participants.find((participant) => participant.id === participantId)!.annotations
      : encounter.globalAnnotations
    ).map((annotation) => [annotation.text, annotation.remainingRounds]),
  );

const advance = (encounter: Encounter, times: number) =>
  Array.from({ length: times }).reduce<Encounter>((state) => advanceTurn(state), encounter);

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
    encounter = advance(encounter, 2);
    expect(currentName(encounter)).toBe("C");
    expect(encounter.round).toBe(1);
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

describe("duración de las anotaciones (se cuenta desde el turno en que empiezan)", () => {
  it("un efecto de 1 ronda creado en el turno del último dura hasta que vuelve a actuar ese participante", () => {
    let encounter = setCurrent(withParticipants(["A", 3], ["B", 2], ["C", 1]), "C");
    encounter = addAnnotation(encounter, "A", { id: "x", text: "aturdido", remainingRounds: 1 });
    encounter = addGlobalAnnotation(encounter, { id: "g", text: "niebla", remainingRounds: 1 });

    encounter = advanceTurn(encounter); // ronda 2, turno de A: no expira al empezar la ronda
    expect(encounter.round).toBe(2);
    expect(remaining(encounter, "A")).toEqual({ aturdido: 1 });
    expect(remaining(encounter)).toEqual({ niebla: 1 });

    encounter = advanceTurn(encounter); // turno de B
    expect(remaining(encounter, "A")).toEqual({ aturdido: 1 });

    encounter = advanceTurn(encounter); // turno de C: se cumple la ronda
    expect(remaining(encounter, "A")).toEqual({});
    expect(remaining(encounter)).toEqual({});
  });

  it("un efecto de 2 rondas descuenta cada vez que vuelve el turno de quien lo inició", () => {
    let encounter = setCurrent(withParticipants(["A", 3], ["B", 2], ["C", 1]), "B");
    encounter = addAnnotation(encounter, "C", { id: "x", text: "bendecido", remainingRounds: 2 });
    encounter = advance(encounter, 2); // C, A (ronda 2)
    expect(remaining(encounter, "C")).toEqual({ bendecido: 2 });
    encounter = advanceTurn(encounter); // B
    expect(remaining(encounter, "C")).toEqual({ bendecido: 1 });
    encounter = advance(encounter, 2); // C, A (ronda 3)
    expect(remaining(encounter, "C")).toEqual({ bendecido: 1 });
    encounter = advanceTurn(encounter); // B
    expect(remaining(encounter, "C")).toEqual({});
  });

  it("las infinitas no expiran", () => {
    let encounter = addAnnotation(withParticipants(["A", 2], ["B", 1]), "A", { id: "z", text: "maldito", remainingRounds: null });
    encounter = advance(encounter, 10);
    expect(remaining(encounter, "A")).toEqual({ maldito: null });
  });

  it("con un único participante, el efecto expira al volver su turno en la ronda siguiente", () => {
    let encounter = addAnnotation(withParticipants(["A", 1]), "A", { id: "x", text: "x", remainingRounds: 1 });
    encounter = advanceTurn(encounter);
    expect(encounter.round).toBe(2);
    expect(remaining(encounter, "A")).toEqual({});
  });

  it("si quien inició el efecto se oculta, el efecto cuenta al pasar por su posición en la iniciativa", () => {
    let encounter = setCurrent(withParticipants(["A", 3], ["B", 2], ["C", 1]), "B");
    encounter = addAnnotation(encounter, "A", { id: "x", text: "x", remainingRounds: 1 });
    encounter = hideParticipant(encounter, "B"); // turno de C
    encounter = advanceTurn(encounter); // ronda 2, turno de A
    expect(remaining(encounter, "A")).toEqual({ x: 1 });
    encounter = advanceTurn(encounter); // turno de C: se pasa por donde actuaba B
    expect(remaining(encounter, "A")).toEqual({});
  });

  it("si quien inició el efecto se elimina, se usa la posición que tenía", () => {
    let encounter = setCurrent(withParticipants(["A", 3], ["B", 2], ["C", 1]), "B");
    encounter = addGlobalAnnotation(encounter, { id: "g", text: "niebla", remainingRounds: 1 });
    encounter = removeParticipant(encounter, "B"); // turno de C
    encounter = advanceTurn(encounter); // ronda 2, turno de A
    expect(remaining(encounter)).toEqual({ niebla: 1 });
    encounter = advanceTurn(encounter); // turno de C
    expect(remaining(encounter)).toEqual({});
  });

  it("las anotaciones sin ancla (guardadas por versiones anteriores) descuentan al empezar la ronda", () => {
    let encounter = withParticipants(["A", 2], ["B", 1]);
    encounter = { ...encounter, globalAnnotations: [{ id: "g", text: "antigua", remainingRounds: 1, anchor: null }] };
    encounter = advanceTurn(encounter);
    expect(remaining(encounter)).toEqual({ antigua: 1 });
    encounter = advanceTurn(encounter); // ronda 2
    expect(remaining(encounter)).toEqual({});
  });

  it("cambiar el turno a mano no descuenta", () => {
    let encounter = addAnnotation(withParticipants(["A", 3], ["B", 2], ["C", 1]), "A", { id: "x", text: "x", remainingRounds: 1 });
    encounter = setCurrent(setCurrent(encounter, "C"), "A");
    expect(remaining(encounter, "A")).toEqual({ x: 1 });
  });

  it("no descuenta las anotaciones de participantes ocultos", () => {
    let encounter = withParticipants(["A", 2], ["B", 1]);
    encounter = addAnnotation(encounter, "B", { id: "x", text: "veneno", remainingRounds: 1 });
    encounter = hideParticipant(encounter, "B");
    encounter = advanceTurn(encounter);
    expect(encounter.round).toBe(2);
    expect(remaining(encounter, "B")).toEqual({ veneno: 1 });
  });

  it("permite quitar manualmente una anotación infinita", () => {
    let encounter = addAnnotation(withParticipants(["A", 1]), "A", { id: "z", text: "x", remainingRounds: null });
    encounter = removeAnnotation(encounter, "A", "z");
    expect(remaining(encounter, "A")).toEqual({});
  });

  it("identifica las anotaciones que expiran con un cambio de turno", () => {
    let encounter = setCurrent(withParticipants(["A", 2], ["B", 1]), "A");
    encounter = addAnnotation(encounter, "B", { id: "x", text: "x", remainingRounds: 1 });
    encounter = addGlobalAnnotation(encounter, { id: "g", text: "g", remainingRounds: 2 });
    encounter = advanceTurn(encounter);
    expect(expiredAnnotationIds(encounter, advanceTurn(encounter))).toEqual(new Set(["x"]));
  });
});

describe("ocultar, restaurar y eliminar", () => {
  it("al ocultar al actual, el turno pasa al siguiente sin cambiar la ronda", () => {
    const encounter = hideParticipant(withParticipants(["A", 3], ["B", 2], ["C", 1]), "A");
    expect(currentName(encounter)).toBe("B");
    expect(encounter.round).toBe(1);
  });

  it("ocultar al último cuando tiene el turno cierra la ronda, como pulsar «Siguiente turno»", () => {
    let encounter = withParticipants(["A", 3], ["B", 2], ["C", 1]);
    encounter = addAnnotation(encounter, "A", { id: "a1", text: "aturdido", remainingRounds: 1 });
    encounter = addAnnotation(encounter, "A", { id: "a2", text: "bendecido", remainingRounds: 3 });
    encounter = addGlobalAnnotation(encounter, { id: "g", text: "niebla", remainingRounds: 1 });
    encounter = advance(encounter, 2); // turno de C
    encounter = addAnnotation(encounter, "C", { id: "c1", text: "veneno", remainingRounds: 2 });

    const hidden = hideParticipant(encounter, "C");

    expect(currentName(hidden)).toBe("A");
    expect(hidden.round).toBe(2);
    // Lo iniciado en el turno de A se cumple al volver a A.
    expect(remaining(hidden, "A")).toEqual({ bendecido: 2 });
    expect(remaining(hidden)).toEqual({});
    // El que sale queda fuera del descuento: conserva sus anotaciones intactas.
    expect(remaining(hidden, "C")).toEqual({ veneno: 2 });
    expect(expiredAnnotationIds(encounter, hidden, "C")).toEqual(new Set(["a1", "g"]));
  });

  it("eliminar al último cuando tiene el turno también cierra la ronda", () => {
    const encounter = removeParticipant(setCurrent(withParticipants(["A", 3], ["B", 2], ["C", 1]), "C"), "C");
    expect(currentName(encounter)).toBe("A");
    expect(encounter.round).toBe(2);
  });

  it("retirar al último sin que tenga el turno no cierra la ronda", () => {
    const encounter = hideParticipant(withParticipants(["A", 3], ["B", 2], ["C", 1]), "C");
    expect(currentName(encounter)).toBe("A");
    expect(encounter.round).toBe(1);
  });

  it("retirar al único participante activo no cierra la ronda: no queda nadie que actúe", () => {
    const encounter = hideParticipant(withParticipants(["A", 1]), "A");
    expect(encounter.round).toBe(1);
    expect(encounter.currentId).toBeNull();
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
    expect(remaining(encounter, "A")).toEqual({ x: 3 });
  });

  it("al eliminar al actual, el turno pasa al siguiente (igual que al ocultar)", () => {
    const encounter = removeParticipant(setCurrent(withParticipants(["A", 3], ["B", 2], ["C", 1]), "B"), "B");
    expect(currentName(encounter)).toBe("C");
  });
});
