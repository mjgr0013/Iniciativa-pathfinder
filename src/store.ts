import { createStore } from "zustand/vanilla";
import type { Annotation, EncounterData, Participant, PersistedEncounter } from "./types.ts";

const STORAGE_KEY = "iniciativa-pathfinder-state-v1";
const SCHEMA_VERSION = 3;
const DEFAULT_NAMES = ["Gorr", "Lyra", "Caedren", "Kumiko", "Adriana", "Shary"];

export interface EncounterStore extends EncounterData {
  addParticipant(name: string, initiative: number, hidden: boolean): void;
  updateParticipant(id: string, changes: Partial<Pick<Participant, "name" | "initiative">>): void;
  setCurrentParticipant(id: string): void;
  nextTurn(): void;
  hideParticipant(id: string): void;
  restoreParticipant(id: string): void;
  removeParticipant(id: string): void;
  addAnnotation(participantId: string, text: string, rounds: number): void;
  removeAnnotation(participantId: string, annotationId: string): void;
  addGlobalAnnotation(text: string, rounds: number): void;
  removeGlobalAnnotation(annotationId: string): void;
  resetEncounter(): void;
}

function makeId(prefix = "participant"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultEncounter(): EncounterData {
  const participants = DEFAULT_NAMES.map((name, order) => ({
    id: `default-${order}-${Date.now()}`,
    name,
    initiative: 0,
    hidden: false,
    annotations: [],
    order,
  }));
  return {
    round: 1,
    participants,
    currentId: participants[0]?.id ?? null,
    globalAnnotations: [],
  };
}

function normalizeAnnotations(value: unknown): Annotation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const raw = entry as { id?: unknown; text?: unknown; rounds?: unknown; infinite?: unknown };
    if (typeof raw.text !== "string") return [];
    const duration = Number(raw.rounds);
    const rounds = raw.infinite === true || duration === 0 || !Number.isFinite(duration)
      ? 0
      : Math.max(1, Math.trunc(duration));
    return [{
      id: typeof raw.id === "string" ? raw.id : `annotation-${index}`,
      text: raw.text,
      rounds,
    }];
  });
}

function normalizeParticipant(value: unknown, index: number, migrateLegacy: boolean): Participant | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Participant> & { annotations?: unknown };
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  const initiative = Number(raw.initiative);
  return {
    id: raw.id,
    name: raw.name,
    initiative: Number.isFinite(initiative) ? initiative : 0,
    hidden: raw.hidden === true,
    annotations: normalizeAnnotations(raw.annotations),
    order: Number.isInteger(raw.order) ? raw.order! : index,
  };
}

function sortActive(participants: Participant[]): Participant[] {
  return participants
    .filter((participant) => !participant.hidden)
    .sort((a, b) => b.initiative - a.initiative || a.order - b.order);
}

function loadEncounter(): EncounterData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        const raw = parsed as {
          round?: unknown;
          participants?: unknown;
          currentId?: unknown;
          globalAnnotations?: unknown;
          schemaVersion?: unknown;
        };
        if (Array.isArray(raw.participants)) {
          const migrateLegacy = Number(raw.schemaVersion ?? 0) < SCHEMA_VERSION;
          const participants = raw.participants
            .map((participant, index) => normalizeParticipant(participant, index, migrateLegacy))
            .filter((participant): participant is Participant => participant !== null);

          if (migrateLegacy && !participants.some((participant) => participant.name.toLocaleLowerCase("es") === "shary")) {
            participants.push({
              id: `default-shary-${Date.now()}`,
              name: "Shary",
              initiative: 0,
              hidden: false,
              annotations: [],
              order: participants.reduce((max, participant) => Math.max(max, participant.order), -1) + 1,
            });
          }

          const active = sortActive(participants);
          const requestedCurrentId = typeof raw.currentId === "string" ? raw.currentId : null;
          return {
            round: Number.isInteger(raw.round) ? Math.max(1, Number(raw.round)) : 1,
            participants,
            currentId: active.some((participant) => participant.id === requestedCurrentId)
              ? requestedCurrentId
              : active[0]?.id ?? null,
            globalAnnotations: normalizeAnnotations(raw.globalAnnotations),
          };
        }
      }
    }
  } catch (error) {
    console.warn("No se pudo cargar el encuentro guardado.", error);
  }
  return createDefaultEncounter();
}

function snapshot(state: EncounterStore): PersistedEncounter {
  return {
    schemaVersion: SCHEMA_VERSION,
    round: state.round,
    participants: state.participants,
    currentId: state.currentId,
    globalAnnotations: state.globalAnnotations,
  };
}

function decrementAnnotations(annotations: Annotation[]): Annotation[] {
  return annotations
    .filter((annotation) => annotation.rounds === 0 || annotation.rounds - 1 > 0)
    .map((annotation) => annotation.rounds === 0
      ? annotation
      : { ...annotation, rounds: annotation.rounds - 1 });
}

export const encounterStore = createStore<EncounterStore>()((set, get) => ({
  ...loadEncounter(),

  addParticipant(name, initiative, hidden) {
    const participant: Participant = {
      id: makeId(), name, initiative, hidden, annotations: [], order: get().participants.length,
    };
    set((state) => ({
      participants: [...state.participants, participant],
      currentId: !hidden && state.currentId === null ? participant.id : state.currentId,
    }));
  },

  updateParticipant(id, changes) {
    set((state) => ({
      participants: state.participants.map((participant) =>
        participant.id === id ? { ...participant, ...changes } : participant,
      ),
    }));
  },

  setCurrentParticipant(id) {
    if (get().participants.some((participant) => participant.id === id && !participant.hidden)) set({ currentId: id });
  },

  nextTurn() {
    const state = get();
    const active = sortActive(state.participants);
    if (active.length === 0) return;
    const currentIndex = Math.max(0, active.findIndex((participant) => participant.id === state.currentId));
    const endOfRound = currentIndex === active.length - 1;
    const participants = endOfRound
      ? state.participants.map((participant) => participant.hidden
          ? participant
          : { ...participant, annotations: decrementAnnotations(participant.annotations) })
      : state.participants;
    set({
      participants,
      globalAnnotations: endOfRound ? decrementAnnotations(state.globalAnnotations) : state.globalAnnotations,
      round: endOfRound ? state.round + 1 : state.round,
      currentId: active[endOfRound ? 0 : currentIndex + 1].id,
    });
  },

  hideParticipant(id) {
    const state = get();
    const active = sortActive(state.participants);
    const currentIndex = active.findIndex((participant) => participant.id === state.currentId);
    const nextCurrent = state.currentId === id
      ? active.slice(currentIndex + 1).find((participant) => participant.id !== id)?.id
        ?? active.slice(0, currentIndex).find((participant) => participant.id !== id)?.id
        ?? null
      : state.currentId;
    set({
      participants: state.participants.map((participant) =>
        participant.id === id ? { ...participant, hidden: true } : participant,
      ),
      currentId: nextCurrent,
    });
  },

  restoreParticipant(id) {
    set((state) => ({
      participants: state.participants.map((participant) =>
        participant.id === id ? { ...participant, hidden: false } : participant,
      ),
      currentId: state.currentId ?? id,
    }));
  },

  removeParticipant(id) {
    const participants = get().participants.filter((participant) => participant.id !== id);
    const active = sortActive(participants);
    set((state) => ({
      participants,
      currentId: state.currentId === id ? active[0]?.id ?? null : state.currentId,
    }));
  },

  addAnnotation(participantId, text, rounds) {
    set((state) => ({
      participants: state.participants.map((participant) => participant.id === participantId
        ? { ...participant, annotations: [...participant.annotations, { id: makeId("annotation"), text, rounds }] }
        : participant),
    }));
  },

  removeAnnotation(participantId, annotationId) {
    set((state) => ({
      participants: state.participants.map((participant) => participant.id === participantId
        ? { ...participant, annotations: participant.annotations.filter((annotation) => annotation.id !== annotationId) }
        : participant),
    }));
  },

  addGlobalAnnotation(text, rounds) {
    set((state) => ({
      globalAnnotations: [...state.globalAnnotations, { id: makeId("global-annotation"), text, rounds }],
    }));
  },

  removeGlobalAnnotation(annotationId) {
    set((state) => ({
      globalAnnotations: state.globalAnnotations.filter((annotation) => annotation.id !== annotationId),
    }));
  },

  resetEncounter() {
    set(createDefaultEncounter());
  },
}));

encounterStore.subscribe((state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot(state)));
  } catch (error) {
    console.warn("No se pudo guardar el encuentro.", error);
  }
});
