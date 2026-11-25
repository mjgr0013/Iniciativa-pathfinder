import { createDefaultEncounter, presetParticipant, PRESET_NAMES, sortActive } from "./domain/encounter.ts";
import { PRESET_IDS, type Annotation, type Encounter, type Participant, type PresetId, type TurnAnchor } from "./domain/types.ts";

export const STORAGE_KEY = "iniciativa-pathfinder-state-v1";
export const SCHEMA_VERSION = 5;

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === "object" && value !== null;

function presetByName(name: string): PresetId | null {
  const lower = name.trim().toLocaleLowerCase("es");
  return PRESET_IDS.find((id) => PRESET_NAMES[id].toLocaleLowerCase("es") === lower) ?? null;
}

/** Esquemas < 5 no guardaban el ancla: esas anotaciones descuentan al empezar cada ronda, como entonces. */
function normalizeAnchor(raw: unknown): TurnAnchor | null {
  if (!isObject(raw) || typeof raw.participantId !== "string") return null;
  const initiative = Number(raw.initiative);
  if (!Number.isFinite(initiative) || !Number.isInteger(raw.order)) return null;
  return { participantId: raw.participantId, initiative, order: raw.order as number };
}

function normalizeAnnotations(value: unknown, idPrefix: string, keepAnchor: boolean): Annotation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index): Annotation[] => {
    if (!isObject(raw) || typeof raw.text !== "string") return [];
    // Esquemas < 4 guardaban `rounds` (0 = infinita) y, antes, un flag `infinite`.
    const duration = Number(raw.remainingRounds ?? raw.rounds);
    const infinite = raw.remainingRounds === null || raw.infinite === true || duration === 0 || !Number.isFinite(duration);
    return [{
      id: typeof raw.id === "string" ? raw.id : `${idPrefix}-annotation-${index}`,
      text: raw.text,
      remainingRounds: infinite ? null : Math.max(1, Math.trunc(duration)),
      anchor: keepAnchor ? normalizeAnchor(raw.anchor) : null,
    }];
  });
}

function inferPresetId(raw: Raw, name: string): PresetId | null {
  if (typeof raw.presetId === "string" && (PRESET_IDS as readonly string[]).includes(raw.presetId)) {
    return raw.presetId as PresetId;
  }
  if (raw.isDefault === false) return null;
  const byName = presetByName(name);
  if (byName) return byName;
  // Predeterminado renombrado en esquemas antiguos: el id era `default-<índice>-<timestamp>`.
  const legacyIndex = typeof raw.id === "string" ? /^default-(\d+)-/.exec(raw.id)?.[1] : undefined;
  return raw.isDefault === true && legacyIndex !== undefined ? PRESET_IDS[Number(legacyIndex)] ?? null : null;
}

function normalizeParticipant(raw: unknown, index: number): Participant | null {
  if (!isObject(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  const initiative = Number(raw.initiative);
  return {
    id: raw.id,
    name: raw.name,
    initiative: Number.isFinite(initiative) ? initiative : 0,
    hidden: raw.hidden === true,
    // Las anotaciones de participante se cuentan en el turno de su portador: el ancla no aplica.
    annotations: normalizeAnnotations(raw.annotations, raw.id, false),
    order: Number.isInteger(raw.order) ? (raw.order as number) : index,
    presetId: inferPresetId(raw, raw.name),
  };
}

/** Convierte datos guardados (de cualquier versión anterior) en un encuentro válido, o `null` si no son utilizables. */
export function normalizeEncounter(raw: unknown): Encounter | null {
  if (!isObject(raw) || !Array.isArray(raw.participants)) return null;

  const seenPresets = new Set<PresetId>();
  const participants = raw.participants
    .map(normalizeParticipant)
    .filter((participant): participant is Participant => participant !== null)
    .map((participant) => {
      if (participant.presetId === null || !seenPresets.has(participant.presetId)) {
        if (participant.presetId) seenPresets.add(participant.presetId);
        return participant;
      }
      return { ...participant, presetId: null };
    });

  // Shary se añadió en el esquema 3.
  if (Number(raw.schemaVersion ?? 0) < 3 && !seenPresets.has("shary")) {
    const order = participants.reduce((max, participant) => Math.max(max, participant.order), -1) + 1;
    participants.push(presetParticipant("shary", order));
  }

  const active = sortActive(participants);
  const savedCurrentId = typeof raw.currentId === "string" ? raw.currentId : null;
  return {
    round: Number.isInteger(raw.round) ? Math.max(1, raw.round as number) : 1,
    participants,
    currentId: active.some((participant) => participant.id === savedCurrentId) ? savedCurrentId : active[0]?.id ?? null,
    globalAnnotations: normalizeAnnotations(raw.globalAnnotations, "global", true),
  };
}

export function loadEncounter(storage: StorageLike): Encounter {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) {
      const encounter = normalizeEncounter(JSON.parse(saved));
      if (encounter) return encounter;
    }
  } catch (error) {
    console.warn("No se pudo cargar el encuentro guardado.", error);
  }
  return createDefaultEncounter();
}

export function saveEncounter(storage: StorageLike, encounter: Encounter): void {
  const { round, participants, currentId, globalAnnotations } = encounter;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, round, participants, currentId, globalAnnotations }));
  } catch (error) {
    console.warn("No se pudo guardar el encuentro.", error);
  }
}
