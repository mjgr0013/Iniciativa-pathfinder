/**
 * Iniciales para el token de un participante sin retrato: la primera letra de las dos primeras palabras
 * ("Goblin arquero" → "GA"). Los números se conservan enteros para distinguir copias ("Orco 2" → "O2").
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (word: string) => (/^\d+$/.test(word) ? word : Array.from(word)[0] ?? "");
  return words.slice(0, 2).map(first).join("").toLocaleUpperCase("es") || "?";
}

export const TOKEN_TONES = 4;

/** Tono de color estable para un nombre, para que cada monstruo conserve el suyo entre renders. */
export function tokenTone(name: string): number {
  let hash = 0;
  for (const character of name.trim().toLocaleLowerCase("es")) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return hash % TOKEN_TONES;
}
