import type { PresetId } from "../domain/types.ts";
import adriana from "../assets/tokens/adriana.jpg";
import caedren from "../assets/tokens/caedren.jpg";
import gorr from "../assets/tokens/gorr.jpg";
import kumiko from "../assets/tokens/kumiko.jpg";
import lyra from "../assets/tokens/lyra.jpg";
import shary from "../assets/tokens/shary.jpg";

/** Retrato de cada personaje predeterminado; va ligado al personaje, no a su nombre, así sobrevive a un cambio de nombre. */
export const PRESET_TOKENS: Record<PresetId, string> = { gorr, lyra, caedren, kumiko, adriana, shary };
