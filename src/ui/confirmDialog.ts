import { requiredElement } from "./dom.ts";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** `danger` (por defecto) para acciones destructivas; `primary` para el resto. */
  tone?: "danger" | "primary";
}

/** Abre el diálogo modal de confirmación y resuelve `true` solo si se acepta. */
export function confirmAction(dialog: HTMLDialogElement, options: ConfirmOptions): Promise<boolean> {
  requiredElement("#confirm-title", dialog).textContent = options.title;
  requiredElement("#confirm-message", dialog).textContent = options.message;
  const accept = requiredElement<HTMLButtonElement>("#confirm-accept", dialog);
  accept.textContent = options.confirmLabel;
  accept.classList.toggle("button-danger", options.tone !== "primary");
  accept.classList.toggle("button-primary", options.tone === "primary");
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true });
  });
}
