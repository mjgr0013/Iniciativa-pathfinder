import type { PresetId } from "../domain/types.ts";
import { initials, tokenTone } from "./initials.ts";
import adriana from "../assets/tokens/adriana.jpg";
import caedren from "../assets/tokens/caedren.jpg";
import gorr from "../assets/tokens/gorr.jpg";
import kumiko from "../assets/tokens/kumiko.jpg";
import lyra from "../assets/tokens/lyra.jpg";
import shary from "../assets/tokens/shary.jpg";

/** Retrato de cada personaje predeterminado; va ligado al personaje, no a su nombre, así sobrevive a un cambio de nombre. */
export const PRESET_TOKENS: Record<PresetId, string> = { gorr, lyra, caedren, kumiko, adriana, shary };

/** Lo necesario para dibujar el token de alguien: su nombre y, si es predeterminado, su retrato. */
export interface TokenOwner {
  name: string;
  presetId: PresetId | null;
}

/** Rellena `token`: retrato para los predeterminados; para el resto, sus iniciales sobre un tono estable. */
export function renderToken(token: HTMLElement, owner: TokenOwner): void {
  if (owner.presetId) {
    const image = document.createElement("img");
    image.src = PRESET_TOKENS[owner.presetId];
    image.alt = "";
    image.width = 64;
    image.height = 64;
    image.decoding = "async";
    token.replaceChildren(image);
    return;
  }
  const text = initials(owner.name);
  token.classList.add("token-initials", `token-tone-${tokenTone(owner.name)}`);
  token.dataset.length = String(Math.min(text.length, 3));
  token.textContent = text;
}
