export const PRESET_IDS = ["gorr", "lyra", "caedren", "kumiko", "adriana", "shary"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export interface Annotation {
  id: string;
  text: string;
  /** Rondas restantes; `null` significa duración infinita. */
  remainingRounds: number | null;
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
