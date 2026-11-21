export interface Annotation {
  id: string;
  text: string;
  /** Zero means the annotation does not expire. */
  rounds: number;
}

export interface Participant {
  id: string;
  name: string;
  initiative: number;
  hidden: boolean;
  annotations: Annotation[];
  order: number;
}

export interface EncounterData {
  round: number;
  participants: Participant[];
  currentId: string | null;
}

export interface PersistedEncounter {
  round: number;
  participants: Participant[];
  currentId: string | null;
}
