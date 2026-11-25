import { requiredElement } from "./dom.ts";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
}

/** Abre el diálogo modal de confirmación y resuelve `true` solo si se acepta. */
export function confirmAction(dialog: HTMLDialogElement, options: ConfirmOptions): Promise<boolean> {
  requiredElement("#confirm-title", dialog).textContent = options.title;
  requiredElement("#confirm-message", dialog).textContent = options.message;
  requiredElement("#confirm-accept", dialog).textContent = options.confirmLabel;
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true });
  });
}
