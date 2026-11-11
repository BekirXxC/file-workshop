/* Extended local tools and session-only appearance preferences. */
"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const t = (key, params) => (window.I18n ? I18n.t(key, params) : key);
  const brandNames = {
    tr: "Dosya Atölyesi",
    en: "File Workshop",
    es: "Taller de Archivos",
    fr: "Atelier de Fichiers",
    de: "Dateiwerkstatt",
    pt: "Oficina de Arquivos",
    ru: "Мастерская файлов",
    ar: "ورشة الملفات",
    zh: "文件工坊",
    ja: "ファイル工房",
    hi: "फ़ाइल कार्यशाला",
    az: "Fayl Emalatxanası",
    kk: "Файл шеберханасы",
    uz: "Fayl ustaxonasi",
    ky: "Файл устаканасы",
    tk: "Faýl ussahanasy",
    tt: "Файл остаханәсе",
    ba: "Файл оҫтаханаһы",
    ug: "ھۆججەت ئۇستىخانىسى",
  };
  if (window.I18n)
    for (const [code, name] of Object.entries(brandNames))
      I18n.registerLocales({ [code]: { messages: { "app.name": name } } });
  function updateBrand() {
    const name = t("app.name");
    document.title = name;
    const brand = $("brand-name");
    if (brand) brand.textContent = name;
    document.querySelector(".brand").setAttribute("aria-label", name);
    document.querySelectorAll("[data-app-name]").forEach((e) => {
      e.textContent = name;
      e.dataset.noI18n = "";
    });
    const about = document.querySelector("#about .dialog-heading h2");
    if (about) {
      about.textContent = name;
      about.dataset.noI18n = "";
    }
  }
  const make = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const label = (key, tag = "span", cls = "") => {
    const e = make(tag, cls, t(key));
    e.dataset.i18n = key;
    return e;
  };
  const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const l = (s) => `<span data-i18n="${attr(s)}">${s}</span>`;
  const field = (id, title, type = "select", extra = "") =>
    `<div class="field"><label for="${id}">${l(title)}</label>${type === "select" ? `<select id="${id}" data-file-select ${extra}></select>` : `<input id="${id}" type="${type}" ${extra}>`}</div>`;
  const heading = (id, title, desc) =>
    `<div class="page-heading compact"><div><div class="eyebrow"><span data-app-name data-no-i18n></span> / 2.1</div><h1 id="${id}-title" data-i18n="${attr(title)}">${title}</h1><p data-i18n="${attr(desc)}">${desc}</p></div><button class="button secondary add-files">${l("Dosya ekle")}</button></div>`;
  const toolbar = document.querySelector(".top-actions");
  const languageField = make("div", "language-control");
  const languages = make("select");
  languages.id = "language-select";
  languages.setAttribute("aria-label", "Language");
  languageField.append(languages);
  toolbar.prepend(languageField);
  const languageHint = make("div", "language-hint");
  languageHint.id = "language-hint";
  languageHint.hidden = true;
  languageHint.setAttribute("role", "status");
  languageHint.setAttribute("aria-atomic", "true");
  const languageHintText = make("div", "language-hint-copy");
  const closeLanguageHint = make("button", "language-hint-close", "×");
  closeLanguageHint.type = "button";
  closeLanguageHint.setAttribute("aria-label", "Close");
  languageHint.append(languageHintText, closeLanguageHint);
  languageField.append(languageHint);
  let languageHintDismissed = false;
  let languageHintShown = false;
  let languageHintPulseTimer;
  let languageHintDismissTimer;
  function dismissLanguageHint() {
    languageHintDismissed = true;
    languageHint.hidden = true;
    languageHint.classList.remove("is-pulsing");
    window.clearTimeout(languageHintPulseTimer);
    window.clearTimeout(languageHintDismissTimer);
  }
  function showLanguageHint() {
    if (languageHintDismissed || languageHintShown || languages.options.length < 2)
      return;
    languageHintShown = true;
    languageHintText.append(
      make("strong", "", `${languages.options.length} languages available`),
      make("span", "", "Choose yours here"),
    );
    languageHint.hidden = false;
    languageHintPulseTimer = window.setTimeout(() => {
      if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
        languageHint.classList.add("is-pulsing");
    }, 7000);
    languageHintDismissTimer = window.setTimeout(dismissLanguageHint, 10000);
  }
  closeLanguageHint.addEventListener("click", dismissLanguageHint);
  for (const event of ["pointerdown", "focus", "keydown", "change"])
    languages.addEventListener(event, dismissLanguageHint);
  window.addEventListener("languagechange", () => {
    if (languageHintShown) dismissLanguageHint();
  });
  // Initialization emits languagechange after atelierready; wait until it completes.
  window.addEventListener("load", showLanguageHint, { once: true });
  const theme = make("button", "icon-button theme-button");
  theme.id = "theme-toggle";
  theme.setAttribute("aria-label", "Dark mode");
  theme.title = "Dark mode";
  theme.textContent = "☾";
  toolbar.prepend(theme);
  let currentTheme = window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  function applyTheme() {
    document.documentElement.dataset.theme = currentTheme;
    theme.textContent = currentTheme === "dark" ? "☀" : "☾";
    const key = currentTheme === "dark" ? "Light mode" : "Dark mode";
    theme.dataset.i18nTitle = key;
    theme.title = t(key);
    theme.setAttribute("aria-label", t(key));
    theme.setAttribute("aria-pressed", String(currentTheme === "dark"));
  }
  applyTheme();
  theme.onclick = () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme();
  };
  const langNotice = make("div", "translation-notice");
  langNotice.id = "translation-notice";
  langNotice.hidden = true;
  document.querySelector(".topbar").after(langNotice);
  const tools = [
    [
      "recovery",
      "Text recovery",
      "Fix broken characters and inspect invisible Unicode.",
      "Aa",
    ],
    [
      "compare",
      "Table comparison",
      "Compare two CSV files by a unique key.",
      "⇄",
    ],
    [
      "split",
      "Split a table",
      "Split large tables with a repeated header.",
      "⫶",
    ],
    [
      "duplicates",
      "Duplicate finder",
      "Find identical files by their content.",
      "=",
    ],
    [
      "batch",
      "Batch images",
      "Convert multiple images and download one ZIP.",
      "▧",
    ],
  ];
  const nav = document.querySelector("nav");
  nav.append(label("More tools", "div", "nav-label tools-label"));
  const homeCards = document.querySelector(".tool-grid");
  const renameCard = make("button", "tool-card");
  renameCard.dataset.go = "rename";
  renameCard.append(make("span", "tool-icon new-tool-glyph", "↳"));
  const renameBody = make("span");
  renameBody.append(
    label("Toplu adlandır", "strong"),
    label("Önek, numara ve güvenli ZIP çıktısı.", "small"),
  );
  renameCard.append(renameBody, make("span", "card-arrow", "↗"));
  homeCards.append(renameCard);
  for (const [id, title, desc, glyph] of tools) {
    const b = make("button", "nav-item");
    b.dataset.page = id;
    b.append(make("span", "new-tool-glyph", glyph), label(title));
    nav.append(b);
    const card = make("button", "tool-card");
    card.dataset.go = id;
    card.append(make("span", "tool-icon new-tool-glyph", glyph));
    const body = make("span");
    body.append(label(title, "strong"), label(desc, "small"));
    card.append(body, make("span", "card-arrow", "↗"));
    homeCards.append(card);
  }
  const main = $("main"),
    footer = document.querySelector(".workspace-footer");
  const insert = (id, html) => {
    const s = make("section", "page");
    s.id = "page-" + id;
    s.setAttribute("aria-labelledby", id + "-title");
    s.innerHTML = html;
    main.insertBefore(s, footer);
    return s;
  };
  insert(
    "recovery",
    heading("recovery", tools[0][1], tools[0][2]) +
      `
    <div class="panel text-toolbar">${field("recovery-file", "Dosyadan aç")}<button id="recovery-sample" class="button secondary">${l("Try sample")}</button></div>
    <div class="editor-grid"><div class="panel editor-panel"><div class="panel-heading"><h2>${l("Source text")}</h2></div><textarea id="recovery-source" spellcheck="false" aria-label="Source text" placeholder="Ã–rnek metin…"></textarea></div><div class="panel editor-panel"><div class="panel-heading"><h2>${l("Recovered text")}</h2></div><textarea id="recovery-output" spellcheck="false" readonly aria-label="Recovered text"></textarea></div></div>
    <div class="export-bar"><div class="segmented"><button id="recovery-repair" class="button primary">${l("Repair encoding")}</button><button id="recovery-audit" class="button secondary">${l("Inspect Unicode")}</button></div><div class="segmented"><button id="recovery-copy" class="button secondary" disabled>${l("Copy")}</button><button id="recovery-download" class="button secondary" disabled>${l("Download text")}</button></div></div><p id="recovery-message" class="summary-line" aria-live="polite"></p>
    <div class="panel"><div class="panel-heading"><h2>${l("Inspect Unicode")}</h2></div><p class="footnote" data-i18n="Some invisible characters are meaningful in languages. Review before removing.">Some invisible characters are meaningful in languages. Review before removing.</p><div class="check-row advanced-options"><label><input type="checkbox" id="recovery-zero">${l("Remove zero-width characters")}</label><label><input type="checkbox" id="recovery-bidi">${l("Remove direction controls")}</label><label><input type="checkbox" id="recovery-spaces">${l("Normalize special spaces")}</label><button id="recovery-clean" class="button secondary">${l("Apply selected cleanup")}</button></div><div id="unicode-results" class="table-scroll"></div></div><p class="footnote" data-i18n="No automatic repair can restore missing data.">No automatic repair can restore missing data.</p>`,
  );
  insert(
    "compare",
    heading("compare", tools[1][1], tools[1][2]) +
      `
    <div class="panel compare-controls">${field("compare-before", "Before table")}${field("compare-after", "After table")}${field("compare-key", "Key column", "select", "data-keys-select")}<button id="compare-run" class="button primary" disabled>${l("Compare tables")}</button></div><p class="footnote" data-i18n="A stable ID is better than a name for comparing rows.">A stable ID is better than a name for comparing rows.</p><div id="compare-summary" class="metrics-row"></div><div class="panel table-panel"><div class="panel-heading"><h2>${l("Result")}</h2><button id="compare-sample" class="link-button">${l("Try sample")}</button></div><div id="compare-results" class="table-scroll"></div></div><div class="export-bar"><p class="subtle" data-i18n="Fields with the same key are compared even when rows move.">Fields with the same key are compared even when rows move.</p><button id="compare-download" class="button primary" disabled>${l("Download comparison")}</button></div>`,
  );
  insert(
    "split",
    heading("split", tools[2][1], tools[2][2]) +
      `
    <div class="panel controls-panel">${field("split-file", "Kaynak dosya")}${field("split-count", "Rows per file", "number", 'min="1" max="50000" step="1" value="1000"')}<label class="checkbox-label"><input type="checkbox" id="split-header" checked>${l("Repeat header in every part")}</label></div><p class="footnote" data-i18n="Each part contains the selected number of data rows.">Each part contains the selected number of data rows.</p><div id="split-summary" class="summary-line"></div><div class="panel table-panel"><div class="panel-heading"><h2>${l("Preview")}</h2></div><div id="split-preview" class="table-scroll"></div></div><div class="export-bar"><p class="subtle" data-i18n="Files are processed locally. Originals are unchanged.">Files are processed locally. Originals are unchanged.</p><button id="split-download" class="button primary" disabled>${l("Create ZIP")}</button></div>`,
  );
  insert(
    "duplicates",
    heading("duplicates", tools[3][1], tools[3][2]) +
      `
    <div class="panel"><div class="panel-heading"><h2>${l("All files")}</h2><button id="duplicates-run" class="button primary">${l("Find duplicates")}</button></div><p class="footnote" data-i18n="Only byte-identical files are grouped. Similar photos are not duplicates.">Only byte-identical files are grouped. Similar photos are not duplicates.</p></div><div id="duplicates-summary" class="metrics-row"></div><div class="panel table-panel"><div class="panel-heading"><h2>${l("Result")}</h2></div><div id="duplicates-results" class="table-scroll"></div></div><div class="export-bar"><p class="subtle" data-i18n="Keep one copy of each group">Keep one copy of each group</p><div class="segmented"><button id="duplicates-report" class="button secondary" disabled>${l("Download report")}</button><button id="duplicates-download" class="button primary" disabled>${l("Download unique files")}</button></div></div>`,
  );
  insert(
    "batch",
    heading("batch", tools[4][1], tools[4][2]) +
      `
    <div class="panel batch-options"><div class="field"><label for="batch-format">${l("Image format")}</label><select id="batch-format"><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div>${field("batch-width", "Maximum width", "number", 'min="1" max="12000" value="1920"')}${field("batch-height", "Maximum height", "number", 'min="1" max="12000" value="1920"')}${field("batch-quality", "Quality", "number", 'min="10" max="100" value="85"')}${field("batch-target", "Target KB", "number", 'min="1" placeholder="—"')}<button id="batch-run" class="button primary">${l("Convert images")}</button></div><p class="footnote" data-i18n="Only images are included.">Only images are included.</p><div id="batch-summary" class="summary-line"></div><div class="panel table-panel"><div class="panel-heading"><h2>${l("Result")}</h2></div><div id="batch-results" class="table-scroll"></div></div><div class="export-bar"><p class="subtle" data-i18n="Source metadata is not copied. Text visible in an image stays visible.">Source metadata is not copied. Text visible in an image stays visible.</p><button id="batch-download" class="button primary" disabled>${l("Download ZIP")}</button></div>`,
  );
  document.querySelector(".sidebar-foot>span").textContent = "v2.1";
  const empty = (holder) => {
    holder.replaceChildren();
    const e = make("div", "empty-state");
    e.append(
      label("No results yet.", "strong"),
      label("Use the controls above to begin.", "p"),
    );
    holder.append(e);
  };
  [
    "unicode-results",
    "compare-results",
    "split-preview",
    "duplicates-results",
    "batch-results",
  ].forEach((id) => empty($(id)));
  function table(headers, rows) {
    const table = make("table"),
      head = make("thead"),
      hr = make("tr");
    headers.forEach((h) => hr.append(label(h, "th")));
    head.append(hr);
    table.append(head);
    const body = make("tbody");
    for (const row of rows) {
      const tr = make("tr");
      for (const cell of row) {
        const td = make("td");
        td.dataset.userContent = "";
        td.textContent = String(cell ?? "");
        td.title = td.textContent;
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    return table;
  }
  function metric(name, count) {
    const box = make("div", "metric-card");
    box.append(make("strong", "", count), label(name));
    return box;
  }
  function options(select, files) {
    const previous = select.value;
    select.replaceChildren(new Option(t("Select a file"), ""));
    for (const f of files) select.append(new Option(f.file.name, String(f.id)));
    select.value = files.some((f) => String(f.id) === previous)
      ? previous
      : files.length === 1
        ? String(files[0].id)
        : "";
    return select.value !== previous;
  }
  const isTable = (f) =>
    ["csv", "tsv", "txt"].includes(f.info.extension) &&
    f.info.detected.confidence !== "signature";
  const isText = (f) =>
    f.info.isText ||
    (["txt", "csv", "tsv", "json", "log", "md"].includes(f.info.extension) &&
      f.info.detected.confidence !== "signature");
  const isImage = (f) =>
    /^image\//.test(f.info.detected.mime) &&
    !["svg", "heic", "tif"].includes(f.info.detected.ext);
  let app,
    version = 0,
    recoveryToken = 0,
    compareToken = 0,
    splitToken = 0,
    duplicateToken = 0,
    batchToken = 0,
    fileSignature = null,
    compareResult = null,
    splitParts = null,
    duplicateResult = null,
    batchResults = [],
    recoverResult = "";
  function file(id) {
    return app.getFiles().find((f) => String(f.id) === String($(id).value));
  }
  async function readTable(f) {
    if (!f) throw Error(t("Select a file"));
    if (f.file.size > 5 * 1024 * 1024)
      throw Error(t("CSV / text limit: 5 MB."));
    const buf = await f.file.arrayBuffer();
    let enc = f.info.encoding || "utf-8";
    try {
      new TextDecoder(enc, { fatal: true }).decode(buf);
    } catch {
      enc = "windows-1254";
    }
    const text = new TextDecoder(enc).decode(buf),
      delimiter = FileCore.detectDelimiter(text),
      result = FileCore.parseCSV(text, delimiter);
    if (result.warnings.length)
      throw Error(t("Review malformed CSV in the CSV editor first."));
    if (result.rows.length > 50000 || result.rows.some((r) => r.length > 500))
      throw Error(t("Table limit: 50,000 rows and 500 columns."));
    return result.rows;
  }
  function changedFiles() {
    const files = app.getFiles(),
      tables = files.filter(isTable);
    const signature =
      app.getGeneration() + ":" + files.map((f) => f.id).join(",");
    if (signature === fileSignature) return;
    fileSignature = signature;
    duplicateToken++;
    batchToken++;
    options($("recovery-file"), files.filter(isText));
    options($("compare-before"), tables);
    options($("compare-after"), tables);
    options($("split-file"), tables);
    compareToken++;
    compareResult = null;
    $("compare-download").disabled = true;
    empty($("compare-results"));
    $("compare-summary").replaceChildren();
    loadKeys();
    loadSplit();
    duplicateResult = null;
    batchResults = [];
    $("duplicates-download").disabled =
      $("duplicates-report").disabled =
      $("batch-download").disabled =
        true;
    empty($("duplicates-results"));
    empty($("batch-results"));
    $("duplicates-summary").replaceChildren();
    $("batch-summary").replaceChildren();
    if (version !== app.getGeneration()) {
      version = app.getGeneration();
      recoveryToken++;
      $("recovery-source").value = "";
      $("recovery-output").value = "";
      recoverResult = "";
      $("recovery-message").textContent = "";
      $("recovery-download").disabled = $("recovery-copy").disabled = true;
      empty($("unicode-results"));
    }
  }
  function fillLanguages() {
    const previous = I18n.language;
    languages.replaceChildren();
    for (const group of ["World", "Turkic"]) {
      const optgroup = make("optgroup");
      optgroup.label = t(
        group === "World" ? "World languages" : "Turkic languages",
      );
      for (const locale of I18n.getLocales().filter((x) => x.group === group)) {
        const text =
          locale.native +
          (locale.status === "fallback"
            ? " · EN"
            : ["partial", "core"].includes(locale.status)
              ? " · ◐"
              : "");
        optgroup.append(new Option(text, locale.code));
      }
      if (optgroup.children.length) languages.append(optgroup);
    }
    languages.value = previous;
  }
  function languageChanged() {
    fillLanguages();
    applyTheme();
    updateBrand();
    const meta = I18n.getLocales().find((x) => x.code === I18n.language);
    langNotice.hidden = !(
      meta && ["partial", "fallback", "core"].includes(meta.status)
    );
    if (!langNotice.hidden) {
      langNotice.replaceChildren(
        label("Translation preview", "strong"),
        label(
          "Some explanations use English. Your files are never translated.",
        ),
      );
    }
    if (app) {
      const page = document.querySelector(".page.active");
      if (page) {
        const b = document.querySelector(`[data-page="${page.id.slice(5)}"]`);
        if (b)
          $("breadcrumb").textContent = b.textContent
            .replace(/\d+$/, "")
            .trim();
      }
    }
  }
  window.addEventListener("languagechange", languageChanged);
  languages.onchange = () => I18n.setLanguage(languages.value);
  window.addEventListener("atelierready", () => {
    app = window.Atelier;
    version = app.getGeneration();
    fillLanguages();
    languageChanged();
    changedFiles();
    window.addEventListener("atelierfileschange", changedFiles);
    $("recovery-file").onchange = async () => {
      const token = ++recoveryToken,
        f = file("recovery-file");
      if (!f) return;
      try {
        if (f.file.size > 5 * 1024 * 1024)
          throw Error(t("CSV / text limit: 5 MB."));
        const buf = await f.file.arrayBuffer();
        if (token !== recoveryToken) return;
        $("recovery-source").value = new TextDecoder(
          f.info.encoding || "utf-8",
        ).decode(buf);
        invalidateRecovery();
      } catch (e) {
        app.toast(e.message);
      }
    };
    function invalidateRecovery() {
      recoverResult = "";
      $("recovery-output").value = "";
      $("recovery-copy").disabled = $("recovery-download").disabled = true;
      $("recovery-message").textContent = "";
      empty($("unicode-results"));
      $("clear-all").disabled =
        !app.getFiles().length &&
        !$("text-source").value &&
        !$("recovery-source").value;
    }
    $("recovery-source").oninput = () => {
      recoveryToken++;
      invalidateRecovery();
    };
    $("recovery-sample").onclick = () => {
      recoveryToken++;
      $("recovery-source").value =
        "TÃ¼rkÃ§e metin: gÃ¼neÅŸ.\nGörünmez: a\u200Bb · özel boşluk: a\u00a0b";
      invalidateRecovery();
    };
    function showRecovery(text, message) {
      recoverResult = text;
      $("recovery-output").value = text;
      $("recovery-message").textContent = message;
      $("recovery-copy").disabled = $("recovery-download").disabled = false;
    }
    $("recovery-repair").onclick = () => {
      try {
        const result = AdvancedTools.repairMojibake($("recovery-source").value);
        showRecovery(
          result.text,
          result.changed
            ? t("Repair preview") + " · " + result.passes
            : t("No changes needed."),
        );
        audit(result.text);
      } catch (e) {
        app.toast(e.message);
      }
    };
    function audit(text) {
      const findings = AdvancedTools.auditUnicode(text);
      $("unicode-results").replaceChildren(
        findings.length
          ? table(
              ["Code point", "Category", "Context"],
              findings
                .slice(0, 500)
                .map((f) => [f.code + " · " + f.name, f.category, f.context]),
            )
          : label("No invisible characters found.", "p", "empty-state"),
      );
    }
    $("recovery-audit").onclick = () => {
      try {
        audit($("recovery-source").value);
      } catch (e) {
        app.toast(e.message);
      }
    };
    $("recovery-clean").onclick = () => {
      try {
        const result = AdvancedTools.cleanUnicode($("recovery-source").value, {
          removeZeroWidth: $("recovery-zero").checked,
          removeBidi: $("recovery-bidi").checked,
          normalizeSpaces: $("recovery-spaces").checked,
        });
        showRecovery(result.text, t("Count") + ": " + result.removed);
        audit(result.text);
      } catch (e) {
        app.toast(e.message);
      }
    };
    $("recovery-download").onclick = () =>
      app.download(
        new Blob([recoverResult], { type: "text/plain;charset=utf-8" }),
        "recovered.txt",
      );
    $("recovery-copy").onclick = async () => {
      try {
        await navigator.clipboard.writeText(recoverResult);
        app.toast(t("Copied."));
      } catch {
        app.toast(t("Select the output and copy it manually."));
      }
    };
    $("compare-before").onchange = $("compare-after").onchange = () => {
      compareToken++;
      compareResult = null;
      $("compare-download").disabled = true;
      empty($("compare-results"));
      $("compare-summary").replaceChildren();
      loadKeys();
    };
    $("compare-run").onclick = compare;
    $("compare-sample").onclick = async () => {
      const a = new File(
          ["id;item;count\n1;Notebook;3\n2;Pen;5\n3;Paper;2"],
          "before.csv",
          { type: "text/csv" },
        ),
        b = new File(
          ["count;id;item\n6;2;Pen\n3;1;Notebook\n1;4;Folder"],
          "after.csv",
          { type: "text/csv" },
        );
      await app.addFiles([a, b]);
      const files = app.getFiles();
      $("compare-before").value = files.findLast(
        (f) => f.file.name === "before.csv",
      ).id;
      $("compare-after").value = files.findLast(
        (f) => f.file.name === "after.csv",
      ).id;
      await loadKeys();
    };
    $("compare-key").onchange = () => {
      compareResult = null;
      $("compare-download").disabled = true;
    };
    $("compare-download").onclick = () => {
      if (!compareResult) return;
      const r = compareResult,
        rows = [["status", "key", "column", "before", "after"]];
      for (const x of r.added)
        rows.push(["added", x.key, "", "", JSON.stringify(x.row)]);
      for (const x of r.removed)
        rows.push(["removed", x.key, "", JSON.stringify(x.row), ""]);
      for (const x of r.changed)
        for (const c of x.changes)
          rows.push(["changed", x.key, c.column, c.before, c.after]);
      for (const x of r.duplicateKeys)
        rows.push(["ambiguous", x.key, "", x.beforeCount, x.afterCount]);
      app.download(
        new Blob([FileCore.stringifyCSV(rows, { safe: true })], {
          type: "text/csv;charset=utf-8",
        }),
        "comparison.csv",
      );
    };
    ["split-file", "split-count", "split-header"].forEach(
      (id) => ($(id).onchange = loadSplit),
    );
    $("split-count").oninput = loadSplit;
    $("split-download").onclick = async () => {
      if (!splitParts) return;
      const f = file("split-file"),
        parts = splitParts,
        gen = app.getGeneration();
      $("split-download").disabled = true;
      try {
        const entries = parts.map((rows, i) => ({
          name: "part-" + String(i + 1).padStart(3, "0") + ".csv",
          data: FileCore.stringifyCSV(rows, { safe: true }),
        }));
        const zip = await FileCore.createZip(entries);
        if (gen === app.getGeneration())
          app.download(
            zip,
            (f ? f.file.name.replace(/\.[^.]+$/, "") : "table") + "-parts.zip",
          );
      } catch (e) {
        app.toast(e.message);
      } finally {
        $("split-download").disabled = !splitParts;
      }
    };
    $("duplicates-run").onclick = findDuplicates;
    $("duplicates-report").onclick = () => {
      if (!duplicateResult) return;
      const rows = [
        ["file", "bytes", "sha256", "duplicateGroup"],
        ...duplicateResult.rows.map((r) => [
          r.f.file.name,
          r.f.file.size,
          r.hash,
          r.group,
        ]),
      ];
      app.download(
        new Blob([FileCore.stringifyCSV(rows, { safe: true })], {
          type: "text/csv;charset=utf-8",
        }),
        "file-report.csv",
      );
    };
    $("duplicates-download").onclick = async () => {
      if (!duplicateResult) return;
      const gen = app.getGeneration(),
        unique = duplicateResult.unique;
      try {
        const names = TextTools.renameFiles(unique.map((f) => f.file.name));
        const zip = await FileCore.createZip(
          unique.map((f, i) => ({ name: names[i], data: f.file })),
        );
        if (gen === app.getGeneration()) app.download(zip, "unique-files.zip");
      } catch (e) {
        app.toast(e.message);
      }
    };
    $("batch-run").onclick = batch;
    $("batch-download").onclick = async () => {
      if (!batchResults.length) return;
      const gen = app.getGeneration(),
        results = batchResults.slice();
      try {
        const names = TextTools.renameFiles(results.map((r) => r.name));
        const zip = await FileCore.createZip(
          results.map((r, i) => ({ name: names[i], data: r.blob })),
        );
        if (gen === app.getGeneration())
          app.download(zip, "converted-images.zip");
      } catch (e) {
        app.toast(e.message);
      }
    };
    [
      "batch-format",
      "batch-width",
      "batch-height",
      "batch-quality",
      "batch-target",
    ].forEach(
      (id) =>
        ($(id).oninput = () => {
          batchToken++;
          batchResults = [];
          $("batch-download").disabled = true;
        }),
    );
    I18n.apply(document);
  });
  let keyToken = 0;
  async function loadKeys() {
    const token = ++keyToken;
    $("compare-key").replaceChildren();
    $("compare-run").disabled = true;
    try {
      const f = file("compare-before");
      if (!f) return;
      const rows = await readTable(f);
      if (token !== keyToken) return;
      (rows[0] || []).forEach((h, i) =>
        $("compare-key").append(new Option(h || String(i + 1), String(i))),
      );
      $("compare-run").disabled = !file("compare-after") || !rows[0]?.length;
    } catch (e) {
      if (token === keyToken) app.toast(e.message);
    }
  }
  async function compare() {
    const token = ++compareToken;
    $("compare-run").disabled = true;
    compareResult = null;
    try {
      const a = file("compare-before"),
        b = file("compare-after");
      if (!a || !b) throw Error(t("Select a file"));
      const before = await readTable(a),
        after = await readTable(b);
      if (token !== compareToken) return;
      const result = AdvancedTools.compareTables(
        before,
        after,
        Number($("compare-key").value),
      );
      compareResult = result;
      $("compare-summary").replaceChildren(
        metric("Added", result.added.length),
        metric("Removed", result.removed.length),
        metric("Changed", result.changed.length),
        metric("Unchanged", result.unchanged),
        metric("Ambiguous keys", result.duplicateKeys.length),
      );
      const rows = [];
      for (const x of result.changed)
        for (const c of x.changes)
          rows.push([t("Changed"), x.key, c.column, c.before, c.after]);
      for (const x of result.added)
        rows.push([t("Added"), x.key, "", "", JSON.stringify(x.row)]);
      for (const x of result.removed)
        rows.push([t("Removed"), x.key, "", JSON.stringify(x.row), ""]);
      for (const x of result.duplicateKeys)
        rows.push([
          t("Ambiguous keys"),
          x.key,
          "",
          x.beforeCount,
          x.afterCount,
        ]);
      $("compare-results").replaceChildren(
        table(
          ["Status", "Key", "Column", "Before", "After"],
          rows.slice(0, 500),
        ),
      );
      for (const warning of result.warnings)
        $("compare-results").append(make("p", "footnote", warning));
      $("compare-download").disabled = false;
    } catch (e) {
      if (token === compareToken) app.toast(e.message);
    } finally {
      if (token === compareToken) $("compare-run").disabled = false;
    }
  }
  async function loadSplit() {
    const token = ++splitToken;
    splitParts = null;
    $("split-download").disabled = true;
    empty($("split-preview"));
    $("split-summary").textContent = "";
    const f = file("split-file");
    if (!f) return;
    try {
      if (!$("split-count").checkValidity()) return;
      const rows = await readTable(f);
      if (token !== splitToken) return;
      const parts = AdvancedTools.splitTable(rows, {
        rowsPerFile: Number($("split-count").value),
        header: $("split-header").checked,
      });
      if (parts.length > 500)
        throw Error(
          t("Too many parts. Use a larger row count (maximum 500 parts)."),
        );
      splitParts = parts;
      $("split-summary").textContent = t("Count") + ": " + parts.length;
      $("split-preview").replaceChildren(
        table(
          ["File", "Rows"],
          parts
            .slice(0, 100)
            .map((p, i) => [
              "part-" + String(i + 1).padStart(3, "0") + ".csv",
              p.length - ($("split-header").checked ? 1 : 0),
            ]),
        ),
      );
      $("split-download").disabled = !parts.length;
    } catch (e) {
      if (token === splitToken) app.toast(e.message);
    }
  }
  async function findDuplicates() {
    const files = app.getFiles();
    if (!files.length) return app.toast(t("Add files first."));
    const token = ++duplicateToken;
    const b = $("duplicates-run");
    b.disabled = true;
    $("duplicates-summary").replaceChildren(label("Processing…"));
    try {
      const rows = [],
        hashGroups = new Map();
      for (const f of files) {
        const hash = f.hash || (await FileCore.hashFile(f.file));
        if (token !== duplicateToken) return;
        f.hash = hash;
        const id = hash + "-" + f.file.size;
        if (!hashGroups.has(id)) hashGroups.set(id, []);
        hashGroups.get(id).push(f);
        rows.push({ f, hash, group: "" });
      }
      const duplicates = [...hashGroups.values()].filter((x) => x.length > 1);
      let reclaim = 0;
      duplicates.forEach((group, i) => {
        for (const f of group)
          rows.find((r) => r.f.id === f.id).group = String(i + 1);
        reclaim += (group.length - 1) * group[0].file.size;
      });
      const unique = [...hashGroups.values()].map((g) => g[0]);
      duplicateResult = { rows, unique };
      $("duplicates-summary").replaceChildren(
        metric("All files", files.length),
        metric("Duplicate groups", duplicates.length),
        metric("Savings", FileCore.formatBytes(reclaim)),
      );
      $("duplicates-results").replaceChildren(
        table(
          ["File", "Original size", "Group", "SHA-256"],
          rows.map((r) => [
            r.f.file.name,
            FileCore.formatBytes(r.f.file.size),
            r.group || "—",
            r.hash,
          ]),
        ),
      );
      $("duplicates-report").disabled = $("duplicates-download").disabled =
        false;
    } catch (e) {
      if (token === duplicateToken) app.toast(e.message);
    } finally {
      b.disabled = false;
    }
  }
  async function batch() {
    const files = app.getFiles().filter(isImage);
    if (!files.length) return app.toast(t("Add images first."));
    for (const id of [
      "batch-width",
      "batch-height",
      "batch-quality",
      "batch-target",
    ])
      if (!$(id).checkValidity())
        return app.toast(t("Check the numeric settings."));
    const token = ++batchToken,
      b = $("batch-run");
    b.disabled = true;
    batchResults = [];
    $("batch-download").disabled = true;
    $("batch-summary").textContent = t("Processing…");
    const rows = [];
    try {
      for (let i = 0; i < files.length; i++) {
        if (token !== batchToken) return;
        const f = files[i];
        let loaded;
        try {
          loaded = await ImageTools.load(f.file);
          const r = await ImageTools.convert(loaded, {
            format: $("batch-format").value,
            maxWidth: Number($("batch-width").value),
            maxHeight: Number($("batch-height").value),
            quality: Number($("batch-quality").value) / 100,
            targetKB: $("batch-target").value
              ? Number($("batch-target").value)
              : undefined,
          });
          if (token !== batchToken) return;
          if (
            batchResults.reduce((sum, item) => sum + item.blob.size, 0) +
              r.blob.size >
            150 * 1024 * 1024
          )
            throw Error(t("Output limit: 150 MB."));
          batchResults.push({
            name: ImageTools.suggestedName(f.file.name, r.mime),
            blob: r.blob,
          });
          rows.push([
            f.file.name,
            r.warning || t("Ready"),
            FileCore.formatBytes(f.file.size),
            FileCore.formatBytes(r.blob.size),
          ]);
        } catch (e) {
          rows.push([
            f.file.name,
            t("Failed") + ": " + t(e.message),
            FileCore.formatBytes(f.file.size),
            "—",
          ]);
        } finally {
          loaded?.close();
        }
        $("batch-results").replaceChildren(
          table(["File", "Status", "Original size", "Output size"], rows),
        );
        $("batch-summary").textContent = i + 1 + " / " + files.length;
      }
      if (token === batchToken)
        $("batch-download").disabled = !batchResults.length;
    } finally {
      b.disabled = false;
    }
  }
})();
