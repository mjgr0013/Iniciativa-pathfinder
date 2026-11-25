export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const MAX_NAME_LENGTH = 40;
export const MAX_ANNOTATION_LENGTH = 80;

export function parseName(raw: string): ParseResult<string> {
  const value = raw.trim();
  if (!value) return { ok: false, error: "El nombre es obligatorio." };
  if (value.length > MAX_NAME_LENGTH) return { ok: false, error: `El nombre no puede superar ${MAX_NAME_LENGTH} caracteres.` };
  return { ok: true, value };
}

export function parseInitiative(raw: string): ParseResult<number> {
  const value = raw.trim();
  const number = Number(value);
  if (value === "" || !Number.isFinite(number)) return { ok: false, error: "La iniciativa debe ser un número." };
  return { ok: true, value: number };
}

export function parseAnnotationText(raw: string): ParseResult<string> {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Escribe el texto de la anotación." };
  if (value.length > MAX_ANNOTATION_LENGTH) return { ok: false, error: `La anotación no puede superar ${MAX_ANNOTATION_LENGTH} caracteres.` };
  return { ok: true, value };
}

/** `0` significa duración infinita y se traduce a `null`. */
export function parseRounds(raw: string): ParseResult<number | null> {
  const value = raw.trim();
  const number = Number(value);
  if (value === "" || !Number.isInteger(number) || number < 0) {
    return { ok: false, error: "Indica un número entero de rondas (0 = infinita)." };
  }
  return { ok: true, value: number === 0 ? null : number };
}
