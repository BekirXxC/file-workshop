/* Local-only interface translations. File contents and file names are never translated. */
(function (root) {
  "use strict";
  const locales = Object.create(null);
  let language = "en";
  let observer = null;
  let applying = false;
  let scheduled = false;
  const textSources = new WeakMap();
  const attrSources = new WeakMap();
  const reverse = new Map();
  const excluded =
    "script,style,textarea,pre,code,table td,table th,.file-name,.file-sub,.file-type-icon,.hash-text,[data-user-content],[data-no-i18n],.brand,#inspection h2,.fact-grid dd,#language-select,#language-menu";

  function registerLocales(entries) {
    for (const [code, value] of Object.entries(entries || {})) {
      if (!value || typeof value !== "object") continue;
      const existing = locales[code] || { meta: {}, messages: {} };
      locales[code] = {
        meta: { ...existing.meta, ...(value.meta || {}) },
        messages: { ...existing.messages, ...(value.messages || {}) },
      };
      for (const [source, translated] of Object.entries(value.messages || {})) {
        if (typeof translated === "string" && !reverse.has(translated))
          reverse.set(translated, source);
      }
    }
  }
  function original(value) {
    if (
      locales.en?.messages[value] !== undefined ||
      locales.tr?.messages[value] !== undefined
    )
      return value;
    return reverse.get(value) || value;
  }
  function t(key, params) {
    const source = String(key ?? "");
    const current = locales[language]?.messages || {};
    const canonical = locales.en?.messages[source] ?? source;
    let result = current[source] ?? current[canonical];
    if (result === undefined)
      result =
        language === "tr"
          ? (locales.tr?.messages[source] ?? source)
          : (locales.en?.messages[source] ?? source);
    if (typeof result !== "string") result = source;
    if (params)
      result = result.replace(/\{([\w]+)\}/g, (all, name) =>
        Object.prototype.hasOwnProperty.call(params, name)
          ? String(params[name])
          : all,
      );
    return result;
  }
  function getLocales() {
    return Object.entries(locales).map(([code, value]) => ({
      code,
      ...value.meta,
    }));
  }
  function shouldSkip(element) {
    if (!element || element.closest(excluded)) return true;
    const option = element.closest("option");
    if (option) {
      if (
        option.parentElement?.matches("#language-select,[data-language-select]")
      )
        return true;
      if (
        option.value &&
        option.parentElement?.matches(
          "#csv-file,#image-file,#text-file,[data-file-select]",
        )
      )
        return true;
    }
    return false;
  }
  function translateText(textNode) {
    if (shouldSkip(textNode.parentElement)) return;
    const value = textNode.nodeValue;
    if (!value || !value.trim()) return;
    const record = textSources.get(textNode);
    const source =
      record && value === record.last ? record.source : original(value.trim());
    const translated = t(source);
    const leading = value.match(/^\s*/)[0];
    const trailing = value.match(/\s*$/)[0];
    const next = leading + translated + trailing;
    textSources.set(textNode, { source, last: next });
    if (value !== next) textNode.nodeValue = next;
  }
  function translateAttributes(element) {
    // Placeholder and accessible labels are interface text; input values remain untouched.
    if (
      element.closest(
        "script,style,[data-user-content],[data-no-i18n],.file-name,.file-sub,.file-type-icon,.hash-text,#inspection h2,.fact-grid dd",
      )
    )
      return;
    if (element.matches("td,th") && !element.hasAttribute("data-i18n")) return;
    const records = attrSources.get(element) || {};
    for (const attr of ["placeholder", "title", "aria-label"]) {
      if (!element.hasAttribute(attr)) continue;
      const explicit = element.getAttribute("data-i18n-" + attr);
      const value = element.getAttribute(attr);
      const record = records[attr];
      const source =
        explicit ||
        (record && value === record.last ? record.source : original(value));
      const translated = t(source);
      records[attr] = { source, last: translated };
      if (translated !== value) element.setAttribute(attr, translated);
    }
    attrSources.set(element, records);
  }
  function apply(scope) {
    if (typeof document === "undefined") return;
    const target = scope || document;
    if (applying) return;
    applying = true;
    if (observer) observer.disconnect();
    try {
      const walker = document.createTreeWalker(target, 4);
      let current;
      while ((current = walker.nextNode())) translateText(current);
      const elements = target.querySelectorAll
        ? [
            ...target.querySelectorAll(
              "[placeholder],[title],[aria-label],[data-i18n]",
            ),
          ]
        : [];
      if (target.nodeType === 1) elements.unshift(target);
      for (const element of elements) {
        if (
          element.hasAttribute("data-i18n") &&
          !element.closest(
            "[data-user-content],[data-no-i18n],.file-name,.file-sub,.file-type-icon,.hash-text",
          )
        ) {
          const key = element.getAttribute("data-i18n");
          const translated = t(key);
          if (element.textContent !== translated)
            element.textContent = translated;
          if (element.firstChild?.nodeType === 3)
            textSources.set(element.firstChild, {
              source: key,
              last: translated,
            });
        }
        translateAttributes(element);
      }
    } finally {
      applying = false;
      if (observer && document.body)
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["placeholder", "title", "aria-label"],
        });
    }
  }
  function setLanguage(code) {
    if (!locales[code]) code = "en";
    language = code;
    if (typeof document !== "undefined") {
      document.documentElement.lang = code;
      document.documentElement.dir = locales[code]?.meta.dir || "ltr";
      apply();
      if (
        typeof root.dispatchEvent === "function" &&
        typeof CustomEvent === "function"
      )
        root.dispatchEvent(
          new CustomEvent("languagechange", {
            detail: { language, meta: locales[code]?.meta || {} },
          }),
        );
    }
    return language;
  }
  function init() {
    if (typeof document === "undefined") return;
    if (!observer && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        if (applying || scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          apply();
        });
      });
    }
    setLanguage(language);
  }
  const api = {
    t,
    registerLocales,
    getLocales,
    setLanguage,
    init,
    apply,
    get language() {
      return language;
    },
  };
  root.I18n = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
