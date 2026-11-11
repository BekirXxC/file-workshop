"use strict";
const fs = require("node:fs");
const path = require("node:path");
fs.copyFileSync(path.join(__dirname, "../standalone.html"), path.join(__dirname, "app.html"));
fs.copyFileSync(path.join(__dirname, "../assets/brand/file-workshop-icon.png"), path.join(__dirname, "icon.png"));
