/* Produce a self-contained HTML file without adding machine-specific metadata. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [];
const scriptTags = [];
const styles = [];
const hash = (text) =>
  "'sha256-" + crypto.createHash("sha256").update(text).digest("base64") + "'";
html = html.replace(
  /<script src="([^"]+)" defer><\/script>/g,
  (_, filename) => {
    const code = fs
      .readFileSync(path.join(root, filename), "utf8")
      .replace(/\r\n/g, "\n");
    if (/<\/script/i.test(code))
      throw new Error("A script contains an unsafe closing tag.");
    scripts.push(hash(code));
    scriptTags.push("<script>" + code + "</script>");
    return "";
  },
);
html = html.replace(
  /<link rel="stylesheet" href="([^"]+)">/g,
  (_, filename) => {
    const css = fs
      .readFileSync(path.join(root, filename), "utf8")
      .replace(/\r\n/g, "\n");
    styles.push(hash(css));
    return "<style>" + css + "</style>";
  },
);
html = html.replace(
  /href="icon.svg"/,
  'href="data:image/svg+xml;base64,' +
    fs.readFileSync(path.join(root, "icon.svg")).toString("base64") +
    '"',
);
html = html.replace(
  "script-src 'self' file:",
  "script-src " + scripts.join(" "),
);
html = html.replace("style-src 'self' file:", "style-src " + styles.join(" "));
if (scripts.length !== 10 || styles.length !== 2)
  throw new Error("Expected ten scripts and two stylesheets.");
html = html.replace("</body>", scriptTags.join("\n") + "\n</body>");
fs.writeFileSync(path.join(root, "standalone.html"), html, "utf8");
console.log("standalone.html ready");
