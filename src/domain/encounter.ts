import { PRESET_IDS, type Annotation, type Encounter, type Participant, type PresetId, type TurnAnchor } from "./types.ts";

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

// ---------- Paso del turno y duración de las anotaciones ----------
//
// Cada ronda de duración de una anotación de participante cubre un turno de quien la sufre, y la anotación se
// quita justo antes del turno siguiente al último afectado. Se descuenta al EMPEZAR el turno del portador,
// salvo el primero tras añadirla (es el que le afecta). Así, «Aturdido 1 ronda» puesto a «Personaje 2» en el
// turno de «Personaje 1» le afecta en su turno, sigue visible como «Última ronda» y se quita justo antes de
// que vuelva a tocarle.
// Las globales no tienen portador: se cuentan desde el turno en que se crearon (su `anchor`) y descuentan
// al llegar de nuevo ese turno.

type Slot = Pick<Participant, "initiative" | "order">;

/** Negativo si `a` actúa antes que `b` en la ronda (mismo criterio que `sortActive`). */
function compareSlots(a: Slot, b: Slot): number {
  return b.initiative - a.initiative || a.order - b.order;
}

/** Posición actual del ancla de una global: la del participante si sigue en el encuentro (aunque esté oculto), o la guardada. */
function anchorSlot(encounter: Encounter, anchor: TurnAnchor): Slot {
  return encounter.participants.find((participant) => participant.id === anchor.participantId) ?? anchor;
}

function anchorAtCurrentTurn(encounter: Encounter): TurnAnchor | null {
  const current = getCurrent(encounter);
  return current ? { participantId: current.id, name: current.name, initiative: current.initiative, order: current.order } : null;
}

/**
 * Pasa el turno de quien lo tiene en `before` a `nextId`, sobre el estado `after` (que puede no incluir ya a
 * quien lo tenía). Si da la vuelta a la lista, empieza una ronda nueva. Empieza el turno de `nextId`, así que
 * descuentan sus anotaciones; las globales descuentan si su ancla queda en el tramo recorrido,
 * (actual, siguiente]. Las que llegan a 0 expiran.
 */
function passTurn(before: Encounter, after: Encounter, nextId: string | null): Encounter {
  const from = before.participants.find((participant) => participant.id === before.currentId);
  const to = after.participants.find((participant) => participant.id === nextId);
  if (!from || !to) return { ...after, currentId: nextId };

  const wrapped = compareSlots(to, from) <= 0;
  const isReached = (slot: Slot): boolean =>
    wrapped
      ? compareSlots(from, slot) < 0 || compareSlots(slot, to) <= 0
      : compareSlots(from, slot) < 0 && compareSlots(slot, to) <= 0;
  // Globales sin ancla (guardadas por versiones anteriores): descuentan al empezar la ronda.
  const isGlobalReached = (annotation: Annotation): boolean =>
    annotation.anchor === null ? wrapped : isReached(anchorSlot(before, annotation.anchor));

  return {
    ...after,
    currentId: nextId,
    round: wrapped ? after.round + 1 : after.round,
    participants: after.participants.map((participant) =>
      participant.id === to.id ? startTurnOf(participant) : participant,
    ),
    globalAnnotations: tickAnnotations(after.globalAnnotations, isGlobalReached),
  };
}

/** Inicio del turno del portador: descuenta sus anotaciones, salvo las que esperaban este primer turno. */
function startTurnOf(participant: Participant): Participant {
  const annotations = participant.annotations.flatMap((annotation) =>
    annotation.awaitingFirstTurn ? [{ ...annotation, awaitingFirstTurn: false }] : tickAnnotations([annotation]),
  );
  return { ...participant, annotations };
}

/** Descuenta una ronda a las anotaciones finitas que cumplan `shouldTick` y elimina las que llegan a 0. */
export function tickAnnotations(
  annotations: readonly Annotation[],
  shouldTick: (annotation: Annotation) => boolean = () => true,
): Annotation[] {
  return annotations.flatMap((annotation) => {
    if (annotation.remainingRounds === null || !shouldTick(annotation)) return [annotation];
    const remainingRounds = annotation.remainingRounds - 1;
    return remainingRounds > 0 ? [{ ...annotation, remainingRounds }] : [];
  });
}

/**
 * Anotaciones (de participantes y globales) que existían en `before` y ya no están en `after`,
 * sin contar las de `excludeParticipantId`. Sirve para animar las que expiran con un cambio de turno.
 */
export function expiredAnnotationIds(before: Encounter, after: Encounter, excludeParticipantId?: string): Set<string> {
  const ids = (encounter: Encounter) =>
    new Set([
      ...encounter.participants
        .filter((participant) => participant.id !== excludeParticipantId)
        .flatMap((participant) => participant.annotations.map((annotation) => annotation.id)),
      ...encounter.globalAnnotations.map((annotation) => annotation.id),
    ]);
  const remaining = ids(after);
  return new Set([...ids(before)].filter((id) => !remaining.has(id)));
}

export function advanceTurn(encounter: Encounter): Encounter {
  const active = sortActive(encounter.participants);
  if (active.length === 0) return encounter;

  const currentIndex = active.findIndex((participant) => participant.id === encounter.currentId);
  if (currentIndex === -1) return { ...encounter, currentId: active[0]!.id };

  return passTurn(encounter, encounter, active[(currentIndex + 1) % active.length]!.id);
}

/**
 * Saca a `id` del orden activo con `withoutLeaving` (ya oculto o eliminado). Si tenía el turno, cuenta como
 * terminarlo: el turno pasa al siguiente igual que al avanzar (cerrando la ronda si era el último).
 * Si no queda nadie activo, no hay turno actual y la ronda no avanza.
 */
function leaveTurnOrder(encounter: Encounter, id: string, withoutLeaving: Encounter): Encounter {
  if (encounter.currentId !== id) return withoutLeaving;
  return passTurn(encounter, withoutLeaving, successorOf(encounter, id));
}

export function hideParticipant(encounter: Encounter, id: string): Encounter {
  return leaveTurnOrder(encounter, id, {
    ...encounter,
    participants: mapParticipant(encounter, id, (participant) => ({ ...participant, hidden: true })),
  });
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
  return leaveTurnOrder(encounter, id, {
    ...encounter,
    participants: encounter.participants.filter((participant) => participant.id !== id),
  });
}

export type NewAnnotation = Omit<Annotation, "anchor" | "awaitingFirstTurn">;

/** Las anotaciones de un participante se cuentan en los turnos de ese participante: no necesitan ancla. */
export function addAnnotation(encounter: Encounter, participantId: string, annotation: NewAnnotation): Encounter {
  const added: Annotation = { ...annotation, anchor: null, awaitingFirstTurn: true };
  return {
    ...encounter,
    participants: mapParticipant(encounter, participantId, (participant) => ({
      ...participant,
      annotations: [...participant.annotations, added],
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

/** Las globales se anclan al turno actual: su duración se cuenta desde aquí. */
export function addGlobalAnnotation(encounter: Encounter, annotation: NewAnnotation): Encounter {
  const anchored: Annotation = { ...annotation, anchor: anchorAtCurrentTurn(encounter), awaitingFirstTurn: false };
  return { ...encounter, globalAnnotations: [...encounter.globalAnnotations, anchored] };
}

export function removeGlobalAnnotation(encounter: Encounter, annotationId: string): Encounter {
  return {
    ...encounter,
    globalAnnotations: encounter.globalAnnotations.filter((annotation) => annotation.id !== annotationId),
  };
}
