# SVG Workbench

Browser-only SVG editor for design craft: ingest, inspect, batch-recolour, resize, edit code, optimise and export.

**Stack:** Vite · React · TypeScript · Tailwind CSS · CodeMirror (XML) · Lucide · SVGO (optional, with DOM cleanup fallback)

## Quick start

```bash
cd /workspace/svg-workbench
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview   # optional: serve the production build
```

## Features

1. **Ingestion** — drag-and-drop `.svg`, paste markup, or load presets (icon, multi-path illustration, certificate/badge with text).
2. **Canvas** — checkerboard backdrop, zoom / pan / reset, click-to-select shapes.
3. **Element inspector** — edit fill, stroke, id, class and transform inline.
4. **Batch automation** — palette swapper (unique colours + pickers + brand presets from `src/data/palettes.json`), text/`tspan` replacer with regex, aspect-safe resizer, attribute injector by CSS selector.
5. **Code editor** — two-way sync with the preview, XML syntax highlighting, error banner on malformed markup.
6. **Export** — SVGO / DOM cleanup toggles, Download SVG, Copy, PNG at 1× / 2× / 4×.

## Brand palettes

Colours are loaded from `src/data/palettes.json` (copied from the design-system tokens). **Never invent hex values.** For **vijji-chat**, you must explicitly choose `brand-live` or `brand-doc` — the tool will not auto-pick a chat brand colour.

## Architecture notes

- Central state: `svgMarkup` string + `selectedElementId`.
- Parse with `DOMParser('image/svg+xml')`, serialise with `XMLSerializer`.
- Transforms live in `src/utils/svgTransforms.ts`.
- Optimisation prefers SVGO via dynamic `import('svgo/browser')`; if bundling fails at runtime, a DOM cleanup pass honouring the same toggles is used.

## Smoke checklist

1. Load the **Icon** preset.
2. Swap a detected colour (or apply a vrijji brand swatch).
3. Resize width/height with aspect lock.
4. Edit markup in the code panel and confirm the canvas updates.
5. Download SVG and export a 2× PNG.
