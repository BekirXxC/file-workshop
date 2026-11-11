/* Dosya Atölyesi — local file utilities. MIT License. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FileCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const encoder = new TextEncoder();
  const textDecoder = new TextDecoder("utf-8");

  function extension(name) {
    const match = String(name || "").match(/\.([^./\\]+)$/);
    return match ? match[1].toLowerCase() : "";
  }

  function formatBytes(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return "—";
    if (n < 1024) return n + " B";
    const units = ["KB", "MB", "GB", "TB"];
    let amount = n / 1024,
      i = 0;
    while (amount >= 1024 && i < units.length - 1) {
      amount /= 1024;
      i++;
    }
    return (
      amount.toLocaleString("tr-TR", {
        maximumFractionDigits: amount >= 100 ? 0 : 1,
      }) +
      " " +
      units[i]
    );
  }

  function result(label, mime, ext, confidence, more) {
    return Object.assign(
      { label, mime, ext, confidence, isText: false, encoding: null },
      more,
    );
  }

  function sniff(input, name) {
    const b = input instanceof Uint8Array ? input : new Uint8Array(input);
    const starts = (a, offset = 0) => a.every((v, i) => b[offset + i] === v);
    const ascii = (s, offset = 0) =>
      starts(
        Array.from(s, (c) => c.charCodeAt(0)),
        offset,
      );
    if (!b.length)
      return result("Boş dosya", "application/octet-stream", null, "unknown");
    if (starts([0xff, 0xd8, 0xff]))
      return result("JPEG görsel", "image/jpeg", "jpg", "signature");
    if (starts([137, 80, 78, 71, 13, 10, 26, 10]))
      return result("PNG görsel", "image/png", "png", "signature");
    if (ascii("GIF87a") || ascii("GIF89a"))
      return result("GIF görsel", "image/gif", "gif", "signature");
    if (ascii("RIFF") && ascii("WEBP", 8))
      return result("WebP görsel", "image/webp", "webp", "signature");
    if (ascii("%PDF-"))
      return result("PDF belge", "application/pdf", "pdf", "signature");
    if (
      starts([80, 75, 3, 4]) ||
      starts([80, 75, 5, 6]) ||
      starts([80, 75, 7, 8])
    ) {
      // DOCX / XLSX / PPTX / ODT are ZIP containers. Header alone cannot distinguish them.
      return result(
        "ZIP kapsayıcı / ZIP tabanlı belge",
        "application/zip",
        "zip",
        "signature",
        { container: true },
      );
    }
    if (starts([31, 139]))
      return result("GZIP arşivi", "application/gzip", "gz", "signature");
    if (starts([82, 97, 114, 33, 26, 7]))
      return result("RAR arşivi", "application/vnd.rar", "rar", "signature");
    if (starts([55, 122, 188, 175, 39, 28]))
      return result(
        "7-Zip arşivi",
        "application/x-7z-compressed",
        "7z",
        "signature",
      );
    if (ascii("BM"))
      return result("BMP görsel", "image/bmp", "bmp", "signature");
    if (starts([73, 73, 42, 0]) || starts([77, 77, 0, 42]))
      return result("TIFF görsel", "image/tiff", "tif", "signature");
    if (ascii("RIFF") && ascii("WAVE", 8))
      return result("WAV ses", "audio/wav", "wav", "signature");
    if (
      ascii("ID3") ||
      (b.length >= 3 &&
        b[0] === 255 &&
        (b[1] & 0xe0) === 0xe0 &&
        (b[1] & 6) === 2 &&
        (b[1] & 24) !== 8 &&
        (b[2] & 12) !== 12)
    )
      return result("MP3 / MPEG ses", "audio/mpeg", "mp3", "signature");
    if (ascii("ftyp", 4)) {
      const brand = textDecoder.decode(b.slice(8, 12));
      if (/^(avif|avis)$/.test(brand))
        return result("AVIF görsel", "image/avif", "avif", "signature");
      if (/^(heic|heix|hevc|hevx|mif1|msf1)$/.test(brand))
        return result("HEIF / HEIC görsel", "image/heic", "heic", "signature");
      return result(
        "MP4 / ISO medya kapsayıcısı",
        "video/mp4",
        "mp4",
        "signature",
      );
    }
    if (ascii("MZ"))
      return result(
        "Windows çalıştırılabilir dosyası",
        "application/vnd.microsoft.portable-executable",
        "exe",
        "signature",
      );
    if (starts([127, 69, 76, 70]))
      return result(
        "ELF çalıştırılabilir dosyası",
        "application/x-elf",
        "elf",
        "signature",
      );
    if (ascii("SQLite format 3\0"))
      return result(
        "SQLite veritabanı",
        "application/vnd.sqlite3",
        "sqlite",
        "signature",
      );
    if (starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
      return result(
        "OLE belge kapsayıcısı (eski Office vb.)",
        "application/x-ole-storage",
        null,
        "signature",
        { container: true },
      );

    let encoding = "utf-8",
      text = "",
      bom = false;
    try {
      if (starts([255, 254])) {
        encoding = "utf-16le";
        bom = true;
      } else if (starts([254, 255])) {
        encoding = "utf-16be";
        bom = true;
      } else if (starts([239, 187, 191])) bom = true;
      // Samples can cut through a UTF-8 character; stream mode excludes an incomplete tail.
      text = new TextDecoder(encoding, { fatal: true }).decode(b, {
        stream: true,
      });
    } catch (_) {
      // Legacy encodings cannot be confidently identified without user choice.
      return result(
        "Türü belirlenemedi",
        "application/octet-stream",
        null,
        "unknown",
      );
    }
    const controls = Array.from(text).filter((c) =>
      /[\u0000-\u0008\u000b\u000e-\u001f]/.test(c),
    ).length;
    if (controls > Math.max(0, text.length * 0.005))
      return result(
        "İkili dosya · türü belirlenemedi",
        "application/octet-stream",
        null,
        "unknown",
      );
    const trimmed = text.replace(/^\uFEFF/, "").trim();
    const more = { isText: true, encoding, bom };
    if (/^(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(trimmed))
      return result(
        "SVG görsel (metin)",
        "image/svg+xml",
        "svg",
        "heuristic",
        more,
      );
    if (/^(?:<!doctype\s+html|<html(?:\s|>))/i.test(trimmed))
      return result("HTML belge", "text/html", "html", "heuristic", more);
    if (/^<\?xml\b/i.test(trimmed))
      return result("XML belge", "application/xml", "xml", "heuristic", more);
    if (/^[\[{]/.test(trimmed)) {
      try {
        JSON.parse(trimmed);
        return result(
          "JSON veri",
          "application/json",
          "json",
          "heuristic",
          more,
        );
      } catch (_) {
        /* Partial sample or ordinary text. */
      }
    }
    const lines = text
      .split(/\r\n|\n|\r/)
      .filter((l) => l.trim())
      .slice(0, 8);
    if (lines.length >= 2) {
      const delimiter = detectDelimiter(text);
      const parsed = parseCSV(text, delimiter).rows.slice(0, 8);
      if (
        parsed.length >= 2 &&
        parsed[0].length > 1 &&
        parsed.every((row) => row.length === parsed[0].length)
      )
        return result(
          delimiter === "\t" ? "TSV tablosu (tahmin)" : "CSV tablosu (tahmin)",
          "text/csv",
          delimiter === "\t" ? "tsv" : "csv",
          "heuristic",
          more,
        );
    }
    return result("Düz metin", "text/plain", "txt", "heuristic", more);
  }

  async function inspectFile(file) {
    if (!file || typeof file.slice !== "function")
      throw new TypeError("Bir dosya seçin.");
    const bytes = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    const detected = sniff(bytes, file.name);
    const ext = extension(file.name);
    const aliases = {
      jpg: ["jpg", "jpeg", "jpe", "jfif"],
      tif: ["tif", "tiff"],
      html: ["html", "htm"],
      gz: ["gz", "gzip", "tgz"],
      heic: ["heic", "heif"],
      sqlite: ["sqlite", "sqlite3", "db"],
      elf: ["elf", "so"],
      exe: ["exe", "dll", "sys", "scr", "ocx", "cpl"],
      mp4: ["mp4", "m4v", "mov", "m4a", "m4b", "3gp", "3g2"],
      zip: [
        "zip",
        "docx",
        "xlsx",
        "pptx",
        "odt",
        "ods",
        "odp",
        "epub",
        "jar",
        "apk",
        "xpi",
        "vsix",
        "kmz",
        "ott",
        "dotx",
        "xltx",
        "potx",
        "xlsm",
        "docm",
        "pptm",
      ],
    };
    let extensionMismatch = null;
    // Strong signatures permit a mismatch finding. Plain text and inferred formats do not.
    if (detected.confidence === "signature" && detected.ext)
      extensionMismatch = !(aliases[detected.ext] || [detected.ext]).includes(
        ext,
      );
    const warnings = [];
    if (!file.size)
      warnings.push("Dosya boş; içeriği onarılamaz veya türü doğrulanamaz.");
    if (extensionMismatch)
      warnings.push(
        "İçerik imzası ile dosya uzantısı uyuşmuyor. Uzantı değiştirmek içeriği dönüştürmez.",
      );
    if (detected.container)
      warnings.push(
        "Kapsayıcı imzası tanındı; içindeki dosyaların sağlamlığı bu incelemede doğrulanmaz.",
      );
    if (detected.confidence === "heuristic")
      warnings.push(
        "Metin türü içerikten tahmin edildi; kesin biçim doğrulaması değildir.",
      );
    if (detected.confidence === "unknown")
      warnings.push(
        "Dosya türü güvenilir biçimde belirlenemedi. Bu durum tek başına dosyanın bozuk olduğunu göstermez.",
      );
    if (detected.ext === "exe" || detected.ext === "elf")
      warnings.push(
        "Çalıştırılabilir içerik bulundu. Bu uygulama dosyayı çalıştırmaz.",
      );
    const sampleText = detected.isText
      ? new TextDecoder(detected.encoding).decode(bytes.slice(0, 8192), {
          stream: true,
        })
      : null;
    return {
      name: String(file.name || "dosya"),
      size: file.size,
      extension: ext,
      detected,
      extensionMismatch,
      isText: detected.isText,
      encoding: detected.encoding,
      sampleText,
      hex: Array.from(bytes.slice(0, 32), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join(" "),
      warnings,
    };
  }

  async function hashFile(file) {
    if (!globalThis.crypto || !globalThis.crypto.subtle)
      throw new Error(
        "SHA-256 bu tarayıcı bağlamında kullanılamıyor. HTTPS veya localhost üzerinden açın.",
      );
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      await file.arrayBuffer(),
    );
    return Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }

  function validateDelimiter(delimiter) {
    if (
      typeof delimiter !== "string" ||
      delimiter.length !== 1 ||
      /["\r\n\u0000]/.test(delimiter)
    )
      throw new Error("Ayırıcı tek karakter olmalıdır.");
  }

  function parseCSV(input, delimiter = ",") {
    validateDelimiter(delimiter);
    const text = String(input).replace(/^\uFEFF/, "");
    if (!text.length) return { rows: [], warnings: [] };
    const rows = [],
      warnings = [];
    let row = [],
      field = "",
      quoted = false,
      closed = false,
      line = 1;
    function warn(message) {
      if (warnings.length < 20 && !warnings.includes(message))
        warnings.push(message);
    }
    function pushField() {
      row.push(field);
      field = "";
      closed = false;
    }
    function pushRow() {
      pushField();
      rows.push(row);
      row = [];
    }
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = false;
            closed = true;
          }
        } else {
          field += c;
          if (c === "\n") line++;
        }
      } else if (c === delimiter) pushField();
      else if (c === "\r" || c === "\n") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        pushRow();
        line++;
      } else if (c === '"' && field.length === 0 && !closed) quoted = true;
      else {
        if (c === '"')
          warn(
            line +
              ". satırda alan ortasında tırnak var; özgün karakter korundu.",
          );
        if (closed && !/\s/.test(c))
          warn(
            line +
              ". satırda kapanan tırnaktan sonra beklenmeyen karakter var.",
          );
        field += c;
      }
    }
    if (quoted)
      warn(
        "Dosya kapanmamış bir tırnaklı alanla bitiyor; tabloyu indirmeden önce kontrol edin.",
      );
    if (field.length || row.length || !/[\r\n]$/.test(text)) pushRow();
    if (rows.length > 1) {
      const expected = rows[0].length;
      const inconsistent = rows.filter((r) => r.length !== expected).length;
      if (inconsistent)
        warn(inconsistent + " satırın sütun sayısı ilk satırdan farklı.");
    }
    return { rows, warnings };
  }

  function detectDelimiter(text) {
    let best = ",",
      bestScore = -Infinity;
    for (const delimiter of [",", ";", "\t", "|"]) {
      const parsed = parseCSV(String(text).slice(0, 65536), delimiter);
      const rows = parsed.rows
        .filter((r) => r.some((c) => c.trim()))
        .slice(0, 30);
      if (!rows.length) continue;
      const counts = new Map();
      for (const r of rows)
        counts.set(r.length, (counts.get(r.length) || 0) + 1);
      const [columns, matching] = Array.from(counts).sort(
        (a, b) => b[1] - a[1] || b[0] - a[0],
      )[0];
      const score =
        columns > 1
          ? (matching / rows.length) * 100 +
            Math.min(columns, 20) -
            parsed.warnings.length * 2
          : 0;
      if (score > bestScore) {
        bestScore = score;
        best = delimiter;
      }
    }
    return best;
  }

  function stringifyCSV(rows, options = {}) {
    const delimiter = options.delimiter === undefined ? ";" : options.delimiter;
    const bom = options.bom !== false,
      safe = options.safe !== false;
    validateDelimiter(delimiter);
    if (!Array.isArray(rows))
      throw new TypeError("Tablo satırları bulunamadı.");
    return (
      (bom ? "\uFEFF" : "") +
      rows
        .map((row) => {
          if (!Array.isArray(row))
            throw new TypeError("Her satır bir dizi olmalıdır.");
          return row
            .map((value) => {
              let cell = value == null ? "" : String(value);
              // Spreadsheet applications can execute formulas in imported CSV cells.
              if (safe && /^[\s\uFEFF]*[=+\-@]/.test(cell)) cell = "'" + cell;
              if (
                cell.includes(delimiter) ||
                /["\r\n]/.test(cell) ||
                /^\s|\s$/.test(cell)
              )
                return '"' + cell.replace(/"/g, '""') + '"';
              return cell;
            })
            .join(delimiter);
        })
        .join("\r\n")
    );
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++)
      crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function cleanZipName(value) {
    const name = String(value || "").replace(/\\/g, "/");
    if (
      !name ||
      /[\u0000-\u001f\u007f]/.test(name) ||
      name.startsWith("/") ||
      /^[a-z]:/i.test(name) ||
      name.split("/").some((p) => p === ".." || p === "." || !p) ||
      name.endsWith("/")
    )
      throw new Error("Arşivde geçersiz dosya adı var.");
    return name;
  }

  async function createZip(entries) {
    if (!Array.isArray(entries) || entries.length > 65535)
      throw new Error("Arşiv en fazla 65.535 dosya içerebilir.");
    const localParts = [],
      centralParts = [],
      names = new Set();
    let offset = 0,
      centralSize = 0;
    for (const entry of entries) {
      const name = cleanZipName(entry.name);
      // Case-insensitive duplicates are ambiguous on common desktop file systems.
      if (names.has(name.toLowerCase()))
        throw new Error("Arşivde aynı adı taşıyan dosyalar var: " + name);
      names.add(name.toLowerCase());
      const filename = encoder.encode(name);
      if (filename.length > 65535)
        throw new Error("Dosya adı arşiv biçimi için çok uzun.");
      let bytes;
      if (typeof entry.data === "string") bytes = encoder.encode(entry.data);
      else if (entry.data instanceof Uint8Array) bytes = entry.data;
      else if (entry.data instanceof ArrayBuffer)
        bytes = new Uint8Array(entry.data);
      else if (entry.data && typeof entry.data.arrayBuffer === "function")
        bytes = new Uint8Array(await entry.data.arrayBuffer());
      else throw new TypeError("Arşiv için desteklenmeyen dosya içeriği.");
      if (
        bytes.length > 0xffffffff ||
        offset + bytes.length + filename.length + 30 > 0xffffffff
      )
        throw new Error("Arşiv ZIP32 boyut sınırını aşıyor.");
      const crc = crc32(bytes);
      const local = new Uint8Array(30),
        lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      // Fixed 1980-01-01 timestamp; do not embed user or file timestamps.
      lv.setUint16(12, 33, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, bytes.length, true);
      lv.setUint32(22, bytes.length, true);
      lv.setUint16(26, filename.length, true);
      localParts.push(local, filename, bytes);
      const central = new Uint8Array(46),
        cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(14, 33, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, bytes.length, true);
      cv.setUint32(24, bytes.length, true);
      cv.setUint16(28, filename.length, true);
      cv.setUint32(42, offset, true);
      centralParts.push(central, filename);
      offset += local.length + filename.length + bytes.length;
      centralSize += central.length + filename.length;
    }
    if (centralSize + offset + 22 > 0xffffffff)
      throw new Error("Arşiv ZIP32 boyut sınırını aşıyor.");
    const end = new Uint8Array(22),
      ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    // STORE mode is universally readable; contents are packaged, not compressed.
    return new Blob([...localParts, ...centralParts, end], {
      type: "application/zip",
    });
  }

  return {
    extension,
    formatBytes,
    sniff,
    inspectFile,
    hashFile,
    parseCSV,
    detectDelimiter,
    stringifyCSV,
    createZip,
    crc32,
  };
});
