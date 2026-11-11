// Run with Node.js 20+: node --test tests/*.test.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../core.js");

test("CSV supports quoted delimiters, multiline fields and escaped quotes", () => {
  const source =
    '\uFEFFname;note\r\nA;"first;second"\r\nB;"two\nlines"\r\nC;"say ""hello"""\r\n';
  assert.equal(core.detectDelimiter(source), ";");
  assert.deepEqual(core.parseCSV(source, ";").rows, [
    ["name", "note"],
    ["A", "first;second"],
    ["B", "two\nlines"],
    ["C", 'say "hello"'],
  ]);
  assert.deepEqual(core.parseCSV("", ",").rows, []);
  assert.deepEqual(core.parseCSV("a,,\n", ",").rows, [["a", "", ""]]);
  assert.ok(core.parseCSV('a,b\n"unfinished', ",").warnings.length);
});

test("CSV export round-trips text and protects formula-like cells by default", () => {
  const rows = [
    ["şehir", "a;b", "line\nbreak"],
    ["İzmir", '"quote"', ""],
  ];
  assert.deepEqual(core.parseCSV(core.stringifyCSV(rows), ";").rows, rows);
  const formulas = [["=SUM(A1:A2)", " +1", "-2", "@value", "\t=1"]];
  const protectedRows = core.parseCSV(core.stringifyCSV(formulas), ";").rows;
  assert.deepEqual(protectedRows, [formulas[0].map((value) => "'" + value)]);
  assert.deepEqual(
    core.parseCSV(core.stringifyCSV(formulas, { safe: false }), ";").rows,
    formulas,
  );
  assert.throws(() => core.parseCSV("a", ";;"));
});

test("File inspection distinguishes signature mismatches from text guesses", async () => {
  const mismatch = await core.inspectFile(
    new File(["%PDF-1.7\n"], "example.jpg"),
  );
  assert.equal(mismatch.detected.ext, "pdf");
  assert.equal(mismatch.extensionMismatch, true);
  const office = await core.inspectFile(
    new File([new Uint8Array([80, 75, 3, 4])], "example.docx"),
  );
  assert.equal(office.detected.container, true);
  assert.equal(office.extensionMismatch, false);
  assert.equal(
    (await core.inspectFile(new File(["plain text"], "example.txt")))
      .extensionMismatch,
    null,
  );
  assert.equal(
    core.sniff(new Uint8Array([255, 254, 97, 0, 98, 0])).encoding,
    "utf-16le",
  );
  assert.equal(core.sniff(new Uint8Array([0, 0, 0, 1])).isText, false);
});

test("SHA-256 and CRC32 match published reference vectors", async () => {
  assert.equal(
    await core.hashFile(new File(["abc"], "example.txt")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  assert.equal(core.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("ZIP output has UTF-8 names, neutral dates, exact content and matching CRC", async () => {
  const content = new TextEncoder().encode("Merhaba dünya");
  const blob = await core.createZip([{ name: "örnek.txt", data: content }]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const header = new DataView(bytes.buffer);
  assert.equal(header.getUint32(0, true), 0x04034b50);
  assert.equal(header.getUint16(6, true), 0x0800);
  assert.equal(header.getUint16(8, true), 0); // STORE, no compression.
  assert.equal(header.getUint16(10, true), 0); // 00:00:00.
  assert.equal(header.getUint16(12, true), 33); // 1980-01-01.
  assert.equal(header.getUint32(14, true), core.crc32(content));
  const nameLength = header.getUint16(26, true);
  assert.equal(
    new TextDecoder().decode(bytes.slice(30, 30 + nameLength)),
    "örnek.txt",
  );
  assert.deepEqual(
    bytes.slice(30 + nameLength, 30 + nameLength + content.length),
    content,
  );
  assert.equal(header.getUint32(bytes.length - 22, true), 0x06054b50);
});

test("ZIP rejects unsafe paths and case-insensitive duplicate names", async () => {
  for (const name of [
    "../outside.txt",
    "/absolute.txt",
    "C:/absolute.txt",
    "folder/../outside.txt",
    "bad\u0000.txt",
  ]) {
    await assert.rejects(core.createZip([{ name, data: "example" }]));
  }
  await assert.rejects(
    core.createZip([
      { name: "A.txt", data: "" },
      { name: "a.txt", data: "" },
    ]),
  );
});
