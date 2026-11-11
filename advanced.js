/* Reversible text repair, Unicode inspection, and key-based table tools. No network access. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AdvancedTools = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MAX_TEXT_BYTES = 5 * 1024 * 1024;
  const MAX_ROWS = 50000;
  const encoder = new TextEncoder();
  // Keep a decoded BOM as U+FEFF so repair never silently removes source data.
  const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

  function validText(value) {
    if (typeof value !== "string")
      throw new Error("İşlenecek metin bulunamadı.");
    if (encoder.encode(value).length > MAX_TEXT_BYTES)
      throw new Error("Metin sınırı 5 MB. Daha küçük bir metin seçin.");
    return value;
  }

  const inverseMaps = ["windows-1252", "windows-1254"].map((encoding) => {
    const decoder = new TextDecoder(encoding);
    const map = new Map();
    for (let i = 0; i < 256; i++) {
      const char = decoder.decode(Uint8Array.of(i));
      if (char.length === 1 && char !== "\ufffd") map.set(char, i);
    }
    return map;
  });

  // Decode only complete reversible UTF-8 sequences. Unrelated Unicode is untouched.
  function reverseSequences(text, inverse) {
    let output = "",
      changes = 0;
    for (let i = 0; i < text.length; ) {
      const lead = inverse.get(text[i]);
      const length =
        lead >= 0xc2 && lead <= 0xdf
          ? 2
          : lead >= 0xe0 && lead <= 0xef
            ? 3
            : lead >= 0xf0 && lead <= 0xf4
              ? 4
              : 0;
      let decoded = null;
      if (length && i + length <= text.length) {
        const bytes = [lead];
        for (let j = 1; j < length; j++) {
          const next = inverse.get(text[i + j]);
          if (next === undefined || next < 0x80 || next > 0xbf) break;
          bytes.push(next);
        }
        if (bytes.length === length) {
          try {
            decoded = utf8.decode(Uint8Array.from(bytes));
          } catch (_) {
            /* Reject overlong, surrogate and truncated sequences. */
          }
        }
      }
      if (decoded !== null) {
        output += decoded;
        i += length;
        changes++;
      } else {
        const code = text.codePointAt(i);
        output += String.fromCodePoint(code);
        i += code > 0xffff ? 2 : 1;
      }
    }
    return { text: output, changes };
  }

  function mojibakeScore(text) {
    let count = 0;
    for (const map of inverseMaps)
      count = Math.max(count, reverseSequences(text, map).changes);
    // C1 controls are a frequent side effect of decoding UTF-8 as a legacy code page.
    return (
      count * 10 +
      Array.from(text).filter((c) => /[\u0080-\u009f]/.test(c)).length
    );
  }

  function repairMojibake(input) {
    validText(input);
    let text = input,
      passes = 0;
    const warnings = [];
    if (input.includes("\ufffd"))
      warnings.push(
        "� karakteri kaybolmuş baytları gösterir; bu karakterlerden özgün metin tahmin edilmez.",
      );
    for (let pass = 0; pass < 2; pass++) {
      const originalScore = mojibakeScore(text);
      let best = { text, score: originalScore };
      for (const map of inverseMaps) {
        const candidate = reverseSequences(text, map);
        if (!candidate.changes) continue;
        const score = mojibakeScore(candidate.text);
        if (score < best.score) best = { text: candidate.text, score };
      }
      if (best.text === text) break;
      text = best.text;
      passes++;
    }
    if (text !== input)
      warnings.push(
        "Bu bir geri dönüşüm önerisidir. Benzer görünen gerçek karakter dizileriyle karışabileceği için sonucu kontrol edin.",
      );
    return { text, changed: text !== input, passes, warnings };
  }

  const unicode = new Map([
    [0x00ad, ["SOFT HYPHEN", "zero-width"]],
    [0x034f, ["COMBINING GRAPHEME JOINER", "zero-width"]],
    [0x061c, ["ARABIC LETTER MARK", "bidi"]],
    [0x180e, ["MONGOLIAN VOWEL SEPARATOR", "zero-width"]],
    [0x200b, ["ZERO WIDTH SPACE", "zero-width"]],
    [0x200c, ["ZERO WIDTH NON-JOINER", "zero-width"]],
    [0x200d, ["ZERO WIDTH JOINER", "zero-width"]],
    [0x200e, ["LEFT-TO-RIGHT MARK", "bidi"]],
    [0x200f, ["RIGHT-TO-LEFT MARK", "bidi"]],
    [0x202a, ["LEFT-TO-RIGHT EMBEDDING", "bidi"]],
    [0x202b, ["RIGHT-TO-LEFT EMBEDDING", "bidi"]],
    [0x202c, ["POP DIRECTIONAL FORMATTING", "bidi"]],
    [0x202d, ["LEFT-TO-RIGHT OVERRIDE", "bidi"]],
    [0x202e, ["RIGHT-TO-LEFT OVERRIDE", "bidi"]],
    [0x2060, ["WORD JOINER", "zero-width"]],
    [0x2066, ["LEFT-TO-RIGHT ISOLATE", "bidi"]],
    [0x2067, ["RIGHT-TO-LEFT ISOLATE", "bidi"]],
    [0x2068, ["FIRST STRONG ISOLATE", "bidi"]],
    [0x2069, ["POP DIRECTIONAL ISOLATE", "bidi"]],
    [0xfeff, ["BYTE ORDER MARK / ZERO WIDTH NO-BREAK SPACE", "zero-width"]],
    [0x00a0, ["NO-BREAK SPACE", "space"]],
    [0x1680, ["OGHAM SPACE MARK", "space"]],
    [0x2028, ["LINE SEPARATOR", "space"]],
    [0x2029, ["PARAGRAPH SEPARATOR", "space"]],
    [0x202f, ["NARROW NO-BREAK SPACE", "space"]],
    [0x205f, ["MEDIUM MATHEMATICAL SPACE", "space"]],
    [0x3000, ["IDEOGRAPHIC SPACE", "space"]],
  ]);
  function unicodeInfo(code) {
    if (unicode.has(code)) return unicode.get(code);
    if (code >= 0x2000 && code <= 0x200a) return ["UNICODE SPACE", "space"];
    if (code >= 0xe0000 && code <= 0xe007f)
      return ["UNICODE TAG CHARACTER", "zero-width"];
    if (
      (code < 0x20 && ![9, 10, 13].includes(code)) ||
      (code >= 0x7f && code <= 0x9f)
    )
      return ["CONTROL CHARACTER", "control"];
    return null;
  }
  function codeLabel(code) {
    return "U+" + code.toString(16).toUpperCase().padStart(4, "0");
  }
  function visibleContext(text) {
    return Array.from(text, (char) => {
      const code = char.codePointAt(0);
      return unicodeInfo(code) ? "⟦" + codeLabel(code) + "⟧" : char;
    }).join("");
  }
  function contextAt(text, index, size) {
    let start = Math.max(0, index - 12),
      end = Math.min(text.length, index + size + 12);
    // Context boundaries must not cut a supplementary character in half.
    if (
      start > 0 &&
      text.charCodeAt(start) >= 0xdc00 &&
      text.charCodeAt(start) <= 0xdfff &&
      text.charCodeAt(start - 1) >= 0xd800 &&
      text.charCodeAt(start - 1) <= 0xdbff
    )
      start--;
    if (
      end < text.length &&
      text.charCodeAt(end - 1) >= 0xd800 &&
      text.charCodeAt(end - 1) <= 0xdbff &&
      text.charCodeAt(end) >= 0xdc00 &&
      text.charCodeAt(end) <= 0xdfff
    )
      end++;
    return visibleContext(text.slice(start, end));
  }
  function auditUnicode(text) {
    validText(text);
    const findings = [];
    for (let i = 0; i < text.length; ) {
      const code = text.codePointAt(i),
        info = unicodeInfo(code),
        size = code > 0xffff ? 2 : 1;
      if (info) {
        if (findings.length >= 20000)
          throw new Error(
            "20.000’den fazla görünmez karakter bulundu. İnceleme için metni küçük parçalara ayırın.",
          );
        findings.push({
          index: i,
          code: codeLabel(code),
          name: info[0],
          category: info[1],
          context: contextAt(text, i, size),
        });
      }
      i += size;
    }
    return findings;
  }
  function cleanUnicode(text, options = {}) {
    validText(text);
    let output = "",
      removed = 0,
      normalized = 0;
    for (const char of text) {
      const code = char.codePointAt(0),
        info = unicodeInfo(code);
      if (
        info &&
        ((info[1] === "zero-width" && options.removeZeroWidth === true) ||
          (info[1] === "bidi" && options.removeBidi === true))
      ) {
        removed++;
        continue;
      }
      if (info && info[1] === "space" && options.normalizeSpaces === true) {
        output += [0x2028, 0x2029].includes(code) ? "\n" : " ";
        normalized++;
        continue;
      }
      output += char;
    }
    return { text: output, removed, normalized };
  }

  function scalar(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "object" || typeof value === "function")
      throw new Error("Tablo hücreleri metin veya basit değerler içermelidir.");
    return String(value);
  }
  function table(input, label) {
    if (!Array.isArray(input) || !input.length)
      throw new Error(label + " tablosunda başlık satırı bulunamadı.");
    if (input.length > MAX_ROWS + 1)
      throw new Error("Tablo sınırı 50.000 veri satırıdır.");
    let headers, rows;
    if (Array.isArray(input[0])) {
      if (input.some((row) => !Array.isArray(row)))
        throw new Error("Tablo satırlarının biçimleri aynı olmalıdır.");
      headers = Array.from(input[0], scalar);
      rows = input.slice(1).map((row) => row.map(scalar));
    } else if (input[0] && typeof input[0] === "object") {
      if (
        input.some(
          (row) => !row || typeof row !== "object" || Array.isArray(row),
        )
      )
        throw new Error("Tablo satırlarının biçimleri aynı olmalıdır.");
      headers = Array.from(new Set(input.flatMap((row) => Object.keys(row))));
      rows = input.map((row) =>
        headers.map((header) =>
          scalar(
            Object.prototype.hasOwnProperty.call(row, header)
              ? row[header]
              : undefined,
          ),
        ),
      );
    } else throw new Error("Tablo satırları dizi veya nesne olmalıdır.");
    if (!headers.length || headers.some((header) => !header.trim()))
      throw new Error(label + " tablosunda boş sütun başlığı var.");
    if (headers.length > 500) throw new Error("Tablo sınırı 500 sütundur.");
    if (new Set(headers).size !== headers.length)
      throw new Error(label + " tablosunda yinelenen sütun başlığı var.");
    if (rows.some((row) => row.length > headers.length))
      throw new Error(
        label + " tablosunda başlıktan fazla hücre içeren satır var.",
      );
    return { headers, rows };
  }
  function compareTables(beforeInput, afterInput, keyColumn, options = {}) {
    const before = table(beforeInput, "Önceki"),
      after = table(afterInput, "Sonraki");
    if (
      !Number.isInteger(keyColumn) ||
      keyColumn < 0 ||
      keyColumn >= before.headers.length
    )
      throw new Error("Geçerli bir anahtar sütun seçin.");
    const keyHeader = before.headers[keyColumn],
      afterKey = after.headers.indexOf(keyHeader);
    if (afterKey < 0)
      throw new Error("Anahtar sütun sonraki tabloda bulunamadı: " + keyHeader);
    const headers = before.headers.concat(
      after.headers.filter((header) => !before.headers.includes(header)),
    );
    const warnings = [];
    const added = [],
      removed = [],
      changed = [],
      duplicateKeys = [];
    let unchanged = 0;
    const keyFor = (value) =>
      options.trimKeys === true ? scalar(value).trim() : scalar(value);
    function indexRows(source, keyIndex, label) {
      const map = new Map();
      let missing = 0;
      for (const row of source.rows) {
        const key = keyFor(row[keyIndex]);
        if (key.trim() === "") {
          missing++;
          continue;
        }
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
      }
      if (missing)
        warnings.push(
          label +
            " tabloda anahtarı boş " +
            missing +
            " satır karşılaştırma dışında bırakıldı.",
        );
      return map;
    }
    const left = indexRows(before, keyColumn, "Önceki"),
      right = indexRows(after, afterKey, "Sonraki");
    const aligned = (row, source) =>
      headers.map((header) => {
        const col = source.headers.indexOf(header);
        return col < 0 ? null : (row[col] ?? "");
      });
    for (const key of new Set([...left.keys(), ...right.keys()])) {
      const a = left.get(key) || [],
        b = right.get(key) || [];
      if (a.length > 1 || b.length > 1) {
        duplicateKeys.push({
          key,
          beforeCount: a.length,
          afterCount: b.length,
        });
        continue;
      }
      if (!a.length) {
        added.push({ key, row: aligned(b[0], after) });
        continue;
      }
      if (!b.length) {
        removed.push({ key, row: aligned(a[0], before) });
        continue;
      }
      const oldRow = aligned(a[0], before),
        newRow = aligned(b[0], after),
        changes = [];
      headers.forEach((column, i) => {
        if (oldRow[i] !== newRow[i])
          changes.push({ column, before: oldRow[i], after: newRow[i] });
      });
      if (changes.length)
        changed.push({ key, before: oldRow, after: newRow, changes });
      else unchanged++;
    }
    if (duplicateKeys.length)
      warnings.push(
        duplicateKeys.length +
          " yinelenen anahtar grubu belirsiz olduğu için karşılaştırma dışında bırakıldı.",
      );
    if (
      before.headers.some((header) => !after.headers.includes(header)) ||
      after.headers.some((header) => !before.headers.includes(header))
    )
      warnings.push(
        "Sütun şeması değişti; bulunmayan sütun değerleri null ile gösterilir.",
      );
    return {
      headers,
      keyHeader,
      added,
      removed,
      changed,
      unchanged,
      duplicateKeys,
      warnings,
    };
  }

  function splitTable(rows, options = {}) {
    if (!Array.isArray(rows) || rows.some((row) => !Array.isArray(row)))
      throw new Error("Tablo satırları bir dizi olmalıdır.");
    if (rows.length > MAX_ROWS + 1)
      throw new Error("Tablo sınırı 50.000 veri satırıdır.");
    const count =
      options.rowsPerFile === undefined ? 1000 : Number(options.rowsPerFile);
    if (!Number.isInteger(count) || count < 1 || count > MAX_ROWS)
      throw new Error(
        "Dosya başına satır sayısı 1–50.000 arasında tam sayı olmalıdır.",
      );
    const hasHeader = options.header !== false;
    const header = hasHeader && rows.length ? rows[0].slice() : null;
    const data = hasHeader ? rows.slice(1) : rows;
    if (!data.length) return header ? [[header]] : [];
    const output = [];
    for (let start = 0; start < data.length; start += count) {
      output.push(
        (header ? [header.slice()] : []).concat(
          data.slice(start, start + count).map((row) => row.slice()),
        ),
      );
    }
    return output;
  }

  return {
    repairMojibake,
    auditUnicode,
    cleanUnicode,
    compareTables,
    splitTable,
    limits: { maxTextBytes: MAX_TEXT_BYTES, maxRows: MAX_ROWS },
  };
});
