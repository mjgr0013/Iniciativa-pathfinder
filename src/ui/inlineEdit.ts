import type { ParseResult } from "../domain/validation.ts";

export interface InlineEditOptions<T> {
  value: string;
  label: string;
  type: "text" | "number";
  parse(raw: string): ParseResult<T>;
  /** Guarda el valor; el re-render posterior sustituye al campo. */
  onSave(value: T): void;
  /** Restaura la vista original sin guardar. */
  onCancel(): void;
}

/**
 * Sustituye `trigger` por un campo editable (como hermano: un input no puede ir dentro de un botón).
 * Enter guarda, Escape cancela y salir del campo guarda si el valor es válido o cancela si no.
 */
export function startInlineEdit<T>(trigger: HTMLElement, options: InlineEditOptions<T>): void {
  if (trigger.hidden) return;

  const input = document.createElement("input");
  input.className = "inline-edit-input";
  input.type = options.type;
  if (options.type === "number") input.step = "1";
  input.value = options.value;
  input.setAttribute("aria-label", options.label);
  trigger.hidden = true;
  trigger.after(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (save: boolean, keepEditingIfInvalid: boolean): void => {
    if (done) return;
    if (!save) {
      done = true;
      options.onCancel();
      return;
    }
    const result = options.parse(input.value);
    if (result.ok) {
      done = true;
      options.onSave(result.value);
    } else if (keepEditingIfInvalid) {
      input.setAttribute("aria-invalid", "true");
      input.setCustomValidity(result.error);
      input.reportValidity();
    } else {
      done = true;
      options.onCancel();
    }
  };

  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    input.setCustomValidity("");
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true, true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false, false);
    }
  });
  input.addEventListener("blur", () => finish(true, false));
}
