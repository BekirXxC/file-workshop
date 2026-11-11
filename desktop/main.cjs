"use strict";
const { app, BrowserWindow, Menu, session } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

// Isolated temporary Chromium profile: file contents never enter a persistent profile.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "file-workshop-"));
app.setPath("userData", profile);
app.setPath("sessionData", profile);
app.setAppUserModelId("org.fileworkshop.desktop");
app.commandLine.appendSwitch("disable-background-networking");
app.commandLine.appendSwitch("disable-component-update");
app.commandLine.appendSwitch("disable-http-cache");
app.enableSandbox();

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const localFile = path.join(__dirname, "app.html");
  const localURL = pathToFileURL(localFile).href;
  const localSession = session.fromPartition("file-workshop-session");
  localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  localSession.setPermissionCheckHandler(() => false);
  localSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (_details, callback) => callback({ cancel: true }));
  const window = new BrowserWindow({
    title: "File Workshop",
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: "#f8f8f3",
    icon: path.join(__dirname, "icon.png"),
    show: false,
    webPreferences: {
      session: localSession,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false
    }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (url.split("#")[0] !== localURL) event.preventDefault();
  });
  window.webContents.on("will-attach-webview", event => event.preventDefault());
  window.once("ready-to-show", () => window.show());
  window.loadFile(localFile);
});
app.on("window-all-closed", () => app.quit());
app.on("quit", () => {
  // Only remove the unique directory created by this process.
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Chromium may still hold files until process exit. */ }
});
