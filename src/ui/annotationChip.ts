import type { Annotation } from "../domain/types.ts";

export function durationLabel(remainingRounds: number | null): string {
  if (remainingRounds === null) return "Infinita";
  if (remainingRounds === 1) return "Última ronda";
  return `${remainingRounds} rondas`;
}

/** Cuándo termina una anotación finita, según el turno en que empezó. */
/**
 * Cuándo termina una anotación finita: las de participante, al terminar el turno de su portador;
 * las globales, al llegar el turno en que se crearon (o al empezar la ronda, si no se sabe).
 */
export function expiryHint(remainingRounds: number | null, turnOwner: string | null, kind: "participant" | "global"): string | null {
  if (remainingRounds === null) return null;
  const moment = kind === "participant"
    ? `al terminar el turno de ${turnOwner}`
    : turnOwner ? `al llegar el turno de ${turnOwner}` : "al empezar la ronda";
  return remainingRounds === 1 ? `Expira ${moment}` : `Descuenta una ronda ${moment}`;
}

/** `turnOwner`: el portador (anotación de participante) o quien actuaba al crearla (global). */
export function createAnnotationChip(annotation: Annotation, turnOwner: string | null, kind: "participant" | "global"): HTMLElement {
  const item = document.createElement("span");
  item.className = "annotation";
  item.dataset.annotationId = annotation.id;
  item.classList.toggle("is-infinite", annotation.remainingRounds === null);
  item.classList.toggle("is-expiring", annotation.remainingRounds === 1);
  const hint = expiryHint(annotation.remainingRounds, turnOwner, kind);
  if (hint) item.title = hint;

  const text = document.createElement("span");
  text.className = "annotation-text";
  text.textContent = annotation.text;

  const duration = document.createElement("span");
  duration.className = "annotation-duration";
  duration.textContent = durationLabel(annotation.remainingRounds);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "annotation-delete";
  remove.dataset.action = "remove-annotation";
  remove.setAttribute("aria-label", `Quitar anotación: ${annotation.text}`);
  remove.textContent = "×";

  item.append(text, document.createTextNode(" · "), duration, remove);
  return item;
}
