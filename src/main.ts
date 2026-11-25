import "./styles.css";
import { loadEncounter, saveEncounter } from "./persistence.ts";
import { createEncounterStore } from "./store.ts";
import { mountApp } from "./ui/app.ts";

const store = createEncounterStore(loadEncounter(localStorage));
store.subscribe((state) => saveEncounter(localStorage, state));
mountApp(store);
