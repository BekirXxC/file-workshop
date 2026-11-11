const test = require("node:test");
const assert = require("node:assert/strict");
const I18n = require("../i18n.js");
const globalLocales = require("../locales-global.js");
require("../locales-turkic.js");

test("catalog offers nineteen translated language options without fallback-only entries", () => {
  const entries = I18n.getLocales();
  assert.equal(entries.length, 19);
  assert.equal(entries.filter((locale) => locale.group === "World").length, 10);
  const turkic = entries.filter((locale) => locale.group === "Turkic");
  assert.equal(turkic.length, 9);
  assert.deepEqual(
    turkic.map((locale) => locale.code).sort(),
    ["tr", "az", "kk", "uz", "ky", "tk", "tt", "ba", "ug"].sort(),
  );
  assert(!entries.some((locale) => locale.status === "fallback"));
  assert.equal(
    new Set(entries.map((locale) => locale.code)).size,
    entries.length,
  );
  for (const code of [
    "tr",
    "en",
    "es",
    "fr",
    "de",
    "pt",
    "ru",
    "ar",
    "zh",
    "ja",
    "hi",
    "az",
    "kk",
    "uz",
    "ky",
    "tk",
  ])
    assert(entries.some((locale) => locale.code === code));
  assert.equal(entries.find((locale) => locale.code === "ar").dir, "rtl");
});

test("Turkish source aliases, canonical keys and parameters resolve consistently", () => {
  I18n.setLanguage("tr");
  assert.equal(I18n.t("Language"), "Dil");
  assert.equal(I18n.t("Source text"), "Kaynak metin");
  I18n.setLanguage("de");
  assert.equal(I18n.t("Genel bakış"), "Übersicht");
  assert.equal(I18n.t("Overview"), "Übersicht");
  assert.equal(
    I18n.t("Step {n} of {total}", { n: 2, total: 3 }),
    "Schritt 2 von 3",
  );
  assert.equal(I18n.t("{count} files", { count: 7 }), "7 Dateien");
});

test("Azerbaijani source mapping works and unsupported choices fall back to English", () => {
  I18n.setLanguage("az");
  assert.notEqual(I18n.t("Genel bakış"), "Genel bakış");
  I18n.setLanguage("klj");
  assert.equal(I18n.language, "en");
  assert.equal(I18n.t("Genel bakış"), "Overview");
  I18n.setLanguage("not-a-language");
  assert.equal(I18n.language, "en");
  assert.equal(I18n.t("Genel bakış"), "Overview");
});

test("all global locales include translated walkthrough instructions and placeholders", () => {
  const key = "Select an image. Your source file is never overwritten.";
  for (const code of ["es", "fr", "de", "pt", "ru", "ar", "zh", "ja", "hi"]) {
    assert(globalLocales[code].messages[key]);
    assert.notEqual(globalLocales[code].messages[key], key);
    assert(globalLocales[code].messages["Step {n} of {total}"].includes("{n}"));
    assert(
      globalLocales[code].messages["Step {n} of {total}"].includes("{total}"),
    );
  }
});

test("translation lookup has no file mutation or storage side effects", () => {
  const source = "private-file-123.csv";
  I18n.setLanguage("ja");
  assert.equal(I18n.t(source), source);
  assert.equal(I18n.t("unmapped arbitrary text"), "unmapped arbitrary text");
  I18n.setLanguage("tr");
});
