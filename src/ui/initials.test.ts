import { describe, expect, it } from "vitest";
import { initials, TOKEN_TONES, tokenTone } from "./initials.ts";

describe("iniciales del token", () => {
  it("usa la primera letra de las dos primeras palabras", () => {
    expect(initials("Goblin arquero")).toBe("GA");
    expect(initials("  ogro   de las colinas ")).toBe("OD");
    expect(initials("Orco")).toBe("O");
  });

  it("conserva los números para distinguir copias", () => {
    expect(initials("Orco 2")).toBe("O2");
    expect(initials("Esqueleto 12")).toBe("E12");
  });

  it("maneja tildes, eñes y caracteres fuera del BMP", () => {
    expect(initials("ñu élfico")).toBe("ÑÉ");
    expect(initials("𝔇ragón")).toBe("𝔇");
  });

  it("el tono es estable y está en rango", () => {
    expect(tokenTone("Orco")).toBe(tokenTone(" orco "));
    expect(tokenTone("Goblin")).toBeGreaterThanOrEqual(0);
    expect(tokenTone("Goblin")).toBeLessThan(TOKEN_TONES);
  });
});
