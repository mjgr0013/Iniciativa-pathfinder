import { describe, expect, it } from "vitest";
import { parseAnnotationText, parseInitiative, parseName, parseRounds } from "./validation.ts";

describe("validación", () => {
  it("exige nombre y recorta espacios", () => {
    expect(parseName("  Orco ")).toEqual({ ok: true, value: "Orco" });
    expect(parseName("   ").ok).toBe(false);
  });

  it("rechaza iniciativas vacías o no numéricas", () => {
    expect(parseInitiative("-2")).toEqual({ ok: true, value: -2 });
    expect(parseInitiative("").ok).toBe(false);
    expect(parseInitiative("abc").ok).toBe(false);
  });

  it("convierte 0 rondas en duración infinita y rechaza decimales y negativos", () => {
    expect(parseRounds("0")).toEqual({ ok: true, value: null });
    expect(parseRounds("3")).toEqual({ ok: true, value: 3 });
    expect(parseRounds("1.5").ok).toBe(false);
    expect(parseRounds("-1").ok).toBe(false);
    expect(parseRounds("").ok).toBe(false);
  });

  it("exige texto en la anotación", () => {
    expect(parseAnnotationText(" ").ok).toBe(false);
  });
});
