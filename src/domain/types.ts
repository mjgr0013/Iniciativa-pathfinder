export const PRESET_IDS = ["gorr", "lyra", "caedren", "kumiko", "adriana", "shary"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

/**
 * Punto de la iniciativa donde empezó un efecto: el participante que tenía el turno al crearlo.
 * Guarda su iniciativa y orden por si ese participante se elimina: su posición sigue contando.
 */
export interface TurnAnchor {
  participantId: string;
  initiative: number;
  order: number;
}

export interface Annotation {
  id: string;
  text: string;
  /** Rondas restantes; `null` significa duración infinita. */
  remainingRounds: number | null;
  /**
   * Solo en anotaciones globales: las rondas se cuentan desde aquí (cada vez que el turno llega a este punto
   * se descuenta una). `null` = inicio de ronda. Las de un participante se cuentan en el turno de su portador
   * y lo tienen siempre a `null`.
   */
  anchor: TurnAnchor | null;
}

export interface Participant {
  id: string;
  name: string;
  initiative: number;
  hidden: boolean;
  annotations: Annotation[];
  /** Orden de inserción, usado para desempatar iniciativas iguales. */
  order: number;
  /** Personaje predeterminado al que corresponde (token, protección contra borrado); `null` si fue añadido. */
  presetId: PresetId | null;
}

export interface Encounter {
  round: number;
  participants: Participant[];
  currentId: string | null;
  globalAnnotations: Annotation[];
}
