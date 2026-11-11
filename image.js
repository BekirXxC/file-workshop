/* Native image processing. No requests, telemetry, models or external dependencies.
 * ImageTools.load(file) -> decoded image (call close when finished).
 * ImageTools.convert(decoded, options) -> {blob,width,height,quality,mime,metTarget,warning}.
 * Output is redrawn from pixels; original source metadata is not copied.
 */
(function (root) {
  "use strict";
  const MAX_BYTES = 50 * 1024 * 1024;
  const MAX_PIXELS = 32 * 1000 * 1000;
  const MAX_SIDE = 16384;
  const FORMATS = ["image/jpeg", "image/png", "image/webp"];

  function fail(message) {
    throw new Error(message);
  }
  function validDimensions(width, height) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > MAX_SIDE ||
      height > MAX_SIDE ||
      width * height > MAX_PIXELS
    ) {
      fail(
        "Görsel çok büyük. En fazla 32 megapiksel ve kenar başına 16.384 piksel desteklenir.",
      );
    }
  }
  function isRaster(bytes) {
    const match = (at, values) => values.every((v, i) => bytes[at + i] === v);
    const ascii = (at, text) =>
      match(
        at,
        Array.from(text, (c) => c.charCodeAt(0)),
      );
    if (match(0, [0xff, 0xd8, 0xff])) return "jpeg";
    if (match(0, [137, 80, 78, 71, 13, 10, 26, 10])) return "png";
    if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "gif";
    if (ascii(0, "BM")) return "bmp";
    if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
    if (ascii(4, "ftyp")) {
      // Major and compatible brands must contain an AVIF brand.
      for (let i = 8; i + 3 < Math.min(bytes.length, 128); i += 4) {
        if (ascii(i, "avif") || ascii(i, "avis")) return "avif";
      }
    }
    return null;
  }
  function preflight(bytes, kind) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // Reject common enormous inputs before allocating decoded pixel surfaces.
    if (kind === "png" && bytes.length >= 24)
      validDimensions(view.getUint32(16), view.getUint32(20));
    if (kind === "gif" && bytes.length >= 10)
      validDimensions(view.getUint16(6, true), view.getUint16(8, true));
    if (kind === "bmp" && bytes.length >= 26) {
      const dib = view.getUint32(14, true);
      if (dib >= 40)
        validDimensions(
          Math.abs(view.getInt32(18, true)),
          Math.abs(view.getInt32(22, true)),
        );
    }
    if (kind === "jpeg") {
      let p = 2;
      while (p + 8 < bytes.length) {
        if (bytes[p++] !== 0xff) break;
        while (bytes[p] === 0xff) p++;
        const marker = bytes[p++];
        if (marker === 0xd9 || marker === 0xda) break;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (p + 2 > bytes.length) break;
        const length = view.getUint16(p);
        if (length < 2 || p + length > bytes.length) break;
        if (
          [
            0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
            0xce, 0xcf,
          ].includes(marker)
        ) {
          validDimensions(view.getUint16(p + 5), view.getUint16(p + 3));
          break;
        }
        p += length;
      }
    }
  }

  async function load(file) {
    if (!file || typeof file.slice !== "function")
      fail("Önce bir görsel dosyası seçin.");
    if (file.size > MAX_BYTES) fail("Görsel dönüştürmede dosya sınırı 50 MB.");
    if (/\.svgz?$/i.test(file.name || "") || /svg/i.test(file.type || "")) {
      fail("SVG bu araçta açılmaz. PNG, JPEG, WebP, GIF, BMP veya AVIF seçin.");
    }
    const bytes = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
    const kind = isRaster(bytes);
    if (!kind)
      fail(
        "Desteklenen bir görsel bulunamadı. PNG, JPEG, WebP, GIF, BMP veya AVIF seçin.",
      );
    preflight(bytes, kind);
    let source;
    if (typeof createImageBitmap === "function") {
      try {
        source = await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
      } catch (_) {
        /* Older implementations can fall back to an image element. */
      }
    }
    if (!source) {
      const url = URL.createObjectURL(file);
      try {
        source = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () =>
            reject(
              new Error(
                "Görsel çözülemedi. Dosya bozuk olabilir veya bu tarayıcı biçimi desteklemiyor.",
              ),
            );
          image.src = url;
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;
    try {
      validDimensions(width, height);
    } catch (error) {
      if (typeof source.close === "function") source.close();
      throw error;
    }
    let closed = false;
    return {
      source,
      width,
      height,
      kind,
      close() {
        if (closed) return;
        closed = true;
        if (typeof source.close === "function") source.close();
        else source.src = "";
      },
    };
  }

  function dimension(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > MAX_SIDE)
      fail("Boyutlar 1–16.384 piksel arasında olmalı.");
    return Math.floor(n);
  }
  function geometry(width, height, options = {}) {
    validDimensions(width, height);
    const rotation = Number(options.rotation || 0);
    if (![0, 90, 180, 270].includes(rotation))
      fail("Desteklenmeyen döndürme açısı.");
    const rotated = rotation === 90 || rotation === 270;
    const naturalWidth = rotated ? height : width;
    const naturalHeight = rotated ? width : height;
    const maxWidth = dimension(options.maxWidth, naturalWidth);
    const maxHeight = dimension(options.maxHeight, naturalHeight);
    const scale = Math.min(
      1,
      maxWidth / naturalWidth,
      maxHeight / naturalHeight,
    );
    const outWidth = Math.max(1, Math.round(naturalWidth * scale));
    const outHeight = Math.max(1, Math.round(naturalHeight * scale));
    validDimensions(outWidth, outHeight);
    return {
      width: outWidth,
      height: outHeight,
      rotation,
      drawWidth: rotated ? outHeight : outWidth,
      drawHeight: rotated ? outWidth : outHeight,
    };
  }
  function encode(canvas, format, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(
                new Error(
                  "Görsel dışa aktarılamadı. Daha küçük boyut deneyin.",
                ),
              ),
        format,
        quality,
      );
    });
  }
  async function convert(loaded, options = {}) {
    if (!loaded || !loaded.source) fail("Önce bir görsel dosyası seçin.");
    const format = options.format || "image/jpeg";
    if (!FORMATS.includes(format))
      fail("Çıkış biçimi JPEG, PNG veya WebP olmalı.");
    const requestedQuality =
      options.quality == null ? 0.86 : Number(options.quality);
    if (
      !Number.isFinite(requestedQuality) ||
      requestedQuality < 0.1 ||
      requestedQuality > 1
    )
      fail("Kalite 0,1–1 arasında olmalı.");
    let target = null;
    if (
      options.targetKB !== undefined &&
      options.targetKB !== null &&
      options.targetKB !== ""
    ) {
      const n = Number(options.targetKB);
      if (!Number.isFinite(n) || n <= 0 || n > 100000)
        fail("Hedef boyut 0–100.000 KB arasında olmalı.");
      target = n * 1024;
    }
    const g = geometry(loaded.width, loaded.height, options);
    const canvas = document.createElement("canvas");
    canvas.width = g.width;
    canvas.height = g.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) fail("Tarayıcının görsel işleme alanı açılamadı.");
    if (format === "image/jpeg") {
      ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(options.background || "")
        ? options.background
        : "#ffffff";
      ctx.fillRect(0, 0, g.width, g.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(g.width / 2, g.height / 2);
    // Flip in final output coordinates, before the source rotation transform.
    if (options.flip) ctx.scale(-1, 1);
    ctx.rotate((g.rotation * Math.PI) / 180);
    ctx.drawImage(
      loaded.source,
      -g.drawWidth / 2,
      -g.drawHeight / 2,
      g.drawWidth,
      g.drawHeight,
    );
    let quality = requestedQuality;
    let blob;
    const warnings = [];
    try {
      blob = await encode(canvas, format, quality);
      if (blob.type !== format)
        warnings.push(
          "Tarayıcı seçilen biçimi desteklemedi; çıktı " +
            (blob.type || "PNG") +
            " olarak üretildi.",
        );
      if (
        target !== null &&
        blob.size > target &&
        format !== "image/png" &&
        blob.type === format
      ) {
        let low = 0.1,
          high = quality;
        const minimum = await encode(canvas, format, low);
        if (minimum.size > target) {
          blob = minimum;
          quality = low;
        } else {
          let best = minimum,
            bestQuality = low;
          // Keep the highest tested quality that actually satisfies the limit.
          for (let i = 0; i < 8; i++) {
            const mid = (low + high) / 2;
            const candidate = await encode(canvas, format, mid);
            if (candidate.size <= target) {
              best = candidate;
              bestQuality = mid;
              low = mid;
            } else high = mid;
          }
          blob = best;
          quality = bestQuality;
        }
      }
      if (target !== null && blob.size > target)
        warnings.push(
          "Hedef boyuta ulaşılamadı. Piksel ölçülerini küçültün veya JPEG / WebP deneyin.",
        );
      if (loaded.kind === "gif")
        warnings.push("GIF hareketi korunmaz; tek bir kare dışa aktarılır.");
      return {
        blob,
        width: g.width,
        height: g.height,
        quality,
        mime: blob.type || "image/png",
        metTarget: target === null ? null : blob.size <= target,
        warning: warnings.join(" ") || null,
      };
    } finally {
      // Release the large backing pixel buffer after every conversion.
      canvas.width = 1;
      canvas.height = 1;
    }
  }
  function suggestedName(name, mime) {
    const ext =
      { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mime] ||
      "png";
    const base =
      String(name || "gorsel")
        .replace(/^.*[\\/]/, "")
        .replace(/\.[^.]+$/, "")
        .replace(/[\u0000-\u001f<>:"|?*]/g, "_")
        .slice(0, 150) || "gorsel";
    return base + "-duzenlendi." + ext;
  }
  const api = {
    load,
    convert,
    geometry,
    suggestedName,
    limits: { maxBytes: MAX_BYTES, maxPixels: MAX_PIXELS, maxSide: MAX_SIDE },
  };
  root.ImageTools = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
