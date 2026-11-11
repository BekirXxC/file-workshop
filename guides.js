/* Contextual guides never modify or submit the user's data. */
"use strict";
(() => {
  const t = (key, params) => (window.I18n ? I18n.t(key, params) : key);
  const guides = {
    inspect: {
      title: "Dosya incele",
      steps: [
        [
          "Dosya ekle",
          "Add a file, then select its name in the file list.",
          "#inspect-files",
        ],
        [
          "Tespit edilen tür",
          "Compare the detected signature with the extension. A matching extension does not prove that a file is safe or intact.",
          "#inspection",
        ],
        [
          "SHA-256 dosya özeti",
          "Calculate the fingerprint to compare exact file contents, or download a copy with the corrected extension.",
          "#inspection",
        ],
      ],
    },
    csv: {
      title: "CSV düzenle",
      steps: [
        [
          "Kaynak dosya",
          "Select a table. If letters or columns look wrong, change the encoding or delimiter.",
          ".controls-panel",
        ],
        [
          "Temizleme seçenekleri",
          "Review the preview before removing spaces, empty rows or duplicates. The header option keeps the first row as column names.",
          "#csv-preview",
        ],
        [
          "CSV indir",
          "Choose the output delimiter and download a new UTF-8 copy. Formula protection can turn signed numbers into text.",
          "#csv-export",
        ],
      ],
    },
    image: {
      title: "Görsel dönüştür",
      steps: [
        [
          "Kaynak görsel",
          "Select an image. Your source file is never overwritten.",
          "#image-file",
        ],
        [
          "Options",
          "Set the maximum dimensions, format and quality. The aspect ratio is preserved; smaller images are not enlarged.",
          ".image-controls",
        ],
        [
          "Dönüştür ve önizle",
          "Preview the converted image and measured size. If a target size cannot be reached, the tool tells you before download.",
          "#image-convert",
        ],
      ],
    },
    text: {
      title: "Metin temizle",
      steps: [
        [
          "Kaynak",
          "Paste text or open a small text file. The source stays separate from the output.",
          "#text-source",
        ],
        [
          "İşlem",
          "Choose one operation. JSON formatting preserves numeric spelling, key order and duplicate keys.",
          "#text-action",
        ],
        [
          "Sonuç",
          "Review the result. Use it as the next source to combine operations, then copy or download.",
          "#text-output",
        ],
      ],
    },
    rename: {
      title: "Toplu adlandır",
      steps: [
        [
          "Dosya ekle",
          "Add several files to the workspace. They are copied into an archive; originals keep their names.",
          ".add-files",
        ],
        [
          "Options",
          "Set a prefix, literal replacement or numbering. Extensions are preserved and name collisions receive a number.",
          ".rename-fields",
        ],
        [
          "Adlandırma önizlemesi",
          "Review every new name, then download the ZIP. Renaming does not remove personal information inside files.",
          "#rename-preview",
        ],
      ],
    },
    recovery: {
      title: "Text recovery",
      steps: [
        [
          "Source text",
          "Paste broken text or try the sample. Missing characters cannot be reconstructed.",
          "#recovery-source",
        ],
        [
          "Repair encoding",
          "The repair reverses common encoding mistakes only when the result improves. Always compare both panes.",
          "#recovery-repair",
        ],
        [
          "Inspect Unicode",
          "Inspect invisible marks before removing them. Joiners and direction marks may be necessary in your language.",
          "#recovery-audit",
        ],
      ],
    },
    compare: {
      title: "Table comparison",
      steps: [
        [
          "Before table",
          "Select the old and new CSV files. Try the sample to see reordered rows and changed values.",
          ".compare-controls",
        ],
        [
          "Key column",
          "Choose a stable unique ID. Both tables must contain that column; duplicate IDs are reported as ambiguous.",
          "#compare-key",
        ],
        [
          "Result",
          "Added, removed and changed records are listed separately. Download the report for all differences.",
          "#compare-results",
        ],
      ],
    },
    split: {
      title: "Split a table",
      steps: [
        [
          "Kaynak dosya",
          "Select a CSV or TSV file. Check encoding in the CSV editor first if necessary.",
          "#split-file",
        ],
        [
          "Rows per file",
          "Set the number of data rows per part. Enable the header option only when the first row contains column names.",
          "#split-count",
        ],
        [
          "Create ZIP",
          "Preview the part counts. Every selected row is included; the last part may be shorter.",
          "#split-download",
        ],
      ],
    },
    duplicates: {
      title: "Duplicate finder",
      steps: [
        [
          "Dosya ekle",
          "Add the files you want to compare. Similar-looking pictures are not necessarily identical.",
          ".add-files",
        ],
        [
          "Find duplicates",
          "Files are grouped by size and SHA-256. Calculation happens in your browser and may take a moment.",
          "#duplicates-run",
        ],
        [
          "Download unique files",
          "Download one copy of each content group. Originals are never deleted; the optional report contains filenames and hashes.",
          "#duplicates-download",
        ],
      ],
    },
    batch: {
      title: "Batch images",
      steps: [
        [
          "Dosya ekle",
          "Add several images. Unsupported images are reported instead of stopping the entire batch.",
          ".add-files",
        ],
        [
          "Options",
          "Choose common dimensions, quality, format and an optional target KB. Images are processed one at a time.",
          ".batch-options",
        ],
        [
          "Download ZIP",
          "Review each file status and size, then download successful conversions together. Original metadata is not copied.",
          "#batch-results",
        ],
      ],
    },
  };
  const styleTarget = () => document.querySelector(".page.active");
  const dialog = document.createElement("dialog");
  dialog.id = "guide-dialog";
  dialog.className = "guide-dialog";
  document.body.append(dialog);
  const coach = document.createElement("aside");
  coach.id = "guide-coach";
  coach.className = "guide-coach";
  coach.hidden = true;
  coach.setAttribute("aria-label", "Tutorial");
  document.body.append(coach);
  let current = null,
    step = 0,
    highlighted = null;
  function clear() {
    highlighted?.classList.remove("tutorial-focus");
    highlighted = null;
    coach.hidden = true;
  }
  function ui(tag, text, cls) {
    const e = document.createElement(tag);
    e.textContent = t(text);
    if (cls) e.className = cls;
    e.dataset.i18n = text;
    return e;
  }
  function closeButton(handler) {
    const b = ui("button", "Close", "icon-button");
    b.onclick = handler;
    return b;
  }
  function show(page) {
    clear();
    current = page;
    step = 0;
    dialog.replaceChildren();
    const head = document.createElement("div");
    head.className = "dialog-heading";
    head.append(
      ui("h2", guides[page].title),
      closeButton(() => dialog.close()),
    );
    dialog.append(head, ui("p", "How to use", "eyebrow"));
    const list = document.createElement("ol");
    list.className = "guide-steps";
    for (const [title, body] of guides[page].steps) {
      const li = document.createElement("li");
      li.append(ui("strong", title), ui("p", body));
      list.append(li);
    }
    dialog.append(list);
    const start = ui("button", "Start walkthrough", "button primary full");
    start.onclick = () => {
      dialog.close();
      window.Atelier.go(page);
      renderStep();
    };
    dialog.append(start);
    dialog.showModal();
    window.I18n?.apply(dialog);
  }
  function renderStep() {
    clear();
    const guide = guides[current],
      data = guide.steps[step];
    coach.replaceChildren();
    const head = document.createElement("div");
    head.className = "dialog-heading";
    const progress = document.createElement("span");
    progress.className = "eyebrow";
    progress.textContent = t("Step {n} of {total}", {
      n: step + 1,
      total: guide.steps.length,
    });
    head.append(progress, closeButton(clear));
    coach.append(head, ui("h3", data[0]), ui("p", data[1]));
    const actions = document.createElement("div");
    actions.className = "guide-actions";
    const back = ui("button", "Back", "button secondary");
    back.disabled = step === 0;
    back.onclick = () => {
      step--;
      renderStep();
    };
    const next = ui(
      "button",
      step === guide.steps.length - 1 ? "Finish" : "Next",
      "button primary",
    );
    next.onclick = () => {
      if (step === guide.steps.length - 1) clear();
      else {
        step++;
        renderStep();
      }
    };
    actions.append(back, next);
    coach.append(actions);
    coach.hidden = false;
    highlighted = styleTarget()?.querySelector(data[2]);
    if (highlighted) {
      highlighted.classList.add("tutorial-focus");
      highlighted.scrollIntoView({ block: "center", behavior: "instant" });
    }
    window.I18n?.apply(coach);
  }
  for (const [page, guide] of Object.entries(guides)) {
    const host = document.querySelector("#page-" + page + " .page-heading");
    if (!host) continue;
    const b = ui("button", "How to use", "button secondary guide-open");
    b.dataset.guide = page;
    b.onclick = () => show(page);
    host.append(b);
  }
  const nav = document.createElement("button");
  nav.className = "nav-item";
  nav.id = "tutorials-open";
  nav.append(ui("span", "?", "new-tool-glyph"), ui("span", "Tutorials"));
  nav.onclick = () => {
    clear();
    dialog.replaceChildren();
    const heading = document.createElement("div");
    heading.className = "dialog-heading";
    heading.append(
      ui("h2", "Tutorials"),
      closeButton(() => dialog.close()),
    );
    dialog.append(heading, ui("p", "Choose a tool to see its guide."));
    const list = document.createElement("div");
    list.className = "guide-catalog";
    for (const [id, g] of Object.entries(guides)) {
      const b = ui("button", g.title, "button secondary");
      b.onclick = () => {
        dialog.close();
        show(id);
      };
      list.append(b);
    }
    dialog.append(list);
    dialog.showModal();
  };
  document.querySelector("nav").append(nav);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") clear();
  });
  window.addEventListener("hashchange", clear);
  window.addEventListener("languagechange", () => {
    if (!coach.hidden) renderStep();
  });
  window.addEventListener("atelierready", () => {
    document
      .querySelectorAll("[data-page],[data-go]")
      .forEach((b) => b.addEventListener("click", clear));
  });
})();
