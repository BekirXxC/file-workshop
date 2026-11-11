/* Dosya Atölyesi. All file content stays in the current browser session. */
"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const msg = (key, params) => (window.I18n ? I18n.t(key, params) : key);
  const icons = {
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    scan: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/><circle cx="11" cy="11" r="4"/><path d="m14 14 3 3"/>',
    table:
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
    image:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    text: '<path d="M4 5h16M4 10h16M4 15h10M4 20h13"/>',
    rename: '<path d="M4 6h10M4 12h7M4 18h6m5-4 5-5 3 3-5 5-4 1z"/>',
    shield:
      '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
    upload:
      '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
    download: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v4h16v-4"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    rotate: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    file: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8m-8 4h6"/>',
  };
  function icon(name) {
    const span = document.createElement("span");
    span.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (icons[name] || icons.file) +
      "</svg>";
    return span;
  }
  document
    .querySelectorAll("[data-icon]")
    .forEach((node) =>
      node.replaceChildren(icon(node.dataset.icon).firstChild),
    );
  const state = {
    files: [],
    nextId: 1,
    selected: null,
    page: "home",
    generation: 0,
    adding: false,
  };
  let toastTimer;
  function toast(message) {
    $("toast").textContent = window.I18n ? I18n.t(message) : message;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 5000);
  }
  const node = (tag, cls, text) => {
    let n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  function empty(title, body, withButton = false) {
    const box = node("div", "empty-state");
    box.append(icon("file"), node("strong", "", title), node("p", "", body));
    if (withButton) {
      const b = node("button", "button secondary", "Dosya seç");
      b.onclick = chooseFiles;
      box.append(b);
    }
    return box;
  }
  function button(label, handler, cls = "button secondary") {
    const b = node("button", cls, label);
    b.onclick = handler;
    return b;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.hidden = true;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function baseName(name) {
    const at = name.lastIndexOf(".");
    return at > 0 ? name.slice(0, at) : name;
  }
  function current(id) {
    return state.files.find((f) => String(f.id) === String(id));
  }
  function go(page) {
    if (!document.getElementById("page-" + page)) page = "home";
    state.page = page;
    document
      .querySelectorAll(".page")
      .forEach((p) => p.classList.toggle("active", p.id === "page-" + page));
    document.querySelectorAll("[data-page]").forEach((b) => {
      b.classList.toggle("active", b.dataset.page === page);
      if (b.dataset.page === page) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    $("breadcrumb").textContent = document
      .querySelector('[data-page="' + page + '"]')
      .textContent.replace(/\d+$/, "")
      .trim();
    history.replaceState(null, "", "#" + page);
    if (page === "inspect") renderInspection();
    if (page === "rename") renderRename();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  document
    .querySelectorAll("[data-page]")
    .forEach((b) => (b.onclick = () => go(b.dataset.page)));
  document
    .querySelectorAll("[data-go]")
    .forEach((b) => (b.onclick = () => go(b.dataset.go)));
  document.querySelector(".brand").onclick = (e) => {
    e.preventDefault();
    go("home");
  };
  document.querySelector(".skip-link").onclick = (e) => {
    e.preventDefault();
    $("main").focus();
  };
  function chooseFiles() {
    $("file-input").click();
  }
  document
    .querySelectorAll(".add-files")
    .forEach((b) => (b.onclick = chooseFiles));
  $("dropzone").onclick = chooseFiles;
  $("dropzone").onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      chooseFiles();
    }
  };
  $("file-input").onchange = (e) => {
    addFiles([...e.target.files]);
    e.target.value = "";
  };
  let dragDepth = 0;
  document.addEventListener("dragenter", (e) => {
    if (e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
      dragDepth++;
      $("drag-overlay").hidden = false;
    }
  });
  document.addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  });
  document.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) $("drag-overlay").hidden = true;
  });
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    $("drag-overlay").hidden = true;
    if (e.dataTransfer?.files.length) addFiles([...e.dataTransfer.files]);
  });
  window.addEventListener("blur", () => {
    dragDepth = 0;
    $("drag-overlay").hidden = true;
  });
  async function addFiles(files) {
    if (state.adding) {
      toast("Dosyalar inceleniyor. Birazdan yeniden ekleyebilirsin.");
      return;
    }
    state.adding = true;
    const gen = state.generation;
    let added = 0,
      skipped = 0;
    let bytes = state.files.reduce((n, f) => n + f.file.size, 0);
    try {
      for (const file of files) {
        if (gen !== state.generation) break;
        if (
          state.files.length >= 100 ||
          file.size > 50 * 1024 * 1024 ||
          bytes + file.size > 150 * 1024 * 1024
        ) {
          skipped++;
          continue;
        }
        try {
          const info = await FileCore.inspectFile(file);
          if (gen !== state.generation) break;
          state.files.push({ id: state.nextId++, file, info });
          bytes += file.size;
          added++;
        } catch (_) {
          skipped++;
        }
      }
      if (gen === state.generation) {
        if (state.selected === null)
          state.selected = state.files[0]?.id ?? null;
        renderFiles();
        toast(
          msg("{count} files added.", { count: added }) +
            (skipped
              ? " " +
                msg(
                  "{count} files skipped. Limits: 50 MB each, 150 MB total, 100 files.",
                  { count: skipped },
                )
              : ""),
        );
      }
    } finally {
      state.adding = false;
    }
  }
  function fileRow(f, selected = false) {
    const row = node("div", "file-row" + (selected ? " selected" : ""));
    const ext = f.info.extension.slice(0, 5).toUpperCase() || "DOSYA";
    row.append(node("span", "file-type-icon", ext));
    const body = node("div", "file-info");
    const title = node("button", "file-name", f.file.name);
    title.title = f.file.name;
    title.onclick = () => {
      state.selected = f.id;
      go("inspect");
      renderFiles(false);
    };
    body.append(title, node("span", "file-sub", f.info.detected.label));
    row.append(
      body,
      node("span", "file-size", FileCore.formatBytes(f.file.size)),
      node(
        "span",
        "row-status" + (f.info.extensionMismatch ? " warn" : ""),
        f.info.extensionMismatch
          ? "Uzantı farklı"
          : f.info.detected.confidence === "unknown"
            ? "Belirsiz"
            : "İncelendi",
      ),
    );
    return row;
  }
  function updateSelect(id, filter) {
    const sel = $(id),
      previous = sel.value;
    sel.replaceChildren();
    const list = state.files.filter(filter);
    sel.append(
      new Option(list.length ? "Dosya seç…" : "Henüz uygun dosya yok", ""),
    );
    for (const f of list) sel.append(new Option(f.file.name, String(f.id)));
    sel.value = list.some((f) => String(f.id) === previous) ? previous : "";
    if (!sel.value && list.length === 1) sel.value = String(list[0].id);
    return sel.value !== previous;
  }
  const textLike = (f) =>
    f.info.isText ||
    (f.info.detected.confidence !== "signature" &&
      /^(txt|csv|tsv|json|xml|md|log|html|css|js|yaml|yml|ini|srt)$/i.test(
        f.info.extension,
      ));
  const csvLike = (f) =>
    (f.info.detected.confidence !== "signature" &&
      /^(csv|tsv|txt)$/i.test(f.info.extension)) ||
    f.info.detected.mime === "text/csv";
  const imageLike = (f) =>
    /^image\//.test(f.info.detected.mime) &&
    !["svg", "heic", "tif"].includes(f.info.detected.ext);
  function renderFiles(refreshTools = true) {
    $("file-count").textContent = state.files.length;
    $("home-file-count").textContent = state.files.length;
    $("inspect-count").textContent = msg("{count} files", {
      count: state.files.length,
    });
    window.dispatchEvent(new Event("atelierfileschange"));
    $("home-files").replaceChildren(
      ...(state.files.length
        ? state.files.map((f) => {
            const r = fileRow(f);
            const remove = button("", () => removeFile(f.id), "icon-button");
            remove.append(icon("trash"));
            remove.setAttribute(
              "aria-label",
              msg("Remove {name}", { name: f.file.name }),
            );
            r.append(remove);
            return r;
          })
        : [
            empty(
              "Henüz dosya yok",
              "Bir dosya ekle veya örnek dosyalarla araçları dene.",
            ),
          ]),
    );
    $("inspect-files").replaceChildren(
      ...(state.files.length
        ? state.files.map((f) => {
            const row = fileRow(f, state.selected === f.id);
            row.onclick = () => {
              state.selected = f.id;
              renderFiles(false);
            };
            return row;
          })
        : [empty("Çalışma alanı boş", "İncelemek için bir dosya ekle.", true)]),
    );
    renderInspection();
    renderRename();
    if (refreshTools) {
      const a = updateSelect("csv-file", csvLike),
        b = updateSelect("image-file", imageLike),
        c = updateSelect("text-file", textLike);
      if (a) loadCSV();
      if (b) loadImage();
      if (c) loadTextFile();
    }
    $("clear-all").disabled =
      !state.files.length &&
      !$("text-source").value &&
      !$("recovery-source")?.value;
  }
  function removeFile(id) {
    state.files = state.files.filter((f) => f.id !== id);
    if (state.selected === id) state.selected = state.files[0]?.id ?? null;
    renderFiles();
  }
  function clearWorkspace() {
    state.generation++;
    csvToken++;
    textToken++;
    inspectToken++;
    state.files = [];
    state.selected = null;
    csvRows = [];
    csvOutput = [];
    $("csv-file").value = "";
    resetImage();
    $("text-source").value = "";
    clearTextOutput();
    updateTextStats();
    renderFiles();
    renderCSV();
    toast("Çalışma alanı temizlendi.");
  }
  $("clear-all").onclick = () => {
    if (
      state.files.length ||
      $("text-source").value ||
      $("recovery-source")?.value
    ) {
      if (
        confirm(
          window.I18n
            ? I18n.t(
                "Çalışma alanı ve henüz indirilmemiş sonuçlar temizlensin mi? Orijinal dosyalar silinmez.",
              )
            : "Çalışma alanı ve henüz indirilmemiş sonuçlar temizlensin mi? Orijinal dosyalar silinmez.",
        )
      )
        clearWorkspace();
    }
  };
  let inspectToken = 0;
  function renderInspection() {
    const box = $("inspection");
    box.replaceChildren();
    const f = current(state.selected);
    if (!f) {
      box.append(
        empty(
          "Dosyanı daha yakından tanı",
          "Gerçek dosya türü, kodlama, ilk baytlar ve SHA-256 özeti.",
          true,
        ),
      );
      return;
    }
    const token = ++inspectToken,
      info = f.info,
      d = info.detected;
    box.append(
      node("h2", "", f.file.name),
      node(
        "p",
        "title-sub",
        FileCore.formatBytes(f.file.size) +
          " · " +
          (f.file.type || "MIME bildirilmemiş"),
      ),
    );
    const finding = node(
      "div",
      "finding" + (info.extensionMismatch ? " warn" : ""),
    );
    let title, description;
    if (info.extensionMismatch) {
      title = "Uzantı ile içerik farklı görünüyor.";
      description =
        "İçerik " +
        d.label +
        " olarak tanındı, ancak dosyanın uzantısı " +
        (info.extension ? "." + info.extension : "yok") +
        ". Doğru uzantıyla yeni bir kopya kaydedebilirsin. Bu işlem içeriği onarmaz veya dönüştürmez.";
    } else if (d.container) {
      title = "Kapsayıcı türü tanındı.";
      description =
        "İçerideki dosyalar bu araçta açılmaz. Bu sonuç, belgenin sağlam olduğunu göstermez.";
    } else if (d.confidence === "signature") {
      title = "Dosya imzası uzantıyla uyumlu.";
      description =
        "İlk baytlar " +
        d.label +
        " biçimini gösteriyor. Dosyanın tamamı ve güvenliği doğrulanmış değildir.";
    } else if (d.confidence === "heuristic") {
      title = "Metin tabanlı içerik bulundu.";
      description =
        "Türü, içerikten tahmin edildi. Kodlama ve metin önizlemesini aşağıda kontrol edebilirsin.";
    } else {
      title = f.file.size
        ? "Türü kesin olarak belirlenemedi."
        : "Bu dosya boş.";
      description = f.file.size
        ? "Desteklenmeyen bir biçim veya farklı kodlamada metin olabilir. Bu tek başına bozuk olduğu anlamına gelmez."
        : "Dosyada incelenecek veri yok.";
    }
    finding.append(node("strong", "", title), node("p", "", description));
    box.append(finding);
    const facts = node("dl", "fact-grid");
    for (const [label, value] of [
      ["Tespit edilen tür", d.label],
      [
        "Tespit yöntemi",
        {
          signature: "Dosya imzası",
          heuristic: "İçerikten tahmin",
          unknown: "Belirsiz",
        }[d.confidence],
      ],
      ["Dosya boyutu", f.file.size.toLocaleString("tr-TR") + " bayt"],
      ["Karakter kodlaması", info.encoding || "—"],
      ["Uzantı", info.extension ? "." + info.extension : "Yok"],
      ["Kapsam", "İlk 64 KB incelendi"],
    ]) {
      const wrap = node("div");
      wrap.append(node("dt", "", label), node("dd", "", value));
      facts.append(wrap);
    }
    box.append(facts);
    const actions = node("div", "segmented");
    if (info.extensionMismatch && d.ext) {
      actions.append(
        button(
          "Doğru uzantıyla kopya indir",
          () => download(f.file, baseName(f.file.name) + "." + d.ext),
          "button primary",
        ),
      );
    }
    if (csvLike(f))
      actions.append(
        button("CSV düzenle", () => {
          go("csv");
          $("csv-file").value = f.id;
          loadCSV();
        }),
      );
    if (imageLike(f))
      actions.append(
        button("Görseli dönüştür", () => {
          go("image");
          $("image-file").value = f.id;
          loadImage();
        }),
      );
    if (textLike(f))
      actions.append(
        button("Metni aç", () => {
          go("text");
          $("text-file").value = f.id;
          loadTextFile();
        }),
      );
    box.append(actions);
    if (info.sampleText !== null) {
      const section = node("div", "detail-section");
      section.append(
        node("h3", "", "Metin önizlemesi · ilk 8 KB"),
        node("pre", "", info.sampleText),
      );
      box.append(section);
    }
    const bytes = node("div", "detail-section");
    bytes.append(
      node("h3", "", "İlk 32 bayt · hexadecimal"),
      node("pre", "", info.hex || "Dosya boş"),
    );
    box.append(bytes);
    const hash = node("div", "detail-section");
    hash.append(
      node("h3", "", "SHA-256 dosya özeti"),
      node(
        "p",
        "subtle",
        "İki dosyanın birebir aynı olup olmadığını karşılaştırmak için.",
      ),
    );
    const result = node("div", "hash-text");
    result.hidden = true;
    const hashButton = button("Dosya özetini hesapla", async () => {
      hashButton.disabled = true;
      hashButton.textContent = "Hesaplanıyor…";
      try {
        const value = f.hash || (await FileCore.hashFile(f.file));
        f.hash = value;
        if (token !== inspectToken) return;
        result.textContent = value;
        result.hidden = false;
        hashButton.textContent = "Özeti kopyala";
        hashButton.onclick = () => copyText(value);
        hashButton.disabled = false;
      } catch (e) {
        toast(e.message);
        hashButton.textContent = "Yeniden dene";
        hashButton.disabled = false;
      }
    });
    hash.append(hashButton, result);
    box.append(hash);
    const note = node("p", "footnote", info.warnings.join(" "));
    note.style.marginTop = "18px";
    box.append(note);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext)
      navigator.clipboard
        .writeText(text)
        .then(() => toast("Panoya kopyalandı."))
        .catch(() => toast("Kopyalanamadı. Metni seçerek kopyalayabilirsin."));
    else {
      const area = node("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (_) {}
      area.remove();
      toast(
        ok
          ? "Panoya kopyalandı."
          : "Tarayıcı kopyalamaya izin vermedi. Metni seçerek kopyalayabilirsin.",
      );
    }
  }

  let csvRows = [],
    csvOutput = [],
    csvWarnings = [],
    csvMeta = "",
    csvToken = 0;
  async function loadCSV() {
    const token = ++csvToken;
    csvRows = [];
    csvOutput = [];
    csvWarnings = [];
    csvMeta = "";
    renderCSV();
    const f = current($("csv-file").value);
    if (!f) return;
    if (f.file.size > 5 * 1024 * 1024) {
      toast("CSV düzenlemede sınır 5 MB. Daha küçük bir dosya seç.");
      return;
    }
    try {
      const bytes = await f.file.arrayBuffer();
      if (token !== csvToken) return;
      let encoding = $("csv-encoding").value;
      if (encoding === "auto") {
        encoding = f.info.encoding || "utf-8";
        try {
          new TextDecoder(encoding, { fatal: true }).decode(bytes);
        } catch (_) {
          encoding = "windows-1254";
          csvWarnings.push(
            "UTF-8 değil; Türkçe Windows-1254 denendi. Önizlemeyi kontrol et.",
          );
        }
      }
      const text = new TextDecoder(encoding).decode(bytes);
      const delimiter =
        $("csv-delimiter").value === "auto"
          ? FileCore.detectDelimiter(text)
          : delimiterValue($("csv-delimiter").value);
      const parsed = FileCore.parseCSV(text, delimiter);
      if (
        parsed.rows.length > 50000 ||
        parsed.rows.some((r) => r.length > 500)
      ) {
        toast("Tablo çok büyük. Sınır: 50.000 satır, 500 sütun.");
        return;
      }
      csvRows = parsed.rows;
      csvWarnings.push(...parsed.warnings);
      if (text.includes("\uFFFD"))
        csvWarnings.push("Okunamayan karakter bulundu; farklı kodlama seç.");
      csvMeta =
        encoding.toUpperCase() +
        " · " +
        (delimiter === "\t" ? "sekme" : delimiter) +
        " ayracı";
      renderCSV();
    } catch (e) {
      toast("CSV açılamadı: " + e.message);
    }
  }
  const delimiterValue = (v) => (v === "tab" ? "\t" : v);
  function renderCSV() {
    const holder = $("csv-preview"),
      summary = $("csv-summary");
    holder.replaceChildren();
    summary.replaceChildren();
    if (!csvRows.length) {
      holder.append(
        empty(
          "Tablonu buraya getir",
          "CSV, TSV veya ayraçlı bir metin dosyası seç.",
        ),
      );
      $("csv-export").disabled = true;
      return;
    }
    let rows = csvRows.map((r) =>
      r.map((v) => ($("csv-trim").checked ? v.trim() : v)),
    );
    const before = rows.length;
    if ($("csv-empty").checked)
      rows = rows.filter((r) => r.some((v) => v.trim() !== ""));
    if ($("csv-dedupe").checked) {
      const seen = new Set();
      rows = rows.filter((r, i) => {
        if (i === 0 && $("csv-header").checked) return true;
        const key = JSON.stringify(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    csvOutput = rows;
    if (!rows.length) {
      holder.append(
        empty(
          "Gösterilecek satır yok",
          "Temizleme seçenekleri tüm boş satırları kaldırdı.",
        ),
      );
      $("csv-export").disabled = true;
      return;
    }
    const count = rows.length - ($("csv-header").checked ? 1 : 0),
      cols = Math.max(...rows.map((r) => r.length));
    summary.append(
      node(
        "span",
        "summary-chip",
        msg("{count} data rows", {
          count: count.toLocaleString(I18n.language),
        }),
      ),
      node("span", "summary-chip", msg("{count} columns", { count: cols })),
      node("span", "", csvMeta),
    );
    if (before !== rows.length)
      summary.append(
        node(
          "span",
          "",
          msg("{count} rows removed", { count: before - rows.length }),
        ),
      );
    if (rows.some((r) => r.length !== rows[0].length))
      summary.append(
        node("span", "summary-chip warn", "Sütun sayıları farklı"),
      );
    for (const warning of csvWarnings)
      summary.append(node("span", "summary-chip warn", warning));
    const table = node("table"),
      head = node("thead"),
      tr = node("tr");
    tr.append(node("th", "", "#"));
    const headers = $("csv-header").checked
      ? rows[0]
      : Array.from({ length: cols }, (_, i) => "Sütun " + (i + 1));
    for (let i = 0; i < cols; i++) tr.append(node("th", "", headers[i] ?? ""));
    head.append(tr);
    table.append(head);
    const body = node("tbody"),
      shown = rows.slice(
        $("csv-header").checked ? 1 : 0,
        ($("csv-header").checked ? 1 : 0) + 100,
      );
    shown.forEach((r, i) => {
      const t = node("tr");
      t.append(node("td", "", i + 1));
      for (let j = 0; j < cols; j++) {
        const cell = node("td", "", r[j] ?? "");
        cell.title = r[j] ?? "";
        t.append(cell);
      }
      body.append(t);
    });
    table.append(body);
    holder.append(table);
    $("csv-export").disabled = false;
  }
  ["csv-file", "csv-encoding", "csv-delimiter"].forEach(
    (id) => ($(id).onchange = loadCSV),
  );
  ["csv-trim", "csv-empty", "csv-dedupe", "csv-header"].forEach(
    (id) => ($(id).onchange = renderCSV),
  );
  $("csv-reset").onclick = () => {
    for (const id of ["csv-trim", "csv-empty", "csv-header"])
      $(id).checked = true;
    $("csv-dedupe").checked = false;
    renderCSV();
  };
  $("csv-export").onclick = () => {
    const f = current($("csv-file").value);
    if (!f || !csvOutput.length) return;
    try {
      const data = FileCore.stringifyCSV(csvOutput, {
        delimiter: delimiterValue($("csv-out-delimiter").value),
        safe: $("csv-safe").checked,
        bom: true,
      });
      download(
        new Blob([data], { type: "text/csv;charset=utf-8" }),
        baseName(f.file.name) + "-duzenli.csv",
      );
      toast("Düzenlenmiş CSV hazır.");
    } catch (e) {
      toast(e.message);
    }
  };

  let loadedImage = null,
    imageToken = 0,
    imageURL = null,
    imageOutput = null,
    rotation = 0,
    flip = false;
  function resetImage() {
    imageToken++;
    loadedImage?.close();
    loadedImage = null;
    imageOutput = null;
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = null;
    rotation = 0;
    flip = false;
    $("rotation-label").textContent = "0°";
    $("image-flip").setAttribute("aria-pressed", "false");
    $("image-stage").replaceChildren(
      empty(
        "Bir görsel seç",
        "JPEG, PNG, WebP ve tarayıcının desteklediği görseller.",
      ),
    );
    $("image-info").textContent = "";
    $("image-result").textContent = "";
    $("image-download").disabled = true;
    $("image-convert").disabled = true;
  }
  function showImage(blob) {
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = URL.createObjectURL(blob);
    const img = node("img");
    img.alt = "Görsel önizlemesi";
    img.src = imageURL;
    $("image-stage").replaceChildren(img);
  }
  async function loadImage() {
    resetImage();
    const f = current($("image-file").value);
    if (!f) return;
    const token = imageToken;
    $("image-result").textContent = "Görsel açılıyor…";
    try {
      const decoded = await ImageTools.load(f.file);
      if (token !== imageToken) {
        decoded.close();
        return;
      }
      loadedImage = decoded;
      showImage(f.file);
      $("image-info").textContent =
        decoded.width + " × " + decoded.height + " px";
      $("image-result").textContent = msg("Source · {size}", {
        size: FileCore.formatBytes(f.file.size),
      });
      $("image-convert").disabled = false;
    } catch (e) {
      if (token === imageToken) {
        $("image-result").textContent = e.message;
        toast(e.message);
      }
    }
  }
  function invalidateImage() {
    if (loadedImage) imageToken++;
    imageOutput = null;
    $("image-download").disabled = true;
    if (loadedImage) {
      $("image-convert").disabled = false;
      $("image-result").textContent =
        "Ayarlar değişti. Yeni sonucu görmek için dönüştür.";
    }
  }
  $("image-file").onchange = loadImage;
  $("image-rotate").onclick = () => {
    rotation = (rotation + 90) % 360;
    $("rotation-label").textContent = rotation + "°";
    invalidateImage();
  };
  $("image-flip").onclick = () => {
    flip = !flip;
    $("image-flip").setAttribute("aria-pressed", String(flip));
    invalidateImage();
  };
  [
    "image-width",
    "image-height",
    "image-format",
    "image-background",
    "image-target",
  ].forEach((id) => ($(id).oninput = invalidateImage));
  $("image-quality").oninput = () => {
    $("image-quality-label").textContent = "%" + $("image-quality").value;
    invalidateImage();
  };
  $("image-format").onchange = () => {
    const png = $("image-format").value === "image/png";
    $("image-quality").disabled = png;
    invalidateImage();
  };
  $("image-convert").onclick = async () => {
    if (!loadedImage) return;
    const token = ++imageToken;
    $("image-convert").disabled = true;
    $("image-download").disabled = true;
    $("image-result").textContent = "Dönüştürülüyor…";
    try {
      for (const id of ["image-width", "image-height", "image-target"])
        if (!$(id).checkValidity())
          throw new Error("Boyut alanlarına geçerli bir pozitif sayı yaz.");
      const result = await ImageTools.convert(loadedImage, {
        format: $("image-format").value,
        quality: Number($("image-quality").value) / 100,
        maxWidth: Number($("image-width").value),
        maxHeight: Number($("image-height").value),
        rotation,
        flip,
        background: $("image-background").value,
        targetKB: $("image-target").value
          ? Number($("image-target").value)
          : undefined,
      });
      if (token !== imageToken) return;
      imageOutput = result;
      showImage(result.blob);
      const f = current($("image-file").value);
      const saving = f
        ? Math.round((1 - result.blob.size / f.file.size) * 100)
        : 0;
      $("image-info").textContent =
        result.width + " × " + result.height + " px";
      $("image-result").replaceChildren(
        node("strong", "", FileCore.formatBytes(result.blob.size)),
        node(
          "span",
          "",
          " · " +
            (result.mime.split("/")[1] || result.mime).toUpperCase() +
            (saving > 0
              ? " · " + msg("{percent}% smaller", { percent: saving })
              : "") +
            (result.metTarget === true ? " · Hedef boyuta uygun" : ""),
        ),
      );
      if (result.warning)
        $("image-result").append(node("p", "warning-text", result.warning));
      $("image-download").disabled = false;
    } catch (e) {
      if (token === imageToken) {
        $("image-result").textContent = e.message;
        toast(e.message);
      }
    } finally {
      if (token === imageToken) $("image-convert").disabled = false;
    }
  };
  $("image-download").onclick = () => {
    const f = current($("image-file").value);
    if (imageOutput && f)
      download(
        imageOutput.blob,
        ImageTools.suggestedName(f.file.name, imageOutput.mime),
      );
  };

  let textResult = null,
    textToken = 0;
  function textStat(text) {
    return msg("{count} characters · {lines} lines", {
      count: Array.from(text).length.toLocaleString(I18n.language),
      lines: (text ? text.split(/\r\n|\r|\n/).length : 0).toLocaleString(
        I18n.language,
      ),
    });
  }
  function updateTextStats() {
    $("text-source-stat").textContent = textStat($("text-source").value);
    $("clear-all").disabled =
      !state.files.length &&
      !$("text-source").value &&
      !$("recovery-source")?.value;
  }
  function clearTextOutput() {
    textResult = null;
    $("text-output").value = "";
    $("text-output-stat").textContent = "Henüz işlem yapılmadı";
    $("text-message").textContent = "";
    for (const id of ["text-download", "text-copy", "text-chain"])
      $(id).disabled = true;
  }
  async function loadTextFile() {
    const f = current($("text-file").value),
      token = ++textToken;
    if (!f) return;
    if (f.file.size > 5 * 1024 * 1024) {
      toast("Metin düzenlemede sınır 5 MB.");
      return;
    }
    try {
      const buffer = await f.file.arrayBuffer();
      if (token !== textToken) return;
      $("text-source").value = new TextDecoder(
        f.info.encoding || "utf-8",
      ).decode(buffer);
      clearTextOutput();
      updateTextStats();
      if (!f.info.encoding)
        toast(
          "Metin UTF-8 olarak açıldı. Kodlamayı düzeltmek için CSV aracını kullanabilirsin.",
        );
    } catch (e) {
      toast("Metin açılamadı: " + e.message);
    }
  }
  $("text-file").onchange = loadTextFile;
  $("text-source").oninput = () => {
    textToken++;
    clearTextOutput();
    updateTextStats();
  };
  $("text-clear").onclick = () => {
    textToken++;
    $("text-source").value = "";
    clearTextOutput();
    updateTextStats();
  };
  $("text-run").onclick = () => {
    try {
      const source = $("text-source").value;
      if (!source) {
        toast("Önce bir metin yaz veya dosya aç.");
        return;
      }
      textResult = TextTools.transform(source, $("text-action").value);
      $("text-output").value = textResult.text;
      $("text-output-stat").textContent = textStat(textResult.text);
      $("text-message").textContent = textResult.message;
      for (const id of ["text-download", "text-copy", "text-chain"])
        $(id).disabled = false;
    } catch (e) {
      clearTextOutput();
      $("text-message").textContent = e.message;
      toast(e.message);
    }
  };
  $("text-chain").onclick = () => {
    if (textResult) {
      textToken++;
      $("text-source").value = textResult.text;
      clearTextOutput();
      updateTextStats();
      toast("Sonuç kaynak alana taşındı. Başka bir işlem uygulayabilirsin.");
    }
  };
  $("text-copy").onclick = () => {
    if (textResult) copyText(textResult.text);
  };
  $("text-download").onclick = () => {
    if (textResult)
      download(
        new Blob([textResult.text], {
          type:
            textResult.extension === "json"
              ? "application/json"
              : "text/plain;charset=utf-8",
        }),
        "duzenlenmis." + textResult.extension,
      );
  };

  let renameNames = [];
  function renderRename() {
    const holder = $("rename-preview");
    holder.replaceChildren();
    $("rename-summary").replaceChildren();
    if (!state.files.length) {
      holder.append(
        empty(
          "Adlandırılacak dosya yok",
          "Birden fazla dosya ekle, hepsini tek seferde düzenle.",
        ),
      );
      $("rename-export").disabled = true;
      return;
    }
    try {
      renameNames = TextTools.renameFiles(
        state.files.map((f) => f.file.name),
        {
          prefix: $("rename-prefix").value,
          find: $("rename-find").value,
          replace: $("rename-replace").value,
          case: $("rename-case").value,
          number: $("rename-number").checked,
          ascii: $("rename-ascii").checked,
          slug: $("rename-slug").checked,
        },
      );
      const table = node("table"),
        head = node("thead"),
        row = node("tr");
      ["#", "Şimdiki ad", "Yeni ad", "Boyut"].forEach((v) =>
        row.append(node("th", "", v)),
      );
      head.append(row);
      table.append(head);
      const body = node("tbody");
      state.files.forEach((f, i) => {
        const row = node("tr");
        row.append(
          node("td", "", i + 1),
          node("td", "old-name", f.file.name),
          node("td", "new-name", renameNames[i]),
          node("td", "", FileCore.formatBytes(f.file.size)),
        );
        body.append(row);
      });
      table.append(body);
      holder.append(table);
      const changed = state.files.filter(
        (f, i) => f.file.name !== renameNames[i],
      ).length;
      $("rename-summary").append(
        node(
          "span",
          "summary-chip",
          msg("{count} files", { count: state.files.length }),
        ),
        node(
          "span",
          "",
          msg("{count} files will be renamed", { count: changed }),
        ),
      );
      $("rename-export").disabled = false;
    } catch (e) {
      holder.append(empty("Adlar hazırlanamadı", e.message));
      $("rename-export").disabled = true;
    }
  }
  [
    "rename-prefix",
    "rename-find",
    "rename-replace",
    "rename-case",
    "rename-number",
    "rename-ascii",
    "rename-slug",
  ].forEach((id) => ($(id).oninput = renderRename));
  $("rename-export").onclick = async () => {
    if (!state.files.length) return;
    const b = $("rename-export"),
      gen = state.generation;
    const entries = state.files.map((f, i) => ({
      name: renameNames[i],
      data: f.file,
    }));
    b.disabled = true;
    b.textContent = "ZIP hazırlanıyor…";
    try {
      const zip = await FileCore.createZip(entries);
      if (gen !== state.generation) return;
      download(zip, "duzenlenmis-dosyalar.zip");
      toast(msg("ZIP ready: {count} files.", { count: entries.length }));
    } catch (e) {
      toast("ZIP hazırlanamadı: " + e.message);
    } finally {
      b.replaceChildren(
        icon("download"),
        document.createTextNode("ZIP olarak indir"),
      );
      b.disabled = !state.files.length;
    }
  };

  $("about-open").onclick = () => $("about").showModal();
  $("about-top").onclick = () => $("about").showModal();
  $("about-close").onclick = $("about-done").onclick = () => $("about").close();
  $("about").addEventListener("click", (e) => {
    if (e.target === $("about")) {
      const r = $("about").getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        $("about").close();
    }
  });
  $("demo").onclick = async () => {
    if (state.files.some((f) => f.file.name === "ornek-tablo.csv")) {
      toast("Örnek dosyalar zaten çalışma alanında.");
      return;
    }
    const files = [
      new File(
        [
          'Ürün;Adet;Not\r\n Defter ;3; Kırtasiye \r\nKalem;5;Mavi\r\nKalem;5;Mavi\r\n;;\r\n"Çizim kağıdı";2;"A4; beyaz"',
        ],
        "ornek-tablo.csv",
        { type: "text/csv" },
      ),
      new File(
        [
          '{"proje":"Örnek","durum":"hazır","etiketler":["yerel","ücretsiz"],"surum":1}',
        ],
        "ornek-veri.json",
        { type: "application/json" },
      ),
      new File(
        [
          "%PDF-1.4\nBu dosya yalnızca tür uyuşmazlığını gösteren bir örnektir; geçerli PDF değildir.",
        ],
        "yanlis-uzanti.txt",
        { type: "text/plain" },
      ),
    ];
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e9eddf";
    ctx.fillRect(0, 0, 1400, 900);
    ctx.fillStyle = "#acba91";
    ctx.beginPath();
    ctx.arc(1100, 190, 210, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#506f51";
    ctx.beginPath();
    ctx.moveTo(0, 900);
    ctx.lineTo(0, 650);
    ctx.lineTo(520, 280);
    ctx.lineTo(1050, 900);
    ctx.fill();
    ctx.fillStyle = "#294b3c";
    ctx.beginPath();
    ctx.moveTo(400, 900);
    ctx.lineTo(1100, 410);
    ctx.lineTo(1400, 660);
    ctx.lineTo(1400, 900);
    ctx.fill();
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (blob)
      files.push(new File([blob], "ornek-gorsel.png", { type: "image/png" }));
    await addFiles(files);
  };
  window.addEventListener("hashchange", () => go(location.hash.slice(1)));
  window.addEventListener("languagechange", () => {
    renderFiles(false);
    renderCSV();
    updateTextStats();
    if (textResult)
      $("text-output-stat").textContent = textStat(textResult.text);
  });
  window.Atelier = {
    getFiles: () => state.files.slice(),
    getGeneration: () => state.generation,
    addFiles,
    download,
    toast,
    go,
    chooseFiles,
    icon,
  };
  renderFiles();
  renderCSV();
  updateTextStats();
  go(location.hash.slice(1) || "home");
  window.dispatchEvent(new Event("atelierready"));
  if (window.I18n) I18n.init();
})();
