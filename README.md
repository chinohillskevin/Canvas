# Canvas — Digital Art Studio

Canvas is a self-contained static drawing app. Open `index.html` in a browser; it does not require a build step, account, database, or external resource.

## Save a project

1. Draw, add layers, rename the artwork, and adjust the tools as usual.
2. Select the down-arrow button in the top bar. Its tooltip is **Save project**.
3. The browser downloads a file named after the artwork, with the `.canvas` extension.

A Canvas project file contains the document title, all layer images, layer order, layer visibility, layer opacity, blend modes, active layer, and the current tool settings. The file stays on the user’s computer unless they choose to move or share it.

## Load a project

1. Select the up-arrow button beside Save. Its tooltip is **Load project**.
2. Choose a `.canvas` file previously downloaded from Canvas.
3. The current document is replaced with the saved project, including its layers and settings.

Loading is local: the file is read in the browser and is not uploaded to a server. Invalid or unrelated files are rejected with a “Could not load that project” message.

## Export vs. Save

- **Save project** creates an editable `.canvas` file that preserves layers and settings.
- **Export** creates a flattened PNG for sharing or use in another app.

## Shortcuts

- `B` — Brush
- `E` — Eraser
- `P` — Pencil
- `I` — Color picker
- `⌘/Ctrl + Z` — Undo
- `⌘/Ctrl + Shift + Z` — Redo

## Project format

Project files are JSON documents with a small versioned header:

```json
{
  "format": "canvas-project",
  "version": 1,
  "title": "My artwork",
  "settings": {},
  "layers": []
}
```

Layer artwork is stored as PNG data inside the file so a project is portable and self-contained. Because the images are embedded, files with many large layers can be bigger than a flattened PNG.
