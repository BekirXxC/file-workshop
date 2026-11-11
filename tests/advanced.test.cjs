const test = require("node:test");
const assert = require("node:assert/strict");
const tools = require("../advanced.js");
const encode = new TextEncoder();
const corrupt = (text, encoding = "windows-1252") =>
  new TextDecoder(encoding).decode(encode.encode(text));

test("mojibake repair reverses Turkish, punctuation, emoji and double encoding", () => {
  const source = "Türkçe: İstanbul, ışık, şeker — café 😀";
  const result = tools.repairMojibake(corrupt(source));
  assert.equal(result.text, source);
  assert.equal(result.changed, true);
  assert.equal(result.passes, 1);
  assert.equal(tools.repairMojibake(corrupt(corrupt(source))).text, source);
  assert.equal(
    tools.repairMojibake(corrupt("Güneş ve ılık çay", "windows-1254")).text,
    "Güneş ve ılık çay",
  );
});

test("repair preserves unrelated multilingual text and does not guess replacement characters", () => {
  const source =
    "İstanbul ı İ ş ü café déjà vu Ελληνικά Русский العربية 日本語 👩‍💻";
  assert.equal(tools.repairMojibake(source).text, source);
  const damaged = tools.repairMojibake("Kaybolan � ve TÃ¼rkÃ§e");
  assert.equal(damaged.text, "Kaybolan � ve Türkçe");
  assert(damaged.warnings.some((w) => w.includes("�")));
});

test("mixed text repair preserves meaningful invisible characters and a recovered BOM", () => {
  const source = "TÃ¼rkÃ§e metin: gÃ¼neÅŸ.\nGörünmez: a\u200Bb";
  assert.equal(
    tools.repairMojibake(source).text,
    "Türkçe metin: güneş.\nGörünmez: a\u200Bb",
  );
  assert.equal(tools.repairMojibake("ï»¿Text").text, "\ufeffText");
  assert.equal(
    tools.repairMojibake("Ângela, Ãnimo, café, Straße, Україна").changed,
    false,
  );
  assert.equal(
    tools.repairMojibake("truncated Ã and invalid Ã(").text,
    "truncated Ã and invalid Ã(",
  );
});

test("Unicode audit makes bidi, joiners, unusual spaces and UTF-16 indices visible", () => {
  const source = "😀a\u200bb\u200cc\u200dd\u202ee\u00a0f\ufeff";
  const rows = tools.auditUnicode(source);
  assert.equal(rows.length, 6);
  assert.equal(rows[0].index, 3);
  assert.equal(rows[0].code, "U+200B");
  assert.equal(rows[3].category, "bidi");
  assert(rows[3].context.includes("⟦U+202E⟧"));
  assert(!rows[3].context.includes("\u202e"));
});

test("Unicode cleaning preserves language joiners and bidi marks by default", () => {
  const source = "می\u200cروم 👩\u200d💻\u202e x\u00a0y\u2028z";
  assert.equal(tools.cleanUnicode(source).text, source);
  const normalized = tools.cleanUnicode(source, { normalizeSpaces: true });
  assert.equal(normalized.text, "می\u200cروم 👩\u200d💻\u202e x y\nz");
  assert.equal(normalized.normalized, 2);
  const clean = tools.cleanUnicode(source, {
    removeZeroWidth: true,
    removeBidi: true,
  });
  assert.equal(clean.removed, 3);
  assert(!clean.text.includes("\u200c"));
});

test("Unicode context retains supplementary characters at both clipping boundaries", () => {
  const source = "😀" + "a".repeat(11) + "\u200b" + "b".repeat(11) + "😀";
  const context = tools.auditUnicode(source)[0].context;
  assert(context.startsWith("😀"));
  assert(context.endsWith("😀"));
  assert.equal(context.toWellFormed(), context);
});

test("table comparison aligns reordered columns and identifies actual changes", () => {
  const before = [
    ["id", "name", "stock"],
    ["a", "One", "5"],
    ["b", "Two", "8"],
    ["gone", "Old", "1"],
  ];
  const after = [
    ["stock", "id", "name"],
    ["8", "b", "Two"],
    ["7", "a", "One"],
    ["2", "new", "New"],
  ];
  const result = tools.compareTables(before, after, 0);
  assert.equal(result.unchanged, 1);
  assert.equal(result.changed.length, 1);
  assert.deepEqual(result.changed[0].changes, [
    { column: "stock", before: "5", after: "7" },
  ]);
  assert.equal(result.added[0].key, "new");
  assert.equal(result.removed[0].key, "gone");
  assert.deepEqual(result.added[0].row, ["new", "New", "2"]);
});

test("ambiguous and empty keys are excluded; schema and header errors are explicit", () => {
  const result = tools.compareTables(
    [
      ["id", "value"],
      ["x", "1"],
      ["x", "2"],
      ["", "missing"],
    ],
    [
      ["id", "value"],
      ["x", "3"],
      ["y", "4"],
    ],
    0,
  );
  assert.deepEqual(result.duplicateKeys, [
    { key: "x", beforeCount: 2, afterCount: 1 },
  ]);
  assert.equal(result.changed.length, 0);
  assert.equal(result.added.length, 1);
  assert.equal(result.removed.length, 0);
  assert(result.warnings.length >= 2);
  assert.throws(
    () => tools.compareTables([["id", "id"]], [["id"]], 0),
    /yinelenen/,
  );
  assert.throws(() => tools.compareTables([["id"]], [["other"]], 0), /Anahtar/);
  const changed = tools.compareTables(
    [
      ["id", "old"],
      ["1", "a"],
    ],
    [
      ["id", "new"],
      ["1", "b"],
    ],
    0,
  );
  assert.deepEqual(changed.changed[0].changes, [
    { column: "old", before: "a", after: null },
    { column: "new", before: null, after: "b" },
  ]);
});

test("object table rows and literal keys are supported without coercing identifiers", () => {
  const result = tools.compareTables(
    [
      { id: "001", value: 1 },
      { id: "1", value: 2 },
    ],
    [
      { value: 2, id: "1" },
      { value: 3, id: "001" },
    ],
    0,
  );
  assert.equal(result.unchanged, 1);
  assert.equal(result.changed[0].key, "001");
  assert.equal(result.changed[0].changes[0].after, "3");
});

test("key normalization is opt-in and never merges ambiguous normalized identifiers", () => {
  const left = [
    ["id", "value"],
    [" 01 ", "a"],
    ["01", "b"],
    ["   ", "skip"],
  ];
  const right = [
    ["id", "value"],
    ["01", "b"],
  ];
  const exact = tools.compareTables(left, right, 0);
  assert.equal(exact.unchanged, 1);
  assert.equal(exact.removed[0].key, " 01 ");
  assert(exact.warnings.some((w) => w.includes("anahtarı boş 1")));
  const normalized = tools.compareTables(left, right, 0, { trimKeys: true });
  assert.deepEqual(normalized.duplicateKeys, [
    { key: "01", beforeCount: 2, afterCount: 1 },
  ]);
  assert.equal(
    normalized.changed.length +
      normalized.added.length +
      normalized.removed.length +
      normalized.unchanged,
    0,
  );
});

test("object tables treat absent own properties as empty rather than reading prototypes", () => {
  const left = [{ id: "1", toString: "own" }, { id: "2" }];
  const right = [
    { id: "1", toString: "own" },
    { id: "2", toString: "" },
  ];
  assert.equal(tools.compareTables(left, right, 0).unchanged, 2);
  assert.throws(
    () => tools.compareTables([new Array(2)], [["id"]], 0),
    /boş sütun/,
  );
});

test("malformed and oversized inputs fail explicitly instead of truncating data", () => {
  assert.throws(
    () => tools.repairMojibake("a".repeat(5 * 1024 * 1024 + 1)),
    /5 MB/,
  );
  assert.throws(() => tools.auditUnicode("\u200b".repeat(20001)), /20.000/);
  assert.throws(
    () => tools.compareTables([["id"], ["1", "extra"]], [["id"]], 0),
    /fazla hücre/,
  );
  assert.throws(
    () =>
      tools.compareTables(
        [["id"], ...Array.from({ length: 50001 }, () => ["1"])],
        [["id"]],
        0,
      ),
    /50.000/,
  );
  assert.throws(
    () => tools.compareTables([["id"], ["1"]], [["id"], ["1"]], -1),
    /anahtar/,
  );
  assert.throws(
    () => tools.splitTable([["id"], ["1"]], { rowsPerFile: 1.5 }),
    /tam sayı/,
  );
});

test("splitTable repeats headers, preserves tail rows and never mutates input", () => {
  const input = [
    ["id", "text"],
    ["1", "a\nb"],
    ["2", "x"],
    ["3", "y"],
    ["4", "z"],
    ["5", "last"],
  ];
  const copy = JSON.stringify(input);
  const parts = tools.splitTable(input, { rowsPerFile: 2, header: true });
  assert.deepEqual(
    parts.map((p) => p.length),
    [3, 3, 2],
  );
  assert.deepEqual(
    parts.flatMap((p) => p.slice(1)),
    input.slice(1),
  );
  parts[0][0][0] = "changed";
  assert.equal(JSON.stringify(input), copy);
  assert.deepEqual(tools.splitTable([["only"]], { rowsPerFile: 1 }), [
    [["only"]],
  ]);
  assert.deepEqual(tools.splitTable([], { header: false }), []);
  assert.throws(() => tools.splitTable(input, { rowsPerFile: 0 }));
});
