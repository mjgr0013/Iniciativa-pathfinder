import { describe, expect, it, vi } from "vitest";
import { createDefaultEncounter } from "./domain/encounter.ts";
import { loadEncounter, normalizeEncounter, saveEncounter, STORAGE_KEY } from "./persistence.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("persistencia", () => {
  it("guarda y vuelve a cargar el mismo encuentro", () => {
    const storage = memoryStorage();
    const encounter = { ...createDefaultEncounter(), round: 4 };
    saveEncounter(storage, encounter);
    expect(loadEncounter(storage)).toEqual(encounter);
  });

  it("usa el encuentro por defecto si los datos están corruptos", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(loadEncounter(memoryStorage({ [STORAGE_KEY]: "{no es json" }))).toEqual(createDefaultEncounter());
  });

  it("migra el esquema 3: rounds 0 = infinita, isDefault, compañeros e ids antiguos", () => {
    const migrated = normalizeEncounter({
      schemaVersion: 3,
      round: 2,
      currentId: "default-2-1",
      globalAnnotations: [{ id: "g", text: "niebla", rounds: 0 }],
      participants: [
        { id: "default-0-1", name: "Gorr", initiative: 12, hidden: false, order: 0, isDefault: true, annotations: [{ id: "a", text: "furia", rounds: 3 }] },
        { id: "default-2-1", name: "Caedrén el Sabio", initiative: 8, hidden: false, order: 2, isDefault: true, annotations: [], companion: { id: "c", name: "Jimmy", hidden: false } },
        { id: "participant-x", name: "Lyra", initiative: 5, hidden: true, order: 7, isDefault: false, annotations: [] },
      ],
    });

    expect(migrated).toEqual({
      round: 2,
      currentId: "default-2-1",
      globalAnnotations: [{ id: "g", text: "niebla", remainingRounds: null, anchor: null }],
      participants: [
        { id: "default-0-1", name: "Gorr", initiative: 12, hidden: false, order: 0, presetId: "gorr", annotations: [{ id: "a", text: "furia", remainingRounds: 3, anchor: null }] },
        { id: "default-2-1", name: "Caedrén el Sabio", initiative: 8, hidden: false, order: 2, presetId: "caedren", annotations: [] },
        { id: "participant-x", name: "Lyra", initiative: 5, hidden: true, order: 7, presetId: null, annotations: [] },
      ],
    });
  });

  it("conserva el ancla de las anotaciones y descarta las mal formadas", () => {
    const anchor = { participantId: "a", name: "A", initiative: 12, order: 0 };
    const migrated = normalizeEncounter({
      schemaVersion: 5,
      participants: [{ id: "a", name: "A", initiative: 12, order: 0, annotations: [{ id: "p", text: "p", remainingRounds: 2, anchor }] }],
      globalAnnotations: [
        { id: "x", text: "x", remainingRounds: 2, anchor },
        { id: "y", text: "y", remainingRounds: 2, anchor: { participantId: "a", initiative: "?" } },
      ],
    });
    expect(migrated?.globalAnnotations.map((annotation) => annotation.anchor)).toEqual([anchor, null]);
    expect(migrated?.participants[0]!.annotations[0]!.anchor).toEqual(anchor);
  });

  it("acepta anclas sin nombre (guardadas antes de mostrar el token en las globales)", () => {
    const migrated = normalizeEncounter({
      schemaVersion: 5,
      participants: [],
      globalAnnotations: [{ id: "x", text: "x", remainingRounds: 1, anchor: { participantId: "a", initiative: 3, order: 1 } }],
    });
    expect(migrated?.globalAnnotations[0]!.anchor).toEqual({ participantId: "a", name: "", initiative: 3, order: 1 });
  });

  it("añade a Shary en datos anteriores al esquema 3", () => {
    const migrated = normalizeEncounter({ round: 1, participants: [{ id: "a", name: "Gorr", initiative: 1, order: 0 }] });
    expect(migrated?.participants.map((participant) => participant.presetId)).toEqual(["gorr", "shary"]);
  });

  it("corrige un turno actual que apunta a un participante oculto", () => {
    const migrated = normalizeEncounter({
      schemaVersion: 4,
      currentId: "b",
      participants: [
        { id: "a", name: "A", initiative: 1, order: 0 },
        { id: "b", name: "B", initiative: 2, order: 1, hidden: true },
      ],
    });
    expect(migrated?.currentId).toBe("a");
  });
});
