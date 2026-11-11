const test = require("node:test");
const assert = require("node:assert/strict");
const tools = require("../image.js");

test("geometry preserves aspect ratio, rotates dimensions and never upscales", () => {
  assert.deepEqual(
    tools.geometry(4000, 3000, { maxWidth: 1000, maxHeight: 1000 }),
    { width: 1000, height: 750, rotation: 0, drawWidth: 1000, drawHeight: 750 },
  );
  assert.deepEqual(
    tools.geometry(4000, 3000, {
      rotation: 90,
      maxWidth: 1000,
      maxHeight: 1000,
    }),
    {
      width: 750,
      height: 1000,
      rotation: 90,
      drawWidth: 1000,
      drawHeight: 750,
    },
  );
  assert.equal(tools.geometry(200, 100, { maxWidth: 1000 }).width, 200);
  assert.throws(() => tools.geometry(100, 100, { maxWidth: -1 }));
  assert.throws(() => tools.geometry(10000, 10000, {}));
  assert.equal(
    tools.suggestedName("photo.jpg", "image/webp"),
    "photo-duzenlendi.webp",
  );
});

test("encoding reports actual MIME and never claims an unreachable size target", async () => {
  const previousDocument = global.document;
  let fallback = false;
  const ctx = {
    fillRect() {},
    translate() {},
    rotate() {},
    scale() {},
    drawImage() {},
  };
  global.document = {
    createElement() {
      return {
        getContext() {
          return ctx;
        },
        toBlob(callback, mime, quality) {
          callback(
            new Blob([new Uint8Array(Math.round(1000 + quality * 10000))], {
              type: fallback ? "image/png" : mime,
            }),
          );
        },
      };
    },
  };
  try {
    const source = { source: {}, width: 100, height: 100, kind: "jpeg" };
    const result = await tools.convert(source, { targetKB: 5, quality: 0.9 });
    assert.equal(result.metTarget, true);
    assert(result.blob.size <= 5120);
    assert(result.quality > 0.4 && result.quality < 0.42);
    const impossible = await tools.convert(source, {
      targetKB: 1,
      quality: 0.9,
    });
    assert.equal(impossible.metTarget, false);
    assert.match(impossible.warning, /ulaşılamadı/);
    fallback = true;
    const png = await tools.convert(source, { format: "image/webp" });
    assert.equal(png.mime, "image/png");
    assert.match(png.warning, /desteklemedi/);
    await assert.rejects(() => tools.convert(source, { quality: 2 }));
    await assert.rejects(() => tools.convert(source, { targetKB: -1 }));
  } finally {
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});

test("image loader rejects SVG before decoding or creating a URL", async () => {
  const file = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], {
    type: "image/svg+xml",
  });
  file.name = "sample.svg";
  await assert.rejects(() => tools.load(file), /SVG/);
});
