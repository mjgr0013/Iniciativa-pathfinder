export interface Annotation {
  id: string;
  text: string;
  /** Zero means the annotation does not expire. */
  rounds: number;
}

export interface Companion {
  id: string;
  name: string;
  hidden: boolean;
}

export interface Participant {
  id: string;
  name: string;
  initiative: number;
  hidden: boolean;
  annotations: Annotation[];
  order: number;
  /** True only for the built-in participants, which cannot be deleted. */
  isDefault: boolean;
  /** A companion shares this participant's turn and is never a separate initiative entry. */
  companion?: Companion | null;
}

export interface EncounterData {
  round: number;
  participants: Participant[];
  currentId: string | null;
  globalAnnotations: Annotation[];
}

export interface PersistedEncounter extends EncounterData {
  schemaVersion: number;
}
