import { createStore } from "zustand/vanilla";
import * as domain from "./domain/encounter.ts";
import type { Encounter, Participant } from "./domain/types.ts";

export interface EncounterActions {
  addParticipant(input: domain.NewParticipant): void;
  updateParticipant(id: string, changes: Partial<Pick<Participant, "name" | "initiative">>): void;
  setCurrentParticipant(id: string): void;
  nextTurn(): void;
  hideParticipant(id: string): void;
  restoreParticipant(id: string): void;
  removeParticipant(id: string): void;
  addAnnotation(participantId: string, text: string, remainingRounds: number | null): void;
  removeAnnotation(participantId: string, annotationId: string): void;
  addGlobalAnnotation(text: string, remainingRounds: number | null): void;
  removeGlobalAnnotation(annotationId: string): void;
  resetEncounter(): void;
}

export type EncounterState = Encounter & EncounterActions;

const newId = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`;

export function createEncounterStore(initial: Encounter) {
  return createStore<EncounterState>()((set) => {
    const apply = (change: (encounter: Encounter) => Encounter) => set((state) => change(state));

    return {
      ...initial,
      addParticipant: (input) => apply((e) => domain.addParticipant(e, newId("participant"), input)),
      updateParticipant: (id, changes) => apply((e) => domain.updateParticipant(e, id, changes)),
      setCurrentParticipant: (id) => apply((e) => domain.setCurrent(e, id)),
      nextTurn: () => apply(domain.advanceTurn),
      hideParticipant: (id) => apply((e) => domain.hideParticipant(e, id)),
      restoreParticipant: (id) => apply((e) => domain.restoreParticipant(e, id)),
      removeParticipant: (id) => apply((e) => domain.removeParticipant(e, id)),
      addAnnotation: (participantId, text, remainingRounds) =>
        apply((e) => domain.addAnnotation(e, participantId, { id: newId("annotation"), text, remainingRounds })),
      removeAnnotation: (participantId, annotationId) => apply((e) => domain.removeAnnotation(e, participantId, annotationId)),
      addGlobalAnnotation: (text, remainingRounds) =>
        apply((e) => domain.addGlobalAnnotation(e, { id: newId("global-annotation"), text, remainingRounds })),
      removeGlobalAnnotation: (annotationId) => apply((e) => domain.removeGlobalAnnotation(e, annotationId)),
      resetEncounter: () => apply(domain.createDefaultEncounter),
    };
  });
}

export type EncounterStore = ReturnType<typeof createEncounterStore>;
