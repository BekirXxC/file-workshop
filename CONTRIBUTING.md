# Contributing

Keep the application offline, dependency-free and accessible. Do not add telemetry or include real personal files in issues, screenshots, fixtures or examples.

Run `npm test` before submitting a change. Include a small synthetic example when reporting data loss, encoding or CSV parsing issues. Check both light and dark mode and a narrow viewport for interface changes.

## Translations

`i18n.js` provides the locale registry and English fallback. `locales-global.js` and `locales-turkic.js` contain interface dictionaries. Language metadata must accurately describe coverage. Do not mark an English-only fallback as a translation.

Keep placeholders such as `{count}`, `{n}`, `{total}` and `{name}` intact. Preserve names of supported formats and never translate user filenames or data. Guide instructions are ordinary dictionary keys from `guides.js`.

Native-speaker corrections are welcome, especially technical terms, endangered-language names and right-to-left layouts. Add only translations you can substantiate. Do not infer translations just because two languages are related.

## Portable build

Run `npm run portable` after source changes. The generated file is ignored by Git. Script and stylesheet hashes must match the embedded code; do not loosen the content security policy to hide build problems.
