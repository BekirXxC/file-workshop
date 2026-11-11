const test = require("node:test");
const assert = require("node:assert/strict");
const { transform, renameFiles } = require("../processing.js");

test("JSON formatting preserves numeric precision, negative zero, duplicate keys and order", () => {
  const input =
    '{"z":9007199254740993,"n":-0,"f":0.12345678901234567890,"n":1e400,"escaped":"a\\\"b"}';
  const pretty = transform(input, "json").text;
  assert.match(pretty, /9007199254740993/);
  assert.match(pretty, /0\.12345678901234567890/);
  assert.equal(transform(pretty, "minify").text, input);
});

test("line tools preserve order, normalize line endings and remove exact repeats", () => {
  assert.equal(transform(" a \r\n b\t", "trim").text, "a\nb");
  assert.equal(transform("a\n \n\tb\n", "empty").text, "a\n\tb");
  assert.equal(transform("a\nb\na\n a", "dedupe").text, "a\nb\n a");
  assert.equal(transform("a \t  b\n  c", "spaces").text, "a b\n c");
  assert.equal(transform("a\rb\r\nc", "newline").text, "a\nb\nc");
  assert.equal(
    transform("ışık\niğne\narmut", "sort").text,
    "armut\nışık\niğne",
  );
});

test("JSON tools validate and do not echo invalid private source into errors", () => {
  assert.equal(transform('{"x":1}', "json").text, '{\n  "x": 1\n}');
  assert.equal(transform('{ "x": 1 }', "minify").text, '{"x":1}');
  assert.throws(
    () => transform("{private_marker}", "json"),
    (error) => {
      assert.match(error.message, /JSON/);
      assert.doesNotMatch(error.message, /private_marker/);
      return true;
    },
  );
  assert.throws(
    () => transform("x".repeat(5 * 1024 * 1024 + 1), "trim"),
    /5 MB/,
  );
});

test("renaming preserves extensions and uses literal replacement", () => {
  assert.deepEqual(
    renameFiles(["hello.TXT"], {
      prefix: "new-",
      find: "ell",
      replace: "ALL",
      case: "upper",
    }),
    ["NEW-HALLO.TXT"],
  );
  assert.deepEqual(renameFiles(["$x.txt"], { find: "$x", replace: "$&" }), [
    "$&.txt",
  ]);
  assert.deepEqual(
    renameFiles(["report.txt"], { find: "txt", replace: "bad" }),
    ["report.txt"],
  );
  assert.deepEqual(renameFiles([".env"]), [".env"]);
});

test("renaming handles Turkish letters, unsafe paths and duplicate names", () => {
  assert.deepEqual(
    renameFiles(["Şişe Fotoğrafı.JPG"], {
      ascii: true,
      slug: true,
      number: true,
    }),
    ["001-sise-fotografi.JPG"],
  );
  assert.deepEqual(renameFiles(["IŞIK.txt"], { ascii: true, slug: true }), [
    "isik.txt",
  ]);
  assert.deepEqual(renameFiles(["a.txt", "A.txt", "a (2).txt"]), [
    "a.txt",
    "A (2).txt",
    "a (2) (2).txt",
  ]);
  assert.deepEqual(
    renameFiles(["../CON.txt", "folder/NUL.jpeg", "...", "a?.jpg"]),
    ["_CON.txt", "_NUL.jpeg", "dosya", "a_.jpg"],
  );
  const names = renameFiles([
    "ş".repeat(200) + ".jpg",
    "Ş".repeat(200) + ".jpg",
  ]);
  names.forEach((name) => assert(new TextEncoder().encode(name).length <= 180));
  assert.throws(() => renameFiles([null]), /metin listesi/);
});
