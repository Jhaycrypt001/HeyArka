import { describe, expect, it } from "vitest";
import {
  CONFUSABLES,
  findConfusables,
  hasInvisibleChars,
  isConfusablyEqual,
  skeleton,
  stripInvisible,
} from "./unicode.js";

describe("unicode confusables", () => {
  it("finds Cyrillic confusables in a mixed-script string", () => {
    const cyrillicA = "А"; // mimics Latin A
    const found = findConfusables(`${cyrillicA}BC`);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ char: cyrillicA, mimics: "A", index: 0 });
  });

  it("skeleton() folds every confusable to its Latin lookalike", () => {
    const spoofed = "ТЅLA"; // Cyrillic T + Cyrillic S + Latin L,A
    expect(skeleton(spoofed)).toBe("TSLA");
  });

  it("isConfusablyEqual is true for a spoofed ticker but false for identical strings", () => {
    const spoofed = "ТSLA";
    expect(isConfusablyEqual(spoofed, "TSLA")).toBe(true);
    expect(isConfusablyEqual("TSLA", "TSLA")).toBe(false);
  });

  it("every CONFUSABLES entry actually differs from its Latin target", () => {
    for (const [deceptive, latin] of Object.entries(CONFUSABLES)) {
      expect(deceptive).not.toBe(latin);
    }
  });
});

describe("invisible and bidi characters", () => {
  it("detects zero-width characters", () => {
    expect(hasInvisibleChars("hello​world")).toBe(true);
    expect(hasInvisibleChars("hello world")).toBe(false);
  });

  it("detects bidi override characters", () => {
    expect(hasInvisibleChars("hello‮world")).toBe(true);
  });

  it("strips invisible characters without touching visible text", () => {
    expect(stripInvisible("A​B‌C﻿")).toBe("ABC");
  });

  it("round-trips: stripped text has no detectable invisible characters", () => {
    const dirty = "T​S‌L‍A⁠ surges";
    expect(hasInvisibleChars(stripInvisible(dirty))).toBe(false);
  });
});
