/* Pure text and filename transformations. No network or filesystem access. */
(function (root) {
  "use strict";
  const encoder = new TextEncoder();
  const MAX_TEXT_BYTES = 5 * 1024 * 1024;
  function normalizeLines(text) {
    return text.replace(/\r\n?/g, "\n");
  }
  function jsonError(error, original) {
    const description = String((error && error.message) || "");
    let location = "";
    const lc = description.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    if (lc) location = " Satır " + lc[1] + ", sütun " + lc[2] + ".";
    else {
      const pos = description.match(/(?:at\s+)?position\s+(\d+)/i);
      if (pos) {
        const before = original.slice(0, Number(pos[1]));
        const lines = before.split("\n");
        location =
          " Satır " +
          lines.length +
          ", sütun " +
          (lines[lines.length - 1].length + 1) +
          ".";
      }
    }
    return new Error(
      "Geçerli bir JSON değil." +
        location +
        " Tırnakları, virgülleri ve parantezleri kontrol edin.",
    );
  }
  function formatJSON(source, pretty) {
    // Validation happens separately. Reprint original lexical tokens instead of
    // stringifying the parsed value: numbers, key order, duplicate keys and
    // string escape sequences must remain exactly as supplied.
    const tokens = [];
    let cursor = 0;
    while (cursor < source.length) {
      const ch = source[cursor];
      if (/\s/.test(ch)) {
        cursor++;
        continue;
      }
      const start = cursor++;
      if (ch === '"') {
        while (cursor < source.length) {
          const current = source[cursor++];
          if (current === "\\") cursor++;
          else if (current === '"') break;
        }
      } else if (!"{}[],:".includes(ch)) {
        while (cursor < source.length && !/[\s{}\[\],:]/.test(source[cursor]))
          cursor++;
      }
      tokens.push(source.slice(start, cursor));
    }
    if (!pretty) return tokens.join("");
    const result = [];
    let depth = 0,
      length = 0;
    const append = (part) => {
      length += part.length;
      if (length > 20 * 1024 * 1024)
        throw new Error(
          "Girintili çıktı çok büyük. JSON sıkıştırmayı deneyin.",
        );
      result.push(part);
    };
    const newline = () => append("\n" + "  ".repeat(depth));
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === "{" || token === "[") {
        append(token);
        if (tokens[i + 1] !== (token === "{" ? "}" : "]")) {
          depth++;
          if (depth > 128)
            throw new Error(
              "JSON çok derin. Girintileme en fazla 128 iç içe katmanı destekler; sıkıştırmayı deneyin.",
            );
          newline();
        }
      } else if (token === "}" || token === "]") {
        if (tokens[i - 1] !== (token === "}" ? "{" : "[")) {
          depth--;
          newline();
        }
        append(token);
      } else if (token === ",") {
        append(",");
        newline();
      } else if (token === ":") append(": ");
      else append(token);
    }
    return result.join("");
  }
  function transform(input, action) {
    if (typeof input !== "string")
      throw new Error("İşlenecek metin bulunamadı.");
    if (encoder.encode(input).byteLength > MAX_TEXT_BYTES)
      throw new Error("Metin sınırı 5 MB. Daha küçük bir dosya seçin.");
    const text = normalizeLines(input);
    let result,
      extension = "txt",
      message;
    const lines = text.split("\n");
    switch (action) {
      case "trim":
        result = lines.map((line) => line.trim()).join("\n");
        message = "Satır başındaki ve sonundaki boşluklar temizlendi.";
        break;
      case "empty": {
        const remaining = lines.filter((line) => line.trim() !== "");
        result = remaining.join("\n");
        message = lines.length - remaining.length + " boş satır kaldırıldı.";
        break;
      }
      case "dedupe": {
        const unique = Array.from(new Set(lines));
        result = unique.join("\n");
        message =
          lines.length -
          unique.length +
          " tekrar eden satır kaldırıldı. İlk görülen satır korundu.";
        break;
      }
      case "sort":
        result = lines
          .slice()
          .sort((a, b) => a.localeCompare(b, "tr"))
          .join("\n");
        message = "Satırlar Türkçe alfabetik sıraya göre sıralandı.";
        break;
      case "spaces":
        result = text.replace(/[\t ]+/g, " ");
        message =
          "Art arda gelen boşluklar ve sekmeler tek boşluğa dönüştürüldü.";
        break;
      case "json":
      case "minify": {
        const source = text.replace(/^\uFEFF/, "");
        try {
          JSON.parse(source);
        } catch (error) {
          throw jsonError(error, source);
        }
        result = formatJSON(source, action === "json");
        extension = "json";
        message =
          action === "json"
            ? "JSON doğrulandı ve girintilendi."
            : "JSON doğrulandı ve sıkıştırıldı.";
        break;
      }
      case "newline":
        result = text;
        message = "Satır sonları LF biçimine dönüştürüldü.";
        break;
      default:
        throw new Error("Bu metin işlemi desteklenmiyor.");
    }
    if (result === input && !["json", "minify"].includes(action))
      message = "Metin zaten bu kurala uygun; değişiklik yapılmadı.";
    return { text: result, extension, message };
  }
  const trMap = {
    ı: "i",
    İ: "I",
    ğ: "g",
    Ğ: "G",
    ü: "u",
    Ü: "U",
    ş: "s",
    Ş: "S",
    ö: "o",
    Ö: "O",
    ç: "c",
    Ç: "C",
    ß: "ss",
    æ: "ae",
    Æ: "AE",
    œ: "oe",
    Œ: "OE",
    ø: "o",
    Ø: "O",
    ł: "l",
    Ł: "L",
  };
  function ascii(text) {
    return text
      .replace(/[ıİğĞüÜşŞöÖçÇßæÆœŒøØłŁ]/g, (ch) => trMap[ch])
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7e]/g, "");
  }
  function clean(text) {
    return String(text)
      .normalize("NFC")
      .replace(
        /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f<>:"/\\|?*]/g,
        "_",
      )
      .replace(/[. ]+$/g, "")
      .trim();
  }
  function truncateBytes(text, bytes) {
    let result = "",
      count = 0;
    for (const char of text) {
      const size = encoder.encode(char).length;
      if (count + size > bytes) break;
      result += char;
      count += size;
    }
    return result;
  }
  function splitName(name) {
    const leaf = String(name).replace(/^.*[/\\]/, "");
    const dot = leaf.lastIndexOf(".");
    return dot > 0 && dot < leaf.length - 1
      ? [leaf.slice(0, dot), leaf.slice(dot + 1)]
      : [leaf, ""];
  }
  function reserved(base) {
    // Windows also treats reserved words followed by another extension as devices.
    return /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(base);
  }
  function renameFiles(names, options = {}) {
    if (!Array.isArray(names) || names.some((name) => typeof name !== "string"))
      throw new Error("Dosya adları bir metin listesi olmalı.");
    if (names.length > 5000)
      throw new Error(
        "Bir işlemde en fazla 5.000 dosya yeniden adlandırılabilir.",
      );
    const used = new Set();
    const prefix = String(options.prefix || "");
    const find = String(options.find || "");
    const replacement = String(options.replace || "");
    const caseMode = options.case || "keep";
    if (!["keep", "lower", "upper"].includes(caseMode))
      throw new Error("Geçersiz harf biçimi.");
    return names.map((original, index) => {
      let [base, ext] = splitName(original);
      if (find) base = base.split(find).join(replacement);
      base = prefix + base;
      if (caseMode === "lower") base = base.toLocaleLowerCase("tr");
      if (caseMode === "upper") base = base.toLocaleUpperCase("tr");
      if (options.ascii) base = ascii(base);
      if (options.slug)
        base = base
          .toLocaleLowerCase(options.ascii ? "en-US" : "tr")
          .replace(/[^\p{L}\p{N}]+/gu, "-")
          .replace(/^-+|-+$/g, "");
      if (options.number)
        base = String(index + 1).padStart(3, "0") + "-" + base;
      base = clean(base) || "dosya";
      if (reserved(base)) base = "_" + base;
      ext = truncateBytes(clean(ext), 30);
      const suffix = ext ? "." + ext : "";
      const maxBase = 180 - encoder.encode(suffix).length;
      const candidate = (counter) => {
        const disambiguator = counter === 1 ? "" : " (" + counter + ")";
        let head =
          truncateBytes(
            base,
            maxBase - encoder.encode(disambiguator).length,
          ).replace(/[. ]+$/g, "") || "dosya";
        if (reserved(head))
          head =
            "_" +
            truncateBytes(
              head,
              maxBase - 1 - encoder.encode(disambiguator).length,
            );
        return head + disambiguator + suffix;
      };
      let counter = 1,
        name = candidate(counter);
      const key = (value) => value.normalize("NFKC").toLocaleLowerCase("en-US");
      while (used.has(key(name))) name = candidate(++counter);
      used.add(key(name));
      return name;
    });
  }
  const api = {
    transform,
    renameFiles,
    limits: { maxTextBytes: MAX_TEXT_BYTES, maxFiles: 5000 },
  };
  root.TextTools = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
