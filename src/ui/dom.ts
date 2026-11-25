export function requiredElement<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`No se encontró el elemento requerido: ${selector}`);
  return element;
}

export function formInput(form: HTMLFormElement, name: string): HTMLInputElement {
  return requiredElement<HTMLInputElement>(`[name="${name}"]`, form);
}

/** Muestra (o limpia, con `null`) el mensaje de error de un formulario y marca el campo inválido. */
export function setFormError(form: HTMLFormElement, message: string | null, field?: HTMLInputElement): void {
  const error = requiredElement<HTMLElement>(".form-error", form);
  error.textContent = message ?? "";
  error.hidden = message === null;
  form.querySelectorAll("input").forEach((input) => input.removeAttribute("aria-invalid"));
  if (message && field) {
    field.setAttribute("aria-invalid", "true");
    field.focus();
  }
}

export function makeEmptyState(message: string): HTMLElement {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

export const prefersReducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Duración de la animación `.is-removing` definida en styles.css. */
const REMOVE_ANIMATION_MS = 280;

export function animateOut(elements: readonly HTMLElement[]): Promise<void> {
  if (elements.length === 0) return Promise.resolve();
  elements.forEach((element) => element.classList.add("is-removing"));
  const duration = prefersReducedMotion() ? 0 : REMOVE_ANIMATION_MS;
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}
