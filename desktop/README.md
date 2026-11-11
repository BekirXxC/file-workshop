# File Workshop for Windows

A portable, offline Windows 10/11 x64 application. No installer or administrator access is needed. The release includes Electron/Chromium, so end users do not need Node.js or a separately installed browser runtime.

## Build

On Windows with Node.js 22+:

```sh
npm ci
npm run build
```

The output is `dist/File-Workshop-2.2.0-Windows-x64.exe`. The build regenerates the self-contained HTML from the web source; no hosted website is loaded. Only the HTML, application wrapper, icon and runtime are packaged. No local documents, account details, build paths or development dependencies are included in the application archive.

## Behaviour

- File processing stays on the device. Network requests, new windows, remote navigation and permission requests are blocked.
- The renderer uses Electron sandboxing and context isolation with Node.js integration disabled. No privileged preload API is exposed.
- A separate temporary Chromium profile is used. Best-effort cleanup runs on exit; Windows can retain temporary runtime files while they are still in use. Exports go to the Downloads folder through the runtime's standard download handling.
- Source files are never overwritten. Reloading or closing clears the working file list.
- Releases are unsigned. Signing requires the publisher's own signing certificate; no private credentials are bundled.

Electron's open-source license notices ship inside the portable runtime. See the repository's MIT license for the application source.
