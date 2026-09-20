import { describe, it, expect } from "vitest";
import { translations, t, LANGS, LANG_KEY, LANG_CHOSEN_KEY } from "../src/i18n.js";

describe("i18n — language table", () => {
  it("exposes exactly the supported languages", () => {
    expect(LANGS).toEqual(["en", "zh"]);
    expect(LANG_KEY).toBe("lang");
    expect(LANG_CHOSEN_KEY).toBe("langChosen");
  });

  it("has a translation table for every supported language", () => {
    for (const lang of LANGS) {
      expect(translations[lang], lang).toBeTypeOf("object");
    }
  });

  it("keeps zh key set aligned with en (no silently dropped key)", () => {
    const en = Object.keys(translations.en).sort();
    const zh = Object.keys(translations.zh).sort();
    expect(zh).toEqual(en);
  });

  it("keeps nested weatherCodes aligned", () => {
    expect(Object.keys(translations.zh.weatherCodes).sort()).toEqual(
      Object.keys(translations.en.weatherCodes).sort()
    );
  });

  it("keeps funFactsItems the same length in both languages", () => {
    expect(translations.zh.funFactsItems).toHaveLength(translations.en.funFactsItems.length);
  });
});

describe("t()", () => {
  it("resolves a key in the requested language", () => {
    expect(t("blog", "zh")).toBe(translations.zh.blog);
    expect(t("blog", "en")).toBe(translations.en.blog);
  });

  it("falls back to English for an unknown language", () => {
    expect(t("blog", "fr")).toBe(translations.en.blog);
  });

  it("returns undefined for a key absent from both languages", () => {
    expect(t("__definitely_missing__", "zh")).toBe(undefined);
  });

  it("defaults to English when no language is given", () => {
    expect(t("blog")).toBe(translations.en.blog);
  });
});
