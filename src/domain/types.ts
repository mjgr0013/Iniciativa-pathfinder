export const PRESET_IDS = ["gorr", "lyra", "caedren", "kumiko", "adriana", "shary"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

/**
 * Punto de la iniciativa donde empezó un efecto: el participante que tenía el turno al crearlo (quien lo
 * desencadenó). Guarda su iniciativa y orden por si ese participante se elimina: su posición sigue contando.
 */
export interface TurnAnchor {
  participantId: string;
  /** Nombre al crear la anotación, para seguir mostrando de quién era el turno si se elimina. */
  name: string;
  initiative: number;
  order: number;
}

export interface Annotation {
  id: string;
  text: string;
  /** Rondas restantes; `null` significa duración infinita. */
  remainingRounds: number | null;
  /**
   * Turno de quien desencadenó la anotación: cada vez que el turno vuelve a este punto se descuenta una ronda,
   * y al llegar a 0 expira en ese momento. `null` (anotaciones guardadas por versiones anteriores, o creadas sin
   * nadie en turno) = inicio de ronda.
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
