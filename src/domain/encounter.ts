import { PRESET_IDS, type Annotation, type Encounter, type Participant, type PresetId } from "./types.ts";

export const PRESET_NAMES: Record<PresetId, string> = {
  gorr: "Gorr",
  lyra: "Lyra",
  caedren: "Caedren",
  kumiko: "Kumiko",
  adriana: "Adriana",
  shary: "Shary",
};

export function presetParticipant(presetId: PresetId, order: number): Participant {
  return {
    id: `preset-${presetId}`,
    name: PRESET_NAMES[presetId],
    initiative: 0,
    hidden: false,
    annotations: [],
    order,
    presetId,
  };
}

export function createDefaultEncounter(): Encounter {
  const participants = PRESET_IDS.map(presetParticipant);
  return {
    round: 1,
    participants,
    currentId: sortActive(participants)[0]?.id ?? null,
    globalAnnotations: [],
  };
}

/** Participantes visibles, de mayor a menor iniciativa; los empates conservan el orden de inserción. */
export function sortActive(participants: readonly Participant[]): Participant[] {
  return participants
    .filter((participant) => !participant.hidden)
    .sort((a, b) => b.initiative - a.initiative || a.order - b.order);
}

/**
 * Orden de actuación a partir del turno actual: la lista activa rotada para que el actual quede primero.
 * `nextRoundIndex` es la posición donde empieza la siguiente ronda (el de mayor iniciativa), o `null` si no hay corte.
 */
export function turnOrder(encounter: Encounter): { participants: Participant[]; nextRoundIndex: number | null } {
  const active = sortActive(encounter.participants);
  const currentIndex = Math.max(0, active.findIndex((participant) => participant.id === encounter.currentId));
  return {
    participants: [...active.slice(currentIndex), ...active.slice(0, currentIndex)],
    nextRoundIndex: currentIndex === 0 ? null : active.length - currentIndex,
  };
}

export function sortHidden(participants: readonly Participant[]): Participant[] {
  return participants
    .filter((participant) => participant.hidden)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function getCurrent(encounter: Encounter): Participant | null {
  return sortActive(encounter.participants).find((participant) => participant.id === encounter.currentId) ?? null;
}

function nextOrder(participants: readonly Participant[]): number {
  return participants.reduce((max, participant) => Math.max(max, participant.order), -1) + 1;
}

function mapParticipant(
  encounter: Encounter,
  id: string,
  update: (participant: Participant) => Participant,
): Participant[] {
  return encounter.participants.map((participant) => (participant.id === id ? update(participant) : participant));
}

/**
 * Turno que hereda `leavingId` cuando sale del orden activo: el siguiente en la lista
 * o, si era el último, el primero. `null` si no queda nadie activo.
 */
function successorOf(encounter: Encounter, leavingId: string): string | null {
  const active = sortActive(encounter.participants);
  const index = active.findIndex((participant) => participant.id === leavingId);
  if (index === -1) return encounter.currentId;
  const remaining = [...active.slice(index + 1), ...active.slice(0, index)];
  return remaining[0]?.id ?? null;
}

export interface NewParticipant {
  name: string;
  initiative: number;
  hidden: boolean;
}

export function addParticipant(encounter: Encounter, id: string, input: NewParticipant): Encounter {
  const participant: Participant = {
    id,
    name: input.name,
    initiative: input.initiative,
    hidden: input.hidden,
    annotations: [],
    order: nextOrder(encounter.participants),
    presetId: null,
  };
  return {
    ...encounter,
    participants: [...encounter.participants, participant],
    currentId: encounter.currentId ?? (input.hidden ? null : id),
  };
}

export function updateParticipant(
  encounter: Encounter,
  id: string,
  changes: Partial<Pick<Participant, "name" | "initiative">>,
): Encounter {
  return { ...encounter, participants: mapParticipant(encounter, id, (participant) => ({ ...participant, ...changes })) };
}

export function setCurrent(encounter: Encounter, id: string): Encounter {
  const isActive = encounter.participants.some((participant) => participant.id === id && !participant.hidden);
  return isActive ? { ...encounter, currentId: id } : encounter;
}

/** Indica si avanzar el turno ahora cerraría la ronda. */
export function completesRound(encounter: Encounter): boolean {
  const active = sortActive(encounter.participants);
  return active.length > 0 && active.at(-1)!.id === encounter.currentId;
}

/** Anotaciones que desaparecerán si se completa la ronda ahora. */
export function expiringAnnotationIds(encounter: Encounter): Set<string> {
  const expiring = (annotations: Annotation[]) =>
    annotations.filter((annotation) => annotation.remainingRounds === 1).map((annotation) => annotation.id);
  return new Set([
    ...encounter.participants.filter((participant) => !participant.hidden).flatMap((participant) => expiring(participant.annotations)),
    ...expiring(encounter.globalAnnotations),
  ]);
}

export function tickAnnotations(annotations: readonly Annotation[]): Annotation[] {
  return annotations.flatMap((annotation) => {
    if (annotation.remainingRounds === null) return [annotation];
    const remainingRounds = annotation.remainingRounds - 1;
    return remainingRounds > 0 ? [{ ...annotation, remainingRounds }] : [];
  });
}

export function advanceTurn(encounter: Encounter): Encounter {
  const active = sortActive(encounter.participants);
  if (active.length === 0) return encounter;

  const currentIndex = active.findIndex((participant) => participant.id === encounter.currentId);
  if (currentIndex === -1) return { ...encounter, currentId: active[0]!.id };

  if (currentIndex < active.length - 1) return { ...encounter, currentId: active[currentIndex + 1]!.id };

  return {
    round: encounter.round + 1,
    currentId: active[0]!.id,
    participants: encounter.participants.map((participant) =>
      participant.hidden ? participant : { ...participant, annotations: tickAnnotations(participant.annotations) },
    ),
    globalAnnotations: tickAnnotations(encounter.globalAnnotations),
  };
}

export function hideParticipant(encounter: Encounter, id: string): Encounter {
  const currentId = encounter.currentId === id ? successorOf(encounter, id) : encounter.currentId;
  return {
    ...encounter,
    participants: mapParticipant(encounter, id, (participant) => ({ ...participant, hidden: true })),
    currentId,
  };
}

export function restoreParticipant(encounter: Encounter, id: string): Encounter {
  return {
    ...encounter,
    participants: mapParticipant(encounter, id, (participant) => ({ ...participant, hidden: false })),
    currentId: encounter.currentId ?? id,
  };
}

/** Los participantes predeterminados no se pueden eliminar, solo ocultar. */
export function canRemove(participant: Participant): boolean {
  return participant.presetId === null;
}

export function removeParticipant(encounter: Encounter, id: string): Encounter {
  const target = encounter.participants.find((participant) => participant.id === id);
  if (!target || !canRemove(target)) return encounter;
  const currentId = encounter.currentId === id ? successorOf(encounter, id) : encounter.currentId;
  return {
    ...encounter,
    participants: encounter.participants.filter((participant) => participant.id !== id),
    currentId,
  };
}

export function addAnnotation(encounter: Encounter, participantId: string, annotation: Annotation): Encounter {
  return {
    ...encounter,
    participants: mapParticipant(encounter, participantId, (participant) => ({
      ...participant,
      annotations: [...participant.annotations, annotation],
    })),
  };
}

export function removeAnnotation(encounter: Encounter, participantId: string, annotationId: string): Encounter {
  return {
    ...encounter,
    participants: mapParticipant(encounter, participantId, (participant) => ({
      ...participant,
      annotations: participant.annotations.filter((annotation) => annotation.id !== annotationId),
    })),
  };
}

export function addGlobalAnnotation(encounter: Encounter, annotation: Annotation): Encounter {
  return { ...encounter, globalAnnotations: [...encounter.globalAnnotations, annotation] };
}

export function removeGlobalAnnotation(encounter: Encounter, annotationId: string): Encounter {
  return {
    ...encounter,
    globalAnnotations: encounter.globalAnnotations.filter((annotation) => annotation.id !== annotationId),
  };
}
